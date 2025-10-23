import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressMode } from "./types";
import { AddressRecord } from "@/lib/supabase/addresses";
import { Fieldset } from "../ui/fieldset";

export function AddressSection({
  prefix,
  title,
  addresses,
  mode,
  setMode,
  pending,
}: {
  prefix: "from" | "to";
  title: string;
  addresses: AddressRecord[];
  mode: AddressMode;
  setMode: (mode: AddressMode) => void;
  pending: boolean;
}) {
  return (
    <Fieldset
      title={title}
      description={
        mode === "saved"
          ? "Use one of your saved addresses."
          : "Enter a new address. You can optionally save it for later."
      }
    >
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`${prefix}.mode`}
            value="saved"
            checked={mode === "saved"}
            onChange={() => setMode("saved")}
            disabled={addresses.length === 0 || pending}
            className="h-4 w-4"
          />
          Use saved address
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`${prefix}.mode`}
            value="new"
            checked={mode === "new"}
            onChange={() => setMode("new")}
            disabled={pending}
            className="h-4 w-4"
          />
          Enter new address
        </label>
      </div>

      {mode === "saved" ? (
        <div className="grid gap-2">
          <Label htmlFor={`${prefix}-addressId`}>Select address</Label>
          <select
            id={`${prefix}-addressId`}
            name={`${prefix}.addressId`}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={addresses.length === 0 || pending}
            required={addresses.length > 0}
            defaultValue={addresses[0]?.id ?? ""}
          >
            {addresses.length === 0 ? (
              <option value="">No saved addresses available</option>
            ) : (
              addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label ??
                    address.contact_name ??
                    address.address_line1 ??
                    ""}
                </option>
              ))
            )}
          </select>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-label`}>Nickname</Label>
            <Input
              id={`${prefix}-label`}
              name={`${prefix}.label`}
              placeholder="Warehouse A"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-contact_name`}>Contact name</Label>
            <Input
              id={`${prefix}-contact_name`}
              name={`${prefix}.contact_name`}
              placeholder="Jane Smith"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-company`}>Company</Label>
            <Input
              id={`${prefix}-company`}
              name={`${prefix}.company`}
              placeholder="Acme Corp"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-phone`}>Phone</Label>
            <Input
              id={`${prefix}-phone`}
              name={`${prefix}.phone`}
              placeholder="555-123-4567"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-email`}>Email</Label>
            <Input
              id={`${prefix}-email`}
              name={`${prefix}.email`}
              type="email"
              placeholder="warehouse@example.com"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor={`${prefix}-address_line1`}>Address line 1</Label>
            <Input
              id={`${prefix}-address_line1`}
              name={`${prefix}.address_line1`}
              placeholder="123 Market St"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor={`${prefix}-address_line2`}>Address line 2</Label>
            <Input
              id={`${prefix}-address_line2`}
              name={`${prefix}.address_line2`}
              placeholder="Suite 200"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-city`}>City</Label>
            <Input
              id={`${prefix}-city`}
              name={`${prefix}.city`}
              placeholder="Austin"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-state`}>State / Province</Label>
            <Input
              id={`${prefix}-state`}
              name={`${prefix}.state`}
              placeholder="TX"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-postal_code`}>Postal code</Label>
            <Input
              id={`${prefix}-postal_code`}
              name={`${prefix}.postal_code`}
              placeholder="73301"
              required
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${prefix}-country`}>Country</Label>
            <Input
              id={`${prefix}-country`}
              name={`${prefix}.country`}
              placeholder="US"
              defaultValue="US"
              disabled={pending}
            />
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              id={`${prefix}-is_residential`}
              name={`${prefix}.is_residential`}
              value="true"
              disabled={pending}
            />
            <Label
              htmlFor={`${prefix}-is_residential`}
              className="text-sm text-muted-foreground"
            >
              Residential address
            </Label>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              id={`${prefix}-save`}
              name={`${prefix}.save`}
              value="true"
              disabled={pending}
            />
            <Label
              htmlFor={`${prefix}-save`}
              className="text-sm text-muted-foreground"
            >
              Save this address for future labels
            </Label>
          </div>
        </div>
      )}
    </Fieldset>
  );
}
