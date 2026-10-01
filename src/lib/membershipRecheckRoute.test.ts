import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextApiRequest, NextApiResponse } from "next";

const state = vi.hoisted(() => ({
  profile: null as Record<string, unknown> | null,
  updates: [] as Record<string, unknown>[],
  outcome: null as unknown,
  recheckCalls: 0,
}));

vi.mock("@/lib/requireMember", () => ({
  requireSignedIn: async () => ({ userId: "u1" }),
  isAuthError: (result: object) => "error" in result,
}));

vi.mock("@/lib/fonzipRecheck", () => ({
  recheckFonzipMembership: async () => {
    state.recheckCalls += 1;
    return state.outcome;
  },
}));

vi.mock("@/integrations/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: state.profile, error: null }) }),
      }),
      update: (values: Record<string, unknown>) => {
        state.updates.push(values);
        return { eq: async () => ({ error: null }) };
      },
    }),
  },
}));

import handler from "@/pages/api/membership/recheck";

function call() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
  return handler({ method: "POST", headers: {} } as NextApiRequest, res as unknown as NextApiResponse).then(() => res);
}

const baseProfile = {
  full_name: "Ayşe Yılmaz",
  graduation_year: 2010,
  school_number: "123",
  phone: null,
  email: "ayse@example.com",
  membership_tier: "mezun_uye",
  fonzip_checked_at: null,
};

const checkFields = { fonzip_membership_status: "var", fonzip_tags: "Mezun Üye", fonzip_checked_at: "2026-10-01T12:00:00Z" };

beforeEach(() => {
  state.profile = { ...baseProfile };
  state.updates = [];
  state.outcome = null;
  state.recheckCalls = 0;
});

describe("/api/membership/recheck", () => {
  it("upgrades a mezun_uye that Fonzip now tags as dernek üyesi", async () => {
    state.outcome = { kind: "answered", isMember: true, update: { membership_tier: "dernek_uyesi", ...checkFields } };
    const res = await call();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ tier: "dernek_uyesi" });
    expect(state.updates).toEqual([{ membership_tier: "dernek_uyesi", ...checkFields }]);
  });

  it("records a still-not-member check without touching membership_tier", async () => {
    state.outcome = { kind: "answered", isMember: false, update: { membership_tier: "mezun_uye", ...checkFields } };
    const res = await call();
    expect(res.body).toEqual({ tier: "mezun_uye" });
    expect(state.updates).toEqual([checkFields]);
  });

  it("does nothing for someone who is already dernek_uyesi", async () => {
    state.profile = { ...baseProfile, membership_tier: "dernek_uyesi" };
    const res = await call();
    expect(res.body).toEqual({ tier: "dernek_uyesi" });
    expect(state.recheckCalls).toBe(0);
    expect(state.updates).toEqual([]);
  });

  it("refuses with 429 inside the cooldown, without calling Fonzip", async () => {
    state.profile = { ...baseProfile, fonzip_checked_at: new Date(Date.now() - 60 * 1000).toISOString() };
    const res = await call();
    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toBeDefined();
    expect(state.recheckCalls).toBe(0);
    expect(state.updates).toEqual([]);
  });

  it("leaves the profile untouched when Fonzip doesn't answer", async () => {
    state.outcome = { kind: "no_answer" };
    const res = await call();
    expect(res.statusCode).toBe(503);
    expect(state.updates).toEqual([]);
  });

  it("explains missing graduation year / school number", async () => {
    state.outcome = { kind: "missing_fields" };
    const res = await call();
    expect(res.statusCode).toBe(400);
    expect(state.updates).toEqual([]);
  });
});
