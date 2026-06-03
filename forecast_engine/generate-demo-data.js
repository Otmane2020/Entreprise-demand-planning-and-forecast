/**
 * Demo Data Generator for DemandIQ
 * Generates CSV files with 120+ SKUs, 36 months of sales history, and promotions
 * Usage: node generate-demo-data.js
 */

const fs = require('fs');
const path = require('path');

function generateProducts(numSkus = 120) {
  const categories = ['Electronics', 'Apparel', 'Food & Beverage', 'Home & Garden', 'Sports', 'Automotive'];
  const brands = ['TechCorp', 'StyleMax', 'NutriHub', 'HomeFlow', 'AthleteZone', 'AutoPro'];
  const subcats = ['Premium', 'Standard', 'Budget', 'Professional', 'Casual'];

  const products = [];
  let skuCounter = 1000;

  const baseProducts = [
    { sku: 'EL-001', name: 'Wireless Headphones Pro', cat: 'Electronics', subcat: 'Audio', brand: 'SoundCore', price: 149.99, lt: 14, abc: 'A', xyz: 'X' },
    { sku: 'EL-002', name: 'Smart Watch Series 5', cat: 'Electronics', subcat: 'Wearables', brand: 'TechFit', price: 299.99, lt: 21, abc: 'A', xyz: 'Y' },
    { sku: 'EL-003', name: 'Bluetooth Speaker Mini', cat: 'Electronics', subcat: 'Audio', brand: 'SoundCore', price: 79.99, lt: 10, abc: 'B', xyz: 'X' },
    { sku: 'AP-001', name: 'Performance Running Shoes', cat: 'Apparel', subcat: 'Footwear', brand: 'StepFast', price: 119.99, lt: 30, abc: 'A', xyz: 'Y' },
    { sku: 'FB-001', name: 'Premium Coffee Blend', cat: 'Food & Beverage', subcat: 'Coffee', brand: 'BeanMaster', price: 24.99, lt: 7, abc: 'A', xyz: 'X' },
  ];

  for (const p of baseProducts) {
    products.push({
      sku: p.sku,
      product_name: p.name,
      category: p.cat,
      subcategory: p.subcat,
      brand: p.brand,
      unit_price: p.price,
      lead_time_days: p.lt,
      abc_class: p.abc,
      xyz_class: p.xyz,
    });
  }

  // Generate additional SKUs
  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    for (let i = 0; i < 15; i++) {
      const catPrefix = categories[catIdx].substring(0, 2).toUpperCase();
      const sku = `${catPrefix}-${String(skuCounter++).padStart(3, '0')}`;

      const basePrice = 30 + Math.random() * 250;
      const leadTime = 5 + Math.floor(Math.random() * 30);
      const abcHash = (catIdx * 17 + i * 13) % 100;
      const abc_class = abcHash < 80 ? 'A' : abcHash < 95 ? 'B' : 'C';
      const xyz_class = ['X', 'Y', 'Z'][Math.floor(Math.random() * 3)];

      products.push({
        sku,
        product_name: `${categories[catIdx]} Product ${i + 1}`,
        category: categories[catIdx],
        subcategory: subcats[Math.floor(Math.random() * subcats.length)],
        brand: brands[catIdx],
        unit_price: Math.round(basePrice * 100) / 100,
        lead_time_days: leadTime,
        abc_class,
        xyz_class,
      });
    }
  }

  return products;
}

