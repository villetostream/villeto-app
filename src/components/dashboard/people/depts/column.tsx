
import { Department } from "@/queries/departments/get-all-departments";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import { logger } from "@/lib/logger";

const columnHelper = createColumnHelper<Department>();

export const columns = [
    columnHelper.display({
        id: "idNo",
        header: "S/N",
        cell: (info) => {
            const rowNum = String(info.row.index + 1).padStart(2, '0');
            return <p className="text-sm">{rowNum}</p>;
        },
    }),
    columnHelper.accessor("departmentName", {
        header: "DEPARTMENTS",
        cell: (info) => <p className="font-bold">{`${info.getValue() || "-"}`}</p>,
    }),
    columnHelper.display({
        id: "usersCount",
        header: "USERS",
        cell: (info) => <p className="">{info.row.original.members?.length || "0"}</p>,
    }),
    columnHelper.accessor("manager", {
        header: "REPORTS TO",
        cell: (info) => {
            const manager = info.getValue();
            const managerName = manager ? `${manager.firstName || ""} ${manager.lastName || ""}`.trim() : "-";
            return <p className="capitalize">{managerName}</p>;
        },
    }),
    columnHelper.accessor("createdAt", {
        header: "ADDED",
        cell: (info) => {
            const raw = info.getValue();
            const date = raw ? new Date(raw) : null;
            const formattedDate = date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "-";
            return <p className="">{formattedDate}</p>;
        },
    }),
    columnHelper.display({
        id: "actions",
        header: "ACTION",
        enableHiding: false,
        cell: (data) => {
            return (
                <div className="flex justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-none shadow-lg">
                            <PermissionGuard resource="department" action="read">
                                <DropdownMenuItem 
                                    className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#F0FDF4] text-[#475467]"
                                    onClick={() => logger.log("View department:", data.row.original.departmentId)}
                                >
                                    <Eye className="w-5 h-5" />
                                    <span className="font-medium">View Department</span>
                                </DropdownMenuItem>
                            </PermissionGuard>
                            
                            <div className="h-[1px] bg-[#F2F4F7] my-1 mx-2" />
                            
                            <PermissionGuard resource="department" action="manage">
                                <DropdownMenuItem 
                                    className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#FEF2F2] text-[#B42318]"
                                    onClick={() => logger.log("Deactivate department:", data.row.original.departmentId)}
                                >
                                    <Lock className="w-5 h-5" />
                                    <span className="font-medium">Deactivate Department</span>
                                </DropdownMenuItem>
                            </PermissionGuard>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            );
        },
    }),
] as ColumnDef<Department>[];
