# Contribuindo

1. Crie um branch a partir de `main`.
2. Antes de implementar, defina: entidade → fonte → schema (`src/lib/types.ts`) → API → UI → testes.
3. Mantenha a regra de ouro: **nada de dado inventado**. Sem fonte, mostre “Não disponível”.
4. Rode `npm run qa` (tipos, testes, ortografia) e `npm run test:e2e`.
5. Atualize a documentação afetada (`docs/`) e, se mudar dados curados, cite a fonte em `data-curated/`.
6. Abra o PR descrevendo o quê, por quê e como foi testado.

## Curadoria histórica

Alterações em `data-curated/` precisam de fonte verificável (NFL Record & Fact Book, Pro Football Hall of Fame). Para temporadas a partir de 1999 os testes de dados conferem automaticamente contra o nflverse.

## Estilo

- TypeScript estrito, sem `any` desnecessário.
- Comentários explicam o porquê, não o óbvio.
- Textos em pt-BR revisados (o `cspell` roda no QA; adicione termos técnicos legítimos em `cspell.json`).
