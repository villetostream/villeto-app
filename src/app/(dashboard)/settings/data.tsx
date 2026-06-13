"use client"
import { Button } from "@/components/ui/button";
import {
    ArrowRight
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IntegrationMethodCard } from "@/components/dashboard/settings/IntegrationMethodCard";
import { useState } from "react";
//settings have sub menu like expense policy, company settings, entities, apps, personal settings 
// under the expense policy, its page content should be approvals, submitting expsenses,spend guidelines,uploading/replacng and deleting of policy with pictural display of the document
//under the submitting expenses, ther will be a trigger button for sheet called expense requirements with contents like 
type IntegrationMethod = "integration" | "csv" | null;
export default function Settings() {

    const [selectedMethod, setSelectedMethod] = useState<IntegrationMethod>(null);

    const handleMethodSelect = (method: IntegrationMethod) => {
        setSelectedMethod(method);
    }
    const handleContinue = () => {
        if (selectedMethod === "csv") {
            // setStep("upload");
        }
    };
    return (

        <div className="min-h-screen bg-dashboard-bg">
            <div className="p-6 space-y-6">
                <Tabs defaultValue="data-integrations">
                    <TabsList>
                        <TabsTrigger
                            value="my-profile"
                            className="data-[state=active]:bg-background rounded-md px-6"
                        >
                            My Profile
                        </TabsTrigger>
                        <TabsTrigger
                            value="policy-violations"
                            className="data-[state=active]:bg-background rounded-md px-6"
                        >
                            Policy Violations
                        </TabsTrigger>
                        <TabsTrigger
                            value="notifications"
                            className="data-[state=active]:bg-background rounded-md px-6"
                        >
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger
                            value="data-integration"
                            className="data-[state=active]:bg-background rounded-md px-6"
                        >
                            Data Integration
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="my-profile" className="mt-6">
                        <></>
                    </TabsContent>

                    <TabsContent value="policy-violations" className="mt-6">
                        <></>
                    </TabsContent>

                    <TabsContent value="notifications" className="mt-6">
                        <></>
                    </TabsContent>

                    <TabsContent value="data-integration" className="mt-6">
                        <div className="px-7 space-y-10">
                            <>
                                <h2 className="font-bold text-3xl ">Business Data Integration</h2>
                                <p className="text-base font-normal leading-[100%] text-muted-foreground mt-3.5 ">Choose a method to import your company infomation. You can connect to an existing service or upload a file directly.</p>
                            </>
                            <>
                                <div className="mb-8 grid gap-6 md:grid-cols-2">
                                    <IntegrationMethodCard
                                        type="integration"
                                        selected={selectedMethod === "integration"}
                                        onClick={() => handleMethodSelect("integration")}
                                    />
                                    <IntegrationMethodCard
                                        type="csv"
                                        selected={selectedMethod === "csv"}
                                        onClick={() => handleMethodSelect("csv")}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleContinue}
                                        // disabled={!selectedMethod}
                                        className="gap-2"
                                    >
                                        Continue
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        </div>
                    </TabsContent>
                </Tabs>
                {/* Header */}
                {/* <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-dashboard-text-primary">Settings</h1>
                        <p className="text-dashboard-text-secondary mt-1">
                            Manage your account preferences and company settings
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline">
                            <Download className="w-4 h-4 mr-2" />
                            Export Data
                        </Button>
                        <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                            Save Changes
                        </Button>
                    </div>
                </div> */}

                {/* Company Settings */}
                {/* <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                            <Building className="w-5 h-5" />
                            Company Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="company-name">Company Name</Label>
                                <Input id="company-name" defaultValue="ExpenseFlow Inc." />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company-email">Company Email</Label>
                                <Input id="company-email" type="email" defaultValue="admin@expenseflow.com" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="company-address">Business Address</Label>
                            <Input id="company-address" defaultValue="123 Business St, San Francisco, CA 94105" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="tax-id">Tax ID (EIN)</Label>
                                <Input id="tax-id" defaultValue="••-•••••••" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company-phone">Phone Number</Label>
                                <Input id="company-phone" defaultValue="+1 (555) 123-4567" />
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                {/* Expense Policies */}
                {/* <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Expense Policies
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="meal-limit">Daily Meal Limit</Label>
                                    <Input id="meal-limit" type="number" defaultValue="75" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="travel-limit">Travel Daily Limit</Label>
                                    <Input id="travel-limit" type="number" defaultValue="200" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Require receipts for expenses over</Label>
                                        <p className="text-sm text-dashboard-text-secondary">$25.00</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Auto-approve under $50</Label>
                                        <p className="text-sm text-dashboard-text-secondary">Automatically approve small expenses</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                {/* User Permissions */}
                {/* <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            User Permissions & Roles
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                <div>
                                    <p className="font-medium text-dashboard-text-primary">Admin Access</p>
                                    <p className="text-sm text-dashboard-text-secondary">Full system access and user management</p>
                                </div>
                                <Badge className="bg-status-error text-white">3 users</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                <div>
                                    <p className="font-medium text-dashboard-text-primary">Manager Access</p>
                                    <p className="text-sm text-dashboard-text-secondary">Department expense approval and reporting</p>
                                </div>
                                <Badge className="bg-status-warning text-white">8 users</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                <div>
                                    <p className="font-medium text-dashboard-text-primary">Employee Access</p>
                                    <p className="text-sm text-dashboard-text-secondary">Submit expenses and view personal reports</p>
                                </div>
                                <Badge className="bg-status-success text-white">13 users</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                {/* Notifications */}
                {/* <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notification Preferences
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-medium text-dashboard-text-primary flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email Notifications
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Expense submissions</Label>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Approval requests</Label>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Weekly reports</Label>
                                        <Switch />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-medium text-dashboard-text-primary flex items-center gap-2">
                                    <Smartphone className="w-4 h-4" />
                                    Push Notifications
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Card transactions</Label>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Spending limits</Label>
                                        <Switch defaultChecked />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Policy violations</Label>
                                        <Switch defaultChecked />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                {/* Security */}
                {/* <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Security Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Two-factor authentication</Label>
                                        <p className="text-sm text-dashboard-text-secondary">Required for all admin users</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Single Sign-On (SSO)</Label>
                                        <p className="text-sm text-dashboard-text-secondary">Google Workspace integration</p>
                                    </div>
                                    <Badge className="bg-status-success text-white text-xs">Active</Badge>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Session timeout</Label>
                                        <p className="text-sm text-dashboard-text-secondary">Auto-logout after inactivity</p>
                                    </div>
                                    <span className="text-sm text-dashboard-text-primary">4 hours</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>Login notifications</Label>
                                        <p className="text-sm text-dashboard-text-secondary">Alert on new device login</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                {/* Integrations */}
                {/* <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                            <Globe className="w-5 h-5" />
                            Integrations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                <div>
                                    <p className="font-medium text-dashboard-text-primary">QuickBooks Online</p>
                                    <p className="text-sm text-dashboard-text-secondary">Accounting sync</p>
                                </div>
                                <Badge className="bg-status-success text-white text-xs">Connected</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                <div>
                                    <p className="font-medium text-dashboard-text-primary">Slack</p>
                                    <p className="text-sm text-dashboard-text-secondary">Team notifications</p>
                                </div>
                                <Button variant="outline" size="sm">Connect</Button>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                <div>
                                    <p className="font-medium text-dashboard-text-primary">Google Workspace</p>
                                    <p className="text-sm text-dashboard-text-secondary">SSO and calendar</p>
                                </div>
                                <Badge className="bg-status-success text-white text-xs">Connected</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-dashboard-hover rounded-lg">
                                <div>
                                    <p className="font-medium text-dashboard-text-primary">NetSuite</p>
                                    <p className="text-sm text-dashboard-text-secondary">ERP integration</p>
                                </div>
                                <Button variant="outline" size="sm">Connect</Button>
                            </div>
                        </div>
                    </CardContent>
                </Card> */}

                {/* Danger Zone */}
                {/* <Card className="bg-dashboard-card border-status-error/20">
                    <CardHeader>
                        <CardTitle className="text-status-error flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Danger Zone
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-status-error/5 rounded-lg border border-status-error/20">
                            <div>
                                <p className="font-medium text-dashboard-text-primary">Delete Company Account</p>
                                <p className="text-sm text-dashboard-text-secondary">
                                    Permanently delete your company account and all associated data
                                </p>
                            </div>
                            <Button variant="outline" className="text-status-error border-status-error hover:bg-status-error hover:text-white">
                                Delete Account
                            </Button>
                        </div>
                    </CardContent>
                </Card> */}
            </div>
        </div>

    );
}