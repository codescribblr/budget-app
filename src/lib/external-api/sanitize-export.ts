/** Strip internal-only data from exports served via the external API. */
export function stripExternalApiExportData<T extends { ai_conversations?: unknown }>(
  data: T
): Omit<T, 'ai_conversations'> {
  const { ai_conversations: _removed, ...rest } = data;
  return rest;
}
