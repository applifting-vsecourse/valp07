import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addReply } from "@/features/quack/api/addReply"
import { ReplyForm } from "@/features/quack/components/ReplyForm"

vi.mock("@/features/quack/api/addReply", () => ({
  addReply: vi.fn(),
}))

function renderReplyForm(quackId: string, onSuccess?: () => void) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ReplyForm
        quackId={quackId}
        onSuccess={onSuccess}
      />
    </QueryClientProvider>,
  )
}

describe("ReplyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders textarea, character count, and submit button", () => {
    renderReplyForm("q-1")

    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/quack your reply/i)).toBeInTheDocument()
    expect(screen.getByText("0/280")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^reply$/i })).toBeInTheDocument()
  })

  it("shows validation error when attempting to submit empty text", async () => {
    renderReplyForm("q-1")

    const submitBtn = screen.getByRole("button", { name: /^reply$/i })
    await userEvent.click(submitBtn)

    expect(screen.getByRole("alert")).toHaveTextContent("Reply text cannot be empty")
    expect(addReply).not.toHaveBeenCalled()
  })

  it("updates character count as user types", async () => {
    renderReplyForm("q-1")

    const textarea = screen.getByPlaceholderText(/quack your reply/i)
    await userEvent.type(textarea, "Hello world")

    expect(screen.getByText("11/280")).toBeInTheDocument()
  })

  it("submits valid reply and clears input", async () => {
    vi.mocked(addReply).mockResolvedValue({
      id: "r-1",
      text: "Nice quack!",
      userId: "u-1",
      createdAt: new Date(),
      replyCount: 0,
      user: { id: "u-1", name: "User", username: "user" },
    })

    const onSuccess = vi.fn()
    renderReplyForm("q-1", onSuccess)

    const textarea = screen.getByPlaceholderText(/quack your reply/i)
    await userEvent.type(textarea, "Nice quack!")

    const submitBtn = screen.getByRole("button", { name: /^reply$/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      expect(addReply).toHaveBeenCalledWith({
        quackId: "q-1",
        text: "Nice quack!",
      })
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(textarea).toHaveValue("")
  })
})
