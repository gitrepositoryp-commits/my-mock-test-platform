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

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: "GET",
      headers: headers()
    });

    if (res.status === 401 || res.status === 403) {
      alert("Admin access only.");
      logout();
      return false;
    }

    return true;
  } catch (error) {
    alert("Server connection failed.");
    return false;
  }
}

function getSettingsFromForm() {
  return {
    siteName: document.getElementById("siteTitle").value.trim(),
    premiumPrice: Number(document.getElementById("premiumPrice").value),
    premiumDays: 30,
    freeMockLimit: 3,
    supportEmail: document.getElementById("contactEmail").value.trim(),
    siteStatus: document.getElementById("maintenance").value === "true" ? "maintenance" : "active",
    allowSignup: true,
    showLeaderboard: true
  };
}

function convertApiSettings(settings) {
  return {
    siteTitle: settings.siteName || "RRB EDU",
    premiumPrice: settings.premiumPrice ?? 79,
    examTime: 90,
    negativeMarking: 0.33,
    contactEmail: settings.supportEmail || "support@rrbedu.online",
    maintenance: settings.siteStatus === "maintenance"
  };
}

function fillForm(settings) {
  const s = convertApiSettings(settings);

  document.getElementById("siteTitle").value = s.siteTitle;
  document.getElementById("premiumPrice").value = s.premiumPrice;
  document.getElementById("examTime").value = s.examTime;
  document.getElementById("negativeMarking").value = s.negativeMarking;
  document.getElementById("contactEmail").value = s.contactEmail;
  document.getElementById("maintenance").value = String(s.maintenance);
}

function renderPreview(settings) {
  const s = settings.siteName ? convertApiSettings(settings) : settings;

  document.getElementById("preview").innerHTML = `
    <div class="setting-item">
      <span class="setting-name">Website Title</span>
      <span class="setting-value">${s.siteTitle}</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Premium Price</span>
      <span class="setting-value">₹${s.premiumPrice}</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Exam Duration</span>
      <span class="setting-value">${s.examTime} minutes</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Negative Marking</span>
      <span class="setting-value">${s.negativeMarking}</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Contact Email</span>
      <span class="setting-value">${s.contactEmail}</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Maintenance Mode</span>
      <span class="setting-value">${s.maintenance ? "ON" : "OFF"}</span>
    </div>
  `;
}

async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: "GET",
      headers: headers()
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "Failed to load settings.");
      return;
    }

    fillForm(data.settings);
    renderPreview(data.settings);
  } catch (error) {
    alert("Failed to load settings from server.");
  }
}

async function saveSettings() {
  const settings = getSettingsFromForm();

  if (!settings.siteName) {
    alert("Website title is required.");
    return;
  }

  if (!settings.premiumPrice || settings.premiumPrice <= 0) {
    alert("Premium price must be greater than 0.");
    return;
  }

  if (!settings.supportEmail) {
    alert("Support email is required.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(settings)
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.message || "Failed to save settings.");
      return;
    }

    fillForm(data.settings);
    renderPreview(data.settings);

    alert("Settings saved successfully in MongoDB.");
  } catch (error) {
    alert("Server error while saving settings.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("saveBtn").addEventListener("click", saveSettings);

  const ok = await verifyAdmin();

  if (ok) {
    await loadSettings();
  }
});