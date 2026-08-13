import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Card from './Card';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export function ChartCard({ title, subtitle, children, className }: ChartCardProps) {
  return (
    <Card title={title} subtitle={subtitle} className={className}>
      {children}
    </Card>
  );
}

type SimpleBarChartCardProps = {
  title: string;
  subtitle?: string;
  data: Array<{ name: string; value: number }>;
  color?: string;
  className?: string;
};

export function SimpleBarChartCard({ title, subtitle, data, color = 'var(--accent)', className }: SimpleBarChartCardProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: 'var(--accent-soft)' }} contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

type SimpleLineChartCardProps = {
  title: string;
  subtitle?: string;
  data: Array<{ name: string; value: number }>;
  color?: string;
  className?: string;
};

export function SimpleLineChartCard({ title, subtitle, data, color = 'var(--success)', className }: SimpleLineChartCardProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 4, fill: color }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

type SimpleDonutChartCardProps = {
  title: string;
  subtitle?: string;
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  className?: string;
};

export function SimpleDonutChartCard({ title, subtitle, data, colors = ['var(--accent)', 'var(--success)', 'var(--warning)', 'var(--danger)', 'var(--accent-strong)'], className }: SimpleDonutChartCardProps) {
  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2}>
              {data.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-muted)' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

type ColumnChartProps = {
  data: Array<{ label: string; value: number }>;
  className?: string;
  barColor?: string;
};

export function ColumnChart({ data, className, barColor = 'var(--accent)' }: ColumnChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const containerClass = ['company-chart', className].filter(Boolean).join(' ');

  if (data.every((item) => item.value === 0)) {
    return <div className={`${containerClass} company-chart--empty`} aria-label="No delivery performance data">No delivery activity recorded for this year.</div>;
  }

  return (
    <div className={containerClass} aria-label="Column chart">
      {data.map((item) => {
        const height = Math.round((item.value / maxValue) * 100);
        return (
          <div key={item.label} className="company-chart__bar-wrapper">
            <div className="company-chart__bar" style={{ height: `${height}%`, background: barColor }} />
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}
