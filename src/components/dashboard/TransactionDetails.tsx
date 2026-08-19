import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Receipt,
    User,
    Building,
    MapPin,
    Calendar,
    CreditCard,
    Download,
    Flag,
    CheckCircle,
    XCircle,
    Clock,
    Edit
} from "lucide-react";

interface Transaction {
    id: number;
    merchant: string;
    logo: string;
    description: string;
    date: string;
    cardholder: string;
    department: string;
    location: string;
    amount: string;
    status: string;
}

interface TransactionDetailsProps {
    transaction: Transaction;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TransactionDetails({ transaction, open, onOpenChange }: TransactionDetailsProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="w-4 h-4 text-status-success" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-status-warning" />;
            case 'flagged':
                return <Flag className="w-4 h-4 text-status-error" />;
            case 'declined':
                return <XCircle className="w-4 h-4 text-status-error" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "text-xs font-medium";
        switch (status) {
            case 'approved':
                return `${baseClasses} bg-status-success text-white`;
            case 'pending':
                return `${baseClasses} bg-status-warning text-white`;
            case 'flagged':
                return `${baseClasses} bg-status-error text-white`;
            case 'declined':
                return `${baseClasses} bg-status-error text-white`;
            default:
                return baseClasses;
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="w-[500px] sm:w-[500px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-xl font-semibold text-dashboard-text-primary flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-dashboard-accent" />
                        Transaction Details
                    </SheetTitle>
                    <SheetDescription className="text-dashboard-text-secondary">
                        View and manage transaction information
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                    {/* Transaction Header */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg">
                                        {transaction.logo}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-dashboard-text-primary">
                                            {transaction.merchant}
                                        </h3>
                                        <p className="text-sm text-dashboard-text-secondary">
                                            {transaction.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-dashboard-text-primary">
                                        {transaction.amount}
                                    </p>
                                    <Badge className={getStatusBadge(transaction.status)}>
                                        {getStatusIcon(transaction.status)}
                                        <span className="ml-1 capitalize">{transaction.status}</span>
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction Details */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary">Transaction Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-dashboard-text-secondary" />
                                    <div>
                                        <p className="text-xs text-dashboard-text-secondary">Date</p>
                                        <p className="text-sm font-medium text-dashboard-text-primary">
                                            {transaction.date}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-dashboard-text-secondary" />
                                    <div>
                                        <p className="text-xs text-dashboard-text-secondary">Location</p>
                                        <p className="text-sm font-medium text-dashboard-text-primary">
                                            {transaction.location}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-dashboard-text-secondary" />
                                    <div>
                                        <p className="text-xs text-dashboard-text-secondary">Cardholder</p>
                                        <p className="text-sm font-medium text-dashboard-text-primary">
                                            {transaction.cardholder}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building className="w-4 h-4 text-dashboard-text-secondary" />
                                    <div>
                                        <p className="text-xs text-dashboard-text-secondary">Department</p>
                                        <p className="text-sm font-medium text-dashboard-text-primary">
                                            {transaction.department}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-dashboard-text-secondary" />
                                <div>
                                    <p className="text-xs text-dashboard-text-secondary">Payment Method</p>
                                    <p className="text-sm font-medium text-dashboard-text-primary">
                                        Corporate Credit Card •••• 4521
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Receipt & Documents */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary">Receipt & Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Receipt className="w-5 h-5 text-dashboard-accent" />
                                        <div>
                                            <p className="text-sm font-medium text-dashboard-text-primary">
                                                receipt_20241114_001.pdf
                                            </p>
                                            <p className="text-xs text-dashboard-text-secondary">
                                                2.4 MB • Uploaded Nov 14, 2024
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="space-y-3">
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" className="px-6">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Transaction
                            </Button>
                            <Button variant="outline" className="px-6">
                                <Flag className="w-4 h-4 mr-2" />
                                Flag for Review
                            </Button>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="outline" className="px-6 text-status-success border-status-success hover:bg-status-success hover:text-white">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Approve
                            </Button>
                            <Button variant="outline" className="px-6 text-status-error border-status-error hover:bg-status-error hover:text-white">
                                <XCircle className="w-4 h-4 mr-2" />
                                Decline
                            </Button>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}