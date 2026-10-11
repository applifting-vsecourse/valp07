export const quackKeys = {
  all: () => ["quacks"] as const,
  lists: () => [...quackKeys.all(), "list"] as const,
  list: (filters?: { q?: string }) => [...quackKeys.lists(), filters] as const,
}
