/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";

import {
  DownloadIcon,
  FileTextIcon,
  FileSpreadsheetIcon,
  Printer,
} from "lucide-react";

import type {
  ColumnDef,
  ColumnFiltersState,
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

import { Badge } from "@/components/ui/badge";
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
  cn,
  exportToCSV,
  exportToExcel,
  exportToJson,
  formatPhoneNumber,
  printLabels,
} from "@/lib/utils";
import { FEDEX_SERVICES, generateTrackingLink } from "@/lib/shipstation/fedex";
import { ShippingLabelRecord } from "@/lib/supabase/shipping-labels";
import { toast } from "sonner";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import { StatusBadge } from "./status-badge";

export const columns = <T,>(): ColumnDef<T>[] => [
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
  //   {
  //     accessorKey: "carrier_code",
  //     header: "Carrier",
  //     cell: ({ row }) => (
  //       <div className="font-medium">{row.getValue("carrier_code")}</div>
  //     ),
  //   },
  {
    accessorKey: "service_code",
    header: "Service",
    cell: ({ row }) => (
      <div className="font-medium">
        {
          FEDEX_SERVICES.find(
            (service) => service.code === row.getValue("service_code")
          )?.name
        }
      </div>
    ),
  },
  {
    accessorKey: "ship_from_snapshot",
    header: "Origin City",
    cell: ({ row }) => {
      const shipFromSnapshot = row.getValue(
        "ship_from_snapshot"
      ) as ShippingLabelRecord["ship_from_snapshot"];
      if (!shipFromSnapshot) {
        return "—";
      }
      return <ShippingSnapShotHoverCard {...shipFromSnapshot} />;
    },
  },
  {
    accessorKey: "ship_to_snapshot",
    header: "Delivery City",
    cell: ({ row }) => {
      const shipToSnapshot = row.getValue(
        "ship_to_snapshot"
      ) as ShippingLabelRecord["ship_to_snapshot"];
      if (!shipToSnapshot) {
        return "—";
      }
      return <ShippingSnapShotHoverCard {...shipToSnapshot} />;
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));

      return (
        <div className="text-center font-medium">
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
  },
  {
    accessorKey: "voided",
    header: "Active?",
    cell: ({ row }) => <StatusBadge voided={row.getValue("voided")} />,
  },
  {
    accessorKey: "tracking_number",
    header: () => <div className="text-right">Tracking Number</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right font-medium underline">
          <a href={generateTrackingLink(row.getValue("tracking_number"))}>
            {row.getValue("tracking_number")}
          </a>
        </div>
      );
    },
  },
  {
    id: "package_dimensions", // Use 'id' instead of 'accessorKey' for virtual columns
    header: () => <div className="text-center">Package Dimensions</div>,
    cell: ({ row }) => {
      const original = row.original as ShippingLabelRecord;
      const { length, width, height, units, weight_value, weight_unit } =
        original;

      const dimensions = `${length} × ${width} × ${height} ${units}`;
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
    header: () => <div className="text-right">Cost</div>,
    cell: ({ row }) => {
      const shipmentCost = parseFloat(row.getValue("total_shipment_cost"));
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(shipmentCost);
      return <div className="text-right font-medium">{formatted}</div>;
    },
  },
  //   {
  //     accessorKey: "total_insurance_cost",
  //     header: () => <div className="text-right">Insurance Cost</div>,
  //     cell: ({ row }) => {
  //       const insuranceCost = parseFloat(
  //         row.getValue("total_insurance_cost") || "0"
  //       );
  //       const formatted = new Intl.NumberFormat("en-US", {
  //         style: "currency",
  //         currency: "USD",
  //       }).format(insuranceCost);
  //       return <div className="text-right font-medium">{formatted}</div>;
  //     },
  //   },
  {
    accessorKey: "label_data_base64",
    header: () => <div className="text-right">Label PDF</div>,
    cell: ({ row }) => {
      const label = row.getValue("label_data_base64") as string;
      return (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="w-full md:w-auto"
            disabled={!label}
            onClick={async () => {
              try {
                await printLabels([label as string]);
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Unable to print label"
                );
              }
            }}
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      );
    },
  },
];

interface LabelsTableProps<T> {
  labels: T[];
}

export function LabelsTable<T>({ labels }: LabelsTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable<T>({
    data: labels,
    columns: columns<T>(),
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

  const exportToFile = (type: "csv" | "excel" | "json") => {
    const selectedRows = table.getSelectedRowModel().rows;

    const dataToExport =
      selectedRows.length > 0
        ? selectedRows.map((row) => row.original)
        : table.getFilteredRowModel().rows.map((row) => {
            const { original } = row;
            const { label_data_base64, ...rest } =
              original as ShippingLabelRecord;
            return rest as T;
          });
    switch (type) {
      case "csv":
        exportToCSV(dataToExport);
        break;
      case "excel":
        exportToExcel(dataToExport);
        break;
      case "json":
        exportToJson(dataToExport);
        break;
      default:
        break;
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between gap-2 pb-4 max-sm:flex-col sm:items-center">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-muted-foreground text-sm">
            {table.getSelectedRowModel().rows.length > 0 && (
              <span className="mr-2">
                {table.getSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} row(s) selected
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
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
      <div className="rounded-md border">
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
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ShippingSnapShotHoverCard(
  shipSnapshot: ShippingLabelRecord["ship_from_snapshot" | "ship_to_snapshot"]
) {
  const cityState = [shipSnapshot.city, shipSnapshot.state]
    .filter(Boolean)
    .join(", ");
  const postalCountry = [shipSnapshot.postalCode, shipSnapshot.country]
    .filter(Boolean)
    .join(" • ");

  const street =
    shipSnapshot.street1 +
    (shipSnapshot.street2 ? `, ${shipSnapshot.street2}` : "");
  return (
    <HoverCard>
      <HoverCardTrigger className="cursor-pointer text-foreground underline underline-offset-4">
        {cityState || shipSnapshot.city || "View origin"}
      </HoverCardTrigger>
      <HoverCardContent className="w-64 space-y-3 text-sm">
        <div className="space-y-1">
          {shipSnapshot.name && (
            <div className="font-medium">{shipSnapshot.name}</div>
          )}
          {shipSnapshot.company && (
            <div className="text-muted-foreground">{shipSnapshot.company}</div>
          )}
        </div>
        <div className="space-y-1 leading-relaxed">
          <div>{street}</div>
          {cityState && <div>{cityState}</div>}
          {postalCountry && <div>{postalCountry}</div>}
        </div>
        {shipSnapshot.phone && (
          <div className="text-muted-foreground">
            Phone: {formatPhoneNumber(shipSnapshot.phone)}
          </div>
        )}
        {shipSnapshot.residential !== null &&
          shipSnapshot.residential !== undefined && (
            <Badge variant="secondary">
              {shipSnapshot.residential ? "Residential" : "Commercial"}
            </Badge>
          )}
      </HoverCardContent>
    </HoverCard>
  );
}
