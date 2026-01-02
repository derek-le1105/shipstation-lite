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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selected, setSelected] = useState<RadioOptions | undefined>(undefined);

  const createdAtFilter = table.getColumn("created_at");
  console.log("caf: ", createdAtFilter?.getFilterValue());

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
    if (value !== "custom") createdAtFilter?.setFilterValue({ from, to });
  };

  const handleStartDateSet = (newDate: Date) => {
    setStartDate(newDate);
    createdAtFilter?.setFilterValue({ from: newDate, to: endDate });
  };

  const handleEndDateSet = (newDate: Date) => {
    setEndDate(newDate);
    createdAtFilter?.setFilterValue({ from: startDate, to: newDate });
  };

  const handleStartDateClear = () => {
    setStartDate(undefined);
    createdAtFilter?.setFilterValue({ from: undefined, to: endDate });
  };

  const handleEndDateClear = () => {
    setEndDate(undefined);
    createdAtFilter?.setFilterValue({ from: startDate, to: undefined });
  };

  return (
    <Popover>
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
      <PopoverContent align="end" className="w-full">
        <div className="flex flex-col gap-4">
          <RadioGroup value={selected} onValueChange={handleSelectedChange}>
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
          {selected === "custom" && (
            <div className="flex flex-col gap-2">
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
                <DatePicker date={startDate} setDate={handleStartDateSet} />
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
                <DatePicker date={endDate} setDate={handleEndDateSet} />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
