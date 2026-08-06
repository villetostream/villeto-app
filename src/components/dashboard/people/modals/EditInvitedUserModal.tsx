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
import { AlertCircle, Loader2 } from "lucide-react";
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

const inputClass = "h-[46px] rounded-[10px] border-black/[0.1] bg-white text-[13px] shadow-[0_2px_8px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15 read-only:bg-[#f9faf9] read-only:cursor-default read-only:text-[#66706b]";

const fieldLabel = "text-[12px] font-semibold text-[#202723] uppercase tracking-[0.06em]";

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
            <DialogContent className="sm:max-w-[480px] rounded-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden gap-0 border-none shadow-xl">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-black/[0.06] flex-shrink-0">
                    <DialogTitle className="text-[16px] font-semibold text-[#0b100e]">Edit User Details</DialogTitle>
                    <p className="text-[13px] text-[#68726d] mt-0.5">Update role and settings for this user.</p>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
                    <div className="space-y-5 overflow-y-auto px-6 py-5 flex-1">

                        {/* Email — read-only */}
                        <div className="space-y-2">
                            <Label className={fieldLabel}>Email Address</Label>
                            <Input value={user.email} readOnly className={inputClass} />
                            <p className="text-[11px] text-[#84908a]">From directory · read-only</p>
                        </div>

                        {/* Name — read-only */}
                        <div className="space-y-2">
                            <Label className={fieldLabel}>Full Name</Label>
                            <Input value={user.name} readOnly className={inputClass} />
                            <p className="text-[11px] text-[#84908a]">From directory · read-only</p>
                        </div>

                        {/* Role — editable */}
                        <div className="space-y-2">
                            <Label className={fieldLabel}>
                                User Role<span className="text-red-500 ml-0.5">*</span>
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
                                        <SelectTrigger className="h-[46px] rounded-[10px] border-black/[0.1] text-[13px] focus:ring-[#0ea894]/20 focus:border-[#0ea894]">
                                            <SelectValue
                                                placeholder={rolesApi.isLoading ? "Loading roles…" : "Select role"}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rolesApi.isLoading ? (
                                                <SelectItem value="__loading" disabled>
                                                    <span className="flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" />Loading…</span>
                                                </SelectItem>
                                            ) : (rolesApi.data?.data ?? []).length === 0 ? (
                                                <SelectItem value="__empty" disabled>No roles available</SelectItem>
                                            ) : (
                                                (rolesApi.data?.data ?? [])
                                                    .slice()
                                                    .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                                                    .map((role) => (
                                                        <SelectItem key={role.roleId ?? role.name} value={role.name}>
                                                            {role.name
                                                                ?.replace(/_/g, " ")
                                                                .toLowerCase()
                                                                .replace(/^\w/, (c: string) => c.toUpperCase())}
                                                        </SelectItem>
                                                    ))
                                            )}
                                            <SelectItem
                                                value="__create_custom"
                                                className="text-[#087f70] font-semibold border-t mt-1 cursor-pointer"
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
                                <Label className={fieldLabel}>Department</Label>
                                <Input value={user.department} readOnly className={inputClass} />
                                <p className="text-[11px] text-[#84908a]">From directory · read-only</p>
                            </div>
                        )}

                        {/* Ownership slider — only for Owner roles */}
                        {isOwnerRole && (
                            <div className="space-y-4 pt-1">
                                <div className="flex items-center justify-between">
                                    <Label className={fieldLabel}>
                                        Ownership %<span className="text-red-500 ml-0.5">*</span>
                                    </Label>
                                    <span className={`text-[13px] font-semibold ${(ownershipValue ?? 0) >= MAX_OWNERSHIP ? "text-red-500" : "text-[#087f70]"}`}>
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
                                    <p className="text-red-500 text-[12px] flex items-center gap-1.5">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        Ownership cannot exceed 25% to stay compliant with financial regulations
                                    </p>
                                )}

                                {/* Compliance note */}
                                <div className="flex items-start gap-3 p-3 bg-[#e7f6f2] rounded-[10px] border border-[#0ea894]/20">
                                    <div className="w-4 h-4 rounded-[4px] bg-[#0ea894] flex items-center justify-center shrink-0 mt-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[13px] font-semibold text-[#0b100e]">No single owner holds 25% or more</p>
                                        <p className="text-[12px] text-[#66706b]">Required to stay compliant with financial regulations</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Corporate Card */}
                        <div className="pt-2 border-t border-black/[0.06]">
                            <div className="flex items-center justify-between mt-3">
                                <div>
                                    <p className="text-[13px] font-semibold text-[#0b100e]">Issue Corporate Card</p>
                                    <p className="text-[12px] text-[#68726d] mt-0.5">Automatically issue a card upon account creation</p>
                                </div>
                                <Controller
                                    control={control}
                                    name="issueCard"
                                    render={({ field }) => (
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-[#0ea894]"
                                        />
                                    )}
                                />
                            </div>
                        </div>

                    </div>

                    {/* Sticky footer */}
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-black/[0.06] flex-shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="h-[44px] rounded-[10px] border-black/[0.1] text-[#303834] hover:bg-[#f5f7f6] text-[13px] font-semibold px-5"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="h-[44px] rounded-[10px] bg-[#0ea894] hover:bg-[#0c9785] text-white text-[13px] font-semibold px-6 shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all"
                        >
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
