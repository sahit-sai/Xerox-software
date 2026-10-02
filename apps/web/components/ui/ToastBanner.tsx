import React from 'react';
import { AlertTriangle, XCircle, CheckCircle2, Info } from 'lucide-react';

interface ToastBannerProps {
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const ToastBanner: React.FC<ToastBannerProps> = ({
  type = 'error',
  title,
  message,
  actionLabel,
  onAction,
  className = '',
}) => {
  const borderColors = {
    error: 'border-l-error border-l-[6px]',
    warning: 'border-l-warning border-l-[6px]',
    info: 'border-l-signalCyan border-l-[6px]',
    success: 'border-l-success border-l-[6px]',
  };

  const icons = {
    error: <XCircle className="w-8 h-8 text-error shrink-0" />,
    warning: <AlertTriangle className="w-8 h-8 text-warning shrink-0" />,
    info: <Info className="w-8 h-8 text-signalCyan shrink-0" />,
    success: <CheckCircle2 className="w-8 h-8 text-success shrink-0" />,
  };

  return (
    <div
      className={`glass-1 rounded-control p-6 shadow-xl flex items-center justify-between gap-6 border border-white/70 ${borderColors[type]} ${className}`}
    >
      <div className="flex items-center gap-4">
        {icons[type]}
        <div className="space-y-0.5">
          {title && <h4 className="font-bold text-ink text-kiosk-label">{title}</h4>}
          <p className="text-kiosk-body text-ink2 font-medium">{message}</p>
        </div>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="px-6 py-3 bg-ink text-white text-kiosk-label font-bold rounded-control hover:bg-slate-900 transition touch-active shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
