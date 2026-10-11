import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { QuackSearchBar } from "@/features/quack/components/QuackSearchBar"

describe("QuackSearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders with placeholder and initial value", () => {
    render(
      <QuackSearchBar
        value="duck"
        onChange={vi.fn()}
      />,
    )

    const input = screen.getByRole("searchbox", { name: /search quacks or authors/i })
    expect(input).toHaveValue("duck")
    expect(input).toHaveAttribute("placeholder", "Search quacks or authors...")
  })

  it("debounces user input before calling onChange", () => {
    const onChange = vi.fn()

    render(
      <QuackSearchBar
        value=""
        onChange={onChange}
      />,
    )

    const input = screen.getByRole("searchbox", { name: /search quacks or authors/i })
    fireEvent.change(input, { target: { value: "pond" } })

    expect(onChange).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(onChange).toHaveBeenCalledWith("pond")
  })

  it("shows clear button when text is present and clears text on click", () => {
    const onChange = vi.fn()
    const onClear = vi.fn()

    const { rerender } = render(
      <QuackSearchBar
        value=""
        onChange={onChange}
        onClear={onClear}
      />,
    )

    expect(screen.queryByRole("button", { name: /clear search/i })).not.toBeInTheDocument()

    rerender(
      <QuackSearchBar
        value="feather"
        onChange={onChange}
        onClear={onClear}
      />,
    )

    const clearButton = screen.getByRole("button", { name: /clear search/i })
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)

    expect(onClear).toHaveBeenCalledOnce()
    expect(screen.getByRole("searchbox", { name: /search quacks or authors/i })).toHaveValue("")
  })
})
