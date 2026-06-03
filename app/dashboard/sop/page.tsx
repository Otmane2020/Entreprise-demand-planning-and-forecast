'use client';

import { useState, useEffect } from 'react';
import { useAppData } from '@/lib/import-data-context';
import { formatNumber, formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChartCard } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Clock, Send, ChevronRight, GitBranch, User, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

type SoipStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

const PERIOD_OPTIONS = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'];

const STATUS_STYLES: Record<SoipStatus, string> = {
  draft: 'bg-muted/40 text-muted-foreground border-border',
  submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

interface SopRow {
  sku: string;
  productName: string;
  statistical: number;
  sales: number | null;
  consensus: number | null;
  status: SoipStatus;
  notes: string;
}

export default function SopPage() {
  const { products, getSalesHistory, version } = useAppData();
  const [period, setPeriod] = useState('2025-03');
  const [rows, setRows] = useState<SopRow[]>([]);

  useEffect(() => {
    setRows(
      products.map(p => {
        const history = getSalesHistory(p.sku);
        const base =
          history.length > 0
            ? history[history.length - 1].units_sold
            : Math.round(200 + Math.random() * 400);
        return {
          sku: p.sku,
          productName: p.product_name,
          statistical: Math.round(base),
          sales: Math.round(base * (0.92 + Math.random() * 0.16)),
          consensus: null,
          status: 'draft' as SoipStatus,
          notes: '',
        };
      })
    );
  }, [products, getSalesHistory, version]);
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  function updateRow(sku: string, update: Partial<SopRow>) {
    setRows(prev => prev.map(r => r.sku === sku ? { ...r, ...update } : r));
  }

  function submitAll() {
    setRows(prev => prev.map(r =>
      r.status === 'draft' ? { ...r, status: 'submitted' } : r
    ));
    toast.success('Forecasts submitted for manager approval');
  }

  function approveAll() {
    setRows(prev => prev.map(r => ({
      ...r,
      status: 'approved',
      consensus: r.sales ?? r.statistical,
    })));
    toast.success('All forecasts approved as consensus');
  }

  const submitted = rows.filter(r => r.status === 'submitted').length;
  const approved = rows.filter(r => r.status === 'approved').length;
  const draft = rows.filter(r => r.status === 'draft').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">S&OP — Sales & Operations Planning</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Collaborative forecast alignment: Statistical → Sales → Consensus</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Workflow Steps */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { step: 1, icon: GitBranch, label: 'Statistical Forecast', sublabel: 'Auto-generated from engine', count: rows.length, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { step: 2, icon: User, label: 'Sales Adjustment', sublabel: 'Sales team override', count: rows.filter(r => r.sales !== null).length, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
          { step: 3, icon: CheckCircle, label: 'Consensus Approval', sublabel: 'Manager sign-off', count: approved, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
        ].map(({ step, icon: Icon, label, sublabel, count, color, bg }) => (
          <div key={step} className={cn('rounded-xl border p-4', bg)}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-card flex items-center justify-center text-xs font-bold text-foreground">{step}</span>
              <Icon className={cn('w-4 h-4', color)} />
              <span className="text-sm font-semibold text-foreground">{label}</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{count}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border">
        <div className="flex gap-2">
          <span className="text-xs px-2 py-1 rounded border bg-muted/40 text-muted-foreground">{draft} draft</span>
          <span className="text-xs px-2 py-1 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">{submitted} submitted</span>
          <span className="text-xs px-2 py-1 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{approved} approved</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-8" onClick={submitAll}>
            <Send className="w-3.5 h-3.5" />
            Submit All Drafts
          </Button>
          <Button size="sm" className="gap-2 h-8" onClick={approveAll}>
            <CheckCircle className="w-3.5 h-3.5" />
            Approve All
          </Button>
        </div>
      </div>

      {/* S&OP Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">SKU / Product</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Statistical</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Sales Adj.</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Variance</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Consensus</th>
              <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const variance = row.sales !== null
                ? ((row.sales - row.statistical) / row.statistical) * 100
                : null;

              return (
                <tr key={row.sku} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{row.productName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{row.sku}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm">{formatNumber(row.statistical)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {row.status === 'draft' || row.status === 'submitted' ? (
                      <input
                        type="number"
                        className="w-24 text-right font-mono text-sm bg-transparent border-b border-border focus:outline-none focus:border-primary"
                        value={row.sales ?? ''}
                        onChange={e => updateRow(row.sku, { sales: e.target.value ? parseInt(e.target.value) : null })}
                        placeholder="—"
                      />
                    ) : (
                      <span className="font-mono text-sm">{row.sales ? formatNumber(row.sales) : '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {variance !== null && (
                      <span className={cn('text-xs font-medium', Math.abs(variance) <= 5 ? 'text-muted-foreground' : variance > 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-sm">
                    {row.consensus ? (
                      <span className="text-emerald-400">{formatNumber(row.consensus)}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium capitalize', STATUS_STYLES[row.status])}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setSelectedSku(selectedSku === row.sku ? null : row.sku)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
