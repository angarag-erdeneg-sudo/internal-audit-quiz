import React, { useEffect, useMemo, useState } from "react";
import lionImage from "./assets/lion.png";
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
const ANSWER_FEEDBACK_DELAY_MS = 1200;

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
  "Санхүү төлөвлөлт, ноолуурын удирдлага & шинжилгээний газар",
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
  "ТУЗ"
];

const INITIAL_QUIZZES = [];
const CURRENT_USER_STORAGE_KEY = "internal_audit_quiz_current_user";

function getStoredCurrentUser() {
  try {
    if (typeof window === "undefined") return null;
    const rawUser = window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  } catch {
    return null;
  }
}

function saveStoredCurrentUser(user) {
  try {
    if (typeof window === "undefined") return;
    if (user) {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  } catch {
    // Local storage is optional.
  }
}

function normalizeText(value) {
  return String(value || "").trim().split(" ").filter(Boolean).join(" ");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidWorkEmail(value) {
  const email = normalizeEmail(value);
  const allowedDomains = ["@netcapital.mn", "@netgroup.mn"];

  return allowedDomains.some(function (domain) {
    return email.length > domain.length && email.endsWith(domain);
  }) && !email.includes(" ");
}

function isValidDepartment(value) {
  return DEPARTMENTS.includes(normalizeText(value));
}

function parseOptions(rawOptions) {
  return String(rawOptions || "").split("\n").map(function (item) {
    return item.trim();
  }).filter(Boolean);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateQuestionPoints(isCorrect, secondsLeft) {
  if (!isCorrect) return 0;
  const safeSecondsLeft = clampNumber(Number(secondsLeft) || 0, 0, QUESTION_SECONDS);
  const ratio = safeSecondsLeft / QUESTION_SECONDS;
  return Math.round(Math.pow(ratio, SCORE_DECAY_POWER) * MAX_POINTS_PER_QUESTION);
}

function formatScore(value) {
  return String(Math.round(Number(value || 0)));
}

function getPreciseSecondsLeft(questionEndsAt) {
  if (!questionEndsAt) return QUESTION_SECONDS;
  return clampNumber((questionEndsAt - Date.now()) / 1000, 0, QUESTION_SECONDS);
}

function scoreSubmission(quiz, answers, answerTimes) {
  if (!quiz || !Array.isArray(quiz.questions)) return 0;
  return quiz.questions.reduce(function (sum, question) {
    const isCorrect = Number(answers[question.id]) === Number(question.answer);
    const hasAnswerTime = Object.prototype.hasOwnProperty.call(answerTimes || {}, question.id);
    const secondsLeft = hasAnswerTime ? answerTimes[question.id] : 0;
    return sum + calculateQuestionPoints(isCorrect, secondsLeft);
  }, 0);
}

function getActiveQuiz(quizzes) {
  return quizzes.find(function (quiz) { return quiz.isOpen; }) || null;
}

function normalizeQuizFromApi(quiz) {
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

function normalizeSubmissionFromApi(row) {
  const profile = row.users_public || row.user || {};
  return {
    id: row.id || row.submission_id || String(row.quiz_id || row.quizId) + "-" + String(row.user_id || row.userId),
    quizId: row.quizId || row.quiz_id,
    userId: row.userId || row.user_id,
    score: Number(row.score || 0),
    userName: profile.name || row.name || "-",
    department: profile.department || row.department || "-",
    email: profile.email || row.email || "",
    submittedAt: row.submitted_at || row.submittedAt || null
  };
}

function buildLeaderboard(submissions) {
  const grouped = new Map();
  submissions.forEach(function (submission) {
    const key = submission.userId || submission.email || submission.userName;
    if (!key) return;
    const existing = grouped.get(key) || {
      id: key,
      name: submission.userName || "-",
      department: submission.department || "-",
      totalScore: 0,
      completed: 0
    };
    existing.totalScore += Number(submission.score || 0);
    existing.completed += 1;
    grouped.set(key, existing);
  });
  return Array.from(grouped.values()).sort(function (a, b) {
    return b.totalScore - a.totalScore || b.completed - a.completed || a.name.localeCompare(b.name);
  });
}

function playFinishSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.45, audioContext.currentTime);
    masterGain.connect(audioContext.destination);
    [523.25, 659.25, 783.99, 1046.5, 1174.66].forEach(function (frequency, index) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startTime = audioContext.currentTime + index * 0.16;
      const endTime = startTime + 0.2;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.28, startTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);
      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  } catch (error) {
    // Sound is optional.
  }
}

function getTabStyle(active) {
  return active ? styles.tabActive : styles.tab;
}

function getOptionButtonStyle(isSelected) {
  return {
    ...styles.optionButton,
    background: isSelected ? "linear-gradient(180deg, rgba(122,201,67,0.24), rgba(1,122,193,0.10))" : "rgba(0,20,40,0.72)",
    boxShadow: isSelected ? "0 0 18px rgba(122,201,67,0.30)" : "none"
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

export default function App() {
  const [quizzes, setQuizzes] = useState(INITIAL_QUIZZES);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState("");
  const [tab, setTab] = useState("quiz");
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const [currentUser, setCurrentUser] = useState(function () {
    return getStoredCurrentUser();
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileError, setProfileError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerDepartment, setRegisterDepartment] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [authError, setAuthError] = useState("");
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionEndsAt, setQuestionEndsAt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [answerTimes, setAnswerTimes] = useState({});
  const [answerFeedback, setAnswerFeedback] = useState(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [timerRunId, setTimerRunId] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [newQuizTitle, setNewQuizTitle] = useState("");
  const [newQuestion, setNewQuestion] = useState({ text: "", options: "", answer: 1 });
  const [adminQuizId, setAdminQuizId] = useState("");
  const [showIntro, setShowIntro] = useState(true);

  const activeQuiz = getActiveQuiz(quizzes);
  const currentQuestion = activeQuiz && activeQuiz.questions ? activeQuiz.questions[currentQuestionIndex] : null;
  const selectedAdminQuiz = quizzes.find(function (quiz) { return quiz.id === adminQuizId; }) || quizzes[0] || null;
  const alreadySubmitted = Boolean(currentUser && activeQuiz && submissions.some(function (submission) {
    return submission.quizId === activeQuiz.id && submission.userId === currentUser.id;
  }));
  const canStartQuiz = Boolean(currentUser && activeQuiz && activeQuiz.questions.length > 0 && !alreadySubmitted && !quizStarted);

  const leaderboard = useMemo(function () {
    return buildLeaderboard(submissions);
  }, [submissions]);

  const filteredLeaderboard = useMemo(function () {
    const keyword = normalizeText(leaderboardSearch).toLowerCase();
    if (!keyword) return leaderboard;

    return leaderboard.filter(function (row) {
      const haystack = [row.name, row.department, row.email]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [leaderboard, leaderboardSearch]);

  const leaderboardPageSize = 10;
  const leaderboardTotalPages = Math.max(1, Math.ceil(filteredLeaderboard.length / leaderboardPageSize));
  const safeLeaderboardPage = Math.min(leaderboardPage, leaderboardTotalPages);
  const paginatedLeaderboard = filteredLeaderboard.slice(
    (safeLeaderboardPage - 1) * leaderboardPageSize,
    safeLeaderboardPage * leaderboardPageSize
  );

  useEffect(function () {
    const timer = window.setTimeout(function () { setShowIntro(false); }, 2200);
    return function () { window.clearTimeout(timer); };
  }, []);

  useEffect(function () {
    refreshData();
  }, []);

  useEffect(function () {
    saveStoredCurrentUser(currentUser);
  }, [currentUser]);

  useEffect(function () {
    resetQuizState(false);
  }, [activeQuiz ? activeQuiz.id : null, currentUser ? currentUser.id : null]);

  useEffect(function () {
    if (!adminQuizId && quizzes.length > 0) setAdminQuizId(quizzes[0].id);
  }, [adminQuizId, quizzes]);

  useEffect(function () {
    setLeaderboardPage(1);
  }, [leaderboardSearch]);

  useEffect(function () {
    if (!quizStarted || !currentQuestion || !questionEndsAt || answerFeedback) return undefined;
    let frameId = 0;
    function updateTimer() {
      const secondsLeft = getPreciseSecondsLeft(questionEndsAt);
      if (secondsLeft <= 0) {
        const updatedTimes = { ...answerTimes, [currentQuestion.id]: 0 };
        const previousScore = scoreSubmission(activeQuiz, answers, answerTimes);
        const cumulativeScore = scoreSubmission(activeQuiz, answers, updatedTimes);
        setAnswerTimes(updatedTimes);
        setAnswerFeedback({ questionId: currentQuestion.id, isCorrect: false, score: 0, previousScore, cumulativeScore, message: "Хугацаа дууслаа" });
        return;
      }
      frameId = window.requestAnimationFrame(updateTimer);
    }
    frameId = window.requestAnimationFrame(updateTimer);
    return function () { window.cancelAnimationFrame(frameId); };
  }, [quizStarted, currentQuestion ? currentQuestion.id : null, questionEndsAt, answerFeedback, activeQuiz, answers, answerTimes]);

  useEffect(function () {
    if (!answerFeedback) return undefined;
    const start = Number(answerFeedback.previousScore || 0);
    const end = Number(answerFeedback.cumulativeScore || 0);
    const startedAt = Date.now();
    let frameId = 0;
    function animateScore() {
      const progress = clampNumber((Date.now() - startedAt) / 850, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(start + (end - start) * eased));
      if (progress < 1) frameId = window.requestAnimationFrame(animateScore);
    }
    setAnimatedScore(start);
    frameId = window.requestAnimationFrame(animateScore);
    return function () { window.cancelAnimationFrame(frameId); };
  }, [answerFeedback ? answerFeedback.questionId : null, answerFeedback ? answerFeedback.cumulativeScore : null]);

  useEffect(function () {
    if (!quizStarted || !answerFeedback) return undefined;
    const timer = window.setTimeout(function () { goToNextQuestion(); }, ANSWER_FEEDBACK_DELAY_MS);
    return function () { window.clearTimeout(timer); };
  }, [quizStarted, answerFeedback ? answerFeedback.questionId : null]);

  async function refreshData() {
    try {
      setGlobalError("");
      const data = await loadBootstrap();
      const normalizedQuizzes = (data.quizzes || []).map(normalizeQuizFromApi);
      const normalizedSubmissions = (data.leaderboard || data.submissions || []).map(normalizeSubmissionFromApi);
      setQuizzes(normalizedQuizzes);
      setSubmissions(normalizedSubmissions);
      if (!adminQuizId && normalizedQuizzes.length > 0) setAdminQuizId(normalizedQuizzes[0].id);
    } catch (error) {
      setGlobalError(error.message || "Мэдээлэл татах үед алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  function clearAuthFeedback() {
    setAuthError("");
  }

  function switchAuthMode(nextMode) {
    setAuthMode(nextMode);
    clearAuthFeedback();
  }

  async function loginUser() {
    const email = normalizeEmail(loginEmail);
    if (!email) {
      setAuthError("Имэйлээ оруулна уу.");
      return;
    }
    try {
      setAuthError("");
      const data = await apiLogin(email);
      setCurrentUser(data.user);
      setLoginEmail("");
      await refreshData();
    } catch (error) {
      setAuthError(error.message || "Нэвтрэх үед алдаа гарлаа.");
    }
  }

  async function registerUser() {
    const name = normalizeText(registerName);
    const department = normalizeText(registerDepartment);
    const email = normalizeEmail(registerEmail);
    if (!name) {
      setAuthError("Овог нэрээ оруулна уу.");
      return;
    }
    if (!department) {
      setAuthError("Газар сонгоно уу.");
      return;
    }
    if (!isValidDepartment(department)) {
      setAuthError("Газар эсвэл салбараа зөв сонгоно уу.");
      return;
    }
    if (!isValidWorkEmail(email)) {
      setAuthError("Зөвхөн @netcapital.mn эсвэл @netgroup.mn имэйл ашиглана уу.");
      return;
    }
    try {
      setAuthError("");
      const data = await apiRegister({ email, name, department });
      setCurrentUser(data.user);
      setRegisterName("");
      setRegisterDepartment("");
      setRegisterEmail("");
      await refreshData();
    } catch (error) {
      setAuthError(error.message || "Бүртгүүлэх үед алдаа гарлаа.");
    }
  }

  function resetQuizState(clearResult = true) {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setQuestionEndsAt(null);
    setAnswerFeedback(null);
    setAnimatedScore(0);
    setAnswers({});
    setAnswerTimes({});
    if (clearResult) setLastResult(null);
  }

  function startQuiz() {
    if (!canStartQuiz) return;
    setQuizStarted(true);
    setCurrentQuestionIndex(0);
    setTimerRunId(function (previous) { return previous + 1; });
    setQuestionEndsAt(Date.now() + QUESTION_SECONDS * 1000);
    setAnswerFeedback(null);
    setAnimatedScore(0);
    setAnswers({});
    setAnswerTimes({});
    setLastResult(null);
  }

  function chooseAnswer(optionIndex) {
    if (!currentQuestion || answerFeedback) return;
    const questionId = currentQuestion.id;
    const secondsLeft = getPreciseSecondsLeft(questionEndsAt);
    const isCorrect = Number(optionIndex) === Number(currentQuestion.answer);
    const earnedScore = calculateQuestionPoints(isCorrect, secondsLeft);
    const updatedAnswers = { ...answers, [questionId]: optionIndex };
    const updatedAnswerTimes = { ...answerTimes, [questionId]: secondsLeft };
    const previousScore = scoreSubmission(activeQuiz, answers, answerTimes);
    const cumulativeScore = scoreSubmission(activeQuiz, updatedAnswers, updatedAnswerTimes);
    setAnswers(updatedAnswers);
    setAnswerTimes(updatedAnswerTimes);
    setAnswerFeedback({ questionId, isCorrect, score: earnedScore, previousScore, cumulativeScore, message: isCorrect ? "Зөв хариулт" : "Буруу хариулт" });
  }

  function goToNextQuestion() {
    if (!activeQuiz) return;
    if (currentQuestionIndex >= activeQuiz.questions.length - 1) {
      finishQuiz();
      return;
    }
    setCurrentQuestionIndex(function (previous) { return previous + 1; });
    setTimerRunId(function (previous) { return previous + 1; });
    setQuestionEndsAt(Date.now() + QUESTION_SECONDS * 1000);
    setAnswerFeedback(null);
  }

  async function finishQuiz() {
    if (!currentUser || !activeQuiz || alreadySubmitted) return;
    const optimisticScore = answerFeedback && typeof answerFeedback.cumulativeScore === "number" ? answerFeedback.cumulativeScore : scoreSubmission(activeQuiz, answers, answerTimes);
    try {
      const data = await apiSubmitAnswer({ userId: currentUser.id, quizId: activeQuiz.id, answers, answerTimes });
      const backendScore = data.submission && typeof data.submission.score === "number" ? data.submission.score : optimisticScore;
      setLastResult({ quizTitle: activeQuiz.title, score: backendScore });
      playFinishSound();
      resetQuizState(false);
      await refreshData();
    } catch (error) {
      setGlobalError(error.message || "Оноо хадгалах үед алдаа гарлаа.");
      setLastResult({ quizTitle: activeQuiz.title, score: optimisticScore });
      resetQuizState(false);
    }
  }

  async function updateCurrentUserName() {
    if (!currentUser) return;

    const name = normalizeText(profileNameInput);

    if (!name) {
      setProfileError("Нэрээ оруулна уу.");
      return;
    }

    try {
      setProfileError("");
      const data = await apiUpdateProfile({ userId: currentUser.id, name });
      const updatedUser = data.user || { ...currentUser, name };
      setCurrentUser(updatedUser);
      setProfileNameInput("");
      setIsEditingName(false);
      await refreshData();
    } catch (error) {
      setProfileError(error.message || "Нэр солих үед алдаа гарлаа.");
    }
  }

  function startEditingName() {
    if (!currentUser) return;
    setProfileNameInput(currentUser.name || "");
    setProfileError("");
    setIsEditingName(true);
  }

  function cancelEditingName() {
    setProfileNameInput("");
    setProfileError("");
    setIsEditingName(false);
  }

  function logout() {
    setCurrentUser(null);
    resetQuizState();
  }

  async function loginAdmin() {
    if (!pin.trim()) {
      alert("Нууц код оруулна уу.");
      return;
    }
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
      await refreshData();
    } catch (error) {
      alert(error.message || "Quiz нэмэх үед алдаа гарлаа.");
    }
  }

  async function toggleQuizOpen(quizId) {
    const quiz = quizzes.find(function (item) { return item.id === quizId; });
    if (!quiz) return;
    try {
      await apiAdmin(adminPin, { action: "toggleQuiz", quizId, isOpen: !quiz.isOpen });
      await refreshData();
    } catch (error) {
      alert(error.message || "Quiz төлөв солих үед алдаа гарлаа.");
    }
  }

  async function deleteQuiz(quizId) {
    const quiz = quizzes.find(function (item) { return item.id === quizId; });
    if (quiz && quiz.isOpen) {
      alert("Идэвхтэй quiz-ийг устгах боломжгүй. Эхлээд хаана уу.");
      return;
    }
    try {
      await apiAdmin(adminPin, { action: "deleteQuiz", quizId });
      await refreshData();
    } catch (error) {
      alert(error.message || "Quiz устгах үед алдаа гарлаа.");
    }
  }

  async function addQuestionToQuiz() {
    const options = parseOptions(newQuestion.options);
    const answerIndex = Number(newQuestion.answer) - 1;
    const quizId = selectedAdminQuiz ? selectedAdminQuiz.id : adminQuizId;
    if (!quizId) {
      alert("Quiz сонгоно уу.");
      return;
    }
    if (!newQuestion.text.trim() || options.length < 2 || answerIndex < 0 || answerIndex >= options.length) {
      alert("Асуулт, сонголт, зөв хариултаа шалгана уу.");
      return;
    }
    try {
      await apiAdmin(adminPin, { action: "createQuestion", quizId, text: newQuestion.text.trim(), options, answerIndex });
      setNewQuestion({ text: "", options: "", answer: 1 });
      await refreshData();
    } catch (error) {
      alert(error.message || "Асуулт нэмэх үед алдаа гарлаа.");
    }
  }

  async function deleteQuestionFromQuiz(quizId, questionId) {
    const quiz = quizzes.find(function (item) { return item.id === quizId; });
    if (quiz && quiz.isOpen) {
      alert("Идэвхтэй quiz-ийн асуултыг устгах боломжгүй. Эхлээд quiz-ийг хаана уу.");
      return;
    }
    try {
      await apiAdmin(adminPin, { action: "deleteQuestion", questionId });
      await refreshData();
    } catch (error) {
      alert(error.message || "Асуулт устгах үед алдаа гарлаа.");
    }
  }

  function renderAuth() {
    return (
      <>
        <div className="auth-switch" style={styles.authSwitch}>
          <button onClick={function () { switchAuthMode("login"); }} style={authMode === "login" ? styles.authSwitchActive : styles.authSwitchButton}>Нэвтрэх</button>
          <button onClick={function () { switchAuthMode("register"); }} style={authMode === "register" ? styles.authSwitchActive : styles.authSwitchButton}>Бүртгүүлэх</button>
        </div>
        {authMode === "login" && (
          <div>
            <label style={styles.label}>Цахим шуудан</label>
            <input type="email" placeholder="name@netcapital.mn / name@netgroup.mn" value={loginEmail} onChange={function (event) { setLoginEmail(event.target.value); }} onKeyDown={function (event) { if (event.key === "Enter") loginUser(); }} style={styles.input} />
            <div style={styles.centerAction}><button onClick={loginUser} style={styles.primaryButton}>Нэвтрэх</button></div>
          </div>
        )}
        {authMode === "register" && (
          <div>
            <label style={styles.label}>Овог нэр</label>
            <input type="text" placeholder="Овог нэр" value={registerName} onChange={function (event) { setRegisterName(event.target.value); }} style={styles.input} />
            <label style={styles.label}>Газар</label>
            <input type="text" list="department-options" placeholder="Газар, салбараа оруулна уу" value={registerDepartment} onChange={function (event) { setRegisterDepartment(event.target.value); }} style={styles.input} />
            <datalist id="department-options">
              {DEPARTMENTS.map(function (department) { return <option key={department} value={department} />; })}
            </datalist>
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
              <button onClick={startEditingName} style={styles.smallSecondaryButton}>Солих</button>
            </div>
          ) : (
            <div style={styles.profileEditBox}>
              <input
                type="text"
                placeholder="Шинэ нэр"
                value={profileNameInput}
                onChange={function (event) { setProfileNameInput(event.target.value); }}
                onKeyDown={function (event) { if (event.key === "Enter") updateCurrentUserName(); }}
                style={styles.input}
              />
              <div style={styles.profileEditActions}>
                <button onClick={updateCurrentUserName} style={styles.primaryButton}>Хадгалах</button>
                <button onClick={cancelEditingName} style={styles.secondaryButton}>Болих</button>
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
        {!loading && !currentUser && <div style={styles.smallEmpty}>Нэвтэрнэ үү.</div>}
        {currentUser && !activeQuiz && <Empty text="Идэвхтэй асуулт алга." />}
        {currentUser && activeQuiz && activeQuiz.questions.length === 0 && <Empty text="Асуулт алга." />}
        {currentUser && alreadySubmitted && <Empty text="Та энэ асуултыг өгсөн байна." />}
        {canStartQuiz && <button className="big-start-button" onClick={startQuiz} style={styles.bigStartButton}>Эхлэх</button>}
      </div>
    );
  }

  function renderQuestion() {
    return (
      <div className="question-stage" style={styles.questionStage}>
        <div style={answerFeedback ? styles.questionContentBlurred : styles.questionContent}>
          <div style={styles.timerTrack}>
            <div key={timerRunId} style={answerFeedback ? { ...styles.timerFill, animationPlayState: "paused" } : styles.timerFill} />
          </div>
          <h2 className="question-text" style={styles.liveQuestionText}>{currentQuestion.text}</h2>
          <div style={styles.optionGrid}>
            {currentQuestion.options.map(function (option, optionIndex) {
              const isSelected = answers[currentQuestion.id] === optionIndex;
              return (
                <button className="option-button" key={currentQuestion.id + "-" + String(optionIndex)} onClick={function () { chooseAnswer(optionIndex); }} style={answerFeedback && !isSelected ? { ...getOptionButtonStyle(false), opacity: 0.58, cursor: "default" } : getOptionButtonStyle(isSelected)} disabled={Boolean(answerFeedback)}>
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
        <div style={styles.leaderboardHeader}>
          <h2 style={styles.sectionTitle}>Онооны самбар</h2>
          <span style={styles.leaderboardCount}>Нийт: {filteredLeaderboard.length}</span>
        </div>

        <input
          type="text"
          placeholder="Нэр, газар, салбараар хайх"
          value={leaderboardSearch}
          onChange={function (event) { setLeaderboardSearch(event.target.value); }}
          style={styles.leaderboardSearchInput}
        />

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>#</th><th style={styles.th}>Нэр</th><th style={styles.th}>Газар</th><th style={styles.th}>Нийт оноо</th><th style={styles.th}>Оролцсон</th></tr></thead>
            <tbody>
              {paginatedLeaderboard.length > 0 ? (
                paginatedLeaderboard.map(function (row, index) {
                  const rank = (safeLeaderboardPage - 1) * leaderboardPageSize + index + 1;
                  return <tr key={row.id}><td style={styles.td}>{rank}</td><td style={styles.td}><strong>{row.name}</strong></td><td style={styles.td}>{row.department}</td><td style={styles.td}><strong>{formatScore(row.totalScore)}</strong></td><td style={styles.td}>{row.completed}</td></tr>;
                })
              ) : (
                <tr><td style={styles.td} colSpan="5">Илэрц олдсонгүй.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.paginationBar}>
          <button
            onClick={function () { setLeaderboardPage(function (page) { return Math.max(1, page - 1); }); }}
            style={safeLeaderboardPage <= 1 ? styles.disabledPaginationButton : styles.paginationButton}
            disabled={safeLeaderboardPage <= 1}
          >
            Өмнөх
          </button>
          <span style={styles.paginationText}>{safeLeaderboardPage} / {leaderboardTotalPages}</span>
          <button
            onClick={function () { setLeaderboardPage(function (page) { return Math.min(leaderboardTotalPages, page + 1); }); }}
            style={safeLeaderboardPage >= leaderboardTotalPages ? styles.disabledPaginationButton : styles.paginationButton}
            disabled={safeLeaderboardPage >= leaderboardTotalPages}
          >
            Дараах
          </button>
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
          ) : (
            <div style={styles.profilePanel}>
              <strong style={styles.profileValue}>Нэвтэрсэн</strong>
              <button onClick={function () { setIsAdmin(false); setAdminPin(""); }} style={styles.secondaryButton}>Гарах</button>
            </div>
          )}
        </section>
        <section className="app-card" style={styles.card}>
          {!isAdmin ? (
            <div style={styles.adminEmpty}>Админ нууц код оруулна уу.</div>
          ) : (
            <div>
              <div style={styles.adminBox}>
                <h3 style={styles.smallTitle}>Quiz нэмэх</h3>
                <input placeholder="Quiz нэр" value={newQuizTitle} onChange={function (event) { setNewQuizTitle(event.target.value); }} style={styles.input} />
                <button onClick={addQuiz} style={styles.primaryButton}>Нэмэх</button>
              </div>
              <div style={styles.adminBox}>
                <h3 style={styles.smallTitle}>Quiz удирдах</h3>
                {quizzes.map(function (quiz) {
                  return (
                    <div key={quiz.id} style={styles.adminQuizRow}>
                      <span>{quiz.title}</span>
                      <div style={styles.adminActions}>
                        <button onClick={function () { toggleQuizOpen(quiz.id); }} style={styles.secondaryButton}>{quiz.isOpen ? "Хаах" : "Нээх"}</button>
                        <button onClick={function () { deleteQuiz(quiz.id); }} style={quiz.isOpen ? styles.disabledDangerButton : styles.dangerButton} disabled={quiz.isOpen}>Устгах</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={styles.adminBox}>
                <h3 style={styles.smallTitle}>Quiz-д асуулт нэмэх</h3>
                <select value={selectedAdminQuiz ? selectedAdminQuiz.id : adminQuizId} onChange={function (event) { setAdminQuizId(event.target.value); }} style={styles.input}>
                  {quizzes.map(function (quiz) { return <option key={quiz.id} value={quiz.id}>{quiz.title}</option>; })}
                </select>
                <input placeholder="Асуулт" value={newQuestion.text} onChange={function (event) { setNewQuestion(function (previous) { return { ...previous, text: event.target.value }; }); }} style={styles.input} />
                <textarea placeholder={"Сонголтууд\nСонголт 1\nСонголт 2"} value={newQuestion.options} onChange={function (event) { setNewQuestion(function (previous) { return { ...previous, options: event.target.value }; }); }} style={styles.textarea} />
                <input type="number" min="1" placeholder="Зөв хариултын дугаар" value={newQuestion.answer} onChange={function (event) { setNewQuestion(function (previous) { return { ...previous, answer: event.target.value }; }); }} style={styles.input} />
                <button onClick={addQuestionToQuiz} style={styles.primaryButton}>Асуулт нэмэх</button>
                <div style={styles.questionListBox}>
                  <h4 style={styles.questionListTitle}>Одоогийн асуултууд</h4>
                  {selectedAdminQuiz && selectedAdminQuiz.questions.length > 0 ? (
                    selectedAdminQuiz.questions.map(function (question, index) {
                      return (
                        <div key={question.id} style={styles.questionManageRow}>
                          <span style={styles.questionManageText}>{index + 1}. {question.text}</span>
                          <button onClick={function () { deleteQuestionFromQuiz(selectedAdminQuiz.id, question.id); }} style={selectedAdminQuiz.isOpen ? styles.disabledDangerButton : styles.dangerButton} disabled={selectedAdminQuiz.isOpen}>Устгах</button>
                        </div>
                      );
                    })
                  ) : (
                    <div style={styles.questionEmptyText}>Энэ quiz-д асуулт алга.</div>
                  )}
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
        <div style={styles.headerTitleBlock}>
          <h1 className="app-title" style={styles.title}>Дотоод аудитыг сурталчлах сар</h1>
          <p className="app-subtitle" style={styles.subtitle}>5-р дугаар сарын аян</p>
        </div>
      </header>
      {globalError && <div style={styles.globalError}>{globalError}</div>}
      <nav className="app-tabs" style={styles.tabs}>
        <button className="app-tab" onClick={function () { setTab("quiz"); }} style={getTabStyle(tab === "quiz")}>Асуулт</button>
        <button className="app-tab" onClick={function () { setTab("leaderboard"); }} style={getTabStyle(tab === "leaderboard")}>Онооны самбар</button>
        <button className="app-tab" onClick={function () { setTab("admin"); }} style={getTabStyle(tab === "admin")}>Админ</button>
      </nav>
      {tab === "quiz" && (
        <main className="app-grid" style={styles.grid}>
          <section className="app-card" style={styles.card}>{!currentUser ? renderAuth() : renderProfile()}</section>
          <section className="app-card" style={quizStarted && answerFeedback ? (answerFeedback.isCorrect ? styles.quizCardAnswered : styles.quizCardWrong) : styles.card}>
            {!quizStarted && lastResult && renderResult()}
            {!quizStarted && !lastResult && renderStartPanel()}
            {quizStarted && currentQuestion && renderQuestion()}
          </section>
        </main>
      )}
      {tab === "leaderboard" && renderLeaderboard()}
      {tab === "admin" && renderAdmin()}
    </div>
  );
}

function Empty({ text }) {
  return <div style={styles.empty}>{text}</div>;
}

function Intro({ image }) {
  return (
    <div style={styles.introOverlay}>
      <img src={image} alt="Арслан" style={styles.introLionImage} />
    </div>
  );
}

const appCss = `
  html,
  body,
  #root {
    margin: 0 !important;
    padding: 0 !important;
    width: 100%;
    min-width: 0;
    min-height: 100%;
    background: radial-gradient(circle at top, #0a5a46 0%, #00305E 38%, #02070d 100%);
    overflow-x: hidden;
  }

  body {
    margin: 0 !important;
    padding: 0 !important;
    font-family: Inter, Arial, sans-serif !important;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .app-page,
  .app-page * {
    box-sizing: border-box;
    font-family: Inter, Arial, sans-serif !important;
  }

  .app-page * {
    border: none !important;
    outline: none !important;
    letter-spacing: normal !important;
    text-transform: none !important;
  }

  .app-page button,
  .app-page input,
  .app-page textarea,
  .app-page select,
  .app-page a {
    font: inherit !important;
    font-family: inherit !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    -webkit-tap-highlight-color: transparent;
  }

  .app-page button,
  .app-page input,
  .app-page textarea,
  .app-page select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
  }

  @keyframes confettiPop {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.45) rotate(0deg); }
    10% { opacity: 1; }
    45% { opacity: 1; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--jump))) scale(1) rotate(calc(var(--r) * 0.55)); }
    78% { opacity: 1; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--fall))) scale(1) rotate(var(--r)); }
    100% { opacity: 1; transform: translate(calc(-50% + var(--x)), calc(-50% + var(--final-y))) scale(1) rotate(var(--r)); }
  }

  @keyframes timerDrain { from { width: 100%; } to { width: 0%; } }

  @keyframes introOverlayFade {
    0% { opacity: 1; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); background: rgba(2, 10, 20, 0.30); }
    70% { opacity: 1; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); background: rgba(2, 10, 20, 0.24); }
    100% { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); background: rgba(2, 10, 20, 0); }
  }

  @keyframes introLogoFade {
    0% { opacity: 0; transform: scale(0.88); filter: blur(0px) drop-shadow(0 0 28px rgba(75, 220, 230, 0.34)); }
    18% { opacity: 1; transform: scale(1); filter: blur(0px) drop-shadow(0 0 28px rgba(75, 220, 230, 0.34)); }
    70% { opacity: 1; transform: scale(1.04); filter: blur(0px) drop-shadow(0 0 28px rgba(75, 220, 230, 0.34)); }
    100% { opacity: 0; transform: scale(1.12); filter: blur(16px) drop-shadow(0 0 12px rgba(75, 220, 230, 0.18)); }
  }

  @media (max-width: 1100px) {
    .app-grid { grid-template-columns: 1fr !important; }
  }

  @media (max-width: 760px) {
    .app-page { width: 100% !important; max-width: 100vw !important; padding: 14px !important; overflow-x: hidden !important; }
    .app-title { font-size: 24px !important; line-height: 1.12 !important; word-break: keep-all !important; }
    .app-subtitle { font-size: 13px !important; }
    .app-tabs { gap: 6px !important; margin-bottom: 12px !important; display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; width: 100% !important; }
    .app-tab { width: 100% !important; min-width: 0 !important; padding: 9px 5px !important; font-size: 12px !important; white-space: nowrap !important; }
    .app-grid { grid-template-columns: 1fr !important; gap: 12px !important; width: 100% !important; min-width: 0 !important; }
    .app-card { width: 100% !important; min-width: 0 !important; padding: 12px !important; border-radius: 14px !important; min-height: auto !important; }
    .quiz-title { font-size: 30px !important; line-height: 1.1 !important; }
    .start-panel { min-height: 280px !important; gap: 14px !important; }
    .big-start-button { padding: 12px 22px !important; font-size: 17px !important; }
    .question-stage { min-height: 250px !important; }
    .question-text { font-size: 18px !important; line-height: 1.35 !important; }
    .option-button { width: 100% !important; min-height: 56px !important; padding: 12px !important; font-size: 14px !important; gap: 10px !important; }
    .option-letter { width: 24px !important; height: 24px !important; font-size: 11px !important; }
    .score-value { font-size: 68px !important; }
    table { min-width: 620px !important; }
  }

  @media (max-width: 430px) {
    .app-page { padding: 10px !important; }
    .app-title { font-size: 21px !important; }
    .app-grid { gap: 10px !important; }
    .app-card { padding: 10px !important; }
    .auth-switch { grid-template-columns: 1fr !important; }
    .question-text { font-size: 16px !important; }
    .option-button { min-height: 52px !important; padding: 10px !important; font-size: 13px !important; }
    .score-value { font-size: 56px !important; }
  }
`;

const baseFont = "Inter, Arial, sans-serif";

const styles = {
  page: { minHeight: "100vh", width: "100%", maxWidth: "100vw", margin: 0, background: "radial-gradient(circle at top, #0a5a46 0%, #00305E 38%, #02070d 100%)", color: "#f5fbff", padding: 20, fontFamily: baseFont, overflowX: "hidden" },
  header: { marginBottom: 16 },
  headerTitleBlock: { display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 240 },
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
  authSwitchButton: { padding: "7px 8px", borderRadius: 8, background: "transparent", color: "#d9ffc7", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: baseFont, letterSpacing: 0, textTransform: "none" },
  authSwitchActive: { padding: "7px 8px", borderRadius: 8, background: "linear-gradient(180deg, #9BE564, #7AC943)", color: "#071306", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: baseFont, letterSpacing: 0, textTransform: "none" },
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
  timerFill: { height: "100%", width: "100%", background: "linear-gradient(90deg, #9BE564, #7AC943)", borderRadius: 9999, animationName: "timerDrain", animationDuration: String(QUESTION_SECONDS) + "s", animationTimingFunction: "linear", animationFillMode: "forwards", boxShadow: "0 0 10px rgba(122,201,67,0.55)", overflow: "hidden" },
  questionStage: { position: "relative", minHeight: 230, borderRadius: 14, overflow: "hidden" },
  questionContent: { transition: "filter 0.25s ease, opacity 0.25s ease, transform 0.25s ease" },
  questionContentBlurred: { filter: "blur(8px)", opacity: 0.34, transform: "scale(0.985)", transition: "filter 0.25s ease, opacity 0.25s ease, transform 0.25s ease", pointerEvents: "none" },
  liveQuestionText: { fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#f5fbff", fontFamily: baseFont },
  optionGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 8 },
  optionButton: { color: "#f5fbff", borderRadius: 12, minHeight: 56, padding: 12, cursor: "pointer", textAlign: "left", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, fontFamily: baseFont },
  optionLetter: { width: 24, height: 24, borderRadius: 999, background: "linear-gradient(180deg, #42BFED, #017AC1)", color: "#071306", display: "grid", placeItems: "center", flex: "0 0 auto", fontSize: 12, fontWeight: 700, boxShadow: "0 0 10px rgba(122,201,67,0.32)", fontFamily: baseFont },
  scoreOverlay: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "rgba(122,201,67,0.20)", borderRadius: 16, color: "#071306", zIndex: 3, fontFamily: baseFont },
  scoreOverlayWrong: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", background: "rgba(248,113,113,0.24)", borderRadius: 16, color: "#fff7f7", zIndex: 3, fontFamily: baseFont },
  scoreOverlayLabel: { fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: baseFont, letterSpacing: 0, textTransform: "none" },
  scoreOverlayValue: { fontSize: 68, lineHeight: 1, fontWeight: 800, textShadow: "0 0 18px rgba(255,255,255,0.40)", fontFamily: baseFont, letterSpacing: 0, textTransform: "none" },
  scoreOverlaySub: { marginTop: 6, fontSize: 18, fontWeight: 700, opacity: 0.86, fontFamily: baseFont, letterSpacing: 0, textTransform: "none" },
  resultPanel: { minHeight: 340, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 10 },
  confettiWrap: { position: "absolute", inset: 0, pointerEvents: "none" },
  resultBadge: { padding: "8px 18px", borderRadius: 999, background: "rgba(122,201,67,0.16)", color: "#d9ffc7", fontWeight: 700, fontSize: 26, lineHeight: 1.1, textShadow: "0 0 16px rgba(122,201,67,0.46)", boxShadow: "0 0 20px rgba(122,201,67,0.16)", fontFamily: baseFont, letterSpacing: 0, textTransform: "none" },
  resultTitle: { margin: 0, fontSize: 22, color: "#f5fbff", fontFamily: baseFont },
  resultScore: { fontSize: 56, lineHeight: 1, fontWeight: 900, color: "#9BE564", textShadow: "0 0 20px rgba(122,201,67,0.46)", fontFamily: baseFont },
  resultText: { margin: "0 0 10px", color: "#d9ffc7", fontSize: 16, fontFamily: baseFont },
  resultButton: { padding: "12px 22px", borderRadius: 12, background: "linear-gradient(180deg, #9BE564, #7AC943)", color: "#071306", cursor: "pointer", fontWeight: 700, fontSize: 16, fontFamily: baseFont, boxShadow: "0 0 20px rgba(122,201,67,0.42)" },
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
  introLionImage: { width: 420, maxWidth: "82vw", height: "auto", objectFit: "contain", animation: "introLogoFade 2.2s ease forwards", filter: "drop-shadow(0 0 28px rgba(75, 220, 230, 0.34))", opacity: 1, background: "transparent" }
};

function runSelfTests() {
  console.assert(DEPARTMENTS.length === 80, "department list should contain 80 entries including TUZ");
  console.assert(isValidWorkEmail("test@netcapital.mn"), "netcapital work email should be valid");
  console.assert(isValidWorkEmail("test@netgroup.mn"), "netgroup work email should be valid");
  console.assert(!isValidWorkEmail("test@gmail.com"), "non-work email should be invalid");
  console.assert(isValidDepartment("ТУЗ"), "department list should include TUZ");
  console.assert(calculateQuestionPoints(true, 30) === 1000, "max score should be 1000");
  console.assert(calculateQuestionPoints(false, 20) === 0, "wrong answer should be 0");
  console.assert(parseOptions("A\n\nB").length === 2, "parseOptions should ignore blanks");
  console.assert(getOptionButtonStyle(false).boxShadow === "none", "unselected option should not have shadow");
  console.assert(Array.isArray(INITIAL_QUIZZES), "backend build should start with an empty quiz cache");
  console.assert(normalizeQuizFromApi({ id: "1", title: "T", is_open: true, questions: [{ id: "q", text: "A", options: ["A", "B"], answer_index: 1 }] }).questions[0].answer === 1, "API quiz normalization should map answer_index to answer");
  console.assert(buildLeaderboard([{ userId: "u1", userName: "A", department: "D", score: 10 }, { userId: "u1", userName: "A", department: "D", score: 20 }])[0].totalScore === 30, "leaderboard should sum backend submissions by user");
  console.assert(CURRENT_USER_STORAGE_KEY.length > 0, "current user storage key should exist for refresh persistence");
  console.assert(normalizeText("  Test   User  ") === "Test User", "normalizeText should clean profile names before update");
  console.assert(buildLeaderboard(Array.from({ length: 12 }).map(function (_, index) { return { userId: "u" + index, userName: "User " + index, department: "D", score: index }; })).length === 12, "leaderboard should support pagination-sized datasets");
}

runSelfTests();
