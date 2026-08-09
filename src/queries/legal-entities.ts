import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

export type LegalEntityStatus = "active" | "inactive";
export type LegalEntityReadiness =
  | "provisional"
  | "procurement_ready"
  | "accounting_ready"
  | "payment_workflow_ready";

export interface LegalEntity {
  legalEntityId: string;
  code: string;
  legalName: string;
  countryOfRegistration: string;
  registeredAddress: string;
  baseCurrency: string;
  taxId?: string | null;
  registrationId?: string | null;
  isDefault: boolean;
  status: LegalEntityStatus;
  readinessStatus: LegalEntityReadiness;
  readinessBlockers: string[];
}

export interface LegalEntityInput {
  code: string;
  legalName: string;
  countryOfRegistration: string;
  registeredAddress: string;
  baseCurrency: string;
  taxId?: string;
  registrationId?: string;
  isDefault?: boolean;
}

export interface Currency {
  code: string;
  name: string;
  minorUnits: number;
}

const key = ["legal-entities"] as const;

export function useLegalEntities(options?: { enabled?: boolean }) {
  const axios = useAxios();
  return useQuery<{ data: LegalEntity[] }>({
    queryKey: key,
    queryFn: async () => (await axios.get(API_KEYS.LEGAL_ENTITY.LIST)).data,
    enabled: options?.enabled,
  });
}

export function useCurrencies() {
  const axios = useAxios();
  return useQuery<{ data: Currency[] }>({
    queryKey: ["reference-currencies"],
    queryFn: async () =>
      (await axios.get(API_KEYS.LEGAL_ENTITY.CURRENCIES)).data,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useCreateLegalEntity() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: LegalEntityInput) =>
      (await axios.post(API_KEYS.LEGAL_ENTITY.LIST, input)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateLegalEntity(id: string) {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LegalEntityInput>) =>
      (await axios.patch(API_KEYS.LEGAL_ENTITY.DETAIL(id), input)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useSetDefaultLegalEntity() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await axios.patch(API_KEYS.LEGAL_ENTITY.DEFAULT(id))).data,
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useSetLegalEntityStatus() {
  const axios = useAxios();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LegalEntityStatus }) =>
      (await axios.patch(API_KEYS.LEGAL_ENTITY.STATUS(id), { status })).data,
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
