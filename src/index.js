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
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    if (request.method !== "GET") {
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

    if (url.pathname === "/api/endpoints") {
      return json({
        status: 200,
        success: true,
        count: endpoints.length,
        data: endpoints
      });
    }

    if (url.pathname === "/api/random/username") {
      const username =
        usernames[Math.floor(Math.random() * usernames.length)];

      return json({
        status: 200,
        success: true,
        data: {
          username
        }
      });
    }

    if (url.pathname === "/api/random/quote") {
      const quote =
        quotes[Math.floor(Math.random() * quotes.length)];

      return json({
        status: 200,
        success: true,
        data: {
          quote
        }
      });
    }

    if (url.pathname === "/api/random/color") {
      const color =
        colors[Math.floor(Math.random() * colors.length)];

      return json({
        status: 200,
        success: true,
        data: color
      });
    }

    return json({
      status: 404,
      success: false,
      error: "Endpoint not found"
    }, 404);
  }
};
