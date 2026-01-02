import { useEffect, useMemo, useState } from "react";
import { ColumnFiltersState, Table } from "@tanstack/react-table";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { Filter, Trash } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { capitalizeWord } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { ShippingLabelWithProfile } from "@/lib/supabase/shipping-labels";

type CostFilter = {
  type: "exact" | "range";
  min: string | undefined;
  max: string | undefined;
};

const buildCostFilterSummary = (
  costFilter: CostFilter,
  next?: Partial<Record<string, string>>
) => {
  const values = { ...costFilter, ...next };
  const parts: string[] = [];

  //if neither min or max is present, dont build a cost filter summary
  if (!(values.min || values.max)) return "";

  parts.push(`Type: ${values.type}`);
  if (values.type === "exact") parts.push(`Cost = $${values.min}`);
  else {
    if (!values.max) parts.push(`Cost >= $${values.min}`);
    else if (!values.min) parts.push(`Cost <= $${values.max}`);
    else parts.push(`Cost $${values.min} - $${values.max}`);
  }

  return parts.join("\n");
};

export default function LabelFilterPopover<T>({ table }: { table: Table<T> }) {
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [service, setService] = useState<string>("");
  const [deliveryCity, setDeliveryCity] = useState<string>("");
  const [deliveryZip, setDeliveryZip] = useState<string>("");
  const [status, setStatus] = useState<"active" | "void" | undefined>();
  const [paid, setPaid] = useState<"paid" | "unpaid" | undefined>();
  const [trackingNumber, setTrackingNumber] = useState<string | undefined>();
  const [lengthMin, setLengthMin] = useState("");
  const [lengthMax, setLengthMax] = useState("");
  const [widthMin, setWidthMin] = useState("");
  const [widthMax, setWidthMax] = useState("");
  const [heightMin, setHeightMin] = useState("");
  const [heightMax, setHeightMax] = useState("");
  const [weightMin, setWeightMin] = useState("");
  const [weightMax, setWeightMax] = useState("");
  const [costFilter, setCostFilter] = useState<CostFilter>({
    type: "exact",
    min: "",
    max: "",
  });
  const [dimensionUnit, setDimensionUnit] = useState<"inches" | "centimeters">(
    "inches"
  );
  const [weightUnit, setWeightUnit] = useState<"pounds" | "ounces" | "grams">(
    "pounds"
  );

  const headerNames = table
    .getLeafHeaders()
    .filter((h) => !!h.column.columnDef.meta?.label)
    .filter((h) => !h.column.columnDef.meta?.label?.includes("Created At"))
    .map((h) => h.column.columnDef.meta?.label ?? h.column.id);

  const [selected, setSelected] = useState(headerNames[0]);
  const [filters, setFilters] = useState<
    {
      label: string;
      key: string;
      value: string;
    }[]
  >([]);

  const handleFilterChange = (label: string, key: string, value: string) => {
    debugger;
    const newFilters = [...filters];
    const filterIndex = newFilters.findIndex((f) => f.key === key);
    if (!value) {
      if (filterIndex >= 0) {
        newFilters.splice(filterIndex, 1);
      }
      setFilters(newFilters);
      return;
    }
    if (filterIndex === -1) newFilters.push({ label, key, value });
    else {
      newFilters[filterIndex] = { label, key, value };
    }
    setFilters(newFilters);
  };

  const handleDeleteFilter = (key: string) => {
    setFilters(filters.filter((f) => f.key !== key));
    table.setColumnFilters((prev) => prev.filter((f) => f.id !== key));
    switch (key) {
      case "profiles_full_name":
        setUserName("");
        break;
      case "paid_at":
        setPaid(undefined);
        break;
      case "voided_at":
        setStatus(undefined);
        break;
      case "order_number":
        setOrderNumber("");
        break;
      case "service_code":
        setService("");
        break;
      case "delivery_city":
        setDeliveryCity("");
        break;
      case "delivery_zip":
        setDeliveryZip("");
        break;
      case "tracking_number":
        setTrackingNumber("");
        break;
      case "package_dimensions":
        setLengthMin("");
        setLengthMax("");
        setWidthMin("");
        setWidthMax("");
        setHeightMin("");
        setHeightMax("");
        setWeightMin("");
        setWeightMax("");
        setDimensionUnit("inches");
        setWeightUnit("pounds");
        break;
      case "total_cost":
        setCostFilter({ type: "exact", min: "", max: "" });
        break;
      default:
        break;
    }
  };

  const buildDimensionSummary = (
    next?: Partial<Record<string, string>>
  ): string => {
    const values = {
      lengthMin,
      lengthMax,
      widthMin,
      widthMax,
      heightMin,
      heightMax,
      weightMin,
      weightMax,
      dimensionUnit,
      weightUnit,
      ...next,
    };
    const parts: string[] = [];
    const addPart = (
      label: string,
      min: string,
      max: string,
      unitLabel: string
    ) => {
      if (min && max) {
        parts.push(`${label} ${min} - ${max} ${unitLabel}`);
      } else if (min) {
        parts.push(`${label} >= ${min} ${unitLabel}`);
      } else if (max) {
        parts.push(`${label} <= ${max} ${unitLabel}`);
      }
    };
    const dimensionLabel = values.dimensionUnit === "centimeters" ? "cm" : "in";
    const weightLabel =
      values.weightUnit === "ounces"
        ? "oz"
        : values.weightUnit === "grams"
        ? "g"
        : "lb";
    addPart("Length", values.lengthMin, values.lengthMax, dimensionLabel);
    addPart("Width", values.widthMin, values.widthMax, dimensionLabel);
    addPart("Height", values.heightMin, values.heightMax, dimensionLabel);
    addPart("Weight", values.weightMin, values.weightMax, weightLabel);
    return parts.join("\n");
  };

  const hasDimensionValues = () =>
    Boolean(
      lengthMin ||
        lengthMax ||
        widthMin ||
        widthMax ||
        heightMin ||
        heightMax ||
        weightMin ||
        weightMax
    );

  const hasCostFilterValues = () => Boolean(costFilter.min || costFilter.max);

  const buildColumnFilters = (): ColumnFiltersState => {
    const toNumber = (value: string) => {
      if (!value) return undefined;
      const numberValue = Number(value);
      if (numberValue <= 0) return undefined;
      return Number.isFinite(numberValue) ? numberValue : undefined;
    };
    const next: ColumnFiltersState = [];
    if (userName) next.push({ id: "profiles_full_name", value: userName });
    if (orderNumber) next.push({ id: "order_number", value: orderNumber });
    if (service) next.push({ id: "service_code", value: service });
    if (deliveryCity) next.push({ id: "delivery_city", value: deliveryCity });
    if (deliveryZip) next.push({ id: "delivery_zip", value: deliveryZip });
    if (status) next.push({ id: "voided_at", value: status });
    if (paid) next.push({ id: "paid_at", value: paid });
    if (trackingNumber)
      next.push({ id: "tracking_number", value: trackingNumber });
    if (hasCostFilterValues())
      next.push({ id: "total_shipment_cost", value: costFilter });
    const dimensionValue = {
      minL: toNumber(lengthMin),
      maxL: toNumber(lengthMax),
      minW: toNumber(widthMin),
      maxW: toNumber(widthMax),
      minH: toNumber(heightMin),
      maxH: toNumber(heightMax),
      minWeight: toNumber(weightMin),
      maxWeight: toNumber(weightMax),
      dimensionUnit,
      weightUnit,
    };
    if (hasDimensionValues()) {
      next.push({ id: "package_dimensions", value: dimensionValue });
    }
    return next;
  };

  const columnFilters = table.getState().columnFilters;

  useEffect(() => {
    const getValue = (id: string) =>
      columnFilters.find((filter) => filter.id === id)?.value;

    const nextUsername = (getValue("profiles_full_name") as string) ?? "";
    const nextOrderNumber = (getValue("order_number") as string) ?? "";
    const nextService = (getValue("service_code") as string) ?? "";
    const nextDeliveryCity = (getValue("delivery_city") as string) ?? "";
    const nextDeliveryZip = (getValue("delivery_zip") as string) ?? "";
    const nextStatus = getValue("voided_at") as "active" | "void" | undefined;
    const nextPaid = getValue("paid_at") as "paid" | "unpaid" | undefined;
    const nextTrackingNumber =
      (getValue("tracking_number") as string | undefined) ?? "";
    const nextDimensions = (getValue("package_dimensions") as {
      minL?: number;
      maxL?: number;
      minW?: number;
      maxW?: number;
      minH?: number;
      maxH?: number;
      minWeight?: number;
      maxWeight?: number;
      dimensionUnit?: "inches" | "centimeters";
      weightUnit?: "pounds" | "ounces" | "grams";
    }) ?? {
      minL: undefined,
      maxL: undefined,
      minW: undefined,
      maxW: undefined,
      minH: undefined,
      maxH: undefined,
      minWeight: undefined,
      maxWeight: undefined,
      dimensionUnit: "inches",
      weightUnit: "pounds",
    };
    const nextCostFilter = (getValue("total_shipment_cost") as CostFilter) ?? {
      type: "exact",
    };

    setUserName(nextUsername);
    setOrderNumber(nextOrderNumber);
    setService(nextService);
    setDeliveryCity(nextDeliveryCity);
    setDeliveryZip(nextDeliveryZip);
    setStatus(nextStatus);
    setPaid(nextPaid);
    setTrackingNumber(nextTrackingNumber);
    setLengthMin(
      nextDimensions.minL !== undefined ? String(nextDimensions.minL) : ""
    );
    setLengthMax(
      nextDimensions.maxL !== undefined ? String(nextDimensions.maxL) : ""
    );
    setWidthMin(
      nextDimensions.minW !== undefined ? String(nextDimensions.minW) : ""
    );
    setWidthMax(
      nextDimensions.maxW !== undefined ? String(nextDimensions.maxW) : ""
    );
    setHeightMin(
      nextDimensions.minH !== undefined ? String(nextDimensions.minH) : ""
    );
    setHeightMax(
      nextDimensions.maxH !== undefined ? String(nextDimensions.maxH) : ""
    );
    setWeightMin(
      nextDimensions.minWeight !== undefined
        ? String(nextDimensions.minWeight)
        : ""
    );
    setWeightMax(
      nextDimensions.maxWeight !== undefined
        ? String(nextDimensions.maxWeight)
        : ""
    );
    setDimensionUnit(nextDimensions.dimensionUnit ?? "inches");
    setWeightUnit(nextDimensions.weightUnit ?? "pounds");
    setCostFilter(nextCostFilter);

    const nextSelected = [];
    if (nextUsername) {
      nextSelected.push({
        label: "User is",
        key: "profiles_full_name",
        value: nextUsername,
      });
    }
    if (nextOrderNumber) {
      nextSelected.push({
        label: "Order Number is",
        key: "order_number",
        value: nextOrderNumber,
      });
    }
    if (nextService) {
      nextSelected.push({
        label: "Service is",
        key: "service_code",
        value: nextService,
      });
    }
    if (nextDeliveryCity) {
      nextSelected.push({
        label: "Delivery City is",
        key: "delivery_city",
        value: nextDeliveryCity,
      });
    }
    if (nextDeliveryZip) {
      nextSelected.push({
        label: "Delivery Zip is",
        key: "delivery_zip",
        value: nextDeliveryZip,
      });
    }
    if (nextStatus) {
      nextSelected.push({
        label: "Labels are",
        key: "voided_at",
        value: nextStatus,
      });
    }
    if (nextPaid) {
      nextSelected.push({
        label: "Labels are",
        key: "paid_at",
        value: nextPaid,
      });
    }
    if (nextTrackingNumber) {
      nextSelected.push({
        label: "Tracking Number is",
        key: "tracking_number",
        value: nextTrackingNumber,
      });
    }
    const dimensionSummary = buildDimensionSummary({
      lengthMin:
        nextDimensions.minL !== undefined ? String(nextDimensions.minL) : "",
      lengthMax:
        nextDimensions.maxL !== undefined ? String(nextDimensions.maxL) : "",
      widthMin:
        nextDimensions.minW !== undefined ? String(nextDimensions.minW) : "",
      widthMax:
        nextDimensions.maxW !== undefined ? String(nextDimensions.maxW) : "",
      heightMin:
        nextDimensions.minH !== undefined ? String(nextDimensions.minH) : "",
      heightMax:
        nextDimensions.maxH !== undefined ? String(nextDimensions.maxH) : "",
      weightMin:
        nextDimensions.minWeight !== undefined
          ? String(nextDimensions.minWeight)
          : "",
      weightMax:
        nextDimensions.maxWeight !== undefined
          ? String(nextDimensions.maxWeight)
          : "",
      dimensionUnit: nextDimensions.dimensionUnit ?? "inches",
      weightUnit: nextDimensions.weightUnit ?? "pounds",
    });
    if (dimensionSummary) {
      nextSelected.push({
        label: "Package Dimensions",
        key: "package_dimensions",
        value: dimensionSummary,
      });
    }

    const costFilterSummary = buildCostFilterSummary(costFilter, {
      type: nextCostFilter.type !== undefined ? nextCostFilter.type : "",
      min: nextCostFilter.min !== undefined ? nextCostFilter.min : "",
      max: nextCostFilter.max !== undefined ? nextCostFilter.max : "",
    });

    if (costFilterSummary)
      nextSelected.push({
        label: "Total Cost",
        key: "total_shipment_cost",
        value: costFilterSummary,
      });
    setFilters(nextSelected);
  }, [columnFilters]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm">
          <Filter />
          Filters
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[720px] p-0" align="end">
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-xl">
          <div className="grid grid-cols-[220px_1fr_220px] border-b border-border">
            <div className="px-5 py-4 text-lg font-semibold">Filters</div>
            <div className="border-x border-border px-5 py-3" />
            <div className="px-5 py-4 text-right text-sm text-muted-foreground">
              {Object.keys(filters).length} filters selected
            </div>
          </div>

          <div className="grid grid-cols-[220px_1fr_220px] min-h-[360px]">
            <div className="border-r border-border px-4 py-3">
              <div className="space-y-2 text-sm">
                {headerNames.map((name) => (
                  <Button
                    key={name}
                    variant="ghost"
                    className={`w-full rounded-md px-2 py-2 justify-start ${
                      selected === name
                        ? "bg-sky-500/20 text-sky-600 dark:text-sky-300"
                        : "text-foreground/90 hover:bg-muted"
                    }`}
                    type="button"
                    onClick={() => {
                      setSelected(name);
                    }}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-r border-border px-4 py-3">
              <div className="mb-3 text-sm text-muted-foreground">
                {selected === "User" && (
                  <UserFilter
                    userName={userName}
                    setUserName={setUserName}
                    handleFilterChange={handleFilterChange}
                    table={table}
                  />
                )}
                {selected === "Order Number" && (
                  <>
                    <Label>Order Number</Label>
                    <Input
                      placeholder="UNS-SM-111"
                      value={orderNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        setOrderNumber(value);
                        handleFilterChange(
                          "Order Number is",
                          "order_number",
                          value
                        );
                      }}
                    />
                  </>
                )}
                {selected === "Delivery City" && (
                  <>
                    <Label>Delivery City</Label>
                    <Input
                      placeholder="Rosemead"
                      value={deliveryCity}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDeliveryCity(value);
                        handleFilterChange(
                          "Delivery City is",
                          "delivery_city",
                          value
                        );
                      }}
                    />
                  </>
                )}
                {selected === "Delivery Zip" && (
                  <>
                    <Label>Delivery Zip</Label>
                    <Input
                      placeholder="91770"
                      value={deliveryZip}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDeliveryZip(value);
                        handleFilterChange(
                          "Delivery Zip is",
                          "delivery_zip",
                          value
                        );
                      }}
                    />
                  </>
                )}
                {selected === "Service" && (
                  <>
                    <Label>Service</Label>
                    <Input
                      placeholder="FedEx Ground"
                      value={service}
                      onChange={(e) => {
                        const value = e.target.value;
                        setService(value);
                        handleFilterChange("Service is", "service_code", value);
                      }}
                    />
                  </>
                )}
                {selected === "Tracking Number" && (
                  <>
                    <Label>Tracking Number</Label>
                    <Input
                      placeholder="1234567890"
                      value={trackingNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTrackingNumber(value);
                        handleFilterChange(
                          "Tracking Number is",
                          "tracking_number",
                          value
                        );
                      }}
                    />
                  </>
                )}
                {selected === "Paid" && (
                  <PaidFilter
                    paid={paid}
                    setPaid={setPaid}
                    handleFilterChange={handleFilterChange}
                  />
                )}
                {selected === "Status" && (
                  <StatusFilter
                    status={status}
                    setStatus={setStatus}
                    handleFilterChange={handleFilterChange}
                  />
                )}
                {selected === "Package Dimensions" && (
                  <div className="flex flex-col gap-3">
                    <Label>Package Dimensions</Label>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="text-muted-foreground">Length</div>
                        <Input
                          type="number"
                          placeholder="Min"
                          value={lengthMin}
                          onChange={(e) => {
                            const value = e.target.value;
                            setLengthMin(value);
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({ lengthMin: value })
                            );
                          }}
                        />
                      </div>
                      <div className="text-muted-foreground pb-2">to</div>
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={lengthMax}
                          onChange={(e) => {
                            const value = e.target.value;
                            setLengthMax(value);
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({ lengthMax: value })
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="text-muted-foreground">Width</div>
                        <Input
                          type="number"
                          placeholder="Min"
                          value={widthMin}
                          onChange={(e) => {
                            const value = e.target.value;
                            setWidthMin(value);
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({ widthMin: value })
                            );
                          }}
                        />
                      </div>
                      <div className="text-muted-foreground pb-2">to</div>
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          placeholder="Max"
                          value={widthMax}
                          onChange={(e) => {
                            const value = e.target.value;
                            setWidthMax(value);
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({ widthMax: value })
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="text-muted-foreground">Height</div>
                        <Input
                          type="number"
                          placeholder="Min"
                          value={heightMin}
                          onChange={(e) => {
                            const value = e.target.value;
                            setHeightMin(value);
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({ heightMin: value })
                            );
                          }}
                        />
                      </div>
                      <div className="text-muted-foreground pb-2">to</div>
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          placeholder="Max"
                          value={heightMax}
                          onChange={(e) => {
                            const value = e.target.value;
                            setHeightMax(value);
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({ heightMax: value })
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div className="text-muted-foreground">Unit:</div>
                      <Select
                        value={dimensionUnit}
                        onValueChange={(value) => {
                          const nextValue = value as "inches" | "centimeters";
                          setDimensionUnit(nextValue);
                          if (hasDimensionValues()) {
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({
                                dimensionUnit: nextValue,
                              })
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Units" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inches">Inches</SelectItem>
                          <SelectItem value="centimeters">
                            Centimeters
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <div className="flex flex-col gap-1">
                        <div className="text-muted-foreground">Weight</div>
                        <Input
                          type="number"
                          placeholder="Min"
                          value={weightMin}
                          onChange={(e) => {
                            const value = e.target.value;
                            setWeightMin(value);
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({ weightMin: value })
                            );
                          }}
                        />
                      </div>
                      <div className="text-muted-foreground pb-2">to</div>
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          placeholder="Max"
                          value={weightMax}
                          onChange={(e) => {
                            const value = e.target.value;
                            setWeightMax(value);
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({ weightMax: value })
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                      <div className="text-muted-foreground">Unit: </div>
                      <Select
                        value={weightUnit}
                        onValueChange={(value) => {
                          const nextValue = value as
                            | "pounds"
                            | "ounces"
                            | "grams";
                          setWeightUnit(nextValue);
                          if (hasDimensionValues()) {
                            handleFilterChange(
                              "Package Dimensions",
                              "package_dimensions",
                              buildDimensionSummary({
                                weightUnit: nextValue,
                              })
                            );
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Units" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pounds">Pounds</SelectItem>
                          <SelectItem value="ounces">Ounces</SelectItem>
                          <SelectItem value="grams">Grams</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {selected === "Total Cost" && (
                  <TotalCostFilter
                    costFilter={costFilter}
                    setCostFilter={setCostFilter}
                    handleFilterChange={handleFilterChange}
                  />
                )}
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="text-sm text-muted-foreground">Selected</div>
              <div className="flex flex-col gap-2 mt-3 text-sm">
                {filters.map(({ key, value, label }) => {
                  return (
                    <div
                      key={key + value}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col gap-2">
                        <span className="text-muted-foreground text-xs">
                          {label}
                        </span>
                        <div className="text-wrap whitespace-pre-line">
                          {capitalizeWord(value)}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        onClick={() => {
                          handleDeleteFilter(key);
                        }}
                      >
                        <Trash />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <Button
              variant="outline"
              onClick={() => {
                setOrderNumber("");
                setService("");
                setDeliveryCity("");
                setDeliveryZip("");
                setStatus(undefined);
                setPaid(undefined);
                setLengthMin("");
                setLengthMax("");
                setWidthMin("");
                setWidthMax("");
                setHeightMin("");
                setHeightMax("");
                setWeightMin("");
                setWeightMax("");
                setDimensionUnit("inches");
                setWeightUnit("pounds");
                setFilters([]);
                table.setColumnFilters([]);
              }}
            >
              Clear
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-muted-foreground">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  table.setColumnFilters(buildColumnFilters());
                  setOpen(false);
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatusFilter({
  status,
  setStatus,
  handleFilterChange,
}: {
  status: "active" | "void" | undefined;
  setStatus: (newValue: "active" | "void") => void;
  handleFilterChange: (label: string, key: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground">Label Status</div>
      <RadioGroup
        value={status ?? ""}
        onValueChange={(newValue) => {
          setStatus(newValue as "active" | "void");
          handleFilterChange("Labels are", "voided_at", newValue);
        }}
      >
        <div className="flex items-center gap-3">
          <RadioGroupItem value="active" id="active" />
          <Label htmlFor="active">Active</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="void" id="void" />
          <Label htmlFor="void">Void</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

function PaidFilter({
  paid,
  setPaid,
  handleFilterChange,
}: {
  paid: "paid" | "unpaid" | undefined;
  setPaid: (newValue: "paid" | "unpaid") => void;
  handleFilterChange: (label: string, key: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground">Paid Status</div>
      <RadioGroup
        value={paid ?? ""}
        onValueChange={(newValue) => {
          setPaid(newValue as "paid" | "unpaid");
          handleFilterChange("Labels are", "paid_at", newValue);
        }}
      >
        <div className="flex items-center gap-3">
          <RadioGroupItem value="paid" id="paid" />
          <Label htmlFor="paid">Paid</Label>
        </div>
        <div className="flex items-center gap-3">
          <RadioGroupItem value="unpaid" id="unpaid" />
          <Label htmlFor="unpaid">Unpaid</Label>
        </div>
      </RadioGroup>
    </div>
  );
}

function TotalCostFilter({
  costFilter,
  setCostFilter,
  handleFilterChange,
}: {
  costFilter: CostFilter;
  setCostFilter: (value: CostFilter) => void;
  handleFilterChange: (label: string, key: string, value: string) => void;
}) {
  const isExactRange = useMemo(() => costFilter.type === "exact", [costFilter]);

  const handleCostFilter = (key: "min" | "max", value: string) => {
    const costFilterSummary = buildCostFilterSummary(costFilter, {
      [key]: value,
    });

    setCostFilter({ ...costFilter, [key]: value });
    handleFilterChange("Total Cost", "total_shipment_cost", costFilterSummary);
  };

  return (
    <div className="flex flex-col gap-2">
      <ToggleGroup
        type="single"
        className="flex w-full min-w-0"
        value={costFilter.type}
        onValueChange={(v) =>
          setCostFilter({ ...costFilter, type: v as "exact" | "range" })
        }
      >
        <ToggleGroupItem value="exact" className="flex-1">
          Exact
        </ToggleGroupItem>
        <ToggleGroupItem value="range" className="flex-1">
          Range
        </ToggleGroupItem>
      </ToggleGroup>
      {isExactRange ? (
        <Input
          startAdornment="$"
          type="number"
          placeholder="0.00"
          value={costFilter.min ?? 0}
          onChange={(e) => {
            handleCostFilter("min", e.target.value);
          }}
          className="text-end"
        />
      ) : (
        <div className="flex flex-col gap-2 items-center">
          <Input
            startAdornment="$"
            type="number"
            placeholder="0.00"
            value={costFilter.min ?? 0}
            onChange={(e) => {
              handleCostFilter("min", e.target.value);
            }}
            className="text-end"
          />
          <span>to</span>
          <Input
            startAdornment="$"
            type="number"
            placeholder="0.00"
            value={costFilter.max ?? 0}
            min={costFilter.min}
            onChange={(e) => {
              handleCostFilter("max", e.target.value);
            }}
            className="text-end"
          />
        </div>
      )}
    </div>
  );
}

function UserFilter<T>({
  userName,
  setUserName,
  handleFilterChange,
  table,
}: {
  userName: string;
  setUserName: (value: string) => void;
  handleFilterChange: (label: string, key: string, value: string) => void;
  table: Table<T>;
}) {
  const uniqueUserNames = useMemo(() => {
    return Array.from(
      new Set(
        table.getCoreRowModel().flatRows.map((row) => {
          const { profiles } = row.original as ShippingLabelWithProfile;
          return profiles?.full_name ?? "";
        })
      )
    );
  }, [table]);

  return (
    <div>
      <Label>User</Label>
      <Select
        value={userName}
        onValueChange={(value) => {
          const nextValue = value;
          setUserName(nextValue);
          handleFilterChange("User is", "profiles_full_name", nextValue);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="User Name" />
        </SelectTrigger>
        <SelectContent>
          {uniqueUserNames.map((name, idx) => {
            return (
              <SelectItem key={name + idx} value={name}>
                {name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
