import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { useAuthStore } from "@/stores/auth-stores";

interface CompanyUpdatePayload {
  logo?: File | string;
  companyName?: string;
  website?: string;
  contactPhone?: string;
  countryOfRegistration?: string;
  [key: string]: unknown;
}

interface Response {
  data: {
    [key: string]: string | number | boolean;
  };
  error?: {
    error: string;
    message?: string;
    success: boolean;
  };
  message: string;
  status: number;
  statusCode: number;
  statusText: string;
}

export const useUpdateCompanyDetailsApi = (): UseMutationResult<
  Response,
  Error,
  CompanyUpdatePayload
> => {
  const axiosInstance = useAxios();
  const user = useAuthStore((state) => state.user);

  return useMutation<Response, Error, CompanyUpdatePayload>({
    retry: false,
    mutationFn: async (payload: CompanyUpdatePayload) => {
      const companyId =
        user?.companyId ??
        (typeof user?.company?.companyId === "string" ? user.company.companyId : undefined) ??
        (typeof user?.company?.id === "string" ? user.company.id : undefined);
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      // Helper function to extract pure base64 string from data URL
      const extractBase64 = (dataUrl: string): string => {
        // Remove data:image/...;base64, prefix if present
        const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
        return base64Match ? base64Match[1] : dataUrl;
      };

      // Convert logo File to Base64 if it's a File instance
      let logoBase64: string | undefined = undefined;
      if (payload.logo instanceof File) {
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Extract pure base64 string (remove data:image/...;base64, prefix)
            const pureBase64 = extractBase64(result);
            resolve(pureBase64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(payload.logo as File);
        });
      } else if (typeof payload.logo === "string") {
        // If it's already a string, extract pure base64 if it's a data URL
        logoBase64 = extractBase64(payload.logo);
      }

      // Prepare the payload for API
      const apiPayload: Record<string, unknown> = {};
      
      // Add all fields except logo
      Object.keys(payload).forEach((key) => {
        if (
          key !== "logo" &&
          payload[key as keyof typeof payload] !== undefined
        ) {
          const value = payload[key as keyof typeof payload];
          if (value !== null && value !== undefined) {
            apiPayload[key] = value;
          }
        }
      });

      // Add logo as pure base64 string (no data URL prefix)
      if (logoBase64) {
        apiPayload.logo = logoBase64;
      }

      const res = await axiosInstance.patch(
        API_KEYS.COMPANY.COMPANY_DETAILS(companyId),
        apiPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return res.data;
    },
  });
};
