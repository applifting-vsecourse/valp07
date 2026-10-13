import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { useSession } from "@/features/auth/hooks/useSession"
import { useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

const MAX_BIO_LENGTH = 160

const MOOD_OPTIONS: { value: "none" | "happy" | "sad" | "angry" | "silly"; label: string }[] = [
  { value: "none", label: "None" },
  { value: "happy", label: "Happy" },
  { value: "sad", label: "Sad" },
  { value: "angry", label: "Angry" },
  { value: "silly", label: "Silly" },
]

const settingsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, dots and underscores"),
  name: z.string().trim().min(1, "Display name is required"),
  bio: z
    .string()
    .max(MAX_BIO_LENGTH, `Bio must be at most ${MAX_BIO_LENGTH} characters`)
    .optional(),
  defaultMood: z.enum(["none", "happy", "sad", "angry", "silly"]),
})

export type SettingsFormValues = z.infer<typeof settingsSchema>

type SettingsFormProps = {
  className?: string
}

export function SettingsForm({ className }: SettingsFormProps) {
  const { user } = useSession()
  const updateProfile = useUpdateProfile()
  const [isSaved, setIsSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      username: user?.username ?? "",
      name: user?.name ?? "",
      bio: user?.bio ?? "",
      defaultMood: user?.defaultMood ?? "none",
    },
  })

  useEffect(() => {
    if (user && !form.formState.isDirty) {
      form.reset({
        username: user.username,
        name: user.name,
        bio: user.bio ?? "",
        defaultMood: user.defaultMood ?? "none",
      })
    }
  }, [user, form])

  const bioValue = useWatch({ control: form.control, name: "bio" }) ?? ""
  const bioLength = bioValue.length

  const handleDiscard = () => {
    if (!user) return
    form.reset({
      username: user.username,
      name: user.name,
      bio: user.bio ?? "",
      defaultMood: user.defaultMood ?? "none",
    })
    form.clearErrors()
    setIsSaved(false)
    setErrorMessage(null)
  }

  const handleSubmit = async (values: SettingsFormValues) => {
    setIsSaved(false)
    setErrorMessage(null)
    try {
      await updateProfile.mutateAsync(values)
      setIsSaved(true)
      form.reset(values)
      toast.success("Settings saved successfully")
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string }
      const isUsernameTaken =
        error?.code === "USERNAME_IS_ALREADY_TAKEN" ||
        (typeof error?.message === "string" && /already taken/i.test(error.message))

      if (isUsernameTaken) {
        form.setError("username", {
          type: "server",
          message: "Username is already taken. Please try another.",
        })
      } else {
        setErrorMessage(error?.message ?? "Failed to save settings")
      }
    }
  }

  const isPending = updateProfile.isPending

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-6", className)}
      >
        {isSaved ? (
          <Alert className="border-green-600/30 bg-green-500/10 text-green-700 dark:text-green-300">
            <CheckCircle2 className="size-4" />
            <AlertDescription>Settings saved successfully.</AlertDescription>
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Your display name"
                  disabled={isPending}
                  {...field}
                  onChange={(e) => {
                    setIsSaved(false)
                    field.onChange(e)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <div className="relative">
                <span className="pointer-events-none absolute top-2 left-3 text-sm text-muted-foreground">
                  @
                </span>
                <FormControl>
                  <Input
                    className="pl-7"
                    autoComplete="username"
                    placeholder="username"
                    disabled={isPending}
                    {...field}
                    onChange={(e) => {
                      setIsSaved(false)
                      field.onChange(e)
                    }}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Bio</FormLabel>
                <span
                  className={cn(
                    "text-xs",
                    bioLength > MAX_BIO_LENGTH ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {bioLength}/{MAX_BIO_LENGTH}
                </span>
              </div>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="A short bio about yourself..."
                  disabled={isPending}
                  {...field}
                  onChange={(e) => {
                    setIsSaved(false)
                    field.onChange(e)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default mood for new posts</FormLabel>
              <Select
                disabled={isPending}
                value={field.value}
                onValueChange={(val) => {
                  setIsSaved(false)
                  field.onChange(val)
                }}
              >
                <FormControl>
                  <SelectTrigger
                    aria-label="Default mood"
                    className="w-full"
                  >
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MOOD_OPTIONS.map(({ value, label }) => (
                    <SelectItem
                      key={value}
                      value={value}
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            disabled={isPending}
          >
            Discard
          </Button>
          <Button
            type="submit"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
