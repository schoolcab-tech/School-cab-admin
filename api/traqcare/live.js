export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = process.env.TRAQCARE_ACCESS_TOKEN;
  const imei = process.env.TRAQCARE_IMEI || "124082278812";
  const base = (process.env.TRAQCARE_BASE_URL || "https://a1.traqcare.com/v2.12").replace(/\/$/, "");

  if (!token) {
    res.status(503).json({ error: "TRAQCARE_ACCESS_TOKEN is not set" });
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
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(body);
  } catch {
    res.status(502).json({ error: "Traqcare request failed" });
  }
}
