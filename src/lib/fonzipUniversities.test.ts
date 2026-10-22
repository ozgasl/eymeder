import { describe, it, expect } from "vitest";
import { mapFonzipUniversity } from "./fonzipUniversities";

const mapped = (university: string, department: string | null = null) => ({
  kind: "mapped",
  value: { university, department },
});

describe("mapFonzipUniversity (real Fonzip values)", () => {
  it("maps exact and case/letter variants", () => {
    expect(mapFonzipUniversity("İstanbul Üniversitesi")).toEqual(mapped("İstanbul Üniversitesi"));
    expect(mapFonzipUniversity("Istanbul Üniversitesi")).toEqual(mapped("İstanbul Üniversitesi"));
    expect(mapFonzipUniversity("Kocaeli üniversitesi")).toEqual(mapped("Kocaeli Üniversitesi"));
    expect(mapFonzipUniversity("Yıldız Teknik üniversitesi")).toEqual(mapped("Yıldız Teknik Üniversitesi"));
    expect(mapFonzipUniversity("Özyeğin Üniversitesi")).toEqual(mapped("Özyeğin Üniversitesi"));
  });

  it("maps abbreviations", () => {
    expect(mapFonzipUniversity("İTÜ")).toEqual(mapped("İstanbul Teknik Üniversitesi"));
    expect(mapFonzipUniversity("ODTÜ")).toEqual(mapped("Orta Doğu Teknik Üniversitesi"));
    expect(mapFonzipUniversity("Bilkent Üniversitesi")).toEqual(mapped("İhsan Doğramacı Bilkent Üniversitesi"));
    expect(mapFonzipUniversity("Uludağ Üniversitesi")).toEqual(mapped("Bursa Uludağ Üniversitesi"));
  });

  it("maps the short form without the word Üniversitesi", () => {
    expect(mapFonzipUniversity("Marmara")).toEqual(mapped("Marmara Üniversitesi"));
    expect(mapFonzipUniversity("Yeditepe")).toEqual(mapped("Yeditepe Üniversitesi"));
  });

  it("splits a trailing faculty or department off", () => {
    expect(mapFonzipUniversity("İstanbul Üniversitesi İşletme Fakültesi")).toEqual(
      mapped("İstanbul Üniversitesi", "İşletme Fakültesi")
    );
    expect(mapFonzipUniversity("Ankara üniversitesi diş hekimliği fakültesi")).toEqual(
      mapped("Ankara Üniversitesi", "diş hekimliği fakültesi")
    );
    expect(mapFonzipUniversity("Anadolu üniversitesi turizm ve otel isletmeciligi")).toEqual(
      mapped("Anadolu Üniversitesi", "turizm ve otel isletmeciligi")
    );
    expect(mapFonzipUniversity("Ankara Ünv. İngiliz Dili ve Edebiyatı")).toEqual(
      mapped("Ankara Üniversitesi", "İngiliz Dili ve Edebiyatı")
    );
  });

  it("splits at separators", () => {
    expect(mapFonzipUniversity("İSTANBUL ÜNİVERSİTESİ/ İNGİLİZVE İKTİSAT")).toEqual(
      mapped("İstanbul Üniversitesi", "İNGİLİZVE İKTİSAT")
    );
    expect(mapFonzipUniversity("Doğuş University - MBA")).toEqual(mapped("Doğuş Üniversitesi", "MBA"));
  });

  it("prefers the longest name over a shorter one it starts with", () => {
    expect(mapFonzipUniversity("İstanbul Teknik Üniversitesi")).toEqual(mapped("İstanbul Teknik Üniversitesi"));
    expect(mapFonzipUniversity("İstanbul Bilgi Üniversitesi")).toEqual(mapped("İstanbul Bilgi Üniversitesi"));
  });

  it("calls placeholders and statuses junk", () => {
    for (const v of ["-", "Öğrenci", "3.sınıf öğrencisiyim"]) {
      expect(mapFonzipUniversity(v)).toEqual({ kind: "junk" });
    }
  });

  it("maps the old Mimar Sinan name and keeps the department", () => {
    expect(mapFonzipUniversity("Mimar Sinan Üniversitesi Matematik")).toEqual(
      mapped("Mimar Sinan Güzel Sanatlar Üniversitesi", "Matematik")
    );
  });

  it("maps foreign schools to clean names", () => {
    expect(mapFonzipUniversity("Durham University")).toEqual(mapped("Durham University"));
    expect(mapFonzipUniversity("McGill University")).toEqual(mapped("McGill University"));
    expect(mapFonzipUniversity("Bocconi Üniversitesi")).toEqual(mapped("Bocconi University"));
    expect(mapFonzipUniversity("Hesser college")).toEqual(mapped("Hesser College"));
    expect(mapFonzipUniversity("DePaul University - Business Administration")).toEqual(
      mapped("DePaul University", "Business Administration")
    );
  });

  it("calls 'still studying' statuses junk", () => {
    expect(mapFonzipUniversity("Devam ediyor")).toEqual({ kind: "junk" });
    expect(mapFonzipUniversity("Okumaya devam ediyorum")).toEqual({ kind: "junk" });
  });

  it("does not guess ambiguous or double entries", () => {
    for (const v of [
      "Amsterdam Üniversitesi",
      "City College /Işık Üniversitesi",
      "Ekonomi",
      "State University of New Paltz",
      "Webster University Vienna - International Business & Marketing",
    ]) {
      expect(mapFonzipUniversity(v)).toEqual({ kind: "unmatched" });
    }
    expect(mapFonzipUniversity("")).toEqual({ kind: "unmatched" });
  });
});
