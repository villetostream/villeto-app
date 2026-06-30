import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Plus, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
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
}

export const AddBeneficialOwnerModal = ({
    isOpen,
    onClose,
    onAdd,
    mode = "beneficial",
    editingPerson,
    isOwner
}: AddBeneficialOwnerModalProps) => {
    const schema = getFormSchema(mode, isOwner);
    const isBeneficialOwner = mode === "beneficial" || isOwner;
    const currentUser = useAuthStore(s => s.user);
    const preOnboarding = useOnboardingStore(s => s.preOnboarding);
    const contactEmail = useOnboardingStore(s => s.contactEmail);

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: "",
            lastName: "",
            ...(isBeneficialOwner ? {} : { role: "" }),
            email: "",
            ownershipPercentage: undefined,
        }
    });
    const { handleSubmit, formState: { errors: _errors }, setValue, reset, control } = form;

    // "I'm also a beneficiary owner" checkbox state
    const [isSelf, setIsSelf] = useState(false);

    // compliance checkbox — tracks whether ownership is capped at 25%
    const [complianceChecked, setComplianceChecked] = useState(true);

    const ownershipValue = useWatch({ control, name: "ownershipPercentage" });
    const maxOwnership = complianceChecked ? 25 : 100;

    // When the "I'm also" checkbox is toggled ON, populate from current user or onboarding state
    const handleIsSelfChange = (checked: boolean) => {
        setIsSelf(checked);
        if (checked && (currentUser || preOnboarding || contactEmail)) {
            const fName = currentUser?.firstName || preOnboarding?.contactFirstName || "";
            const lName = currentUser?.lastName ? String(currentUser.lastName) : preOnboarding?.contactLastName || "";
            const email = currentUser?.email || preOnboarding?.contactEmail || contactEmail || "";

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
        const timeoutId = window.setTimeout(() => {
            setIsSelf(false);
            if (editingPerson) {
                reset({
                    firstName: editingPerson.firstName || "",
                    lastName: editingPerson.lastName || "",
                    ...(isBeneficialOwner ? {} : { role: editingPerson.role || editingPerson.villetoRole?.name || "" }),
                    email: editingPerson.email || "",
                    ownershipPercentage: editingPerson.ownershipPercentage || undefined,
                });
            } else {
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
    }, [editingPerson, isOpen, isBeneficialOwner, reset]);

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
            ownershipPercentage: data.ownershipPercentage,
            isSelf,
        });
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

    return (
        <Dialog open={isOpen} onOpenChange={handleCancel}>
            <DialogContent className="!sm:min-w-[600px] p-0 rounded-lg">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-7 border-b border-b-muted">
                    <div className="flex items-center gap-2.5">
                        <div className="w-14 h-14 bg-muted/80 rounded-full flex items-center justify-center">
                            <HugeiconsIcon icon={UserAdd01FreeIcons} className="size-8 text-foreground" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl leading-[100%] font-semibold">
                                {isEditing ? 'Edit' : 'Add'} {isBeneficialOwner ? 'Beneficial Owner' : 'Controlling Officer'}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                {isBeneficialOwner
                                    ? "Add beneficial owner by email address and assign role"
                                    : "Add company officer by email address and assign position"
                                }
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-5 pt-4">

                        {/* ── "I'm also a beneficiary owner" checkbox ── */}
                        {isBeneficialOwner && !isEditing && (
                            <div className={`flex items-start gap-3.5 p-4 rounded-xl border ${
                                isSelf ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-muted-foreground/20"
                            }`}>
                                <Checkbox
                                    id="is-self"
                                    checked={isSelf}
                                    onCheckedChange={handleIsSelfChange}
                                    className="mt-0.5 shrink-0 cursor-pointer"
                                />
                                <div className="space-y-0.5">
                                    <Label htmlFor="is-self" className="text-sm font-semibold text-foreground cursor-pointer">
                                        I&apos;m also a beneficiary owner
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        This will auto-fill your details but you can add more owners.
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
                                prefixIcon={
                                    <HugeiconsIcon icon={MailAtSign01Icon} className="size-4 text-muted-foreground" />
                                }
                            />
                            {!isBeneficialOwner && (
                                <div className="flex gap-2 items-center">
                                    <HugeiconsIcon icon={InformationCircleIcon} className="size-5 text-primary" />
                                    <p className="text-xs text-black font-normal leading-[100%]">
                                        This email will be used to login to the company dashboard
                                    </p>
                                </div>
                            )}
                        </>

                        {/* Ownership Percentage */}
                        {isBeneficialOwner && (
                            <>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">
                                            Percentage Ownership<span className="text-destructive">*</span>
                                        </Label>
                                        <span className={`font-semibold ${(ownershipValue ?? 0) > maxOwnership ? 'text-destructive' : 'text-primary'}`}>
                                            {ownershipValue ?? 0}%
                                            {(ownershipValue ?? 0) > maxOwnership && ` (Max ${maxOwnership}%)`}
                                        </span>
                                    </div>

                                    <Slider
                                        value={[(ownershipValue ?? 0)]}
                                        onValueChange={handleOwnershipChange}
                                        max={maxOwnership}
                                        step={1}
                                        className="w-full"
                                    />

                                    {(ownershipValue ?? 0) > maxOwnership && (
                                        <p className="text-destructive text-xs flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" />
                                            Ownership cannot exceed {maxOwnership}% to maintain compliance
                                        </p>
                                    )}
                                </div>

                                {/* Compliance Checkbox */}
                                <div
                                    className={`flex items-start space-x-3 p-4 rounded-lg cursor-pointer select-none transition-colors ${
                                        complianceChecked ? "bg-primary-light/20" : "bg-amber-50"
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
                                    <div className="space-y-1">
                                        <Label htmlFor="compliance" className="text-sm font-medium text-black cursor-pointer">
                                            No Single Owner holds 25% or more
                                        </Label>
                                        <p className="text-xs text-black">
                                            {complianceChecked
                                                ? "Checked — ownership is capped at 25% for compliance"
                                                : "Unchecked — ownership can go up to 100%"}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-between pt-6 gap-5">
                            <Button
                                type="button"
                                variant="ghostNavy"
                                onClick={handleCancel}
                                size="md"
                                className="flex items-center gap-2 flex-1"
                            >
                                Cancel
                                <X className="h-4 w-4" />
                            </Button>

                            <Button
                                type="submit"
                                size="md"
                                disabled={isBeneficialOwner && (ownershipValue ?? 0) > maxOwnership}
                                className="flex items-center gap-2 flex-1"
                            >
                                {isEditing ? 'Update' : 'Add'} {isBeneficialOwner ? 'Owner' : 'Controlling Officer'}
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};