'use client';

import { useState } from 'react';
import { useAppData } from '@/lib/import-data-context';
import { useProductList } from '@/lib/use-product-list';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard, ForecastVsActualChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Play, Save, TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react';
import { generateForecastData } from '@/lib/mock-data';
import { forecastApi } from '@/lib/forecast-api';
import { toast } from 'sonner';

type ScenarioType = 'demand_increase' | 'demand_decrease' | 'promotion' | 'lead_time_increase' | 'lead_time_decrease';

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  demand_increase: 'Demand Increase',
  demand_decrease: 'Demand Decrease',
  promotion: 'Promotion / Event',
  lead_time_increase: 'Lead Time Increase',
  lead_time_decrease: 'Lead Time Decrease',
};

interface ScenarioResult {
  forecastUnits: number;
  forecastRevenue: number;
  safetyStock: number;
  inventoryRequired: number;
  coverageDays: number;
  chartData: { month: string; actual: number; forecast: number; lower?: number; upper?: number }[];
}

export default function ScenariosPage() {
  const [scenarioType, setScenarioType] = useState<ScenarioType>('demand_increase');
  const { getSalesHistory, getForecastData } = useAppData();
  const { products, selectedSku, setSelectedSku, product } = useProductList();
  const [demandChange, setDemandChange] = useState(10);
  const [leadTimeChange, setLeadTimeChange] = useState(7);
  const [promotionDuration, setPromotionDuration] = useState(4);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [scenarioName, setScenarioName] = useState('');

  if (!product) {
    return <div className="p-6 text-muted-foreground">Aucun produit — importez un CSV.</div>;
  }

  const activeProduct = product;
  const sales = getSalesHistory(selectedSku, 12);
  const baseForecast = getForecastData(selectedSku, 6);
  const baseUnits = baseForecast.reduce((s, f) => s + f.forecast_units, 0);
  const baseRevenue = baseForecast.reduce((s, f) => s + f.forecast_revenue, 0);

  async function runScenario() {
    setRunning(true);
    try {
      const result = await forecastApi.simulateScenario({
        historical_data: sales.map(s => ({
          date: s.date,
          units: s.units_sold,
          revenue: s.revenue,
          promotion_flag: s.promotion_flag,
          stockout_flag: s.stockout_flag,
        })),
        scenario_type: scenarioType,
        parameter: scenarioType === 'demand_increase' || scenarioType === 'demand_decrease' ? demandChange : leadTimeChange,
        lead_time_days: activeProduct.lead_time_days ?? 14,
        service_level: activeProduct.service_level_target ?? 95,
      });

      // Build chart data
      const chartData = [
        ...sales.slice(-6).map(s => ({
          month: s.date.slice(0, 7),
          actual: s.units_sold,
          forecast: 0,
          lower: 0,
          upper: 0,
        })),
        ...result.forecast_units.map((units, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() + i + 1);
          return {
            month: date.toISOString().slice(0, 7),
            actual: undefined as any,
            forecast: units,
            lower: result.forecast_revenue[i] / (units || 1) * 0.85,
            upper: result.forecast_revenue[i] / (units || 1) * 1.15,
          };
        }),
      ];

      setResult({
        forecastUnits: result.forecast_units.reduce((s, u) => s + u, 0),
        forecastRevenue: result.forecast_revenue.reduce((s, r) => s + r, 0),
        safetyStock: result.safety_stock,
        inventoryRequired: result.inventory_required,
        coverageDays: Math.round(result.inventory_required / (result.forecast_units.reduce((s, u) => s + u, 0) / 6 / 30)),
        chartData: chartData as never,
      });
      toast.success('Scenario simulation complete');
    } catch (error) {
      toast.error(`Scenario failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  }

  function saveScenario() {
    if (!scenarioName.trim()) { toast.error('Enter a scenario name first'); return; }
    toast.success(`Scenario "${scenarioName}" saved`);
  }

  const delta = result ? ((result.forecastUnits - baseUnits) / baseUnits) * 100 : null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Scenario Planning</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Simulate demand changes, promotions, and supply disruptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Configuration Panel */}
        <div className="xl:col-span-1 space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              Scenario Configuration
            </h3>

            <div className="space-y-2">
              <Label className="text-xs">Scenario Name</Label>
              <Input
                placeholder="e.g. Q3 Promo Campaign"
                value={scenarioName}
                onChange={e => setScenarioName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Product SKU</Label>
              <Select value={selectedSku} onValueChange={setSelectedSku}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.sku} value={p.sku}>{p.sku} — {p.product_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Scenario Type</Label>
              <Select value={scenarioType} onValueChange={v => setScenarioType(v as ScenarioType)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SCENARIO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(scenarioType === 'demand_increase' || scenarioType === 'demand_decrease') && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-xs">Demand Change</Label>
                  <span className="text-xs font-medium text-primary">{demandChange}%</span>
                </div>
                <Slider
                  value={[demandChange]}
                  onValueChange={([v]) => setDemandChange(v)}
                  min={5}
                  max={50}
                  step={5}
                />
              </div>
            )}

            {(scenarioType === 'lead_time_increase' || scenarioType === 'lead_time_decrease') && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-xs">Lead Time Change</Label>
                  <span className="text-xs font-medium text-primary">{leadTimeChange} days</span>
                </div>
                <Slider
                  value={[leadTimeChange]}
                  onValueChange={([v]) => setLeadTimeChange(v)}
                  min={1}
                  max={30}
                  step={1}
                />
              </div>
            )}

            {scenarioType === 'promotion' && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label className="text-xs">Promotion Duration</Label>
                  <span className="text-xs font-medium text-primary">{promotionDuration} weeks</span>
                </div>
                <Slider
                  value={[promotionDuration]}
                  onValueChange={([v]) => setPromotionDuration(v)}
                  min={1}
                  max={12}
                  step={1}
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button className="flex-1 gap-2" onClick={runScenario} disabled={running}>
                <Play className="w-3.5 h-3.5" />
                {running ? 'Simulating…' : 'Run Simulation'}
              </Button>
              {result && (
                <Button variant="outline" size="icon" onClick={saveScenario} className="w-9 h-9 shrink-0">
                  <Save className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Base vs Scenario */}
          {result && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="text-sm font-semibold">Impact Summary</h3>
              <div className="text-xs text-muted-foreground mb-2">vs. Base Forecast</div>

              {[
                {
                  label: 'Forecast Units',
                  base: formatNumber(baseUnits),
                  scenario: formatNumber(result.forecastUnits),
                  delta: delta!,
                  icon: <Package className="w-3.5 h-3.5" />,
                },
                {
                  label: 'Revenue',
                  base: formatCurrency(baseRevenue, true),
                  scenario: formatCurrency(result.forecastRevenue, true),
                  delta: ((result.forecastRevenue - baseRevenue) / baseRevenue) * 100,
                  icon: <DollarSign className="w-3.5 h-3.5" />,
                },
                {
                  label: 'Safety Stock',
                  base: '—',
                  scenario: formatNumber(result.safetyStock) + ' units',
                  delta: 0,
                  icon: <Package className="w-3.5 h-3.5" />,
                },
                {
                  label: 'Inv. Required',
                  base: '—',
                  scenario: formatNumber(result.inventoryRequired) + ' units',
                  delta: 0,
                  icon: <Package className="w-3.5 h-3.5" />,
                },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">{item.scenario}</div>
                    {item.delta !== 0 && (
                      <div className={cn('text-xs flex items-center gap-1 justify-end',
                        item.delta > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {item.delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="xl:col-span-2 space-y-4">
          <ChartCard
            title={result ? `${SCENARIO_LABELS[scenarioType]} — ${product.product_name}` : 'Base Forecast'}
            subtitle="6-month forecast with scenario overlay"
          >
            <ForecastVsActualChart
              data={(result ? result.chartData : [...sales.slice(-6).map(s => ({ month: s.date.slice(0, 7), actual: s.units_sold, forecast: 0, lower: undefined, upper: undefined })), ...baseForecast.map(f => ({ month: f.forecast_date.slice(0, 7), actual: 0, forecast: f.forecast_units, lower: f.lower_bound, upper: f.upper_bound }))]) as never}
              height={350}
            />
          </ChartCard>

          {!result && (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
              <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Configure a scenario and click <strong>Run Simulation</strong> to see impact analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
