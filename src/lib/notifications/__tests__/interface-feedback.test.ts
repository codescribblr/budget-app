import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  eq: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("../../supabase/server", () => ({
  createServiceRoleClient: () => ({ from: mocks.from }),
}));
vi.mock("../notification-service", () => ({
  NotificationService: class {
    createNotification = mocks.notify;
  },
}));

import {
  feedbackNotificationContent,
  notifyAdminsOfInterfaceFeedback,
} from "../interface-feedback";
import { buildNotificationMessageHtml } from "../email-message-formatter";
import { renderEmailTemplate } from "../../email-utils";

const feedback = {
  id: "1053c742-f00f-4b36-87c8-b5f1486ec690",
  userId: "submitter",
  submitterEmail: "submitter@example.com",
  accountId: 27,
  kind: "suggestion" as const,
  page: "/new/accounts",
  comment: "Please keep the balance fields easy to scan.",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://budget.example.com");
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({
    data: [{ user_id: "admin-a" }, { user_id: "admin-b" }],
    error: null,
  });
  mocks.notify.mockReset().mockResolvedValue(1);
});

describe("feedback admin alerts", () => {
  it("targets site admins and uses the existing email/in-app system across households", async () => {
    await notifyAdminsOfInterfaceFeedback(feedback);
    expect(mocks.from).toHaveBeenCalledWith("user_profiles");
    expect(mocks.eq).toHaveBeenCalledWith("is_admin", true);
    expect(mocks.notify.mock.calls.map(([data]) => data.userId)).toEqual([
      "admin-a",
      "admin-b",
    ]);
    expect(mocks.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "admin-a",
        notificationTypeId: "system_notification",
        budgetAccountId: null,
        title: "New look feedback: Suggestion",
        actionUrl: `https://budget.example.com/admin/interface-feedback?feedback=${feedback.id}`,
        actionLabel: "Review feedback",
      }),
    );
    expect(mocks.notify.mock.calls[0][0].message).toContain(feedback.comment);
    expect(mocks.notify.mock.calls[0][0].message).toContain(
      "Page: /new/accounts",
    );
  });

  it("continues notifying the other admins if one delivery fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.notify.mockRejectedValueOnce(new Error("Delivery failed"));
    await notifyAdminsOfInterfaceFeedback(feedback);
    expect(mocks.notify).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(
      "Interface feedback alert failed:",
      expect.objectContaining({ recipientId: "admin-a" }),
    );
    log.mockRestore();
  });

  it("reports recipient lookup failures without broadcasting to other users", async () => {
    mocks.eq.mockResolvedValue({
      data: null,
      error: { message: "Unavailable" },
    });
    await expect(notifyAdminsOfInterfaceFeedback(feedback)).rejects.toThrow(
      "Unable to find feedback recipients",
    );
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it("keeps a short excerpt and preserves plain text safely in the email template", () => {
    const content = feedbackNotificationContent({
      ...feedback,
      comment: '<script>alert("test")</script> $& ' + "word ".repeat(200),
    });
    expect(content.message.split("\n")[0].length).toBeLessThanOrEqual(400);
    expect(content.message.split("\n")[0]).toMatch(/…$/);
    const html = renderEmailTemplate("notifications/notification-generic", {
      Title: content.title,
      MessageHTML: buildNotificationMessageHtml(
        content.notificationTypeId,
        content.message,
      ),
      ActionURL: content.actionUrl,
      ActionLabel: content.actionLabel,
      UnsubscribeURL: "https://budget.example.com/settings/notifications",
      LogoURL: "",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("$&");
    expect(html).not.toContain("{{ .MessageHTML }}");
    expect(html).toContain(`href="${content.actionUrl}"`);
  });
});
