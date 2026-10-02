'use client';

import React, { useState } from 'react';
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

export default function SwissGlassmorphismUiGallery() {
  const [copies, setCopies] = useState<number>(2);
  const [mode, setMode] = useState<string>('bw');
  const [numpadVal, setNumpadVal] = useState<string>('1-5');

  return (
    <main className="relative min-h-screen bg-bgBase text-ink p-8 space-y-12 selection:bg-signalCyan/20">
      {/* Background CMYK Blobs */}
      <div className="cmyk-blob-cyan" />
      <div className="cmyk-blob-magenta" />
      <div className="cmyk-blob-yellow" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        <header className="border-b border-ink/10 pb-6 space-y-2">
          <h1 className="text-kiosk-h1 font-black tracking-tight text-ink">Swiss Glassmorphism Design System</h1>
          <p className="text-kiosk-body text-ink2">Component Gallery & Token Showcase — PrintQ Self-Service System</p>
        </header>

        {/* 1. Surfaces */}
        <section className="space-y-4">
          <h2 className="text-kiosk-h2 font-bold text-ink">1. Glass Surfaces</h2>
          <div className="grid grid-cols-2 gap-6">
            <GlassPanel>
              <h3 className="text-kiosk-label font-bold text-ink mb-2">GlassPanel (glass-1)</h3>
              <p className="text-kiosk-small text-ink2">Main content container surface with 24px blur and inset highlight.</p>
            </GlassPanel>

            <GlassControl>
              <h3 className="text-kiosk-label font-bold text-ink mb-2">GlassControl (glass-2)</h3>
              <p className="text-kiosk-small text-ink2">Interactive control surface with 12px blur.</p>
            </GlassControl>
          </div>
        </section>

        {/* 2. Buttons */}
        <section className="space-y-4">
          <h2 className="text-kiosk-h2 font-bold text-ink">2. Buttons (All Variants & States)</h2>
          <GlassPanel className="space-y-6">
            <div className="space-y-3">
              <span className="text-kiosk-small font-bold text-ink3 uppercase">Kiosk Primary Button (112px tall, Full Width)</span>
              <Button variant="primary" size="kiosk">
                Continue to Payment →
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-ink/10">
              <Button variant="primary" size="md">Primary Button</Button>
              <Button variant="secondary" size="md">Secondary Button</Button>
              <Button variant="ghost" size="md">Ghost Button</Button>
              <Button variant="destructive" size="md">Destructive Button</Button>
              <Button variant="primary" size="md" disabled>Disabled State</Button>
              <Button variant="primary" size="md" loading>Loading State</Button>
            </div>
          </GlassPanel>
        </section>

        {/* 3. Controls & Steppers */}
        <section className="space-y-4">
          <h2 className="text-kiosk-h2 font-bold text-ink">3. Touch Controls & Steppers</h2>
          <div className="grid grid-cols-2 gap-6">
            <GlassPanel className="space-y-6">
              <span className="text-kiosk-small font-bold text-ink3 uppercase">Segmented Control</span>
              <SegmentedControl
                options={[
                  { label: 'Black & White', value: 'bw' },
                  { label: 'Colour', value: 'colour' },
                ]}
                value={mode}
                onChange={setMode}
              />

              <span className="text-kiosk-small font-bold text-ink3 uppercase block pt-4">Stepper (88px Touch Targets)</span>
              <Stepper value={copies} onChange={setCopies} />
            </GlassPanel>

            <GlassPanel className="space-y-4">
              <span className="text-kiosk-small font-bold text-ink3 uppercase">Number Pad (Page Range 96px Keys)</span>
              <NumberPad value={numpadVal} onChange={setNumpadVal} />
            </GlassPanel>
          </div>
        </section>

        {/* 4. QR Card & Ring */}
        <section className="space-y-4">
          <h2 className="text-kiosk-h2 font-bold text-ink">4. QR Card with 4px Countdown Ring</h2>
          <GlassPanel className="flex justify-center py-10">
            <QRCard
              qrDataUrl=""
              shortCode="K7P-2QX"
              countdownSeconds={60}
              maxSeconds={90}
            />
          </GlassPanel>
        </section>

        {/* 5. Progress & Status Pills */}
        <section className="space-y-4">
          <h2 className="text-kiosk-h2 font-bold text-ink">5. Status Indicators & Progress</h2>
          <GlassPanel className="space-y-6">
            <div className="flex flex-wrap gap-4 items-center">
              <StatusPill status="ok" />
              <StatusPill status="no_paper" />
              <StatusPill status="jam" />
              <StatusPill status="offline" />
            </div>

            <ProgressBar current={7} total={24} label="Kiosk Printing Progress" />
          </GlassPanel>
        </section>

        {/* 6. Toast Banners */}
        <section className="space-y-4">
          <h2 className="text-kiosk-h2 font-bold text-ink">6. Toast & Alert Banners</h2>
          <div className="space-y-4">
            <ToastBanner
              type="error"
              title="Not Enough Paper"
              message="This kiosk has 10 sheets remaining. Your job requires 24 sheets. Please reduce copies."
              actionLabel="Adjust Copies"
              onAction={() => {}}
            />
            <ToastBanner
              type="success"
              title="Payment Verified"
              message="Received ₹24 via UPI. Job queued for automatic printing."
            />
          </div>
        </section>

        {/* 7. PriceBar */}
        <section className="space-y-4">
          <h2 className="text-kiosk-h2 font-bold text-ink">7. Sticky PriceBar</h2>
          <PriceBar
            summary="12 pages × 2 copies · B&W · Front & back = ₹24"
            totalRupees="24.00"
            onContinue={() => {}}
          />
        </section>
      </div>
    </main>
  );
}
