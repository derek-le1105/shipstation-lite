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
import {
  bulkUpdatePaidStatus,
  bulkVoidShippingLabels,
  updatePaidStatus,
  voidShippingLabel,
} from "@/lib/actions/labels";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
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
    // {
    //   accessorKey: "shipment_id",
    //   header: "Shipment ID",
    //   cell: ({ row }) => (
    //     <div className="font-medium">{row.getValue("shipment_id")}</div>
    //   ),
    // },
    ...(options?.showUserId
      ? ([
          {
            accessorKey: "profiles.full_name",
            header: "User",
          } satisfies ColumnDef<T>,
        ] as ColumnDef<T>[])
      : []),
    {
      accessorKey: "order_number",
      header: "Order #",
      cell: ({ row }) => <div>{row.getValue("order_number")}</div>,
    },
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
      id: "origin_city",
      header: "Origin City",
      accessorFn: (row) => {
        const { ship_from_snapshot } = row as ShippingLabelRecord;
        return `${ship_from_snapshot.city}, ${ship_from_snapshot.state}`;
      },
    },
    {
      id: "origin_zip",
      header: "Origin Zip",
      accessorFn: (row) => {
        const { ship_from_snapshot } = row as ShippingLabelRecord;
        return ship_from_snapshot.postalCode;
      },
    },
    {
      id: "delivery_city",
      header: "Delivery City",
      accessorFn: (row) => {
        const { ship_to_snapshot } = row as ShippingLabelRecord;
        return `${ship_to_snapshot.city}, ${ship_to_snapshot.state}`;
      },
    },
    {
      id: "delivery_zip",
      header: "Delivery Zip",
      accessorFn: (row) => {
        const { ship_to_snapshot } = row as ShippingLabelRecord;
        return ship_to_snapshot.postalCode;
      },
    },
    {
      accessorKey: "created_at",
      header: () => <div className="text-center">Created At</div>,
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
    },
    {
      accessorKey: "voided_at",
      header: "Active?",
      cell: ({ row }) => {
        const variant = row.getValue("voided_at") ? "destructive" : "success";
        const title = row.getValue("voided_at") ? "Voided" : "Active";
        return <StatusBadge variant={variant} title={title} />;
      },
    },
    {
      accessorKey: "paid_at",
      header: "Paid?",
      cell: ({ row }) => {
        const variant = row.getValue("paid_at") ? "success" : "destructive";
        const title = row.getValue("paid_at") ? "Paid" : "Unpaid";
        return <StatusBadge variant={variant} title={title} />;
      },
    },
    {
      accessorKey: "tracking_number",
      header: "Tracking #",
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
    },
    {
      id: "package_dimensions", // Use 'id' instead of 'accessorKey' for virtual columns
      header: () => <div className="text-center">Package Dimensions</div>,
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
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash />
              </Button>
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
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
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
      return exportData.map(
        ({ ship_from_snapshot, ship_to_snapshot, id, ...rest }) => {
          const origin_zip = ship_from_snapshot.postalCode;
          const origin_city = `${ship_from_snapshot.city}, ${ship_from_snapshot.state}`;
          const delivery_zip = ship_to_snapshot.postalCode;
          const delivery_city = `${ship_to_snapshot.city}, ${ship_to_snapshot.state}`;
          return {
            id,
            origin_city,
            origin_zip,
            delivery_city,
            delivery_zip,
            ...rest,
          };
        }
      );
    };

    const selectedRows = table.getSelectedRowModel().rows;

    const dataToExport = (
      selectedRows.length > 0
        ? table.getFilteredSelectedRowModel()
        : table.getFilteredRowModel()
    ).rows.map(({ original }) => {
      const {
        label_data_base64,
        user_id,
        from_address_id,
        to_address_id,
        ...rest
      } = original as ShippingLabelRecord;
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

  return (
    <div className="w-full">
      <div className="flex justify-between gap-2 pb-4 max-sm:flex-col sm:items-center">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search all columns..."
            value={globalFilter ?? ""}
            onChange={(event) =>
              table.setGlobalFilter(String(event.target.value))
            }
            className="max-w-sm"
          />
        </div>

        <div className="flex items-center space-x-2">
          {table.getSelectedRowModel().rows.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handlePrintClick}>
                Print
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Void Labels
                  </Button>
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
                    <Button variant="outline" size="sm">
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
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
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
    .join(" | ");

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
