const notice = document.getElementById("notice");
const googleArea = document.getElementById("google-area");
const userArea = document.getElementById("user-area");
const cardTitle = document.getElementById("card-title");
const cardDescription = document.getElementById("card-description");

function showNotice(message, type = "") {
  notice.textContent = message;
  notice.className = "notice " + type;
  notice.hidden = false;
}
function hideNotice() { notice.hidden = true; }

function showUser(user) {
  googleArea.hidden = true;
  userArea.hidden = false;
  cardTitle.textContent = "Acesso confirmado";
  cardDescription.textContent = "Sua identidade foi validada pelo servidor e uma sessão segura foi criada.";
  document.getElementById("user-name").textContent = user.name || "Usuário Google";
  document.getElementById("user-email").textContent = user.email;
  const picture = document.getElementById("user-picture");
  picture.src = user.picture || "https://www.gravatar.com/avatar/?d=mp";
  picture.alt = "Foto de " + (user.name || "usuário");
  hideNotice();
}

async function requestSession(credential) {
  hideNotice();
  showNotice("Validando sua identidade no servidor…");
  try {
    const response = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ credential })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Falha ao autenticar.");
    showUser(data.user);
    showNotice("Login realizado. A sessão segura está ativa neste navegador.", "success");
  } catch (error) {
    showNotice(error.message || "Não foi possível concluir o login.", "error");
  }
}

async function loadSession() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!response.ok) return;
    const data = await response.json();
    if (data.authenticated && data.user) showUser(data.user);
  } catch {
    // A tela de login continua disponível se a API estiver temporariamente indisponível.
  }
}

async function initializeGoogle() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = await response.json();
    if (!config.configured || !config.clientId) {
      showNotice("Configuração pendente: adicione GOOGLE_CLIENT_ID e SESSION_SECRET nas variáveis de ambiente da Vercel. Consulte o README.", "error");
      return;
    }

    const waitForGoogle = () => new Promise((resolve, reject) => {
      let attempts = 0;
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          resolve();
        } else if (++attempts > 60) {
          clearInterval(timer);
          reject(new Error("A biblioteca do Google não carregou. Verifique sua conexão e tente atualizar a página."));
        }
      }, 100);
    });

    await waitForGoogle();
    google.accounts.id.initialize({
      client_id: config.clientId,
      callback: ({ credential }) => requestSession(credential),
      auto_select: false,
      cancel_on_tap_outside: true
    });
    google.accounts.id.renderButton(document.getElementById("google-button"), {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill",
      logo_alignment: "left",
      width: 290
    });
  } catch (error) {
    showNotice(error.message || "Não foi possível iniciar o Login Google.", "error");
  }
}

document.getElementById("logout-button").addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    userArea.hidden = true;
    googleArea.hidden = false;
    cardTitle.textContent = "Boas-vindas";
    cardDescription.textContent = "Entre com sua conta Google para continuar com segurança.";
    hideNotice();
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  } catch {
    showNotice("Não foi possível encerrar a sessão. Tente novamente.", "error");
  }
});

loadSession();
initializeGoogle();
