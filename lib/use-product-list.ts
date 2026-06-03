'use client';

import { useEffect, useState } from 'react';
import { useAppData } from '@/lib/import-data-context';

/** Keeps selected SKU in sync when import refreshes the product catalog. */
export function useProductList(defaultIndex = 0) {
  const { products } = useAppData();
  const [selectedSku, setSelectedSku] = useState('');

  useEffect(() => {
    if (!products.length) {
      setSelectedSku('');
      return;
    }
    if (!selectedSku || !products.some(p => p.sku === selectedSku)) {
      setSelectedSku(products[Math.min(defaultIndex, products.length - 1)].sku);
    }
  }, [products, selectedSku, defaultIndex]);

  const product = products.find(p => p.sku === selectedSku);

  return { products, selectedSku, setSelectedSku, product };
}
