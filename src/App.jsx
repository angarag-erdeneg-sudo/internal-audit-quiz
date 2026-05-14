import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import lionImage from "./assets/lion.png";
import iiaLogo from "./assets/iia-logo.png";
import netCapitalLogo from "./assets/netcapital-logo.jfif";
import {
  loadBootstrap,
  apiRegister,
  apiLogin,
  apiUpdateProfile,
  apiSubmitAnswer,
  apiAdmin
} from "./lib/api";

const QUESTION_SECONDS = 20;
const MAX_POINTS_PER_QUESTION = 1000;
const SCORE_DECAY_POWER = 0.35;
const FEEDBACK_DELAY_MS = 1200;
const LIVE_REFRESH_MS = 10000;
const QUIZ_MUSIC_INTERVAL_MS = 2200;
const USER_KEY = "internal_audit_quiz_current_user";
const SESSION_PREFIX = "internal_audit_quiz_session_";

const DEPARTMENTS = [
  "Хүний нөөц, соёлын газар",
  "Стратеги, гүйцэтгэлийн удирдлагын газар",
  "Хөрөнгийн зах зээлийн газар",
  "Дотоод аудитын газар",
  "Хөрөнгө оруулалтын бүтээгдэхүүн, процесс хөгжүүлэлтийн газар",
  "Хөрөнгө оруулалтын борлуулалт, харилцагчийн удирдлагын газар",
  "Эрсдэлийн удирдлагын газар",
  "Хууль, комплайнсын газар",
  "Мэдээлэл, кибер аюулгүй байдлын газар",
  "Суваг, борлуулалтын удирдлагын газар",
  "Хэрэглээний зээлийн бүтээгдэхүүн, процесс хөгжүүлэлтийн газар",
  "Бизнесийн зээлийн бүтээгдэхүүн, процесс хөгжүүлэлтийн газар",
  "Зээлийн газар",
  "Тусгай актив удирдлагын газар",
  "Брэнд, маркетинг & олон нийттэй харилцах газар",
  "Харилцагчийн амжилтын газар",
  "Бэкэнд инженерчлэлийн газар",
  "Фронтэнд инженерчлэлийн газар",
  "МТ -н үйлчилгээ, аппликэйшн ашиглалтын газар",
  "Дэд бүтэц, платформын инженерчлэлийн газар",
  "Энтерпрайз архитектур, технологи төлөвлөлтийн газар",
  "Дижитал бүтээгдэхүүний удирдлага, инновацын газар",
  "Дата аналитик, Бизнес Интеллиженсийн газар",
  "AI, машин сургалтын газар",
  "Дата инженерчлэлийн газар",
  "Санхүү, бүртгэлийн газар",
  "Санхүү төлөвлөлт, нөөцийн удирдлага & шинжилгээний газар",
  "Олон улсын санхүүжилт, эх үүсвэрийн газар",
  "Бага тойруу салбар",
  "Москва салбар",
  "Сити салбар",
  "Тэнгис салбар",
  "Цэнтрал 2 салбар",
  "Цэнтрал салбар",
  "Чингэлтэй НФ салбар",
  "Архангай салбар",
  "Баян-Өлгий салбар",
  "Баянхонгор салбар",
  "Булган салбар",
  "Говь-Алтай салбар",
  "Говьсүмбэр салбар",
  "Дархан салбар",
  "Дорноговь салбар",
  "Дорнод салбар",
  "Дундговь салбар",
  "Завхан салбар",
  "Орхон салбар",
  "Өвөрхангай салбар",
  "Өмнөговь салбар",
  "Сүхбаатар салбар",
  "Сэлэнгэ салбар",
  "Төв салбар",
  "Увс салбар",
  "Ховд салбар",
  "Хөвсгөл салбар",
  "Хэнтий салбар",
  "Замын-Үүд салбар",
  "Тосонцэнгэл салбар",
  "Налайх салбар",
  "Хархорин салбар",
  "Ханбогд салбар",
  "Цогтцэций салбар",
  "Зүүнхараа салбар",
  "22 салбар",
  "Баянгол салбар",
  "Баянзүрх салбар",
  "Гранд Плаза салбар",
  "Гэгээнтэн салбар",
  "Да Хүрээ салбар",
  "Их Монгол салбар",
  "Парк-Од салбар",
  "Парк Стейж салбар",
  "Сансар салбар",
  "Сонгинохайрхан салбар",
  "Сүхбаатар салбар",
  "Төлүүлэлтийн салбар",
  "Хороолол салбар",
  "Чингэлтэй салбар",
  "Яармаг салбар",
  "ТУЗ",
  "Гүйцэтгэх удирдлага"
];

