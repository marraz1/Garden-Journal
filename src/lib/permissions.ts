import type { MemberRole } from "@/db/schema";

const ROLE_RANK: Record<MemberRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export type GardenAction =
  | "view"
  | "editContent" // beds, plants, tasks, progress entries
  | "manageMembers" // invite, change roles, remove members
  | "manageGarden"; // rename, resize the plan grid, delete

const ACTION_MIN_ROLE: Record<GardenAction, MemberRole> = {
  view: "viewer",
  editContent: "editor",
  manageMembers: "owner",
  manageGarden: "owner",
};

export function hasRole(actual: MemberRole, minimum: MemberRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum];
}

export function can(role: MemberRole, action: GardenAction): boolean {
  return hasRole(role, ACTION_MIN_ROLE[action]);
}

export function minRoleFor(action: GardenAction): MemberRole {
  return ACTION_MIN_ROLE[action];
}
