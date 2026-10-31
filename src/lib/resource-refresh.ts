export const resourceFamilies = [
  "balances",
  "envelopes",
  "transactions",
  "imports",
  "planning",
  "settings",
] as const;
export type ResourceFamily = (typeof resourceFamilies)[number];
export class ResourceRefreshStore {
  private scope = "";
  private epoch = 0;
  private versions = new Map<ResourceFamily, number>();
  private tokens: Record<string, string> = {};
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  snapshot = (resources: readonly ResourceFamily[]) =>
    this.epoch + resources.reduce((n, r) => n + (this.versions.get(r) ?? 0), 0);
  setScope(scope: string) {
    if (this.scope === scope) return;
    this.scope = scope;
    this.epoch++;
    this.tokens = {};
    this.listeners.forEach((listener) => listener());
  }
  invalidate(resources: readonly ResourceFamily[] = resourceFamilies) {
    for (const resource of new Set(resources))
      this.versions.set(resource, (this.versions.get(resource) ?? 0) + 1);
    this.listeners.forEach((listener) => listener());
  }
  reconcile(tokens: Record<string, string>) {
    const changed = resourceFamilies.filter(
      (r) => tokens[r] !== this.tokens[r],
    );
    this.tokens = tokens;
    if (changed.length) this.invalidate(changed);
    return changed;
  }
}
export const resourceRefresh = new ResourceRefreshStore();
export function resourcesForSignal(resource: string): ResourceFamily[] {
  if (resource === "accounts" || resource === "credit_cards")
    return ["balances"];
  return resourceFamilies.includes(resource as ResourceFamily)
    ? [resource as ResourceFamily]
    : [...resourceFamilies];
}
export function resourcesForMutation(url: string): ResourceFamily[] {
  if (/transactions|tags|merchant/.test(url))
    return ["transactions", "envelopes", "balances", "planning"];
  if (/import|queue/.test(url))
    return ["imports", "transactions", "envelopes", "balances", "planning"];
  if (/categor|allocation|transfer|buffer/.test(url))
    return ["envelopes", "balances", "planning"];
  if (/accounts|credit-cards|pending-checks/.test(url))
    return ["balances", "planning"];
  if (/income|goal|loan|asset/.test(url))
    return ["planning", "balances", "envelopes"];
  return ["settings"];
}
