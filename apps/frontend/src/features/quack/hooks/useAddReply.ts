import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { addReply } from "@/features/quack/api/addReply"
import { quackKeys } from "@/features/quack/api/quackKeys"

export function useAddReply(quackId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (text: string) => addReply({ quackId, text }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: quackKeys.replies(quackId) }),
        queryClient.invalidateQueries({ queryKey: quackKeys.detail(quackId) }),
        queryClient.invalidateQueries({ queryKey: quackKeys.lists() }),
      ])
      toast.success("Reply posted")
    },
    onError: () => {
      toast.error("Unable to post reply. Please try again.")
    },
  })
}
