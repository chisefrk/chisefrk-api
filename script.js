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
renderRoute();
loadHome();
loadDocs();
