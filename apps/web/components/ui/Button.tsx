import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'kiosk';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => {
  const baseStyles =
    'font-sans font-semibold inline-flex items-center justify-center transition-all duration-120 touch-active disabled:opacity-40 disabled:pointer-events-allowed select-none';

  const variantStyles = {
    primary: 'bg-ink text-white hover:bg-slate-900 shadow-xl rounded-control border border-ink',
    secondary: 'glass-2 text-ink hover:bg-white/60 rounded-control border border-slate-900/10',
    ghost: 'bg-transparent text-ink hover:bg-slate-900/5 rounded-control',
    destructive: 'bg-error text-white hover:bg-red-700 rounded-control shadow-lg',
  };

  const sizeStyles = {
    sm: 'px-4 py-2.5 text-sm rounded-control min-h-[44px]',
    md: 'px-6 py-4 text-base rounded-control min-h-[56px]',
    lg: 'px-8 py-5 text-lg rounded-control min-h-[64px]',
    kiosk: 'w-full h-[112px] px-8 text-[28px] font-bold rounded-control leading-none shadow-2xl',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-current" />
          <span>Processing...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};
