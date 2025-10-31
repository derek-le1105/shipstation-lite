import { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fieldset } from "../ui/fieldset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PackageRecord } from "@/lib/supabase/packages";

export function PackageDetailsSection({
  isPending,
  priceContent,
  packages,
}: {
  isPending: boolean;
  priceContent: ReactNode;
  packages: PackageRecord[];
}) {
  return (
    <Fieldset title="Package Details">
      <div className="flex justify-between">
        <span className="text-sm font-medium">Package 1</span>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="grid gap-2">
          <Label htmlFor="dimensions-length">Length</Label>
          <Input
            id="dimensions-length"
            name="dimensions.length"
            type="number"
            step="0.1"
            min="0"
            placeholder="10"
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dimensions-width">Width</Label>
          <Input
            id="dimensions-width"
            name="dimensions.width"
            type="number"
            step="0.1"
            min="0"
            placeholder="6"
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dimensions-height">Height</Label>
          <Input
            id="dimensions-height"
            name="dimensions.height"
            type="number"
            step="0.1"
            min="0"
            placeholder="4"
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dimensions-unit">Dimension unit</Label>
          <Select
            name="dimensions.unit"
            disabled={isPending}
            defaultValue="inches"
          >
            <SelectTrigger className="w-full">
              <SelectValue defaultValue="inches" placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inches">Inches</SelectItem>
              <SelectItem value="centimeters">Centimeters</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="weight-value">Weight</Label>
          <Input
            id="weight-value"
            name="weight.value"
            type="number"
            step="0.1"
            min="0"
            placeholder="16"
            required
            disabled={isPending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="weight-unit">Weight unit</Label>
          <Select name="weight.unit" disabled={isPending} defaultValue="pounds">
            <SelectTrigger className="w-full">
              <SelectValue defaultValue="pounds" placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pounds">Pounds</SelectItem>
              <SelectItem value="ounces">Ounces</SelectItem>
              <SelectItem value="grams">Grams</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmation">Confirmation</Label>
          <Select
            name="confirmation"
            disabled={isPending}
            defaultValue="delivery"
          >
            <SelectTrigger className="w-full">
              <SelectValue
                defaultValue="delivery"
                placeholder="Select confirmation"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="signature">Signature</SelectItem>
              <SelectItem value="adult_signature">Adult Signature</SelectItem>
              <SelectItem value="direct_signature">Direct Signature</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Price</Label>
          {priceContent}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button">Add Package</Button>
      </div>
      {/* <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="test-label"
          name="testLabel"
          value="true"
          disabled={isPending}
        />
        <Label htmlFor="test-label" className="text-sm text-muted-foreground">
          Generate as a test label
        </Label>
      </div> */}
    </Fieldset>
  );
}
