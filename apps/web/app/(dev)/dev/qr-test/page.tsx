'use client';

import React, { useState } from 'react';
import { ShieldCheck, Smartphone, RefreshCw, AlertTriangle, CheckCircle2, Play } from 'lucide-react';

export default function DevQrTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'passed' | 'failed'>('idle');

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runMultiPhoneConflictTest = async () => {
    setLogs([]);
    setTestStatus('running');
    addLog('Starting Test 1: Duplicate Scan Conflict on 2 Phones...');

    try {
      // 1. Fetch active session token for kiosk VISHNU01
      const sessRes = await fetch('/api/kiosk/VISHNU01/session');
      const sessData = await sessRes.json();
      const rawToken = sessData.rawToken;
      addLog(`Active Session Created: Token=${rawToken?.substring(0, 10)}... | Code=${sessData.shortCode}`);

      // 2. Simulate Phone 1 Claiming Session
      addLog('Phone 1: Attempting session claim...');
      const claim1 = await fetch('/api/sessions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, deviceId: 'Phone_1_iPhone' }),
      });
      const data1 = await claim1.json();
      addLog(`Phone 1 Result: Success=${data1.success}`);

      // 3. Simulate Phone 2 Scanning the SAME QR Code
      addLog('Phone 2: Attempting session claim on SAME QR code...');
      const claim2 = await fetch('/api/sessions/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, deviceId: 'Phone_2_Android' }),
      });
      const data2 = await claim2.json();
      addLog(`Phone 2 Result: Success=${data2.success} | Error="${data2.error}"`);

      // 4. Validate Assertions
      if (data1.success === true && data2.success === false) {
        addLog('ASSERTION PASSED ✓: Phone 1 claimed session, Phone 2 was rejected!');
        setTestStatus('passed');
      } else {
        addLog('ASSERTION FAILED ✕: Atomic claim check failed');
        setTestStatus('failed');
      }
    } catch (err: any) {
      addLog(`TEST ERROR: ${err.message}`);
      setTestStatus('failed');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-start font-mono">
      <div className="max-w-2xl w-full space-y-6">
        <header className="border-b border-white/10 pb-4">
          <h1 className="text-2xl font-black text-emerald-400">PrintQ Developer QR Test Bench</h1>
          <p className="text-xs text-slate-400 mt-1">Simulates concurrent phone scans, session claims, and race conditions.</p>
        </header>

        <div className="flex gap-4">
          <button
            onClick={runMultiPhoneConflictTest}
            disabled={testStatus === 'running'}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-6 py-3 rounded-2xl transition flex items-center gap-2 text-sm"
          >
            <Play className="w-4 h-4" /> Run Concurrent Dual-Scan Test
          </button>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-bold">Status:</span>
          {testStatus === 'passed' && (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> All Tests Passed
            </span>
          )}
          {testStatus === 'failed' && (
            <span className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Test Failed
            </span>
          )}
          {testStatus === 'running' && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running Simulation...
            </span>
          )}
        </div>

        {/* Test Console Output */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 min-h-[300px] shadow-2xl space-y-2 overflow-y-auto max-h-[500px]">
          <span className="text-xs font-bold text-slate-500 block mb-2 border-b border-white/5 pb-2">TEST CONSOLE LOGS</span>
          {logs.length === 0 ? (
            <p className="text-xs text-slate-600 italic">Click button above to execute test suite...</p>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`text-xs ${
                  log.includes('PASSED')
                    ? 'text-emerald-400 font-bold'
                    : log.includes('FAILED')
                    ? 'text-red-400 font-bold'
                    : 'text-slate-300'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
