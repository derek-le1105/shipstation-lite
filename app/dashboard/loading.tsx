import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <section className="grid md:grid-cols-[2fr_1fr] gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg font-semibold">
              Create a shipping label
            </CardTitle>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <CreateLabelFormSkeleton />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function CreateLabelFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="hidden md:grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-lg border p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-4 w-28" />
            <Skeleton className="mt-2 h-3 w-36" />
          </div>
        ))}
      </div>

      <Skeleton className="h-px w-full" />

      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>

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

function AddressListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
      </CardHeader>
    </Card>
  );
}
