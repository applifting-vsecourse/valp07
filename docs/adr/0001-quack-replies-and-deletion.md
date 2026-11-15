# 1. Self-referencing Quack model for replies and conditional tombstone deletion

## Status

Accepted

## Context

Users want to reply to quacks and follow discussions directly under the original post. Previously, users improvised discussions by posting new standalone quacks prefixed with `@username`, cluttering the timeline and disconnecting conversational context.

Two core architectural requirements shape how replies and deletion work across the entire application:

1. **Data modeling:** How replies are stored and linked to their parent post (`Quack` vs. a separate `Reply` table).
2. **Content deletion:** Replies belong to the people who wrote them — if an author deletes a quack that already has replies, those replies must not disappear with it. At the same time, when someone deletes their quack, its content has to genuinely disappear from the app (not in the feed, not in replies, not in search, and not in the database).

## Decision

1. **Self-referencing `Quack` model:** Replies are stored in the existing `quack` table using an optional foreign key `replyToId: String?` pointing to the parent `Quack.id` with `onDelete: Restrict`. Replies are strictly single-level (flat discussions under root quacks). Top-level posts have `replyToId = null`.
2. **Conditional Tombstone with Content Scrubbing:**
   - **Quack with zero replies:** Executed as a physical hard delete (`prisma.quack.delete`), removing the row and cascading any attached poll.
   - **Quack with active replies:** The author's content is permanently scrubbed in-place (`text` overwritten with `"[This quack was deleted by author]"`, `mood` set to `null`, any attached poll deleted) and `deletedAt` is set to `now()`. The row remains strictly as an anonymous tombstone anchor so child replies retain their thread parent.
   - **Reply deletion & automatic tombstone cleanup:** Deleting a reply executes a physical hard delete. If the reply's parent is already tombstoned (`deletedAt !== null`) and no active replies remain, the orphaned tombstone parent is automatically hard-deleted.

## Options considered

### Reply Storage

- **Option 1: Self-referencing `Quack` model with flat replies (Chosen)**
  - Reuses existing core infrastructure (author relationships, user joins, moderation actions, validation patterns) and keeps query structures simple with indexed foreign key lookups (`where: { replyToId: quackId }`).
- **Option 2: Dedicated `Reply` model (`model Reply`) (Rejected)**
  - Creates significant code duplication across backend and frontend (author relations, formatting, moderation deletion, test suites) and makes future promotion/sharing of replies awkward.
- **Option 3: Recursive nested tree structure (Rejected)**
  - Introduces substantial query overhead (Prisma lacks native recursive CTE support) and degrades mobile UX with deep visual indentation.

### Content Deletion

- **Option 1: Conditional Tombstone with Content Scrubbing (Chosen)**
  - Guarantees deleted content genuinely disappears from the database, feed, and search while preserving reply authors' discussions in context, and avoids database bloat for reply-less quacks.
- **Option 2: Universal Soft Delete (`deletedAt` on all deletions) (Rejected)**
  - Accumulates permanent empty shell rows in Postgres for quacks that never had replies.
- **Option 3: `onDelete: Cascade` (Rejected)**
  - Directly violates the product requirement that replies belong to their authors and must not disappear when the parent post is deleted.
- **Option 4: `onDelete: SetNull` (Rejected)**
  - Hard-deleting the parent and setting `replyToId = null` severs replies from each other and promotes them into orphaned standalone posts in the main feed without context.

## Consequences

What changes for the rest of the application:

1. **Feed and search queries must filter `replyToId: null` and `deletedAt: null`:** Every existing and future query fetching the main timeline or search results must explicitly filter both conditions so replies and deleted/tombstoned posts never appear in public feeds or search results.
2. **Database indexing:** Indexes on `replyToId` and `createdAt` are required to keep timeline filtering and chronological reply lookups fast.
3. **Application-level constraint enforcement:** Because replies share the `Quack` schema, application validation (DTOs and services) enforces that replies cannot have polls, cannot attach mood tags, and cannot themselves be replied to.
4. **No content recovery:** Because `text`, `mood`, and polls are permanently scrubbed on deletion, deleted quack content cannot be restored.
5. **Thread UI must handle tombstones:** Single-thread views (`/quacks/:id`) render a neutral tombstone placeholder when `deletedAt` is non-null without exposing author metadata or original content.
6. **Reversibility:** Splitting replies into a separate table later would require a high-risk schema and data migration.
