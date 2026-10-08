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
- Store both task categories in one RLS-protected tasks table with independent action permissions; expose only minimal client and assignee choices through permission-checked RPCs so task access does not grant user management access.
- Use dnd-kit for task column moves and retain explicit complete/reopen commands; this supports keyboard and touch interaction without making drag mandatory.

- Keep collaborator self-service at `/portal`, reading assignments through RLS-protected `event_collaborators`; this limits each account to its own schedule and compensation.
- Create every new collaborator together with a linked login using the `colaborador` role; this prevents orphaned staff records and grants only portal access by default.
- Delete user accounts only through a protected server function and preserve operational history by nulling profile references; this keeps privileged access off the client and avoids data loss.
- Store event attachments in the private `event-attachments` bucket and authorize metadata and files with Events permissions; this keeps receipts and contracts unavailable to collaborator self-service.
- Keep travel route queries in an authenticated, Events-view-authorized server function with bounded inputs and short-lived bounded cache; this protects billable Google Maps calls and private credentials.
- Calculate outbound and return routes separately and preserve unknown toll prices as unavailable; this avoids fabricated zero tolls and symmetric-trip assumptions.
- Query Places suggestions and selected-place details through authenticated Events-view server functions, with debounced app-owned inputs and per-interaction session tokens; this protects credentials and avoids unsupported browser Places calls.
