'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemAuth } from './contexts/SystemAuthContext';

export default function HomePage() {
  const { isAuthenticated, loading } = useSystemAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  );
}