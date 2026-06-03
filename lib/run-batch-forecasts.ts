import { getCatalogProducts, getImportedSalesForSku } from '@/lib/product-catalog';
import { horizonToPeriods, type ForecastPreferences } from '@/lib/forecast-settings';
import { aggregateSalesHistory } from '@/lib/sales-aggregation';
import { forecastApi } from '@/lib/forecast-api';

const RESULTS_KEY = 'demandiq_batch_forecast_results';

export interface BatchForecastResult {
  sku: string;
  product_name: string;
  best_model: string;
  forecast_units: number[];
  ran_at: string;
  error?: string;
}

export function saveBatchResults(results: BatchForecastResult[]): void {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  window.dispatchEvent(new Event('demandiq-import-updated'));
}

export function loadBatchResults(): BatchForecastResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as BatchForecastResult[]) : [];
  } catch {
    return [];
  }
}

export async function runBatchForecasts(prefs: ForecastPreferences): Promise<BatchForecastResult[]> {
  const products = getCatalogProducts();
  const horizon = horizonToPeriods(prefs.horizonMonths, prefs.granularity);
  const results: BatchForecastResult[] = [];

  for (const product of products) {
    const raw = getImportedSalesForSku(product.sku);
    if (raw.length < 5) {
      results.push({
        sku: product.sku,
        product_name: product.product_name,
        best_model: '—',
        forecast_units: [],
        ran_at: new Date().toISOString(),
        error: `Historique insuffisant (${raw.length} points)`,
      });
      continue;
    }

    const history = aggregateSalesHistory(
      raw.map(r => ({
        date: r.date,
        units_sold: r.units_sold,
        revenue: r.revenue,
        promotion_flag: r.promotion_flag,
        stockout_flag: r.stockout_flag,
      })),
      prefs.granularity
    );

    try {
      const out = await forecastApi.runForecast({
        product_id: product.sku,
        sku: product.sku,
        product_name: product.product_name,
        history: history.map(h => ({
          date: h.date,
          units: h.units_sold,
          revenue: h.revenue,
          promotion_flag: h.promotion_flag,
          stockout_flag: h.stockout_flag,
        })),
        forecast_horizon: horizon,
      });
      results.push({
        sku: product.sku,
        product_name: product.product_name,
        best_model: out.best_model,
        forecast_units: out.forecast_units,
        ran_at: new Date().toISOString(),
      });
    } catch (e) {
      results.push({
        sku: product.sku,
        product_name: product.product_name,
        best_model: '—',
        forecast_units: [],
        ran_at: new Date().toISOString(),
        error: e instanceof Error ? e.message : 'Erreur',
      });
    }
  }

  saveBatchResults(results);
  return results;
}
