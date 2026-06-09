# Bolão da Copa — Guia de Configuração

## 1. Instalar dependências (após instalar Node.js)

```bash
cd "Bolao da Copa"
npm install
```

---

## 2. Criar projeto no Supabase

1. Acesse https://supabase.com e crie uma conta gratuita
2. Clique em **New Project** e crie um projeto (ex: `bolao-da-copa`)
3. Vá em **Settings → API** e copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Configurar o banco de dados

1. No Supabase, vá em **SQL Editor**
2. Cole o conteúdo do arquivo `supabase/schema.sql` e execute

---

## 4. Ativar login com Google

1. No Supabase, vá em **Authentication → Providers → Google**
2. Ative e configure o Google OAuth:
   - Acesse https://console.cloud.google.com
   - Crie um projeto, ative a API OAuth
   - Crie credenciais OAuth 2.0 (tipo: Web application)
   - Authorized redirect URIs: `https://SEU-PROJETO.supabase.co/auth/v1/callback`
   - Cole o **Client ID** e **Client Secret** no Supabase

---

## 5. Criar arquivo .env.local

Copie `.env.local.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

---

## 6. Rodar localmente

```bash
npm run dev
```

Acesse http://localhost:3000

---

## 7. Tornar-se admin

Após fazer login pela primeira vez, execute no SQL Editor do Supabase:

```sql
update public.profiles
set is_admin = true
where email = 'seu-email@gmail.com';
```

---

## 8. Deploy na Vercel (opcional, gratuito)

1. Faça push do projeto para um repositório GitHub
2. Acesse https://vercel.com e importe o repositório
3. Adicione as variáveis de ambiente (mesmas do .env.local)
4. No Supabase → Authentication → URL Configuration, adicione:
   - **Site URL**: `https://seu-app.vercel.app`
   - **Redirect URLs**: `https://seu-app.vercel.app/auth/callback`

---

## Sistema de pontuação

| Resultado              | Pontos |
|------------------------|--------|
| Placar exato           | 10 pts |
| Vencedor/empate certo  | 5 pts  |
| Errou                  | 0 pts  |

Palpites ficam bloqueados no horário do jogo.
