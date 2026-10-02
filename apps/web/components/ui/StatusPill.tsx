import React from 'react';

export type KioskStatusType = 'ok' | 'no_paper' | 'jam' | 'offline' | 'disabled';

interface StatusPillProps {
  status: KioskStatusType;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  const config = {
    ok: { label: 'Operational', dotColor: 'bg-success', textColor: 'text-success', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    no_paper: { label: 'Low Paper', dotColor: 'bg-warning', textColor: 'text-warning', bg: 'bg-amber-500/10 border-amber-500/30' },
    jam: { label: 'Printer Jammed', dotColor: 'bg-error', textColor: 'text-error', bg: 'bg-red-500/10 border-red-500/30' },
    offline: { label: 'Offline', dotColor: 'bg-error', textColor: 'text-error', bg: 'bg-red-500/10 border-red-500/30' },
    disabled: { label: 'Disabled', dotColor: 'bg-ink3', textColor: 'text-ink3', bg: 'bg-slate-500/10 border-slate-500/30' },
  };

  const current = config[status] || config.ok;

  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-pill border font-semibold text-kiosk-small shadow-sm ${current.bg} ${className}`}
    >
      <span className={`w-2.5 h-2.5 rounded-full ${current.dotColor} ${status === 'ok' ? 'animate-pulse' : ''}`} />
      <span className={current.textColor}>{current.label}</span>
    </span>
  );
};
