import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    value,
  );
}

export function prospectDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
  phone?: string | null,
  whatsappName?: string | null,
  whatsappPhone?: string | null,
) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || whatsappName || email || phone || whatsappPhone || "Unknown prospect";
}
