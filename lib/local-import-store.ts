export interface LocalSalesRow {
  date: string;
  sku: string;
  product_name: string;
  family: string;
  subfamily: string;
  category: string;
  subcategory: string;
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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('demandiq-import-updated'));
  }
  return stamped.length;
}

export function loadLocalImports(): LocalSalesRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as LocalSalesRow[];
    return rows.map(row => ({
      ...row,
      family: row.family ?? row.category ?? 'Non classé',
      subfamily: row.subfamily ?? row.subcategory ?? '',
      category: row.category ?? row.family ?? 'Non classé',
      subcategory: row.subcategory ?? row.subfamily ?? '',
    }));
  } catch {
    return [];
  }
}

export function clearLocalImports(): void {
  localStorage.removeItem(STORAGE_KEY);
}
