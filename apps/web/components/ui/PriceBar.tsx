import React from 'react';

interface PriceBarProps {
  summary: string;
  totalRupees: string;
  onContinue?: () => void;
  continueLabel?: string;
  disabled?: boolean;
}

export const PriceBar: React.FC<PriceBarProps> = ({
  summary,
  totalRupees,
  onContinue,
  continueLabel = 'Continue to payment',
  disabled = false,
}) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 glass-1 border-t border-white/70 p-6 rounded-t-panel shadow-2xl flex items-center justify-between">
      <div className="space-y-1">
        <span className="text-kiosk-small font-semibold text-ink2 uppercase tracking-wider block">Price Summary</span>
        <p className="text-kiosk-label font-bold text-ink truncate max-w-xl">{summary}</p>
      </div>

      <div className="flex items-center space-x-8">
        <div className="text-right">
          <span className="text-kiosk-small font-semibold text-ink2 block">Total Amount</span>
          <span className="text-kiosk-h1 font-black text-ink tabular-nums tracking-tight">₹{totalRupees}</span>
        </div>

        {onContinue && (
          <button
            type="button"
            disabled={disabled}
            onClick={onContinue}
            className="bg-ink hover:bg-slate-900 disabled:opacity-40 text-white text-kiosk-label font-bold px-10 py-5 rounded-control shadow-2xl transition-all touch-active"
          >
            {continueLabel} →
          </button>
        )}
      </div>
    </div>
  );
};
