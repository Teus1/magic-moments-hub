<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project architecture
- Tasks live at `/tarefas` with art groups and independent daily tasks; authenticated writes and RLS enforce existing task action permissions without expanding staff portal access.
- Store art group metadata in `task_groups` and children in `tasks.group_id`; derive completion from a nonempty set of completed children and read dates from the parent to prevent stale copied deadlines.
- Load all task groups and tasks with pagination and expose only minimal assignee choices through a permission-checked RPC; task access must not grant client or user management access.
- Use dnd-kit and explicit complete/reopen commands only for daily board moves; art groups cannot be manually moved because their status derives from subtasks.

- Keep collaborator self-service at `/portal`, reading assignments through RLS-protected `event_collaborators`; this limits each account to its own schedule and compensation.
- Create every new collaborator together with a linked login using the `colaborador` role; this prevents orphaned staff records and grants only portal access by default.
- Delete user accounts only through a protected server function and preserve operational history by nulling profile references; this keeps privileged access off the client and avoids data loss.
- Store event attachments in the private `event-attachments` bucket and authorize metadata and files with Events permissions; this keeps receipts and contracts unavailable to collaborator self-service.
- Keep travel route queries in an authenticated, Events-view-authorized server function with bounded inputs and short-lived bounded cache; this protects billable Google Maps calls and private credentials.
- Calculate outbound and return routes separately and preserve unknown toll prices as unavailable; this avoids fabricated zero tolls and symmetric-trip assumptions.
- Query Places suggestions and selected-place details through authenticated Events-view server functions, with debounced app-owned inputs and per-interaction session tokens; this protects credentials and avoids unsupported browser Places calls.
- Use the linked owner-provided Google Maps connection for both browser rendering and authenticated Places/Routes calls, keeping server credentials inside handlers and the browser host allowlist in a tested helper; this supports custom domains without exposing private credentials or development hostnames.

- Keep Dashboard presentation as compact metric bands and event lists over its existing queries and calculations, with optional AppShell width overrides and URL-triggered reuse of the Events creation dialog; this improves operational focus without duplicating business workflows.
