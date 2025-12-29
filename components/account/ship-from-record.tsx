import { WarehouseRecord } from "@/lib/supabase/warehouses";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ShipFromDetails from "../ship-from-details";

type Props = {
  warehouse: WarehouseRecord | undefined;
};

export default function ShipFromRecord({ warehouse }: Props) {
  if (!warehouse) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ship From Warehouse</CardTitle>
          <CardDescription>
            Your ship-from location is managed by an admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            No warehouse has been assigned to your account yet. Please contact
            your admin to finish setup.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>Ship From Warehouse</CardTitle>
            <CardDescription>
              This location is used as the origin address on shipping labels.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">ID: {warehouse.warehouseId}</Badge>
            {warehouse.isDefault ? (
              <Badge variant="secondary">Default</Badge>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ShipFromDetails warehouse={warehouse} />
      </CardContent>
    </Card>
  );
}
