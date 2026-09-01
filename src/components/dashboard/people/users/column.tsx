import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppUser } from "@/queries/departments/get-all-departments";
import { logger } from "@/lib/logger";
import { isRecord } from "@/lib/types/api-error";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Lock, MoreHorizontal, UserCheck, Mail } from "lucide-react";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import { useAuthStore } from "@/stores/auth-stores";


function getDepartmentName(dept: unknown): string {
  if (!dept) return "—";
  if (typeof dept === "string") return dept || "—";
  if (isRecord(dept)) {
    const name = dept.departmentName ?? dept.name;
    if (typeof name === "string" && name) return name;
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

export const columns = (
    onViewProfile: (userId: string) => void,
    onToggleStatus?: (user: AppUser) => void,
    onResendInvitation?: (user: AppUser) => void
) => [
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
            const original = info.row.original;
            const roleNames = (original.companyRoles ?? [])
                .map((role) => formatName(role.name))
                .filter(Boolean);
            const fallbackRole = original.role?.name || original.companyRole?.name || original.villetoRole?.name || info.getValue();
            return (
                <p className="capitalize text-sm">
                    {roleNames.length > 0 ? roleNames.join(", ") : formatName(fallbackRole) || "-"}
                </p>
            );
        },
    }),
    columnHelper.accessor("department", {
        header: "DEPARTMENT",
        cell: (info) => {
            const dept = info.getValue();
            let name = "—";
            if (typeof dept === "string") name = dept;
            else if (dept && typeof dept === "object") name = (dept as any).name || "—";
            return <p className="capitalize text-sm">{name}</p>;
        },
    }),
    columnHelper.display({
        id: "manager",
        header: "MANAGER",
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
            return <p className="capitalize text-sm">{managerName}</p>;
        },
    }),
    columnHelper.accessor("status", {
        header: "STATUS",
        cell: (info) => {
            const status = info.getValue() as string;
            // Status is a string: "Active" or "Inactive"
            const isActive = status?.toLowerCase() === "active";
            const statusText = status?.toLowerCase() || "inactive";
            return <StatusBadge status={statusText} />;
        },
    }),
    columnHelper.display({
        id: "actions",
        header: "ACTION",
        enableHiding: false,
        cell: (data) => {
            const status = data.row.original.status;
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
                            <PermissionGuard resource="user" action="read">
                                <DropdownMenuItem 
                                    className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#F0FDF4] text-[#475467]"
                                    onClick={() => onViewProfile(data.row.original.userId)}
                                >
                                    <Eye className="w-5 h-5" />
                                    <span className="font-medium">View Profile</span>
                                </DropdownMenuItem>
                            </PermissionGuard>
                            
                            <div className="h-[1px] bg-[#F2F4F7] my-1 mx-2" />
                            
                            {isActive && (() => {
                                const roleName = String(data.row.original.villetoRole?.name || data.row.original.position || "").toUpperCase();
                                const isOwner = roleName.includes("OWNER");
                                const currentUserId = useAuthStore.getState().user?.userId;
                                const isSelf = data.row.original.userId === currentUserId;
                                const canDeactivate = !isOwner && !isSelf;

                                return canDeactivate ? (
                                    <PermissionGuard resource="user" action="manage">
                                        <DropdownMenuItem 
                                            className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#FEF2F2] text-[#B42318]"
                                            onClick={() => {
                                                if (onToggleStatus) onToggleStatus(data.row.original);
                                                else logger.log("Deactivate user:", data.row.original.userId);
                                            }}
                                        >
                                            <Lock className="w-5 h-5" />
                                            <span className="font-medium">Deactivate User</span>
                                        </DropdownMenuItem>
                                    </PermissionGuard>
                                ) : null;
                            })()}

                            {!isActive && onResendInvitation && (
                                <PermissionGuard resource="user" action="manage">
                                    <DropdownMenuItem 
                                        className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#F0FDF4] text-[#087f70]"
                                        onClick={() => onResendInvitation(data.row.original)}
                                    >
                                        <Mail className="w-5 h-5" />
                                        <span className="font-medium">Resend Invitation</span>
                                    </DropdownMenuItem>
                                </PermissionGuard>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    }),
] as ColumnDef<AppUser>[];
