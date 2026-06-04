// Comprehensive mock data for the demand planning platform

export const MOCK_CATEGORIES = ['Electronics', 'Apparel', 'Food & Beverage', 'Home & Garden', 'Sports', 'Automotive'];

export const MOCK_PRODUCTS = [
  { sku: 'EL-001', product_name: 'Wireless Headphones Pro', category: 'Electronics', subcategory: 'Audio', brand: 'SoundCore', unit_price: 149.99, lead_time_days: 14, service_level_target: 97, abc_class: 'A', xyz_class: 'X' },
  { sku: 'EL-002', product_name: 'Smart Watch Series 5', category: 'Electronics', subcategory: 'Wearables', brand: 'TechFit', unit_price: 299.99, lead_time_days: 21, service_level_target: 98, abc_class: 'A', xyz_class: 'Y' },
  { sku: 'EL-003', product_name: 'Bluetooth Speaker Mini', category: 'Electronics', subcategory: 'Audio', brand: 'SoundCore', unit_price: 79.99, lead_time_days: 10, service_level_target: 95, abc_class: 'B', xyz_class: 'X' },
  { sku: 'AP-001', product_name: 'Performance Running Shoes', category: 'Apparel', subcategory: 'Footwear', brand: 'StepFast', unit_price: 119.99, lead_time_days: 30, service_level_target: 96, abc_class: 'A', xyz_class: 'Y' },
  { sku: 'AP-002', product_name: 'Compression Leggings', category: 'Apparel', subcategory: 'Activewear', brand: 'FlexWear', unit_price: 59.99, lead_time_days: 25, service_level_target: 94, abc_class: 'B', xyz_class: 'X' },
  { sku: 'FB-001', product_name: 'Premium Coffee Blend', category: 'Food & Beverage', subcategory: 'Coffee', brand: 'BeanMaster', unit_price: 24.99, lead_time_days: 7, service_level_target: 99, abc_class: 'A', xyz_class: 'X' },
  { sku: 'FB-002', product_name: 'Protein Bar Variety Pack', category: 'Food & Beverage', subcategory: 'Snacks', brand: 'NutriMax', unit_price: 34.99, lead_time_days: 5, service_level_target: 97, abc_class: 'B', xyz_class: 'Y' },
  { sku: 'HG-001', product_name: 'Smart Thermostat', category: 'Home & Garden', subcategory: 'Smart Home', brand: 'HomeSmart', unit_price: 189.99, lead_time_days: 14, service_level_target: 95, abc_class: 'B', xyz_class: 'Z' },
  { sku: 'SP-001', product_name: 'Yoga Mat Premium', category: 'Sports', subcategory: 'Fitness', brand: 'ZenFlow', unit_price: 89.99, lead_time_days: 12, service_level_target: 96, abc_class: 'C', xyz_class: 'Y' },
  { sku: 'AU-001', product_name: 'Car Phone Mount', category: 'Automotive', subcategory: 'Accessories', brand: 'DriveEase', unit_price: 39.99, lead_time_days: 8, service_level_target: 93, abc_class: 'C', xyz_class: 'Z' },
];

// Generate extended product catalog with 100+ SKUs for enterprise scenarios
export function generateExtendedProductCatalog(): typeof MOCK_PRODUCTS {
  const categories = ['Electronics', 'Apparel', 'Food & Beverage', 'Home & Garden', 'Sports', 'Automotive'];
  const brands = ['TechCorp', 'StyleMax', 'NutriHub', 'HomeFlow', 'AthleteZone', 'AutoPro'];
  const products = [...MOCK_PRODUCTS];
  let skuCounter = 1000;

  for (let cat = 0; cat < categories.length; cat++) {
    for (let i = 0; i < 15; i++) {
      const catPrefix = categories[cat].substring(0, 2).toUpperCase();
      const sku = `${catPrefix}-${String(skuCounter++).padStart(3, '0')}`;
      const basePrice = 30 + Math.random() * 250;
      const leadTime = 5 + Math.floor(Math.random() * 30);
      const abcHash = (cat * 17 + i * 13) % 100;
      const abc_class = abcHash < 80 ? 'A' : abcHash < 95 ? 'B' : 'C';
      const xyz_class = ['X', 'Y', 'Z'][Math.floor(Math.random() * 3)] as 'X' | 'Y' | 'Z';

      products.push({
        sku,
        product_name: `${categories[cat]} Product ${i + 1}`,
        category: categories[cat],
        subcategory: `Sub-${i % 5}`,
        brand: brands[cat],
        unit_price: Math.round(basePrice * 100) / 100,
        lead_time_days: leadTime,
        service_level_target: 92 + Math.random() * 6,
        abc_class: abc_class as 'A' | 'B' | 'C',
        xyz_class,
      });
    }
  }

  return products;
}

