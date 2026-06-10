import React from 'react';
import { LoginForm } from '../features/auth/components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <div className="mx-auto h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
          <span className="text-white text-2xl font-bold">POS</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900">
          Hardware Store POS
        </h1>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex justify-center">
        <LoginForm />
      </div>
    </div>
  );
};
