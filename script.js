"use strict";

const hebrewNumbers = ["אפס", "אחד", "שתיים", "שלוש", "ארבע", "חמש", "שש", "שבע", "שמונה", "תשע", "עשר"];
const state = {
  mode: "mixed",
  question: { first: 4, second: 3, operation: "addition", answer: 7, choices: [6, 7, 8, 5] },
  questionNumber: 1,
  score: 0,
  streak: 0,
  correctCount: 0,
  wrongAnswers: [],
  isComplete: false,
  answeredCorrectly: false,
};

const elements = {
  score: document.querySelector("#score"),
  streak: document.querySelector("#streak"),
  stars: document.querySelector("#stars"),
  questionNumber: document.querySelector("#question-number"),
  milestoneLabel: document.querySelector("#milestone-label"),
  progress: document.querySelector(".game-progress"),
  progressBar: document.querySelector("#progress-bar"),
  first: document.querySelector("#first-number"),
  second: document.querySelector("#second-number"),
  operator: document.querySelector("#operator"),
  answerBox: document.querySelector("#answer-box"),
  answers: document.querySelector("#answers"),
  feedback: document.querySelector("#feedback"),
  next: document.querySelector("#next-button"),
  numberLine: document.querySelector("#number-line"),
  speechNotice: document.querySelector("#speech-notice"),
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createQuestion() {
  const operation = state.mode === "mixed" ? (Math.random() > 0.5 ? "addition" : "subtraction") : state.mode;
  let first;
  let second;
  let answer;

  if (operation === "addition") {
    first = randomInt(0, 10);
    second = randomInt(first === 0 ? 1 : 0, 10 - first);
    answer = first + second;
  } else {
    first = randomInt(1, 10);
    second = randomInt(0, first);
    answer = first - second;
  }

  const choices = new Set([answer]);
  while (choices.size < 4) {
    choices.add(Math.max(0, Math.min(10, answer + randomInt(-3, 3))));
    if (choices.size < 4) choices.add(randomInt(0, 10));
  }
  return { first, second, operation, answer, choices: shuffled([...choices]) };
}

function resetQuestion() {
  state.wrongAnswers = [];
  state.isComplete = false;
  state.answeredCorrectly = false;
  elements.speechNotice.hidden = true;
}

function nextQuestion() {
  state.question = createQuestion();
  state.questionNumber += 1;
  resetQuestion();
  render();
}

function chooseAnswer(choice) {
  if (state.isComplete || state.wrongAnswers.includes(choice)) return;
  if (choice === state.question.answer) {
    state.isComplete = true;
    state.answeredCorrectly = true;
    state.score += state.wrongAnswers.length === 0 ? 10 : 5;
    state.streak += 1;
    state.correctCount += 1;
  } else {
    state.wrongAnswers.push(choice);
    state.streak = 0;
    if (state.wrongAnswers.length === 2) state.isComplete = true;
  }
  render();
}

function renderAnswers() {
  elements.answers.replaceChildren();
  state.question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    const isWrong = state.wrongAnswers.includes(choice);
    const isRight = state.isComplete && choice === state.question.answer;
    button.type = "button";
    button.className = `answer-button answer-${index + 1}${isWrong ? " answer-wrong" : ""}${isRight ? " answer-right" : ""}`;
    button.disabled = state.isComplete || isWrong;
    button.setAttribute("aria-label", `תשובה ${choice}`);
    button.textContent = String(choice);
    if (isWrong || isRight) {
      const mark = document.createElement("span");
      mark.className = "answer-mark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = isRight ? "✓" : "×";
      button.append(mark);
    }
    button.addEventListener("click", () => chooseAnswer(choice));
    elements.answers.append(button);
  });
}

function renderNumberLine() {
  elements.numberLine.replaceChildren();
  for (let number = 0; number <= 10; number += 1) {
    const point = document.createElement("span");
    point.textContent = String(number);
    if (state.isComplete && number === state.question.answer) point.className = "number-active";
    elements.numberLine.append(point);
  }
}

function render() {
  const progress = (state.correctCount % 10) * 10;
  elements.score.textContent = String(state.score);
  elements.streak.textContent = String(state.streak);
  elements.stars.textContent = String(Math.floor(state.correctCount / 10));
  elements.questionNumber.textContent = `שאלה ${state.questionNumber}`;
  elements.milestoneLabel.textContent = `עוד ${10 - (state.correctCount % 10)} תשובות לכוכב הבא`;
  elements.progressBar.style.width = `${progress}%`;
  elements.progress.setAttribute("aria-valuenow", String(progress));
  elements.first.textContent = String(state.question.first);
  elements.second.textContent = String(state.question.second);
  elements.operator.textContent = state.question.operation === "addition" ? "+" : "−";
  elements.answerBox.textContent = state.isComplete ? String(state.question.answer) : "?";
  elements.answerBox.classList.toggle("answer-revealed", state.isComplete);
  elements.next.hidden = !state.isComplete;

  elements.feedback.className = "";
  if (state.answeredCorrectly) {
    elements.feedback.textContent = `✓ נכון מאוד! התשובה היא ${state.question.answer}`;
    elements.feedback.className = "feedback-correct";
  } else if (state.isComplete) {
    elements.feedback.textContent = `התשובה הנכונה היא ${state.question.answer}`;
    elements.feedback.className = "feedback-try";
  } else if (state.wrongAnswers.length === 1) {
    elements.feedback.textContent = "לא נכון, נסה שוב";
    elements.feedback.className = "feedback-try";
  } else {
    elements.feedback.textContent = "בוחרים את התשובה הנכונה";
  }

  renderAnswers();
  renderNumberLine();
}

function readQuestion() {
  if (!("speechSynthesis" in window)) {
    showSpeechNotice("הקראה אינה זמינה במכשיר הזה");
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();

  const speak = () => {
    const voice = synth.getVoices().find((item) => item.lang.toLowerCase().startsWith("he") || /hebrew|עברית/i.test(item.name));
    if (!voice) {
      showSpeechNotice("לא נמצא קול עברי במכשיר הזה");
      return;
    }
    elements.speechNotice.hidden = true;
    const operation = state.question.operation === "addition" ? "פלוס" : "מינוס";
    const speech = new SpeechSynthesisUtterance(`כמה זה ${hebrewNumbers[state.question.first]} ${operation} ${hebrewNumbers[state.question.second]}?`);
    speech.voice = voice;
    speech.lang = voice.lang;
    speech.rate = 0.65;
    speech.pitch = 1;
    synth.speak(speech);
  };

  if (synth.getVoices().length) {
    speak();
    return;
  }
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    synth.removeEventListener("voiceschanged", finish);
    speak();
  };
  synth.addEventListener("voiceschanged", finish);
  window.setTimeout(finish, 700);
}

function showSpeechNotice(message) {
  elements.speechNotice.textContent = message;
  elements.speechNotice.hidden = false;
}

document.querySelectorAll(".mode-option").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    document.querySelectorAll(".mode-option").forEach((option) => {
      const selected = option === button;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-checked", String(selected));
    });
    state.question = createQuestion();
    resetQuestion();
    render();
  });
});

document.querySelector("#reset-button").addEventListener("click", () => {
  state.questionNumber = 1;
  state.score = 0;
  state.streak = 0;
  state.correctCount = 0;
  state.question = createQuestion();
  resetQuestion();
  render();
});
document.querySelector("#listen-button").addEventListener("click", readQuestion);
elements.next.addEventListener("click", nextQuestion);
render();
