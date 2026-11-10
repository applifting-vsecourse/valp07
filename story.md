# User Story: Quack Replies & Discussion Threads

## 1. Summary & Core Value Proposition

- **Who wants it:** Quacker users and community members who participate in discussions.
- **What they get:** The ability to reply directly to a quack, view chronologically organized replies inline within the feed or on a dedicated thread permalink page (`/quacks/:id`), and have peace of mind that their replies belong to them and will not be erased if the original author deletes the parent quack.
- **Why:** Previously, users improvised discussions by posting standalone quacks beginning with `@username`, cluttering the main feed and making conversations impossible to follow. Direct replies create clear context while respecting content ownership.

---

## 2. User Story

**As a** Quacker user,  
**I want to** reply directly to any quack and read threaded replies beneath it,  
**So that** I can engage in structured conversations where my contributions remain preserved even if the parent post is deleted.

---

## 3. Scope

### In Scope (MVP)

- **Single-Level Flat Discussions:** Users can reply to any top-level quack. All replies belong directly to the parent quack (1-level thread hierarchy).
- **Text-Only Lightweight Replies:** Replies contain text only (up to 280 characters). No moods or poll attachments on replies.
- **Hybrid Viewport Access:**
  - **Inline Feed Expansion:** Clicking the reply toggle button (`💬 X replies`) on a quack card in the feed expands an inline discussion accordion with replies and a quick-reply input without leaving the feed.
  - **Permalink Thread View (`/quacks/:id`):** Standalone route rendering the parent quack with full metadata, reply composer, and the complete chronological reply list.
- **Content Privacy & Ownership on Deletion (Conditional Tombstone):**
  - **Zero Replies:** Deleting a quack with 0 replies executes a physical hard delete.
  - **Has Replies:** Deleting a quack that has replies permanently scrubs the author's text (`[This quack was deleted by author]`), removes attached moods/polls, and sets `deletedAt = now()`. The row remains as an anonymous tombstone anchor so child replies written by other users are preserved.
  - **Reply Deletion:** Authors or moderators can delete individual replies. If the last reply under a tombstoned parent is deleted, the orphaned parent tombstone is cleaned up automatically.
- **Dynamic Reply Counts:** Reply counters are computed dynamically on query (`_count`), avoiding desynchronization risks.
- **Main Feed Hygiene:** Replies and tombstoned quacks are automatically filtered out of the main timeline (`where: { replyToId: null, deletedAt: null }`).

### Out of Scope (Deferred)

- Deeply nested recursive reply trees (replying to a reply).
- Poll attachments or mood tags inside replies.
- Rich-text / image attachments.
- Live WebSockets / real-time streaming updates (relies on TanStack Query window refocus refetching and cache invalidation).

---

## 4. Empty, Zero, and Loading States (Design Contract)

Per `DESIGN.md`, every component explicitly handles all states:

1. **Zero Replies State (Expanded or Permalink):**
   - Renders a clean empty state: `"No replies yet. Be the first to quack back!"`
2. **Reply Input Zero/Pristine State:**
   - Input displays placeholder `"Write a reply..."` with character counter `0 / 280`. Submit button is enabled for immediate validation feedback.
3. **Tombstone Card State:**
   - When a parent quack was deleted by its author, it displays a muted tombstone card: `"This quack was deleted by its author."` No avatar, username, mood, or poll is displayed. All existing replies render beneath it.
4. **Deleted Reply Under Tombstone (Last Child Deleted):**
   - Deleting the final reply under a tombstoned quack immediately purges both the reply and the tombstone parent, transitioning the feed or navigating back if on permalink.
5. **Loading States:**
   - Skeleton loader matching the height and avatar layout of reply items.

---

## 5. Functional Requirements

### 5.1 Backend & Data Model

- **Quack Model Extension:**
  - `replyToId String?`: Foreign key pointing to parent `Quack.id`.
  - `replyTo Quack? @relation("QuackReplies", fields: [replyToId], references: [id], onDelete: Restrict)`: Database-level safety rejecting physical deletion when replies exist.
  - `replies Quack[] @relation("QuackReplies")`: Child relation.
  - `deletedAt DateTime?`: Timestamp set when a quack with replies is deleted.
  - Composite indexes on `[replyToId]` and `[createdAt]`.
- **API Endpoints:**
  - `GET /quacks/:id/replies`: Returns replies ordered by `createdAt ASC` with author details (`User`).
  - `POST /quacks/:id/replies`: Validates text (1–280 chars), creates quack with `replyToId = :id` and authenticated `userId`.
  - `GET /quacks/:id`: Returns quack with author, poll, and replies.
  - `DELETE /quacks/:id`:
    - If `_count.replies === 0`: calls `prisma.quack.delete({ where: { id } })`.
    - If `_count.replies > 0`: updates quack to `deletedAt = now()`, scrubs `text = '[This quack was deleted by author]'`, removes poll if present.

### 5.2 Frontend UI & Behavior

- **`QuackItem` Feed Component:**
  - Shows reply count button (`💬 X`) alongside timestamp.
  - Clicking toggles inline reply section with divider.
- **`ReplyList` & `ReplyItem`:**
  - Displays replies with hairline divider, avatar, username, timestamp, and delete button (if current user is author or admin).
  - Uses semantic tokens (`text-muted-foreground`, `border-border`).
- **`ReplyForm`:**
  - Compact form with `<label>`, textarea, character count, and single primary button ("Reply").
  - Optimistic UI updates with automatic rollback and destructive toast on failure.

