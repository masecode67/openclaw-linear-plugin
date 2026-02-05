# Linear Plugin for OpenClaw

A Linear integration plugin for [OpenClaw](https://github.com/anthropics/openclaw) that enables AI agents to interact with Linear's issue tracking system through natural language commands.

## Features

- **Create Tickets** — Create new issues with title, description, team assignment, and optional assignee
- **Read Tickets** — Fetch full ticket details by identifier (e.g., `PRJ-123`)
- **Update Tickets** — Modify title, description, status, and priority
- **Assign Tickets** — Assign issues to team members
- **List Tickets** — Query tickets by team with optional status filtering
- **List Users** — Get all workspace users for assignment lookups

## Installation

### 1. Clone or Copy to Extensions Directory

```bash
# Clone directly to extensions folder
git clone git@github.com:masecode67/openclaw-linear-plugin.git ~/.openclaw/extensions/linear

# Or if you already have it elsewhere, copy it
cp -r /path/to/openclaw-linear-plugin ~/.openclaw/extensions/linear
```

### 2. Install Dependencies

```bash
cd ~/.openclaw/extensions/linear
npm install
```

### 3. Get a Linear API Key

1. Go to [Linear Settings → API](https://linear.app/settings/api)
2. Click **Create Key**
3. Give it a descriptive name (e.g., "OpenClaw Integration")
4. Copy the generated key

### 4. Configure OpenClaw

Add the plugin configuration to your `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "enabled": true,
    "entries": {
      "linear": {
        "enabled": true,
        "config": {
          "apiKey": "${LINEAR_API_KEY}"
        }
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "allow": [
            "linear_create_ticket",
            "linear_read_ticket",
            "linear_update_ticket",
            "linear_assign_ticket",
            "linear_list_tickets",
            "linear_get_users"
          ]
        }
      }
    ]
  }
}
```

You can either:
- Set the `LINEAR_API_KEY` environment variable, or
- Replace `${LINEAR_API_KEY}` with your actual API key (not recommended for shared configs)

### 5. Restart the Gateway

```bash
openclaw gateway restart
```

## Tools Reference

### `linear_create_ticket`

Create a new ticket in Linear.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Title of the ticket |
| `projectKey` | string | Yes | Team key (e.g., `ENG`, `PRD`) |
| `description` | string | No | Detailed description |
| `assigneeId` | string | No | User ID to assign to |

**Example prompt:** "Create a ticket in ENG: Fix authentication timeout bug"

---

### `linear_read_ticket`

Get full details of a ticket by its identifier.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | Ticket identifier (e.g., `ENG-123`) |

**Example prompt:** "Show me ticket ENG-456"

---

### `linear_update_ticket`

Update an existing ticket's properties.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | Ticket identifier |
| `title` | string | No | New title |
| `description` | string | No | New description |
| `status` | string | No | Status name (e.g., `In Progress`, `Done`) |
| `priority` | number | No | 0=none, 1=urgent, 2=high, 3=medium, 4=low |

**Example prompt:** "Update ENG-123 status to In Progress"

---

### `linear_assign_ticket`

Assign a ticket to a specific user.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `identifier` | string | Yes | Ticket identifier |
| `userId` | string | Yes | User ID to assign to |

**Example prompt:** "Assign ENG-123 to John" (agent will look up user ID first)

---

### `linear_list_tickets`

List tickets in a team with optional filtering.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectKey` | string | Yes | Team key |
| `status` | string | No | Filter by status name |
| `limit` | number | No | Max tickets to return (default: 50, max: 100) |

**Example prompt:** "List all In Progress tickets in ENG"

---

### `linear_get_users`

Get all users in the Linear workspace.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| *(none)* | — | — | — |

**Example prompt:** "Who are the users in Linear?"

## Usage Examples

Once configured, you can interact with Linear through natural language via Telegram or any other OpenClaw interface:

```
User: Create a bug ticket in ENG for the login page not loading on Safari

Agent: Created ticket ENG-789
       URL: https://linear.app/myteam/issue/ENG-789

User: Assign it to Sarah

Agent: Assigned ENG-789 to Sarah Chen

User: What's the status of ENG-456?

Agent: ENG-456: Refactor authentication module
       Status: In Review
       Priority: High
       Assignee: John Doe

       Description:
       Extract auth logic into separate service...

User: List all urgent tickets in PRD

Agent: Tickets in PRD (Urgent):
       - PRD-101: Payment gateway timeout [In Progress] (@Mike)
       - PRD-98: Dashboard crash on load [Todo]
```

## Project Structure

```
~/.openclaw/extensions/linear/
├── package.json              # NPM package configuration
├── openclaw.plugin.json      # Plugin manifest with config schema
├── index.ts                  # Plugin entry point
├── client.ts                 # Linear GraphQL API client
├── tools.ts                  # Tool definitions and handlers
├── types.ts                  # TypeScript interfaces
└── README.md                 # This file
```

## Development

### Building

The plugin uses TypeScript and is loaded directly by OpenClaw's plugin system. No separate build step is required.

### Adding New Tools

1. Add any new types to `types.ts`
2. Add API methods to `client.ts`
3. Register the tool in `tools.ts` using `api.registerTool()`

### Testing Locally

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Test the GraphQL client directly
npx ts-node -e "
import { LinearClient } from './client.js';
const client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
client.getUsers().then(console.log);
"
```

## Troubleshooting

### "Linear plugin: apiKey not configured"

The plugin couldn't find an API key. Check that:
- `LINEAR_API_KEY` environment variable is set, or
- The API key is directly specified in `openclaw.json`

### "Team with key X not found"

The team key doesn't exist. Use the exact team key shown in Linear (usually 2-4 uppercase letters like `ENG`, `PRD`, `OPS`).

### "Status X not found"

Status names are case-insensitive but must match exactly. Common statuses:
- `Backlog`, `Todo`, `In Progress`, `In Review`, `Done`, `Canceled`

### GraphQL Errors

If you see GraphQL errors, check:
- Your API key has the correct permissions
- You're using valid team keys and user IDs
- The Linear API hasn't changed (check [Linear API docs](https://developers.linear.app/docs))

## License

MIT License — see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Links

- [OpenClaw Documentation](https://github.com/anthropics/openclaw)
- [Linear API Documentation](https://developers.linear.app/docs)
- [Linear GraphQL Explorer](https://linear.app/graphql)
