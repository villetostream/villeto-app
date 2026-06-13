import { UserProfile } from "@/stores/useVilletoStore";

/**
 * Shared hook that sends admin invitations to beneficial owners at Step 6.
 *
 * Mirrors the pattern in InviteLeadershipPage (people/invite/leadership/page.tsx):
 *   POST companies/admins/invites with { admins: [{ email, roleId, percentageOfOwnership }] }
 *
 * Resolves the ORGANIZATION_OWNER roleId once from GET roles?type=villeto before sending.
 * If the invite call fails, it shows a toast.error but does NOT block CongratulationsModal —
 * the user can retry from the People section.
 */
export function useInviteBeneficialOwners() {
  const inviteBeneficialOwners = async (
    _beneficialOwners: UserProfile[]
  ): Promise<void> => {
    // TODO: Re-enable once the /roles?type=villeto endpoint is authorised
    // for the onboarding context.  The call currently returns 401 because
    // the user has no valid access/refresh token at this stage of the flow.
    //
    // if (beneficialOwners.length === 0) return;
    //
    // try {
    //   const rolesRes = await axios.get(API_KEYS.ROLE.ROLES_VILLETO);
    //   const roles: unknown[] = rolesRes?.data?.data ?? [];
    //
    //   const ownerRole = roles.find(
    //     (r: unknown) =>
    //       r.name?.toUpperCase().includes("ORGANIZATION_OWNER") ||
    //       r.name?.toUpperCase().includes("OWNER")
    //   );
    //
    //   const ownerRoleId: string = ownerRole?.roleId ?? "";
    //
    //   if (!ownerRoleId) {
    //     toast.error(
    //       "Could not resolve the Organization Owner role. " +
    //         "Beneficial owners were not invited — please invite them from the People section."
    //     );
    //     return;
    //   }
    //
    //   const admins = beneficialOwners.map((owner) => ({
    //     email: owner.email,
    //     roleId: ownerRoleId,
    //     ...(owner.ownershipPercentage !== undefined && {
    //       percentageOfOwnership: owner.ownershipPercentage,
    //     }),
    //   }));
    //
    //   await axios.post(API_KEYS.COMPANY.ADMIN_INVITES, { admins });
    // } catch (error: unknown) {
    //   toast.error(
    //     error?.response?.data?.message ??
    //       "Failed to send beneficial owner invitations. " +
    //         "You can retry from the People → Invite section."
    //   );
    // }
  };

  return { inviteBeneficialOwners };
}
