import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, AlertCircle } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import FormFieldInput from "../form fields/formFieldInput";
import { Form } from "../ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getFormSchema } from "@/lib/schemas/schemas";
import z from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Briefcase01Icon, InformationCircleIcon, MailAtSign01Icon, User03FreeIcons, UserAdd01FreeIcons } from "@hugeicons/core-free-icons";
import { useAuthStore } from "@/stores/auth-stores";
import { useOnboardingStore } from "@/stores/useVilletoStore";

interface EditingPerson {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    villetoRole?: { name?: string };
    ownershipPercentage?: number;
}

interface AddBeneficialOwnerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (owner: {
        firstName: string;
        lastName: string;
        role: string;
        email: string;
        ownershipPercentage?: number;
        isSelf: boolean;
    }) => void;
    mode?: "beneficial" | "officer";
    editingPerson?: EditingPerson | null;
    isOwner?: boolean;
    hideSelfOption?: boolean;
    globalIsOwnershipCapped?: boolean | null;
    totalAllocated?: number;
    isFirstOwner?: boolean;
}

export const AddBeneficialOwnerModal = ({
    isOpen,
    onClose,
    onAdd,
    mode = "beneficial",
    editingPerson,
    isOwner,
    hideSelfOption,
    globalIsOwnershipCapped,
    totalAllocated = 0,
    isFirstOwner
}: AddBeneficialOwnerModalProps) => {
    const schema = getFormSchema(mode, isOwner);
    const isBeneficialOwner = mode === "beneficial" || isOwner;
    const currentUser = useAuthStore(s => s.user);
    const preOnboarding = useOnboardingStore(s => s.preOnboarding);
    const contactEmail = useOnboardingStore(s => s.contactEmail);

    const form = useForm({
        resolver: zodResolver(schema),
        mode: "onChange",
        defaultValues: {
            firstName: "",
            lastName: "",
            ...(isBeneficialOwner ? {} : { role: "" }),
            email: "",
            ownershipPercentage: undefined,
        }
    });
    const { handleSubmit, formState: { isValid }, setValue, reset, control } = form;

    // "I'm also a beneficiary owner" checkbox state
    const [isSelf, setIsSelf] = useState(false);

    // compliance checkbox — tracks whether ownership is capped at 25%
    const [complianceChecked, setComplianceChecked] = useState(
        globalIsOwnershipCapped !== null && globalIsOwnershipCapped !== undefined ? globalIsOwnershipCapped : true
    );

    useEffect(() => {
        if (globalIsOwnershipCapped !== null && globalIsOwnershipCapped !== undefined) {
            setComplianceChecked(globalIsOwnershipCapped);
        }
    }, [globalIsOwnershipCapped]);

    const ownershipValue = useWatch({ control, name: "ownershipPercentage" });
    const currentOwnerPercentage = editingPerson?.ownershipPercentage ?? 0;
    const availablePercentage = Math.max(0, 100 - totalAllocated + currentOwnerPercentage);
    const maxOwnership = Math.min(complianceChecked ? 25 : 100, availablePercentage);

    // When the "I'm also" checkbox is toggled ON, populate from current user or onboarding state
    const handleIsSelfChange = (checked: boolean) => {
        setIsSelf(checked);
        if (checked) {
            // During onboarding the user isn't fully logged-in via the main auth flow.
            // The contactEmail/preOnboarding store is the reliable source of truth here.
            const fName = preOnboarding?.contactFirstName || currentUser?.firstName || "";
            const lName = preOnboarding?.contactLastName || (currentUser?.lastName ? String(currentUser.lastName) : "");
            const email = contactEmail || preOnboarding?.contactEmail || currentUser?.email || "";

            setValue("firstName", fName, { shouldValidate: true });
            setValue("lastName", lName, { shouldValidate: true });
            setValue("email", email, { shouldValidate: true });
        } else if (!checked) {
            // Only clear if we haven't already started editing a different person
            if (!editingPerson) {
                setValue("firstName", "", { shouldValidate: false });
                setValue("lastName", "", { shouldValidate: false });
                setValue("email", "", { shouldValidate: false });
            }
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        
        const timeoutId = window.setTimeout(() => {
            if (editingPerson) {
                setIsSelf(editingPerson.id === "self");
                reset({
                    firstName: editingPerson.firstName || "",
                    lastName: editingPerson.lastName || "",
                    ...(isBeneficialOwner ? {} : { role: editingPerson.role || editingPerson.villetoRole?.name || "" }),
                    email: editingPerson.email || "",
                    ownershipPercentage: editingPerson.ownershipPercentage || undefined,
                });
            } else {
                setIsSelf(false);
                reset({
                    firstName: "",
                    lastName: "",
                    ...(isBeneficialOwner ? {} : { role: "" }),
                    email: "",
                    ownershipPercentage: undefined,
                });
            }
        }, 0);
        return () => clearTimeout(timeoutId);
        // Exclude editingPerson object reference from dependencies to avoid loop if parent re-renders
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, isBeneficialOwner, reset]);

    const onSubmit = (data: z.infer<typeof schema>) => {
        if (isBeneficialOwner && (data.ownershipPercentage ?? 0) > maxOwnership) {
            return;
        }

        onAdd({
            firstName: data.firstName,
            lastName: data.lastName,
            role: isBeneficialOwner
                ? "ORGANIZATION_OWNER"
                : ("role" in data && typeof data.role === "string" ? data.role : ""),
            email: data.email,
            ownershipPercentage: Number(data.ownershipPercentage ?? 0),
            isSelf,
            isOwnershipCapped: complianceChecked,
        } as any);
        reset();
        setIsSelf(false);
    };

    const handleCancel = () => {
        onClose();
        reset();
        setIsSelf(false);
    };

    const handleOwnershipChange = (value: number[]) => {
        const capped = Math.min(value[0], maxOwnership);
        setValue("ownershipPercentage", capped, { shouldValidate: true });
    };

    const handleComplianceChange = (checked: boolean) => {
        setComplianceChecked(checked);
        // If switching to stricter cap and current value exceeds it, trim it
        if (checked && (ownershipValue ?? 0) > 25) {
            setValue("ownershipPercentage", 25, { shouldValidate: true });
        }
    };

    const isEditing = !!editingPerson;
    const isEditingSelf = editingPerson?.id === "self";

    const sliderValue = React.useMemo(() => [ownershipValue ?? 0], [ownershipValue]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
            <DialogContent className="sm:min-w-[580px] gap-0 rounded-[16px] p-0 shadow-[0_24px_60px_rgba(14,28,23,0.18)]">
                <DialogHeader className="flex flex-row items-center gap-3.5 border-b border-black/[0.07] px-6 py-5 space-y-0">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[#e7f6f2]">
                        <HugeiconsIcon icon={UserAdd01FreeIcons} className="size-6 text-[#087f70]" />
                    </div>
                    <div>
                        <DialogTitle className="text-[16px] font-semibold leading-tight text-[#0b100e]">
                            {isEditing ? 'Edit' : 'Add'} {isBeneficialOwner ? 'Beneficial Owner' : 'Controlling Officer'}
                        </DialogTitle>
                        <p className="mt-0.5 text-[12px] text-[#68726d]">
                            {isBeneficialOwner
                                ? "Add beneficial owner by email address and assign ownership"
                                : "Add company officer by email address and assign position"
                            }
                        </p>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">

                        {/* ── "I'm also a beneficiary owner" checkbox ── */}
                        {isBeneficialOwner && (!isEditing || isEditingSelf) && !hideSelfOption && (
                            <div className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3.5 transition-colors ${
                                isSelf ? "border-[#0ea894]/30 bg-[#f0faf8]" : "border-black/[0.08] bg-[#f9faf9]"
                            }`} onClick={() => handleIsSelfChange(!isSelf)}>
                                <Checkbox
                                    id="is-self"
                                    checked={isSelf}
                                    onCheckedChange={handleIsSelfChange}
                                    className="mt-0.5 shrink-0"
                                    onClick={e => e.stopPropagation()}
                                />
                                <div>
                                    <Label htmlFor="is-self" className="cursor-pointer text-[13px] font-semibold text-[#0b100e]">
                                        {isEditingSelf ? "I am the beneficial owner" : "I'm also a beneficiary owner"}
                                    </Label>
                                    <p className="mt-0.5 text-[12px] text-[#68726d]">
                                        {isEditingSelf
                                            ? "Untick this to save as a different person instead of yourself."
                                            : "This will auto-fill your details."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Name Fields */}
                        <div className="grid md:grid-cols-2 gap-6">
                            <FormFieldInput
                                name="firstName"
                                control={control}
                                placeholder="Enter first name"
                                label="First Name"
                                disabled={isSelf}
                                prefixIcon={
                                    <HugeiconsIcon icon={User03FreeIcons} className="size-4 text-muted-foreground" />
                                }
                            />
                            <FormFieldInput
                                name="lastName"
                                control={control}
                                placeholder="Enter last name"
                                label="Last Name"
                                disabled={isSelf}
                                prefixIcon={
                                    <HugeiconsIcon icon={User03FreeIcons} className="size-4 text-muted-foreground" />
                                }
                            />
                        </div>

                        {/* Role — officer only */}
                        {!isBeneficialOwner && (
                            <FormFieldInput
                                control={control}
                                label="Role"
                                placeholder="Enter position"
                                name="role"
                                prefixIcon={
                                    <HugeiconsIcon icon={Briefcase01Icon} className="size-4 text-muted-foreground" />
                                }
                            />
                        )}

                        {/* Email */}
                        <>
                            <FormFieldInput
                                name="email"
                                control={control}
                                type="email"
                                placeholder="Enter email address"
                                label="Email Address"
                                disabled={isSelf}
                                prefixIcon={<HugeiconsIcon icon={MailAtSign01Icon} />}
                            />
                            {!isBeneficialOwner && (
                                <div className="flex items-center gap-2 rounded-[8px] border border-[#c3ece7] bg-[#f0faf8] px-3 py-2.5">
                                    <HugeiconsIcon icon={InformationCircleIcon} className="size-4 shrink-0 text-[#087f70]" />
                                    <p className="text-[12px] text-[#68726d]">This email will be used to login to the company dashboard</p>
                                </div>
                            )}
                        </>

                        {/* Ownership Percentage */}
                        {isBeneficialOwner && (
                            <>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[13px] font-semibold text-[#202723]">
                                            Percentage Ownership<span className="text-destructive">*</span>
                                        </Label>
                                        <span className={`text-[13px] font-semibold ${
                                            (ownershipValue ?? 0) > maxOwnership ? 'text-destructive' : 'text-[#0ea894]'
                                        }`}>
                                            {ownershipValue ?? 0}%
                                            {(ownershipValue ?? 0) > maxOwnership && ` (Max ${maxOwnership}%)`}
                                        </span>
                                    </div>

                                    <Slider
                                        value={sliderValue}
                                        onValueChange={handleOwnershipChange}
                                        max={Math.max(1, maxOwnership)}
                                        step={1}
                                        className="w-full"
                                        disabled={maxOwnership === 0}
                                    />

                                    {(ownershipValue ?? 0) > maxOwnership && (
                                        <p className="text-destructive text-xs flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            {complianceChecked && availablePercentage >= 25
                                                ? "Ownership cannot exceed 25% to maintain compliance"
                                                : `Ownership cannot exceed ${maxOwnership}% based on remaining allocation`}
                                        </p>
                                    )}
                                </div>

                                {/* Compliance Checkbox */}
                                {(globalIsOwnershipCapped === null || isFirstOwner) && (
                                <div
                                    className={`flex cursor-pointer items-start gap-3 rounded-[10px] border p-3.5 transition-colors ${
                                        complianceChecked ? "border-[#c3ece7] bg-[#f0faf8]" : "border-amber-200 bg-amber-50"
                                    }`}
                                    onClick={() => handleComplianceChange(!complianceChecked)}
                                >
                                    <Checkbox
                                        id="compliance"
                                        checked={complianceChecked}
                                        onCheckedChange={handleComplianceChange}
                                        className="mt-0.5"
                                        onClick={e => e.stopPropagation()}
                                    />
                                    <div>
                                        <Label htmlFor="compliance" className="cursor-pointer text-[13px] font-semibold text-[#0b100e]">
                                            No Single Owner holds 25% or more
                                        </Label>
                                        <p className="mt-0.5 text-[12px] text-[#68726d]">
                                            {complianceChecked
                                                ? "Checked — ownership is capped at 25% for compliance"
                                                : "Unchecked — ownership can go up to 100%"}
                                        </p>
                                    </div>
                                </div>
                                )}
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 border-t border-black/[0.07] pt-5">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex items-center justify-center gap-2 h-[52px] px-6 rounded-[10px] border border-black/[0.1] bg-white text-[13px] font-semibold text-[#303834] shadow-[0_4px_16px_rgba(14,28,23,0.04)] transition-colors hover:bg-[#f5f7f6]"
                            >
                                Cancel <X className="size-3.5" strokeWidth={2} />
                            </button>

                            <button
                                type="submit"
                                disabled={!isValid || (isBeneficialOwner && (ownershipValue ?? 0) > maxOwnership)}
                                className="flex items-center justify-center gap-2 h-[52px] px-6 rounded-[10px] bg-[#0ea894] text-[13px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] transition-all hover:translate-y-[-1px] hover:bg-[#0c9785] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
                            >
                                {isEditing ? 'Update' : 'Add'} {isBeneficialOwner ? 'Owner' : 'Officer'}
                                <Plus className="size-3.5" strokeWidth={2} />
                            </button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};