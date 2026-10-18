import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { retractPollVote } from "@/features/quack/api/retractPollVote"

export function useRetractPollVote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pollId: string) => retractPollVote(pollId),
    onMutate: async (pollId) => {
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
          if (!wasOptionId) return quack

          const newTotalVotes = Math.max(0, poll.totalVotes - 1)
          const newOptions = poll.options.map((opt) => {
            const count = opt.id === wasOptionId ? Math.max(0, opt.voteCount - 1) : opt.voteCount
            const pct = newTotalVotes > 0 ? Math.round((count / newTotalVotes) * 100) : 0
            return { ...opt, voteCount: count, percentage: pct }
          })

          return {
            ...quack,
            poll: {
              ...poll,
              totalVotes: newTotalVotes,
              userVotedOptionId: null,
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
