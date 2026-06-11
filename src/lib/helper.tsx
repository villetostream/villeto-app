import { Forbidden, ReceiptEdit, MoneyTick, Timer } from "iconsax-reactjs";
import { CheckCircle } from "lucide-react";

export const getStatusIcon = (status: string) => {
    switch (status) {
        case 'approved':
            return <CheckCircle className="w-4 h-4" />;
        case 'pending':
        case 'submitted':
            return <Timer className="w-4 h-4 " />;
        case 'declined':
        case 'rejected':
            return <Forbidden className="w-4 h-4 " />;
        case "draft":
            return <ReceiptEdit className="w-4 h-4 " />;
        default:
            return <MoneyTick className="w-4 h-4" />;
    }
};