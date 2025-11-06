"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { FileWarning, Loader2, PlusCircle } from "lucide-react";

import {
  createAddressAction,
  deleteAddressAction,
  updateAddressAction,
  type AddressMutationState,
} from "@/lib/actions/addresses";
import type { AddressInput, AddressRecord } from "@/lib/supabase/addresses";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateAddress } from "@/lib/fedex/lib";
import { toast } from "sonner";

type AddressManagerProps = {
  shipFrom: AddressRecord[];
  shipTo: AddressRecord[];
};

type AddressKind = AddressRecord["address_kind"];

type FeedbackState =
  | { variant: "success"; message: string }
  | { variant: "error"; message: string }
  | null;

const initialAddressMutationState: AddressMutationState = {
  status: "idle",
};

export function AddressManager({ shipFrom, shipTo }: AddressManagerProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AddressKindSection
        title="Ship-from addresses"
        description="Update the locations you originate shipments from."
        kind="ship_from"
        initialAddresses={shipFrom}
      />
      <AddressKindSection
        title="Ship-to addresses"
        description="Maintain the destinations you frequently ship to."
        kind="ship_to"
        initialAddresses={shipTo}
      />
    </div>
  );
}

function AddressKindSection({
  title,
  description,
  kind,
  initialAddresses,
}: {
  title: string;
  description: string;
  kind: AddressKind;
  initialAddresses: AddressRecord[];
}) {
  const [createState, createAction, createPending] = useActionState<
    AddressMutationState,
    FormData
  >(createAddressAction, initialAddressMutationState);
  const [updateState, updateAction, updatePending] = useActionState<
    AddressMutationState,
    FormData
  >(updateAddressAction, initialAddressMutationState);
  const [deleteState, deleteAction, deletePending] = useActionState<
    AddressMutationState,
    FormData
  >(deleteAddressAction, initialAddressMutationState);

  const [addresses, setAddresses] = useState<AddressRecord[]>(initialAddresses);
  const [selectedId, setSelectedId] = useState<string>(
    initialAddresses[0]?.id ?? "new"
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  useEffect(() => {
    setSelectedId((current) => {
      if (current === "new") {
        return current;
      }
      const exists = initialAddresses.some((item) => item.id === current);
      return exists ? current : initialAddresses[0]?.id ?? "new";
    });
  }, [initialAddresses]);

  useEffect(() => {
    if (createState.status === "success" && createState.address) {
      setAddresses((current) => {
        const exists = current.some(
          (item) => item.id === createState.address!.id
        );
        if (exists) {
          return current.map((item) =>
            item.id === createState.address!.id ? createState.address! : item
          );
        }
        return [createState.address!, ...current];
      });
      setSelectedId(createState.address.id);
    }
  }, [createState]);

  useEffect(() => {
    if (updateState.status === "success" && updateState.address) {
      setAddresses((current) =>
        current.map((item) =>
          item.id === updateState.address!.id ? updateState.address! : item
        )
      );
    }
  }, [updateState]);

  useEffect(() => {
    if (deleteState.status === "success" && deleteState.addressId) {
      setAddresses((current) => {
        const next = current.filter(
          (item) => item.id !== deleteState.addressId
        );
        setSelectedId((selected) =>
          selected === deleteState.addressId ? next[0]?.id ?? "new" : selected
        );
        return next;
      });
    }
  }, [deleteState]);

  const currentAddresses = addresses;

  const selectedAddress = useMemo(() => {
    if (selectedId === "new") {
      return null;
    }
    return currentAddresses.find((item) => item.id === selectedId) ?? null;
  }, [currentAddresses, selectedId]);

  const isSubmitting = selectedId === "new" ? createPending : updatePending;

  const feedback: FeedbackState = useMemo(() => {
    if (deleteState.status === "error") {
      return {
        variant: "error",
        message: deleteState.message,
      };
    }

    if (deleteState.status === "success") {
      return {
        variant: "success",
        message: deleteState.message,
      };
    }

    if (selectedId === "new") {
      if (createState.status === "error") {
        return { variant: "error", message: createState.message };
      }
      if (createState.status === "success") {
        return { variant: "success", message: createState.message };
      }
      return null;
    }

    if (updateState.status === "error") {
      return { variant: "error", message: updateState.message };
    }

    if (
      updateState.status === "success" &&
      updateState.addressId === selectedId
    ) {
      return { variant: "success", message: updateState.message };
    }

    return null;
  }, [createState, deleteState, selectedId, updateState]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <Label htmlFor={`${kind}-select`}>Choose address</Label>
          <Select
            value={selectedId}
            onValueChange={setSelectedId}
            disabled={currentAddresses.length === 0 && selectedId !== "new"}
          >
            <SelectTrigger id={`${kind}-select`}>
              <SelectValue placeholder="Select an address" />
            </SelectTrigger>
            <SelectContent>
              {currentAddresses.map((address) => (
                <SelectItem key={address.id} value={address.id}>
                  {address.label ??
                    address.contact_name ??
                    address.address_line1 ??
                    address.city}
                </SelectItem>
              ))}
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create new address
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <form
          id={`${kind}-form`}
          key={`${kind}-${selectedId}`}
          action={selectedId === "new" ? createAction : updateAction}
          className="space-y-6"
          ref={formRef}
        >
          <input type="hidden" name="address_kind" value={kind} />
          {selectedId !== "new" ? (
            <input type="hidden" name="address_id" value={selectedId} />
          ) : null}

          <AddressFields
            addressKind={kind}
            address={selectedAddress}
            formRef={formRef}
          />

          <div className="space-y-4">
            {feedback ? (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  feedback.variant === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                    : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              {selectedId !== "new" ? (
                <Button
                  type="submit"
                  variant="destructive"
                  formAction={deleteAction}
                  formNoValidate
                  disabled={deletePending}
                >
                  {deletePending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Fill out the form to add a new address.
                </span>
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : selectedId === "new" ? (
                  "Save address"
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AddressFields({
  addressKind,
  address,
  formRef,
}: {
  addressKind: AddressInput["address_kind"];
  address: AddressRecord | null;
  formRef: React.RefObject<HTMLFormElement | null>;
}) {
  const formEventTimeoutRef = useRef<number | null>(null);

  const [validAddressStatus, setValidAddressStatus] = useState<
    "idle" | "validating" | "valid" | "invalid"
  >(address?.is_validated ? "valid" : "idle");

  const handleValidateAddress = async () => {
    try {
      setValidAddressStatus("validating");
      const formData = new FormData();
      const form = document.getElementById(addressKind + "-form");
      if (form) {
        const formElement = form as HTMLFormElement;
        const currentFormData = new FormData(formElement);
        for (const [key, value] of currentFormData.entries()) {
          formData.append(key, value);
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

  const addressFormUpdated = useCallback(() => {
    if (!formRef.current) return;
    setValidAddressStatus("idle");
  }, [formRef]);

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
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-label`}>Nickname</Label>
        <Input
          id={`${addressKind}-label`}
          name="label"
          placeholder="Warehouse A"
          defaultValue={address?.label ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-contact_name`}>Contact name</Label>
        <Input
          id={`${addressKind}-contact_name`}
          name="contact_name"
          placeholder="Jane Smith"
          defaultValue={address?.contact_name ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-company`}>Company</Label>
        <Input
          id={`${addressKind}-company`}
          name="company"
          placeholder="Acme Corp"
          defaultValue={address?.company ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-phone`}>Phone</Label>
        <Input
          id={`${addressKind}-phone`}
          name="phone"
          placeholder="555-123-4567"
          defaultValue={address?.phone ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-email`}>Email</Label>
        <Input
          id={`${addressKind}-email`}
          name="email"
          type="email"
          placeholder="warehouse@example.com"
          defaultValue={address?.email ?? ""}
        />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor={`${addressKind}-address_line1`}>Address line 1</Label>
        <Input
          id={`${addressKind}-address_line1`}
          name="address_line1"
          placeholder="123 Market St"
          defaultValue={address?.address_line1 ?? ""}
          required
        />
      </div>
      <div className="grid gap-2 md:col-span-2">
        <Label htmlFor={`${addressKind}-address_line2`}>Address line 2</Label>
        <Input
          id={`${addressKind}-address_line2`}
          name="address_line2"
          placeholder="Suite 200"
          defaultValue={address?.address_line2 ?? ""}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-city`}>City</Label>
        <Input
          id={`${addressKind}-city`}
          name="city"
          placeholder="Austin"
          defaultValue={address?.city ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-state`}>State / Province</Label>
        <Input
          id={`${addressKind}-state`}
          name="state"
          placeholder="TX"
          defaultValue={address?.state ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-postal_code`}>Postal code</Label>
        <Input
          id={`${addressKind}-postal_code`}
          name="postal_code"
          placeholder="73301"
          defaultValue={address?.postal_code ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${addressKind}-country`}>Country</Label>
        <Input
          id={`${addressKind}-country`}
          name="country"
          placeholder="US"
          defaultValue={address?.country ?? "US"}
        />
      </div>

      <div className="grid grid-cols-2 md:col-span-2">
        <div className="grid items-center justify-between">
          <div />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`${addressKind}-is_residential`}
              name="is_residential"
              value="true"
              defaultChecked={address?.is_residential ?? false}
            />
            <Label
              htmlFor={`${addressKind}-is_residential`}
              className="text-sm text-muted-foreground"
            >
              Residential address
            </Label>
          </div>
        </div>
        <input
          type="hidden"
          name="is_validated"
          value={
            address?.is_validated || validAddressStatus === "valid"
              ? "true"
              : "false"
          }
        />

        <div className="flex justify-end">
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
              <div className="flex justify-center md:justify-end gap-2">
                <span className="text-sm font-medium text-emerald-600 h-9 px-4 py-2">
                  Address Validated
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
