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

function getSettingsFromForm() {
  return {
    siteTitle: document.getElementById("siteTitle").value.trim(),
    premiumPrice: Number(document.getElementById("premiumPrice").value),
    examTime: Number(document.getElementById("examTime").value),
    negativeMarking: Number(document.getElementById("negativeMarking").value),
    contactEmail: document.getElementById("contactEmail").value.trim(),
    maintenance: document.getElementById("maintenance").value === "true"
  };
}

function fillForm(settings) {
  document.getElementById("siteTitle").value = settings.siteTitle || "RRB EDU";
  document.getElementById("premiumPrice").value = settings.premiumPrice ?? 79;
  document.getElementById("examTime").value = settings.examTime ?? 90;
  document.getElementById("negativeMarking").value = settings.negativeMarking ?? 0.33;
  document.getElementById("contactEmail").value = settings.contactEmail || "support@rrbedu.online";
  document.getElementById("maintenance").value = String(settings.maintenance || false);
}

function renderPreview(settings) {
  document.getElementById("preview").innerHTML = `
    <div class="setting-item">
      <span class="setting-name">Website Title</span>
      <span class="setting-value">${settings.siteTitle}</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Premium Price</span>
      <span class="setting-value">₹${settings.premiumPrice}</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Exam Duration</span>
      <span class="setting-value">${settings.examTime} minutes</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Negative Marking</span>
      <span class="setting-value">${settings.negativeMarking}</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Contact Email</span>
      <span class="setting-value">${settings.contactEmail}</span>
    </div>

    <div class="setting-item">
      <span class="setting-name">Maintenance Mode</span>
      <span class="setting-value">${settings.maintenance ? "ON" : "OFF"}</span>
    </div>
  `;
}

async function loadSettings() {
  const saved = localStorage.getItem("rrb_edu_settings");

  const defaultSettings = {
    siteTitle: "RRB EDU",
    premiumPrice: 79,
    examTime: 90,
    negativeMarking: 0.33,
    contactEmail: "support@rrbedu.online",
    maintenance: false
  };

  const settings = saved ? JSON.parse(saved) : defaultSettings;

  fillForm(settings);
  renderPreview(settings);
}

async function saveSettings() {
  const settings = getSettingsFromForm();

  if (!settings.siteTitle) {
    alert("Website title is required.");
    return;
  }

  if (!settings.premiumPrice || settings.premiumPrice <= 0) {
    alert("Premium price must be greater than 0.");
    return;
  }

  if (!settings.examTime || settings.examTime <= 0) {
    alert("Exam duration must be greater than 0.");
    return;
  }

  localStorage.setItem("rrb_edu_settings", JSON.stringify(settings));

  renderPreview(settings);

  alert("Settings saved locally.");
}

document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("saveBtn").addEventListener("click", saveSettings);

  const ok = await verifyAdmin();

  if (ok) {
    await loadSettings();
  }
});