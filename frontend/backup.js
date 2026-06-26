const API_BASE = "https://my-mock-test-platform.onrender.com/api";

function getToken() {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken")
  );
}

function headers() {
  return {
    Authorization: `Bearer ${getToken()}`
  };
}

function logout() {
  localStorage.clear();
  window.location.href = "admin-login.html";
}

async function downloadBackup(type) {
  try {
    const res = await fetch(`${API_BASE}/backup/${type}`, {
      headers: headers()
    });

    if (res.status === 401 || res.status === 403) {
      alert("Admin access only.");
      return;
    }

    if (!res.ok) {
      alert("Backup failed.");
      return;
    }

    const data = await res.json();

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();

    URL.revokeObjectURL(url);

    alert(`${type.toUpperCase()} backup downloaded successfully.`);
  } catch (err) {
    console.error(err);
    alert("Network error.");
  }
}

document.addEventListener("DOMContentLoaded", () => {

  document
    .getElementById("logoutBtn")
    .addEventListener("click", logout);

  document
    .getElementById("usersBtn")
    .addEventListener("click", () => downloadBackup("users"));

  document
    .getElementById("questionsBtn")
    .addEventListener("click", () => downloadBackup("questions"));

  document
    .getElementById("resultsBtn")
    .addEventListener("click", () => downloadBackup("results"));

  document
    .getElementById("paymentsBtn")
    .addEventListener("click", () => downloadBackup("payments"));

});