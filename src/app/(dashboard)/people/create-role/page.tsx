"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2, Plus, ShieldAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { roleSchema } from "@/lib/schemas/schemas";
import type { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { useCreateRoleApi } from "@/queries/role/create-role";
import { useUpdateRoleApi } from "@/queries/role/update-role";
import { useUpdateRoleCapabilitiesApi } from "@/queries/role/update-role-capabilities";
import { useGetAllRoleCapabilitiesApi } from "@/queries/role/get-role-capabilities";
import { useGetARoleApi } from "@/queries/role/get-a-role";
import type { CapabilityGroup, Role, RoleCapabilityInput } from "@/queries/role/get-all-roles";
import { useGetAllDepartmentsApi } from "@/queries/departments/get-all-departments";

import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/shared/lib/query/keys";
import { useAuthStore } from "@/stores/auth-stores";
import { logger } from "@/lib/logger";
import { getApiErrorMessage } from "@/lib/types/api-error";

import withPermissions from "@/components/permissions/permission-protected-routes";
import SuccessModal from "@/components/modals/SuccessModal";
import { RoleCapabilityEditor } from "@/components/dashboard/people/role/RoleCapabilityEditor";
import {
  capabilitiesEqual,
  capabilitiesFromRole,
  normalizeCapabilities,
} from "@/features/auth/role-capability-form";

function RoleEditorForm({
  roleId,
  role,
  catalog,
}: {
  roleId: string | null;
  role?: Role;
  catalog: CapabilityGroup[];
}) {
  const router = useRouter();
  const isEditMode = Boolean(roleId);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isCurrentUserOwner = (user?.companyRole?.templateKey || (user as any)?.villetoRole?.templateKey) === "owner";
  
  const { data: departmentsData } = useGetAllDepartmentsApi();
  
  const departments = useMemo(() => departmentsData?.data || [], [departmentsData]);

  const [initialCapabilities] = useState<RoleCapabilityInput[]>(() =>
    capabilitiesFromRole(role?.selectedCapabilities, catalog),
  );
  
  const [capabilities, setCapabilities] = useState<RoleCapabilityInput[]>(initialCapabilities);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const createRole = useCreateRoleApi();
  const updateRole = useUpdateRoleApi();
  const updateCapabilities = useUpdateRoleCapabilitiesApi();

  const {
    register,
    formState: { errors, isDirty },
    getValues,
    reset,
    control,
  } = useForm<z.input<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
      isActive: role?.isActive === true || role?.isActive === "Active",
    },
  });

  const formValues = useWatch({ control });

  const capabilitiesChanged = !capabilitiesEqual(capabilities, initialCapabilities);
  const hasChanges = !isEditMode || isDirty || capabilitiesChanged;
  
  const isSaving = createRole.isPending || updateRole.isPending || updateCapabilities.isPending;

  // Unsaved changes guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasChanges) {
            e.preventDefault();
            e.returnValue = "";
        }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  const handleCancel = () => {
    if (hasChanges && !window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        return;
    }
    const returnPath = sessionStorage.getItem("rolesReturnPath");
    sessionStorage.removeItem("rolesReturnPath");
    router.push(returnPath || "/people?tab=roles");
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.roles });
    if (roleId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.people.role(roleId) });
    }
    
    if (!isEditMode) {
        reset({});
        handleCancel();
    }
  };

  const handleSubmit = async () => {
    const data = getValues();

    try {
      if (roleId) {
        if (isDirty) {
          await updateRole.mutateAsync({ id: roleId, data });
        }
        if (capabilitiesChanged) {
          await updateCapabilities.mutateAsync({
            roleId,
            capabilities: normalizeCapabilities(capabilities),
          });
        }
      } else {
        await createRole.mutateAsync({
          name: data.name.trim(),
          description: data.description?.trim() || undefined,
          capabilities: normalizeCapabilities(capabilities),
        });
      }
      
      reset(getValues());
      setShowSuccessModal(true);
    } catch (error: unknown) {
      logger.error("Error saving role", error);
      toast.error(getApiErrorMessage(error, "The role could not be saved. Please try again."));
    }
  };

  const isTargetOwner = role?.templateKey === "owner";
  const blockedFromEditing = isTargetOwner && !isCurrentUserOwner;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-[300px_1fr]">
        <aside className="sticky top-6 h-fit space-y-8">
          <h1 className="text-[24px] font-bold text-[#0b100e]">Roles and Permissions</h1>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-[14px] border border-[#0ea894]/25 bg-[#e7f6f2]/30 hover:bg-[#e7f6f2]/50 transition-colors p-4 text-[#087f70]"
          >
            <div className="flex items-center gap-3">
              <Plus className="size-5" />
              <span className="text-[15px] font-semibold">{isEditMode ? "Edit Role" : "Add New Role"}</span>
            </div>
            <ChevronRight className="size-5" />
          </button>
          <div className="bg-white rounded-[16px] border border-black/[0.06] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <h3 className="text-[13px] font-bold text-[#0b100e] mb-2">How access works</h3>
            <p className="text-[12.5px] text-[#68726d] leading-relaxed">
              Each capability describes what someone can do (e.g. view invoices, approve purchases). The scope controls whose data they can see — just their own, their team&apos;s, or the entire company.
            </p>
          </div>
        </aside>

        <main className="max-w-3xl space-y-8">
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
            <h2 className="text-[20px] font-bold text-[#0b100e]">Describe {isEditMode ? "" : "New "}Role</h2>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px] font-semibold text-[#0b100e]">Role Name<span className="text-red-500">*</span></Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g. Procurement Manager"
                className="h-[46px] rounded-[10px] border-black/[0.1] text-[13px] focus-visible:ring-[#0ea894]"
              />
              {errors.name && <p className="text-[12px] text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[13px] font-semibold">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe who should receive this role"
                className="min-h-[96px] resize-none rounded-[10px] border-black/[0.1] text-[13px] focus-visible:ring-[#0ea894]"
              />
              {errors.description && <p className="text-[12px] text-red-500">{errors.description.message}</p>}
            </div>
            {isEditMode && (
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/[0.08] bg-white p-4">
                <Checkbox
                  checked={formValues.isActive}
                  onCheckedChange={(checked) => reset({ ...getValues(), isActive: checked === true })}
                />
                <span>
                  <span className="block text-[13px] font-semibold text-[#303834]">
                    Role Status: {formValues.isActive ? "Enabled" : "Disabled"}
                  </span>
                  <span className="block text-[11px] text-[#66706b]">Turn off to disable this role. Disabled roles will stop granting access and cannot be assigned to new people.</span>
                </span>
              </label>
            )}
          </form>

          <section className="space-y-4">
            <div>
              <h2 className="text-[20px] font-bold text-[#0b100e]">Choose what this role can do</h2>
            </div>
            <RoleCapabilityEditor
              catalog={catalog}
              value={capabilities}
              onChange={(next) => {
                setCapabilities(next);
              }}
              departments={departments}
              isEditDisabled={blockedFromEditing}
            />
          </section>

          <div className="sticky bottom-0 pb-6 pt-4 mt-8 bg-[#f4f7f5] border-t border-black/[0.08] flex justify-end gap-4 z-20 after:absolute after:top-full after:left-0 after:right-0 after:h-[100px] after:bg-[#f4f7f5]">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving} className="px-8 h-[46px] rounded-[10px]">Cancel</Button>
            
            {blockedFromEditing ? (
              <div className="flex items-center gap-3">
                  <span className="text-sm text-red-500 font-medium">Only Owners can modify this role</span>
                  <Button type="button" disabled className="px-12 h-[46px] rounded-[10px] bg-[#0ea894] text-white opacity-50">
                      Update role
                  </Button>
              </div>
            ) : (
              <Button
                type="button"
                className="px-12 h-[46px] rounded-[10px] text-[13px] font-semibold bg-[#0ea894] hover:bg-[#0c9785] text-white shadow-[0_8px_20px_-10px_rgba(14,168,148,0.7)] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                disabled={isSaving || !hasChanges}
                onClick={handleSubmit}
              >
                {isSaving ? "Saving…" : isEditMode ? "Update role" : "Create role"}
              </Button>
            )}
          </div>
        </main>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        title={`Role ${isEditMode ? "Updated" : "Created"} Successfully`}
        description={getValues().name}
      />
    </div>
  );
}