function normalizeText(value) {
  return String(value || "").trim().split(" ").filter(Boolean).join(" ");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidWorkEmail(value) {
  const email = normalizeEmail(value);
  return ["@netcapital.mn", "@netgroup.mn"].some(function (domain) {
    return email.length > domain.length && email.endsWith(domain);
  });
}

function parseOptions(value) {
  return String(value || "").split("\n").map(function (item) {
    return item.trim();
  }).filter(Boolean);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shuffle(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

function shuffleQuestions(questions) {
  return shuffle(questions || []).map(function (question) {
    const optionItems = (question.options || []).map(function (text, originalIndex) {
      return { text, originalIndex };
    });
    const mixed = shuffle(optionItems);
    return {
      ...question,
      options: mixed.map(function (item) { return item.text; }),
      optionOriginalIndexes: mixed.map(function (item) { return item.originalIndex; })
    };
  });
}

function calculatePoints(isCorrect, secondsLeft) {
  if (!isCorrect) return 0;
  const safeSeconds = clamp(Number(secondsLeft) || 0, 0, QUESTION_SECONDS);
  const ratio = safeSeconds / QUESTION_SECONDS;
  return Math.round(Math.pow(ratio, SCORE_DECAY_POWER) * MAX_POINTS_PER_QUESTION);
}

function scoreSession(questions, answers, times) {
  return (questions || []).reduce(function (sum, question) {
    const selected = answers[question.id];
    const isCorrect = Number(selected) === Number(question.answer);
    const seconds = Object.prototype.hasOwnProperty.call(times || {}, question.id) ? times[question.id] : 0;
    return sum + calculatePoints(isCorrect, seconds);
  }, 0);
}

function formatScore(value) {
  return String(Math.round(Number(value || 0)));
}

function normalizeQuiz(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    isOpen: Boolean(quiz.isOpen ?? quiz.is_open),
    questions: (quiz.questions || []).map(function (question) {
      return {
        id: question.id,
        text: question.text,
        options: Array.isArray(question.options) ? question.options : [],
        answer: Number(question.answer ?? question.answer_index)
      };
    })
  };
}

function normalizeSubmission(row) {
  const profile = row.users_public || row.user || {};
  return {
    id: row.id || row.submission_id || String(row.quiz_id || row.quizId) + "-" + String(row.user_id || row.userId),
    quizId: row.quizId || row.quiz_id,
    userId: row.userId || row.user_id,
    score: Number(row.score || 0),
    userName: profile.name || row.name || "-",
    department: profile.department || row.department || "-",
    email: profile.email || row.email || ""
  };
}

function buildLeaderboard(submissions) {
  const grouped = new Map();
  submissions.forEach(function (submission) {
    const key = submission.userId || submission.email || submission.userName;
    if (!key) return;
    const row = grouped.get(key) || {
      id: key,
      name: submission.userName || "-",
      department: submission.department || "-",
      email: submission.email || "",
      totalScore: 0,
      completed: 0
    };
    row.name = submission.userName || row.name;
    row.department = submission.department || row.department;
    row.email = submission.email || row.email;
    row.totalScore += Number(submission.score || 0);
    row.completed += 1;
    grouped.set(key, row);
  });
  return Array.from(grouped.values()).sort(function (a, b) {
    return b.totalScore - a.totalScore || b.completed - a.completed || a.name.localeCompare(b.name);
  });
}

function getStoredUser() {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredUser(user) {
  try {
    if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(USER_KEY);
  } catch {
    // localStorage is optional.
  }
}

function sessionKey(userId, quizId) {
  return SESSION_PREFIX + String(userId || "guest") + "_" + String(quizId || "quiz");
}

function saveSession(userId, quizId, session) {
  try {
    if (userId && quizId && session) window.localStorage.setItem(sessionKey(userId, quizId), JSON.stringify(session));
  } catch {
    // localStorage is optional.
  }
}

function loadSession(userId, quizId) {
  try {
    if (!userId || !quizId) return null;
    const raw = window.localStorage.getItem(sessionKey(userId, quizId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession(userId, quizId) {
  try {
    if (userId && quizId) window.localStorage.removeItem(sessionKey(userId, quizId));
  } catch {
    // localStorage is optional.
  }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!window.__auditQuizAudio) window.__auditQuizAudio = new AudioContextClass();
  return window.__auditQuizAudio;
}

function unlockAudio() {
  try {
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
  } catch {
    // audio is optional
  }
}

function playTone(frequency, delay, duration, volume, type) {
  try {
    const audio = getAudioContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + delay;
    const end = start + duration;
    oscillator.type = type || "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(end);
  } catch {
    // audio is optional
  }
}

function playHurrySound(secondsLeft) {
  if (secondsLeft > 5) return;
  playTone(660, 0, 0.08, 0.05, "sine");
}

function playQuizMusicStep(step) {
  const chords = [
    [261.63, 329.63, 392.0],
    [293.66, 369.99, 440.0],
    [329.63, 392.0, 493.88],
    [392.0, 493.88, 587.33]
  ];
  const chord = chords[step % chords.length];
  chord.forEach(function (frequency, index) {
    playTone(frequency, index * 0.18, 0.72, 0.045, "sine");
  });
}

function playAnswerSound(isCorrect, score) {
  unlockAudio();
  if (isCorrect) {
    playTone(659.25, 0, 0.12, 0.24, "triangle");
    playTone(880.0, 0.10, 0.16, 0.26, "sine");
    playTone(1174.66, 0.24, 0.20, 0.22, "triangle");
    return;
  }

  playTone(392.0, 0, 0.12, 0.18, "sine");
  playTone(329.63, 0.12, 0.16, 0.16, "triangle");
  if (Number(score || 0) > 0) playTone(523.25, 0.28, 0.12, 0.12, "sine");
}

function playFinishSound() {
  unlockAudio();
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
  notes.forEach(function (frequency, index) {
    playTone(frequency, index * 0.13, 0.28, 0.30, index % 2 === 0 ? "triangle" : "sine");
    playTone(frequency / 2, index * 0.13, 0.32, 0.10, "sine");
  });
  playTone(2093, 0.86, 0.45, 0.24, "triangle");
}

function getTimerFillStyle(questionEndsAt, currentTimeMs) {
  const remainingMs = questionEndsAt ? clamp(questionEndsAt - currentTimeMs, 0, QUESTION_SECONDS * 1000) : QUESTION_SECONDS * 1000;
  const percent = (remainingMs / (QUESTION_SECONDS * 1000)) * 100;
  return {
    ...styles.timerFill,
    width: String(percent) + "%"
  };
}

function getConfettiStyle(index) {
  const points = [[-230, -140], [-170, -190], [-110, -130], [-55, -215], [0, -155], [55, -215], [110, -130], [170, -190], [230, -140], [-245, -35], [-125, -20], [125, -20], [245, -35], [-220, 70], [-105, 85], [0, 105], [105, 85], [220, 70], [-190, 215], [-55, 220], [55, 220], [190, 215]];
  const colors = ["#9BE564", "#7AC943", "#42BFED", "#ffffff"];
  const point = points[index % points.length];

  return {
    position: "absolute",
    left: "50%",
    top: "54%",
    width: index % 3 === 0 ? 10 : 7,
    height: index % 2 === 0 ? 18 : 10,
    borderRadius: index % 2 === 0 ? 3 : 999,
    background: colors[index % colors.length],
    opacity: 0,
    animationName: "confettiPop",
    animationDuration: "1.9s",
    animationTimingFunction: "cubic-bezier(0.18, 0.84, 0.28, 1)",
    animationDelay: String(index * 0.022) + "s",
    animationFillMode: "forwards",
    "--x": String(point[0]) + "px",
    "--jump": String(-230 - (index % 5) * 20) + "px",
    "--fall": String(point[1] + (point[1] < 0 ? 28 : 54)) + "px",
    "--final-y": String(point[1]) + "px",
    "--r": String(index * 43 + 220) + "deg"
  };
}

function getOptionButtonStyle(isSelected) {
  return {
    ...styles.optionButton,
    background: isSelected ? "linear-gradient(180deg, rgba(122,201,67,0.24), rgba(1,122,193,0.10))" : "rgba(0,20,40,0.72)",
    boxShadow: isSelected ? "0 0 18px rgba(122,201,67,0.30)" : "none"
  };
}

export default function App() {
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [globalError, setGlobalError] = useState("");
  const [tab, setTab] = useState("quiz");
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [authMode, setAuthMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerDepartment, setRegisterDepartment] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [shuffledQuestions, setShuffledQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionEndsAt, setQuestionEndsAt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [answerTimes, setAnswerTimes] = useState({});
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [timerRunId, setTimerRunId] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [lastResult, setLastResult] = useState(null);
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuestion, setNewQuestion] = useState({ text: "", options: "", answer: 1 });
  const [adminQuizId, setAdminQuizId] = useState("");
  const [showIntro, setShowIntro] = useState(true);

  const timeoutRef = useRef(null);
  const nextRef = useRef(null);
  const soundRef = useRef(null);
  const musicRef = useRef(null);
  const musicStepRef = useRef(0);
  const restoredRef = useRef(false);

  const activeQuiz = useMemo(function () {
    return quizzes.find(function (quiz) { return quiz.isOpen; }) || null;
  }, [quizzes]);

  const selectedAdminQuiz = useMemo(function () {
    return quizzes.find(function (quiz) { return quiz.id === adminQuizId; }) || quizzes[0] || null;
  }, [quizzes, adminQuizId]);

  const currentQuestion = quizStarted ? shuffledQuestions[currentQuestionIndex] : null;

  const alreadySubmitted = Boolean(currentUser && activeQuiz && submissions.some(function (submission) {
    return submission.quizId === activeQuiz.id && submission.userId === currentUser.id;
  }));

  const leaderboard = useMemo(function () {
    return buildLeaderboard(submissions).map(function (row, index) {
      return { ...row, rank: index + 1 };
    });
  }, [submissions]);

  const filteredLeaderboard = useMemo(function () {
    const keyword = normalizeText(leaderboardSearch).toLowerCase();
    if (!keyword) return leaderboard;
    return leaderboard.filter(function (row) {
      return [row.name, row.department, row.email].join(" ").toLowerCase().includes(keyword);
    });
  }, [leaderboard, leaderboardSearch]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredLeaderboard.length / pageSize));
  const safePage = Math.min(leaderboardPage, totalPages);
  const pageRows = filteredLeaderboard.slice((safePage - 1) * pageSize, safePage * pageSize);

  const clearTimers = useCallback(function clearTimersCallback() {
    window.clearTimeout(timeoutRef.current);
    window.clearTimeout(nextRef.current);
    window.clearInterval(soundRef.current);
    window.clearInterval(musicRef.current);
  }, []);

  const resetQuiz = useCallback(function resetQuiz(clearResult) {
    clearTimers();
    setQuizStarted(false);
    setShuffledQuestions([]);
    setCurrentQuestionIndex(0);
    setQuestionEndsAt(null);
    setAnswers({});
    setAnswerTimes({});
    setAnswerFeedback(null);
    setAnimatedScore(0);
    if (clearResult) setLastResult(null);
  }, [clearTimers]);

  const refreshData = useCallback(async function refreshData(options = {}) {
    const silent = Boolean(options.silent);
    try {
      if (!silent) setGlobalError("");
      const data = await loadBootstrap();
      const nextQuizzes = (data.quizzes || []).map(normalizeQuiz);
      const nextSubmissions = (data.leaderboard || data.submissions || []).map(normalizeSubmission);
      setQuizzes(nextQuizzes);
      setSubmissions(nextSubmissions);
      setAdminQuizId(function (previous) {
        return previous || (nextQuizzes[0] ? nextQuizzes[0].id : "");
      });
    } catch (error) {
      if (!silent) setGlobalError(error.message || "Мэдээлэл татах үед алдаа гарлаа.");
    }
  }, []);

  const finishQuiz = useCallback(async function finishQuiz(finalAnswers, finalTimes, optimisticScore) {
    if (!currentUser || !activeQuiz) return;
    try {
      const data = await apiSubmitAnswer({ userId: currentUser.id, quizId: activeQuiz.id, answers: finalAnswers, answerTimes: finalTimes });
      const backendScore = data.submission && typeof data.submission.score === "number" ? data.submission.score : optimisticScore;
      clearSession(currentUser.id, activeQuiz.id);
      setLastResult({ quizTitle: activeQuiz.title, score: backendScore });
      playFinishSound();
      resetQuiz(false);
      await refreshData({ silent: true });
    } catch (error) {
      clearSession(currentUser.id, activeQuiz.id);
      setGlobalError(error.message || "Оноо хадгалах үед алдаа гарлаа.");
      setLastResult({ quizTitle: activeQuiz.title, score: optimisticScore });
      resetQuiz(false);
    }
  }, [currentUser, activeQuiz, refreshData, resetQuiz]);

  const scheduleNext = useCallback(function scheduleNext(nextIndex, finalAnswers, finalTimes, finalScore) {
    window.clearTimeout(nextRef.current);
    nextRef.current = window.setTimeout(function () {
      if (nextIndex >= shuffledQuestions.length) {
        finishQuiz(finalAnswers, finalTimes, finalScore);
        return;
      }
      setCurrentQuestionIndex(nextIndex);
      setQuestionEndsAt(Date.now() + QUESTION_SECONDS * 1000);
      setAnswerFeedback(null);
      setTimerRunId(function (previous) { return previous + 1; });
    }, FEEDBACK_DELAY_MS);
  }, [finishQuiz, shuffledQuestions.length]);

  useEffect(function () {
    const timer = window.setTimeout(function () { setShowIntro(false); }, 2200);
    return function () { window.clearTimeout(timer); };
  }, []);

  useEffect(function () {
    const timer = window.setTimeout(function () { refreshData(); }, 0);
    return function () { window.clearTimeout(timer); };
  }, [refreshData]);

  useEffect(function () {
    saveStoredUser(currentUser);
  }, [currentUser]);

  useEffect(function () {
    const timer = window.setTimeout(function () { setLeaderboardPage(1); }, 0);
    return function () { window.clearTimeout(timer); };
  }, [leaderboardSearch]);

  useEffect(function () {
    if (quizStarted) return undefined;
    const id = window.setInterval(function () { refreshData({ silent: true }); }, LIVE_REFRESH_MS);
    return function () { window.clearInterval(id); };
  }, [quizStarted, refreshData]);

  useEffect(function () {
    if (!currentUser || !activeQuiz || alreadySubmitted || restoredRef.current) return;
    const saved = loadSession(currentUser.id, activeQuiz.id);
    restoredRef.current = true;
    if (!saved || !Array.isArray(saved.questions) || saved.questions.length === 0) return;
    const remainingMs = clamp(Number(saved.remainingMs) || QUESTION_SECONDS * 1000, 0, QUESTION_SECONDS * 1000);
    setShuffledQuestions(saved.questions);
    setCurrentQuestionIndex(clamp(Number(saved.index) || 0, 0, saved.questions.length - 1));
    setAnswers(saved.answers || {});
    setAnswerTimes(saved.times || {});
    setAnimatedScore(scoreSession(saved.questions, saved.answers || {}, saved.times || {}));
    setQuestionEndsAt(Date.now() + remainingMs);
    setQuizStarted(true);
    setTimerRunId(function (previous) { return previous + 1; });
  }, [currentUser, activeQuiz, alreadySubmitted]);

  useEffect(function () {
    if (!quizStarted || !currentUser || !activeQuiz || shuffledQuestions.length === 0 || answerFeedback) return undefined;
    const saveCurrent = function () {
      const remainingMs = questionEndsAt ? clamp(questionEndsAt - Date.now(), 0, QUESTION_SECONDS * 1000) : QUESTION_SECONDS * 1000;
      saveSession(currentUser.id, activeQuiz.id, {
        quizId: activeQuiz.id,
        questions: shuffledQuestions,
        index: currentQuestionIndex,
        answers,
        times: answerTimes,
        remainingMs,
        savedAt: Date.now()
      });
    };
    const id = window.setInterval(saveCurrent, 500);
    window.addEventListener("beforeunload", saveCurrent);
    document.addEventListener("visibilitychange", saveCurrent);
    return function () {
      window.clearInterval(id);
      window.removeEventListener("beforeunload", saveCurrent);
      document.removeEventListener("visibilitychange", saveCurrent);
    };
  }, [quizStarted, currentUser, activeQuiz, shuffledQuestions, currentQuestionIndex, answers, answerTimes, questionEndsAt, answerFeedback]);

  useEffect(function () {
    if (!quizStarted || !currentQuestion || answerFeedback || !questionEndsAt) return undefined;
    const remainingMs = clamp(questionEndsAt - Date.now(), 0, QUESTION_SECONDS * 1000);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(function () {
      const nextTimes = { ...answerTimes, [currentQuestion.id]: 0 };
      const previousScore = scoreSession(shuffledQuestions, answers, answerTimes);
      const nextScore = scoreSession(shuffledQuestions, answers, nextTimes);
      setAnswerTimes(nextTimes);
      playAnswerSound(false, 0);
      setAnswerFeedback({ questionId: currentQuestion.id, isCorrect: false, score: 0, previousScore, cumulativeScore: nextScore, message: "Хугацаа дууслаа" });
      setAnimatedScore(previousScore);
      scheduleNext(currentQuestionIndex + 1, answers, nextTimes, nextScore);
    }, remainingMs);
    return function () { window.clearTimeout(timeoutRef.current); };
  }, [quizStarted, currentQuestion, answerFeedback, questionEndsAt, answerTimes, shuffledQuestions, answers, scheduleNext, currentQuestionIndex]);

  useEffect(function () {
    if (!quizStarted || !questionEndsAt || answerFeedback) return undefined;
    setCurrentTimeMs(Date.now());
    const id = window.setInterval(function () {
      setCurrentTimeMs(Date.now());
    }, 250);
    return function () { window.clearInterval(id); };
  }, [quizStarted, questionEndsAt, answerFeedback]);

  useEffect(function () {
    if (!quizStarted || !currentQuestion || answerFeedback || !questionEndsAt) return undefined;
    window.clearInterval(soundRef.current);
    soundRef.current = window.setInterval(function () {
      const secondsLeft = Math.ceil(clamp((questionEndsAt - Date.now()) / 1000, 0, QUESTION_SECONDS));
      if (secondsLeft > 0) playHurrySound(secondsLeft);
    }, 1000);
    return function () { window.clearInterval(soundRef.current); };
  }, [quizStarted, currentQuestion, answerFeedback, questionEndsAt]);

  useEffect(function () {
    if (!quizStarted) return undefined;
    unlockAudio();
    window.clearInterval(musicRef.current);
    playQuizMusicStep(musicStepRef.current);
    musicStepRef.current += 1;
    musicRef.current = window.setInterval(function () {
      playQuizMusicStep(musicStepRef.current);
      musicStepRef.current += 1;
    }, QUIZ_MUSIC_INTERVAL_MS);
    return function () { window.clearInterval(musicRef.current); };
  }, [quizStarted]);

  useEffect(function () {
    if (!answerFeedback) return undefined;
    const start = Number(answerFeedback.previousScore || 0);
    const end = Number(answerFeedback.cumulativeScore || 0);
    const startedAt = Date.now();
    let frameId = 0;
    function animate() {
      const progress = clamp((Date.now() - startedAt) / 850, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(start + (end - start) * eased));
      if (progress < 1) frameId = window.requestAnimationFrame(animate);
    }
    frameId = window.requestAnimationFrame(animate);
    return function () { window.cancelAnimationFrame(frameId); };
  }, [answerFeedback]);

  function startQuiz() {
    if (!currentUser || !activeQuiz || alreadySubmitted || quizStarted) return;
    unlockAudio();
    playQuizMusicStep(0);
    clearSession(currentUser.id, activeQuiz.id);
    const questions = shuffleQuestions(activeQuiz.questions);
    setShuffledQuestions(questions);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setAnswerTimes({});
    setAnswerFeedback(null);
    setAnimatedScore(0);
    setLastResult(null);
    setQuestionEndsAt(Date.now() + QUESTION_SECONDS * 1000);
    setTimerRunId(function (previous) { return previous + 1; });
    setQuizStarted(true);
    saveSession(currentUser.id, activeQuiz.id, {
      quizId: activeQuiz.id,
      questions,
      index: 0,
      answers: {},
      times: {},
      remainingMs: QUESTION_SECONDS * 1000,
      savedAt: Date.now()
    });
  }

  function chooseAnswer(optionIndex) {
    if (!currentQuestion || answerFeedback) return;
    window.clearTimeout(timeoutRef.current);
    const secondsLeft = clamp((questionEndsAt - Date.now()) / 1000, 0, QUESTION_SECONDS);
    const selectedOriginalIndex = currentQuestion.optionOriginalIndexes ? currentQuestion.optionOriginalIndexes[optionIndex] : optionIndex;
    const isCorrect = Number(selectedOriginalIndex) === Number(currentQuestion.answer);
    const earned = calculatePoints(isCorrect, secondsLeft);
    const nextAnswers = { ...answers, [currentQuestion.id]: selectedOriginalIndex };
    const nextTimes = { ...answerTimes, [currentQuestion.id]: secondsLeft };
    const previousScore = scoreSession(shuffledQuestions, answers, answerTimes);
    const nextScore = scoreSession(shuffledQuestions, nextAnswers, nextTimes);
    setAnswers(nextAnswers);
    setAnswerTimes(nextTimes);
    playAnswerSound(isCorrect, earned);
    setAnswerFeedback({ questionId: currentQuestion.id, isCorrect, score: earned, previousScore, cumulativeScore: nextScore, message: isCorrect ? "Зөв хариулт" : "Буруу хариулт" });
    scheduleNext(currentQuestionIndex + 1, nextAnswers, nextTimes, nextScore);
  }

  async function loginUser() {
    const email = normalizeEmail(loginEmail);
    if (!email) return setAuthError("Имэйлээ оруулна уу.");
    try {
      setAuthError("");
      const data = await apiLogin(email);
      setCurrentUser(data.user);
      setLoginEmail("");
      restoredRef.current = false;
      await refreshData({ silent: true });
    } catch (error) {
      setAuthError(error.message || "Нэвтрэх үед алдаа гарлаа.");
    }
  }

  async function registerUser() {
    const name = normalizeText(registerName);
    const department = normalizeText(registerDepartment);
    const email = normalizeEmail(registerEmail);
    if (!name) return setAuthError("Овог нэрээ оруулна уу.");
    if (!department || !DEPARTMENTS.includes(department)) return setAuthError("Газар эсвэл салбараа зөв сонгоно уу.");
    if (!isValidWorkEmail(email)) return setAuthError("Зөвхөн @netcapital.mn эсвэл @netgroup.mn имэйл ашиглана уу.");
    try {
      setAuthError("");
      const data = await apiRegister({ email, name, department });
      setCurrentUser(data.user);
      setRegisterName("");
      setRegisterDepartment("");
      setRegisterEmail("");
      restoredRef.current = false;
      await refreshData({ silent: true });
    } catch (error) {
      setAuthError(error.message || "Бүртгүүлэх үед алдаа гарлаа.");
    }
  }

  async function updateName() {
    if (!currentUser) return;
    const name = normalizeText(profileNameInput);
    if (!name) return setProfileError("Нэрээ оруулна уу.");
    try {
      const data = await apiUpdateProfile({ userId: currentUser.id, name });
      setCurrentUser(data.user || { ...currentUser, name });
      setIsEditingName(false);
      setProfileNameInput("");
      setProfileError("");
      await refreshData({ silent: true });
    } catch (error) {
      setProfileError(error.message || "Нэр солих үед алдаа гарлаа.");
    }
  }

  function logout() {
    resetQuiz(true);
    setCurrentUser(null);
    restoredRef.current = false;
  }

  async function loginAdmin() {
    if (!pin.trim()) return alert("Нууц код оруулна уу.");
    try {
      await apiAdmin(pin, { action: "ping" });
      setAdminPin(pin);
      setIsAdmin(true);
      setPin("");
    } catch (error) {
      alert(error.message || "Нууц код буруу байна");
    }
  }

  async function addQuiz() {
    if (!newQuizTitle.trim()) return;
    try {
      await apiAdmin(adminPin, { action: "createQuiz", title: newQuizTitle.trim() });
      setNewQuizTitle("");
      await refreshData({ silent: true });
    } catch (error) {
      alert(error.message || "Quiz нэмэх үед алдаа гарлаа.");
    }
  }

  async function toggleQuiz(quizId) {
    const quiz = quizzes.find(function (item) { return item.id === quizId; });
    if (!quiz) return;
    try {
      await apiAdmin(adminPin, { action: "toggleQuiz", quizId, isOpen: !quiz.isOpen });
      await refreshData({ silent: true });
    } catch (error) {
      alert(error.message || "Quiz төлөв солих үед алдаа гарлаа.");
    }
  }

  async function deleteQuiz(quizId) {
    const quiz = quizzes.find(function (item) { return item.id === quizId; });
    if (quiz && quiz.isOpen) return alert("Идэвхтэй quiz-ийг устгах боломжгүй. Эхлээд хаана уу.");
    try {
      await apiAdmin(adminPin, { action: "deleteQuiz", quizId });
      await refreshData({ silent: true });
    } catch (error) {
      alert(error.message || "Quiz устгах үед алдаа гарлаа.");
    }
  }

  async function addQuestion() {
    const options = parseOptions(newQuestion.options);
    const answerIndex = Number(newQuestion.answer) - 1;
    const quizId = selectedAdminQuiz ? selectedAdminQuiz.id : adminQuizId;
    if (!quizId) return alert("Quiz сонгоно уу.");
    if (!newQuestion.text.trim() || options.length < 2 || answerIndex < 0 || answerIndex >= options.length) return alert("Асуулт, сонголт, зөв хариултаа шалгана уу.");
    try {
      await apiAdmin(adminPin, { action: "createQuestion", quizId, text: newQuestion.text.trim(), options, answerIndex });
      setNewQuestion({ text: "", options: "", answer: 1 });
      await refreshData({ silent: true });
    } catch (error) {
      alert(error.message || "Асуулт нэмэх үед алдаа гарлаа.");
    }
  }

  async function deleteQuestion(quizId, questionId) {
    const quiz = quizzes.find(function (item) { return item.id === quizId; });
    if (quiz && quiz.isOpen) return alert("Идэвхтэй quiz-ийн асуултыг устгах боломжгүй. Эхлээд quiz-ийг хаана уу.");
    try {
      await apiAdmin(adminPin, { action: "deleteQuestion", questionId });
      await refreshData({ silent: true });
    } catch (error) {
      alert(error.message || "Асуулт устгах үед алдаа гарлаа.");
    }
  }

  function renderAuth() {
    return (
      <>
        <div className="auth-switch" style={styles.authSwitch}>
          <button onClick={function () { setAuthMode("login"); setAuthError(""); }} style={authMode === "login" ? styles.authSwitchActive : styles.authSwitchButton}>Нэвтрэх</button>
          <button onClick={function () { setAuthMode("register"); setAuthError(""); }} style={authMode === "register" ? styles.authSwitchActive : styles.authSwitchButton}>Бүртгүүлэх</button>
        </div>
        {authMode === "login" ? (
          <div>
            <label style={styles.label}>Цахим шуудан</label>
            <input type="email" placeholder="name@netcapital.mn / name@netgroup.mn" value={loginEmail} onChange={function (event) { setLoginEmail(event.target.value); }} onKeyDown={function (event) { if (event.key === "Enter") loginUser(); }} style={styles.input} />
            <div style={styles.centerAction}><button onClick={loginUser} style={styles.primaryButton}>Нэвтрэх</button></div>
          </div>
        ) : (
          <div>
            <label style={styles.label}>Овог нэр</label>
            <input type="text" placeholder="Овог нэр" value={registerName} onChange={function (event) { setRegisterName(event.target.value); }} style={styles.input} />
            <label style={styles.label}>Газар</label>
            <input type="text" list="department-options" placeholder="Газар, салбараа оруулна уу" value={registerDepartment} onChange={function (event) { setRegisterDepartment(event.target.value); }} style={styles.input} />
            <datalist id="department-options">{DEPARTMENTS.map(function (department) { return <option key={department} value={department} />; })}</datalist>
            <label style={styles.label}>Ажлын цахим шуудан</label>
            <input type="email" placeholder="name@netcapital.mn / name@netgroup.mn" value={registerEmail} onChange={function (event) { setRegisterEmail(event.target.value); }} style={styles.input} />
            <div style={styles.centerAction}><button onClick={registerUser} style={styles.primaryButton}>Бүртгүүлэх</button></div>
          </div>
        )}
        {authError && <p style={styles.error}>{authError}</p>}
      </>
    );
  }

  function renderProfile() {
    return (
      <div style={styles.profilePanel}>
        <div>
          <span style={styles.profileLabel}>Овог нэр</span>
          {!isEditingName ? (
            <div style={styles.profileNameRow}>
              <strong style={styles.profileValue}>{currentUser.name}</strong>
              <button onClick={function () { setProfileNameInput(currentUser.name || ""); setIsEditingName(true); }} style={styles.smallSecondaryButton}>Солих</button>
            </div>
          ) : (
            <div style={styles.profileEditBox}>
              <input type="text" placeholder="Шинэ нэр" value={profileNameInput} onChange={function (event) { setProfileNameInput(event.target.value); }} onKeyDown={function (event) { if (event.key === "Enter") updateName(); }} style={styles.input} />
              <div style={styles.profileEditActions}>
                <button onClick={updateName} style={styles.primaryButton}>Хадгалах</button>
                <button onClick={function () { setProfileNameInput(""); setProfileError(""); setIsEditingName(false); }} style={styles.secondaryButton}>Болих</button>
              </div>
            </div>
          )}
        </div>
        <div><span style={styles.profileLabel}>Газар</span><strong style={styles.profileValue}>{currentUser.department}</strong></div>
        {profileError && <p style={styles.error}>{profileError}</p>}
        <button onClick={logout} style={styles.secondaryButton}>Гарах</button>
      </div>
    );
  }

  function renderStartPanel() {
    return (
      <div className="start-panel" style={styles.startPanel}>
        <h2 className="quiz-title" style={styles.quizTitle}>{activeQuiz ? activeQuiz.title : "Quiz алга"}</h2>
        {!currentUser && <div style={styles.smallEmpty}>Нэвтэрнэ үү.</div>}
        {currentUser && !activeQuiz && <Empty text="Идэвхтэй асуулт алга." />}
        {currentUser && activeQuiz && activeQuiz.questions.length === 0 && <Empty text="Асуулт алга." />}
        {currentUser && alreadySubmitted && <Empty text="Та энэ асуултыг өгсөн байна." />}
        {currentUser && activeQuiz && !alreadySubmitted && activeQuiz.questions.length > 0 && !quizStarted && <button className="big-start-button" onClick={startQuiz} style={styles.bigStartButton}>Эхлэх</button>}
      </div>
    );
  }

  function renderQuestion() {
    return (
      <div className="question-stage" style={styles.questionStage}>
        <div style={answerFeedback ? styles.questionContentBlurred : styles.questionContent}>
          <div style={styles.timerTrack}><div key={timerRunId} style={getTimerFillStyle(questionEndsAt, currentTimeMs)} /></div>
          <h2 className="question-text" style={styles.liveQuestionText}>{currentQuestion.text}</h2>
          <div style={styles.optionGrid}>
            {currentQuestion.options.map(function (option, optionIndex) {
              const original = currentQuestion.optionOriginalIndexes ? currentQuestion.optionOriginalIndexes[optionIndex] : optionIndex;
              const selected = Number(answers[currentQuestion.id]) === Number(original);
              return (
                <button className="option-button" key={currentQuestion.id + "-" + optionIndex} onClick={function () { chooseAnswer(optionIndex); }} style={answerFeedback && !selected ? { ...getOptionButtonStyle(false), opacity: 0.58, cursor: "default" } : getOptionButtonStyle(selected)} disabled={Boolean(answerFeedback)}>
                  <span className="option-letter" style={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}</span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>
        {answerFeedback && (
          <div style={answerFeedback.isCorrect ? styles.scoreOverlay : styles.scoreOverlayWrong}>
            <div style={styles.scoreOverlayLabel}>{answerFeedback.message}</div>
            <div className="score-value" style={styles.scoreOverlayValue}>{formatScore(animatedScore)}</div>
            <div style={styles.scoreOverlaySub}>+{formatScore(answerFeedback.score)}</div>
          </div>
        )}
      </div>
    );
  }

  function renderResult() {
    return (
      <div style={styles.resultPanel}>
        <div style={styles.confettiWrap}>{Array.from({ length: 32 }).map(function (_, index) { return <span key={index} style={getConfettiStyle(index)} />; })}</div>
        <div style={styles.resultBadge}>Баяр хүргэе! 🎉</div>
        <h2 style={styles.resultTitle}>{lastResult.quizTitle}</h2>
        <div style={styles.resultScore}>{formatScore(lastResult.score)}</div>
        <p style={styles.resultText}>Таны авсан нийт оноо</p>
        <button onClick={function () { setTab("leaderboard"); }} style={styles.resultButton}>Онооны самбар харах</button>
      </div>
    );
  }

  function renderLeaderboard() {
    return (
      <main className="app-card" style={styles.card}>
        <div style={styles.leaderboardHeader}><h2 style={styles.sectionTitle}>Онооны самбар</h2><span style={styles.leaderboardCount}>Нийт: {filteredLeaderboard.length}</span></div>
        <input type="text" placeholder="Нэр, газар, салбараар хайх" value={leaderboardSearch} onChange={function (event) { setLeaderboardSearch(event.target.value); }} style={styles.leaderboardSearchInput} />
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>#</th><th style={styles.th}>Нэр</th><th style={styles.th}>Газар</th><th style={styles.th}>Нийт оноо</th><th style={styles.th}>Оролцсон</th></tr></thead>
            <tbody>
              {pageRows.length > 0 ? pageRows.map(function (row) {
                return <tr key={row.id}><td style={styles.td}>{row.rank}</td><td style={styles.td}><strong>{row.name}</strong></td><td style={styles.td}>{row.department}</td><td style={styles.td}><strong>{formatScore(row.totalScore)}</strong></td><td style={styles.td}>{row.completed}</td></tr>;
              }) : <tr><td style={styles.td} colSpan="5">Илэрц олдсонгүй.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={styles.paginationBar}>
          <button onClick={function () { setLeaderboardPage(function (page) { return Math.max(1, page - 1); }); }} style={safePage <= 1 ? styles.disabledPaginationButton : styles.paginationButton} disabled={safePage <= 1}>Өмнөх</button>
          <span style={styles.paginationText}>{safePage} / {totalPages}</span>
          <button onClick={function () { setLeaderboardPage(function (page) { return Math.min(totalPages, page + 1); }); }} style={safePage >= totalPages ? styles.disabledPaginationButton : styles.paginationButton} disabled={safePage >= totalPages}>Дараах</button>
        </div>
      </main>
    );
  }

  function renderAdmin() {
    return (
      <main className="app-grid" style={styles.grid}>
        <section className="app-card" style={styles.card}>
          <h2 style={styles.sectionTitle}>Админ</h2>
          {!isAdmin ? (
            <div>
              <input type="password" placeholder="Нууц код" value={pin} onChange={function (event) { setPin(event.target.value); }} onKeyDown={function (event) { if (event.key === "Enter") loginAdmin(); }} style={styles.input} />
              <div style={styles.centerAction}><button onClick={loginAdmin} style={styles.primaryButton}>Нэвтрэх</button></div>
            </div>
          ) : <div style={styles.profilePanel}><strong style={styles.profileValue}>Нэвтэрсэн</strong><button onClick={function () { setIsAdmin(false); setAdminPin(""); }} style={styles.secondaryButton}>Гарах</button></div>}
        </section>
        <section className="app-card" style={styles.card}>
          {!isAdmin ? <div style={styles.adminEmpty}>Админ нууц код оруулна уу.</div> : (
            <div>
              <div style={styles.adminBox}>
                <h3 style={styles.smallTitle}>Quiz нэмэх</h3>
                <input placeholder="Quiz нэр" value={newQuizTitle} onChange={function (event) { setNewQuizTitle(event.target.value); }} style={styles.input} />
                <button onClick={addQuiz} style={styles.primaryButton}>Нэмэх</button>
              </div>
              <div style={styles.adminBox}>
                <h3 style={styles.smallTitle}>Quiz удирдах</h3>
                {quizzes.map(function (quiz) {
                  return <div key={quiz.id} style={styles.adminQuizRow}><span>{quiz.title}</span><div style={styles.adminActions}><button onClick={function () { toggleQuiz(quiz.id); }} style={styles.secondaryButton}>{quiz.isOpen ? "Хаах" : "Нээх"}</button><button onClick={function () { deleteQuiz(quiz.id); }} style={quiz.isOpen ? styles.disabledDangerButton : styles.dangerButton} disabled={quiz.isOpen}>Устгах</button></div></div>;
                })}
              </div>
              <div style={styles.adminBox}>
                <h3 style={styles.smallTitle}>Quiz-д асуулт нэмэх</h3>
                <select value={selectedAdminQuiz ? selectedAdminQuiz.id : adminQuizId} onChange={function (event) { setAdminQuizId(event.target.value); }} style={styles.input}>{quizzes.map(function (quiz) { return <option key={quiz.id} value={quiz.id}>{quiz.title}</option>; })}</select>
                <input placeholder="Асуулт" value={newQuestion.text} onChange={function (event) { setNewQuestion(function (previous) { return { ...previous, text: event.target.value }; }); }} style={styles.input} />
                <textarea placeholder={["Сонголтууд", "Сонголт 1", "Сонголт 2"].join("\n")} value={newQuestion.options} onChange={function (event) { setNewQuestion(function (previous) { return { ...previous, options: event.target.value }; }); }} style={styles.textarea} />
                <input type="number" min="1" placeholder="Зөв хариултын дугаар" value={newQuestion.answer} onChange={function (event) { setNewQuestion(function (previous) { return { ...previous, answer: event.target.value }; }); }} style={styles.input} />
                <button onClick={addQuestion} style={styles.primaryButton}>Асуулт нэмэх</button>
                <div style={styles.questionListBox}>
                  <h4 style={styles.questionListTitle}>Одоогийн асуултууд</h4>
                  {selectedAdminQuiz && selectedAdminQuiz.questions.length > 0 ? selectedAdminQuiz.questions.map(function (question, index) {
                    return <div key={question.id} style={styles.questionManageRow}><span style={styles.questionManageText}>{index + 1}. {question.text}</span><button onClick={function () { deleteQuestion(selectedAdminQuiz.id, question.id); }} style={selectedAdminQuiz.isOpen ? styles.disabledDangerButton : styles.dangerButton} disabled={selectedAdminQuiz.isOpen}>Устгах</button></div>;
                  }) : <div style={styles.questionEmptyText}>Энэ quiz-д асуулт алга.</div>}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <div className="app-page" style={styles.page}>
      <style>{appCss}</style>
      {showIntro && <Intro image={lionImage} />}
      <header style={styles.header}>
        <div style={styles.logoStrip}>
          <div style={styles.netCapitalLogoWrap}><img src={netCapitalLogo} alt="Netcapital financial group" style={styles.netCapitalLogo} /></div>
          <div style={styles.iiaLogoWrap}><img src={iiaLogo} alt="The Institute of Internal Auditors" style={styles.iiaLogo} /></div>
        </div>
        <div style={styles.headerTitleBlock}>
          <h1 className="app-title" style={styles.title}>Дотоод аудитыг сурталчлах сар</h1>
          <p className="app-subtitle" style={styles.subtitle}>5-р дугаар сарын аян</p>
        </div>
      </header>
      {globalError && <div style={styles.globalError}>{globalError}</div>}
      <nav className="app-tabs" style={styles.tabs}>
        <button className="app-tab" onClick={function () { setTab("quiz"); }} style={tab === "quiz" ? styles.tabActive : styles.tab}>Асуулт</button>
        <button className="app-tab" onClick={function () { setTab("leaderboard"); }} style={tab === "leaderboard" ? styles.tabActive : styles.tab}>Онооны самбар</button>
        <button className="app-tab" onClick={function () { setTab("admin"); }} style={tab === "admin" ? styles.tabActive : styles.tab}>Админ</button>
      </nav>
      {tab === "quiz" && <main className="app-grid" style={styles.grid}><section className="app-card" style={styles.card}>{!currentUser ? renderAuth() : renderProfile()}</section><section className="app-card" style={quizStarted && answerFeedback ? (answerFeedback.isCorrect ? styles.quizCardAnswered : styles.quizCardWrong) : styles.card}>{!quizStarted && lastResult && renderResult()}{!quizStarted && !lastResult && renderStartPanel()}{quizStarted && currentQuestion && renderQuestion()}</section></main>}
      {tab === "leaderboard" && renderLeaderboard()}
      {tab === "admin" && renderAdmin()}
      <footer style={styles.footerTagline}>Lead the movement. Share your voice.</footer>
    </div>
  );
}

function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

function Intro({ image }) {
  return <div style={styles.introOverlay}><img src={image} alt="Арслан" style={styles.introLionImage} /></div>;
}

const appCss = `
  html, body, #root { margin: 0 !important; padding: 0 !important; width: 100%; min-width: 0; min-height: 100%; background: radial-gradient(circle at top, #0a5a46 0%, #00305E 38%, #02070d 100%); overflow-x: hidden; }
  body { margin: 0 !important; padding: 0 !important; font-family: Inter, Arial, sans-serif !important; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .app-page, .app-page * { box-sizing: border-box; font-family: Inter, Arial, sans-serif !important; }
  .app-page * { border: none !important; outline: none !important; letter-spacing: normal !important; text-transform: none !important; }
  .app-page button, .app-page input, .app-page textarea, .app-page select { font: inherit !important; font-family: inherit !important; appearance: none; -webkit-appearance: none; -moz-appearance: none; }
  @keyframes timerDrain { from { width: 100%; } to { width: 0%; } }
  @keyframes confettiPop { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45) rotate(0deg); } 10% { opacity: 1; } 45% { opacity: 1; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--jump))) scale(1) rotate(calc(var(--r) * 0.55)); } 78% { opacity: 1; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--fall))) scale(1) rotate(var(--r)); } 100% { opacity: 1; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--final-y))) scale(1) rotate(var(--r)); } }
  @keyframes introOverlayFade { 0% { opacity: 1; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); background: rgba(2, 10, 20, 0.30); } 70% { opacity: 1; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); background: rgba(2, 10, 20, 0.24); } 100% { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); background: rgba(2, 10, 20, 0); } }
  @keyframes introLogoFade { 0% { opacity: 0; transform: scale(0.88); filter: blur(0px) drop-shadow(0 0 28px rgba(75, 220, 230, 0.34)); } 18% { opacity: 1; transform: scale(1); } 70% { opacity: 1; transform: scale(1.04); } 100% { opacity: 0; transform: scale(1.12); filter: blur(16px) drop-shadow(0 0 12px rgba(75, 220, 230, 0.18)); } }
  @media (max-width: 1100px) { .app-grid { grid-template-columns: 1fr !important; } }
  @media (max-width: 760px) { .app-page { padding: 14px !important; } .app-page header { align-items: flex-start !important; } .app-title { font-size: 24px !important; } .app-tabs { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 6px !important; } .app-tab { padding: 9px 5px !important; font-size: 12px !important; } .app-card { padding: 12px !important; } .quiz-title { font-size: 30px !important; } .option-button { width: 100% !important; min-height: 56px !important; font-size: 14px !important; } table { min-width: 620px !important; } }
`;

const baseFont = "Inter, Arial, sans-serif";

const styles = {
  page: { minHeight: "100vh", width: "100%", maxWidth: "100vw", margin: 0, background: "radial-gradient(circle at top, #0a5a46 0%, #00305E 38%, #02070d 100%)", color: "#f5fbff", padding: 20, fontFamily: baseFont, overflowX: "hidden" },
  header: { marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 0, flexWrap: "wrap" },
  logoStrip: { display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 0, marginLeft: 0, marginRight: 0, fontFamily: baseFont },
  netCapitalLogoWrap: { display: "flex", alignItems: "center", justifyContent: "center", width: "auto", height: 58, background: "transparent", boxShadow: "none", overflow: "visible", padding: 0, marginLeft: 0, marginRight: 6, fontFamily: baseFont },
  iiaLogoWrap: { display: "flex", alignItems: "center", justifyContent: "center", width: "auto", height: 92, background: "transparent", boxShadow: "none", overflow: "visible", padding: 0, marginLeft: 0, fontFamily: baseFont },
  iiaLogo: { maxWidth: "100%", maxHeight: 90, objectFit: "contain", display: "block" },
  netCapitalLogo: { maxWidth: "100%", maxHeight: 54, objectFit: "contain", display: "block", borderRadius: 9 },
  headerTitleBlock: { display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 240, margin: 0 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: "#9BE564", textShadow: "0 0 14px rgba(122,201,67,0.42)", lineHeight: 1.15, fontFamily: baseFont },
  subtitle: { margin: "4px 0 0", color: "#d9ffc7", fontSize: 13, fontFamily: baseFont },
  tabs: { display: "flex", gap: 7, marginBottom: 16 },
  tab: { padding: "8px 12px", borderRadius: 10, background: "rgba(0,48,94,0.38)", color: "#e9ffd8", fontWeight: 700, fontSize: 14, fontFamily: baseFont, cursor: "pointer" },
  tabActive: { padding: "8px 12px", borderRadius: 10, background: "linear-gradient(180deg, #9BE564, #7AC943)", color: "#071306", fontWeight: 700, fontSize: 14, fontFamily: baseFont, cursor: "pointer", boxShadow: "0 0 16px rgba(122,201,67,0.38)" },
  grid: { display: "grid", gridTemplateColumns: "300px 1fr", gap: 14 },
  card: { background: "linear-gradient(180deg, rgba(0,48,94,0.72), rgba(0,18,35,0.96))", borderRadius: 12, padding: 16, boxShadow: "0 0 24px rgba(122,201,67,0.10)" },
  quizCardAnswered: { background: "linear-gradient(180deg, rgba(122,201,67,0.92), rgba(36,130,52,0.96))", borderRadius: 12, padding: 16, boxShadow: "0 0 28px rgba(122,201,67,0.36)", color: "#071306" },
  quizCardWrong: { background: "linear-gradient(180deg, rgba(248,113,113,0.94), rgba(153,27,27,0.96))", borderRadius: 12, padding: 16, boxShadow: "0 0 28px rgba(248,113,113,0.38)", color: "#fff7f7" },
  sectionTitle: { margin: "0 0 12px", fontSize: 18, color: "#f5fbff", fontFamily: baseFont },
  smallTitle: { margin: "0 0 10px", fontSize: 15, color: "#f5fbff", fontFamily: baseFont },
  quizTitle: { margin: 0, fontSize: 34, color: "#9BE564", textShadow: "0 0 10px rgba(122,201,67,0.40)", fontFamily: baseFont },
  label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, marginTop: 10, color: "#d9ffc7", fontFamily: baseFont },
  input: { width: "100%", padding: "8px 10px", borderRadius: 9, background: "rgba(0,18,35,0.78)", color: "#f5fbff", marginBottom: 9, boxSizing: "border-box", outline: "none", fontSize: 13, fontFamily: baseFont },
  textarea: { width: "100%", minHeight: 82, padding: 10, borderRadius: 9, background: "rgba(0,18,35,0.78)", color: "#f5fbff", marginBottom: 9, boxSizing: "border-box", outline: "none", fontSize: 13, fontFamily: baseFont },
  primaryButton: { padding: "8px 12px", borderRadius: 9, background: "linear-gradient(180deg, #9BE564, #7AC943)", color: "#071306", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: baseFont, boxShadow: "0 0 14px rgba(122,201,67,0.34)" },
  secondaryButton: { padding: "8px 12px", borderRadius: 9, background: "rgba(0,48,94,0.34)", color: "#9BE564", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: baseFont, boxShadow: "0 0 10px rgba(122,201,67,0.16)" },
  smallSecondaryButton: { padding: "6px 9px", borderRadius: 8, background: "rgba(0,48,94,0.34)", color: "#9BE564", cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: baseFont, boxShadow: "0 0 10px rgba(122,201,67,0.12)" },
  dangerButton: { padding: "8px 12px", borderRadius: 9, background: "rgba(80,10,10,0.34)", color: "#fecaca", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: baseFont },
  disabledDangerButton: { padding: "8px 12px", borderRadius: 9, background: "rgba(30,41,59,0.38)", color: "#94a3b8", cursor: "not-allowed", fontWeight: 700, fontSize: 13, fontFamily: baseFont },
  authSwitch: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: 3, borderRadius: 10, background: "rgba(0,18,35,0.70)", marginBottom: 10 },
  authSwitchButton: { padding: "7px 8px", borderRadius: 8, background: "transparent", color: "#d9ffc7", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: baseFont },
  authSwitchActive: { padding: "7px 8px", borderRadius: 8, background: "linear-gradient(180deg, #9BE564, #7AC943)", color: "#071306", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: baseFont },
  centerAction: { display: "flex", justifyContent: "center", marginTop: 8 },
  error: { color: "#fca5a5", fontSize: 14, marginTop: 8, textAlign: "center", fontFamily: baseFont },
  globalError: { marginBottom: 12, padding: 10, borderRadius: 10, background: "rgba(127,29,29,0.38)", color: "#fecaca", textAlign: "center", fontFamily: baseFont },
  profilePanel: { display: "grid", gap: 14, marginTop: 12, padding: 12, borderRadius: 10, background: "rgba(0,18,35,0.70)" },
  profileLabel: { display: "block", color: "#d9ffc7", fontSize: 12, marginBottom: 4, fontFamily: baseFont },
  profileValue: { display: "block", color: "#f5fbff", fontSize: 16, fontFamily: baseFont },
  profileNameRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontFamily: baseFont },
  profileEditBox: { display: "grid", gap: 8, marginTop: 4, fontFamily: baseFont },
  profileEditActions: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", fontFamily: baseFont },
  startPanel: { minHeight: 340, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 16 },
  bigStartButton: { width: "fit-content", padding: "14px 26px", borderRadius: 12, background: "linear-gradient(180deg, #9BE564, #7AC943)", color: "#071306", cursor: "pointer", fontWeight: 800, fontSize: 18, fontFamily: baseFont, boxShadow: "0 0 20px rgba(122,201,67,0.46)" },
  smallEmpty: { borderRadius: 10, padding: "10px 14px", color: "#d9ffc7", background: "rgba(0,18,35,0.70)", textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 42, boxSizing: "border-box", fontFamily: baseFont },
  empty: { borderRadius: 10, padding: 16, color: "#d9ffc7", background: "rgba(0,18,35,0.70)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 90, boxSizing: "border-box", fontFamily: baseFont },
  adminEmpty: { borderRadius: 10, padding: 16, color: "#d9ffc7", background: "rgba(0,18,35,0.70)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220, height: "100%", boxSizing: "border-box", fontFamily: baseFont },
  timerTrack: { height: 9, background: "rgba(122,201,67,0.16)", borderRadius: 9999, overflow: "hidden", marginBottom: 14, padding: 1, boxSizing: "border-box", WebkitMaskImage: "-webkit-radial-gradient(white, black)" },
  timerFill: { height: "100%", width: "100%", background: "linear-gradient(90deg, #9BE564, #7AC943)", borderRadius: 9999, transition: "width 0.25s linear", boxShadow: "0 0 10px rgba(122,201,67,0.55)", overflow: "hidden" },
  questionStage: { position: "relative", minHeight: 230, borderRadius: 14, overflow: "hidden" },
  questionContent: { transition: "filter 0.25s ease, opacity 0.25s ease, transform 0.25s ease" },
  questionContentBlurred: { filter: "blur(8px)", opacity: 0.34, transform: "scale(0.985)", transition: "filter 0.25s ease, opacity 0.25s ease, transform 0.25s ease", pointerEvents: "none" },
  liveQuestionText: { fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#f5fbff", fontFamily: baseFont },
  optionGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 8 },
  optionButton: { color: "#f5fbff", borderRadius: 12, minHeight: 56, padding: 12, cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, fontFamily: baseFont },
  optionLetter: { width: 24, height: 24, borderRadius: 999, background: "linear-gradient(180deg, #42BFED, #017AC1)", color: "#071306", display: "grid", placeItems: "center", flex: "0 0 auto", fontSize: 12, fontWeight: 700, boxShadow: "0 0 10px rgba(122,201,67,0.32)", fontFamily: baseFont },
  scoreOverlay: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "rgba(122,201,67,0.20)", borderRadius: 16, color: "#071306", zIndex: 3, fontFamily: baseFont },
  scoreOverlayWrong: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "rgba(248,113,113,0.24)", borderRadius: 16, color: "#fff7f7", zIndex: 3, fontFamily: baseFont },
  scoreOverlayLabel: { fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: baseFont },
  scoreOverlayValue: { fontSize: 68, lineHeight: 1, fontWeight: 800, textShadow: "0 0 18px rgba(255,255,255,0.40)", fontFamily: baseFont },
  scoreOverlaySub: { marginTop: 6, fontSize: 18, fontWeight: 700, opacity: 0.86, fontFamily: baseFont },
  resultPanel: { minHeight: 340, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 10 },
  confettiWrap: { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 },
  resultBadge: { position: "relative", zIndex: 2, padding: "8px 18px", borderRadius: 999, background: "rgba(122,201,67,0.16)", color: "#d9ffc7", fontWeight: 700, fontSize: 26, lineHeight: 1.1, textShadow: "0 0 16px rgba(122,201,67,0.46)", boxShadow: "0 0 20px rgba(122,201,67,0.16)", fontFamily: baseFont },
  resultTitle: { position: "relative", zIndex: 2, margin: 0, fontSize: 22, color: "#f5fbff", fontFamily: baseFont },
  resultScore: { position: "relative", zIndex: 2, fontSize: 56, lineHeight: 1, fontWeight: 900, color: "#9BE564", textShadow: "0 0 20px rgba(122,201,67,0.46)", fontFamily: baseFont },
  resultText: { position: "relative", zIndex: 2, margin: "0 0 10px", color: "#d9ffc7", fontSize: 16, fontFamily: baseFont },
  resultButton: { position: "relative", zIndex: 2, padding: "12px 22px", borderRadius: 12, background: "linear-gradient(180deg, #9BE564, #7AC943)", color: "#071306", cursor: "pointer", fontWeight: 700, fontSize: 16, fontFamily: baseFont, boxShadow: "0 0 20px rgba(122,201,67,0.42)" },
  leaderboardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10, fontFamily: baseFont },
  leaderboardCount: { color: "#d9ffc7", fontSize: 13, fontWeight: 700, fontFamily: baseFont },
  leaderboardSearchInput: { width: "100%", padding: "10px 12px", borderRadius: 10, background: "rgba(0,18,35,0.78)", color: "#f5fbff", marginBottom: 12, boxSizing: "border-box", outline: "none", fontSize: 14, fontFamily: baseFont },
  tableWrap: { overflowX: "auto", overflowY: "auto", WebkitOverflowScrolling: "touch", borderRadius: 12, maxHeight: "70vh" },
  table: { width: "100%", borderCollapse: "collapse", fontFamily: baseFont },
  th: { textAlign: "left", padding: 12, background: "rgba(0,18,35,0.78)", fontSize: 14, color: "#9BE564", fontFamily: baseFont },
  td: { padding: 12, fontSize: 14, color: "#f5fbff", fontFamily: baseFont },
  paginationBar: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14, flexWrap: "wrap", fontFamily: baseFont },
  paginationButton: { padding: "8px 12px", borderRadius: 9, background: "rgba(0,48,94,0.34)", color: "#9BE564", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: baseFont, boxShadow: "0 0 10px rgba(122,201,67,0.16)" },
  disabledPaginationButton: { padding: "8px 12px", borderRadius: 9, background: "rgba(30,41,59,0.38)", color: "#94a3b8", cursor: "not-allowed", fontWeight: 700, fontSize: 13, fontFamily: baseFont },
  paginationText: { color: "#d9ffc7", fontSize: 14, fontWeight: 700, minWidth: 64, textAlign: "center", fontFamily: baseFont },
  adminBox: { borderRadius: 10, padding: 16, marginBottom: 16, background: "rgba(0,18,35,0.70)", fontFamily: baseFont },
  adminQuizRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", fontFamily: baseFont, flexWrap: "wrap" },
  adminActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  questionListBox: { marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(155,229,100,0.18)", display: "grid", gap: 8, fontFamily: baseFont },
  questionListTitle: { margin: "0 0 4px", color: "#d9ffc7", fontSize: 14, fontWeight: 700, fontFamily: baseFont },
  questionManageRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", flexWrap: "wrap", fontFamily: baseFont },
  questionManageText: { color: "#f5fbff", fontSize: 13, lineHeight: 1.35, flex: "1 1 220px", fontFamily: baseFont },
  questionEmptyText: { color: "#d9ffc7", fontSize: 13, opacity: 0.85, fontFamily: baseFont },
  introOverlay: { position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", background: "rgba(2, 10, 20, 0.30)", animation: "introOverlayFade 2.2s ease forwards", pointerEvents: "none" },
  introLionImage: { width: 420, maxWidth: "82vw", height: "auto", objectFit: "contain", animation: "introLogoFade 2.2s ease forwards", filter: "drop-shadow(0 0 28px rgba(75, 220, 230, 0.34))", opacity: 1, background: "transparent" },
  footerTagline: { marginTop: 22, padding: "14px 10px", color: "#9BE564", fontSize: 24, fontWeight: 800, textAlign: "center", lineHeight: 1.2, textShadow: "0 0 12px rgba(155,229,100,0.34)", fontFamily: baseFont }
};

function runSelfTests() {
  console.assert(DEPARTMENTS.includes("ТУЗ"), "department list should include TUZ");
  console.assert(DEPARTMENTS.includes("Гүйцэтгэх удирдлага"), "department list should include executive management");
  console.assert(isValidWorkEmail("test@netcapital.mn"), "netcapital work email should be valid");
  console.assert(isValidWorkEmail("test@netgroup.mn"), "netgroup work email should be valid");
  console.assert(!isValidWorkEmail("test@gmail.com"), "non-work email should be invalid");
  console.assert(parseOptions(["A", "", "B"].join("\n")).length === 2, "parseOptions should ignore blanks");
  const shuffledQuestion = shuffleQuestions([{ id: "q", text: "T", options: ["A", "B", "C"], answer: 1 }])[0];
  console.assert(shuffledQuestion.options.length === 3, "shuffle should preserve option count");
  console.assert(shuffledQuestion.optionOriginalIndexes.length === 3, "shuffle should preserve original indexes");
  console.assert(calculatePoints(true, 20) === 1000, "max score should be 1000");
  console.assert(calculatePoints(false, 20) === 0, "wrong answer should be 0");
  console.assert(QUIZ_MUSIC_INTERVAL_MS >= 1500, "quiz background music should stay gentle");
  console.assert(typeof unlockAudio === "function", "audio should be unlockable from a user gesture");
  console.assert(getTimerFillStyle(Date.now() + QUESTION_SECONDS * 1000, Date.now()).width === "100%", "timer should start full");
  console.assert(getConfettiStyle(0).animationName === "confettiPop", "result confetti should be enabled");
  console.assert(buildLeaderboard([{ userId: "u1", userName: "A", department: "D", score: 10 }, { userId: "u1", userName: "A", department: "D", score: 20 }])[0].totalScore === 30, "leaderboard should sum scores");
}

runSelfTests();
