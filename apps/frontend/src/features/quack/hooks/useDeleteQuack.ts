import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import { quackKeys } from "@/features/quack/api/quackKeys"

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteQuack,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: quackKeys.all() })
      toast.success("Quack deleted")
    },
    onError: () => {
      toast.error("Unable to delete quack. Please try again.")
    },
  })
}
