import { Type } from "@sinclair/typebox";
import { LinearClient } from "./client.js";
import type { PluginConfig, LinearTicket, LinearUser } from "./types.js";

interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
}

function textResponse(text: string): ToolResponse {
  return {
    content: [{ type: "text", text }],
  };
}

function formatTicket(ticket: LinearTicket): string {
  return [
    `**${ticket.identifier}**: ${ticket.title}`,
    `Status: ${ticket.status.name}`,
    `Priority: ${ticket.priorityLabel}`,
    ticket.assignee ? `Assignee: ${ticket.assignee.name}` : "Assignee: Unassigned",
    ticket.description ? `\nDescription:\n${ticket.description}` : "",
    `\nURL: ${ticket.url}`,
  ].join("\n");
}

function formatTicketList(tickets: LinearTicket[]): string {
  if (tickets.length === 0) {
    return "No tickets found.";
  }

  return tickets
    .map(
      (t) =>
        `- **${t.identifier}**: ${t.title} [${t.status.name}] ${t.assignee ? `(@${t.assignee.name})` : ""}`
    )
    .join("\n");
}

function formatUserList(users: LinearUser[]): string {
  if (users.length === 0) {
    return "No users found.";
  }

  return users
    .map(
      (u) =>
        `- **${u.name}** (${u.email}) - ID: \`${u.id}\` ${u.active ? "" : "[inactive]"}`
    )
    .join("\n");
}

