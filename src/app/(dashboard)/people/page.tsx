"use client"

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, UserCog, UserCheck } from "lucide-react";
import { AllUsersTab } from "@/components/dashboard/people/users/AllUsersTab";
import { RolesTab } from "@/components/dashboard/people/role/RoleTab";
import { DirectoryTab } from "@/components/dashboard/people/directory/DirectoryTab";
import { useRouter, useSearchParams } from "next/navigation";
import PermissionGuard from "@/components/permissions/permission-protected-components";
import withPermissions from "@/components/permissions/permission-protected-routes";
import { useGetDirectoryUsersApi, useGetInvitedUsersApi } from "@/queries/users/get-all-users";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { StatsCard } from "@/components/dashboard/landing/StatCard";
import { InviteEmployeesWarningModal } from "@/components/dashboard/people/modals/InviteEmployeesWarningModal";
import { AddEmployeeModal } from "@/components/dashboard/people/invite/AddEmployeeModal";
import { useHeaderActionStore } from "@/stores/useHeaderActionStore";
import { useAuthorizationPolicies } from "@/features/auth/use-authorization-policies";
import { EntityAssignmentsTab } from "@/components/dashboard/people/legal-entities/EntityAssignmentsTab";
import { asRecord, isRecord, pickString } from "@/lib/types/api-error";

function People() {
    const policies = useAuthorizationPolicies();
    const { canManageUsers, canViewRoles, canViewUsers: canReadDirectory, canManageRoles } = policies.people;
    const { canViewAssignments, canManageAssignments } = policies.legalEntities;

    const totalInvitedUsersApi = useGetInvitedUsersApi({ enabled: canManageUsers, params: { limit: 1 } });
    const activeInvitedUsersApi = useGetInvitedUsersApi({ enabled: canManageUsers, params: { limit: 1, status: "Active" } });
    
    const rolesApi     = useGetAllRolesApi({ limit: 50 }, { enabled: canViewRoles });
    const directoryApi = useGetDirectoryUsersApi({ enabled: canReadDirectory, params: { status: "all" } });

    const directoryTotalCount = directoryApi?.data?.meta?.totalCount ?? 0;
    const hasDirectoryData    = directoryTotalCount > 0;

    const statCards = [
        ...(canManageUsers ? [
            { icon: Users, label: "Total Users", value: totalInvitedUsersApi?.data?.meta?.totalCount || "0", description: "Total registered users", bgColor: "#384A57" },
            { icon: UserCheck, label: "Active Users", value: activeInvitedUsersApi?.data?.meta?.totalCount || "0", description: "Currently active members", bgColor: "#0FA68E" },
        ] : []),
        ...(canViewRoles ? [{ icon: UserCog, label: "Roles", value: rolesApi?.data?.meta?.totalCount || "0", description: "View Roles", bgColor: "#418341" }] : []),
    ];

    const searchParams = useSearchParams();
    const router       = useRouter();

    const requestedTab = searchParams.get("tab");
    const fallbackTab = canManageUsers
        ? "all-users"
        : canReadDirectory
            ? "directory"
            : canViewAssignments
                ? "entity-assignments"
                : "roles";
            
    const activeTab =
        (requestedTab === "all-users" && canManageUsers) ||
        (requestedTab === "directory" && canReadDirectory) ||
        (requestedTab === "entity-assignments" && canViewAssignments) ||
        (requestedTab === "roles" && canViewRoles)
            ? requestedTab
            : fallbackTab;
            
    const setActiveTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", tab);
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isAddEmployeeModalOpen, setIsAddEmployeeModalOpen] = useState(false);

    // Register dynamic header CTA button
    const { setAction, clearAction } = useHeaderActionStore();

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
            if (canManageRoles) {
                setAction({
                    label: "Create Role",
                    onClick: () => router.push("/people/create-role"),
                });
            } else {
                clearAction();
            }
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
    }, [activeTab, setAction, clearAction, router, canManageRoles, canManageUsers]);

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
                                stat.label === "Total Users"  ? totalInvitedUsersApi.isLoading :
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
                                <PermissionGuard anyOf={["user.manage"]}>
                                    <TabsTrigger
                                        value="all-users"
                                        className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full"
                                    >
                                        Invited Users
                                    </TabsTrigger>
                                </PermissionGuard>
                                <PermissionGuard anyOf={["role.manage"]}>
                                    <TabsTrigger
                                        value="roles"
                                        className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full"
                                    >
                                        Roles
                                    </TabsTrigger>
                                </PermissionGuard>
                                <PermissionGuard anyOf={["user.directory.read", "user.manage"]}>
                                    <TabsTrigger
                                        value="directory"
                                        data-tour="directory-tab"
                                        className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full"
                                    >
                                        Directory
                                    </TabsTrigger>
                                </PermissionGuard>
                                <PermissionGuard anyOf={["legal_entity.assignment.view", "legal_entity.assignment.manage"]}>
                                    <TabsTrigger
                                        value="entity-assignments"
                                        className="data-[state=active]:bg-white data-[state=active]:text-[#0b100e] data-[state=active]:shadow-sm text-[#68726d] rounded-[6px] px-5 text-[13px] font-semibold h-full gap-2"
                                    >
                                        <Building2 className="h-4 w-4" />
                                        Entity Assignments
                                    </TabsTrigger>
                                </PermissionGuard>
                            </TabsList>
    
                            <div id="tab-actions" className="flex items-center gap-2" />
                        </div>
    
                        {canManageUsers && (
                            <TabsContent value="all-users" className="mt-2 flex-1 min-h-0 flex flex-col">
                                <AllUsersTab />
                            </TabsContent>
                        )}
    
                        {canViewRoles && (
                            <TabsContent value="roles" className="mt-2 flex-1 min-h-0 flex flex-col">
                                <RolesTab />
                            </TabsContent>
                        )}
    
                        {canReadDirectory && (
                            <TabsContent value="directory" className="mt-2 flex-1 min-h-0 flex flex-col">
                                <DirectoryTab />
                            </TabsContent>
                        )}

                        {canViewAssignments && (
                            <TabsContent value="entity-assignments" className="mt-2 flex-1 min-h-0 flex flex-col">
                                <EntityAssignmentsTab canManage={canManageAssignments} />
                            </TabsContent>
                        )}
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
        { resource: "user.directory", action: "read" },
        { resource: "user", action: "manage" },
        { resource: "role", action: "manage" },
        { resource: "legal_entity.assignment", action: "view" },
        { resource: "legal_entity.assignment", action: "manage" },
    ]);
