# User Story: Polls on Quacks

## 1. Summary & Core Value Proposition

- **Who wants it:** Quacker authors who want to ask a question to the community, and Quacker readers who want to answer.
- **What they get:** The ability to attach a multiple-choice poll (2 to 4 options) to a quack, vote instantly with one click, change or retract their choice, and view accurate aggregate counts and percentages.
- **Why:** To eliminate manual counting of reply comments, prevent tallying errors, and avoid burying the original post under dozens of reply messages.

---

## 2. User Story

**As a** Quacker user,  
**I want to** attach a multiple-choice poll to my quack and allow others to vote on it,  
**So that** I can get accurate, aggregated answers immediately without tallying manual replies.

---

## 3. Scope

### In Scope (MVP)

- **Poll Creation:** Authors can optionally attach a poll with 2 to 4 options when composing a quack. The main quack body text serves as the question prompt.
- **Single-Choice Voting:** Authenticated users can cast exactly one vote per poll.
- **Vote Modification & Retraction:** Users can change their vote to another option, or click their selected option again to deselect and retract their vote.
- **Immediate Feedback:** Optimistic UI updates vote counts and active selections instantly. If an error occurs, the UI rolls back and displays an error toast.
- **Public & Anonymous Tallies:** Option counts and percentages are visible to all users at all times. Individual voter identities remain anonymous.
- **Self-Voting:** The author of a quack can vote in their own poll.
- **Lifecycle:** Polls remain open indefinitely for MVP (no expiration timer, no manual close button).

### Out of Scope (Deferred to Future Iterations)

- Multiple-choice selections (checkboxes / multi-select).
- Scheduled poll expiration or auto-close timer.
- Manual poll closing by the author.
- Non-anonymous voter lists (e.g., clicking to see which user voted for what).
- Standalone poll question field distinct from the quack body text.
- WebSockets or continuous background polling (uses standard TanStack Query refetching on window focus and user action).

---

## 4. What Happens When There Is Nothing to Show (Empty States & Zero Values)

Per the project design contract (`DESIGN.md`), every component must explicitly define its empty and zero states:

1. **Poll with Zero Votes (New Poll):**
   - Each option displays `0 votes (0%)`.
   - The option background fill bar has `0%` width.
   - The footer displays summary text: `0 votes · No votes yet`.
   - No option has an active/selected radio indicator.
2. **Poll Form Initial State (When Clicking "Add poll"):**
   - Two empty option input fields appear with placeholder examples (e.g., "Option 1", "Option 2").
   - The submit button shows clear inline validation under fields if the user attempts to submit while options are blank.
3. **Removing/Cancelling Poll Attachment:**
   - If the author decides not to include a poll before posting, clicking "Remove poll" clears the poll inputs and restores the default quack form with no poll container rendered.

---

## 5. Functional Requirements

### 5.1 Poll Creation

- The `QuackForm` includes an "Add poll" button.
- When clicked, inputs for options are shown:
  - Minimum 2 options, maximum 4 options.
  - "Add option" button is available when fewer than 4 options exist.
  - "Remove option" icon button is available on each row when more than 2 options exist.
  - "Remove poll" button discards the poll attachment.
  - Each option field has a maximum length of 80 characters.
  - Validation: Form submission is blocked with inline error text if quack body is empty, if any option is empty, or if fewer than 2 options exist.

### 5.2 Poll Display

- Rendered inside the `QuackCard` below the quack text and mood badge.
- Contained with standard spacing and hairline divider (`border-border`), never as a nested card.
- Each option row displays:
  - Option text.
  - Fill bar indicating percentage of total votes.
  - Text badge showing vote count and percentage (e.g., `4 votes (40%)`).
  - Active radio highlight if the current logged-in user voted for this option.
- Bottom metadata line displays total votes count (e.g., `10 votes`).

### 5.3 Voting & Interaction

- Clicking an unselected option:
  - If user had not voted: increments option vote count by 1, marks option as selected.
  - If user had voted for another option: decrements previous option by 1, increments new option by 1, moves selection.
- Clicking the currently selected option:
  - Deselects the option, decrements its count by 1, total votes decrements by 1 (vote retraction).
- **Error Handling & Rollback:**
  - If the server request fails, the UI immediately reverts to the pre-click state and displays a destructive toast notification: _"Unable to record your vote. Please try again."_

---

## 6. Acceptance Criteria (Verifiable in Browser: Yes / No)

Every criterion below is directly observable and testable in the browser UI.

### Criterion 1: Optional Poll Attachment in Composer

- **Action:** In the browser, navigate to the Quacks feed and observe the post composer form. Click "Add poll".
- **Observable Result:** Two option input fields appear with an "Add option" button and a "Remove poll" button.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 2: Option Count Limits (2 to 4 options)

- **Action:** Click "Add option" until 4 options are present, then inspect the buttons.
- **Observable Result:** The "Add option" button disappears or is disabled once 4 options exist. Each option row displays a remove button until only 2 options remain, at which point remove buttons are hidden or disabled.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 3: Zero Votes State Display

- **Action:** Publish a quack with 2 options without voting on it.
- **Observable Result:** In the feed, the poll displays both options with `0 votes (0%)`, empty progress fill bars, and the text `0 votes · No votes yet`.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 4: Casting an Instant Vote

- **Action:** Click on "Option 1" on a poll with 0 votes.
- **Observable Result:** Instantly without page reload, "Option 1" displays `1 vote (100%)`, the fill bar animates to 100%, "Option 1" is highlighted as selected, and the poll footer displays `1 vote`.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 5: Switching a Vote

- **Action:** On a poll where "Option 1" is currently selected (showing 1 vote), click "Option 2".
- **Observable Result:** Instantly, "Option 1" changes to `0 votes (0%)`, "Option 2" changes to `1 vote (100%)`, and the selection indicator moves from "Option 1" to "Option 2".
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 6: Retracting a Vote

- **Action:** Click on the currently selected option ("Option 2").
- **Observable Result:** Instantly, "Option 2" deselects, its count changes from `1 vote` back to `0 votes (0%)`, and the footer updates to `0 votes · No votes yet`.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 7: Vote Persistence on Reload

- **Action:** Cast a vote on an option, then reload the page (F5 / browser refresh).
- **Observable Result:** After the feed reloads, the chosen option remains highlighted as selected and the vote counts match the state prior to reloading.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 8: Failure Rollback and Error Notification

- **Action:** In browser DevTools Network tab, switch network throttling to "Offline", then click an unselected option.
- **Observable Result:** The temporary optimistic selection reverts to its previous state, and a visible toast error appears on screen stating that the vote could not be recorded.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 9: Form Validation Prevents Incomplete Polls

- **Action:** Click "Add poll", leave option inputs blank, and click the submit button.
- **Observable Result:** Submission does not occur, and visible error text appears below the empty option inputs stating that option text is required.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

---

## 7. Open Questions Status

- **Open questions remaining:** **None.** All product behavior, interaction models, edge cases, error recovery, and empty states have been clarified and decided.