export function registerLinearTools(api: any, config: PluginConfig): void {
  const client = new LinearClient(config);

  // linear_create_ticket
  api.registerTool(
    {
      name: "linear_create_ticket",
      description:
        "Create a new ticket/issue in Linear. Returns the created ticket's identifier and URL.",
      inputSchema: Type.Object({
        title: Type.String({ description: "Title of the ticket" }),
        projectKey: Type.String({
          description: "Team key (e.g., 'ENG', 'PRD')",
        }),
        description: Type.Optional(
          Type.String({ description: "Detailed description of the ticket" })
        ),
        assigneeId: Type.Optional(
          Type.String({ description: "User ID to assign the ticket to" })
        ),
      }),
    },
    async (params: {
      title: string;
      projectKey: string;
      description?: string;
      assigneeId?: string;
    }): Promise<ToolResponse> => {
      try {
        // Get team ID from team key
        const teams = await client.getTeams();
        const team = teams.find(
          (t) => t.key.toLowerCase() === params.projectKey.toLowerCase()
        );

        if (!team) {
          return textResponse(
            `Team with key "${params.projectKey}" not found. Available teams: ${teams.map((t) => t.key).join(", ")}`
          );
        }

        const ticket = await client.createTicket({
          title: params.title,
          teamId: team.id,
          description: params.description,
          assigneeId: params.assigneeId,
        });

        return textResponse(
          `Created ticket **${ticket.identifier}**\n\nURL: ${ticket.url}`
        );
      } catch (error) {
        return textResponse(
          `Failed to create ticket: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    { optional: true }
  );

  // linear_read_ticket
  api.registerTool(
    {
      name: "linear_read_ticket",
      description:
        "Get full details of a Linear ticket by its identifier (e.g., 'PRJ-123').",
      inputSchema: Type.Object({
        identifier: Type.String({
          description: "Ticket identifier (e.g., 'PRJ-123')",
        }),
      }),
    },
    async (params: { identifier: string }): Promise<ToolResponse> => {
      try {
        const ticket = await client.getTicket(params.identifier);
        return textResponse(formatTicket(ticket));
      } catch (error) {
        return textResponse(
          `Failed to get ticket: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    { optional: true }
  );

  // linear_update_ticket
  api.registerTool(
    {
      name: "linear_update_ticket",
      description:
        "Update an existing Linear ticket. All fields except identifier are optional.",
      inputSchema: Type.Object({
        identifier: Type.String({
          description: "Ticket identifier (e.g., 'PRJ-123')",
        }),
        title: Type.Optional(Type.String({ description: "New title" })),
        description: Type.Optional(
          Type.String({ description: "New description" })
        ),
        status: Type.Optional(
          Type.String({ description: "New status name (e.g., 'In Progress')" })
        ),
        priority: Type.Optional(
          Type.Number({
            description: "Priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)",
            minimum: 0,
            maximum: 4,
          })
        ),
      }),
    },
    async (params: {
      identifier: string;
      title?: string;
      description?: string;
      status?: string;
      priority?: number;
    }): Promise<ToolResponse> => {
      try {
        const updates: any = {};

        if (params.title) updates.title = params.title;
        if (params.description) updates.description = params.description;
        if (params.priority !== undefined) updates.priority = params.priority;

        // If status is provided, we need to find the state ID
        if (params.status) {
          const ticket = await client.getTicket(params.identifier);
          // Get team from identifier (first part before dash)
          const teamKey = params.identifier.split("-")[0];
          const teams = await client.getTeams();
          const team = teams.find(
            (t) => t.key.toLowerCase() === teamKey.toLowerCase()
          );

          if (team) {
            const states = await client.getWorkflowStates(team.id);
            const state = states.find(
              (s) => s.name.toLowerCase() === params.status!.toLowerCase()
            );
            if (state) {
              updates.stateId = state.id;
            } else {
              return textResponse(
                `Status "${params.status}" not found. Available statuses: ${states.map((s) => s.name).join(", ")}`
              );
            }
          }
        }

        const ticket = await client.updateTicket(params.identifier, updates);
        return textResponse(`Updated ticket:\n\n${formatTicket(ticket)}`);
      } catch (error) {
        return textResponse(
          `Failed to update ticket: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    { optional: true }
  );

  // linear_assign_ticket
  api.registerTool(
    {
      name: "linear_assign_ticket",
      description: "Assign a Linear ticket to a specific user.",
      inputSchema: Type.Object({
        identifier: Type.String({
          description: "Ticket identifier (e.g., 'PRJ-123')",
        }),
        userId: Type.String({
          description: "User ID to assign the ticket to",
        }),
      }),
    },
    async (params: {
      identifier: string;
      userId: string;
    }): Promise<ToolResponse> => {
      try {
        const ticket = await client.assignTicket(
          params.identifier,
          params.userId
        );
        return textResponse(
          `Assigned **${ticket.identifier}** to ${ticket.assignee?.name || "user"}`
        );
      } catch (error) {
        return textResponse(
          `Failed to assign ticket: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    { optional: true }
  );

  // linear_list_tickets
  api.registerTool(
    {
      name: "linear_list_tickets",
      description:
        "List tickets in a Linear team/project, optionally filtered by status.",
      inputSchema: Type.Object({
        projectKey: Type.String({
          description: "Team key (e.g., 'ENG', 'PRD')",
        }),
        status: Type.Optional(
          Type.String({ description: "Filter by status name" })
        ),
        limit: Type.Optional(
          Type.Number({
            description: "Maximum number of tickets to return (default: 50)",
            minimum: 1,
            maximum: 100,
          })
        ),
      }),
    },
    async (params: {
      projectKey: string;
      status?: string;
      limit?: number;
    }): Promise<ToolResponse> => {
      try {
        const tickets = await client.listTickets(
          params.projectKey,
          params.status,
          params.limit || 50
        );
        return textResponse(
          `**Tickets in ${params.projectKey}${params.status ? ` (${params.status})` : ""}:**\n\n${formatTicketList(tickets)}`
        );
      } catch (error) {
        return textResponse(
          `Failed to list tickets: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    { optional: true }
  );

  // linear_get_users
  api.registerTool(
    {
      name: "linear_get_users",
      description:
        "Get a list of all users in the Linear workspace. Useful for finding user IDs for assignment.",
      inputSchema: Type.Object({}),
    },
    async (): Promise<ToolResponse> => {
      try {
        const users = await client.getUsers();
        return textResponse(`**Linear Users:**\n\n${formatUserList(users)}`);
      } catch (error) {
        return textResponse(
          `Failed to get users: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    { optional: true }
  );
}
