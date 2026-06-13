"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MoreHorizontal, RefreshCw } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type PolicyAlert = {
    id: string;
    name: string;
    department: string;
    alert: "High" | "Medium" | "Low";
    date: string;
};

const data: PolicyAlert[] = [
    { id: "0001", name: "Stephen Abubakar", department: "Design & Development", alert: "High", date: "26-09-2025" },
    { id: "0002", name: "Stephen Abubakar", department: "Design & Development", alert: "Medium", date: "26-09-2025" },
    { id: "0003", name: "Stephen Abubakar", department: "Design & Development", alert: "Medium", date: "26-09-2025" },
    { id: "0004", name: "Sarah Johnson", department: "Marketing", alert: "Low", date: "25-09-2025" },
    { id: "0005", name: "Mike Chen", department: "Engineering", alert: "High", date: "24-09-2025" },
];

const alertClass = (alert: PolicyAlert["alert"]) =>
    alert === "High" ? "text-destructive" : alert === "Medium" ? "text-warning" : "text-muted-foreground";

export const PolicyAlertsTable = () => {
    const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string, checked: boolean) => {
        setRowSelection((prev) => {
            const next = { ...prev };
            if (checked) next[id] = true;
            else delete next[id];
            return next;
        });
    };

    return (
        <Card className="p-6 rounded-[14px] border">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold leading-[100%]">Policy Alerts</h3>
                    <p className="text-sm text-muted-foreground mt-2">Your latest policy alerts</p>
                </div>
                <Button variant="ghost" size="sm">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead />
                            <TableHead>ID NO</TableHead>
                            <TableHead>NAME OF EMPLOYEE</TableHead>
                            <TableHead>DEPARTMENT</TableHead>
                            <TableHead>POLICY ALERT</TableHead>
                            <TableHead>DATE</TableHead>
                            <TableHead>ACTION</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length ? (
                            data.map((row) => (
                                <TableRow key={row.id} data-state={rowSelection[row.id] ? "selected" : undefined}>
                                    <TableCell>
                                        <Checkbox
                                            checked={!!rowSelection[row.id]}
                                            onCheckedChange={(value) => toggleRow(row.id, !!value)}
                                        />
                                    </TableCell>
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.department}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className={`w-4 h-4 ${alertClass(row.alert)}`} />
                                            <span className={`text-sm ${alertClass(row.alert)}`}>{row.alert}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{row.date}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
};