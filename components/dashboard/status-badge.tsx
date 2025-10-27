import { Badge } from "../ui/badge";

export function StatusBadge({ voided }: { voided: boolean }) {
  return voided ? (
    <Badge variant="destructive">Voided</Badge>
  ) : (
    <Badge variant="success">Active</Badge>
  );
}
