import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PrintQ - Self-Service Print Kiosks India',
  description: 'Scan QR, Upload, Pay via UPI, Print automatically on Raspberry Pi kiosk',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
