'use client';

import { useState, useEffect } from 'react';
import { useAppData } from '@/lib/import-data-context';
import { useProductList } from '@/lib/use-product-list';
import { formatPercent, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard } from '@/components/charts';
import { KpiCard } from '@/components/kpi-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, RefreshCw, TrendingUp, AlertCircle, CheckCircle2, BarChart3, Grid3x3 } from 'lucide-react';
import { forecastApi } from '@/lib/forecast-api';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  ScatterChart, Scatter, LineChart, Line, ComposedChart, Area
} from 'recharts';

interface ModelResult {
  model_name: string;
  mape: number;
  wape: number;
  mase: number;
  rmse: number;
  bias: number;
  rmsse: number;
  selected: boolean;
}

interface ModelComparison {
  model: string;
  accuracy: 'excellent' | 'good' | 'fair' | 'poor';
  strength: string;
  weakness: string;
  useCase: string;
}

const MODEL_CHARACTERISTICS: Record<string, ModelComparison> = {
  'SMA': {
    model: 'Simple Moving Average',
    accuracy: 'fair',
    strength: 'Fast, interpretable',
    weakness: 'Lag in trends',
    useCase: 'Stable products (XYZ: X)',
  },
  'WMA': {
    model: 'Weighted Moving Average',
    accuracy: 'good',
    strength: 'Responsive, recent data emphasis',
    weakness: 'Ignores seasonality',
    useCase: 'Short-term forecasts',
  },
  'Exponential Smoothing': {
    model: 'Exponential Smoothing',
    accuracy: 'good',
    strength: 'Automated smoothing',
    weakness: 'No trend/seasonality',
    useCase: 'Intermittent demand',
  },
  'Holt': {
    model: 'Holt Linear Trend',
    accuracy: 'excellent',
    strength: 'Captures trends',
    weakness: 'No seasonality',
    useCase: 'Growth products',
  },
  'Holt-Winters': {
    model: 'Holt-Winters Seasonal',
    accuracy: 'excellent',
    strength: 'Trend + Seasonality',
    weakness: 'Slower to adapt',
    useCase: 'Seasonal products (ABC: A)',
  },
  'ETS': {
    model: 'Error-Trend-Seasonality',
    accuracy: 'excellent',
    strength: 'Flexible, adaptive',
    weakness: 'Computationally heavy',
    useCase: 'Complex patterns',
  },
  'ARIMA': {
    model: 'ARIMA(1,1,1)',
    accuracy: 'excellent',
    strength: 'Differencing for stationarity',
    weakness: 'Manual parameter tuning',
    useCase: 'Non-stationary data',
  },
  'SARIMA': {
    model: 'SARIMA(1,1,1,12)',
    accuracy: 'excellent',
    strength: 'Seasonal ARIMA',
    weakness: 'Complex parameter space',
    useCase: 'Highly seasonal (Electronics)',
  },
  'Croston': {
    model: "Croston's Method",
    accuracy: 'excellent',
    strength: 'Intermittent demand specialist',
    weakness: 'Only for sparse data',
    useCase: 'Sporadic products (XYZ: Z)',
  },
  'Linear Regression': {
    model: 'Linear Regression',
    accuracy: 'good',
    strength: 'Simple, fast',
    weakness: 'Assumes linearity',
    useCase: 'Stable trends',
  },
  'Random Forest': {
    model: 'Random Forest',
    accuracy: 'excellent',
    strength: 'Captures non-linearity',
    weakness: 'Black box, needs features',
    useCase: 'Complex products (XYZ: Y)',
  },
  'XGBoost': {
    model: 'XGBoost',
    accuracy: 'excellent',
    strength: 'State-of-the-art, handles lags',
    weakness: 'Needs tuning',
    useCase: 'High-value products (ABC: A)',
  },
  'Prophet': {
    model: 'Facebook Prophet',
    accuracy: 'excellent',
    strength: 'Holiday effects, robust',
    weakness: 'Slower training',
    useCase: 'Retail, promotional effects',
  },
};

