import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";
import { useGetAllRolesApi } from "@/queries/role/get-all-roles";
import { useGetJobGradesApi, useGetManagementLevelsApi } from "@/queries/companies/get-company-references";
import { useGetAllUsersApi } from "@/queries/users/get-all-users";

export function useExceptionFormatter() {
  const { data: deptsData } = useGetAllDepartmentsApi();
  const { data: rolesData } = useGetAllRolesApi({ limit: 100 });
  const { data: jobGradesData } = useGetJobGradesApi();
  const { data: mgmtLevelsData } = useGetManagementLevelsApi();
  const { data: usersData } = useGetAllUsersApi({ params: { limit: 100 } });

  // Departments response: { data: Department[] }
  // Try both deptsData.data (array) or deptsData.data.data (nested) depending on API shape
  const deptsList: any[] = (Array.isArray(deptsData?.data) ? deptsData?.data : (deptsData?.data as any)?.data) || [];
  const rolesList: any[] = rolesData?.data || [];
  const jobGradesList: any[] = jobGradesData?.data?.jobGrades || [];
  const mgmtLevelsList: any[] = mgmtLevelsData?.data?.managementLevels || [];
  const usersList: any[] = usersData?.data || [];

  const formatExceptionSummary = (config: any) => {
    if (!config) return "";

    const parts: string[] = [];

    if (config.departmentIds?.length > 0) {
      const names = config.departmentIds.map((id: string) => {
        const dept = deptsList.find((d: any) => d.departmentId === id);
        return dept?.name || dept?.departmentName || id;
      });
      parts.push(`Departments: ${names.join(", ")}`);
    }

    if (config.roleIds?.length > 0) {
      const names = config.roleIds.map((id: string) => {
        const role = rolesList.find((r: any) => r.id === id || r.roleId === id);
        return role?.name || id;
      });
      parts.push(`Roles: ${names.join(", ")}`);
    }

    if (config.jobGradeIds?.length > 0) {
      const names = config.jobGradeIds.map((id: string) => {
        const jg = jobGradesList.find((j: any) => j.jobGradeId === id);
        return jg?.name || jg?.code || id;
      });
      parts.push(`Job Grades: ${names.join(", ")}`);
    }

    if (config.managementLevelIds?.length > 0) {
      const names = config.managementLevelIds.map((id: string) => {
        const ml = mgmtLevelsList.find((m: any) => m.managementLevelId === id);
        return ml?.name || ml?.code || id;
      });
      parts.push(`Management Levels: ${names.join(", ")}`);
    }

    if (config.userIds?.length > 0) {
      const names = config.userIds.map((id: string) => {
        const u = usersList.find((u: any) => u.userId === id);
        return u ? `${u.firstName} ${u.lastName}` : id;
      });
      parts.push(`Users: ${names.join(", ")}`);
    }

    if (parts.length === 0) return "";

    return parts.join(" | ");
  };

  return { formatExceptionSummary };
}
