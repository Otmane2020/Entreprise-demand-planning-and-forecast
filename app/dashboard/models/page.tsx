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
import { Play, RefreshCw, TrendingUp, AlertCircle, CheckCircle2, BarChart3 } from 'lucide-react';
import { forecastApi } from '@/lib/forecast-api';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  ScatterChart, Scatter, LineChart, Line
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

export default function ModelSelectionPage() {
  const { getSalesHistory } = useAppData();
  const { products, selectedSku, setSelectedSku, product } = useProductList();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<{ models: ModelResult[]; best: string } | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'ok' | 'error'>('error');

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
      const sales = getSalesHistory(selectedSku, 24);

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
        forecast_horizon: 6,
      });

      // Transform to display format
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

      toast.success(`Backtesting complete: ${result.best_model} selected`);
    } catch (error) {
      toast.error(`Backtesting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  }

  if (!product) {
    return <div className="p-6 text-muted-foreground">Aucun produit — importez un CSV.</div>;
  }

  const bestModel = results?.models.find(m => m.selected);
  const sortedModels = results?.models.sort((a, b) => a.mase - b.mase) || [];

  // Scatter plot data: MAPE vs MASE
  const scatterData = sortedModels.map(m => ({
    name: m.model_name,
    mape: m.mape,
    mase: m.mase,
    best: m.selected,
  }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Model Selection & Backtesting</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {serviceStatus === 'ok'
              ? '15 models compared. Auto-selection by MASE'
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
          {running ? 'Running Backtest…' : 'Run Backtest'}
        </Button>
      </div>

      {/* Controls */}
      <div className="rounded-xl border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Product</label>
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
            title="Bias"
            value={`${bestModel.bias > 0 ? '+' : ''}${bestModel.bias.toFixed(1)}%`}
            subtitle={bestModel.bias > 0 ? 'Over-forecast' : 'Under-forecast'}
            status={Math.abs(bestModel.bias) <= 5 ? 'green' : 'orange'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Model Comparison Table */}
        <ChartCard title="Model Performance Comparison" subtitle="Ranked by MASE (primary metric)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-3 py-2 font-medium">Model</th>
                  <th className="text-right px-3 py-2 font-medium">MASE</th>
                  <th className="text-right px-3 py-2 font-medium">MAPE %</th>
                  <th className="text-right px-3 py-2 font-medium">RMSE</th>
                </tr>
              </thead>
              <tbody>
                {sortedModels.slice(0, 8).map((model, idx) => (
                  <tr key={model.model_name} className={cn(
                    'border-b last:border-0 hover:bg-muted/20 transition-colors',
                    model.selected ? 'bg-emerald-500/5' : ''
                  )}>
                    <td className={cn('px-3 py-2 font-medium', model.selected && 'text-emerald-400')}>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-muted">
                          {idx + 1}
                        </span>
                        {model.model_name}
                        {model.selected && (
                          <Badge className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono', model.mase <= 0.8 ? 'text-emerald-400' : 'text-muted-foreground')}>
                      {model.mase.toFixed(2)}
                    </td>
                    <td className={cn('px-3 py-2 text-right font-mono', model.mape <= 10 ? 'text-emerald-400' : 'text-muted-foreground')}>
                      {model.mape.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {model.rmse.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {/* MAPE vs MASE Scatter */}
        <ChartCard title="Model Efficiency" subtitle="MAPE vs MASE trade-off">
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" dataKey="mape" name="MAPE %" tick={{ fontSize: 11 }} />
              <YAxis type="number" dataKey="mase" name="MASE" tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => value.toFixed(2)}
                labelFormatter={(value: string) => value}
              />
              <Scatter
                name="Models"
                data={scatterData}
                fill="hsl(213, 94%, 55%)"
                shape="circle"
              >
                {scatterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.best ? 'hsl(142, 71%, 50%)' : 'hsl(213, 94%, 55%)'}
                    opacity={entry.best ? 1 : 0.6}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Detailed Metrics */}
      {results && (
        <ChartCard title="Complete Model Performance" subtitle="All metrics for decision making">
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-3 py-2 font-medium">Model</th>
                  <th className="text-right px-3 py-2 font-medium">MASE</th>
                  <th className="text-right px-3 py-2 font-medium">MAPE %</th>
                  <th className="text-right px-3 py-2 font-medium">WAPE %</th>
                  <th className="text-right px-3 py-2 font-medium">RMSE</th>
                  <th className="text-right px-3 py-2 font-medium">Bias %</th>
                  <th className="text-right px-3 py-2 font-medium">RMSSE</th>
                </tr>
              </thead>
              <tbody>
                {sortedModels.map(m => (
                  <tr key={m.model_name} className={cn('border-b hover:bg-muted/20', m.selected && 'bg-emerald-500/5')}>
                    <td className={cn('px-3 py-2 font-medium', m.selected && 'text-emerald-400')}>
                      {m.model_name}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{m.mase.toFixed(3)}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.mape.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.wape.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.rmse.toFixed(0)}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.bias.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono">{m.rmsse.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {!results && (
        <div className="rounded-xl border border-dashed bg-muted/20 p-12 text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Click "Run Backtest" to compare all 15 models</p>
        </div>
      )}
    </div>
  );
}
