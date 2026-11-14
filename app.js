const notice = document.getElementById("notice");
const loginView = document.getElementById("login-view");
const tutorialView = document.getElementById("tutorial-view");

function showNotice(message, type = "") {
  notice.textContent = message;
  notice.className = "notice " + type;
  notice.hidden = false;
}
function hideNotice() { notice.hidden = true; }

function showUser(user) {
  loginView.hidden = true;
  tutorialView.hidden = false;
  document.getElementById("top-status").textContent = "ÁREA DO ALUNO";
  document.getElementById("user-name").textContent = user.name || "Usuário Google";
  document.getElementById("user-email").textContent = user.email || "";
  const picture = document.getElementById("user-picture");
  picture.src = user.picture || "https://www.gravatar.com/avatar/?d=mp";
  picture.alt = "Foto de " + (user.name || "usuário");
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showLogin() {
  tutorialView.hidden = true;
  loginView.hidden = false;
  document.getElementById("top-status").textContent = "AUTENTICAÇÃO SEGURA";
  window.scrollTo({ top: 0, behavior: "instant" });
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
  } catch (error) {
    showNotice(error.message || "Não foi possível concluir o login.", "error");
  }
}

async function loadSession() {
  try {
    const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
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
    const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    if (!response.ok) throw new Error("Falha ao encerrar sessão.");
    showLogin();
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  } catch {
    // Mantém a área aberta se o servidor não confirmar o logout.
    alert("Não foi possível encerrar a sessão. Tente novamente.");
  }
});

document.querySelectorAll(".copy-button").forEach(button => {
  button.addEventListener("click", async () => {
    const code = button.closest(".code-card").querySelector("pre code").textContent;
    try {
      await navigator.clipboard.writeText(code);
      const original = button.textContent;
      button.textContent = "Copiado!";
      setTimeout(() => { button.textContent = original; }, 1600);
    } catch {
      button.textContent = "Não foi possível copiar";
      setTimeout(() => { button.textContent = "Copiar código"; }, 1800);
    }
  });
});

const lessonLinks = [...document.querySelectorAll(".lesson-link")];
const lessonSections = lessonLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        lessonLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === "#" + entry.target.id));
      }
    });
  }, { rootMargin: "-18% 0px -68% 0px" });
  lessonSections.forEach(section => observer.observe(section));
}

loadSession();
initializeGoogle();
