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

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({ error: "O Client ID do Google não está configurado na Vercel." });
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error("SESSION_SECRET ausente ou com menos de 32 caracteres.");
    return res.status(503).json({ error: "A configuração da sessão está incompleta no servidor. Verifique SESSION_SECRET na Vercel." });
  }

  const idToken = req.body && req.body.credential;
  if (!idToken || typeof idToken !== "string") {
    return res.status(400).json({ error: "A credencial do Google não chegou ao servidor. Tente novamente." });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("Falha ao validar token Google:", error.name, error.message);
    return res.status(401).json({ error: "O Google não aceitou a credencial. Confira se o Client ID e o domínio autorizado correspondem a este site." });
  }

  if (!payload || !payload.sub || !payload.email) {
    return res.status(401).json({ error: "O Google retornou uma credencial incompleta. Tente entrar novamente." });
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

  try {
    const session = createSession(user);
    setSessionCookie(res, session);
  } catch (error) {
    console.error("Falha ao criar sessão:", error.name, error.message);
    return res.status(500).json({ error: "O Google confirmou sua identidade, mas o servidor não conseguiu criar a sessão. Verifique SESSION_SECRET na Vercel." });
  }

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
};
