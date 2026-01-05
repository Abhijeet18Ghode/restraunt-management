import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { POSProvider } from './contexts/POSContext';
import { OfflineProvider } from './contexts/OfflineContext';

export const metadata = {
  title: 'Restaurant POS System',
  description: 'Touch-optimized Point of Sale system for restaurants',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Restaurant POS" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body>
        <OfflineProvider>
          <AuthProvider>
            <POSProvider>
              {children}
            </POSProvider>
          </AuthProvider>
        </OfflineProvider>
      </body>
    </html>
  );
}