import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkMembership } from "./membershipProvider";
import { findFonzipMember, findFonzipMemberByContact } from "@/lib/fonzipClient";

vi.mock("@/lib/fonzipClient", () => ({
  findFonzipMember: vi.fn(),
  findFonzipMemberByContact: vi.fn(),
}));

const mockFindFonzipMember = vi.mocked(findFonzipMember);
const mockFindFonzipMemberByContact = vi.mocked(findFonzipMemberByContact);

const baseInput = {
  fullName: "Test Kullanıcı",
  graduationYear: 2010,
  schoolNumber: "0018",
  phone: "+905551234567",
  email: "test@example.com",
};

describe("checkMembership", () => {
  beforeEach(() => {
    mockFindFonzipMember.mockReset();
    mockFindFonzipMemberByContact.mockReset();
  });

  it("uses the membership_no match directly when it finds the member", async () => {
    mockFindFonzipMember.mockResolvedValue({ membershipFound: true, tags: ["Dernek Üyesi"] });

    const result = await checkMembership(baseInput);

    expect(result).toEqual({ isMember: true, membershipFound: true, tags: ["Dernek Üyesi"] });
    expect(mockFindFonzipMemberByContact).not.toHaveBeenCalled();
  });

  it("falls back to email/phone matching when membership_no doesn't match anyone", async () => {
    mockFindFonzipMember.mockResolvedValue({ membershipFound: false, tags: [] });
    mockFindFonzipMemberByContact.mockResolvedValue({ membershipFound: true, tags: ["Yönetim"] });

    const result = await checkMembership(baseInput);

    expect(result).toEqual({ isMember: true, membershipFound: true, tags: ["Yönetim"] });
    expect(mockFindFonzipMemberByContact).toHaveBeenCalledWith({ email: baseInput.email, phone: baseInput.phone });
  });

  it("goes straight to the email/phone fallback when the school number can't form a valid membership_no", async () => {
    mockFindFonzipMemberByContact.mockResolvedValue({ membershipFound: false, tags: [] });

    const result = await checkMembership({ ...baseInput, schoolNumber: "12345" });

    expect(result).toEqual({ isMember: false, membershipFound: false, tags: [] });
    expect(mockFindFonzipMember).not.toHaveBeenCalled();
    expect(mockFindFonzipMemberByContact).toHaveBeenCalledWith({ email: baseInput.email, phone: baseInput.phone });
  });

  it("treats a lookup failure as membershipFound: null rather than propagating", async () => {
    mockFindFonzipMember.mockRejectedValue(new Error("network error"));

    const result = await checkMembership(baseInput);

    expect(result).toEqual({ isMember: false, membershipFound: null, tags: [] });
  });
});
