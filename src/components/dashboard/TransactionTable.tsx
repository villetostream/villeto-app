"use client"

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Search,
    Filter,
    Calendar,
    Download,
    Trash2,
    MoreHorizontal,
    ChevronUp,
    ChevronDown
} from "lucide-react";

const transactions = [
    {
        id: 1,
        merchant: "The Storehouse",
        logo: "🍺",
        description: "Alcohol and Bars",
        date: "Nov 14, 2024",
        cardholder: "Oscar Hernandez",
        department: "Finance & Accounting",
        location: "Boston",
        amount: "$100.00",
        status: "approved"
    },
    {
        id: 2,
        merchant: "Jackpocket",
        logo: "🎰",
        description: "Gambling",
        date: "Nov 14, 2024",
        cardholder: "Lawrence Wang",
        department: "Engineering",
        location: "San Francisco",
        amount: "$2.47",
        status: "flagged"
    },
    {
        id: 3,
        merchant: "CAVA",
        logo: "🥗",
        description: "Restaurants",
        date: "Nov 14, 2024",
        cardholder: "Leila Iqbal",
        department: "Support",
        location: "Seattle",
        amount: "$21.42",
        status: "approved"
    },
    {
        id: 4,
        merchant: "Uber Eats",
        logo: "🍕",
        description: "Taxi and Rideshare",
        date: "Nov 14, 2024",
        cardholder: "Bill Joy",
        department: "Engineering",
        location: "San Francisco",
        amount: "$1.50",
        status: "pending"
    }
];

// const statusColors = {
//     approved: "bg-status-success text-white",
//     flagged: "bg-status-error text-white",
//     pending: "bg-status-warning text-white",
//     declined: "bg-status-error text-white"
// };

type SortField = 'merchant' | 'date' | 'cardholder' | 'department' | 'location' | 'amount';
type SortDirection = 'asc' | 'desc';

function SortableHeader({
    field,
    children,
    sortField,
    sortDirection,
    onSort,
}: {
    field: SortField;
    children: React.ReactNode;
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
}) {
    return (
        <TableHead
            className={`cursor-pointer hover:bg-dashboard-hover select-none ${field === 'amount' ? 'text-right' : ''}`}
            onClick={() => onSort(field)}
        >
            <div className="flex items-center gap-1">
                {children}
                <div className="flex flex-col">
                    <ChevronUp
                        className={`w-3 h-3 ${sortField === field && sortDirection === 'asc' ? 'text-dashboard-accent' : 'text-dashboard-text-secondary opacity-50'}`}
                    />
                    <ChevronDown
                        className={`w-3 h-3 -mt-1 ${sortField === field && sortDirection === 'desc' ? 'text-dashboard-accent' : 'text-dashboard-text-secondary opacity-50'}`}
                    />
                </div>
            </div>
        </TableHead>
    );
}

export function TransactionTable() {
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedTransactions = [...transactions].sort((a, b) => {
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (sortField) {
            case 'merchant':
                aValue = a.merchant;
                bValue = b.merchant;
                break;
            case 'date':
                aValue = new Date(a.date).getTime();
                bValue = new Date(b.date).getTime();
                break;
            case 'cardholder':
                aValue = a.cardholder;
                bValue = b.cardholder;
                break;
            case 'department':
                aValue = a.department;
                bValue = b.department;
                break;
            case 'location':
                aValue = a.location;
                bValue = b.location;
                break;
            case 'amount':
                aValue = parseFloat(a.amount.replace('$', ''));
                bValue = parseFloat(b.amount.replace('$', ''));
                break;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortDirection === 'asc'
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        } else {
            return sortDirection === 'asc'
                ? (aValue as number) - (bValue as number)
                : (bValue as number) - (aValue as number);
        }
    });

    return (
        <div className="space-y-4">
            {/* Filters and Search */}
            <div className="flex items-center justify-between">
                <Tabs defaultValue="all" className="w-auto">
                    <TabsList className="grid grid-cols-5 w-auto">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="review">Needs review</TabsTrigger>
                        <TabsTrigger value="flagged">Flagged</TabsTrigger>
                        <TabsTrigger value="approved">Fully approved</TabsTrigger>
                        <TabsTrigger value="declined">Declined</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                        <Calendar className="w-4 h-4 mr-2" />
                        Calendar
                    </Button>
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dashboard-text-secondary w-4 h-4" />
                    <Input
                        placeholder="Search..."
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Add filter
                </Button>
            </div>

            {/* Table */}
            <div className="bg-dashboard-card rounded-lg border border-dashboard-border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <SortableHeader field="merchant" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Merchant</SortableHeader>
                            <SortableHeader field="date" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Date</SortableHeader>
                            <SortableHeader field="cardholder" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Cardholder</SortableHeader>
                            <SortableHeader field="department" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Department</SortableHeader>
                            <SortableHeader field="location" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Location</SortableHeader>
                            <SortableHeader field="amount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Amount</SortableHeader>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedTransactions.map((transaction) => (
                            <TableRow key={transaction.id} className="hover:bg-dashboard-hover">
                                <TableCell>
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm">
                                            {transaction.logo}
                                        </div>
                                        <div>
                                            <div className="font-medium text-dashboard-text-primary">
                                                {transaction.merchant}
                                            </div>
                                            <div className="text-sm text-dashboard-text-secondary">
                                                {transaction.description}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-dashboard-text-secondary">
                                    {transaction.date}
                                </TableCell>
                                <TableCell className="text-dashboard-text-primary">
                                    {transaction.cardholder}
                                </TableCell>
                                <TableCell className="text-dashboard-text-secondary">
                                    {transaction.department}
                                </TableCell>
                                <TableCell className="text-dashboard-text-secondary">
                                    {transaction.location}
                                </TableCell>
                                <TableCell className="text-right font-medium text-dashboard-text-primary">
                                    {transaction.amount}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-sm text-dashboard-text-secondary">
                <div>1–50 of 1,140 transactions</div>
                <div className="flex items-center space-x-1">
                    <span>$492,885.40 USD</span>
                    <Button variant="ghost" size="sm">
                        →
                    </Button>
                </div>
            </div>
        </div>
    );
}