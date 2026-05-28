import type { PlatformRole } from "@/generated/prisma/client";

export type SessionUser = {
  platformRole: PlatformRole;
  orgRole?: PlatformRole;
};

export function getPortalPath(user: SessionUser): string {
  if (user.platformRole === "SUPER_ADMIN") return "/admin";

  switch (user.orgRole ?? user.platformRole) {
    case "ORG_ADMIN":
    case "ANALYST":
      return "/org";
    case "MANAGER":
      return "/manager";
    case "AGENT":
    default:
      return "/dashboard";
  }
}

export function canAccessOrgPortal(user: SessionUser): boolean {
  if (user.platformRole === "SUPER_ADMIN") return true;
  const role = user.orgRole ?? user.platformRole;
  return role === "ORG_ADMIN" || role === "ANALYST";
}

export function canAccessManagerPortal(user: SessionUser): boolean {
  if (user.platformRole === "SUPER_ADMIN") return true;
  const role = user.orgRole ?? user.platformRole;
  return role === "MANAGER" || role === "ORG_ADMIN";
}

export function canAccessAgentPortal(user: SessionUser): boolean {
  return user.platformRole !== "SUPER_ADMIN";
}

export function canAccessAdminPortal(user: SessionUser): boolean {
  return user.platformRole === "SUPER_ADMIN";
}
