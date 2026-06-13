
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { AppUser } from "@/queries/departments/get-all-departments";
import { isRecord } from "@/lib/types/api-error";

/** Formats a string like "CONTROLLING_OFFICER" or "senior-manager" to "Controlling Officer" or "Senior Manager" */
function formatName(value: string | null | undefined): string {
    if (!value) return "—";
    return value
        .replace(/[_-]/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

function getDepartmentName(dept: unknown): string {
    if (!dept) return "—";
    if (typeof dept === "string") return dept || "—";
    if (isRecord(dept)) {
        const name = dept.departmentName ?? dept.name;
        if (typeof name === "string" && name) return name;
    }
    return "—";
}

const columnHelper = createColumnHelper<AppUser>();

export const directoryColumns = [
    columnHelper.display({
        id: "idNo",
        header: "S/N",
        cell: (info) => {
            const rowNum = String(info.row.index + 1).padStart(2, '0');
            return <p className="text-sm">{rowNum}</p>;
        },
    }),
    columnHelper.accessor("firstName", {
        header: "DETAILS",
        cell: (info) => {
            const firstName = info.getValue() || "";
            const lastName = info.row.original.lastName || "";
            const email = info.row.original.email || "";
            const fullName = `${firstName} ${lastName}`.trim() || "-";
            
            return (
                <div className="flex flex-col">
                    <p className="capitalize font-medium">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{email}</p>
                </div>
            );
        },
    }),
    columnHelper.accessor("department", {
        header: "DEPARTMENT",
        cell: (info) => {
            const dept = info.getValue() as unknown;
            return <p className="capitalize">{getDepartmentName(dept)}</p>;
        },
    }),
    columnHelper.accessor("position", {
        header: "JOB TITLE",
        cell: (info) => {
            const position = info.getValue();
            const jobTitle = info.row.original.jobTitle;
            const value = jobTitle || position;
            return <p className="text-sm">{formatName(value)}</p>;
        },
    }),
    columnHelper.display({
        id: "manager",
        header: "REPORTS TO",
        cell: (info) => {
            const manager = info.row.original.manager;
            let managerName = "—";
            if (manager && isRecord(manager)) {
                const first = formatName(typeof manager.firstName === "string" ? manager.firstName : null);
                const last = formatName(typeof manager.lastName === "string" ? manager.lastName : null);
                managerName = `${first} ${last}`.trim() || "—";
            } else if (typeof manager === "string" && manager) {
                managerName = formatName(manager);
            }
            return <p className="font-medium">{managerName}</p>;
        },
    }),
    columnHelper.display({
        id: "updatedAt",
        header: "LAST UPDATED",
        cell: (info) => {
            const record = info.row.original as unknown as Record<string, unknown>;
            const date = record.updatedAt;
            if (typeof date !== "string" || !date) return <p className="text-sm text-gray-500">—</p>;
            const formatted = new Date(date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
            return <p className="text-sm text-gray-600">{formatted}</p>;
        },
    }),
    columnHelper.accessor("status", {
        header: "STATUS",
        cell: (info) => {
            const status = info.getValue() as string;
            const isActive = status?.toLowerCase() === "active";
            const statusText = status?.toLowerCase() || "inactive";
            return (
                <Badge variant={isActive ? "active" : "inactive"}>
                    <span className="ml-1 capitalize">{statusText}</span>
                </Badge>
            );
        },
    }),
] as ColumnDef<AppUser>[];
