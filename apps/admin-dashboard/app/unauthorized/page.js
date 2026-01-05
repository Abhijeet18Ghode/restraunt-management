'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import Button from '../components/UI/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <ShieldX className="h-16 w-16 text-red-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>
        
        <p className="text-gray-600 mb-8">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        
        <div className="space-y-4">
          <Link href="/dashboard">
            <Button className="w-full">
              Go to Dashboard
            </Button>
          </Link>
          
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Sign In with Different Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}