import type {
  CapabilityGroup,
  CapabilityScopeType,
  RoleCapabilityInput,
  SelectedRoleCapability,
} from "@/queries/role/get-all-roles";

export function capabilitiesFromRole(
  selected: SelectedRoleCapability[] | undefined,
  catalog: CapabilityGroup[],
): RoleCapabilityInput[] {
  if (!selected?.length) return [];

  const catalogByKey = new Map(catalog.map((group) => [group.key, group]));
  return selected
    .filter((capability) => !catalogByKey.get(capability.key)?.isBaseCapability)
    .map((capability) => compactCapability(capability));
}

export function compactCapability(
  capability: RoleCapabilityInput,
): RoleCapabilityInput {
  const departmentIds = capability.scopeConfig?.departmentIds?.filter(Boolean);
  const legalEntityIds = capability.scopeConfig?.legalEntityIds?.filter(Boolean);
  const scopeConfig = {
    ...(capability.scopeType === "department" && departmentIds?.length
      ? { departmentIds: [...new Set(departmentIds)].sort() }
      : {}),
    ...(legalEntityIds?.length
      ? { legalEntityIds: [...new Set(legalEntityIds)].sort() }
      : {}),
  };

  return {
    key: capability.key,
    scopeType: capability.scopeType,
    ...(Object.keys(scopeConfig).length ? { scopeConfig } : {}),
  };
}

export function normalizeCapabilities(
  capabilities: RoleCapabilityInput[],
): RoleCapabilityInput[] {
  return capabilities
    .map(compactCapability)
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function capabilitiesEqual(
  left: RoleCapabilityInput[],
  right: RoleCapabilityInput[],
): boolean {
  return JSON.stringify(normalizeCapabilities(left)) === JSON.stringify(normalizeCapabilities(right));
}

export function selectCapability(
  capabilities: RoleCapabilityInput[],
  group: CapabilityGroup,
): RoleCapabilityInput[] {
  if (group.isBaseCapability || capabilities.some((item) => item.key === group.key)) {
    return capabilities;
  }
  return [...capabilities, { key: group.key, scopeType: group.defaultScope || "company" }];
}

export function removeCapability(
  capabilities: RoleCapabilityInput[],
  key: string,
): RoleCapabilityInput[] {
  return capabilities.filter((item) => item.key !== key);
}

export function changeCapabilityScope(
  capabilities: RoleCapabilityInput[],
  key: string,
  scopeType: CapabilityScopeType,
): RoleCapabilityInput[] {
  return capabilities.map((item) =>
    item.key === key
      ? compactCapability({ ...item, scopeType })
      : item,
  );
}

export function toggleScopeResource(
  capabilities: RoleCapabilityInput[],
  key: string,
  resource: "departmentIds" | "legalEntityIds",
  id: string,
): RoleCapabilityInput[] {
  return capabilities.map((item) => {
    if (item.key !== key) return item;
    const current = item.scopeConfig?.[resource] ?? [];
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];
    const nextConfig = { ...item.scopeConfig, [resource]: next };
    return compactCapability({ ...item, scopeConfig: nextConfig });
  });
}

export function newlySelectedSensitiveCapabilities(
  initial: RoleCapabilityInput[],
  current: RoleCapabilityInput[],
  catalog: CapabilityGroup[],
): string[] {
  const initialKeys = new Set(initial.map((item) => item.key));
  const catalogByKey = new Map(catalog.map((group) => [group.key, group]));
  return current
    .filter(
      (item) =>
        !initialKeys.has(item.key) && catalogByKey.get(item.key)?.riskLevel === "sensitive",
    )
    .map((item) => item.key)
    .sort();
}
