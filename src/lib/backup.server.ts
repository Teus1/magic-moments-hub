// Weekly Google Drive backup: exports every operational table (JSON + CSV) and all event attachments.
export const BACKUP_TABLES = [
  "clients", "events", "event_payments", "event_collaborators", "event_attachments", "event_travel_estimates",
  "collaborators", "services", "attractions", "calendar_appointments", "task_groups", "tasks",
  "client_preregistrations", "profiles", "roles", "permissions", "role_permissions", "role_field_permissions",
  "travel_settings", "whatsapp_notification_recipients",
] as const;

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const ROOT_FOLDER = "Magic Moments - Backups";

function headers() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const drive = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovable || !drive) throw new Error("Google Drive não conectado.");
  return { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": drive };
}

async function driveJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GATEWAY}${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`Google Drive [${res.status}]: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

async function createFolder(name: string, parent?: string) {
  return driveJson<{ id: string }>("/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parent ? { parents: [parent] } : {}) }),
  });
}

async function rootFolder() {
  const q = encodeURIComponent(`name='${ROOT_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const found = await driveJson<{ files: { id: string }[] }>(`/drive/v3/files?q=${q}&fields=files(id)`);
  return found.files[0]?.id ?? (await createFolder(ROOT_FOLDER)).id;
}

async function upload(name: string, parent: string, body: Blob, mime: string) {
  const boundary = "mmbackup" + crypto.randomUUID();
  const meta = JSON.stringify({ name, parents: [parent] });
  const multipart = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
    body,
    `\r\n--${boundary}--`,
  ]);
  await driveJson(`/upload/drive/v3/files?uploadType=multipart&fields=id`, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

export async function runBackup(trigger: "scheduled" | "manual", requestedBy: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data: run, error } = await db.from("backup_runs").insert({ trigger, requested_by: requestedBy }).select("id").single();
  if (error) throw new Error("Não foi possível iniciar o backup.");
  const counts: Record<string, number> = {};
  let attachments = 0;
  try {
    const stamp = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date()).replace(/[: ]/g, "-");
    const folder = (await createFolder(`Backup ${stamp}`, await rootFolder())).id;
    const dataFolder = (await createFolder("dados", folder)).id;
    let attachmentRows: { storage_path: string }[] = [];
    for (const table of BACKUP_TABLES) {
      const rows: Record<string, unknown>[] = [];
      for (let from = 0; ; from += 1000) {
        const r = await db.from(table).select("*").range(from, from + 999);
        if (r.error) throw new Error(`Falha ao ler ${table}: ${r.error.message}`);
        rows.push(...r.data);
        if (r.data.length < 1000) break;
      }
      counts[table] = rows.length;
      if (table === "event_attachments") attachmentRows = rows as { storage_path: string }[];
      await upload(`${table}.json`, dataFolder, new Blob([JSON.stringify(rows, null, 2)]), "application/json");
      await upload(`${table}.csv`, dataFolder, new Blob([toCsv(rows)]), "text/csv");
    }
    if (attachmentRows.length) {
      const filesFolder = (await createFolder("anexos", folder)).id;
      for (const a of attachmentRows) {
        const file = await supabaseAdmin.storage.from("event-attachments").download(a.storage_path);
        if (file.error || !file.data) throw new Error(`Falha ao ler anexo ${a.storage_path}`);
        await upload(a.storage_path.replace(/\//g, "__"), filesFolder, file.data, file.data.type || "application/octet-stream");
        attachments++;
      }
    }
    const inventory = { created_at: new Date().toISOString(), trigger, tables: counts, attachments };
    await upload("inventario.json", folder, new Blob([JSON.stringify(inventory, null, 2)]), "application/json");
    await db.from("backup_runs").update({ status: "success", finished_at: new Date().toISOString(), folder_id: folder, folder_url: `https://drive.google.com/drive/folders/${folder}`, table_counts: counts, attachments_count: attachments }).eq("id", run.id);
    return { id: run.id as string, status: "success" as const };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("Backup failed:", message);
    await db.from("backup_runs").update({ status: "failed", finished_at: new Date().toISOString(), error: message.slice(0, 1000), table_counts: counts, attachments_count: attachments }).eq("id", run.id);
    return { id: run.id as string, status: "failed" as const, error: message };
  }
}
