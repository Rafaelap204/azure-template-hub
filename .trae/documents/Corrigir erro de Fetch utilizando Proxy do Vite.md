O erro "Failed to fetch" ocorre porque o navegador está bloqueando a conexão direta com a Edge Function devido a restrições de segurança (CORS) ou falha de rede, mesmo após os ajustes anteriores. A solução definitiva para o ambiente de desenvolvimento é utilizar o **proxy do Vite**, que redireciona as chamadas locais para o Supabase, evitando bloqueios do navegador.

Abaixo está o plano para corrigir o problema:

1.  **Modificar `src/components/TemplateSelectionDialog.tsx`**:
    *   Alterar a lógica de construção da lista `baseUrls`.
    *   Adicionar `window.location.origin` (ex: `http://localhost:8080`) como a **primeira opção** na lista quando estiver em modo de desenvolvimento (`import.meta.env.DEV`).
    *   Isso forçará a aplicação a tentar primeiro a rota local `/functions/v1/...`, que será interceptada pelo proxy configurado no `vite.config.ts`, garantindo uma chamada segura e sem erros de CORS.

Essa mudança garante que o ambiente de desenvolvimento use o túnel seguro (proxy), enquanto a produção continua usando a URL direta do Supabase.