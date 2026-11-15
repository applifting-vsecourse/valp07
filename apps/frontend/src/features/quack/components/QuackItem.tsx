import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, MessageSquare, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/date"

import { repliesQueryOptions } from "@/features/quack/api/getReplies"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { PollDisplay } from "@/features/quack/components/PollDisplay"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { ReplyList } from "@/features/quack/components/ReplyList"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type QuackItemProps = {
  quack: Quack
  currentUserId?: string
  isAdmin?: boolean
  shouldShowInlineReplies?: boolean
  shouldShowThreadLink?: boolean
}

export function QuackItem({
  quack,
  currentUserId,
  isAdmin = false,
  shouldShowInlineReplies = true,
  shouldShowThreadLink = true,
}: QuackItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const deleteQuackMutation = useDeleteQuack()

  const repliesQuery = useQuery({
    ...repliesQueryOptions(quack.id),
    enabled: isExpanded && shouldShowInlineReplies,
  })

  const isAuthor = Boolean(currentUserId && quack.userId === currentUserId)
  const canDelete = isAuthor || isAdmin

  // Tombstone display if quack was deleted
  if (quack.deletedAt) {
    return (
      <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
        <div className="flex flex-1 flex-col gap-2 rounded-md bg-muted/40 p-3 text-muted-foreground">
          <p className="text-sm italic">This quack was deleted by its author.</p>
          {shouldShowThreadLink ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                aria-label="Toggle replies"
                className="h-7 px-2 text-muted-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <MessageSquare className="size-4" />
                <span className="text-xs">
                  {quack.replyCount ?? 0} {quack.replyCount === 1 ? "reply" : "replies"}
                </span>
              </Button>
              <a
                href={`/quacks/${quack.id}`}
                className="text-xs text-muted-foreground hover:underline"
              >
                View thread
              </a>
            </div>
          ) : null}
          {shouldShowInlineReplies && isExpanded ? (
            <div className="mt-2 border-t border-border pt-2">
              <ReplyList
                replies={repliesQuery.data ?? []}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isLoading={repliesQuery.isLoading}
                error={repliesQuery.error}
                onReload={() => void repliesQuery.refetch()}
              />
            </div>
          ) : null}
        </div>
      </article>
    )
  }

  const { name, username } = quack.user

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const handleDelete = () => {
    deleteQuackMutation.mutate(quack.id, {
      onSuccess: () => {
        setIsConfirmOpen(false)
      },
    })
  }

  return (
    <>
      <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
        <Avatar className="size-12">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <span>
                <UsersName name={name} /> <UsersUserName username={username} />
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
              {quack.mood ? (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span
                    data-testid="quack-mood"
                    className="text-xs text-muted-foreground capitalize"
                  >
                    {quack.mood}
                  </span>
                </>
              ) : null}
            </div>

            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete quack"
                className="h-7 px-2 text-muted-foreground hover:text-destructive"
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash2 className="size-4" />
                <span className="text-xs">Delete</span>
              </Button>
            ) : null}
          </div>
          <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
          {quack.poll ? <PollDisplay poll={quack.poll} /> : null}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              aria-label="Toggle replies"
              className="h-7 px-2 text-muted-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <MessageSquare className="size-4" />
              <span className="text-xs">
                {quack.replyCount ?? 0} {quack.replyCount === 1 ? "reply" : "replies"}
              </span>
            </Button>

            {shouldShowThreadLink ? (
              <a
                href={`/quacks/${quack.id}`}
                className="text-xs text-muted-foreground hover:underline"
              >
                View thread
              </a>
            ) : null}
          </div>

          {shouldShowInlineReplies && isExpanded ? (
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-2">
              <ReplyForm quackId={quack.id} />
              <ReplyList
                replies={repliesQuery.data ?? []}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                isLoading={repliesQuery.isLoading}
                error={repliesQuery.error}
                onReload={() => void repliesQuery.refetch()}
              />
            </div>
          ) : null}
        </div>
      </article>

      <Dialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete quack?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Your quack will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                variant="outline"
                disabled={deleteQuackMutation.isPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteQuackMutation.isPending}
            >
              {deleteQuackMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
