import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Tree Network',
  description: 'One person, one identity, every relationship — a multidimensional relationship network.',
};

export const viewport: Viewport = { themeColor: '#071426', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
