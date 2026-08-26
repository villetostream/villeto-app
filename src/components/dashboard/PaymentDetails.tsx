"use client"
import { useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Progress } from "@/components/ui/progress";
import {
    CreditCard,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    TrendingUp,
    Calendar,
    DollarSign,
    FileText,
    Zap
} from "lucide-react";
import { AutoPaySetup } from "./transactions/AutoPay";
import { StatementView } from "./transactions/StatementView";

const paymentStats = {
    totalAmount: 125420.50,
    pending: {
        count: 47,
        amount: 12350.75
    },
    approved: {
        count: 284,
        amount: 98720.25
    },
    declined: {
        count: 12,
        amount: 2850.00
    },
    flagged: {
        count: 8,
        amount: 1499.50
    }
};

const recentPayments = [
    {
        id: 1,
        merchant: "Office Supplies Co.",
        amount: 450.00,
        status: "approved",
        date: "2024-11-15",
        employee: "Sarah Chen"
    },
    {
        id: 2,
        merchant: "Hotel Booking",
        amount: 1250.00,
        status: "pending",
        date: "2024-11-14",
        employee: "Michael Rodriguez"
    },
    {
        id: 3,
        merchant: "Restaurant Expense",
        amount: 85.50,
        status: "flagged",
        date: "2024-11-14",
        employee: "Emma Thompson"
    }
];
// in the payment details add setup early auto-pay with sheet slider for auto selecting amount and a dropdown of amount (either adjusting the slider or selecting a dropdown to acheive the same putpose)
//create a staement sheet just to show the statement of the month(custom select) with a download button 
export function PaymentDetails() {
    const [open, setOpen] = useState(false);
    const [autoPayOpen, setAutoPayOpen] = useState(false);
    const [statementOpen, setStatementOpen] = useState(false);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="w-4 h-4 text-status-success" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-status-warning" />;
            case 'declined':
                return <XCircle className="w-4 h-4 text-status-error" />;
            case 'flagged':
                return <AlertTriangle className="w-4 h-4 text-status-error" />;
            default:
                return null;
        }
    };



    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Payments
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[500px] sm:w-[500px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-xl font-semibold text-dashboard-text-primary flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-dashboard-accent" />
                        Payment Overview
                    </SheetTitle>
                    <SheetDescription className="text-dashboard-text-secondary">
                        Monitor expense payments and approval status
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-dashboard-text-secondary">Total Amount</p>
                                        <p className="text-xl font-bold text-dashboard-text-primary">
                                            ${paymentStats.totalAmount.toLocaleString()}
                                        </p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-dashboard-accent" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-dashboard-text-secondary">Processing</p>
                                        <p className="text-xl font-bold text-dashboard-text-primary">
                                            {paymentStats.pending.count + paymentStats.flagged.count}
                                        </p>
                                    </div>
                                    <Clock className="w-8 h-8 text-status-warning" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Status Breakdown */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary">Status Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-status-success" />
                                        <span className="text-sm text-dashboard-text-primary">Approved</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-dashboard-text-primary">
                                            ${paymentStats.approved.amount.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-dashboard-text-secondary">
                                            {paymentStats.approved.count} transactions
                                        </p>
                                    </div>
                                </div>
                                <Progress value={75} className="h-2" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-status-warning" />
                                        <span className="text-sm text-dashboard-text-primary">Pending</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-dashboard-text-primary">
                                            ${paymentStats.pending.amount.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-dashboard-text-secondary">
                                            {paymentStats.pending.count} transactions
                                        </p>
                                    </div>
                                </div>
                                <Progress value={15} className="h-2" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-status-error" />
                                        <span className="text-sm text-dashboard-text-primary">Flagged</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-dashboard-text-primary">
                                            ${paymentStats.flagged.amount.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-dashboard-text-secondary">
                                            {paymentStats.flagged.count} transactions
                                        </p>
                                    </div>
                                </div>
                                <Progress value={5} className="h-2" />

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-status-error" />
                                        <span className="text-sm text-dashboard-text-primary">Declined</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-dashboard-text-primary">
                                            ${paymentStats.declined.amount.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-dashboard-text-secondary">
                                            {paymentStats.declined.count} transactions
                                        </p>
                                    </div>
                                </div>
                                <Progress value={5} className="h-2" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Payments */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary">Recent Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentPayments.map((payment) => (
                                    <div key={payment.id} className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(payment.status)}
                                            <div>
                                                <p className="text-sm font-medium text-dashboard-text-primary">
                                                    {payment.merchant}
                                                </p>
                                                <p className="text-xs text-dashboard-text-secondary">
                                                    {payment.employee} • {payment.date}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-dashboard-text-primary">
                                                ${payment.amount.toFixed(2)}
                                            </p>
                                            <StatusBadge status={payment.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Auto-Pay Setup */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                <Zap className="w-5 h-5" />
                                Auto-Pay Setup
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-dashboard-text-primary">Setup Early Auto-Pay</p>
                                    <p className="text-sm text-dashboard-text-secondary">
                                        Automatically process payments before due dates
                                    </p>
                                </div>
                                <AutoPaySetup open={autoPayOpen} onOpenChange={setAutoPayOpen}>
                                    <Button variant="outline">
                                        <Zap className="w-4 h-4 mr-2" />
                                        Setup
                                    </Button>
                                </AutoPaySetup>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" className="px-4">
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Payment
                        </Button>
                        <StatementView open={statementOpen} onOpenChange={setStatementOpen}>
                            <Button variant="outline" className="px-4">
                                <FileText className="w-4 h-4 mr-2" />
                                View Statement
                            </Button>
                        </StatementView>
                    </div>
                </div>
            </SheetContent>
        </Sheet >
    );
}