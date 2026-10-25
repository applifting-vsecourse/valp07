import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { deleteQuack } from "@/features/quack/api/deleteQuack"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"

vi.mock("@/features/quack/api/deleteQuack", () => ({
  deleteQuack: vi.fn(),
}))

const aQuack: Quack = {
  id: "q-1",
  text: "My awesome quack",
  userId: "author-1",
  createdAt: new Date("2026-03-01T10:00:00Z"),
  user: {
    id: "author-1",
    name: "Quack Author",
    username: "quackauthor",
  },
}

function renderQuackItem(quack: Quack, currentUserId?: string, isAdmin?: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <QuackItem
        quack={quack}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </QueryClientProvider>,
  )
}

describe("QuackItem delete action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not render delete button when visitor is not the author", () => {
    renderQuackItem(aQuack, "other-user")
    expect(screen.queryByRole("button", { name: /delete quack/i })).not.toBeInTheDocument()
  })

  it("does not render delete button when visitor is signed out", () => {
    renderQuackItem(aQuack, undefined)
    expect(screen.queryByRole("button", { name: /delete quack/i })).not.toBeInTheDocument()
  })

  it("renders delete button when user is the author", () => {
    renderQuackItem(aQuack, "author-1")
    expect(screen.getByRole("button", { name: /delete quack/i })).toBeInTheDocument()
  })

  it("renders delete button when user is an admin even if not author", () => {
    renderQuackItem(aQuack, "other-user", true)
    expect(screen.getByRole("button", { name: /delete quack/i })).toBeInTheDocument()
  })

  it("asks to confirm before deleting and deletes upon confirmation", async () => {
    vi.mocked(deleteQuack).mockResolvedValue(undefined)

    renderQuackItem(aQuack, "author-1")

    const deleteBtn = screen.getByRole("button", { name: /delete quack/i })
    await userEvent.click(deleteBtn)

    // Confirmation dialog appears
    expect(screen.getByText("Delete quack?")).toBeInTheDocument()
    expect(
      screen.getByText("This action cannot be undone. Your quack will be permanently removed."),
    ).toBeInTheDocument()

    // Confirm delete inside dialog
    const confirmBtn = screen.getByRole("button", { name: /^delete$/i })
    await userEvent.click(confirmBtn)

    await waitFor(() => {
      expect(deleteQuack).toHaveBeenCalledWith("q-1", expect.anything())
    })
  })

  it("cancels deletion when Cancel button is clicked", async () => {
    renderQuackItem(aQuack, "author-1")

    const deleteBtn = screen.getByRole("button", { name: /delete quack/i })
    await userEvent.click(deleteBtn)

    expect(screen.getByText("Delete quack?")).toBeInTheDocument()

    const cancelBtn = screen.getByRole("button", { name: /cancel/i })
    await userEvent.click(cancelBtn)

    expect(deleteQuack).not.toHaveBeenCalled()
  })
})
