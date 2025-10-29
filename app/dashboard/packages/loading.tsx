import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingPackages() {
  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Packages</h1>
        <p className="text-sm text-muted-foreground">
          Manage your saved packages. Updates here are available when you create
          future labels.
        </p>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-2">
              <Skeleton className="h-5 w-3/4" />
            </div>

            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="grid gap-2 md:col-span-4">
                  <Skeleton className="h-5 w-1/2" />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-full" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-5 w-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