export default function ModelComparisonPage() {
  const { getSalesHistory } = useAppData();
  const { products, selectedSku, setSelectedSku, product } = useProductList();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ models: ModelResult[]; best: string } | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'ok' | 'error'>('error');
  const [activeTab, setActiveTab] = useState('comparison');

  useEffect(() => {
    forecastApi.health()
      .then(() => setServiceStatus('ok'))
      .catch(() => {
        setServiceStatus('error');
        toast.info('Running in demo mode (service not available)');
      });
  }, []);

  async function runBacktest() {
    setRunning(true);
    try {
      if (!product) return;
      const sales = getSalesHistory(selectedSku, 36);

      const result = await forecastApi.runForecast({
        product_id: selectedSku,
        sku: product.sku,
        product_name: product.product_name,
        history: sales.map(s => ({
          date: s.date,
          units: s.units_sold,
          revenue: s.revenue,
          promotion_flag: s.promotion_flag,
          stockout_flag: s.stockout_flag,
        })),
        forecast_horizon: 12,
      });

      const modelResults = result.model_performance
        ? Object.entries(result.model_performance).map(([name, metrics]: any) => ({
            model_name: name,
            mape: metrics.mape,
            wape: metrics.wape,
            mase: metrics.mase,
            rmse: metrics.rmse,
            bias: metrics.bias,
            rmsse: metrics.rmsse,
            selected: name === result.best_model,
          }))
        : [];

      setResults({
        models: modelResults,
        best: result.best_model,
      });

      toast.success(`Model comparison complete: ${result.best_model} ranked #1`);
    } catch (error) {
      toast.error(`Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  }

  if (!product) {
    return (
      <div className="p-6 text-muted-foreground">Aucun produit — importez un fichier CSV.</div>
    );
  }

  const bestModel = results?.models.find(m => m.selected);
  const sortedModels = results?.models.sort((a, b) => a.mase - b.mase) || [];

  // Prepare comparison data for matrix visualization
  const modelMatrix = sortedModels.map(m => ({
    name: m.model_name,
    mape: m.mape,
    mase: m.mase,
    accuracy: m.mape <= 10 ? 'Excellent' : m.mape <= 20 ? 'Good' : m.mape <= 30 ? 'Fair' : 'Poor',
    rank: sortedModels.findIndex(x => x.model_name === m.model_name) + 1,
  }));

  // Radar chart data
  const radarData = sortedModels.slice(0, 5).map(m => ({
    model: m.model_name.substring(0, 12),
    MAPE: Math.max(0, 100 - m.mape),
    MASE: Math.max(0, 100 - m.mase * 10),
    Bias: Math.max(0, 100 - Math.abs(m.bias)),
    Stability: Math.max(0, 100 - m.rmsse * 5),
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Model Comparison & Strategy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {serviceStatus === 'ok'
              ? 'Compare 13 forecasting algorithms. Select best fit for your product strategy.'
              : 'Service unavailable - demo mode'}
          </p>
        </div>
        {serviceStatus === 'error' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Service unavailable
          </div>
        )}
        <Button onClick={runBacktest} disabled={running || serviceStatus === 'error'} className="gap-2">
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Comparing…' : 'Run Comparison'}
        </Button>
      </div>

      {/* Controls */}
      <div className="rounded-xl border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Product (SKU)</label>
        <Select value={selectedSku} onValueChange={setSelectedSku}>
          <SelectTrigger className="max-w-xs h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.sku} value={p.sku}>{p.sku} — {p.product_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {bestModel && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            title="Best Model"
            value={results!.best}
            status="green"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <KpiCard
            title="MASE"
            value={formatNumber(bestModel.mase, false)}
            status={bestModel.mase <= 0.8 ? 'green' : bestModel.mase <= 1.2 ? 'orange' : 'red'}
            subtitle="Lower is better"
          />
          <KpiCard
            title="MAPE"
            value={formatPercent(bestModel.mape)}
            status={bestModel.mape <= 10 ? 'green' : bestModel.mape <= 20 ? 'orange' : 'red'}
            subtitle="Accuracy"
          />
          <KpiCard
            title="Ranking"
            value={`1 of ${results?.models.length}`}
            subtitle="Among all models"
            status="green"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comparison">Metrics Comparison</TabsTrigger>
          <TabsTrigger value="matrix">Performance Matrix</TabsTrigger>
          <TabsTrigger value="guide">Model Guide</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Metrics Comparison */}
        <TabsContent value="comparison" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Accuracy Comparison */}
            <ChartCard title="Accuracy Comparison (MAPE %)" subtitle="Lower is better">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={sortedModels.slice(0, 8).map(m => ({
                    name: m.model_name.substring(0, 12),
                    mape: Math.round(m.mape * 100) / 100,
                  }))}
                  margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="mape" fill="hsl(219, 90%, 56%)">
                    {sortedModels.slice(0, 8).map((m, idx) => (
                      <Cell key={`cell-${idx}`} fill={m.selected ? 'hsl(142, 71%, 50%)' : 'hsl(219, 90%, 56%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Efficiency: MASE vs RMSE */}
            <ChartCard title="Efficiency Trade-off" subtitle="MASE vs RMSE">
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" dataKey="mase" name="MASE" tick={{ fontSize: 11 }} />
                  <YAxis type="number" dataKey="rmse" name="RMSE" tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => value.toFixed(2)}
                  />
                  <Scatter
                    name="Models"
                    data={sortedModels.map(m => ({ ...m, rmse: m.rmse / 100 }))}
                    fill="hsl(213, 94%, 55%)"
                  >
                    {sortedModels.map((m, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={m.selected ? 'hsl(142, 71%, 50%)' : 'hsl(213, 94%, 55%)'}
                        opacity={m.selected ? 1 : 0.6}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Detailed Table */}
          <ChartCard title="Complete Rankings" subtitle="All models ranked by MASE">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium">Rank</th>
                    <th className="text-left px-3 py-2 font-medium">Model</th>
                    <th className="text-right px-3 py-2 font-medium">MASE</th>
                    <th className="text-right px-3 py-2 font-medium">MAPE %</th>
                    <th className="text-right px-3 py-2 font-medium">WAPE %</th>
                    <th className="text-right px-3 py-2 font-medium">RMSE</th>
                    <th className="text-right px-3 py-2 font-medium">Bias %</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModels.map((m, idx) => (
                    <tr key={m.model_name} className={cn('border-b hover:bg-muted/20', m.selected && 'bg-emerald-500/5')}>
                      <td className="px-3 py-2 font-bold text-muted-foreground">{idx + 1}</td>
                      <td className={cn('px-3 py-2 font-medium', m.selected && 'text-emerald-400')}>
                        <div className="flex items-center gap-2">
                          {m.model_name}
                          {m.selected && <Badge className="text-xs bg-emerald-500/20 text-emerald-400">Best</Badge>}
                        </div>
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono', m.mase <= 0.8 ? 'text-emerald-400' : 'text-muted-foreground')}>
                        {m.mase.toFixed(3)}
                      </td>
                      <td className={cn('px-3 py-2 text-right font-mono', m.mape <= 10 ? 'text-emerald-400' : 'text-muted-foreground')}>
                        {m.mape.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {m.wape.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {m.rmse.toFixed(0)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                        {m.bias > 0 ? '+' : ''}{m.bias.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Performance Matrix */}
        <TabsContent value="matrix" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {sortedModels.slice(0, 13).map((model, idx) => {
              const chars = MODEL_CHARACTERISTICS[model.model_name] || { accuracy: 'good', strength: 'Balanced', weakness: 'None', useCase: 'General' };
              const accuracyColors = { excellent: 'text-emerald-400', good: 'text-blue-400', fair: 'text-amber-400', poor: 'text-red-400' };
              return (
                <div
                  key={model.model_name}
                  className={cn(
                    'rounded-lg border bg-card p-4 transition-all hover:border-primary/50',
                    idx === 0 && 'ring-2 ring-emerald-500/50'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{model.model_name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Rank #{idx + 1}</p>
                    </div>
                    <span className={cn('text-xs font-bold', accuracyColors[chars.accuracy as keyof typeof accuracyColors])}>
                      {chars.accuracy.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-muted-foreground">Strength: </span>
                      <span>{chars.strength}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Weakness: </span>
                      <span>{chars.weakness}</span>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Use Case: </span>
                      <span>{chars.useCase}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">MAPE:</span>
                      <span className="font-mono">{model.mape.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">MASE:</span>
                      <span className="font-mono">{model.mase.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Model Guide */}
        <TabsContent value="guide" className="space-y-4">
          <ChartCard title="Statistical Models" subtitle="Traditional time series methods">
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Simple Moving Average (SMA)</h4>
                <p className="text-muted-foreground">Best for: Stable, non-seasonal products. Fast to train, easy to explain.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Exponential Smoothing & Holt-Winters</h4>
                <p className="text-muted-foreground">Best for: Seasonal products with trend. Captures trend and seasonality separately.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">ARIMA / SARIMA</h4>
                <p className="text-muted-foreground">Best for: Non-stationary data with clear AR/MA patterns. SARIMA adds seasonal differencing.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Croston's Method</h4>
                <p className="text-muted-foreground">Best for: Intermittent demand (spare parts, seasonal products). Specialized for sparse data.</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Machine Learning Models" subtitle="Data-driven, feature-based approaches">
            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Random Forest & XGBoost</h4>
                <p className="text-muted-foreground">Best for: Complex non-linear patterns, multiple external features. Handles lags, promotions, events.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Linear Regression</h4>
                <p className="text-muted-foreground">Best for: Quick baselines, interpretability. Assumes linear relationship with features.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Prophet (Facebook)</h4>
                <p className="text-muted-foreground">Best for: Retail with holidays, promotional effects. Robust to missing data and outliers.</p>
              </div>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations" className="space-y-4">
          <ChartCard title="Strategy by ABC-XYZ Classification" subtitle="Select model based on product characteristics">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                { class: 'A-X', desc: 'High revenue, stable', model: 'Prophet or ETS', reasoning: 'Reliable, captures seasonality' },
                { class: 'A-Y', desc: 'High revenue, variable', model: 'XGBoost or SARIMA', reasoning: 'Handles variability, trends' },
                { class: 'A-Z', desc: 'High revenue, irregular', model: 'Croston or Prophet', reasoning: 'Handles spikes/patterns' },
                { class: 'B-X', desc: 'Mid revenue, stable', model: 'Holt-Winters', reasoning: 'Efficient, good enough' },
                { class: 'B-Y', desc: 'Mid revenue, variable', model: 'ARIMA or Random Forest', reasoning: 'Balanced accuracy/speed' },
                { class: 'B-Z', desc: 'Mid revenue, irregular', model: 'Moving Average', reasoning: 'Avoid over-fitting' },
                { class: 'C-X', desc: 'Low revenue, stable', model: 'SMA', reasoning: 'Simple, fast' },
                { class: 'C-Y', desc: 'Low revenue, variable', model: 'WMA', reasoning: 'Minimal data waste' },
                { class: 'C-Z', desc: 'Low revenue, irregular', model: 'Manual', reasoning: 'Forecast by exception' },
              ].map(r => (
                <div key={r.class} className="rounded-lg border bg-muted/30 p-3">
                  <h4 className="font-semibold text-emerald-400 mb-1">{r.class}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{r.desc}</p>
                  <p className="text-xs font-medium">→ {r.model}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.reasoning}</p>
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Implementation Roadmap" subtitle="Best practices for model deployment">
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400">1.</span>
                <div>
                  <strong>Start with Statistical (Holt-Winters, ARIMA)</strong>
                  <p className="text-muted-foreground">Interpretable, fast to deploy. Good baseline.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400">2.</span>
                <div>
                  <strong>Test Ensemble (Prophet + XGBoost)</strong>
                  <p className="text-muted-foreground">Combine strengths. Use model selection by MASE.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400">3.</span>
                <div>
                  <strong>Monitor Performance (Track MAPE weekly)</strong>
                  <p className="text-muted-foreground">Compare forecast vs actual. Adjust model if accuracy drifts.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400">4.</span>
                <div>
                  <strong>Retrain Regularly (Monthly or quarterly)</strong>
                  <p className="text-muted-foreground">Include new data. Check if ABC-XYZ classification changed.</p>
                </div>
              </li>
            </ol>
          </ChartCard>
        </TabsContent>
      </Tabs>

      {!results && (
        <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center">
          <Grid3x3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Click "Run Comparison" to analyze all 13 models</p>
        </div>
      )}
    </div>
  );
}
