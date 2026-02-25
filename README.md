# BTWLD Skills

Claude Code plugin para projetos **Rockets SDK** — **guides** (canonical), agentes, comandos, skills e hooks para NestJS + TypeORM + Concepta.

## Compatibilidade de agentes

Este repo funciona com Claude, Codex e Cursor:

- `CLAUDE.md`: contrato canonico (fonte da verdade para todas as regras e routing)
- `AGENTS.md`: thin pointer para `CLAUDE.md` (compatibilidade Codex)
- `.cursorrules`: entrypoint especifico do Cursor (aponta para `CLAUDE.md`)

## Politica command-first

- Use `commands/` como interface principal no dia a dia.
- Trate `agents/` como executores internos dos comandos.
- Mantenha checklists detalhados somente em `development-guides/`.

## Setup

### Plugin (recomendado)

```bash
/plugin install btwld/skills
```

### Manual

```bash
git clone https://github.com/btwld/skills.git
cp skills/agents/*.md ~/.claude/agents/
cp skills/commands/*.md ~/.claude/commands/
cp -r skills/skills/* ~/.claude/skills/
```

## O que tem

### Agentes (8)

| Agente | Funcao |
|--------|--------|
| `rockets-planner` | Planeja features com 12-file module pattern |
| `rockets-architect` | Design de sistema, selecao de pacotes Concepta |
| `rockets-module-generator` | Gera modulos completos |
| `rockets-code-reviewer` | Review contra padroes Rockets (estrutura, DTOs, CRUD, naming) |
| `rockets-security-reviewer` | Auditoria de ACL, guards, auth |
| `rockets-custom-endpoints` | **DEPRECATED**: substituido por `skills/rockets-business-logic/SKILL.md` + `skills/rockets-custom-code/SKILL.md` |
| `rockets-build-resolver` | Corrige erros de build |
| `rockets-tdd-guide` | TDD para projetos Rockets |

### Comandos (8)

| Comando | Funcao |
|---------|--------|
| `/rockets-plan` | Planejar feature |
| `/rockets-from-doc` | Implementar projeto a partir de documento de requisitos |
| `/rockets-module` | Gerar modulo CRUD |
| `/rockets-acl` | Configurar access control |
| `/rockets-business-logic` | Implementar padroes de logica de negocio pos-CRUD |
| `/rockets-review` | Code review |
| `/rockets-test` | TDD workflow |
| `/rockets-build-fix` | Corrigir build |

### Skills (7)

| Skill | Funcao |
|-------|--------|
| `rockets-crud-generator` | Gerador automatico de modulos via JSON config |
| `rockets-access-control` | Workflow para configurar ACL |
| `rockets-business-logic` | Implementa state machines, workflows, eventos, notificacoes, upload e integracoes externas |
| `rockets-custom-code` | Regras para logica nao-CRUD com fronteira de servicos correta |
| `rockets-runtime-diagnostics` | Diagnostico executavel de erros comuns de runtime/build/ACL com smoke tests |
| `rockets-project-bootstrap` | Bootstrap executavel de projeto Rockets (clone, env, install, build/test) |
| `rockets-testing-patterns` | **DEPRECATED**: substituido por `agents/rockets-tdd-guide.md` + `development-guides/TESTING_GUIDE.md` |

### Hooks

| Hook | Trigger | Funcao |
|------|---------|--------|
| Block random docs | PreToolUse (Write .md) | Evita docs desnecessarios |
| Block destructive git | PreToolUse (Bash git) | Bloqueia force push, reset |
| TypeScript reminder | PostToolUse (Edit .ts) | Lembra de rodar build |
| ACL security check | PostToolUse (Edit app.acl.ts) | Alerta de seguranca |
| Access Query check | PostToolUse (Edit access-query) | Alerta de permissoes |

## Como obter guides, skills e agentes

- **Plugin (recomendado):** `/plugin install btwld/skills` — tudo fica disponível no Claude Code.
- **Download / cópia manual:** clone este repo e copie o que precisar:
  ```bash
  git clone https://github.com/btwld/skills.git
  # Guides (para colar no seu projeto ou usar como referência)
  cp -r skills/development-guides ./development-guides
  # Agentes
  cp skills/agents/*.md ~/.claude/agents/
  # Comandos
  cp skills/commands/*.md ~/.claude/commands/
  # Skills
  cp -r skills/skills/* ~/.claude/skills/
  ```

## Uso com rockets-starter

1. Clone [rockets-starter](https://github.com/btwld/rockets-starter) como base do código
2. O starter tem `CLAUDE.md` / `AGENTS.md`, rules e **referencia** para este repo (btwld/skills) para guides, skills e agentes
3. Instale este plugin ou copie `development-guides/` daqui para o seu projeto se quiser os guides locais
4. Use `/rockets-from-doc` para implementação end-to-end por documento, ou `/rockets-plan`, `/rockets-module`, `/rockets-acl` e os agentes conforme a tarefa

## Workflow recomendado (novo projeto -> feature -> validacao)

### 1) Criar projeto base (boilerplate)

```bash
node skills/rockets-project-bootstrap/scripts/bootstrap.js \
  --repo git@github.com:btwld/rockets-starter.git \
  --dest ../rockets-starter-app \
  --install --run-build --run-test
```

### 2) Implementar feature seguindo padrao Rockets

1. Planejar: `/rockets-plan <Feature>`
2. Gerar modulo: `/rockets-module <Entity>`
3. Ajustar ACL: `/rockets-acl <Entity>`
4. Testar: `/rockets-test <EntityModule>`
5. Revisar: `/rockets-review`

Guides de referencia por etapa:
- Estrutura modulo: `rockets-crud-generator` skill (ver `skills/rockets-crud-generator/SKILL.md`)
- CRUD: `development-guides/CRUD_PATTERNS_GUIDE.md`
- Access control: `development-guides/ACCESS_CONTROL_GUIDE.md`
- Testes: `development-guides/TESTING_GUIDE.md`

### 3) Diagnosticar erros comuns (runtime/build/ACL)

```bash
node skills/rockets-runtime-diagnostics/scripts/diagnose.js /caminho/do/projeto
node skills/rockets-runtime-diagnostics/scripts/diagnose.js /caminho/do/projeto --run-build --run-tests
```

## License

MIT
