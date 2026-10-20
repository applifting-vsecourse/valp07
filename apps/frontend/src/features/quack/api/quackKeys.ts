export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (filters?: { q?: string; mine?: boolean }) => [...quackKeys.lists(), filters] as const,
}
