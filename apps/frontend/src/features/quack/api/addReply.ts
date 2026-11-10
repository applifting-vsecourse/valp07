import { api } from "@/lib/api-client"

import { quackSchema, type Quack } from "@/features/quack/api/quackSchemas"

export async function addReply(input: { quackId: string; text: string }): Promise<Quack> {
  const json = await api
    .post(`quacks/${input.quackId}/replies`, { json: { text: input.text } })
    .json()
  return quackSchema.parse(json)
}
