"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { useGetAUsersApi } from "@/queries/users/get-a-user";
import { useGetARoleApi } from "@/queries/role/get-a-role";
import { useGetAllRoleCapabilitiesApi } from "@/queries/role/get-role-capabilities";
import { useUpdateRoleCapabilitiesApi } from "@/queries/role/update-role-capabilities";
import { CapabilityGroupPermission } from "@/queries/role/get-all-roles";

interface UserPermissionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userId: string;
}

/**
 * UserPermissionsDialog
 * ───────────────────────────────────────────────────────────
 * Previously: `userId` was destructured and immediately discarded
 * (`userId: _userId`), the header card showed a hardcoded "Sarah
 * Chen" / sarahchen@gmail.com regardless of which user the dialog
 * was opened for, `permissions` was initialised to an empty array
 * with no fetch behind it, and "Save Permissions" had no onClick —
 * the whole dialog was inert UI with no data flow.
 *
 * Now: fetches the real user (for the header card), their role's
 * currently-enabled capabilities, and the full capability catalog
 * to render togglable switches against. Saves via the existing
 * useUpdateRoleCapabilitiesApi mutation, which was already defined
 * elsewhere in the codebase but never wired up here.
 *
 * Note: toggling here edits the user's ROLE's capabilities, which
 * affects every other user sharing that role — this mirrors the
 * existing roleSchema/update-role-capabilities API shape, but the
 * UI should make that blast radius clear if a non-obvious role
 * (e.g. a shared default role) is being edited. Flagged below with
 * a short note rather than silently saving.
 */
export function UserPermissionsDialog({
    open,
    onOpenChange,
    userId,
}: UserPermissionsDialogProps) {
    const {
        data: userResponse,
        isLoading: isLoadingUser,
        error: userError,
        refetch: refetchUser,
    } = useGetAUsersApi(userId, { enabled: open && !!userId });

    const user = userResponse?.data;
    const roleId = user?.role?.roleId;

    const {
        data: roleResponse,
        isLoading: isLoadingRole,
        error: roleError,
        refetch: refetchRole,
    } = useGetARoleApi(roleId ?? "", { enabled: open && !!roleId });

    const {
        data: allCapabilities,
        isLoading: isLoadingCapabilities,
        error: capabilitiesError,
        refetch: refetchCapabilities,
    } = useGetAllRoleCapabilitiesApi(undefined, open);

    const updateCapabilities = useUpdateRoleCapabilitiesApi();

    // Flat list of every togglable permission across all capability
    // groups, deduplicated by permissionId.
    const allPermissions = useMemo<CapabilityGroupPermission[]>(() => {
        if (!allCapabilities) return [];
        const seen = new Map<string, CapabilityGroupPermission>();
        for (const group of allCapabilities) {
            for (const perm of group.permissions ?? []) {
                seen.set(perm.permissionId, perm);
            }
        }
        return Array.from(seen.values());
    }, [allCapabilities]);

    // Local toggle state, seeded from the role's currently-enabled
    // capability group keys once both the catalog and the role have
    // loaded. Re-seeds whenever a different role's data arrives.
    const [enabledGroupKeys, setEnabledGroupKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (roleResponse?.data?.capabilityGroupKeys) {
            setEnabledGroupKeys(new Set(roleResponse.data.capabilityGroupKeys));
        }
    }, [roleResponse]);

    const groupKeyForPermission = (permissionId: string): string | undefined => {
        for (const group of allCapabilities ?? []) {
            if (group.permissions?.some((p) => p.permissionId === permissionId)) {
                return group.key;
            }
        }
        return undefined;
    };

    const togglePermission = (permissionId: string) => {
        const groupKey = groupKeyForPermission(permissionId);
        if (!groupKey) return;
        setEnabledGroupKeys((prev) => {
            const next = new Set(prev);
            if (next.has(groupKey)) next.delete(groupKey);
            else next.add(groupKey);
            return next;
        });
    };

    const handleSave = () => {
        if (!roleId) return;
        updateCapabilities.mutate(
            { roleId, capabilityGroupKeys: Array.from(enabledGroupKeys) },
            {
                onSuccess: () => {
                    toast.success("Permissions updated.");
                    onOpenChange(false);
                },
                onError: () => {
                    toast.error("Failed to update permissions. Please try again.");
                },
            }
        );
    };

    const isLoading = isLoadingUser || (!!roleId && (isLoadingRole || isLoadingCapabilities));
    const error = userError || roleError || capabilitiesError;
    const retry = () => {
        refetchUser();
        if (roleId) {
            refetchRole();
            refetchCapabilities();
        }
    };

    const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "";
    const initials = user
        ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
        : "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>User permissions</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Manage what this user&apos;s role can view, create, edit, and approve across Villeto.
                    </DialogDescription>
                </DialogHeader>

                <div className="gap-4 grid overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="space-y-4" role="status" aria-label="Loading user permissions">
                            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-3.5 w-32" />
                                    <Skeleton className="h-3 w-40" />
                                </div>
                            </div>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-between gap-4">
                                    <Skeleton className="h-3.5 w-48" />
                                    <Skeleton className="h-5 w-9 rounded-full" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <ErrorState error={error} onRetry={retry} className="border-0" />
                    ) : !roleId ? (
                        <EmptyState
                            icon={<ShieldOff className="w-5 h-5" aria-hidden="true" />}
                            title="No role assigned"
                            description="This user has no role yet, so there are no permissions to manage. Assign a role first."
                            className="border-0"
                        />
                    ) : (
                        <>
                            <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                                <Avatar>
                                    <AvatarImage src={undefined} alt="" />
                                    <AvatarFallback aria-hidden="true">{initials || "?"}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-medium">{userName || "Unknown user"}</p>
                                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                                    <p className="text-sm text-muted-foreground">{user?.jobTitle}</p>
                                </div>
                                <Badge
                                    className={
                                        user?.status === "active"
                                            ? "bg-green-50 text-green-700"
                                            : "bg-muted text-muted-foreground"
                                    }
                                >
                                    {user?.status === "active" ? "Active" : user?.status ?? "Unknown"}
                                </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground -mt-1">
                                Changes apply to everyone with the {roleResponse?.data?.name ?? "this"} role,
                                not just {userName || "this user"}.
                            </p>

                            {allPermissions.length === 0 ? (
                                <EmptyState
                                    title="No permissions available"
                                    description="There are no configurable permissions for this role's modules yet."
                                    className="border-0"
                                />
                            ) : (
                                <div className="space-y-4">
                                    {allPermissions.map((permission) => {
                                        const groupKey = groupKeyForPermission(permission.permissionId);
                                        const enabled = !!groupKey && enabledGroupKeys.has(groupKey);
                                        return (
                                            <div key={permission.permissionId} className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <label
                                                        htmlFor={`perm-${permission.permissionId}`}
                                                        className="font-medium cursor-pointer"
                                                    >
                                                        {permission.name}
                                                    </label>
                                                    <p className="text-sm text-muted-foreground">{permission.description}</p>
                                                </div>
                                                <Switch
                                                    id={`perm-${permission.permissionId}`}
                                                    checked={enabled}
                                                    onCheckedChange={() => togglePermission(permission.permissionId)}
                                                    aria-label={`Toggle ${permission.name}`}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <Button
                                className="w-full bg-primary hover:bg-primary/90"
                                onClick={handleSave}
                                disabled={updateCapabilities.isPending}
                            >
                                {updateCapabilities.isPending ? "Saving…" : "Save permissions"}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
