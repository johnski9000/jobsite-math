# jobsite-math-mcp

An MCP server that gives AI assistants exact US construction calculators, so they stop guessing at roof pitch, concrete bags or paint gallons.

Eleven read-only tools, built on [`jobsite-math`](https://www.npmjs.com/package/jobsite-math):

`roof_pitch`, `hip_roof`, `markup`, `hourly_rate`, `concrete`, `gravel`, `bricks`, `mortar`, `paint`, `drywall`, `deck_boards`

- Runs locally over stdio. No network calls, no API keys, nothing stored.
- Every tool is marked read-only and idempotent.
- Inputs are strict: unknown fields are rejected, and errors name the field that is wrong.
- The server tells the model to ask for product figures (bag yield, paint coverage, density) instead of inventing them.

## Setup

Requires Node.js 20 or later.

**Claude Desktop** (`claude_desktop_config.json`), **Cursor** (`.cursor/mcp.json`) and most other clients:

```json
{
  "mcpServers": {
    "jobsite-math": {
      "command": "npx",
      "args": ["-y", "jobsite-math-mcp"]
    }
  }
}
```

**Claude Code:**

```sh
claude mcp add jobsite-math -- npx -y jobsite-math-mcp
```

## Example

> "My slab is 24 by 18 feet, 4 inches thick. How many 80 lb bags at 0.6 cubic feet each, with 10% extra?"

The assistant calls `concrete` with `{ "shape": "slab", "lengthFt": 24, "widthFt": 18, "depthIn": 4, "allowancePercent": 10, "bagYieldCuFt": 0.6 }` and gets back `144` cubic feet, `5.87` cubic yards with the allowance, and `264` bags.

## Limits

Planning estimates only: not structural design, code compliance, HVAC load calculation or tax advice. See the [`jobsite-math` README](https://github.com/johnski9000/jobsite-math/tree/main/packages/core#readme) for every formula and its assumptions.

## License

MIT. Copyright (c) 2026 JW Digital Services Ltd.
