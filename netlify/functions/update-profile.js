import { getSupabaseAdmin, json } from "./_supabase.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { userId, name } = JSON.parse(event.body || "{}");

    if (!userId || !String(name || "").trim()) {
      return json(400, { error: "Нэр дутуу байна." });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("users_public")
      .update({ name: String(name).trim() })
      .eq("id", userId)
      .select("id,email,name,department")
      .single();

    if (error) {
      return json(500, { error: error.message });
    }

    return json(200, { user: data });
  } catch (error) {
    return json(500, { error: error.message });
  }
}