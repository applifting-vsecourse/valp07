export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (filters?: { q?: string; mine?: boolean }) => [...quackKeys.lists(), filters] as const,
  detail: (id: string) => [...quackKeys.all(), "detail", id] as const,
  replies: (id: string) => [...quackKeys.all(), "replies", id] as const,
}
