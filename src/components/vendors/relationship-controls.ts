export type RelationshipControls = {
  purchasingEnabled: boolean;
  invoicingEnabled: boolean;
  paymentEnabled: boolean;
  paymentTermsCode: string;
  paymentTermsDays: number | null;
  taxCountryCode: string;
  taxRegistrationNumber: string;
};

type StoredControls = {
  [K in keyof RelationshipControls]?: RelationshipControls[K] | null;
};

export function controlsDraft(values: StoredControls | null): RelationshipControls {
  return {
    purchasingEnabled: !!values?.purchasingEnabled,
    invoicingEnabled: !!values?.invoicingEnabled,
    paymentEnabled: !!values?.paymentEnabled,
    paymentTermsCode: values?.paymentTermsCode || "",
    paymentTermsDays: values?.paymentTermsDays ?? null,
    taxCountryCode: values?.taxCountryCode || "",
    taxRegistrationNumber: values?.taxRegistrationNumber || "",
  };
}

export function changedRelationshipControls(original: StoredControls | null, draft: RelationshipControls) {
  const before = controlsDraft(original);
  return Object.fromEntries(
    (Object.keys(draft) as (keyof RelationshipControls)[])
      .filter((key) => before[key] !== draft[key])
      .map((key) => [key, typeof draft[key] === "string" ? draft[key].trim() || null : draft[key]]),
  );
}
