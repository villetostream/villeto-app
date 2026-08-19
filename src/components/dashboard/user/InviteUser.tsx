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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    UserPlus,
    Upload,
    FileSpreadsheet,
    Mail,
    Building,
    CreditCard,
    Users,
    Download
} from "lucide-react";

interface InviteUserProps {
    children: ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InviteUser({ children, open, onOpenChange }: InviteUserProps) {
    const [issueCard, setIssueCard] = useState(false);
    const [selectedRole, setSelectedRole] = useState("");

    const roles = [
        { value: "employee", label: "Employee", description: "Basic expense submission and management" },
        { value: "manager", label: "Manager", description: "Expense approval and team oversight" },
        { value: "admin", label: "Admin", description: "Full system access and user management" },
        { value: "finance", label: "Finance", description: "Financial reporting and expense analysis" }
    ];

    const departments = [
        "Engineering", "Marketing", "Sales", "Operations", "Finance", "HR", "Legal"
    ];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-[600px] sm:w-[600px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="text-xl font-semibold text-dashboard-text-primary flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-dashboard-accent" />
                        Invite Team Members
                    </SheetTitle>
                    <SheetDescription className="text-dashboard-text-secondary">
                        Add new team members to your expense management system
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6">
                    <Tabs defaultValue="individual" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="individual">Individual Invite</TabsTrigger>
                            <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
                        </TabsList>

                        <TabsContent value="individual" className="space-y-6">
                            {/* Role Selection - Must be first */}
                            <Card className="bg-dashboard-card border-dashboard-border">
                                <CardHeader>
                                    <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                        <Users className="w-5 h-5" />
                                        Select Role
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <Label>Choose a role for the new user *</Label>
                                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {roles.map((role) => (
                                                    <SelectItem key={role.value} value={role.value}>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{role.label}</span>
                                                            <span className="text-xs text-dashboard-text-secondary">{role.description}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {selectedRole && (
                                            <div className="p-3 bg-dashboard-hover rounded-lg">
                                                <p className="text-sm text-dashboard-text-secondary">
                                                    Selected: <span className="font-medium text-dashboard-text-primary">
                                                        {roles.find(r => r.value === selectedRole)?.label}
                                                    </span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {selectedRole && (
                                <>
                                    {/* User Information */}
                                    <Card className="bg-dashboard-card border-dashboard-border">
                                        <CardHeader>
                                            <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                                <Mail className="w-5 h-5" />
                                                User Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="firstName">First Name *</Label>
                                                    <Input id="firstName" placeholder="John" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="lastName">Last Name *</Label>
                                                    <Input id="lastName" placeholder="Doe" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email Address *</Label>
                                                <Input id="email" type="email" placeholder="john.doe@company.com" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="phone">Phone Number (Optional)</Label>
                                                <Input id="phone" placeholder="+1 (555) 123-4567" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Work Information */}
                                    <Card className="bg-dashboard-card border-dashboard-border">
                                        <CardHeader>
                                            <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                                <Building className="w-5 h-5" />
                                                Work Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="department">Department *</Label>
                                                <Select>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select department" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {departments.map((dept) => (
                                                            <SelectItem key={dept} value={dept.toLowerCase()}>
                                                                {dept}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="jobTitle">Job Title</Label>
                                                <Input id="jobTitle" placeholder="Software Engineer" />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="location">Location *</Label>
                                                <Input id="location" placeholder="San Francisco, CA" />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Card Options */}
                                    <Card className="bg-dashboard-card border-dashboard-border">
                                        <CardHeader>
                                            <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                                <CreditCard className="w-5 h-5" />
                                                Corporate Card
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label>Issue Corporate Card</Label>
                                                    <p className="text-sm text-dashboard-text-secondary">
                                                        Automatically issue a corporate card upon account creation
                                                    </p>
                                                </div>
                                                <Switch checked={issueCard} onCheckedChange={setIssueCard} />
                                            </div>

                                            {issueCard && (
                                                <div className="space-y-4 p-4 bg-dashboard-hover rounded-lg">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="cardLimit">Monthly Spending Limit</Label>
                                                        <Select>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select limit" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1000">$1,000</SelectItem>
                                                                <SelectItem value="2500">$2,500</SelectItem>
                                                                <SelectItem value="5000">$5,000</SelectItem>
                                                                <SelectItem value="10000">$10,000</SelectItem>
                                                                <SelectItem value="custom">Custom Amount</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label htmlFor="cardType">Card Type</Label>
                                                        <Select>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select card type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="virtual">Virtual Card</SelectItem>
                                                                <SelectItem value="physical">Physical Card</SelectItem>
                                                                <SelectItem value="both">Both Virtual & Physical</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Action Buttons */}
                                    <div className="flex justify-end gap-3 mt-4">
                                        <Button variant="outline" className="px-6" onClick={() => onOpenChange(false)}>
                                            Cancel
                                        </Button>
                                        <Button className="px-6 bg-dashboard-accent hover:bg-dashboard-accent/90">
                                            Send Invitation
                                        </Button>
                                    </div>
                                </>
                            )}
                        </TabsContent>

                        <TabsContent value="bulk" className="space-y-6">
                            {/* Bulk Upload */}
                            <Card className="bg-dashboard-card border-dashboard-border">
                                <CardHeader>
                                    <CardTitle className="text-lg text-dashboard-text-primary flex items-center gap-2">
                                        <FileSpreadsheet className="w-5 h-5" />
                                        Bulk User Import
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-center space-y-4">
                                        <div className="border-2 border-dashed border-dashboard-border rounded-lg p-8">
                                            <Upload className="w-12 h-12 text-dashboard-text-secondary mx-auto mb-4" />
                                            <h3 className="text-lg font-medium text-dashboard-text-primary">
                                                Upload CSV or Excel File
                                            </h3>
                                            <p className="text-dashboard-text-secondary mb-4">
                                                Upload a file with user information to invite multiple users at once
                                            </p>
                                            <Button variant="outline">
                                                <Upload className="w-4 h-4 mr-2" />
                                                Choose File
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-dashboard-text-secondary">Required columns:</span>
                                            <Button variant="link" size="sm" className="p-0 h-auto">
                                                <Download className="w-4 h-4 mr-1" />
                                                Download Template
                                            </Button>
                                        </div>
                                        <div className="text-xs text-dashboard-text-secondary space-y-1">
                                            <p>• Email (required)</p>
                                            <p>• First Name (required)</p>
                                            <p>• Last Name (required)</p>
                                            <p>• Department (required)</p>
                                            <p>• Location (required)</p>
                                            <p>• Role (required)</p>
                                            <p>• Job Title (optional)</p>
                                            <p>• Phone (optional)</p>
                                            <p>• Card Limit (optional)</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Preview Section */}
                            <Card className="bg-dashboard-card border-dashboard-border">
                                <CardHeader>
                                    <CardTitle className="text-lg text-dashboard-text-primary">
                                        Import Preview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center text-dashboard-text-secondary py-8">
                                        Upload a file to see the preview of users to be invited
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Bulk Action Buttons */}
                            <div className="flex justify-end gap-3 mt-4">
                                <Button variant="outline" className="px-6" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button className="px-6 bg-dashboard-accent hover:bg-dashboard-accent/90" disabled>
                                    Import Users
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    );
}