# Rockets SDK Skills

Claude Code skills for [Rockets SDK](https://github.com/conceptadev/rockets) development.

## Installation

```bash
npx skills add btwld/rockets/crud-generator
```

## Available Skills

### crud-generator

Generate complete CRUD modules with TypeORM entities, NestJS modules, controllers, services, DTOs, and interfaces.

```bash
node crud-generator/scripts/generate.js '{
  "entityName": "Category",
  "fields": [
    { "name": "name", "type": "string", "required": true, "maxLength": 100 }
  ]
}'
```

[Full documentation](./crud-generator/SKILL.md)

## License

MIT
