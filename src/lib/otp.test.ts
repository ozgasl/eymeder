import { describe, it, expect } from "vitest";
import { generateOtpCode, hashOtpCode } from "./otp";

describe("generateOtpCode", () => {
  it("always returns a 6-digit numeric string", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});

describe("hashOtpCode", () => {
  it("produces the same hash for the same code and email", () => {
    const a = hashOtpCode("123456", "test@example.com");
    const b = hashOtpCode("123456", "test@example.com");
    expect(a).toBe(b);
  });

  it("is case-insensitive on the email", () => {
    const a = hashOtpCode("123456", "Test@Example.com");
    const b = hashOtpCode("123456", "test@example.com");
    expect(a).toBe(b);
  });

  it("produces a different hash for a different code", () => {
    const a = hashOtpCode("123456", "test@example.com");
    const b = hashOtpCode("654321", "test@example.com");
    expect(a).not.toBe(b);
  });

  it("produces a different hash for a different email", () => {
    const a = hashOtpCode("123456", "a@example.com");
    const b = hashOtpCode("123456", "b@example.com");
    expect(a).not.toBe(b);
  });
});
