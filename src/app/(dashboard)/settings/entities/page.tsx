"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Building,
    Plus,
    MoreHorizontal,
    Edit,
    Trash2,
    MapPin,
    Phone,
    Mail,
    CreditCard,
    Users,
    DollarSign
} from "lucide-react";
import { useState } from "react";

export default function Entities() {
    const [entities, _setEntities] = useState([
        {
            id: 1,
            name: "ExpenseFlow Inc.",
            type: "Parent Company",
            taxId: "12-3456789",
            address: "123 Business St, San Francisco, CA 94105",
            phone: "+1 (555) 123-4567",
            email: "admin@expenseflow.com",
            status: "active",
            employees: 45,
            monthlySpend: 125000,
            isParent: true
        },
        {
            id: 2,
            name: "ExpenseFlow UK Ltd.",
            type: "Subsidiary",
            taxId: "GB123456789",
            address: "456 London Road, London, UK SW1A 1AA",
            phone: "+44 20 7946 0958",
            email: "uk@expenseflow.com",
            status: "active",
            employees: 12,
            monthlySpend: 35000,
            isParent: false
        },
        {
            id: 3,
            name: "ExpenseFlow Canada Inc.",
            type: "Subsidiary",
            taxId: "123456789RC0001",
            address: "789 Maple Ave, Toronto, ON M5V 3A8",
            phone: "+1 (416) 555-0123",
            email: "ca@expenseflow.com",
            status: "pending",
            employees: 8,
            monthlySpend: 22000,
            isParent: false
        }
    ]);

    const [showAddEntity, setShowAddEntity] = useState(false);

    return (
        <div className="min-h-screen bg-dashboard-bg">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-dashboard-text-primary">Legal Entities</h1>
                        <p className="text-dashboard-text-secondary mt-1">
                            Manage your company&apos;s legal entities, subsidiaries, and business units
                        </p>
                    </div>
                    <Dialog open={showAddEntity} onOpenChange={setShowAddEntity}>
                        <DialogTrigger asChild>
                            <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Entity
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px]">
                            <DialogHeader>
                                <DialogTitle>Add New Legal Entity</DialogTitle>
                                <DialogDescription>
                                    Create a new legal entity or subsidiary for your organization.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="entity-name">Entity Name</Label>
                                        <Input id="entity-name" placeholder="ExpenseFlow Australia Pty Ltd" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="entity-type">Entity Type</Label>
                                        <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="parent">Parent Company</SelectItem>
                                                <SelectItem value="subsidiary">Subsidiary</SelectItem>
                                                <SelectItem value="division">Division</SelectItem>
                                                <SelectItem value="branch">Branch Office</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="tax-id">Tax ID</Label>
                                        <Input id="tax-id" placeholder="123456789" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="jurisdiction">Jurisdiction</Label>
                                        <Select>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select country" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="us">United States</SelectItem>
                                                <SelectItem value="uk">United Kingdom</SelectItem>
                                                <SelectItem value="ca">Canada</SelectItem>
                                                <SelectItem value="au">Australia</SelectItem>
                                                <SelectItem value="de">Germany</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address">Business Address</Label>
                                    <Input id="address" placeholder="Street address" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="entity-phone">Phone</Label>
                                        <Input id="entity-phone" placeholder="+1 (555) 000-0000" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="entity-email">Email</Label>
                                        <Input id="entity-email" type="email" placeholder="entity@company.com" />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowAddEntity(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => setShowAddEntity(false)}>
                                    Create Entity
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Entity Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-dashboard-text-secondary">Total Entities</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">{entities.length}</p>
                                </div>
                                <Building className="w-8 h-8 text-dashboard-accent" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-dashboard-text-secondary">Active Entities</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">
                                        {entities.filter(e => e.status === 'active').length}
                                    </p>
                                </div>
                                <Badge className="bg-status-success">Active</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-dashboard-text-secondary">Total Employees</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">
                                        {entities.reduce((sum, e) => sum + e.employees, 0)}
                                    </p>
                                </div>
                                <Users className="w-8 h-8 text-dashboard-accent" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-dashboard-text-secondary">Combined Spend</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">
                                        ${(entities.reduce((sum, e) => sum + e.monthlySpend, 0) / 1000)}K
                                    </p>
                                </div>
                                <DollarSign className="w-8 h-8 text-dashboard-accent" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Entity List */}
                <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary">All Legal Entities</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            {entities.map((entity) => (
                                <div key={entity.id} className="p-6 bg-dashboard-hover rounded-lg border">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-dashboard-accent/10 rounded-lg flex items-center justify-center">
                                                    <Building className="w-6 h-6 text-dashboard-accent" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-dashboard-text-primary flex items-center gap-2">
                                                        {entity.name}
                                                        {entity.isParent && <Badge variant="outline">Parent</Badge>}
                                                    </h3>
                                                    <p className="text-sm text-dashboard-text-secondary">{entity.type}</p>
                                                </div>
                                                <Badge variant={entity.status === 'active' ? 'default' : 'secondary'}>
                                                    {entity.status}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="w-4 h-4 text-dashboard-text-secondary" />
                                                    <span className="text-dashboard-text-secondary truncate">{entity.address}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="w-4 h-4 text-dashboard-text-secondary" />
                                                    <span className="text-dashboard-text-secondary">{entity.phone}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Mail className="w-4 h-4 text-dashboard-text-secondary" />
                                                    <span className="text-dashboard-text-secondary">{entity.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <CreditCard className="w-4 h-4 text-dashboard-text-secondary" />
                                                    <span className="text-dashboard-text-secondary">Tax ID: {entity.taxId}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-dashboard-border">
                                                <div className="text-center p-3 bg-dashboard-card rounded-lg">
                                                    <p className="text-sm text-dashboard-text-secondary">Employees</p>
                                                    <p className="text-xl font-semibold text-dashboard-text-primary">{entity.employees}</p>
                                                </div>
                                                <div className="text-center p-3 bg-dashboard-card rounded-lg">
                                                    <p className="text-sm text-dashboard-text-secondary">Monthly Spend</p>
                                                    <p className="text-xl font-semibold text-dashboard-text-primary">
                                                        ${entity.monthlySpend.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="text-center p-3 bg-dashboard-card rounded-lg">
                                                    <p className="text-sm text-dashboard-text-secondary">Status</p>
                                                    <div className="flex items-center justify-center gap-2 mt-1">
                                                        <div className={`w-2 h-2 rounded-full ${entity.status === 'active' ? 'bg-status-success' : 'bg-status-warning'
                                                            }`}></div>
                                                        <span className="text-sm font-medium capitalize">{entity.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Button variant="ghost" size="sm">
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-status-error hover:text-status-error">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}