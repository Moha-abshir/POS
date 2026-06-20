import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Loader2, Plus, Trash2, CheckCircle, Circle, Edit2, Eye, EyeOff } from 'lucide-react';

interface MpesaAccount {
  id: string;
  accountName: string;
  accountType: 'TILL' | 'PAYBILL';
  shortcode: string;
  consumerKey: string;
  environment: 'SANDBOX' | 'PRODUCTION';
  isDefault: boolean;
  isActive: boolean;
}

export const MpesaSettingsSection: React.FC = () => {
  const [accounts, setAccounts] = useState<MpesaAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  
  const [formData, setFormData] = useState({
    accountName: '',
    accountType: 'TILL',
    shortcode: '',
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    environment: 'SANDBOX',
    isDefault: false
  });

  const [error, setError] = useState('');

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/mpesa/settings');
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleOpenModal = (acc?: MpesaAccount) => {
    if (acc) {
      setEditingId(acc.id);
      setFormData({
        accountName: acc.accountName,
        accountType: acc.accountType,
        shortcode: acc.shortcode,
        consumerKey: acc.consumerKey, // masked
        consumerSecret: '••••••••',
        passkey: '••••••••',
        environment: acc.environment,
        isDefault: acc.isDefault
      });
    } else {
      setEditingId(null);
      setFormData({
        accountName: '',
        accountType: 'TILL',
        shortcode: '',
        consumerKey: '',
        consumerSecret: '',
        passkey: '',
        environment: 'SANDBOX',
        isDefault: accounts.length === 0
      });
    }
    setError('');
    setIsRevealed(false);
    setIsModalOpen(true);
  };

  const handleReveal = async () => {
    try {
      setIsRevealing(true);
      setError('');
      const res = await api.get(`/mpesa/settings/${editingId}/reveal`);
      setFormData(prev => ({
        ...prev,
        consumerKey: res.data.consumerKey,
        consumerSecret: res.data.consumerSecret,
        passkey: res.data.passkey
      }));
      setIsRevealed(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reveal credentials');
    } finally {
      setIsRevealing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await api.put(`/mpesa/settings/${editingId}`, formData);
      } else {
        await api.post('/mpesa/settings', formData);
      }
      setIsModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save account');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.patch(`/mpesa/settings/${id}/default`);
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await api.delete(`/mpesa/settings/${id}`);
      fetchAccounts();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl font-semibold text-gray-800">M-Pesa Integration</h2>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center px-3 py-1.5 bg-[var(--color-accent)] text-white rounded hover:opacity-90 transition-opacity text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Account
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
        </div>
      ) : accounts.length === 0 ? (
        <p className="text-gray-500 text-sm py-4">No M-Pesa accounts configured yet.</p>
      ) : (
        <div className="space-y-4 mt-4">
          {accounts.map(acc => (
            <div key={acc.id} className={`flex items-center justify-between p-4 border rounded-lg ${acc.isDefault ? 'border-[var(--color-accent)] bg-orange-50/30' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleSetDefault(acc.id)}
                  className="focus:outline-none"
                  title="Set as default"
                >
                  {acc.isDefault ? (
                    <CheckCircle className="w-6 h-6 text-[var(--color-accent)]" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 hover:text-gray-400" />
                  )}
                </button>
                <div>
                  <h3 className="font-medium text-gray-900 flex items-center gap-2">
                    {acc.accountName} 
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{acc.accountType}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${acc.environment === 'PRODUCTION' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {acc.environment}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500">Shortcode: {acc.shortcode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenModal(acc)} className="p-2 text-gray-400 hover:text-[var(--color-accent)] transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(acc.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editingId ? 'Edit Account' : 'Add M-Pesa Account'}</h3>
            
            {error && <div className="p-3 mb-4 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name (e.g. Main Till)</label>
                <input required type="text" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} className="w-full border rounded p-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={formData.accountType} onChange={e => setFormData({...formData, accountType: e.target.value as any})} className="w-full border rounded p-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]">
                    <option value="TILL">Till Number</option>
                    <option value="PAYBILL">Paybill</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shortcode</label>
                  <input required type="text" value={formData.shortcode} onChange={e => setFormData({...formData, shortcode: e.target.value})} className="w-full border rounded p-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]" />
                </div>
              </div>

              {editingId && !isRevealed && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-center justify-between">
                  <p className="text-sm text-blue-800">Credentials are masked for security.</p>
                  <button 
                    type="button" 
                    onClick={handleReveal}
                    disabled={isRevealing}
                    className="flex items-center text-sm font-medium text-[var(--color-accent)] hover:text-orange-700"
                  >
                    {isRevealing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Eye className="w-4 h-4 mr-1" />}
                    Reveal to Edit
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Key</label>
                <input required type="text" value={formData.consumerKey} onChange={e => setFormData({...formData, consumerKey: e.target.value})} className="w-full border rounded p-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Secret</label>
                <input required type={isRevealed || !editingId ? "text" : "password"} value={formData.consumerSecret} onChange={e => setFormData({...formData, consumerSecret: e.target.value})} className="w-full border rounded p-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Passkey</label>
                <input required type={isRevealed || !editingId ? "text" : "password"} value={formData.passkey} onChange={e => setFormData({...formData, passkey: e.target.value})} className="w-full border rounded p-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                <select value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value as any})} className="w-full border rounded p-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]">
                  <option value="SANDBOX">Sandbox</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>

              {!editingId && (
                <div className="flex items-center">
                  <input type="checkbox" id="isDefault" checked={formData.isDefault} onChange={e => setFormData({...formData, isDefault: e.target.checked})} className="mr-2 text-[var(--color-accent)] focus:ring-[var(--color-accent)] rounded" />
                  <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Set as default account</label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[var(--color-accent)] text-white rounded hover:opacity-90">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
