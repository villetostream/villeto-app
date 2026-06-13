import { useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";

export interface Member {
    id: string;
    name: string;
    username: string;
    avatar?: string;
}

export interface CreateDepartmentPayload {
    departmentName: string;
    description: string;
    departmentCode?: string;
    membersIds?: string[];
    departmentHeadId?: string;
    managerId?: string;
    id?: number | string;
    isActive?: boolean

}

interface Response {
    data: {
        [key: string]: string | number | boolean;
    };
    error: {
        error: string;
        message?: string;
        success: boolean;
    };
    message: string;
    status: number;
    statusCode: number;
    statusText: string;
}

export const useCreateDepartmentApi = () => {
    const axiosInstance = useAxios();

    return useMutation<Response, Error, CreateDepartmentPayload>({
        retry: false,
        mutationFn: async (payload: CreateDepartmentPayload) => {
            const res = await axiosInstance.post(API_KEYS.DEPARTMENT.DEPARTMENTS, payload);
            return res.data;
        },
    });
};