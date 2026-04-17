"use client"

import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CreditCard, Building2, UserCog, DollarSign } from "lucide-react";
import { AllUsersTab } from "@/components/dashboard/people/users/AllUsersTab";
import { RolesTab } from "@/components/dashboard/people/role/RoleTab";
import { DirectoryTab } from "@/components/dashboard/people/directory/DirectoryTab";
import { HugeiconsIcon } from "@hugeicons/react";
import { Upload04Icon } from "@hugeicons/core-free-icons";
import { useRouter, useSearchParams } from "next/navigation";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useGetAllUsersApi, useGetDirectoryUsersApi } from "@/actions/users/get-all-users";
import { useGetAllDepartmentsApi } from "@/actions/departments/get-all-departments";
import { useGetAllRolesApi } from "@/actions/role/get-all-roles";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { InviteEmployeesWarningModal } from "@/components/dashboard/people/modals/InviteEmployeesWarningModal";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";

function People() {
    const usersApi     = useGetAllUsersApi();
    const deptsApi     = useGetAllDepartmentsApi();
    const rolesApi     = useGetAllRolesApi();
    const directoryApi = useGetDirectoryUsersApi();

    const directoryTotalCount = directoryApi?.data?.meta?.totalCount ?? 0;
    const hasDirectoryData    = directoryTotalCount > 0;

    const uniqueDeptCount = useMemo(() => {
        const users: any[] = usersApi?.data?.data ?? [];
        const depts = new Set<string>();
        users.forEach((u) => {
            let deptName = "";
            if (!u.department) return;
            if (typeof u.department === "string") {
                deptName = u.department;
            } else if (typeof u.department === "object") {
                deptName = u.department.departmentName || u.department.name || "";
            }
            if (deptName) depts.add(deptName);
        });
        return depts.size;
    }, [usersApi?.data?.data]);

    const statCards = [
        { icon: Users,     label: "Total Users",   value: usersApi?.data?.meta?.totalCount || "0", description: "Total registered users",               bgColor: "#384A57" },
        { icon: CreditCard,label: "Active Cards",  value: "0",                                      description: "This month you spent extra $0.00",     bgColor: "#F45B69" },
        { icon: Building2, label: "Departments",   value: uniqueDeptCount,                          description: "View Departments",                      bgColor: "#5A67D8" },
        { icon: UserCog,   label: "Roles",         value: rolesApi?.data?.meta?.totalCount || "0",  description: "View Roles",                            bgColor: "#418341" },
        { icon: DollarSign,label: "Total Limits",  value: "$0.00",                                  description: "This month you spent extra $0.00",      bgColor: "#38B2AC" },
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

    // Register dynamic header CTA button
    const { setAction, clearAction } = useHeaderActionStore();

    // Register the correct header button per tab
    useEffect(() => {
        if (activeTab === "all-users") {
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
        } else if (activeTab === "roles") {
            setAction({
                label: "Create Role",
                onClick: () => router.push("/people/create-role"),
            });
        } else if (activeTab === "directory") {
            setAction({
                label: "Upload Directory",
                dataTourId: "upload-directory-button",
                iconName: "upload",
                onClick: () => {
                    sessionStorage.setItem("uploadDirReferrer", "directory");
                    router.push("/people/invite/employees?step=upload");
                },
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

        return () => clearAction();
    }, [activeTab, setAction, clearAction, router]);

    return (
        <div className="bg-dashboard-bg min-h-screen">
            <div className="p-6 space-y-6">

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-1.5">
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
                            icon={
                                <div className="p-2 mr-3 flex items-center justify-center rounded-full text-white shrink-0" style={{ backgroundColor: stat.bgColor }}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                            }
                            subtitle={
                                <span className="text-xs leading-[125%]">{stat.description}</span>
                            }
                        />
                    ))}
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <TabsList className="bg-muted/50 p-1 h-auto rounded-lg">
                            <PermissionGuard requiredPermissions={["read:users"]}>
                                <TabsTrigger
                                    value="all-users"
                                    className="data-[state=active]:bg-background rounded-md px-6"
                                >
                                    Invited Users
                                </TabsTrigger>
                            </PermissionGuard>
                            <PermissionGuard requiredPermissions={["read:roles"]}>
                                <TabsTrigger
                                    value="roles"
                                    className="data-[state=active]:bg-background rounded-md px-6"
                                >
                                    Roles
                                </TabsTrigger>
                            </PermissionGuard>
                            <PermissionGuard requiredPermissions={["read:users"]}>
                                <TabsTrigger
                                    value="directory"
                                    data-tour="directory-tab"
                                    className="data-[state=active]:bg-background rounded-md px-6"
                                >
                                    Directory
                                </TabsTrigger>
                            </PermissionGuard>
                        </TabsList>

                        <div id="tab-actions" className="flex items-center gap-2" />
                    </div>

                    <TabsContent value="all-users" className="mt-6">
                        <AllUsersTab />
                    </TabsContent>

                    <TabsContent value="roles" className="mt-6">
                        <RolesTab />
                    </TabsContent>

                    <TabsContent value="directory" className="mt-6">
                        <DirectoryTab />
                    </TabsContent>
                </Tabs>
            </div>

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
        </div>
    );
}

export default withPermissions(People, ["read:users", "read:roles", "read:departments"]);