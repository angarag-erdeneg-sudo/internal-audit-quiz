import { getSupabaseAdmin, json } from "./_supabase.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { email } = JSON.parse(event.body || "{}");
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return json(400, { error: "Имэйлээ оруулна уу." });
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("users_public")
      .select("id,email,name,department")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (error) {
      return json(500, { error: error.message });
    }

    if (!data) {
      return json(404, { error: "Бүртгэлгүй байна." });
    }

    return json(200, { user: data });
  } catch (error) {
    return json(500, { error: error.message });
  }
}