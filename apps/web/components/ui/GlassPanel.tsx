import React from 'react';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', glow = false, ...props }) => {
  return (
    <div
      className={`glass-1 rounded-panel p-8 shadow-2xl relative border border-white/70 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const GlassControl: React.FC<GlassPanelProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`glass-2 rounded-control p-4 border border-slate-900/10 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
