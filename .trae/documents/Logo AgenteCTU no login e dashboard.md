## Objetivo
- Exibir a logo do AgenteCTU + texto “AgenteCTU” lado a lado, alinhados e consistentes no Login e no Dashboard.
- Manter proporções, boa qualidade e responsividade.

## Onde mexer (estado atual)
- O app usa o componente [Logo.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/components/Logo.tsx), já renderizado no Login ([Auth.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Auth.tsx#L87-L93)) e no header do Dashboard ([Dashboard.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Dashboard.tsx#L98-L121)).

## Implementação
1. **Adicionar o arquivo da logo ao projeto**
   - Baixar a imagem fornecida e salvar como um asset local (ex.: `public/brand/agentectu-logo.png`).
   - Motivo: evita dependência de link externo, melhora performance e garante estabilidade.

2. **Atualizar o componente `Logo` para o novo layout**
   - Substituir o “CTU / Template Utility” por:
     - `<img>` com `object-contain` e tamanho controlado por `size`.
     - Texto “AgenteCTU” com tipografia consistente (ex.: `font-semibold`, `tracking-tight`, `leading-none`) e tamanho também controlado por `size`.
   - Garantir alinhamento vertical (`items-center`) e espaçamento (`gap-*`).
   - Manter responsividade: tamanhos `sm/md/lg` com classes Tailwind proporcionais (imagem e texto).

3. **Ajustes finos nas páginas (se necessário)**
   - Manter o uso atual (`<Logo size="lg" />` no login e `<Logo size="md" />` no dashboard).
   - Se o header do dashboard ficar apertado em telas menores, ajustar apenas `size`/`className` no Dashboard para preservar a hierarquia visual.

## Validação
- Rodar o app e conferir visualmente:
  - Login: logo + “AgenteCTU” centralizados e nítidos.
  - Dashboard: logo + “AgenteCTU” no header sem quebrar layout.
  - Responsivo: conferir em larguras pequenas (mobile) e médias.
- Rodar `npm run build` para garantir que o asset e imports funcionem em produção.

## Resultado esperado
- Mesma marca (imagem + “AgenteCTU”) aparecendo de forma consistente no Login e no Dashboard, com proporções preservadas e bom alinhamento.