import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"

import type { DefaultMood } from "@/features/auth/api/authSessionQueryOptions"
import { authClient } from "@/features/auth/lib/auth-client"

export type UpdateProfileInput = {
  name: string
  username: string
  bio?: string
  defaultMood?: DefaultMood
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data, error } = await authClient.updateUser({
        name: input.name,
        username: input.username,
        displayUsername: input.username,
        bio: input.bio ?? "",
        defaultMood: input.defaultMood === "none" ? null : input.defaultMood,
      })

      if (error) {
        const err = new Error(error.message ?? "Failed to update settings")
        Object.assign(err, { code: error.code, status: error.status })
        throw err
      }

      return data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() })
      await queryClient.invalidateQueries({ queryKey: ["quacks"] })
      await queryClient.refetchQueries({ queryKey: authKeys.session() })
    },
  })
}
