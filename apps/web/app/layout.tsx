import type { Metadata, Viewport } from 'next';
import { Fraunces, Figtree } from 'next/font/google';
import './globals.css';

const serif = Fraunces({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-serif' });
const sans = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'La Puerca Dominó',
  description: 'Juega dominó con amigos, rápido y fácil.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'La Puerca', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#0d6e3c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
