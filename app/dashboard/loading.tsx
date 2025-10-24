import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Fieldset } from "@/components/ui/fieldset";

export default function DashboardLoading() {
  return (
    <div className="space-y-10">
      <section className="grid md:grid-cols-[2fr_1fr] gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">
              <Skeleton className="h-6 w-1/3" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreateLabelFormSkeleton />
          </CardContent>
        </Card>
      </section>
      <section className="grid md:grid-cols-2 gap-6">
        <AddressListSkeleton />
        <AddressListSkeleton />
      </section>
    </div>
  );
}

function CreateLabelFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <SkeletonAddressFieldset title="Ship from" />
        <SkeletonAddressFieldset title="Ship to" />
      </div>

      <Fieldset title="Parcel details">
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-48" />
        </div>
      </Fieldset>
    </div>
  );
}

function SkeletonAddressFieldset({ title }: { title: string }) {
  return (
    <Fieldset title={title}>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
      <Skeleton className="h-4 w-40" />
    </Fieldset>
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
