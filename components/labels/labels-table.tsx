/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";

import {
  DownloadIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  ChevronDown,
  Trash,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

import type {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  exportToCSV,
  exportToExcel,
  exportToJson,
  printLabels,
} from "@/lib/utils";
import { FEDEX_SERVICES, generateTrackingLink } from "@/lib/shipstation/fedex";
import { ShippingLabelRecord } from "@/lib/supabase/shipping-labels";
import { toast } from "sonner";
import { StatusBadge } from "../dashboard/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { bulkUpdatePaidStatus, updatePaidStatus } from "@/lib/actions/labels";
import {
  deleteShippingLabel,
  voidShippingLabelAction,
} from "@/lib/actions/shipping";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import LabelFilterPopover from "./label-filter-popover";
import LabelDatePopover from "./label-date-popover";
import { PrintIconButton } from "../util-buttons";
import { Tooltip } from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "../ui/tooltip";

type ColumnOptions = {
  showUserId?: boolean;
};

export const columns = <T,>(options?: ColumnOptions): ColumnDef<T>[] => {
  const baseColumns: ColumnDef<T>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...(options?.showUserId
      ? ([
        {
          accessorKey: "profiles.full_name",
          header: "User",
          meta: { label: "User" },
          filterFn: "includesString",
        } satisfies ColumnDef<T>,
      ] as ColumnDef<T>[])
      : []),
    {
      accessorKey: "order_number",
      header: "Order #",
      meta: { label: "Order Number" },
      cell: ({ row }) => <div>{row.getValue("order_number")}</div>,
      filterFn: "includesString",
    },
    {
      accessorKey: "service_code",
      header: "Service",
      meta: { label: "Service" },
      cell: ({ row }) => (
        <div className="font-medium">
          {
            FEDEX_SERVICES.find(
              (service) => service.code === row.getValue("service_code")
            )?.name
          }
        </div>
      ),
      filterFn: "includesString",
    },
    {
      id: "delivery_city",
      header: "Delivery City",
      meta: { label: "Delivery City" },
      accessorFn: (row) => {
        const { ship_to_snapshot } = row as ShippingLabelRecord;
        return `${ship_to_snapshot.city}, ${ship_to_snapshot.state}`;
      },
      filterFn: "includesString",
    },
    {
      id: "delivery_zip",
      header: "Delivery Zip",
      meta: { label: "Delivery Zip" },
      accessorFn: (row) => {
        const { ship_to_snapshot } = row as ShippingLabelRecord;
        return ship_to_snapshot.postalCode;
      },
      filterFn: "includesString",
    },
    {
      accessorKey: "created_at",
      header: () => <div className="text-center">Created At</div>,
      meta: { label: "Created At" },
      cell: ({ row }) => {
        const date = new Date(row.getValue("created_at"));

        return (
          <div className="text-center items-center justify-center font-medium">
            <div>
              {Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
              }).format(date)}
            </div>
            <div className="text-xs text-muted-foreground">
              {Intl.DateTimeFormat("en-US", {
                timeStyle: "short",
              }).format(date)}
            </div>
          </div>
        );
      },
      filterFn: (row, columnId, value) => {
        const rowDate = new Date(row.getValue(columnId));
        const from = value?.from ? new Date(value.from) : null;
        const to = value?.to ? new Date(value.to) : null;
        if (from && rowDate <= from) return false;
        if (to && rowDate >= to) return false;
        return true;
      },
    },
    {
      accessorKey: "voided_at",
      header: "Active?",
      meta: { label: "Status" },
      cell: ({ row }) => {
        const variant = row.getValue("voided_at") ? "destructive" : "success";
        const title = row.getValue("voided_at") ? "Voided" : "Active";
        return <StatusBadge variant={variant} title={title} />;
      },
      filterFn: (row, columnId, filterValue) => {
        const voidedAt = row.getValue(columnId);
        if (filterValue === "active") return !voidedAt;
        else return !!voidedAt;
      },
    },
    {
      accessorKey: "paid_at",
      header: "Paid?",
      meta: { label: "Paid" },
      cell: ({ row }) => {
        const variant = row.getValue("paid_at") ? "success" : "destructive";
        const title = row.getValue("paid_at") ? "Paid" : "Unpaid";
        return <StatusBadge variant={variant} title={title} />;
      },
      filterFn: (row, columnId, filterValue) => {
        const paidAt = row.getValue(columnId);
        if (filterValue === "paid") return !!paidAt;
        else return !paidAt;
      },
    },
    {
      accessorKey: "tracking_number",
      header: "Tracking #",
      meta: { label: "Tracking Number" },
      cell: ({ row }) => {
        return (
          <div className="font-medium hover:underline">
            <a
              href={generateTrackingLink(row.getValue("tracking_number"))}
              target="_blank"
              rel="noopener noreferrer"
            >
              {row.getValue("tracking_number")}
            </a>
          </div>
        );
      },
      filterFn: "includesString",
    },
    {
      id: "package_dimensions", // Use 'id' instead of 'accessorKey' for virtual columns
      header: () => <div className="text-center">Package Dimensions</div>,
      meta: { label: "Package Dimensions" },
      filterFn: (row, _columnId, value) => {
        const { length, width, height, units, weight_value, weight_unit } =
          row.original as ShippingLabelRecord;
        const {
          minL,
          maxL,
          minW,
          maxW,
          minH,
          maxH,
          minWeight,
          maxWeight,
          dimensionUnit = "inches",
          weightUnit = "pounds",
        }: {
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
        } = value ?? {};

        const convertDimension = (
          valueToConvert: number,
          from: "inches" | "centimeters",
          to: "inches" | "centimeters"
        ) => {
          if (from === to) return valueToConvert;
          return from === "inches"
            ? valueToConvert * 2.54
            : valueToConvert / 2.54;
        };
        const convertWeight = (
          valueToConvert: number,
          from: "pounds" | "ounces" | "grams",
          to: "pounds" | "ounces" | "grams"
        ) => {
          if (from === to) return valueToConvert;
          const toGrams =
            from === "grams"
              ? valueToConvert
              : from === "ounces"
                ? valueToConvert * 28.349523125
                : valueToConvert * 453.59237;
          if (to === "grams") return toGrams;
          return to === "ounces" ? toGrams / 28.349523125 : toGrams / 453.59237;
        };

        const lengthValue = convertDimension(length, units, dimensionUnit);
        const widthValue = convertDimension(width, units, dimensionUnit);
        const heightValue = convertDimension(height, units, dimensionUnit);
        const weightValue = convertWeight(
          weight_value,
          weight_unit as "pounds" | "ounces" | "grams",
          weightUnit
        );

        if (minL !== undefined && lengthValue < minL) return false;
        if (maxL !== undefined && lengthValue > maxL) return false;
        if (minW !== undefined && widthValue < minW) return false;
        if (maxW !== undefined && widthValue > maxW) return false;
        if (minH !== undefined && heightValue < minH) return false;
        if (maxH !== undefined && heightValue > maxH) return false;
        if (minWeight !== undefined && weightValue < minWeight) return false;
        if (maxWeight !== undefined && weightValue > maxWeight) return false;
        return true;
      },
      cell: ({ row }) => {
        const original = row.original as ShippingLabelRecord;
        const { length, width, height, units, weight_value, weight_unit } =
          original;

        const dimensions = `${length} x ${width} x ${height} ${units}`;
        const weight = `${weight_value} ${weight_unit}`;

        return (
          <div className="text-center font-medium">
            <div>{dimensions}</div>
            <div className="text-xs text-muted-foreground">{weight}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "total_shipment_cost",
      header: () => <div>Total Cost</div>,
      meta: { label: "Total Cost" },
      cell: ({ row }) => {
        const shipmentCost = parseFloat(row.getValue("total_shipment_cost"));
        const insuranceCost = (row.original as ShippingLabelRecord)
          ?.total_insurance_cost;
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(shipmentCost + insuranceCost);
        return <div className="font-medium">{formatted}</div>;
      },
      filterFn: (row, _columnId, filterValue) => {
        const { type, min, max } = filterValue as {
          type: "exact" | "range";
          min: string;
          max: string;
        };
        const { total_shipment_cost } = row.original as ShippingLabelRecord;

        if (type === "exact") {
          return total_shipment_cost === Number(min);
        } else {
          if (!min) return total_shipment_cost <= Number(max);
          else if (!max) return total_shipment_cost >= Number(min);
          else
            return (
              total_shipment_cost <= Number(max) &&
              total_shipment_cost >= Number(min)
            );
        }
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <PrintIconButton variant='ghost' size="icon" label={row.original as ShippingLabelRecord} />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Print Label
              </TooltipContent>
            </Tooltip>
            <Dialog>
              <DialogTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Delete Label
                  </TooltipContent>
                </Tooltip>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Deleting Shipping Label</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this shipping label? This will
                    also void the shipping label.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      toast.promise(
                        async () => {
                          const { id } = row.original as ShippingLabelRecord;
                          await deleteShippingLabel(id);
                        },
                        {
                          loading: "Deleting label...",
                          success: "Succesfully deleted label!",
                        }
                      );
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        );
      },
    },
  ];

  return baseColumns;
};

