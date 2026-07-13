const ACTION_LABELS: Record<string, string> = {
  receive_appointment: "Receive appointment (scheduling & admitted visits)",
  receive_patient: "Receive patient (workflow inbox & forwards)",
};

/** Human-readable label for a permission action in the admin UI. */
export function formatPermissionAction(action: string): string {
  const key = action.toLowerCase();
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  return key.replace(/_/g, " ");
}
