'use client';

import { useState, useEffect } from 'react';
import { MOCK_PRODUCTS } from '@/lib/mock-data';
import { formatNumber, formatCurrency, getServiceLevelZ } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/kpi-card';
import { ChartCard, InventoryCoverageChart } from '@/components/charts';
import { Package, AlertTriangle, Clock, Boxes, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { forecastApi } from '@/lib/forecast-api';
import { generateSalesHistory } from '@/lib/mock-data';
import { toast } from 'sonner';

interface InventoryRecord {
  sku: string;
  product_name: string;
  unit_price: number;
  service_level_target: number;
  lead_time_days: number;
  avgDaily: number;
  safetyStock: number;
  rop: number;
  currentStock: number;
  coverageDays: number;
  inventoryValue: number;
  status: 'ok' | 'warning' | 'critical';
  onOrder: number;
}

const COVERAGE_CHART = [
  { name: 'Electronics', coverage: 38, safety: 8, target: 45 },
  { name: 'Apparel', coverage: 52, safety: 10, target: 60 },
  { name: 'Food & Bev', coverage: 22, safety: 5, target: 28 },
  { name: 'Home', coverage: 65, safety: 14, target: 70 },
  { name: 'Sports', coverage: 41, safety: 9, target: 45 },
];

export default function InventoryPage() {
  const [filter, setFilter] = useState('all');
  const [inventoryData, setInventoryData] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventoryData();
  }, []);

  async function loadInventoryData() {
    setLoading(true);
    try {
      const data: InventoryRecord[] = [];

      for (const p of MOCK_PRODUCTS) {
        const sales = generateSalesHistory(p.sku, 12);
        const units = sales.map(s => s.units_sold);
        const avgMonthly = units.reduce((s, u) => s + u, 0) / units.length;
        const avgDaily = avgMonthly / 30;
        const stdDev = Math.sqrt(units.reduce((s, u) => s + Math.pow(u - avgMonthly, 2), 0) / units.length);
        const z = getServiceLevelZ(p.service_level_target);

        try {
          const inv = await forecastApi.calculateInventory({
            lead_time_days: p.lead_time_days,
            service_level: p.service_level_target,
            forecast_error: stdDev || avgMonthly * 0.12,
            average_daily_demand: avgDaily,
            current_stock: Math.round(avgMonthly * (0.8 + Math.random() * 1.4)),
          });

          const currentStock = Math.round(avgMonthly * (0.8 + Math.random() * 1.4));
          const status: 'ok' | 'warning' | 'critical' =
            currentStock < inv.safety_stock ? 'critical' :
            inv.coverage_days < 14 ? 'warning' : 'ok';

          data.push({
            sku: p.sku,
            product_name: p.product_name,
            unit_price: p.unit_price,
            service_level_target: p.service_level_target,
            lead_time_days: p.lead_time_days,
            avgDaily,
            safetyStock: inv.safety_stock,
            rop: inv.reorder_point,
            currentStock,
            coverageDays: inv.coverage_days,
            inventoryValue: currentStock * p.unit_price,
            status,
            onOrder: Math.random() < 0.3 ? Math.round(avgMonthly * 0.5) : 0,
          });
        } catch (error) {
          // Fallback
          const safetyStock = Math.round(z * stdDev * Math.sqrt(p.lead_time_days));
          const rop = Math.round(avgDaily * p.lead_time_days + safetyStock);
          const currentStock = Math.round(avgMonthly * (0.8 + Math.random() * 1.4));
          const coverageDays = Math.round(currentStock / avgDaily);

          data.push({
            sku: p.sku,
            product_name: p.product_name,
            unit_price: p.unit_price,
            service_level_target: p.service_level_target,
            lead_time_days: p.lead_time_days,
            avgDaily,
            safetyStock,
            rop,
            currentStock,
            coverageDays,
            inventoryValue: currentStock * p.unit_price,
            status: currentStock < safetyStock ? 'critical' : coverageDays < 14 ? 'warning' : 'ok',
            onOrder: Math.random() < 0.3 ? Math.round(avgMonthly * 0.5) : 0,
          });
        }
      }

      setInventoryData(data);
    } catch (error) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }

  const totalValue = inventoryData.reduce((s, p) => s + p.inventoryValue, 0);
  const avgCoverage = inventoryData.length > 0 ? Math.round(inventoryData.reduce((s, p) => s + p.coverageDays, 0) / inventoryData.length) : 0;
  const criticalCount = inventoryData.filter(p => p.status === 'critical').length;
  const warningCount = inventoryData.filter(p => p.status === 'warning').length;

  const filtered = filter === 'all' ? inventoryData :
    inventoryData.filter(p => p.status === filter);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Inventory Optimization</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Safety stock, reorder points, and coverage monitoring</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={loadInventoryData} disabled={loading}>
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Recalculate
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Inventory Value"
          value={formatCurrency(totalValue, true)}
          status="blue"
          icon={<Boxes className="w-4 h-4" />}
        />
        <KpiCard
          title="Avg Coverage"
          value={`${avgCoverage}d`}
          status={avgCoverage >= 30 ? 'green' : avgCoverage >= 14 ? 'orange' : 'red'}
          icon={<Clock className="w-4 h-4" />}
          subtitle="Days of supply"
        />
        <KpiCard
          title="Critical SKUs"
          value={criticalCount.toString()}
          status={criticalCount === 0 ? 'green' : 'red'}
          icon={<AlertTriangle className="w-4 h-4" />}
          subtitle="Below safety stock"
        />
        <KpiCard
          title="At-Risk SKUs"
          value={warningCount.toString()}
          status={warningCount === 0 ? 'green' : 'orange'}
          icon={<Package className="w-4 h-4" />}
          subtitle="Coverage < 14 days"
        />
      </div>

      <ChartCard title="Coverage by Category" subtitle="Days of supply vs. safety buffer">
        <InventoryCoverageChart data={COVERAGE_CHART} height={220} />
      </ChartCard>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Inventory Positions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Safety stock calculated: Z × σ_forecast × √(Lead Time)</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All SKUs</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="ok">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              {['SKU', 'Product', 'Current Stock', 'Safety Stock', 'ROP', 'Coverage', 'On Order', 'Value', 'Status'].map(h => (
                <th key={h} className={cn('py-2.5 text-xs font-medium text-muted-foreground', h === 'SKU' || h === 'Product' ? 'text-left px-4' : 'text-right px-4')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.sku} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
                <td className="px-4 py-2.5 font-medium max-w-[180px] truncate">{p.product_name}</td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-sm', p.currentStock < p.safetyStock ? 'text-rose-400' : 'text-foreground')}>
                  {formatNumber(p.currentStock)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                  {formatNumber(p.safetyStock)}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                  {formatNumber(p.rop)}
                </td>
                <td className={cn('px-4 py-2.5 text-right font-mono text-sm', p.coverageDays >= 30 ? 'text-emerald-400' : p.coverageDays >= 14 ? 'text-amber-400' : 'text-rose-400')}>
                  {p.coverageDays}d
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm text-muted-foreground">
                  {p.onOrder > 0 ? formatNumber(p.onOrder) : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-sm">
                  {formatCurrency(p.inventoryValue, true)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', p.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : p.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20')}>
                    {p.status === 'ok' ? 'Healthy' : p.status === 'warning' ? 'At Risk' : 'Critical'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
