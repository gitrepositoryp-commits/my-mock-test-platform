const API_BASE_URL = 'https://my-mock-test-platform.onrender.com/api';

let appState = {
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswers: {},
reviewQuestions: {},
  timerInterval: null,
  totalSecondsRemaining: 90 * 60
};

// GET CURRENT EXAM TYPE FROM URL
function getCurrentExamType() {
  return new URLSearchParams(window.location.search).get("exam") || "NTPC";
}

function getCurrentExamTitle() {
  const examType = getCurrentExamType();

  if (examType === "NTPC") return "🚆 RRB NTPC Mock Test";
  if (examType === "GROUP_D") return "🛤 RRB Group-D Mock Test";
  if (examType === "GROUP_2") return "🏛 AP Group-2 Mock Test";

  return "Mock Test";
}

// APPLICATION START
document.addEventListener('DOMContentLoaded', () => {
  initAuthFormListeners();

 if (
  window.location.pathname.endsWith('test.html') ||
  window.location.pathname === '/test' ||
  document.getElementById('examWorkspaceContainer')
) {
  bootstrapQuizEngine();
}
  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});

// REGISTER / LOGIN
function initAuthFormListeners() {
  const registerForm = document.getElementById('registerForm');
  const loginForm = document.getElementById('loginForm');

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            email,
            password
          })
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('mock_test_token', data.token);
          localStorage.setItem('mock_test_user', JSON.stringify(data.user));
          window.location.href = 'dashboard.html';
        } else {
          alert(data.error || 'Registration processing failure.');
        }

      } catch (err) {
        console.error(err);
        alert('Cross-origin system communication cluster failure.');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email,
            password
          })
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('mock_test_token', data.token);
          localStorage.setItem('mock_test_user', JSON.stringify(data.user));
          window.location.href = 'dashboard.html';
        } else {
          alert(data.error || 'Invalid account identification credentials.');
        }

      } catch (err) {
        console.error(err);
        alert('Server network error during verification sequence.');
      }
    });
  }
}

// LOGOUT
function handleLogout() {
  localStorage.removeItem('mock_test_token');
  localStorage.removeItem('mock_test_user');
  window.location.href = 'login.html';
}

// QUIZ START
async function bootstrapQuizEngine() {
  const token = localStorage.getItem('mock_test_token');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const examType = getCurrentExamType();

  const title = document.getElementById("examTitle");

  if (title) {
    title.textContent = getCurrentExamTitle();
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/tests/questions?exam=${examType}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.ok) {
      appState.questions = await response.json();

      if (appState.questions.length === 0) {
        alert(`${getCurrentExamTitle()} question bank is empty. Please upload questions in admin panel.`);
        window.location.href = 'dashboard.html';
        return;
      }

      startExamTimer();
      renderActiveQuestionCard();
      generateNavigationGrid();
      initExamActionButtons();

    } else {
      alert('Failed to retrieve test bank entries securely.');
      window.location.href = 'dashboard.html';
    }

  } catch (err) {
    console.error(err);
    alert('Critical loss of workspace parameter streaming.');
  }
}

// TIMER
function startExamTimer() {
  const displayClock = document.getElementById('timerClock');

  if (!displayClock) return;

  displayClock.textContent = "90:00";

  appState.timerInterval = setInterval(() => {
    appState.totalSecondsRemaining--;

    let mins = Math.floor(appState.totalSecondsRemaining / 60);
    let secs = appState.totalSecondsRemaining % 60;

    displayClock.textContent =
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (appState.totalSecondsRemaining <= 0) {
      clearInterval(appState.timerInterval);
      alert('Time limit reached! Auto-submitting assessment workspace responses.');
      submitMockTestResponses();
    }
  }, 1000);
}

