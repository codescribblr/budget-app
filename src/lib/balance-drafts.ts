import { parseMoney } from "./new-look";
export interface BalanceDraft { value: string; originalValue: number; revision: string; }
export function editBalance(previous: BalanceDraft | undefined, value: string, originalValue: number, revision?: string): BalanceDraft {
  // A remote refresh must never silently rebase a draft onto a newer revision.
  return previous ? { ...previous, value } : { value, originalValue, revision: revision || "" };
}
export function balanceChanged(draft?: BalanceDraft) {
  return !!draft && parseMoney(draft.value) !== draft.originalValue;
}
export function balanceConflict(draft: BalanceDraft | undefined, revision?: string) {
  return !!draft && draft.revision !== revision;
}
