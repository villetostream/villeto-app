"use client"

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-stores";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    Users,
    AlertTriangle,
    Target,
    Download,
    RefreshCw
} from "lucide-react";

const monthlySpendData: Array<{ month: string; amount: number; transactions: number; budget: number }> = [];
const departmentSpendData: Array<{ name: string; amount: number; percentage: number; color: string }> = [];
const expenseCategories: Array<{ category: string; amount: number; trend: number; transactions: number }> = [];
const topSpenders: Array<{ name: string; department: string; amount: number; transactions: number; avatar: string }> = [];
const complianceData: Array<{ metric: string; value: number; change: number; status: string }> = [];
const budgetUtilization: Array<{ department: string; budget: number; spent: number; remaining: number; utilization: number }> = [];

export default function Insights() {
    const [selectedPeriod, setSelectedPeriod] = useState("6months");
    const [selectedDepartment, setSelectedDepartment] = useState("all");
    const [selectedTab, setSelectedTab] = useState("overview");
    const getCurrencySymbol = useAuthStore((state) => state.getCurrencySymbol);
    const currencySymbol = getCurrencySymbol();

    const getTrendIcon = (trend: number) => {
        return trend > 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
        );
    };

    const getTrendColor = (trend: number) => {
        return trend > 0 ? "text-green-600" : "text-red-600";
    };

    return (
        <>
            <div className="flex-1 space-y-6 p-8 pt-6">
                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currencySymbol}0</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                No data available
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{currencySymbol}0</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                No data available
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                No data available
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">0%</div>
                            <div className="flex items-center text-xs text-muted-foreground">
                                No data available
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="spend-analysis">Spend Analysis</TabsTrigger>
                        <TabsTrigger value="budgets">Budgets</TabsTrigger>
                        <TabsTrigger value="compliance">Compliance</TabsTrigger>
                        <TabsTrigger value="trends">Trends</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Monthly Spend Trend</CardTitle>
                                    <CardDescription>Spend vs budget over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {monthlySpendData.length === 0 ? (
                                        <p className="text-muted-foreground text-sm text-center py-16">No data available</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <AreaChart data={monthlySpendData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" />
                                                <YAxis />
                                                <Tooltip formatter={(value) => [`${currencySymbol}${(value as number).toLocaleString()}`, 'Amount']} />
                                                <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                                                <Area type="monotone" dataKey="budget" stroke="#82ca9d" fill="transparent" strokeDasharray="5 5" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Department Distribution</CardTitle>
                                    <CardDescription>Spend by department</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {departmentSpendData.length === 0 ? (
                                        <p className="text-muted-foreground text-sm text-center py-16">No data available</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={departmentSpendData}
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="amount"
                                                    label={({ name, percentage }: any) => `${name} ${percentage}%`}
                                                >
                                                    {departmentSpendData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${currencySymbol}${(value as number).toLocaleString()}`, 'Amount']} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Expense Categories</CardTitle>
                                    <CardDescription>Highest spending categories with trends</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {expenseCategories.length === 0 ? (
                                        <p className="text-muted-foreground text-sm text-center py-8">No data available</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {expenseCategories.map((category, index) => (
                                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                                    <div>
                                                        <h4 className="font-medium">{category.category}</h4>
                                                        <p className="text-sm text-muted-foreground">{category.transactions} transactions</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold">{currencySymbol}{category.amount.toLocaleString()}</p>
                                                        <div className={`flex items-center text-sm ${getTrendColor(category.trend)}`}>
                                                            {getTrendIcon(category.trend)}
                                                            <span className="ml-1">{Math.abs(category.trend)}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Top Spenders</CardTitle>
                                    <CardDescription>Users with highest expenses</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {topSpenders.length === 0 ? (
                                        <p className="text-muted-foreground text-sm text-center py-8">No data available</p>
                                    ) : (
                                        <div className="space-y-4">
                                            {topSpenders.map((spender, index) => (
                                                <div key={index} className="flex items-center space-x-4">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                                                            <span className="text-sm font-medium">{spender.name.charAt(0)}</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{spender.name}</p>
                                                            <p className="text-sm text-muted-foreground">{spender.department}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-semibold">{currencySymbol}{spender.amount.toLocaleString()}</p>
                                                        <p className="text-sm text-muted-foreground">{spender.transactions} transactions</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="spend-analysis" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Detailed Spend Analysis</CardTitle>
                                <CardDescription>Transaction volume and amount trends</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {monthlySpendData.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-16">No data available</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={monthlySpendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis yAxisId="left" />
                                            <YAxis yAxisId="right" orientation="right" />
                                            <Tooltip />
                                            <Bar yAxisId="left" dataKey="amount" fill="#8884d8" name={`Amount (${currencySymbol})`} />
                                            <Bar yAxisId="right" dataKey="transactions" fill="#82ca9d" name="Transactions" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="budgets" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Budget Utilization by Department</CardTitle>
                                <CardDescription>Track spending against allocated budgets</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {budgetUtilization.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-8">No budget data available</p>
                                ) : (
                                    <div className="space-y-6">
                                        {budgetUtilization.map((dept, index) => (
                                            <div key={index} className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-medium">{dept.department}</span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {currencySymbol}{dept.spent.toLocaleString()} / {currencySymbol}{dept.budget.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${dept.utilization > 90 ? 'bg-red-500' :
                                                            dept.utilization > 75 ? 'bg-yellow-500' : 'bg-green-500'
                                                            }`}
                                                        style={{ width: `${dept.utilization}%` }}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between text-sm text-muted-foreground">
                                                    <span>{dept.utilization}% utilized</span>
                                                    <span>{currencySymbol}{dept.remaining.toLocaleString()} remaining</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="compliance" className="space-y-4">
                        {complianceData.length === 0 ? (
                            <Card>
                                <CardContent className="p-6">
                                    <p className="text-muted-foreground text-sm text-center py-8">No compliance data available</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    {complianceData.map((metric, index) => (
                                        <Card key={index}>
                                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                                <CardTitle className="text-sm font-medium">{metric.metric}</CardTitle>
                                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{metric.value}</div>
                                                <div className={`flex items-center text-xs ${metric.status === 'improved' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {metric.status === 'improved' ? (
                                                        <TrendingDown className="w-3 h-3 mr-1" />
                                                    ) : (
                                                        <TrendingUp className="w-3 h-3 mr-1" />
                                                    )}
                                                    {Math.abs(metric.change)}% vs last period
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Compliance Details</CardTitle>
                                        <CardDescription>Detailed breakdown of policy compliance</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground text-sm text-center py-8">No compliance details available</p>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="trends" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Spending Trends Analysis</CardTitle>
                                <CardDescription>Historical patterns and forecasting</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {monthlySpendData.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-16">No data available</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={monthlySpendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={3} />
                                            <Line type="monotone" dataKey="budget" stroke="#82ca9d" strokeDasharray="5 5" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </>
    );
}