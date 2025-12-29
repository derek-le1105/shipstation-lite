import { WarehouseRecord } from "@/lib/supabase/warehouses";
import { formatPhoneNumber } from "@/lib/utils";
import { Badge } from "./ui/badge";

type Props = { warehouse: WarehouseRecord };

export default function ShipFromDetails({ warehouse }: Props) {
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
    <div className="grid gap-2 md:grid-cols-2">
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
          <div>{warehouse.originAddress_company || "No company listed"}</div>
          <div>
            {warehouse.originAddress_phone
              ? formatPhoneNumber(warehouse.originAddress_phone)
              : "No phone number listed"}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">
            {warehouse.originAddress_residential ? "Residential" : "Commercial"}
          </Badge>
          {warehouse.originAddress_addressVerified ? (
            <Badge variant="secondary">Address Verified</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
