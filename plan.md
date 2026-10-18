# Implementation Plan: Polls on Quacks

This plan outlines the data model, API endpoints, and step-by-step build order to implement the polling feature defined in [`story.md`](story.md).

---

## 1. Data Model

### 1.1 Prisma Schema (`apps/backend/prisma/schema.prisma`)

Add models for `Poll`, `PollOption`, and `PollVote`, and update relations on `Quack` and `User`:

```prisma
model Quack {
  id        String   @id @default(cuid())
  text      String   @db.Text
  mood      Mood?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  poll      Poll?
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt

  @@index([userId])
  @@map("quack")
}

model Poll {
  id        String       @id @default(cuid())
  quackId   String       @unique
  quack     Quack        @relation(fields: [quackId], references: [id], onDelete: Cascade)
  options   PollOption[]
  votes     PollVote[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @default(now()) @updatedAt

  @@map("poll")
}

model PollOption {
  id        String     @id @default(cuid())
  pollId    String
  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  text      String     @db.VarChar(80)
  order     Int        @default(0)
  votes     PollVote[]

  @@index([pollId])
  @@map("poll_option")
}

model PollVote {
  id        String     @id @default(cuid())
  pollId    String
  poll      Poll       @relation(fields: [pollId], references: [id], onDelete: Cascade)
  optionId  String
  option    PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())

  // Database-enforced rule: One person, one vote per poll
  @@unique([pollId, userId])
  @@index([pollId])
  @@index([optionId])
  @@index([userId])
  @@map("poll_vote")
}
```

Add reverse relation on `User`:

```prisma
model User {
  // ... existing fields
  pollVotes PollVote[]
}
```

### 1.2 Domain Models (`apps/backend/src/modules/quack/domain/`)

- **`PollOption`**:
  ```ts
  export interface PollOption {
    id: string;
    text: string;
    order: number;
    voteCount: number;
    percentage: number;
  }
  ```
- **`Poll`**:
  ```ts
  export interface Poll {
    id: string;
    quackId: string;
    options: PollOption[];
    totalVotes: number;
    userVotedOptionId?: string | null;
  }
  ```
- **`Quack`**: Updated to include `poll?: Poll | null`.

---

## 2. API Endpoints

All endpoints are mounted under `/api` and require an authenticated session (`AuthenticatedUserGuard`).

### 2.1 Create Quack (with optional Poll)

- **Method:** `POST /api/quacks`
- **Request Body (`CreateQuackDto`):**
  ```json
  {
    "text": "Where should we go for lunch?",
    "mood": "happy",
    "poll": {
      "options": ["Pizza", "Burgers", "Salad"]
    }
  }
  ```
  - Validation:
    - `poll` is optional.
    - If present, `options` must be an array of 2 to 4 non-empty strings (1–80 characters each).
- **Behavior:** Creates the `Quack`, `Poll`, and `PollOption` records atomically in a Prisma transaction.
- **Response:** `201 Created` with `QuackResponseDto` (containing `poll`).

### 2.2 List Quacks (Feed)

- **Method:** `GET /api/quacks?q=`
- **Behavior:** Queries quacks with their attached polls and options. Aggregates vote counts per option and detects whether the current authenticated user has an active vote (`userVotedOptionId`).
- **Response:** `200 OK` with `QuackResponseDto[]`.
  - When a poll has 0 votes:
    ```json
    {
      "id": "poll-1",
      "totalVotes": 0,
      "userVotedOptionId": null,
      "options": [
        {
          "id": "opt-1",
          "text": "Pizza",
          "order": 0,
          "voteCount": 0,
          "percentage": 0
        },
        {
          "id": "opt-2",
          "text": "Burgers",
          "order": 1,
          "voteCount": 0,
          "percentage": 0
        }
      ]
    }
    ```

### 2.3 Cast or Change Vote

- **Method:** `PUT /api/polls/:pollId/vote`
- **Request Body (`VoteDto`):**
  ```json
  {
    "optionId": "opt-1"
  }
  ```
  - Validation: `optionId` must belong to the specified `pollId`.
- **Behavior:** Uses Prisma `upsert` on `PollVote` matching `@@unique([pollId, userId])`:
  - If no vote exists: creates a new `PollVote`.
  - If a vote already exists for this poll: updates `optionId` to the newly selected option.
- **Response:** `200 OK` with updated `PollResponseDto`.

### 2.4 Retract Vote

- **Method:** `DELETE /api/polls/:pollId/vote`
- **Behavior:** Deletes the record in `PollVote` where `pollId = :pollId` and `userId = req.user.id`.
- **Response:** `200 OK` with updated `PollResponseDto` (`userVotedOptionId: null`).

---

## 3. Order to Build It In

The implementation follows a dependency-driven order across 6 distinct phases:

```
[Phase 1: DB & Prisma] ──> [Phase 2: Backend Repository & Services] ──> [Phase 3: Backend API & Tests]
                                                                                   │
                                                                                   ▼
[Phase 6: Verification] <── [Phase 5: Frontend UI & Components] <── [Phase 4: Frontend API & State]
```

