'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2 } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';

export default function PhoneUploadPage() {
  const params = useParams();
  const rawToken = (params.token as string) || '';

  const [sessionState, setSessionState] = useState<'claiming' | 'connected' | 'uploaded' | 'expired'>('claiming');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kioskName, setKioskName] = useState<string>('PrintQ Kiosk');
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Claim session automatically on page load
  useEffect(() => {
    if (!rawToken) {
      setSessionState('expired');
      return;
    }

    const claimSession = async () => {
      try {
        const res = await fetch('/api/sessions/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: rawToken }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setSessionState('expired');
          return;
        }

        if (data.session?.kiosks?.name) {
          setKioskName(data.session.kiosks.name);
        }
        setSessionState('connected');
      } catch (err: any) {
        setSessionState('expired');
      }
    };

    claimSession();
  }, [rawToken]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds 25 MB limit.');
      return;
    }

    setFile(selectedFile);
    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('token', rawToken);

      // Attempt client-side PDF page count for immediate UX feedback
      if (selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf')) {
        try {
          const { PDFDocument } = await import('pdf-lib');
          const buffer = await selectedFile.arrayBuffer();
          const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          const pages = pdfDoc.getPageCount();
          formData.append('clientPages', pages.toString());
        } catch (e) {
          // Fallback server parsing
        }
      }

      // Simulate step progress for fast UX
      const interval = setInterval(() => {
        setUploadProgress((prev) => (prev >= 90 ? prev : prev + 25));
      }, 150);

      let res: Response;
      try {
        res = await fetch('/api/sessions/upload', {
          method: 'POST',
          body: formData,
        });
      } catch (netErr: any) {
        clearInterval(interval);
        throw new Error(
          netErr?.message?.includes('Failed to fetch')
            ? 'Network connection error during upload. Please check your connection and retry.'
            : netErr?.message || 'File upload failed'
        );
      }

      clearInterval(interval);
      setUploadProgress(100);

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        if (res.status === 413) {
          throw new Error('File size exceeds server payload limit. Please select a smaller file (under 15 MB).');
        }
        throw new Error('Server returned invalid response during upload.');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      setTimeout(() => {
        setIsUploading(false);
        setSessionState('uploaded');
      }, 300);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'File upload failed. Please retry.');
    }
  };

  return (
    <main className="min-h-screen bg-bgBase text-ink px-5 py-8 flex flex-col justify-between max-w-md mx-auto relative overflow-hidden font-sans">
      {/* Drifting CMYK Blobs */}
      <div className="cmyk-blob-cyan opacity-50" />
      <div className="cmyk-blob-magenta opacity-50" />

      {/* EXPIRED QR PAGE (Minimal Strict Spec) */}
      {sessionState === 'expired' ? (
        <div className="my-auto space-y-4 text-left relative z-10">
          <h1 className="text-[34px] leading-tight font-bold text-ink tracking-tight">This QR has expired</h1>
          <p className="text-[17px] text-ink2 leading-relaxed font-normal">
            Touch the kiosk screen to get a new one.
          </p>
        </div>
      ) : (
        <div className="space-y-6 relative z-10 my-auto">
          {/* Top Header */}
          <div className="space-y-1">
            <span className="text-[14px] font-medium text-ink2 block">Connected to</span>
            <h2 className="text-[24px] font-bold text-ink tracking-tight">{kioskName}</h2>
          </div>

          {/* Connected State: Upload Zone */}
          {sessionState === 'connected' && (
            <div className="space-y-4">
              <GlassPanel className="border-[1.5px] border-dashed border-ink/20 hover:border-ink/50 p-8 text-center relative cursor-pointer group">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                  onChange={handleUpload}
                  disabled={isUploading}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-20"
                />

                <div className="flex flex-col items-center space-y-4 relative z-10">
                  <div className="w-14 h-14 glass-2 rounded-control flex items-center justify-center text-ink group-hover:scale-105 transition">
                    <Upload className="w-7 h-7 stroke-[1.75]" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-[24px] font-bold text-ink">Choose file</h2>
                    <p className="text-[14px] font-normal text-ink2">PDF, photo or Word · up to 25 MB</p>
                  </div>
                </div>
              </GlassPanel>

              {/* Upload Progress Bar */}
              {isUploading && (
                <GlassPanel className="p-5 space-y-3">
                  <div className="flex justify-between items-center text-[14px] font-semibold text-ink">
                    <span className="truncate max-w-[200px]">{file?.name}</span>
                    <span className="tabular-nums text-signalCyan">{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-ink/10 glass-2 rounded-pill overflow-hidden">
                    <div
                      className="bg-signalCyan h-full transition-all duration-150 ease-out rounded-pill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </GlassPanel>
              )}

              {errorMessage && (
                <div className="p-4 bg-error/10 border border-error/20 text-error rounded-control text-[14px] font-medium flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Uploaded State Success */}
          {sessionState === 'uploaded' && (
            <GlassPanel className="p-8 text-center space-y-6">
              <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
              <div className="space-y-2">
                <h2 className="text-[24px] font-bold text-ink">Sent to kiosk</h2>
                <p className="text-[17px] font-normal text-ink2 leading-relaxed">
                  Continue on the kiosk screen to choose copies and print.
                </p>
              </div>
            </GlassPanel>
          )}
        </div>
      )}
    </main>
  );
}
