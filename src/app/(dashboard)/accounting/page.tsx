import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Settings,
    Plus,
    Download,
    FileText,
    Calculator,
    TrendingUp,
    BarChart3,
    PieChart,
    Calendar
} from "lucide-react";

const accountingData = {
    monthlyTotals: [] as Array<{ month: string; income: number; expenses: number; profit: number }>,
    categories: [] as Array<{ name: string; amount: number; percentage: number }>
};

export default function Accounting() {
    return (
        <div className="min-h-screen bg-dashboard-bg">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-dashboard-text-primary">Accounting</h1>
                        <p className="text-dashboard-text-secondary mt-1">
                            Financial reporting and accounting integration
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Integrations
                        </Button>
                        <Button className="bg-dashboard-accent hover:bg-dashboard-accent/90">
                            <Download className="w-4 h-4 mr-2" />
                            Export Data
                        </Button>
                    </div>
                </div>

                {/* Financial Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-dashboard-text-secondary text-sm">Monthly Revenue</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">—</p>
                                    <p className="text-xs text-dashboard-text-secondary">No data available</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-status-success" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-dashboard-text-secondary text-sm">Total Expenses</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">—</p>
                                    <p className="text-xs text-dashboard-text-secondary">No data available</p>
                                </div>
                                <BarChart3 className="w-8 h-8 text-dashboard-accent" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-dashboard-text-secondary text-sm">Net Profit</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">—</p>
                                    <p className="text-xs text-dashboard-text-secondary">No data available</p>
                                </div>
                                <Calculator className="w-8 h-8 text-status-success" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-dashboard-text-secondary text-sm">Profit Margin</p>
                                    <p className="text-2xl font-bold text-dashboard-text-primary">—</p>
                                    <p className="text-xs text-dashboard-text-secondary">No data available</p>
                                </div>
                                <PieChart className="w-8 h-8 text-dashboard-text-secondary" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Monthly Trends */}
                <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary">Monthly Financial Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {accountingData.monthlyTotals.length === 0 ? (
                            <p className="text-dashboard-text-secondary text-sm text-center py-8">No monthly data available</p>
                        ) : (
                            <div className="space-y-4">
                                {accountingData.monthlyTotals.map((month) => (
                                    <div key={month.month} className="p-4 bg-dashboard-hover rounded-lg">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-medium text-dashboard-text-primary">{month.month}</h3>
                                            <div className="flex gap-6 text-sm">
                                                <span className="text-status-success">
                                                    Revenue: ${month.income.toLocaleString()}
                                                </span>
                                                <span className="text-dashboard-accent">
                                                    Expenses: ${month.expenses.toLocaleString()}
                                                </span>
                                                <span className="text-dashboard-text-primary font-medium">
                                                    Profit: ${month.profit.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <Progress
                                            value={(month.profit / month.income) * 100}
                                            className="h-2"
                                        />
                                        <p className="text-xs text-dashboard-text-secondary mt-1">
                                            Profit margin: {((month.profit / month.income) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Expense Categories */}
                <Card className="bg-dashboard-card border-dashboard-border">
                    <CardHeader>
                        <CardTitle className="text-dashboard-text-primary">Expense Breakdown by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {accountingData.categories.length === 0 ? (
                            <p className="text-dashboard-text-secondary text-sm text-center py-8">No category data available</p>
                        ) : (
                            <div className="space-y-4">
                                {accountingData.categories.map((category) => (
                                    <div key={category.name} className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-dashboard-text-primary">
                                                    {category.name}
                                                </span>
                                                <span className="text-sm text-dashboard-text-secondary">
                                                    ${category.amount.toLocaleString()} ({category.percentage}%)
                                                </span>
                                            </div>
                                            <Progress value={category.percentage} className="h-2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Reports & Integrations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-dashboard-text-primary">Financial Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <Button variant="outline" className="w-full justify-start">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Profit &amp; Loss Statement
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                    Expense Report
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Tax Summary
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Monthly Statements
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-dashboard-card border-dashboard-border">
                        <CardHeader>
                            <CardTitle className="text-dashboard-text-primary">Integrations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <p className="text-dashboard-text-secondary text-sm text-center py-4">No integrations connected</p>
                                <Button variant="outline" size="sm" className="w-full">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Integration
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>

    );
}