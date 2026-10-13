import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { votePoll } from "@/features/quack/api/votePoll"

export function useVotePoll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      votePoll(pollId, optionId),
    onMutate: async ({ pollId, optionId }) => {
      await queryClient.cancelQueries({ queryKey: quackKeys.all() })
      const previousQueries = queryClient.getQueriesData<Quack[]>({
        queryKey: quackKeys.all(),
      })

      queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.all() }, (old) => {
        if (!old) return old
        return old.map((quack) => {
          if (quack.poll?.id !== pollId) return quack
          const poll = quack.poll
          const wasOptionId = poll.userVotedOptionId
          const isSwitch = Boolean(wasOptionId && wasOptionId !== optionId)
          const isFirstVote = !wasOptionId

          const newTotalVotes = isFirstVote ? poll.totalVotes + 1 : poll.totalVotes
          const newOptions = poll.options.map((opt) => {
            let count = opt.voteCount
            if (opt.id === optionId) {
              count += 1
            } else if (isSwitch && opt.id === wasOptionId) {
              count = Math.max(0, count - 1)
            }
            const pct = newTotalVotes > 0 ? Math.round((count / newTotalVotes) * 100) : 0
            return { ...opt, voteCount: count, percentage: pct }
          })

          return {
            ...quack,
            poll: {
              ...poll,
              totalVotes: newTotalVotes,
              userVotedOptionId: optionId,
              options: newOptions,
            },
          }
        })
      })

      return { previousQueries }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error("Unable to record your vote. Please try again.")
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
