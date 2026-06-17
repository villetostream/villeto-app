"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MoreHorizontal, RefreshCw, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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

// Previously hardcoded mock rows (real-looking employee names and
// departments) shipped directly in the bundle — indistinguishable
// from live data to anyone reading the rendered page, and a
// maintainability trap if this file is ever rendered before the
// real query is wired in. Replaced with an empty array; wire up
// the policy-alerts query here when the endpoint is ready.
const data: PolicyAlert[] = [];

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
                <Button variant="ghost" size="sm" aria-label="Refresh policy alerts">
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                </Button>
            </div>

            {data.length === 0 ? (
                <EmptyState
                    icon={<ShieldAlert className="w-5 h-5" aria-hidden="true" />}
                    title="No policy alerts"
                    description="Expense policy violations will show up here as they're flagged."
                />
            ) : (
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
                            {data.map((row) => (
                                <TableRow key={row.id} data-state={rowSelection[row.id] ? "selected" : undefined}>
                                    <TableCell>
                                        <Checkbox
                                            checked={!!rowSelection[row.id]}
                                            onCheckedChange={(value) => toggleRow(row.id, !!value)}
                                            aria-label={`Select alert for ${row.name}`}
                                        />
                                    </TableCell>
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.department}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className={`w-4 h-4 ${alertClass(row.alert)}`} aria-hidden="true" />
                                            <span className={`text-sm ${alertClass(row.alert)}`}>{row.alert}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{row.date}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="sm" aria-label={`Actions for ${row.name}`}>
                                            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    );
};