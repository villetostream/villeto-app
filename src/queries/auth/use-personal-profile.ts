import { useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { useAuthStore, type User } from "@/stores/auth-stores";

export function usePersonalProfile() {
  const client = useAxios();
  const user = useAuthStore((s) => s.user);
  const companyId = user?.companyId || user?.company?.companyId;
  return useQuery({
    queryKey: ["personal-profile", companyId, user?.userId],
    enabled: !!companyId && !!user?.userId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const response = await client.get("/users/me", { params: { view: "profile" }, signal });
      return (response.data?.data ?? response.data) as Partial<User>;
    },
  });
}
