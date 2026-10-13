import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({
  addQuack: vi.fn(),
}))

function renderQuackForm(props?: { defaultMood?: "happy" | "sad" | "angry" | "silly" | "none" }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <QuackForm {...props} />
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
      poll: undefined,
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
      poll: undefined,
    })
  })

  it("starts with default mood selected and preserves it after submit", async () => {
    const user = userEvent.setup()
    vi.mocked(addQuack).mockResolvedValue({
      id: "q3",
      text: "Quacking with mood",
      mood: "happy",
      userId: "u1",
      createdAt: new Date(),
      user: { id: "u1", name: "Duck", username: "duck" },
    })

    renderQuackForm({ defaultMood: "happy" })

    expect(screen.getByRole("combobox", { name: /mood/i })).toHaveTextContent("Happy")

    await user.type(screen.getByLabelText(/new quack/i), "Quacking with mood")
    await user.click(screen.getByRole("button", { name: /^quack$/i }))

    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({
      text: "Quacking with mood",
      mood: "happy",
      poll: undefined,
    })

    // After reset, mood remains the default mood "Happy"
    expect(screen.getByRole("combobox", { name: /mood/i })).toHaveTextContent("Happy")
  })

  it("toggles poll inputs, adds/removes options, and submits quack with poll", async () => {
    const user = userEvent.setup()
    vi.mocked(addQuack).mockResolvedValue({
      id: "q4",
      text: "Where to lunch?",
      userId: "u1",
      createdAt: new Date(),
      user: { id: "u1", name: "Duck", username: "duck" },
    })

    renderQuackForm()

    // Click "Add poll"
    await user.click(screen.getByRole("button", { name: /add poll/i }))

    expect(screen.getByPlaceholderText("Option 1")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Option 2")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("Option 3")).not.toBeInTheDocument()

    // Add option 3
    await user.click(screen.getByRole("button", { name: /add option/i }))
    expect(screen.getByPlaceholderText("Option 3")).toBeInTheDocument()

    // Add option 4 (reaches max 4)
    await user.click(screen.getByRole("button", { name: /add option/i }))
    expect(screen.getByPlaceholderText("Option 4")).toBeInTheDocument()
    // "Add option" should disappear once 4 options are reached
    expect(screen.queryByRole("button", { name: /add option/i })).not.toBeInTheDocument()

    // Remove option 4
    await user.click(screen.getByRole("button", { name: /remove option 4/i }))
    expect(screen.queryByPlaceholderText("Option 4")).not.toBeInTheDocument()

    // Type text and options
    await user.type(screen.getByLabelText(/new quack/i), "Where to lunch?")
    await user.type(screen.getByPlaceholderText("Option 1"), "Pizza")
    await user.type(screen.getByPlaceholderText("Option 2"), "Burgers")
    await user.type(screen.getByPlaceholderText("Option 3"), "Salad")

    await user.click(screen.getByRole("button", { name: /^quack$/i }))

    expect(vi.mocked(addQuack).mock.calls[0]?.[0]).toEqual({
      text: "Where to lunch?",
      mood: undefined,
      poll: {
        options: ["Pizza", "Burgers", "Salad"],
      },
    })
  })

  it("validates empty poll options when attempting to submit", async () => {
    const user = userEvent.setup()
    renderQuackForm()

    await user.click(screen.getByRole("button", { name: /add poll/i }))
    await user.type(screen.getByLabelText(/new quack/i), "Where to lunch?")
    await user.click(screen.getByRole("button", { name: /^quack$/i }))

    expect(screen.getAllByText(/option text is required/i).length).toBe(2)
    expect(vi.mocked(addQuack)).not.toHaveBeenCalled()
  })

  it("removes poll cleanly when clicking Remove poll", async () => {
    const user = userEvent.setup()
    renderQuackForm()

    await user.click(screen.getByRole("button", { name: /add poll/i }))
    expect(screen.getByPlaceholderText("Option 1")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /remove poll/i }))
    expect(screen.queryByPlaceholderText("Option 1")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add poll/i })).toBeInTheDocument()
  })
})
