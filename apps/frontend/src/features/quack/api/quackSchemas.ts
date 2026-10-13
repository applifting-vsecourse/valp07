import { z } from "zod"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const moodSchema = z.enum(["happy", "sad", "angry", "silly"])
export type Mood = z.infer<typeof moodSchema>

export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  order: z.number(),
  voteCount: z.number(),
  percentage: z.number(),
})
export type PollOption = z.infer<typeof pollOptionSchema>

export const pollSchema = z.object({
  id: z.string(),
  quackId: z.string(),
  options: z.array(pollOptionSchema),
  totalVotes: z.number(),
  userVotedOptionId: z.string().nullable().optional(),
})
export type Poll = z.infer<typeof pollSchema>

export const quackSchema = z.object({
  id: z.string(),
  text: z.string(),
  mood: moodSchema.nullable().optional(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  poll: pollSchema.nullable().optional(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
