"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAxios } from "@/hooks/useAxios";
import { workspaceQueryKey } from "@/features/entity-workspace/store";
import { useAuthStore } from "@/stores/auth-stores";
export function VendorSummary() {
  const { vendorId } = useParams() as { vendorId: string };
  const axios = useAxios();
  const canManage = useAuthStore((state) =>
    state.can("vendor.entity_configuration", "manage"),
  );
  const {
    data: vendor,
    isPending,
    isError,
  } = useQuery({
    queryKey: workspaceQueryKey(["vendor-management", vendorId]),
    queryFn: async () =>
      (await axios.get(`/vendor-management/${vendorId}`)).data.data,
  });
  if (isPending) return <p>Loading vendor…</p>;
  if (isError)
    return <p role="alert">Could not load this organization vendor.</p>;
  return (
    <div className="space-y-5">
      <Link href="/vendors" className="text-sm underline">
        Organization vendors
      </Link>
      <h1 className="text-2xl font-semibold">{vendor.legalName}</h1>
      <p>{vendor.email}</p>
      <p>
        Supplier onboarding: {vendor.onboardingStatus}. Organization approval:{" "}
        {vendor.approvalStatus || "Not reviewed"}.
      </p>
      <p>
        This supplier profile is shared across your organization. Each legal
        entity has its own approval, sites and operating controls.
      </p>
      {canManage && (
        <Link
          href={`/vendors/${vendorId}/configuration`}
          className="inline-block rounded bg-[#087f70] px-4 py-2 text-white"
        >
          Manage legal-entity relationships
        </Link>
      )}
    </div>
  );
}
