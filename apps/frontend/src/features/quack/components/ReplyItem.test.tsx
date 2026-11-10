import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { ReplyItem } from "@/features/quack/components/ReplyItem"

vi.mock("@/features/quack/api/deleteQuack", () => ({
  deleteQuack: vi.fn(),
}))

const aReply: Quack = {
  id: "r-1",
  text: "This is a great reply",
  userId: "author-1",
  replyToId: "q-1",
  replyCount: 0,
  createdAt: new Date("2026-03-01T10:00:00Z"),
  user: {
    id: "author-1",
    name: "Reply Author",
    username: "replyauthor",
  },
}

function renderReplyItem(reply: Quack, currentUserId?: string, isAdmin?: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ReplyItem
        reply={reply}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </QueryClientProvider>,
  )
}

describe("ReplyItem", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders author name, username, and reply text", () => {
    renderReplyItem(aReply, "other-user")

    expect(screen.getByText("Reply Author")).toBeInTheDocument()
    expect(screen.getByText("@replyauthor")).toBeInTheDocument()
    expect(screen.getByText("This is a great reply")).toBeInTheDocument()
  })

  it("does not render delete button for visitors or non-authors", () => {
    renderReplyItem(aReply, "other-user")
    expect(screen.queryByRole("button", { name: /delete reply/i })).not.toBeInTheDocument()
  })

  it("renders delete button for the author", () => {
    renderReplyItem(aReply, "author-1")
    expect(screen.getByRole("button", { name: /delete reply/i })).toBeInTheDocument()
  })

  it("renders delete button for admin even if not author", () => {
    renderReplyItem(aReply, "other-user", true)
    expect(screen.getByRole("button", { name: /delete reply/i })).toBeInTheDocument()
  })

  it("confirms and deletes reply upon clicking delete", async () => {
    vi.mocked(deleteQuack).mockResolvedValue(undefined)
    renderReplyItem(aReply, "author-1")

    const deleteBtn = screen.getByRole("button", { name: /delete reply/i })
    await userEvent.click(deleteBtn)

    expect(screen.getByText("Delete reply?")).toBeInTheDocument()

    const confirmBtn = screen.getByRole("button", { name: /^delete$/i })
    await userEvent.click(confirmBtn)

    await waitFor(() => {
      expect(deleteQuack).toHaveBeenCalledWith("r-1", expect.anything())
    })
  })
})
