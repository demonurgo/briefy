---
title: Módulo de Prospecção com IA
created_at: 2026-04-22
trigger: v1.2 ou milestone pós-hackathon
status: seed
---

# Módulo de Prospecção com IA

## Ideia

Um módulo onde a equipe informa dados sobre um **prospect** (empresa que ainda não é cliente da agência) e a IA realiza uma análise estratégica completa para embasar a abordagem comercial.

## O que o módulo entregaria

### 1. Análise do prospect
- Perfil digital: presença nas redes, website, posicionamento atual
- Pontos fortes e fracos da comunicação atual
- Oportunidades de melhoria que a agência pode oferecer

### 2. Análise competitiva
- Identifica principais concorrentes do prospect
- Compara posicionamento digital com os concorrentes
- Destaca gaps que a agência pode explorar na proposta

### 3. Mapeamento de contatos
- Busca decision-makers relevantes (marketing, comercial, CEO de PMEs)
- Sugere plataformas para contato (LinkedIn, site, email)
- Prioriza contatos por cargo e relevância para a venda

### 4. Geração de proposta
- Proposta personalizada baseada no perfil do prospect e análise
- Inclui serviços recomendados, argumentos de valor, estimativa de resultado
- Exportável como PDF ou compartilhável via link

## Interface sugerida

- Seção "Prospecção" no menu lateral (entre Clientes e Demandas, ou separado)
- Formulário de input: nome da empresa, segmento, redes sociais, website, contexto adicional
- Resultado em abas: Análise | Concorrentes | Contatos | Proposta
- Botão "Converter em cliente" — cria o cliente no sistema com os dados já preenchidos

## Tecnologia

- Managed Agents (pesquisa web multi-step) para análise e busca de concorrentes/contatos
- Claude Opus para síntese e geração da proposta
- Resultado persistido em tabela `prospections` (não em `clients` até conversão)

## Dependências

- Phase 3 concluída (BYOK, Managed Agents configurado)
- Phase 4 concluída (optional — notificação quando análise terminar)
- v1.2 milestone aberto via `/gsd-new-milestone`

## Notas

Ideia originada pelo usuário em 2026-04-22 durante execução da Phase 3.
O módulo de prospecção é complementar ao CRM existente — transforma leads frios
em prospects qualificados com contexto de IA antes da primeira abordagem.
