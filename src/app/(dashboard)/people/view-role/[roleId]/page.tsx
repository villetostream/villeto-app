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
        <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-start justify-between p-4 text-left hover:bg-slate-50 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Checkbox
                        checked={true}
                        disabled
                        className="mt-0.5 w-4 h-4 border-2 border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary shrink-0"
                    />
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{index}. {group.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs text-slate-400">{group.permissions.length} permissions</span>
                    {expanded
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                </div>
            </div>
            {expanded && (
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 pb-4 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                        {group.permissions.map(p => (
                            <div key={p.permissionId} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                <span className="text-xs text-slate-600">{formatPermissionName(p.name)}</span>
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
                <span className="text-sm font-bold text-slate-700 uppercase tracking-widest">{label}</span>
                <div className="flex-1 h-px bg-slate-200" />
                {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
                            className="gap-2"
                            onClick={() => setDeleteModalOpen(true)}
                        >
                            Delete Role
                        </Button>
                    </PermissionGuard>

                    <PermissionGuard resource="role" action="manage">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-primary text-primary hover:bg-primary/5 bg-white"
                            onClick={() => router.push(`/people/create-role?id=${roleId}`)}
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit Role
                        </Button>
                    </PermissionGuard>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-10">
                {/* Sidebar */}
                <aside className="space-y-4 md:sticky md:top-24 self-start">
                    {/* Role Card */}
                    <div className="w-full flex items-center justify-between p-4 border-2 border-primary rounded-xl bg-white">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <p className="font-semibold text-primary capitalize">{roleName}</p>
                                <Badge variant={role.isActive ? "active" : "inactive"} className="text-xs">
                                    {role.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-500 first-letter:uppercase">
                                {role.description || "No description provided."}
                            </p>
                            {role.source && (
                                <p className="text-xs text-slate-400 mt-1 capitalize">
                                    {role.isDefault ? "Default" : "Custom"} · {role.source.replace(/_/g, ' ')}
                                </p>
                            )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" />
                    </div>

                    {/* User Count */}
                    <div className="border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">Assigned Users</span>
                            <span className="text-sm font-bold text-primary">{totalUsers}</span>
                        </div>
                        {totalUsers === 0 && (
                            <p className="text-xs text-slate-400 mt-1">No users assigned to this role yet.</p>
                        )}
                    </div>
                </aside>

                {/* Main Content */}
                <main className="space-y-8">
                    {/* Section: Capabilities by Module */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-800">Capabilities</h2>
                            <span className="text-xs text-slate-400 font-normal">(grouped by module)</span>
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
                            <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center">
                                <p className="text-sm text-slate-400">No capability groups assigned to this role.</p>
                                <PermissionGuard resource="role" action="manage">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3"
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
                                <h2 className="text-lg font-semibold text-slate-800">Direct Permissions</h2>
                                <span className="text-xs text-slate-400 font-normal">(individually assigned)</span>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-5 space-y-6">
                                {permissionGroups.map(group => (
                                    <div key={group.resource} className="space-y-3">
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                            {formatPermissionName(group.resource)}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                                            {group.permissions.map((p) => (
                                                <div key={p.permissionId} className="flex items-center gap-3">
                                                    <Checkbox
                                                        checked
                                                        disabled
                                                        className="w-4 h-4 border-2 border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                                    />
                                                    <label className="text-sm text-slate-600">
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
                        <div className="border border-dashed border-slate-200 rounded-xl p-10 text-center">
                            <p className="text-slate-400 text-sm">No capabilities or permissions assigned to this role.</p>
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
