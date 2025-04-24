# Heurist MCP Installer

CLI tool to install [Heurist](https://heurist.ai/) MCP tools into compatible clients.

## Installation

```bash
bun install -g heurist-mcp-installer
# or
pnpm install -g heurist-mcp-installer
```

## Usage

### Install a Tool

```bash
heurist-mcp-installer <tool-url> <api-key> [client]
```

- `<tool-url>`: The URL of the Heurist MCP tool.
- `<api-key>`: Your API key for verification.
- `[client]` (optional): Specify a client (`claude`, `windsurf`, `cursor`, `vscode`, `vscode-insiders`). If omitted, you will be prompted to select one from the detected clients.

Example:
```bash
heurist-mcp-installer https://sequencer-v2.heurist.xyz/tool0f1234de/sse api_key cursor
```

### List Detected Clients

```bash
heurist-mcp-installer list
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
2. `bun install`
3. `bun run dev`

## Acknowledgements

- [Smithery AI CLI](https://github.com/smithery-ai/cli/)
- [mcp-remote](https://github.com/geelen/mcp-remote)
