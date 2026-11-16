import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { AdminHeader } from '../components/AdminHeader';
import { 
  Building2, Check, X, ShieldAlert, Ban, RefreshCw, 
  MapPin, Phone, Mail, FileText, CheckCircle2, User, Trash2,
  Layers, ArrowLeftRight, CreditCard, Lock, Unlock, AlertTriangle, Bell, ShieldCheck
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
  paymentStatus?: 'normal' | 'warning' | 'locked';
  isPaymentLocked?: boolean;
  paymentLockReason?: string | null;
  paymentAmountDue?: string | number | null;
  paymentLockedAt?: string | null;
  createdAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  ownerName: string | null;
  ownerEmail: string;
  ownerPhone: string | null;
}

type StatusFilter = 'all' | 'pending' | 'active' | 'payment_warning' | 'payment_locked' | 'suspended' | 'rejected';

export const AdminBusinessesPage: React.FC = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Payment Management Modal state
  const [paymentModalBiz, setPaymentModalBiz] = useState<Business | null>(null);
  const [modalMode, setModalMode] = useState<'warning' | 'locked'>('warning');
  const [amountDueInput, setAmountDueInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [submittingLock, setSubmittingLock] = useState(false);

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

  const openPaymentModal = (biz: Business, initialMode: 'warning' | 'locked') => {
    setPaymentModalBiz(biz);
    setModalMode(initialMode);
    setAmountDueInput(biz.paymentAmountDue ? String(biz.paymentAmountDue) : '');
    setReasonInput(biz.paymentLockReason || '');
  };

  const handleClearPaymentStatus = async (biz: Business) => {
    if (!window.confirm(`Clear payment warning / lock for "${biz.name}" and restore normal status?`)) {
      return;
    }
    setActionLoading(biz.id);
    try {
      await api.put(`/admin/businesses/${biz.id}/payment-lock`, {
        paymentStatus: 'normal',
        isPaymentLocked: false,
      });
      toast.success(`Payment status cleared for "${biz.name}". Access is normal.`);
      fetchBusinesses(filter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to clear payment status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSavePaymentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalBiz) return;

    setSubmittingLock(true);
    try {
      await api.put(`/admin/businesses/${paymentModalBiz.id}/payment-lock`, {
        paymentStatus: modalMode,
        isPaymentLocked: modalMode === 'locked',
        amountDue: amountDueInput ? Number(amountDueInput) : undefined,
        reason: reasonInput.trim() || undefined,
      });

      const successMsg = modalMode === 'warning'
        ? `Glowing warning banner activated for "${paymentModalBiz.name}". POS remains functional.`
        : `Payment lock enabled for "${paymentModalBiz.name}". Features are now locked.`;

      toast.success(successMsg);
      setPaymentModalBiz(null);
      fetchBusinesses(filter);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update payment status');
    } finally {
      setSubmittingLock(false);
    }
  };

  const filters: Array<{ label: string; value: StatusFilter }> = [
    { label: 'All Businesses', value: 'all' },
    { label: 'Pending Approval', value: 'pending' },
    { label: 'Active', value: 'active' },
    { label: 'Payment Warning', value: 'payment_warning' },
    { label: 'Payment Locked', value: 'payment_locked' },
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
              Verify, approve, suspend, issue payment warnings, manage locks, or reactivate platform tenants.
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
                      Account Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Payment Status
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
                  {businesses.map((biz) => {
                    const isLocked = Boolean(biz.isPaymentLocked || biz.paymentStatus === 'locked');
                    const isWarning = biz.paymentStatus === 'warning';

                    return (
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
                              <Check className="w-3.5 h-3.5 text-green-600" /> By {biz.approvedByName}
                            </div>
                          )}
                        </td>

                        {/* Account Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
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

                        {/* Payment Status & Controls */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 items-start">
                            {isLocked ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-900 border border-red-300">
                                  <Lock className="w-3 h-3 text-red-700" />
                                  Payment Locked
                                </span>
                                {biz.paymentAmountDue && (
                                  <span className="text-xs font-bold text-red-950 font-mono">
                                    KES {Number(biz.paymentAmountDue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                                {biz.paymentLockReason && (
                                  <span className="text-[11px] text-[var(--color-text-muted)] italic max-w-[170px] truncate" title={biz.paymentLockReason}>
                                    {biz.paymentLockReason}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 mt-1">
                                  <button
                                    onClick={() => handleClearPaymentStatus(biz)}
                                    disabled={actionLoading !== null}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border border-green-200 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer select-none disabled:opacity-50"
                                    title="Unlock business and restore full normal access"
                                  >
                                    <Unlock className="w-3 h-3" />
                                    Unlock
                                  </button>
                                  <button
                                    onClick={() => openPaymentModal(biz, 'warning')}
                                    disabled={actionLoading !== null}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer select-none disabled:opacity-50"
                                    title="Downgrade lock to warning banner"
                                  >
                                    <Bell className="w-3 h-3" />
                                    To Warning
                                  </button>
                                </div>
                              </>
                            ) : isWarning ? (
                              <>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                  </span>
                                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  Warning Active
                                </span>
                                {biz.paymentAmountDue && (
                                  <span className="text-xs font-bold text-amber-950 font-mono">
                                    KES {Number(biz.paymentAmountDue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                                  </span>
                                )}
                                {biz.paymentLockReason && (
                                  <span className="text-[11px] text-[var(--color-text-muted)] italic max-w-[170px] truncate" title={biz.paymentLockReason}>
                                    {biz.paymentLockReason}
                                  </span>
                                )}
                                <div className="flex items-center gap-1 mt-1">
                                  <button
                                    onClick={() => openPaymentModal(biz, 'locked')}
                                    disabled={actionLoading !== null}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer select-none disabled:opacity-50"
                                    title="Upgrade to full payment lockout"
                                  >
                                    <Lock className="w-3 h-3 text-red-600" />
                                    Upgrade to Lock
                                  </button>
                                  <button
                                    onClick={() => handleClearPaymentStatus(biz)}
                                    disabled={actionLoading !== null}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer select-none disabled:opacity-50"
                                    title="Clear warning banner"
                                  >
                                    <Check className="w-3 h-3" />
                                    Clear
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Normal
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                  <button
                                    onClick={() => openPaymentModal(biz, 'warning')}
                                    disabled={actionLoading !== null}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-900 border border-amber-200 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer select-none disabled:opacity-50"
                                    title="Display brown-yellow glowing payment warning banner on client's screen"
                                  >
                                    <Bell className="w-3 h-3 text-amber-700" />
                                    Warn Banner
                                  </button>
                                  <button
                                    onClick={() => openPaymentModal(biz, 'locked')}
                                    disabled={actionLoading !== null}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border border-red-200 rounded-[var(--radius-sm)] text-[11px] font-semibold transition-colors cursor-pointer select-none disabled:opacity-50"
                                    title="Lock business for payment and display lockout page"
                                  >
                                    <Lock className="w-3 h-3 text-red-600" />
                                    Lock
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Payment Management Modal */}
      {paymentModalBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  modalMode === 'warning' 
                    ? 'bg-amber-100 border border-amber-300 text-amber-800' 
                    : 'bg-red-100 border border-red-300 text-red-800'
                }`}>
                  {modalMode === 'warning' ? <Bell className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                    Payment Management: {paymentModalBiz.name}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Configure payment warning banner or full service lockout
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalBiz(null)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selection Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[var(--color-bg-sunken)] p-1 rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setModalMode('warning')}
                className={`py-2 px-3 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalMode === 'warning'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Warning Banner</span>
              </button>
              <button
                type="button"
                onClick={() => setModalMode('locked')}
                className={`py-2 px-3 rounded-[var(--radius-sm)] text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalMode === 'locked'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Full Lockout</span>
              </button>
            </div>

            {/* Mode Description */}
            <div className={`p-3 rounded-[var(--radius-md)] border text-xs leading-relaxed ${
              modalMode === 'warning'
                ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                : 'bg-red-50/70 border-red-200 text-red-900'
            }`}>
              {modalMode === 'warning' ? (
                <span>
                  <strong>Warning Mode:</strong> Displays a glowing/dimming brown-yellow warning banner at the top of the client's screen instructing them to make payment to avoid disruption. <strong>POS, sales, and catalog features remain fully active.</strong>
                </span>
              ) : (
                <span>
                  <strong>Full Lockout Mode:</strong> Completely blocks tenant operations. Whenever the client sends any request, they will be redirected to the <strong>Payment Required</strong> page and cannot access any feature until unlocked.
                </span>
              )}
            </div>

            <form onSubmit={handleSavePaymentStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                  Amount Due (KES) - Optional
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 3000"
                  value={amountDueInput}
                  onChange={(e) => setAmountDueInput(e.target.value)}
                  className="w-full h-10 px-3 border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm bg-[var(--color-bg-base)] focus:outline-none focus:border-[var(--color-accent)] font-mono"
                />
                <span className="text-[11px] text-[var(--color-text-muted)] mt-0.5 block">
                  Displayed on the banner and payment page as the total due.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1">
                  Billing Reason / Notes - Optional
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly subscription renewal for November"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="w-full h-10 px-3 border border-[var(--color-border)] rounded-[var(--radius-md)] text-sm bg-[var(--color-bg-base)] focus:outline-none focus:border-[var(--color-accent)]"
                />
                <span className="text-[11px] text-[var(--color-text-muted)] mt-0.5 block">
                  Explanation or invoice note shown to the client.
                </span>
              </div>

              <div className="pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
                <div>
                  {(paymentModalBiz.isPaymentLocked || paymentModalBiz.paymentStatus === 'warning') && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetBiz = paymentModalBiz;
                        setPaymentModalBiz(null);
                        handleClearPaymentStatus(targetBiz);
                      }}
                      className="px-3 h-9 rounded-[var(--radius-md)] text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 cursor-pointer"
                    >
                      Clear & Set Normal
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentModalBiz(null)}
                    disabled={submittingLock}
                    className="px-4 h-9 rounded-[var(--radius-md)] text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLock}
                    className={`px-4 h-9 rounded-[var(--radius-md)] text-xs font-semibold text-white cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5 ${
                      modalMode === 'warning'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {modalMode === 'warning' ? (
                      <>
                        <Bell className="w-3.5 h-3.5" />
                        {submittingLock ? 'Activating Warning...' : 'Activate Warning Banner'}
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        {submittingLock ? 'Activating Lock...' : 'Lock Business'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
