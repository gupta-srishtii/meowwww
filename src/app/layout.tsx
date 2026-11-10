import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Road That Made Us Family',
  description: 'An interactive 3D mountain scooter journey from Rishikesh to Neelkanth Mahadev.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0b1020] text-slate-100">{children}</body>
    </html>
  );
}

