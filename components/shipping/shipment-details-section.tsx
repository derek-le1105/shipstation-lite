import { useState } from "react";
import { AlertCircleIcon, Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import useNextOrderNumber from "@/hooks/use-next-order-number";
import { useCheckOrderNumber } from "@/hooks/use-check-order-number";

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
  formRef,
}: {
  isPending: boolean;
  selectedCarrier: string;
  selectedService: string;
  carriers: ShipStationCarrier[];
  services: ShipStationService[];
  setSelectedCarrier: (code: string) => void;
  setSelectedService: (code: string) => void;
  formRef: React.RefObject<HTMLFormElement | null>;
}) {
  const { data, isPending: orderNumberPending } = useNextOrderNumber();
  const [orderNumber, setOrderNumber] = useState("");

  const {
    isAddressMismatch,
    isCrossUserDuplicate,
    existingAddress,
    isChecking,
  } = useCheckOrderNumber(orderNumber, formRef);

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
          <SelectTrigger className="w-full" id="carrier">
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
          <SelectTrigger className="w-full" id="serviceCode">
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
        <div className="relative">
          <Input
            id="orderNumber"
            name="orderNumber"
            placeholder={data ?? "UNS-SM-#"}
            disabled={isPending || orderNumberPending}
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
          {isChecking && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        {isCrossUserDuplicate && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700">
            <AlertCircleIcon />
            <AlertTitle>Order number already in use</AlertTitle>
            <AlertDescription>
              <p>
                Order <strong>{orderNumber.trim()}</strong> is already
                associated with an existing label.
              </p>
              <p>
                Please enter another order number to avoid conflicts with the
                existing label.
              </p>
            </AlertDescription>
          </Alert>
        )}
        {isAddressMismatch && existingAddress && (
          <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700">
            <AlertCircleIcon />
            <AlertTitle>Order number already exists</AlertTitle>
            <AlertDescription>
              <p>
                Order <strong>{orderNumber.trim()}</strong> already exists with
                a different shipping address:
              </p>
              <p className="font-medium">
                {existingAddress.name && `${existingAddress.name}, `}
                {existingAddress.street1}, {existingAddress.city},{" "}
                {existingAddress.state} {existingAddress.postalCode}
              </p>
              <p>Creating a label will use the existing order.</p>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
