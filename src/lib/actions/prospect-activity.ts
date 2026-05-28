"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { TaskPriority } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

async function requireOrgUser() {
  const session = await auth();
  if (!session?.user.organizationId) throw new Error("Unauthorized");
  return session;
}

async function verifyProspect(prospectId: string, organizationId: string) {
  const prospect = await db.prospect.findFirst({
    where: { id: prospectId, organizationId },
  });
  if (!prospect) throw new Error("Prospect not found");
  return prospect;
}

export async function addProspectNote(prospectId: string, formData: FormData) {
  const session = await requireOrgUser();
  const body = (formData.get("body") as string)?.trim();
  if (!body) throw new Error("Note cannot be empty");

  await verifyProspect(prospectId, session.user.organizationId!);

  await db.activity.create({
    data: {
      prospectId,
      userId: session.user.id,
      type: "NOTE",
      title: "Note added",
      body,
    },
  });

  revalidatePath(`/dashboard/prospects/${prospectId}`);
}

export async function addProspectTask(prospectId: string, formData: FormData) {
  const session = await requireOrgUser();
  const title = (formData.get("title") as string)?.trim();
  if (!title) throw new Error("Task title is required");

  const priority = (formData.get("priority") as TaskPriority) || "MEDIUM";
  const dueDate = formData.get("dueDate") as string;

  await verifyProspect(prospectId, session.user.organizationId!);

  await db.task.create({
    data: {
      prospectId,
      assigneeId: session.user.id,
      creatorId: session.user.id,
      title,
      priority,
      dueAt: dueDate ? new Date(dueDate) : new Date(Date.now() + 86400000),
    },
  });

  await db.activity.create({
    data: {
      prospectId,
      userId: session.user.id,
      type: "TASK_CREATED",
      title: `Task created: ${title}`,
    },
  });

  revalidatePath(`/dashboard/prospects/${prospectId}`);
  revalidatePath("/dashboard/tasks");
}

export async function completeTask(taskId: string) {
  const session = await requireOrgUser();

  const task = await db.task.findFirst({
    where: { id: taskId },
    include: { prospect: true },
  });

  if (!task || task.prospect?.organizationId !== session.user.organizationId!) {
    throw new Error("Task not found");
  }

  await db.task.update({
    where: { id: taskId },
    data: { status: "DONE", completedAt: new Date() },
  });

  if (task.prospectId) {
    await db.activity.create({
      data: {
        prospectId: task.prospectId,
        userId: session.user.id,
        type: "TASK_COMPLETED",
        title: `Task completed: ${task.title}`,
      },
    });
  }

  revalidatePath(`/dashboard/prospects/${task.prospectId ?? ""}`);
  revalidatePath("/dashboard/tasks");
}
