import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { ReplyList } from "@/features/quack/components/ReplyList"

const sampleReplies: Quack[] = [
  {
    id: "r-1",
    text: "First reply",
    userId: "u-1",
    replyToId: "q-1",
    replyCount: 0,
    createdAt: new Date("2026-03-01T10:00:00Z"),
    user: { id: "u-1", name: "User One", username: "userone" },
  },
  {
    id: "r-2",
    text: "Second reply",
    userId: "u-2",
    replyToId: "q-1",
    replyCount: 0,
    createdAt: new Date("2026-03-01T10:05:00Z"),
    user: { id: "u-2", name: "User Two", username: "usertwo" },
  },
]

function renderReplyList(
  replies: Quack[],
  isLoading = false,
  error: Error | null = null,
  onReload?: () => void,
) {
  const queryClient = new QueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <ReplyList
        replies={replies}
        isLoading={isLoading}
        error={error}
        onReload={onReload}
      />
    </QueryClientProvider>,
  )
}

describe("ReplyList", () => {
  it("renders empty state when there are no replies", () => {
    renderReplyList([])
    expect(screen.getByText("No replies yet. Be the first to quack back!")).toBeInTheDocument()
  })

  it("renders error alert with retry button when error occurs", () => {
    const onReload = vi.fn()
    renderReplyList([], false, new Error("Failed to fetch replies"), onReload)

    expect(screen.getByText("Couldn't load replies")).toBeInTheDocument()
    expect(screen.getByText("Failed to fetch replies")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /reload/i })).toBeInTheDocument()
  })

  it("renders all replies in the list", () => {
    renderReplyList(sampleReplies)

    expect(screen.getByText("First reply")).toBeInTheDocument()
    expect(screen.getByText("Second reply")).toBeInTheDocument()
    expect(screen.getByText("User One")).toBeInTheDocument()
    expect(screen.getByText("User Two")).toBeInTheDocument()
  })
})
