"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./collapsible";
import { Button } from "./button";

import { ChevronsUpDown } from "lucide-react";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export function Fieldset({ title, children, className, contentClassName }: Props) {
  return (
    <fieldset className={cn("space-y-1 rounded-lg border p-4", className)}>
      <legend className="px-2 text-lg font-semibold uppercase tracking-wide">
        {title}
      </legend>

      <div className={cn("grid gap-2", contentClassName)}>{children}</div>
    </fieldset>
  );
}

type CollapsibleFieldsetProps = Props & {
  description?: React.ReactNode;
};

export function CollapsibleFieldset({
  title,
  description,
  children,
}: CollapsibleFieldsetProps) {
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
