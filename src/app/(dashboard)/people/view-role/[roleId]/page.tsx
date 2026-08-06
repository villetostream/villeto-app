"use client"

import { useState } from "react";
import { ChevronDown, ChevronUp, ChevronRight, Edit2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useGetARoleApi } from "@/queries/role/get-a-role";
import { CapabilityGroup, CapabilitiesByModule, Role } from "@/queries/role/get-all-roles";
import { Permission } from "@/queries/auth/auth-permissions";
import { formatPermissionName } from "@/lib/utils";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useDeleteRoleApi } from "@/queries/role/delete-role";
import toast from "react-hot-toast";

// ── Capability Group Card (expandable, read-only) ──────────────────────────
function CapabilityGroupCard({ group, index }: { group: CapabilityGroup; index: number }) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="border border-black/[0.08] rounded-[12px] overflow-hidden bg-white">
            <div
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-start justify-between p-4 text-left hover:bg-[#f5f7f6] transition-colors cursor-pointer select-none"
            >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                        checked={true}
                        disabled
                        className="mt-0.5 w-4 h-4 border-2 border-[#0ea894] data-[state=checked]:border-[#0ea894] data-[state=checked]:bg-[#0ea894] shrink-0"
                    />
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#0b100e]">{index}. {group.name}</p>
                        <p className="text-[12px] text-[#66706b] mt-0.5">{group.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[11px] text-[#84908a]">{group.permissions.length} permissions</span>
                    {expanded
                        ? <ChevronUp className="w-4 h-4 text-[#84908a]" />
                        : <ChevronDown className="w-4 h-4 text-[#84908a]" />
                    }
                </div>
            </div>
            {expanded && (
                <div className="border-t border-black/[0.05] bg-[#f9faf9] px-4 pb-4 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                        {group.permissions.map(p => (
                            <div key={p.permissionId} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#0ea894]/60 shrink-0" />
                                <span className="text-[12px] text-[#66706b]">{formatPermissionName(p.name)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Module Section ─────────────────────────────────────────────────────────
function ModuleSection({ moduleName, groups }: { moduleName: string; groups: CapabilityGroup[] }) {
    const [open, setOpen] = useState(true);
    const label = moduleName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 w-full text-left"
            >
                <span className="text-[11px] font-bold text-[#84908a] uppercase tracking-[0.1em]">{label}</span>
                <div className="flex-1 h-px bg-black/[0.06]" />
                {open ? <ChevronUp className="w-4 h-4 text-[#84908a]" /> : <ChevronDown className="w-4 h-4 text-[#84908a]" />}
            </button>
            {open && (
                <div className="space-y-2">
                    {groups.map((g, i) => <CapabilityGroupCard key={g.capabilityGroupId} group={g} index={i + 1} />)}
                </div>
            )}
        </div>
    );
}

// ── View Role Page ─────────────────────────────────────────────────────────
function ViewRolePage() {
    const params = useParams();
    const router = useRouter();
    const roleId = params.roleId as string;
    const { data: roleData, isLoading } = useGetARoleApi(roleId, { enabled: !!roleId });
    const deleteRoleMutation = useDeleteRoleApi();
    const role = roleData?.data as Role | undefined;

    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);

    const handleDelete = async () => {
        try {
            await deleteRoleMutation.mutateAsync(roleId);
            toast.success("Role deleted successfully.");
            setDeleteModalOpen(false);
            router.push("/people?tab=roles");
        } catch (_error) {
            toast.error("Failed to delete the role.");
            setDeleteModalOpen(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0ea894]" />
                </div>
            </div>
        );
    }

    if (!role) {
        return (
            <div className="p-6 text-center text-slate-400 text-sm">Role not found.</div>
        );
    }

    const roleName = role.name?.replace(/_/g, ' ') || "Role";
    const totalUsers = role.totalAssignedUsers || 0;

    // Capability groups from capabilitiesByModule
    const capModules: CapabilitiesByModule = role.capabilitiesByModule ?? {};
    const hasCapabilities = Object.values(capModules).some(m => m.capabilityGroups?.length > 0);

    // Flat individual permissions (directly assigned, not from groups)
    const directPermissions = role.permissions ?? [];
    const hasDirectPermissions = directPermissions.length > 0;

    // Group direct permissions by resource for display
    const groupPermissionsByResource = (perms: Permission[]) => {
        const map: Record<string, { resource: string; permissions: Permission[] }> = {};
        for (const p of perms) {
            const res = p.resource || "other";
            if (!map[res]) map[res] = { resource: res, permissions: [] };
            map[res].permissions.push(p);
        }
        return Object.values(map);
    };
    const permissionGroups = groupPermissionsByResource(directPermissions);

    return (
        <div className="p-6 pt-0 space-y-6">
            {/* Header / Actions - Sticky */}
            <div className="flex items-center justify-between gap-4 sticky -top-5 z-50 bg-dashboard-background pt-5 pb-4 -mx-6 px-6 -mt-5">
                <h1 className="text-2xl font-semibold">Role Details</h1>
                
                <div className="flex items-center gap-3 shrink-0">
                    <PermissionGuard resource="role" action="manage">
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 h-9 rounded-[8px] text-[13px] font-semibold"
                            onClick={() => setDeleteModalOpen(true)}
                        >
                            Delete Role
                        </Button>
                    </PermissionGuard>

                    <PermissionGuard resource="role" action="manage">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 h-9 rounded-[8px] border-[#0ea894]/30 text-[#087f70] hover:bg-[#e7f6f2] hover:border-[#0ea894]/50 bg-white text-[13px] font-semibold"
                            onClick={() => router.push(`/people/create-role?id=${roleId}`)}
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit Role
                        </Button>
                    </PermissionGuard>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-10">
                {/* Sidebar */}
                <aside className="space-y-4 md:sticky md:top-24 self-start">
                    {/* Role Card */}
                    <div className="w-full flex items-center justify-between p-4 border border-[#0ea894]/25 rounded-[14px] bg-[#e7f6f2]/30">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-[#087f70] capitalize">{roleName}</p>
                                <Badge variant={role.isActive ? "active" : "inactive"} className="text-xs">
                                    {role.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <p className="text-[13px] text-[#66706b] first-letter:uppercase">
                                {role.description || "No description provided."}
                            </p>
                            {role.source && (
                                <p className="text-[11px] text-[#84908a] mt-1 capitalize">
                                    {role.isDefault ? "Default" : "Custom"} · {role.source.replace(/_/g, ' ')}
                                </p>
                            )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-[#0ea894] flex-shrink-0" />
                    </div>

                    {/* User Count */}
                    <div className="border border-black/[0.08] rounded-[12px] p-4 bg-white">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-[#0b100e]">Assigned Users</span>
                            <span className="text-[13px] font-bold text-[#087f70]">{totalUsers}</span>
                        </div>
                        {totalUsers === 0 && (
                            <p className="text-[12px] text-[#84908a] mt-1">No users assigned to this role yet.</p>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="space-y-8">
                    {/* Section: Capabilities by Module */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[15px] font-semibold text-[#0b100e]">Capabilities</h2>
                            <span className="text-[11px] text-[#84908a] font-normal">(grouped by module)</span>
                        </div>

                        {hasCapabilities ? (
                            <div className="space-y-8">
                                {Object.entries(capModules).map(([moduleName, modData]) =>
                                    modData.capabilityGroups?.length > 0 ? (
                                        <ModuleSection key={moduleName} moduleName={moduleName} groups={modData.capabilityGroups} />
                                    ) : null
                                )}
                            </div>
                        ) : (
                            <div className="border border-dashed border-black/[0.08] rounded-[12px] p-8 text-center">
                                <p className="text-[13px] text-[#84908a]">No capability groups assigned to this role.</p>
                                <PermissionGuard resource="role" action="manage">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 border-[#0ea894]/30 text-[#087f70] hover:bg-[#e7f6f2] rounded-[8px] text-[13px] font-semibold"
                                        onClick={() => router.push(`/people/create-role?id=${roleId}`)}
                                    >
                                        Assign Capabilities
                                    </Button>
                                </PermissionGuard>
                            </div>
                        )}
                    </div>

                    {/* Section: Directly Assigned Permissions */}
                    {hasDirectPermissions && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2">
                                <h2 className="text-[15px] font-semibold text-[#0b100e]">Direct Permissions</h2>
                                <span className="text-[11px] text-[#84908a] font-normal">(individually assigned)</span>
                            </div>
                            <div className="border border-black/[0.08] rounded-[12px] p-5 space-y-6 bg-white">
                                {permissionGroups.map(group => (
                                    <div key={group.resource} className="space-y-3">
                                        <h3 className="text-[11px] font-bold text-[#84908a] uppercase tracking-[0.1em]">
                                            {formatPermissionName(group.resource)}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                                            {group.permissions.map((p) => (
                                                <div key={p.permissionId} className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked
                                                        disabled
                                                        className="w-4 h-4 border-2 border-[#0ea894] data-[state=checked]:border-[#0ea894] data-[state=checked]:bg-[#0ea894]"
                                                    />
                                                    <label className="text-[13px] text-[#66706b]">
                                                        {formatPermissionName(p.name)}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!hasCapabilities && !hasDirectPermissions && (
                        <div className="border border-dashed border-black/[0.08] rounded-[12px] p-10 text-center">
                            <p className="text-[13px] text-[#84908a]">No capabilities or permissions assigned to this role.</p>
                        </div>
                    )}

                    <ConfirmationModal
                        isOpen={isDeleteModalOpen}
                        onClose={() => setDeleteModalOpen(false)}
                        onConfirm={handleDelete}
                        title="Delete Role"
                        description={
                            <>
                                Are you sure you want to delete <span className="font-semibold text-slate-900">{roleName}</span>?
                                Users assigned to this role might lose their access. This action cannot be undone.
                            </>
                        }
                    />
                </main>
            </div>
        </div>
    );
}

export default withPermissions(ViewRolePage, []);
