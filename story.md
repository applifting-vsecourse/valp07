# User Story: Search Quacks by Keyword or Author

**As a** signed-in Quacker user,  
**I want to** search for posts by typing a keyword or an author's name,  
**So that** I can easily find posts I remember from the feed without scrolling endlessly.

---

## Acceptance Criteria

### 1. Search Bar UI & Placement

- A search input is located on the main feed page (`apps/frontend/src/routes/_ProtectedPages/quacks.tsx`) between the new quack creation form and the feed list.
- The search bar features placeholder text: `"Search quacks or authors..."`.
- Includes an easy-to-click clear button (`×`) when text is entered.

### 2. Search Behavior & Matching

- **Fields Searched:** A single input matches against:
  - Post body text (`text`)
  - Author display name (`user.name`)
  - Author username (`user.username`)
- **Matching Logic:** Case-insensitive substring match (e.g., searching `"cat"` matches `"caterpillar"` and `"CaffeinatedDuck"`).
- **Execution:** Debounced live search (~300ms) as the user types. Empty or whitespace-only queries fetch the default unfiltered feed.
- **Pagination Edge:** Feed pagination is not yet implemented in the app; if/when pagination is added, changing the query must reset to page 1.

### 3. URL Synchronization

- The current query is synced to the URL search parameters (e.g., `/quacks?q=<term>`).
- Refreshing or sharing the URL preserves the search term and loads the matching filtered results.
- Clearing the search (via the `×` button, "Clear search" button, or clearing the input) completely removes `?q=` from the URL bar (returning cleanly to `/quacks`).

### 4. Feed & Network Behavior

- When a search query is typed, the feed issues a network request to `GET /quacks?q=<term>` and renders matches sorted newest-to-oldest.
- When the query is cleared or empty, the feed issues `GET /quacks` without the `q` parameter.

### 5. Empty State & Quack Creation

- If no results match the search query, display an empty state:
  - Message: _"No quacks found matching \"{q}\""_
  - A _"Clear search"_ button to reset the filter and URL.
- If a user posts a new quack while a search is active, the search filter remains active (the new quack will only appear in the feed if it matches the current filter).

---

## Out of Scope

- Advanced filters (date ranges, media-only posts, boolean operators like AND/NOT).
- Search autocomplete suggestions or search history dropdown.
- Highlighting matched keywords inside the feed cards.
