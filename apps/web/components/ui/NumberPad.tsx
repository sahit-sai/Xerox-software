import React from 'react';
import { Delete } from 'lucide-react';

interface NumberPadProps {
  value: string;
  onChange: (val: string) => void;
  onConfirm?: () => void;
  className?: string;
}

export const NumberPad: React.FC<NumberPadProps> = ({
  value,
  onChange,
  onConfirm,
  className = '',
}) => {
  const handleKeyClick = (key: string) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else {
      onChange(value + key);
    }
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', ','];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Display Value Box */}
      <div className="glass-2 rounded-control p-4 text-right text-kiosk-h2 font-mono font-bold text-ink tracking-wider border border-slate-900/10 min-h-[72px] flex items-center justify-end">
        {value || <span className="text-ink3 font-normal text-kiosk-body">Enter range (e.g. 1-5, 8)</span>}
      </div>

      {/* 3x4 Key Grid */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleKeyClick(k)}
            className="w-[96px] h-[96px] glass-2 rounded-control text-kiosk-h2 font-bold text-ink hover:bg-white/70 active:scale-95 transition flex items-center justify-center border border-slate-900/10 shadow-md tabular-nums"
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => handleKeyClick('backspace')}
          className="flex-1 py-4 glass-2 hover:bg-white/70 rounded-control text-kiosk-label font-bold text-ink flex items-center justify-center gap-2 border border-slate-900/10"
        >
          <Delete className="w-6 h-6" /> Backspace
        </button>
        {onConfirm && (
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-4 bg-ink text-white rounded-control text-kiosk-label font-bold shadow-lg"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};
