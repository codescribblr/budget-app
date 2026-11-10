const pending = new Set<symbol>();
export function registerUnsavedChanges() {
  const id = Symbol('unsaved'); pending.add(id);
  return () => { pending.delete(id); };
}
export function hasUnsavedChanges() { return pending.size > 0; }
