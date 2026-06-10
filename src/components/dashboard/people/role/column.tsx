
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
import { Edit2, Trash2 } from "lucide-react";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useDeleteRoleApi } from "@/actions/role/delete-role";
import toast from "react-hot-toast";
import { useState } from "react";
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
        cell: (data) => <ActionCell role={data.row.original} />,
    }),
];

function ActionCell({ role }: { role: Role }) {
    const roleId = role.roleId;
    const { mutateAsync: deleteRole } = useDeleteRoleApi();
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const handleDelete = async () => {
        try {
            await deleteRole(roleId);
            toast.success("Role deleted successfully");
        } catch (error) {
            toast.error("Failed to delete role");
        } finally {
            setDeleteModalOpen(false);
        }
    };

    return (
        <div className="flex justify-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-none shadow-lg z-[9999]">
                    <DropdownMenuItem asChild>
                        <Link 
                            href={`/people/view-role/${roleId}`}
                            className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#F0FDF4] text-[#475467]"
                        >
                            <Eye className="w-5 h-5" />
                            <span className="font-medium">View Role Details</span>
                        </Link>
                    </DropdownMenuItem>
                    
                    <PermissionGuard resource="role" action="manage">
                        <DropdownMenuItem asChild>
                            <Link 
                                href={`/people/create-role?id=${roleId}`}
                                className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-slate-50 text-[#475467]"
                            >
                                <Edit2 className="w-5 h-5 text-slate-500" />
                                <span className="font-medium">Update Role</span>
                            </Link>
                        </DropdownMenuItem>
                    </PermissionGuard>

                    <div className="h-[1px] bg-[#F2F4F7] my-1 mx-2" />
                    
                    <PermissionGuard resource="role" action="manage">
                        <DropdownMenuItem 
                            className="flex items-center gap-3 py-3 px-4 rounded-lg cursor-pointer hover:bg-[#FEF2F2] text-[#B42318]"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModalOpen(true);
                            }}
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="font-medium">Delete Role</span>
                        </DropdownMenuItem>
                    </PermissionGuard>
                </DropdownMenuContent>
            </DropdownMenu>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Role"
                description={`Are you sure you want to delete the "${role.name?.replace(/_/g, ' ')}" role? This action cannot be undone.`}
            />
        </div>
    );
}
