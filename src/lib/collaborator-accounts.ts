export function isAccountAvailable(
  profileId: string,
  collaborators: readonly { id: string; profile_id: string | null }[],
  editingId?: string,
) {
  return !collaborators.some((row) => row.profile_id === profileId && row.id !== editingId);
}

export function validateExistingAccountId(profileId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileId)) {
    throw new Error("Selecione uma conta de acesso existente.");
  }
  return profileId;
}