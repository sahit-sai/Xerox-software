'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Keyboard, ArrowRight, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 selection:bg-emerald-500/30">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20 mb-1">
            <Printer className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">Enter Kiosk Code</h1>
          <p className="text-xs text-slate-400 font-medium">
            Type the 6-character backup code shown under the QR code on the kiosk screen
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 shadow-2xl space-y-5 border border-white/10">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-emerald-400" /> Kiosk Backup Code
            </label>
            <input
              type="text"
              maxLength={7}
              placeholder="e.g. K7P-2QX"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-4 text-center text-2xl font-mono font-black text-emerald-400 tracking-widest focus:outline-none focus:border-emerald-500 uppercase"
            />
          </div>

          {errorMessage && (
            <div className="bg-red-950/80 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || code.length < 6}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 text-base"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                Connect to Kiosk <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
