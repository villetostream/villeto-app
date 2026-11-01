"use client";

import { Pencil, Trash2 } from "lucide-react";

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
