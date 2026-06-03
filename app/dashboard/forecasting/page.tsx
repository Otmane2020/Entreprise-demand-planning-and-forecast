'use client';

import { useState, useEffect } from 'react';
import { MOCK_PRODUCTS, generateSalesHistory, generateForecastData } from '@/lib/mock-data';
import { formatNumber, formatPercent, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard, ForecastVsActualChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, RefreshCw, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { forecastApi } from '@/lib/forecast-api';
import { toast } from 'sonner';

interface ForecastState {
  modelResults: Array<{ name: string; mape: number; wape: number; mase: number; rmse: number; bias: number }>;
  bestModel: string;
  metrics: {
    mape: number;
    wape: number;
    mase: number;
    rmse: number;
    bias: number;
  };
  forecast: Array<{ month: string; actual?: number; forecast: number; lower: number; upper: number }>;
}

export default function ForecastingPage() {
  const [selectedSku, setSelectedSku] = useState(MOCK_PRODUCTS[0].sku);
  const [running, setRunning] = useState(false);
  const [forecastState, setForecastState] = useState<ForecastState | null>(null);
  const [horizon, setHorizon] = useState('6');
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  const product = MOCK_PRODUCTS.find(p => p.sku === selectedSku)!;
  const sales = generateSalesHistory(selectedSku, 24);
  const forecasts = generateForecastData(sales, parseInt(horizon));

  // Check forecast service on mount
  useEffect(() => {
    forecastApi.health()
      .then(() => setServiceStatus('ok'))
      .catch(() => setServiceStatus('error'));
  }, []);

  const combined = forecastState
    ? forecastState.forecast
    : [
      ...sales.slice(-12).map(s => ({
        month: s.date.slice(0, 7),
        actual: s.units_sold,
        forecast: Math.round(s.units_sold * (0.92 + Math.random() * 0.12)),
        lower: undefined as number | undefined,
        upper: undefined as number | undefined,
      })),
      ...forecasts.map(f => ({
        month: f.forecast_date.slice(0, 7),
        actual: undefined as number | undefined,
        forecast: f.forecast_units,
        lower: f.lower_bound,
        upper: f.upper_bound,
      })),
    ];

  async function handleRun() {
    if (serviceStatus === 'error') {
      toast.error('Forecast service unavailable. Using demo mode.');
      return;
    }

    setRunning(true);
    try {
      const result = await forecastApi.runForecast({
        product_id: product.sku,
        sku: product.sku,
        product_name: product.product_name,
        history: sales.map(s => ({
          date: s.date,
          units: s.units_sold,
          revenue: s.revenue,
          promotion_flag: s.promotion_flag,
          stockout_flag: s.stockout_flag,
        })),
        forecast_horizon: parseInt(horizon),
      });

      // Build chart data
      const chartData = [
        ...sales.slice(-12).map(s => ({
          month: s.date.slice(0, 7),
          actual: s.units_sold,
          forecast: 0,
          lower: 0,
          upper: 0,
        })),
      ];

      // Add forecast periods
      for (let i = 0; i < result.forecast_units.length; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i + 1);
        chartData.push({
          month: forecastDate.toISOString().slice(0, 7),
          actual: undefined as any,
          forecast: result.forecast_units[i],
          lower: result.confidence_lower[i],
          upper: result.confidence_upper[i],
        });
      }

      setForecastState({
        modelResults: Object.entries(result.model_details.all_models || {}).map(([name, metrics]: any) => ({
          name,
          mape: metrics.mape,
          wape: metrics.wape,
          mase: metrics.mase,
          rmse: metrics.rmse,
          bias: metrics.bias,
        })),
        bestModel: result.best_model,
        metrics: result.metrics,
        forecast: chartData,
      });

      toast.success(`Forecast complete: ${result.best_model} selected`);
    } catch (error) {
      toast.error(`Forecast failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  }

  const modelResults = forecastState?.modelResults || [];
  const bestMetrics = forecastState?.metrics;
  const bestModel = forecastState?.bestModel;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Forecasting Engine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {serviceStatus === 'ok'
              ? 'Run 15 statistical & ML models per SKU — auto-select best model'
              : 'Forecast service unavailable — showing demo mode'}
          </p>
        </div>
        {serviceStatus === 'error' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Service unavailable
          </div>
        )}
        <Button onClick={handleRun} disabled={running || serviceStatus === 'error'} className="gap-2">
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Running Models…' : 'Run All Models'}
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl border bg-card">
        <div className="flex-1 min-w-48">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product SKU</label>
          <Select value={selectedSku} onValueChange={setSelectedSku}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOCK_PRODUCTS.map(p => (
                <SelectItem key={p.sku} value={p.sku}>{p.sku} — {p.product_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Forecast Horizon</label>
          <Select value={horizon} onValueChange={setHorizon}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
              <SelectItem value="18">18 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product</label>
          <div className="h-8 flex items-center">
            <span className="text-sm font-medium">{product.product_name}</span>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <ChartCard
        title="Forecast vs Actual"
        subtitle={`${product.product_name} ${bestModel ? `· ${bestModel} (Best Model)` : '· Historical + Forecast'}`}
        actions={
          bestModel && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              {bestModel}
            </div>
          )
        }
      >
        <ForecastVsActualChart data={combined as never} height={300} />
      </ChartCard>

      {/* Model Comparison */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Model Performance Comparison</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {modelResults.length > 0 ? `${modelResults.length} models ranked by MAPE — lower is better` : 'Run forecast to see model comparison'}
            </p>
          </div>
          {bestModel && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Best: {bestModel}
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Rank</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Model</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">MAPE %</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">WAPE %</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">MASE</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">RMSE</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground hidden xl:table-cell">Bias %</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {modelResults.map((model, idx) => (
              <tr key={model.name} className={cn(
                'border-b last:border-0 hover:bg-muted/20 transition-colors',
                bestModel === model.name ? 'bg-emerald-500/5' : ''
              )}>
                <td className="px-4 py-2.5">
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                    idx === 0 ? 'bg-emerald-500/20 text-emerald-400' :
                    idx === 1 ? 'bg-blue-500/10 text-blue-400' :
                    idx === 2 ? 'bg-amber-500/10 text-amber-400' : 'text-muted-foreground'
                  )}>
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium', idx === 0 ? 'text-emerald-400' : 'text-foreground')}>{model.name}</span>
                    {idx === 0 && (
                      <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">Best</span>
                    )}
                  </div>
                </td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-xs', model.mape <= 10 ? 'text-emerald-400' : model.mape <= 15 ? 'text-amber-400' : 'text-rose-400')}>
                  {model.mape.toFixed(1)}%
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground hidden md:table-cell">{model.wape.toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">{model.mase.toFixed(2)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground hidden lg:table-cell">{model.rmse.toFixed(0)}</td>
                <td className="px-4 py-2.5 text-right hidden xl:table-cell">
                  <span className={cn('font-mono text-xs', Math.abs(model.bias) <= 3 ? 'text-emerald-400' : 'text-amber-400')}>
                    {model.bias > 0 ? '+' : ''}{model.bias.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {idx === 0 && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
