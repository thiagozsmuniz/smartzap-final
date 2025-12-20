# PRD: Campanhas > Novo (Mock -> Produto)

## 1) Contexto
Hoje o fluxo de criacao de campanha tem excesso de scroll e baixa prioridade para o ponto principal: escolha de template, preenchimento de variaveis e preview. O objetivo e transformar o mock redesenhado em produto real, com foco em clareza, velocidade e confianca.

## 2) Objetivos
- Reduzir scroll e manter preview sempre visivel.
- Permitir escolher template rapidamente e preencher variaveis com validacao imediata.
- Tornar publico/segmentos previsiveis com estimativas dinamicas.
- Garantir revisao/agendamento sem ambiguidade e sem mudar altura do layout.

## 3) Nao objetivos
- Criar um novo construtor de templates.
- Reestruturar todo o backend de contatos.
- Substituir o sistema de templates atual.

## 4) Personas
- Operador de marketing: cria campanhas rapidas, precisa de preview e audiencia confiavel.
- Operador operacional: usa templates utilitarios e precisa de agendamento consistente.

## 5) UX Principios
- Foco na variavel do template (ator principal).
- Reduzir ruido visual (cartoes compactos, colapsos automaticos).
- Preview fixo e atualizado por hover/selecionar.

## 6) Fluxo (alto nivel)
**Step 1 - Configuracao e Template**
- Configuracao basica compacta em linha (nome + objetivo).
- Selecao de template com recentes/recomendados.
- "Ver todos" substitui a lista no mesmo bloco (scroll interno, altura fixa).
- Ao selecionar template: lista colapsa e mostra "template selecionado" + botao "trocar".
- Variaveis do template aparecem e dominam a tela.
- Preview lateral atualiza com hover/selecionar template e com variaveis.

**Step 2 - Publico**
- Escolha: Todos / Segmentos / Teste.
- Segmentos rapidos com OR/AND global.
- Abrir ajustes finos colapsa automaticamente "Escolha publico" e "Segmentos rapidos".
- Ajustes finos expandidos no mesmo card (nao drawer).

**Step 3 - Revisao e Lancamento**
- Pre-check no topo.
- Agendamento com 2 botoes (Imediato/Agendar).
- Datas sempre ocupam espaco, mas ficam desabilitadas em Imediato.
- Resumo lateral concentra Nome/Template/Publico/Agendamento.
- Preview alinha com o footer de "Lancar campanha".

## 7) Requisitos funcionais
### Templates
- Buscar templates por nome.
- Lista de recentes e recomendados (limite de 3 cada).
- Lista completa (scroll interno, altura fixa, sempre 4 itens visiveis).
- Hover em template atualiza preview.
- Clique seleciona template e ativa variaveis.

### Variaveis do template
- Renderizar variaveis a partir do template selecionado.
- Variaveis obrigatorias com validacao imediata.
- Botao "{}" abre seletor de variaveis:
  - Dados do contato: nome, telefone, email.
  - Campos personalizados (dinamico do backend).
- Preview substitui variaveis pelo valor de exemplo.

### Publico
- Modos: Todos, Segmentos, Teste.
- Segmentos rapidos: Tags, Pais (DDI), UF (BR).
- OR/AND global.
- Ajustes finos: ultima interacao, janela de inatividade, origem, campos personalizados, excluir opt-out/suprimidos/duplicados.
- Contagem e custo dinamicos.

### Teste
- Mostrar contato de teste configurado em Settings.
- Permitir selecionar um outro contato da lista.
- Permitir enviar para 1 ou 2 contatos.

### Agendamento
- Modo Imediato ou Agendar.
- Em Imediato, campos de data/hora ficam desabilitados (mas ocupam espaco).
- Fuso fixo: America/Sao_Paulo.

## 8) Requisitos nao funcionais
- Performance: hover no template atualiza preview em <100ms.
- Acessibilidade: foco visivel, contraste AA.
- Mobile: layout colapsa em 1 coluna com preview abaixo.

## 9) APIs / Dados
- GET /templates (filters, recents, recommended)
- GET /templates/:id (vars, preview)
- GET /contacts/search (para teste)
- POST /audiences/estimate (count + custo)
- POST /campaigns (criar)
- POST /campaigns/estimate (pre-check)

## 10) Estados e Validacoes
- Template nao selecionado -> variaveis escondidas.
- Variaveis obrigatorias vazias -> bloqueia continuar.
- Teste selecionado sem contatos -> bloqueia continuar.
- Agendar sem data/hora -> bloqueia lancamento.

## 11) Observabilidade
- Logar falhas de estimativa de custo e pre-check.
- Track: tempo medio ate lancar campanha.

## 12) Rollout
- Feature flag por workspace.
- Rollout gradual (10/50/100%).

## 13) Riscos
- Preview inconsistente se template tem midias.
- Estimativas de custo divergentes em massa.

## 14) Sucesso (KPIs)
- Reducao de tempo medio para lancar campanha.
- Queda na taxa de abandono do fluxo.
- Menos erros de variaveis obrigatorias.
