export interface RecurringEntityOption {
  legalEntityId: string;
  isDefault: boolean;
}

export function resolveRecurringEntityId(
  options: RecurringEntityOption[],
  context: {
    profileEntityId?: string;
    workspaceEnabled: boolean;
    workspaceSelection: string | null;
    primaryAssignmentId: string | null;
    legacyChoiceId: string;
  },
): string {
  if (context.profileEntityId) return context.profileEntityId;
  const eligible = (id: string | null) =>
    id && options.some((entity) => entity.legalEntityId === id) ? id : "";

  if (context.workspaceEnabled) return eligible(context.workspaceSelection);

  return (
    eligible(context.legacyChoiceId) ||
    eligible(context.primaryAssignmentId) ||
    options.find((entity) => entity.isDefault)?.legalEntityId ||
    (options.length === 1 ? options[0].legalEntityId : "")
  );
}
