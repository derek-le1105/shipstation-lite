"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";
import { Button } from "./button";

import { ChevronsUpDown } from "lucide-react";

export function Fieldset({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <fieldset className="space-y-1 rounded-lg border p-4">
        <legend className="px-2 text-lg font-semibold uppercase tracking-wide">
          {title}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size={"icon"} className="ml-1">
              <ChevronsUpDown />
            </Button>
          </CollapsibleTrigger>
        </legend>
        {description && !isOpen ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        <CollapsibleContent>
          <div className="grid gap-2">{children}</div>
        </CollapsibleContent>
      </fieldset>
    </Collapsible>
  );
}
