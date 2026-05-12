'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DonutChartProps {
  value: number;
  size?: number;
  strokeWidth?: number;
}

export default function DonutChart({ value, size = 120, strokeWidth = 14 }: DonutChartProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const data = [
    { name: 'done', value: clamped },
    { name: 'rest', value: 100 - clamped },
  ];

  const color = clamped >= 70 ? '#10b981' : clamped >= 40 ? '#f59e0b' : '#ef4444';
  const trackColor = '#f1f5f9';

  const r = (size - strokeWidth) / 2;
  const innerR = r - strokeWidth;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <ResponsiveContainer width={size} height={size}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            outerRadius={r}
            innerRadius={innerR}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell key="done" fill={color} />
            <Cell key="rest" fill={trackColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        <span className="text-2xl font-bold" style={{ color, lineHeight: 1 }}>{clamped}</span>
        <span className="text-xs text-slate-400 font-medium mt-0.5">%</span>
      </div>
    </div>
  );
}
