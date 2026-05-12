interface BadgeProps {
  children: React.ReactNode;
  variant?: 'normal' | 'warning' | 'critical' | 'info' | 'success' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variants = {
  normal:   { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  warning:  { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  critical: { badge: 'bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
  info:     { badge: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  success:  { badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  neutral:  { badge: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' },
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({ children, variant = 'info', size = 'sm', dot = false }: BadgeProps) {
  const style = variants[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${style.badge} ${sizes[size]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />}
      {children}
    </span>
  );
}
