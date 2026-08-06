"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { UserPlus, Pencil, Trash2, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGetVilletoRolesApi } from "@/queries/role/get-all-roles";
import { EditInvitedUserModal } from "@/components/dashboard/people/modals/EditInvitedUserModal";
import { useGetDirectoryUsersApi } from "@/queries/users/get-all-users";
import { AppUser } from "@/queries/departments/get-all-departments";
import { useAxios } from "@/hooks/useAxios";
import { API_KEYS } from "@/lib/constants/apis";
import { toast } from "sonner";
import { asArray, asRecord, getApiErrorMessage, getString, isRecord, pickString } from "@/lib/types/api-error";

interface StagedUser {
    id: string;           // local keying
    directoryUserId: string;
    email: string;
    name: string;
    role: string;
    roleId: string;
    department: string;
    issueCard: boolean;
    ownershipPercentage?: number;
}

interface FormValues {
    role: string;
    issueCard: boolean;
    ownershipPercentage?: number;
}

export default function InviteLeadershipPage() {
    const router = useRouter();
    const axios = useAxios();
    const rolesApi = useGetVilletoRolesApi();
    const directoryApi = useGetDirectoryUsersApi();
    const [isUserAlreadyInvited, setIsUserAlreadyInvited] = useState(false);

    // Memoize to keep array reference stable and avoid infinite useEffect loops
    const directoryUsers: AppUser[] = useMemo(
        () => directoryApi?.data?.data ?? [],
        [directoryApi?.data?.data]
    );

    // --- Email autocomplete state ---
    const [emailQuery, setEmailQuery] = useState("");
    const [selectedDirUser, setSelectedDirUser] = useState<AppUser | null>(null);
    const [isEmailNotFound, setIsEmailNotFound] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [stagedUserSeq, setStagedUserSeq] = useState(0);

    // --- Staged users list ---
    const [stagedUsers, setStagedUsers] = useState<StagedUser[]>([]);
    const [isInviting, setIsInviting] = useState(false);

    // --- Edit modal ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<StagedUser | null>(null);

    const { handleSubmit, reset, control } = useForm<FormValues>({
        defaultValues: { role: "", issueCard: false, ownershipPercentage: 0 },
    });

    const selectedRole = useWatch({ control, name: "role", defaultValue: "" });
    const ownershipValue = useWatch({ control, name: "ownershipPercentage", defaultValue: 0 });

    const isOrganizationOwner = selectedRole.toLowerCase().includes("owner");

    const suggestions = useMemo(() => {
        if (!emailQuery) return [];
        const q = emailQuery.toLowerCase();
        return directoryUsers
            .filter((u) => u.email?.toLowerCase().includes(q))
            .filter((u) => {
                const isInvited = u.status === "Active" || (u.loginCount ?? 0) > 0;
                const isExactMatch = u.email?.toLowerCase() === q;
                return !isInvited || isExactMatch;
            })
            .slice(0, 8);
    }, [emailQuery, directoryUsers]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelectSuggestion = (user: AppUser) => {
        setEmailQuery(user.email);
        setSelectedDirUser(user);
        setIsEmailNotFound(false);
        setIsUserAlreadyInvited(user.status === "Active" || (user.loginCount ?? 0) > 0);
        setShowSuggestions(false);
    };

    const handleEmailBlur = () => {
        setTimeout(() => {
            // Only validate if user didn't just click a suggestion
            if (showSuggestions) return;
            if (!emailQuery) return;
            const exact = directoryUsers.find(
                (u) => u.email?.toLowerCase() === emailQuery.toLowerCase()
            );
            if (exact) {
                setSelectedDirUser(exact);
                setIsEmailNotFound(false);
                setIsUserAlreadyInvited(exact.status === "Active" || (exact.loginCount ?? 0) > 0);
            } else if (!selectedDirUser || selectedDirUser.email.toLowerCase() !== emailQuery.toLowerCase()) {
                setSelectedDirUser(null);
                setIsEmailNotFound(true);
                setIsUserAlreadyInvited(false);
            }
        }, 150);
    };

    const resetForm = () => {
        setEmailQuery("");
        setSelectedDirUser(null);
        setIsEmailNotFound(false);
        setIsUserAlreadyInvited(false);
        reset({ role: "", issueCard: false, ownershipPercentage: 0 });
    };

    const getDepartmentName = (user: AppUser): string => {
        if (!user.department) return "";
        if (typeof user.department === "string") return user.department;
        // department may be an object
        const dept = asRecord(user.department);
        return pickString(dept, "departmentName", "name");
    };

    const onSubmit = (data: FormValues) => {
        if (!selectedDirUser) return;

        const roles = asArray(rolesApi.data?.data).filter(isRecord);
        const matchedRole = roles.find((r) => getString(r.name) === selectedRole);
        const roleId = getString(matchedRole?.roleId);

        const newUser: StagedUser = {
            id: `${selectedDirUser.userId}-${stagedUserSeq}`,
            directoryUserId: selectedDirUser.userId,
            email: selectedDirUser.email,
            name: `${selectedDirUser.firstName} ${selectedDirUser.lastName}`.trim(),
            role: selectedRole,
            roleId,
            department: getDepartmentName(selectedDirUser),
            issueCard: data.issueCard,
            ownershipPercentage: isOrganizationOwner ? data.ownershipPercentage : undefined,
        };

        setStagedUsers((prev) => [...prev, newUser]);
        setStagedUserSeq((seq) => seq + 1);
        resetForm();
    };

    const handleDeleteUser = (id: string) => {
        setStagedUsers((prev) => prev.filter((u) => u.id !== id));
    };

    const handleEditUser = (user: StagedUser) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = (updated: StagedUser) => {
        setStagedUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const handleInviteAll = async () => {
        if (stagedUsers.length === 0) return;
        setIsInviting(true);
        try {
            const admins = stagedUsers.map((u) => {
                const entry: Record<string, unknown> = {
                    email: u.email,
                    roleId: u.roleId,
                };
                if (u.ownershipPercentage !== undefined) {
                    entry.percentageOfOwnership = u.ownershipPercentage;
                }
                return entry;
            });

            await axios.post(API_KEYS.COMPANY.ADMIN_INVITES, { admins });

            toast.success("Invitations sent successfully!");
            // Notify setup guide — ticks "invitations" step
            window.dispatchEvent(new CustomEvent("villeto:invitation-sent"));
            router.push("/people?tab=directory");
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "Failed to send invitations. Please try again."));
        } finally {
            setIsInviting(false);
        }
    };

    const canAddUser = !!selectedDirUser && !isEmailNotFound && !isUserAlreadyInvited && !!selectedRole;

    return (
        <div className="p-6 max-w-7xl mx-auto flex flex-col">
            {/* Header */}
            <div className="mb-5 w-full lg:w-1/2">
                <h1 className="text-[22px] font-semibold text-[#0b100e] leading-tight tracking-[-0.02em]">Leadership &amp; Admin Invite</h1>
                <p className="text-[13px] text-[#66706b] mt-1.5 leading-relaxed">
                    These are for managers, finance admins, organisation owners and auditors.
                </p>
                <Link href="#" className="text-[13px] text-[#087f70] hover:text-[#065f55] font-semibold block mt-1 transition-colors">
                    View Permissions
                </Link>
            </div>

            {/* Setup guide tip */}
            <div className="flex items-start gap-3 bg-[#e7f6f2] border border-[#0ea894]/25 rounded-[12px] px-4 py-3 mb-6 w-full">
                <div className="w-5 h-5 rounded-full bg-[#087f70] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5L8.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div>
                    <p className="text-[13px] font-semibold text-[#065f46]">
                        {stagedUsers.length === 0 ? "Enter user details to invite leadership" : `${stagedUsers.length} user${stagedUsers.length !== 1 ? "s" : ""} ready — click Send Invitation →`}
                    </p>
                    <p className="text-[12px] text-[#047857] mt-0.5">
                        {stagedUsers.length === 0
                            ? "Type an email address to search your directory, select a role, then click Add User."
                            : "Review the users on the right side, then click the Send Invitation button to complete this step."}
                    </p>
                </div>
            </div>

            <div className="flex gap-6 items-start">
                {/* Left Side - Form */}
                <div className="w-full lg:w-1/2">
                    <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_16px_rgba(14,28,23,0.04)] p-6">
                        <h2 className="text-[15px] font-semibold text-[#0b100e] mb-5">User Information</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {/* Email with autocomplete */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-[12px] font-semibold text-[#202723] uppercase tracking-[0.06em]">
                                Email Address<span className="text-red-500 ml-0.5">*</span>
                            </label>
                            <div className="relative" ref={suggestionsRef}>
                                <Input
                                    id="email"
                                    placeholder="emma@company.com"
                                    value={emailQuery}
                                    autoComplete="off"
                                    onChange={(e) => {
                                        setEmailQuery(e.target.value);
                                        setSelectedDirUser(null);
                                        setIsEmailNotFound(false);
                                        setIsUserAlreadyInvited(false);
                                        setShowSuggestions(e.target.value.length > 0);
                                    }}
                                    onBlur={handleEmailBlur}
                                    onFocus={() => {
                                        if (suggestions.length > 0) setShowSuggestions(true);
                                    }}
                                    className={`h-[46px] rounded-[10px] border-black/[0.1] text-[13px] shadow-[0_2px_8px_rgba(14,28,23,0.04)] placeholder:text-[#98a09c] focus-visible:border-[#0ea894] focus-visible:ring-[#0ea894]/15 ${
                                        isEmailNotFound
                                            ? "border-red-400 focus-visible:border-red-400"
                                            : isUserAlreadyInvited
                                            ? "border-amber-400 focus-visible:border-amber-400"
                                            : selectedDirUser
                                            ? "border-[#0ea894] focus-visible:border-[#0ea894]"
                                            : ""
                                    }`}
                                />
                                {/* Suggestions dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-black/[0.08] rounded-[12px] shadow-[0_8px_24px_rgba(14,28,23,0.1)] max-h-48 overflow-y-auto">
                                        {suggestions.map((suggestion) => {
                                            const isInvited = suggestion.status === "Active" || (suggestion.loginCount ?? 0) > 0;
                                            return (
                                                <button
                                                    key={suggestion.userId}
                                                    type="button"
                                                    className={`w-full text-left px-4 py-2.5 hover:bg-[#f5f7f6] transition-colors border-b border-black/[0.04] last:border-0 first:rounded-t-[12px] last:rounded-b-[12px] ${isInvited ? 'opacity-50' : ''}`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        handleSelectSuggestion(suggestion);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-[13px] font-semibold text-[#0b100e]">
                                                            {suggestion.firstName} {suggestion.lastName}
                                                        </p>
                                                        {isInvited && <span className="text-[10px] bg-[#f5f7f6] text-[#68726d] px-2 py-0.5 rounded-full border border-black/[0.06]">Already Invited</span>}
                                                    </div>
                                                    <p className="text-[12px] text-[#68726d]">{suggestion.email}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            {/* Status indicators */}
                            {selectedDirUser && !isUserAlreadyInvited && (
                                <p className="text-[12px] text-[#087f70] flex items-center gap-1.5 mt-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Found in directory
                                </p>
                            )}
                            {isUserAlreadyInvited && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200/60 rounded-[10px] mt-1">
                                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-[13px] font-semibold text-amber-800">User already active</p>
                                        <p className="text-[12px] text-amber-700 mt-0.5">
                                            This user has already been invited to Villeto and cannot be invited again.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {isEmailNotFound && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200/60 rounded-[10px] mt-1">
                                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-[13px] font-semibold text-red-700">User not found in directory</p>
                                        <p className="text-[12px] text-red-600 mt-0.5">
                                            Please{" "}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    sessionStorage.setItem("uploadDirReferrer", "leadership");
                                                    router.push("/people/invite/employees?step=upload");
                                                }}
                                                className="underline font-medium cursor-pointer"
                                            >
                                                upload this user to the directory
                                            </button>{" "}
                                            first.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Name — auto-filled from directory, read-only */}
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-[12px] font-semibold text-[#202723] uppercase tracking-[0.06em]">
                                Full Name<span className="text-red-500 ml-0.5">*</span>
                            </label>
                            <Input
                                id="name"
                                placeholder="Auto-filled from directory"
                                value={
                                    selectedDirUser
                                        ? `${selectedDirUser.firstName} ${selectedDirUser.lastName}`.trim()
                                        : ""
                                }
                                readOnly
                                className="h-[46px] rounded-[10px] border-black/[0.1] text-[13px] bg-[#f9faf9] cursor-default text-[#66706b]"
                            />
                            {selectedDirUser && (
                                <p className="text-[11px] text-[#84908a]">Auto-filled from directory · read-only</p>
                            )}
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <label htmlFor="role" className="text-[12px] font-semibold text-[#202723] uppercase tracking-[0.06em]">
                                User Role<span className="text-red-500 ml-0.5">*</span>
                            </label>
                            <Controller
                                control={control}
                                name="role"
                                rules={{ required: true }}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={(val) => {
                                            if (val === "__create_custom") {
                                                sessionStorage.setItem("rolesReturnPath", "/people/invite/leadership");
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
                                                    Loading…
                                                </SelectItem>
                                            ) : (rolesApi.data?.data ?? []).length === 0 ? (
                                                <SelectItem value="__empty" disabled>
                                                    No roles available
                                                </SelectItem>
                                            ) : (
                                                (rolesApi.data?.data ?? [])
                                                    .filter(isRecord)
                                                    .filter((role) => !getString(role.name).toLowerCase().includes("employee"))
                                                    .map((role) => (
                                                    <SelectItem
                                                        key={getString(role.roleId) || getString(role.name)}
                                                        value={getString(role.name)}
                                                    >
                                                        {getString(role.name)
                                                            .replace(/_/g, " ")
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

                        {/* Department — auto-filled, only shown if director user has a dept */}
                        {selectedDirUser && getDepartmentName(selectedDirUser) && (
                            <div className="space-y-2">
                                <label htmlFor="department" className="text-[12px] font-semibold text-[#202723] uppercase tracking-[0.06em]">
                                    Department
                                </label>
                                <Input
                                    id="department"
                                    value={getDepartmentName(selectedDirUser)}
                                    readOnly
                                    className="h-[46px] rounded-[10px] border-black/[0.1] text-[13px] bg-[#f9faf9] cursor-default text-[#66706b]"
                                />
                                <p className="text-[11px] text-[#84908a]">Auto-filled from directory · read-only</p>
                            </div>
                        )}

                        {/* Ownership slider — only for Organization Owner */}
                        {isOrganizationOwner && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[12px] font-semibold text-[#202723] uppercase tracking-[0.06em]">
                                        Ownership %<span className="text-red-500 ml-0.5">*</span>
                                    </label>
                                    <span className={`text-[13px] font-semibold ${(ownershipValue ?? 0) >= 24 ? "text-red-500" : "text-[#087f70]"}`}>
                                        {ownershipValue || 0}%
                                        {(ownershipValue ?? 0) >= 24 && " (Max)"}
                                    </span>
                                </div>

                                <Controller
                                    control={control}
                                    name="ownershipPercentage"
                                    render={({ field }) => (
                                        <Slider
                                            value={[field.value || 0]}
                                            onValueChange={(val) => field.onChange(val[0])}
                                            max={24}
                                            step={1}
                                            className="w-full"
                                        />
                                    )}
                                />

                                {(ownershipValue ?? 0) >= 24 && (
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
                        <div className="pt-4 border-t border-black/[0.06]">
                            <h3 className="text-[13px] font-semibold text-[#0b100e] mb-3">Corporate Card</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[13px] font-semibold text-[#0b100e]">Issue Corporate Card</p>
                                    <p className="text-[12px] text-[#68726d] mt-0.5">
                                        Automatically issue a card upon account creation
                                    </p>
                                </div>
                                <Controller
                                    control={control}
                                    name="issueCard"
                                    render={({ field }) => (
                                        <Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-[#0ea894]" />
                                    )}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                type="submit"
                                data-tour="leadership-add-user-button"
                                disabled={!canAddUser}
                                className="h-[44px] rounded-[10px] bg-[#0ea894] hover:bg-[#0c9785] text-white text-[13px] font-semibold px-6 shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 w-full sm:w-auto min-w-[120px]"
                            >
                                Add User
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Users Added List */}
            <div className="hidden lg:block w-1/2">
                <div className="bg-white rounded-[14px] border border-black/[0.08] shadow-[0_4px_16px_rgba(14,28,23,0.04)] min-h-[500px] flex flex-col">
                    <div className="px-5 py-4 border-b border-black/[0.06] flex items-center gap-2">
                        <h3 className="text-[14px] font-semibold text-[#0b100e]">Users Added</h3>
                        <span className="bg-[#f5f7f6] border border-black/[0.06] px-2 py-0.5 rounded-full text-[11px] font-semibold text-[#68726d]">
                            {stagedUsers.length}
                        </span>
                    </div>

                    {stagedUsers.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-14 h-14 bg-[#e7f6f2] rounded-[14px] flex items-center justify-center mb-4">
                                <UserPlus className="w-6 h-6 text-[#087f70]" strokeWidth={1.7} />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0b100e]">No users added yet</h3>
                            <p className="text-[13px] text-[#66706b] mt-1 leading-relaxed">
                                Use the entry form to start adding users you want to invite.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 p-4 space-y-1 overflow-y-auto max-h-[500px]">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 text-[11px] font-semibold text-[#84908a] uppercase tracking-[0.06em] pb-2 px-2 border-b border-black/[0.05]">
                                <div className="col-span-4">Full name</div>
                                <div className="col-span-4">Email</div>
                                <div className="col-span-3">Role</div>
                                <div className="col-span-1"></div>
                            </div>

                            {stagedUsers.map((u) => (
                                <div
                                    key={u.id}
                                    className="grid grid-cols-12 items-center text-[13px] py-2.5 px-2 hover:bg-[#f5f7f6] rounded-[8px] border-b border-black/[0.04] last:border-0 transition-colors"
                                >
                                    <div className="col-span-4 font-semibold text-[#0b100e] truncate pr-2" title={u.name}>
                                        {u.name}
                                    </div>
                                    <div className="col-span-4 text-[#68726d] truncate pr-2" title={u.email}>
                                        {u.email}
                                    </div>
                                    <div className="col-span-3 text-[#0b100e] truncate">{u.role}</div>
                                    <div className="col-span-1 flex justify-end gap-1.5">
                                        <button
                                            onClick={() => handleEditUser(u)}
                                            className="w-6 h-6 flex items-center justify-center rounded-[6px] text-[#84908a] hover:text-[#087f70] hover:bg-[#e7f6f2] transition-colors"
                                        >
                                            <Pencil size={13} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="w-6 h-6 flex items-center justify-center rounded-[6px] text-[#84908a] hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="px-4 py-4 border-t border-black/[0.06] mt-auto">
                        <Button
                            data-tour="leadership-send-invitation-button"
                            className="w-full h-[44px] rounded-[10px] bg-[#0ea894] hover:bg-[#0c9785] text-[13px] font-semibold shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                            disabled={stagedUsers.length === 0 || isInviting}
                            onClick={handleInviteAll}
                        >
                            {isInviting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending invites…
                                </>
                            ) : (
                                `Invite ${stagedUsers.length} User${stagedUsers.length !== 1 ? "s" : ""}`
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            </div>

            <EditInvitedUserModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={editingUser}
                onSave={handleUpdateUser}
            />
        </div>
    );
}