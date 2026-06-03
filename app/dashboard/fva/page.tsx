'use client';

import { useState } from 'react';
import { useProductList } from '@/lib/use-product-list';
import { formatPercent, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard } from '@/components/charts';
import { KpiCard } from '@/components/kpi-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  LineChart, Line, ComposedChart, Area, Scatter, ScatterChart
} from 'recharts';

interface SoPStage {
  stage: string;
  forecast_units: number;
  forecast_mape: number;
  fva_vs_previous: number;
  last_updated: string;
  status: 'draft' | 'reviewed' | 'approved' | 'locked';
  adjusted_by?: string;
}

interface FVAMetrics {
  baseline_mape: number;
  statistical_mape: number;
  statistical_fva: number;
  sales_mape: number;
  sales_fva: number;
  consensus_mape: number;
  consensus_fva: number;
  total_fva: number;
}

// Mock FVA data
function generateFVAData(sku: string): FVAMetrics {
  const skuHash = sku.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseError = 25 + (skuHash % 20);

  return {
    baseline_mape: baseError,
    statistical_mape: baseError * 0.75,
    statistical_fva: baseError * 0.25,
    sales_mape: baseError * 0.65,
    sales_fva: baseError * 0.1,
    consensus_mape: baseError * 0.55,
    consensus_fva: baseError * 0.1,
    total_fva: baseError * 0.45,
  };
}

function generateSoPStages(sku: string): SoPStage[] {
  const baseUnits = 1000 + Math.random() * 2000;
  const now = new Date();

  return [
    {
      stage: 'Statistical Forecast',
      forecast_units: Math.round(baseUnits),
      forecast_mape: 18 + Math.random() * 4,
      fva_vs_previous: 0,
      last_updated: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      status: 'approved',
    },
    {
      stage: 'Sales Adjustment',
      forecast_units: Math.round(baseUnits * 1.08),
      forecast_mape: 15.2 + Math.random() * 3,
      fva_vs_previous: 3.5,
      last_updated: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      status: 'approved',
      adjusted_by: 'Sarah Johnson',
    },
    {
      stage: 'Supply Chain Input',
      forecast_units: Math.round(baseUnits * 1.05),
      forecast_mape: 14.8 + Math.random() * 2.5,
      fva_vs_previous: 0.4,
      last_updated: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      status: 'reviewed',
      adjusted_by: 'Mike Chen',
    },
    {
      stage: 'Consensus Forecast',
      forecast_units: Math.round(baseUnits * 1.06),
      forecast_mape: 12.1 + Math.random() * 2,
      fva_vs_previous: 2.7,
      last_updated: new Date().toLocaleDateString(),
      status: 'draft',
    },
  ];
}

