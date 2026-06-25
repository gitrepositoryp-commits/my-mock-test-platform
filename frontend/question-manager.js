const API_BASE = "https://my-mock-test-platform.onrender.com/api";

let allQuestions = [];
let filteredQuestions = [];
let currentPage = 1;
const pageSize = 20;

function getToken() {
  return localStorage.getItem("adminToken") || localStorage.getItem("token") || localStorage.getItem("authToken");
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`
  };
}

function logout() {
  localStorage.clear();
  window.location.href = "admin-login.html";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function populateExamFilter() {
  const examGroups = [
    { label: "RRB NTPC Graduate", prefix: "NTPC_PG" },
    { label: "RRB NTPC Undergraduate", prefix: "NTPC_UG" },
    { label: "RRB ALP", prefix: "ALP" },
    { label: "Technician Grade-1", prefix: "TECH_G1" },
    { label: "Technician Grade-3", prefix: "TECH_G3" },
    { label: "RRB Group-D", prefix: "GROUP_D" },
    { label: "AP Group-2", prefix: "GROUP_2" }
  ];

  const select = document.getElementById("examFilter");
  select.innerHTML = "";

  examGroups.forEach(group => {
    const free = document.createElement("optgroup");
    free.label = `${group.label} - FREE`;

    for (let i = 1; i <= 3; i++) {
      const opt = document.createElement("option");
      opt.value = `${group.prefix}_FREE_${i}`;
      opt.textContent = `${group.label} Free Mock ${i}`;
      free.appendChild(opt);
    }

    select.appendChild(free);

    const premium = document.createElement("optgroup");
    premium.label = `${group.label} - PREMIUM`;

    for (let i = 1; i <= 30; i++) {
      const opt = document.createElement("option");
      opt.value = `${group.prefix}_PREMIUM_${i}`;
      opt.textContent = `🔒 ${group.label} Premium Mock ${i}`;
      premium.appendChild(opt);
    }

    select.appendChild(premium);
  });
}

async function verifyAdmin() {
  const token = getToken();
  if (!token) {
    logout();
    return false;
  }

  const res = await fetch(`${API_BASE}/tests/admin/questions?exam=NTPC_PG_FREE_1`, {
    headers: headers()
  });

  if (res.status === 401 || res.status === 403) {
    alert("Admin access only.");
    logout();
    return false;
  }

  return true;
}

async function loadQuestions() {
  const exam = document.getElementById("examFilter").value;
  const container = document.getElementById("questionContainer");
  container.innerHTML = `<div class="empty-state">Loading questions...</div>`;

  try {
    const res = await fetch(`${API_BASE}/tests/admin/questions?exam=${encodeURIComponent(exam)}`, {
      headers: headers()
    });

    if (res.status === 401 || res.status === 403) {
      alert("Session expired.");
      logout();
      return;
    }

    allQuestions = await res.json();

    if (!Array.isArray(allQuestions)) allQuestions = [];

    currentPage = 1;
    applyFilters();

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="empty-state">Failed to load questions.</div>`;
  }
}

function updateStats() {
  document.getElementById("totalQuestions").textContent = allQuestions.length;
  document.getElementById("mathCount").textContent = allQuestions.filter(q => q.category === "Maths").length;
  document.getElementById("reasoningCount").textContent = allQuestions.filter(q => q.category === "Reasoning").length;
  document.getElementById("scienceCount").textContent = allQuestions.filter(q => q.category === "General Science").length;
  document.getElementById("gaCount").textContent = allQuestions.filter(q => q.category === "General Awareness").length;
}

function applyFilters() {
  const search = document.getElementById("searchBox").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;

  filteredQuestions = allQuestions.filter(q => {
    const matchText = (q.question || "").toLowerCase().includes(search);
    const matchCategory = category === "All" || q.category === category;
    return matchText && matchCategory;
  });

  updateStats();
  renderQuestions();
}

