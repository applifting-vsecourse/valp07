import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { useAddReply } from "@/features/quack/hooks/useAddReply"

type ReplyFormProps = {
  quackId: string
  onSuccess?: () => void
  className?: string
}

const MAX_LENGTH = 280

export function ReplyForm({ quackId, onSuccess, className = "" }: ReplyFormProps) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const addReplyMutation = useAddReply(quackId)

  const remainingChars = MAX_LENGTH - text.length
  const isOverLimit = remainingChars < 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = text.trim()
    if (!trimmed) {
      setError("Reply text cannot be empty")
      return
    }

    if (text.length > MAX_LENGTH) {
      setError(`Reply cannot exceed ${MAX_LENGTH} characters`)
      return
    }

    setError(null)
    addReplyMutation.mutate(trimmed, {
      onSuccess: () => {
        setText("")
        onSuccess?.()
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-2 pt-2 ${className}`}
    >
      <div className="flex flex-col gap-1">
        <Label
          htmlFor={`reply-input-${quackId}`}
          className="text-xs text-muted-foreground"
        >
          Write a reply
        </Label>
        <Textarea
          id={`reply-input-${quackId}`}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (error) setError(null)
          }}
          placeholder="Quack your reply..."
          rows={2}
          className="resize-none text-sm"
          disabled={addReplyMutation.isPending}
        />
        {error ? (
          <p
            role="alert"
            className="text-xs text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${
            isOverLimit ? "font-semibold text-destructive" : "text-muted-foreground"
          }`}
        >
          {text.length}/{MAX_LENGTH}
        </span>
        <Button
          type="submit"
          size="sm"
          disabled={addReplyMutation.isPending || isOverLimit}
        >
          {addReplyMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : null}
          Reply
        </Button>
      </div>
    </form>
  )
}
