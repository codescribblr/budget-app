import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), sendEmail: vi.fn() }));
vi.mock("../../supabase/server", () => ({
  createServiceRoleClient: mocks.client,
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.sendEmail };
  },
}));
vi.mock("../../push-notification-sender", () => ({
  sendPushNotificationToUser: vi.fn(),
}));

import { notifyAdminsOfInterfaceFeedback } from "../interface-feedback";

const feedback = {
  id: "1053c742-f00f-4b36-87c8-b5f1486ec690",
  userId: "submitter",
  submitterEmail: "submitter@example.com",
  accountId: 27,
  kind: "problem" as const,
  page: "/new/accounts",
  comment: "I could not save my balance. <b>This is plain text.</b>",
};

// Exercise the real notification service and email renderer, replacing only
// database storage, email transport, and push transport with test doubles.
let notifications: Record<string, any>[];
let deliveryLog: Record<string, any>[];
let emailDisabledFor: Set<string>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://budget.example.com");
  vi.stubEnv("SMTP_EMAIL_PASSWORD", "test-transport-only");
  vi.stubEnv("SMTP_FROM_EMAIL", "notifications@example.com");
  notifications = [];
  deliveryLog = [];
  emailDisabledFor = new Set();
  mocks.sendEmail
    .mockReset()
    .mockResolvedValue({ data: { id: "test-email" }, error: null });
  mocks.client.mockReturnValue({
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: { email: `${id}@example.com` } },
          error: null,
        }),
      },
    },
    from(table: string) {
      let mode = "read";
      let values: Record<string, any> = {};
      const filters: Record<string, unknown> = {};
      const result = () => {
        if (table === "user_profiles")
          return {
            data: [{ user_id: "admin-a" }, { user_id: "admin-b" }],
            error: null,
          };
        if (table === "user_notification_preferences")
          return {
            data: emailDisabledFor.has(String(filters.user_id))
              ? { email_enabled: false, in_app_enabled: false }
              : null,
          };
        if (table === "notification_types")
          return {
            data: {
              id: "system_notification",
              category: "system",
              default_email_enabled: true,
              default_in_app_enabled: false,
            },
          };
        if (table === "notifications") {
          if (mode === "insert") {
            const row = {
              ...values,
              id: notifications.length + 1,
              email_sent: false,
              in_app_created: false,
            };
            notifications.push(row);
            return { data: row, error: null };
          }
          const row = notifications.find((n) => n.id === filters.id);
          if (mode === "update") Object.assign(row!, values);
          return { data: row, error: null };
        }
        if (table === "notification_delivery_log") {
          deliveryLog.push(values);
          return { error: null };
        }
        throw new Error(`Unexpected table: ${table}`);
      };
      const query = {
        select: () => query,
        eq: (key: string, value: unknown) => {
          filters[key] = value;
          return query;
        },
        insert: (data: Record<string, any>) => {
          mode = "insert";
          values = data;
          return query;
        },
        update: (data: Record<string, any>) => {
          mode = "update";
          values = data;
          return query;
        },
        single: async () => result(),
        then: (
          resolve: (value: unknown) => unknown,
          reject: (error: unknown) => unknown,
        ) => Promise.resolve().then(result).then(resolve, reject),
      };
      return query;
    },
  });
});

describe("feedback email and bell delivery", () => {
  it("sends each admin an email with an overview and direct review link, and creates their bell notification", async () => {
    await notifyAdminsOfInterfaceFeedback(feedback);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(2);
    expect(
      mocks.sendEmail.mock.calls.map(([email]) => email.to[0]).sort(),
    ).toEqual(["admin-a@example.com", "admin-b@example.com"]);
    const email = mocks.sendEmail.mock.calls[0][0];
    expect(email.subject).toBe("New look feedback: Something didn’t work");
    expect(email.html).toContain("I could not save my balance.");
    expect(email.html).toContain("&lt;b&gt;This is plain text.&lt;/b&gt;");
    expect(email.html).toContain(
      `https://budget.example.com/admin/interface-feedback?feedback=${feedback.id}`,
    );
    expect(email.html).toContain("Review feedback");
    expect(notifications).toHaveLength(2);
    expect(
      notifications.every(
        (n) => n.email_sent && n.in_app_created && n.budget_account_id === null,
      ),
    ).toBe(true);
  });

  it("still creates bell notifications if email delivery fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.sendEmail.mockResolvedValue({
      data: null,
      error: { message: "Email service unavailable" },
    });
    await notifyAdminsOfInterfaceFeedback(feedback);
    expect(notifications).toHaveLength(2);
    expect(notifications.every((n) => n.in_app_created && !n.email_sent)).toBe(
      true,
    );
    expect(
      deliveryLog.filter((d) => d.channel === "email" && d.status === "failed"),
    ).toHaveLength(2);
    log.mockRestore();
  });

  it("honors disabled email preferences while keeping the in-app alert", async () => {
    emailDisabledFor.add("admin-a");
    await notifyAdminsOfInterfaceFeedback(feedback);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail.mock.calls[0][0].to).toEqual([
      "admin-b@example.com",
    ]);
    expect(notifications.find((n) => n.user_id === "admin-a")).toMatchObject({
      email_sent: false,
      in_app_created: true,
    });
  });
});
