import { CalendarDays } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";
import { useState } from "react";
import { DatePicker } from "../ui/date-picker";

type RadioOptions =
  | "today"
  | "last7"
  | "last30"
  | "last90"
  | "last 12m"
  | "custom";

export default function LabelDatePopover() {
  const [startDate, setStateDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selected, setSelected] = useState<RadioOptions | undefined>(undefined);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm">
          <CalendarDays />
          Date
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-full">
        <div className="flex flex-col gap-4">
          <RadioGroup
            value={selected}
            onValueChange={(value) => setSelected(value as RadioOptions)}
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
          {selected === "custom" && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-col items-start gap-2">
                <Label>Starting</Label>
                <DatePicker date={startDate} setDate={setStateDate} />
              </div>
              <div className="flex flex-col items-start gap-2">
                <Label>Ending</Label>
                <DatePicker date={endDate} setDate={setEndDate} />
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
