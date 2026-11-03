import { describe, it, expect } from "vitest";
import {
  archiveBlock,
  deleteBlock,
  envelopeHousekeepingSchema,
  goalHousekeepingSchema,
  type ManagedEnvelope,
} from "../housekeeping";
const row = (patch: Partial<ManagedEnvelope> = {}): ManagedEnvelope => ({
  id: 1,
  name: "Trip",
  revision: crypto.randomUUID(),
  monthly_amount: 100,
  current_balance: 0,
  sort_order: 0,
  is_system: false,
  created_at: "",
  updated_at: "",
  usage: [],
  linkedGoals: [],
  spending: 0,
  ...patch,
});
const meta = () => ({ expectedBudgetId: 27, operationId: crypto.randomUUID() });
describe("housekeeping decisions", () => {
  it("allows empty ordinary envelopes to be archived and preserves historical envelopes", () => {
    expect(archiveBlock(row())).toBeNull();
    expect(
      archiveBlock(row({ usage: [{ kind: "transaction_splits", count: 2 }] })),
    ).toBeNull();
    expect(
      deleteBlock(row({ usage: [{ kind: "transaction_splits", count: 2 }] })),
    ).toContain("history");
    expect(deleteBlock(row())).toBeNull();
  });
  it("blocks reserved money, shortfalls, system records and linked goals", () => {
    for (const patch of [
      { current_balance: 1 },
      { current_balance: -1 },
      { is_system: true },
      { is_buffer: true },
      { is_goal: true },
      { linkedGoals: [{ id: 2, name: "Car" }] },
    ])
      expect(archiveBlock(row(patch))).toBeTruthy();
  });
  it("does not block restoring an archived balance, but prevents deleting it", () => {
    expect(
      archiveBlock(row({ is_archived: true, current_balance: 10 })),
    ).toBeNull();
    expect(
      deleteBlock(row({ is_archived: true, current_balance: 10 })),
    ).toBeTruthy();
  });
  it("requires versions, unique selections and operation IDs", () => {
    const record = { id: 1, revision: crypto.randomUUID() };
    expect(
      envelopeHousekeepingSchema.safeParse({
        ...meta(),
        command: { action: "archive", records: [record] },
      }).success,
    ).toBe(true);
    for (const records of [
      [],
      [record, record],
      [{ id: 1 }],
      [{ id: -1, revision: record.revision }],
    ])
      expect(
        envelopeHousekeepingSchema.safeParse({
          ...meta(),
          command: { action: "archive", records },
        }).success,
      ).toBe(false);
  });
  it("does not allow bulk permanent removal or edits to accounting flags", () => {
    const record = { id: 1, revision: crypto.randomUUID() };
    expect(
      envelopeHousekeepingSchema.safeParse({
        ...meta(),
        command: { action: "delete", records: [record, { ...record, id: 2 }] },
      }).success,
    ).toBe(false);
    expect(
      envelopeHousekeepingSchema.safeParse({
        ...meta(),
        command: {
          action: "rename-system",
          records: [record],
          name: "Transfers",
          notes: "",
          is_system: false,
        },
      }).success,
    ).toBe(false);
  });
  it("limits goal changes to supported source tables and preserves strict payloads", () => {
    const command = {
      action: "relink",
      id: 1,
      revision: crypto.randomUUID(),
      sourceRevisions: { "accounts:3": crypto.randomUUID() },
      source: { table: "accounts", id: 3 },
    };
    expect(
      goalHousekeepingSchema.safeParse({ ...meta(), command }).success,
    ).toBe(true);
    expect(
      goalHousekeepingSchema.safeParse({
        ...meta(),
        command: { ...command, source: { table: "users", id: 3 } },
      }).success,
    ).toBe(false);
    expect(
      goalHousekeepingSchema.safeParse({
        ...meta(),
        command: { ...command, target_amount: 0 },
      }).success,
    ).toBe(false);
  });
});
