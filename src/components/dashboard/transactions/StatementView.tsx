import { ReactNode, useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    FileText,
    Download,
    Calendar,
    DollarSign,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Building
} from "lucide-react";

interface StatementViewProps {
    children: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const monthOptions = [
    { value: "2024-12", label: "December 2024" },
    { value: "2024-11", label: "November 2024" },
    { value: "2024-10", label: "October 2024" },
    { value: "2024-09", label: "September 2024" },
    { value: "2024-08", label: "August 2024" },
    { value: "2024-07", label: "July 2024" }
];

const mockTransactions = [
    {
        id: 1,
        date: "2024-12-15",
        description: "Office Supplies Co.",
        category: "Office Supplies",
        employee: "Sarah Chen",
        amount: -450.00,
        status: "posted"
    },
    {
        id: 2,
        date: "2024-12-14",
        description: "Business Lunch - Client Meeting",
        category: "Meals & Entertainment",
        employee: "Michael Rodriguez",
        amount: -125.50,
        status: "posted"
    },
    {
        id: 3,
        date: "2024-12-13",
        description: "Software License - Adobe",
        category: "Software",
        employee: "Emma Thompson",
        amount: -299.99,
        status: "posted"
    },
    {
        id: 4,
        date: "2024-12-12",
        description: "Travel - Flight to Chicago",
        category: "Travel",
        employee: "David Kim",
        amount: -680.00,
        status: "pending"
    },
    {
        id: 5,
        date: "2024-12-11",
        description: "Payment Received",
        category: "Payment",
        employee: "System",
        amount: 5000.00,
        status: "posted"
    }
];

export function StatementView({ children, open, onOpenChange }: StatementViewProps) {
    const [selectedMonth, setSelectedMonth] = useState("2024-12");

    const totalSpent = mockTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalReceived = mockTransactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

    const netAmount = totalReceived - totalSpent;



    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-[700px] sm:w-[700px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-xl font-semibold text-dashboard-text-primary flex items-center gap-2">
                        <FileText className="w-5 h-5 text-dashboard-accent" />
                        Monthly Statement
                    </SheetTitle>
                    <SheetDescription className="text-dashboard-text-secondary">
                        View and download your monthly expense statement
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6 px-6">
                    {/* Month Selection */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-dashboard-text-secondary" />
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {monthOptions.map((month) => (
                                        <SelectItem key={month.value} value={month.value}>
                                            {month.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                    </div>

                    {/* Statement Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6">
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-dashboard-text-secondary">Total Spent</p>
                                        <p className="text-xl font-bold text-status-error">
                                            -${totalSpent.toLocaleString()}
                                        </p>
                                    </div>
                                    <TrendingDown className="w-8 h-8 text-status-error" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-dashboard-text-secondary">Payments</p>
                                        <p className="text-xl font-bold text-status-success">
                                            +${totalReceived.toLocaleString()}
                                        </p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-status-success" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-dashboard-text-secondary">Net Balance</p>
                                        <p className={`text-xl font-bold ${netAmount >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                                            {netAmount >= 0 ? '+' : ''}${netAmount.toLocaleString()}
                                        </p>
                                    </div>
                                    <DollarSign className="w-8 h-8 text-dashboard-accent" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Account Information */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                <Building className="w-5 h-5" />
                                Account Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-dashboard-text-secondary">Account Holder:</span>
                                <span className="text-dashboard-text-primary font-medium">ExpenseFlow Inc.</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dashboard-text-secondary">Account Number:</span>
                                <span className="text-dashboard-text-primary font-medium">••••••••••••7890</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dashboard-text-secondary">Statement Period:</span>
                                <span className="text-dashboard-text-primary font-medium">
                                    {monthOptions.find(m => m.value === selectedMonth)?.label}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dashboard-text-secondary">Statement Date:</span>
                                <span className="text-dashboard-text-primary font-medium">
                                    {new Date().toLocaleDateString()}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transaction Details */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Transaction Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-dashboard-border">
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {mockTransactions.map((transaction) => (
                                        <TableRow key={transaction.id} className="border-dashboard-border">
                                            <TableCell className="text-dashboard-text-secondary">
                                                {new Date(transaction.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-dashboard-text-primary font-medium">
                                                {transaction.description}
                                            </TableCell>
                                            <TableCell className="text-dashboard-text-secondary">
                                                {transaction.category}
                                            </TableCell>
                                            <TableCell className="text-dashboard-text-secondary">
                                                {transaction.employee}
                                            </TableCell>
                                            <TableCell className={`font-medium ${transaction.amount >= 0 ? 'text-status-success' : 'text-status-error'
                                                }`}>
                                                {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={transaction.status} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Download Options */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary">Download Options</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" className="px-6">
                                    <Download className="w-4 h-4 mr-2" />
                                    PDF Statement
                                </Button>
                                <Button variant="outline" className="px-6">
                                    <Download className="w-4 h-4 mr-2" />
                                    Excel Export
                                </Button>
                                <Button variant="outline" className="px-6">
                                    <Download className="w-4 h-4 mr-2" />
                                    CSV Export
                                </Button>
                            </div>
                            <p className="text-xs text-dashboard-text-secondary text-center">
                                All downloads include detailed transaction data and summary information
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </SheetContent>
        </Sheet>
    );
}