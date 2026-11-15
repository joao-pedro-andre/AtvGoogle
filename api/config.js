module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido." });
  }

  const clientConfigured = Boolean(process.env.GOOGLE_CLIENT_ID);
  const sessionConfigured = Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);

  return res.status(200).json({
    clientId: process.env.GOOGLE_CLIENT_ID || null,
    configured: clientConfigured && sessionConfigured,
    clientConfigured,
    sessionConfigured
  });
};
