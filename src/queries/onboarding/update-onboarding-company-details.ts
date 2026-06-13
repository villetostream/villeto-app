import { z } from "zod";
import { type UseMutationResult, useMutation } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { useOnboardingStore } from "@/stores/useVilletoStore";
import { onboardingBusinessSchema } from "@/lib/schemas/schemas";

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

type payload = z.infer<typeof onboardingBusinessSchema>;

export const useUpdateOnboardingCompanyDetailsApi = (): UseMutationResult<
  Response,
  Error,
  payload
> => {
  const axiosInstance = useAxios();

  return useMutation<Response, Error, payload>({
    retry: false,
    mutationFn: async (payload: payload) => {
      const { onboardingId } = useOnboardingStore.getState();
      const latestPayload = { ...payload };
      delete latestPayload.business_name;

      const extractBase64 = (dataUrl: string): string => {
        if (dataUrl.includes("base64,")) {
          return dataUrl.split("base64,")[1];
        } else if (dataUrl.includes(",")) {
          return dataUrl.split(",")[1];
        }
        return dataUrl;
      };

      let logoBase64: string | undefined = undefined;
      if (latestPayload.businessLogo instanceof File) {
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(extractBase64(result));
          };
          reader.onerror = reject;
          reader.readAsDataURL(latestPayload.businessLogo as File);
        });
      } else if (
        typeof latestPayload.businessLogo === "string" &&
        latestPayload.businessLogo.startsWith("data:")
      ) {
        logoBase64 = extractBase64(latestPayload.businessLogo);
      }

      const apiPayload: Record<string, unknown> = {};

      Object.keys(latestPayload).forEach((key) => {
        if (
          key !== "businessLogo" &&
          latestPayload[key as keyof typeof latestPayload] !== undefined
        ) {
          const value = latestPayload[key as keyof typeof latestPayload];
          if (value !== null && value !== undefined) {
            apiPayload[key] = value;
          }
        }
      });

      if (logoBase64) {
        apiPayload.logo = logoBase64;
      }

      const res = await axiosInstance.patch(
        API_KEYS.ONBOARDING.ONBOARDING_COMPANY_DETAILS(onboardingId),
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
