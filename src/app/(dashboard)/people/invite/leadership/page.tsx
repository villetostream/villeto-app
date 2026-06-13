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
            {/* Header - Moved outside to align left/right containers */}
            <div className="mb-6 w-full lg:w-1/2">
                <h1 className="text-2xl font-bold text-gray-900">Leadership &amp; Admin Invite</h1>
                <p className="text-gray-500 mt-1">
                    These are for managers, finance admin, Organization owner and auditors.
                </p>
                <Link href="#" className="text-sm text-[#00BFA5] hover:underline block mt-1">
                    View Permissions
                </Link>
            </div>

            {/* Inline setup guide tip — non-blocking */}
            <div className="flex items-start gap-3 bg-[#f0fdf9] border border-[#a7f3d0] rounded-xl px-4 py-3 mb-6 w-full">
                <div className="w-5 h-5 rounded-full bg-[#0d9488] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5L8.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div>
                    <p className="text-sm font-semibold text-[#065f46]">
                        {stagedUsers.length === 0 ? "Enter user details to invite leadership" : `${stagedUsers.length} user${stagedUsers.length !== 1 ? "s" : ""} ready — click Send Invitation →`}
                    </p>
                    <p className="text-xs text-[#047857] mt-0.5">
                        {stagedUsers.length === 0
                            ? "Type an email address to search your directory, select a role, then click Add User."
                            : "Review the users on the right side, then click the Send Invitation button to complete this step."}
                    </p>
                </div>
            </div>

            <div className="flex gap-6 items-start">
                {/* Left Side - Form */}
                <div className="w-full lg:w-1/2">
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h2 className="text-lg font-semibold mb-6">User Information</h2>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email with autocomplete */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">
                                Email Address<span className="text-red-500">*</span>
                            </Label>
                            <div className="relative" ref={suggestionsRef}>
                                <Input
                                    id="email"
                                    placeholder="Emma@company.com"
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
                                    className={
                                        isEmailNotFound
                                            ? "border-red-400 focus:border-red-400"
                                            : isUserAlreadyInvited
                                            ? "border-blue-400 focus:border-blue-400"
                                            : selectedDirUser
                                            ? "border-green-400 focus:border-green-400"
                                            : ""
                                    }
                                />
                                {/* Suggestions dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {suggestions.map((suggestion) => {
                                            const isInvited = suggestion.status === "Active" || (suggestion.loginCount ?? 0) > 0;
                                            return (
                                                <button
                                                    key={suggestion.userId}
                                                    type="button"
                                                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-0 ${isInvited ? 'opacity-50' : ''}`}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // prevent blur from firing first
                                                        handleSelectSuggestion(suggestion);
                                                    }}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {suggestion.firstName} {suggestion.lastName}
                                                        </p>
                                                        {isInvited && <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Already Invited</span>}
                                                    </div>
                                                    <p className="text-xs text-gray-500">{suggestion.email}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            {/* Status indicators */}
                            {selectedDirUser && !isUserAlreadyInvited && (
                                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Found in directory
                                </p>
                            )}
                            {isUserAlreadyInvited && (
                                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mt-1">
                                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-700">User already active</p>
                                        <p className="text-xs text-blue-600 mt-0.5">
                                            This user has already been invited to Villeto and cannot be invited again.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {isEmailNotFound && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mt-1">
                                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-red-700">User not found in directory</p>
                                        <p className="text-xs text-red-600 mt-0.5">
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
                            <Label htmlFor="name" className="text-sm font-medium">
                                Name<span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="name"
                                placeholder="Auto-filled from directory"
                                value={
                                    selectedDirUser
                                        ? `${selectedDirUser.firstName} ${selectedDirUser.lastName}`.trim()
                                        : ""
                                }
                                readOnly
                                className={selectedDirUser ? "bg-gray-50 cursor-default" : "bg-gray-50"}
                            />
                            {selectedDirUser && (
                                <p className="text-xs text-gray-400 mt-0.5">Auto-filled from directory · read-only</p>
                            )}
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-sm font-medium">
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
                                                sessionStorage.setItem("rolesReturnPath", "/people/invite/leadership");
                                                router.push("/people/create-role");
                                            } else {
                                                field.onChange(val);
                                            }
                                        }}
                                        value={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={rolesApi.isLoading ? "Loading roles…" : "Select Role"}
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
                                                className="text-primary font-medium border-t mt-1 cursor-pointer"
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
                                <Label htmlFor="department" className="text-sm font-medium">
                                    Department
                                </Label>
                                <Input
                                    id="department"
                                    value={getDepartmentName(selectedDirUser)}
                                    readOnly
                                    className="bg-gray-50 cursor-default"
                                />
                                <p className="text-xs text-gray-400 mt-0.5">Auto-filled from directory · read-only</p>
                            </div>
                        )}

                        {/* Ownership slider — only for Organization Owner */}
                        {isOrganizationOwner && (
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium">
                                        Percentage Ownership<span className="text-red-500">*</span>
                                    </Label>
                                    <span className={`font-semibold ${(ownershipValue ?? 0) >= 24 ? "text-red-500" : "text-[#00BFA5]"}`}>
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
                                    <p className="text-red-500 text-xs flex items-center gap-1">
                                        <AlertCircle className="h-3.5 w-3.5" />
                                        Ownership cannot exceed 25% to stay compliant with financial regulations
                                    </p>
                                )}

                                {/* Compliance note */}
                                <div className="flex items-start space-x-3 p-4 bg-[#E0F2F1] rounded-lg">
                                    <div className="flex items-center h-5">
                                        <div className="h-4 w-4 rounded border-gray-300 bg-[#00BFA5] text-white flex items-center justify-center">
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
                                    <div className="space-y-1">
                                        <Label className="text-sm font-medium text-gray-900">
                                            No Single Owner holds 25% or more
                                        </Label>
                                        <p className="text-xs text-gray-500">
                                            We ask for this to stay compliant with financial regulations
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Corporate Card */}
                        <div className="pt-4 border-t">
                            <h3 className="text-base font-medium mb-4">Corporate Card</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Issue Corporate Card</p>
                                    <p className="text-xs text-gray-500">
                                        Automatically issue a corporate card upon account creation
                                    </p>
                                </div>
                                <Controller
                                    control={control}
                                    name="issueCard"
                                    render={({ field }) => (
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    )}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                type="submit"
                                data-tour="leadership-add-user-button"
                                disabled={!canAddUser}
                                className="bg-[#00BFA5] hover:bg-[#00BFA5]/90 w-full sm:w-auto min-w-[120px] disabled:opacity-50"
                            >
                                Add User
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Users Added List */}
            <div className="hidden lg:block w-1/2">
                <div className="bg-white rounded-lg shadow-sm border min-h-[600px] flex flex-col">
                    <div className="p-4 border-b flex items-center gap-2">
                        <h3 className="font-semibold">Users Added</h3>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium text-gray-600">
                            {stagedUsers.length}
                        </span>
                    </div>

                    {stagedUsers.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <div className="bg-gray-50 p-4 rounded-xl mb-4">
                                <UserPlus className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No users added yet</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Use the entry form to start adding users that you want to invite.
                            </p>
                        </div>
                    ) : (
                        <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[600px]">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 text-xs font-semibold text-gray-500 pb-2 px-2 border-b">
                                <div className="col-span-4">Full name</div>
                                <div className="col-span-4">Email</div>
                                <div className="col-span-3">Role</div>
                                <div className="col-span-1"></div>
                            </div>

                            {stagedUsers.map((u) => (
                                <div
                                    key={u.id}
                                    className="grid grid-cols-12 items-center text-sm py-3 px-2 hover:bg-gray-50 border-b last:border-0 transition-colors"
                                >
                                    <div className="col-span-4 font-medium text-gray-900 truncate pr-2" title={u.name}>
                                        {u.name}
                                    </div>
                                    <div className="col-span-4 text-gray-500 truncate pr-2" title={u.email}>
                                        {u.email}
                                    </div>
                                    <div className="col-span-3 text-gray-900 truncate">{u.role}</div>
                                    <div className="col-span-1 flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEditUser(u)}
                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="p-4 border-t mt-auto">
                        <Button
                            data-tour="leadership-send-invitation-button"
                            className="w-full bg-[#00BFA5] hover:bg-[#00BFA5]/90 disabled:opacity-50"
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