import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema, type Quack } from "@/features/quack/api/quackSchemas"

export async function getReplies(quackId: string): Promise<Quack[]> {
  const json = await api.get(`quacks/${quackId}/replies`).json()
  return quacksSchema.parse(json)
}

export const repliesQueryOptions = (quackId: string) =>
  queryOptions({
    queryKey: quackKeys.replies(quackId),
    queryFn: () => getReplies(quackId),
  })
