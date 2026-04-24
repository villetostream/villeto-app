
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Eye, Lock, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dateFormatter } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Role } from "@/actions/role/get-all-roles";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import Link from "next/link";
import { logger } from "@/lib/logger";

const columnHelper = createColumnHelper<Role>();

export const columns: ColumnDef<Role, any>[] = [
    columnHelper.display({
        id: "idNo",
        header: "S/N",
        cell: (info) => {
            const rowNum = String(info.row.index + 1).padStart(2, '0');
            return <p className="text-sm">{rowNum}</p>;
        },
    }),
    columnHelper.accessor("name", {
        header: "ROLE",
        cell: (info) => {
            const name = info.getValue() || "";
            const formattedName = name.replace(/_/g, ' ').toLowerCase();
            return <p className="font-bold capitalize">{formattedName || "-"}</p>;
        },
    }),
    columnHelper.accessor("description", {
        header: "DESCRIPTION",
        cell: (info) => {
            const description = info.getValue() || "";
            const formattedDescription = description.replace(/_/g, ' ').toLowerCase();
            return <p className="max-w-48 text-ellipsis line-clamp-1 first-letter:uppercase">{formattedDescription || "-"}</p>;
        },
    }),
    columnHelper.accessor("totalAssignedUsers", {
        header: "USERS",
        cell: (info) => <p className="">{`${info.getValue() || "0"}`}</p>,
    }),
    columnHelper.accessor("createdBy", {
        header: "CREATED BY",
        cell: (info) => {
            const creator = info.getValue();
            const creatorName = creator ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim() : "Default";
            return <p className="capitalize">{creatorName}</p>;
        },
    }),
    columnHelper.accessor("createdAt", {
        header: "DATE CREATED",
        cell: (info) => {
            // Using a simpler date format if needed to match screenshot "10 Sept 2025"
            const date = info.getValue() ? new Date(info.getValue()) : null;
            const formattedDate = date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-";
            return <p className="">{formattedDate}</p>;
        },
    }),
    columnHelper.accessor("isActive", {
        header: "STATUS",
        cell: (info) => {
            return (
                <Badge variant={info.row.original.isActive ? "active" : "inactive"}>
                    <span className="ml-1 capitalize">{info.row.original.isActive ? "active" : "inactive"}</span>
                </Badge>
            );
        },
    }),
    columnHelper.display({
        id: "actions",
        header: "ACTION",
        enableHiding: false,
        cell: (data) => {
            const roleId = data.row.original.roleId;
            return (
                <div className="flex justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-none shadow-lg">
                            <PermissionGuard requiredPermissions={["read:roles"]}>
                                <DropdownMenuItem asChild>
                                    <Link 
                                        href={`/people/view-role/${roleId}`}
                                        className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#F0FDF4] text-[#475467]"
                                    >
                                        <Eye className="w-5 h-5" />
                                        <span className="font-medium">View Role</span>
                                    </Link>
                                </DropdownMenuItem>
                            </PermissionGuard>
                            
                            <div className="h-[1px] bg-[#F2F4F7] my-1 mx-2" />
                            
                            <PermissionGuard requiredPermissions={["update:roles"]}>
                                <DropdownMenuItem 
                                    className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#FEF2F2] text-[#B42318]"
                                    onClick={() => logger.log("Deactivate role:", roleId)}
                                >
                                    <Lock className="w-5 h-5" />
                                    <span className="font-medium">Deactivate Role</span>
                                </DropdownMenuItem>
                            </PermissionGuard>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    }),
];
