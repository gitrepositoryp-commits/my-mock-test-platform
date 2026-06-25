const API_BASE = "https://my-mock-test-platform.onrender.com/api";

function getToken() {
  return localStorage.getItem("adminToken") || localStorage.getItem("token") || localStorage.getItem("authToken");
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`
  };
}

function logout() {
  localStorage.clear();
  window.location.href = "admin-login.html";
}

async function checkAdmin() {
  const token = getToken();

  if (!token) {
    logout();
    return false;
  }

  const res = await fetch(`${API_BASE}/tests/admin/questions?exam=NTPC_PG_FREE_1`, {
    headers: adminHeaders()
  });

  if (res.status === 401 || res.status === 403) {
    alert("Admin access only.");
    logout();
    return false;
  }

  return true;
}

async function loadDashboard() {
  try {
    const exams = [
      "NTPC_PG_FREE_1",
      "NTPC_PG_FREE_2",
      "NTPC_PG_FREE_3",
      "NTPC_UG_FREE_1",
      "NTPC_UG_FREE_2",
      "NTPC_UG_FREE_3",
      "ALP_FREE_1",
      "GROUP_D_FREE_1",
      "GROUP_2_FREE_1"
    ];

    let totalQuestions = 0;

    for (const exam of exams) {
      const res = await fetch(`${API_BASE}/tests/admin/questions?exam=${exam}`, {
        headers: adminHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) totalQuestions += data.length;
      }
    }

    const resultsRes = await fetch(`${API_BASE}/tests/admin/results`, {
      headers: adminHeaders()
    });

    let results = [];
    if (resultsRes.ok) results = await resultsRes.json();

    let payments = [];
    try {
      const payRes = await fetch(`${API_BASE}/payment/admin/payments`, {
        headers: adminHeaders()
      });
      if (payRes.ok) payments = await payRes.json();
    } catch {}

    const totalRevenue = payments.reduce((sum, p) => {
      return sum + Number(p.amount || 0);
    }, 0);

    document.getElementById("totalQuestions").textContent = totalQuestions;
    document.getElementById("totalResults").textContent = Array.isArray(results) ? results.length : 0;
    document.getElementById("totalPayments").textContent = Array.isArray(payments) ? payments.length : 0;
    document.getElementById("totalRevenue").textContent = `₹${totalRevenue}`;

  } catch (err) {
    console.error("Dashboard load error:", err);
    alert("Failed to load dashboard data.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("logoutBtn").addEventListener("click", logout);

  const ok = await checkAdmin();

  if (ok) {
    await loadDashboard();
  }
});