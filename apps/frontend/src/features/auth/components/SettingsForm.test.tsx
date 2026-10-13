import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authKeys } from "@/lib/auth-keys"

import { SettingsForm } from "@/features/auth/components/SettingsForm"
import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: {
    getSession: vi.fn(),
    updateUser: vi.fn(),
  },
}))

const mockUser = {
  id: "u1",
  name: "Daffy Duck",
  username: "daffy_duck",
  email: "daffy@pond.com",
  bio: "Just a duck doing duck things",
  defaultMood: "happy" as const,
}

function renderSettingsForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  queryClient.setQueryData(authKeys.session(), {
    user: mockUser,
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsForm />
    </QueryClientProvider>,
  )
}

describe("SettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    window.HTMLElement.prototype.hasPointerCapture = vi.fn()
    window.HTMLElement.prototype.setPointerCapture = vi.fn()
    window.HTMLElement.prototype.releasePointerCapture = vi.fn()
  })

  it("initializes form with user's current settings", () => {
    renderSettingsForm()

    expect(screen.getByLabelText(/display name/i)).toHaveValue("Daffy Duck")
    expect(screen.getByLabelText(/username/i)).toHaveValue("daffy_duck")
    expect(screen.getByLabelText(/bio/i)).toHaveValue("Just a duck doing duck things")
    expect(screen.getByRole("combobox", { name: /default mood/i })).toHaveTextContent("Happy")
  })

  it("validates username character rules and length", async () => {
    const user = userEvent.setup()
    renderSettingsForm()

    const usernameInput = screen.getByLabelText(/username/i)

    // Too short (< 3)
    await user.clear(usernameInput)
    await user.type(usernameInput, "ab")
    await user.click(screen.getByRole("button", { name: /save changes/i }))

    expect(await screen.findByText(/at least 3 characters/i)).toBeInTheDocument()

    // Invalid characters (e.g. space or special char)
    await user.clear(usernameInput)
    await user.type(usernameInput, "invalid name!")
    await user.click(screen.getByRole("button", { name: /save changes/i }))

    expect(await screen.findByText(/letters, numbers, dots and underscores/i)).toBeInTheDocument()
  })

  it("validates display name is required", async () => {
    const user = userEvent.setup()
    renderSettingsForm()

    const nameInput = screen.getByLabelText(/display name/i)
    await user.clear(nameInput)
    await user.click(screen.getByRole("button", { name: /save changes/i }))

    expect(await screen.findByText(/display name is required/i)).toBeInTheDocument()
  })

  it("validates bio maximum length of 160 characters", async () => {
    const user = userEvent.setup()
    renderSettingsForm()

    const bioInput = screen.getByLabelText(/bio/i)
    await user.clear(bioInput)
    await user.type(bioInput, "a".repeat(161))
    await user.click(screen.getByRole("button", { name: /save changes/i }))

    expect(await screen.findByText(/at most 160 characters/i)).toBeInTheDocument()
  })

  it("discards changes and restores saved user values", async () => {
    const user = userEvent.setup()
    renderSettingsForm()

    const nameInput = screen.getByLabelText(/display name/i)
    const usernameInput = screen.getByLabelText(/username/i)
    const bioInput = screen.getByLabelText(/bio/i)

    await user.clear(nameInput)
    await user.type(nameInput, "New Name")

    await user.clear(usernameInput)
    await user.type(usernameInput, "new_username")

    await user.clear(bioInput)
    await user.type(bioInput, "New Bio")

    expect(nameInput).toHaveValue("New Name")
    expect(usernameInput).toHaveValue("new_username")
    expect(bioInput).toHaveValue("New Bio")

    await user.click(screen.getByRole("button", { name: /discard/i }))

    expect(nameInput).toHaveValue("Daffy Duck")
    expect(usernameInput).toHaveValue("daffy_duck")
    expect(bioInput).toHaveValue("Just a duck doing duck things")
  })

  it("shows error next to username field when username is taken and preserves typed username", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.updateUser).mockResolvedValue({
      data: null,
      error: {
        code: "USERNAME_IS_ALREADY_TAKEN",
        message: "Username is already taken. Please try another.",
        status: 400,
        statusText: "Bad Request",
      },
    })

    renderSettingsForm()

    const usernameInput = screen.getByLabelText(/username/i)
    await user.clear(usernameInput)
    await user.type(usernameInput, "taken_name")

    await user.click(screen.getByRole("button", { name: /save changes/i }))

    expect(await screen.findByText(/username is already taken/i)).toBeInTheDocument()
    // What was typed stays there
    expect(usernameInput).toHaveValue("taken_name")
  })

  it("saves changes successfully and shows confirmation", async () => {
    const user = userEvent.setup()
    vi.mocked(authClient.updateUser).mockResolvedValue({
      data: { status: true },
      error: null,
    })
    vi.mocked(authClient.getSession).mockResolvedValue({
      data: {
        user: {
          id: "u1",
          name: "Updated Duck",
          username: "updated_duck",
          displayUsername: "updated_duck",
          email: "daffy@pond.com",
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          bio: "Updated Bio",
          defaultMood: "silly",
        },
        session: {
          id: "s1",
          userId: "u1",
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(),
          token: "tok",
        },
      },
      error: null,
    })

    renderSettingsForm()

    const nameInput = screen.getByLabelText(/display name/i)
    const usernameInput = screen.getByLabelText(/username/i)

    await user.clear(nameInput)
    await user.type(nameInput, "Updated Duck")

    await user.clear(usernameInput)
    await user.type(usernameInput, "updated_duck")

    await user.click(screen.getByRole("button", { name: /save changes/i }))

    await waitFor(() => {
      expect(authClient.updateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Duck",
          username: "updated_duck",
          displayUsername: "updated_duck",
        }),
      )
    })

    expect(await screen.findByText(/settings saved successfully/i)).toBeInTheDocument()
  })
})
