import { AxiosError } from 'axios';
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/Loading';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { api } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { CustomSelect } from '../components/ui/CustomSelect';
import { MpesaSettingsSection } from './components/MpesaSettingsSection';
import { AppearanceSettingsSection } from './components/AppearanceSettingsSection';
import { PrinterSettingsSection } from './components/PrinterSettingsSection';
import { ProductModeSettingsSection } from './components/ProductModeSettingsSection';

export const SettingsPage: React.FC = () => {
  const { user, accessToken, setAuth } = useAuthStore();
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    mobileNumber: user?.mobileNumber || '',
    organizationName: '',
    sector: '',
    businessPhone: '',
    location: '',
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: meData, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    }
  });

  React.useEffect(() => {
    if (meData) {
      setFormData({
        firstName: meData.user?.firstName || '',
        lastName: meData.user?.lastName || '',
        mobileNumber: meData.user?.mobileNumber || '',
        organizationName: meData.business?.name || '',
        sector: meData.business?.sector || '',
        businessPhone: meData.business?.phone || '',
        location: meData.business?.location || '',
      });
    }
  }, [meData]);

  const sectors = [
    'Retail and Supermarket',
    'Hardware and Constructions',
    'Pharmacy and Healthcare',
    'Automotive and Spare Parts',
    'Other Services'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      await api.put('/auth/onboarding', formData);
      
      if (user && accessToken) {
        setAuth({
          ...user,
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobileNumber: formData.mobileNumber,
          isSetupComplete: true
        }, accessToken);
      }
      setSuccessMsg('Settings updated successfully.');
    } catch (err) {
      setErrorMsg((err as AxiosError<{ error: { message: string } }>).response?.data?.error?.message || 'Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Settings</h1>
      
      <div className="bg-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--color-border)] p-5 md:p-8">
        <h2 className="text-base md:text-lg font-semibold mb-4 md:mb-6 text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-2 md:pb-3">Profile & Business Setup</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">First Name *</label>
              <input
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Last Name *</label>
              <input
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Mobile Number *</label>
              <input
                name="mobileNumber"
                type="tel"
                required
                value={formData.mobileNumber}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all"
              />
            </div>

            {user?.role === 'OWNER' && (
              <>
                <div className="col-span-2 mt-4 md:mt-6">
                  <h3 className="text-sm md:text-base font-semibold text-[var(--color-text-primary)] mb-3 md:mb-4 border-b border-[var(--color-border)] pb-2">Business Details</h3>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Organization Name *</label>
                  <input
                    name="organizationName"
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Sector *</label>
                  <CustomSelect
                    name="sector"
                    required
                    label="Select a sector"
                    options={sectors.map(s => ({ id: s, name: s }))}
                    value={formData.sector}
                    onChange={handleChange as any}
                    className="bg-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Business Phone *</label>
                  <input
                    name="businessPhone"
                    type="tel"
                    required
                    value={formData.businessPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">Physical Location *</label>
                  <textarea
                    name="location"
                    required
                    rows={2}
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] outline-none focus:bg-white focus:ring-4 focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] transition-all resize-none"
                  />
                </div>
              </>
            )}
          </div>
          
          {errorMsg && (
            <div className="p-3 bg-[var(--color-danger-bg)] text-[var(--color-danger)] rounded-[var(--radius-md)] text-sm border border-[var(--color-danger-bg)]">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-[var(--radius-md)] text-sm border border-[var(--color-success-bg)]">
              {successMsg}
            </div>
          )}

          <div className="pt-6 border-t border-[var(--color-border)]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 disabled:opacity-50 transition-all select-none cursor-pointer flex items-center justify-center min-w-[120px]"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {user?.role === 'OWNER' && (
        <ProductModeSettingsSection />
      )}

      <PrinterSettingsSection />

      <AppearanceSettingsSection />

      {user?.role === 'OWNER' && (
        <MpesaSettingsSection />
      )}
    </div>
  );
};
