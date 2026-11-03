import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminHeader } from '../components/AdminHeader';
import { 
  Building2, Check, X, ShieldAlert, Ban, RefreshCw, 
  MapPin, Phone, Mail, FileText, CheckCircle2, User, Trash2,
  Layers, ArrowLeftRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Business {
  id: string;
  name: string;
  sector: string | null;
  phone: string | null;
  location: string | null;
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  productMode?: 'SIMPLE' | 'ADVANCED';
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
}

type StatusFilter = 'all' | 'pending' | 'active' | 'suspended' | 'rejected';

export const AdminBusinessesPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBusinesses = async (statusFilter: StatusFilter) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/businesses`, {
        params: { status: statusFilter }
      });
      setBusinesses(res.data.data);
    } catch (err: any) {
      toast.error('Failed to load businesses list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses(filter);
  }, [filter]);

  const handleAction = async (businessId: string, action: 'approve' | 'reject' | 'suspend' | 'reactivate' | 'delete') => {
    setActionLoading(businessId);
    try {
      if (action === 'delete') {
        if (!window.confirm('Are you sure you want to permanently delete this business? This action cannot be undone.')) {
           setActionLoading(null);
           return;
        }
        await api.delete(`/admin/businesses/${businessId}`);
      } else {
        await api.post(`/admin/businesses/${businessId}/${action}`);
      }
      toast.success(`Business ${action}ed successfully!`);
      // Refresh current list
      fetchBusinesses(filter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || `Failed to ${action} business`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleProductModeChange = async (biz: Business) => {
    const currentMode = biz.productMode || 'ADVANCED';
    const targetMode = currentMode === 'SIMPLE' ? 'ADVANCED' : 'SIMPLE';
    const currentModeLabel = currentMode === 'SIMPLE' ? 'Simple Flat Mode' : 'Advanced Mode';
    const targetModeLabel = targetMode === 'SIMPLE' ? 'Simple Flat Mode' : 'Advanced Mode';

    const confirmed = window.confirm(
      `Change Product Management Mode for "${biz.name}"?\n\nCurrent: ${currentModeLabel}\nTarget: ${targetModeLabel}\n\nDo you want to proceed?`
    );

    if (!confirmed) return;

    setActionLoading(biz.id);
    try {
      await api.put(`/admin/businesses/${biz.id}/product-mode`, {
        productMode: targetMode,
      });
      toast.success(`Product mode for "${biz.name}" changed to ${targetModeLabel}!`);
      fetchBusinesses(filter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update product mode');
    } finally {
      setActionLoading(null);
    }
  };

  const filters: Array<{ label: string; value: StatusFilter }> = [
    { label: 'All Businesses', value: 'all' },
    { label: 'Pending Approval', value: 'pending' },
    { label: 'Active', value: 'active' },
    { label: 'Suspended', value: 'suspended' },
    { label: 'Rejected', value: 'rejected' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col font-sans">
      <AdminHeader />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Businesses Management</h1>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              Verify, approve, suspend, or reactivate platform tenants.
            </p>
          </div>
          
          {/* Refresh button */}
          <button
            onClick={() => fetchBusinesses(filter)}
            className="flex items-center justify-center h-10 w-10 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] hover:bg-[var(--color-bg-base)] text-[var(--color-text-secondary)] transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`h-10 px-4 rounded-[var(--radius-md)] text-sm font-semibold transition-all border cursor-pointer select-none ${
                filter === f.value
                  ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
                  : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-[var(--color-bg-base)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Businesses Table */}
        <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[var(--color-accent)]"></div>
            </div>
          ) : businesses.length === 0 ? (
            <div className="py-16 text-center text-sm text-[var(--color-text-muted)] flex flex-col items-center justify-center gap-3">
              <Building2 className="w-12 h-12 text-[var(--color-text-muted)]" />
              <span>No businesses found matching this filter</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--color-border)]">
                <thead className="bg-[var(--color-bg-sunken)]">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Business Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Owner Info
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Dates & Registration
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Product Mode
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--color-bg-surface)] divide-y divide-[var(--color-border)]">
                  {businesses.map((biz) => (
                    <tr key={biz.id} className="hover:bg-[var(--color-bg-base)] transition-colors">
                      {/* Business Details */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                          {biz.name}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)] mt-1 capitalize">
                          Sector: {biz.sector || 'N/A'}
                        </div>
                        <div className="flex flex-col gap-1 mt-2 text-xs text-[var(--color-text-muted)]">
                          {biz.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {biz.location}
                            </span>
                          )}
                          {biz.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" /> {biz.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Owner Details */}
                      <td className="px-6 py-4 vertical-top">
                        <div className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                          {biz.ownerName || 'Setting up...'}
                        </div>
                        <div className="flex flex-col gap-1 mt-2 text-xs text-[var(--color-text-secondary)]">
                          <a href={`mailto:${biz.ownerEmail}`} className="flex items-center gap-1 hover:text-[var(--color-accent)] transition-colors">
                            <Mail className="w-3.5 h-3.5" /> {biz.ownerEmail}
                          </a>
                          {biz.ownerPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /> {biz.ownerPhone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Registration Dates */}
                      <td className="px-6 py-4 text-xs text-[var(--color-text-secondary)] space-y-2">
                        <div>
                          <span className="text-[var(--color-text-muted)] font-medium">Registered: </span>
                          {new Date(biz.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {biz.approvedAt && (
                          <div>
                            <span className="text-[var(--color-text-muted)] font-medium">Approved: </span>
                            {new Date(biz.approvedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                        {biz.approvedByName && (
                          <div className="flex items-center gap-1 text-[var(--color-text-muted)] italic">
                            <ShieldAlert className="w-3 h-3 text-[var(--color-accent)]" />
                            Approved by: {biz.approvedByName}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          biz.status === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : biz.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : biz.status === 'suspended'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {biz.status}
                        </span>
                      </td>

                      {/* Product Mode */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            biz.productMode === 'SIMPLE' 
                              ? 'bg-sky-50 text-sky-700 border border-sky-200' 
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            <Layers className="w-3 h-3" />
                            {biz.productMode === 'SIMPLE' ? 'Simple Flat' : 'Advanced'}
                          </span>
                          <button
                            onClick={() => handleProductModeChange(biz)}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent)] hover:underline cursor-pointer disabled:opacity-50 select-none"
                            title={`Switch ${biz.name} to ${biz.productMode === 'SIMPLE' ? 'Advanced' : 'Simple Flat'} Mode`}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            Switch to {biz.productMode === 'SIMPLE' ? 'Advanced' : 'Simple'}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {biz.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAction(biz.id, 'approve')}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-[var(--radius-md)] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer select-none"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(biz.id, 'reject')}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-[var(--radius-md)] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer select-none"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          )}

                          {biz.status === 'active' && (
                            <button
                              onClick={() => handleAction(biz.id, 'suspend')}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-900 rounded-[var(--radius-md)] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer select-none"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Suspend
                            </button>
                          )}

                          {biz.status === 'suspended' && (
                            <button
                              onClick={() => handleAction(biz.id, 'reactivate')}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-900 rounded-[var(--radius-md)] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer select-none"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Reactivate
                            </button>
                          )}

                          {biz.status === 'rejected' && (
                            <button
                              onClick={() => handleAction(biz.id, 'approve')}
                              disabled={actionLoading !== null}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-[var(--radius-md)] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer select-none"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleAction(biz.id, 'delete')}
                            disabled={actionLoading !== null}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-[var(--radius-md)] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer select-none ml-2"
                            title="Delete Business Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
