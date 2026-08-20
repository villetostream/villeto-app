"use client"
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Info, ArrowRight, Pencil } from "lucide-react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AddBeneficialOwnerModal } from "@/components/onboarding/AddBeneficialOwner";
import OnboardingTitle from "@/components/onboarding/_shared/OnboardingTitle";
import { useOnboardingStore } from "@/stores/useVilletoStore";

import { LeaderShipPayload, useUpdateOnboardingLeadersApi } from "@/queries/onboarding/update-leadership";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserGroup03FreeIcons } from "@hugeicons/core-free-icons";
import { useHydrateOnboardingData } from "@/hooks/useHydrateOnboardingData";

interface Person {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    email: string;
    ownershipPercentage?: number;
    avatar?: string;
    phone?: string;
}

interface BeneficialOwner extends Person {
    ownershipPercentage: number;
}

interface Officer extends Person {
    role: string;
}

interface ComplianceNoticeProps {
    title: string;
    description: string;
}

export function ComplianceNotice({ title, description }: ComplianceNoticeProps) {
    return (
        <div className="flex items-start gap-3.5 rounded-[10px] border border-[#c3ece7] bg-[#f0faf8] px-4 py-3.5">
            <Info className="mt-0.5 size-[18px] shrink-0 text-[#087f70]" strokeWidth={1.8} />
            <div>
                <p className="text-[13px] font-semibold leading-snug text-[#0b100e]">{title}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#68726d]">{description}</p>
            </div>
        </div>
    );
}

interface EmptyStateProps {
    imageSrc: string;
    imageAlt: string;
    message: string;
}

export function EmptyState({ imageSrc, imageAlt, message }: EmptyStateProps) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#e7f6f2]">
                <Info className="size-6 text-[#087f70]" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] leading-5 text-[#68726d]">{message}</p>
        </div>
    );
}

interface OwnerCardProps {
    owner: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
        email: string;
        ownershipPercentage?: number;
        position?: string;
    };
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    type: "beneficial" | "officer";
    showIcons: boolean;
    isSelfCard?: boolean;
}

export function OwnerCard({ owner, onEdit, onDelete, type, showIcons = true, isSelfCard = false }: OwnerCardProps) {
    return (
        <div className={`flex items-center justify-between gap-4 rounded-[10px] border p-3.5 shadow-[0_4px_16px_rgba(14,28,23,0.04)] ${
            isSelfCard ? "border-[#0ea894]/30 bg-[#f0faf8]" : "border-black/[0.08] bg-white"
        }`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar */}
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0ea894] text-[11px] font-semibold text-[#07100d]">
                    {owner.firstName[0]}{owner.lastName[0]}
                </div>
                {/* Owner Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#0b100e]">{owner.firstName} {owner.lastName}</span>
                        {isSelfCard && (
                            <span className="rounded-full bg-[#e7f6f2] px-2 py-0.5 text-[10px] font-semibold text-[#087f70]">You</span>
                        )}
                        {type === "beneficial" && (
                            <span className="text-[12px] font-semibold text-[#0ea894]">{owner.ownershipPercentage}%</span>
                        )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-[#84908a]">{owner.email}</p>
                </div>
            </div>
            {/* Actions */}
            {showIcons && (
                <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => onEdit(owner.id)} className="flex size-8 items-center justify-center rounded-[8px] text-[#84908a] transition-colors hover:bg-[#f5f7f6] hover:text-[#0b100e]">
                        <Pencil className="size-3.5" strokeWidth={1.8} />
                    </button>
                    <button type="button" onClick={() => onDelete(owner.id)} className="flex size-8 items-center justify-center rounded-[8px] text-[#84908a] transition-colors hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="size-3.5" strokeWidth={1.8} />
                    </button>
                </div>
            )}
        </div>
    );
}

interface ActionButtonsProps {
    onAdd: () => void;
    onContinue: () => void;
    hasOwners: boolean;
    loading: boolean;
    addButtonText: string;
    continueButtonText: string;
    layout?: "default" | "equal";
}

