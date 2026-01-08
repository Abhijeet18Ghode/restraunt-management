import './globals.css';
import { SystemAuthProvider } from './contexts/SystemAuthContext';

export const metadata = {
  title: 'System Admin - Restaurant Management Platform',
  description: 'System administration dashboard for managing tenants and platform operations',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SystemAuthProvider>
          {children}
        </SystemAuthProvider>
      </body>
    </html>
  );
}