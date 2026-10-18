import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { BarChart2, Loader2, Plus, Trash2 } from "lucide-react"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
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

import { moodSchema, type Mood } from "@/features/quack/api/quackSchemas"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

const MOODS: { value: Mood; label: string }[] = [
  { value: "happy", label: "Happy" },
  { value: "sad", label: "Sad" },
  { value: "angry", label: "Angry" },
  { value: "silly", label: "Silly" },
]

const schema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Write something first")
      .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
    mood: z.union([moodSchema, z.literal("none")]).optional(),
    hasPoll: z.boolean(),
    pollOptions: z
      .array(
        z.object({
          value: z.string().max(80, "Keep option under 80 characters"),
        }),
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasPoll) {
      if (!data.pollOptions || data.pollOptions.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Poll must have at least 2 options",
          path: ["pollOptions"],
        })
      } else if (data.pollOptions.length > 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Poll can have at most 4 options",
          path: ["pollOptions"],
        })
      } else {
        data.pollOptions.forEach((opt, idx) => {
          if (!opt.value.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Option text is required",
              path: ["pollOptions", idx, "value"],
            })
          }
        })
      }
    }
  })

type FormValues = z.infer<typeof schema>

type QuackFormProps = {
  className?: string
  defaultMood?: Mood | "none"
}

export function QuackForm({ className, defaultMood = "none" }: QuackFormProps) {
  const addQuack = useAddQuack()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: "",
      mood: defaultMood,
      hasPoll: false,
      pollOptions: [{ value: "" }, { value: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "pollOptions",
  })

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset({
        text: form.getValues("text"),
        mood: defaultMood,
        hasPoll: form.getValues("hasPoll"),
        pollOptions: form.getValues("pollOptions"),
      })
    }
  }, [defaultMood, form])

  const text = useWatch({ control: form.control, name: "text" })
  const hasPoll = useWatch({ control: form.control, name: "hasPoll" })
  const length = text?.length ?? 0

  const handleAddPoll = () => {
    form.setValue("hasPoll", true)
    if (!fields || fields.length < 2) {
      form.setValue("pollOptions", [{ value: "" }, { value: "" }])
    }
  }

  const handleRemovePoll = () => {
    form.setValue("hasPoll", false)
    form.setValue("pollOptions", [{ value: "" }, { value: "" }])
    form.clearErrors("pollOptions")
  }

  const handleSubmit = (values: FormValues) => {
    const mood = values.mood && values.mood !== "none" ? values.mood : undefined
    const poll =
      values.hasPoll && values.pollOptions && values.pollOptions.length >= 2
        ? { options: values.pollOptions.map((o) => o.value.trim()) }
        : undefined

    addQuack.mutate(
      { text: values.text, mood, poll },
      {
        onSuccess: () => {
          form.reset({
            text: "",
            mood: defaultMood,
            hasPoll: false,
            pollOptions: [{ value: "" }, { value: "" }],
          })
        },
      },
    )
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-start gap-3">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>New quack</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Quack something..."
                    disabled={addQuack.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem className="w-32 sm:w-36">
                <FormLabel>Mood</FormLabel>
                <Select
                  disabled={addQuack.isPending}
                  value={field.value ?? "none"}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger
                      aria-label="Mood"
                      className="w-full"
                    >
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {MOODS.map(({ value, label }) => (
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
        </div>

        {/* Poll Builder Section */}
        {hasPoll ? (
          <div
            className="space-y-3 rounded-md border border-border p-3"
            data-testid="poll-builder"
          >
            <div className="flex items-center justify-between">
              <FormLabel className="text-sm font-medium">Poll options</FormLabel>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePoll}
                disabled={addQuack.isPending}
              >
                Remove poll
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`pollOptions.${index}.value`}
                  render={({ field: inputField }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            placeholder={`Option ${index + 1}`}
                            disabled={addQuack.isPending}
                            maxLength={80}
                            {...inputField}
                          />
                        </FormControl>
                        {fields.length > 2 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={addQuack.isPending}
                            aria-label={`Remove option ${index + 1}`}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            {fields.length < 4 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={addQuack.isPending}
                onClick={() => append({ value: "" })}
                className="gap-1.5"
              >
                <Plus className="size-3.5" />
                Add option
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div>
            {!hasPoll ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddPoll}
                disabled={addQuack.isPending}
                className="gap-1.5"
              >
                <BarChart2 className="size-3.5" />
                Add poll
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "text-sm",
                length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {length}/{MAX_LENGTH}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={addQuack.isPending}
            >
              {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Quack
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
