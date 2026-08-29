import { describe, it, expect } from "vitest";
import { withTimeout } from "./withTimeout";

describe("withTimeout", () => {
  it("resolves with the original value when the promise settles before the timeout", async () => {
    const result = await withTimeout(Promise.resolve("fast"), 1000, "fallback");
    expect(result).toBe("fast");
  });

  it("resolves with the fallback when the promise takes longer than the timeout", async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve("slow"), 50));
    const result = await withTimeout(slow, 10, "fallback");
    expect(result).toBe("fallback");
  });
});
