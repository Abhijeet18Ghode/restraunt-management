'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldX, ArrowLeft, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRoleManager } from '../components/Auth/RoleManager';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { getRoleDisplayName, getPermissionDisplayName } = useRoleManager();
  
  const requiredPermission = searchParams.get('permission');
  const requiredRole = searchParams.get('role');
  const resource = searchParams.get('resource') || 'this page';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full">
        <Card className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-100 rounded-full">
              <ShieldX className="h-12 w-12 text-red-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-6">
            You don't have the required permissions to access {resource}.
          </p>

          {/* Show specific permission/role requirements */}
          {(requiredPermission || requiredRole) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-2">Required Access:</p>
                  {requiredPermission && (
                    <p className="text-blue-800 mb-1">
                      <span className="font-medium">Permission:</span> {getPermissionDisplayName(requiredPermission)}
                    </p>
                  )}
                  {requiredRole && (
                    <p className="text-blue-800">
                      <span className="font-medium">Role:</span> {getRoleDisplayName(requiredRole)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Show current user info */}
          {user && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">Current User:</span> {user.name || user.email}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Your Role:</span> {getRoleDisplayName(user.role)}
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <Link href="/dashboard">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
            
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Sign In with Different Account
              </Button>
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If you believe you should have access to this resource, please contact your system administrator.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}