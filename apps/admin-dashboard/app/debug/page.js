'use client';

import { useAuth } from '../contexts/AuthContext';
import { ROLE_PERMISSIONS, ROLES } from '../components/Auth/RoleManager';

export default function DebugPage() {
  const { user, hasPermission, hasRole, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Page - Not Authenticated</h1>
        <p>Please login first</p>
      </div>
    );
  }

  // Test some permissions
  const testPermissions = [
    'dashboard.view',
    'menu.view',
    'menu.categories.view',
    'outlets.view',
    'staff.view'
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Page - Authentication & Permissions</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">User Data</h2>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Role Mapping</h2>
        <p><strong>Original Role:</strong> {user?.role}</p>
        <p><strong>Mapped Role:</strong> {user?.role === 'TENANT_ADMIN' ? ROLES.ADMIN : user?.role}</p>
        <p><strong>Has Admin Role:</strong> {hasRole('admin') ? 'Yes' : 'No'}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Available Permissions for ADMIN Role</h2>
        <div className="bg-gray-100 p-4 rounded text-sm max-h-60 overflow-auto">
          {ROLE_PERMISSIONS[ROLES.ADMIN]?.map((permission, index) => (
            <div key={index}>{permission}</div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Permission Tests</h2>
        <div className="space-y-2">
          {testPermissions.map(permission => (
            <div key={permission} className="flex justify-between">
              <span>{permission}</span>
              <span className={hasPermission(permission) ? 'text-green-600' : 'text-red-600'}>
                {hasPermission(permission) ? '✅ Allowed' : '❌ Denied'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}