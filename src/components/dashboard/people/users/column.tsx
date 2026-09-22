import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppUser } from "@/queries/departments/get-all-departments";
import { logger } from "@/lib/logger";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Close as PopoverClose } from "@radix-ui/react-popover";
import { Eye, Lock, MoreHorizontal, Mail, X } from "lucide-react";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import { useAuthStore } from "@/stores/auth-stores";


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
            
            const allRoles: string[] = [];
            
            if (Array.isArray((original as any).companyRoles) && (original as any).companyRoles.length > 0) {
                (original as any).companyRoles.forEach((r: any) => {
                    const name = r?.role?.name || r?.name;
                    if (name) allRoles.push(name);
                });
            } else if (Array.isArray((original as any).roles) && (original as any).roles.length > 0) {
                (original as any).roles.forEach((r: any) => {
                    const name = r?.name;
                    if (name) allRoles.push(name);
                });
            }
            
            // Deduplicate in case of duplicate roles
            const uniqueRoles = Array.from(new Set(allRoles));
            
            if (uniqueRoles.length === 0) {
                const singleRole = (original as any).role?.name || (original as any).companyRole?.name || (original as any).villetoRole?.name || info.getValue();
                if (singleRole) {
                    uniqueRoles.push(singleRole);
                }
            }

            if (uniqueRoles.length === 0) {
                return <p className="capitalize text-sm">-</p>;
            }

            const firstRole = formatName(uniqueRoles[0]);
            
            if (uniqueRoles.length === 1) {
                return <p className="capitalize text-sm">{firstRole}</p>;
            }

            const extraRolesCount = uniqueRoles.length - 1;

            return (
                <div className="flex items-center gap-2">
                    <p className="capitalize text-sm">{firstRole}</p>
                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="text-xs text-[#087F70] font-medium bg-[#E8F5F3] px-2 py-0.5 rounded-full hover:bg-[#D1EBE7] transition-colors">
                                +{extraRolesCount}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-4 rounded-[16px] border shadow-xl" align="start">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-semibold text-[15px] text-[#0b100e]">Assigned roles</h3>
                                <PopoverClose className="h-6 w-6 rounded-full flex items-center justify-center hover:bg-gray-100 focus:outline-none transition-colors text-[#68726d]">
                                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </PopoverClose>
                            </div>
                            <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                {uniqueRoles.map((role, idx) => (
                                    <div key={idx} className="py-2 px-2.5 flex items-center bg-[#f4f7f5] rounded-[8px]">
                                        <p className="font-medium text-sm text-[#344054]">{formatName(role)}</p>
                                    </div>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
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
                            <PermissionGuard anyOf={["user.manage", "user.directory.read"]}>
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
                                const assignedRoles = Array.isArray(data.row.original.companyRoles)
                                    ? data.row.original.companyRoles
                                    : [];
                                const isOwner = assignedRoles.some((role) => role?.templateKey === "owner")
                                    || data.row.original.companyRole?.templateKey === "owner";
                                const currentUserId = useAuthStore.getState().user?.userId;
                                const isSelf = data.row.original.userId === currentUserId;
                                const canDeactivate = !isOwner && !isSelf;

                                return canDeactivate ? (
                                    <PermissionGuard anyOf={["user.manage"]}>
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
                                <PermissionGuard anyOf={["user.manage"]}>
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
