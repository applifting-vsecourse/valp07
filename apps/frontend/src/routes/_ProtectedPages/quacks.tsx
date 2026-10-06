import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearchBar } from "@/features/quack/components/QuackSearchBar"

const quacksSearchSchema = z.object({
  q: z.string().optional(),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  validateSearch: quacksSearchSchema,
  component: QuacksPage,
})

function QuacksPage() {
  const { q } = Route.useSearch()
  const navigate = Route.useNavigate()
  const quacksQuery = useQuery(quacksQueryOptions(q))

  const handleSearchChange = (newQuery: string) => {
    const trimmed = newQuery.trim()
    void navigate({
      search: (prev) => ({
        ...prev,
        q: trimmed || undefined,
      }),
      replace: true,
    })
  }

  const handleClearSearch = () => {
    void navigate({
      search: (prev) => {
        const next = { ...prev }
        delete next.q
        return next
      },
      replace: true,
    })
  }

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackForm className="mb-4" />

        <QuackSearchBar
          value={q ?? ""}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          className="mb-4"
        />

        <QuackList
          quacks={quacksQuery.data ?? []}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          searchQuery={q?.trim()}
          onClearSearch={handleClearSearch}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
        />
      </section>
    </>
  )
}
