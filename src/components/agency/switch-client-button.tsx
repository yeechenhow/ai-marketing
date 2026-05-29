import { switchOrganization } from "@/lib/actions/agency";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];

export function SwitchClientButton({
  organizationId,
  redirectTo,
  label = "Open",
  variant = "outline",
  size = "sm",
}: {
  organizationId: string;
  redirectTo?: string;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await switchOrganization(organizationId, redirectTo);
      }}
    >
      <Button type="submit" variant={variant} size={size}>
        {label}
      </Button>
    </form>
  );
}
