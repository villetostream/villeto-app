import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAxios } from '@/hooks/useAxios';
import { workspaceQueryKey } from '@/features/entity-workspace/store';
import { unwrap } from '@/features/bill-pay/shared/query-utils';
import type { PaginatedResult } from '@/features/bill-pay/shared/types';
import type { RecurringCadence } from './recurring';

export interface RecurringCardSubscription {
  recurringCardSubscriptionId: string;
  legalEntityId: string;
  ownerUserId: string;
  merchantName: string;
  description: string;
  cadence: RecurringCadence;
  firstExpectedChargeDate: string;
  endDate: string | null;
  currency: string;
  expectedAmount: string | null;
  variancePercent: string | null;
  status: 'draft' | 'active' | 'paused' | 'ended';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringCardInput {
  legalEntityId: string;
  merchantName: string;
  description: string;
  cadence: RecurringCadence;
  firstExpectedChargeDate: string;
  endDate?: string | null;
  expectedAmount?: string | null;
  variancePercent?: number | null;
}

const cardKey = workspaceQueryKey(['bill-pay', 'recurring-card-subscriptions']);

export function useRecurringCardSubscriptions(params: {
  legalEntityId: string; status?: string; cadence?: string; search?: string; page?: number; limit?: number;
}, active = true) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(['bill-pay', 'recurring-card-subscriptions', 'list', params]),
    queryFn: async ({ signal }) => unwrap<PaginatedResult<RecurringCardSubscription>>(
      (await axios.get('/bill-pay/recurring-card-subscriptions', { params, signal })).data,
    ),
    enabled: Boolean(active && params.legalEntityId && params.legalEntityId !== 'all'),
  });
}

export function useRecurringCardSubscription(id: string) {
  const axios = useAxios();
  return useQuery({
    queryKey: workspaceQueryKey(['bill-pay', 'recurring-card-subscriptions', id]),
    queryFn: async ({ signal }) => unwrap<RecurringCardSubscription>(
      (await axios.get(`/bill-pay/recurring-card-subscriptions/${id}`, { signal })).data,
    ),
    enabled: Boolean(id),
  });
}

export function useCreateRecurringCardSubscription() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: RecurringCardInput) => unwrap<RecurringCardSubscription>(
      (await axios.post('/bill-pay/recurring-card-subscriptions', input)).data,
    ),
    onSuccess: () => client.invalidateQueries({ queryKey: cardKey }),
  });
}

export function useUpdateRecurringCardSubscription() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<RecurringCardInput> & { id: string; expectedVersion: number }) =>
      unwrap<RecurringCardSubscription>((await axios.patch(`/bill-pay/recurring-card-subscriptions/${id}`, input)).data),
    onSuccess: () => client.invalidateQueries({ queryKey: cardKey }),
  });
}

export function useEndRecurringCardSubscription() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => unwrap<RecurringCardSubscription>(
      (await axios.post(`/bill-pay/recurring-card-subscriptions/${id}/end`)).data,
    ),
    onSuccess: () => client.invalidateQueries({ queryKey: cardKey }),
  });
}
