import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react"

import { Seo } from "@/components/Seo"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import { useSession } from "@/features/auth/hooks/useSession"
import { quackDetailQueryOptions } from "@/features/quack/api/getQuackById"
import { repliesQueryOptions } from "@/features/quack/api/getReplies"
import { QuackItem } from "@/features/quack/components/QuackItem"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { ReplyList } from "@/features/quack/components/ReplyList"

export const Route = createFileRoute("/_ProtectedPages/quacks/$id")({
  component: QuackThreadPage,
})

function QuackThreadPage() {
  const { id } = Route.useParams()
  const { user } = useSession()

  const quackQuery = useQuery(quackDetailQueryOptions(id))
  const repliesQuery = useQuery(repliesQueryOptions(id))

  const quack = quackQuery.data

  return (
    <>
      <Seo title={quack?.text ? `Quack: "${quack.text.slice(0, 30)}..."` : "Quack Thread"} />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center gap-2">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-1 px-2 text-muted-foreground"
          >
            <Link to="/quacks">
              <ArrowLeft className="size-4" />
              <span>All quacks</span>
            </Link>
          </Button>
        </div>

        {quackQuery.isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : null}

        {quackQuery.error ? (
          <Alert
            variant="destructive"
            className="mb-4"
          >
            <AlertTitle>Couldn&apos;t load quack</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{quackQuery.error.message}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void quackQuery.refetch()}
              >
                <RefreshCw className="size-4" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {quack ? (
          <div className="flex flex-col gap-4">
            <QuackItem
              quack={quack}
              currentUserId={user?.id}
              isAdmin={user?.role === "admin"}
              shouldShowInlineReplies={false}
              shouldShowThreadLink={false}
            />

            {!quack.deletedAt ? (
              <div className="border-t border-border pt-4">
                <ReplyForm quackId={quack.id} />
              </div>
            ) : null}

            <div className="border-t border-border pt-2">
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                Replies ({quack.replyCount})
              </h2>
              <ReplyList
                replies={repliesQuery.data ?? []}
                currentUserId={user?.id}
                isAdmin={user?.role === "admin"}
                isLoading={repliesQuery.isLoading}
                error={repliesQuery.error}
                onReload={() => void repliesQuery.refetch()}
              />
            </div>
          </div>
        ) : null}
      </section>
    </>
  )
}
