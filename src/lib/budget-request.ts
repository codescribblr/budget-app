export class BudgetRequestError extends Error {
  constructor(message: string, public status: number, public code?: string, public latest?: unknown) { super(message); }
}
export async function budgetRequest<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(url, body === undefined ? { cache: "no-store" } : {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new BudgetRequestError(data?.error || `Request failed (${response.status}). Please try again.`, response.status, data?.code, data?.latest);
  return data as T;
}
