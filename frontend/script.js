const API_BASE_URL = 'https://my-mock-test-platform.onrender.com/api';

let appState = {
  questions: [],
  currentQuestionIndex: 0,
  selectedAnswers: {}, 
  timerInterval: null,
  totalSecondsRemaining:90* 60 // 90 Minutes Duration Allocation Standard
};

// Application Bootstrap Matrix Execution Routing
document.addEventListener('DOMContentLoaded', () => {
  initAuthFormListeners();
  
  if (window.location.pathname.endsWith('test.html')) {
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
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

function handleLogout() {
  localStorage.removeItem('mock_test_token');
  localStorage.removeItem('mock_test_user');
  window.location.href = 'login.html';
}

async function bootstrapQuizEngine() {
  const token = localStorage.getItem('mock_test_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/tests/questions`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      appState.questions = await response.json();
      if (appState.questions.length === 0) {
        alert("The question bank partition is currently empty. Add entries inside admin panel.");
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

function startExamTimer() {
  const displayClock = document.getElementById('timerClock');
  if (!displayClock) return;

  appState.timerInterval = setInterval(() => {
    appState.totalSecondsRemaining--;
    let mins = Math.floor(appState.totalSecondsRemaining / 60);
    let secs = appState.totalSecondsRemaining % 60;
    
    displayClock.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (appState.totalSecondsRemaining <= 0) {
      clearInterval(appState.timerInterval);
      alert('Time limit reached! Auto-submitting assessment workspace responses.');
      submitMockTestResponses();
    }
  }, 1000);
}

function renderActiveQuestionCard() {
  if (appState.questions.length === 0) return;

  const currentQ = appState.questions[appState.currentQuestionIndex];
  const questionID = currentQ._id || currentQ.id;

  document.getElementById('questionNumberIndicator').textContent = `Question ${appState.currentQuestionIndex + 1} of ${appState.questions.length}`;
  document.getElementById('questionTextDisplay').textContent = currentQ.question;
  
  const optionsWrapper = document.getElementById('optionsContainer');
  optionsWrapper.innerHTML = '';

  currentQ.options.forEach((option) => {
    const label = document.createElement('label');
    label.className = 'option-label';
    
    const isChecked = appState.selectedAnswers[questionID] === option ? 'checked' : '';
    label.innerHTML = `<input type="radio" name="quizOption" value="${option}" ${isChecked}> <span>${option}</span>`;
    
    label.querySelector('input').addEventListener('change', (e) => {
      appState.selectedAnswers[questionID] = e.target.value;
      updateNavigationBubbles();
    });
    
    optionsWrapper.appendChild(label);
  });

  document.getElementById('prevBtn').disabled = appState.currentQuestionIndex === 0;
  document.getElementById('nextBtn').textContent = appState.currentQuestionIndex === appState.questions.length - 1 ? 'Finish Exam' : 'Next Question';
}

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
    if (index === appState.currentQuestionIndex) {
      el.classList.add('active');
    }
    if (appState.selectedAnswers[questionID]) {
      el.classList.add('answered');
    }
  });
}

function initExamActionButtons() {
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const submitBtn = document.getElementById('submitExamBtn');

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
      if (appState.currentQuestionIndex < appState.questions.length - 1) {
        appState.currentQuestionIndex++;
        renderActiveQuestionCard();
        updateNavigationBubbles();
      } else {
        if (confirm('Are you completely sure you want to finish and submit this test?')) {
          submitMockTestResponses();
        }
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (confirm('Are you completely sure you want to finish and submit this test?')) {
        submitMockTestResponses();
      }
    });
  }
}

async function submitMockTestResponses() {
  if (appState.timerInterval) clearInterval(appState.timerInterval);
  const token = localStorage.getItem('mock_test_token');
  
  try {
    const response = await fetch(`${API_BASE_URL}/tests/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ answers: appState.selectedAnswers || {} })
    });
    
    const data = await response.json();
    
    if (response.ok && data) {
      localStorage.setItem('last_score', data.score !== undefined ? data.score : 0);
      localStorage.setItem('last_total', data.totalQuestions !== undefined ? data.totalQuestions : appState.questions.length);
      localStorage.setItem('last_percentage', data.percentage !== undefined ? data.percentage : 0);
      localStorage.setItem('last_result_id', data.resultId || data._id || "session_saved");
      
      window.location.href = 'result.html';
    } else {
      alert(data.error || data.message || 'Error compiling scoring data calculations.');
    }
  } catch (err) {
    console.error(err);
    alert('Evaluation processing failure: local hardware pipeline redirection fault.');
  }
}