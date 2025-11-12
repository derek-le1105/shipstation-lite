"use client";

import { useState } from "react";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";

export default function SwitchLabel({
  name,
  title,
}: {
  name: string;
  title: string;
}) {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={name}>{title}</Label>
      <div className="flex items-center justify-between gap-1">
        <Switch
          id={name}
          name={name}
          checked={enabled}
          onCheckedChange={setEnabled}
        />
        <span className="ml-2">{enabled ? "Yes" : "No"}</span>
      </div>
    </div>
  );
}
