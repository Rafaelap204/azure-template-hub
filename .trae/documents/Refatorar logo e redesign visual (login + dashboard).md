## O que será entregue
- Logo clicável (imagem dentro de âncora) + texto “AgenteCTU” com tipografia moderna e alinhamento perfeito.
- Reformulação visual consistente (login e dashboard): fontes, paleta, espaçamentos, hierarquia e refinamento de componentes.

## Estado atual (levantamento)
- O logotipo hoje é um `<img>` sem link e um `<span>` com classes de tipografia (ex.: `text-3xl`) no componente [Logo.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/components/Logo.tsx).
- O design system está centralizado em [index.css](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/index.css) com tokens HSL; há import de fontes via Google Fonts e há duplicação de bloco `.dark` (duas definições), o que pode causar inconsistência de paleta.
- Login e Dashboard usam o componente `Logo` e `GlassCard` (ex.: [Auth.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Auth.tsx#L79-L94), [Dashboard.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Dashboard.tsx#L96-L121)).

## 1) Atualizar o `img` para usar a âncora fornecida
- Ajustar [Logo.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/components/Logo.tsx) para envolver a imagem com:
  - `href="https://imgbb.com/"`
  - `img src` apontando para o link direto da logo fornecida (o CDN `i.ibb.co/...png`), mantendo `alt` conforme especificado.
  - Estilo sem borda (equivalente ao `border="0"`) e mantendo `object-contain`.
- Manter um fallback local opcional (se o link externo falhar) sem quebrar layout.

## 2) Tipografia: pesquisar/baixar/implementar fontes modernas
- Substituir imports de Google Fonts em [index.css](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/index.css) por fontes locais via pacotes NPM (cumpre “baixar e implementar pacotes”).
- Combinação proposta (harmoniosa e profissional):
  - Corpo/UI: Inter variável (legível e neutra).
  - Títulos/brand: Space Grotesk variável (moderna e forte para headings e “AgenteCTU”).
- Implementação técnica:
  - Adicionar dependências `@fontsource-variable/inter` e `@fontsource-variable/space-grotesk`.
  - Importar as fontes no entrypoint [main.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/main.tsx) (ou em CSS) e definir `--font-sans` / `--font-display`.
  - Ajustar [tailwind.config.ts](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/tailwind.config.ts) para usar essas variáveis (ex.: `fontFamily.sans` e uma `fontFamily.display`).
  - Atualizar o `<span>` do logo para usar a fonte “display” e um peso/tamanho consistente por breakpoint.

## 3) Design visual: paleta, layout, componentes e hierarquia
- **Paleta de cores**
  - Consolidar o tema removendo a duplicação de `.dark` e definindo uma paleta coerente baseada em HSL.
  - Ajustar `--background/--card/--border` para contraste mais “premium” e `--primary/--accent` alinhados com a marca.
- **Layout e espaçamento**
  - Refinar `container`, paddings e grids do Dashboard (ex.: transformar a lista em grid responsivo `1→2→3 colunas` quando fizer sentido).
  - Melhorar espaçamento vertical e ritmo tipográfico (títulos, subtítulos, metadados).
- **Componentes UI**
  - Ajustar estilos base de `Button`, `Input` e `GlassCard` para ficarem mais consistentes (hover/active, sombras, bordas, foco).
  - Refinar chips/pills (categoria), cards de template e header (melhor hierarquia e alinhamento).
- **Integração da logo**
  - Garantir que a logo fique proporcional, nítida e bem posicionada tanto no login quanto no header do dashboard.
  - Ajustar espaçamento do header para não “apertar” em telas pequenas.

## 4) Ajustes nas páginas (login e dashboard)
- Atualizar [Auth.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Auth.tsx) para:
  - Harmonizar o topo (logo + título + subtítulo), melhorar tipografia do texto de apoio e inputs.
- Atualizar [Dashboard.tsx](file:///c:/Users/Gestalt/Desktop/agentectu1/azure-template-hub/src/pages/Dashboard.tsx) para:
  - Header mais refinado (branding, menu do usuário), grid e cards mais modernos.

## Validação
- Verificar visualmente em larguras pequenas/médias/grandes (responsividade e alinhamento do logo).
- Rodar build de produção para garantir que fontes/assets resolvem corretamente.
- Checar diagnósticos TypeScript e regressões visuais básicas.

## Observação importante
- A interface já usa shadcn/ui + Tailwind e tokens CSS; a reformulação será feita aproveitando essa base para manter consistência global e reduzir retrabalho.