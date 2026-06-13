"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
    FileText,
    Upload,
    Download,
    Trash2,
    Eye,
    CheckCircle,
    XCircle,
    DollarSign,
    Calendar,
    MapPin,
    CreditCard,
    Receipt,
    Users
} from "lucide-react";
import { useState } from "react";

export default function ExpensePolicy() {
    const [showExpenseRequirements, setShowExpenseRequirements] = useState(false);

    const policies = [
        {
            id: 1,
            name: "Corporate Travel Policy 2024",
            type: "Travel",
            lastUpdated: "2024-01-15",
            status: "active",
            document: "/api/policies/travel-2024.pdf"
        },
        {
            id: 2,
            name: "Meal & Entertainment Guidelines",
            type: "Meals",
            lastUpdated: "2023-12-01",
            status: "active",
            document: "/api/policies/meals-2023.pdf"
        },
        {
            id: 3,
            name: "Equipment Purchase Policy",
            type: "Equipment",
            lastUpdated: "2023-11-20",
            status: "draft",
            document: "/api/policies/equipment-2023.pdf"
        }
    ];

    const approvalWorkflow = [
        { step: 1, role: "Employee", action: "Submit expense", status: "completed" },
        { step: 2, role: "Manager", action: "Review & approve up to $500", status: "current" },
        { step: 3, role: "Director", action: "Approve $500-$2000", status: "pending" },
        { step: 4, role: "Finance Team", action: "Final review & processing", status: "pending" }
    ];

    return (
        <div className="min-h-screen bg-dashboard-bg">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-dashboard-text-primary">Expense Policy</h1>
                        <p className="text-dashboard-text-secondary mt-1">
                            Manage approval workflows, expense guidelines, and policy documents
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Policy
                        </Button>
                        <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                            Save Changes
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="approvals" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="approvals">Approvals</TabsTrigger>
                        <TabsTrigger value="submitting">Submitting Expenses</TabsTrigger>
                        <TabsTrigger value="guidelines">Spend Guidelines</TabsTrigger>
                        <TabsTrigger value="policies">Policy Documents</TabsTrigger>
                    </TabsList>

                    {/* Approvals Tab */}
                    <TabsContent value="approvals" className="space-y-6">
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardHeader>
                                <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5" />
                                    Approval Workflow
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    {approvalWorkflow.map((step, _index) => (
                                        <div key={step.step} className="flex items-center gap-4 p-4 bg-dashboard-hover rounded-lg">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step.status === 'completed' ? 'bg-status-success text-white' :
                                                step.status === 'current' ? 'bg-dashboard-accent text-white' :
                                                    'bg-dashboard-text-secondary/20 text-dashboard-text-secondary'
                                                }`}>
                                                {step.step}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-medium text-dashboard-text-primary">{step.role}</h4>
                                                <p className="text-sm text-dashboard-text-secondary">{step.action}</p>
                                            </div>
                                            <Badge variant={step.status === 'completed' ? 'default' : step.status === 'current' ? 'secondary' : 'outline'}>
                                                {step.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-dashboard-text-primary">Approval Limits</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Manager approval limit</Label>
                                                <Input className="w-24" defaultValue="500" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Director approval limit</Label>
                                                <Input className="w-24" defaultValue="2000" />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Auto-approve under</Label>
                                                <Input className="w-24" defaultValue="25" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-medium text-dashboard-text-primary">Approval Settings</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Require manager approval</Label>
                                                <Switch defaultChecked />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Parallel approval process</Label>
                                                <Switch />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Weekend approvals</Label>
                                                <Switch defaultChecked />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Submitting Expenses Tab */}
                    <TabsContent value="submitting" className="space-y-6">
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardHeader>
                                <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                                    <Receipt className="w-5 h-5" />
                                    Expense Submission Rules
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-dashboard-text-primary">Submission Requirements</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Require receipts over $25</Label>
                                                <Switch defaultChecked />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Require business purpose</Label>
                                                <Switch defaultChecked />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Submission deadline (days)</Label>
                                                <Input className="w-16" defaultValue="30" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="font-medium text-dashboard-text-primary">Categories & Fields</h4>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Require project codes</Label>
                                                <Switch />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Require attendees for meals</Label>
                                                <Switch defaultChecked />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label>Allow personal expenses</Label>
                                                <Switch />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="font-medium text-dashboard-text-primary">Expense Requirements Guide</h4>
                                            <p className="text-sm text-dashboard-text-secondary">
                                                View detailed submission requirements and guidelines
                                            </p>
                                        </div>
                                        <Sheet open={showExpenseRequirements} onOpenChange={setShowExpenseRequirements}>
                                            <SheetTrigger asChild>
                                                <Button variant="outline">
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    View Requirements
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent className="w-[600px] sm:w-[600px]">
                                                <SheetHeader>
                                                    <SheetTitle>Expense Submission Requirements</SheetTitle>
                                                    <SheetDescription>
                                                        Complete guide for submitting expenses correctly
                                                    </SheetDescription>
                                                </SheetHeader>
                                                <div className="mt-6 space-y-6">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 p-4 bg-dashboard-hover rounded-lg">
                                                            <DollarSign className="w-5 h-5 text-dashboard-accent" />
                                                            <div>
                                                                <h4 className="font-medium">Receipt Requirements</h4>
                                                                <p className="text-sm text-dashboard-text-secondary">
                                                                    All expenses over $25 must include receipts
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 p-4 bg-dashboard-hover rounded-lg">
                                                            <Calendar className="w-5 h-5 text-dashboard-accent" />
                                                            <div>
                                                                <h4 className="font-medium">Submission Deadline</h4>
                                                                <p className="text-sm text-dashboard-text-secondary">
                                                                    Submit within 30 days of expense date
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 p-4 bg-dashboard-hover rounded-lg">
                                                            <Users className="w-5 h-5 text-dashboard-accent" />
                                                            <div>
                                                                <h4 className="font-medium">Business Meals</h4>
                                                                <p className="text-sm text-dashboard-text-secondary">
                                                                    Include attendee names and business purpose
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 p-4 bg-dashboard-hover rounded-lg">
                                                            <MapPin className="w-5 h-5 text-dashboard-accent" />
                                                            <div>
                                                                <h4 className="font-medium">Travel Expenses</h4>
                                                                <p className="text-sm text-dashboard-text-secondary">
                                                                    Include location and business purpose
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 p-4 bg-dashboard-hover rounded-lg">
                                                            <CreditCard className="w-5 h-5 text-dashboard-accent" />
                                                            <div>
                                                                <h4 className="font-medium">Corporate Card</h4>
                                                                <p className="text-sm text-dashboard-text-secondary">
                                                                    Corporate card expenses auto-imported
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </SheetContent>
                                        </Sheet>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Spend Guidelines Tab */}
                    <TabsContent value="guidelines" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-dashboard-card border-dashboard-border">
                                <CardHeader>
                                    <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                                        <DollarSign className="w-5 h-5" />
                                        Spending Limits
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Daily meal allowance</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">$</span>
                                                <Input className="w-16" defaultValue="75" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>Hotel per night</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">$</span>
                                                <Input className="w-20" defaultValue="200" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>Ground transport</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">$</span>
                                                <Input className="w-16" defaultValue="50" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>Office supplies</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">$</span>
                                                <Input className="w-20" defaultValue="100" />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-dashboard-card border-dashboard-border">
                                <CardHeader>
                                    <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                                        <XCircle className="w-5 h-5" />
                                        Restricted Categories
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Alcohol purchases</Label>
                                            <Switch />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>Personal expenses</Label>
                                            <Switch />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>Gift cards</Label>
                                            <Switch />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>Cash advances</Label>
                                            <Switch />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <Label>Entertainment</Label>
                                            <Switch defaultChecked />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Policy Documents Tab */}
                    <TabsContent value="policies" className="space-y-6">
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardHeader>
                                <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                                    <FileText className="w-5 h-5" />
                                    Policy Documents
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4">
                                    {policies.map((policy) => (
                                        <div key={policy.id} className="flex items-center justify-between p-4 bg-dashboard-hover rounded-lg border">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-dashboard-accent/10 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-6 h-6 text-dashboard-accent" />
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-dashboard-text-primary">{policy.name}</h4>
                                                    <div className="flex items-center gap-4 text-sm text-dashboard-text-secondary">
                                                        <span>Type: {policy.type}</span>
                                                        <span>Updated: {policy.lastUpdated}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>
                                                    {policy.status}
                                                </Badge>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm">
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm">
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm">
                                                        <Upload className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-status-error hover:text-status-error">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-2 border-dashed border-dashboard-border rounded-lg p-8 text-center">
                                    <Upload className="w-8 h-8 mx-auto text-dashboard-text-secondary mb-4" />
                                    <h4 className="font-medium text-dashboard-text-primary mb-2">Upload New Policy</h4>
                                    <p className="text-sm text-dashboard-text-secondary mb-4">
                                        Drag and drop files here or click to browse
                                    </p>
                                    <Button variant="outline">
                                        Choose Files
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}