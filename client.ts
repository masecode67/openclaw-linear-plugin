import { GraphQLClient } from "graphql-request";
import type {
  LinearTicket,
  LinearUser,
  PluginConfig,
  TicketUpdateInput,
  CreateTicketInput,
} from "./types.js";

const LINEAR_API_URL = "https://api.linear.app/graphql";

export class LinearClient {
  private client: GraphQLClient;

  constructor(config: PluginConfig) {
    this.client = new GraphQLClient(LINEAR_API_URL, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    });
  }

  async createTicket(input: CreateTicketInput): Promise<LinearTicket> {
    const mutation = `
      mutation CreateIssue($title: String!, $teamId: String!, $description: String, $assigneeId: String) {
        issueCreate(input: {
          title: $title
          teamId: $teamId
          description: $description
          assigneeId: $assigneeId
        }) {
          success
          issue {
            id
            identifier
            title
            description
            url
            priority
            priorityLabel
            state {
              id
              name
            }
            assignee {
              id
              name
              email
              active
            }
          }
        }
      }
    `;

    const result = await this.client.request<{
      issueCreate: { success: boolean; issue: any };
    }>(mutation, input);

    if (!result.issueCreate.success) {
      throw new Error("Failed to create ticket");
    }

    return this.mapIssue(result.issueCreate.issue);
  }

  async getTicket(identifier: string): Promise<LinearTicket> {
    const query = `
      query GetIssue($identifier: String!) {
        issue(id: $identifier) {
          id
          identifier
          title
          description
          url
          priority
          priorityLabel
          state {
            id
            name
          }
          assignee {
            id
            name
            email
            active
          }
        }
      }
    `;

    // Try by identifier first (e.g., "PRJ-123")
    try {
      const result = await this.client.request<{ issue: any }>(query, {
        identifier,
      });
      return this.mapIssue(result.issue);
    } catch {
      // If that fails, try searching by identifier
      const searchQuery = `
        query SearchIssue($filter: IssueFilter) {
          issues(filter: $filter, first: 1) {
            nodes {
              id
              identifier
              title
              description
              url
              priority
              priorityLabel
              state {
                id
                name
              }
              assignee {
                id
                name
                email
                active
              }
            }
          }
        }
      `;

      const searchResult = await this.client.request<{
        issues: { nodes: any[] };
      }>(searchQuery, {
        filter: { identifier: { eq: identifier } },
      });

      if (searchResult.issues.nodes.length === 0) {
        throw new Error(`Ticket ${identifier} not found`);
      }

      return this.mapIssue(searchResult.issues.nodes[0]);
    }
  }

  async updateTicket(
    identifier: string,
    updates: TicketUpdateInput
  ): Promise<LinearTicket> {
    // First get the issue ID from identifier
    const ticket = await this.getTicket(identifier);

    const mutation = `
      mutation UpdateIssue($id: String!, $title: String, $description: String, $stateId: String, $priority: Int, $assigneeId: String) {
        issueUpdate(id: $id, input: {
          title: $title
          description: $description
          stateId: $stateId
          priority: $priority
          assigneeId: $assigneeId
        }) {
          success
          issue {
            id
            identifier
            title
            description
            url
            priority
            priorityLabel
            state {
              id
              name
            }
            assignee {
              id
              name
              email
              active
            }
          }
        }
      }
    `;

    const result = await this.client.request<{
      issueUpdate: { success: boolean; issue: any };
    }>(mutation, {
      id: ticket.id,
      ...updates,
    });

    if (!result.issueUpdate.success) {
      throw new Error("Failed to update ticket");
    }

    return this.mapIssue(result.issueUpdate.issue);
  }

  async assignTicket(identifier: string, userId: string): Promise<LinearTicket> {
    return this.updateTicket(identifier, { assigneeId: userId });
  }

  async listTickets(
    teamKey: string,
    status?: string,
    limit: number = 50
  ): Promise<LinearTicket[]> {
    const query = `
      query ListIssues($teamKey: String!, $status: String, $limit: Int!) {
        issues(
          filter: {
            team: { key: { eq: $teamKey } }
            ${status ? 'state: { name: { eq: $status } }' : ''}
          }
          first: $limit
          orderBy: updatedAt
        ) {
          nodes {
            id
            identifier
            title
            description
            url
            priority
            priorityLabel
            state {
              id
              name
            }
            assignee {
              id
              name
              email
              active
            }
          }
        }
      }
    `;

    // Build filter dynamically
    const filter: any = {
      team: { key: { eq: teamKey } },
    };
    if (status) {
      filter.state = { name: { eq: status } };
    }

    const dynamicQuery = `
      query ListIssues($filter: IssueFilter, $limit: Int!) {
        issues(filter: $filter, first: $limit, orderBy: updatedAt) {
          nodes {
            id
            identifier
            title
            description
            url
            priority
            priorityLabel
            state {
              id
              name
            }
            assignee {
              id
              name
              email
              active
            }
          }
        }
      }
    `;

    const result = await this.client.request<{ issues: { nodes: any[] } }>(
      dynamicQuery,
      { filter, limit }
    );

    return result.issues.nodes.map((issue) => this.mapIssue(issue));
  }

  async getUsers(): Promise<LinearUser[]> {
    const query = `
      query GetUsers {
        users {
          nodes {
            id
            name
            email
            active
          }
        }
      }
    `;

    const result = await this.client.request<{ users: { nodes: any[] } }>(query);

    return result.users.nodes.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
    }));
  }

  async getTeams(): Promise<{ id: string; key: string; name: string }[]> {
    const query = `
      query GetTeams {
        teams {
          nodes {
            id
            key
            name
          }
        }
      }
    `;

    const result = await this.client.request<{ teams: { nodes: any[] } }>(query);
    return result.teams.nodes;
  }

  async getWorkflowStates(
    teamId: string
  ): Promise<{ id: string; name: string }[]> {
    const query = `
      query GetStates($teamId: String!) {
        team(id: $teamId) {
          states {
            nodes {
              id
              name
            }
          }
        }
      }
    `;

    const result = await this.client.request<{
      team: { states: { nodes: any[] } };
    }>(query, { teamId });

    return result.team.states.nodes;
  }

  private mapIssue(issue: any): LinearTicket {
    return {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      status: {
        id: issue.state.id,
        name: issue.state.name,
      },
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      assignee: issue.assignee
        ? {
            id: issue.assignee.id,
            name: issue.assignee.name,
            email: issue.assignee.email,
            active: issue.assignee.active,
          }
        : null,
      url: issue.url,
    };
  }
}
