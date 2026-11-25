const SUPABASE_URL = "https://wusekilmebfbikwspiic.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1c2VraWxtZWJmYmlrd3NwaWljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5NzA2MDIsImV4cCI6MjA2NTU0NjYwMn0.o12XMiCC7hASm5NiZ6jiqNAyfPa7YGcQvcGeN5aBBi4";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const result = await dashcamPlayerPayload({
    authorization: req.headers.authorization || "",
    token: process.env.TRAQCARE_ACCESS_TOKEN,
    imei: process.env.TRAQCARE_IMEI || "124082278812",
    base: process.env.TRAQCARE_BASE_URL || "https://a1.traqcare.com/v2.12",
  });
  res.status(result.status).json(result.body);
}

export async function dashcamPlayerPayload({ authorization, token, imei, base }) {
  const jwt = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!jwt) {
    return { status: 401, body: { error: "Sign in required" } };
  }

  try {
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!userResponse.ok) {
      return { status: 401, body: { error: "Sign in required" } };
    }
    const user = await userResponse.json();
    if (!/^[0-9a-f-]{36}$/i.test(user.id || "")) {
      return { status: 401, body: { error: "Sign in required" } };
    }

    const roleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${user.id}`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          apikey: SUPABASE_ANON_KEY,
        },
      }
    );
    if (!roleResponse.ok) {
      return { status: 403, body: { error: "Dashcam access denied" } };
    }
    const roles = await roleResponse.json();
    const role = roles?.[0]?.role;
    if (role !== "master_admin" && role !== "admin") {
      return { status: 403, body: { error: "Dashcam access denied" } };
    }

    if (!token) {
      return { status: 503, body: { error: "TRAQCARE_ACCESS_TOKEN is not set" } };
    }

    const apiUrl = base.replace(/\/$/, "");
    const url = `https://video.traqcare.com/?${new URLSearchParams({
      token,
      deviceId: imei,
      layout: "2",
      autoPlay: "true",
      wsUrl: "wss://ws.traqcare.com",
      apiUrl,
    }).toString()}`;
    return { status: 200, body: { url } };
  } catch {
    return { status: 502, body: { error: "Could not open the dashcam player" } };
  }
}
