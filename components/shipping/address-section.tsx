import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressMode } from "./types";
import { AddressRecord } from "@/lib/supabase/addresses";
import { Fieldset } from "../ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { validateAddress } from "@/lib/fedex/lib";
import { FileWarning, Loader2, TriangleAlert } from "lucide-react";
import { US_STATE_CODES } from "@/lib/shipping-label/state-codes";
import { Switch } from "../ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { formatPhoneNumber } from "@/lib/utils";

export function AddressSection({
  prefix,
  title,
  addresses,
  setMode,
  pending,
  formRef,
}: {
  prefix: "from" | "to";
  title: string;
  addresses: AddressRecord[];
  setMode: (mode: AddressMode) => void;
  pending: boolean;
  formRef: React.RefObject<HTMLFormElement | null>;
}) {
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses[0]?.id
  );
  const [isResidential, setIsResidential] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const formEventTimeoutRef = useRef<number | null>(null);

  const [validAddressStatus, setValidAddressStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >("idle");

  const addressFormUpdated = useCallback(() => {
    if (!formRef.current) return;
    setValidAddressStatus("idle");
  }, [formRef]);

  const handleValidateAddress = async () => {
    try {
      setValidAddressStatus("validating");
      const formData = new FormData();
      const form = document.getElementById("create-label-form");
      if (form) {
        const formElement = form as HTMLFormElement;
        const currentFormData = new FormData(formElement);
        for (const [key, value] of currentFormData.entries()) {
          if (key.startsWith(`${prefix}.`))
            formData.append(key.slice(prefix.length + 1), value);
        }
      }
      const { valid, issues } = await validateAddress(formData);
      if (valid) setValidAddressStatus("valid");
      else {
        toast.info(issues[0]?.message || "Address validation failed");

        setValidAddressStatus("invalid");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation error");
    }
  };

  const selectedAddress = useMemo(() => {
    const address = addresses.find(({ id }) => id === selectedAddressId);
    if (!address) return null;
    return address;
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    // Only react to changes from specific fields in this section
    const watchedSuffixes = new Set([
      "contact_name",
      "phone",
      "address_line1",
      "address_line2",
      "city",
      "state",
      "postal_code",
      // add/remove keys as desired
    ]);

    const handleFormChange = (event: Event) => {
      const target = event.target as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      const name = target?.name;
      if (!name) return;

      const [namePrefix, key] = name.split(".");
      if (namePrefix !== prefix) return; // ignore changes from other sections
      if (!watchedSuffixes.has(key)) return; // ignore non-watched fields

      if (formEventTimeoutRef.current !== null) {
        window.clearTimeout(formEventTimeoutRef.current);
      }
      formEventTimeoutRef.current = window.setTimeout(() => {
        formEventTimeoutRef.current = null;
        addressFormUpdated();
      }, 0);
    };

    form.addEventListener("input", handleFormChange as EventListener);
    form.addEventListener("change", handleFormChange as EventListener);

    return () => {
      form.removeEventListener("input", handleFormChange as EventListener);
      form.removeEventListener("change", handleFormChange as EventListener);
      if (formEventTimeoutRef.current !== null) {
        window.clearTimeout(formEventTimeoutRef.current);
        formEventTimeoutRef.current = null;
      }
    };
  }, [formRef, addressFormUpdated, prefix]);

  const ValidateButton = useMemo(() => {
    switch (validAddressStatus) {
      case "idle":
        return <span>Validate address</span>;
      case "validating":
        return (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Validating...</span>
          </>
        );
      case "invalid":
        return (
          <>
            <FileWarning className="" />
            <span>Invalid address</span>
          </>
        );
    }
  }, [validAddressStatus]);

  useEffect(() => {
    if (!selectedAddress) return;
    const { is_residential, is_validated } = selectedAddress;
    setIsResidential(is_residential);
    setValidAddressStatus(is_validated ? "valid" : "idle");
  }, [selectedAddress]);

  return (
    <Fieldset title={title}>
      <div className="grid gap-2">
        <Label htmlFor={`${prefix}-addressId`}>Select address</Label>
        <Select
          name={`${prefix}.addressId`}
          disabled={addresses.length === 0 || pending}
          required={addresses.length > 0}
          defaultValue={addresses[0]?.id ?? ""}
          onValueChange={(value) => {
            const mode = value === "new-address" ? "new" : "saved";
            setMode(mode);
            setSelectedAddressId(value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an address" />
          </SelectTrigger>
          <SelectContent>
            {addresses.map((address) => (
              <SelectItem key={address.id} value={address.id}>
                {address.label ??
                  address.contact_name ??
                  address.address_line1 ??
                  ""}
              </SelectItem>
            ))}
            <SelectItem value="new-address">Create New Address</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="min-w-0 gap-2 col-span-2">
          <Label htmlFor={`${prefix}-label`}>Nickname</Label>
          <Input
            id={`${prefix}-label`}
            name={`${prefix}.label`}
            placeholder={"Warehouse A"}
            disabled={pending}
            defaultValue={selectedAddress?.label ?? ""}
          />
        </div>
        <div className="min-w-0 gap-2 col-span-2">
          <Label htmlFor={`${prefix}-contact_name`}>
            Contact Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`${prefix}-contact_name`}
            name={`${prefix}.contact_name`}
            placeholder="Jane Smith"
            required
            disabled={pending}
            defaultValue={selectedAddress?.contact_name ?? ""}
          />
        </div>
        <div className="min-w-0 gap-2 md:col-span-2">
          <Label htmlFor={`${prefix}-company`}>Company</Label>
          <Input
            id={`${prefix}-company`}
            name={`${prefix}.company`}
            placeholder={selectedAddress ? "" : "Acme Corp"}
            disabled={pending}
            defaultValue={selectedAddress?.company ?? ""}
          />
        </div>
        <div className="min-w-0 gap-2 md:col-span-2">
          <Label htmlFor={`${prefix}-phone`}>
            Phone <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`${prefix}-phone`}
            name={`${prefix}.phone`}
            placeholder={selectedAddress ? "" : "555-123-4567"}
            required
            disabled={pending}
            defaultValue={formatPhoneNumber(selectedAddress?.phone ?? "")}
          />
        </div>
        <div className="min-w-0 gap-2 col-span-full">
          <Label htmlFor={`${prefix}-email`}>Email</Label>
          <Input
            id={`${prefix}-email`}
            name={`${prefix}.email`}
            type="email"
            placeholder={selectedAddress ? "" : "warehouse@example.com"}
            disabled={pending}
            defaultValue={selectedAddress?.email ?? ""}
          />
        </div>
        <div className="min-w-0 gap-2 col-span-2 md:col-span-4">
          <Label htmlFor={`${prefix}-address_line1`}>
            Address Line 1 <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`${prefix}-address_line1`}
            name={`${prefix}.address_line1`}
            placeholder={selectedAddress ? "" : "123 Market St"}
            required
            disabled={pending}
            defaultValue={selectedAddress?.address_line1 ?? ""}
          />
        </div>
        <div className="min-w-0 gap-2 col-span-2 md:col-span-4">
          <Label htmlFor={`${prefix}-address_line2`}>Address Line 2</Label>
          <Input
            id={`${prefix}-address_line2`}
            name={`${prefix}.address_line2`}
            placeholder={selectedAddress ? "" : "Suite 200"}
            disabled={pending}
            defaultValue={selectedAddress?.address_line2 ?? ""}
          />
        </div>
        <div className="min-w-0 gap-2 col-span-2">
          <Label htmlFor={`${prefix}-city`}>
            City <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`${prefix}-city`}
            name={`${prefix}.city`}
            placeholder={selectedAddress ? "" : "Rosemead"}
            required
            disabled={pending}
            defaultValue={selectedAddress?.city ?? ""}
          />
        </div>
        <div className="min-w-0 gap-2">
          <Label htmlFor={`${prefix}.state`}>
            State <span className="text-red-500">*</span>
          </Label>
          <Select
            name={`${prefix}.state`}
            required
            defaultValue={selectedAddress?.state}
          >
            <SelectTrigger
              className="w-full"
              id={`${prefix}.state`}
              name={`${prefix}.state`}
            >
              <SelectValue placeholder="California" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(US_STATE_CODES).map(([code, name]) => (
                <SelectItem key={code} value={code}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0 gap-2">
          <Label htmlFor={`${prefix}-postal_code`}>
            Postal Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`${prefix}-postal_code`}
            name={`${prefix}.postal_code`}
            placeholder={selectedAddress ? "" : "73301"}
            required
            disabled={pending}
            defaultValue={selectedAddress?.postal_code ?? ""}
          />
        </div>
        <div className="flex justify-between items-center gap-2 col-span-full min-w-0">
          <Label
            htmlFor={`${prefix}.is_residential`}
            className="text-sm text-muted-foreground"
          >
            Residential address?
          </Label>
          <div className="grid grid-cols-2 items-center gap-4">
            <Switch
              id={`${prefix}.is_residential`}
              name={`${prefix}.is_residential`}
              checked={isResidential}
              onCheckedChange={setIsResidential}
            />
            <span className="text-sm text-muted-foreground">
              {isResidential ? "Yes" : "No"}
            </span>
          </div>
        </div>
        {!selectedAddress && (
          <div className="flex justify-between items-center gap-2 col-span-full min-w-0">
            <Label
              htmlFor={`${prefix}-is_residential`}
              className="text-sm text-muted-foreground"
            >
              Save this address?
            </Label>
            <div className="grid grid-cols-2 items-center gap-4">
              <Switch
                id={`${prefix}-save`}
                name={`${prefix}.save`}
                checked={saveAddress}
                onCheckedChange={setSaveAddress}
              />
              <span className="text-sm text-muted-foreground">
                {saveAddress ? "Yes" : "No"}
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center gap-2 col-span-full min-w-0">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`${prefix}.is_residential`}
              className="text-sm text-muted-foreground"
            >
              Address Status
            </Label>
            {validAddressStatus !== "valid" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <TriangleAlert className="text-sm text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <span>
                    If this address is not validated, a correction fee of $17
                    might be applied.
                  </span>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <input
            type="hidden"
            name={`${prefix}.is_validated`}
            value={validAddressStatus === "valid" ? "on" : "off"}
          />
          {validAddressStatus !== "valid" ? (
            <Button
              type="button"
              className="cursor-pointer"
              onClick={handleValidateAddress}
            >
              {ValidateButton}
            </Button>
          ) : (
            <span className="text-sm font-medium text-emerald-600">
              Validated
            </span>
          )}
        </div>
      </div>
    </Fieldset>
  );
}
