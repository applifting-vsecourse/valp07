import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

export const quacksQueryOptions = (q?: string) => {
  const trimmed = q?.trim()
  return queryOptions({
    queryKey: quackKeys.list(trimmed ? { q: trimmed } : undefined),
    queryFn: async () => {
      const searchParams = trimmed ? { q: trimmed } : undefined
      return quacksSchema.parse(await api.get("quacks", { searchParams }).json())
    },
  })
}
