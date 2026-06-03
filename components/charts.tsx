'use client';

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = {
  primary: 'hsl(213, 94%, 55%)',
  success: 'hsl(142, 71%, 50%)',
  warning: 'hsl(38, 92%, 55%)',
  danger: 'hsl(0, 84%, 60%)',
  muted: 'hsl(220, 10%, 46%)',
  confidenceFill: 'hsl(213, 94%, 55%)',
};

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export function ChartCard({ title, subtitle, children, className, actions }: ChartCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card shadow-sm p-5', className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

interface ForecastChartProps {
  data: Array<{ month: string; actual: number; forecast: number; lower?: number; upper?: number }>;
  height?: number;
}

export function ForecastVsActualChart({ data, height = 260 }: ForecastChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend iconType="circle" iconSize={8} />
        {data[0]?.upper && (
          <Area type="monotone" dataKey="upper" stroke="none" fill="url(#ciGrad)" name="Confidence Band" legendType="none" />
        )}
        {data[0]?.lower && (
          <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--background))" legendType="none" />
        )}
        <Area type="monotone" dataKey="actual" stroke={COLORS.success} fill="url(#actualGrad)" strokeWidth={2} name="Actual" dot={false} />
        <Area type="monotone" dataKey="forecast" stroke={COLORS.primary} fill="url(#forecastGrad)" strokeWidth={2} name="Forecast" dot={false} strokeDasharray="5 3" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface MapeChartProps {
  data: Array<{ month: string; mape: number; wape: number }>;
  height?: number;
}

export function MapeChart({ data, height = 200 }: MapeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={35} unit="%" />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(1)}%`]}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend iconType="circle" iconSize={8} />
        <ReferenceLine y={10} stroke={COLORS.success} strokeDasharray="3 3" label={{ value: 'Target 10%', fontSize: 10, fill: COLORS.success }} />
        <Line type="monotone" dataKey="mape" stroke={COLORS.warning} strokeWidth={2} dot={false} name="MAPE" />
        <Line type="monotone" dataKey="wape" stroke={COLORS.primary} strokeWidth={2} dot={false} name="WAPE" />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface BiasTrendProps {
  data: Array<{ month: string; bias: number }>;
  height?: number;
}

export function BiasTrendChart({ data, height = 180 }: BiasTrendProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} unit="%" />
        <Tooltip
          formatter={(v: number) => [`${v.toFixed(1)}%`]}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <ReferenceLine y={0} stroke="hsl(var(--border))" />
        <Bar dataKey="bias" name="Forecast Bias" radius={[3, 3, 0, 0]}
          fill={COLORS.primary}
          label={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface InventoryCoverageProps {
  data: Array<{ name: string; coverage: number; safety: number; target: number }>;
  height?: number;
}

export function InventoryCoverageChart({ data, height = 220 }: InventoryCoverageProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit=" days" />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
        <Tooltip
          formatter={(v: number, n: string) => [`${v} days`, n]}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend iconType="circle" iconSize={8} />
        <Bar dataKey="safety" name="Safety Stock" stackId="a" fill={COLORS.warning} radius={[0, 0, 0, 0]} />
        <Bar dataKey="coverage" name="Current Coverage" stackId="a" fill={COLORS.primary} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
