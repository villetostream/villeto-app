
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
    columnHelper.accessor("employeeExternalId", {
        header: "EMPLOYEE ID",
        cell: (info) => <p className="font-medium text-sm">{(info.getValue() as string) || "—"}</p>,
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
                    <p className="capitalize font-medium text-sm">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{email}</p>
                </div>
            );
        },
    }),
    columnHelper.accessor("department", {
        header: "DEPARTMENT",
        cell: (info) => {
            const dept = info.getValue();
            return <p className="capitalize text-sm">{getDepartmentName(dept)}</p>;
        },
    }),
    columnHelper.display({
        id: "manager",
        header: "REPORTS TO",
        cell: (info) => {
            const manager = info.row.original.manager;
            let managerName = "—";
            if (manager && typeof manager === "object" && "name" in manager && manager.name) {
                managerName = manager.name;
            } else if (manager && typeof manager === "object" && "firstName" in manager) {
                const first = typeof manager.firstName === "string" ? manager.firstName : "";
                const last = typeof manager.lastName === "string" ? manager.lastName : "";
                managerName = `${first} ${last}`.trim() || "—";
            } else if (typeof manager === "string" && manager) {
                managerName = formatName(manager);
            }
            return <p className="font-medium text-sm">{managerName}</p>;
        },
    }),
    columnHelper.accessor("businessUnit", {
        header: "BUSINESS UNIT",
        cell: (info) => <p className="text-sm">{formatName(info.getValue() as string)}</p>,
    }),
    columnHelper.accessor("location", {
        header: "LOCATION",
        cell: (info) => <p className="text-sm">{(info.getValue() as string) || "—"}</p>,
    }),
    columnHelper.accessor("position", {
        header: "JOB TITLE",
        cell: (info) => {
            const jobTitle = info.row.original.jobTitle;
            return <p className="text-sm">{formatName(jobTitle)}</p>;
        },
    }),
    columnHelper.accessor("managementLevel", {
        header: "MGT. LEVEL",
        cell: (info) => <p className="text-sm">{formatName(info.getValue() as string)}</p>,
    }),
    columnHelper.accessor("jobGrade", {
        header: "JOB GRADE",
        cell: (info) => {
            const grade = info.getValue();
            return <p className="text-sm font-medium">{(grade as any)?.code || "—"}</p>;
        },
    }),
    columnHelper.accessor("employmentType", {
        header: "EMP. TYPE",
        cell: (info) => <p className="text-sm">{formatName(info.getValue() as string)}</p>,
    }),

    columnHelper.accessor("employeeStatus", {
        header: "HR STATUS",
        cell: (info) => {
            const status = info.getValue() || "—";
            return <p className="text-sm capitalize">{status as string}</p>;
        },
    }),
    columnHelper.accessor("status", {
        header: "APP STATUS",
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