### Phase 1: Database & Schema Migration

1. **Edit Prisma Schema:**
   - Add `Poll`, `PollOption`, `PollVote` models in `apps/backend/prisma/schema.prisma`.
   - Update `Quack` and `User` relations.
2. **Apply Migration:**
   - Run `pnpm backend prisma:migrations:run` (or migrate dev) to create migration and generate client.
3. **Update Seeds:**
   - Update `apps/backend/prisma/seed.ts` to include a sample quack with a 3-option poll and initial votes.

### Phase 2: Backend Domain & Repository Layer

1. **Define Domain Types:**
   - Create domain models for `Poll` and `PollOption` in `apps/backend/src/modules/quack/domain/`.
   - Update `Quack` domain interface to include `poll`.
2. **Implement Repository Queries:**
   - Update `QuackRepository.getQuacks()` to include `poll`, its options, and votes count, computing `userVotedOptionId` for the caller.
   - Update `QuackRepository.createQuack()` to accept optional poll options and persist them in a transaction.
3. **Add Vote Operations to Repository:**
   - Implement `castVote(pollId, userId, optionId)` with upsert.
   - Implement `retractVote(pollId, userId)` with delete.
   - Implement `getPollById(pollId, userId)` to return computed tallies.

### Phase 3: Backend DTOs, Controllers & Unit Tests

1. **Create DTOs & Validation:**
   - `CreatePollDto` (validates array of 2–4 strings, 1–80 chars).
   - `VoteDto` (validates `optionId`).
   - `PollResponseDto` and `PollOptionResponseDto` with Swagger decorators.
2. **Controller Endpoints:**
   - Update `QuacksController.create` to pass poll options.
   - Create `PollsController` (or extend `QuacksController`) with `PUT /api/polls/:pollId/vote` and `DELETE /api/polls/:pollId/vote`.
3. **Backend Unit Tests:**
   - Write tests in `quacks.service.spec.ts` for poll creation, voting, switching, and vote retraction.

### Phase 4: Frontend Types, Schemas & API Client

1. **Zod Schemas (`quackSchemas.ts`):**
   - Add `pollOptionSchema` (`id`, `text`, `order`, `voteCount`, `percentage`).
   - Add `pollSchema` (`id`, `totalVotes`, `userVotedOptionId`, `options`).
   - Update `quackSchema` to include optional `poll`.
2. **API Functions:**
   - Update `addQuack.ts` to accept optional `poll: { options: string[] }`.
   - Add `votePoll.ts` (`PUT /api/polls/:pollId/vote`).
   - Add `retractPollVote.ts` (`DELETE /api/polls/:pollId/vote`).
3. **Mutation Hooks with Optimistic UI:**
   - Create `useVotePoll.ts` and `useRetractPollVote.ts`:
     - `onMutate`: Optimistically update TanStack Query cache (`quackKeys.all()`) by adjusting counts, percentages, and `userVotedOptionId`.
     - `onError`: Roll back to previous snapshot and trigger Sonner error toast: _"Unable to record your vote. Please try again."_
     - `onSettled`: Invalidate queries to ensure server consistency.

### Phase 5: Frontend UI & Components

1. **Poll Display Component (`PollDisplay.tsx`):**
   - Render option buttons with background fill progress bars.
   - Show votes count and percentage (e.g. `2 votes (50%)`).
   - Handle empty state when total votes = 0: `0 votes · No votes yet` with 0% fill bars.
   - Visual active radio indicator for the current user's selection.
   - On click: if clicked option is active, call retraction; if unselected, call vote mutation.
   - Keyboard accessibility: accessible button markup with `aria-pressed` or radiogroup semantics.
2. **Integrate into Feed (`QuackItem.tsx`):**
   - Render `<PollDisplay poll={quack.poll} />` under quack text when `quack.poll` is present.
3. **Update Composer Form (`QuackForm.tsx`):**
   - Add "Add poll" toggle button.
   - Dynamic option inputs (2 to 4 inputs).
   - "Add option" and "Remove option" buttons respecting limits.
   - "Remove poll" button to discard poll.
   - Client-side validation using Zod (`min 2, max 4, non-empty, max 80 chars`).

### Phase 6: Testing, Polish & Verification

1. **Frontend Unit Tests:**
   - `QuackForm.test.tsx`: Test adding/removing poll options, validation errors for blank options, submitting with poll.
   - `PollDisplay.test.tsx`: Test rendering empty states (0 votes), voting click triggers, retraction click triggers.
2. **Design System & Contrast Audit:**
   - Verify compliance with `DESIGN.md`: semantic color tokens only, hairline borders, no nested cards, sentence case text.
3. **Verification Command:**
   - Run `pnpm check-all` to ensure all linting, type-checking, backend unit tests, frontend unit tests, and build steps pass.
