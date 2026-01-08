'use client';

import { useState, useEffect } from 'react';
import { systemTenantService } from '../services/systemTenantService';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';
import { Users, Building, TrendingUp, Activity } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await systemTenantService.getSystemStats();
      if (result.success) {
        setStats(result.data);
      } else {
        toast.error('Failed to load system statistics');
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Total Tenants',
      value: stats?.totalTenants || 0,
      icon: Building,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      name: 'Active Tenants',
      value: stats?.activeTenants || 0,
      icon: Activity,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      name: 'Premium Plans',
      value: stats?.subscriptionBreakdown?.PREMIUM || 0,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+23%',
    },
    {
      name: 'Enterprise Plans',
      value: stats?.subscriptionBreakdown?.ENTERPRISE || 0,
      icon: Users,
      color: 'bg-orange-500',
      change: '+15%',
    },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Platform overview and tenant management statistics
            </p>
          </div>

          {/* Stats Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.name} className="card p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`p-3 rounded-lg ${stat.color}`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                        <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                        <div className="flex items-center mt-1">
                          <span className="text-sm font-medium text-green-600">
                            {stat.change}
                          </span>
                          <span className="text-sm text-gray-500 ml-1">vs last month</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subscription Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Subscription Plans
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(stats?.subscriptionBreakdown || {}).map(([plan, count]) => {
                    const total = stats?.totalTenants || 1;
                    const percentage = ((count / total) * 100).toFixed(1);
                    
                    return (
                      <div key={plan}>
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-gray-700">{plan}</span>
                          <span className="text-gray-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              plan === 'BASIC' ? 'bg-blue-500' :
                              plan === 'PREMIUM' ? 'bg-purple-500' :
                              'bg-orange-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Tenants */}
            <div className="card p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Recent Tenants
              </h3>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {stats?.recentTenants?.map((tenant) => (
                    <div key={tenant.id} className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {tenant.businessName.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {tenant.businessName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {tenant.subscriptionPlan} • {new Date(tenant.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tenant.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500">No tenants found</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}