export function generateSalesHistory(productSku: string, months = 24) {
  const history = [];
  const now = new Date();
  const skuHash = productSku.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseUnits = 200 + (skuHash % 800);
  const basePriceMap: Record<string, number> = {
    'EL-001': 149.99, 'EL-002': 299.99, 'EL-003': 79.99,
    'AP-001': 119.99, 'AP-002': 59.99,
    'FB-001': 24.99, 'FB-002': 34.99,
    'HG-001': 189.99, 'SP-001': 89.99, 'AU-001': 39.99,
  };
  const price = basePriceMap[productSku] ?? 99.99;

  // Promotion calendar: Q4 peak, Black Friday, Summer sale
  const promotionMonths = [10, 11, 5]; // October, November, May
  const blackFridayWeeks = [47, 48]; // Weeks of Black Friday

  for (let i = months; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthIndex = date.getMonth();
    const weekOfYear = Math.floor((date.getDate() + new Date(date.getFullYear(), monthIndex, 1).getDay()) / 7);

    // Multi-harmonic seasonality: holiday peaks, summer dips
    const holiday_peak = monthIndex >= 10 || monthIndex <= 1 ? 1.4 : 1.0; // Q4 + Jan
    const summer_dip = monthIndex >= 6 && monthIndex <= 7 ? 0.7 : 1.0; // July-Aug
    const spring_upswing = monthIndex >= 2 && monthIndex <= 4 ? 1.15 : 1.0; // Mar-May
    const base_seasonal = holiday_peak * summer_dip * spring_upswing;

    const seasonal_component = Math.sin(((monthIndex - 2) / 12) * 2 * Math.PI) * (baseUnits * 0.3) * base_seasonal;
    const trend = i < 12 ? (12 - i) * (baseUnits * 0.015) : 0;
    const noise = (Math.random() - 0.5) * (baseUnits * 0.12);

    // Promotion probability higher in Q4 and during sale periods
    const promoChance = promotionMonths.includes(monthIndex) ? 0.25 : (blackFridayWeeks.includes(weekOfYear) ? 0.35 : 0.08);
    const promotionFlag = Math.random() < promoChance;

    // Stockout probability: rare but more likely in high-demand periods
    const stockoutChance = promotionFlag ? 0.08 : 0.03;
    const stockoutFlag = Math.random() < stockoutChance;

    let units = Math.max(10, Math.round(baseUnits + seasonal_component + trend + noise));

    // Apply promotion lift
    if (promotionFlag) {
      units = Math.round(units * (1.25 + Math.random() * 0.3));
    }

    // Apply stockout dampening
    if (stockoutFlag) {
      units = Math.round(units * 0.4);
    }

    history.push({
      date: date.toISOString().slice(0, 10),
      units_sold: units,
      revenue: units * price,
      promotion_flag: promotionFlag,
      stockout_flag: stockoutFlag,
    });
  }
  return history;
}

export function generateForecastData(salesHistory: { date: string; units_sold: number; revenue: number }[], months = 6) {
  const avg = salesHistory.slice(-6).reduce((s, d) => s + d.units_sold, 0) / 6;
  const price = salesHistory[0]?.revenue / salesHistory[0]?.units_sold || 99.99;
  const forecasts = [];
  const now = new Date();
  for (let i = 1; i <= months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const seasonal = Math.sin(((date.getMonth() - 2) / 12) * 2 * Math.PI) * (avg * 0.15);
    const units = Math.max(10, Math.round(avg + seasonal + (Math.random() - 0.5) * avg * 0.1));
    forecasts.push({
      forecast_date: date.toISOString().slice(0, 10),
      forecast_units: units,
      forecast_revenue: units * price,
      model_name: 'Holt-Winters',
      lower_bound: Math.round(units * 0.85),
      upper_bound: Math.round(units * 1.15),
      accuracy_score: 85 + Math.random() * 12,
    });
  }
  return forecasts;
}

export const MOCK_METRICS = {
  totalRevenueForecast: 4_820_000,
  totalUnitsForecast: 48_200,
  forecastAccuracy: 87.4,
  inventoryValue: 2_340_000,
  stockCoverage: 42,
  overallMAPE: 12.6,
  overallWAPE: 10.8,
  bias: -1.3,
  fva: 4.2,
  serviceLevel: 96.2,
};

export const MOCK_MONTHLY_CHART = Array.from({ length: 12 }, (_, i) => {
  const month = new Date(2024, i, 1).toLocaleString('en', { month: 'short' });
  const actual = 3500 + Math.sin(i / 12 * 2 * Math.PI) * 600 + Math.random() * 200;
  return {
    month,
    actual: Math.round(actual),
    forecast: Math.round(actual * (0.92 + Math.random() * 0.12)),
    lower: Math.round(actual * 0.88),
    upper: Math.round(actual * 1.12),
  };
});

export const MOCK_MAPE_TREND = Array.from({ length: 12 }, (_, i) => ({
  month: new Date(2024, i, 1).toLocaleString('en', { month: 'short' }),
  mape: 18 - i * 0.4 + (Math.random() - 0.5) * 2,
  wape: 15 - i * 0.35 + (Math.random() - 0.5) * 1.5,
}));

export const MOCK_ABC_DATA = [
  { class: 'A', products: 12, revenue: 3_850_000, revenueShare: 80 },
  { class: 'B', products: 28, revenue: 722_000, revenueShare: 15 },
  { class: 'C', products: 110, revenue: 242_000, revenueShare: 5 },
];

export const MOCK_XYZ_DATA = [
  { class: 'X', label: 'Stable (CV ≤ 10%)', products: 35, color: '#10b981' },
  { class: 'Y', label: 'Variable (CV 10-25%)', products: 62, color: '#f59e0b' },
  { class: 'Z', label: 'Irregular (CV > 25%)', products: 53, color: '#ef4444' },
];

export const MODEL_NAMES = [
  'Simple Moving Average', 'Weighted Moving Average', 'Exponential Smoothing',
  'Holt', 'Holt-Winters', 'ETS', 'ARMA', 'ARIMA', 'SARIMA',
  'Croston', 'TSB', 'Prophet', 'Linear Regression', 'Random Forest', 'XGBoost',
];
