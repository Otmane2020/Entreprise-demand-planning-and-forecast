'use client';

import { useState } from 'react';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [abcFilter, setAbcFilter] = useState('all');

  const categories = ['all', ...Array.from(new Set(MOCK_PRODUCTS.map(p => p.category)))];

  const filtered = MOCK_PRODUCTS.filter(p => {
    const matchSearch = !search ||
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchAbc = abcFilter === 'all' || p.abc_class === abcFilter;
    return matchSearch && matchCat && matchAbc;
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{MOCK_PRODUCTS.length} SKUs across {categories.length - 1} categories</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search SKU or product name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={abcFilter} onValueChange={setAbcFilter}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="ABC Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="A">Class A</SelectItem>
            <SelectItem value="B">Class B</SelectItem>
            <SelectItem value="C">Class C</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} results</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Category</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Unit Price</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Lead Time</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">Service Level</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">ABC</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">XYZ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((product, idx) => (
              <tr
                key={product.sku}
                className={cn('border-b last:border-0 hover:bg-muted/20 transition-colors', idx % 2 === 0 ? '' : 'bg-muted/5')}
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground font-medium">{product.sku}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{product.product_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{product.brand}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  <div>{product.category}</div>
                  <div className="text-xs text-muted-foreground/70">{product.subcategory}</div>
                </td>
                <td className="px-4 py-3 text-right font-medium hidden lg:table-cell">
                  {formatCurrency(product.unit_price)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden lg:table-cell">
                  {product.lead_time_days}d
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden xl:table-cell">
                  {product.service_level_target}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border', ABC_BADGE[product.abc_class ?? 'C'])}>
                    {product.abc_class}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn('inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border', XYZ_BADGE[product.xyz_class ?? 'Z'])}>
                    {product.xyz_class}
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
