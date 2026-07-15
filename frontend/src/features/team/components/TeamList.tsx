import React, { useState } from 'react';
import { useTeamMembers, useUpdateUserRole } from '../api/team.api';
import { AddUserModal } from './AddUserModal';
import { Users, ShieldAlert, Check, X } from 'lucide-react';
import { useAuthStore } from '../../auth/stores/auth.store';
import { TableSkeleton } from '../../../components/ui/Loading';
import { toast } from 'react-hot-toast';

export const TeamList: React.FC = () => {
  const { data: team, isLoading, isError, error } = useTeamMembers();
  const updateRoleMutation = useUpdateUserRole();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const currentUser = useAuthStore((state) => state.user);

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<'CASHIER' | 'MANAGER' | 'OWNER'>('CASHIER');

  const handleStartEdit = (memberId: string, currentRole: 'CASHIER' | 'MANAGER' | 'OWNER') => {
    setEditingMemberId(memberId);
    setEditingRole(currentRole);
  };

  const handleSaveRole = async (id: string) => {
    try {
      await updateRoleMutation.mutateAsync({ id, role: editingRole });
      setEditingMemberId(null);
      toast.success('User role updated successfully');
    } catch (err) {
      toast.error('Failed to update user role');
    }
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
  };

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 bg-[var(--color-bg-base)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl md:text-[var(--text-xl)] font-bold text-[var(--color-text-primary)] tracking-tight">Team Management</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Manage owners, managers and cashiers for your business</p>
        </div>
        {currentUser?.role === 'OWNER' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto h-10 px-4 flex items-center justify-center rounded-[var(--radius-md)] text-sm md:text-[var(--text-base)] font-semibold text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer select-none"
          >
            + Add Team Member
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden flex flex-col flex-1">
        
        {isLoading ? (
          <TableSkeleton rows={4} cols={5} />
        ) : isError ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16">
            <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-600">Failed to load team</h3>
            <p className="text-sm text-gray-500 mt-1">
              {(error as any)?.response?.data?.message || (error as any)?.response?.data?.error?.message || (error as any)?.message || 'An unexpected error occurred'}
            </p>
          </div>
        ) : (!team || team.length === 0) ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16">
            <Users className="w-12 h-12 text-[var(--color-text-muted)] mb-4" />
            <h3 className="text-[var(--text-lg)] font-semibold text-[var(--color-text-secondary)]">No team members yet</h3>
            <p className="text-[var(--text-sm)] text-[var(--color-text-muted)] mt-1">Add a team member to allow them to log in.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border-strong)] bg-[var(--color-bg-surface)]">
                  <th scope="col" className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-[var(--text-sm)] font-medium text-[var(--color-text-muted)] whitespace-nowrap">Email</th>
                  <th scope="col" className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-[var(--text-sm)] font-medium text-[var(--color-text-muted)] whitespace-nowrap">Role</th>
                  <th scope="col" className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-[var(--text-sm)] font-medium text-[var(--color-text-muted)] whitespace-nowrap">Status</th>
                  <th scope="col" className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-[var(--text-sm)] font-medium text-[var(--color-text-muted)] whitespace-nowrap">Added</th>
                  {currentUser?.role === 'OWNER' && (
                    <th scope="col" className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-[var(--text-sm)] font-medium text-[var(--color-text-muted)] text-right whitespace-nowrap">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {team.map((member, idx) => (
                  <tr 
                    key={member.id} 
                    className={`hover:bg-[var(--color-bg-sunken)] transition-colors ${idx % 2 !== 0 ? 'bg-[var(--color-bg-sunken)]' : 'bg-[var(--color-bg-surface)]'}`}
                  >
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      <div className="font-medium text-sm text-[var(--color-text-primary)]">
                        {member.email}
                        {currentUser?.id === member.id && (
                          <span className="ml-2 text-[10px] md:text-[var(--text-xs)] text-[var(--color-text-muted)]">(You)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      {editingMemberId === member.id ? (
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as any)}
                          className="h-8 px-2 bg-white border border-[var(--color-border)] rounded-[var(--radius-sm)] text-xs text-[var(--color-text-primary)] outline-none"
                        >
                          <option value="CASHIER">Cashier</option>
                          <option value="MANAGER">Store Manager</option>
                        </select>
                      ) : member.role === 'OWNER' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] md:text-[var(--text-xs)] font-medium bg-[var(--color-info-bg)] text-[var(--color-info)]">
                          Owner
                        </span>
                      ) : member.role === 'MANAGER' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] md:text-[var(--text-xs)] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                          Store Manager
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] md:text-[var(--text-xs)] font-medium bg-[var(--color-bg-sunken)] text-[var(--color-text-secondary)]">
                          Cashier
                        </span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 whitespace-nowrap">
                      {member.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] md:text-[var(--text-xs)] font-medium bg-[var(--color-success-bg)] text-[var(--color-success)]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-full)] text-[10px] md:text-[var(--text-xs)] font-medium bg-[var(--color-danger-bg)] text-[var(--color-danger)]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-[var(--text-sm)] text-[var(--color-text-secondary)] whitespace-nowrap">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    {currentUser?.role === 'OWNER' && (
                      <td className="px-4 md:px-6 py-2 text-right whitespace-nowrap space-x-2">
                        {member.role !== 'OWNER' && member.id !== currentUser.id && (
                          editingMemberId === member.id ? (
                            <>
                              <button
                                onClick={() => handleSaveRole(member.id)}
                                disabled={updateRoleMutation.isPending}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer border border-emerald-100"
                                title="Save Role"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors inline-flex items-center justify-center cursor-pointer border border-gray-100"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStartEdit(member.id, member.role)}
                              className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/50 rounded-md transition-colors cursor-pointer"
                              title="Change Role"
                            >
                              Change Role
                            </button>
                          )
                        )}
                      </td>
                    )}
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
