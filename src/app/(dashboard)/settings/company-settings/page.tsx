"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Company Settings is not a separate page — it is the "Company Profile" tab
 * inside Personal Settings. This page immediately redirects there so that
 * clicking "Company Settings" in the sidebar lands on the same unified page
 * with the Company Profile tab already active.
 */
export default function CompanySettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/personal-settings?tab=company-profile");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-[#087f70]" />
    </div>
  );
}
