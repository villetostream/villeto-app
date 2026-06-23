"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
    X, ShieldCheck, Copy, Eye, EyeOff,
    ChevronDown, Check, Loader2, Pencil,
    Building2, Briefcase, User2, Lock, Search
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useGetAUsersApi } from "@/queries/users/get-a-user"
import { useUpdateUserApi } from "@/queries/users/update-user"
import { useGetAllRolesApi, Role, CapabilityGroup } from "@/queries/role/get-all-roles"
import { useGetAllDepartmentsApi, Department } from "@/queries/departments/get-all-departments"
import { toast } from "sonner"

// ─── Extended types matching GET /users/{id} response ─────────────────────────

interface Permission {
    permissionId: string
    name: string
    description: string
    resource: string
    action: string
}

interface RichCompanyRole {
    roleId: string
    name: string
    description?: string
    permissions: Permission[]
    capabilityGroups?: CapabilityGroup[]
}

interface RichUser {
    userId: string
    firstName: string
    lastName: string
    email: string
    employeeExternalId?: string
    loginCount?: number
    status?: string
    jobTitle?: string | null
    position?: string | null
    departmentId?: string | null
    managerId?: string | null
    createdAt?: string
    companyRole?: RichCompanyRole
    department?: Department | string | null
    manager?: { firstName?: string; lastName?: string } | null
}

// ─── Edit state ───────────────────────────────────────────────────────────────

interface EditState {
    roleId: string
    jobTitle: string
    departmentId: string
}

function getInitialEditState(user: RichUser): EditState {
    return {
        roleId: user.companyRole?.roleId ?? "",
        jobTitle: user.jobTitle ?? "",
        departmentId: user.departmentId ?? "",
    }
}

