import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PRODUCT_NAME, PRODUCT_SUBTITLE } from '@/lib/branding';

export const metadata: Metadata = {
  title: PRODUCT_NAME,
  description: PRODUCT_SUBTITLE,
  applicationName: PRODUCT_NAME,
  openGraph: { title: PRODUCT_NAME, description: PRODUCT_SUBTITLE, type: 'website', siteName: PRODUCT_NAME },
  twitter: { card: 'summary', title: PRODUCT_NAME, description: PRODUCT_SUBTITLE },
  robots: { index: false, follow: false },
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

