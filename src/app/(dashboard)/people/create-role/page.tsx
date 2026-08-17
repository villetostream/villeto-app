"use client"

import { useEffect, useState, useMemo } from "react";
import { logger } from "@/lib/logger";
import { asRecord, getApiErrorMessage, getOptionalString, isRecord } from "@/lib/types/api-error";
import { Plus, ChevronRight, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetAllPermissionsApi } from "@/features/auth/queries/permissions";
import { groupPermissionsByResource, formatPermissionName } from "@/lib/utils";
import { roleSchema, type RoleFormData } from "@/lib/schemas/schemas";
import type { z } from "zod";
import { useCreateRoleApi } from "@/queries/role/create-role";
import { useUpdateRoleApi } from "@/queries/role/update-role";
import { useUpdateRoleCapabilitiesApi } from "@/queries/role/update-role-capabilities";
import { useGetAllRoleCapabilitiesApi, SUPPORTED_MODULES } from "@/queries/role/get-role-capabilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useGetARoleApi } from "@/queries/role/get-a-role";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { CapabilityGroup } from "@/queries/role/get-all-roles";
import toast from "react-hot-toast";
import withPermissions from "@/components/permissions/permission-protected-routes";
import SuccessModal from "@/components/modals/SuccessModal";
import { useAuthStore } from "@/stores/auth-stores";
import { cn } from "@/lib/utils";

