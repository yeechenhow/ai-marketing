import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LIFECYCLE_STAGE_LABELS } from "@/lib/constants";
import type { LeadSource, LifecycleStage } from "@/generated/prisma/client";

const SOURCES: { value: LeadSource; label: string }[] = [
  { value: "MANUAL", label: "Manual entry" },
  { value: "WHATSAPP_CLICK", label: "WhatsApp" },
  { value: "MESSENGER", label: "Messenger" },
  { value: "LANDING_PAGE", label: "Landing page" },
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "ADS", label: "Ads" },
  { value: "IMPORT", label: "Import" },
  { value: "ORGANIC_SOCIAL", label: "Organic social" },
  { value: "OTHER", label: "Other" },
];

const STAGES = Object.keys(LIFECYCLE_STAGE_LABELS) as LifecycleStage[];

export type ProspectFormValues = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: LeadSource;
  lifecycleStage?: LifecycleStage;
  occupation?: string | null;
  tags?: string[];
};

export function ProspectForm({
  action,
  defaultValues,
  submitLabel,
  cancelHref,
}: {
  action: (formData: FormData) => void | Promise<void>;
  defaultValues?: ProspectFormValues;
  submitLabel: string;
  cancelHref: string;
}) {
  return (
    <form action={action} className="max-w-xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name *" name="firstName" defaultValue={defaultValues?.firstName ?? ""} required />
        <Field label="Last name" name="lastName" defaultValue={defaultValues?.lastName ?? ""} />
      </div>
      <Field label="Email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
      <Field label="Phone" name="phone" defaultValue={defaultValues?.phone ?? ""} />
      <Field label="Occupation" name="occupation" defaultValue={defaultValues?.occupation ?? ""} />

      <div>
        <label htmlFor="source" className="mb-1 block text-sm font-medium text-slate-700">
          Source
        </label>
        <select
          id="source"
          name="source"
          defaultValue={defaultValues?.source ?? "MANUAL"}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="lifecycleStage" className="mb-1 block text-sm font-medium text-slate-700">
          Lifecycle stage
        </label>
        <select
          id="lifecycleStage"
          name="lifecycleStage"
          defaultValue={defaultValues?.lifecycleStage ?? "NEW"}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {LIFECYCLE_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <Field
        label="Tags (comma-separated)"
        name="tags"
        defaultValue={defaultValues?.tags?.join(", ") ?? ""}
        placeholder="high-value, whatsapp"
      />

      <div className="flex gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
      />
    </div>
  );
}
