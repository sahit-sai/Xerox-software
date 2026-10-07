'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Keyboard, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

export default function BackupCodePage() {
  const router = useRouter();
  const [code, setCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length < 6) {
      setErrorMessage('Please enter a valid 6-character code (e.g. K7P-2QX)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/sessions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortCode: code }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Code invalid or expired');
      }

      // Redirect to phone upload portal
      router.push(`/s/${data.session.token_hash}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to claim code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-bgBase text-ink px-5 py-8 flex flex-col justify-between max-w-md mx-auto relative overflow-hidden font-sans selection:bg-signalCyan/20">
      {/* Drifting CMYK Blobs */}
      <div className="cmyk-blob-cyan opacity-50" />
      <div className="cmyk-blob-magenta opacity-50" />

      <div className="space-y-6 relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 glass-2 rounded-control text-ink shadow-sm border border-ink/10 mb-2">
            <Printer className="w-8 h-8 text-signalCyan stroke-[1.75]" />
          </div>
          <h1 className="text-[28px] font-bold text-ink tracking-tight">Enter Kiosk Code</h1>
          <p className="text-[14px] font-normal text-ink2 leading-relaxed max-w-xs mx-auto">
            Type the 6-character backup code displayed on the kiosk screen
          </p>
        </div>

        {/* Code Entry Form Panel */}
        <GlassPanel className="p-7 space-y-6 border border-ink/10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[12px] font-bold uppercase tracking-wider text-ink2 flex items-center justify-center gap-2">
                <Keyboard className="w-4 h-4 text-signalCyan" /> Kiosk Backup Code
              </label>
              <input
                type="text"
                maxLength={7}
                placeholder="K7P-2QX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full bg-white/70 border border-ink/15 rounded-control px-4 py-4 text-center text-3xl font-mono font-black text-ink tracking-[0.15em] focus:outline-none focus:border-signalCyan focus:ring-2 focus:ring-signalCyan/20 transition uppercase shadow-inner"
              />
            </div>

            {errorMessage && (
              <div className="p-4 bg-error/10 border border-error/20 text-error rounded-control text-[14px] font-medium flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isSubmitting || code.length < 6}
              className="w-full flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Verifying Code...
                </>
              ) : (
                <>
                  Connect to Kiosk <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>
        </GlassPanel>
      </div>

      <footer className="text-center relative z-10 pt-4">
        <p className="text-[12px] text-ink3 font-medium">PrintQ Self-Service Kiosks · Fast & Secure</p>
      </footer>
    </main>
  );
}

