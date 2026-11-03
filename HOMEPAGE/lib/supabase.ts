import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase is not configured");
  client ??= createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  return client;
}

export type LeadSummary = { produk: string | null; jumlah: string | null; budget: string | null; launching: string | null };

export type LeadRow = {
  name: string;
  whatsapp: string;
  summary: LeadSummary;
  transcript: { role: string; content: string }[];
  session_id: string;
};

export async function saveLead(row: LeadRow): Promise<void> {
  const { error } = await db().from("leads").insert(row);
  if (error) throw new Error(error.message);
}

export async function getLeads(): Promise<LeadRow[]> {
  try {
    const { data, error } = await db()
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data as LeadRow[];
  } catch {
    return [];
  }
}

export async function logChat(rows: { session_id: string; role: string; content: string }[]): Promise<void> {
  const { error } = await db().from("chat_logs").insert(rows);
  if (error) throw new Error(error.message);
}
