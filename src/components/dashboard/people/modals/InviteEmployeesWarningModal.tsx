
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
            <DialogContent className="sm:max-w-[480px] flex flex-col items-center text-center p-10 bg-white gap-6 [&>button]:hidden rounded-lg">
                <Button 
                    className="absolute right-4 top-4 p-0 w-auto h-auto bg-transparent hover:bg-transparent text-gray-500 hover:text-gray-900"
                    onClick={onClose}
                >
                    <span className="sr-only">Close</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </Button>

                <div className="h-28 w-28 bg-[#FCAC12] rounded-full flex items-center justify-center mb-2 shadow-sm">
                    <span className="text-white text-7xl font-semibold">!</span>
                </div>
                
                <div className="space-y-3 px-4">
                    <DialogTitle className="text-2xl font-semibold text-center text-gray-800">
                        Managers & Leadership
                    </DialogTitle>
                    <DialogDescription className="text-center text-gray-500 text-sm leading-relaxed">
                        Inviting Admins and other leadership before inviting employees helps the system easily assign managers to each employee
                    </DialogDescription>
                </div>
                
                <div className="flex gap-4 w-full mt-4">
                    <Button 
                        onClick={onInviteLeaders} 
                        className="flex-1 bg-[#03C3A6] hover:bg-[#03C3A6]/90 text-white font-medium h-12 text-sm rounded-lg border-0 shadow-none transition-all"
                    >
                        Invite Leaders
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={onContinue}
                        className="flex-1 border-[#03C3A6] text-[#03C3A6] hover:bg-[#03C3A6]/5 hover:text-[#03C3A6] font-medium h-12 text-sm rounded-lg"
                    >
                        Continue
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
