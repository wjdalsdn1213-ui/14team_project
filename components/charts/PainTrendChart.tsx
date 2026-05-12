'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ExerciseLog } from '@/lib/types';

interface PainTrendChartProps {
  logs: ExerciseLog[];
  daysBack?: number;
}

export default function PainTrendChart({ logs, daysBack = 14 }: PainTrendChartProps) {
  const data = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date('2026-05-07');
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logs.filter(l => l.date === dateStr);
    const avg =
      dayLogs.length > 0
        ? Math.round((dayLogs.reduce((s, l) => s + l.painScore, 0) / dayLogs.length) * 10) / 10
        : null;
    data.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, 통증: avg });
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="painGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 10]}
          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          ticks={[0, 2, 4, 6, 8, 10]}
        />
        <Tooltip
          formatter={(v) => [`${v}점`, '평균 통증']}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: 12,
            fontWeight: 600,
            color: '#0f172a',
          }}
          labelStyle={{ color: '#94a3b8', fontWeight: 400, marginBottom: 2 }}
        />
        <ReferenceLine y={7} stroke="#fca5a5" strokeDasharray="5 3" strokeWidth={1.5} />
        <Area
          type="monotone"
          dataKey="통증"
          stroke="#3b82f6"
          strokeWidth={2.5}
          fill="url(#painGrad)"
          dot={false}
          activeDot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
          connectNulls={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