function renderQuestions() {
  const container = document.getElementById("questionContainer");
  container.innerHTML = "";

  if (filteredQuestions.length === 0) {
    container.innerHTML = `<div class="empty-state">No questions found.</div>`;
    document.getElementById("pageInfo").textContent = "Page 0 of 0";
    return;
  }

  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredQuestions.slice(start, start + pageSize);

  pageItems.forEach((q, index) => {
    const id = q._id;
    const absoluteNo = start + index + 1;

    const card = document.createElement("div");
    card.className = "question-card";

    card.innerHTML = `
      <div class="question-top">
        <div class="question-title">
          <input type="checkbox" class="select-question" value="${id}">
          Question ${absoluteNo}
        </div>
        <span class="category-badge">${escapeHtml(q.category || "General Awareness")}</span>
      </div>

      <textarea id="qtext-${id}">${escapeHtml(q.question)}</textarea>

      <div class="options-grid">
        <input id="opt1-${id}" value="${escapeHtml(q.options?.[0])}" placeholder="Option A">
        <input id="opt2-${id}" value="${escapeHtml(q.options?.[1])}" placeholder="Option B">
        <input id="opt3-${id}" value="${escapeHtml(q.options?.[2])}" placeholder="Option C">
        <input id="opt4-${id}" value="${escapeHtml(q.options?.[3])}" placeholder="Option D">
      </div>

      <input id="ans-${id}" value="${escapeHtml(q.correctAnswer)}" placeholder="Correct Answer">

      <select id="cat-${id}">
        <option value="Maths" ${q.category === "Maths" ? "selected" : ""}>Maths</option>
        <option value="Reasoning" ${q.category === "Reasoning" ? "selected" : ""}>Reasoning</option>
        <option value="General Science" ${q.category === "General Science" ? "selected" : ""}>General Science</option>
        <option value="General Awareness" ${q.category === "General Awareness" ? "selected" : ""}>General Awareness</option>
      </select>

      <div class="card-actions">
        <button class="save-btn" onclick="updateQuestion('${id}')">Save</button>
        <button class="duplicate-btn" onclick="duplicateQuestion('${id}')">Duplicate</button>
        <button class="delete-btn" onclick="deleteQuestion('${id}')">Delete</button>
      </div>
    `;

    container.appendChild(card);
  });

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${totalPages}`;
}

async function updateQuestion(id) {
  const examType = document.getElementById("examFilter").value;

  const question = document.getElementById(`qtext-${id}`).value.trim();
  const correctAnswer = document.getElementById(`ans-${id}`).value.trim();
  const category = document.getElementById(`cat-${id}`).value;

  const options = [
    document.getElementById(`opt1-${id}`).value.trim(),
    document.getElementById(`opt2-${id}`).value.trim(),
    document.getElementById(`opt3-${id}`).value.trim(),
    document.getElementById(`opt4-${id}`).value.trim()
  ];

  if (!question || options.some(o => !o) || !correctAnswer) {
    alert("Please fill question, all 4 options and correct answer.");
    return;
  }

  const res = await fetch(`${API_BASE}/tests/admin/questions/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ examType, question, options, correctAnswer, category })
  });

  if (res.ok) {
    alert("Question updated.");
    await loadQuestions();
  } else {
    alert("Update failed.");
  }
}

async function deleteQuestion(id) {
  if (!confirm("Delete this question?")) return;

  const res = await fetch(`${API_BASE}/tests/admin/questions/${id}`, {
    method: "DELETE",
    headers: headers()
  });

  if (res.ok) {
    alert("Question deleted.");
    await loadQuestions();
  } else {
    alert("Delete failed.");
  }
}

async function duplicateQuestion(id) {
  const q = allQuestions.find(item => item._id === id);
  if (!q) return;

  const examType = document.getElementById("examFilter").value;

  const res = await fetch(`${API_BASE}/tests/bulk-questions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      examType,
      questionsArray: [{
        examType,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category: q.category || "General Awareness"
      }]
    })
  });

  if (res.ok) {
    alert("Question duplicated.");
    await loadQuestions();
  } else {
    alert("Duplicate failed.");
  }
}

async function bulkDelete() {
  const ids = [...document.querySelectorAll(".select-question:checked")].map(cb => cb.value);

  if (ids.length === 0) {
    alert("Select at least one question.");
    return;
  }

  if (!confirm(`Delete ${ids.length} selected questions?`)) return;

  for (const id of ids) {
    await fetch(`${API_BASE}/tests/admin/questions/${id}`, {
      method: "DELETE",
      headers: headers()
    });
  }

  alert("Selected questions deleted.");
  await loadQuestions();
}

async function bulkChangeCategory() {
  const ids = [...document.querySelectorAll(".select-question:checked")].map(cb => cb.value);

  if (ids.length === 0) {
    alert("Select at least one question.");
    return;
  }

  const category = prompt("Enter category: Maths, Reasoning, General Science, General Awareness");

  if (!["Maths", "Reasoning", "General Science", "General Awareness"].includes(category)) {
    alert("Invalid category.");
    return;
  }

  for (const id of ids) {
    const q = allQuestions.find(item => item._id === id);
    if (!q) continue;

    await fetch(`${API_BASE}/tests/admin/questions/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({
        examType: q.examType,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        category
      })
    });
  }

  alert("Category updated.");
  await loadQuestions();
}

function exportJson() {
  if (filteredQuestions.length === 0) {
    alert("No questions to export.");
    return;
  }

  const data = JSON.stringify(filteredQuestions, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${document.getElementById("examFilter").value}_questions.json`;
  a.click();

  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", async () => {
  populateExamFilter();

  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("searchBtn").addEventListener("click", applyFilters);
  document.getElementById("searchBox").addEventListener("input", applyFilters);
  document.getElementById("categoryFilter").addEventListener("change", applyFilters);
  document.getElementById("examFilter").addEventListener("change", loadQuestions);
  document.getElementById("refreshBtn").addEventListener("click", loadQuestions);
  document.getElementById("bulkDeleteBtn").addEventListener("click", bulkDelete);
  document.getElementById("selectVisibleBtn").addEventListener("click", () => {
  document.querySelectorAll(".select-question").forEach(cb => {
    cb.checked = true;
  });
});
  document.getElementById("bulkCategoryBtn").addEventListener("click", bulkChangeCategory);
  document.getElementById("exportBtn").addEventListener("click", exportJson);

  document.getElementById("prevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderQuestions();
    }
  });

  document.getElementById("nextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(filteredQuestions.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderQuestions();
    }
  });

  const ok = await verifyAdmin();
  if (ok) await loadQuestions();
});