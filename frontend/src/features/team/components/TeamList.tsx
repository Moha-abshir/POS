import React, { useState } from 'react';
import { useTeamMembers } from '../api/team.api';
import { AddUserModal } from './AddUserModal';
import { Users } from 'lucide-react';
import { useAuthStore } from '../../auth/stores/auth.store';
import { TableSkeleton } from '../../../components/ui/Loading';

export const TeamList: React.FC = () => {
  const { data: team, isLoading } = useTeamMembers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col flex-1 p-6 bg-[var(--color-bg-base)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[var(--text-xl)] font-bold text-[var(--color-text-primary)] tracking-tight">Team Management</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Manage owners and cashiers for your business</p>
        </div>
        {currentUser?.role === 'OWNER' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-4 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-base)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer select-none"
          >
            + Add Cashier
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden flex flex-col flex-1">
        
        {isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (!team || team.length === 0) ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16">
            <Users className="w-12 h-12 text-[var(--color-text-muted)] mb-4" />
            <h3 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-secondary)]">No team members yet</h3>
            <p className="text-[var(--text-sm)] text-[var(--color-text-muted)] mt-1">Add a cashier to allow them to log in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-strong)] bg-[var(--color-bg-surface)]">
                  <th scope="col" className="px-6 py-4 text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">Email</th>
                  <th scope="col" className="px-6 py-4 text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">Role</th>
                  <th scope="col" className="px-6 py-4 text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">Status</th>
                  <th scope="col" className="px-6 py-4 text-[var(--text-sm)] font-medium text-[var(--color-text-muted)]">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {team.map((member, idx) => (
                  <tr 
                    key={member.id} 
                    className={`hover:bg-[var(--color-bg-sunken)] transition-colors ${idx % 2 !== 0 ? 'bg-[var(--color-bg-sunken)]' : 'bg-[var(--color-bg-surface)]'}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--color-text-primary)]">
                        {member.email}
                        {currentUser?.id === member.id && (
                          <span className="ml-2 text-[var(--text-xs)] text-[var(--color-text-muted)]">(You)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.role === 'OWNER' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-full)] text-[var(--text-xs)] font-medium bg-[var(--color-info-bg)] text-[var(--color-info)]">
                          Owner
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-full)] text-[var(--text-xs)] font-medium bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]">
                          Cashier
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {member.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-full)] text-[var(--text-xs)] font-medium bg-[var(--color-success-bg)] text-[var(--color-success)]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-full)] text-[var(--text-xs)] font-medium bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
