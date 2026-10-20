import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

export type QuacksFilters = {
  q?: string
  mine?: boolean
}

export const quacksQueryOptions = (filters?: QuacksFilters) => {
  const trimmed = filters?.q?.trim()
  const isMine = filters?.mine ? true : undefined

  return queryOptions({
    queryKey: quackKeys.list({ q: trimmed, mine: isMine }),
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (trimmed) searchParams.set("q", trimmed)
      if (isMine) searchParams.set("mine", "true")

      const searchParamsObj = searchParams.size > 0 ? searchParams : undefined
      return quacksSchema.parse(await api.get("quacks", { searchParams: searchParamsObj }).json())
    },
  })
}
