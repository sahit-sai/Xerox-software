import React from 'react';

interface QRCardProps {
  qrDataUrl: string;
  shortCode: string;
  countdownSeconds?: number;
  maxSeconds?: number;
  subtitle?: string;
  size?: number; // 520px default
}

export const QRCard: React.FC<QRCardProps> = ({
  qrDataUrl,
  shortCode,
  countdownSeconds = 90,
  maxSeconds = 90,
  subtitle = 'Scan with your phone camera to upload your file',
  size = 460,
}) => {
  const radius = (size / 2) + 12;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (countdownSeconds / maxSeconds) * circumference;

  return (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Container with Countdown Ring */}
      <div className="relative flex items-center justify-center">
        {/* Animated SVG Ring */}
        <svg
          className="absolute transform -rotate-90 pointer-events-none"
          width={size + 36}
          height={size + 36}
        >
          <circle
            cx={(size + 36) / 2}
            cy={(size + 36) / 2}
            r={radius}
            stroke="rgba(14, 17, 22, 0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={(size + 36) / 2}
            cy={(size + 36) / 2}
            r={radius}
            stroke="#0091CF"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Solid White QR Card (32px Quiet Zone) */}
        <div className="bg-white p-8 rounded-control shadow-2xl z-10 flex items-center justify-center border border-slate-200">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Scan QR" style={{ width: `${size - 64}px`, height: `${size - 64}px` }} className="rounded-lg" />
          ) : (
            <div style={{ width: `${size - 64}px`, height: `${size - 64}px` }} className="bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400 font-semibold text-lg">
              Generating QR...
            </div>
          )}
        </div>
      </div>

      {/* Backup Code */}
      <div className="text-center space-y-1">
        <span className="text-kiosk-small font-semibold text-ink2 uppercase tracking-wider block">Kiosk Backup Code</span>
        <div className="text-kiosk-h2 font-mono font-black text-ink tracking-[0.08em] tabular-nums bg-white/70 px-6 py-2 rounded-control border border-slate-900/10 inline-block shadow-sm">
          {shortCode}
        </div>
        <p className="text-kiosk-small text-ink3 font-normal mt-1">{subtitle}</p>
      </div>
    </div>
  );
};
