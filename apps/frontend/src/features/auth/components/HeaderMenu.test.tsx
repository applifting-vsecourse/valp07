import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"

import { HeaderMenu } from "@/features/auth/components/HeaderMenu"

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@tanstack/react-router")
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    Link: ({ to, children, ...props }: Record<string, unknown>) => (
      <a
        href={to as string}
        {...props}
      >
        {children as React.ReactNode}
      </a>
    ),
  }
})

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    getSession: vi.fn(),
    signOut: vi.fn(),
  },
}))

describe("HeaderMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Settings item with link to /settings in user dropdown", async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    queryClient.setQueryData(authKeys.session(), {
      user: {
        id: "u1",
        name: "Caffeinated Duck",
        username: "CaffeinatedDuck",
        email: "duck@pond.com",
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <HeaderMenu />
      </QueryClientProvider>,
    )

    const trigger = screen.getByRole("button", { name: /user menu/i })
    await user.click(trigger)

    const settingsLink = screen.getByRole("menuitem", { name: /settings/i })
    expect(settingsLink).toBeInTheDocument()
    expect(settingsLink).toHaveAttribute("href", "/settings")
  })
})
