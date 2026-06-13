"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Plug,
    Search,
    Star,
    Download,
    Settings,
    Trash2,
    ExternalLink,
    Zap,
    Globe,
    FileText,
    Users,
    Calendar,
    MessageSquare,
    Database,
    Plus
} from "lucide-react";
import { useState } from "react";

export default function Apps() {
    const [searchTerm, setSearchTerm] = useState("");

    const connectedApps = [
        {
            id: 1,
            name: "QuickBooks Online",
            category: "Accounting",
            icon: FileText,
            description: "Sync expenses and transactions with your accounting system",
            status: "connected",
            lastSync: "2 hours ago",
            features: ["Auto-sync transactions", "Real-time updates", "Tax categorization"]
        },
        {
            id: 2,
            name: "Google Workspace",
            category: "Authentication",
            icon: Users,
            description: "Single sign-on and calendar integration",
            status: "connected",
            lastSync: "Active",
            features: ["SSO authentication", "Calendar sync", "Drive integration"]
        },
        {
            id: 3,
            name: "Slack",
            category: "Communication",
            icon: MessageSquare,
            description: "Get expense notifications and approvals in Slack",
            status: "connected",
            lastSync: "1 hour ago",
            features: ["Expense notifications", "Approval workflows", "Spending alerts"]
        }
    ];

    const availableApps = [
        {
            id: 4,
            name: "Salesforce",
            category: "CRM",
            icon: Database,
            description: "Sync expense data with customer projects and opportunities",
            rating: 4.8,
            installs: "10K+",
            features: ["Project tracking", "Client billing", "Revenue attribution"]
        },
        {
            id: 5,
            name: "Microsoft Teams",
            category: "Communication",
            icon: MessageSquare,
            description: "Expense approvals and notifications in Microsoft Teams",
            rating: 4.6,
            installs: "5K+",
            features: ["Team notifications", "Approval bots", "Expense summaries"]
        },
        {
            id: 6,
            name: "NetSuite",
            category: "ERP",
            icon: Globe,
            description: "Complete ERP integration for enterprise expense management",
            rating: 4.7,
            installs: "2K+",
            features: ["Full ERP sync", "Advanced reporting", "Multi-subsidiary"]
        },
        {
            id: 7,
            name: "Xero",
            category: "Accounting",
            icon: FileText,
            description: "Alternative accounting system integration",
            rating: 4.5,
            installs: "8K+",
            features: ["Bank reconciliation", "Tax reporting", "Multi-currency"]
        },
        {
            id: 8,
            name: "Outlook Calendar",
            category: "Productivity",
            icon: Calendar,
            description: "Sync travel expenses with calendar events",
            rating: 4.4,
            installs: "15K+",
            features: ["Travel tracking", "Meeting expenses", "Time correlation"]
        }
    ];

    const categories = ["All", "Accounting", "Authentication", "Communication", "CRM", "ERP", "Productivity"];

    const filteredAvailableApps = availableApps.filter(app =>
        app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-dashboard-bg">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-dashboard-text-primary">Apps & Integrations</h1>
                        <p className="text-dashboard-text-secondary mt-1">
                            Connect ExpenseFlow with your favorite business tools and services
                        </p>
                    </div>
                    <Button variant="outline">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Browse App Store
                    </Button>
                </div>

                <Tabs defaultValue="connected" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="connected">Connected Apps ({connectedApps.length})</TabsTrigger>
                        <TabsTrigger value="available">Available Apps</TabsTrigger>
                        <TabsTrigger value="custom">Custom Integrations</TabsTrigger>
                    </TabsList>

                    {/* Connected Apps Tab */}
                    <TabsContent value="connected" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {connectedApps.map((app) => (
                                <Card key={app.id} className="bg-dashboard-card border-dashboard-border">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-dashboard-accent/10 rounded-lg flex items-center justify-center">
                                                    <app.icon className="w-6 h-6 text-dashboard-accent" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg text-dashboard-text-primary">{app.name}</CardTitle>
                                                    <Badge variant="outline" className="text-xs">{app.category}</Badge>
                                                </div>
                                            </div>
                                            <Badge className="bg-status-success text-white">Connected</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-dashboard-text-secondary">{app.description}</p>

                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-dashboard-text-secondary">Last sync:</span>
                                                <span className="text-dashboard-text-primary">{app.lastSync}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-dashboard-text-secondary">Status:</span>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-status-success rounded-full"></div>
                                                    <span className="text-status-success">Active</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Features:</Label>
                                            <div className="space-y-1">
                                                {app.features.map((feature, index) => (
                                                    <div key={index} className="flex items-center gap-2 text-sm">
                                                        <div className="w-1 h-1 bg-dashboard-accent rounded-full"></div>
                                                        <span className="text-dashboard-text-secondary">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button variant="outline" size="sm" className="flex-1">
                                                <Settings className="w-4 h-4 mr-2" />
                                                Settings
                                            </Button>
                                            <Button variant="outline" size="sm" className="text-status-error hover:text-status-error">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Available Apps Tab */}
                    <TabsContent value="available" className="space-y-6">
                        {/* Search and Filter */}
                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dashboard-text-secondary" />
                                <Input
                                    placeholder="Search apps..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex gap-2">
                                {categories.map((category) => (
                                    <Button key={category} variant="outline" size="sm">
                                        {category}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredAvailableApps.map((app) => (
                                <Card key={app.id} className="bg-dashboard-card border-dashboard-border hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-dashboard-hover rounded-lg flex items-center justify-center">
                                                    <app.icon className="w-6 h-6 text-dashboard-text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg text-dashboard-text-primary">{app.name}</CardTitle>
                                                    <Badge variant="outline" className="text-xs">{app.category}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <p className="text-sm text-dashboard-text-secondary">{app.description}</p>

                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex items-center gap-1">
                                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                <span className="text-dashboard-text-primary">{app.rating}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Download className="w-4 h-4 text-dashboard-text-secondary" />
                                                <span className="text-dashboard-text-secondary">{app.installs}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Key Features:</Label>
                                            <div className="space-y-1">
                                                {app.features.slice(0, 3).map((feature, index) => (
                                                    <div key={index} className="flex items-center gap-2 text-sm">
                                                        <div className="w-1 h-1 bg-dashboard-accent rounded-full"></div>
                                                        <span className="text-dashboard-text-secondary">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button className="flex-1 bg-dashboard-accent hover:bg-dashboard-accent/90">
                                                <Plug className="w-4 h-4 mr-2" />
                                                Connect
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Custom Integrations Tab */}
                    <TabsContent value="custom" className="space-y-6">
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardHeader>
                                <CardTitle className="text-dashboard-text-primary flex items-center gap-2">
                                    <Zap className="w-5 h-5" />
                                    Custom API Integrations
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-dashboard-hover rounded-lg border">
                                            <h4 className="font-medium text-dashboard-text-primary mb-2">REST API</h4>
                                            <p className="text-sm text-dashboard-text-secondary mb-3">
                                                Build custom integrations using our REST API
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">v2.1</Badge>
                                                <Badge className="bg-status-success text-white">Stable</Badge>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full mt-3">
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                View Documentation
                                            </Button>
                                        </div>

                                        <div className="p-4 bg-dashboard-hover rounded-lg border">
                                            <h4 className="font-medium text-dashboard-text-primary mb-2">Webhooks</h4>
                                            <p className="text-sm text-dashboard-text-secondary mb-3">
                                                Receive real-time notifications for expense events
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-status-success text-white">2 Active</Badge>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full mt-3">
                                                <Settings className="w-4 h-4 mr-2" />
                                                Manage Webhooks
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-dashboard-hover rounded-lg border">
                                            <h4 className="font-medium text-dashboard-text-primary mb-2">GraphQL</h4>
                                            <p className="text-sm text-dashboard-text-secondary mb-3">
                                                Query expense data with precise control
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Beta</Badge>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full mt-3">
                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                GraphQL Playground
                                            </Button>
                                        </div>

                                        <div className="p-4 bg-dashboard-hover rounded-lg border">
                                            <h4 className="font-medium text-dashboard-text-primary mb-2">SDK Libraries</h4>
                                            <p className="text-sm text-dashboard-text-secondary mb-3">
                                                Official SDKs for popular programming languages
                                            </p>
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                <Badge variant="outline">Node.js</Badge>
                                                <Badge variant="outline">Python</Badge>
                                                <Badge variant="outline">PHP</Badge>
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full">
                                                <Download className="w-4 h-4 mr-2" />
                                                Download SDKs
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t pt-6">
                                    <h4 className="font-medium text-dashboard-text-primary mb-4">API Keys</h4>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-dashboard-card rounded-lg border">
                                            <div>
                                                <p className="font-medium text-dashboard-text-primary">Production API Key</p>
                                                <p className="text-sm text-dashboard-text-secondary">pk_prod_•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm">Regenerate</Button>
                                                <Button variant="outline" size="sm">Copy</Button>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-3 bg-dashboard-card rounded-lg border">
                                            <div>
                                                <p className="font-medium text-dashboard-text-primary">Test API Key</p>
                                                <p className="text-sm text-dashboard-text-secondary">pk_test_••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm">Regenerate</Button>
                                                <Button variant="outline" size="sm">Copy</Button>
                                            </div>
                                        </div>
                                    </div>

                                    <Button variant="outline" className="mt-4">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Generate New Key
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