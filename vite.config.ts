import { defineConfig, loadEnv, type Connect, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { dashcamPlayerPayload } from "./api/traqcare/player.js";

function traqcareLivePlugin(env: Record<string, string>): Plugin {
  const handler: Connect.NextHandleFunction = async (req, res, next) => {
    const requestUrl = req.url ?? "";
    if (requestUrl.startsWith("/api/traqcare/player")) {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }
      const result = await dashcamPlayerPayload({
        authorization: req.headers.authorization || "",
        token: env.TRAQCARE_ACCESS_TOKEN,
        imei: env.TRAQCARE_IMEI || "124082278812",
        base: env.TRAQCARE_BASE_URL || "https://a1.traqcare.com/v2.12",
      });
      res.statusCode = result.status;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(result.body));
      return;
    }

    if (!requestUrl.startsWith("/api/traqcare/live")) {
      next();
      return;
    }
    if (req.method !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const token = env.TRAQCARE_ACCESS_TOKEN;
    const imei = env.TRAQCARE_IMEI || "124082278812";
    const base = (env.TRAQCARE_BASE_URL || "https://a1.traqcare.com/v2.12").replace(/\/$/, "");
    if (!token) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "TRAQCARE_ACCESS_TOKEN is not set" }));
      return;
    }

    try {
      const upstream = await fetch(
        `${base}/tracking/live-data?imeis=${encodeURIComponent(imei)}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const body = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json");
      res.end(body);
    } catch {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Traqcare request failed" }));
    }
  };

  return {
    name: "traqcare-live-proxy",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    traqcareLivePlugin(env),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
