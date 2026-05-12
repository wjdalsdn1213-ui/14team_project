import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({ children, className = '', onClick, hover }: CardProps) {
  const isInteractive = onClick || hover;
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 card-shadow ${
        isInteractive
          ? 'cursor-pointer transition-all duration-200 hover:card-shadow-hover hover:-translate-y-0.5'
          : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
