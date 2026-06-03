import { ForecastMetric, Product, Forecast } from '@/lib/supabase';

const FORECAST_API = process.env.NEXT_PUBLIC_FORECAST_API || 'http://localhost:8000';

interface ForecastRequestPayload {
  product_id: string;
  sku: string;
  product_name: string;
  history: Array<{
    date: string;
    units: number;
    revenue?: number;
    promotion_flag: boolean;
    stockout_flag: boolean;
  }>;
  forecast_horizon: number;
}

interface ForecastResponse {
  best_model: string;
  forecast_units: number[];
  forecast_revenue: number[];
  confidence_lower: number[];
  confidence_upper: number[];
  metrics: {
    mape: number;
    wape: number;
    mase: number;
    rmse: number;
    bias: number;
    tracking_signal: number;
  };
  model_details: Record<string, unknown>;
  model_performance?: Record<string, {
    mape: number;
    wape: number;
    mase: number;
    rmse: number;
    bias: number;
    rmsse: number;
  }>;
}

interface InventoryResponse {
  safety_stock: number;
  reorder_point: number;
  coverage_days: number;
  z_score: number;
}

interface ScenarioResponse {
  forecast_units: number[];
  forecast_revenue: number[];
  safety_stock: number;
  reorder_point: number;
  inventory_required: number;
  impact_summary: Record<string, unknown>;
}

export const forecastApi = {
  async runForecast(payload: ForecastRequestPayload): Promise<ForecastResponse> {
    const res = await fetch(`${FORECAST_API}/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async calculateInventory(payload: {
    lead_time_days: number;
    service_level: number;
    forecast_error: number;
    average_daily_demand: number;
    current_stock: number;
  }): Promise<InventoryResponse> {
    const res = await fetch(`${FORECAST_API}/inventory/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async simulateScenario(payload: {
    historical_data: Array<{ date: string; units: number; revenue?: number; promotion_flag: boolean; stockout_flag: boolean }>;
    scenario_type: 'demand_increase' | 'demand_decrease' | 'promotion' | 'lead_time_increase' | 'lead_time_decrease';
    parameter: number;
    lead_time_days: number;
    service_level: number;
  }): Promise<ScenarioResponse> {
    const res = await fetch(`${FORECAST_API}/scenario/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async health(): Promise<{ status: string }> {
    const res = await fetch(`${FORECAST_API}/health`);
    if (!res.ok) throw new Error('Forecast service unavailable');
    return res.json();
  },
};
