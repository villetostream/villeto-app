"use client"

import { useState } from "react"
import { X, Edit2, ShieldCheck, CreditCard, Activity, Copy, Eye, EyeOff } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppUser } from "@/actions/departments/get-all-departments"
import { useGetAUsersApi } from "@/actions/users/get-a-user"
import { cn } from "@/lib/utils"

interface UserProfileModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
}

export function UserProfileModal({ isOpen, onClose, userId }: UserProfileModalProps) {
    const { data: userData, isLoading } = useGetAUsersApi(userId, { enabled: !!userId && isOpen })
    const user = userData?.data

    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent showCloseButton={false} className="sm:max-w-[700px] p-0 rounded-3xl overflow-hidden border-none">
                    <DialogTitle className="sr-only">Loading Profile</DialogTitle>
                    <div className="h-[500px] flex items-center justify-center bg-white">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent showCloseButton={false} className="sm:max-w-[700px] p-0 rounded-3xl overflow-hidden border-none bg-white">
                <div className="p-8 space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl font-semibold text-gray-800">{user?.firstName} {user?.lastName}</DialogTitle>
                            <DialogDescription className="text-gray-500 text-sm mt-1">View and manage employee details and permissions</DialogDescription>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={onClose}
                            className="rounded-full bg-slate-100 hover:bg-slate-200"
                        >
                            <X className="h-5 w-5 text-slate-600" />
                        </Button>
                    </div>

                    <div className="border-b border-slate-200" />

                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="bg-slate-100/50 p-1 w-full max-w-sm mx-auto rounded-xl mt-4">
                            <TabsTrigger value="overview" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-800 text-gray-500 font-medium transition-all">Overview</TabsTrigger>
                            <TabsTrigger value="activity" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-800 text-gray-500 font-medium transition-all">Activity</TabsTrigger>
                            <TabsTrigger value="card" className="flex-1 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-800 text-gray-500 font-medium transition-all">Card</TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="overview">
                                <OverviewTab user={user} />
                            </TabsContent>
                            <TabsContent value="activity" className="max-h-[45vh] overflow-y-auto pr-2">
                                <ActivityTab user={user} />
                            </TabsContent>
                            <TabsContent value="card">
                                <CardTab user={user} />
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Footer Actions */}
                    <div className="flex justify-center gap-4 pt-6 border-t border-slate-100">
                        <Button 
                            variant="destructive" 
                            className="bg-[#FC6A6A] hover:bg-red-600 rounded-xl px-8 h-12 font-medium border-0 shadow-none transition-all"
                        >
                            Deactivate User
                        </Button>
                        <Button 
                            className="bg-[#03C3A6] hover:bg-[#03C3A6]/90 text-white rounded-xl px-8 h-12 font-medium border-0 shadow-none transition-all"
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function OverviewTab({ user }: { user?: AppUser }) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 gap-y-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Role</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 text-primary">
                            <Edit2 className="h-3 w-3" />
                        </Button>
                    </div>
                    <p className="text-base font-medium text-gray-800 capitalize leading-tight">
                        {user?.position?.replace(/_/g, ' ').toLowerCase() || "Manager"}
                    </p>
                </div>
                <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase tracking-wider block text-right">Status</span>
                    <div className="flex justify-end">
                        <Badge variant="active" className="bg-emerald-50 text-emerald-600 border-none px-3 py-1 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#03C3A6]" />
                            <span className="text-xs font-medium">Active</span>
                        </Badge>
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Full name</span>
                    <p className="text-base font-medium text-slate-800">{user?.firstName} {user?.lastName}</p>
                </div>
                <div className="space-y-1 text-right">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Email address</span>
                    <p className="text-base font-medium text-gray-800">{user?.email}</p>
                </div>
                <div className="space-y-1">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Date invited</span>
                    <p className="text-base font-medium text-slate-800">2023-01-10</p>
                </div>
                <div className="space-y-1 text-right">
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Last login</span>
                    <p className="text-base font-medium text-slate-800">2023-01-10</p>
                </div>
            </div>

            <div className="p-6 bg-white border border-gray-100 rounded-2xl space-y-4 shadow-sm shadow-gray-200/50">
                <h3 className="text-base font-semibold text-gray-800">Permissions</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <span className="text-sm text-slate-600">Create/Edit Own Expenses</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        <span className="text-sm text-slate-600">View/Approve Team Expenses</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ActivityTab({ user }: { user?: AppUser }) {
    return (
        <div className="space-y-8">
            <div className="space-y-6">
                <h3 className="text-base font-semibold text-gray-800">Card Limit</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Monthly Limit</span>
                        <span className="text-slate-900 font-semibold">$5,000.00</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Current Spend</span>
                        <span className="text-slate-900 font-semibold">$1,250.00</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Usage</span>
                        <span className="text-primary font-semibold">25%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: '25%' }} />
                    </div>
                    <div className="border-b border-slate-100 pb-2" />
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Average Spend Monthly</span>
                        <span className="text-slate-900 font-semibold">$1,000.00</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-base font-semibold text-gray-800">Latest Transactions</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl">
                            <div>
                                <p className="font-medium text-slate-900">Netflix</p>
                                <p className="text-xs text-slate-400 mt-0.5">09-10-2025</p>
                            </div>
                            <span className="font-semibold text-slate-900">$15.00</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function CardTab({ user }: { user?: AppUser }) {
    const [showNumbers, setShowNumbers] = useState(false)
    
    return (
        <div className="space-y-8">
            <h3 className="text-base font-semibold text-slate-900">Card Information</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
                {/* Virtual Card */}
                <div className="relative aspect-[1.6/1] bg-gradient-to-br from-[#03C3A6] to-[#02b395] rounded-2xl p-6 text-white overflow-hidden shadow-xl shadow-[#03C3A6]/10">
                    {/* Decorative pattern */}
                    <svg className="absolute top-0 right-0 h-full w-full opacity-10 pointer-events-none" viewBox="0 0 100 100">
                        <circle cx="80" cy="20" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                        <circle cx="90" cy="30" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </svg>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-medium opacity-70 tracking-widest uppercase">Card Number</span>
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold tracking-widest font-mono">
                                    {showNumbers ? "1234 5678 9012 2345" : "**** **** **** 2345"}
                                </span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 p-0 hover:bg-white/10 text-white"
                                    onClick={() => {/* Copy logic */}}
                                >
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-white/10 text-white"
                            onClick={() => setShowNumbers(!showNumbers)}
                        >
                            {showNumbers ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 flex items-end gap-10 z-10">
                        <div className="space-y-1">
                            <span className="text-[10px] font-medium opacity-70 tracking-widest uppercase">Expiry Date</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold font-mono">13/10</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 p-0 hover:bg-white/10 text-white"
                                    onClick={() => {/* Copy logic */}}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-medium opacity-70 tracking-widest uppercase">CVV</span>
                            <div className="flex items-center gap-2">
                                <span className="font-bold font-mono">{showNumbers ? "272" : "***"}</span>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-5 w-5 p-0 hover:bg-white/10 text-white"
                                    onClick={() => {/* Copy logic */}}
                                >
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Billing Address */}
                <div className="flex flex-col justify-center space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold text-slate-800">Billing Address</h4>
                        <p className="text-slate-600 mt-2">No 15 New York city</p>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full flex items-center justify-center gap-2 border-slate-200 rounded-xl h-12 text-slate-600 font-medium bg-white hover:bg-slate-50 transition-colors"
                    >
                        <span>Copy Address</span>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
