import { Badge } from "../ui/badge";

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | null
  | undefined;

export function StatusBadge({
  variant,
  title,
}: {
  variant: BadgeVariant;
  title: string;
}) {
  switch (variant) {
    case "default":
      return <Badge>{title}</Badge>;
    case "destructive":
      return <Badge variant="destructive">{title}</Badge>;
    case "outline":
      return <Badge variant="outline">{title}</Badge>;
    case "secondary":
      return <Badge variant="secondary">{title}</Badge>;
    case "success":
      return <Badge variant="success">{title}</Badge>;
    default:
      return <Badge>{title}</Badge>;
  }
}
