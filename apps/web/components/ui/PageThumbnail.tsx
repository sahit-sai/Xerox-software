import React from 'react';
import { FileText } from 'lucide-react';

interface PageThumbnailProps {
  pageNumber: number;
  totalPages?: number;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  pageNumber,
  totalPages,
  isSelected = false,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center space-y-2 group cursor-pointer ${className}`}
    >
      <div
        className={`w-full aspect-[1/1.4] glass-2 rounded-control p-4 flex flex-col items-center justify-center border transition-all duration-150 touch-active relative overflow-hidden ${
          isSelected
            ? 'border-ink ring-2 ring-ink shadow-lg bg-white/80'
            : 'border-ink/10 hover:border-ink/30 hover:bg-white/60 shadow-sm'
        }`}
      >
        {/* Mock Document Lines */}
        <div className="w-full h-full flex flex-col justify-between py-2 px-1 opacity-70">
          <div className="space-y-2">
            <div className="w-2/3 h-2 bg-ink/20 rounded-pill" />
            <div className="w-full h-1.5 bg-ink/10 rounded-pill" />
            <div className="w-5/6 h-1.5 bg-ink/10 rounded-pill" />
            <div className="w-4/5 h-1.5 bg-ink/10 rounded-pill" />
          </div>
          <FileText className="w-8 h-8 text-ink3 mx-auto my-auto opacity-40" />
          <div className="space-y-1.5">
            <div className="w-full h-1.5 bg-ink/10 rounded-pill" />
            <div className="w-3/4 h-1.5 bg-ink/10 rounded-pill" />
          </div>
        </div>
      </div>
      <span className="text-kiosk-small font-medium text-ink2 tabular-nums">
        Page {pageNumber}
      </span>
    </div>
  );
};
