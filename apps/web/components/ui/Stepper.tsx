import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  value,
  min = 1,
  max = 50,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-6 ${className}`}>
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-[88px] h-[88px] glass-2 rounded-control text-ink flex items-center justify-center hover:bg-white/70 active:scale-95 transition disabled:opacity-30 border border-slate-900/10 shadow-md"
      >
        <Minus className="w-10 h-10 stroke-[2.5]" />
      </button>

      <span className="w-24 text-center text-kiosk-h1 font-extrabold text-ink tabular-nums">
        {value}
      </span>

      <button
        type="button"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-[88px] h-[88px] glass-2 rounded-control text-ink flex items-center justify-center hover:bg-white/70 active:scale-95 transition disabled:opacity-30 border border-slate-900/10 shadow-md"
      >
        <Plus className="w-10 h-10 stroke-[2.5]" />
      </button>
    </div>
  );
};
