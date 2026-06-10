"use client"

import { useEffect, useState, useMemo } from "react";
import { logger } from "@/lib/logger";
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
import { useGetAllPermissionsApi } from "@/actions/auth/auth-permissions";
import { groupPermissionsByResource, formatPermissionName } from "@/lib/utils";
import { RoleFormData, roleSchema } from "@/lib/schemas/schemas";
import { useCreateRoleApi } from "@/actions/role/create-role";
import { useUpdateRoleApi } from "@/actions/role/update-role";
import { useUpdateRoleCapabilitiesApi } from "@/actions/role/update-role-capabilities";
import { useGetAllRoleCapabilitiesApi, SUPPORTED_MODULES } from "@/actions/role/get-role-capabilities";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useGetARoleApi } from "@/actions/role/get-a-role";
import { useGetAllRolesApi } from "@/actions/role/get-all-roles";
import { CapabilityGroup } from "@/actions/role/get-all-roles";
import toast from "react-hot-toast";
import withPermissions from "@/components/permissions/permission-protected-routes";
import SuccessModal from "@/components/modals/SuccessModal";

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
                "border rounded-xl overflow-hidden transition-all",
                selected ? "border-primary bg-primary/5" : "border-slate-200 bg-white"
            )}
        >
            {/* Header row */}
            <div className="flex items-start p-4 gap-3">
                <Checkbox
                    checked={selected}
                    onCheckedChange={onToggle}
                    className="mt-0.5 w-4 h-4 shrink-0 border-2 border-slate-300 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                    id={group.key}
                />
                <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
                    <p className={cn("text-sm font-semibold", selected ? "text-primary" : "text-slate-800")}>
                        {group.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{group.description}</p>
                </div>
                {/* Expand / collapse */}
                <button
                    type="button"
                    onClick={() => setExpanded(v => !v)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors shrink-0"
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
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 bg-slate-50/70">
                    <p className="text-xs font-medium text-slate-500 mb-2">Includes the following permissions:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6">
                        {group.permissions.map(p => (
                            <div key={p.permissionId} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                <span className="text-xs text-slate-600">{formatPermissionName(p.name)}</span>
                            </div>
                        ))}
                        {group.permissions.length === 0 && (
                            <p className="text-xs text-slate-400 col-span-2">No individual permissions listed.</p>
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
        <div className="space-y-2">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 w-full text-left"
            >
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</h3>
                <div className="flex-1 h-px bg-slate-100" />
                {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
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
        watch,
        getValues,
        reset,
    } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema) as any,
        defaultValues: { name: "", description: "", isActive: true, permissionIds: [] },
    });

    const selectedPermissionIds = watch("permissionIds") || [];
    const formValues = watch();

    // Group flat permissions by resource (for Advanced tab), sorted alphabetically
    const [permissionGroups, setPermissionGroups] = useState<ReturnType<typeof groupPermissionsByResource>>([]);
    useEffect(() => {
        if (allPermissions.data?.data) {
            const grouped = groupPermissionsByResource(allPermissions.data.data)
                .sort((a, b) => a.resource.localeCompare(b.resource));
            setPermissionGroups(grouped);
        }
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
            setSelectedCapabilityKeys(keys);
            setInitialCapabilityKeys(keys);
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
                    await updateRoleMutation.mutateAsync({ id: roleId, data });
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
                const res = await createRoleMutation.mutateAsync({ ...data, permissionIds: data.permissionIds ?? [] }) as any;
                const savedRoleId = res?.data?.roleId ?? null;
                if (savedRoleId && selectedCapabilityKeys.length > 0) {
                    await updateCapabilitiesMutation.mutateAsync({
                        roleId: savedRoleId,
                        capabilityGroupKeys: selectedCapabilityKeys,
                    });
                }
            }
            toast.success(`Role ${isEditMode ? "updated" : "created"}!`);
            setShowSuccessModal(true);
        } catch (error) {
            logger.error("Error submitting role:", error);
            const err = error as any;
            const msg = err?.response?.data?.message || err?.message || "Something went wrong. Please try again.";
            toast.error(msg);
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
                <h1 className="text-2xl font-bold mb-8">Roles and Permissions</h1>
                <div className="flex items-center justify-center py-32 text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Loading role details...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-8">Roles and Permissions</h1>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-12">
                {/* Sidebar */}
                <aside className="space-y-4">
                    <button
                        className="w-full flex items-center justify-between p-4 border-2 border-primary rounded-xl text-primary bg-white hover:bg-primary/5 transition-colors"
                        type="button"
                    >
                        <div className="flex items-center gap-3">
                            <Plus className="w-5 h-5" />
                            <span className="font-semibold">{isEditMode ? "Edit Role" : "Add New Role"}</span>
                        </div>
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </aside>

                {/* Main Content */}
                <main className="max-w-2xl">
                    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                        {/* Role Details */}
                        <section className="space-y-6">
                            <h2 className="text-xl font-bold">Describe {isEditMode ? "" : "New "}Role</h2>

                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-semibold">
                                    Role Name<span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    placeholder="Enter role name"
                                    className="h-12 border-gray-200 rounded-lg focus-visible:ring-primary"
                                    {...register("name")}
                                />
                                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-semibold">
                                    Description<span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe role"
                                    className="min-h-[100px] resize-none border-gray-200 rounded-lg focus-visible:ring-primary"
                                    {...register("description")}
                                />
                                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
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
                                        {Object.entries(capabilitiesByModule).map(([mod, groups]) =>
                                            groups.length > 0 ? (
                                                <CapabilityModuleSection
                                                    key={mod}
                                                    moduleName={mod}
                                                    groups={groups}
                                                    selectedKeys={selectedCapabilityKeys}
                                                    onToggle={handleCapabilityToggle}
                                                />
                                            ) : null
                                        )}
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
                                <Accordion type="single" collapsible className="w-full border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <AccordionItem value="permissions" className="border-none">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline bg-slate-50 hover:bg-slate-100 transition-colors [&[data-state=open]]:border-b [&[data-state=open]]:border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-base font-semibold text-slate-800">Individual Permissions</p>
                                                    <p className="text-xs text-slate-500 font-normal">
                                                        {selectedPermissionIds.length} permission{selectedPermissionIds.length !== 1 ? "s" : ""} selected
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronDown className="w-5 h-5 text-slate-500 transition-transform duration-200 ml-auto flex-shrink-0" />
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pb-6 pt-6 bg-white">
                                            <div className="space-y-8">
                                                {permissionGroups.map(group => (
                                                    <div key={group.resource} className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                                                {formatPermissionName(group.resource)}
                                                            </h3>
                                                            <div className="flex-1 h-px bg-slate-100" />
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
                                                            {group.permissions.map(permission => (
                                                                <div key={permission.permissionId} className="flex items-center space-x-3 py-1.5 px-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                                                                    <Checkbox
                                                                        id={permission.permissionId}
                                                                        checked={selectedPermissionIds.includes(permission.permissionId)}
                                                                        onCheckedChange={() => handlePermissionToggle(permission.permissionId)}
                                                                        className="w-5 h-5 border-2 border-slate-300 rounded data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                                                                    />
                                                                    <label
                                                                        htmlFor={permission.permissionId}
                                                                        className="text-sm font-medium leading-none cursor-pointer text-slate-600"
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
                        <div className="flex justify-end gap-4 pt-8 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                className="px-8 h-12 rounded-xl text-slate-700 border-slate-200"
                                onClick={handleCancel}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="px-12 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white"
                                disabled={isLoading || (isEditMode && !isDirty && JSON.stringify([...selectedCapabilityKeys].sort()) === JSON.stringify([...initialCapabilityKeys].sort()))}
                                onClick={handleDirectSubmit}
                            >
                                {isLoading
                                    ? (isEditMode ? "Updating…" : "Creating…")
                                    : (isEditMode ? "Update Role" : "Create Role")
                                }
                            </Button>
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
