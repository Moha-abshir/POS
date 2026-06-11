import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuthStore } from '../stores/auth.store';

export const OnboardingModal: React.FC = () => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);

    try {
      await api.put('/auth/onboarding', formData);
      
      // Update auth store with new user data
      if (user && accessToken) {
        setAuth({
          ...user,
          firstName: formData.firstName,
          lastName: formData.lastName,
          mobileNumber: formData.mobileNumber,
          isSetupComplete: true
        }, accessToken);
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error?.message || 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm">
      <div className="relative bg-[var(--color-bg-surface)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-[700px] m-4 my-8 flex flex-col scale-100 opacity-100 transition-all border border-[var(--color-border)]">
        {/* Header */}
        <div className="flex flex-col items-center justify-center p-8 pb-6 border-b border-[var(--color-border)] text-center">
          <div className="w-16 h-16 bg-[var(--color-accent)] text-white rounded-[var(--radius-lg)] flex items-center justify-center text-3xl font-bold shadow-lg shadow-amber-500/20 mb-4">
            SS
          </div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Welcome to Smart Store POS
          </h2>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)] mt-2">
            Let's set up your personal and business profile to get started.
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-2 gap-6">
            
            {/* Personal Details Section */}
            <div className="col-span-2">
              <h3 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border)] pb-2">
                Personal Details
              </h3>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                First Name *
              </label>
              <input
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. John"
                className="block w-full h-11 px-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Last Name *
              </label>
              <input
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Doe"
                className="block w-full h-11 px-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                Personal Mobile Number *
              </label>
              <input
                name="mobileNumber"
                type="tel"
                required
                value={formData.mobileNumber}
                onChange={handleChange}
                placeholder="e.g. +1 234 567 8900"
                className="block w-full h-11 px-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
              />
            </div>

            {/* Business Details Section */}
            {user?.role === 'OWNER' && (
              <>
                <div className="col-span-2 mt-4">
                  <h3 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-primary)] mb-4 border-b border-[var(--color-border)] pb-2">
                    Business Profile
                  </h3>
                </div>

                <div className="col-span-2">
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                    Organization Name *
                  </label>
                  <input
                    name="organizationName"
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="e.g. Mohammed Shop"
                    className="block w-full h-11 px-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                    Business Sector *
                  </label>
                  <select
                    name="sector"
                    required
                    value={formData.sector}
                    onChange={handleChange}
                    className="block w-full h-11 px-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                  >
                    <option value="" disabled>Select a sector</option>
                    {sectors.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                    Business Phone *
                  </label>
                  <input
                    name="businessPhone"
                    type="tel"
                    required
                    value={formData.businessPhone}
                    onChange={handleChange}
                    placeholder="Store contact number"
                    className="block w-full h-11 px-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                    Physical Location *
                  </label>
                  <textarea
                    name="location"
                    required
                    rows={2}
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Full store address"
                    className="block w-full p-4 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-[var(--color-accent-subtle)] focus:border-[var(--color-accent)] text-[var(--text-base)] text-[var(--color-text-primary)] outline-none focus:ring-4 transition-colors resize-none"
                  />
                </div>
              </>
            )}
          </div>
          
          {errorMsg && (
            <div className="mt-6 p-4 bg-[var(--color-danger-subtle)] text-[var(--color-danger)] rounded-[var(--radius-md)] text-[var(--text-sm)] font-medium border border-[var(--color-danger)]/20">
              {errorMsg}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 flex items-center justify-center rounded-[var(--radius-lg)] text-[var(--text-base)] font-bold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin w-6 h-6" />
              ) : (
                'Complete Setup & Continue'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
