import { useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

export interface ValidationError {
    row: number;
    field: string;
    value?: string;
    message: string;
}

export interface ValidationDuplicate {
    row: number;
    field: string;
    value: string;
    message: string;
    actionable?: boolean;
    allowedActions?: ("update_existing" | "skip_existing")[];
}

export interface ValidationSummary {
    totalRows: number;
    validRows: number;
    errorRows: number;
    duplicateRows: number;
    warningRows: number;
    errorCount: number;
    duplicateCount: number;
    warningCount: number;
}

export interface ValidationResult {
    valid: boolean;
    summary: ValidationSummary;
    errors: ValidationError[];
    duplicates: ValidationDuplicate[];
    warnings: ValidationError[];
}

interface BulkValidateResponse {
    message: string;
    status: number;
    data: ValidationResult;
}

export const useBulkValidateApi = () => {
    const axiosInstance = useAxios();

    return useMutation<BulkValidateResponse, Error, { file: File; duplicateStrategy?: "skip_existing" | "update_existing" }>({
        retry: false,
        mutationFn: async ({ file, duplicateStrategy }) => {
            const formData = new FormData();
            formData.append("file", file);
            const url = API_KEYS.COMPANY.BULK_IMPORT_VALIDATE(duplicateStrategy);
            const res = await axiosInstance.post(url, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data;
        },
    });
};
