# L04 — devdigest-mcp

До цього уроку рев'ю в DevDigest запускалось лише кнопкою Run на сторінці PR.
Тепер те саме може зробити агент прямо з терміналу Claude Code: Fastify API
застосунку відкрито як MCP-сервер (офіційний TypeScript SDK, транспорт stdio).

## П'ять інструментів

| Інструмент | Що робить |
|---|---|
| `list_agents` | які рецензенти налаштовані і що кожен перевіряє; звідси агент бере id |
| `run_agent_on_pr` | запускає рев'ю, чекає і повертає готові знахідки; єдиний, що щось змінює |
| `get_findings` | читає вже завершений прогін — за `run_id` або останній на PR |
| `get_conventions` | правила будинку репозиторію з L02, лише прийняті людиною |
| `get_blast_radius` | карта впливу PR; поки сервер її не вміє, інструмент чесно це каже (домашка) |

`list_repos` і `list_prs` немає свідомо: `gh pr list` уже це вміє, а «один
інструмент на кожен ендпоінт» лише роздуває контекст.

Як застосовано чотири принципи дизайну з лаби:

- **Результат, а не операція.** `run_agent_on_pr` сам створює прогін, опитує
  його статус і збирає знахідки. Якщо рев'ю довше за `wait_seconds` (240 с за
  замовчуванням), інструмент повертає `run_id` з підказкою викликати
  `get_findings`, а не висить.
- **Плоскі аргументи.** `repo` (`owner/name`), `pr` (число), `agent` (ім'я або
  id). Назву агента можна писати як завгодно: «security-reviewer», «Security
  Reviewer» або просто «security», якщо збіг однозначний.
- **Стисла відповідь.** Вердикт, score, лічильники за severity, summary і
  знахідки від найкритичнішої: `file:line`, чому (до 400 символів), як виправити
  (до 240). Жодного сирого дампу.
- **Помилки з наступним кроком.** Не «404», а «агента "perf" немає, виклич
  `list_agents`» або «PR #9 немає, у DevDigest є #3, #1».

![Інструменти в MCP Inspector](https://raw.githubusercontent.com/vbronetskyi/dev-digest/pr-assets/lab-4/inspector-tools.png)

## Підключення

Сервер зареєстровано в `.mcp.json` у корені під іменем `devdigest`. Claude Code
запускає його сам, щойно відкрити сесію в репозиторії. Потрібно лише, щоб API
був запущений (`./scripts/dev.sh`) і щоб `node` був у PATH.

## Перевірка

MCP Inspector бачить усі п'ять інструментів з описами й анотаціями
(read-only в усіх, крім `run_agent_on_pr`), а `list_agents` повертає агентів.

![list_agents в Inspector](https://raw.githubusercontent.com/vbronetskyi/dev-digest/pr-assets/lab-4/inspector-list-agents.png)

Той самий ланцюжок, який пройде агент, я прогнав наживо на demo-PR #3:

1. `list_agents` → Security Reviewer;
2. `run_agent_on_pr(repo, 3, "security", wait_seconds=45)` → через 45 с
   `status: running` і `run_id`;
3. `get_findings(run_id)` → `request_changes`, score 17: **CRITICAL** SSRF у
   `server/src/modules/reviews/routes.ts:174-185` і чотири WARNING (79 с, $0.0008).

Тести пакета — справжній MCP-клієнт через in-memory транспорт SDK проти
фейкового API: 11 тестів на discovery, очікування, прогрес, помилки й
стислу форму відповіді.

## Аудит токенів

Скільки місця займають описи інструментів (`tools/list`, токени ≈ символи / 4).
GitHub MCP — офіційний образ версії 2.0.2:

| Сервер | Інструментів | ≈ токенів |
|---|---|---|
| GitHub MCP, `GITHUB_TOOLSETS=all` | 91 | 66 600 |
| GitHub MCP за замовчуванням | 46 | 32 500 |
| GitHub MCP, `pull_requests,repos` + `GITHUB_READ_ONLY=1` | 16 | 10 300 |
| devdigest-mcp | 5 | 1 000 |

Обрізання через конфіг самого сервера дає в 3–6 разів менше, але так уміє не
кожен сервер. Tool Search працює для будь-якого: у Claude Code він увімкнений за
замовчуванням, і на старті в контекст потрапляють лише назви інструментів та
`instructions` сервера. Тому інструкції devdigest-mcp пояснюють, **коли**
шукати його інструменти, а не лише що вони роблять. Для інструментів, потрібних
щоходу, є `alwaysLoad: true` у `.mcp.json`.

Цифри `/context` залежать від сесії, тож їх знімаєш сам: базова сесія → +GitHub
MCP → обрізаний → Tool Search (`ENABLE_TOOL_SEARCH`) → те саме з devdigest-mcp.

## Що знайшлося по дорозі

- **Рев'ю через API дивилося порожній дифф.** Баг з L01 став блокером: агент
  запускає рев'ю через MCP, сторінку PR ніхто не відкривав, файлів PR у базі
  немає, а локальний клон не має head-коміту. Модель отримувала нуль змін і
  ставила approve 100. Тепер `loadDiff` у такому разі тягне файли з GitHub і
  зберігає їх, а якщо змін немає ніде, прогін падає з поясненням.
- **MCP Inspector обриває виклик через 60 с.** Claude Code чекає stdio-інструмент
  до 30 хвилин тиші, тож для нього 240 с нормально. В Inspector варто ставити
  `wait_seconds=45` і потім `get_findings`.
- **Той самий агент на тому самому PR:** раз 79 с і CRITICAL SSRF, раз 346 с і
  нуль знахідок. У другому прогоні модель знайшла SSRF, але послалась на
  неіснуючий файл, і grounding-гейт її відкинув. Summary при цьому SSRF описує —
  тому інструменти повертають і summary, щоб агент це бачив.

## Як перевірити самому

1. `./scripts/dev.sh`, і щоб `node` був у PATH (`export PATH="$HOME/.local/node/bin:$PATH"`).
2. У репозиторії: `cd mcp && npm ci` (якщо ще не встановлено).
3. Відкрити Claude Code у корені репозиторію, у `/mcp` підтвердити сервер `devdigest`.
4. Попросити: «проревʼюй PR #3 у vbronetskyi/dev-digest агентом security-reviewer,
   чи є критичні findings».
5. Inspector окремо: `cd mcp && npm run inspect`.

Тести: `cd mcp && npm test`, `cd server && pnpm exec vitest run .it.test`.
