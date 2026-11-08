# specialneeds-cli

Find special needs care for free, from your terminal or any AI assistant that supports MCP. [Special Needs Care Network](https://specialneedsusa.com/tools/mcp) matches families with a few ABA therapy, special needs school, speech therapy, or diagnostic testing providers that have availability and take their insurance, so they don't have to reach out to anyone.

Also includes measurable example IEP goals and ABA therapy costs, insurance mandates, and Medicaid access by US state.

No account or API key required.

## CLI

```bash
npx specialneeds-cli find-care --care aba --zip 33602 --age 5 --insurance Aetna
npx specialneeds-cli cost Texas
npx specialneeds-cli iep-goals requesting a break
npx specialneeds-cli iep-goals --area aac --autism --limit 5
npx specialneeds-cli iep-areas
```

Add `--json` to any command for raw output.

## MCP server

Hosted endpoint (Streamable HTTP):

```
https://specialneedsusa.com/api/mcp
```

Claude Code:

```bash
claude mcp add --transport http special-needs-care https://specialneedsusa.com/api/mcp
```

Cursor and other clients that take a URL:

```json
{
  "mcpServers": {
    "special-needs-care": { "url": "https://specialneedsusa.com/api/mcp" }
  }
}
```

Clients that only support stdio:

```json
{
  "mcpServers": {
    "special-needs-care": { "command": "npx", "args": ["-y", "specialneeds-cli", "mcp"] }
  }
}
```

## Tools

| Tool | What it does |
|---|---|
| `find_special_needs_care` | Returns a private link where a family confirms a free match with care near them |
| `get_aba_therapy_cost` | Private-pay rates, monthly estimates, insurance mandate details, and Medicaid access for a state or DC |
| `search_iep_goals` | Searches complete, measurable example IEP goals by skill, area, or autism tag |
| `list_iep_goal_areas` | Lists the goal bank's skill areas with counts |

## Privacy

The server stores no search terms or tool arguments and requires no sign-in. `find_special_needs_care` takes care needs only, never contact details, and carries them in an encrypted link. A request reaches our team only when the family opens the link, adds their details, and submits it. See the [privacy policy](https://specialneedsusa.com/privacy-policy).

## Important

Results are general information, not medical or legal advice. Example IEP goals must be rewritten from the child's own present levels and data. Cost figures are estimates, so confirm coverage in the plan documents.

## Support

admin@specialneedsusa.com

## License

MIT
