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
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

function isApiKeyCredential(value) {
  return value.startsWith("sk-chisefrk-");
}

async function authenticateApiKey(request, env) {
  const header =
    request.headers.get("Authorization") || "";

  let credential = null;

  if (header.startsWith("Bearer ")) {
    credential = header.slice(7).trim();
  } else {
    credential = request.headers.get("X-API-Key") || "";
  }

  if (!credential) {
    return {
      error: json({
        status: 401,
        success: false,
        error: "API key is required"
      }, 401)
    };
  }

  const keyHash = await hashApiKey(credential);

  const result = await env.chisefrk_db
    .prepare(
      `SELECT id, user_id, name
       FROM api_keys
       WHERE key_hash = ?
       LIMIT 1`
    )
    .bind(keyHash)
    .first();

  if (!result) {
    return {
      error: json({
        status: 401,
        success: false,
        error: "Invalid credentials"
      }, 401)
    };
  }

  await env.chisefrk_db
    .prepare(
      `UPDATE api_keys
       SET last_used_at = datetime('now')
       WHERE id = ?`
    )
    .bind(result.id)
    .run();

  return {
    api_key: {
      api_key_id: result.id,
      user_id: result.user_id,
      key_name: result.name
    }
  };
}

async function requireAuthOrApiKey(request, env) {
  const header =
    request.headers.get("Authorization") || "";

  if (header.startsWith("Bearer ")) {
    const credential = header.slice(7).trim();

    if (credential && isApiKeyCredential(credential)) {
      const apiResult = await authenticateApiKey(request, env);
      if (apiResult.error) {
        return apiResult;
      }
      return {
        auth_type: "api_key",
        user_id: apiResult.api_key.user_id,
        api_key_id: apiResult.api_key.api_key_id,
        key_name: apiResult.api_key.key_name
      };
    }

    const jwtResult = await requireAuth(request, env);
    if (jwtResult.error) {
      return jwtResult;
    }
    return {
      auth_type: "jwt",
      user_id: jwtResult.user.id,
      email: jwtResult.user.email
    };
  }

  if (request.headers.has("X-API-Key")) {
    const apiResult = await authenticateApiKey(request, env);
    if (apiResult.error) {
      return apiResult;
    }
    return {
      auth_type: "api_key",
      user_id: apiResult.api_key.user_id,
      api_key_id: apiResult.api_key.api_key_id,
      key_name: apiResult.api_key.key_name
    };
  }

  return {
    error: json({
      status: 401,
      success: false,
      error: "Authentication required"
    }, 401)
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


async function getUserPlan(env, userId) {
  const plan = await env.chisefrk_db
    .prepare(
      `SELECT
         p.id,
         p.name,
         p.max_api_keys,
         p.requests_per_day,
         p.tokens_per_month,
         p.requests_per_minute,
         p.max_input_tokens,
         p.max_output_tokens
       FROM users u
       JOIN plans p ON p.id = u.plan_id
       WHERE u.id = ?
       LIMIT 1`
    )
    .bind(userId)
    .first();

  return plan || {
    id: 1,
    name: "free",
    max_api_keys: 3,
    requests_per_day: 1000,
    tokens_per_month: 100000,
    requests_per_minute: 10,
    max_input_tokens: 4000,
    max_output_tokens: 2000
  };
}

async function getApiKeyCount(env, userId) {
  const result = await env.chisefrk_db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM api_keys
       WHERE user_id = ?`
    )
    .bind(userId)
    .first();

  return Number(result?.count || 0);
}

async function checkApiKeyLimit(env, userId) {
  const plan = await getUserPlan(env, userId);
  const count = await getApiKeyCount(env, userId);

  if (count >= plan.max_api_keys) {
    return {
      allowed: false,
      plan,
      response: json({
        status: 429,
        success: false,
        error: "API key limit reached",
        limit: plan.max_api_keys,
        current: count,
        plan: plan.name
      }, 429)
    };
  }

  return {
    allowed: true,
    plan,
    current: count
  };
}

async function recordUsage(
  env,
  {
    userId,
    apiKeyId = null,
    endpoint,
    method = "GET",
    inputTokens = 0,
    outputTokens = 0
  }
) {
  const input =
    Math.max(0, Number(inputTokens) || 0);

  const output =
    Math.max(0, Number(outputTokens) || 0);

  const total =
    input + output;

  await env.chisefrk_db
    .prepare(
      `INSERT INTO api_usage (
         user_id,
         api_key_id,
         endpoint,
         method,
         request_count,
         input_tokens,
         output_tokens,
         total_tokens
       )
       VALUES (?, ?, ?, ?, 1, ?, ?, ?)`
    )
    .bind(
      userId,
      apiKeyId,
      endpoint,
      method,
      input,
      output,
      total
    )
    .run();
}

async function getUsageSummary(env, userId) {
  const plan = await getUserPlan(env, userId);

  const requestsToday = await env.chisefrk_db
    .prepare(
      `SELECT COALESCE(
         SUM(request_count),
         0
       ) AS requests
       FROM api_usage
       WHERE user_id = ?
       AND created_at >= date('now')`
    )
    .bind(userId)
    .first();

  const tokensThisMonth = await env.chisefrk_db
    .prepare(
      `SELECT COALESCE(
         SUM(total_tokens),
         0
       ) AS tokens
       FROM api_usage
       WHERE user_id = ?
       AND created_at >= date('now', 'start of month')`
    )
    .bind(userId)
    .first();

  const apiKeys = await getApiKeyCount(
    env,
    userId
  );

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      limits: {
        max_api_keys: plan.max_api_keys,
        requests_per_day: plan.requests_per_day,
        tokens_per_month: plan.tokens_per_month,
        requests_per_minute: plan.requests_per_minute,
        max_input_tokens: plan.max_input_tokens,
        max_output_tokens: plan.max_output_tokens
      }
    },
    usage: {
      api_keys: apiKeys,
      requests_today:
        Number(requestsToday?.requests || 0),
      tokens_this_month:
        Number(tokensThisMonth?.tokens || 0)
    }
  };
}

async function getUsage(request, env, auth) {
  const summary =
    await getUsageSummary(
      env,
      auth.user_id
    );

  return json({
    status: 200,
    success: true,
    data: summary
  });
}

async function getPlan(request, env, auth) {
  const plan =
    await getUserPlan(
      env,
      auth.user_id
    );

  return json({
    status: 200,
    success: true,
    data: {
      id: plan.id,
      name: plan.name,
      limits: {
        max_api_keys: plan.max_api_keys,
        requests_per_day:
          plan.requests_per_day,
        tokens_per_month:
          plan.tokens_per_month,
        requests_per_minute:
          plan.requests_per_minute,
        max_input_tokens:
          plan.max_input_tokens,
        max_output_tokens:
          plan.max_output_tokens
      }
    }
  });
}

async function createApiKey(request, env, auth) {
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

  const keyLimit =
    await checkApiKeyLimit(
      env,
      auth.user_id
    );

  if (!keyLimit.allowed) {
    return keyLimit.response;
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
        auth.user_id,
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

async function listApiKeys(request, env, auth) {
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
      .bind(auth.user_id)
      .all();

  return json({
    status: 200,
    success: true,
    count: result.results.length,
    data: result.results
  });
}

async function deleteApiKey(request, env, keyId, auth) {
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
        auth.user_id
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

async function recordUsageSafe(env, auth, endpoint, method) {
  try {
    await recordUsage(env, {
      userId: auth.user_id,
      apiKeyId: auth.api_key_id || null,
      endpoint,
      method,
      inputTokens: 0,
      outputTokens: 0
    });
  } catch (err) {
    // Usage recording must not fail the main response.
    // Log and swallow.
    console.error("Usage recording failed:", err);
  }
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
      const auth = await requireAuth(request, env);
      if (auth.error) return auth.error;
      return createApiKey(request, env, auth);
    }

    if (
      url.pathname === "/api/keys" &&
      request.method === "GET"
    ) {
      const auth = await requireAuthOrApiKey(request, env);
      if (auth.error) return auth.error;
      const result = await listApiKeys(request, env, auth);
      await recordUsageSafe(env, auth, url.pathname, request.method);
      return result;
    }

    if (
      url.pathname === "/api/usage" &&
      request.method === "GET"
    ) {
      const auth = await requireAuthOrApiKey(request, env);
      if (auth.error) return auth.error;
      return getUsage(request, env, auth);
    }

    if (
      url.pathname === "/api/plan" &&
      request.method === "GET"
    ) {
      const auth = await requireAuthOrApiKey(request, env);
      if (auth.error) return auth.error;
      const result = await getPlan(request, env, auth);
      await recordUsageSafe(env, auth, url.pathname, request.method);
      return result;
    }

    const apiKeyMatch =
      url.pathname.match(
        /^\/api\/keys\/(\d+)$/
      );

    if (
      apiKeyMatch &&
      request.method === "DELETE"
    ) {
      const auth = await requireAuthOrApiKey(request, env);
      if (auth.error) return auth.error;
      const result = await deleteApiKey(
        request,
        env,
        apiKeyMatch[1],
        auth
      );
      await recordUsageSafe(env, auth, url.pathname, request.method);
      return result;
    }

    return json({
      status: 404,
      success: false,
      error: "Endpoint not found"
    }, 404);
  }
};
