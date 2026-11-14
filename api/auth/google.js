const { OAuth2Client } = require("google-auth-library");
const { createSession, setSessionCookie } = require("../../lib/session");

const client = new OAuth2Client();

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: "Login ainda não configurado. Adicione GOOGLE_CLIENT_ID nas variáveis de ambiente da Vercel." });
    }

    const idToken = req.body && req.body.credential;
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "ID token não informado." });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.status(401).json({ error: "Token do Google inválido ou incompleto." });
    }

    if (payload.email_verified !== true) {
      return res.status(403).json({ error: "O Google não confirmou este endereço de e-mail." });
    }

    const user = {
      sub: payload.sub,
      name: payload.name || "",
      email: payload.email,
      picture: payload.picture || "",
      emailVerified: payload.email_verified
    };

    const session = createSession(user);
    setSessionCookie(res, session);

    return res.status(200).json({
      message: "Autenticação realizada com sucesso.",
      user: {
        id: user.sub,
        name: user.name,
        email: user.email,
        picture: user.picture,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error("Falha na autenticação Google:", error.message);
    return res.status(401).json({ error: "Não foi possível validar sua credencial Google." });
  }
};
