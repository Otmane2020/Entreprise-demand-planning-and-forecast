'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCatalogProducts, getFamilies, getSubfamilies } from '@/lib/product-catalog';

interface FamilyFiltersProps {
  family: string;
  subfamily: string;
  onFamilyChange: (value: string) => void;
  onSubfamilyChange: (value: string) => void;
  familyTriggerClass?: string;
  subfamilyTriggerClass?: string;
}

export function FamilyFilters({
  family,
  subfamily,
  onFamilyChange,
  onSubfamilyChange,
  familyTriggerClass = 'w-44 h-8 text-sm',
  subfamilyTriggerClass = 'w-48 h-8 text-sm',
}: FamilyFiltersProps) {
  const products = getCatalogProducts();
  const families = ['all', ...getFamilies(products)];
  const subfamilies = ['all', ...getSubfamilies(products, family)];

  return (
    <>
      <Select
        value={family}
        onValueChange={v => {
          onFamilyChange(v);
          onSubfamilyChange('all');
        }}
      >
        <SelectTrigger className={familyTriggerClass}>
          <SelectValue placeholder="Famille" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les familles</SelectItem>
          {families.filter(f => f !== 'all').map(f => (
            <SelectItem key={f} value={f}>{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={subfamily} onValueChange={onSubfamilyChange} disabled={family === 'all' && subfamilies.length <= 1}>
        <SelectTrigger className={subfamilyTriggerClass}>
          <SelectValue placeholder="Sous-famille" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les sous-familles</SelectItem>
          {subfamilies.filter(s => s !== 'all').map(s => (
            <SelectItem key={s} value={s}>{s || '—'}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
