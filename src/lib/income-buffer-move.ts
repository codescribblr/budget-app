import { NextResponse } from "next/server";
import { getAuthenticatedUser, getDashboardSummary } from "./supabase-queries";
import { getActiveAccountId } from "./account-context";
import { checkWriteAccess } from "./api-helpers";
import { logBalanceChange } from "./audit/category-balance-audit";
import { cents, parseMoney } from "./new-look";

/** Shared by both interfaces; compare-and-set prevents overwriting a changed buffer. */
export async function moveIncomeBuffer(
  request: Request,
  direction: "add" | "release",
) {
  try {
    const { supabase } = await getAuthenticatedUser();
    const access = await checkWriteAccess();
    if (access) return access;
    const accountId = await getActiveAccountId();
    if (!accountId)
      return NextResponse.json({ error: "No active account" }, { status: 400 });
    const { amount, expectedBalance } = await request.json();
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      parseMoney(String(amount)) === null
    )
      return NextResponse.json(
        { error: "Enter a positive amount with at most two decimal places." },
        { status: 400 },
      );
    if (
      expectedBalance !== undefined &&
      (typeof expectedBalance !== "number" || !Number.isFinite(expectedBalance))
    )
      return NextResponse.json(
        { error: "Invalid expected buffer balance." },
        { status: 400 },
      );
    const { data: flag, error: flagError } = await supabase
      .from("user_feature_flags")
      .select("enabled")
      .eq("account_id", accountId)
      .eq("feature_name", "income_buffer")
      .maybeSingle();
    if (flagError) throw flagError;
    if (!flag?.enabled)
      return NextResponse.json(
        { error: "Income Buffer feature is not enabled" },
        { status: 403 },
      );
    const { data: buffer, error: bufferError } = await supabase
      .from("categories")
      .select("id, current_balance")
      .eq("account_id", accountId)
      .eq("name", "Income Buffer")
      .eq("is_system", true)
      .single();
    if (bufferError || !buffer)
      return NextResponse.json(
        { error: "Income Buffer category not found" },
        { status: 404 },
      );
    const oldBalance = Number(buffer.current_balance);
    if (
      expectedBalance !== undefined &&
      cents(expectedBalance) !== cents(oldBalance)
    )
      return NextResponse.json(
        { error: "Your buffer balance changed. Refresh before trying again." },
        { status: 409 },
      );
    if (direction === "add") {
      const summary = await getDashboardSummary();
      if (cents(amount) > cents(summary.current_savings))
        return NextResponse.json(
          { error: "Amount exceeds available to save." },
          { status: 400 },
        );
    } else if (cents(amount) > cents(oldBalance))
      return NextResponse.json(
        {
          error: "Insufficient funds in buffer",
          available: oldBalance,
          requested: amount,
        },
        { status: 400 },
      );
    const newBalance =
      (cents(oldBalance) +
        (direction === "add" ? cents(amount) : -cents(amount))) /
      100;
    const { data: changed, error } = await supabase
      .from("categories")
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", buffer.id)
      .eq("account_id", accountId)
      .eq("current_balance", oldBalance)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!changed)
      return NextResponse.json(
        { error: "Your buffer balance changed. Refresh before trying again." },
        { status: 409 },
      );
    await logBalanceChange(
      buffer.id,
      oldBalance,
      newBalance,
      "income_buffer_fund",
      { direction },
    );
    return NextResponse.json({
      success: true,
      newBalance,
      ...(direction === "add"
        ? { amountAdded: amount }
        : { amountWithdrawn: amount }),
    });
  } catch (error) {
    console.error("Income buffer change failed:", error);
    return NextResponse.json(
      {
        error:
          "Could not confirm the buffer change. Check your balances before trying again.",
      },
      { status: 500 },
    );
  }
}
