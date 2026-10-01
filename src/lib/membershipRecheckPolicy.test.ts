import { describe, it, expect } from "vitest";
import { SELF_RECHECK_COOLDOWN_MS, selfRecheckGate } from "./membershipRecheckPolicy";

const now = new Date("2026-10-01T12:00:00Z");
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

describe("selfRecheckGate", () => {
  it("allows a mezun_uye who was never checked", () => {
    expect(selfRecheckGate({ membership_tier: "mezun_uye", fonzip_checked_at: null }, now)).toEqual({ kind: "allowed" });
  });

  it("allows a mezun_uye whose last check is older than the cooldown", () => {
    expect(selfRecheckGate({ membership_tier: "mezun_uye", fonzip_checked_at: minutesAgo(6) }, now)).toEqual({ kind: "allowed" });
  });

  it("blocks a mezun_uye checked within the cooldown and says how long to wait", () => {
    const gate = selfRecheckGate({ membership_tier: "mezun_uye", fonzip_checked_at: minutesAgo(2) }, now);
    expect(gate).toEqual({ kind: "cooldown", retryAfterMs: SELF_RECHECK_COOLDOWN_MS - 2 * 60 * 1000 });
  });

  it("never lets a dernek_uyesi run it, so a self-check can't downgrade anyone", () => {
    expect(selfRecheckGate({ membership_tier: "dernek_uyesi", fonzip_checked_at: null }, now)).toEqual({ kind: "already_member" });
  });

  it("treats a missing tier like mezun_uye", () => {
    expect(selfRecheckGate({ membership_tier: null, fonzip_checked_at: null }, now)).toEqual({ kind: "allowed" });
  });

  it("ignores an unparseable check time instead of blocking forever", () => {
    expect(selfRecheckGate({ membership_tier: "mezun_uye", fonzip_checked_at: "not-a-date" }, now)).toEqual({ kind: "allowed" });
  });
});
