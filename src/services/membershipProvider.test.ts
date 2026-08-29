import { describe, it, expect } from "vitest";
import { checkMembership } from "./membershipProvider";

describe("checkMembership (mock provider)", () => {
  it("always resolves isMember: false until the real Fonzip integration is wired in", async () => {
    const result = await checkMembership({
      fullName: "Test Kullanıcı",
      graduationYear: 2010,
      schoolNumber: "1234",
      phone: "+905551234567",
      email: "test@example.com",
    });
    expect(result).toEqual({ isMember: false });
  });
});
