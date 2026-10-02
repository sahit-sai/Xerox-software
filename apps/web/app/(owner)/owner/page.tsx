'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer, LayoutGrid, FileText, RotateCcw, Settings, Moon, Sun,
  Plus, RefreshCw, Fuel, ArrowUpRight, Search, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { calculateOwnerProfit } from '@printq/shared';
import { GlassPanel, GlassControl } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { StatusPill } from '@/components/ui/StatusPill';

interface Kiosk {
  id: string;
  code: string;
  name: string;
  location: string;
  supports_colour: boolean;
  paper_sheets: number;
  paper_capacity: number;
  toner_pct: number;
  state: 'ok' | 'jam' | 'offline' | 'no_paper' | 'disabled';
  rate_bw: number;
  rate_colour: number;
  earnings_today: number;
}

interface JobItem {
  id: string;
  token: number;
  kiosk_code: string;
  customer_phone: string;
  file_name: string;
  pages: number;
  sheets: number;
  amount_paise: number;
  status: 'awaiting_payment' | 'queued' | 'printing' | 'done' | 'failed' | 'refunded';
  created_at: string;
}

export default function OwnerDashboardPage() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'kiosks' | 'jobs' | 'refunds' | 'settings'>('kiosks');
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    // Initial data fetch
    fetch('/api/owner/kiosks')
      .then((res) => res.json())
      .then((data) => {
        if (data.kiosks) {
          setKiosks(
            data.kiosks.map((k: any) => ({
              ...k,
              earnings_today: k.earnings_today || 1240,
            }))
          );
        }
      })
      .catch(() => {});

    setJobs([
      {
        id: 'job-101',
        token: 7,
        kiosk_code: 'VISHNU01',
        customer_phone: '+91 98765 43210',
        file_name: 'Library_Assignment_V1.pdf',
        pages: 24,
        sheets: 12,
        amount_paise: 2400,
        status: 'queued',
        created_at: new Date().toISOString(),
      },
      {
        id: 'job-100',
        token: 6,
        kiosk_code: 'HOSTELA1',
        customer_phone: '+91 91234 56789',
        file_name: 'Resume_2026.pdf',
        pages: 2,
        sheets: 1,
        amount_paise: 400,
        status: 'done',
        created_at: new Date(Date.now() - 15 * 60000).toISOString(),
      },
      {
        id: 'job-99',
        token: 5,
        kiosk_code: 'DWARAKA1',
        customer_phone: '+91 99887 76655',
        file_name: 'Ticket_Booking.pdf',
        pages: 1,
        sheets: 1,
        amount_paise: 200,
        status: 'failed',
        created_at: new Date(Date.now() - 45 * 60000).toISOString(),
      },
    ]);
  }, []);

  const totalEarningsPaise = jobs
    .filter((j) => j.status === 'done' || j.status === 'queued' || j.status === 'printing')
    .reduce((acc, j) => acc + j.amount_paise, 0);

  const totalSheetsPrinted = jobs
    .filter((j) => j.status === 'done' || j.status === 'printing')
    .reduce((acc, j) => acc + j.sheets, 0);

  const profitStats = calculateOwnerProfit(totalSheetsPrinted, 0, totalEarningsPaise);

  const filteredJobs = jobs.filter((j) => {
    const matchesStatus = statusFilter === 'all' ? true : j.status === statusFilter;
    const matchesSearch =
      j.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.kiosk_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.customer_phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const handleRefill = (kioskId: string) => {
    setKiosks((prev) =>
      prev.map((k) => (k.id === kioskId ? { ...k, paper_sheets: k.paper_capacity, state: 'ok' } : k))
    );
  };

  const handleRefund = async (jobId: string) => {
    if (!confirm('Refund this print job via Razorpay UPI?')) return;
    try {
      await fetch('/api/owner/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, reason: 'Owner manual refund' }),
      });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: 'refunded' } : j))
      );
    } catch (err) {}
  };

  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'dark bg-bgBase text-ink' : 'bg-bgBase text-ink'}`}>
      <div className="flex min-h-screen">
        {/* LEFT SIDEBAR (240px) */}
        <aside className="w-60 glass-1 border-r border-ink/10 flex flex-col justify-between p-6 shrink-0 sticky top-0 h-screen z-30">
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h1 className="text-kiosk-h2 font-black tracking-tight text-ink">PrintQ</h1>
                <span className="text-dashboard-small text-ink3 font-medium block">Owner Dashboard</span>
              </div>
            </div>

            {/* Nav List */}
            <nav className="space-y-1">
              {[
                { id: 'kiosks', label: 'Kiosks', icon: <LayoutGrid className="w-4 h-4" /> },
                { id: 'jobs', label: 'Jobs', icon: <FileText className="w-4 h-4" /> },
                { id: 'refunds', label: 'Refunds', icon: <RotateCcw className="w-4 h-4" /> },
                { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-control text-dashboard-body font-semibold transition touch-active ${
                    activeTab === item.id
                      ? 'bg-ink text-white shadow-md'
                      : 'text-ink2 hover:bg-white/40 hover:text-ink'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Dark Mode Toggle */}
          <div className="pt-6 border-t border-ink/10">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-full flex items-center justify-between p-3 glass-2 rounded-control text-dashboard-small font-semibold text-ink hover:bg-white/60 transition"
            >
              <span className="flex items-center gap-2">
                {darkMode ? <Moon className="w-4 h-4 text-signalCyan" /> : <Sun className="w-4 h-4 text-warning" />}
                <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
              </span>
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA (12-col grid) */}
        <main className="flex-1 p-10 max-w-7xl mx-auto space-y-10">

          {/* TOP STATS ROW (4 Typographic stats with hairline dividers - no boxes) */}
          <section className="grid grid-cols-4 divide-x divide-ink/10 border-b border-ink/10 pb-8">
            <div className="pr-6 space-y-1">
              <span className="text-dashboard-small font-medium text-ink2 block uppercase tracking-wider">Today's Revenue</span>
              <span className="text-[40px] leading-tight font-black text-ink tabular-nums">
                ₹{(totalEarningsPaise / 100).toFixed(2)}
              </span>
            </div>

            <div className="px-6 space-y-1">
              <span className="text-dashboard-small font-medium text-ink2 block uppercase tracking-wider">Est. Net Profit</span>
              <span className="text-[40px] leading-tight font-black text-signalCyan tabular-nums">
                ₹{profitStats.profitRupees}
              </span>
            </div>

            <div className="px-6 space-y-1">
              <span className="text-dashboard-small font-medium text-ink2 block uppercase tracking-wider">Sheets Printed</span>
              <span className="text-[40px] leading-tight font-black text-ink tabular-nums">
                {totalSheetsPrinted}
              </span>
            </div>

            <div className="pl-6 space-y-1">
              <span className="text-dashboard-small font-medium text-ink2 block uppercase tracking-wider">Operational Kiosks</span>
              <span className="text-[40px] leading-tight font-black text-ink tabular-nums">
                {kiosks.filter((k) => k.state === 'ok').length} / {kiosks.length}
              </span>
            </div>
          </section>

          {/* TAB 1: KIOSKS FLEET CARDS */}
          {activeTab === 'kiosks' && (
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-dashboard-h2 font-bold text-ink">Fleet Kiosks</h2>
                <Button variant="primary" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Kiosk
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {kiosks.map((kiosk) => {
                  const paperPct = Math.round((kiosk.paper_sheets / kiosk.paper_capacity) * 100);
                  return (
                    <GlassPanel key={kiosk.id} className="p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <h3 className="text-dashboard-h2 font-bold text-ink">{kiosk.name}</h3>
                          <p className="text-dashboard-small text-ink2">{kiosk.location}</p>
                          <span className="text-dashboard-small font-mono text-ink3">{kiosk.code}</span>
                        </div>
                        <StatusPill status={kiosk.state} />
                      </div>

                      {/* Paper & Toner Thin Bars */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-dashboard-small font-medium text-ink">
                            <span>Paper</span>
                            <span className="tabular-nums">{kiosk.paper_sheets} / {kiosk.paper_capacity} sheets</span>
                          </div>
                          <div className="w-full h-1.5 bg-ink/10 glass-2 rounded-pill overflow-hidden">
                            <div
                              className={`h-full rounded-pill ${paperPct < 20 ? 'bg-error' : 'bg-signalCyan'}`}
                              style={{ width: `${paperPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-dashboard-small font-medium text-ink">
                            <span>Toner</span>
                            <span className="tabular-nums">{kiosk.toner_pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-ink/10 glass-2 rounded-pill overflow-hidden">
                            <div
                              className="h-full bg-success rounded-pill"
                              style={{ width: `${kiosk.toner_pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Today's Earnings Tabular */}
                      <div className="pt-4 border-t border-ink/8 flex justify-between items-baseline">
                        <span className="text-dashboard-small font-medium text-ink2">Today's earnings</span>
                        <span className="text-dashboard-h2 font-bold text-ink tabular-nums">
                          ₹{(kiosk.earnings_today / 100).toFixed(2)}
                        </span>
                      </div>

                      {/* Quick Actions (Ghost Buttons) */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-dashboard-small"
                          onClick={() => handleRefill(kiosk.id)}
                        >
                          Refill paper
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1 text-dashboard-small"
                        >
                          Settings
                        </Button>
                      </div>
                    </GlassPanel>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB 2 & 3: JOBS & REFUNDS TABLE (Solid Surface for Readability) */}
          {(activeTab === 'jobs' || activeTab === 'refunds') && (
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-dashboard-h2 font-bold text-ink">
                  {activeTab === 'refunds' ? 'Refund Requests & Log' : 'Print Jobs'}
                </h2>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-ink3 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search jobs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white/70 border border-ink/10 rounded-control text-dashboard-body text-ink focus:outline-none focus:ring-2 focus:ring-signalCyan"
                    />
                  </div>

                  <div className="flex gap-1.5 glass-2 p-1 rounded-control">
                    {['all', 'queued', 'done', 'failed', 'refunded'].map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1 text-dashboard-small font-semibold rounded-control capitalize transition ${
                          statusFilter === st ? 'bg-ink text-white' : 'text-ink2 hover:text-ink'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dense Table (Solid Surface, 52px rows, Hairline Separators) */}
              <div className="bg-white rounded-panel border border-ink/10 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-bgBase border-b border-ink/10 sticky top-0 z-10">
                    <tr className="text-dashboard-small font-bold text-ink2 uppercase tracking-wider h-[44px]">
                      <th className="px-6">Token</th>
                      <th className="px-6">Kiosk</th>
                      <th className="px-6">Phone</th>
                      <th className="px-6">Document</th>
                      <th className="px-6">Pages / Sheets</th>
                      <th className="px-6 text-right">Amount</th>
                      <th className="px-6">Status</th>
                      <th className="px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/8 text-dashboard-body text-ink">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="h-[52px] hover:bg-bgBase/50 transition">
                        <td className="px-6 font-bold tabular-nums">#{String(job.token).padStart(2, '0')}</td>
                        <td className="px-6 font-mono text-dashboard-small text-ink2">{job.kiosk_code}</td>
                        <td className="px-6 font-medium text-ink2">{job.customer_phone}</td>
                        <td className="px-6 font-medium max-w-xs truncate">{job.file_name}</td>
                        <td className="px-6 font-medium text-ink2 tabular-nums">{job.pages}p / {job.sheets}s</td>
                        <td className="px-6 text-right font-bold tabular-nums">₹{(job.amount_paise / 100).toFixed(2)}</td>
                        <td className="px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-dashboard-small font-semibold border ${
                            job.status === 'done' ? 'bg-success/10 text-success border-success/30' :
                            job.status === 'queued' ? 'bg-warning/10 text-warning border-warning/30' :
                            'bg-error/10 text-error border-error/30'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="px-6 text-right">
                          {job.status !== 'refunded' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-error text-dashboard-small h-8 px-3"
                              onClick={() => handleRefund(job.id)}
                            >
                              Refund
                            </Button>
                          ) : (
                            <span className="text-dashboard-small text-ink3 italic">Refunded</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <GlassPanel className="p-8 max-w-2xl space-y-6">
              <h2 className="text-dashboard-h2 font-bold text-ink">Fleet Settings</h2>
              <div className="space-y-4 text-dashboard-body">
                <div className="flex justify-between items-center py-3 border-b border-ink/8">
                  <span>Default B&W Rate</span>
                  <span className="font-bold tabular-nums">₹2.00 / page</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-ink/8">
                  <span>Default Colour Rate</span>
                  <span className="font-bold tabular-nums">₹10.00 / page</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-ink/8">
                  <span>Razorpay UPI Webhook URL</span>
                  <code className="font-mono text-dashboard-small bg-white/60 px-2 py-1 rounded border border-ink/10">/api/razorpay/webhook</code>
                </div>
              </div>
            </GlassPanel>
          )}
        </main>
      </div>
    </div>
  );
}
