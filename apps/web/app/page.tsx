import Link from 'next/link';
import { Printer, QrCode, ShieldCheck, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-6">
      <header className="flex justify-between items-center py-4 border-b border-slate-800 max-w-4xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500 p-2 rounded-xl text-slate-900 font-bold">
            <Printer className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight">PrintQ</span>
        </div>
        <Link
          href="/owner"
          className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          Owner Dashboard
        </Link>
      </header>

      <section className="max-w-4xl mx-auto w-full my-auto py-12 text-center">
        <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
          Self-Service Printing Kiosks • India
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
          Scan QR. Pay UPI. <br />
          <span className="text-emerald-400">Print in Seconds.</span>
        </h1>
        <p className="mt-4 text-slate-400 text-lg max-w-xl mx-auto">
          No shop staff needed. Fully automated vending-style document printing powered by Raspberry Pi and Supabase.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/k/VISHNU01"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
          >
            <QrCode className="w-5 h-5" /> Test Kiosk Demo (VISHNU01)
          </Link>
          <Link
            href="/screen/VISHNU01"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3.5 rounded-xl transition flex items-center gap-2 border border-slate-700"
          >
            Launch Kiosk Screen Demo
          </Link>
        </div>
      </section>

      <footer className="max-w-4xl mx-auto w-full py-6 border-t border-slate-800 text-center text-slate-500 text-sm">
        PrintQ Kiosk System &copy; 2026 • Designed for High-Reliability Automated Vending
      </footer>
    </main>
  );
}
