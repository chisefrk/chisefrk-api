const API_BASE = "https://chisefrk-apii.chisefrk.workers.dev";

const pages = document.querySelectorAll(".page");

function normalizeRoute() {
  const hash = window.location.hash || "#/";
  return hash.replace(/^#/, "") || "/";
}

function isLoggedIn() {
  return Boolean(sessionStorage.getItem("chisefrk_token"));
}

function renderRoute() {
  let route = normalizeRoute();

  if (route === "/dashboard" && !isLoggedIn()) {
    window.location.hash = "#/login";
    return;
  }

  if (route === "/login" && isLoggedIn()) {
    window.location.hash = "#/dashboard";
    return;
  }

  pages.forEach(page => {
    page.classList.toggle(
      "active",
      page.dataset.route === route
    );
  });

  document.querySelectorAll(".navbar nav a").forEach(link => {
    const linkRoute =
      link.getAttribute("href").replace(/^#/, "");

    link.classList.toggle(
      "active",
      linkRoute === route
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "instant"
  });

  updateAuthUI();
}

function updateAuthUI() {
  const loggedIn = isLoggedIn();

  const dashboardEmail =
    document.querySelector("#dashboard-email");

  if (dashboardEmail) {
    dashboardEmail.textContent =
      sessionStorage.getItem("chisefrk_email") || "";
  }

  const loginLinks =
    document.querySelectorAll("[data-login-link]");

  loginLinks.forEach(link => {
    link.textContent = loggedIn ? "DASHBOARD" : "LOGIN";
    link.href = loggedIn ? "#/dashboard" : "#/login";
  });

  const logoutButtons =
    document.querySelectorAll("[data-logout]");

  logoutButtons.forEach(button => {
    button.style.display = loggedIn ? "" : "none";
  });
}

async function getEndpoints() {
  const response = await fetch(`${API_BASE}/api/endpoints`);

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  const result = await response.json();

  if (!result.success || !Array.isArray(result.data)) {
    throw new Error("Invalid API registry");
  }

  return result;
}

function createServiceCard(api) {
  const card = document.createElement("a");

  card.href = "#/docs";
  card.className = "service-card";

  card.innerHTML = `
    <span class="method">${api.method}</span>
    <span class="category">${api.category || "API"}</span>
    <h3>${api.endpoint}</h3>
    <code>${api.description}</code>
  `;

  return card;
}

async function loadHome() {
  const container =
    document.querySelector("#home-api-list");

  const count =
    document.querySelector("#home-api-count");

  if (!container) return;

  try {
    const result = await getEndpoints();

    if (count) {
      count.textContent = result.count;
    }

    container.innerHTML = "";

    result.data.forEach(api => {
      container.appendChild(createServiceCard(api));
    });

  } catch (error) {
    container.innerHTML = `
      <div class="error">
        Failed to load API services.
      </div>
    `;

    console.error(error);
  }
}

function createDocCard(api) {
  const article = document.createElement("article");

  article.className = "doc-api";

  article.id = `api-${api.endpoint.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  )}`;

  article.innerHTML = `
    <div class="doc-api-top">
      <span class="doc-api-method">
        ${api.method}
      </span>

      <span class="doc-api-status">
        ${api.category || "API"}
      </span>

      <span class="doc-api-status">
        ${api.status || "unknown"}
      </span>
    </div>

    <h3>${api.endpoint}</h3>

    <p>${api.description}</p>

    <pre class="doc-example">${JSON.stringify(
      api.example || {},
      null,
      2
    )}</pre>
  `;

  return article;
}

async function loadDocs() {
  const docs =
    document.querySelector("#docs-api-list");

  const nav =
    document.querySelector("#docs-nav");

  if (!docs) return;

  try {
    const result = await getEndpoints();

    docs.innerHTML = "";

    if (nav) {
      nav.innerHTML = "";
    }

    result.data.forEach(api => {
      docs.appendChild(createDocCard(api));

      if (nav) {
        const link = document.createElement("a");

        link.href =
          `#api-${api.endpoint.replace(
            /[^a-zA-Z0-9]/g,
            "-"
          )}`;

        link.textContent = api.endpoint;

        nav.appendChild(link);
      }
    });

  } catch (error) {
    docs.innerHTML = `
      <div class="error">
        Failed to load documentation.
      </div>
    `;

    console.error(error);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value;

  const button =
    form.querySelector("button[type='submit']");

  const message =
    document.querySelector("#login-message");

  button.disabled = true;
  button.textContent = "AUTHENTICATING...";

  if (message) {
    message.textContent = "";
    message.className = "auth-message";
  }

  try {
    const response = await fetch(
      `${API_BASE}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
        result.message ||
        "Login failed"
      );
    }

    sessionStorage.setItem(
      "chisefrk_token",
      result.data.token
    );

    sessionStorage.setItem(
      "chisefrk_email",
      email
    );

    window.location.hash = "#/dashboard";

  } catch (error) {
    if (message) {
      message.textContent = error.message;
      message.className = "auth-message error";
    }

    console.error(error);

  } finally {
    button.disabled = false;
    button.textContent = "LOGIN";
  }
}

function handleLogout() {
  sessionStorage.removeItem("chisefrk_token");
  sessionStorage.removeItem("chisefrk_email");

  window.location.hash = "#/login";
}


async function apiRequest(path, options = {}) {
  const token =
    sessionStorage.getItem("chisefrk_token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const headers = {
    ...(options.headers || {}),
    "Authorization": `Bearer ${token}`
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      ...options,
      headers
    }
  );

  let result = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    sessionStorage.removeItem("chisefrk_token");
    sessionStorage.removeItem("chisefrk_email");
    window.location.hash = "#/login";

    throw new Error(
      "Your session has expired. Please log in again."
    );
  }

  if (
    !response.ok ||
    !result ||
    !result.success
  ) {
    throw new Error(
      result?.error ||
      result?.message ||
      "Request failed"
    );
  }

  return result;
}

function getDashboardElements() {
  const page =
    document.querySelector(
      '[data-route="/dashboard"]'
    );

  if (!page) {
    return null;
  }

  return {
    page,
    createButton:
      page.querySelector(
        ".dashboard-section .section-heading button"
      ),
    emptyState:
      page.querySelector(".empty-state"),
    keyCount:
      page.querySelector(
        ".dashboard-grid .dashboard-card:first-child strong"
      ),
    keySection:
      page.querySelector(".dashboard-section")
  };
}

function renderApiKeys(keys) {
  const elements =
    getDashboardElements();

  if (!elements) {
    return;
  }

  const {
    emptyState,
    keySection,
    keyCount
  } = elements;

  if (keyCount) {
    keyCount.textContent = keys.length;
  }

  if (!keySection) {
    return;
  }

  const oldList =
    keySection.querySelector(
      ".api-key-list"
    );

  if (oldList) {
    oldList.remove();
  }

  if (!keys.length) {
    if (emptyState) {
      emptyState.style.display = "";
      emptyState.innerHTML = `
        <strong>
          No API keys yet.
        </strong>

        <p>
          Create your first API key to access CHISEFRK APIs.
        </p>
      `;
    }

    return;
  }

  if (emptyState) {
    emptyState.style.display = "none";
  }

  const list =
    document.createElement("div");

  list.className = "api-key-list";

  keys.forEach(key => {
    const item =
      document.createElement("article");

    item.className = "api-key-item";

    const created =
      key.created_at
        ? new Date(key.created_at).toLocaleString()
        : "Unknown";

    const lastUsed =
      key.last_used_at
        ? new Date(key.last_used_at).toLocaleString()
        : "Never";

    item.innerHTML = `
      <div class="api-key-info">
        <strong></strong>

        <span>
          Created:
          ${created}
        </span>

        <span>
          Last used:
          ${lastUsed}
        </span>
      </div>

      <button
        type="button"
        class="secondary-button api-key-revoke"
      >
        REVOKE
      </button>
    `;

    item.querySelector("strong")
      .textContent = key.name;

    item.querySelector(
      ".api-key-revoke"
    ).addEventListener(
      "click",
      () => revokeApiKey(
        key.id,
        key.name
      )
    );

    list.appendChild(item);
  });

  keySection.appendChild(list);
}

async function loadApiKeys() {
  const elements =
    getDashboardElements();

  if (!elements) {
    return;
  }

  const {
    createButton,
    emptyState
  } = elements;

  if (emptyState) {
    emptyState.innerHTML = `
      <strong>
        Loading API keys...
      </strong>

      <p>
        Fetching your API access keys.
      </p>
    `;
  }

  try {
    const result =
      await apiRequest("/api/keys");

    renderApiKeys(
      result.data?.keys || []
    );

  } catch (error) {
    if (emptyState) {
      emptyState.style.display = "";
      emptyState.innerHTML = `
        <strong>
          Failed to load API keys.
        </strong>

        <p></p>
      `;

      emptyState.querySelector("p")
        .textContent = error.message;
    }

    console.error(error);

  } finally {
    if (createButton) {
      createButton.disabled = false;
    }
  }
}

async function createApiKey() {
  const elements =
    getDashboardElements();

  if (!elements?.createButton) {
    return;
  }

  const name =
    window.prompt(
      "Enter a name for this API key:",
      "My API Key"
    );

  if (name === null) {
    return;
  }

  const trimmedName =
    name.trim();

  if (!trimmedName) {
    window.alert(
      "API key name cannot be empty."
    );
    return;
  }

  if (trimmedName.length > 50) {
    window.alert(
      "API key name must be 50 characters or less."
    );
    return;
  }

  const button =
    elements.createButton;

  button.disabled = true;
  button.textContent = "CREATING...";

  try {
    const result =
      await apiRequest(
        "/api/keys",
        {
          method: "POST",
          body: JSON.stringify({
            name: trimmedName
          })
        }
      );

    const apiKey =
      result.data?.key;

    if (!apiKey) {
      throw new Error(
        "API key was created but no key was returned."
      );
    }

    await showNewApiKey(
      trimmedName,
      apiKey
    );

    await loadApiKeys();

  } catch (error) {
    window.alert(error.message);
    console.error(error);

  } finally {
    button.disabled = false;
    button.textContent = "+ CREATE KEY";
  }
}

async function showNewApiKey(
  name,
  apiKey
) {
  const elements =
    getDashboardElements();

  if (!elements?.keySection) {
    return;
  }

  const oldNotice =
    elements.keySection.querySelector(
      ".new-api-key"
    );

  if (oldNotice) {
    oldNotice.remove();
  }

  const notice =
    document.createElement("div");

  notice.className = "new-api-key";

  notice.innerHTML = `
    <div>
      <span class="eyebrow">
        NEW API KEY
      </span>

      <strong></strong>

      <p>
        Copy this key now. It will not be shown again.
      </p>
    </div>

    <div class="new-api-key-value">
      <code></code>

      <button
        type="button"
        class="secondary-button"
      >
        COPY
      </button>
    </div>
  `;

  notice.querySelector("strong")
    .textContent = name;

  notice.querySelector("code")
    .textContent = apiKey;

  notice.querySelector("button")
    .addEventListener(
      "click",
      async event => {
        try {
          await navigator.clipboard.writeText(
            apiKey
          );

          event.currentTarget.textContent =
            "COPIED";

          setTimeout(() => {
            event.currentTarget.textContent =
              "COPY";
          }, 1500);

        } catch (error) {
          console.error(error);

          window.prompt(
            "Copy your API key:",
            apiKey
          );
        }
      }
    );

  elements.keySection.prepend(notice);
}

async function revokeApiKey(
  keyId,
  keyName
) {
  const confirmed =
    window.confirm(
      `Revoke API key "${keyName}"?\n\nThis cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  try {
    await apiRequest(
      `/api/keys/${keyId}`,
      {
        method: "DELETE"
      }
    );

    await loadApiKeys();

  } catch (error) {
    window.alert(error.message);
    console.error(error);
  }
}

function setupDashboard() {
  const elements =
    getDashboardElements();

  if (!elements) {
    return;
  }

  if (elements.createButton) {
    elements.createButton.disabled = false;

    elements.createButton.addEventListener(
      "click",
      createApiKey
    );
  }

  loadApiKeys();
}

function setupAuth() {
  const form =
    document.querySelector("#login-form");

  if (form) {
    form.addEventListener(
      "submit",
      handleLogin
    );
  }

  document
    .querySelectorAll("[data-logout]")
    .forEach(button => {
      button.addEventListener(
        "click",
        handleLogout
      );
    });
}

window.addEventListener(
  "hashchange",
  renderRoute
);

setupAuth();
setupDashboard();
renderRoute();
loadHome();
loadDocs();
