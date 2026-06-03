export interface LocalSalesRow {
  date: string;
  sku: string;
  product_name: string;
  category: string;
  units_sold: number;
  revenue: number;
  promotion_flag: boolean;
  stockout_flag: boolean;
  imported_at: string;
}

const STORAGE_KEY = 'demandiq_local_sales_imports';

export function saveLocalImport(rows: Omit<LocalSalesRow, 'imported_at'>[]): number {
  const stamped: LocalSalesRow[] = rows.map(r => ({
    ...r,
    imported_at: new Date().toISOString(),
  }));
  const existing = loadLocalImports();
  const merged = [...existing, ...stamped];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return stamped.length;
}

export function loadLocalImports(): LocalSalesRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalSalesRow[];
  } catch {
    return [];
  }
}

export function clearLocalImports(): void {
  localStorage.removeItem(STORAGE_KEY);
}
