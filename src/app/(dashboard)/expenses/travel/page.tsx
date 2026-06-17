
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Plane,
    Plus,
    Search,
    Filter,
    MapPin,
    Calendar,
    Users,
    Hotel
} from "lucide-react";

const travelExpenses = [
    {
        id: 1,
        trip: "San Francisco Business Trip",
        destination: "San Francisco, CA",
        dates: "Nov 20-23, 2024",
        traveler: "John Smith",
        amount: 2450.00,
        status: "approved",
        expenses: ["Flight", "Hotel", "Meals"]
    },
    {
        id: 2,
        trip: "Client Meeting in NYC",
        destination: "New York, NY",
        dates: "Nov 15-16, 2024",
        traveler: "Sarah Chen",
        amount: 1850.00,
        status: "pending",
        expenses: ["Flight", "Hotel", "Ground Transport"]
    },
    {
        id: 3,
        trip: "Conference in Austin",
        destination: "Austin, TX",
        dates: "Dec 1-3, 2024",
        traveler: "Michael Rodriguez",
        amount: 1200.00,
        status: "draft",
        expenses: ["Flight", "Hotel", "Registration"]
    }
];

export default function Travel() {
    const getStatusBadge = (status: string) => {
        const baseClasses = "text-xs font-medium";
        switch (status) {
            case 'approved':
                return `${baseClasses} bg-emerald-50 text-emerald-600 border-none`;
            case 'pending':
                return `${baseClasses} bg-blue-50 text-blue-600 border-none`;
            case 'draft':
                return `${baseClasses} bg-amber-50 text-amber-600 border-none`;
            default:
                return baseClasses;
        }
    };

    return (
        <>
            <div className="min-h-screen bg-dashboard-bg">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-dashboard-text-primary">Travel Expenses</h1>
                            <p className="text-dashboard-text-secondary mt-1">
                                Manage business travel bookings and expenses
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline">
                                <Calendar className="w-4 h-4 mr-2" />
                                Travel Calendar
                            </Button>
                            <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                                <Plus className="w-4 h-4 mr-2" />
                                Book Travel
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-dashboard-text-secondary text-sm">Active Trips</p>
                                        <p className="text-2xl font-bold text-dashboard-text-primary">8</p>
                                    </div>
                                    <Plane className="w-8 h-8 text-dashboard-accent" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-dashboard-text-secondary text-sm">This Month</p>
                                        <p className="text-2xl font-bold text-dashboard-text-primary">$12,450</p>
                                    </div>
                                    <Hotel className="w-8 h-8 text-status-success" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-dashboard-text-secondary text-sm">Travelers</p>
                                        <p className="text-2xl font-bold text-dashboard-text-primary">24</p>
                                    </div>
                                    <Users className="w-8 h-8 text-dashboard-text-secondary" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-dashboard-card border-dashboard-border">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-dashboard-text-secondary text-sm">Avg per Trip</p>
                                        <p className="text-2xl font-bold text-dashboard-text-primary">$1,845</p>
                                    </div>
                                    <MapPin className="w-8 h-8 text-status-warning" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center space-x-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dashboard-text-secondary w-4 h-4" />
                            <Input placeholder="Search trips..." className="pl-10" />
                        </div>
                        <Button variant="outline" size="sm">
                            <Filter className="w-4 h-4 mr-2" />
                            Filter
                        </Button>
                    </div>

                    {/* Travel List */}
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-dashboard-text-primary">Recent Travel</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {travelExpenses.map((travel) => (
                                    <div key={travel.id} className="flex items-center justify-between p-4 bg-dashboard-hover rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-lg bg-dashboard-accent/10 flex items-center justify-center">
                                                <Plane className="w-6 h-6 text-dashboard-accent" />
                                            </div>
                                            <div>
                                                <h3 className="font-medium text-dashboard-text-primary">
                                                    {travel.trip}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-dashboard-text-secondary mt-1">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {travel.destination}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {travel.dates}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {travel.traveler}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1 mt-2">
                                                    {travel.expenses.map((expense, idx) => (
                                                        <Badge key={idx} variant="secondary" className="text-xs">
                                                            {expense}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="font-semibold text-dashboard-text-primary">
                                                    ${travel.amount.toLocaleString()}
                                                </p>
                                                <Badge className={getStatusBadge(travel.status)}>
                                                    <span className="capitalize">{travel.status}</span>
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}