function CreateRolePage() {
  const searchParams = useSearchParams();
  const roleId = searchParams.get("id");
  const isEditMode = Boolean(roleId);
  const capabilityCatalog = useGetAllRoleCapabilitiesApi(true);
  const roleQuery = useGetARoleApi(roleId ?? "", { enabled: isEditMode });

  if (capabilityCatalog.isLoading || (isEditMode && roleQuery.isLoading)) {
    return (
      <div className="p-6">
        <h1 className="text-[24px] font-bold text-[#0b100e] mb-8">Roles and Permissions</h1>
        <div className="flex items-center justify-center py-32 text-[#84908a] gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0ea894]" />
            <span className="text-[13px] font-medium">Loading role configuration...</span>
        </div>
      </div>
    );
  }

  if (capabilityCatalog.isError || (isEditMode && (roleQuery.isError || !roleQuery.data?.data))) {
    return (
      <div className="p-12">
        <Alert variant="destructive" className="mx-auto max-w-xl">
          <ShieldAlert className="size-4" />
          <AlertTitle>Role configuration unavailable</AlertTitle>
          <AlertDescription>Refresh the page or try again after the role service is available.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <RoleEditorForm
      key={roleId ?? "new-role"}
      roleId={roleId}
      role={roleQuery.data?.data}
      catalog={capabilityCatalog.data ?? []}
    />
  );
}

export default withPermissions(CreateRolePage, [{ resource: "role", action: "manage" }]);
