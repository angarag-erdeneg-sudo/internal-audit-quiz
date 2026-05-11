import { getSupabaseAdmin, json } from "./_supabase.js";

const QUESTION_SECONDS = 20;
const MAX_POINTS_PER_QUESTION = 1000;
const SCORE_DECAY_POWER = 0.35;

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateQuestionPoints(isCorrect, secondsLeft) {
  if (!isCorrect) return 0;

  const safeSecondsLeft = clampNumber(
    Number(secondsLeft) || 0,
    0,
    QUESTION_SECONDS
  );

  const ratio = safeSecondsLeft / QUESTION_SECONDS;

  return Math.round(
    Math.pow(ratio, SCORE_DECAY_POWER) * MAX_POINTS_PER_QUESTION
  );
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { userId, quizId, answers, answerTimes } = JSON.parse(event.body || "{}");

    if (!userId || !quizId || !answers || !answerTimes) {
      return json(400, { error: "Submission мэдээлэл дутуу байна." });
    }

    const supabase = getSupabaseAdmin();

    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("id,is_open,questions(id,answer_index)")
      .eq("id", quizId)
      .single();

    if (quizError) {
      return json(500, { error: quizError.message });
    }

    if (!quiz.is_open) {
      return json(400, { error: "Quiz хаалттай байна." });
    }

    let score = 0;

    for (const question of quiz.questions || []) {
      const selected = answers[question.id];
      const isCorrect = Number(selected) === Number(question.answer_index);
      const secondsLeft = answerTimes[question.id] || 0;
      score += calculateQuestionPoints(isCorrect, secondsLeft);
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        quiz_id: quizId,
        user_id: userId,
        answers,
        answer_times: answerTimes,
        score
      })
      .select("id,score,submitted_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return json(409, { error: "Та энэ quiz-ийг аль хэдийн өгсөн байна." });
      }

      return json(500, { error: error.message });
    }

    return json(200, { submission: data });
  } catch (error) {
    return json(500, { error: error.message });
  }
}