// RENDER QUESTION
function renderActiveQuestionCard() {
  if (appState.questions.length === 0) return;

  const currentQ = appState.questions[appState.currentQuestionIndex];
  const questionID = currentQ._id || currentQ.id;

  document.getElementById('questionNumberIndicator').textContent =
    `Question ${appState.currentQuestionIndex + 1} of ${appState.questions.length}`;

  document.getElementById('questionTextDisplay').textContent =
    currentQ.question;
    document.getElementById("sectionNameDisplay").textContent =
  "Section: " + (currentQuestion.category || "General");

  const optionsWrapper = document.getElementById('optionsContainer');
  optionsWrapper.innerHTML = '';

  currentQ.options.forEach((option) => {
    const label = document.createElement('label');
    label.className = 'option-label';

    const isChecked =
      appState.selectedAnswers[questionID] === option ? 'checked' : '';

    label.innerHTML =
      `<input type="radio" name="quizOption" value="${option}" ${isChecked}> <span>${option}</span>`;

    label.querySelector('input').addEventListener('change', (e) => {
      appState.selectedAnswers[questionID] = e.target.value;
      updateNavigationBubbles();
    });

    optionsWrapper.appendChild(label);
  });

  document.getElementById('prevBtn').disabled =
    appState.currentQuestionIndex === 0;

  document.getElementById('nextBtn').textContent =
    appState.currentQuestionIndex === appState.questions.length - 1
      ? 'Finish Exam'
      : 'Next Question';
}

// NAVIGATION
function generateNavigationGrid() {
  const container = document.getElementById('navigationBubbleContainer');

  if (!container) return;

  container.innerHTML = '';

  appState.questions.forEach((q, index) => {
    const bubble = document.createElement('div');

    bubble.className = 'bubble';
    bubble.id = `bubble-nav-${index}`;
    bubble.textContent = index + 1;

    bubble.addEventListener('click', () => {
      appState.currentQuestionIndex = index;
      renderActiveQuestionCard();
      updateNavigationBubbles();
    });

    container.appendChild(bubble);
  });

  updateNavigationBubbles();
}

function updateNavigationBubbles() {
  appState.questions.forEach((q, index) => {
    const el = document.getElementById(`bubble-nav-${index}`);

    if (!el) return;

    const questionID = q._id || q.id;

    el.className = 'bubble';
    el.style.background = "";
    el.style.color = "";

    if (index === appState.currentQuestionIndex) {
      el.classList.add('active');
    }

    if (appState.selectedAnswers[questionID]) {
      el.classList.add('answered');
    }

    if (appState.reviewQuestions[questionID]) {
      el.style.background = "#9333ea";
      el.style.color = "white";
    }
  });
}

// BUTTONS
function initExamActionButtons() {

  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const submitBtn = document.getElementById('submitExamBtn');
  const reviewBtn = document.getElementById('markReviewBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (appState.currentQuestionIndex > 0) {
        appState.currentQuestionIndex--;
        renderActiveQuestionCard();
        updateNavigationBubbles();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {

      if (
        appState.currentQuestionIndex <
        appState.questions.length - 1
      ) {

        appState.currentQuestionIndex++;
        renderActiveQuestionCard();
        updateNavigationBubbles();

      } else {

        if (
          confirm(
            'Are you completely sure you want to finish and submit this test?'
          )
        ) {
          submitMockTestResponses();
        }

      }
    });
  }

  if (reviewBtn) {

    reviewBtn.addEventListener('click', () => {

      const currentQ =
        appState.questions[
          appState.currentQuestionIndex
        ];

      const questionID =
        currentQ._id || currentQ.id;

      appState.reviewQuestions[questionID] = true;

      updateNavigationBubbles();

      alert(
        `Question ${
          appState.currentQuestionIndex + 1
        } marked for review.`
      );

    });

  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {

      if (
        confirm(
          'Are you completely sure you want to finish and submit this test?'
        )
      ) {
        submitMockTestResponses();
      }

    });
  }

}
// SUBMIT TEST
async function submitMockTestResponses() {
  if (appState.timerInterval) {
    clearInterval(appState.timerInterval);
  }

  const token = localStorage.getItem('mock_test_token');
  const examType = getCurrentExamType();

  try {
    const response = await fetch(`${API_BASE_URL}/tests/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        examType,
        answers: appState.selectedAnswers || {}
      })
    });

    const data = await response.json();

    if (response.ok && data) {
      localStorage.setItem('last_score', data.score !== undefined ? data.score : 0);
      localStorage.setItem('last_total', data.totalQuestions !== undefined ? data.totalQuestions : appState.questions.length);
      localStorage.setItem('last_percentage', data.percentage !== undefined ? data.percentage : 0);
      localStorage.setItem('last_result_id', data.resultId || data._id || "session_saved");
      localStorage.setItem('last_exam_type', examType);

      window.location.href = 'result.html';
    } else {
      alert(data.error || data.message || 'Error compiling scoring data calculations.');
    }

  } catch (err) {
    console.error(err);
    alert('Evaluation processing failure: local hardware pipeline redirection fault.');
  }
}