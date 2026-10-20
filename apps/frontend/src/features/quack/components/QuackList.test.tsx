// Example component test — the pattern to copy for your own components.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  ...overrides,
})

function renderQuackList(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    renderQuackList(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    renderQuackList(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })

  it("renders a quack with its mood", () => {
    renderQuackList(<QuackList quacks={[quack({ mood: "happy" })]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("happy")).toBeInTheDocument()
    expect(screen.getByTestId("quack-mood")).toHaveTextContent("happy")
  })

  it("renders a quack without mood exactly as expected with no mood element", () => {
    renderQuackList(<QuackList quacks={[quack({ mood: null })]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.queryByTestId("quack-mood")).not.toBeInTheDocument()
  })

  it("renders default empty message when feed has no quacks and no query", () => {
    renderQuackList(<QuackList quacks={[]} />)

    expect(screen.getByText("No quacks yet. Post the first one.")).toBeInTheDocument()
  })

  it("renders search empty state with search query and working clear button", async () => {
    const onClearSearch = vi.fn()
    renderQuackList(
      <QuackList
        quacks={[]}
        searchQuery="bread crumbs"
        onClearSearch={onClearSearch}
      />,
    )

    expect(screen.getByText(/No quacks found matching “bread crumbs”/i)).toBeInTheDocument()
    const clearButton = screen.getByRole("button", { name: /clear search/i })
    expect(clearButton).toBeInTheDocument()

    await userEvent.click(clearButton)
    expect(onClearSearch).toHaveBeenCalledOnce()
  })

  it("renders mine tab empty message and triggers write quack", async () => {
    const onWriteFirstQuack = vi.fn()
    renderQuackList(
      <QuackList
        quacks={[]}
        activeTab="mine"
        onWriteFirstQuack={onWriteFirstQuack}
      />,
    )

    expect(screen.getByText("You haven't posted any quacks yet.")).toBeInTheDocument()
    const writeBtn = screen.getByRole("button", { name: /write your first quack/i })
    expect(writeBtn).toBeInTheDocument()
    await userEvent.click(writeBtn)
    expect(onWriteFirstQuack).toHaveBeenCalledOnce()
  })

  it("shows delete button only for user's own quacks", () => {
    const ownQuack = quack({ id: "q1", userId: "u1" })
    const otherQuack = quack({ id: "q2", userId: "u2", text: "other quack" })

    renderQuackList(
      <QuackList
        quacks={[ownQuack, otherQuack]}
        currentUserId="u1"
      />,
    )

    const deleteButtons = screen.getAllByRole("button", { name: /delete quack/i })
    expect(deleteButtons).toHaveLength(1)
  })

  it("does not show delete button when not signed in", () => {
    renderQuackList(
      <QuackList
        quacks={[quack()]}
      />,
    )

    expect(screen.queryByRole("button", { name: /delete quack/i })).not.toBeInTheDocument()
  })
})
