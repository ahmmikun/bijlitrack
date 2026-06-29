import type { Metadata } from 'next';
import { Fira_Sans, Fira_Code } from 'next/font/google';
import './globals.css';
import Providers from '../components/Providers';

const firaSans = Fira_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const firaCode = Fira_Code({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: {
    default: 'BijliTrack — Pakistan Electricity Bill & Outage Tracker',
    template: '%s | BijliTrack',
  },
  description: 'Track your LESCO, GEPCO, FESCO, IESCO, MEPCO, PESCO, HESCO electricity bills, real-time feeder status, power outages, and complaint history. Free smart dashboard for all Pakistani DISCOs.',
  keywords: [
    'electricity bill tracker Pakistan',
    'LESCO bill check online',
    'GEPCO bill check',
    'FESCO bill status',
    'IESCO electricity bill',
    'MEPCO bill online',
    'PESCO bill tracker',
    'HESCO bill check',
    'Pakistan power outage tracker',
    'feeder status check Pakistan',
    'load shedding schedule Pakistan',
    'bijli bill check',
    'electricity complaint tracker',
    'WAPDA bill online',
    'CCMS PITC',
    'smart electricity dashboard',
    'real-time feeder status',
    'Pakistan electricity monitoring',
    'bijli ka bill',
    'light bill check online',
  ],
  authors: [{ name: 'Salman Ahmad', url: 'https://github.com/ahmmikun' }],
  creator: 'Salman Ahmad',
  publisher: 'BijliTrack',
  metadataBase: new URL('https://bijlitrack.up.railway.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: 'https://bijlitrack.up.railway.app',
    siteName: 'BijliTrack',
    title: 'BijliTrack — Pakistan Electricity Bill & Outage Tracker',
    description: 'Free smart dashboard to track electricity bills, real-time power outages, feeder status, and complaints for all Pakistani DISCOs (LESCO, GEPCO, FESCO, IESCO, MEPCO, PESCO, HESCO).',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'BijliTrack - Smart Electricity Dashboard for Pakistan',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BijliTrack — Pakistan Electricity Bill & Outage Tracker',
    description: 'Track electricity bills, real-time feeder status & power outages for all Pakistani DISCOs. Free smart dashboard.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: 'your-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

