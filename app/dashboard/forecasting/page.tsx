'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { generateForecastData } from '@/lib/mock-data';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard, ForecastVsActualChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { forecastApi } from '@/lib/forecast-api';
import { toast } from 'sonner';
import { FamilyFilters } from '@/components/family-filters';
import { ForecastPlanSelector } from '@/components/forecast-plan-selector';
import { filterCatalog, hasImportedSales } from '@/lib/product-catalog';
import { useAppData } from '@/lib/import-data-context';
import {
  loadForecastPreferences,
  saveForecastPreferences,
  horizonToPeriods,
  granularityLabel,
  type ForecastPreferences,
} from '@/lib/forecast-settings';
import { aggregateSalesHistory } from '@/lib/sales-aggregation';

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
  const { products: allProducts, getSalesHistory, version } = useAppData();
  const [familyFilter, setFamilyFilter] = useState('all');
  const [subfamilyFilter, setSubfamilyFilter] = useState('all');
  const [forecastPrefs, setForecastPrefs] = useState<ForecastPreferences>(loadForecastPreferences);
  const [selectedSku, setSelectedSku] = useState('');
  const [running, setRunning] = useState(false);
  const [forecastState, setForecastState] = useState<ForecastState | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');

  const products = useMemo(() => {
    void version;
    return filterCatalog(allProducts, {
      family: familyFilter,
      subfamily: subfamilyFilter,
    });
  }, [allProducts, version, familyFilter, subfamilyFilter]);

  useEffect(() => {
    if (products.length && (!selectedSku || !products.some(p => p.sku === selectedSku))) {
      setSelectedSku(products[0].sku);
    }
  }, [products, selectedSku]);

  const product = products.find(p => p.sku === selectedSku);

  const sales = useMemo(() => {
    if (!product) return [];
    const raw = getSalesHistory(product.sku);
    return aggregateSalesHistory(raw, forecastPrefs.granularity);
  }, [product, getSalesHistory, forecastPrefs.granularity, version]);

  const horizonPeriods = horizonToPeriods(forecastPrefs.horizonMonths, forecastPrefs.granularity);

  const forecasts = product ? generateForecastData(sales, horizonPeriods) : [];

  useEffect(() => {
    forecastApi.health()
      .then(() => setServiceStatus('ok'))
      .catch(() => setServiceStatus('error'));
  }, []);

  const handlePrefsChange = useCallback((prefs: ForecastPreferences) => {
    setForecastPrefs(prefs);
    saveForecastPreferences(prefs);
    setForecastState(null);
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
    if (!product) return;
    if (serviceStatus === 'error') {
      toast.error('Service forecast indisponible.');
      return;
    }
    if (sales.length < 5) {
      toast.error('Au moins 5 points d\'historique requis pour ce SKU.');
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
        forecast_horizon: horizonPeriods,
      });

      const chartData = sales.slice(-12).map(s => ({
        month: s.date.slice(0, 10),
        actual: s.units_sold,
        forecast: 0,
        lower: 0,
        upper: 0,
      }));

      const stepDays =
        forecastPrefs.granularity === 'daily' ? 1 : forecastPrefs.granularity === 'weekly' ? 7 : 30;

      for (let i = 0; i < result.forecast_units.length; i++) {
        const forecastDate = new Date(sales[sales.length - 1]?.date ?? new Date());
        forecastDate.setDate(forecastDate.getDate() + (i + 1) * stepDays);
        chartData.push({
          month: forecastDate.toISOString().slice(0, 10),
          actual: undefined as never,
          forecast: result.forecast_units[i],
          lower: result.confidence_lower[i],
          upper: result.confidence_upper[i],
        });
      }

      setForecastState({
        modelResults: Object.entries(result.model_details?.all_models || {}).map(([name, metrics]: [string, unknown]) => {
          const m = metrics as { mape: number; wape: number; mase: number; rmse: number; bias: number };
          return {
            name,
            mape: m.mape,
            wape: m.wape,
            mase: m.mase,
            rmse: m.rmse,
            bias: m.bias,
          };
        }),
        bestModel: result.best_model,
        metrics: result.metrics,
        forecast: chartData,
      });

      toast.success(`Prévision : ${result.best_model} · ${forecastPrefs.horizonMonths}M · ${granularityLabel(forecastPrefs.granularity)}`);
    } catch (error) {
      toast.error(`Échec : ${error instanceof Error ? error.message : 'Erreur'}`);
    } finally {
      setRunning(false);
    }
  }

  if (!product) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Aucun produit pour ces filtres. Importez un fichier CSV ou élargissez les filtres famille.</p>
      </div>
    );
  }

  const modelResults = forecastState?.modelResults || [];
  const bestModel = forecastState?.bestModel;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Moteur de prévision</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {serviceStatus === 'ok'
              ? `Horizon ${forecastPrefs.horizonMonths}M · ${granularityLabel(forecastPrefs.granularity)} · ${horizonPeriods} périodes`
              : 'Service indisponible — mode démo'}
          </p>
        </div>
        <Button onClick={handleRun} disabled={running || serviceStatus === 'error'} className="gap-2">
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {running ? 'Calcul…' : 'Lancer les modèles'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border bg-card">
        <FamilyFilters
          family={familyFilter}
          subfamily={subfamilyFilter}
          onFamilyChange={setFamilyFilter}
          onSubfamilyChange={setSubfamilyFilter}
        />
      </div>

      <div className="p-4 rounded-xl border bg-card">
        <ForecastPlanSelector value={forecastPrefs} onChange={handlePrefsChange} />
      </div>

      <div className="flex flex-wrap gap-3 p-4 rounded-xl border bg-card">
        <div className="flex-1 min-w-48">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">SKU</label>
          <Select value={selectedSku} onValueChange={setSelectedSku}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.sku} value={p.sku}>
                  {p.sku} — {p.product_name} ({p.family})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Famille / Sous-famille</label>
          <div className="h-8 flex items-center text-sm">
            {product.family}
            {product.subfamily ? ` / ${product.subfamily}` : ''}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Historique</label>
          <div className="h-8 flex items-center text-sm text-muted-foreground">
            {sales.length} points ({hasImportedSales(product.sku) ? 'import' : 'démo'})
          </div>
        </div>
      </div>

      {serviceStatus === 'error' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          API forecast (port 8000) non joignable
        </div>
      )}

      <ChartCard
        title="Prévision vs réel"
        subtitle={`${product.product_name} ${bestModel ? `· ${bestModel}` : ''}`}
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

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Comparaison des modèles</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">#</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Modèle</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">MAPE %</th>
            </tr>
          </thead>
          <tbody>
            {modelResults.map((model, idx) => (
              <tr key={model.name} className={cn('border-b last:border-0', bestModel === model.name && 'bg-emerald-500/5')}>
                <td className="px-4 py-2.5">{idx + 1}</td>
                <td className="px-4 py-2.5 font-medium">{model.name}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">{formatPercent(model.mape)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
