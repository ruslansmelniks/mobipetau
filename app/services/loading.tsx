import { Skeleton } from "@/components/ui/skeleton"

export default function ServicesLoading() {
  return (
    <div className="min-h-screen">
      {/* Header skeleton */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Skeleton className="h-8 w-24" />
          <div className="hidden md:flex items-center gap-8">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-16 rounded" />
          </div>
          <Skeleton className="md:hidden h-6 w-6" />
        </div>
      </header>

      <main>
        {/* Hero section skeleton */}
        <section className="py-16 text-center px-4">
          <Skeleton className="h-10 w-96 mx-auto" />
          <Skeleton className="mt-4 h-16 max-w-2xl mx-auto" />
          <div className="mt-8 flex gap-4 justify-center">
            <Skeleton className="h-10 w-32" />
          </div>
        </section>

        {/* Services intro section skeleton */}
        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-4xl mx-auto text-center">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="mt-4 h-16 w-full mx-auto" />
          </div>
        </section>

        {/* Service section skeletons */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <Skeleton className="h-32 w-full mb-3" />
                <Skeleton className="h-20 w-full mb-3" />
                <Skeleton className="h-24 w-full mb-3" />
                <Skeleton className="h-20 w-full mb-3" />
                <Skeleton className="h-6 w-16 mt-6" />
              </div>
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
          </div>
        </section>

        <section className="py-12 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10">
              <Skeleton className="h-[300px] w-full rounded-lg order-2 md:order-1" />
              <div className="order-1 md:order-2">
                <Skeleton className="h-8 w-72 mb-4" />
                <Skeleton className="h-40 w-full mb-3" />
                <div className="mt-6 space-y-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works skeleton */}
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <Skeleton className="h-8 w-48 mx-auto mb-12" />
            <Skeleton className="h-4 w-72 mx-auto mb-10" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="w-10 h-10 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-4 w-36 mx-auto mb-2" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Skeleton className="h-4 w-96 mx-auto mb-2" />
              <Skeleton className="h-24 w-full max-w-2xl mx-auto mt-6" />
            </div>
          </div>
        </section>

        {/* FAQ skeleton */}
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-72 mx-auto mb-10" />

            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section skeleton */}
        <section className="py-16 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-12 w-36 mx-auto mb-8" />
            <Skeleton className="h-8 w-96 mx-auto mb-3" />
            <Skeleton className="h-4 w-72 mx-auto mb-8" />
            <Skeleton className="h-10 w-32 mx-auto" />
          </div>
        </section>
      </main>

      {/* Footer skeleton */}
      <footer className="bg-white border-t py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center md:justify-between items-center">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-64 hidden md:block" />
          </div>
          <Skeleton className="h-4 w-64 mx-auto mt-4 md:hidden" />
        </div>
      </footer>
    </div>
  )
}
