'use client';

import { useMemo } from 'react';
import { useAppData } from '@/lib/import-data-context';
import { getImportedSalesForSku } from '@/lib/product-catalog';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend, ReferenceLine
} from 'recharts';

const ABC_COLORS = { A: '#10b981', B: '#f59e0b', C: '#ef4444' };
const XYZ_COLORS = { X: '#3b82f6', Y: '#f59e0b', Z: '#ef4444' };

const MATRIX_BG: Record<string, string> = {
  AX: 'bg-emerald-500/20 border-emerald-500/30',
  AY: 'bg-emerald-500/12 border-emerald-500/20',
  AZ: 'bg-amber-500/12 border-amber-500/20',
  BX: 'bg-blue-500/12 border-blue-500/20',
  BY: 'bg-blue-500/8 border-blue-500/15',
  BZ: 'bg-amber-500/8 border-amber-500/15',
  CX: 'bg-muted/40 border-border',
  CY: 'bg-muted/20 border-border',
  CZ: 'bg-rose-500/8 border-rose-500/15',
};

export default function AnalysisPage() {
  const { products, productMetrics, abcData, xyzData, hasImportedData } = useAppData();

  const PARETO_DATA = useMemo(() => {
    const items = products.map(p => {
      const sales = getImportedSalesForSku(p.sku);
      const revenue = sales.length
        ? sales.reduce((s, r) => s + r.revenue, 0)
        : (p.unit_price ?? 100) * 500;
      const pm = productMetrics.find(m => m.sku === p.sku);
      return {
        sku: p.sku,
        name: p.product_name,
        revenue,
        class: (pm?.abc_class as 'A' | 'B' | 'C') ?? 'C',
      };
    }).sort((a, b) => b.revenue - a.revenue);
    let cumulative = 0;
    const total = items.reduce((s, p) => s + p.revenue, 0) || 1;
    return items.map(p => {
      cumulative += p.revenue;
      return { ...p, cumulativePercent: (cumulative / total) * 100 };
    });
  }, [products, productMetrics]);

  const MATRIX_DATA = useMemo(() => {
    const matrix: Record<string, { count: number; revenue: number; skus: string[] }> = {};
    ['A', 'B', 'C'].forEach(abc => {
      ['X', 'Y', 'Z'].forEach(xyz => {
        const key = `${abc}${xyz}`;
        const matching = productMetrics.filter(
          m => m.abc_class === abc && m.xyz_class === xyz
        );
        matrix[key] = {
          count: matching.length,
          revenue: matching.reduce((s, m) => {
            const sales = getImportedSalesForSku(m.sku);
            return s + (sales.length ? sales.reduce((a, r) => a + r.revenue, 0) : 0);
          }, 0),
          skus: matching.map(m => m.sku),
        };
      });
    });
    return matrix;
  }, [productMetrics]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ABC / XYZ Analysis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasImportedData ? 'Segmentation depuis l\'import mobilier' : 'Product segmentation by revenue and variability'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-3.5 h-3.5" />
          Export Matrix
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {abcData.flatMap(abc =>
          xyzData.map(xyz => {
            const key = `${abc.class}${xyz.class}`;
            const count = MATRIX_DATA[key]?.count ?? 0;
            return (
              <div key={key} className={cn('rounded-xl border p-3 transition-all', MATRIX_BG[key])}>
                <div className="text-lg font-bold text-foreground">{key}</div>
                <div className="text-2xl font-bold mt-1">{count}</div>
                <div className="text-xs text-muted-foreground mt-0.5">SKUs</div>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ABC Chart */}
        <ChartCard title="ABC Pareto Analysis" subtitle="Revenue contribution — 80/20 rule">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={PARETO_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="sku" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60}
                tickFormatter={v => formatCurrency(v, true)} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                formatter={(v: number, name: string) => name === 'cumulativePercent' ? [`${v.toFixed(1)}%`, 'Cumulative %'] : [formatCurrency(v), 'Revenue']}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
              />
              <ReferenceLine yAxisId="right" y={80} stroke="#10b981" strokeDasharray="4 2" label={{ value: '80%', fontSize: 10, fill: '#10b981' }} />
              <Bar yAxisId="left" dataKey="revenue" radius={[3, 3, 0, 0]} name="Revenue">
                {PARETO_DATA.map((d, i) => (
                  <Cell key={i} fill={ABC_COLORS[d.class as keyof typeof ABC_COLORS]} />
                ))}
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="cumulativePercent" stroke="#f59e0b" strokeWidth={2} dot={false} name="Cumulative %" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-center">
            {Object.entries(ABC_COLORS).map(([cls, color]) => (
              <div key={cls} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-xs text-muted-foreground">Class {cls}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* XYZ Chart */}
        <ChartCard title="XYZ Demand Variability" subtitle="Products grouped by Coefficient of Variation (CV)">
          <div className="grid grid-cols-3 gap-3 mt-2">
            {xyzData.map(d => (
              <div key={d.class} className="rounded-lg p-4 border text-center" style={{ borderColor: d.color + '30', backgroundColor: d.color + '08' }}>
                <div className="text-3xl font-bold mb-1" style={{ color: d.color }}>{d.products}</div>
                <div className="text-lg font-bold" style={{ color: d.color }}>Class {d.class}</div>
                <div className="text-xs text-muted-foreground mt-1">{d.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="text-xs font-medium text-muted-foreground mb-3">Variability Spectrum</div>
            <div className="h-3 rounded-full overflow-hidden flex">
              <div className="flex-1 bg-blue-500" style={{ flexBasis: `${(35 / 150) * 100}%` }} />
              <div className="flex-1 bg-amber-500" style={{ flexBasis: `${(62 / 150) * 100}%` }} />
              <div className="flex-1 bg-rose-500" style={{ flexBasis: `${(53 / 150) * 100}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>X (Stable) 23%</span>
              <span>Y (Variable) 41%</span>
              <span>Z (Irregular) 35%</span>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ABC-XYZ Matrix */}
      <ChartCard title="ABC-XYZ Strategy Matrix" subtitle="9-cell segmentation — click a cell to filter products">
        <div className="overflow-x-auto mt-2">
          <div className="min-w-[400px]">
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center py-2" />
              {['X — Stable', 'Y — Variable', 'Z — Irregular'].map(h => (
                <div key={h} className="text-center py-2 text-xs font-semibold text-muted-foreground">{h}</div>
              ))}

              {['A', 'B', 'C'].map(abc => (
                <>
                  <div key={`row-${abc}`} className="flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    Class {abc}<br /><span className="text-xs font-normal opacity-60">{abc === 'A' ? '80%' : abc === 'B' ? '15%'  : '5%'} rev</span>
                  </div>
                  {['X', 'Y', 'Z'].map(xyz => {
                    const key = `${abc}${xyz}`;
                    const cell = MATRIX_DATA[key];
                    return (
                      <div
                        key={key}
                        className={cn('rounded-xl border p-4 text-center cursor-pointer hover:opacity-80 transition-opacity', MATRIX_BG[key])}
                      >
                        <div className="text-xl font-bold text-foreground">{key}</div>
                        <div className="text-2xl font-bold mt-1">{cell.count}</div>
                        <div className="text-xs text-muted-foreground">SKUs</div>
                        <div className="text-xs font-medium mt-1">{formatCurrency(cell.revenue, true)}</div>
                        <div className="text-xs text-muted-foreground">revenue</div>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-0.5 shrink-0" />
            <span><strong className="text-foreground">AX</strong> — Top priority: high value, stable. Forecast precisely.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-0.5 shrink-0" />
            <span><strong className="text-foreground">AZ</strong> — High value but erratic. Carry more safety stock.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 mt-0.5 shrink-0" />
            <span><strong className="text-foreground">CZ</strong> — Low value, irregular. Consider rationalization.</span>
          </div>
        </div>
      </ChartCard>
    </div>
  );
}
