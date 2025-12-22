import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Fieldset } from "../ui/fieldset";
import useNextOrderNumber from "@/hooks/use-next-order-number";

import type {
  ShipStationCarrier,
  ShipStationService,
} from "@/lib/shipstation/types";

export function ShipmentDetailsSection({
  isPending,
  selectedCarrier,
  selectedService,
  carriers,
  services,
  setSelectedCarrier,
  setSelectedService,
}: {
  isPending: boolean;
  selectedCarrier: string;
  selectedService: string;
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  setSelectedCarrier: (code: string) => void;
  setSelectedService: (code: string) => void;
}) {
  const { data, isPending: orderNumberPending, error } = useNextOrderNumber();
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="carrier">Carrier</Label>
        <Select
          name="carrierCode"
          disabled={isPending}
          value={selectedCarrier}
          onValueChange={(value) => setSelectedCarrier(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a carrier" />
          </SelectTrigger>
          <SelectContent>
            {carriers.map((carrier) => (
              <SelectItem key={carrier.code} value={carrier.code}>
                {carrier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="serviceCode">Service</Label>
        <Select
          name="serviceCode"
          disabled={isPending}
          value={selectedService}
          onValueChange={(value) => setSelectedService(value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent>
            {services
              .filter((service) => service.code.length > 0)
              .map((service) => {
                const value = service.code;
                const key = `${service.carrierCode}-${value}`;
                return (
                  <SelectItem key={key} value={value}>
                    {service.name}
                  </SelectItem>
                );
              })}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="orderNumber">Order Number</Label>
        <Input
          id="orderNumber"
          name="orderNumber"
          placeholder={data ?? "UNS-SM-#"}
          disabled={isPending || orderNumberPending}
        />
      </div>
    </div>
  );
}
