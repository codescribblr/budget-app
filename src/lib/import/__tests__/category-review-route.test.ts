import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  auth: vi.fn(),
  budget: vi.fn(),
  access: vi.fn(),
  service: vi.fn(),
  context: vi.fn(),
  premium: vi.fn(),
  feature: vi.fn(),
  ai: vi.fn(),
}));
vi.mock("@/lib/supabase-queries", () => ({
  getAuthenticatedUser: m.auth,
  isFeatureEnabled: m.feature,
}));
vi.mock("@/lib/account-context", () => ({ getActiveAccountId: m.budget }));
vi.mock("@/lib/api-helpers", () => ({ checkWriteAccess: m.access }));
vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: m.service,
}));
vi.mock("@/lib/import/categorization-server", () => ({
  categoryContext: m.context,
}));
vi.mock("@/lib/subscription-utils", () => ({
  requirePremiumSubscription: m.premium,
  PremiumRequiredError: class extends Error {},
}));
vi.mock("@/lib/ai/gemini-service", () => ({
  geminiService: { categorizeImportTransactions: m.ai },
}));
import { POST } from "@/app/api/import/review/route";
const revision = "e8b93f44-fc73-4f35-8d5f-9f82253bfeaf";
const runId = "c8b93f44-fc73-4f35-8d5f-9f82253bfeaf";
let rpc: ReturnType<typeof vi.fn>;
let serverRpc: ReturnType<typeof vi.fn>;
let rows: any[];
function query(data: () => any) {
  const q: any = {};
  for (const k of ["select", "eq", "in", "maybeSingle", "update"])
    q[k] = () => q;
  q.then = (resolve: any) =>
    Promise.resolve({ data: data(), error: null }).then(resolve);
  return q;
}
const send = (body: any) =>
  POST(
    new Request("http://localhost/api/import/review", {
      method: "POST",
      body: JSON.stringify({ budgetId: 27, batchId: "sample", ...body }),
    }),
  );