interface LabelsTableProps<T> {
  labels: T[];
  showUserId?: boolean;
}

export function LabelsTable<T>({
  labels,
  showUserId = false,
}: LabelsTableProps<T>) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: "voided_at", value: "active" },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const table = useReactTable<T>({
    data: labels,
    columns: columns<T>({ showUserId }),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });

  const handlePrintClick = async () => {
    const selectedLabelsPDFs = table
      .getSelectedRowModel()
      .rows.map(
        (row) => (row.original as ShippingLabelRecord).label_data_base64
      );
    await printLabels(selectedLabelsPDFs);
  };

  const handleVoidClick = async () => {
    const selectedLabels = table
      .getSelectedRowModel()
      .rows.map((row) => row.original as ShippingLabelRecord);

    if (selectedLabels.length === 0) {
      toast.error("No active labels selected to void.");
      return;
    }

    const formData = new FormData();
    formData.append(
      "shipment_ids",
      JSON.stringify(selectedLabels.map((lbl) => lbl.shipment_id))
    );
    formData.append("path", showUserId ? `admin/labels` : "dashboard/labels");
    const res = await voidShippingLabelAction(formData);
    return res;
  };

  function exportToFile(type: "csv" | "excel" | "json") {
    const formatShippingSnapshots = (
      exportData: Omit<
        ShippingLabelRecord,
        "label_data_base64" | "user_id" | "from_address_id" | "to_address_id"
      >[]
    ) => {
      return exportData.map(({ ship_to_snapshot, id, ...rest }) => {
        const delivery_zip = ship_to_snapshot.postalCode;
        const delivery_city = `${ship_to_snapshot.city}, ${ship_to_snapshot.state}`;
        return {
          id,
          delivery_city,
          delivery_zip,
          ...rest,
        };
      });
    };

    const selectedRows = table.getSelectedRowModel().rows;

    const dataToExport = (
      selectedRows.length > 0
        ? table.getFilteredSelectedRowModel()
        : table.getFilteredRowModel()
    ).rows.map(({ original }) => {
      const { label_data_base64, user_id, to_address_id, ...rest } =
        original as ShippingLabelRecord;
      return { ...rest };
    });
    switch (type) {
      case "csv":
        exportToCSV(formatShippingSnapshots(dataToExport));
        break;
      case "excel":
        exportToExcel(formatShippingSnapshots(dataToExport));
        break;
      case "json":
        exportToJson(dataToExport);
        break;
      default:
        break;
    }
  }

  const handleRowClick = (
    event: MouseEvent<HTMLTableRowElement>,
    row: Row<T>
  ) => {
    if (event.defaultPrevented) return;

    const target = event.target as HTMLElement | null;
    if (
      target?.closest(
        'a, button, input, textarea, select, [role="button"], [role="link"], [data-prevent-row-nav]'
      )
    ) {
      return;
    }

    const label = row.original as { id?: string };

    if (label?.id) {
      router.push(`/${showUserId ? "admin" : "dashboard"}/labels/${label.id}`);
    }
  };

  const markPayment = async (type: "paid" | "unpaid") => {
    const selectedLabels = table
      .getSelectedRowModel()
      .rows.map((row) => row.original as ShippingLabelRecord);

    const res =
      selectedLabels.length > 1
        ? await bulkUpdatePaidStatus(
          selectedLabels.map((lbl) => lbl.shipment_id),
          type
        )
        : await updatePaidStatus(selectedLabels[0].shipment_id, type);

    return res;
  };

  const handleClearAllFilters = () => {
    setColumnFilters([]);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between gap-2 pb-2 max-sm:flex-col sm:items-center">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ""}
            onChange={(event) =>
              table.setGlobalFilter(String(event.target.value))
            }
            className="max-w-sm"
          />
          <LabelDatePopover table={table} />
          <LabelFilterPopover table={table} />
          {columnFilters.length > 0 && (
            <Button
              variant="link"
              onClick={handleClearAllFilters}
              className="p-2"
            >
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {table.getSelectedRowModel().rows.length > 0 && (
            <>
              <Button variant="outline" onClick={handlePrintClick}>
                Print
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">Void Labels</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Voiding {table.getSelectedRowModel().rows.length} labels
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. Please ensure that you want
                      to void this label.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        toast.promise(
                          async () => {
                            return await handleVoidClick();
                          },
                          {
                            loading: "Voiding Labels...",
                            success: "Labels have been voided",
                            error: "Error voiding labels",
                          }
                        );
                      }}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {showUserId && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Mark as
                      <ChevronDown />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() => {
                        toast.promise(
                          async () => {
                            return await markPayment("paid");
                          },
                          {
                            loading: "Updating label...",
                            success: (data: {
                              message: string;
                              success: boolean;
                            }) => data?.message,
                            error: "Failed to update label.",
                          }
                        );
                      }}
                    >
                      Paid
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        toast.promise(
                          async () => {
                            return await markPayment("unpaid");
                          },
                          {
                            loading: "Updating label...",
                            success: (data: {
                              message: string;
                              success: boolean;
                            }) => data?.message,
                            error: "Failed to update label.",
                          }
                        );
                      }}
                    >
                      Unpaid
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToFile("csv")}>
                <FileTextIcon className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToFile("excel")}>
                <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportToFile("json")}>
                <FileTextIcon className="mr-2 h-4 w-4" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="bg-card rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="cursor-pointer"
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(event) => handleRowClick(event, row)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-2 gap-3">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex justify-between items-center gap-2">
          <div className="text-muted-foreground flex-1 text-sm">
            {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()} pages
          </div>
          <div className="space-x-2 flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.firstPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.lastPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
