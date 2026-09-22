import React from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
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

type ExecutivePerformanceChartProps = {
  title: string;
  subtitle?: string;
  weeklyData: Array<{ name: string; value: number }>;
  monthlyData: Array<{ name: string; value: number }>;
  className?: string;
};

export function ExecutivePerformanceChart({ title, subtitle, weeklyData, monthlyData, className }: ExecutivePerformanceChartProps) {
  const combined = monthlyData.map((month, index) => ({
    name: month.name,
    monthly: month.value,
    weekly: weeklyData[index]?.value ?? month.value,
  }));

  const averageTrend = weeklyData.length
    ? Math.round((weeklyData.reduce((sum, item) => sum + item.value, 0) / weeklyData.length))
    : 0;

  const totalVolume = monthlyData.reduce((sum, item) => sum + item.value, 0);
  const normalizedBase = Math.max(1, totalVolume / Math.max(monthlyData.length, 1));
  const healthRate = Math.min(100, Math.max(0, Math.round((averageTrend / normalizedBase) * 100)));
  const trendState = healthRate >= 80 ? 'Strong momentum' : healthRate >= 60 ? 'Stable momentum' : 'Watchlist momentum';
  const volumeState = totalVolume > 0 ? 'Volume on target' : 'Volume pending';
  const healthState = healthRate >= 80 ? 'High health' : healthRate >= 60 ? 'Healthy' : 'Needs attention';
  const ringData = [
    { name: 'On track', value: healthRate },
    { name: 'Watchlist', value: Math.max(0, 100 - healthRate) },
  ];

  return (
    <ChartCard title={title} subtitle={subtitle} className={className}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(180px, 0.75fr)', gap: '1rem', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
            <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 999, padding: '0.45rem 0.75rem', fontSize: 12, fontWeight: 700 }}>
              {trendState} · {averageTrend}
            </div>
            <div style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 999, padding: '0.45rem 0.75rem', fontSize: 12, fontWeight: 600 }}>
              {volumeState} · {totalVolume}
            </div>
            <div style={{ background: 'var(--success-soft)', border: '1px solid var(--success-border)', color: 'var(--success)', borderRadius: 999, padding: '0.45rem 0.75rem', fontSize: 12, fontWeight: 700 }}>
              {healthState} · {healthRate}%
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combined}>
                <defs>
                  <linearGradient id="executive-performance-area" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.46} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-primary)' }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <Bar dataKey="monthly" radius={[8, 8, 0, 0]} fill="var(--success)" fillOpacity={0.9} barSize={22} />
                <Area type="monotone" dataKey="weekly" stroke="var(--accent)" strokeWidth={3} fill="url(#executive-performance-area)" fillOpacity={1} />
                <Line type="monotone" dataKey="weekly" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent)' }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.5rem 0' }}>
          <div style={{ width: 150, height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ringData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={68}
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={2}
                  cornerRadius={10}
                >
                  <Cell fill="var(--accent)" />
                  <Cell fill="var(--border)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{healthRate}%</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{healthState}</div>
          </div>
        </div>
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
