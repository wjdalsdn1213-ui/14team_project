'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { ExerciseLog, Prescription } from '@/lib/types';

interface CompletionChartProps {
  logs: ExerciseLog[];
  prescription: Prescription | undefined;
  weeksBack?: number;
}

export default function CompletionChart({ logs, prescription, weeksBack = 4 }: CompletionChartProps) {
  if (!prescription)
    return (
      <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
        처방 데이터 없음
      </div>
    );

  const data = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = new Date('2026-05-07');
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
    const weekEnd = new Date('2026-05-07');
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekLogs = logs.filter(l => {
      const d = new Date(l.date);
      return d >= weekStart && d < weekEnd;
    });
    const expected = prescription.exercises.length * 7;
    const rate = expected > 0 ? Math.min(100, Math.round((weekLogs.length / expected) * 100)) : 0;
    data.push({ week: `${weeksBack - i}주 전`, 수행률: rate, isCurrent: i === 0 });
  }
  data[data.length - 1].week = '이번 주';

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          ticks={[0, 25, 50, 75, 100]}
        />
        <Tooltip
          formatter={(v) => [`${v}%`, '수행률']}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            fontSize: 12,
            fontWeight: 600,
            color: '#0f172a',
          }}
          labelStyle={{ color: '#94a3b8', fontWeight: 400, marginBottom: 2 }}
          cursor={{ fill: '#f8fafc' }}
        />
        <Bar dataKey="수행률" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={
                entry.isCurrent
                  ? '#2563eb'
                  : entry.수행률 >= 70
                  ? '#10b981'
                  : entry.수행률 >= 40
                  ? '#f59e0b'
                  : '#f87171'
              }
              fillOpacity={entry.isCurrent ? 1 : 0.6}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
