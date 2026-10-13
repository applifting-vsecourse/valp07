import { api } from "@/lib/api-client"

import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

export async function retractPollVote(pollId: string): Promise<Poll> {
  const json = await api.delete(`polls/${pollId}/vote`).json()
  return pollSchema.parse(json)
}
