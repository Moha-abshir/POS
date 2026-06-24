import React from 'react';
import { TeamList } from '../features/team/components/TeamList';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { Navigate } from 'react-router-dom';

export const TeamPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  if (user?.role !== 'OWNER') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-full flex flex-col font-sans">
      <TeamList />
    </div>
  );
};
