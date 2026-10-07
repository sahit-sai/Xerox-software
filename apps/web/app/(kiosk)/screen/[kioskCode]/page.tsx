'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';
import {
  Printer, QrCode, AlertTriangle, CheckCircle2, RefreshCw, FileText,
  Smartphone, ArrowDown, CreditCard, ShieldCheck, ArrowLeft, Clock,
  ChevronRight, AlertCircle, XCircle, Eye, ZoomIn, ZoomOut, Maximize2, X, ChevronLeft, Sliders
} from 'lucide-react';
import { calculateJobPrice, calculateSheets, KioskState, SessionState } from '@printq/shared';
import { GlassPanel, GlassControl } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Stepper } from '@/components/ui/Stepper';
import { NumberPad } from '@/components/ui/NumberPad';
import { PriceBar } from '@/components/ui/PriceBar';
import { QRCard } from '@/components/ui/QRCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusPill } from '@/components/ui/StatusPill';
import { ToastBanner } from '@/components/ui/ToastBanner';
import { PageThumbnail } from '@/components/ui/PageThumbnail';
import { DocumentEditor, DocEditState } from '@/components/ui/DocumentEditor';

export default function TouchscreenKioskPage() {
  const params = useParams();
  const kioskCode = (params.kioskCode as string) || 'VISHNU01';

  // Kiosk Touchscreen State Machine (1 to 9)
  const [currentScreen, setCurrentScreen] = useState<number>(1);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [rawToken, setRawToken] = useState<string>('');
  const [shortCode, setShortCode] = useState<string>('K7P-2QX');
  const [countdown, setCountdown] = useState<number>(90);
  const [phoneConnected, setPhoneConnected] = useState<boolean>(false);

  // Kiosk Hardware & Paper State
  const [kiosk, setKiosk] = useState({
    id: '22222222-2222-2222-2222-222222222221',
    code: kioskCode,
    name: 'Vishnu Library Kiosk #1',
    location: 'Ground Floor, Central Library',
    paper_sheets: 450,
    toner_pct: 88.5,
    state: 'ok' as KioskState,
    rate_bw_paise: 200,
    rate_colour_paise: 1000,
    supports_colour: true,
    double_discount_pct: 10,
  });

  // Session & Job State
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    pages: number;
    size?: number;
    type?: string;
    previewUrl?: string;
  } | null>(null);

  // Live Document Preview State (Screen 3 & Fullscreen Modal)
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<number>(1);
  const [showFullscreenDocModal, setShowFullscreenDocModal] = useState<boolean>(false);
  const [docZoomLevel, setDocZoomLevel] = useState<number>(100);
  const [showDocEditor, setShowDocEditor] = useState<boolean>(false);
  const [docEditState, setDocEditState] = useState<DocEditState | null>(null);

  // Print Options State (Screen 4)
  const [copies, setCopies] = useState<number>(1);
  const [colour, setColour] = useState<boolean>(false);
  const [doubleSided, setDoubleSided] = useState<boolean>(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [pageRangeMode, setPageRangeMode] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<string>('');
  const [showNumpad, setShowNumpad] = useState<boolean>(false);

  // Payment & Printing Progress (Screen 6, 7, 8, 9)
  const [paymentQrDataUrl, setPaymentQrDataUrl] = useState<string>('');
  const [tokenNo, setTokenNo] = useState<string>('Token 07');
  const [printedPages, setPrintedPages] = useState<number>(1);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [printError, setPrintError] = useState<boolean>(false);

  // Global Overlays State
  const [showInactivityModal, setShowInactivityModal] = useState<boolean>(false);
  const [inactivityTimer, setInactivityTimer] = useState<number>(15);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  const totalPages = uploadedFile?.pages || 24;
  const effectiveSheets = calculateSheets(totalPages, copies, doubleSided);
  const pricing = calculateJobPrice(kiosk, {
    pages: totalPages,
    copies,
    colour,
    double_sided: doubleSided,
  });

  const isKioskOperational = kiosk.state === 'ok' && kiosk.paper_sheets > 0;
  const hasEnoughPaper = kiosk.paper_sheets >= effectiveSheets;

  // 1. Fetch Session and Generate One-Time QR
  const initSession = async () => {
    try {
      const res = await fetch(`/api/kiosk/${kioskCode}/session`);
      const data = await res.json();
      if (data.session) {
        setSessionId(data.session.id);
        setRawToken(data.rawToken);
        setShortCode(data.shortCode);
        setSessionState(data.session.state);

        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const targetUrl = `${origin}/s/${data.rawToken}`;
        const qrUrl = await QRCode.toDataURL(targetUrl, { width: 440, margin: 2 });
        setQrDataUrl(qrUrl);
        setCountdown(90);
        setPhoneConnected(false);
      }
    } catch (err) {
      console.error('Session creation error:', err);
    }
  };

  // Generate Real UPI Payment QR Code when entering Screen 6
  useEffect(() => {
    if (currentScreen !== 6) return;
    const generateUpiQr = async () => {
      const upiUrl = `upi://pay?pa=7842410691@ybl&pn=PrintQ%20Kiosk&tr=${sessionId || 'JOB_' + Date.now()}&tn=PrintQ%20Order&am=${pricing.totalRupees}&cu=INR`;
      try {
        const url = await QRCode.toDataURL(upiUrl, { width: 440, margin: 2 });
        setPaymentQrDataUrl(url);
      } catch (e) {
        console.error('UPI QR generation error:', e);
      }
    };
    generateUpiQr();
  }, [currentScreen, pricing.totalRupees, sessionId]);

  // Reset state & create a new session once printing completes
  const resetAndStartNewSession = () => {
    setUploadedFile(null);
    setCopies(1);
    setColour(false);
    setDoubleSided(false);
    setOrientation('portrait');
    setPageRangeMode('all');
    setCustomRange('');
    setPrintedPages(1);
    setPaymentSuccess(false);
    setPrintError(false);
    setPhoneConnected(false);
    setSessionId(null);
    setRawToken('');
    setQrDataUrl('');
    setCurrentScreen(1);
    initSession();
  };

  // Screen 2 Countdown timer (90s lifetime)
  useEffect(() => {
    if (currentScreen !== 2) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCurrentScreen(1);
          setSessionState('expired');
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentScreen]);

  // Real-time Session Polling for Screen 2 (Detect Phone Connected & Real File Upload)
  useEffect(() => {
    if (currentScreen !== 2 || !rawToken) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/status?token=${encodeURIComponent(rawToken)}`);
        const data = await res.json();
        if (data.session) {
          if (data.session.state === 'phone_connected') {
            setPhoneConnected(true);
          } else if (data.session.state === 'file_ready' && data.session.file) {
            setUploadedFile({
              name: data.session.file.name,
              pages: data.session.file.pages || 1,
              size: data.session.file.size,
              type: data.session.file.type,
              previewUrl: data.session.file.previewUrl,
            });
            setCurrentScreen(3); // Auto-advance to Preview Screen on real file upload!
          }
        }
      } catch (e) {}
    }, 1200);

    return () => clearInterval(pollInterval);
  }, [currentScreen, rawToken]);

  // Real-time Payment Polling for Screen 6 (Detect Payment Paid via Webhook / Phone / Razorpay API)
  useEffect(() => {
    if (currentScreen !== 6 || !rawToken) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/status?token=${encodeURIComponent(rawToken)}`);
        const data = await res.json();
        if (data.session && data.session.state === 'paid') {
          setPaymentSuccess(true);
          setTimeout(() => setCurrentScreen(7), 1000);
        }
      } catch (e) {}
    }, 1200);

    return () => clearInterval(pollInterval);
  }, [currentScreen, rawToken]);

  // Screen 7 Printing animation loop
  useEffect(() => {
    if (currentScreen !== 7) return;
    setPrintedPages(1);
    const interval = setInterval(() => {
      setPrintedPages((prev) => {
        if (prev >= totalPages) {
          clearInterval(interval);
          setTimeout(() => setCurrentScreen(8), 800);
          return totalPages;
        }
        return prev + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [currentScreen, totalPages]);

  // Screen 8 Collect countdown
  useEffect(() => {
    if (currentScreen !== 8) return;
    const timer = setTimeout(() => {
      setCurrentScreen(9);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentScreen]);

  // Screen 9 Thank You auto-return (Creates fresh session for next user)
  useEffect(() => {
    if (currentScreen !== 9) return;
    const timer = setTimeout(() => {
      resetAndStartNewSession();
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentScreen]);

  return (
    <main className="relative min-h-screen w-full bg-bgBase text-ink font-sans overflow-x-hidden flex flex-col justify-between selection:bg-signalCyan/20">
      {/* Background Drifting CMYK Blobs */}
      <div className="cmyk-blob-cyan" />
      <div className="cmyk-blob-magenta" />
      <div className="cmyk-blob-yellow" />

      {/* Top Header Bar */}
      <header className="relative z-20 w-full px-16 pt-12 pb-6 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center gap-3">
            <span className="text-kiosk-h2 font-black tracking-tighter text-ink">PrintQ</span>
            <span className="text-kiosk-small font-medium text-ink3 border-l border-ink/10 pl-3">{kiosk.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <StatusPill status={isKioskOperational ? (kiosk.paper_sheets < 20 ? 'no_paper' : 'ok') : 'offline'} />
          <button
            onClick={() => setIsReconnecting(!isReconnecting)}
            className="text-kiosk-small font-medium text-ink3 hover:text-ink transition"
          >
            {isReconnecting ? 'Simulating Reconnect...' : 'Status'}
          </button>
        </div>
      </header>

      {/* MAIN SCREEN AREA (Swiss Grid 12 Columns, Left-Anchored) */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-16 py-8 my-auto min-h-[750px] flex flex-col justify-center">

        {/* OUT OF SERVICE STATE */}
        {!isKioskOperational ? (
          <div className="col-span-12 space-y-6">
            <h1 className="text-kiosk-display text-error font-extrabold tracking-tight">Out of service</h1>
            <p className="text-kiosk-h1 text-ink2 font-semibold">Please use another PrintQ kiosk</p>
            <p className="text-kiosk-body text-ink3 max-w-2xl pt-4">
              This kiosk is currently offline or paper tray is empty. Operations staff have been notified.
            </p>
          </div>
        ) : (
          <>
            {/* SCREEN 1: IDLE / START SCREEN */}
            {currentScreen === 1 && (
              <div
                onClick={() => {
                  setCurrentScreen(2);
                  initSession();
                }}
                className="w-full cursor-pointer space-y-16 group select-none py-12"
              >
                <div className="space-y-6 max-w-4xl">
                  <h1 className="text-kiosk-display font-black tracking-tight text-ink group-hover:translate-x-2 transition-transform duration-240">
                    PrintQ
                  </h1>
                  <h2 className="text-kiosk-h1 font-bold text-ink2">
                    Touch to start printing
                  </h2>
                </div>

                <div className="pt-16 border-t border-ink/10 flex justify-between items-end">
                  <div className="space-y-1 text-kiosk-label text-ink2 font-medium">
                    <p className="text-ink font-semibold">Standard Rates</p>
                    <p>B&W ₹{(kiosk.rate_bw_paise / 100).toFixed(2)} · Colour ₹{(kiosk.rate_colour_paise / 100).toFixed(2)} / page</p>
                    <p className="text-kiosk-small text-ink3">10% discount applied automatically on front & back prints</p>
                  </div>

                  <div className="text-right">
                    <span className="text-kiosk-small text-ink3 font-mono block">Kiosk ID: {kioskCode}</span>
                    <span className="text-kiosk-label font-bold text-signalCyan">Touch Screen Anywhere →</span>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 2: SCAN QR TO UPLOAD */}
            {currentScreen === 2 && (
              <div className="grid grid-cols-12 gap-12 items-center">
                <div className="col-span-6 space-y-8">
                  <div className="space-y-4">
                    <h1 className="text-kiosk-h1 font-bold text-ink">Scan to upload your file</h1>
                    <p className="text-kiosk-body text-ink2 leading-relaxed">
                      Point your phone camera at the QR code on screen. No app required.
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-ink/10">
                    <p className="text-kiosk-label text-ink2">
                      Having trouble with camera? Go to <code className="font-mono text-ink font-bold bg-white/60 px-2 py-1 rounded-sm">printq.in/code</code> and enter:
                    </p>
                    <div className="text-kiosk-h2 font-mono font-black text-ink tracking-[0.08em] tabular-nums">
                      {shortCode}
                    </div>
                  </div>

                  {/* Simulator Trigger */}
                  <div className="pt-6 space-y-3">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        setPhoneConnected(true);
                        setTimeout(() => {
                          setUploadedFile({ name: 'Lab_Report_Final_v2.pdf', pages: 24 });
                          setCurrentScreen(3);
                        }, 1200);
                      }}
                    >
                      Simulate Phone Connection & Upload →
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setCurrentScreen(1)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>

                <div className="col-span-6 flex justify-center">
                  <GlassPanel className="p-10 flex flex-col items-center">
                    {phoneConnected ? (
                      <div className="py-16 text-center space-y-6">
                        <CheckCircle2 className="w-24 h-24 text-success mx-auto animate-bounce" />
                        <h2 className="text-kiosk-h1 font-bold text-ink">Phone connected</h2>
                        <p className="text-kiosk-body text-ink2 flex items-center justify-center gap-3">
                          <RefreshCw className="w-6 h-6 animate-spin text-signalCyan" /> Waiting for your file…
                        </p>
                      </div>
                    ) : (
                      <QRCard
                        qrDataUrl={qrDataUrl}
                        shortCode={shortCode}
                        countdownSeconds={countdown}
                        maxSeconds={90}
                        subtitle="QR code refreshes automatically for security"
                      />
                    )}
                  </GlassPanel>
                </div>
              </div>
            )}

            {/* SCREEN 3: PREVIEW */}
            {currentScreen === 3 && uploadedFile && (
              <div className="space-y-8">
                <div className="flex justify-between items-end border-b border-ink/10 pb-6">
                  <div className="space-y-1 max-w-3xl">
                    <span className="text-kiosk-label font-semibold text-signalCyan flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success" /> Document Received from Phone
                    </span>
                    <h1 className="text-kiosk-h1 font-bold text-ink truncate">{uploadedFile.name}</h1>
                  </div>
                  <div className="text-right">
                    <span className="text-kiosk-h2 font-bold text-ink tabular-nums">{uploadedFile.pages} pages</span>
                    {uploadedFile.size && (
                      <span className="text-kiosk-small font-mono text-ink3 block">
                        {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    )}
                  </div>
                </div>

                <GlassPanel className="p-8">
                  <div className="grid grid-cols-12 gap-8 items-center">
                    {/* Featured Document Preview Canvas */}
                    <div className="col-span-5 flex flex-col items-center space-y-4">
                      <div className="w-full max-w-[280px] aspect-[1/1.4] bg-white rounded-control shadow-2xl border border-ink/15 p-4 flex flex-col justify-between relative overflow-hidden group">
                        {uploadedFile.previewUrl ? (
                          uploadedFile.previewUrl.startsWith('data:image/') || uploadedFile.type?.includes('image') ? (
                            <img
                              src={uploadedFile.previewUrl}
                              alt={uploadedFile.name}
                              className="w-full h-full object-contain rounded-sm"
                            />
                          ) : (
                            <object
                              data={uploadedFile.previewUrl}
                              type="application/pdf"
                              className="w-full h-full rounded-sm overflow-hidden"
                            >
                              <iframe
                                src={uploadedFile.previewUrl}
                                title={uploadedFile.name}
                                className="w-full h-full border-0"
                              />
                            </object>
                          )
                        ) : (
                          <div className="w-full h-full flex flex-col justify-between py-2 text-ink">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between border-b border-ink/10 pb-2">
                                <span className="text-[11px] font-black tracking-wider text-ink uppercase truncate">
                                  {uploadedFile.name}
                                </span>
                                <span className="text-[9px] bg-ink/10 px-2 py-0.5 rounded text-ink font-bold">
                                  {uploadedFile.type?.includes('image') ? 'IMAGE' : 'PDF'}
                                </span>
                              </div>
                              <div className="w-3/4 h-2.5 bg-ink/25 rounded-pill" />
                              <div className="w-full h-2 bg-ink/10 rounded-pill" />
                              <div className="w-5/6 h-2 bg-ink/10 rounded-pill" />
                              <div className="w-4/5 h-2 bg-ink/10 rounded-pill" />
                              <div className="w-11/12 h-2 bg-ink/10 rounded-pill" />
                            </div>

                            <div className="my-auto py-4 text-center">
                              <FileText className="w-16 h-16 text-signalCyan mx-auto opacity-80" />
                              <p className="text-[12px] font-bold text-ink2 mt-2">Ready to Print</p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-ink/10">
                              <div className="w-full h-2 bg-ink/10 rounded-pill" />
                              <div className="w-2/3 h-2 bg-ink/10 rounded-pill" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* View Live Fullscreen Document Button */}
                      <button
                        onClick={() => setShowFullscreenDocModal(true)}
                        className="w-full max-w-[280px] glass-2 hover:bg-white/90 border border-ink/15 text-ink font-bold py-2.5 px-4 rounded-control shadow-sm transition flex items-center justify-center gap-2 text-[14px]"
                      >
                        <Eye className="w-4 h-4 text-signalCyan" /> View Full Document Live
                      </button>
                    </div>

                    {/* Page Thumbnail Grid */}
                    <div className="col-span-7 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-kiosk-label font-bold text-ink block">Page Thumbnails ({uploadedFile.pages})</span>
                        <span className="text-kiosk-small font-semibold text-signalCyan">Tap thumbnail to select page</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 max-h-[380px] overflow-y-auto pr-2">
                        {Array.from({ length: Math.min(12, uploadedFile.pages) }).map((_, idx) => (
                          <PageThumbnail
                            key={idx}
                            pageNumber={idx + 1}
                            totalPages={uploadedFile.pages}
                            isSelected={selectedPreviewPage === idx + 1}
                            previewUrl={uploadedFile.previewUrl}
                            fileName={uploadedFile.name}
                            onClick={() => {
                              setSelectedPreviewPage(idx + 1);
                              setShowFullscreenDocModal(true);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setCurrentScreen(2)}
                  >
                    Upload a different file
                  </Button>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setShowDocEditor(true)}
                    >
                      <Sliders className="w-5 h-5 text-signalCyan" /> Edit & Crop Document
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      onClick={() => setShowFullscreenDocModal(true)}
                    >
                      <Eye className="w-5 h-5 text-signalCyan" /> Inspect Live Document
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => setCurrentScreen(4)}
                    >
                      Looks good, continue →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* SCREEN 4: OPTIONS */}
            {currentScreen === 4 && (
              <div className="space-y-8">
                <div className="space-y-1">
                  <h1 className="text-kiosk-h1 font-bold text-ink">Print options</h1>
                  <p className="text-kiosk-body text-ink2">Select pages, copies and color preferences</p>
                </div>

                {!hasEnoughPaper && (
                  <ToastBanner
                    type="warning"
                    title="Low Paper Warning"
                    message={`This kiosk has ${kiosk.paper_sheets} sheets remaining. Your current selection requires ${effectiveSheets} sheets.`}
                  />
                )}

                <GlassPanel className="p-0 divide-y divide-ink/8">
                  {/* Row 1: Pages */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-kiosk-label font-bold text-ink block">Pages to print</span>
                      <span className="text-kiosk-small text-ink2">All pages ({totalPages}) or custom range</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <SegmentedControl
                        options={[
                          { label: 'All pages', value: 'all' },
                          { label: 'Custom range', value: 'custom' },
                        ]}
                        value={pageRangeMode}
                        onChange={(val) => {
                          setPageRangeMode(val);
                          if (val === 'custom') setShowNumpad(true);
                        }}
                      />
                    </div>
                  </div>

                  {/* Custom Range Numpad Panel */}
                  {pageRangeMode === 'custom' && showNumpad && (
                    <div className="p-6 bg-white/40 border-b border-ink/8">
                      <NumberPad
                        value={customRange}
                        onChange={setCustomRange}
                        onConfirm={() => setShowNumpad(false)}
                      />
                    </div>
                  )}

                  {/* Row 2: Copies */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-kiosk-label font-bold text-ink block">Copies</span>
                      <span className="text-kiosk-small text-ink2">Number of complete sets</span>
                    </div>
                    <Stepper value={copies} onChange={setCopies} min={1} max={20} />
                  </div>

                  {/* Row 3: Print Type */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-kiosk-label font-bold text-ink block">Print type</span>
                      <span className="text-kiosk-small text-ink2">Standard B&W or Vivid Colour</span>
                    </div>
                    <SegmentedControl
                      options={[
                        { label: 'Black & white', value: false },
                        { label: 'Colour', value: true },
                      ]}
                      value={colour}
                      onChange={setColour}
                    />
                  </div>

                  {/* Row 4: Sides */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-kiosk-label font-bold text-ink block">Sides</span>
                      <span className="text-kiosk-small text-ink2">Front only or double-sided (10% off)</span>
                    </div>
                    <SegmentedControl
                      options={[
                        { label: 'Front only', value: false },
                        { label: 'Front & back', value: true },
                      ]}
                      value={doubleSided}
                      onChange={setDoubleSided}
                    />
                  </div>

                  {/* Row 5: Orientation */}
                  <div className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-kiosk-label font-bold text-ink block">Orientation</span>
                      <span className="text-kiosk-small text-ink2">Page layout direction</span>
                    </div>
                    <SegmentedControl
                      options={[
                        { label: 'Portrait', value: 'portrait' },
                        { label: 'Landscape', value: 'landscape' },
                      ]}
                      value={orientation}
                      onChange={setOrientation}
                    />
                  </div>
                </GlassPanel>

                <PriceBar
                  summary={`${totalPages} pages × ${copies} copies · ${colour ? 'Colour' : 'B&W'} · ${doubleSided ? 'Front & back' : 'Front only'}`}
                  totalRupees={pricing.totalRupees}
                  disabled={!hasEnoughPaper}
                  continueLabel="Continue to review"
                  onContinue={() => setCurrentScreen(5)}
                />
              </div>
            )}

            {/* SCREEN 5: REVIEW */}
            {currentScreen === 5 && (
              <div className="space-y-10">
                <div className="space-y-2">
                  <h1 className="text-kiosk-h1 font-bold text-ink">Review order</h1>
                  <p className="text-kiosk-body text-ink2">Confirm details before payment</p>
                </div>

                <GlassPanel className="p-10 space-y-8">
                  <div className="grid grid-cols-2 gap-12">
                    <div className="space-y-6">
                      <div>
                        <span className="text-kiosk-small font-semibold text-ink2 block uppercase tracking-wider">Document</span>
                        <p className="text-kiosk-h2 font-bold text-ink truncate">{uploadedFile?.name}</p>
                      </div>

                      <div>
                        <span className="text-kiosk-small font-semibold text-ink2 block uppercase tracking-wider">Pages & Sets</span>
                        <p className="text-kiosk-body font-medium text-ink">{totalPages} pages × {copies} copies ({effectiveSheets} sheets)</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <span className="text-kiosk-small font-semibold text-ink2 block uppercase tracking-wider">Format</span>
                        <p className="text-kiosk-body font-medium text-ink">
                          {colour ? 'Colour' : 'Black & white'} · {doubleSided ? 'Front & back (10% off)' : 'Front only'} · {orientation}
                        </p>
                      </div>

                      <div>
                        <span className="text-kiosk-small font-semibold text-ink2 block uppercase tracking-wider">Total Payable</span>
                        <p className="text-kiosk-display font-black text-ink tabular-nums">₹{pricing.totalRupees}</p>
                      </div>
                    </div>
                  </div>
                </GlassPanel>

                <div className="flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={() => setCurrentScreen(4)}
                  >
                    Edit options
                  </Button>

                  <Button
                    variant="primary"
                    size="kiosk"
                    className="max-w-xl"
                    onClick={() => setCurrentScreen(6)}
                  >
                    Pay ₹{pricing.totalRupees} →
                  </Button>
                </div>
              </div>
            )}

            {/* SCREEN 6: PAYMENT */}
            {currentScreen === 6 && (
              <div className="grid grid-cols-12 gap-12 items-center">
                <div className="col-span-6 space-y-8">
                  <div className="space-y-2">
                    <h1 className="text-kiosk-h1 font-bold text-ink tabular-nums">Pay ₹{pricing.totalRupees}</h1>
                    <p className="text-kiosk-body text-ink2">Scan QR code using any UPI payment app</p>
                  </div>

                  {/* UPI App Icons Row */}
                  <div className="flex items-center gap-6 pt-4 border-t border-ink/10">
                    {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                      <div key={app} className="glass-2 px-4 py-3 rounded-control text-kiosk-label font-bold text-ink3 border border-ink/8">
                        {app}
                      </div>
                    ))}
                  </div>

                  <p className="text-kiosk-label font-medium text-ink2">Or tap Pay on your phone</p>

                  <div className="pt-4">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => {
                        setPaymentSuccess(true);
                        setTimeout(() => setCurrentScreen(7), 1000);
                      }}
                    >
                      Simulate Successful Payment →
                    </Button>
                  </div>
                </div>

                <div className="col-span-6 flex justify-center">
                  <GlassPanel className="p-10">
                    {paymentSuccess ? (
                      <div className="py-20 text-center space-y-6">
                        <CheckCircle2 className="w-24 h-24 text-success mx-auto animate-bounce" />
                        <h2 className="text-kiosk-h1 font-bold text-ink">Payment received</h2>
                        <p className="text-kiosk-body text-ink2">Starting print job...</p>
                      </div>
                    ) : (
                      <QRCard
                        qrDataUrl={paymentQrDataUrl || qrDataUrl}
                        shortCode="7842410691@ybl"
                        label="UPI VPA ID"
                        countdownSeconds={countdown}
                        maxSeconds={90}
                        subtitle="Scan with PhonePe, Google Pay, Paytm or BHIM"
                      />
                    )}
                  </GlassPanel>
                </div>
              </div>
            )}

            {/* SCREEN 7: PRINTING */}
            {currentScreen === 7 && (
              <div className="max-w-4xl mx-auto space-y-12">
                {printError ? (
                  <GlassPanel className="p-12 space-y-6 border-l-error border-l-[8px]">
                    <ToastBanner
                      type="error"
                      title="Printer Error"
                      message="Paper jam detected in tray 1. Your payment of ₹24.00 will be refunded automatically."
                    />
                    <h2 className="text-kiosk-h2 font-bold text-ink">Full refund initiated to your UPI account</h2>
                    <Button variant="primary" size="lg" onClick={() => setCurrentScreen(1)}>
                      Return to Main Screen
                    </Button>
                  </GlassPanel>
                ) : (
                  <GlassPanel className="p-12 space-y-10 text-left relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <span className="text-kiosk-label font-bold text-signalCyan block">Printing in progress</span>
                        <h1 className="text-kiosk-display font-black text-ink">{tokenNo}</h1>
                      </div>
                      <RefreshCw className="w-12 h-12 text-signalCyan animate-spin" />
                    </div>

                    {/* Signature Animation: Minimal Sheet Sliding Down */}
                    <div className="relative h-48 bg-white/40 rounded-control border border-ink/8 overflow-hidden flex items-center justify-center">
                      <div className="w-32 h-40 bg-white rounded-sm shadow-md border border-ink/10 animate-bounce flex flex-col justify-between p-3">
                        <div className="w-full h-2 bg-ink/20 rounded-pill" />
                        <FileText className="w-8 h-8 text-ink/20 mx-auto" />
                        <div className="w-2/3 h-2 bg-ink/20 rounded-pill" />
                      </div>
                    </div>

                    <ProgressBar
                      current={printedPages}
                      total={totalPages}
                      label="Pages printed"
                    />

                    <p className="text-kiosk-body font-medium text-ink2 pt-4">
                      Please wait, don't take pages yet
                    </p>
                  </GlassPanel>
                )}
              </div>
            )}

            {/* SCREEN 8: COLLECT PRINTS */}
            {currentScreen === 8 && (
              <div className="max-w-4xl mx-auto text-left space-y-12 py-8">
                <div className="space-y-6">
                  <ArrowDown className="w-32 h-32 text-ink animate-bounce" />
                  <h1 className="text-kiosk-display font-black text-ink">Collect your prints below</h1>
                  <p className="text-kiosk-h1 font-bold text-ink2">{totalPages} pages printed</p>
                </div>

                <div className="pt-8 border-t border-ink/10 flex items-center justify-between">
                  <span className="text-kiosk-label text-ink3">Returning to home screen in 5 seconds...</span>
                  <Button variant="primary" size="lg" onClick={() => setCurrentScreen(9)}>
                    Done →
                  </Button>
                </div>
              </div>
            )}

            {/* SCREEN 9: THANK YOU */}
            {currentScreen === 9 && (
              <div className="max-w-4xl mx-auto space-y-8 py-16 text-center">
                <h1 className="text-kiosk-display font-black text-ink">PrintQ</h1>
                <h2 className="text-kiosk-h1 font-bold text-ink2">Thank you</h2>
                <p className="text-kiosk-body text-ink3">Your print job is complete</p>

                {/* Progress auto-return line */}
                <div className="w-full h-2 bg-ink/10 rounded-pill overflow-hidden mt-8 max-w-lg mx-auto">
                  <div className="h-full bg-ink animate-[pulse_5s_linear_infinite]" />
                </div>

                <div className="pt-6">
                  <Button variant="primary" size="lg" className="mx-auto" onClick={resetAndStartNewSession}>
                    Start New Print Session →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* GLOBAL KIOSK OVERLAYS */}
      {/* 0. Document Editor Modal (Rotate, Crop, Filters) */}
      {showDocEditor && uploadedFile && (
        <DocumentEditor
          fileName={uploadedFile.name}
          totalPages={uploadedFile.pages}
          previewUrl={uploadedFile.previewUrl}
          fileType={uploadedFile.type}
          onClose={() => setShowDocEditor(false)}
          onSave={(editedState) => {
            setDocEditState(editedState);
            setShowDocEditor(false);
          }}
        />
      )}

      {/* 1. Live Document Inspection Modal */}
      {showFullscreenDocModal && uploadedFile && (
        <div className="fixed inset-0 z-50 glass-1 backdrop-blur-2xl flex items-center justify-center p-6 bg-slate-950/80">
          <div className="max-w-5xl w-full h-[90vh] bg-white rounded-control shadow-2xl border border-ink/20 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-ink/10 flex items-center justify-between bg-bgBase">
              <div className="flex items-center gap-3 truncate">
                <FileText className="w-6 h-6 text-signalCyan shrink-0" />
                <div>
                  <h3 className="text-kiosk-h2 font-bold text-ink truncate">{uploadedFile.name}</h3>
                  <span className="text-kiosk-small font-semibold text-ink2">
                    Page {selectedPreviewPage} of {totalPages} · Live Preview
                  </span>
                </div>
              </div>

              {/* Zoom & Navigation Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center glass-2 px-3 py-1.5 rounded-control border border-ink/10 gap-2">
                  <button
                    onClick={() => setDocZoomLevel((z) => Math.max(50, z - 25))}
                    className="p-1 text-ink hover:text-signalCyan font-bold"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-kiosk-small font-mono font-bold text-ink min-w-[45px] text-center">
                    {docZoomLevel}%
                  </span>
                  <button
                    onClick={() => setDocZoomLevel((z) => Math.min(200, z + 25))}
                    className="p-1 text-ink hover:text-signalCyan font-bold"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={selectedPreviewPage <= 1}
                    onClick={() => setSelectedPreviewPage((p) => Math.max(1, p - 1))}
                    className="glass-2 disabled:opacity-30 p-2 rounded-control text-ink border border-ink/10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-kiosk-label font-bold text-ink tabular-nums">
                    {selectedPreviewPage} / {totalPages}
                  </span>
                  <button
                    disabled={selectedPreviewPage >= totalPages}
                    onClick={() => setSelectedPreviewPage((p) => Math.min(totalPages, p + 1))}
                    className="glass-2 disabled:opacity-30 p-2 rounded-control text-ink border border-ink/10"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={() => setShowFullscreenDocModal(false)}
                  className="p-2.5 rounded-full hover:bg-ink/10 text-ink transition ml-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Renderer */}
            <div className="flex-1 bg-ink/5 p-8 overflow-auto flex items-center justify-center relative">
              <div
                className="transition-all duration-200 shadow-2xl rounded bg-white overflow-hidden max-w-full"
                style={{ transform: `scale(${docZoomLevel / 100})`, transformOrigin: 'center center' }}
              >
                {uploadedFile.previewUrl ? (
                  uploadedFile.previewUrl.startsWith('data:image/') || uploadedFile.type?.includes('image') ? (
                    <img
                      src={uploadedFile.previewUrl}
                      alt={uploadedFile.name}
                      className="max-h-[70vh] object-contain mx-auto"
                    />
                  ) : (
                    <object
                      data={uploadedFile.previewUrl}
                      type="application/pdf"
                      className="w-[700px] h-[75vh]"
                    >
                      <iframe
                        src={uploadedFile.previewUrl}
                        title={uploadedFile.name}
                        className="w-[700px] h-[75vh] border-0"
                      />
                    </object>
                  )
                ) : (
                  <div className="w-[600px] h-[75vh] bg-white p-12 flex flex-col justify-between text-ink border border-ink/10">
                    <div className="space-y-4">
                      <div className="flex justify-between border-b pb-3">
                        <span className="font-mono text-sm font-bold">{uploadedFile.name}</span>
                        <span className="text-xs bg-ink/10 px-2 py-1 font-bold rounded">PAGE {selectedPreviewPage}</span>
                      </div>
                      <div className="w-3/4 h-3 bg-ink/20 rounded-pill" />
                      <div className="w-full h-2.5 bg-ink/10 rounded-pill" />
                      <div className="w-5/6 h-2.5 bg-ink/10 rounded-pill" />
                      <div className="w-4/5 h-2.5 bg-ink/10 rounded-pill" />
                    </div>
                    <div className="my-auto text-center">
                      <FileText className="w-24 h-24 text-signalCyan mx-auto opacity-70" />
                      <p className="font-bold text-ink2 mt-3 text-lg">Live Printed Preview Page {selectedPreviewPage}</p>
                    </div>
                    <div className="space-y-2 border-t pt-4">
                      <div className="w-full h-2 bg-ink/10 rounded-pill" />
                      <div className="w-2/3 h-2 bg-ink/10 rounded-pill" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-4 bg-bgBase border-t border-ink/10 flex items-center justify-between">
              <span className="text-kiosk-small text-ink2">
                Tip: Tap thumbnails or use arrow keys to navigate document pages
              </span>
              <Button variant="primary" size="md" onClick={() => setShowFullscreenDocModal(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Inactivity Modal */}
      {showInactivityModal && (
        <div className="fixed inset-0 z-50 glass-1 backdrop-blur-2xl flex items-center justify-center p-8">
          <GlassPanel className="max-w-xl w-full p-10 space-y-8 text-center bg-white/90 shadow-2xl border-2 border-ink">
            <AlertCircle className="w-16 h-16 text-warning mx-auto" />
            <div className="space-y-2">
              <h2 className="text-kiosk-h1 font-bold text-ink">Are you still there?</h2>
              <p className="text-kiosk-body text-ink2">Session will expire in {inactivityTimer} seconds</p>
            </div>
            <Button
              variant="primary"
              size="kiosk"
              onClick={() => setShowInactivityModal(false)}
            >
              Yes, continue
            </Button>
          </GlassPanel>
        </div>
      )}

      {/* 3. Reconnecting Overlay */}
      {isReconnecting && (
        <div className="fixed inset-0 z-50 glass-1 backdrop-blur-3xl flex items-center justify-center p-8 bg-bgBase/80">
          <div className="text-center space-y-6 max-w-lg">
            <RefreshCw className="w-16 h-16 text-ink animate-spin mx-auto" />
            <h2 className="text-kiosk-h1 font-bold text-ink">Reconnecting…</h2>
            <p className="text-kiosk-body text-ink2">Re-establishing connection with PrintQ server</p>
          </div>
        </div>
      )}
    </main>
  );
}
