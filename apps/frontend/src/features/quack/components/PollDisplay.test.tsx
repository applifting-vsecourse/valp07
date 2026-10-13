import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { retractPollVote } from "@/features/quack/api/retractPollVote"
import { votePoll } from "@/features/quack/api/votePoll"
import { PollDisplay } from "@/features/quack/components/PollDisplay"

vi.mock("@/features/quack/api/votePoll", () => ({
  votePoll: vi.fn(),
}))

vi.mock("@/features/quack/api/retractPollVote", () => ({
  retractPollVote: vi.fn(),
}))

function renderPollDisplay(poll: Poll) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <PollDisplay poll={poll} />
    </QueryClientProvider>,
  )
}

describe("PollDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const emptyPoll: Poll = {
    id: "poll-1",
    quackId: "quack-1",
    totalVotes: 0,
    userVotedOptionId: null,
    options: [
      { id: "opt-1", text: "Pizza", order: 0, voteCount: 0, percentage: 0 },
      { id: "opt-2", text: "Burgers", order: 1, voteCount: 0, percentage: 0 },
    ],
  }

  it("renders empty poll with zero votes and empty state message", () => {
    renderPollDisplay(emptyPoll)

    expect(screen.getByText("Pizza")).toBeInTheDocument()
    expect(screen.getByText("Burgers")).toBeInTheDocument()
    expect(screen.getAllByText("0 votes (0%)").length).toBe(2)
    expect(screen.getByText("0 votes · No votes yet")).toBeInTheDocument()
  })

  it("calls votePoll when an unselected option is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(votePoll).mockResolvedValue({
      ...emptyPoll,
      totalVotes: 1,
      userVotedOptionId: "opt-1",
      options: [
        { id: "opt-1", text: "Pizza", order: 0, voteCount: 1, percentage: 100 },
        { id: "opt-2", text: "Burgers", order: 1, voteCount: 0, percentage: 0 },
      ],
    })

    renderPollDisplay(emptyPoll)

    await user.click(screen.getByRole("button", { name: /pizza/i }))

    expect(votePoll).toHaveBeenCalledWith("poll-1", "opt-1")
  })

  it("calls retractPollVote when the currently selected option is clicked", async () => {
    const user = userEvent.setup()
    vi.mocked(retractPollVote).mockResolvedValue(emptyPoll)

    const votedPoll: Poll = {
      ...emptyPoll,
      totalVotes: 1,
      userVotedOptionId: "opt-1",
      options: [
        { id: "opt-1", text: "Pizza", order: 0, voteCount: 1, percentage: 100 },
        { id: "opt-2", text: "Burgers", order: 1, voteCount: 0, percentage: 0 },
      ],
    }

    renderPollDisplay(votedPoll)

    const pizzaButton = screen.getByRole("button", { name: /pizza/i })
    expect(pizzaButton).toHaveAttribute("aria-pressed", "true")

    await user.click(pizzaButton)

    expect(retractPollVote).toHaveBeenCalledWith("poll-1")
  })
})