function generateSalesHistory(products, months = 36) {
  const records = [];
  const now = new Date();
  const promotionMonths = [9, 10, 11, 4];

  for (const product of products) {
    const { sku, unit_price: price } = product;
    const skuHash = sku.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const baseUnits = 200 + (skuHash % 800);

    for (let monthOffset = months; monthOffset >= 0; monthOffset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const monthIdx = date.getMonth();

      const holidayPeak = monthIdx >= 10 || monthIdx <= 0 ? 1.4 : 1.0;
      const summerDip = monthIdx >= 6 && monthIdx <= 7 ? 0.7 : 1.0;
      const springUpswing = monthIdx >= 2 && monthIdx <= 4 ? 1.15 : 1.0;
      const baseSeasonal = holidayPeak * summerDip * springUpswing;

      const seasonal = Math.sin(((monthIdx - 2) / 12) * 2 * Math.PI) * (baseUnits * 0.3) * baseSeasonal;
      const trend = (36 - monthOffset) * (baseUnits * 0.015);
      const noise = (Math.random() - 0.5) * (baseUnits * 0.12);

      const promoChance = promotionMonths.includes(monthIdx) ? 0.25 : 0.08;
      const promoFlag = Math.random() < promoChance;

      const stockoutChance = promoFlag ? 0.08 : 0.03;
      const stockoutFlag = Math.random() < stockoutChance;

      let units = Math.max(10, Math.round(baseUnits + seasonal + trend + noise));

      if (promoFlag) {
        units = Math.round(units * (1.25 + Math.random() * 0.3));
      }

      if (stockoutFlag) {
        units = Math.round(units * 0.4);
      }

      records.push({
        sku,
        date: date.toISOString().split('T')[0],
        units_sold: units,
        revenue: Math.round(units * price * 100) / 100,
        promotion_flag: promoFlag ? 1 : 0,
        stockout_flag: stockoutFlag ? 1 : 0,
      });
    }
  }

  return records;
}

function generatePromotions(products) {
  const promotions = [];
  const now = new Date();

  for (const product of products) {
    const { sku, abc_class } = product;

    // A-class products get more promotions
    if (abc_class === 'A' && Math.random() < 0.6) {
      const eventStart = new Date(now.getFullYear(), 9, 15); // October 15
      const eventEnd = new Date(now.getFullYear(), 11, 31); // Dec 31
      promotions.push({
        sku,
        event_name: `Q4 Holiday Campaign - ${sku}`,
        event_type: 'holiday',
        start_date: eventStart.toISOString().split('T')[0],
        end_date: eventEnd.toISOString().split('T')[0],
        discount_percent: Math.round((15 + Math.random() * 25) * 100) / 100,
        expected_lift_percent: Math.round((25 + Math.random() * 40) * 100) / 100,
        status: 'planned',
      });
    }

    // Black Friday
    if (Math.random() < 0.7) {
      const bfDate = new Date(now.getFullYear(), 10, 25); // November 25
      promotions.push({
        sku,
        event_name: `Black Friday Sale - ${sku}`,
        event_type: 'flash_sale',
        start_date: new Date(bfDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(bfDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discount_percent: Math.round((30 + Math.random() * 20) * 100) / 100,
        expected_lift_percent: Math.round((50 + Math.random() * 50) * 100) / 100,
        status: 'planned',
      });
    }
  }

  return promotions;
}

function toCsv(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// Main execution
console.log('Generating extended product catalog...');
const products = generateProducts(120);
const productsCSV = toCsv(products);
fs.writeFileSync(path.join(__dirname, 'demo_products.csv'), productsCSV);
console.log(`✓ Generated ${products.length} products -> demo_products.csv`);

console.log('Generating 36 months of sales history...');
const sales = generateSalesHistory(products, 36);
const salesCSV = toCsv(sales);
fs.writeFileSync(path.join(__dirname, 'demo_sales_history.csv'), salesCSV);
console.log(`✓ Generated ${sales.length} sales records -> demo_sales_history.csv`);

console.log('Generating promotion events...');
const promos = generatePromotions(products);
const promosCSV = toCsv(promos);
fs.writeFileSync(path.join(__dirname, 'demo_promotions.csv'), promosCSV);
console.log(`✓ Generated ${promos.length} promotion events -> demo_promotions.csv`);

console.log(`
Dataset Summary:
  Products: ${products.length}
  Sales Records: ${sales.length} (${Math.floor(sales.length / products.length)} months average)
  Promotion Events: ${promos.length}

Files generated in forecast_engine/:
  - demo_products.csv
  - demo_sales_history.csv
  - demo_promotions.csv
`);
