const API_BASE = "https://my-mock-test-platform.onrender.com/api";

let allPayments = [];

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

async function loadPayments() {
  const table = document.getElementById("paymentTable");
  table.innerHTML = `<tr><td colspan="7">Loading payments...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/payment/admin/payments`, {
      headers: headers()
    });

    if (res.status === 401 || res.status === 403) {
      alert("Admin access only.");
      logout();
      return;
    }

    if (!res.ok) {
      table.innerHTML = `<tr><td colspan="7">Failed to load payments.</td></tr>`;
      return;
    }

    allPayments = await res.json();

    if (!Array.isArray(allPayments)) allPayments = [];

    renderPayments(allPayments);
    updateStats(allPayments);

  } catch (err) {
    console.error(err);
    table.innerHTML = `<tr><td colspan="7">Network error loading payments.</td></tr>`;
  }
}

function updateStats(payments) {
  const success = payments.filter(p => p.status === "success");

  const revenue = success.reduce((sum, p) => {
    return sum + Number(p.amount || 0);
  }, 0);

  const premiumUsers = new Set(
    success
      .map(p => p.userId?._id || p.userId)
      .filter(Boolean)
  ).size;

  document.getElementById("totalRevenue").textContent = `₹${revenue}`;
  document.getElementById("totalPayments").textContent = payments.length;
  document.getElementById("successPayments").textContent = success.length;
  document.getElementById("premiumUsers").textContent = premiumUsers;
}

function renderPayments(payments) {
  const table = document.getElementById("paymentTable");

  if (!payments.length) {
    table.innerHTML = `<tr><td colspan="7">No payments found.</td></tr>`;
    return;
  }

  table.innerHTML = payments.map(p => {
    const date = p.createdAt
      ? new Date(p.createdAt).toLocaleString()
      : "-";

    const student = p.userId?.username || "Student";
    const email = p.userId?.email || "-";
    const amount = `₹${p.amount || 0}`;
    const paymentId = p.razorpayPaymentId || "-";
    const status = p.status || "success";

    const expiry = p.premiumExpiresAt
      ? new Date(p.premiumExpiresAt).toLocaleDateString()
      : "-";

    return `
      <tr>
        <td>${date}</td>
        <td>${escapeHtml(student)}</td>
        <td>${escapeHtml(email)}</td>
        <td>${amount}</td>
        <td>${escapeHtml(paymentId)}</td>
        <td class="${status === "success" ? "success" : "failed"}">${escapeHtml(status)}</td>
        <td>${expiry}</td>
      </tr>
    `;
  }).join("");
}

function searchPayments() {
  const search = document.getElementById("searchBox").value.toLowerCase();

  const filtered = allPayments.filter(p => {
    const name = (p.userId?.username || "").toLowerCase();
    const email = (p.userId?.email || "").toLowerCase();
    const paymentId = (p.razorpayPaymentId || "").toLowerCase();
    const orderId = (p.razorpayOrderId || "").toLowerCase();

    return (
      name.includes(search) ||
      email.includes(search) ||
      paymentId.includes(search) ||
      orderId.includes(search)
    );
  });

  renderPayments(filtered);
  updateStats(filtered);
}

function exportCSV() {
  if (!allPayments.length) {
    alert("No payments to export.");
    return;
  }

  const rows = [
    ["Date", "Student", "Email", "Amount", "Payment ID", "Order ID", "Status", "Premium Expiry"]
  ];

  allPayments.forEach(p => {
    rows.push([
      p.createdAt ? new Date(p.createdAt).toLocaleString() : "-",
      p.userId?.username || "Student",
      p.userId?.email || "-",
      p.amount || 0,
      p.razorpayPaymentId || "-",
      p.razorpayOrderId || "-",
      p.status || "success",
      p.premiumExpiresAt ? new Date(p.premiumExpiresAt).toLocaleDateString() : "-"
    ]);
  });

  const csv = rows
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "rrb_edu_payments.csv";
  a.click();

  URL.revokeObjectURL(url);
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
  document.getElementById("refreshBtn").addEventListener("click", loadPayments);
  document.getElementById("exportBtn").addEventListener("click", exportCSV);
  document.getElementById("searchBox").addEventListener("input", searchPayments);

  const ok = await verifyAdmin();

  if (ok) {
    await loadPayments();
  }
});