import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { ValidationResult } from "./bulk-validate";

export interface ManualEmployee {
    employee_external_id?: string;
    first_name: string;
    last_name: string;
    email: string;
    manager_external_id?: string;
    department_name?: string;
    department_external_id?: string;
    job_title?: string;
    management_level?: string;
    job_grade?: string;
    business_unit?: string;
    location?: string;
    employment_type?: string;
    status?: string;
    effective_date?: string;
}

export interface ManualValidateResponse {
    message: string;
    status: number;
    data: ValidationResult;
}

export const useValidateManualEmployee = () => {
    const axiosInstance = useAxios();

    return useMutation<ManualValidateResponse, Error, { employees: ManualEmployee[] }>({
        retry: false,
        mutationFn: async (payload) => {
            const res = await axiosInstance.post(API_KEYS.COMPANY.BULK_MANUAL_VALIDATE, payload);
            return res.data;
        },
    });
};

export const useSubmitManualEmployee = () => {
    const axiosInstance = useAxios();
    const queryClient = useQueryClient();

    return useMutation<any, Error, { employees: ManualEmployee[]; duplicateStrategy?: "skip_existing" | "update_existing" }>({
        retry: false,
        mutationFn: async ({ employees, duplicateStrategy }) => {
            const res = await axiosInstance.post(API_KEYS.COMPANY.BULK_MANUAL(duplicateStrategy), { 
                employees, 
                ...(duplicateStrategy ? { duplicateStrategy } : {}) 
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.users() });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.directoryUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.invitedUsers });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.uninvitedUsers });
        },
    });
};

export const useImportReferences = (type: "job_grades" | "management_levels", enabled = true) => {
    const axiosInstance = useAxios();

    return useQuery<{ data: any }>({
        queryKey: ["import-references", type],
        queryFn: async () => {
            const res = await axiosInstance.get(API_KEYS.COMPANY.IMPORT_REFERENCES(type));
            return res.data;
        },
        enabled,
    });
};
