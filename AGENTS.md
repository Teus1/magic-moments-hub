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
- Prebundle the shared Radix radio-group control in Vite so lazy form loading does not trigger dependency reoptimization and mix React module generations in an open preview.
- Keep the root error fallback free of hooks and recover with a document reload so React dependency-generation failures cannot also blank the recovery screen.
- Use expiring, single-submission hashed invitation tokens for public client intake, with no public personal-data reads; review and associate within a transactional permission-checked RPC before creating clients or suggesting events to prevent overwrites and duplicate records.
- Generate compact cryptographically random invitation tokens through the shared intake-links helper; keep legacy token support and revoke links through a permission-checked, row-locked RPC with soft deletion to preserve linked operational history.
- Contract-form public helpers authorize only via a pending unexpired invitation token with per-token caps; services supply the public attraction choices, WhatsApp recipients use settings permissions and alerts use wa.me links until a provider is chosen.
- Reuse ClientFields and Places inputs in existing screens; persist event duration as integer minutes alongside calculated end_time and structured venue metadata to keep historical records and calendar consumers compatible.
- Use FullCalendar for monthly and 24-hour daily calendar views, storing operational appointments separately with a required event link and Events action permissions; this preserves overlap handling, commercial totals, and staff portal boundaries.
- Store calendar appointment timestamps as America/Sao_Paulo wall times and resolve overnight event ends on the following date; this keeps operational dates stable across browser timezones.
- Tasks live at `/tarefas` with art groups and independent daily tasks; authenticated writes and RLS enforce existing task action permissions without expanding staff portal access.
- Store art group metadata in `task_groups` and children in `tasks.group_id`; derive completion from a nonempty set of completed children and read dates from the parent to prevent stale copied deadlines.
- Load all task groups and tasks with pagination and expose only minimal assignee choices through a permission-checked RPC; task access must not grant client or user management access.
- Use dnd-kit and explicit complete/reopen commands only for daily board moves; art groups cannot be manually moved because their status derives from subtasks.

- Keep collaborator self-service at `/portal`, reading assignments through RLS-protected `event_collaborators`; this limits each account to its own schedule and compensation.
- Derive collaborator payment alerts from paginated RLS-protected event assignments under Events-view permission, resolving Pix keys from current collaborator records; keep `event_collaborators.paid_value` derived from `collaborator_payments` by trigger and write those entries only through a permission-checked server function, so the event form records agreed values only.
- Generate Pix static BR Code payloads locally through the shared `pix` helper and render them with `qrcode.react`; no payment provider is connected, so a scanned QR is never payment confirmation.
- Create collaborators through protected actions with either a new login assigned the `colaborador` role or an existing profile whose credentials and permissions are preserved; enforce unique profile links in the database to prevent duplicate staff identities.
- Delete user accounts only through a protected server function and preserve operational history by nulling profile references; this keeps privileged access off the client and avoids data loss.
- Store event attachments in the private `event-attachments` bucket and authorize metadata and files with Events permissions; this keeps receipts and contracts unavailable to collaborator self-service.
- Keep travel route and Places queries in authenticated, Events-view-authorized server functions with bounded inputs and a short-lived bounded cache; server credentials stay in handlers and browser hosts use a tested allowlist.
- Calculate outbound and return routes separately and preserve unknown toll prices as unavailable; this avoids fabricated zero tolls and symmetric-trip assumptions.
- Reuse the linked Google Maps connection for map, Places and Routes.

- Dashboard uses paginated year reads, monthly events and annual finance; reuse Events creation through URL navigation to avoid duplicate flows.

- Version new public contracts and validate required fields on pending-to-received transitions only, preserving historical reviews.
- Self-password changes reauthenticate the middleware account in a request-local client before updating; never accept target IDs or persist passwords.
- Travel reuses month-bound helpers; event privacy is rendering-only and filters preserve financial values.
