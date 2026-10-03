import React from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';

interface PageThumbnailProps {
  pageNumber: number;
  totalPages?: number;
  isSelected?: boolean;
  previewUrl?: string;
  fileName?: string;
  onClick?: () => void;
  className?: string;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  pageNumber,
  totalPages,
  isSelected = false,
  previewUrl,
  fileName = 'Document',
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center space-y-2 group cursor-pointer select-none ${className}`}
    >
      <div
        className={`w-full aspect-[1/1.4] glass-2 rounded-control p-3 flex flex-col items-center justify-center border transition-all duration-150 touch-active relative overflow-hidden ${
          isSelected
            ? 'border-ink ring-2 ring-ink shadow-lg bg-white/95'
            : 'border-ink/10 hover:border-ink/30 hover:bg-white/70 shadow-sm'
        }`}
      >
        {previewUrl ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-sm bg-ink/5">
            <img
              src={previewUrl}
              alt={`Preview Page ${pageNumber}`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col justify-between py-2 px-1 text-ink opacity-80">
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-[9px] font-bold text-ink2 uppercase tracking-wider truncate">
                <FileText className="w-3 h-3 text-signalCyan shrink-0" />
                <span className="truncate">{fileName}</span>
              </div>
              <div className="w-2/3 h-1.5 bg-ink/20 rounded-pill" />
              <div className="w-full h-1.5 bg-ink/10 rounded-pill" />
              <div className="w-5/6 h-1.5 bg-ink/10 rounded-pill" />
              <div className="w-4/5 h-1.5 bg-ink/10 rounded-pill" />
            </div>

            <div className="my-auto text-center py-2">
              <div className="w-10 h-12 bg-white/80 border border-ink/15 mx-auto rounded flex flex-col items-center justify-center shadow-xs">
                <span className="text-[11px] font-extrabold text-ink tabular-nums">{pageNumber}</span>
                <span className="text-[7px] text-ink3 uppercase font-medium">PAGE</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="w-full h-1.5 bg-ink/10 rounded-pill" />
              <div className="w-3/4 h-1.5 bg-ink/10 rounded-pill" />
            </div>
          </div>
        )}
      </div>
      <span className="text-kiosk-small font-semibold text-ink2 tabular-nums">
        Page {pageNumber} {totalPages ? `of ${totalPages}` : ''}
      </span>
    </div>
  );
};

