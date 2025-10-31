"use client";

import { PackageRecord } from "@/lib/supabase/packages";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useActionState, useMemo, useState } from "react";
import { Loader2, PlusCircle } from "lucide-react";
import {
  createPackageAction,
  deletePackageAction,
  PackageMutationState,
  updatePackageAction,
} from "@/lib/actions/packages";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface PackageManagerProps {
  packages: PackageRecord[];
}

type FeedbackState =
  | { variant: "success"; message: string }
  | { variant: "error"; message: string }
  | null;

export function PackageManager({ packages }: PackageManagerProps) {
  const [createState, createAction, createPending] = useActionState<
    PackageMutationState,
    FormData
  >(createPackageAction, { status: "idle" });
  const [updateState, updateAction, updatePending] = useActionState<
    PackageMutationState,
    FormData
  >(updatePackageAction, { status: "idle" });
  const [deleteState, deleteAction, deletePending] = useActionState<
    PackageMutationState,
    FormData
  >(deletePackageAction, { status: "idle" });

  const [selectedPackageId, setSelectedPackageId] = useState<string>(
    packages[0]?.id || "new"
  );

  const selectedPackage = useMemo(() => {
    if (selectedPackageId === "new") return null;
    return packages.find((pkg) => pkg.id === selectedPackageId) || null;
  }, [selectedPackageId, packages]);

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

    if (selectedPackageId === "new") {
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
      updateState.packageId === selectedPackageId
    ) {
      return { variant: "success", message: updateState.message };
    }

    return null;
  }, [createState, deleteState, selectedPackageId, updateState]);

  const isSubmitting =
    selectedPackageId === "new" ? createPending : updatePending;

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="grid gap-2">
          <Label htmlFor={"package-select"}>Choose a Package</Label>
          <Select
            value={selectedPackageId}
            onValueChange={setSelectedPackageId}
          >
            <SelectTrigger id="package-select">
              <SelectValue placeholder="Select a package" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((pkg) => (
                <SelectItem key={pkg.id} value={pkg.id}>
                  {pkg.nickname || `Package ${pkg.id}`} - {pkg.length} x{" "}
                  {pkg.width} x {pkg.height} {pkg.dimension_unit}, {pkg.weight}{" "}
                  {pkg.weight_unit}
                </SelectItem>
              ))}
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create new package
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <form
          key={selectedPackageId}
          action={selectedPackageId === "new" ? createAction : updateAction}
          className="space-y-6"
        >
          {selectedPackageId !== "new" ? (
            <input type="hidden" name="package_id" value={selectedPackageId} />
          ) : null}
          <PackageFields idPrefix="package" pkg={selectedPackage} />
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

            <div className="flex flex-wrap items-center justify-end gap-3">
              {selectedPackageId !== "new" ? (
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
                  Fill out the form to add a new package.
                </span>
              )}

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : selectedPackageId === "new" ? (
                  "Save package"
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

function PackageFields({
  idPrefix,
  pkg,
}: {
  idPrefix: string;
  pkg: PackageRecord | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="grid gap-2 md:col-span-4">
        <Label htmlFor={`${idPrefix}-nickname`}>Nickname</Label>
        <Input
          id={`${idPrefix}-nickname`}
          name="nickname"
          placeholder="Package 1"
          defaultValue={pkg?.nickname ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-length`}>Length</Label>
        <Input
          type="number"
          id={`${idPrefix}-length`}
          name="length"
          placeholder="Length"
          defaultValue={pkg?.length ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-width`}>Width</Label>
        <Input
          type="number"
          id={`${idPrefix}-width`}
          name="width"
          placeholder="Width"
          defaultValue={pkg?.width ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-height`}>Height</Label>
        <Input
          type="number"
          id={`${idPrefix}-height`}
          name="height"
          placeholder="Height"
          defaultValue={pkg?.height ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-dimension_unit`}>Units</Label>
        <Select
          defaultValue={pkg?.dimension_unit ?? "inches"}
          name="dimension_unit"
          required
        >
          <SelectTrigger id={`${idPrefix}-dimension_unit`} className="w-full">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inches">Inches</SelectItem>
            <SelectItem value="centimeters">Centimeters</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-weight`}>Weight</Label>
        <Input
          type="number"
          id={`${idPrefix}-weight`}
          name="weight"
          placeholder="Weight"
          defaultValue={pkg?.weight ?? ""}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-weight_units`}>Units</Label>
        <Select
          defaultValue={pkg?.weight_unit ?? "pounds"}
          name="weight_unit"
          required
        >
          <SelectTrigger id={`${idPrefix}-weight_units`} className="w-full">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pounds">Pounds</SelectItem>
            <SelectItem value="ounces">Ounces</SelectItem>
            <SelectItem value="grams">Grams</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
