'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Printer, Upload, FileText, CheckCircle2, AlertTriangle, ShieldCheck,
  Smartphone, Sparkles, RefreshCw, XCircle, ArrowRight, Zap, QrCode
} from 'lucide-react';
import { calculateJobPrice, calculateSheets, KioskState } from '@printq/shared';

interface KioskData {
  id: string;
  code: string;
  name: string;
  location: string;
  supports_colour: boolean;
  paper_sheets: number;
  state: KioskState;
  rate_bw: number;
  rate_colour: number;
  double_discount_pct: number;
}

export default function CustomerKioskPage() {
  const params = useParams();
  const kioskCode = (params.kioskCode as string) || 'VISHNU01';

  // Kiosk state
  const [kiosk, setKiosk] = useState<KioskData>({
    id: '22222222-2222-2222-2222-222222222221',
    code: kioskCode,
    name: 'Vishnu College Library',
    location: 'Ground Floor, Central Library',
    supports_colour: true,
    paper_sheets: 450,
    state: 'ok',
    rate_bw: 200, // ₹2.00
    rate_colour: 1000, // ₹10.00
    double_discount_pct: 10,
  });

  // Form State
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [copies, setCopies] = useState<number>(1);
  const [colour, setColour] = useState<boolean>(false);
  const [doubleSided, setDoubleSided] = useState<boolean>(false);
  const [pageRange, setPageRange] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Job Tracker State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState<any>(null);

  // Auto-calculate live price & sheets required
  const effectiveSheets = calculateSheets(pageCount, copies, doubleSided);
  const pricing = calculateJobPrice(kiosk, {
    pages: pageCount,
    copies,
    colour,
    double_sided: doubleSided,
  });

  const isKioskAvailable = kiosk.state === 'ok' && kiosk.paper_sheets > 0;

  // Handle File Upload & Estimation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25 MB limit.');
      return;
    }

    setErrorMessage(null);
    setFile(selected);

    if (selected.type.startsWith('image/')) {
      setPageCount(1);
    } else {
      const estimatedPages = Math.max(1, Math.round(selected.size / (100 * 1024)));
      setPageCount(estimatedPages);
    }
  };

  // Poll Job Tracker if active
  useEffect(() => {
    if (!activeJobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${activeJobId}`);
        const data = await res.json();
        if (data.job) {
          setJobDetails(data.job);
        }
      } catch (err) {
        console.error('Error fetching tracker update:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeJobId]);

  // Handle Order Submit & Payment
  const handleSubmitOrder = async () => {
    if (!file) {
      setErrorMessage('Please select a file to print.');
      return;
    }
    if (!phone || phone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (effectiveSheets > kiosk.paper_sheets) {
      setErrorMessage(`Kiosk has only ${kiosk.paper_sheets} sheets remaining. Job needs ${effectiveSheets} sheets.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kioskCode', kioskCode);
      formData.append('customerPhone', phone);
      formData.append('copies', copies.toString());
      formData.append('colour', colour.toString());
      formData.append('doubleSided', doubleSided.toString());
      formData.append('pageRange', pageRange);

      const res = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit job');
      }

      // Simulate webhook payment capture for demo testing
      await fetch('/api/razorpay/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment.captured',
          mock_payment: true,
          order_id: data.job.razorpayOrderId,
          payment_id: `pay_demo_${Date.now()}`,
        }),
      });

      setActiveJobId(data.job.id);
      setJobDetails({
        id: data.job.id,
        token: Math.floor(Math.random() * 20) + 1,
        file_name: file.name,
        pages: pageCount,
        copies,
        sheets: effectiveSheets,
        amount_paise: pricing.totalPaise,
        status: 'queued',
        queue_ahead: 0,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 pb-24 selection:bg-emerald-500/30">
      {/* Background Lights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed bottom-0 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Glass Header */}
      <header className="w-full max-w-md glass-panel rounded-3xl p-5 mb-6 shadow-2xl flex items-center justify-between relative z-10 border border-white/10">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-tight leading-snug">{kiosk.name}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>Kiosk Code:</span>
              <span className="font-mono bg-slate-900 border border-white/10 px-2 py-0.5 rounded-lg text-emerald-400 font-bold">{kiosk.code}</span>
            </p>
          </div>
        </div>

        <div>
          {isKioskAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full text-xs font-bold shadow-inner">
              <AlertTriangle className="w-3.5 h-3.5" /> Unavailable
            </span>
          )}
        </div>
      </header>

      {/* Warning Banner if Kiosk Unavailable */}
      {!isKioskAvailable && (
        <div className="w-full max-w-md glass-panel bg-red-950/40 border border-red-500/30 text-red-200 p-5 rounded-3xl mb-6 flex items-start gap-3.5 shadow-2xl relative z-10">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm text-red-100">Kiosk Out of Service</h3>
            <p className="text-xs text-red-300/80 mt-1 leading-relaxed">
              This kiosk is currently out of paper or offline. Payment is blocked. Scan another PrintQ kiosk nearby.
            </p>
          </div>
        </div>
      )}

      {/* Active Job Tracker Screen */}
      {activeJobId && jobDetails ? (
        <div className="w-full max-w-md glass-panel-glow rounded-3xl p-6 shadow-2xl space-y-6 relative z-10">
          <div className="text-center border-b border-white/10 pb-6">
            <span className="text-xs font-extrabold tracking-widest text-emerald-400 uppercase">Live Kiosk Status</span>
            <div className="mt-3 bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 py-5 px-8 rounded-3xl inline-block shadow-inner">
              <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Your Token Number</span>
              <span className="text-5xl font-black text-white tracking-tight">
                Token {jobDetails.token ? String(jobDetails.token).padStart(2, '0') : '--'}
              </span>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3.5 p-4 glass-card rounded-2xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-white">Payment Verified via UPI</p>
                <p className="text-xs text-slate-400">Paid ₹{(jobDetails.amount_paise / 100).toFixed(2)}</p>
              </div>
            </div>

            <div className={`flex items-center gap-3.5 p-4 rounded-2xl border ${
              jobDetails.status === 'queued' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'glass-card text-slate-300'
            }`}>
              <RefreshCw className={`w-6 h-6 ${jobDetails.status === 'queued' ? 'animate-spin text-amber-400' : 'text-slate-500'}`} />
              <div>
                <p className="text-sm font-bold">Queued for Printer</p>
                <p className="text-xs text-slate-400">
                  {jobDetails.queue_ahead > 0 ? `${jobDetails.queue_ahead} job(s) ahead in queue` : 'Printing next in queue'}
                </p>
              </div>
            </div>

            <div className={`flex items-center gap-3.5 p-4 rounded-2xl border ${
              jobDetails.status === 'printing' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200' : 'glass-card text-slate-400'
            }`}>
              <Printer className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-sm font-bold">Printing in Progress</p>
                <p className="text-xs text-slate-400">{jobDetails.sheets} sheets total</p>
              </div>
            </div>

            <div className={`flex items-center gap-3.5 p-4 rounded-2xl border ${
              jobDetails.status === 'done' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-100' : 'glass-card text-slate-500'
            }`}>
              <Sparkles className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-sm font-bold">Print Completed!</p>
                <p className="text-xs text-slate-300">Collect pages directly from tray below.</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setActiveJobId(null); setFile(null); }}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold py-3.5 rounded-2xl transition text-sm"
          >
            Print Another Document
          </button>
        </div>
      ) : (
        /* Main Upload & Options Form */
        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Upload Dropzone */}
          <div className="glass-panel border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-3xl p-8 text-center transition shadow-2xl relative group">
            <input
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={!isKioskAvailable}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed z-20"
            />
            <div className="flex flex-col items-center relative z-10">
              <div className="p-4 bg-gradient-to-tr from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-400 rounded-3xl mb-4 group-hover:scale-105 transition">
                <Upload className="w-8 h-8" />
              </div>
              <p className="font-extrabold text-white text-base tracking-tight">
                {file ? file.name : 'Tap to Select Document'}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Supports PDF, DOCX, JPG, PNG (Max 25 MB)
              </p>
              {file && (
                <span className="mt-4 px-3.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-bold">
                  Detected ~{pageCount} Page(s)
                </span>
              )}
            </div>
          </div>

          {/* Settings Glass Panel */}
          <div className="glass-panel rounded-3xl p-6 shadow-2xl space-y-5">
            <h2 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2 border-b border-white/10 pb-3">
              <FileText className="w-4 h-4 text-emerald-400" /> Print Preferences
            </h2>

            {/* Copies */}
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-200">Number of Copies</label>
              <div className="flex items-center space-x-3 bg-slate-900/80 border border-white/10 p-1.5 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setCopies(Math.max(1, copies - 1))}
                  className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-xl text-lg font-bold text-white flex items-center justify-center transition"
                >
                  -
                </button>
                <span className="w-6 text-center font-black text-emerald-400 text-lg">{copies}</span>
                <button
                  type="button"
                  onClick={() => setCopies(Math.min(50, copies + 1))}
                  className="w-8 h-8 bg-slate-800 hover:bg-slate-700 rounded-xl text-lg font-bold text-white flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Colour / B&W */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <div>
                <label className="text-sm font-bold text-slate-200 block">Print Mode</label>
                <span className="text-xs text-slate-400">
                  {kiosk.supports_colour ? `₹${(kiosk.rate_colour / 100).toFixed(2)}/page` : 'B&W Only Kiosk'}
                </span>
              </div>
              <button
                type="button"
                disabled={!kiosk.supports_colour}
                onClick={() => setColour(!colour)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition border ${
                  colour
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900/80 text-slate-300 border-white/10'
                }`}
              >
                {colour ? 'Colour' : 'Black & White'}
              </button>
            </div>

            {/* Single / Double Sided */}
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <div>
                <label className="text-sm font-bold text-slate-200 block">Sides</label>
                {kiosk.double_discount_pct > 0 && (
                  <span className="text-xs text-emerald-400 font-semibold">{kiosk.double_discount_pct}% paper discount</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDoubleSided(!doubleSided)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition border ${
                  doubleSided
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900/80 text-slate-300 border-white/10'
                }`}
              >
                {doubleSided ? 'Double Sided' : 'Single Sided'}
              </button>
            </div>

            {/* Page Range */}
            <div className="pt-3 border-t border-white/5">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Page Range (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 1-5, 8 (Default: All)"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Phone Input */}
          <div className="glass-panel rounded-3xl p-5 shadow-2xl space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" /> Phone Number (For Receipt & Refund)
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="bg-red-950/80 border border-red-500/40 text-red-200 p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Price & Checkout Card */}
          <div className="glass-panel-glow rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-baseline">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Amount</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  {effectiveSheets} sheet(s) • {copies} copy
                </p>
              </div>
              <span className="text-4xl font-black text-white tracking-tight">
                ₹{pricing.totalRupees}
              </span>
            </div>

            <button
              type="button"
              disabled={!isKioskAvailable || isSubmitting}
              onClick={handleSubmitOrder}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 disabled:pointer-events-allowed text-slate-950 font-extrabold py-4 rounded-2xl shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2 text-base"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" /> Processing Order...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" /> Pay ₹{pricing.totalRupees} via UPI
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
