import { createServiceRoleClient } from "../supabase/server";
import { NotificationService } from "./notification-service";

const feedbackKinds = {
  suggestion: "Suggestion",
  problem: "Something didn’t work",
  missing: "A tool I’m missing",
  positive: "Something I like",
} as const;

export interface FeedbackAlert {
  id: string;
  userId: string;
  submitterEmail?: string;
  accountId: number;
  kind: keyof typeof feedbackKinds;
  page: string;
  comment: string;
}

export function feedbackNotificationContent(feedback: FeedbackAlert) {
  const comment = feedback.comment.replace(/\s+/g, " ").trim();
  const excerpt =
    comment.length > 400 ? `${comment.slice(0, 397).trimEnd()}…` : comment;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const actionUrl = new URL("/admin/interface-feedback", baseUrl);
  actionUrl.searchParams.set("feedback", feedback.id);

  return {
    notificationTypeId: "system_notification",
    title: `New look feedback: ${feedbackKinds[feedback.kind]}`,
    message: [
      excerpt,
      `From: ${feedback.submitterEmail || feedback.userId}`,
      `Type: ${feedbackKinds[feedback.kind]}`,
      `Page: ${feedback.page}`,
      `Budget account: ${feedback.accountId}`,
    ].join("\n"),
    actionUrl: actionUrl.toString(),
    actionLabel: "Review feedback",
    // A site-wide admin alert must remain visible in any active household.
    budgetAccountId: null,
    metadata: {
      interface_feedback_id: feedback.id,
      submitted_by: feedback.userId,
      account_id: feedback.accountId,
      feedback_kind: feedback.kind,
      page_path: feedback.page,
    },
  };
}

/** Called only after a new feedback record is saved; retries do not alert twice. */
export async function notifyAdminsOfInterfaceFeedback(feedback: FeedbackAlert) {
  const supabase = createServiceRoleClient();
  const { data: admins, error } = await supabase
    .from("user_profiles")
    .select("user_id")
    .eq("is_admin", true);
  if (error)
    throw new Error(`Unable to find feedback recipients: ${error.message}`);
  if (!admins?.length) {
    console.warn("No site admins configured for interface feedback alerts.");
    return;
  }

  const service = new NotificationService();
  const content = feedbackNotificationContent(feedback);
  // The existing service creates the bell notification even if email fails,
  // and applies each recipient's system email/push notification preferences.
  const deliveries = await Promise.allSettled(
    admins.map((admin) =>
      service.createNotification({ ...content, userId: admin.user_id }),
    ),
  );
  deliveries.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("Interface feedback alert failed:", {
        feedbackId: feedback.id,
        recipientId: admins[index].user_id,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Unknown error",
      });
    }
  });
}
