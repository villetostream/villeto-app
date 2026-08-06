
import { Users } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface InviteEmployeesWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInviteLeaders: () => void;
    onContinue: () => void;
}

export function InviteEmployeesWarningModal({
    isOpen,
    onClose,
    onInviteLeaders,
    onContinue,
}: InviteEmployeesWarningModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[440px] flex flex-col items-center text-center p-8 bg-white gap-5 [&>button]:hidden rounded-2xl border-none shadow-xl">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-[8px] text-[#84908a] hover:text-[#303834] hover:bg-[#f5f7f6] transition-colors"
                    aria-label="Close"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>

                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl bg-[#e7f6f2] flex items-center justify-center">
                    <Users className="w-7 h-7 text-[#087f70]" strokeWidth={1.8} />
                </div>

                <div className="space-y-2 px-2">
                    <DialogTitle className="text-[18px] font-semibold text-[#0b100e] leading-snug">
                        Invite Managers first?
                    </DialogTitle>
                    <DialogDescription className="text-[13px] text-[#66706b] leading-relaxed">
                        Inviting admins and leadership before employees helps the system automatically assign managers to each employee.
                    </DialogDescription>
                </div>

                <div className="flex flex-col gap-2.5 w-full mt-1">
                    <Button
                        onClick={onInviteLeaders}
                        className="h-[46px] w-full rounded-[10px] bg-[#0ea894] text-[13px] font-semibold text-white shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:bg-[#0c9785] hover:translate-y-[-1px] transition-all"
                    >
                        Invite Leadership First
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onContinue}
                        className="h-[46px] w-full rounded-[10px] border-[#0ea894]/40 text-[#087f70] hover:bg-[#e7f6f2] hover:border-[#0ea894]/60 text-[13px] font-semibold transition-all"
                    >
                        Continue with Employees
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
