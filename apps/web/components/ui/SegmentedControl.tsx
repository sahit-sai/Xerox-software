import React from 'react';

interface Option {
  label: string;
  value: string | boolean;
  disabled?: boolean;
}

interface SegmentedControlProps {
  options: Option[];
  value: string | boolean;
  onChange: (val: any) => void;
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className = '',
}) => {
  return (
    <div className={`glass-2 p-1.5 rounded-control flex gap-1.5 border border-slate-900/10 ${className}`}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-4 rounded-control text-kiosk-label font-semibold transition-all duration-150 touch-active disabled:opacity-30 ${
              isSelected
                ? 'bg-ink text-white shadow-lg'
                : 'text-ink2 hover:text-ink hover:bg-white/40'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
