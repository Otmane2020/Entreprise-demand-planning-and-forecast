from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import json

# Models
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing, SimpleExpSmoothing, Holt
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error, mean_absolute_error
import xgboost as xgb
from scipy import stats

try:
    from prophet import Prophet
except ImportError:
    Prophet = None

app = FastAPI(title="DemandIQ Forecast Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================
# REQUEST/RESPONSE MODELS
# =====================

class HistoryPoint(BaseModel):
    date: str
    units: float
    revenue: Optional[float] = None
    promotion_flag: bool = False
    stockout_flag: bool = False

class ForecastRequest(BaseModel):
    product_id: str
    sku: str
    product_name: str
    history: List[HistoryPoint]
    forecast_horizon: int = 6

class ForecastMetrics(BaseModel):
    mape: float
    wape: float
    mase: float
    rmse: float
    bias: float
    tracking_signal: float

class ForecastResult(BaseModel):
    best_model: str
    forecast_units: List[float]
    forecast_revenue: List[float]
    confidence_lower: List[float]
    confidence_upper: List[float]
    metrics: ForecastMetrics
    model_details: Dict[str, Any] = {}

class InventoryRequest(BaseModel):
    lead_time_days: float
    service_level: float
    forecast_error: float
    average_daily_demand: float
    current_stock: float

class InventoryResult(BaseModel):
    safety_stock: float
    reorder_point: float
    coverage_days: float
    z_score: float

class ScenarioRequest(BaseModel):
    historical_data: List[HistoryPoint]
    scenario_type: str  # 'demand_increase', 'demand_decrease', 'promotion', 'lead_time_increase', 'lead_time_decrease'
    parameter: float  # percentage or days
    lead_time_days: float
    service_level: float

class ScenarioResult(BaseModel):
    forecast_units: List[float]
    forecast_revenue: List[float]
    safety_stock: float
    reorder_point: float
    inventory_required: float
    impact_summary: Dict[str, Any]

# =====================
# FORECAST METRICS
# =====================

def calculate_mape(actual: np.ndarray, forecast: np.ndarray) -> float:
    """Mean Absolute Percentage Error"""
    return 100 * np.mean(np.abs((actual - forecast) / np.where(np.abs(actual) > 0, actual, 1)))

def calculate_wape(actual: np.ndarray, forecast: np.ndarray) -> float:
    """Weighted Absolute Percentage Error"""
    numerator = np.sum(np.abs(actual - forecast))
    denominator = np.sum(np.abs(actual))
    return 100 * (numerator / denominator) if denominator > 0 else 0

def calculate_mase(actual: np.ndarray, forecast: np.ndarray, seasonal_period: int = 12) -> float:
    """Mean Absolute Scaled Error"""
    n = len(actual)
    d = np.abs(np.diff(actual)).sum() / (n - 1)
    mae = np.mean(np.abs(actual - forecast))
    return mae / d if d > 0 else 0

def calculate_rmse(actual: np.ndarray, forecast: np.ndarray) -> float:
    """Root Mean Squared Error"""
    return float(np.sqrt(np.mean((actual - forecast) ** 2)))

def calculate_bias(actual: np.ndarray, forecast: np.ndarray) -> float:
    """Forecast Bias"""
    return 100 * np.mean((forecast - actual) / np.where(np.abs(actual) > 0, actual, 1))

def calculate_tracking_signal(actual: np.ndarray, forecast: np.ndarray) -> float:
    """Tracking Signal: running sum of forecast errors / MAD"""
    errors = actual - forecast
    mad = np.mean(np.abs(errors))
    ts = np.sum(errors) / mad if mad > 0 else 0
    return float(ts)

# =====================
# FORECAST MODELS
# =====================

class ForecastEngine:
    def __init__(self, data: np.ndarray, dates: List[str]):
        self.data = data
        self.dates = dates
        self.n = len(data)
        self.test_size = max(3, int(0.2 * self.n))
        self.train_data = data[:-self.test_size]
        self.test_data = data[-self.test_size:]

    def sma(self, window: int = 3) -> tuple:
        """Simple Moving Average"""
        try:
            forecast = []
            for i in range(len(self.test_data)):
                if i < window:
                    forecast.append(np.mean(self.train_data[max(0, self.n - window - i):]))
                else:
                    forecast.append(np.mean(self.test_data[max(0, i - window):i]))
            return np.array(forecast), "SMA"
        except Exception as e:
            return None, str(e)

    def wma(self, window: int = 3) -> tuple:
        """Weighted Moving Average"""
        try:
            weights = np.arange(1, window + 1)
            forecast = []
            combined = np.concatenate([self.train_data, self.test_data])
            for i in range(len(self.test_data)):
                start_idx = max(0, self.n + i - window)
                if start_idx + window <= len(combined):
                    forecast.append(np.average(combined[start_idx:start_idx + window], weights=weights))
                else:
                    forecast.append(np.mean(combined[start_idx:]))
            return np.array(forecast), "WMA"
        except Exception as e:
            return None, str(e)

    def exponential_smoothing(self) -> tuple:
        """Exponential Smoothing"""
        try:
            model = SimpleExpSmoothing(self.train_data).fit(optimized=True)
            forecast = model.forecast(steps=len(self.test_data))
            return np.array(forecast), "ExpSmoothing"
        except Exception as e:
            return None, str(e)

    def holt(self) -> tuple:
        """Holt Linear Trend"""
        try:
            if len(self.train_data) < 4:
                return None, "Insufficient data"
            model = Holt(self.train_data).fit(optimized=True)
            forecast = model.forecast(steps=len(self.test_data))
            return np.array(forecast), "Holt"
        except Exception as e:
            return None, str(e)

    def holt_winters(self) -> tuple:
        """Holt-Winters Seasonal"""
        try:
            if len(self.train_data) < 12:
                return None, "Insufficient data"
            model = ExponentialSmoothing(self.train_data, seasonal_periods=12, trend='add', seasonal='add', initialization_method='estimated')
            fitted = model.fit(optimized=True)
            forecast = fitted.forecast(steps=len(self.test_data))
            return np.array(forecast), "Holt-Winters"
        except Exception as e:
            return None, str(e)

    def ets(self) -> tuple:
        """Error-Trend-Seasonality (via ExponentialSmoothing)"""
        try:
            if len(self.train_data) < 8:
                return None, "Insufficient data"
            model = ExponentialSmoothing(self.train_data, error='add', trend='add', seasonal=None)
            fitted = model.fit(optimized=True)
            forecast = fitted.forecast(steps=len(self.test_data))
            return np.array(forecast), "ETS"
        except Exception as e:
            return None, str(e)

    def arima(self, order=(1, 1, 1)) -> tuple:
        """ARIMA"""
        try:
            model = ARIMA(self.train_data, order=order)
            fitted = model.fit()
            forecast = fitted.forecast(steps=len(self.test_data))
            return np.array(forecast), "ARIMA"
        except Exception as e:
            return None, str(e)

    def sarima(self, order=(1, 1, 1), seasonal_order=(1, 1, 1, 12)) -> tuple:
        """SARIMA"""
        try:
            if len(self.train_data) < 24:
                return None, "Insufficient data"
            model = SARIMAX(self.train_data, order=order, seasonal_order=seasonal_order)
            fitted = model.fit(disp=False)
            forecast = fitted.get_forecast(steps=len(self.test_data)).predicted_mean
            return np.array(forecast), "SARIMA"
        except Exception as e:
            return None, str(e)

    def croston(self) -> tuple:
        """Croston's method for intermittent demand"""
        try:
            alpha = 0.1
            forecast = []
            a_t = self.train_data[0]
            p_t = 1
            demand_points = []

            for i, val in enumerate(self.train_data):
                if val > 0:
                    demand_points.append(val)
                    a_t = alpha * val + (1 - alpha) * a_t
                p_t = alpha * len(demand_points) / (i + 1) + (1 - alpha) * p_t

            avg_demand = np.mean(demand_points) if demand_points else a_t
            for _ in range(len(self.test_data)):
                forecast.append(avg_demand / max(p_t, 0.01))

            return np.array(forecast), "Croston"
        except Exception as e:
            return None, str(e)

    def tsb(self) -> tuple:
        """Teunter-Syntetos-Babai for intermittent demand"""
        try:
            alpha = 0.1
            demand_points = []
            for val in self.train_data:
                if val > 0:
                    demand_points.append(val)

            if not demand_points:
                return np.full(len(self.test_data), np.mean(self.train_data)), "TSB"

            avg_demand = np.mean(demand_points)
            p_t = len(demand_points) / len(self.train_data)
            forecast = [avg_demand * p_t] * len(self.test_data)
            return np.array(forecast), "TSB"
        except Exception as e:
            return None, str(e)

    def prophet(self) -> tuple:
        """Facebook Prophet"""
        try:
            if Prophet is None or len(self.train_data) < 8:
                return None, "Prophet not available or insufficient data"

            df = pd.DataFrame({
                'ds': pd.date_range(self.dates[0], periods=len(self.train_data), freq='MS'),
                'y': self.train_data
            })
            model = Prophet(yearly_seasonality=True, interval_width=0.95)
            model.fit(df)
            future = model.make_future_dataframe(periods=len(self.test_data), freq='MS')
            forecast = model.predict(future)
            return np.array(forecast['yhat'].iloc[-len(self.test_data):]), "Prophet"
        except Exception as e:
            return None, str(e)

    def linear_regression(self) -> tuple:
        """Linear Regression with trend"""
        try:
            X = np.arange(len(self.train_data)).reshape(-1, 1)
            y = self.train_data
            model = LinearRegression()
            model.fit(X, y)
            X_test = np.arange(len(self.train_data), len(self.train_data) + len(self.test_data)).reshape(-1, 1)
            forecast = model.predict(X_test)
            return np.array(forecast), "LinearRegression"
        except Exception as e:
            return None, str(e)

    def random_forest(self, n_estimators: int = 50) -> tuple:
        """Random Forest with lagged features"""
        try:
            if len(self.train_data) < 5:
                return None, "Insufficient data"

            X, y = [], []
            for i in range(3, len(self.train_data)):
                X.append([self.train_data[i-1], self.train_data[i-2], self.train_data[i-3]])
                y.append(self.train_data[i])

            if len(X) < 3:
                return None, "Insufficient data for features"

            model = RandomForestRegressor(n_estimators=n_estimators, random_state=42)
            model.fit(X, y)

            forecast = []
            recent = list(self.train_data[-3:])
            for _ in range(len(self.test_data)):
                pred = model.predict([recent[-3:]])[0]
                forecast.append(pred)
                recent = recent[-2:] + [pred]

            return np.array(forecast), "RandomForest"
        except Exception as e:
            return None, str(e)

    def xgboost_model(self, n_estimators: int = 100) -> tuple:
        """XGBoost with lagged features"""
        try:
            if len(self.train_data) < 5:
                return None, "Insufficient data"

            X, y = [], []
            for i in range(3, len(self.train_data)):
                X.append([self.train_data[i-1], self.train_data[i-2], self.train_data[i-3]])
                y.append(self.train_data[i])

            if len(X) < 3:
                return None, "Insufficient data for features"

            model = xgb.XGBRegressor(n_estimators=n_estimators, random_state=42, verbosity=0)
            model.fit(X, y)

            forecast = []
            recent = list(self.train_data[-3:])
            for _ in range(len(self.test_data)):
                pred = model.predict([[recent[-3], recent[-2], recent[-1]]])[0]
                forecast.append(pred)
                recent = recent[-2:] + [pred]

            return np.array(forecast), "XGBoost"
        except Exception as e:
            return None, str(e)

    def run_all_models(self) -> Dict[str, tuple]:
        """Run all models and return results"""
        results = {}
        models_to_run = [
            ('SMA', self.sma),
            ('WMA', self.wma),
            ('ExpSmoothing', self.exponential_smoothing),
            ('Holt', self.holt),
            ('HoltWinters', self.holt_winters),
            ('ETS', self.ets),
            ('ARIMA', self.arima),
            ('SARIMA', self.sarima),
            ('Croston', self.croston),
            ('TSB', self.tsb),
            ('Prophet', self.prophet),
            ('LinearRegression', self.linear_regression),
            ('RandomForest', self.random_forest),
            ('XGBoost', self.xgboost_model),
        ]

        for name, func in models_to_run:
            forecast, status = func() if name not in ['SARIMA', 'RandomForest', 'XGBoost'] else func()
            if forecast is not None and isinstance(forecast, np.ndarray):
                results[name] = (forecast, status)

        return results

    def evaluate_models(self, model_results: Dict[str, tuple]) -> Dict[str, dict]:
        """Evaluate all models"""
        evaluations = {}

        for model_name, (forecast, _) in model_results.items():
            if forecast is None:
                continue

            forecast = np.array(forecast)
            actual = self.test_data

            if len(forecast) != len(actual):
                forecast = forecast[:len(actual)]

            forecast = np.maximum(forecast, 0)  # Ensure positive values

            mape = calculate_mape(actual, forecast)
            wape = calculate_wape(actual, forecast)
            mase = calculate_mase(actual, forecast)
            rmse = calculate_rmse(actual, forecast)
            bias = calculate_bias(actual, forecast)
            ts = calculate_tracking_signal(actual, forecast)

            evaluations[model_name] = {
                'mape': float(mape),
                'wape': float(wape),
                'mase': float(mase),
                'rmse': float(rmse),
                'bias': float(bias),
                'ts': float(ts),
                'forecast': forecast
            }

        return evaluations

# =====================
# ENDPOINTS
# =====================

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

@app.post("/forecast", response_model=ForecastResult)
def forecast(request: ForecastRequest):
    """Run all 15 forecast models and return best"""
    try:
        # Parse history
        if not request.history or len(request.history) < 3:
            raise ValueError("Need at least 3 historical data points")

        data = np.array([h.units for h in request.history])
        dates = [h.date for h in request.history]

        # Run forecast engine
        engine = ForecastEngine(data, dates)
        model_results = engine.run_all_models()
        evaluations = engine.evaluate_models(model_results)

        if not evaluations:
            raise ValueError("All models failed")

        # Select best model by MASE
        best_model = min(evaluations.items(), key=lambda x: x[1]['mase'])
        best_name = best_model[0]
        best_metrics = best_model[1]

        # Generate full forecast on entire dataset
        full_engine = ForecastEngine(data, dates)
        full_results = full_engine.run_all_models()

        if best_name not in full_results:
            raise ValueError(f"Best model {best_name} not available in full run")

        full_forecast, _ = full_results[best_name]

        # Extend forecast to horizon
        extended_forecast = list(full_forecast[-min(3, len(full_forecast)):])
        while len(extended_forecast) < request.forecast_horizon:
            if len(extended_forecast) >= 3:
                extended_forecast.append(np.mean(extended_forecast[-3:]))
            else:
                extended_forecast.append(np.mean(data))

        extended_forecast = extended_forecast[:request.forecast_horizon]
        extended_forecast = np.maximum(extended_forecast, 0)

        # Calculate confidence intervals (±15%)
        confidence_lower = extended_forecast * 0.85
        confidence_upper = extended_forecast * 1.15

        # Calculate revenue (assume average price from history)
        avg_price = np.mean([h.revenue / h.units if h.revenue and h.units > 0 else 1 for h in request.history])
        forecast_revenue = extended_forecast * avg_price

        return ForecastResult(
            best_model=best_name,
            forecast_units=[float(x) for x in extended_forecast],
            forecast_revenue=[float(x) for x in forecast_revenue],
            confidence_lower=[float(x) for x in confidence_lower],
            confidence_upper=[float(x) for x in confidence_upper],
            metrics=ForecastMetrics(
                mape=best_metrics['mape'],
                wape=best_metrics['wape'],
                mase=best_metrics['mase'],
                rmse=best_metrics['rmse'],
                bias=best_metrics['bias'],
                tracking_signal=best_metrics['ts']
            ),
            model_details={
                'all_models': {k: {'mape': v['mape'], 'mase': v['mase'], 'rmse': v['rmse']} for k, v in evaluations.items()},
                'test_size': full_engine.test_size,
                'training_points': len(full_engine.train_data),
            }
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/inventory/calculate", response_model=InventoryResult)
def calculate_inventory(request: InventoryRequest):
    """Calculate safety stock, reorder point, and coverage"""
    try:
        # Get Z-score for service level
        z_score_map = {
            90: 1.28, 91: 1.34, 92: 1.41, 93: 1.48, 94: 1.56,
            95: 1.645, 96: 1.75, 97: 1.88, 98: 2.05, 99: 2.33, 99.5: 2.58
        }
        z = z_score_map.get(int(request.service_level), 1.645)

        # Safety Stock = Z × σ × √(Lead Time)
        safety_stock = z * request.forecast_error * np.sqrt(request.lead_time_days)

        # Reorder Point = Lead Time Demand + Safety Stock
        lead_time_demand = request.average_daily_demand * request.lead_time_days
        rop = lead_time_demand + safety_stock

        # Coverage Days
        coverage_days = request.current_stock / max(request.average_daily_demand, 0.1)

        return InventoryResult(
            safety_stock=float(safety_stock),
            reorder_point=float(rop),
            coverage_days=float(coverage_days),
            z_score=float(z)
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/scenario/simulate", response_model=ScenarioResult)
def simulate_scenario(request: ScenarioRequest):
    """Simulate scenario and recalculate inventory"""
    try:
        if not request.historical_data:
            raise ValueError("Need historical data")

        data = np.array([h.units for h in request.historical_data])

        # Apply scenario
        if request.scenario_type == 'demand_increase':
            multiplier = 1 + (request.parameter / 100)
        elif request.scenario_type == 'demand_decrease':
            multiplier = 1 - (request.parameter / 100)
        elif request.scenario_type == 'promotion':
            multiplier = 1.2
        else:
            multiplier = 1

        adjusted_data = data * multiplier

        # Run forecast
        engine = ForecastEngine(adjusted_data, [])
        model_results = engine.run_all_models()
        evaluations = engine.evaluate_models(model_results)

        best_model = min(evaluations.items(), key=lambda x: x[1]['mase'])
        forecast_vals = best_model[1]['forecast'][:6]

        # Extend to 6 months
        while len(forecast_vals) < 6:
            forecast_vals = np.append(forecast_vals, np.mean(forecast_vals[-3:]))

        forecast_vals = forecast_vals[:6]
        avg_price = np.mean([h.revenue / h.units if h.revenue and h.units > 0 else 1 for h in request.historical_data])

        # Recalculate inventory
        avg_daily = np.mean(adjusted_data) / 30
        forecast_error = np.mean(adjusted_data) * 0.12

        z_score_map = {95: 1.645, 96: 1.75, 97: 1.88, 98: 2.05, 99: 2.33}
        z = z_score_map.get(int(request.service_level), 1.645)

        lead_time = request.lead_time_days
        if request.scenario_type == 'lead_time_increase':
            lead_time *= (1 + request.parameter / 100)
        elif request.scenario_type == 'lead_time_decrease':
            lead_time *= (1 - request.parameter / 100)

        safety_stock = z * forecast_error * np.sqrt(lead_time)
        rop = avg_daily * lead_time + safety_stock
        inv_required = rop + (avg_daily * 14)

        return ScenarioResult(
            forecast_units=[float(x) for x in forecast_vals],
            forecast_revenue=[float(x * avg_price) for x in forecast_vals],
            safety_stock=float(safety_stock),
            reorder_point=float(rop),
            inventory_required=float(inv_required),
            impact_summary={
                'demand_multiplier': float(multiplier),
                'avg_daily_demand': float(avg_daily),
                'forecast_error': float(forecast_error),
                'best_model': best_model[0]
            }
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
