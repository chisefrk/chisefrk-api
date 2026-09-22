const usernames = [
  "chisefrk",
  "voidwalker",
  "neonbyte",
  "ghostframe",
  "pixelvoid",
  "darksyntax",
  "nullcore",
  "nightshift",
  "zeroframe",
  "staticmind"
];

const quotes = [
  "Build something people can actually use.",
  "Simple systems are easier to keep alive.",
  "Good code solves problems. Great code also knows when to stop.",
  "Make it work, then make it interesting.",
  "Every project starts as a folder with questionable intentions.",
  "Automation exists because humans forget things.",
  "Small APIs can become surprisingly useful.",
  "Ship first. Polish before nobody cares."
];

const colors = [
  {
    name: "Acid Green",
    hex: "#B6FF00",
    rgb: "182, 255, 0"
  },
  {
    name: "Electric Blue",
    hex: "#00A8FF",
    rgb: "0, 168, 255"
  },
  {
    name: "Hot Pink",
    hex: "#FF1493",
    rgb: "255, 20, 147"
  },
  {
    name: "Cyber Purple",
    hex: "#8A2BE2",
    rgb: "138, 43, 226"
  },
  {
    name: "Terminal Green",
    hex: "#00FF41",
    rgb: "0, 255, 65"
  },
  {
    name: "Void Black",
    hex: "#080808",
    rgb: "8, 8, 8"
  }
];

const endpoints = [
  {
    method: "GET",
    endpoint: "/api/random/username",
    description: "Generate a random username",
    category: "Random",
    status: "stable",
    example: {
      username: "neonbyte"
    }
  },
  {
    method: "GET",
    endpoint: "/api/random/quote",
    description: "Generate a random quote",
    category: "Random",
    status: "stable",
    example: {
      quote: "Build something people can actually use."
    }
  },
  {
    method: "GET",
    endpoint: "/api/random/color",
    description: "Generate a random color",
    category: "Random",
    status: "stable",
    example: {
      name: "Acid Green",
      hex: "#B6FF00",
      rgb: "182, 255, 0"
    }
  },
  {
    method: "POST",
    endpoint: "/api/auth/register",
    description: "Create a CHISEFRK account",
    category: "Authentication",
    status: "beta",
    example: {
      email: "user@example.com",
      password: "your-password"
    }
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(
      hex.slice(i * 2, i * 2 + 2),
      16
    );
  }

  return bytes;
}

async function hashPassword(password) {
  const encoder = new TextEncoder();

  const salt = crypto.getRandomValues(
    new Uint8Array(16)
  );

  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

  const iterations = 100000;

  const derivedBits =
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );

  return [
    "pbkdf2",
    iterations,
    bytesToHex(salt),
    bytesToHex(derivedBits)
  ].join("$");
}

async function register(request, env) {
  let body;

  try {
    body = await request.json();
  } catch {
    return json({
      status: 400,
      success: false,
      error: "Invalid JSON body"
    }, 400);
  }

  const email =
    typeof body.email === "string"
      ? normalizeEmail(body.email)
      : "";

  const password =
    typeof body.password === "string"
      ? body.password
      : "";

  if (!email || !isValidEmail(email)) {
    return json({
      status: 400,
      success: false,
      error: "A valid email is required"
    }, 400);
  }

  if (password.length < 8) {
    return json({
      status: 400,
      success: false,
      error: "Password must be at least 8 characters"
    }, 400);
  }

  const existing =
    await env.chisefrk_db
      .prepare(
        "SELECT id FROM users WHERE email = ? LIMIT 1"
      )
      .bind(email)
      .first();

  if (existing) {
    return json({
      status: 409,
      success: false,
      error: "Email is already registered"
    }, 409);
  }

  const passwordHash =
    await hashPassword(password);

  const result =
    await env.chisefrk_db
      .prepare(
        `INSERT INTO users
          (email, password_hash)
         VALUES (?, ?)`
      )
      .bind(email, passwordHash)
      .run();

  return json({
    status: 201,
    success: true,
    message: "Account created successfully",
    data: {
      id: result.meta.last_row_id,
      email
    }
  }, 201);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (
      request.method !== "GET" &&
      request.method !== "POST"
    ) {
      return json({
        status: 405,
        success: false,
        error: "Method not allowed"
      }, 405);
    }

    if (url.pathname === "/") {
      return json({
        status: 200,
        success: true,
        name: "CHISEFRK API",
        version: "1.0.0",
        message: "API is running.",
        endpoints: endpoints.length
      });
    }

    if (
      url.pathname === "/api/endpoints" &&
      request.method === "GET"
    ) {
      return json({
        status: 200,
        success: true,
        count: endpoints.length,
        data: endpoints
      });
    }

    if (
      url.pathname === "/api/random/username" &&
      request.method === "GET"
    ) {
      const username =
        usernames[
          Math.floor(
            Math.random() * usernames.length
          )
        ];

      return json({
        status: 200,
        success: true,
        data: {
          username
        }
      });
    }

    if (
      url.pathname === "/api/random/quote" &&
      request.method === "GET"
    ) {
      const quote =
        quotes[
          Math.floor(
            Math.random() * quotes.length
          )
        ];

      return json({
        status: 200,
        success: true,
        data: {
          quote
        }
      });
    }

    if (
      url.pathname === "/api/random/color" &&
      request.method === "GET"
    ) {
      const color =
        colors[
          Math.floor(
            Math.random() * colors.length
          )
        ];

      return json({
        status: 200,
        success: true,
        data: color
      });
    }

    if (
      url.pathname === "/api/auth/register" &&
      request.method === "POST"
    ) {
      return register(request, env);
    }

    return json({
      status: 404,
      success: false,
      error: "Endpoint not found"
    }, 404);
  }
};
