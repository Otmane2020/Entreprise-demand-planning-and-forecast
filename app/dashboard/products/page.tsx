'use client';

import { useMemo, useState } from 'react';
import {
  getCatalogProducts,
  filterCatalog,
  type CatalogProduct,
} from '@/lib/product-catalog';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { FamilyFilters } from '@/components/family-filters';

const ABC_BADGE: Record<string, string> = {
  A: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  B: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  C: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

const XYZ_BADGE: Record<string, string> = {
  X: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Y: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Z: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [subfamilyFilter, setSubfamilyFilter] = useState('all');
  const [abcFilter, setAbcFilter] = useState('all');
  const [catalogVersion, setCatalogVersion] = useState(0);

  const allProducts = useMemo(() => {
    void catalogVersion;
    return getCatalogProducts();
  }, [catalogVersion]);

  const filtered = useMemo(() => {
    let list = filterCatalog(allProducts, {
      family: familyFilter,
      subfamily: subfamilyFilter,
      search,
    });
    if (abcFilter !== 'all') {
      list = list.filter(p => p.abc_class === abcFilter);
    }
    return list;
  }, [allProducts, familyFilter, subfamilyFilter, search, abcFilter]);

  const families = useMemo(
    () => new Set(allProducts.map(p => p.family)).size,
    [allProducts]
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Produits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allProducts.length} SKU · {families} familles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setCatalogVersion(v => v + 1)}>
            Actualiser
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher SKU ou produit…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <FamilyFilters
          family={familyFilter}
          subfamily={subfamilyFilter}
          onFamilyChange={setFamilyFilter}
          onSubfamilyChange={setSubfamilyFilter}
        />
        <select
          value={abcFilter}
          onChange={e => setAbcFilter(e.target.value)}
          className="h-8 text-sm rounded-md border border-input bg-background px-3"
        >
          <option value="all">Toutes classes ABC</option>
          <option value="A">Classe A</option>
          <option value="B">Classe B</option>
          <option value="C">Classe C</option>
        </select>
        <span className="text-sm text-muted-foreground">{filtered.length} résultats</span>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Produit</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Famille</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Sous-famille</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Prix</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Source</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((product: CatalogProduct, idx) => (
              <tr
                key={product.sku}
                className={cn('border-b last:border-0 hover:bg-muted/20 transition-colors', idx % 2 === 1 && 'bg-muted/5')}
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground font-medium">{product.sku}</td>
                <td className="px-4 py-3 font-medium">{product.product_name}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{product.family}</td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{product.subfamily || '—'}</td>
                <td className="px-4 py-3 text-right hidden lg:table-cell">
                  {product.unit_price != null ? formatCurrency(product.unit_price) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full border',
                      product.source === 'import'
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {product.source === 'import' ? 'Import' : 'Démo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/dashboard/products/${product.sku}`}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
