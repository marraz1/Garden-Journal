import { describe, expect, it } from "vitest";
import { localizedPath } from "./paths";

describe("localizedPath", () => {
  it("leaves the default locale unprefixed", () => {
    expect(localizedPath("lt", "/plan")).toBe("/plan");
    expect(localizedPath("lt", "/")).toBe("/");
  });

  it("prefixes every other locale", () => {
    expect(localizedPath("en", "/plan")).toBe("/en/plan");
    expect(localizedPath("en", "/join/abc123")).toBe("/en/join/abc123");
  });

  it("does not leave a trailing slash on the root path", () => {
    expect(localizedPath("en", "/")).toBe("/en");
  });

  it("tolerates a missing leading slash", () => {
    expect(localizedPath("en", "tasks")).toBe("/en/tasks");
    expect(localizedPath("lt", "tasks")).toBe("/tasks");
  });
});
