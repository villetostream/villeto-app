import { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-stores";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Building,
    CreditCard,
    Calendar,
    DollarSign,
    TrendingUp,
    Edit3,
    Shield,
    Settings
} from "lucide-react";

interface UserProfileProps {
    employee: any;
    children: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserProfile({ employee, children, open, onOpenChange }: UserProfileProps) {
    const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
    const currencySymbol = getCurrencySymbol();
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "text-xs font-medium";
        switch (status) {
            case 'active':
                return `${baseClasses} bg-status-success text-white`;
            case 'pending':
                return `${baseClasses} bg-status-warning text-white`;
            case 'inactive':
                return `${baseClasses} bg-dashboard-text-secondary text-white`;
            default:
                return baseClasses;
        }
    };

    const spendingPercentage = employee.cardLimit > 0 ? (employee.monthlySpend / employee.cardLimit) * 100 : 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-[500px] sm:w-[500px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-xl font-semibold text-dashboard-text-primary flex items-center gap-2">
                        <User className="w-5 h-5 text-dashboard-accent" />
                        Employee Profile
                    </SheetTitle>
                    <SheetDescription className="text-dashboard-text-secondary">
                        View and manage employee details and permissions
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                    {/* Profile Header */}
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                            <AvatarFallback className="bg-dashboard-accent text-white font-medium text-lg">
                                {getInitials(employee.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-dashboard-text-primary">
                                        {employee.name}
                                    </h3>
                                    <p className="text-dashboard-text-secondary">
                                        {employee.role} • {employee.department}
                                    </p>
                                </div>
                                <Badge className={getStatusBadge(employee.status)}>
                                    {employee.status}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-lg text-dashboard-text-primary">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-dashboard-text-secondary" />
                                <span className="text-dashboard-text-primary">{employee.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-dashboard-text-secondary" />
                                <span className="text-dashboard-text-primary">{employee.phone}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="w-4 h-4 text-dashboard-text-secondary" />
                                <span className="text-dashboard-text-primary">{employee.location}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Building className="w-4 h-4 text-dashboard-text-secondary" />
                                <span className="text-dashboard-text-primary">{employee.department}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card Information */}
                    {employee.cardNumber ? (
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardHeader>
                                <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                    <CreditCard className="w-5 h-5" />
                                    Card Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-dashboard-text-secondary">Card Number</span>
                                    <span className="text-dashboard-text-primary font-medium">{employee.fullCardNumber}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-dashboard-text-secondary">Monthly Limit</span>
                                    <span className="text-dashboard-text-primary font-medium">{currencySymbol}{employee.cardLimit.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-dashboard-text-secondary">Current Spend</span>
                                    <span className="text-dashboard-text-primary font-medium">{currencySymbol}{employee.monthlySpend.toLocaleString()}</span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-dashboard-text-secondary">Usage</span>
                                        <span className="text-dashboard-text-primary">{Math.round(spendingPercentage)}%</span>
                                    </div>
                                    <Progress value={spendingPercentage} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-6">
                                <div className="text-center space-y-4">
                                    <CreditCard className="w-12 h-12 text-dashboard-text-secondary mx-auto" />
                                    <div>
                                        <h3 className="text-lg font-medium text-dashboard-text-primary">No Card Assigned</h3>
                                        <p className="text-dashboard-text-secondary">This employee doesn&apos;t have a corporate card yet.</p>
                                    </div>
                                    <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                                        Issue Card
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-8 h-8 text-dashboard-accent" />
                                    <div>
                                        <p className="text-sm text-dashboard-text-secondary">Joined</p>
                                        <p className="font-medium text-dashboard-text-primary">Jan 2024</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="w-8 h-8 text-status-success" />
                                    <div>
                                        <p className="text-sm text-dashboard-text-secondary">Avg/Month</p>
                                        <p className="font-medium text-dashboard-text-primary">{currencySymbol}{(employee.monthlySpend * 0.85).toFixed(0)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4" />
                            Edit Profile
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Permissions
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Card Settings
                        </Button>
                        <Button variant="outline" className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Spending Report
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}