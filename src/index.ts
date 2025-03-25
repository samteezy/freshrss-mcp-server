#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import crypto from 'crypto';

// FreshRSS API client class
class FreshRSSClient {
  private apiUrl: string;
  private username: string;
  private password: string;
  private apiKey: string | null = null;

  constructor(apiUrl: string, username: string, password: string) {
    this.apiUrl = apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.username = username;
    this.password = password;
    // Generate API key for Fever API using MD5(username:password)
    this.apiKey = crypto.createHash('md5').update(`${username}:${password}`).digest('hex');
  }

  private async request<T>(endpoint: string = '', method: string = 'GET', data: any = {}): Promise<T> {
    try {
      // The Fever API requires a POST request with api_key for authentication
      // even for GET-like operations
      const requestData = new URLSearchParams({
        api_key: this.apiKey,
        ...data
      });

      const response = await axios({
        method: 'POST', // Always use POST for Fever API
        url: `${this.apiUrl}/api/fever.php`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: requestData,
      });

      if (!response.data?.api_version) {
        throw new Error('Invalid API response');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new McpError(
          ErrorCode.InternalError,
          `FreshRSS API error: ${error.response?.data?.error || error.message}`
        );
      }
      throw error;
    }
  }

  // Get feed subscriptions
  async getSubscriptions() {
    return this.request('', 'GET', { feeds: '' });
  }

  // Get feed groups
  async getFeedGroups() {
    return this.request('', 'GET', { groups: '' });
  }

  // Get unread items
  async getUnreadItems(limit: number = 50) {
    return this.request('', 'GET', { 
      items: '',
      with_ids: '0',
      unread_only: '1',
      max: limit
    });
  }

  // Get feed items
  async getFeedItems(feedId: string, limit: number = 50) {
    return this.request('', 'GET', {
      items: '',
      feed_id: feedId,
      max: limit
    });
  }

  // Mark item as read
  async markAsRead(itemId: string) {
    return this.request('', 'POST', {
      mark: 'item',
      id: itemId,
      as: 'read'
    });
  }

  // Mark item as unread
  async markAsUnread(itemId: string) {
    return this.request('', 'POST', {
      mark: 'item',
      id: itemId,
      as: 'unread'
    });
  }

  // Mark all items in a feed as read
  async markFeedAsRead(feedId: string) {
    return this.request('', 'POST', {
      mark: 'feed',
      id: feedId,
      as: 'read',
      before: Math.floor(Date.now() / 1000)
    });
  }

  // Get specific items by IDs
  async getItems(itemIds: string[]) {
    return this.request('', 'GET', {
      items: '',
      with_ids: itemIds.join(',')
    });
  }
}

// Initialize server
const apiUrl = process.env.FRESHRSS_API_URL;
const username = process.env.FRESHRSS_USERNAME;
const password = process.env.FRESHRSS_PASSWORD;

if (!apiUrl || !username || !password) {
  throw new Error('FRESHRSS_API_URL, FRESHRSS_USERNAME, and FRESHRSS_PASSWORD environment variables are required');
}

const client = new FreshRSSClient(apiUrl, username, password);

const server = new Server(
  {
    name: "freshrss-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_feeds",
      description: "List all feed subscriptions",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_feed_groups",
      description: "Get feed groups",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_unread",
      description: "Get unread items",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of items to return (default: 50)",
          },
        },
      },
    },
    {
      name: "get_feed_items",
      description: "Get items from a specific feed",
      inputSchema: {
        type: "object",
        properties: {
          feed_id: {
            type: "string",
            description: "Feed ID",
          },
          limit: {
            type: "number",
            description: "Maximum number of items to return (default: 50)",
          },
        },
        required: ["feed_id"],
      },
    },
    {
      name: "mark_item_read",
      description: "Mark an item as read",
      inputSchema: {
        type: "object",
        properties: {
          item_id: {
            type: "string",
            description: "Item ID to mark as read",
          },
        },
        required: ["item_id"],
      },
    },
    {
      name: "mark_item_unread",
      description: "Mark an item as unread",
      inputSchema: {
        type: "object",
        properties: {
          item_id: {
            type: "string",
            description: "Item ID to mark as unread",
          },
        },
        required: ["item_id"],
      },
    },
    {
      name: "mark_feed_read",
      description: "Mark all items in a feed as read",
      inputSchema: {
        type: "object",
        properties: {
          feed_id: {
            type: "string",
            description: "Feed ID to mark as read",
          },
        },
        required: ["feed_id"],
      },
    },
    {
      name: "get_items",
      description: "Get specific items by their IDs",
      inputSchema: {
        type: "object",
        properties: {
          item_ids: {
            type: "array",
            items: {
              type: "string",
            },
            description: "Array of item IDs to get",
          },
        },
        required: ["item_ids"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "list_feeds": {
        const response = await client.getSubscriptions();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(response, null, 2),
          }],
        };
      }

      case "get_feed_groups": {
        const response = await client.getFeedGroups();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(response, null, 2),
          }],
        };
      }

      case "get_unread": {
        const { limit } = request.params.arguments as { limit?: number };
        const items = await client.getUnreadItems(limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(items, null, 2),
          }],
        };
      }

      case "get_feed_items": {
        const { feed_id, limit } = request.params.arguments as { feed_id: string; limit?: number };
        const items = await client.getFeedItems(feed_id, limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(items, null, 2),
          }],
        };
      }

      case "mark_item_read": {
        const { item_id } = request.params.arguments as { item_id: string };
        await client.markAsRead(item_id);
        return {
          content: [{
            type: "text",
            text: `Successfully marked item ${item_id} as read`,
          }],
        };
      }

      case "mark_item_unread": {
        const { item_id } = request.params.arguments as { item_id: string };
        await client.markAsUnread(item_id);
        return {
          content: [{
            type: "text",
            text: `Successfully marked item ${item_id} as unread`,
          }],
        };
      }

      case "mark_feed_read": {
        const { feed_id } = request.params.arguments as { feed_id: string };
        await client.markFeedAsRead(feed_id);
        return {
          content: [{
            type: "text",
            text: `Successfully marked all items in feed ${feed_id} as read`,
          }],
        };
      }

      case "get_items": {
        const { item_ids } = request.params.arguments as { item_ids: string[] };
        const items = await client.getItems(item_ids);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(items, null, 2),
          }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InternalError, String(error));
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FreshRSS MCP server running on stdio');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
