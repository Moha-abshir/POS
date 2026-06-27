import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminHeader } from '../components/AdminHeader';
import { Clock, CheckCircle2, AlertOctagon, XCircle, Building2, UserCheck, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

interface Metrics {
  businesses: {
    pending: number;
    active: number;
    suspended: number;
    rejected: number;
    total: number;
  };
  users: {
    owners: number;
    cashiers: number;
    total: number;
  };
  recentRegistrations: Array<{
    id: string;
    name: string;
    createdAt: string;
    status: string;
    ownerName: string | null;
    ownerEmail: string;
  }>;
}

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/admin/metrics');
        setMetrics(res.data.data);
      } catch (err: any) {
        toast.error('Failed to load platform metrics');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col">
        <AdminHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Pending Businesses',
      value: metrics?.businesses.pending || 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      description: 'Needs review'
    },
    {
      title: 'Active Businesses',
      value: metrics?.businesses.active || 0,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-50 border-green-100',
      description: 'Active subscriptions'
    },
    {
      title: 'Suspended Businesses',
      value: metrics?.businesses.suspended || 0,
      icon: AlertOctagon,
      color: 'text-red-600 bg-red-50 border-red-100',
      description: 'Access disabled'
    },
    {
      title: 'Rejected Businesses',
      value: metrics?.businesses.rejected || 0,
      icon: XCircle,
      color: 'text-gray-600 bg-gray-50 border-gray-100',
      description: 'Not approved'
    },
    {
      title: 'Total Businesses',
      value: metrics?.businesses.total || 0,
      icon: Building2,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      description: 'Total registrations'
    },
    {
      title: 'Total Owners',
      value: metrics?.users.owners || 0,
      icon: UserCheck,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
      description: 'Tenant owners'
    },
    {
      title: 'Total Cashiers',
      value: metrics?.users.cashiers || 0,
      icon: Users,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      description: 'Active terminals'
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col font-sans">
      <AdminHeader />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Platform Administration Overview</h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Real-time multi-tenant POS platform operations and analytics.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className={`bg-[var(--color-bg-surface)] border rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-sm)] flex items-start justify-between`}>
                <div>
                  <p className="text-[var(--text-xs)] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                    {card.title}
                  </p>
                  <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-2">
                    {card.value}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{card.description}</p>
                </div>
                <div className={`p-3 rounded-[var(--radius-md)] border ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent registrations */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-border)] flex items-center justify-between">
            <h3 className="font-semibold text-lg text-[var(--color-text-primary)] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--color-accent)]" />
              Recent Registrations
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--color-border)]">
              <thead className="bg-[var(--color-bg-sunken)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Owner details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Registered On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[var(--color-bg-surface)] divide-y divide-[var(--color-border)]">
                {metrics?.recentRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-[var(--color-text-muted)]">
                      No recent registrations found
                    </td>
                  </tr>
                ) : (
                  metrics?.recentRegistrations.map((reg) => (
                    <tr key={reg.id} className="hover:bg-[var(--color-bg-base)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-[var(--color-text-primary)]">
                        {reg.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                        <div>{reg.ownerName || 'Pending Setup'}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{reg.ownerEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">
                        {new Date(reg.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          reg.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : reg.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : reg.status === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {reg.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
