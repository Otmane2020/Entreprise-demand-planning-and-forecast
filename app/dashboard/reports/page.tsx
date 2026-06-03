'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, BarChart3, TrendingUp, Package, Users, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

const REPORT_TEMPLATES = [
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    description: 'High-level KPIs, forecast accuracy, top risks and opportunities',
    icon: BarChart3,
    formats: ['PDF', 'Excel'],
    category: 'Management',
  },
  {
    id: 'monthly-forecast',
    title: 'Monthly Forecast Review',
    description: 'Detailed forecast per SKU with model performance and bias analysis',
    icon: TrendingUp,
    formats: ['PDF', 'Excel', 'CSV'],
    category: 'Forecasting',
  },
  {
    id: 'inventory-optimization',
    title: 'Inventory Optimization Report',
    description: 'Safety stock levels, reorder points, coverage analysis by category',
    icon: Package,
    formats: ['PDF', 'Excel'],
    category: 'Inventory',
  },
  {
    id: 'sop-report',
    title: 'S&OP Consensus Report',
    description: 'Statistical vs Sales vs Consensus comparison with variance analysis',
    icon: Users,
    formats: ['PDF', 'Excel'],
    category: 'S&OP',
  },
  {
    id: 'abc-xyz',
    title: 'ABC/XYZ Analysis Report',
    description: 'Product segmentation, Pareto analysis, matrix export',
    icon: BarChart3,
    formats: ['PDF', 'Excel', 'CSV'],
    category: 'Analytics',
  },
  {
    id: 'forecast-accuracy',
    title: 'Forecast Accuracy Report',
    description: 'MAPE, WAPE, Bias, MASE trends per SKU and category',
    icon: TrendingUp,
    formats: ['PDF', 'Excel'],
    category: 'Forecasting',
  },
];

const RECENT_EXPORTS = [
  { name: 'Monthly Forecast Review — Feb 2025.pdf', size: '2.4 MB', date: '2025-02-28', status: 'ready' },
  { name: 'Executive Summary — Q1 2025.xlsx', size: '1.8 MB', date: '2025-01-31', status: 'ready' },
  { name: 'Inventory Optimization — Jan 2025.pdf', size: '3.1 MB', date: '2025-01-15', status: 'ready' },
  { name: 'ABC XYZ Analysis — 2024 FY.xlsx', size: '0.9 MB', date: '2024-12-31', status: 'ready' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('2025-02');
  const [generating, setGenerating] = useState<string | null>(null);

  function generateReport(id: string, format: string) {
    setGenerating(`${id}-${format}`);
    setTimeout(() => {
      setGenerating(null);
      toast.success(`Report generated successfully (${format})`);
    }, 1800);
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Reports & Exports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate PDF, Excel, and CSV reports for management and operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['2025-03', '2025-02', '2025-01', '2024-12', '2024-11'].map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REPORT_TEMPLATES.map(template => (
          <div key={template.id} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <template.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{template.title}</div>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-0.5 inline-block">
                  {template.category}
                </span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mb-4">{template.description}</p>

            <div className="flex items-center gap-2">
              {template.formats.map(fmt => (
                <Button
                  key={fmt}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  disabled={generating === `${template.id}-${fmt}`}
                  onClick={() => generateReport(template.id, fmt)}
                >
                  <Download className="w-3 h-3" />
                  {generating === `${template.id}-${fmt}` ? 'Generating…' : fmt}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Exports */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Recent Exports</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Your generated reports (last 30 days)</p>
        </div>
        <div className="divide-y">
          {RECENT_EXPORTS.map((file, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{file.size} · {file.date}</div>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                Ready
              </span>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0">
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Scheduled Reports */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="text-sm font-semibold mb-1">Scheduled Reports</h3>
        <p className="text-xs text-muted-foreground mb-4">Automatic report delivery via email</p>
        <div className="space-y-2">
          {[
            { name: 'Monthly Forecast Review', schedule: 'Last day of month', recipients: '3 people', active: true },
            { name: 'Weekly Accuracy Update', schedule: 'Every Monday 08:00', recipients: '5 people', active: true },
            { name: 'Quarterly Executive Summary', schedule: 'End of quarter', recipients: '8 people', active: false },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.schedule} · {s.recipients}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn('text-xs px-2 py-0.5 rounded-full border', s.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-muted/40 text-muted-foreground border-border')}>
                  {s.active ? 'Active' : 'Paused'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
