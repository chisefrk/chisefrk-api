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
    status: "stable",
    example: {
      email: "user@example.com",
      password: "your-password"
    }
  },
  {
    method: "POST",
    endpoint: "/api/auth/login",
    description: "Login to a CHISEFRK account",
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
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

async function hashPassword(password, salt = null) {
  const encoder = new TextEncoder();

  const passwordSalt =
    salt ||
    crypto.getRandomValues(
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
        salt: passwordSalt,
        iterations,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );

  return {
    iterations,
    salt: bytesToHex(passwordSalt),
    hash: bytesToHex(derivedBits)
  };
}

async function verifyPassword(password, storedHash) {
  const parts = storedHash.split("$");

  if (
    parts.length !== 4 ||
    parts[0] !== "pbkdf2"
  ) {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = hexToBytes(parts[2]);
  const expectedHash = parts[3];

  if (
    !Number.isInteger(iterations) ||
    !expectedHash
  ) {
    return false;
  }

  const encoder = new TextEncoder();

  const keyMaterial =
    await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

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

  const actualHash =
    bytesToHex(derivedBits);

  return actualHash === expectedHash;
}

function base64urlEncode(value) {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : new Uint8Array(value);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signToken(payload, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };

  const encodedHeader =
    base64urlEncode(
      JSON.stringify(header)
    );

  const encodedPayload =
    base64urlEncode(
      JSON.stringify(payload)
    );

  const data =
    `${encodedHeader}.${encodedPayload}`;

  const key =
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      {
        name: "HMAC",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(data)
    );

  return `${data}.${base64urlEncode(signature)}`;
}

function base64urlDecode(value) {
  const base64 =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const padded =
    base64 + "=".repeat(
      (4 - (base64.length % 4)) % 4
    );

  const binary = atob(padded);

  const bytes =
    new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

async function verifyToken(token, secret) {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const [
      encodedHeader,
      encodedPayload,
      encodedSignature
    ] = parts;

    const data =
      `${encodedHeader}.${encodedPayload}`;

    const key =
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        {
          name: "HMAC",
          hash: "SHA-256"
        },
        false,
        ["verify"]
      );

    const signature =
      base64urlDecode(encodedSignature);

    const valid =
      await crypto.subtle.verify(
        "HMAC",
        key,
        signature,
        new TextEncoder().encode(data)
      );

    if (!valid) {
      return null;
    }

    const payload =
      JSON.parse(
        new TextDecoder().decode(
          base64urlDecode(encodedPayload)
        )
      );

    if (
      !payload.sub ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;

  } catch {
    return null;
  }
}

async function requireAuth(request, env) {
  if (!env.AUTH_SECRET) {
    return {
      error: json({
        status: 500,
        success: false,
        error: "Authentication secret is not configured"
      }, 500)
    };
  }

  const header =
    request.headers.get("Authorization") || "";

  if (!header.startsWith("Bearer ")) {
    return {
      error: json({
        status: 401,
        success: false,
        error: "Authorization token is required"
      }, 401)
    };
  }

  const token =
    header.slice(7).trim();

  if (!token) {
    return {
      error: json({
        status: 401,
        success: false,
        error: "Authorization token is required"
      }, 401)
    };
  }

  const payload =
    await verifyToken(
      token,
      env.AUTH_SECRET
    );

  if (!payload) {
    return {
      error: json({
        status: 401,
        success: false,
        error: "Invalid or expired token"
      }, 401)
    };
  }

  return {
    user: {
      id: Number(payload.sub),
      email: payload.email
    }
  };
}

async function hashApiKey(value) {
  const data =
    new TextEncoder().encode(value);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return base64urlEncode(digest);
}

function generateApiKey() {
  const bytes =
    crypto.getRandomValues(
      new Uint8Array(32)
    );

  return `sk-chisefrk-${base64urlEncode(bytes)}`;
}

async function createApiKey(request, env) {
  const auth =
    await requireAuth(request, env);

  if (auth.error) {
    return auth.error;
  }

  let body = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : "";

  if (!name) {
    return json({
      status: 400,
      success: false,
      error: "API key name is required"
    }, 400);
  }

  if (name.length > 50) {
    return json({
      status: 400,
      success: false,
      error: "API key name must be 50 characters or less"
    }, 400);
  }

  const apiKey =
    generateApiKey();

  const keyHash =
    await hashApiKey(apiKey);

  const result =
    await env.chisefrk_db
      .prepare(
        `INSERT INTO api_keys
          (user_id, name, key_hash)
         VALUES (?, ?, ?)`
      )
      .bind(
        auth.user.id,
        name,
        keyHash
      )
      .run();

  return json({
    status: 201,
    success: true,
    message: "API key created successfully",
    data: {
      id: result.meta.last_row_id,
      name,
      key: apiKey,
      warning: "Store this API key securely. It will not be shown again."
    }
  }, 201);
}

async function listApiKeys(request, env) {
  const auth =
    await requireAuth(request, env);

  if (auth.error) {
    return auth.error;
  }

  const result =
    await env.chisefrk_db
      .prepare(
        `SELECT
          id,
          name,
          created_at,
          last_used_at
         FROM api_keys
         WHERE user_id = ?
         ORDER BY id DESC`
      )
      .bind(auth.user.id)
      .all();

  return json({
    status: 200,
    success: true,
    count: result.results.length,
    data: result.results
  });
}

async function deleteApiKey(request, env, keyId) {
  const auth =
    await requireAuth(request, env);

  if (auth.error) {
    return auth.error;
  }

  const id =
    Number(keyId);

  if (!Number.isInteger(id) || id <= 0) {
    return json({
      status: 400,
      success: false,
      error: "Invalid API key ID"
    }, 400);
  }

  const result =
    await env.chisefrk_db
      .prepare(
        `DELETE FROM api_keys
         WHERE id = ? AND user_id = ?`
      )
      .bind(
        id,
        auth.user.id
      )
      .run();

  if (!result.meta.changes) {
    return json({
      status: 404,
      success: false,
      error: "API key not found"
    }, 404);
  }

  return json({
    status: 200,
    success: true,
    message: "API key revoked successfully"
  });
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

  const storedHash = [
    "pbkdf2",
    passwordHash.iterations,
    passwordHash.salt,
    passwordHash.hash
  ].join("$");

  const result =
    await env.chisefrk_db
      .prepare(
        `INSERT INTO users
          (email, password_hash)
         VALUES (?, ?)`
      )
      .bind(email, storedHash)
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

async function login(request, env) {
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

  if (!email || !password) {
    return json({
      status: 400,
      success: false,
      error: "Email and password are required"
    }, 400);
  }

  const user =
    await env.chisefrk_db
      .prepare(
        `SELECT id, email, password_hash
         FROM users
         WHERE email = ?
         LIMIT 1`
      )
      .bind(email)
      .first();

  if (!user) {
    return json({
      status: 401,
      success: false,
      error: "Invalid email or password"
    }, 401);
  }

  const valid =
    await verifyPassword(
      password,
      user.password_hash
    );

  if (!valid) {
    return json({
      status: 401,
      success: false,
      error: "Invalid email or password"
    }, 401);
  }

  if (!env.AUTH_SECRET) {
    return json({
      status: 500,
      success: false,
      error: "Authentication secret is not configured"
    }, 500);
  }

  const now =
    Math.floor(Date.now() / 1000);

  const expiresIn =
    60 * 60 * 24 * 7;

  const token =
    await signToken(
      {
        sub: String(user.id),
        email: user.email,
        iat: now,
        exp: now + expiresIn
      },
      env.AUTH_SECRET
    );

  return json({
    status: 200,
    success: true,
    message: "Login successful",
    data: {
      token,
      token_type: "Bearer",
      expires_in: expiresIn,
      user: {
        id: user.id,
        email: user.email
      }
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    if (
      request.method !== "GET" &&
      request.method !== "POST" &&
      request.method !== "DELETE"
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

    if (
      url.pathname === "/api/auth/login" &&
      request.method === "POST"
    ) {
      return login(request, env);
    }

    if (
      url.pathname === "/api/keys" &&
      request.method === "POST"
    ) {
      return createApiKey(request, env);
    }

    if (
      url.pathname === "/api/keys" &&
      request.method === "GET"
    ) {
      return listApiKeys(request, env);
    }

    const apiKeyMatch =
      url.pathname.match(
        /^\/api\/keys\/(\d+)$/
      );

    if (
      apiKeyMatch &&
      request.method === "DELETE"
    ) {
      return deleteApiKey(
        request,
        env,
        apiKeyMatch[1]
      );
    }

    return json({
      status: 404,
      success: false,
      error: "Endpoint not found"
    }, 404);
  }
};
