# 1. Self-referencing Quack model for replies

## Status

Accepted

## Context

Users want to reply to quacks and follow discussions directly under the original post. Previously, users improvised discussions by posting new standalone quacks prefixed with `@username`, cluttering the timeline and disconnecting conversational context.

We need to store replies and link them to their parent post. When designing this capability, we must decide whether replies are represented as records in the existing `Quack` model (self-referencing table) or stored in an entirely separate `Reply` model.

This architectural decision has wide-ranging implications for the rest of the application: it directly affects how queries are written across every existing feed, how data integrity is maintained, how search and moderation operate, and how difficult it will be to change the domain model in the future.

## Decision

We model replies as self-referencing records in the existing `Quack` table using an optional foreign key `replyToId: String?` pointing to the parent `Quack.id`. Replies are strictly single-level (flat discussions under root quacks).

Top-level posts have `replyToId = null`, while replies have `replyToId = <parent-quack-id>`.

## Options considered

### Option 1: Self-referencing `Quack` model with flat replies (Chosen)

Replies are rows in the `quack` table with `replyToId` pointing to the parent quack.

- **Why chosen:**
  - Reuses existing core infrastructure (author relationships, user joins, moderation actions, validation patterns).
  - Keeps query structures simple without requiring parallel repositories, controllers, or DTO hierarchies for a near-identical post entity.
  - Supports flat 1-level discussions cleanly with standard indexed foreign key lookups (`where: { replyToId: quackId }`).

### Option 2: Dedicated `Reply` model (`model Reply`) (Rejected)

Create a separate database table and Prisma model specifically for replies, referencing `quackId` and `userId`.

- **Why rejected:**
  - Creates significant code duplication across both backend and frontend (author relationships, user metadata formatting, sanitization, moderation deletion, and test suites).
  - Rigid separation makes it difficult if product later decides to allow replies to be quote-quacked, reshared, or promoted to standalone posts.
  - Increases the number of tables and maintenance overhead for what is fundamentally authored text by a user.

### Option 3: Recursive nested tree structure (Rejected)

Allow replies to reference other replies indefinitely (Reddit/HackerNews style) within `Quack` or `Reply`.

- **Why rejected:**
  - Introduces substantial query and performance overhead; Prisma does not natively support recursive Common Table Expressions (CTEs), requiring multiple round-trips or complex raw SQL.
  - Degrades user experience on mobile screens due to deep visual indentation and thread collapse mechanics.
  - Unnecessary for Quacker's lightweight microblogging interaction model.

## Consequences

What changes for the rest of the application:

1. **Feed queries must filter on `replyToId`:**
   Every existing and future query that fetches the main timeline or standalone posts (such as `QuackRepository.findMany`, search filters, author profiles) must explicitly include `where: { replyToId: null }` so replies do not leak into the public feed as root posts.
2. **Database indexing:**
   An index on `replyToId` is required (`@@index([replyToId])`) to ensure filtering `replyToId: null` in timeline queries and lookups by `replyToId = :id` remain performant at scale.
3. **Application-level constraint enforcement:**
   Because replies share the `Quack` schema, application validation (DTOs and services) must enforce that replies cannot have polls, cannot attach mood tags, and cannot themselves be replied to (enforcing the 1-level invariant).
4. **Impact on Moderation and Admin tools:**
   Moderation features (such as moderator deletion) now operate on both top-level quacks and replies via the same repository and endpoints, but must respect the conditional tombstone rules when child replies exist.
5. **Reversibility (High cost to undo):**
   Once top-level quacks and replies coexist in the `quack` table and production data accumulates, separating replies into an independent table later would require a high-risk schema migration: creating a new table, migrating rows, updating foreign keys, refactoring all frontend API clients, and rewriting backend services.
