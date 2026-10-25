import { useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { Seo } from "@/components/Seo"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useSession } from "@/features/auth/hooks/useSession"
import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearchBar } from "@/features/quack/components/QuackSearchBar"

const quacksSearchSchema = z.object({
  q: z.string().optional(),
  tab: z.enum(["all", "mine"]).optional().default("all"),
})

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  validateSearch: quacksSearchSchema,
  component: QuacksPage,
})

function QuacksPage() {
  const { user } = useSession()
  const { q, tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  const quackFormRef = useRef<HTMLDivElement>(null)

  const activeTab = tab ?? "all"
  const isMineTab = activeTab === "mine"

  const quacksQuery = useQuery(
    quacksQueryOptions({
      q,
      mine: isMineTab,
    }),
  )

  const handleTabChange = (newTab: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        tab: newTab === "mine" ? "mine" : undefined,
      }),
      replace: true,
    })
  }

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

  const handleWriteFirstQuack = () => {
    const textarea = quackFormRef.current?.querySelector("textarea")
    textarea?.focus()
  }

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <div ref={quackFormRef}>
          <QuackForm
            defaultMood={user?.defaultMood}
            className="mb-4"
          />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
          </TabsList>
        </Tabs>

        <QuackSearchBar
          value={q ?? ""}
          onChange={handleSearchChange}
          onClear={handleClearSearch}
          className="mb-4"
        />

        <QuackList
          quacks={quacksQuery.data ?? []}
          currentUserId={user?.id}
          isAdmin={user?.role === "admin"}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          searchQuery={q?.trim()}
          activeTab={activeTab}
          onClearSearch={handleClearSearch}
          onWriteFirstQuack={handleWriteFirstQuack}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
        />
      </section>
    </>
  )
}
