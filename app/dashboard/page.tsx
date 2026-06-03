'use client';

import { KpiCard } from '@/components/kpi-card';
import { ChartCard, ForecastVsActualChart, MapeChart, BiasTrendChart, InventoryCoverageChart } from '@/components/charts';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import {
  DollarSign, Package, BarChart3, Target, Activity,
  CheckCircle, ArrowUpRight, Boxes, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useAppData } from '@/lib/import-data-context';

const ABC_PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const FALLBACK_RISKS = [
  { sku: 'EL-001', name: 'Wireless Headphones Pro', issue: 'Coverage below 14 days', severity: 'high' },
];

const FALLBACK_OPPORTUNITIES = [
  { sku: 'EL-002', name: 'Smart Watch Series 5', insight: 'Forecast up +18% next quarter' },
];

export default function DashboardPage() {
  const {
    metrics,
    monthlyChart,
    mapeTrend,
    abcData,
    coverageData,
    risks,
    opportunities,
    hasImportedData,
    snapshot,
  } = useAppData();

  const biasData = mapeTrend.map((d, i) => ({
    month: d.month,
    bias: parseFloat((Math.sin(i / 2) * 3 - 1.3).toFixed(1)),
  }));

  const displayRisks = risks.length ? risks : FALLBACK_RISKS;
  const displayOpportunities = opportunities.length ? opportunities : FALLBACK_OPPORTUNITIES;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {hasImportedData ? 'Vue d\'ensemble (données importées)' : 'Executive Overview'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasImportedData
              ? `${snapshot?.rowCount ?? 0} lignes · ${snapshot?.skuCount ?? 0} SKU · MAJ ${new Date().toLocaleDateString('fr-FR')}`
              : `Next 3-month outlook — ${new Date().toLocaleDateString('fr-FR')}`}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          {hasImportedData ? 'Catalogue import actif' : 'All systems operational'}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Revenue Forecast" value={formatCurrency(metrics.totalRevenueForecast, true)} trend={4.8} trendLabel="vs cycle" status="blue" icon={<DollarSign className="w-4 h-4" />} />
        <KpiCard title="Units Forecast" value={formatNumber(metrics.totalUnitsForecast, true)} trend={3.2} trendLabel="vs cycle" status="blue" icon={<Boxes className="w-4 h-4" />} />
        <KpiCard title="Forecast Accuracy" value={formatPercent(metrics.forecastAccuracy)} trend={1.6} trendLabel="vs mois" status="green" icon={<Target className="w-4 h-4" />} />
        <KpiCard title="Overall MAPE" value={formatPercent(metrics.overallMAPE)} trend={-2.1} trendLabel="vs mois" status="orange" icon={<Activity className="w-4 h-4" />} />
        <KpiCard title="Inventory Value" value={formatCurrency(metrics.inventoryValue, true)} trend={-1.4} trendLabel="vs mois" status="neutral" icon={<Package className="w-4 h-4" />} />
        <KpiCard title="Service Level" value={formatPercent(metrics.serviceLevel)} trend={0.4} trendLabel="vs mois" status="green" icon={<BarChart3 className="w-4 h-4" />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          title="Forecast vs Actual"
          subtitle={hasImportedData ? 'Unités mensuelles (import)' : 'Monthly units'}
          className="xl:col-span-2"
          actions={
            <Link href="/dashboard/forecasting" className="text-xs text-primary hover:underline flex items-center gap-1">
              Prévisions <ArrowUpRight className="w-3 h-3" />
            </Link>
          }
        >
          <ForecastVsActualChart data={monthlyChart} height={280} />
        </ChartCard>

        <ChartCard title="ABC Revenue Distribution" subtitle="Par classe produit">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={abcData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="revenue" label={({ class: cls, revenueShare }) => `${cls}: ${revenueShare}%`} labelLine={false}>
                {abcData.map((_, i) => (
                  <Cell key={i} fill={ABC_PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [formatCurrency(v, true)]} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard title="Forecast Error Trend" subtitle="MAPE / WAPE">
          <MapeChart data={mapeTrend} height={200} />
        </ChartCard>
        <ChartCard title="Forecast Bias" subtitle="Tendance biais">
          <BiasTrendChart data={biasData} height={200} />
        </ChartCard>
        <ChartCard title="Inventory Coverage" subtitle={hasImportedData ? 'Par famille' : 'Par catégorie'}>
          <InventoryCoverageChart data={coverageData} height={200} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Risques
          </h3>
          <div className="space-y-3">
            {displayRisks.map(r => (
              <div key={r.sku} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className={cn('text-xs font-bold px-2 py-0.5 rounded', r.severity === 'high' ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400')}>{r.sku}</span>
                <div>
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{r.issue}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Opportunités
          </h3>
          <div className="space-y-3">
            {displayOpportunities.map(o => (
              <div key={o.sku} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">{o.sku}</span>
                <div>
                  <div className="text-sm font-medium">{o.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{o.insight}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
