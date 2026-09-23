"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ChevronRight, Settings2 } from "lucide-react";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorLegalEntityPanel } from "@/components/vendors/VendorLegalEntityPanel";
import { useAxios } from "@/hooks/useAxios";
import { asRecord, getString } from "@/lib/types/api-error";

function VendorConfigurationPage() {
  const { vendorId } = useParams() as { vendorId: string };
  const axiosInstance = useAxios();
  const [vendorName, setVendorName] = useState("Vendor");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) return;

    const loadVendor = async () => {
      try {
        const response = await axiosInstance.get(`/vendors/${vendorId}`);
        const vendor = asRecord(response.data?.data);
        const profile = asRecord(vendor.profile);
        setVendorName(
          getString(vendor.legalName) ||
            getString(vendor.displayName) ||
            getString(profile.legalName) ||
            getString(profile.displayName) ||
            "Vendor",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadVendor();
  }, [axiosInstance, vendorId]);

  if (loading) {
    return <div className="space-y-5"><Skeleton className="h-5 w-80" /><Skeleton className="h-12 w-1/3" /><Skeleton className="h-[420px] w-full rounded-[14px]" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-[#68726d]">
        <Link href="/vendors" className="hover:text-[#087f70]">Vendors</Link>
        <ChevronRight className="h-3.5 w-3.5 text-[#a0aaa5]" />
        <Link href={`/vendors/${vendorId}`} className="max-w-[240px] truncate hover:text-[#087f70]">{vendorName}</Link>
        <ChevronRight className="h-3.5 w-3.5 text-[#a0aaa5]" />
        <span className="font-semibold text-[#0b100e]">Entity configuration</span>
      </nav>

      <div className="flex flex-col gap-4 border-b border-black/[0.08] pb-5 md:flex-row md:items-end md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f7f2] text-[#087f70]"><Settings2 className="h-5 w-5" /></div>
          <div>
            <h1 className="text-[20px] font-semibold text-[#0b100e]">Vendor configuration</h1>
            <p className="mt-1 text-[13px] text-[#68726d]">Manage sites and the legal entities that can transact with {vendorName}.</p>
          </div>
        </div>
        <div className="flex w-fit items-center gap-1 rounded-[10px] border border-black/[0.08] bg-white p-1 shadow-sm">
          <Link href={`/vendors/${vendorId}`} className="rounded-[7px] px-3 py-2 text-[12px] font-semibold text-[#5e6863] transition-colors hover:bg-[#f5f7f6] hover:text-[#0b100e]">Profile</Link>
          <span className="rounded-[7px] bg-[#e8f7f2] px-3 py-2 text-[12px] font-semibold text-[#087f70]">Entity configuration</span>
        </div>
      </div>

      <VendorLegalEntityPanel vendorId={vendorId} axiosInstance={axiosInstance} />
    </div>
  );
}

export default withPermissions(VendorConfigurationPage, [
  { resource: "vendor.entity_configuration", action: "manage" },
]);
