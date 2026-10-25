# User Story: Moderator Quack Deletion

## 1. Summary & Core Value Proposition

- **Who wants it:** Community moderators and platform administrators who need to keep the Quacker community clean, safe, and respectful when authors post inappropriate or offensive content and refuse to delete it.
- **What they get:** The ability to delete any quack on the platform with confirmation, immediately removing it from all public feeds and permanently deleting it from the database.
- **Why:** Authors currently have sole deletion rights over their own posts. When bad actors post nasty quacks and refuse to remove them, the community is left without recourse. Granting moderation powers ensures platform integrity.

---

## 2. User Story

**As a** Quacker moderator / admin,  
**I want to** delete any quack directly from the feed,  
**So that** I can remove offensive, inappropriate, or harmful content that authors refuse to delete.

---

## 3. Scope

### In Scope (MVP)

- **Role Authorization:** Users with the `admin` role in `UserRole` have moderator privileges to delete any quack.
- **Author Retention:** Standard users retain the ability to delete their own quacks.
- **Access Control Enforcement:**
  - Backend delete endpoint (`DELETE /quacks/:id`) permits the deletion if the authenticated user is either the author of the quack OR has the `admin` role.
  - Other users attempting to delete someone else's quack receive a `403 Forbidden` response.
- **Feed UI Controls:**
  - Delete button (trash can icon) is displayed on every quack for users signed in with the `admin` role.
  - Standard users continue to see the delete button only on quacks they authored.
  - Unauthenticated visitors see no delete buttons.
- **Deletion Confirmation:**
  - Clicking the delete button opens the standard confirmation dialog ("Delete quack" / "Are you sure you want to delete this quack? This action cannot be undone.").
- **Feedback & State Sync:**
  - Successful deletion displays a confirmation toast notification ("Quack deleted").
  - On error, a destructive toast notification informs the user that deletion failed.
  - Deletion triggers an automatic cache invalidation of the quack list queries so the removed quack disappears immediately.
- **Permanent Hard Delete:** The quack (and associated relations such as attached polls and votes via cascade) is permanently removed from the database.

### Out of Scope (Deferred to Future Iterations)

- Soft deletion (marking quacks as hidden or displaying `[Deleted by moderator]`).
- Dedicated moderator audit logs or history tables.
- Reason selection modal for moderator actions (e.g., selecting violation category like "Spam" or "Harassment").
- User warning, muting, suspension, or ban workflows.
- Separate dedicated moderation queue or admin dashboard.

---

## 4. What Happens When There Is Nothing to Show (Empty States & Zero Values)

Per the project design contract (`DESIGN.md`), every component must explicitly define its empty and zero states:

1. **Moderator Deletes the Last Quack in the Feed:**
   - When all quacks in the list have been deleted, the feed displays the standard empty state: `No quacks yet. Post the first one.`
2. **Moderator Deletes the Last Match in Search:**
   - If a moderator deletes a quack that was the sole match for a search filter `q`, the list renders the search empty state: `No quacks match "<query>".` with a "Clear search" button.
3. **Quack Already Deleted (Concurrency / Stale Feed):**
   - If a moderator attempts to delete a quack that has already been deleted (e.g., by the author in another session), the backend returns `404 Not Found`, the UI shows a toast error, and the feed invalidates to remove the stale item.

---

## 5. Functional Requirements

### 5.1 Backend Authorization & Service Logic

- In `QuackRepository.deleteQuack(quackId: string, userId: string, userRole: string)` (or `QuacksService.deleteQuack(quackId: string, user: Identity)`):
  - Find the target quack by `quackId`. If not found, throw `NotFoundException`.
  - Check authorization:
    - Allowed if `quack.userId === user.id` OR `user.role === 'admin'`.
    - Otherwise, throw `ForbiddenException('You are not authorized to delete this quack')`.
  - Execute `prisma.quack.delete({ where: { id: quackId } })`.

### 5.2 Frontend UI & Visibility

- `QuackItem` receives authorization context (either `isAdmin` boolean or `currentUserRole` alongside `currentUserId`).
- `canDelete = Boolean(currentUserId && (isAuthor || isAdmin))`.
- When `canDelete` is true:
  - Render the delete button (trash icon).
  - Clicking opens the confirmation `Dialog`.
  - Dialog confirms: title "Delete quack", description "Are you sure you want to delete this quack? This action cannot be undone."
  - Clicking "Cancel" closes dialog without deleting.
  - Clicking "Delete" executes `useDeleteQuack` mutation, disables buttons while loading, and on success closes dialog and shows toast.

---

## 6. Acceptance Criteria (Verifiable in Browser: Yes / No)

Every criterion below is directly observable and testable in the browser UI.

### Criterion 1: Moderator Sees Delete Button on Other Users' Quacks

- **Action:** Sign in as an admin/moderator user (e.g., `pondadmin@example.com` or `superadmin`) and view the quacks feed containing quacks authored by other users.
- **Observable Result:** A delete button (trash icon) is rendered on each quack card, regardless of who authored it.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 2: Regular User Only Sees Delete Button on Their Own Quacks

- **Action:** Sign in as a regular user (role `user`) and view the feed.
- **Observable Result:** The delete button appears only on quacks where the author matches the current user. Quacks authored by other users do not render a delete button.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 3: Confirmation Dialog Before Moderator Deletion

- **Action:** As a moderator, click the delete button on a quack authored by another user.
- **Observable Result:** A confirmation dialog appears asking to confirm the deletion ("Are you sure you want to delete this quack? This action cannot be undone."). The quack is not deleted if "Cancel" is clicked.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 4: Immediate Removal and Success Feedback upon Moderator Delete

- **Action:** As a moderator, click "Delete" inside the confirmation dialog for another user's quack.
- **Observable Result:** The dialog closes, a success toast notification appears ("Quack deleted"), and the quack disappears from the feed without requiring a manual page refresh.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 5: Deletion Persistence across Page Refresh

- **Action:** After moderator deletion of a quack, reload the browser page (F5).
- **Observable Result:** The deleted quack remains absent from the feed.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 6: Backend Enforces Authorization Against Tampering

- **Action:** As a non-admin regular user, attempt to send a direct `DELETE /quacks/:id` request for another user's quack ID.
- **Observable Result:** The server responds with status code `403 Forbidden` and the quack remains in the database.
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

### Criterion 7: Empty State After Deleting All Quacks

- **Action:** As a moderator, delete all quacks displayed on the feed until none remain.
- **Observable Result:** The feed updates to show the empty state message `No quacks yet. Post the first one.`
- **Check:** _Can be verified in browser (Yes/No)?_ **Yes**

---

## 7. Open Questions Status

- **Open questions remaining:** **None.** All permissions, empty states, error handling, feedback mechanisms, and UI specifications have been clarified and decided.
