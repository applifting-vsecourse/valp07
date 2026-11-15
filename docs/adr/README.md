# Architecture Decision Records (ADRs)

| Number                                     | Title                                                                       | Status   | Summary                                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-quack-replies-and-deletion.md) | Self-referencing Quack model for replies and conditional tombstone deletion | Accepted | Store replies as self-referencing `Quack` rows (`replyToId`) and scrub content with a `deletedAt` tombstone when deleting quacks that have active replies. |
