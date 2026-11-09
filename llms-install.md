# Install Special Needs Care Network

This server is hosted, so there is nothing to build and no API key.

Add this to the client's MCP settings:

```json
{
  "mcpServers": {
    "special-needs-care": {
      "type": "streamableHttp",
      "url": "https://specialneedsusa.com/api/mcp"
    }
  }
}
```

If the client only supports stdio, use:

```json
{
  "mcpServers": {
    "special-needs-care": {
      "command": "npx",
      "args": ["-y", "specialneeds-cli", "mcp"]
    }
  }
}
```

To check the install, ask: "What does ABA therapy cost in Texas?"
