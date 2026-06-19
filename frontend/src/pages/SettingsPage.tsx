import { AxiosError } from 'axios';
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { api } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { CustomSelect } from '../components/ui/CustomSelect';
import { MpesaSettingsSection } from './components/MpesaSettingsSection';

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
      <div className="p-6 flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Profile & Business Setup</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
              <input
                name="mobileNumber"
                type="tel"
                required
                value={formData.mobileNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {user?.role === 'OWNER' && (
              <>
                <div className="col-span-2 mt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-2 border-b pb-1">Business Details</h3>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                  <input
                    name="organizationName"
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sector *</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Phone *</label>
                  <input
                    name="businessPhone"
                    type="tel"
                    required
                    value={formData.businessPhone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Physical Location *</label>
                  <textarea
                    name="location"
                    required
                    rows={2}
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500 resize-none"
                  />
                </div>
              </>
            )}
          </div>
          
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm border border-green-200">
              {successMsg}
            </div>
          )}

          <div className="pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[120px]"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {user?.role === 'OWNER' && (
        <MpesaSettingsSection />
      )}
    </div>
  );
};
