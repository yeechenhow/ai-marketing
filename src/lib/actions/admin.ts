"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_FUNNEL_STAGES } from "@/lib/constants";
import type { SubscriptionPlan } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.platformRole !== "SUPER_ADMIN") {
    throw new Error("Forbidden");
  }
  return session;
}

const orgSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  plan: z.string(),
});

export async function createOrganization(formData: FormData) {
  const session = await requireSuperAdmin();
  const parsed = orgSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    plan: formData.get("plan"),
  });

  const existing = await db.organization.findUnique({ where: { slug: parsed.slug } });
  if (existing) throw new Error("Slug already in use");

  const org = await db.organization.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      plan: parsed.plan as SubscriptionPlan,
      funnels: {
        create: {
          name: "Default Sales Funnel",
          isDefault: true,
          stages: {
            create: DEFAULT_FUNNEL_STAGES.map((s) => ({
              name: s.name,
              order: s.order,
              probability: s.probability,
            })),
          },
        },
      },
    },
  });

  await db.auditLog.create({
    data: {
      organizationId: org.id,
      userId: session.user.id,
      action: "organization.created",
      entityType: "Organization",
      entityId: org.id,
      details: { name: parsed.name, slug: parsed.slug, plan: parsed.plan },
    },
  });

  revalidatePath("/admin/organizations");
  revalidatePath("/admin");
  redirect(`/admin/organizations/${org.id}`);
}

export async function toggleOrganizationStatus(orgId: string) {
  const session = await requireSuperAdmin();

  const org = await db.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error("Organization not found");

  await db.organization.update({
    where: { id: orgId },
    data: { isActive: !org.isActive },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: org.isActive ? "organization.suspended" : "organization.activated",
      entityType: "Organization",
      entityId: orgId,
    },
  });

  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin");
}

export async function updateOrganizationPlan(orgId: string, formData: FormData) {
  const session = await requireSuperAdmin();
  const plan = formData.get("plan") as SubscriptionPlan;
  if (!plan) throw new Error("Plan required");

  await db.organization.update({
    where: { id: orgId },
    data: { plan },
  });

  await db.auditLog.create({
    data: {
      organizationId: orgId,
      userId: session.user.id,
      action: "organization.plan_changed",
      entityType: "Organization",
      entityId: orgId,
      details: { plan },
    },
  });

  revalidatePath(`/admin/organizations/${orgId}`);
  revalidatePath("/admin/billing");
}
