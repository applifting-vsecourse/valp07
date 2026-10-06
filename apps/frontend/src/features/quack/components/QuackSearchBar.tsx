import { useEffect, useState } from "react"
import { Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type QuackSearchBarProps = {
  value: string
  onChange: (value: string) => void
  onClear?: () => void
  placeholder?: string
  className?: string
}

export function QuackSearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search quacks or authors...",
  className,
}: QuackSearchBarProps) {
  const [prevValue, setPrevValue] = useState(value)
  const [inputValue, setInputValue] = useState(value)

  if (prevValue !== value) {
    setPrevValue(value)
    setInputValue(value)
  }

  useEffect(() => {
    if (inputValue === value) return

    const timer = setTimeout(() => {
      onChange(inputValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, onChange, value])

  const handleClear = () => {
    setInputValue("")
    if (onClear) {
      onClear()
    } else {
      onChange("")
    }
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
      <Input
        type="text"
        role="searchbox"
        aria-label="Search quacks or authors"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder}
        className="pr-9 pl-9"
      />
      {inputValue ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="absolute right-2 text-muted-foreground hover:text-foreground"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}
