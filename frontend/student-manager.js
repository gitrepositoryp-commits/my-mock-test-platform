const API_BASE = "https://my-mock-test-platform.onrender.com/api";

let allStudents = [];

function getToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken")
  );
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

async function loadStudents() {
  const table = document.getElementById("studentTable");
  table.innerHTML = `<tr><td colspan="6">Loading students...</td></tr>`;

  try {
   const res = await fetch(`${API_BASE}/admin/users`, {
    headers: headers()
});

    if (res.status === 401 || res.status === 403) {
      alert("Admin access only.");
      logout();
      return;
    }

    if (!res.ok) {
      table.innerHTML = `<tr><td colspan="6">Failed to load students. Backend route missing.</td></tr>`;
      return;
    }

    allStudents = await res.json();

    if (!Array.isArray(allStudents)) allStudents = [];

    renderStudents(allStudents);
    updateStats();

  } catch (err) {
    console.error(err);
    table.innerHTML = `<tr><td colspan="6">Network error loading students.</td></tr>`;
  }
}

function updateStats() {
  const total = allStudents.length;
  const premium = allStudents.filter(u => u.isPremium).length;
  const free = total - premium;

  document.getElementById("totalStudents").textContent = total;
  document.getElementById("premiumStudents").textContent = premium;
  document.getElementById("freeStudents").textContent = free;
}

function renderStudents(students) {
  const table = document.getElementById("studentTable");

  if (!students.length) {
    table.innerHTML = `<tr><td colspan="6" class="empty">No students found.</td></tr>`;
    return;
  }

  table.innerHTML = students.map(user => {
    const premium = user.isPremium
      ? `<span class="status-premium">Premium</span>`
      : `<span class="status-free">Free</span>`;

    const expiry = user.premiumExpiresAt
      ? new Date(user.premiumExpiresAt).toLocaleDateString()
      : "-";

    const joined = user.createdAt
      ? new Date(user.createdAt).toLocaleDateString()
      : "-";

    return `
      <tr>
        <td>${escapeHtml(user.username || "Student")}</td>
        <td>${escapeHtml(user.email || "-")}</td>
        <td>${premium}</td>
        <td>${expiry}</td>
        <td>${joined}</td>
        <td>
          <button class="action-btn view-btn" onclick="viewStudent('${user._id}')">View</button>
          <button class="action-btn delete-btn" onclick="deleteStudent('${user._id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

function searchStudents() {
  const search = document.getElementById("searchStudent").value.toLowerCase();

  const filtered = allStudents.filter(user => {
    const name = (user.username || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  renderStudents(filtered);
}

function viewStudent(id) {
  const user = allStudents.find(u => u._id === id);

  if (!user) return;

  alert(
    `Name: ${user.username || "Student"}\n` +
    `Email: ${user.email || "-"}\n` +
    `Premium: ${user.isPremium ? "Yes" : "No"}\n` +
    `Expiry: ${user.premiumExpiresAt ? new Date(user.premiumExpiresAt).toLocaleString() : "-"}\n` +
    `Joined: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}`
  );
}

async function deleteStudent(id) {
  if (!confirm("Delete this student permanently?")) return;

  try {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: "DELETE",
      headers: headers()
    });

    if (res.ok) {
      alert("Student deleted.");
      await loadStudents();
    } else {
      alert("Delete failed. Backend route may be missing.");
    }
  } catch {
    alert("Delete error.");
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("refreshBtn").addEventListener("click", loadStudents);
  document.getElementById("searchStudent").addEventListener("input", searchStudents);

  const ok = await verifyAdmin();

  if (ok) {
    await loadStudents();
  }
});