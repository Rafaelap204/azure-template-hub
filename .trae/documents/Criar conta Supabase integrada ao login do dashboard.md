## Diagnóstico
- A mensagem “Credenciais inválidas” na tela indica que o usuário `admgestalt@gmail.com` ainda não existe no Supabase Auth **ou** a senha cadastrada é diferente.
- O app hoje só faz `signInWithPassword` e não tem fluxo de criação de conta (`signUp`), então quando o usuário não existe você fica sem saída dentro do próprio site.
- O banco tem uma trigger que bloqueia signup para emails diferentes do admin; para `admgestalt@gmail.com` isso deve ser permitido.

## Correções que vou implementar
### 1) Adicionar signup integrado ao Supabase
- Incluir no `useAuth` uma função `signUpWithPassword(email, password)` chamando `supabase.auth.signUp`.
- Manter a restrição de email único (somente `admgestalt@gmail.com`) também no signup.

### 2) Ajustar a página de Auth para “criar conta quando falhar login”
- Quando ocorrer erro de login (“Credenciais inválidas”), exibir um botão **Criar conta**.
- Ao clicar, criar o usuário no Supabase com:
  - email: `admgestalt@gmail.com` (o da imagem)
  - senha: **digitada pelo usuário** (ex.: `123456Ag@`), sem hardcode no código.
- Tratar respostas do Supabase:
  - Se vier `session` (email confirmation desabilitado), redirecionar para `/dashboard`.
  - Se exigir confirmação de email, mostrar mensagem clara (“Conta criada, confirme o email para entrar”).
  - Se o Supabase bloquear signup (ex.: `SIGNUP_DISABLED`), mostrar mensagem explicando que precisa criar o usuário pelo painel.

### 3) Validar ponta a ponta
- Rodar build/test local.
- Validar no preview: criar conta → login → acesso ao dashboard exibindo o email.

## Fallback (se o Supabase estiver com signup desabilitado)
- Orientar a criar o usuário manualmente no Supabase Dashboard → Authentication → Users → Add user (com senha `123456Ag@`), e marcar como confirmado, se necessário.

Vou aplicar essas mudanças no código e validar no preview assim que você confirmar.