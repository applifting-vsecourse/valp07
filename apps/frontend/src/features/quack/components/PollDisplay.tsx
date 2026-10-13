import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { useRetractPollVote } from "@/features/quack/hooks/useRetractPollVote"
import { useVotePoll } from "@/features/quack/hooks/useVotePoll"

type PollDisplayProps = {
  poll: Poll
  className?: string
}

export function PollDisplay({ poll, className }: PollDisplayProps) {
  const voteMutation = useVotePoll()
  const retractMutation = useRetractPollVote()

  const isMutating = voteMutation.isPending || retractMutation.isPending

  const handleOptionClick = (optionId: string) => {
    if (isMutating) return

    if (poll.userVotedOptionId === optionId) {
      retractMutation.mutate(poll.id)
    } else {
      voteMutation.mutate({ pollId: poll.id, optionId })
    }
  }

  const formatVoteCount = (count: number) => {
    return count === 1 ? "1 vote" : `${count} votes`
  }

  return (
    <div
      className={cn("mt-2 flex flex-col gap-2", className)}
      data-testid="poll-container"
    >
      <div
        className="flex flex-col gap-2"
        role="group"
        aria-label="Poll options"
      >
        {poll.options.map((option) => {
          const isSelected = poll.userVotedOptionId === option.id

          return (
            <button
              key={option.id}
              type="button"
              disabled={isMutating}
              onClick={() => handleOptionClick(option.id)}
              aria-pressed={isSelected}
              data-testid={`poll-option-${option.id}`}
              className={cn(
                "relative flex w-full items-center justify-between overflow-hidden rounded-md border p-2.5 text-left text-sm transition-colors",
                isSelected
                  ? "border-primary bg-primary/10 font-medium text-foreground"
                  : "border-border bg-secondary/30 text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {/* Fill bar */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 transition-all duration-300",
                  isSelected ? "bg-primary/20" : "bg-primary/10",
                )}
                style={{ width: `${option.percentage}%` }}
                aria-hidden="true"
              />

              {/* Option label & indicator */}
              <div className="relative z-10 flex items-center gap-2 pr-2">
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40",
                  )}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="size-3 stroke-[3]" />}
                </span>
                <span className="break-words">{option.text}</span>
              </div>

              {/* Votes count & percentage */}
              <div className="relative z-10 shrink-0 text-xs text-muted-foreground">
                <span>
                  {formatVoteCount(option.voteCount)} ({option.percentage}%)
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer summary */}
      <div className="text-xs text-muted-foreground">
        {poll.totalVotes === 0 ? "0 votes · No votes yet" : formatVoteCount(poll.totalVotes)}
      </div>
    </div>
  )
}
