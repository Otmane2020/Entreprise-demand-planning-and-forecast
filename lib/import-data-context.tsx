'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { buildImportedSnapshot, hasImportedData, type ImportedSnapshot } from '@/lib/imported-analytics';
import {
  MOCK_METRICS,
  MOCK_MONTHLY_CHART,
  MOCK_MAPE_TREND,
  MOCK_ABC_DATA,
  MOCK_XYZ_DATA,
  generateSalesHistory,
  generateForecastData,
} from '@/lib/mock-data';
import { getCatalogProducts, getImportedSalesForSku, type CatalogProduct } from '@/lib/product-catalog';

export const IMPORT_UPDATED_EVENT = 'demandiq-import-updated';

export function notifyImportUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(IMPORT_UPDATED_EVENT));
  }
}

export interface AppDataContextValue {
  version: number;
  hasImportedData: boolean;
  source: 'import' | 'mock';
  products: CatalogProduct[];
  snapshot: ImportedSnapshot | null;
  refresh: () => void;
  metrics: typeof MOCK_METRICS;
  monthlyChart: typeof MOCK_MONTHLY_CHART;
  mapeTrend: typeof MOCK_MAPE_TREND;
  abcData: typeof MOCK_ABC_DATA;
  xyzData: typeof MOCK_XYZ_DATA;
  coverageData: Array<{ name: string; coverage: number; safety: number; target: number }>;
  productMetrics: Array<{
    sku: string;
    name: string;
    family?: string;
    mape: number;
    wape: number;
    bias: number;
    abc_class?: string;
    xyz_class?: string;
  }>;
  risks: Array<{ sku: string; name: string; issue: string; severity: string }>;
  opportunities: Array<{ sku: string; name: string; insight: string }>;
  getSalesHistory: (sku: string, months?: number) => ReturnType<typeof generateSalesHistory>;
  getForecastData: (
    sku: string,
    horizon: number
  ) => ReturnType<typeof generateForecastData>;
  getProduct: (sku: string) => CatalogProduct | undefined;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const DEFAULT_COVERAGE = [
  { name: 'Electronics', coverage: 38, safety: 8, target: 45 },
  { name: 'Apparel', coverage: 52, safety: 10, target: 60 },
  { name: 'Food & Bev', coverage: 22, safety: 5, target: 28 },
];

export function ImportDataProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    const onUpdate = () => setVersion(v => v + 1);
    window.addEventListener(IMPORT_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(IMPORT_UPDATED_EVENT, onUpdate);
  }, []);

  const value = useMemo((): AppDataContextValue => {
    const imported = hasImportedData();
    const snapshot = imported ? buildImportedSnapshot() : null;
    const products = getCatalogProducts();
    const source = imported ? 'import' : 'mock';

    const getSalesHistory = (sku: string, months = 24) => {
      if (imported) {
        const rows = getImportedSalesForSku(sku);
        if (rows.length) {
          return rows.map(r => ({
            date: r.date,
            units_sold: r.units_sold,
            revenue: r.revenue,
            promotion_flag: r.promotion_flag,
            stockout_flag: r.stockout_flag,
          }));
        }
      }
      return generateSalesHistory(sku, months);
    };

    const getForecastData = (sku: string, horizon: number) => {
      const sales = getSalesHistory(sku);
      return generateForecastData(sales, horizon);
    };

    const mockProductMetrics = products.map(p => ({
      sku: p.sku,
      name: p.product_name,
      family: p.family,
      mape: 10 + (p.sku.charCodeAt(0) % 12),
      wape: 9 + (p.sku.charCodeAt(1) % 10),
      bias: (p.sku.charCodeAt(2) % 7) - 3,
      abc_class: p.abc_class ?? undefined,
      xyz_class: p.xyz_class ?? undefined,
    }));

    return {
      version,
      hasImportedData: imported,
      source,
      products,
      snapshot,
      refresh,
      metrics: snapshot?.metrics ?? MOCK_METRICS,
      monthlyChart: snapshot?.monthlyChart ?? MOCK_MONTHLY_CHART,
      mapeTrend: snapshot?.mapeTrend ?? MOCK_MAPE_TREND,
      abcData: snapshot?.abcData ?? MOCK_ABC_DATA,
      xyzData: snapshot?.xyzData ?? MOCK_XYZ_DATA,
      coverageData: snapshot?.coverageData ?? DEFAULT_COVERAGE,
      productMetrics: snapshot?.productMetrics ?? mockProductMetrics,
      risks: snapshot?.risks ?? [],
      opportunities: snapshot?.opportunities ?? [],
      getSalesHistory,
      getForecastData,
      getProduct: (sku: string) => products.find(p => p.sku === sku),
    };
  }, [version]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within ImportDataProvider');
  return ctx;
}