---

## 6. Acceptance Criteria (Verifiable in Browser: Yes / No)

### Criterion 1: Replying to a Quack Inline

- **Action:** In the main feed, click the "💬 Reply" button on a quack, type `"Great point!"`, and click "Reply".
- **Observable Result:** The reply appears immediately in the inline thread list with the current user's name, avatar, and timestamp. The reply count increments by 1.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 2: Replies Hidden from Main Feed

- **Action:** Refresh the main feed `/quacks`.
- **Observable Result:** The reply `"Great point!"` does not appear as a standalone post in the main timeline; it only appears under its parent quack when expanded or viewed.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 3: Zero Replies State

- **Action:** Click "💬 0 replies" on a brand new quack.
- **Observable Result:** The inline section opens showing the message: `"No replies yet. Be the first to quack back!"` and the reply form.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 4: Dedicated Thread Permalink (`/quacks/:id`)

- **Action:** Navigate directly in the browser address bar to `/quacks/<id>`.
- **Observable Result:** The page renders the parent quack at the top, followed by the reply composer and all existing replies in chronological order.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 5: Deleting a Quack with Active Replies (Tombstone & Content Scrubbing)

- **Action:** User A posts a quack. User B posts a reply to it. User A clicks the delete button on their quack and confirms deletion in the dialog.
- **Observable Result:** The parent quack disappears from the main feed. Navigating to the thread permalink displays a tombstone card: `"This quack was deleted by its author."` (original text and poll are completely gone). User B's reply remains visible and intact.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 6: Deleting a Quack with Zero Replies (Hard Delete)

- **Action:** Post a quack without any replies, then click "Delete" and confirm.
- **Observable Result:** The quack is completely removed from the feed and database. Navigating to its URL returns a 404 Not Found error page.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 7: Deleting a Reply

- **Action:** Click the delete button on your own reply and confirm.
- **Observable Result:** The reply is immediately removed from the thread list, and the parent quack's reply counter decrements by 1.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 8: Automatic Purge of Orphaned Tombstone

- **Action:** On a tombstoned parent quack that only has 1 reply remaining, delete that last reply.
- **Observable Result:** Both the reply and the tombstone parent are purged completely; navigating to the thread URL displays 404 Not Found.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 9: Character Limit and Validation

- **Action:** Attempt to submit an empty reply or enter 281 characters into the reply input.
- **Observable Result:** Form shows inline validation error preventing submission.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

---

## 7. Decisions Section

### Decision 1: Self-Referencing Quack vs Dedicated Reply Table

- **Chosen:** Self-referencing `Quack` model with `replyToId: String?`.
- **Rejected:** Dedicated `Reply` table.
- **Why Rejected:** A separate table introduces duplicated logic across backend and frontend for authoring, moderation, user attribution, and sanitization. Single-level replies share almost all attributes with quacks, making self-referencing simpler and more maintainable.

### Decision 2: Conversation Depth (Single-Level Flat vs Nested Tree)

- **Chosen:** 1-level flat threads (all replies attach directly to the root quack).
- **Rejected:** Arbitrary recursive nested trees (Reddit-style).
- **Why Rejected:** Deep nesting causes poor UX on mobile viewports, requires complex recursive CTE queries that Prisma does not natively support, and exceeds the PO's requirement for focused discussions under quacks.

### Decision 3: Handling Parent Deletion with Active Replies

- **Chosen:** Conditional tombstone with content scrubbing (`text` wiped, poll removed, `deletedAt = now()`) if replies exist; hard delete if 0 replies.
- **Rejected Option A (Cascading hard delete):** Rejected because it violates the core PO requirement that replies belong to their authors and must not disappear when a parent post is deleted.
- **Rejected Option B (`onDelete: SetNull`):** Rejected because setting parent references to null turns replies into confusing orphaned standalone posts in the main feed and destroys thread continuity.
- **Rejected Option C (Universal soft delete):** Rejected because it pollutes the database with permanent dead rows for quacks that had no replies.

### Decision 4: Reply Count Storage

- **Chosen:** Dynamic computation on-the-fly using Prisma `_count`.
- **Rejected:** Denormalized `replyCount: Int` column on `Quack`.
- **Why Rejected:** Denormalized counters store data twice, requiring brittle transactional synchronizations on every create, delete, and moderator wipe. Stored counters frequently drift out of sync during concurrent requests or direct DB operations.

### Decision 5: Foreign Key Referential Action

- **Chosen:** `onDelete: Restrict`.
- **Rejected:** `onDelete: Cascade` and `onDelete: SetNull`.
- **Why Rejected:** `Restrict` enforces database-level referential integrity, making it physically impossible for an errant script or service call to wipe out another user's replies.

---

## 8. Proposed Schema Change (`schema.prisma`)

```prisma
model Quack {
  id        String    @id @default(cuid())
  text      String    @db.Text
  mood      Mood?
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  poll      Poll?

  // Threading / replies relations
  replyToId String?
  replyTo   Quack?    @relation("QuackReplies", fields: [replyToId], references: [id], onDelete: Restrict)
  replies   Quack[]   @relation("QuackReplies")

  // Tombstone marker for deleted posts that have active replies
  deletedAt DateTime?

  createdAt DateTime  @default(now())
  updatedAt DateTime  @default(now()) @updatedAt

  @@index([userId])
  @@index([replyToId])
  @@index([createdAt])
  @@map("quack")
}
```
