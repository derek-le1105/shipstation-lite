import { WarehouseRecord } from "@/lib/supabase/warehouses";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import ShipFromDetails from "../ship-from-details";

type Props = { warehouse: WarehouseRecord };

export default function ShipFromPopover({ warehouse }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">View Ship From</Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" className="md:w-150" align="end">
        <ShipFromDetails warehouse={warehouse} />
      </PopoverContent>
    </Popover>
  );
}
