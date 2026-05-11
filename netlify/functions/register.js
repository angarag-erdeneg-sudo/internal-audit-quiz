import { getSupabaseAdmin, json } from "./_supabase.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { email, name, department } = JSON.parse(event.body || "{}");

    if (!email || !name || !department) {
      return json(400, { error: "Мэдээллээ бүрэн оруулна уу." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const allowedDomains = ["@netcapital.mn", "@netgroup.mn"];

const isAllowedEmail = allowedDomains.some(function (domain) {
  return normalizedEmail.length > domain.length && normalizedEmail.endsWith(domain);
});

if (!isAllowedEmail) {
  return json(400, {
    error: "Зөвхөн @netcapital.mn эсвэл @netgroup.mn имэйл ашиглана уу."
  });
}

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("users_public")
      .insert({
        email: normalizedEmail,
        name: String(name).trim(),
        department: String(department).trim()
      })
      .select("id,email,name,department")
      .single();

    if (error) {
      if (error.code === "23505") {
        return json(409, { error: "Энэ имэйлээр бүртгэл үүссэн байна." });
      }

      return json(500, { error: error.message });
    }

    return json(200, { user: data });
  } catch (error) {
    return json(500, { error: error.message });
  }
}