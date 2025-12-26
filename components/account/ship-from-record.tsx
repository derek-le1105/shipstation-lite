import { WarehouseRecord } from "@/lib/supabase/warehouses";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPhoneNumber } from "@/lib/utils";

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

  const addressLine = [
    warehouse.originAddress_street1,
    warehouse.originAddress_street2,
    warehouse.originAddress_street3,
  ]
    .filter(Boolean)
    .join(", ");
  const cityStatePostal = [
    warehouse.originAddress_city,
    warehouse.originAddress_state,
    warehouse.originAddress_postalCode,
  ]
    .filter(Boolean)
    .join(", ");

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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold">Address</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {warehouse.warehouseName || "Warehouse"}
              </div>
              <div>{addressLine || "Address not available"}</div>
              <div>{cityStatePostal || "City, state, postal code missing"}</div>
              <div>{warehouse.originAddress_country || "US"}</div>
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold">Contact</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="font-medium text-foreground">
                {warehouse.originAddress_name || "No contact name on file"}
              </div>
              <div>
                {warehouse.originAddress_company || "No company listed"}
              </div>
              <div>
                {warehouse.originAddress_phone
                  ? formatPhoneNumber(warehouse.originAddress_phone)
                  : "No phone number listed"}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">
                {warehouse.originAddress_residential
                  ? "Residential"
                  : "Commercial"}
              </Badge>
              {warehouse.originAddress_addressVerified ? (
                <Badge variant="secondary">Address Verified</Badge>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
