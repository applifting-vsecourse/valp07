import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

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

import type { Quack } from "@/features/quack/api/quackSchemas"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type ReplyItemProps = {
  reply: Quack
  currentUserId?: string
  isAdmin?: boolean
}

export function ReplyItem({ reply, currentUserId, isAdmin = false }: ReplyItemProps) {
  const { name, username } = reply.user
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const deleteQuackMutation = useDeleteQuack()

  const isAuthor = Boolean(currentUserId && reply.userId === currentUserId)
  const canDelete = isAuthor || isAdmin

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const handleDelete = () => {
    deleteQuackMutation.mutate(reply.id, {
      onSuccess: () => {
        setIsConfirmOpen(false)
      },
    })
  }

  return (
    <>
      <article className="flex w-full gap-3 border-t border-border py-3 first:border-t-0">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-sm">
                <UsersName name={name} /> <UsersUserName username={username} />
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time>
            </div>

            {canDelete ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Delete reply"
                className="h-6 px-1.5 text-muted-foreground hover:text-destructive"
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash2 className="size-3.5" />
                <span className="text-xs">Delete</span>
              </Button>
            ) : null}
          </div>
          <p className="text-sm break-words whitespace-pre-line">{reply.text}</p>
        </div>
      </article>

      <Dialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete reply?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Your reply will be permanently removed.
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
