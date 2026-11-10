import { Loader2, RefreshCw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { ReplyItem } from "@/features/quack/components/ReplyItem"

type ReplyListProps = {
  replies: Quack[]
  currentUserId?: string
  isAdmin?: boolean
  isLoading?: boolean
  error?: Error | null
  onReload?: () => void
}

export function ReplyList({
  replies,
  currentUserId,
  isAdmin = false,
  isLoading,
  error,
  onReload,
}: ReplyListProps) {
  if (isLoading && replies.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        variant="destructive"
        className="my-2"
      >
        <AlertTitle>Couldn&apos;t load replies</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-3">
          <span>{error.message}</span>
          {onReload ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onReload}
            >
              <RefreshCw className="size-3.5" />
              Reload
            </Button>
          ) : null}
        </AlertDescription>
      </Alert>
    )
  }

  if (replies.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No replies yet. Be the first to quack back!
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      {replies.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  )
}
