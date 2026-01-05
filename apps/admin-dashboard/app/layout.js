import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';

export const metadata = {
  title: 'Restaurant Admin Dashboard',
  description: 'Multi-tenant restaurant management system',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TenantProvider>
            {children}
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}