"""
Model Selection and Backtesting Service
Handles historical model performance tracking and automatic model selection
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

class ModelSelector:
    """Intelligent model selection based on historical performance"""

    @staticmethod
    def select_by_mase(evaluations: Dict[str, Dict]) -> str:
        """Select model with lowest MASE"""
        return min(evaluations.keys(), key=lambda x: evaluations[x].get('mase', float('inf')))

    @staticmethod
    def select_by_weighted_score(evaluations: Dict[str, Dict], weights: Optional[Dict] = None) -> str:
        """Select model by weighted combination of metrics"""
        if weights is None:
            weights = {
                'mase': 0.40,
                'rmse': 0.25,
                'mape': 0.20,
                'bias': 0.15
            }

        scores = {}
        for model_name, metrics in evaluations.items():
            score = 0
            for metric, weight in weights.items():
                if metric == 'bias':
                    score += weight * abs(metrics.get(metric, 0))
                else:
                    score += weight * metrics.get(metric, float('inf'))
            scores[model_name] = score

        return min(scores.keys(), key=lambda x: scores[x])

    @staticmethod
    def select_ensemble(evaluations: Dict[str, Dict]) -> Tuple[str, Dict]:
        """Create ensemble of top 3 models"""
        sorted_models = sorted(evaluations.items(), key=lambda x: x[1]['mase'])
        top_3 = sorted_models[:3]

        ensemble_info = {
            'models': [m[0] for m in top_3],
            'weights': [0.5, 0.3, 0.2],  # Top model weighted 50%
            'avg_mase': np.mean([m[1]['mase'] for m in top_3])
        }

        return top_3[0][0], ensemble_info

class Backtester:
    """Historical backtesting framework"""

    def __init__(self, data: np.ndarray, test_size: float = 0.2):
        self.data = data
        self.test_size = max(3, int(len(data) * test_size))
        self.train_size = len(data) - self.test_size

    def walk_forward_validation(self, window_size: int = 24) -> Dict[str, List]:
        """Walk-forward validation for realistic performance estimate"""
        results = {
            'splits': [],
            'train_windows': [],
            'test_windows': []
        }

        for i in range(0, len(self.data) - window_size - 3, 3):
            train_window = self.data[i:i + window_size]
            test_window = self.data[i + window_size:i + window_size + 3]

            if len(test_window) >= 3:
                results['splits'].append({
                    'train_start': i,
                    'train_end': i + window_size,
                    'test_end': i + window_size + 3
                })
                results['train_windows'].append(train_window)
                results['test_windows'].append(test_window)

        return results

    @staticmethod
    def calculate_fva(baseline: np.ndarray, forecast1: np.ndarray,
                     forecast2: np.ndarray, actual: np.ndarray) -> float:
        """
        Forecast Value Added: improvement of forecast2 vs baseline
        compared to baseline vs actual
        """
        baseline_mape = np.mean(np.abs((actual - baseline) / np.maximum(actual, 1)))
        forecast_mape = np.mean(np.abs((actual - forecast2) / np.maximum(actual, 1)))

        fva = baseline_mape - forecast_mape
        fva_percent = (fva / baseline_mape * 100) if baseline_mape > 0 else 0

        return float(fva_percent)

    @staticmethod
    def model_stability(metric_history: List[float]) -> float:
        """Calculate model stability (lower std = more stable)"""
        if len(metric_history) < 2:
            return 1.0
        return float(np.std(metric_history) / (np.mean(metric_history) + 1e-6))

class ForecastValueAddedCalculator:
    """Calculate FVA for S&OP workflow"""

    @staticmethod
    def calculate_baseline(historical_data: np.ndarray) -> np.ndarray:
        """Simple moving average as baseline"""
        window = max(3, len(historical_data) // 6)
        return np.convolve(historical_data, np.ones(window)/window, mode='valid')

    @staticmethod
    def calculate_fva_metrics(actual: np.ndarray,
                            baseline: np.ndarray,
                            statistical: np.ndarray,
                            sales: Optional[np.ndarray] = None,
                            consensus: Optional[np.ndarray] = None) -> Dict[str, float]:
        """
        Calculate FVA across workflow stages
        Returns improvement percentages
        """
        def mape(actual, forecast):
            mask = actual != 0
            return np.mean(np.abs((actual[mask] - forecast[mask]) / actual[mask])) * 100 if mask.any() else 100

        baseline_mape = mape(actual, baseline)
        stat_mape = mape(actual, statistical)

        fva = {
            'baseline_mape': baseline_mape,
            'statistical_mape': stat_mape,
            'statistical_fva': baseline_mape - stat_mape,
            'statistical_fva_percent': ((baseline_mape - stat_mape) / baseline_mape * 100) if baseline_mape > 0 else 0
        }

        if sales is not None:
            sales_mape = mape(actual, sales)
            fva['sales_mape'] = sales_mape
            fva['sales_fva'] = stat_mape - sales_mape
            fva['sales_fva_percent'] = ((stat_mape - sales_mape) / stat_mape * 100) if stat_mape > 0 else 0

        if consensus is not None:
            consensus_mape = mape(actual, consensus)
            fva['consensus_mape'] = consensus_mape
            fva['consensus_fva'] = (sales_mape if sales is not None else stat_mape) - consensus_mape
            fva['total_fva'] = baseline_mape - consensus_mape
            fva['total_fva_percent'] = ((baseline_mape - consensus_mape) / baseline_mape * 100) if baseline_mape > 0 else 0

        return fva

class ModelPerformanceTracker:
    """Track model performance over time"""

    def __init__(self):
        self.performance_history = {}

    def record_performance(self, product_id: str, model_name: str,
                          metrics: Dict[str, float], timestamp: datetime = None):
        """Record model performance"""
        if timestamp is None:
            timestamp = datetime.now()

        key = f"{product_id}_{model_name}"
        if key not in self.performance_history:
            self.performance_history[key] = []

        self.performance_history[key].append({
            'timestamp': timestamp,
            'metrics': metrics
        })

    def get_model_trend(self, product_id: str, model_name: str,
                       metric: str = 'mape', days: int = 30) -> Dict:
        """Get model performance trend"""
        key = f"{product_id}_{model_name}"
        if key not in self.performance_history:
            return {'trend': [], 'avg': None}

        cutoff = datetime.now() - timedelta(days=days)
        recent = [h for h in self.performance_history[key] if h['timestamp'] >= cutoff]

        values = [h['metrics'].get(metric, 0) for h in recent]

        return {
            'trend': values,
            'avg': np.mean(values) if values else None,
            'std': np.std(values) if values else None,
            'improving': values[-1] < values[0] if len(values) > 1 else None
        }

    def compare_models(self, product_id: str, metric: str = 'mase') -> Dict:
        """Compare all models for a product"""
        product_keys = [k for k in self.performance_history.keys() if k.startswith(f"{product_id}_")]

        comparison = {}
        for key in product_keys:
            model_name = key.split('_', 1)[1]
            values = [h['metrics'].get(metric, 0) for h in self.performance_history[key]]
            comparison[model_name] = {
                'avg': np.mean(values),
                'best': np.min(values),
                'worst': np.max(values),
                'std': np.std(values)
            }

        return comparison
