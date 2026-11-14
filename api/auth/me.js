const { COOKIE_NAME, readCookie, verifySession } = require("../../lib/session");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const token = readCookie(req, COOKIE_NAME);
    const session = verifySession(token);
    if (!session) return res.status(401).json({ authenticated: false });

    return res.status(200).json({
      authenticated: true,
      user: {
        id: session.sub,
        name: session.name,
        email: session.email,
        picture: session.picture,
        emailVerified: session.emailVerified
      }
    });
  } catch (error) {
    console.error("Falha ao consultar sessão:", error.message);
    return res.status(500).json({ error: "Não foi possível consultar a sessão." });
  }
};
