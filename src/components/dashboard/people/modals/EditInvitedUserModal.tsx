"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { Role, useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { useRouter } from "next/navigation";

interface StagedUser {
    id: string;
    directoryUserId: string;
    email: string;
    name: string;
    role: string;
    roleId: string;
    department: string;
    issueCard: boolean;
    ownershipPercentage?: number;
}

interface EditFormValues {
    role: string;
    issueCard: boolean;
    ownershipPercentage?: number;
}

interface EditInvitedUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: StagedUser | null;
    onSave: (updatedUser: StagedUser) => void;
}

const MAX_OWNERSHIP = 24;

export function EditInvitedUserModal({
    isOpen,
    onClose,
    user,
    onSave,
}: EditInvitedUserModalProps) {
    const router = useRouter();
    const rolesApi = useGetAllRolesApi();

    const { handleSubmit, reset, control } = useForm<EditFormValues>({
        defaultValues: { role: "", issueCard: false, ownershipPercentage: 0 },
    });

    const selectedRole = useWatch({ control, name: "role", defaultValue: "" });
    const ownershipValue = useWatch({ control, name: "ownershipPercentage", defaultValue: 0 });
    const isOwnerRole = selectedRole.toLowerCase().includes("owner");

    const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
    if (user && isOpen && user.id !== syncedUserId) {
        setSyncedUserId(user.id);
        reset({
            role: user.role ?? "",
            issueCard: user.issueCard ?? false,
            ownershipPercentage: user.ownershipPercentage ?? 0,
        });
    }

    const onSubmit = (data: EditFormValues) => {
        if (!user) return;

        // Resolve updated roleId from roles API
        const roles: Role[] = rolesApi.data?.data ?? [];
        const matchedRole = roles.find((r) => r.name === data.role);
        const roleId = matchedRole?.roleId ?? user.roleId;

        onSave({
            ...user,
            role: data.role,
            roleId,
            issueCard: data.issueCard,
            ownershipPercentage: isOwnerRole ? data.ownershipPercentage : undefined,
        });
        onClose();
    };

    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] rounded-lg max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                    <DialogTitle className="text-xl font-semibold text-gray-800">Edit User Details</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                    <div className="space-y-5 overflow-y-auto px-6 py-4 flex-1">
                    {/* Email — read-only from directory */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</Label>
                        <Input value={user.email} readOnly className="h-11 bg-gray-50 border-gray-200 text-gray-600 cursor-default" />
                        <p className="text-[11px] text-gray-400">From directory · read-only</p>
                    </div>

                    {/* Name — read-only from directory */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</Label>
                        <Input value={user.name} readOnly className="h-11 bg-gray-50 border-gray-200 text-gray-600 cursor-default" />
                        <p className="text-[11px] text-gray-400">From directory · read-only</p>
                    </div>

                    {/* Role — editable, loaded from API */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            User Type/Role<span className="text-red-500">*</span>
                        </Label>
                        <Controller
                            control={control}
                            name="role"
                            rules={{ required: true }}
                            render={({ field }) => (
                                <Select
                                    onValueChange={(val) => {
                                        if (val === "__create_custom") {
                                            router.push("/people/create-role");
                                        } else {
                                            field.onChange(val);
                                        }
                                    }}
                                    value={field.value}
                                >
                                    <SelectTrigger className="h-11 border-gray-200 focus:ring-[#03C3A6]">
                                        <SelectValue
                                            placeholder={rolesApi.isLoading ? "Loading roles…" : "Select Role"}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rolesApi.isLoading ? (
                                            <SelectItem value="__loading" disabled>Loading…</SelectItem>
                                        ) : (rolesApi.data?.data ?? []).length === 0 ? (
                                            <SelectItem value="__empty" disabled>No roles available</SelectItem>
                                        ) : (
                                            (rolesApi.data?.data ?? [])
                                                .slice()
                                                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                                                .map((role) => (
                                                <SelectItem
                                                    key={role.roleId ?? role.name}
                                                    value={role.name}
                                                >
                                                    {role.name
                                                        ?.replace(/_/g, " ")
                                                        .toLowerCase()
                                                        .replace(/^\w/, (c: string) => c.toUpperCase())}
                                                </SelectItem>
                                            ))
                                        )}
                                        <SelectItem
                                            value="__create_custom"
                                            className="text-[#03C3A6] font-medium border-t mt-1 cursor-pointer"
                                        >
                                            + Create custom role
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    {/* Department — read-only, only shown if present */}
                    {user.department && (
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</Label>
                            <Input value={user.department} readOnly className="h-11 bg-gray-50 border-gray-200 text-gray-600 cursor-default" />
                            <p className="text-[11px] text-gray-400">From directory · read-only</p>
                        </div>
                    )}

                    {/* Ownership slider — only for Owner roles */}
                    {isOwnerRole && (
                        <div className="space-y-4 pt-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Percentage Ownership<span className="text-red-500">*</span>
                                </Label>
                                <span className={`text-sm font-semibold ${(ownershipValue ?? 0) >= MAX_OWNERSHIP ? "text-red-500" : "text-[#03C3A6]"}`}>
                                    {ownershipValue ?? 0}%
                                    {(ownershipValue ?? 0) >= MAX_OWNERSHIP && " (Max)"}
                                </span>
                            </div>

                            <Controller
                                control={control}
                                name="ownershipPercentage"
                                render={({ field }) => (
                                    <Slider
                                        value={[field.value || 0]}
                                        onValueChange={(val) => field.onChange(val[0])}
                                        min={0}
                                        max={MAX_OWNERSHIP}
                                        step={1}
                                        className="w-full"
                                    />
                                )}
                            />

                            {(ownershipValue ?? 0) >= MAX_OWNERSHIP && (
                                <p className="text-red-500 text-xs flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Ownership cannot exceed 25% to stay compliant with financial regulations
                                </p>
                            )}

                            {/* Compliance note */}
                            <div className="flex items-start space-x-3 p-3 bg-[#E0F2F1] rounded-lg">
                                <div className="flex items-center h-5">
                                    <div className="h-4 w-4 rounded bg-[#03C3A6] flex items-center justify-center">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="w-3 h-3 text-white"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold text-gray-900">
                                        No Single Owner holds 25% or more
                                    </Label>                                   <p className="text-xs text-gray-500">
                                        We ask for this to stay compliant with financial regulations
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Corporate Card */}
                    <div className="pt-2 border-t">
                        <div className="flex items-center justify-between mt-3">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Issue Corporate Card</p>
                                <p className="text-xs text-gray-500">Automatically issue a corporate card upon account creation</p>
                            </div>
                            <Controller
                                control={control}
                                name="issueCard"
                                render={({ field }) => (
                                    <Switch 
                                        checked={field.value} 
                                        onCheckedChange={field.onChange} 
                                        className="data-[state=checked]:bg-[#03C3A6]"
                                    />
                                )}
                            />
                        </div>
                    </div>

                    </div>{/* end scrollable content */}

                    {/* Sticky footer buttons — outside scroll area */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t flex-shrink-0">
                        <Button type="button" variant="outline" onClick={onClose} className="h-11 rounded-lg border-gray-800 text-gray-800 hover:bg-gray-50 font-medium">
                            Cancel
                        </Button>
                        <Button type="submit" className="h-11 rounded-lg bg-[#03C3A6] hover:bg-[#03C3A6]/90 text-white font-medium px-8 transition-colors">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
