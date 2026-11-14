# AtvGoogle — Login com Google

Projeto acadêmico de autenticação com **Google Identity Services (GIS)**, validação de **ID token no backend Node.js** e criação de sessão própria.

## Funcionalidades

- Botão oficial "Continuar com Google" usando Google Identity Services.
- Envio do ID token ao backend por HTTPS.
- Validação no servidor com `google-auth-library` (assinatura, emissor, expiração e audiência).
- Verificação de `email_verified` e identificação estável pelo `sub`.
- Sessão própria assinada com HMAC-SHA256.
- Cookie de sessão `HttpOnly`, `SameSite=Lax`, `Secure` em produção e expiração de 24 horas.
- Consulta de sessão e logout.

## Tecnologias

- Node.js 20+
- Vercel Functions (API serverless)
- Google Identity Services
- google-auth-library
- HTML, CSS e JavaScript

## Estrutura

```text
AtvGoogle/
├── api/
│   ├── _lib/session.js
│   ├── auth/
│   │   ├── google.js
│   │   ├── me.js
│   │   └── logout.js
│   └── config.js
├── .env.example
├── .gitignore
├── app.js
├── index.html
├── package.json
├── style.css
└── vercel.json
```

## 1. Configurar o Google Cloud

1. Acesse https://console.cloud.google.com/.
2. Crie ou selecione um projeto.
3. Abra Google Auth Platform e configure a tela de consentimento (nome do aplicativo, e-mail de suporte e público).
4. Se o aplicativo estiver em modo de teste, adicione as contas Google que poderão testar.
5. Em Clientes, crie uma credencial OAuth do tipo **Aplicativo da Web**.
6. Em **Origens JavaScript autorizadas**, adicione:
   - `http://localhost:3000` para desenvolvimento local;
   - o domínio de produção da Vercel, por exemplo `https://seu-projeto.vercel.app`.
7. Copie o Client ID. Ele é público e pode ser usado na interface. Não publique Client Secrets.

> Este projeto utiliza o fluxo GIS com callback JavaScript (popup). Por isso, a configuração principal é a origem JavaScript autorizada. Não é necessário cadastrar uma URI de redirecionamento para esse fluxo específico. Se mudar para o fluxo OAuth com código, as URIs de redirecionamento deverão ser cadastradas e corresponder exatamente ao backend.

## 2. Variáveis de ambiente

Configure no painel da Vercel, em Project Settings → Environment Variables:

| Nome | Valor | Ambientes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud | Production, Preview, Development |
| `SESSION_SECRET` | Segredo aleatório forte (mínimo 32 caracteres) | Production, Preview, Development |

Gere um segredo localmente com:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Não coloque o valor de `SESSION_SECRET` no GitHub, no HTML ou em mensagens públicas. Não use o valor de exemplo de `.env.example` em produção.

## 3. Executar localmente

Pré-requisitos: Node.js 20+ e Vercel CLI.

```bash
npm install
npm install -g vercel
cp .env.example .env.local
```

Edite `.env.local` com o Client ID e um segredo gerado. Depois:

```bash
vercel dev
```

Acesse http://localhost:3000.

## 4. Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/config` | Retorna o Client ID público e informa se está configurado |
| POST | `/api/auth/google` | Recebe `{ "credential": "ID_TOKEN" }`, valida no Google e cria sessão |
| GET | `/api/auth/me` | Consulta a sessão atual |
| POST | `/api/auth/logout` | Encerra a sessão |

### Exemplo de requisição de login

```http
POST /api/auth/google
Content-Type: application/json

{
  "credential": "ID_TOKEN_RECEBIDO_DO_GOOGLE"
}
```

Resposta de sucesso (exemplo):

```json
{
  "message": "Autenticação realizada com sucesso.",
  "user": {
    "id": "identificador-sub-do-google",
    "name": "Nome de Exemplo",
    "email": "usuario@example.com",
    "picture": "https://...",
    "emailVerified": true
  }
}
```

O ID token é verificado no backend com `verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`. O servidor não confia em dados de perfil enviados pelo navegador.

## 5. Segurança e observações

- Nunca aceite um JWT apenas decodificado no navegador como prova de identidade.
- O backend valida assinatura, emissor, expiração e audiência pela biblioteca oficial.
- O campo `sub` é usado como identificador estável da conta Google; e-mail e nome podem mudar.
- O Client ID não é um segredo. O segredo de sessão permanece exclusivamente no servidor.
- A sessão é assinada com HMAC e armazenada em cookie HttpOnly.
- Para aplicações com dados sensíveis ou múltiplos servidores, prefira armazenar sessões em banco/Redis e adicione proteção CSRF/rate limiting conforme o risco.
- Não há persistência de usuários em banco de dados nesta versão demonstrativa.

## 6. Testes rápidos

1. Sem variáveis configuradas, a página deve informar que a configuração está pendente.
2. Com Client ID e SESSION_SECRET válidos, o botão Google deve aparecer.
3. Faça login com uma conta autorizada na tela de consentimento.
4. Verifique que a API retorna os dados do usuário e cria o cookie HttpOnly.
5. Atualize a página: a sessão deve continuar ativa.
6. Clique em "Sair da conta": a sessão deve ser encerrada.
7. Envie um token ausente ou inválido para `POST /api/auth/google`: a API deve rejeitar a requisição.

## Autor

Atividade prática — Login com Google  
Professor: M.Sc. Celso Barreto
