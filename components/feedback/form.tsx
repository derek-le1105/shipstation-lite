"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  FeedbackActionState,
  FormSource,
  submitIssueAction,
} from "@/lib/actions/feedback";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";
import { breakTextIntoLines } from "pdf-lib";

export default function Form() {
  const [source, setSource] = useState<FormSource>();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [formState, formAction, actionPending] = useActionState<
    FeedbackActionState,
    FormData
  >(submitIssueAction, { status: "idle" });

  const [transitionPending, startTransition] = useTransition();
  const isPending = actionPending || transitionPending;
  const handleSubmit = (formData: FormData) => {
    startTransition(() => {
      formAction(formData);
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes("android")) {
      setSource("android");
    } else if (userAgent.includes("iphone") || userAgent.includes("ipad")) {
      setSource("ios");
    } else {
      setSource("web");
    }
  }, []);

  useEffect(() => {
    const { status } = formState;
    switch (status) {
      case "error":
        toast.error(formState.message);
        return;
      case "success":
        toast.success(formState.message);
        formRef.current?.reset();
        return;
      default:
        return;
    }
  }, [formState]);

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Submit Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} className="space-y-6" action={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="Briefly summarize the issue"
              autoComplete="off"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue_type">Issue type</Label>
            <Select name="issue_type" disabled={isPending}>
              <SelectTrigger id="issue_type" name="issue_type">
                <SelectValue placeholder="Choose an issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">Bug or error</SelectItem>
                <SelectItem value="performance">
                  Slow or unresponsive
                </SelectItem>
                <SelectItem value="printing">Printing issue</SelectItem>
                <SelectItem value="billing">Billing or pricing</SelectItem>
                <SelectItem value="how_to">How do I...</SelectItem>
                <SelectItem value="feature_request">Feature request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue_section">Section</Label>
            <Select name="issue_section" disabled={isPending}>
              <SelectTrigger id="issue_section" name="issue_section">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creating_labels">Creating labels</SelectItem>
                <SelectItem value="printing_labels">Printing labels</SelectItem>
                <SelectItem value="voiding_labels">Voiding labels</SelectItem>
                <SelectItem value="addresses">Address book</SelectItem>
                <SelectItem value="packages">Packages</SelectItem>
                <SelectItem value="billing">Billing</SelectItem>
                <SelectItem value="account">Account settings</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <input
            type="hidden"
            id="source"
            name="source"
            defaultValue={source}
          />
          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Textarea
              id="details"
              name="details"
              placeholder="Share any steps, errors, or details that can help us resolve the issue."
              rows={5}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isPending}
            />
          </div>
          <Button type="submit" disabled={isPending}>
            Submit
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
