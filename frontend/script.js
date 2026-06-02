// Change line 1 from localhost to your Render URL:
const API_BASE_URL = 'https://my-mock-test-platform.onrender.com';

// State Management for live test execution
let appState = {
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswers: {}, // Format: { questionId: "Selected Option Text" }
  timerInterval: null,
  totalSecondsRemaining: 300 // 5 minutes standard duration
};

// Execute initialization routines on page load
document.addEventListener('DOMContentLoaded', () => {
  initAuthFormListeners();
  
  // Route check: If on the exam page, bootstrap the quiz engine instantly
  if (window.location.pathname.endsWith('test.html')) {
    bootstrapQuizEngine();
  }
  
  // Dashboard Logouts
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});

/* ==========================================
   1. AUTHENTICATION ENGINE CONTROLLERS
   ========================================== */
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
        } else {
          alert(data.error || 'Registration failed.');
        }
      } catch (err) {
        console.error(err);
        alert('Server network error during registration.');
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('mock_test_token', data.token);
          localStorage.setItem('mock_test_user', JSON.stringify(data.user));
          window.location.href = 'dashboard.html';
        } else {
          alert(data.error || 'Invalid credentials.');
        }
      } catch (err) {
        console.error(err);
        alert('Server network error during login.');
      }
    });
  }
}

function handleLogout() {
  localStorage.removeItem('mock_test_token');
  localStorage.removeItem('mock_test_user');
  window.location.href = 'login.html';
}

/* ==========================================
   2. EXAM ENGINE OPERATIONAL PROCESSORS
   ========================================== */
async function bootstrapQuizEngine() {
  const token = localStorage.getItem('mock_test_token');
  if (!token) {
    alert('Unauthorized access attempt detected. Returning to portal.');
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/tests/questions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      appState.questions = await response.json();
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
    alert('Critical processing block tracking data streams.');
  }
}

function startExamTimer() {
  const displayClock = document.getElementById('timerClock');
  
  appState.timerInterval = setInterval(() => {
    appState.totalSecondsRemaining--;
    
    let mins = Math.floor(appState.totalSecondsRemaining / 60);
    let secs = appState.totalSecondsRemaining % 60;
    
    displayClock.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (appState.totalSecondsRemaining <= 0) {
      clearInterval(appState.timerInterval);
      alert('Time limit reached! System auto-submitting your workspace answers.');
      submitMockTestResponses();
    }
  }, 1000);
}

function renderActiveQuestionCard() {
  if (appState.questions.length === 0) return;
  
  const currentQ = appState.questions[appState.currentQuestionIndex];
  
  document.getElementById('questionNumberIndicator').textContent = `Question ${appState.currentQuestionIndex + 1} of ${appState.questions.length}`;
  document.getElementById('questionTextDisplay').textContent = currentQ.question;
  
  const optionsWrapper = document.getElementById('optionsContainer');
  optionsWrapper.innerHTML = '';
  
  currentQ.options.forEach((option) => {
    const label = document.createElement('label');
    label.className = 'option-label';
    
    const isChecked = appState.selectedAnswers[currentQ.id] === option ? 'checked' : '';
    
    label.innerHTML = `
      <input type="radio" name="quizOption" value="${option}" ${isChecked}>
      <span>${option}</span>
    `;
    
    // Auto-update selection hash map right on click change transitions
    label.querySelector('input').addEventListener('change', (e) => {
      appState.selectedAnswers[currentQ.id] = e.target.value;
      updateNavigationBubbles();
    });
    
    optionsWrapper.appendChild(label);
  });
  
  // Disable navigation buttons out of range bounds safely
  document.getElementById('prevBtn').disabled = appState.currentQuestionIndex === 0;
  document.getElementById('nextBtn').textContent = appState.currentQuestionIndex === appState.questions.length - 1 ? 'End Review View' : 'Next Question';
}

function generateNavigationGrid() {
  const container = document.getElementById('navigationBubbleContainer');
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
    
    el.className = 'bubble'; // Strip old classes
    
    if (index === appState.currentQuestionIndex) {
      el.classList.add('active');
    } else if (appState.selectedAnswers[q.id]) {
      el.classList.add('answered');
    }
  });
}

function initExamActionButtons() {
  document.getElementById('prevBtn').addEventListener('click', () => {
    if (appState.currentQuestionIndex > 0) {
      appState.currentQuestionIndex--;
      renderActiveQuestionCard();
      updateNavigationBubbles();
    }
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    if (appState.currentQuestionIndex < appState.questions.length - 1) {
      appState.currentQuestionIndex++;
      renderActiveQuestionCard();
      updateNavigationBubbles();
    }
  });

  document.getElementById('submitExamBtn').addEventListener('click', () => {
    if (confirm('Are you completely sure you want to finish and submit this test?')) {
      submitMockTestResponses();
    }
  });
}

async function submitMockTestResponses() {
  clearInterval(appState.timerInterval);
  const token = localStorage.getItem('mock_test_token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/tests/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ answers: appState.selectedAnswers })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Store metric summaries to cache for parsing on immediate results layout pages
      localStorage.setItem('last_score', data.score);
      localStorage.setItem('last_total', data.totalQuestions);
      localStorage.setItem('last_percentage', data.percentage);
      localStorage.setItem('last_result_id', data.resultId);
      
      window.location.href = 'results.html';
    } else {
      alert('Error saving your assessment evaluation details.');
    }
  } catch (err) {
    console.error(err);
    alert('Critical loss of database connection link during submission processing pipeline.');
  }
}