export default function FVATrackingPage() {
  const { products, selectedSku, setSelectedSku, product } = useProductList();
  const [activeTab, setActiveTab] = useState('overview');

  const fvaData = generateFVAData(selectedSku);
  const sopStages = generateSoPStages(selectedSku);
  if (!product) {
    return <div className="p-6 text-muted-foreground">Aucun produit — importez un CSV.</div>;
  }

  // FVA waterfall data
  const waterfallData = [
    { stage: 'Baseline\n(Manual/Prior)', value: fvaData.baseline_mape, cumulative: fvaData.baseline_mape },
    { stage: 'Statistical\nForecast', value: -fvaData.statistical_fva, cumulative: fvaData.statistical_mape },
    { stage: 'Sales\nAdjustment', value: -fvaData.sales_fva, cumulative: fvaData.sales_mape },
    { stage: 'Supply Chain\nInput', value: 0, cumulative: fvaData.sales_mape },
    { stage: 'Consensus\nForecast', value: -fvaData.consensus_fva, cumulative: fvaData.consensus_mape },
  ];

  // SOP workflow timeline
  const timelineData = sopStages.map((s, idx) => ({
    step: idx + 1,
    stage: s.stage,
    mape: s.forecast_mape,
    units: s.forecast_units,
    fva: s.fva_vs_previous,
    status: s.status,
  }));

  // Product impact data
  const impactData = [
    { metric: 'Forecast Accuracy', before: fvaData.baseline_mape, after: fvaData.consensus_mape },
    { metric: 'Error Reduction', before: 0, after: fvaData.total_fva },
  ];

  const statusColors = {
    draft: 'bg-slate-500/10 text-slate-400',
    reviewed: 'bg-blue-500/10 text-blue-400',
    approved: 'bg-emerald-500/10 text-emerald-400',
    locked: 'bg-slate-500/10 text-slate-400',
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Forecast Value Added (FVA) Tracking</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor forecast accuracy improvements through Sales & Operations Planning workflow
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-xl border bg-card p-4">
        <label className="text-xs font-medium text-muted-foreground mb-2 block">Select Product (SKU)</label>
        <Select value={selectedSku} onValueChange={setSelectedSku}>
          <SelectTrigger className="max-w-xs h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {products.map(p => (
              <SelectItem key={p.sku} value={p.sku}>{p.sku} — {p.product_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total FVA"
          value={formatPercent(fvaData.total_fva)}
          subtitle="Forecast accuracy gain"
          status={fvaData.total_fva >= 30 ? 'green' : fvaData.total_fva >= 15 ? 'orange' : 'red'}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KpiCard
          title="Baseline MAPE"
          value={formatPercent(fvaData.baseline_mape)}
          subtitle="Before improvements"
          status="orange"
        />
        <KpiCard
          title="Current MAPE"
          value={formatPercent(fvaData.consensus_mape)}
          subtitle="After consensus"
          status={fvaData.consensus_mape <= 12 ? 'green' : 'orange'}
        />
        <KpiCard
          title="Workflow Status"
          value={sopStages[sopStages.length - 1].status.toUpperCase()}
          subtitle="Consensus stage"
          status={sopStages[sopStages.length - 1].status === 'approved' ? 'green' : 'orange'}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">FVA Overview</TabsTrigger>
          <TabsTrigger value="workflow">S&OP Workflow</TabsTrigger>
          <TabsTrigger value="stages">Stage Details</TabsTrigger>
          <TabsTrigger value="analysis">Root Cause Analysis</TabsTrigger>
        </TabsList>

        {/* FVA Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* FVA Waterfall */}
            <ChartCard title="FVA Waterfall" subtitle="MAPE reduction through workflow stages">
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart
                  data={waterfallData}
                  margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={100} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'MAPE %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => value.toFixed(1)}
                  />
                  <Legend />
                  <Bar dataKey="cumulative" fill="hsl(219, 90%, 56%)" name="Current MAPE" radius={[4, 4, 0, 0]}>
                    {waterfallData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={idx === waterfallData.length - 1 ? 'hsl(142, 71%, 50%)' : 'hsl(219, 90%, 56%)'} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Accuracy Improvement Timeline */}
            <ChartCard title="Accuracy Trend" subtitle="MAPE through workflow stages">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={timelineData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="step" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'MAPE %', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number) => value.toFixed(2)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="mape"
                    stroke="hsl(219, 90%, 56%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(219, 90%, 56%)', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="MAPE %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* FVA Breakdown */}
          <ChartCard title="FVA Contribution by Stage" subtitle="Accuracy improvement at each step">
            <div className="space-y-3">
              {[
                { stage: 'Statistical Forecast', fva: fvaData.statistical_fva, color: 'bg-blue-500/20' },
                { stage: 'Sales Adjustment', fva: fvaData.sales_fva, color: 'bg-amber-500/20' },
                { stage: 'Consensus', fva: fvaData.consensus_fva, color: 'bg-emerald-500/20' },
              ].map(item => (
                <div key={item.stage} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.stage}</span>
                    <span className="text-sm font-bold">{item.fva.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-muted/20 rounded-full overflow-hidden">
                    <div className={cn('h-full', item.color)} style={{ width: `${(item.fva / fvaData.total_fva) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </TabsContent>

        {/* S&OP Workflow */}
        <TabsContent value="workflow" className="space-y-4">
          <ChartCard title="Sales & Operations Planning Workflow" subtitle="Forecast progression through approval stages">
            <div className="space-y-4">
              {sopStages.map((stage, idx) => (
                <div key={idx} className="relative">
                  {/* Connector line */}
                  {idx < sopStages.length - 1 && (
                    <div className="absolute left-5 top-12 w-0.5 h-8 bg-muted/30" />
                  )}

                  <div className="flex gap-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm',
                        stage.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                        stage.status === 'reviewed' ? 'bg-blue-500/20 text-blue-400' :
                        stage.status === 'draft' ? 'bg-slate-500/10 text-slate-400' : 'bg-slate-500/10'
                      )}>
                        {stage.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                      </div>
                    </div>

                    {/* Stage details */}
                    <div className="flex-1 rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{stage.stage}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">Updated {stage.last_updated}</p>
                        </div>
                        <Badge className={cn('text-xs', statusColors[stage.status])}>
                          {stage.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-xs mb-3">
                        <div>
                          <span className="text-muted-foreground">Forecast Units</span>
                          <div className="font-bold text-base">{formatNumber(stage.forecast_units)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">MAPE</span>
                          <div className="font-bold text-base">{stage.forecast_mape.toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">FVA vs Previous</span>
                          <div className={cn('font-bold text-base', stage.fva_vs_previous > 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
                            {stage.fva_vs_previous > 0 ? '+' : ''}{stage.fva_vs_previous.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {stage.adjusted_by && (
                        <p className="text-xs text-muted-foreground">Adjusted by {stage.adjusted_by}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartCard>
        </TabsContent>

        {/* Stage Details */}
        <TabsContent value="stages" className="space-y-4">
          <ChartCard title="Statistical Forecast" subtitle="Machine learning baseline (no manual adjustments)">
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-muted-foreground mb-1">Forecast Units</p>
                  <p className="font-bold text-lg">{formatNumber(sopStages[0].forecast_units)}</p>
                </div>
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-muted-foreground mb-1">MAPE</p>
                  <p className="font-bold text-lg">{sopStages[0].forecast_mape.toFixed(1)}%</p>
                </div>
              </div>
              <p className="text-muted-foreground">Output from Prophet/XGBoost model selected during backtesting phase.</p>
            </div>
          </ChartCard>

          <ChartCard title="Sales Adjustment" subtitle="Sales team input based on market knowledge">
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-muted-foreground mb-1">Adjusted Forecast</p>
                  <p className="font-bold text-lg">{formatNumber(sopStages[1].forecast_units)}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-muted-foreground mb-1">FVA Improvement</p>
                  <p className="font-bold text-lg text-emerald-400">+{sopStages[1].fva_vs_previous.toFixed(1)}%</p>
                </div>
              </div>
              <p className="text-muted-foreground">Adjusted by {sopStages[1].adjusted_by} on {sopStages[1].last_updated} based on promotional plans and market signals.</p>
            </div>
          </ChartCard>

          <ChartCard title="Consensus Forecast" subtitle="Final agreed forecast for execution">
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted/20 p-3">
                  <p className="text-muted-foreground mb-1">Final Consensus</p>
                  <p className="font-bold text-lg">{formatNumber(sopStages[3].forecast_units)}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <p className="text-muted-foreground mb-1">Total FVA</p>
                  <p className="font-bold text-lg text-emerald-400">+{(fvaData.consensus_mape - fvaData.baseline_mape).toFixed(1)}%</p>
                </div>
              </div>
              <p className="text-muted-foreground">Ready for PO generation, procurement, and inventory management systems.</p>
            </div>
          </ChartCard>
        </TabsContent>

        {/* Root Cause Analysis */}
        <TabsContent value="analysis" className="space-y-4">
          <ChartCard title="Forecast Error Distribution" subtitle="Understanding where accuracy improves">
            <div className="space-y-4 text-sm">
              <div className="rounded-lg bg-slate-500/10 border border-slate-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <h4 className="font-semibold">Sales Adjustment Insight</h4>
                </div>
                <p className="text-muted-foreground">
                  Sales team typically improves accuracy by {fvaData.sales_fva.toFixed(1)}% through market knowledge and promotional visibility. This FVA is most valuable for high-revenue (ABC: A) products.
                </p>
              </div>

              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-semibold">Consensus Building Value</h4>
                </div>
                <p className="text-muted-foreground">
                  Cross-functional consensus adds {fvaData.consensus_fva.toFixed(1)}% accuracy. Supply chain constraints and procurement lead times are incorporated here.
                </p>
              </div>

              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <h4 className="font-semibold">Statistical Foundation</h4>
                </div>
                <p className="text-muted-foreground">
                  Machine learning provides baseline accuracy of {fvaData.statistical_mape.toFixed(1)}%, accounting for {((fvaData.statistical_fva / fvaData.baseline_mape) * 100).toFixed(0)}% of total improvement.
                </p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Recommendations for Improvement" subtitle="Next steps to increase FVA">
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400 flex-shrink-0">1.</span>
                <div>
                  <strong>Automate Sales Adjustment</strong>
                  <p className="text-muted-foreground">Implement promotional calendar integration to capture lift earlier in workflow.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400 flex-shrink-0">2.</span>
                <div>
                  <strong>Integrate Supply Constraints</strong>
                  <p className="text-muted-foreground">Feed capacity limits directly to statistical model for realistic consensus.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400 flex-shrink-0">3.</span>
                <div>
                  <strong>Monitor Model Drift</strong>
                  <p className="text-muted-foreground">Weekly accuracy checks. Retrain if MAPE degrades &gt;5% from baseline.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-emerald-400 flex-shrink-0">4.</span>
                <div>
                  <strong>Segment by ABC-XYZ</strong>
                  <p className="text-muted-foreground">Apply aggressive forecasting only to A-class products. Use simpler methods for C-class.</p>
                </div>
              </li>
            </ol>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
