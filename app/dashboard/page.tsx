'use client';

import { KpiCard } from '@/components/kpi-card';
import { ChartCard, ForecastVsActualChart, MapeChart, BiasTrendChart, InventoryCoverageChart } from '@/components/charts';
import { MOCK_METRICS, MOCK_MONTHLY_CHART, MOCK_MAPE_TREND, MOCK_ABC_DATA, MOCK_XYZ_DATA } from '@/lib/mock-data';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';
import {
  DollarSign, Package, BarChart3, Layers, Target, Activity,
  TrendingUp, AlertTriangle, CheckCircle, ArrowUpRight, Boxes
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const BIAS_DATA = MOCK_MAPE_TREND.map(d => ({
  month: d.month,
  bias: parseFloat((Math.sin(MOCK_MAPE_TREND.indexOf(d) / 2) * 3 - 1.3).toFixed(1)),
}));

const COVERAGE_DATA = [
  { name: 'Electronics', coverage: 38, safety: 8, target: 45 },
  { name: 'Apparel', coverage: 52, safety: 10, target: 60 },
  { name: 'Food & Bev', coverage: 22, safety: 5, target: 28 },
  { name: 'Home', coverage: 65, safety: 14, target: 70 },
  { name: 'Sports', coverage: 41, safety: 9, target: 45 },
];

const ABC_PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const RISKS = [
  { sku: 'EL-001', name: 'Wireless Headphones Pro', issue: 'Coverage below 14 days', severity: 'high' },
  { sku: 'FB-001', name: 'Premium Coffee Blend', issue: 'Stockout risk detected', severity: 'high' },
  { sku: 'AP-001', name: 'Running Shoes', issue: 'MAPE > 25%', severity: 'medium' },
];

const OPPORTUNITIES = [
  { sku: 'EL-002', name: 'Smart Watch Series 5', insight: 'Forecast up +18% next quarter' },
  { sku: 'FB-002', name: 'Protein Bar Variety Pack', insight: 'Promotion window: next 3 weeks' },
  { sku: 'HG-001', name: 'Smart Thermostat', insight: 'Strong seasonal uplift expected' },
];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Executive Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Next 3-month outlook — Updated {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <CheckCircle className="w-3.5 h-3.5" />
          All systems operational
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Revenue Forecast"
          value={formatCurrency(MOCK_METRICS.totalRevenueForecast, true)}
          trend={4.8}
          trendLabel="vs last cycle"
          status="blue"
          icon={<DollarSign className="w-4 h-4" />}
        />
        <KpiCard
          title="Units Forecast"
          value={formatNumber(MOCK_METRICS.totalUnitsForecast, true)}
          trend={3.2}
          trendLabel="vs last cycle"
          status="blue"
          icon={<Boxes className="w-4 h-4" />}
        />
        <KpiCard
          title="Forecast Accuracy"
          value={formatPercent(MOCK_METRICS.forecastAccuracy)}
          trend={1.6}
          trendLabel="vs last month"
          status="green"
          icon={<Target className="w-4 h-4" />}
          subtitle="Target: 90%"
        />
        <KpiCard
          title="Overall MAPE"
          value={formatPercent(MOCK_METRICS.overallMAPE)}
          trend={-2.1}
          trendLabel="vs last month"
          status="orange"
          icon={<Activity className="w-4 h-4" />}
        />
        <KpiCard
          title="Inventory Value"
          value={formatCurrency(MOCK_METRICS.inventoryValue, true)}
          trend={-1.4}
          trendLabel="vs last month"
          status="neutral"
          icon={<Package className="w-4 h-4" />}
        />
        <KpiCard
          title="Service Level"
          value={formatPercent(MOCK_METRICS.serviceLevel)}
          trend={0.4}
          trendLabel="vs last month"
          status="green"
          icon={<BarChart3 className="w-4 h-4" />}
          subtitle="Target: 97%"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          title="Forecast vs Actual"
          subtitle="Monthly units — last 12 months + 6-month outlook"
          className="xl:col-span-2"
          actions={
            <Link href="/dashboard/forecasting" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          }
        >
          <ForecastVsActualChart data={MOCK_MONTHLY_CHART} height={280} />
        </ChartCard>

        <ChartCard title="ABC Revenue Distribution" subtitle="Annual revenue by product class">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={MOCK_ABC_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="revenue"
                label={({ class: cls, revenueShare }) => `${cls}: ${revenueShare}%`}
                labelLine={false}
              >
                {MOCK_ABC_DATA.map((_, i) => (
                  <Cell key={i} fill={ABC_PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [formatCurrency(v, true)]}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {MOCK_ABC_DATA.map((d, i) => (
              <div key={d.class} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: ABC_PIE_COLORS[i] }} />
                <span className="text-xs text-muted-foreground">Class {d.class} ({d.products} SKUs)</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard title="Forecast Error Trend" subtitle="MAPE & WAPE over last 12 months">
          <MapeChart data={MOCK_MAPE_TREND} height={200} />
        </ChartCard>

        <ChartCard title="Forecast Bias" subtitle="Over/under forecasting trend">
          <BiasTrendChart data={BIAS_DATA} height={200} />
        </ChartCard>

        <ChartCard title="Inventory Coverage" subtitle="Days of cover by category">
          <InventoryCoverageChart data={COVERAGE_DATA} height={200} />
        </ChartCard>
      </div>

      {/* Bottom Row: Risks & Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold">Top Risks</h3>
          </div>
          <div className="space-y-3">
            {RISKS.map(risk => (
              <div key={risk.sku} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <span className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5',
                  risk.severity === 'high' ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'
                )}>
                  {risk.severity === 'high' ? 'HIGH' : 'MED'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{risk.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{risk.sku} · {risk.issue}</div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold">Top Opportunities</h3>
          </div>
          <div className="space-y-3">
            {OPPORTUNITIES.map(opp => (
              <div key={opp.sku} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
                <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 bg-emerald-500/15 text-emerald-400">
                  OPP
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{opp.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{opp.sku} · {opp.insight}</div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
