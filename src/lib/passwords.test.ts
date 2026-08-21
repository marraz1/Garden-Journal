import { describe, expect, it } from "vitest";
import {
  checkPasswordStrength,
  createResetToken,
  hashPassword,
  hashResetToken,
  tokenHashesMatch,
  verifyPassword,
} from "./passwords";

describe("checkPasswordStrength", () => {
  it("requires at least 8 characters", () => {
    expect(checkPasswordStrength("short12").error).toBe("passwordTooShort");
    expect(checkPasswordStrength("longenough1").ok).toBe(true);
  });

  it("rejects absurdly long input rather than hashing it", () => {
    expect(checkPasswordStrength("a1b2c3d4".repeat(40)).error).toBe("passwordTooLong");
  });

  it("rejects passwords with almost no distinct characters", () => {
    expect(checkPasswordStrength("aaaaaaaa").error).toBe("passwordTooWeak");
    expect(checkPasswordStrength("abababab").error).toBe("passwordTooWeak");
    expect(checkPasswordStrength("abcdabcd").ok).toBe(true);
  });

  it("accepts a passphrase without demanding symbols or digits", () => {
    expect(checkPasswordStrength("morkos ir burokeliai").ok).toBe(true);
  });
});

describe("password hashing", () => {
  it("round-trips a password", async () => {
    const hash = await hashPassword("teisingas-slaptazodis");
    expect(hash).not.toContain("teisingas");
    expect(await verifyPassword("teisingas-slaptazodis", hash)).toBe(true);
    expect(await verifyPassword("blogas-slaptazodis", hash)).toBe(false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    const [first, second] = await Promise.all([
      hashPassword("kartojasi1"),
      hashPassword("kartojasi1"),
    ]);
    expect(first).not.toBe(second);
    expect(await verifyPassword("kartojasi1", second)).toBe(true);
  });
});

describe("reset tokens", () => {
  it("never stores the raw token", () => {
    const { token, tokenHash } = createResetToken();
    expect(tokenHash).not.toContain(token);
    expect(tokenHash).toHaveLength(64);
  });

  it("hashes deterministically so a token from an email can be looked up", () => {
    const { token, tokenHash } = createResetToken();
    expect(hashResetToken(token)).toBe(tokenHash);
  });

  it("produces a different token every call", () => {
    expect(createResetToken().token).not.toBe(createResetToken().token);
  });

  it("compares hashes safely", () => {
    const { token, tokenHash } = createResetToken();
    expect(tokenHashesMatch(hashResetToken(token), tokenHash)).toBe(true);
    expect(tokenHashesMatch(hashResetToken("other"), tokenHash)).toBe(false);
    expect(tokenHashesMatch("short", tokenHash)).toBe(false);
  });
});