// ── Capability Group Card (expandable) ────────────────────────────────────
function CapabilityGroupCard({
    group,
    selected,
    onToggle,
}: {
    group: CapabilityGroup;
    selected: boolean;
    onToggle: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={cn(
                "border rounded-[12px] overflow-hidden transition-all bg-white",
                selected ? "border-[#0ea894]/40 bg-[#e7f6f2]/20" : "border-black/[0.08]"
            )}
        >
            {/* Header row */}
            <div className="flex items-start p-4 gap-3">
                <Checkbox
                    checked={selected}
                    onCheckedChange={onToggle}
                    className="mt-0.5 w-4 h-4 shrink-0 border-2 border-[#84908a] data-[state=checked]:border-[#0ea894] data-[state=checked]:bg-[#0ea894]"
                    id={group.key}
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
                    <p className={cn("text-[13px] font-semibold", selected ? "text-[#087f70]" : "text-[#0b100e]")}>
                        {group.name}
                    </p>
                    <p className="text-[12px] text-[#66706b] mt-0.5">{group.description}</p>
                </div>
                {/* Expand / collapse */}
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="flex items-center gap-2 text-[11px] text-[#84908a] hover:text-[#303834] transition-colors shrink-0 mt-0.5"
                >
                    <span>{group.permissions.length} permissions</span>
                    {expanded
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                    }
                </button>
            </div>

            {/* Permissions detail (expandable) */}
            {expanded && (
                <div className="border-t border-black/[0.05] px-4 pb-4 pt-3 bg-[#f9faf9]">
                    <p className="text-[11px] font-semibold text-[#84908a] mb-2 uppercase tracking-[0.06em]">Includes the following permissions:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6">
                        {group.permissions.map(p => (
                            <div key={p.permissionId} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#0ea894]/60 shrink-0" />
                                <span className="text-[12px] text-[#66706b]">{formatPermissionName(p.name)}</span>
                            </div>
                        ))}
                        {group.permissions.length === 0 && (
                            <p className="text-[12px] text-[#84908a] col-span-2">No individual permissions listed.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Module Group (capability groups for one module) ───────────────────────
function CapabilityModuleSection({
    moduleName,
    groups,
    selectedKeys,
    onToggle,
}: {
    moduleName: string;
    groups: CapabilityGroup[];
    selectedKeys: string[];
    onToggle: (key: string) => void;
}) {
    const label = moduleName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const [open, setOpen] = useState(true);

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 w-full text-left"
            >
                <h3 className="text-[11px] font-bold text-[#84908a] uppercase tracking-[0.1em]">{label}</h3>
                <div className="flex-1 h-px bg-black/[0.06]" />
                {open ? <ChevronUp className="w-4 h-4 text-[#84908a]" /> : <ChevronDown className="w-4 h-4 text-[#84908a]" />}
            </button>
            {open && (
                <div className="space-y-2">
                    {groups.map(g => (
                        <CapabilityGroupCard
                            key={g.capabilityGroupId}
                            group={g}
                            selected={selectedKeys.includes(g.key)}
                            onToggle={() => onToggle(g.key)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────
function CreateRolePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleId = searchParams.get("id");
    const isEditMode = Boolean(roleId);

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [selectedCapabilityKeys, setSelectedCapabilityKeys] = useState<string[]>([]);
    const [initialCapabilityKeys, setInitialCapabilityKeys] = useState<string[]>([]);

    const { user } = useAuthStore();
    const isCurrentUserOwner = (user?.companyRole?.name || (user as any)?.villetoRole?.name)?.toLowerCase() === "owner";

    // Data fetching
    const allPermissions = useGetAllPermissionsApi();
    const { data: allCapabilities, isLoading: capabilitiesLoading } = useGetAllRoleCapabilitiesApi(
        [...SUPPORTED_MODULES],
        true
    );
    const createRoleMutation = useCreateRoleApi();
    const updateRoleMutation = useUpdateRoleApi();
    const updateCapabilitiesMutation = useUpdateRoleCapabilitiesApi();
    const roleData = useGetARoleApi(roleId ?? "", { enabled: isEditMode });
    const allRoles = useGetAllRolesApi();

    // Form
    const {
        register,
        formState: { errors, isDirty },
        setValue,
        watch: _watch,
        getValues,
        reset,
        control,
    } = useForm<z.input<typeof roleSchema>>({
        resolver: zodResolver(roleSchema),
        defaultValues: { name: "", description: "", isActive: true, permissionIds: [] as string[] },
    });

    const selectedPermissionIds = useWatch({ control, name: "permissionIds" }) || [];
    const formValues = useWatch({ control });

    // Group flat permissions by resource (for Advanced tab), sorted alphabetically
    const permissionGroups = useMemo(() => {
        if (!allPermissions.data?.data) return [];
        const groups = groupPermissionsByResource(allPermissions.data.data)
            .sort((a, b) => a.resource.localeCompare(b.resource));
        
        for (const group of groups) {
            group.permissions.sort((a, b) => formatPermissionName(a.name).localeCompare(formatPermissionName(b.name)));
        }
        return groups;
    }, [allPermissions.data]);

    // Group capabilities by module, sorted alphabetically within each module
    const capabilitiesByModule = useMemo(() => {
        const map: Record<string, CapabilityGroup[]> = {};
        for (const mod of SUPPORTED_MODULES) map[mod] = [];
        for (const g of allCapabilities ?? []) {
            if (map[g.module] !== undefined) map[g.module].push(g);
            else map[g.module] = [g];
        }
        for (const mod of Object.keys(map)) {
            map[mod].sort((a, b) => a.name.localeCompare(b.name));
        }
        return map;
    }, [allCapabilities]);

    const sortedModules = useMemo(() => {
        return Object.keys(capabilitiesByModule).sort((a, b) => a.localeCompare(b));
    }, [capabilitiesByModule]);

    // Pre-fill form in edit mode
    useEffect(() => {
        if (roleData?.data && isEditMode) {
            const r = roleData.data.data;
            reset({
                description: r.description ?? "",
                name: r.name ?? "",
                isActive: r.isActive ?? true,
                permissionIds: (r.permissions ?? []).map(p => p.permissionId),
            });
            const keys = r.capabilityGroupKeys ?? [];
            queueMicrotask(() => {
                setSelectedCapabilityKeys(keys);
                setInitialCapabilityKeys(keys);
            });
        }
    }, [roleData?.data, isEditMode, reset]);

    // Toggle a flat permission
    const handlePermissionToggle = (permissionId: string) => {
        const curr = [...selectedPermissionIds];
        const idx = curr.indexOf(permissionId);
        if (idx > -1) curr.splice(idx, 1);
        else curr.push(permissionId);
        setValue("permissionIds", curr, { shouldValidate: true, shouldDirty: true });
    };

    // Toggle a capability group key
    const handleCapabilityToggle = (key: string) => {
        setSelectedCapabilityKeys(prev => {
            if (prev.includes(key)) return prev.filter(k => k !== key);
            return [...prev, key];
        });
    };

    // Direct submit — bypasses react-hook-form handleSubmit entirely
    const handleDirectSubmit = async () => {
        const data = getValues();
        if (!data.name?.trim()) { toast.error("Role name is required."); return; }

        const capabilitiesChanged =
            JSON.stringify([...selectedCapabilityKeys].sort()) !==
            JSON.stringify([...initialCapabilityKeys].sort());

        try {
            if (isEditMode && roleId) {
                // PATCH /roles/{roleId} — only if form fields changed (name, description, isActive, permissionIds)
                if (isDirty) {
                    const rolePayload: RoleFormData = {
                      name: data.name,
                      isActive: data.isActive,
                      description: data.description,
                      permissionIds: data.permissionIds ?? [],
                    };
                    await updateRoleMutation.mutateAsync({ id: roleId, data: rolePayload });
                }
                // PATCH /roles/{roleId}/capabilities — only if capability group selection changed
                if (capabilitiesChanged) {
                    await updateCapabilitiesMutation.mutateAsync({
                        roleId,
                        capabilityGroupKeys: selectedCapabilityKeys,
                    });
                }
            } else {
                // Create new role
                const res = await createRoleMutation.mutateAsync({ ...data, permissionIds: data.permissionIds ?? [] });
                const savedRoleId = getOptionalString(asRecord(isRecord(res) ? res.data : res).roleId) ?? null;
                if (savedRoleId && selectedCapabilityKeys.length > 0) {
                    await updateCapabilitiesMutation.mutateAsync({
                        roleId: savedRoleId,
                        capabilityGroupKeys: selectedCapabilityKeys,
                    });
                }
            }
            toast.success(`Role ${isEditMode ? "updated" : "created"}!`);
            setShowSuccessModal(true);
        } catch (error: unknown) {
            logger.error("Error submitting role:", error);
            toast.error(getApiErrorMessage(error, "Something went wrong. Please try again."));
        }
    };

    const isLoading =
        createRoleMutation.isPending ||
        updateRoleMutation.isPending ||
        updateCapabilitiesMutation.isPending;

    const handleCancel = () => {
        const returnPath = sessionStorage.getItem("rolesReturnPath");
        if (returnPath) {
            sessionStorage.removeItem("rolesReturnPath");
            router.push(returnPath);
        } else {
            router.push("/people?tab=roles");
        }
    };

    const handleSuccessClose = async () => {
        setShowSuccessModal(false);
        await Promise.all([allRoles.refetch(), roleData.refetch()]);
        
        if (!isEditMode) {
            reset({});
            handleCancel();
        }
    };
    if (isEditMode && roleData.isLoading) {
        return (
            <div className="p-6">
                <h1 className="text-[24px] font-bold text-[#0b100e] mb-8">Roles and Permissions</h1>
                <div className="flex items-center justify-center py-32 text-[#84908a] gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0ea894]" />
                    <span className="text-[13px] font-medium">Loading role details...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-12 items-start">
                {/* Sidebar */}
                <aside className="sticky top-6 space-y-8 h-fit">
                    <h1 className="text-[24px] font-bold text-[#0b100e]">Roles and Permissions</h1>

                    <button
                        className="w-full flex items-center justify-between p-4 border border-[#0ea894]/25 rounded-[14px] text-[#087f70] bg-[#e7f6f2]/30 hover:bg-[#e7f6f2]/50 transition-colors"
                        type="button"
                    >
                        <div className="flex items-center gap-3">
                            <Plus className="w-5 h-5" />
                            <span className="font-semibold text-[15px]">{isEditMode ? "Edit Role" : "Add New Role"}</span>
                        </div>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </aside>

                {/* Main Content */}
                <main className="max-w-2xl">
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                        {/* Role Details */}
                        <section className="space-y-6">
                            <h2 className="text-[20px] font-bold text-[#0b100e]">Describe {isEditMode ? "" : "New "}Role</h2>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[13px] font-semibold text-[#0b100e]">
                                    Role Name<span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Enter role name"
                                    className="h-[46px] border-black/[0.1] rounded-[10px] text-[13px] focus-visible:ring-[#0ea894] placeholder:text-[#84908a]"
                                    {...register("name")}
                                />
                                {errors.name && <p className="text-[12px] text-red-500">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-[13px] font-semibold text-[#0b100e]">
                                    Description<span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe role"
                                    className="min-h-[100px] resize-none border-black/[0.1] rounded-[10px] text-[13px] focus-visible:ring-[#0ea894] placeholder:text-[#84908a]"
                                    {...register("description")}
                                />
                                {errors.description && <p className="text-[12px] text-red-500">{errors.description.message}</p>}
                            </div>
                        </section>

                        {/* Permissions Section — tabbed */}
                        <Tabs defaultValue="capabilities" className="w-full">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold">Assign Permissions</h2>
                                <TabsList className="text-xs">
                                    <TabsTrigger value="capabilities">By Capability Groups</TabsTrigger>
                                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                                </TabsList>
                            </div>

                            {/* ── Capability Groups Tab ── */}
                            <TabsContent value="capabilities">
                                {capabilitiesLoading ? (
                                    <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span className="text-sm">Loading capability groups…</span>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {selectedCapabilityKeys.length > 0 && (
                                            <div className="flex items-center gap-2 text-xs text-primary">
                                                <Check className="w-3.5 h-3.5" />
                                                <span>{selectedCapabilityKeys.length} group{selectedCapabilityKeys.length !== 1 ? "s" : ""} selected</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCapabilityKeys([])}
                                                    className="ml-2 underline text-slate-400 hover:text-slate-600"
                                                >
                                                    Clear all
                                                </button>
                                            </div>
                                        )}
                                        {sortedModules.map((mod) => {
                                            const groups = capabilitiesByModule[mod];
                                            return groups.length > 0 ? (
                                                <CapabilityModuleSection
                                                    key={mod}
                                                    moduleName={mod}
                                                    groups={groups}
                                                    selectedKeys={selectedCapabilityKeys}
                                                    onToggle={handleCapabilityToggle}
                                                />
                                            ) : null;
                                        })}
                                        {(allCapabilities ?? []).length === 0 && (
                                            <p className="text-sm text-slate-400 text-center py-8">
                                                No capability groups available. Check your API connection.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </TabsContent>

                            {/* ── Advanced (individual permissions) Tab ── */}
                            <TabsContent value="advanced">
                                <Accordion type="single" collapsible className="w-full border border-black/[0.08] rounded-[14px] overflow-hidden bg-white">
                                    <AccordionItem value="permissions" className="border-none">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-[#f5f7f6] transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-black/[0.08]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-[8px] bg-[#e7f6f2] flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-4 h-4 text-[#0ea894]" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[15px] font-semibold text-[#0b100e]">Individual Permissions</p>
                                                    <p className="text-[12px] text-[#84908a] font-normal">
                                                        {selectedPermissionIds.length} permission{selectedPermissionIds.length !== 1 ? "s" : ""} selected
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronDown className="w-5 h-5 text-[#84908a] transition-transform duration-200 ml-auto flex-shrink-0" />
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 pt-6">
                                            <div className="space-y-8">
                                                {permissionGroups.map(group => (
                                                    <div key={group.resource} className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-[11px] font-bold text-[#84908a] uppercase tracking-[0.1em]">
                                                                {formatPermissionName(group.resource)}
                                                            </h3>
                                                            <div className="flex-1 h-px bg-black/[0.06]" />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                                                            {group.permissions.map(permission => (
                                                                <div key={permission.permissionId} className="flex items-center space-x-3 py-1.5 px-3 rounded-[8px] hover:bg-[#f5f7f6] transition-colors cursor-pointer">
                                                                    <Checkbox
                                                                        id={permission.permissionId}
                                                                        checked={selectedPermissionIds.includes(permission.permissionId)}
                                                                        onCheckedChange={() => handlePermissionToggle(permission.permissionId)}
                                                                        className="w-4 h-4 border-2 border-[#84908a] rounded-[4px] data-[state=checked]:border-[#0ea894] data-[state=checked]:bg-[#0ea894]"
                                                                    />
                                                                    <label
                                                                        htmlFor={permission.permissionId}
                                                                        className="text-[13px] font-medium leading-none cursor-pointer text-[#66706b]"
                                                                    >
                                                                        {formatPermissionName(permission.name)}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </TabsContent>
                        </Tabs>

                        {/* Actions */}
                        <div className="flex justify-end gap-4 pt-8 border-t border-black/[0.08]">
                            <Button
                                type="button"
                                variant="outline"
                                className="px-8 h-[46px] rounded-[10px] text-[13px] font-semibold border-black/[0.1] text-[#303834] hover:bg-[#f5f7f6]"
                                onClick={handleCancel}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            
                            {(() => {
                                const isTargetOwner = roleData?.data?.data?.name?.toLowerCase() === "owner";
                                const blockedFromEditing = isTargetOwner && !isCurrentUserOwner;
                                
                                if (blockedFromEditing) {
                                    return (
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm text-red-500 font-medium">Only Owners can modify this role</span>
                                            <Button
                                                type="button"
                                                disabled
                                                className="px-12 h-[46px] rounded-[10px] text-[13px] font-semibold bg-[#0ea894] hover:bg-[#0c9785] text-white opacity-50"
                                            >
                                                Update Role
                                            </Button>
                                        </div>
                                    );
                                }

                                return (
                                    <Button
                                        type="button"
                                        className="px-12 h-[46px] rounded-[10px] text-[13px] font-semibold bg-[#0ea894] hover:bg-[#0c9785] text-white shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                                        disabled={isLoading || (isEditMode && !isDirty && JSON.stringify([...selectedCapabilityKeys].sort()) === JSON.stringify([...initialCapabilityKeys].sort()))}
                                        onClick={handleDirectSubmit}
                                    >
                                        {isLoading
                                            ? (isEditMode ? "Updating…" : "Creating…")
                                            : (isEditMode ? "Update Role" : "Create Role")
                                        }
                                    </Button>
                                );
                            })()}
                        </div>
                    </form>
                </main>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={handleSuccessClose}
                title={`Role ${isEditMode ? 'Updated' : 'Created'} Successfully`}
                description={formValues.name || "Role"}
            />
        </div>
    );
}

export default withPermissions(CreateRolePage, []);
