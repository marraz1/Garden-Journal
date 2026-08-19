import { describe, expect, it } from "vitest";
import { can, hasRole, minRoleFor, type GardenAction } from "./permissions";
import type { MemberRole } from "@/db/schema";

const roles: MemberRole[] = ["viewer", "editor", "owner"];
const actions: GardenAction[] = ["view", "editContent", "manageMembers", "manageGarden"];

describe("hasRole", () => {
  it("treats the role hierarchy as viewer < editor < owner", () => {
    expect(hasRole("owner", "editor")).toBe(true);
    expect(hasRole("editor", "viewer")).toBe(true);
    expect(hasRole("editor", "owner")).toBe(false);
    expect(hasRole("viewer", "editor")).toBe(false);
  });

  it("is reflexive", () => {
    for (const role of roles) expect(hasRole(role, role)).toBe(true);
  });
});

describe("can", () => {
  it("matches the expected permission matrix", () => {
    const expected: Record<MemberRole, Record<GardenAction, boolean>> = {
      viewer: { view: true, editContent: false, manageMembers: false, manageGarden: false },
      editor: { view: true, editContent: true, manageMembers: false, manageGarden: false },
      owner: { view: true, editContent: true, manageMembers: true, manageGarden: true },
    };

    for (const role of roles) {
      for (const action of actions) {
        expect(can(role, action), `${role} → ${action}`).toBe(expected[role][action]);
      }
    }
  });

  it("never lets a viewer mutate anything", () => {
    for (const action of actions.filter((a) => a !== "view")) {
      expect(can("viewer", action)).toBe(false);
    }
  });

  it("agrees with minRoleFor", () => {
    for (const action of actions) {
      for (const role of roles) {
        expect(can(role, action)).toBe(hasRole(role, minRoleFor(action)));
      }
    }
  });
});
