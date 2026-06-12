import { Forbidden, ReceiptEdit, MoneyTick, Timer } from "iconsax-reactjs";
import {
  CheckCircle,
  Clock,
  Flag,
  SendHorizontal,
} from "lucide-react";

export const getStatusIcon = (status: string) => {
  switch (status) {
    case "draft":
      return <ReceiptEdit className="w-4 h-4" />;
    case "submitted":
      return <SendHorizontal className="w-4 h-4" />;
    case "pending":
    case "pending_policy_check":
      return <Timer className="w-4 h-4" />;
    case "approved":
      return <CheckCircle className="w-4 h-4" />;
    case "declined":
    case "rejected":
      return <Forbidden className="w-4 h-4" />;
    case "paid":
      return <MoneyTick className="w-4 h-4" />;
    case "flagged":
      return <Flag className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};
