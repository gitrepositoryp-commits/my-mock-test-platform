const API_BASE_URL = 'https://my-mock-test-platform.onrender.com/api';

let appState = {
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswers: {},
  reviewQuestions: {},
  timerInterval: null,
  totalSecondsRemaining: 90 * 60
};

function getCurrentExamType() {
  return new URLSearchParams(window.location.search).get("exam") || "NTPC";
}

function getCurrentExamTitle() {
  const examType = getCurrentExamType();
  return examType.replace(/_/g, " ").replace("PG", "Graduate").replace("UG", "Undergraduate") + " Mock Test";
}

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('mock_test_token', data.token);
          localStorage.setItem('mock_test_user', JSON.stringify(data.user));
          window.location.href = 'dashboard.html';
        } else { alert(data.error || 'Registration failure.'); }
      } catch (err) { alert('Authentication routing error.'); }
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
          localStorage.setItem('mock_test_token', data.token);
          localStorage.setItem('mock_test_user', JSON.stringify(data.user));
          window.location.href = 'dashboard.html';
        } else { alert(data.error || 'Invalid credentials.'); }
      } catch (err) { alert('Server network validation failure.'); }
    });
  }
}

function handleLogout() {
  localStorage.clear(); window.location.href = 'login.html';
}

async function bootstrapQuizEngine() {
  const token = localStorage.getItem('mock_test_token');
  if (!token) { window.location.href = 'login.html'; return; }

  const examType = getCurrentExamType();
  const title = document.getElementById("examTitle");
  if (title) { title.textContent = getCurrentExamTitle(); }

  try {
    const response = await fetch(`${API_BASE_URL}/tests/questions?exam=${examType}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      appState.questions = await response.json();
      if (appState.questions.length === 0) {
        alert(`Question data stack empty for ${getCurrentExamTitle()}.`);
        window.location.href = 'dashboard.html'; return;
      }
      
      // Inject the dynamic section selection tab buttons layout panel
      createExamSectionTabs();
      
      startExamTimer();
      renderActiveQuestionCard();
      generateNavigationGrid();
      initExamActionButtons();
    } else {
      window.location.href = 'dashboard.html';
    }
  } catch (err) { alert('Quiz initialization workflow exception tracking error.'); }
}

// INJECTS CLICKABLE SUBJECT SECTION BUTTONS LIKE THE DEMO SCREENSHOT IMAGE
function createExamSectionTabs() {
  const workspace = document.getElementById("examWorkspaceContainer");
  if (!workspace) return;

  // Prevent duplicated tab groups
  if (document.getElementById("studentSectionTabsContainer")) return;

  const tabsRow = document.createElement("div");
  tabsRow.id = "studentSectionTabsContainer";
  tabsRow.style.cssText = "display:flex; gap:10px; margin-bottom:20px; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0;";

  // Extract sections that exist in the loaded question paper
  const uniqueSections = ["All Sections"];
  appState.questions.forEach(q => {
    const cat = q.category || "General Awareness";
    if (!uniqueSections.includes(cat)) uniqueSections.push(cat);
  });

  uniqueSections.forEach(sectionTitle => {
    const btn = document.createElement("button");
    btn.className = "section-nav-tab-btn";
    btn.style.cssText = "padding:8px 16px; border:none; background:#cbd5e1; color:#334155; font-weight:bold; border-radius:4px; cursor:pointer; transition:all 0.2s;";
    btn.textContent = sectionTitle.toUpperCase();

    if (sectionTitle === "All Sections") {
      btn.style.background = "#1e3a8a"; btn.style.color = "white";
    }

    btn.addEventListener("click", () => {
      // Highlight the active selection button
      document.querySelectorAll(".section-nav-tab-btn").forEach(b => {
        b.style.background = "#cbd5e1"; b.style.color = "#334155";
      });
      btn.style.background = "#1e3a8a"; btn.style.color = "white";

      if (sectionTitle === "All Sections") {
        appState.currentQuestionIndex = 0;
      } else {
        // Find the index of the first question belonging to the clicked section
        const targetIndex = appState.questions.findIndex(q => (q.category || "General Awareness") === sectionTitle);
        if (targetIndex !== -1) appState.currentQuestionIndex = targetIndex;
      }
      
      renderActiveQuestionCard();
      updateNavigationBubbles();
    });

    tabsRow.appendChild(btn);
  });

  // Insert header right under the workspace card container header lines
  workspace.insertBefore(tabsRow, document.getElementById("sectionNameDisplay"));
}

function startExamTimer() {
  const displayClock = document.getElementById('timerClock');
  if (!displayClock) return;

  appState.timerInterval = setInterval(() => {
    appState.totalSecondsRemaining--;
    let mins = Math.floor(appState.totalSecondsRemaining / 60);
    let secs = appState.totalSecondsRemaining % 60;
    displayClock.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (appState.totalSecondsRemaining <= 0) {
      clearInterval(appState.timerInterval); submitMockTestResponses();
    }
  }, 1000);
}

function renderActiveQuestionCard() {
  if (appState.questions.length === 0) return;

  const currentQ = appState.questions[appState.currentQuestionIndex];
  const questionID = currentQ._id || currentQ.id;

  document.getElementById('questionNumberIndicator').textContent = `Question ${appState.currentQuestionIndex + 1} of ${appState.questions.length}`;
  document.getElementById('questionTextDisplay').textContent = currentQ.question;

  const sectionBadge = document.getElementById("sectionNameDisplay");
  if (sectionBadge) {
    const category = currentQ.category || "General Awareness";
    sectionBadge.textContent = `Section: ${category}`;
    
    if (category === "Maths") {
      sectionBadge.style.background = "#eff6ff"; sectionBadge.style.color = "#1e40af";
    } else if (category === "Reasoning") {
      sectionBadge.style.background = "#f3e8ff"; sectionBadge.style.color = "#6b21a8";
    } else if (category === "General Science") {
      sectionBadge.style.background = "#fef3c7"; sectionBadge.style.color = "#92400e";
    } else {
      sectionBadge.style.background = "#dcfce7"; sectionBadge.style.color = "#166534";
    }

    // Automatically sync active top category tab header states during Next/Prev button navigation
    document.querySelectorAll(".section-nav-tab-btn").forEach(btn => {
      if (btn.textContent.trim() === category.toUpperCase()) {
        btn.style.background = "#1e3a8a"; btn.style.color = "white";
      } else if (btn.textContent.trim() !== "ALL SECTIONS") {
        btn.style.background = "#cbd5e1"; btn.style.color = "#334155";
      }
    });
  }

  const optionsWrapper = document.getElementById('optionsContainer');
  optionsWrapper.innerHTML = '';

  currentQ.options.forEach((option) => {
    const label = document.createElement('label'); label.className = 'option-label';
    const isChecked = appState.selectedAnswers[questionID] === option ? 'checked' : '';

    label.innerHTML = `<input type="radio" name="quizOption" value="${option}" ${isChecked}> <span>${option}</span>`;
    label.querySelector('input').addEventListener('change', (e) => {
      appState.selectedAnswers[questionID] = e.target.value; updateNavigationBubbles();
    });
    optionsWrapper.appendChild(label);
  });

  document.getElementById('prevBtn').disabled = appState.currentQuestionIndex === 0;
  document.getElementById('nextBtn').textContent = appState.currentQuestionIndex === appState.questions.length - 1 ? 'Finish Exam' : 'Next Question';
}

function generateNavigationGrid() {
  const container = document.getElementById('navigationBubbleContainer');
  if (!container) return; container.innerHTML = '';

  appState.questions.forEach((q, index) => {
    const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.id = `bubble-nav-${index}`; bubble.textContent = index + 1;
    bubble.addEventListener('click', () => {
      appState.currentQuestionIndex = index; renderActiveQuestionCard(); updateNavigationBubbles();
    });
    container.appendChild(bubble);
  });
  updateNavigationBubbles();
}

function updateNavigationBubbles() {
  appState.questions.forEach((q, index) => {
    const el = document.getElementById(`bubble-nav-${index}`); if (!el) return;
    const questionID = q._id || q.id; el.className = 'bubble';

    if (index === appState.currentQuestionIndex) el.classList.add('active');
    if (appState.selectedAnswers[questionID]) el.classList.add('answered');
    if (appState.reviewQuestions[questionID]) {
      el.style.background = "#9333ea"; el.style.color = "white";
    } else {
      el.style.background = ""; el.style.color = "";
    }
  });
}

function initExamActionButtons() {
  const nextBtn = document.getElementById('nextBtn'); const prevBtn = document.getElementById('prevBtn');
  const submitBtn = document.getElementById('submitExamBtn'); const reviewBtn = document.getElementById('markReviewBtn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (appState.currentQuestionIndex > 0) {
        appState.currentQuestionIndex--; renderActiveQuestionCard(); updateNavigationBubbles();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (appState.currentQuestionIndex < appState.questions.length - 1) {
        appState.currentQuestionIndex++; renderActiveQuestionCard(); updateNavigationBubbles();
      } else { if (confirm('Finish and submit test?')) submitMockTestResponses(); }
    });
  }

  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      const currentQ = appState.questions[appState.currentQuestionIndex];
      appState.reviewQuestions[currentQ._id || currentQ.id] = true; updateNavigationBubbles();
    });
  }

  if (submitBtn) { submitBtn.addEventListener('click', () => { if (confirm('Submit test results?')) submitMockTestResponses(); }); }
}

async function submitMockTestResponses() {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  const token = localStorage.getItem('mock_test_token'); const examType = getCurrentExamType();

  try {
    const response = await fetch(`${API_BASE_URL}/tests/submit`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ examType, answers: appState.selectedAnswers || {} })
    });
    const data = await response.json();
    if (response.ok && data) {
      localStorage.setItem('last_score', data.score !== undefined ? data.score : 0);
      localStorage.setItem('last_total', data.totalQuestions !== undefined ? data.totalQuestions : appState.questions.length);
      localStorage.setItem('last_percentage', data.percentage !== undefined ? data.percentage : 0);
      localStorage.setItem('last_result_id', data.resultId || data._id);
      localStorage.setItem('last_exam_type', examType);
      window.location.href = 'result.html';
    }
  } catch (err) { alert('Submission pipeline compilation exception.'); }
}