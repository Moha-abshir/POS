import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';

export const useEnableBanking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.put('/businesses/settings/banking');
      return response.data;
    },
    onSuccess: () => {
      // We might need to refresh auth session or something since isBankingEnabled is tied to user token?
      // Actually, updating the local auth store would be ideal. We can do that in the component.
    }
  });
};
