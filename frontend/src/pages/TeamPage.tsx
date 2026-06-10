import React from 'react';
import { TeamList } from '../features/team/components/TeamList';

export const TeamPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col font-sans">
      <TeamList />
    </div>
  );
};
