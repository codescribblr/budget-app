import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getAuthenticatedUser, isFeatureEnabled } from "@/lib/supabase-queries";
import { getActiveAccountId } from "@/lib/account-context";
import { checkWriteAccess } from "@/lib/api-helpers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { categoryContext } from "@/lib/import/categorization-server";
import {
  AI_PROMPT_VERSION,
  combineSuggestions,
} from "@/lib/import/categorization";
import {
  requirePremiumSubscription,
  PremiumRequiredError,
} from "@/lib/subscription-utils";
import { GEMINI_MODELS, USER_LIMITS } from "@/lib/ai/constants";
import { geminiService } from "@/lib/ai/gemini-service";

const base = z.object({
  budgetId: z.number().int().positive(),
  batchId: z.string().min(1).max(500),
  action: z.enum(["save", "history", "ai", "preference"]),
});
const references = z
  .array(z.object({ id: z.number().int().positive(), revision: z.uuid() }))
  .min(1)
  .max(100);
export async function POST(request: Request) {
  try {
    const access = await checkWriteAccess();
    if (access) return access;
    const body = await request.json();
    const parsed = base.parse(body);
    const { supabase: db, user } = await getAuthenticatedUser();
    const budgetId = await getActiveAccountId();
    if (budgetId !== parsed.budgetId)
      return NextResponse.json(
        { error: "Your active budget changed. Reload before continuing." },
        { status: 409 },
      );
    if (parsed.action === "save") {
      const rows = z
        .array(
          z.object({
            id: z.number().int().positive(),
            revision: z.uuid(),
            state: z.enum(["reviewed", "skipped", "unreviewed"]),
            patch: z.record(z.string(), z.unknown()).optional(),
            merchant: z.string().optional(),
            forceImport: z.boolean().optional(),
          }),
        )
        .min(1)
        .max(100)
        .parse(body.rows);
      const { data, error } = await db.rpc("save_category_review", {
        p_budget_id: budgetId,
        p_batch_id: parsed.batchId,
        p_rows: rows,
      });
      if (error) throw error;
      return NextResponse.json(data, {
        status: data.status === "conflict" ? 409 : 200,
      });
    }
    if (parsed.action === "preference") {
      const p = z
        .object({
          merchantId: z.number().int().positive(),
          revision: z.uuid().nullable(),
          alwaysAsk: z.boolean(),
        })
        .parse(body);
      const { data, error } = await db.rpc("save_category_preference", {
        p_budget_id: budgetId,
        p_merchant_id: p.merchantId,
        p_revision: p.revision,
        p_always_ask: p.alwaysAsk,
      });
      if (error) throw error;
      return NextResponse.json(data, {
        status: data.status === "conflict" ? 409 : 200,
      });
    }
    const refs = references.parse(body.rows);
    if (new Set(refs.map((r) => r.id)).size !== refs.length)
      return NextResponse.json(
        { error: "Select each transaction once." },
        { status: 400 },
      );
    const { data: rows, error } = await db
      .from("queued_imports")
      .select("*")
      .eq("account_id", budgetId)
      .eq("source_batch_id", parsed.batchId)
      .in(
        "id",
        refs.map((r) => r.id),
      );
    if (error) throw error;
    if (
      rows?.length !== refs.length ||
      rows.some(
        (r) =>
          ["imported", "rejected"].includes(r.status) ||
          r.revision !== refs.find((x) => x.id === r.id)?.revision,
      )
    )
      return NextResponse.json(
        {
          error:
            "These transactions changed elsewhere. Reload the saved review before continuing.",
        },
        { status: 409 },
      );
    const ai = parsed.action === "ai";
    if (ai) {
      await requirePremiumSubscription(budgetId!);
      if (!(await isFeatureEnabled("ai_chat")))
        return NextResponse.json(
          { error: "Enable AI features in Settings to use AI categorization." },
          { status: 403 },
        );
    }
    // Skipped and duplicate rows are never sent to the provider. Reviewed rows need an explicit second opinion.
    const selected = rows.filter((r) => {
      const original =
        typeof r.original_data === "string"
          ? JSON.parse(r.original_data)
          : r.original_data;
      return (
        r.category_review?.state !== "skipped" &&
        ((!original?.isDuplicate && !original?.duplicateType) ||
          r.category_review?.forceImport) &&
        (!r.category_review || (ai && body.secondOpinion === true))
      );
    });
    if (!selected.length)
      return NextResponse.json({ results: [], preferences: [] });
    const service = createServiceRoleClient();
    const context = await categoryContext(db, budgetId!, selected);
    const configResult = await service
      .from("category_automation_config")
      .select("*")
      .eq("account_id", budgetId)
      .maybeSingle();
    if (configResult.error) throw configResult.error;
    const config = configResult.data;
    const model = GEMINI_MODELS.flash;
    const automatic = {
      history: !!config?.history_enabled && !!config.validation_notes?.trim(),
      ai:
        !!config?.ai_enabled &&
        !!config.validation_notes?.trim() &&
        config.ai_model === model &&
        config.ai_prompt_version === AI_PROMPT_VERSION,
      aiThreshold: Number(config?.ai_threshold ?? 1),
    };
    let suggestions = context.suggestions;
    let runId: string | undefined;
    if (ai) {
      runId = z.uuid().parse(body.runId);
      const inputHash = createHash("sha256")
        .update(
          JSON.stringify(
            selected.map((r, i) => [
              r.id,
              r.revision,
              suggestions[i].fingerprint,
            ]),
          ),
        )
        .digest("hex");
      const { data: claim, error: claimError } = await service.rpc(
        "begin_category_ai_run",
        {
          p_id: runId,
          p_budget_id: budgetId,
          p_user_id: user.id,
          p_batch_id: parsed.batchId,
          p_hash: inputHash,
          p_limit: USER_LIMITS.daily.categorization,
        },
      );
      if (claimError) throw claimError;
      if (claim.status === "complete") return NextResponse.json(claim.response);
      if (claim.status === "limit")
        return NextResponse.json(
          {
            error:
              "Daily AI limit reached. Your review is saved; continue manually or try tomorrow.",
          },
          { status: 429 },
        );
      if (claim.status === "failed" && !claim.providerResult)
        return NextResponse.json(
          {
            error:
              "The earlier AI request could not finish. Try again to start a new request.",
            retryWithNewRun: true,
          },
          { status: 503 },
        );
      if (claim.status !== "started" && !claim.providerResult)
        return NextResponse.json(
          {
            error:
              "An AI request is running or was interrupted. Reload saved results before starting a new request.",
          },
          { status: 409 },
        );
      try {
        const result =
          claim.providerResult ??
          (await geminiService.categorizeImportTransactions(
            selected.map((r) => ({
              id: `queued-${r.id}`,
              merchant: r.merchant,
              description: r.description,
              amount: Number(r.amount),
              date: r.transaction_date,
              transaction_type: r.transaction_type,
            })),
            context.categories.map((c) => ({ id: c.id, name: c.name })),
            {
              envelopes: context.categories.map((c) => ({
                id: c.id,
                name: c.name,
                purpose: c.notes?.slice(0, 300),
              })),
              history: suggestions.map((s, i) => ({
                transactionIndex: i + 1,
                merchant: s.merchantName,
                confirmedCount: s.history.confirmedCount,
                splitCount: s.history.splitCount,
                categories: s.history.candidates,
                recent: s.history.recent.map((h) => ({
                  date: h.date,
                  amount: h.amount,
                  description: h.description.slice(0, 180),
                  confirmed: h.confirmed,
                  envelopes: h.splits,
                })),
              })),
            },
          ));
        const usage = await service.rpc("record_category_ai_result", {
          p_id: runId,
          p_result: result,
        });
        if (usage.error) throw usage.error;
        suggestions = suggestions.map((s, i) => {
          const prediction = result.suggestions.find(
            (p: {
              transactionId: string;
              categoryId: number | null;
              reason: string;
              confidence: number;
            }) => p.transactionId === `queued-${selected[i].id}`,
          );
          const category = context.categories.find(
            (c) => c.id === prediction?.categoryId,
          );
          return {
            ...s,
            ai: {
              state: prediction ? ("complete" as const) : ("failed" as const),
              candidate: category
                ? {
                    categoryId: category.id,
                    categoryName: category.name,
                    reason: prediction!.reason,
                  }
                : null,
              reason:
                prediction?.reason?.slice(0, 600) ||
                "AI could not suggest an envelope. You can choose one or retry.",
              confidence: Number.isFinite(prediction?.confidence)
                ? prediction!.confidence
                : 0,
              model,
              promptVersion: AI_PROMPT_VERSION,
              ...(!prediction
                ? { error: "No result returned for this transaction." }
                : {}),
            },
          };
        });
      } catch (error) {
        await service
          .from("import_category_runs")
          .update({ state: "failed", completed_at: new Date().toISOString() })
          .eq("id", runId);
        console.error("AI provider request failed", error);
        return NextResponse.json(
          {
            error:
              "AI could not finish. Your saved review is safe. Retry or continue choosing envelopes.",
            retryWithNewRun: true,
          },
          { status: 503 },
        );
      }
    }
    const { data: results, error: saveError } = await service.rpc(
      "store_category_suggestions",
      {
        p_budget_id: budgetId,
        p_batch_id: parsed.batchId,
        p_actor: user.id,
        p_rows: selected.map((r, i) => ({
          id: r.id,
          revision: r.revision,
          suggestion: combineSuggestions(suggestions[i], automatic),
        })),
      },
    );
    if (saveError) throw saveError;
    const response = { results, preferences: context.preferences };
    if (runId) {
      const saved = await service
        .from("import_category_runs")
        .update({
          state: "complete",
          response,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (saved.error) throw saved.error;
    }
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Category review failed", error?.message);
    const status =
      error instanceof PremiumRequiredError
        ? 403
        : error instanceof z.ZodError ||
            [
              "22023",
              "22P02",
              "22003",
              "22007",
              "22008",
              "23502",
              "23503",
              "23514",
            ].includes(error?.code)
          ? 400
          : error?.code === "42501"
            ? 403
            : 500;
    return NextResponse.json(
      {
        error:
          error instanceof PremiumRequiredError
            ? "AI categorization requires Premium."
            : error instanceof z.ZodError
              ? "Check the review request and try again."
              : status === 500
                ? "Could not complete this action. Your saved review is unchanged. Please retry."
                : error.message,
      },
      { status },
    );
  }
}
