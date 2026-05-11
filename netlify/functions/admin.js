/* global process */
import { getSupabaseAdmin, json } from "./_supabase.js";

function checkAdminPin(event) {
  const pin =
    event.headers["x-admin-pin"] ||
    event.headers["X-Admin-Pin"];

  return pin && pin === process.env.ADMIN_PIN;
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!checkAdminPin(event)) {
    return json(401, { error: "Админ эрхгүй байна." });
  }

  try {
    const supabase = getSupabaseAdmin();
    const body = JSON.parse(event.body || "{}");
    const action = body.action;

    if (action === "ping") {
      return json(200, { ok: true });
    }

    if (action === "createQuiz") {
      const { title } = body;

      if (!title) {
        return json(400, { error: "Quiz нэр оруулна уу." });
      }

      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          title: String(title).trim(),
          is_open: false
        })
        .select("id,title,is_open")
        .single();

      if (error) {
        return json(500, { error: error.message });
      }

      return json(200, { quiz: data });
    }

    if (action === "toggleQuiz") {
      const { quizId, isOpen } = body;

      if (!quizId) {
        return json(400, { error: "Quiz ID дутуу байна." });
      }

      if (isOpen) {
        const closeResult = await supabase
          .from("quizzes")
          .update({ is_open: false })
          .neq("id", quizId);

        if (closeResult.error) {
          return json(500, { error: closeResult.error.message });
        }
      }

      const { data, error } = await supabase
        .from("quizzes")
        .update({ is_open: Boolean(isOpen) })
        .eq("id", quizId)
        .select("id,title,is_open")
        .single();

      if (error) {
        return json(500, { error: error.message });
      }

      return json(200, { quiz: data });
    }

    if (action === "deleteQuiz") {
      const { quizId } = body;

      if (!quizId) {
        return json(400, { error: "Quiz ID дутуу байна." });
      }

      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId)
        .eq("is_open", false);

      if (error) {
        return json(500, { error: error.message });
      }

      return json(200, { ok: true });
    }

    if (action === "createQuestion") {
      const { quizId, text, options, answerIndex } = body;

      if (!quizId || !text || !Array.isArray(options)) {
        return json(400, { error: "Асуултын мэдээлэл дутуу байна." });
      }

      const { data, error } = await supabase
        .from("questions")
        .insert({
          quiz_id: quizId,
          text: String(text).trim(),
          options,
          answer_index: Number(answerIndex)
        })
        .select("id,quiz_id,text,options,answer_index")
        .single();

      if (error) {
        return json(500, { error: error.message });
      }

      return json(200, { question: data });
    }

    if (action === "deleteQuestion") {
      const { questionId } = body;

      if (!questionId) {
        return json(400, { error: "Question ID дутуу байна." });
      }

      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", questionId);

      if (error) {
        return json(500, { error: error.message });
      }

      return json(200, { ok: true });
    }

    return json(400, { error: "Unknown action" });
  } catch (error) {
    return json(500, { error: error.message });
  }
}