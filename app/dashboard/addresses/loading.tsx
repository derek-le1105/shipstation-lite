import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingAddresses() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <AddressSectionSkeleton key={index} />
      ))}
    </div>
  );
}

function AddressSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          <Skeleton className="h-5 w-1/2" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-3/4" />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>

        <AddressFieldsSkeleton />

        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddressFieldsSkeleton() {
  const fields: { key: string; span?: string; labelWidth: string }[] = [
    { key: "label", labelWidth: "w-24" },
    { key: "contact", labelWidth: "w-28" },
    { key: "company", labelWidth: "w-24" },
    { key: "phone", labelWidth: "w-20" },
    { key: "email", labelWidth: "w-20" },
    { key: "address1", span: "md:col-span-2", labelWidth: "w-32" },
    { key: "address2", span: "md:col-span-2", labelWidth: "w-32" },
    { key: "city", labelWidth: "w-20" },
    { key: "state", labelWidth: "w-28" },
    { key: "postal", labelWidth: "w-24" },
    { key: "country", labelWidth: "w-24" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map(({ key, span, labelWidth }) => (
        <div key={key} className={`grid gap-2 ${span ?? ""}`.trim()}>
          <Skeleton className={`h-4 ${labelWidth}`} />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="md:col-span-2 flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-sm" />
        <Skeleton className="h-4 flex-1" />
      </div>
    </div>
  );
}
