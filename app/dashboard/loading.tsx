import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex h-6 items-stretch gap-2">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Separator orientation="vertical" className="h-full" />
          <Skeleton className="h-5 w-48" />
        </div>
        <WizardProgressSkeleton />
        <WizardStepCardsSkeleton />
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <CreateLabelFormSkeleton />
      </div>
    </div>
  );
}

function WizardProgressSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

function WizardStepCardsSkeleton() {
  return (
    <div className="hidden md:grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-4 w-28" />
          <Skeleton className="mt-2 h-3 w-36" />
        </div>
      ))}
    </div>
  );
}

function CreateLabelFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-24" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}
