# jobsite-math

Exact, tested calculators for the math US contractors do every day, in two packages:

| Package | What it is |
|---|---|
| [`jobsite-math`](packages/core) | Zero-dependency TypeScript functions: roof pitch, hip roof, concrete, gravel, brick, mortar, paint, drywall, deck boards, markup, hourly rate. |
| [`jobsite-math-mcp`](packages/mcp) | A read-only MCP server exposing the same functions to Claude, Cursor and other AI assistants. |

```sh
npm install jobsite-math
npx -y jobsite-math-mcp   # MCP server over stdio
```

US units throughout, with the unit in every field name. Product figures such as bag yield, paint coverage and gravel density are inputs, never hidden constants. Quantities round up to whole bags, sheets and boards. See [packages/core](packages/core#readme) for every formula and its limits.

## Develop

```sh
npm install
npm test        # builds both packages, runs unit tests and an end-to-end stdio test
```

Node.js 22.18 or later for development (tests run TypeScript directly). The published packages need Node.js 20 or later.

Issues and pull requests are welcome, especially corrections from people who do this work on site.

## License

MIT. Copyright (c) 2026 JW Digital Services Ltd. The same math runs the free browser calculators at [contractorwebsiteshq.com/us/tools](https://contractorwebsiteshq.com/us/tools/).
