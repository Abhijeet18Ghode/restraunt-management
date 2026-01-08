'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemAuth } from '../contexts/SystemAuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSystemAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}