export interface LinearTicket {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  status: {
    id: string;
    name: string;
  };
  priority: number;
  priorityLabel: string;
  assignee: LinearUser | null;
  url: string;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
}

export interface PluginConfig {
  apiKey: string;
}

export interface TicketUpdateInput {
  title?: string;
  description?: string;
  stateId?: string;
  priority?: number;
  assigneeId?: string;
}

export interface CreateTicketInput {
  title: string;
  teamId: string;
  description?: string;
  assigneeId?: string;
}
