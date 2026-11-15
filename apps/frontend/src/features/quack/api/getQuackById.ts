import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quackSchema, type Quack } from "@/features/quack/api/quackSchemas"

export async function getQuackById(id: string): Promise<Quack> {
  const json = await api.get(`quacks/${id}`).json()
  return quackSchema.parse(json)
}

export const quackDetailQueryOptions = (id: string) =>
  queryOptions({
    queryKey: quackKeys.detail(id),
    queryFn: () => getQuackById(id),
  })
