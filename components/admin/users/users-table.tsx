"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDollarPercent } from "@/lib/utils";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listProfiles } from "@/lib/supabase/profiles";
import { Warehouse } from "@/lib/shipstation/types";
type UserRow = Awaited<ReturnType<typeof listProfiles>>[0] & {
  upcharge: { value: number; unit: "dollars" | "percent" } | null;
};

const columns = (warehouses: Warehouse[] = []): ColumnDef<UserRow>[] => {
  return [
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
    {
      accessorKey: "full_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue("full_name")}</div>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            className="p-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Email
            {column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => <div>{row.getValue("email")}</div>,
    },
    {
      accessorKey: "warehouse_id",
      header: () => <div>Ship From</div>,
      cell: ({ row }) => {
        const { warehouse_id } = row.original;
        if (!warehouse_id) return <div>N/A</div>;
        const warehouse = warehouses?.find(
          (wh) => wh.warehouseId === row.original.warehouse_id
        );
        if (!warehouse) return <div>Unknown Warehouse ID {warehouse_id}</div>;
        return <div>{warehouse.warehouseName}</div>;
      },
    },
    {
      accessorKey: "upcharge",
      header: "Upcharge Value",
      cell: ({ row }) => {
        const upcharge = row.original.upcharge;
        return upcharge ? (
          <span className="font-medium">
            {formatDollarPercent(upcharge?.value, upcharge?.unit)}
          </span>
        ) : (
          "N/A"
        );
      },
    },
    {
      id: "total_labels",
      header: "Labels",
      cell: ({ row }) => <div>{row.original.shipping_labels.total} Labels</div>,
    },
    {
      id: "total_amount",
      header: "Amount Spent",
      cell: ({ row }) => (
        <div>
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(row.original.shipping_labels.total_cost)}
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <div>{row.getValue("role")}</div>,
    },
  ];
};

export function UsersTable({
  profiles,
  warehouses,
}: {
  profiles: UserRow[];
  warehouses: Warehouse[];
}) {
  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data: profiles,
    columns: columns(warehouses),
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

  const handleRowClick = (
    event: MouseEvent<HTMLTableRowElement>,
    row: Row<UserRow>
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
      router.push(`users/${label.id}`);
    }
  };

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <Table className="w-full text-sm">
        <TableHeader className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
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
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  );
}
