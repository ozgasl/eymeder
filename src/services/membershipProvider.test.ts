import { describe, it, expect } from "vitest";
import { checkMembership } from "./membershipProvider";

describe("checkMembership", () => {
  it("resolves isMember: false without any network call when the school number can't form a valid membership_no", async () => {
    const result = await checkMembership({
      fullName: "Test Kullanıcı",
      graduationYear: 2010,
      schoolNumber: "12345",
      phone: "+905551234567",
      email: "test@example.com",
    });
    expect(result).toEqual({ isMember: false, membershipFound: null, tags: [] });
  });
});