function statesMatch(a: EditState, b: EditState): boolean {
    return a.roleId === b.roleId && a.jobTitle === b.jobTitle && a.departmentId === b.departmentId
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string | null): string {
    if (!iso) return "—"
    try {
        return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch { return iso }
}

function capitalize(str?: string | null): string {
    if (!str) return "—"
    return str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function getDeptName(dept: RichUser["department"]): string {
    if (!dept) return "—"
    if (typeof dept === "string") return dept || "—"
    return dept.departmentName || "—"
}

// ─── Shared Micro-interactions ────────────────────────────────────────────────

function CopyButton({ text, className, successClass = "text-emerald-500" }: { text: string; className?: string; successClass?: string }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = () => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button onClick={handleCopy} className={`hover:opacity-70 transition-opacity flex items-center justify-center ${className || ""}`}>
            {copied ? <Check className={`w-3.5 h-3.5 ${successClass}`} /> : <Copy className="w-3.5 h-3.5" />}
        </button>
    )
}

// ─── Inline Dropdown (shared by Role + Department pickers) ────────────────────

interface DropdownOption { id: string; label: string; sublabel?: string }

function InlineDropdown({
    value,
    options,
    placeholder,
    onChange,
}: {
    value: string
    options: DropdownOption[]
    placeholder?: string
    onChange: (id: string) => void
}) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const [activeIndex, setActiveIndex] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    
    const selected = options.find(o => o.id === value)

    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options
        const q = search.toLowerCase()
        return options.filter(o => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q))
    }, [options, search])

    useEffect(() => {
        if (open) {
            setSearch("")
            setActiveIndex(-1)
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }, [open])

    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const activeEl = listRef.current.children[activeIndex] as HTMLElement
            if (activeEl) {
                activeEl.scrollIntoView({ block: "nearest" })
            }
        }
    }, [activeIndex])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev))
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
                onChange(filteredOptions[activeIndex].id)
                setOpen(false)
            }
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 h-9 px-3 rounded-lg border border-border bg-white text-sm font-medium text-foreground hover:border-primary/50 focus:outline-none focus:border-primary transition-colors"
                >
                    <span className={selected ? "text-foreground" : "text-muted-foreground"}>
                        {selected?.label ?? placeholder ?? "Select…"}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
            </PopoverTrigger>

            <PopoverContent 
                className="p-0 rounded-xl overflow-hidden flex flex-col shadow-xl" 
                style={{ width: "var(--radix-popover-trigger-width)" }}
                align="start"
            >
                <div className="p-2 border-b border-border/50 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setActiveIndex(0) }}
                            onKeyDown={handleKeyDown}
                            className="w-full h-8 pl-8 pr-3 rounded-md bg-muted/30 border-0 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
                        />
                    </div>
                </div>
                <div 
                    ref={listRef} 
                    className="max-h-48 overflow-y-auto py-1 outline-none overscroll-contain" 
                    tabIndex={-1}
                    onWheel={e => e.stopPropagation()}
                    onTouchMove={e => e.stopPropagation()}
                >
                    {filteredOptions.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">No results found</p>
                    ) : (
                        filteredOptions.map((opt, i) => {
                            const isSel = opt.id === value
                            const isHighlighted = i === activeIndex
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onMouseEnter={() => setActiveIndex(i)}
                                    onClick={() => { onChange(opt.id); setOpen(false) }}
                                    className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-muted/40 ${isSel ? "bg-primary/5" : ""} ${isHighlighted ? "bg-muted/40" : ""}`}
                                >
                                    <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSel ? "border-primary bg-primary" : "border-border"}`}>
                                        {isSel && <Check className="w-2.5 h-2.5 text-white" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-medium leading-tight ${isSel ? "text-primary" : "text-foreground"}`}>
                                            {opt.label}
                                        </p>
                                        {opt.sublabel && (
                                            <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">
                                                {opt.sublabel}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

// ─── Field cell — used in both view and edit mode ─────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
            {children}
        </p>
    )
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-sm font-semibold text-foreground leading-snug truncate">
            {children}
        </p>
    )
}

function Row({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-2 gap-x-6 py-4 border-b border-border/50 last:border-0">
            {children}
        </div>
    )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
    user,
    isEditing,
    editState,
    setEditState,
    roles,
    departments,
    onToggleStatus,
    isToggling,
}: {
    user: RichUser
    isEditing: boolean
    editState: EditState
    setEditState: (s: EditState) => void
    roles: Role[]
    departments: Department[]
    onToggleStatus: () => void
    isToggling: boolean
}) {
    const isActive = (user.status ?? "").toLowerCase() === "active"
    const capabilityGroups: CapabilityGroup[] = useMemo(
        () => user.companyRole?.capabilityGroups ?? [],
        [user.companyRole]
    )

    const [confirmOpen, setConfirmOpen] = useState(false)

    const managerName = useMemo(() => {
        const m = user.manager
        if (!m) return "—"
        return `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "—"
    }, [user.manager])

    const roleOptions: DropdownOption[] = roles.map(r => ({
        id: r.roleId,
        label: r.name,
        sublabel: r.description,
    }))

    const deptOptions: DropdownOption[] = departments.map(d => ({
        id: d.departmentId,
        label: d.departmentName,
    }))

    const currentDeptName = useMemo(() => {
        if (editState.departmentId) {
            return departments.find(d => d.departmentId === editState.departmentId)?.departmentName
                ?? getDeptName(user.department)
        }
        return getDeptName(user.department)
    }, [editState.departmentId, departments, user.department])

    const currentRoleName = useMemo(() => {
        if (editState.roleId) {
            return roles.find(r => r.roleId === editState.roleId)?.name
                ?? user.companyRole?.name
                ?? "—"
        }
        return user.companyRole?.name ?? "—"
    }, [editState.roleId, roles, user.companyRole])

    return (
        <div className="space-y-5">
            {/* ── Edit mode notice banner ── */}
            {isEditing && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                    <Pencil className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-xs text-primary font-medium">
                        Editing mode — only highlighted fields can be changed
                    </p>
                </div>
            )}

            {/* ── 2-column grid with row borders: identity ── */}
            <div className="flex flex-col">

                <Row>
                    {/* Full Name — always read-only */}
                    <div>
                        <FieldLabel>Full Name</FieldLabel>
                        <ReadOnlyValue>{user.firstName} {user.lastName}</ReadOnlyValue>
                        {isEditing && <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Read-only</p>}
                    </div>

                    {/* Email — always read-only */}
                    <div>
                        <FieldLabel>Email Address</FieldLabel>
                        <ReadOnlyValue>{user.email}</ReadOnlyValue>
                        {isEditing && <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Read-only</p>}
                    </div>
                </Row>

                <Row>
                    {/* Employee ID — always read-only */}
                    <div>
                        <FieldLabel>Employee ID</FieldLabel>
                        <ReadOnlyValue>{user.employeeExternalId ?? "—"}</ReadOnlyValue>
                        {isEditing && <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Read-only</p>}
                    </div>

                    {/* Status — always read-only */}
                    <div>
                        <FieldLabel>Status</FieldLabel>
                        <Badge
                            variant={isActive ? "active" : "inactive"}
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 w-fit border-0 ${isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-500"}`}
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-red-400"}`} />
                            {isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                </Row>

                <Row>
                    {/* Department — editable */}
                    <div>
                        <FieldLabel>
                            <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> Department
                                {isEditing && <span className="text-primary normal-case font-medium tracking-normal ml-1">• editable</span>}
                            </span>
                        </FieldLabel>
                        {isEditing ? (
                            <InlineDropdown
                                value={editState.departmentId}
                                options={deptOptions}
                                placeholder="Select department"
                                onChange={(id) => setEditState({ ...editState, departmentId: id })}
                            />
                        ) : (
                            <ReadOnlyValue>{currentDeptName}</ReadOnlyValue>
                        )}
                    </div>

                    {/* Manager — read-only */}
                    <div>
                        <FieldLabel><span className="flex items-center gap-1"><User2 className="w-3 h-3" /> Manager</span></FieldLabel>
                        <ReadOnlyValue>{managerName}</ReadOnlyValue>
                        {isEditing && <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Read-only</p>}
                    </div>
                </Row>

                <Row>
                    {/* Role — editable */}
                    <div>
                        <FieldLabel>
                            <span className="flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Company Role
                                {isEditing && <span className="text-primary normal-case font-medium tracking-normal ml-1">• editable</span>}
                            </span>
                        </FieldLabel>
                        {isEditing ? (
                            <InlineDropdown
                                value={editState.roleId}
                                options={roleOptions}
                                placeholder="Select role"
                                onChange={(id) => setEditState({ ...editState, roleId: id })}
                            />
                        ) : (
                            <ReadOnlyValue>{currentRoleName}</ReadOnlyValue>
                        )}
                    </div>

                    {/* Job Title — editable */}
                    <div>
                        <FieldLabel>
                            <span className="flex items-center gap-1">
                                <Briefcase className="w-3 h-3" /> Job Title
                                {isEditing && <span className="text-primary normal-case font-medium tracking-normal ml-1">• editable</span>}
                            </span>
                        </FieldLabel>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editState.jobTitle}
                                onChange={e => setEditState({ ...editState, jobTitle: e.target.value })}
                                placeholder="e.g. Frontend Engineer"
                                className="w-full h-9 px-3 rounded-lg border border-border bg-white text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                            />
                        ) : (
                            <ReadOnlyValue>{editState.jobTitle || "—"}</ReadOnlyValue>
                        )}
                    </div>
                </Row>

                <Row>
                    {/* Position — read-only */}
                    <div>
                        <FieldLabel>Position</FieldLabel>
                        <ReadOnlyValue>{capitalize(user.position)}</ReadOnlyValue>
                        {isEditing && <p className="text-[10px] text-muted-foreground/60 mt-1 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> Read-only</p>}
                    </div>

                    {/* Member since — read-only */}
                    <div>
                        <FieldLabel>Member Since</FieldLabel>
                        <ReadOnlyValue>{formatDate(user.createdAt)}</ReadOnlyValue>
                    </div>
                </Row>

                <Row>
                    {/* Login count — read-only */}
                    <div>
                        <FieldLabel>Login Count</FieldLabel>
                        <ReadOnlyValue>{user.loginCount ?? 0} sessions</ReadOnlyValue>
                    </div>
                    <div></div>
                </Row>
            </div>

            {/* ── Capability groups — full width ── */}
            {capabilityGroups.length > 0 && (
                <div className="border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                Capability Groups
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Via <span className="font-medium text-foreground">{user.companyRole?.name}</span>
                            </p>
                        </div>
                        <Badge className="text-[10px] bg-primary/10 text-primary border-0 font-semibold">
                            {capabilityGroups.length} groups
                        </Badge>
                    </div>
                    <div className="divide-y divide-border/50">
                        {capabilityGroups.map(group => (
                            <div key={group.capabilityGroupId} className="px-4 py-3 flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground leading-tight">{group.name}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{group.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Danger Zone ── */}
            <div className="mt-8 border border-red-200 bg-red-50/50 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-red-600">Danger Zone</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                    {isActive 
                        ? "Deactivating this user will immediately revoke their access to Villeto. They will no longer be able to log in or take any actions." 
                        : "Activating this user will restore their access to Villeto. They will be able to log in and resume activity."}
                </p>
                <Button 
                    variant={isActive ? "destructive" : "default"} 
                    size="sm"
                    onClick={() => setConfirmOpen(true)}
                    disabled={isToggling}
                >
                    {isToggling ? "Processing..." : (isActive ? "Deactivate User" : "Activate User")}
                </Button>
            </div>

            <ConfirmDialog 
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={isActive ? "Deactivate User?" : "Activate User?"}
                description={isActive 
                    ? `Are you sure you want to deactivate ${user.firstName} ${user.lastName}? They will lose access to Villeto immediately.`
                    : `Are you sure you want to activate ${user.firstName} ${user.lastName}? They will regain access to Villeto.`}
                confirmText={isActive ? "Yes, Deactivate" : "Yes, Activate"}
                variant={isActive ? "destructive" : "default"}
                onConfirm={() => {
                    setConfirmOpen(false)
                    onToggleStatus()
                }}
            />
        </div>
    )
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab() {
    return (
        <div className="space-y-5">
            <div>
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Card Limit</h3>
                <div className="space-y-2.5">
                    {[
                        { label: "Monthly Limit", value: "$5,000.00" },
                        { label: "Current Spend", value: "$1,250.00" },
                        { label: "Usage", value: "25%" },
                    ].map(item => (
                        <div key={item.label} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <span className="font-semibold text-foreground">{item.value}</span>
                        </div>
                    ))}
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-primary rounded-full" style={{ width: "25%" }} />
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Latest Transactions</h3>
                <div className="space-y-2">
                    {[
                        { name: "Netflix", date: "09-10-2025", amount: "$15.00" },
                        { name: "AWS", date: "09-09-2025", amount: "$120.00" },
                        { name: "Figma", date: "09-08-2025", amount: "$45.00" },
                    ].map((tx, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-muted/20 border border-border/50 rounded-xl">
                            <div>
                                <p className="text-sm font-semibold text-foreground">{tx.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{tx.date}</p>
                            </div>
                            <span className="text-sm font-semibold text-foreground">{tx.amount}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Card Tab ─────────────────────────────────────────────────────────────────

function CardTab() {
    const [showNumbers, setShowNumbers] = useState(false)

    return (
        <div className="space-y-5">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Card Information</h3>

            <div className="relative aspect-[1.75/1] bg-gradient-to-br from-primary to-primary/70 rounded-2xl p-5 text-white overflow-hidden shadow-lg">
                <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 200 120">
                    <circle cx="160" cy="20" r="80" fill="none" stroke="white" strokeWidth="0.5" />
                    <circle cx="180" cy="60" r="60" fill="none" stroke="white" strokeWidth="0.5" />
                </svg>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest opacity-70 font-medium">Card Number</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-base font-bold tracking-widest font-mono">
                                {showNumbers ? "1234 5678 9012 2345" : "**** **** **** 2345"}
                            </span>
                            <CopyButton text="1234567890122345" successClass="text-white" />
                        </div>
                    </div>
                    <button onClick={() => setShowNumbers(p => !p)} className="hover:opacity-70 transition-opacity">
                        {showNumbers ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
                <div className="absolute bottom-5 left-5 flex gap-10 z-10">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest opacity-70">Expiry</p>
                        <p className="font-bold font-mono mt-0.5">13/10</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-widest opacity-70">CVV</p>
                        <p className="font-bold font-mono mt-0.5">{showNumbers ? "272" : "***"}</p>
                    </div>
                </div>
            </div>

            <div className="p-4 border border-border rounded-xl">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billing Address</h4>
                <p className="text-sm text-foreground font-medium">No 15, New York City</p>
                <CopyButton text="No 15, New York City" className="mt-3 text-sm font-medium text-primary gap-1.5" />
            </div>
        </div>
    )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface UserProfileModalProps {
    isOpen: boolean
    onClose: () => void
    userId: string
}

export function UserProfileModal({ isOpen, onClose, userId }: UserProfileModalProps) {
    const { data: userData, isLoading } = useGetAUsersApi(userId, { enabled: !!userId && isOpen })
    const user = userData?.data as RichUser | undefined

    const rolesQuery = useGetAllRolesApi({ limit: 50 }, { enabled: isOpen })
    const deptsQuery = useGetAllDepartmentsApi({ enabled: isOpen })
    const updateUser = useUpdateUserApi()

    const roles: Role[] = rolesQuery.data?.data ?? []
    const departments: Department[] = deptsQuery.data?.data ?? []

    const originalState = useMemo<EditState | null>(() => {
        if (!user) return null
        return getInitialEditState(user)
    }, [user])

    const [editState, setEditState] = useState<EditState>({ roleId: "", jobTitle: "", departmentId: "" })
    const [isEditing, setIsEditing] = useState(false)

    // Sync once user data lands
    useEffect(() => {
        if (originalState) setEditState(originalState)
    }, [originalState])

    const isDirty = useMemo(() => {
        if (!originalState) return false
        return !statesMatch(originalState, editState)
    }, [originalState, editState])

    const handleCancelEdit = () => {
        if (originalState) setEditState(originalState)
        setIsEditing(false)
    }

    const handleSave = async () => {
        if (!user || !isDirty) return
        const payload: Record<string, string> = { id: user.userId }
        if (editState.roleId !== originalState?.roleId) payload.roleId = editState.roleId
        if (editState.jobTitle !== originalState?.jobTitle) payload.jobTitle = editState.jobTitle
        if (editState.departmentId !== originalState?.departmentId) payload.departmentId = editState.departmentId

        try {
            await updateUser.mutateAsync(payload as Parameters<typeof updateUser.mutateAsync>[0])
            toast.success("User updated successfully")
            setIsEditing(false)
        } catch {
            toast.error("Failed to update user. Please try again.")
        }
    }

    const handleToggleStatus = async () => {
        if (!user) return
        const newStatus = (user.status ?? "").toLowerCase() === "active" ? "inactive" : "active"
        try {
            await updateUser.mutateAsync({ 
                id: user.userId, 
                status: newStatus 
            } as any)
            toast.success(`User successfully ${newStatus === "active" ? "activated" : "deactivated"}`)
        } catch {
            toast.error("Failed to change user status. Please try again.")
        }
    }

    // ── Loading state (Skeleton Loader) ──
    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent showCloseButton={false} className="sm:max-w-[580px] p-0 rounded-2xl border-none bg-white">
                    <DialogTitle className="sr-only">Loading Profile</DialogTitle>
                    {/* Header skeleton */}
                    <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                <div className="h-3 w-48 bg-muted rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-24 h-8 rounded-lg bg-muted animate-pulse" />
                            <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
                        </div>
                    </div>
                    {/* Body skeleton */}
                    <div className="px-6 pt-3 pb-5">
                        <div className="h-8 w-full max-w-sm bg-muted rounded-lg animate-pulse mb-6" />
                        <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="space-y-2 py-2">
                                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    if (!user) return null

    const isActive = (user.status ?? "").toLowerCase() === "active"
    const fullName = `${user.firstName} ${user.lastName}`.trim()

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { handleCancelEdit(); onClose() } }}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-[580px] p-0 rounded-2xl border-none bg-white flex flex-col max-h-[88vh]"
            >
                {/* ── Header ── */}
                <div className="px-6 pt-5 pb-4 border-b border-border shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-bold text-primary">
                                    {(user.firstName?.[0] ?? "").toUpperCase()}
                                    {(user.lastName?.[0] ?? "").toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <DialogTitle className="text-sm font-semibold text-foreground leading-tight">
                                    {fullName}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {user.email}
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Edit / Cancel controls in header */}
                        <div className="flex items-center gap-2 shrink-0">
                            {!isEditing ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsEditing(true)}
                                    className="h-8 rounded-lg text-xs font-medium gap-1.5 border-border hover:border-primary/50 hover:text-primary transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                                >
                                    <Pencil className="w-3 h-3" /> Edit Details
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleCancelEdit}
                                    className="h-8 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { handleCancelEdit(); onClose() }}
                                className="h-8 w-8 rounded-lg hover:bg-muted/60"
                            >
                                <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <Tabs defaultValue="overview" className="flex flex-col flex-1 overflow-hidden">
                    <div className="px-6 pt-3 shrink-0">
                        <TabsList className="bg-muted p-1 rounded-lg w-full">
                            <TabsTrigger value="overview" className="flex-1 text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-foreground text-muted-foreground data-[state=active]:shadow-sm transition-all">
                                Overview
                            </TabsTrigger>
                            <TabsTrigger value="activity" className="flex-1 text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-foreground text-muted-foreground data-[state=active]:shadow-sm transition-all">
                                Activity
                            </TabsTrigger>
                            <TabsTrigger value="card" className="flex-1 text-xs font-medium rounded-md data-[state=active]:bg-white data-[state=active]:text-foreground text-muted-foreground data-[state=active]:shadow-sm transition-all">
                                Card
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 pt-5 pb-3">
                        <TabsContent value="overview" className="mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <OverviewTab
                                user={user}
                                isEditing={isEditing}
                                editState={editState}
                                setEditState={setEditState}
                                roles={roles}
                                departments={departments}
                                onToggleStatus={handleToggleStatus}
                                isToggling={updateUser.isPending}
                            />
                        </TabsContent>
                        <TabsContent value="activity" className="mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <ActivityTab />
                        </TabsContent>
                        <TabsContent value="card" className="mt-0 focus-visible:ring-0 focus-visible:outline-none">
                            <CardTab />
                        </TabsContent>
                    </div>

                    {/* ── Footer ── */}
                    {isEditing && (
                        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-end gap-3 bg-muted/10">
                            <Button
                                variant="ghost"
                                size="md"
                                onClick={handleCancelEdit}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="md"
                                disabled={!isDirty || updateUser.isPending}
                                onClick={handleSave}
                                className="px-6 transition-opacity"
                            >
                                {updateUser.isPending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
                                ) : (
                                    "Save Changes"
                                )}
                            </Button>
                        </div>
                    )}
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}
