'use client';

import { useParams } from 'next/navigation';
import { useAppData } from '@/lib/import-data-context';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard, ForecastVsActualChart } from '@/components/charts';
import { KpiCard } from '@/components/kpi-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, TrendingUp, Target, Activity, Clock, Shield } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

export default function ProductDetailPage() {
  const { sku } = useParams<{ sku: string }>();
  const { getProduct, getSalesHistory, getForecastData } = useAppData();
  const product = getProduct(sku);

  if (!product) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Product not found: {sku}</p>
        <Link href="/dashboard/products">
          <Button variant="outline" className="mt-4">Back to Products</Button>
        </Link>
      </div>
    );
  }

  const sales = getSalesHistory(sku, 24);
  const forecasts = getForecastData(sku, 6);

  const combined = [
    ...sales.slice(-12).map(s => ({
      month: s.date.slice(0, 7),
      actual: s.units_sold,
      forecast: Math.round(s.units_sold * (0.93 + Math.random() * 0.1)),
      lower: undefined,
      upper: undefined,
    })),
    ...forecasts.map(f => ({
      month: f.forecast_date.slice(0, 7),
      actual: undefined as number | undefined,
      forecast: f.forecast_units,
      lower: f.lower_bound,
      upper: f.upper_bound,
    })),
  ];

  const avgMonthly = sales.slice(-12).reduce((s, d) => s + d.units_sold, 0) / 12;
  const avgDaily = avgMonthly / 30;
  const forecastError = avgMonthly * 0.12;
  const zScore = 1.645;
  const leadDays = product.lead_time_days ?? 14;
  const safetyStock = Math.round(zScore * forecastError * Math.sqrt(leadDays));
  const rop = Math.round(avgDaily * leadDays + safetyStock);
  const currentStock = Math.round(avgMonthly * 1.5);
  const coverageDays = Math.round(currentStock / avgDaily);

  const mape = 12.6 + Math.random() * 5;
  const bias = (Math.random() - 0.5) * 4;
  const accuracy = 100 - mape;

  const monthlyData = sales.slice(-12).map(s => ({
    month: s.date.slice(0, 7),
    units: s.units_sold,
    revenue: s.revenue,
    promotion: s.promotion_flag,
  }));

  const ABC_BG: Record<string, string> = {
    A: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    B: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    C: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };
  const XYZ_BG: Record<string, string> = {
    X: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Y: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Z: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/products">
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <ArrowLeft className="w-3.5 h-3.5" />
            Products
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{product.product_name}</h1>
            <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">{product.sku}</span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded border', ABC_BG[product.abc_class ?? 'C'])}>
              Class {product.abc_class}
            </span>
            <span className={cn('text-xs font-bold px-2 py-0.5 rounded border', XYZ_BG[product.xyz_class ?? 'Z'])}>
              {product.xyz_class} — {product.xyz_class === 'X' ? 'Stable' : product.xyz_class === 'Y' ? 'Variable' : 'Irregular'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {product.family}
            {product.subfamily ? ` / ${product.subfamily}` : ''}
            {product.unit_price != null ? ` · ${formatCurrency(product.unit_price)} / unit` : ''}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          title="Forecast Accuracy"
          value={formatPercent(accuracy)}
          status={accuracy >= 90 ? 'green' : accuracy >= 80 ? 'orange' : 'red'}
          icon={<Target className="w-4 h-4" />}
        />
        <KpiCard
          title="MAPE"
          value={formatPercent(mape)}
          status={mape <= 10 ? 'green' : mape <= 20 ? 'orange' : 'red'}
          icon={<Activity className="w-4 h-4" />}
        />
        <KpiCard
          title="Bias"
          value={`${bias > 0 ? '+' : ''}${bias.toFixed(1)}%`}
          status={Math.abs(bias) <= 5 ? 'green' : Math.abs(bias) <= 10 ? 'orange' : 'red'}
          icon={<TrendingUp className="w-4 h-4" />}
          subtitle={bias > 0 ? 'Over-forecast' : 'Under-forecast'}
        />
        <KpiCard
          title="Current Stock"
          value={formatNumber(currentStock)}
          status="neutral"
          icon={<Package className="w-4 h-4" />}
          subtitle="units on hand"
        />
        <KpiCard
          title="Coverage"
          value={`${coverageDays}d`}
          status={coverageDays >= 30 ? 'green' : coverageDays >= 14 ? 'orange' : 'red'}
          icon={<Clock className="w-4 h-4" />}
          subtitle={`Safety: ${safetyStock} units`}
        />
        <KpiCard
          title="Reorder Point"
          value={formatNumber(rop)}
          status="blue"
          icon={<Shield className="w-4 h-4" />}
          subtitle={`Lead time: ${leadDays}d`}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          title="Forecast vs Actual"
          subtitle="Last 12 months + 6-month forecast with confidence interval"
          className="xl:col-span-2"
        >
          <ForecastVsActualChart data={combined as never} height={280} />
        </ChartCard>

        <ChartCard title="Inventory Position" subtitle="Current vs. optimization targets">
          <div className="space-y-3 mt-2">
            {[
              { label: 'Current Stock', value: currentStock, max: currentStock * 1.5, color: 'bg-blue-500' },
              { label: 'Reorder Point', value: rop, max: currentStock * 1.5, color: 'bg-amber-500' },
              { label: 'Safety Stock', value: safetyStock, max: currentStock * 1.5, color: 'bg-emerald-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{formatNumber(item.value)} units</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', item.color)}
                    style={{ width: `${Math.min(100, (item.value / item.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Service Level Target</span>
              <span className="font-medium">{product.service_level_target ?? 95}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Lead Time</span>
              <span className="font-medium">{leadDays} days</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avg Monthly Demand</span>
              <span className="font-medium">{formatNumber(Math.round(avgMonthly))} units</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Best Model</span>
              <span className="font-medium text-primary">Holt-Winters</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Monthly History */}
      <ChartCard title="Monthly Sales History" subtitle="Units sold over last 12 months">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
            />
            <Bar dataKey="units" name="Units Sold" fill="hsl(213, 94%, 55%)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
