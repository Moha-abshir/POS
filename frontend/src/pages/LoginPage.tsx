import React from 'react';
import { LoginForm } from '../features/auth/components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="mx-auto h-16 w-16 bg-[var(--color-bg-sidebar)] rounded-[var(--radius-lg)] flex items-center justify-center mb-6 shadow-[var(--shadow-sm)]">
          <span className="text-[var(--color-accent)] text-2xl font-bold">HW</span>
        </div>
        <h1 className="text-[var(--text-2xl)] font-bold text-[var(--color-text-primary)] tracking-tight">
          Hardware Store POS
        </h1>
        <p className="mt-2 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          Secure terminal access
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-center px-4 sm:px-0">
        <LoginForm />
      </div>
    </div>
  );
};
