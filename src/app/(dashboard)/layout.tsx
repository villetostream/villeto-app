import DashboardLayoutContent from "@/components/dashboard/layout/DashboardLayoutContent";
import { cookies } from "next/headers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

    return (
        <DashboardLayoutContent defaultOpen={defaultOpen}>
            {children}
        </DashboardLayoutContent>
    );
}