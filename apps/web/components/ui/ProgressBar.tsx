import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)));

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex justify-between items-baseline text-ink">
        <span className="text-kiosk-body font-bold">{label || 'Printing Progress'}</span>
        <span className="text-kiosk-h1 font-black tabular-nums">{current} / {total} Pages</span>
      </div>

      <div className="w-full h-3 bg-slate-900/10 glass-2 rounded-pill overflow-hidden p-0.5 border border-slate-900/10">
        <div
          className="bg-signalCyan h-full rounded-pill transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