beforeEach(() => {
  vi.clearAllMocks();
  rows = [
    {
      id: 1,
      revision,
      status: "reviewing",
      description: "QT AT PUMP",
      merchant: "QT",
      amount: 30,
      transaction_date: "2026-10-30",
      transaction_type: "expense",
      suggested_category_id: 1,
      original_data: {},
    },
  ];
  rpc = vi
    .fn()
    .mockResolvedValue({ data: { status: "saved", rows: [] }, error: null });
  serverRpc = vi
    .fn()
    .mockImplementation((name: string) =>
      Promise.resolve({
        data:
          name === "begin_category_ai_run"
            ? { status: "started" }
            : name === "store_category_suggestions"
              ? [{ id: 1, status: "conflict" }]
              : null,
        error: null,
      }),
    );
  m.auth.mockResolvedValue({
    user: { id: "owner" },
    supabase: { rpc, from: () => query(() => rows) },
  });
  m.budget.mockResolvedValue(27);
  m.access.mockResolvedValue(null);
  m.feature.mockResolvedValue(true);
  m.premium.mockResolvedValue(undefined);
  m.service.mockReturnValue({
    rpc: serverRpc,
    from: (name: string) =>
      query(() => (name === "category_automation_config" ? null : {})),
  });
  m.context.mockImplementation(
    async (_db: any, _budget: number, selected: any[]) => ({
      categories: [
        { id: 1, name: "Food" },
        { id: 2, name: "Fuel" },
      ],
      preferences: [],
      suggestions: selected.map(() => ({
        version: 1,
        fingerprint: "input",
        merchantId: 1,
        merchantName: "QT",
        historyVersion: "v1",
        generatedAt: "now",
        alwaysAsk: false,
        history: {
          candidates: [
            {
              categoryId: 1,
              categoryName: "Food",
              count: 14,
              reason: "14 confirmed",
            },
          ],
          confirmedCount: 20,
          otherCount: 0,
          splitCount: 0,
          recent: [],
          eligible: false,
          reason: "Mixed use",
        },
        source: "history",
        outcome: "suggest",
        categoryId: 1,
        reason: "Mixed use",
      })),
    }),
  );
  m.ai.mockResolvedValue({
    suggestions: [
      {
        transactionId: "queued-1",
        categoryId: 2,
        categoryName: "Fuel",
        confidence: 0.99,
        reason: "AT PUMP descriptor",
      },
    ],
    tokensUsed: 10,
    responseTimeMs: 50,
  });
});
describe("category review API", () => {
  it("rejects budget changes and stale rows before provider or persistence calls", async () => {
    expect(
      (
        await send({
          action: "ai",
          budgetId: 28,
          rows: [{ id: 1, revision }],
          runId,
        })
      ).status,
    ).toBe(409);
    rows[0].revision = runId;
    expect(
      (await send({ action: "ai", rows: [{ id: 1, revision }], runId })).status,
    ).toBe(409);
    expect(m.ai).not.toHaveBeenCalled();
    expect(serverRpc).not.toHaveBeenCalled();
  });
  it("saves decisions through the guarded RPC and propagates conflicts", async () => {
    rpc.mockResolvedValue({ data: { status: "conflict" }, error: null });
    expect(
      (
        await send({
          action: "save",
          rows: [{ id: 1, revision, state: "unreviewed" }],
        })
      ).status,
    ).toBe(409);
    expect(rpc).toHaveBeenCalledWith(
      "save_category_review",
      expect.objectContaining({ p_budget_id: 27, p_batch_id: "sample" }),
    );
  });
  it("AI reconsiders weak prefilled categories with personal context and persists via CAS", async () => {
    const r = await send({ action: "ai", rows: [{ id: 1, revision }], runId });
    expect(r.status).toBe(200);
    expect(m.ai).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "queued-1" })]),
      expect.any(Array),
      expect.objectContaining({ history: expect.any(Array) }),
    );
    expect(serverRpc).toHaveBeenCalledWith(
      "store_category_suggestions",
      expect.objectContaining({
        p_actor: "owner",
        p_rows: [
          expect.objectContaining({
            id: 1,
            revision,
            suggestion: expect.objectContaining({
              categoryId: null,
              outcome: "suggest",
              ai: expect.objectContaining({
                candidate: expect.objectContaining({ categoryId: 2 }),
              }),
            }),
          }),
        ],
      }),
    );
    expect((await r.json()).results).toEqual([{ id: 1, status: "conflict" }]);
  });
  it("does not send reviewed, skipped, or duplicate transactions by default", async () => {
    for (const changes of [
      { category_review: { state: "reviewed" } },
      { category_review: { state: "skipped" } },
      { original_data: { isDuplicate: true } },
    ]) {
      rows[0] = { ...rows[0], ...changes };
      await send({ action: "ai", rows: [{ id: 1, revision }], runId });
    }
    expect(m.ai).not.toHaveBeenCalled();
  });
  it("allows an explicit second opinion without writing the reviewed allocation", async () => {
    rows[0].category_review = { state: "reviewed" };
    await send({
      action: "ai",
      rows: [{ id: 1, revision }],
      runId,
      secondOpinion: true,
    });
    expect(m.ai).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalledWith(
      "save_category_review",
      expect.anything(),
    );
  });
  it("enforces AI access, usage limits and duplicate request reservations", async () => {
    m.feature.mockResolvedValue(false);
    expect(
      (await send({ action: "ai", rows: [{ id: 1, revision }], runId })).status,
    ).toBe(403);
    m.feature.mockResolvedValue(true);
    serverRpc.mockResolvedValue({ data: { status: "limit" }, error: null });
    expect(
      (await send({ action: "ai", rows: [{ id: 1, revision }], runId })).status,
    ).toBe(429);
    serverRpc.mockResolvedValue({ data: { status: "busy" }, error: null });
    expect(
      (await send({ action: "ai", rows: [{ id: 1, revision }], runId })).status,
    ).toBe(409);
    expect(m.ai).not.toHaveBeenCalled();
  });
  it("abstains on ineligible or foreign category IDs returned by AI", async () => {
    m.ai.mockResolvedValue({
      suggestions: [
        {
          transactionId: "queued-1",
          categoryId: 999,
          reason: "invalid",
          confidence: 1,
        },
      ],
      tokensUsed: 1,
      responseTimeMs: 1,
    });
    await send({ action: "ai", rows: [{ id: 1, revision }], runId });
    expect(serverRpc).toHaveBeenCalledWith(
      "store_category_suggestions",
      expect.objectContaining({
        p_rows: [
          expect.objectContaining({
            suggestion: expect.objectContaining({
              ai: expect.objectContaining({ candidate: null }),
              outcome: "suggest",
            }),
          }),
        ],
      }),
    );
  });
});
