import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import {
  proxyTraqcare,
  TraqcareProxyError,
  type TraqcareRequest,
} from "./supabase/functions/traqcare/proxy";

function readBody(req: NodeJS.ReadableStream) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Dev-only proxy so the Traqcare key stays out of the browser bundle. */
function traqcareDevApi(apiKey: string): Plugin {
  return {
    name: "traqcare-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/traqcare", async (req, res) => {
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "POST required" }));
          return;
        }
        try {
          const raw = await readBody(req);
          const body = (raw ? JSON.parse(raw) : {}) as TraqcareRequest;
          const result = await proxyTraqcare(apiKey, body);
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result.body));
        } catch (err) {
          const status = err instanceof TraqcareProxyError ? err.status : 500;
          const message = err instanceof Error ? err.message : "Traqcare proxy failed";
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" &&
      traqcareDevApi(loadEnv(mode, process.cwd(), "").TRAQCARE_API_KEY ?? ""),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
