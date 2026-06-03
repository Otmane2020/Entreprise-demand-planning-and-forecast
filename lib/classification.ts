import { supabase, AbcClass, XyzClass, SalesHistory, Product } from '@/lib/supabase';

// =====================
// ABC CLASSIFICATION
// =====================

export async function classifyABC(products: Array<{ sku: string; totalRevenue: number }>): Promise<Record<string, AbcClass>> {
  if (!products.length) return {};

  const totalRevenue = products.reduce((s, p) => s + p.totalRevenue, 0);
  const sorted = [...products].sort((a, b) => b.totalRevenue - a.totalRevenue);

  let cumulativeRevenue = 0;
  const classification: Record<string, AbcClass> = {};

  for (const product of sorted) {
    cumulativeRevenue += product.totalRevenue;
    const cumulativePercent = (cumulativeRevenue / totalRevenue) * 100;

    let cls: AbcClass;
    if (cumulativePercent <= 80) cls = 'A';
    else if (cumulativePercent <= 95) cls = 'B';
    else cls = 'C';

    classification[product.sku] = cls;
  }

  return classification;
}

// =====================
// XYZ CLASSIFICATION
// =====================

export async function classifyXYZ(salesData: Record<string, number[]>): Promise<Record<string, XyzClass>> {
  const classification: Record<string, XyzClass> = {};

  for (const [sku, units] of Object.entries(salesData)) {
    if (!units.length) continue;

    const mean = units.reduce((s, u) => s + u, 0) / units.length;
    const variance = units.reduce((s, u) => s + Math.pow(u - mean, 2), 0) / units.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 1;

    let cls: XyzClass;
    if (cv <= 0.1) cls = 'X';
    else if (cv <= 0.25) cls = 'Y';
    else cls = 'Z';

    classification[sku] = cls;
  }

  return classification;
}

// =====================
// SAVE CLASSIFICATIONS
// =====================

export async function updateProductClassifications() {
  try {
    // Get all products with sales data
    const { data: products } = await supabase
      .from('products')
      .select('*');

    if (!products?.length) return;

    // Get sales history
    const { data: sales } = await supabase
      .from('sales_history')
      .select('product_id, units_sold, revenue');

    if (!sales?.length) return;

    // Group sales by product
    const productRevenue: Record<string, number> = {};
    const productUnits: Record<string, number[]> = {};

    for (const sale of sales) {
      const sku = products.find(p => p.id === sale.product_id)?.sku;
      if (!sku) continue;

      productRevenue[sku] = (productRevenue[sku] || 0) + (sale.revenue || 0);
      if (!productUnits[sku]) productUnits[sku] = [];
      productUnits[sku].push(sale.units_sold);
    }

    // Classify
    const abcClass = await classifyABC(
      Object.entries(productRevenue).map(([sku, revenue]) => ({ sku, totalRevenue: revenue }))
    );
    const xyzClass = await classifyXYZ(productUnits);

    // Update database
    const updates = products.map(p => ({
      id: p.id,
      abc_class: abcClass[p.sku],
      xyz_class: xyzClass[p.sku],
    }));

    for (const update of updates) {
      await supabase
        .from('products')
        .update({ abc_class: update.abc_class, xyz_class: update.xyz_class })
        .eq('id', update.id);
    }
  } catch (error) {
    console.error('Error updating classifications:', error);
  }
}
