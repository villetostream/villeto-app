import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    FileText,
    Plus,
    Search,
    Filter,
    Calendar,
    CheckCircle,
    Clock,
    AlertTriangle
} from "lucide-react";

const bills: Array<{
    id: number;
    vendor: string;
    description: string;
    amount: number;
    dueDate: string;
    status: string;
    invoiceNumber: string;
    category: string;
}> = [];

export default function BillPay() {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid':
                return <CheckCircle className="w-4 h-4 text-status-success" />;
            case 'pending':
                return <Clock className="w-4 h-4 text-status-warning" />;
            case 'scheduled':
                return <Calendar className="w-4 h-4 text-dashboard-accent" />;
            case 'overdue':
                return <AlertTriangle className="w-4 h-4 text-status-error" />;
            default:
                return null;
        }
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "text-xs font-medium";
        switch (status) {
            case 'paid':
                return `${baseClasses} bg-status-success text-white`;
            case 'pending':
                return `${baseClasses} bg-status-warning text-white`;
            case 'scheduled':
                return `${baseClasses} bg-dashboard-accent text-white`;
            case 'overdue':
                return `${baseClasses} bg-status-error text-white`;
            default:
                return baseClasses;
        }
    };

    const isOverdue = (dueDate: string) => {
        return new Date(dueDate) < new Date();
    };

    return (

        <div className="min-h-screen bg-dashboard-bg">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-dashboard-text-primary">Bill Pay</h1>
                        <p className="text-dashboard-text-secondary mt-1">
                            Manage vendor bills and automated payments
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Payment Schedule
                        </Button>
                        <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Bill
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-dashboard-text-secondary text-sm">Due This Week</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">—</p>
                                </div>
                                <Clock className="w-8 h-8 text-status-warning" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-dashboard-text-secondary text-sm">Overdue</p>
                                    <p className="text-2xl font-bold text-status-error">—</p>
                                </div>
                                <AlertTriangle className="w-8 h-8 text-status-error" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-dashboard-text-secondary text-sm">Paid This Month</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">—</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-status-success" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-dashboard-text-secondary text-sm">Scheduled</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">0</p>
                                </div>
                                <Calendar className="w-8 h-8 text-dashboard-accent" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dashboard-text-secondary w-4 h-4" />
                        <Input placeholder="Search bills..." className="pl-10" />
                    </div>
                    <Button variant="outline" size="sm">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </Button>
                </div>

                {/* Bills List */}
                <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary">Upcoming Bills</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {bills.length === 0 ? (
                            <p className="text-dashboard-text-secondary text-sm text-center py-8">No bills found</p>
                        ) : (
                            <div className="space-y-4">
                                {bills.map((bill) => (
                                    <div key={bill.id} className="flex items-center justify-between p-4 bg-dashboard-hover rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-dashboard-accent/10 flex items-center justify-center">
                                                <FileText className="w-6 h-6 text-dashboard-accent" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-dashboard-text-primary">
                                                    {bill.vendor}
                                                </h3>
                                                <p className="text-sm text-dashboard-text-secondary">
                                                    {bill.description}
                                                </p>
                                                <div className="flex items-center gap-4 text-xs text-dashboard-text-secondary mt-1">
                                                    <span>{bill.invoiceNumber}</span>
                                                    <span>•</span>
                                                    <span className={isOverdue(bill.dueDate) && bill.status !== 'paid' ? 'text-status-error font-medium' : ''}>
                                                        Due: {bill.dueDate}
                                                    </span>
                                                    <span>•</span>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {bill.category}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="font-semibold text-dashboard-text-primary">
                                                    ${bill.amount.toLocaleString()}
                                                </p>
                                                <Badge className={getStatusBadge(bill.status)}>
                                                    {getStatusIcon(bill.status)}
                                                    <span className="ml-1 capitalize">{bill.status}</span>
                                                </Badge>
                                            </div>
                                            {bill.status === 'pending' && (
                                                <Button size="sm" className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                                                    Pay Now
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Methods & Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-dashboard-text-primary">Payment Methods</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <p className="text-dashboard-text-secondary text-sm text-center py-4">No payment methods added</p>
                                <Button variant="outline" size="sm" className="w-full">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Payment Method
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-dashboard-text-primary">Automation Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <p className="text-dashboard-text-secondary text-sm text-center py-4">No automation settings configured</p>
                                <Button variant="outline" size="sm" className="w-full">
                                    Manage Settings
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>

    );
}