import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { loadLocalImports, type LocalSalesRow } from '@/lib/local-import-store';

export interface CatalogProduct {
  sku: string;
  product_name: string;
  family: string;
  subfamily: string;
  category: string;
  subcategory: string;
  source: 'mock' | 'import';
  unit_price?: number;
  abc_class?: string | null;
  xyz_class?: string | null;
}

function fromMock(): CatalogProduct[] {
  return MOCK_PRODUCTS.map(p => ({
    sku: p.sku,
    product_name: p.product_name,
    family: p.category,
    subfamily: p.subcategory ?? '',
    category: p.category,
    subcategory: p.subcategory ?? '',
    source: 'mock' as const,
    unit_price: p.unit_price,
    abc_class: p.abc_class,
    xyz_class: p.xyz_class,
  }));
}

function fromImports(): CatalogProduct[] {
  const rows = loadLocalImports();
  const bySku = new Map<string, CatalogProduct>();

  for (const row of rows) {
    const family = row.family || row.category || 'Non classé';
    const subfamily = row.subfamily || row.subcategory || '';
    if (!bySku.has(row.sku)) {
      bySku.set(row.sku, {
        sku: row.sku,
        product_name: row.product_name,
        family,
        subfamily,
        category: family,
        subcategory: subfamily,
        source: 'import',
      });
    }
  }
  return Array.from(bySku.values());
}

export function getCatalogProducts(): CatalogProduct[] {
  const imported = fromImports();
  const importedSkus = new Set(imported.map(p => p.sku));
  const mock = fromMock().filter(p => !importedSkus.has(p.sku));
  return [...imported, ...mock];
}

export function getFamilies(products: CatalogProduct[]): string[] {
  return Array.from(new Set(products.map(p => p.family).filter(Boolean))).sort();
}

export function getSubfamilies(products: CatalogProduct[], family: string): string[] {
  const filtered =
    family === 'all' ? products : products.filter(p => p.family === family);
  return Array.from(new Set(filtered.map(p => p.subfamily).filter(Boolean))).sort();
}

export function filterCatalog(
  products: CatalogProduct[],
  opts: { family?: string; subfamily?: string; search?: string }
): CatalogProduct[] {
  return products.filter(p => {
    if (opts.family && opts.family !== 'all' && p.family !== opts.family) return false;
    if (opts.subfamily && opts.subfamily !== 'all' && p.subfamily !== opts.subfamily) return false;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      if (!p.sku.toLowerCase().includes(q) && !p.product_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export function getImportedSalesForSku(sku: string): LocalSalesRow[] {
  return loadLocalImports()
    .filter(r => r.sku === sku)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function hasImportedSales(sku: string): boolean {
  return getImportedSalesForSku(sku).length > 0;
}
