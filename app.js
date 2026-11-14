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


const quizForm = document.getElementById("quiz-form");
if (quizForm) {
  const answerKey = ["1", "2", "0", "1", "2"];
  const explanations = [
    "O Google Identity Services apresenta o fluxo de login e retorna um ID token ao navegador.",
    "O backend verifica a assinatura e os dados do token para confirmar que ele é válido para a aplicação.",
    "O campo audience deve corresponder ao Client ID usado pela aplicação.",
    "HttpOnly impede que scripts executados no navegador acessem diretamente o valor do cookie.",
    "O logout deve invalidar a sessão no servidor e devolver o usuário à tela de login."
  ];
  const progress = document.getElementById("quiz-progress");
  const result = document.getElementById("quiz-result");
  const review = document.getElementById("quiz-review");
  const updateQuizProgress = () => {
    const answered = answerKey.filter((_, i) => quizForm.querySelector('input[name="q' + i + '"]:checked')).length;
    progress.textContent = answered + " de 5 respondidas";
  };
  quizForm.addEventListener("change", updateQuizProgress);
  quizForm.addEventListener("submit", event => {
    event.preventDefault();
    const unanswered = answerKey.filter((_, i) => !quizForm.querySelector('input[name="q' + i + '"]:checked')).length;
    if (unanswered) {
      result.hidden = false;
      result.className = "quiz-result incomplete";
      result.textContent = "Faltam responder " + unanswered + " pergunta(s). Complete o quiz para ver sua nota.";
      return;
    }
    let score = 0;
    const reviewItems = answerKey.map((answer, i) => {
      const selected = quizForm.querySelector('input[name="q' + i + '"]:checked').value;
      const correct = selected === answer;
      if (correct) score++;
      const question = quizForm.querySelector('[data-question="' + i + '"] legend').textContent.replace(/^\s*\d+\s*/, "");
      const selectedText = quizForm.querySelector('input[name="q' + i + '"]:checked').parentElement.textContent.trim();
      const correctText = quizForm.querySelector('input[name="q' + i + '"][value="' + answer + '"]').parentElement.textContent.trim();
      return '<div class="review-item ' + (correct ? "correct" : "incorrect") + '"><strong>' + (i + 1) + '. ' + question + '</strong><p>Sua resposta: ' + selectedText + '</p>' + (correct ? '<p class="review-status">Resposta correta!</p>' : '<p>Resposta correta: ' + correctText + '</p>') + '<small>' + explanations[i] + '</small></div>';
    });
    const percent = score * 20;
    const message = score === 5 ? "Excelente! Você dominou o conteúdo." : score >= 3 ? "Muito bem! Revise os pontos que errou." : "Continue estudando. Revise o tutorial e tente novamente.";
    result.hidden = false;
    result.className = "quiz-result " + (score >= 3 ? "passed" : "needs-review");
    result.innerHTML = '<div class="quiz-score">' + score + '<small>/5</small></div><div><strong>' + message + '</strong><p>Você acertou ' + score + ' de 5 perguntas (' + percent + '%).</p></div>';
    review.hidden = false;
    review.innerHTML = '<h3>Correção das respostas</h3>' + reviewItems.join("");
    result.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "quiz-retry";
  retry.textContent = "Refazer quiz";
  retry.addEventListener("click", () => {
    quizForm.reset();
    result.hidden = true;
    review.hidden = true;
    progress.textContent = "0 de 5 respondidas";
    quizForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  review.after(retry);
  retry.hidden = true;
  const resultObserver = new MutationObserver(() => { retry.hidden = result.hidden; });
  resultObserver.observe(result, { attributes: true, attributeFilter: ["hidden"] });
  review.hidden = true;
}


/* Checklist de implementação: progresso salvo localmente neste navegador. */
const checklist = document.getElementById("checklist");
if (checklist) {
  const storageKey = "atvgoogle-implementation-checklist-v1";
  const checks = [...checklist.querySelectorAll('input[type="checkbox"][data-check]')];
  const count = document.getElementById("checklist-count");
  const fill = document.getElementById("checklist-progress-fill");
  const progressBar = document.getElementById("checklist-progress");
  const message = document.getElementById("checklist-message");

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; } catch { saved = {}; }

  checks.forEach(input => { input.checked = saved[input.dataset.check] === true; });

  function updateChecklist(save = true) {
    const completed = checks.filter(input => input.checked).length;
    const total = checks.length;
    const percent = Math.round((completed / total) * 100);
    count.textContent = completed + "/" + total;
    fill.style.width = percent + "%";
    progressBar.setAttribute("aria-valuenow", String(completed));
    message.textContent = completed === total
      ? "Tudo concluído! Sua implementação está completa. 🎉"
      : completed === 0
        ? "Comece marcando as tarefas que você já concluiu."
        : percent + "% concluído. Continue avançando no seu ritmo.";
    checklist.classList.toggle("is-complete", completed === total);
    if (save) {
      const state = {};
      checks.forEach(input => { state[input.dataset.check] = input.checked; });
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {
        message.textContent = "Não foi possível salvar neste navegador. Verifique as configurações de armazenamento.";
      }
    }
  }

  checks.forEach(input => input.addEventListener("change", () => updateChecklist()));
  document.getElementById("checklist-reset").addEventListener("click", () => {
    if (!checks.some(input => input.checked)) return;
    if (!window.confirm("Deseja desmarcar todas as tarefas do checklist?")) return;
    checks.forEach(input => { input.checked = false; });
    updateChecklist();
  });
  updateChecklist(false);
}

loadSession();
initializeGoogle();
