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
import { PollDisplay } from "@/features/quack/components/PollDisplay"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"
import { useDeleteQuack } from "@/features/quack/hooks/useDeleteQuack"

type QuackItemProps = {
  quack: Quack
  currentUserId?: string
}

export function QuackItem({ quack, currentUserId }: QuackItemProps) {
  const { name, username } = quack.user
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const deleteQuackMutation = useDeleteQuack()

  const isAuthor = Boolean(currentUserId && quack.userId === currentUserId)

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

            {isAuthor ? (
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
