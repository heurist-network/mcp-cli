# Heurist MCP Installer

CLI tool to install [Heurist](https://mcp.heurist.ai/) MCP tools into compatible clients.

## Installation

```bash
npx -y heurist-mcp-cli
# or
bunx heurist-mcp-cli
# or
pnpm dlx heurist-mcp-cli
```

## Usage

### Install a Tool

```bash
npx -y heurist-mcp-cli <tool-url-or-id> <api-key> [client]
```

- `<tool-url-or-id>`: The full URL of the Heurist MCP tool, or just the short tool ID (e.g., `0f1234de`).
- `<api-key>`: Your API key for verification.
- `[client]` (optional): Specify a client (`claude`, `windsurf`, `cursor`, `vscode`, `vscode-insiders`). If omitted, you will be prompted to select one from the detected clients.

Example:
```bash
npx -y heurist-mcp-cli 0f1234de your_api_key_here cursor
```

### List Detected Clients

```bash
npx -y heurist-mcp-cli list
```

Lists clients where the tool can be installed.

## Supported Clients

- Claude Desktop
- Windsurf (Codeium)
- Cursor
- VS Code
- VS Code Insiders

## Development

1. Clone the repo.
2. `npm install` or `bun install` or `pnpm install`
3. `npm run start` or `bun run start` or `pnpm run start`

## Acknowledgements

- [Smithery AI CLI](https://github.com/smithery-ai/cli/)
- [mcp-remote](https://github.com/geelen/mcp-remote)
