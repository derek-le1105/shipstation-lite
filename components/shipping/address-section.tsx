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
import { FileWarning, Loader2 } from "lucide-react";
import { US_STATE_CODES } from "@/lib/shipping-label/state-codes";
import { Switch } from "../ui/switch";

export function AddressSection({
  prefix,
  title,
  addresses,
  mode,
  setMode,
  pending,
  formRef,
}: {
  prefix: "from" | "to";
  title: string;
  addresses: AddressRecord[];
  mode: AddressMode;
  setMode: (mode: AddressMode) => void;
  pending: boolean;
  formRef: React.RefObject<HTMLFormElement | null>;
}) {
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
          if (key.startsWith(`to.`)) formData.append(key.slice(3), value);
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

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const handleFormChange = () => {
      if (formEventTimeoutRef.current !== null) {
        window.clearTimeout(formEventTimeoutRef.current);
      }
      formEventTimeoutRef.current = window.setTimeout(() => {
        formEventTimeoutRef.current = null;
        addressFormUpdated();
      }, 0);
    };

    form.addEventListener("input", handleFormChange);
    form.addEventListener("change", handleFormChange);

    return () => {
      form.removeEventListener("input", handleFormChange);
      form.removeEventListener("change", handleFormChange);
      if (formEventTimeoutRef.current !== null) {
        window.clearTimeout(formEventTimeoutRef.current);
        formEventTimeoutRef.current = null;
      }
    };
  }, [formRef, addressFormUpdated]);

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

  return (
    <Fieldset title={title}>
      <div className="flex flex-wrap gap-4 text-sm">
        <Label className="flex items-center gap-2">
          <Input
            type="radio"
            name={`${prefix}.mode`}
            value="saved"
            checked={mode === "saved"}
            onChange={() => setMode("saved")}
            disabled={addresses.length === 0 || pending}
            className="h-4 w-4"
          />
          Use saved address
        </Label>
        <Label className="flex items-center gap-2">
          <Input
            type="radio"
            name={`${prefix}.mode`}
            value="new"
            checked={mode === "new"}
            onChange={() => setMode("new")}
            disabled={pending}
            className="h-4 w-4"
          />
          Enter new address
        </Label>
      </div>

      {mode === "saved" ? (
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}-addressId`}>Select address</Label>
          <Select
            name={`${prefix}.addressId`}
            disabled={addresses.length === 0 || pending}
            required={addresses.length > 0}
            defaultValue={addresses[0]?.id ?? ""}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an address" />
            </SelectTrigger>
            <SelectContent>
              {addresses.length === 0 ? (
                <SelectItem value="">No saved addresses available</SelectItem>
              ) : (
                addresses.map((address) => (
                  <SelectItem key={address.id} value={address.id}>
                    {address.label ??
                      address.contact_name ??
                      address.address_line1 ??
                      ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="gap-2 col-span-2">
            <Label htmlFor={`${prefix}-label`}>Nickname</Label>
            <Input
              id={`${prefix}-label`}
              name={`${prefix}.label`}
              placeholder="Warehouse A"
              disabled={pending}
            />
          </div>
          <div className="gap-2 col-span-2">
            <Label htmlFor={`${prefix}-contact_name`}>
              Contact Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}-contact_name`}
              name={`${prefix}.contact_name`}
              placeholder="Jane Smith"
              required
              disabled={pending}
            />
          </div>
          <div className="gap-2 md:col-span-2">
            <Label htmlFor={`${prefix}-company`}>Company</Label>
            <Input
              id={`${prefix}-company`}
              name={`${prefix}.company`}
              placeholder="Acme Corp"
              disabled={pending}
            />
          </div>
          <div className="gap-2 md:col-span-2">
            <Label htmlFor={`${prefix}-phone`}>
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}-phone`}
              name={`${prefix}.phone`}
              placeholder="555-123-4567"
              required
              disabled={pending}
            />
          </div>
          <div className="gap-2 col-span-full">
            <Label htmlFor={`${prefix}-email`}>Email</Label>
            <Input
              id={`${prefix}-email`}
              name={`${prefix}.email`}
              type="email"
              placeholder="warehouse@example.com"
              disabled={pending}
            />
          </div>
          <div className="gap-2 md:col-span-4">
            <Label htmlFor={`${prefix}-address_line1`}>
              Address Line 1 <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}-address_line1`}
              name={`${prefix}.address_line1`}
              placeholder="123 Market St"
              required
              disabled={pending}
            />
          </div>
          <div className="gap-2 md:col-span-4">
            <Label htmlFor={`${prefix}-address_line2`}>
              Address Line 2 <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}-address_line2`}
              name={`${prefix}.address_line2`}
              placeholder="Suite 200"
              disabled={pending}
            />
          </div>
          <div className="gap-2 md:col-span-2">
            <Label htmlFor={`${prefix}-city`}>
              City <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}-city`}
              name={`${prefix}.city`}
              placeholder="Austin"
              required
              disabled={pending}
            />
          </div>
          <div className="gap-2">
            <Label htmlFor={`${prefix}.state`}>
              State <span className="text-red-500">*</span>
            </Label>
            <Select name={`${prefix}.state`} required>
              <SelectTrigger
                className="w-full"
                id={`${prefix}.state`}
                name={`${prefix}.state`}
              >
                <SelectValue placeholder="CA" />
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
          <div className="gap-2">
            <Label htmlFor={`${prefix}-postal_code`}>
              Postal Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`${prefix}-postal_code`}
              name={`${prefix}.postal_code`}
              placeholder="73301"
              required
              disabled={pending}
            />
          </div>
          <div className="flex justify-between items-center gap-2 col-span-full">
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
          <div className="flex justify-between items-center gap-2 col-span-full">
            <Label
              htmlFor={`${prefix}-is_residential`}
              className="text-sm text-muted-foreground"
            >
              Save this address for future labels?
            </Label>
            <div className="grid grid-cols-2 items-center justify-between gap-4">
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
          <div className="md:col-span-full">
            {validAddressStatus !== "valid" ? (
              <Button
                type="button"
                className="cursor-pointer"
                onClick={handleValidateAddress}
              >
                {ValidateButton}
              </Button>
            ) : (
              <>
                <div className="flex gap-2">
                  <span className="text-sm font-medium text-emerald-600 h-9 px-4 py-2">
                    Address Validated
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Fieldset>
  );
}
