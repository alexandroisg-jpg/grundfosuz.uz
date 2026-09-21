import type { Metadata } from 'next';
import './globals.css';
import { SITE_ORIGIN } from '@/lib/seo';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: 'Grundfos Uzbekistan UZ — промышленные насосы и запчасти',
  description: 'Промышленные насосы Grundfos для Узбекистана. CR, CRE, NB, NK, TP, TPE и Hydro. Модели, характеристики, цены в сумах и справочник серий.',
  robots: { index: true, follow: true },
  verification: { google: 'vQEhrbpbWLG9ihC-oOxJgM2iOo2uEAGbIX93W3nXBgk' },
  alternates: { canonical: SITE_ORIGIN + '/' },
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="ru"><body>{children}</body></html>;
}
