import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  role: 'OWNER' | 'MANAGER' | 'CASHIER';
  isActive: boolean;
  createdAt: string;
}

export const useTeamMembers = () => {
  return useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: TeamMember[] }>('/users');
      return response.data.data;
    },
  });
};

export const useAddTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; firstName: string; lastName: string; mobileNumber: string; role: 'CASHIER' | 'MANAGER'; }) => {
      const response = await api.post<{ success: boolean; data: TeamMember }>('/users/cashiers', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'OWNER' | 'MANAGER' | 'CASHIER' }) => {
      const response = await api.patch<{ success: boolean; data: TeamMember }>(`/users/${id}/role`, { role });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });
};
