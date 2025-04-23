import { z } from 'zod';
import axios from 'axios';
/**
 * Register Confluence tools with the MCP server
 */
export function registerConfluenceTools(server, config) {
    // Check if Atlassian configuration is available
    if (!config.atlassianHost || !config.atlassianEmail || !config.atlassianToken) {
        console.warn('Atlassian configuration missing, Confluence tools will not be available');
        return;
    }
    // Create Confluence API client
    const confluenceClient = createConfluenceClient(config);
    // Register Confluence tools
    registerConfluenceSearch(server, confluenceClient);
    registerConfluenceGetPage(server, confluenceClient);
    registerConfluenceCreatePage(server, confluenceClient);
    registerConfluenceUpdatePage(server, confluenceClient);
}
/**
 * Create a Confluence API client
 */
function createConfluenceClient(config) {
    const baseURL = `${config.atlassianHost}/wiki/rest/api`;
    // Create Axios instance with authentication
    const client = axios.create({
        baseURL,
        auth: {
            username: config.atlassianEmail || '',
            password: config.atlassianToken || '',
        },
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return {
        /**
         * Search Confluence content
         */
        search: async (cql, limit = 10) => {
            const response = await client.get('/content/search', {
                params: {
                    cql,
                    limit,
                    expand: 'space,version,metadata.labels,ancestors',
                },
            });
            return response.data;
        },
        /**
         * Get Confluence page content
         */
        getPage: async (pageId) => {
            const response = await client.get(`/content/${pageId}`, {
                params: {
                    expand: 'space,version,body.storage,ancestors,children.page,metadata.labels',
                },
            });
            return response.data;
        },
        /**
         * Create a new Confluence page
         */
        createPage: async (spaceKey, title, content, parentId) => {
            const bodyData = {
                type: 'page',
                title,
                space: { key: spaceKey },
                body: {
                    storage: {
                        value: content,
                        representation: 'storage',
                    },
                },
            };
            if (parentId) {
                bodyData.ancestors = [{ id: parentId }];
            }
            const response = await client.post('/content', bodyData);
            return response.data;
        },
        /**
         * Update an existing Confluence page
         */
        updatePage: async (pageId, title, content, version) => {
            const response = await client.put(`/content/${pageId}`, {
                type: 'page',
                title,
                version: { number: version + 1 },
                body: {
                    storage: {
                        value: content,
                        representation: 'storage',
                    },
                },
            });
            return response.data;
        },
    };
}
/**
 * Register the confluence_search tool
 */
function registerConfluenceSearch(server, confluenceClient) {
    server.registerTool({
        name: 'confluence_search',
        description: 'Search Confluence',
        parameters: z.object({
            query: z.string().describe('The CQL search query'),
            limit: z.number().optional().describe('Maximum number of results to return'),
        }),
        handler: async ({ query, limit = 10 }) => {
            try {
                const results = await confluenceClient.search(query, limit);
                return { results };
            }
            catch (error) {
                return { error: `Failed to search Confluence: ${error.message}` };
            }
        },
    });
}
/**
 * Register the confluence_get_page tool
 */
function registerConfluenceGetPage(server, confluenceClient) {
    server.registerTool({
        name: 'confluence_get_page',
        description: 'Get Confluence page content',
        parameters: z.object({
            pageId: z.string().describe('The ID of the Confluence page to retrieve'),
        }),
        handler: async ({ pageId }) => {
            try {
                const page = await confluenceClient.getPage(pageId);
                return { page };
            }
            catch (error) {
                return { error: `Failed to get Confluence page: ${error.message}` };
            }
        },
    });
}
/**
 * Register the confluence_create_page tool
 */
function registerConfluenceCreatePage(server, confluenceClient) {
    server.registerTool({
        name: 'confluence_create_page',
        description: 'Create a new Confluence page',
        parameters: z.object({
            spaceKey: z.string().describe('The key of the space where the page should be created'),
            title: z.string().describe('The title of the page'),
            content: z.string().describe('The content of the page in Confluence storage format'),
            parentId: z.string().optional().describe('ID of the parent page, if creating a child page'),
        }),
        handler: async ({ spaceKey, title, content, parentId }) => {
            try {
                const page = await confluenceClient.createPage(spaceKey, title, content, parentId);
                return {
                    page,
                    url: `${page._links.base}${page._links.webui}`,
                };
            }
            catch (error) {
                return { error: `Failed to create Confluence page: ${error.message}` };
            }
        },
    });
}
/**
 * Register the confluence_update_page tool
 */
function registerConfluenceUpdatePage(server, confluenceClient) {
    server.registerTool({
        name: 'confluence_update_page',
        description: 'Update an existing Confluence page',
        parameters: z.object({
            pageId: z.string().describe('The ID of the page to update'),
            title: z.string().describe('The new title of the page'),
            content: z.string().describe('The new content of the page in Confluence storage format'),
            version: z.number().describe('Current version number of the page'),
        }),
        handler: async ({ pageId, title, content, version }) => {
            try {
                const page = await confluenceClient.updatePage(pageId, title, content, version);
                return {
                    page,
                    url: `${page._links.base}${page._links.webui}`,
                };
            }
            catch (error) {
                return { error: `Failed to update Confluence page: ${error.message}` };
            }
        },
    });
}
