const { clearSessionCookie } = require("../_lib/session");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  clearSessionCookie(res);
  return res.status(200).json({ message: "Sessão encerrada com sucesso." });
};
