"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canAccessOrganization,
  getAgencyOrganizationForUser,
} from "@/lib/agency/access";
import { cloneFunnelWithWorkflows, ensureDefaultFunnel } from "@/lib/agency/clone-templates";
import type { SubscriptionPlan } from "@/generated/prisma/client";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const ACTIVE_ORG_COOKIE = "active-org-id";

const clientOrgSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  plan: z.string(),
});

async function requireAgencyAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const agency = await getAgencyOrganizationForUser(session.user.id);
  if (!agency) throw new Error("Forbidden");

  return { session, agency };
}

export async function switchOrganization(organizationId: string, redirectTo?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const access = await canAccessOrganization(session.user.id, organizationId);
  if (!access) throw new Error("You do not have access to this organization");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");

  if (redirectTo) {
    redirect(redirectTo);
  }

  if (access.isAgency) {
    redirect("/agency");
  }

  const role = access.role;
  if (role === "ORG_ADMIN" || role === "ANALYST") {
    redirect("/org");
  }
  if (role === "MANAGER") {
    redirect("/manager");
  }
  redirect("/dashboard/pipeline");
}

export async function createClientOrganization(formData: FormData) {
  const { session, agency } = await requireAgencyAdmin();

  const parsed = clientOrgSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    plan: formData.get("plan"),
  });

  const existing = await db.organization.findUnique({ where: { slug: parsed.slug } });
  if (existing) throw new Error("Slug already in use");

  const cloneFunnelId = formData.get("cloneFunnelId")?.toString();

  const client = await db.organization.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      plan: parsed.plan as SubscriptionPlan,
      agencyId: agency.id,
      isAgency: false,
    },
  });

  if (cloneFunnelId) {
    await cloneFunnelWithWorkflows(cloneFunnelId, agency.id, client.id);
  } else {
    await ensureDefaultFunnel(client.id);
  }

  await db.auditLog.create({
    data: {
      organizationId: client.id,
      userId: session.user.id,
      action: "agency.client.created",
      entityType: "Organization",
      entityId: client.id,
      details: { agencyId: agency.id, name: parsed.name, slug: parsed.slug },
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, client.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/agency");
  revalidatePath("/agency/clients");
  redirect(`/agency/clients/${client.id}`);
}

export async function cloneTemplateToClient(
  clientOrgId: string,
  funnelId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { session, agency } = await requireAgencyAdmin();

    const client = await db.organization.findFirst({
      where: { id: clientOrgId, agencyId: agency.id },
    });
    if (!client) return { ok: false, error: "Client not found" };

    const funnel = await cloneFunnelWithWorkflows(funnelId, agency.id, clientOrgId);

    await db.auditLog.create({
      data: {
        organizationId: clientOrgId,
        userId: session.user.id,
        action: "agency.template.cloned",
        entityType: "Funnel",
        entityId: funnel.id,
        details: { sourceFunnelId: funnelId, agencyId: agency.id },
      },
    });

    revalidatePath(`/agency/clients/${clientOrgId}`);
    revalidatePath("/org/pipelines");
    revalidatePath("/org/workflows");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Clone failed",
    };
  }
}