export function ActionButtons({
    onAdd,
    onContinue,
    hasOwners,
    addButtonText,
    continueButtonText,
    loading,
    layout = "default"
}: ActionButtonsProps) {
    if (layout === "equal") {
        return (
            <div className="flex items-center pt-6 w-full gap-4 mt-auto border-t border-black/[0.07]">
                <Button
                    variant="outline"
                    onClick={onAdd}
                    className="flex flex-1 items-center gap-2 h-[54px] rounded-[10px] border-black/[0.1] text-[14px] font-semibold"
                    disabled={loading}
                >
                    {addButtonText}
                    <Plus className="h-4 w-4" />
                </Button>

                <Button
                    onClick={onContinue}
                    className={`flex flex-1 items-center gap-2 h-[54px] rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] transition-all ${!hasOwners ? 'opacity-50' : ''}`}
                    disabled={!loading && !hasOwners}
                >
                    {hasOwners ? continueButtonText : "Next Step"}
                    <ArrowRight className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    // If no owners, show single Add button at the bottom right with primary styling
    if (!hasOwners) {
        return (
            <div className="flex justify-end pt-6 mt-auto w-full border-t border-black/[0.07]">
                <Button
                    onClick={onAdd}
                    className="flex items-center gap-2 h-[54px] rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] transition-all"
                    disabled={loading}
                >
                    {addButtonText} <Plus className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="flex justify-between items-center pt-6 mt-auto gap-5 w-full border-t border-black/[0.07]">
            <Button
                variant="outline"
                onClick={onAdd}
                className="flex items-center gap-2 flex-1 h-[54px] rounded-[10px] border-black/[0.1] text-[14px] font-semibold"
                disabled={loading}
            >
                {addButtonText}
                <Plus className="h-4 w-4" />
            </Button>

            <Button
                onClick={onContinue}
                className="flex items-center gap-2 flex-1 h-[54px] rounded-[10px] bg-[#0ea894] text-[14px] font-semibold text-white shadow-[0_12px_26px_-14px_rgba(14,168,148,0.8)] hover:translate-y-[-1px] hover:bg-[#0c9785] transition-all"
                disabled={loading}
            >
                {continueButtonText}
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
    );
}

// Removed SelfOwner state and interface

export default function Leadership() {
    const router = useRouter();
    const { userProfiles, updateUserProfiles, selfOwner, setSelfOwner, isOwnershipCapped, setIsOwnershipCapped } = useOnboardingStore();
    useHydrateOnboardingData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSelf, setEditingSelf] = useState(false);
    const newPersonIdRef = useRef(0);
    const [editingPerson, setEditingPerson] = useState<{ id: string } | null>(null);

    // businessOwners: only people explicitly added (not the self-owner)
    const businessOwners = userProfiles.filter(
        profile => profile.ownershipPercentage !== undefined
    ) as BeneficialOwner[];

    const updateOnboarding = useUpdateOnboardingLeadersApi();
    const loading = updateOnboarding.isPending;
    const isUserAnOwner = !!selfOwner;
    const hasOwners = isUserAnOwner || businessOwners.length > 0;

    const firstOwnerId = selfOwner ? "self" : businessOwners[0]?.id;
    const isFirstOwner = (!hasOwners) || (editingSelf && firstOwnerId === "self") || (editingPerson?.id === firstOwnerId);

    // Total ownership across self + all business owners
    const totalOwnership =
        (selfOwner?.ownershipPercentage ?? 0) +
        businessOwners.reduce((sum, o) => sum + (o.ownershipPercentage ?? 0), 0);

    const handleAddPerson = (person: Omit<BeneficialOwner, "id"> | Omit<Officer, "id"> & { isSelf: boolean; isOwnershipCapped?: boolean }) => {
        const personWithSelf = person as typeof person & { isSelf: boolean; isOwnershipCapped?: boolean };

        if (personWithSelf.isOwnershipCapped !== undefined) {
            if (isOwnershipCapped === null || isFirstOwner) {
                setIsOwnershipCapped(personWithSelf.isOwnershipCapped);
            }
        }

        if (personWithSelf.isSelf) {
            // Store the current user as the self-owner in the persistent store
            setSelfOwner({
                firstName: person.firstName,
                lastName: person.lastName,
                email: person.email,
                ownershipPercentage: Number((person as BeneficialOwner).ownershipPercentage ?? 0),
            });
            // Remove from userProfiles if they were there (e.g. transitioning from regular to self)
            updateUserProfiles(userProfiles.filter(p => p.email?.toLowerCase() !== person.email?.toLowerCase() && p.id !== editingPerson?.id));
        } else {
            if (editingSelf) {
                // Transitioning from self to regular
                setSelfOwner(null);
                const newPerson = {
                    ...person,
                    id: `person-${++newPersonIdRef.current}`,
                    avatar: `${person.firstName[0]}${person.lastName[0]}`,
                };
                updateUserProfiles([...userProfiles, newPerson]);
            } else if (editingPerson) {
                // Editing an existing external owner
                const updatedProfiles = userProfiles.map(p =>
                    p.id === editingPerson.id
                        ? { ...p, ...person, avatar: `${person.firstName[0]}${person.lastName[0]}` }
                        : p
                );
                updateUserProfiles(updatedProfiles);
            } else {
                // Adding a new external owner
                const newPerson = {
                    ...person,
                    id: `person-${++newPersonIdRef.current}`,
                    avatar: `${person.firstName[0]}${person.lastName[0]}`,
                };
                updateUserProfiles([...userProfiles, newPerson]);
            }
        }

        setIsModalOpen(false);
        setEditingPerson(null);
        setEditingSelf(false);
    };

    const handleEditPerson = (id: string) => {
        if (id === "self") {
            setEditingSelf(true);
            setIsModalOpen(true);
        } else {
            const person = userProfiles.find(p => p.id === id);
            if (person) {
                setEditingPerson({ id });
                setIsModalOpen(true);
            }
        }
    };

    const handleDeletePerson = (id: string) => {
        let remainingBusinessOwners = businessOwners;
        let remainingSelfOwner = selfOwner;

        if (id === "self") {
            setSelfOwner(null);
            remainingSelfOwner = null;
        } else {
            const updated = userProfiles.filter(profile => profile.id !== id);
            updateUserProfiles(updated);
            remainingBusinessOwners = updated.filter(p => p.ownershipPercentage !== undefined) as BeneficialOwner[];
        }

        if (remainingBusinessOwners.length === 0 && !remainingSelfOwner) {
            setIsOwnershipCapped(null);
        }
    };

    const transformDataForPayload = (): LeaderShipPayload => {
        const payload: LeaderShipPayload = {
            isUserAnOwner,
            businessOwners: businessOwners.map(owner => ({
                firstName: owner.firstName,
                lastName: owner.lastName,
                email: owner.email,
                ownershipPercentage: owner.ownershipPercentage ?? 0,
                ...(owner.phone && owner.phone !== "00000000000" ? { phone: owner.phone } : {}),
            })),
        };

        // Always send selfOwnershipPercentage — the backend DTO requires it
        payload.selfOwnershipPercentage = (isUserAnOwner && selfOwner)
            ? Number(selfOwner.ownershipPercentage ?? 0)
            : 0;

        return payload;
    };

    const handleContinue = async () => {
        // Validation: if not a beneficial owner themselves, must have at least one external owner
        if (!isUserAnOwner && businessOwners.length === 0) {
            toast.error("Please add at least one beneficial owner, or check the 'I\u2019m also a beneficiary owner' checkbox.");
            return;
        }

        // Validation: total ownership must not exceed 100%
        if (totalOwnership > 100) {
            toast.error(`Total ownership (${totalOwnership}%) exceeds 100%. Please adjust the percentages.`);
            return;
        }

        try {
            const payload = transformDataForPayload();
            await updateOnboarding.mutateAsync(payload);
            toast.success("Leader details updated successfully!");
            router.push("/onboarding/financial");
        } catch (error) {
            const err = error as { response?: { data?: { message?: string | string[] } } };
            const msg = err?.response?.data?.message;
            const displayMsg = Array.isArray(msg) ? msg.join('\n') : (msg || (error instanceof Error ? error.message : "Failed to update company details"));
            toast.error(displayMsg);
        }
    };

    return (
        <div className="flex h-full flex-col py-8">
            <div className="text-left space-y-4">
                <div className="mb-5 flex size-11 items-center justify-center rounded-[10px] bg-[#e7f6f2]">
                    <HugeiconsIcon icon={UserGroup03FreeIcons} className="size-6 text-[#087f70]" />
                </div>

                <OnboardingTitle
                    title="Leadership and ownership"
                    subtitle="Add beneficial owners and the officers responsible for your company."
                />
            </div>

            <div className="mt-6 flex min-h-0 flex-1 flex-col">
                <ComplianceNotice
                    title="No Single Owner holds 25% or more"
                    description="We ask for this to stay compliant with financial regulations"
                />

                {/* Ownership total indicator */}
                {hasOwners && (
                    <div className={`mt-4 flex items-center justify-between px-1 text-[13px] ${totalOwnership > 100 ? "text-destructive" : "text-[#68726d]"}`}>
                        <span>Total ownership allocated</span>
                        <span className={`font-semibold ${totalOwnership === 100 ? "text-[#0ea894]" : totalOwnership > 100 ? "text-destructive" : "text-[#0b100e]"}`}>
                            {totalOwnership}% / 100%
                        </span>
                    </div>
                )}

                {/* Owner cards */}
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2 pb-2 scrollbar-thin scrollbar-thumb-black/10 scrollbar-track-transparent">
                    {!hasOwners ? (
                        <EmptyState
                            imageSrc="/images/leadership.png"
                            imageAlt="Add beneficial owners"
                            message={"No beneficial owner has been added yet, click button below to add."}
                        />
                    ) : (
                        <div className="space-y-3">
                            {/* Self card (if user marked themselves as owner) */}
                            {selfOwner && (
                                <OwnerCard
                                    key="self"
                                    owner={{ ...selfOwner, id: "self", role: "Owner" }}
                                    onEdit={handleEditPerson}
                                    onDelete={handleDeletePerson}
                                    type="beneficial"
                                    showIcons
                                    isSelfCard
                                />
                            )}

                            {/* External beneficial owners */}
                            {businessOwners.map((person) => (
                                <OwnerCard
                                    key={person.id}
                                    owner={person}
                                    onEdit={handleEditPerson}
                                    onDelete={handleDeletePerson}
                                    type="beneficial"
                                    showIcons
                                />
                            ))}
                        </div>
                    )}
                </div>

                <ActionButtons
                    onAdd={() => setIsModalOpen(true)}
                    onContinue={handleContinue}
                    hasOwners={hasOwners}
                    addButtonText="Add Beneficial Owner"
                    continueButtonText="Next Step"
                    layout="default"
                    loading={loading}
                />

                <AddBeneficialOwnerModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingPerson(null);
                        setEditingSelf(false);
                    }}
                    onAdd={handleAddPerson}
                    mode="beneficial"
                    isOwner={true}
                    hideSelfOption={!!selfOwner && !editingSelf}
                    globalIsOwnershipCapped={isOwnershipCapped}
                    totalAllocated={totalOwnership}
                    isFirstOwner={isFirstOwner}
                    editingPerson={
                        editingSelf && selfOwner
                            ? { ...selfOwner, id: "self" }
                            : editingPerson
                                ? userProfiles.find(p => p.id === editingPerson.id)
                                : undefined
                    }
                />
            </div>
        </div>
    );
}
