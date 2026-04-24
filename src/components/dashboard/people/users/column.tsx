import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppUser } from "@/actions/departments/get-all-departments";
import { logger } from "@/lib/logger";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Lock, MoreHorizontal, UserCheck } from "lucide-react";
import PermissionGuard from "@/components/permissions/permission-protected-components";


function getDepartmentName(dept: any): string {
  if (!dept) return "—";
  if (typeof dept === "string") return dept || "—";
  if (typeof dept === "object" && Object.keys(dept).length > 0) {
    return (dept.departmentName || dept.name) ?? "—";
  }
  return "—";
}

function formatName(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

const columnHelper = createColumnHelper<AppUser>();

export const columns = (onViewProfile: (userId: string) => void): ColumnDef<AppUser, any>[] => [
    columnHelper.display({
        id: "idNo",
        header: "S/N",
        cell: (info) => {
            const rowNum = String(info.row.index + 1).padStart(2, '0');
            return <p className="text-sm">{rowNum}</p>;
        },
    }),
    columnHelper.accessor("firstName", {
        header: "USER NAME",
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
    columnHelper.accessor("cardIssued", {
        header: "CARD TYPE",
        cell: (info) => {
            const cardIssued = info.getValue();
            const cardType = cardIssued ? "Virtual" : "-";
            return <p className="capitalize">{cardType}</p>;
        },
    }),
    columnHelper.accessor("position", {
        header: "ROLE",
        cell: (info) => {
            const position = info.getValue();
            // Convert position to readable format (e.g., "CONTROLLING_OFFICER" -> "Controlling Officer")
            const formattedPosition = formatName(position) || "-";
            return <p className="capitalize text-sm">{formattedPosition}</p>;
        },
    }),
    columnHelper.accessor("department", {
        header: "DEPARTMENT",
        cell: (info) => {
            const dept = info.getValue() as any;
            const deptName = getDepartmentName(dept);
            return <p className="capitalize">{deptName}</p>;
        },
    }),
    columnHelper.display({
        id: "manager",
        header: "MANAGER",
        cell: (info) => {
            const manager = (info.row.original as any).manager;
            let managerName = "—";
            if (manager && typeof manager === "object") {
                const first = formatName(manager.firstName);
                const last = formatName(manager.lastName);
                managerName = `${first} ${last}`.trim() || "—";
            } else if (typeof manager === "string" && manager) {
                managerName = formatName(manager);
            }
            return <p className="capitalize">{managerName}</p>;
        },
    }),
    columnHelper.accessor("status", {
        header: "STATUS",
        cell: (info) => {
            const status = info.getValue() as string;
            // Status is a string: "Active" or "Inactive"
            const isActive = status?.toLowerCase() === "active";
            const statusText = status?.toLowerCase() || "inactive";
            return (
                <Badge variant={isActive ? "active" : "inactive"}>
                    <span className="ml-1 capitalize">{statusText}</span>
                </Badge>
            );
        },
    }),
    columnHelper.display({
        id: "actions",
        header: "ACTION",
        enableHiding: false,
        cell: (data) => {
            const status = (data.row.original as any).status as string;
            const isActive = status?.toLowerCase() === "active";
            
            return (
                <div className="flex justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-none shadow-lg">
                            <PermissionGuard requiredPermissions={["read:users"]}>
                                <DropdownMenuItem 
                                    className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#F0FDF4] text-[#475467]"
                                    onClick={() => onViewProfile(data.row.original.userId)}
                                >
                                    <Eye className="w-5 h-5" />
                                    <span className="font-medium">View Profile</span>
                                </DropdownMenuItem>
                            </PermissionGuard>
                            
                            <div className="h-[1px] bg-[#F2F4F7] my-1 mx-2" />
                            
                            {isActive ? (
                                <PermissionGuard requiredPermissions={["update:users"]}>
                                    <DropdownMenuItem 
                                        className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#FEF2F2] text-[#B42318]"
                                        onClick={() => logger.log("Deactivate user:", data.row.original.userId)}
                                    >
                                        <Lock className="w-5 h-5" />
                                        <span className="font-medium">Deactivate User</span>
                                    </DropdownMenuItem>
                                </PermissionGuard>
                            ) : (
                                <PermissionGuard requiredPermissions={["update:users"]}>
                                    <DropdownMenuItem 
                                        className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#F0FDF4] text-[#0FA68E]"
                                        onClick={() => logger.log("Activate user:", data.row.original.userId)}
                                    >
                                        <UserCheck className="w-5 h-5" />
                                        <span className="font-medium">Activate User</span>
                                    </DropdownMenuItem>
                                </PermissionGuard>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    }),
];
