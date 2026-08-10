"use client"

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, UserCog, UserCheck } from "lucide-react";
import { AllUsersTab } from "@/components/dashboard/people/users/AllUsersTab";
import { RolesTab } from "@/components/dashboard/people/role/RoleTab";
import { DirectoryTab } from "@/components/dashboard/people/directory/DirectoryTab";
import { useRouter, useSearchParams } from "next/navigation";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useGetAllUsersApi, useGetDirectoryUsersApi } from "@/queries/users/get-all-users";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { InviteEmployeesWarningModal } from "@/components/dashboard/people/modals/InviteEmployeesWarningModal";
import { AddEmployeeModal } from "@/components/dashboard/people/invite/AddEmployeeModal";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useAuthStore } from "@/stores/auth-stores";
import { asRecord, isRecord, pickString } from "@/lib/types/api-error";

function People() {
    const can = useAuthStore(s => s.can);
    const canReadUsers      = can('user', 'read') || can('user', 'manage');
    const canReadDepts      = can('department', 'read') || can('department', 'manage');
    const canReadRoles      = can('role', 'read') || can('role', 'manage');
    const canReadDirectory  = can('user', 'read') || can('user', 'manage');

    const usersApi     = useGetAllUsersApi({ enabled: canReadUsers });
    // useGetAllDepartmentsApi and useGetAllRolesApi are called here at page level
    // so their cache is warm before UserProfileModal opens (which gates them on isOpen).
    const deptsApi     = useGetAllDepartmentsApi({ enabled: canReadDepts });
    const rolesApi     = useGetAllRolesApi({ limit: 50 }, { enabled: canReadRoles });
    const directoryApi = useGetDirectoryUsersApi({ enabled: canReadDirectory });

    const directoryTotalCount = directoryApi?.data?.meta?.totalCount ?? 0;
    const hasDirectoryData    = directoryTotalCount > 0;

    const uniqueDeptCount = useMemo(() => {
        const users: unknown[] = usersApi?.data?.data ?? [];
        const depts = new Set<string>();
        users.forEach((rawUser) => {
            const u = asRecord(rawUser);
            let deptName = "";
            const department = u.department;
            if (!department) return;
            if (typeof department === "string") {
                deptName = department;
            } else if (isRecord(department)) {
                deptName = pickString(department, "departmentName", "name");
            }
            if (deptName) depts.add(deptName);
        });
        return depts.size;
    }, [usersApi?.data?.data]);

    const activeUserCount = useMemo(() => {
        const users: unknown[] = usersApi?.data?.data ?? [];
        return users.filter((rawUser) => {
            const u = rawUser as Record<string, unknown>;
            return (u.status as string)?.toLowerCase() === "active";
        }).length;
    }, [usersApi?.data?.data]);

    const statCards = [
        { icon: Users,     label: "Total Users",   value: usersApi?.data?.meta?.totalCount || "0", description: "Total registered users",   bgColor: "#384A57" },
        { icon: UserCheck, label: "Active Users",  value: activeUserCount,                          description: "Currently active members",  bgColor: "#0FA68E" },
        { icon: Building2, label: "Departments",   value: uniqueDeptCount,                          description: "View Departments",           bgColor: "#5A67D8" },
        { icon: UserCog,   label: "Roles",         value: rolesApi?.data?.meta?.totalCount || "0",  description: "View Roles",                 bgColor: "#418341" },
    ];

    const searchParams = useSearchParams();
    const router       = useRouter();

    const activeTab = searchParams.get("tab") || "all-users";
    const setActiveTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

    // Register dynamic header CTA button
    const { setAction, clearAction } = useHeaderActionStore();
    const canManageUsers = useAuthStore(s => s.can)('user', 'manage');
    const _canManageRoles = useAuthStore(s => s.can)('role', 'manage');

    // Register the correct header button per tab
    useEffect(() => {
        if (activeTab === "all-users") {
            if (canManageUsers) {
                setAction({
                    label: "Invite Users",
                    dataTourId: "invite-button",
                    items: [
                        {
                            label: "Invite Employees",
                            onClick: () => setIsInviteModalOpen(true),
                        },
                        {
                            label: "Invite Leadership & Admin",
                            onClick: () => router.push("/people/invite/leadership"),
                        },
                    ],
                });
            } else {
                clearAction();
            }
        } else if (activeTab === "roles") {
            setAction({
                label: "Create Role",
                onClick: () => router.push("/people/create-role"),
            });
        } else if (activeTab === "directory") {
            if (canManageUsers) {
                setAction({
                    label: "Add to Directory",
                    dataTourId: "upload-directory-button",
                    iconName: "plus",
                    items: [
                        {
                            label: "Add an Employee",
                            onClick: () => setIsAddEmployeeModalOpen(true),
                        },
                        {
                            label: "Upload CSV or XLSX",
                            onClick: () => {
                                sessionStorage.setItem("uploadDirReferrer", "directory");
                                router.push("/people/invite/employees?step=upload");
                            }
                        }
                    ],
                    secondaryAction: {
                        label: "Invite users",
                        iconName: "plus",
                        items: [
                            {
                                label: "Invite Employees",
                                onClick: () => setIsInviteModalOpen(true),
                            },
                            {
                                label: "Invite Leadership & Admin",
                                onClick: () => router.push("/people/invite/leadership"),
                            },
                        ],
                    }
                });
            } else {
                clearAction();
            }
        } else {
            clearAction();
        }

        return () => clearAction();
    }, [activeTab, setAction, clearAction, router, canManageUsers]);

    return (
        <div className="flex flex-col space-y-6 h-full pb-2">
            {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {statCards.map((stat) => (
                        <StatsCard
                            key={stat.label}
                            title={stat.label}
                            value={stat.value}
                            isLoading={
                                stat.label === "Total Users"  ? usersApi.isLoading :
                                stat.label === "Departments"  ? usersApi.isLoading :
                                stat.label === "Roles"        ? rolesApi.isLoading : false
                            }
                            accentColor={stat.bgColor}
                            icon={<stat.icon className="w-4 h-4" style={{ color: stat.bgColor }} />}
                            subtitle={
                                <span className="text-[11px] text-[#68726d]">{stat.description}</span>
                            }
                        />
                    ))}
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                        <TabsList className="bg-[#f5f7f6] p-1 h-10 rounded-[10px] inline-flex border border-black/[0.05]">
                                <PermissionGuard resource="user" action="manage">
                                    <TabsTrigger
                                        value="all-users"
                                        className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full"
                                    >
                                        Invited Users
                                    </TabsTrigger>
                                </PermissionGuard>
                                <PermissionGuard resource="role" action="manage">
                                    <TabsTrigger
                                        value="roles"
                                        className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full"
                                    >
                                        Roles
                                    </TabsTrigger>
                                </PermissionGuard>
                                <PermissionGuard permissions={[
                                    { resource: "user", action: "manage" },
                                    { resource: "user", action: "read_company" }
                                ]}>
                                    <TabsTrigger
                                        value="directory"
                                        data-tour="directory-tab"
                                        className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full"
                                    >
                                        Directory
                                    </TabsTrigger>
                                </PermissionGuard>
                            </TabsList>
    
                            <div id="tab-actions" className="flex items-center gap-2" />
                        </div>
    
                        <TabsContent value="all-users" className="mt-6 flex-1 min-h-0 flex flex-col">
                            <AllUsersTab />
                        </TabsContent>
    
                        <TabsContent value="roles" className="mt-6 flex-1 min-h-0 flex flex-col">
                            <RolesTab />
                        </TabsContent>
    
                        <TabsContent value="directory" className="mt-6 flex-1 min-h-0 flex flex-col">
                            <DirectoryTab />
                        </TabsContent>
                    </Tabs>
    
                <InviteEmployeesWarningModal
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    onInviteLeaders={() => {
                        setIsInviteModalOpen(false);
                        router.push("/people/invite/leadership");
                    }}
                    onContinue={() => {
                        setIsInviteModalOpen(false);
                        router.push(
                            hasDirectoryData
                                ? "/people/invite/employees"
                                : "/people/invite/employees?step=upload"
                        );
                    }}
                />

                <AddEmployeeModal 
                    isOpen={isAddEmployeeModalOpen} 
                    onClose={() => setIsAddEmployeeModalOpen(false)} 
                />
            </div>
        );
    }
    
    export default withPermissions(People, [
        { resource: "user", action: "manage" },
        { resource: "user", action: "read" },
        { resource: "user", action: "read_company" },
        { resource: "role", action: "manage" },
        { resource: "department", action: "manage" }
    ]);