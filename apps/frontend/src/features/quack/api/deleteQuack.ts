import { api } from "@/lib/api-client"

export const deleteQuack = async (quackId: string): Promise<void> => {
  await api.delete(`quacks/${quackId}`)
}

