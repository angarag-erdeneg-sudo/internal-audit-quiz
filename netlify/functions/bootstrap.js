import { getSupabaseAdmin, json } from "./_supabase.js";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: quizzes, error: quizzesError } = await supabase
      .from("quizzes")
      .select("id,title,is_open,created_at,questions(id,text,options,answer_index,created_at)")
      .order("created_at", { ascending: true });

    if (quizzesError) {
      return json(500, {
        error: "Supabase quizzes query failed",
        details: quizzesError.message,
        code: quizzesError.code
      });
    }

    const { data: leaderboardRows, error: leaderboardError } = await supabase
      .from("submissions")
      .select("id,score,quiz_id,user_id,submitted_at,users_public(name,department,email)")
      .order("score", { ascending: false });

    if (leaderboardError) {
      return json(500, {
        error: "Supabase leaderboard query failed",
        details: leaderboardError.message,
        code: leaderboardError.code
      });
    }

    return json(200, {
      ok: true,
      quizzes: quizzes || [],
      leaderboard: leaderboardRows || []
    });
  } catch (error) {
    return json(500, {
      error: error.message,
      name: error.name,
      cause: error.cause ? String(error.cause) : null
    });
  }
}