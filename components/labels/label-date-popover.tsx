import { CalendarDays } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { useState } from "react";
import { DatePicker } from "../ui/date-picker";
import { Table } from "@tanstack/react-table";
import { Badge } from "../ui/badge";

type RadioOptions =
  | "today"
  | "last7"
  | "last30"
  | "last90"
  | "last12m"
  | "custom";

export default function LabelDatePopover<T>({ table }: { table: Table<T> }) {
  const [open, setOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<RadioOptions | undefined | null>(
    undefined
  );

  const [currentFilter, setCurrentFilter] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const createdAtFilter = table.getColumn("created_at");

  const handleSelectedChange = (value: RadioOptions) => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();

    setSelected(value as RadioOptions);
    switch (value) {
      case "today":
        break;
      case "last7":
        from.setDate(from.getDate() - 7);
        break;
      case "last30":
        from.setDate(from.getDate() - 30);
        break;
      case "last90":
        from.setDate(from.getDate() - 90);
        break;
      case "last12m":
        from.setFullYear(from.getFullYear() - 1);
        break;
      default:
        break;
    }
    if (value !== "custom") setCurrentFilter({ from, to });
  };

  const handleStartDateClear = () => {
    setCurrentFilter({ ...currentFilter, from: undefined });
  };

  const handleEndDateClear = () => {
    setCurrentFilter({ ...currentFilter, to: undefined });
  };

  const handleDateRangeSet = ({ from, to }: { from?: Date; to?: Date }) => {
    const nextFilter = { ...currentFilter };
    if (from != null) nextFilter.from = from;
    if (to != null) nextFilter.to = to;
    setCurrentFilter(nextFilter);
  };

  const handleDateRangeClear = () => {
    setSelected(null);
    setCurrentFilter({ from: undefined, to: undefined });
    createdAtFilter?.setFilterValue(null);
    setOpen(false);
  };

  const handleDateRangeApply = () => {
    createdAtFilter?.setFilterValue({ ...currentFilter });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <div className="absolute -top-2 -right-1">
            {!!createdAtFilter?.getFilterValue() && (
              <Badge
                className="h-4 min-w-4 rounded-full px-1"
                variant="destructive"
              />
            )}
          </div>
          <Button variant="outline">
            <CalendarDays />
            Date
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-full p-0">
        <div>
          <div className="grid grid-cols-[220px_1fr]">
            <div className="flex flex-col">
              <div className="px-5 py-4 text-lg font-semibold border-b border-r">
                Date Range
              </div>
              <div className="border-r border-border px-4 py-6">
                <RadioGroup
                  value={selected}
                  onValueChange={handleSelectedChange}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="today" id="today" />
                    <Label htmlFor="today">Today</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="last7" id="last7" />
                    <Label htmlFor="last7">Last 7 days</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="last30" id="last30" />
                    <Label htmlFor="last30">Last 30 days</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="last90" id="last90" />
                    <Label htmlFor="last90">Last 90 days</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="last12m" id="last12m" />
                    <Label htmlFor="last12m">Last 12 months</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="custom" id="custom" />
                    <Label htmlFor="custom">Custom</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
            <div className="border-r border-border px-4 py-6">
              <div className="flex flex-col gap-10 py-4">
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center justify-between w-full">
                    <Label>Starting</Label>
                    <Button
                      variant="link"
                      className="p-0 h-full"
                      onClick={handleStartDateClear}
                    >
                      Clear
                    </Button>
                  </div>
                  <DatePicker
                    date={currentFilter.from}
                    setDate={(newDate) => {
                      handleDateRangeSet({ from: newDate });
                    }}
                  />
                </div>
                <div className="flex flex-col items-start gap-2">
                  <div className="flex items-center justify-between w-full">
                    <Label>Ending</Label>
                    <Button
                      variant="link"
                      className="p-0 h-full"
                      onClick={handleEndDateClear}
                    >
                      Clear
                    </Button>
                  </div>
                  <DatePicker
                    date={currentFilter.to}
                    setDate={(newDate) => {
                      handleDateRangeSet({ to: newDate });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center border-t px-5 py-4">
            <Button variant="outline" onClick={handleDateRangeClear}>
              Clear
            </Button>
            <div className="flex justify-between items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleDateRangeApply}>Apply</Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
