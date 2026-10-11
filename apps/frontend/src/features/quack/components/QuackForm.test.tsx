import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({
  addQuack: vi.fn(),
}))

function renderQuackForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <QuackForm />
    </QueryClientProvider>,
  )
}

describe("QuackForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    window.HTMLElement.prototype.hasPointerCapture = vi.fn()
    window.HTMLElement.prototype.setPointerCapture = vi.fn()
    window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  })

  it("renders textarea and mood selector next to each other", () => {
    renderQuackForm()

    expect(screen.getByLabelText(/new quack/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/mood/i)).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /mood/i })).toBeInTheDocument()
  })

  it("submits quack without mood when mood is not selected", async () => {
    const user = userEvent.setup()
    vi.mocked(addQuack).mockResolvedValue({
      id: "q1",
      text: "Hello duck world",
      userId: "u1",
      createdAt: new Date(),
      user: { id: "u1", name: "Duck", username: "duck" },
    })

    renderQuackForm()

    await user.type(screen.getByLabelText(/new quack/i), "Hello duck world")
    await user.click(screen.getByRole("button", { name: /^quack$/i }))

    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({
      text: "Hello duck world",
      mood: undefined,
    })
  })

  it("submits quack with selected mood", async () => {
    const user = userEvent.setup()
    vi.mocked(addQuack).mockResolvedValue({
      id: "q2",
      text: "Such a funny day",
      mood: "silly",
      userId: "u1",
      createdAt: new Date(),
      user: { id: "u1", name: "Duck", username: "duck" },
    })

    renderQuackForm()

    await user.type(screen.getByLabelText(/new quack/i), "Such a funny day")

    const moodTrigger = screen.getByRole("combobox", { name: /mood/i })
    await user.click(moodTrigger)

    const sillyOption = await screen.findByRole("option", { name: "Silly" })
    await user.click(sillyOption)

    await user.click(screen.getByRole("button", { name: /^quack$/i }))

    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({
      text: "Such a funny day",
      mood: "silly",
    })
  })
})
