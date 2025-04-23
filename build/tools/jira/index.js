import { z } from 'zod';
import JiraClient from '@atlassian/jira-client';
/**
 * Register Jira tools with the MCP server
 */
export function registerJiraTools(server, config) {
    // Check if Atlassian configuration is available
    if (!config.atlassianHost || !config.atlassianEmail || !config.atlassianToken) {
        console.warn('Atlassian configuration missing, Jira tools will not be available');
        return;
    }
    // Create Jira client
    const jira = new JiraClient({
        protocol: 'https',
        host: config.atlassianHost.replace('https://', ''),
        username: config.atlassianEmail,
        password: config.atlassianToken,
        apiVersion: '2',
        strictSSL: true,
    });
    // Register Jira tools
    registerGetIssue(server, jira);
    registerSearchIssue(server, jira);
    registerListSprints(server, jira);
    registerCreateIssue(server, jira);
    registerUpdateIssue(server, jira);
    registerListStatuses(server, jira);
    registerTransitionIssue(server, jira);
}
/**
 * Register the jira_get_issue tool
 */
function registerGetIssue(server, jira) {
    server.registerTool({
        name: 'jira_get_issue',
        description: 'Retrieve detailed information about a specific Jira issue including its status, assignee, description, subtasks, and available transitions',
        parameters: z.object({
            issueKey: z.string().describe('The Jira issue key (e.g., PROJ-123)'),
        }),
        handler: async ({ issueKey }) => {
            try {
                const issue = await jira.findIssue(issueKey, 'summary,status,assignee,description,subtasks,transitions');
                return { issue };
            }
            catch (error) {
                return { error: `Failed to get issue: ${error.message}` };
            }
        },
    });
}
/**
 * Register the jira_search_issue tool
 */
function registerSearchIssue(server, jira) {
    server.registerTool({
        name: 'jira_search_issue',
        description: 'Search for Jira issues using JQL (Jira Query Language). Returns key details like summary, status, assignee, and priority for matching issues',
        parameters: z.object({
            jql: z.string().describe('JQL search query (e.g., "project = PROJ AND status = Open")'),
            maxResults: z.number().optional().describe('Maximum number of results to return (default: 50)'),
        }),
        handler: async ({ jql, maxResults = 50 }) => {
            try {
                const results = await jira.searchJira(jql, {
                    maxResults,
                    fields: ['summary', 'status', 'assignee', 'priority'],
                });
                return { issues: results.issues };
            }
            catch (error) {
                return { error: `Failed to search issues: ${error.message}` };
            }
        },
    });
}
/**
 * Register the jira_list_sprints tool
 */
function registerListSprints(server, jira) {
    server.registerTool({
        name: 'jira_list_sprints',
        description: 'List all active and future sprints for a specific Jira board, including sprint IDs, names, states, and dates',
        parameters: z.object({
            boardId: z.number().describe('The Jira board ID'),
            state: z.string().optional().describe('Filter by sprint state (active, future, closed)'),
        }),
        handler: async ({ boardId, state }) => {
            try {
                const url = state
                    ? `/rest/agile/1.0/board/${boardId}/sprint?state=${state}`
                    : `/rest/agile/1.0/board/${boardId}/sprint`;
                const sprints = await jira.doRequest({
                    method: 'GET',
                    uri: url,
                });
                return { sprints: sprints.values };
            }
            catch (error) {
                return { error: `Failed to list sprints: ${error.message}` };
            }
        },
    });
}
/**
 * Register the jira_create_issue tool
 */
function registerCreateIssue(server, jira) {
    server.registerTool({
        name: 'jira_create_issue',
        description: 'Create a new Jira issue with specified details. Returns the created issue\'s key, ID, and URL',
        parameters: z.object({
            projectKey: z.string().describe('The project key (e.g., PROJ)'),
            issueType: z.string().describe('The issue type (e.g., Bug, Task, Story)'),
            summary: z.string().describe('Issue summary/title'),
            description: z.string().optional().describe('Detailed description of the issue'),
            assignee: z.string().optional().describe('Username of the assignee'),
            priority: z.string().optional().describe('Priority level'),
            labels: z.array(z.string()).optional().describe('Labels to apply to the issue'),
            customFields: z.record(z.any()).optional().describe('Custom field values as key-value pairs'),
        }),
        handler: async ({ projectKey, issueType, summary, description, assignee, priority, labels, customFields }) => {
            try {
                const issueData = {
                    fields: {
                        project: { key: projectKey },
                        issuetype: { name: issueType },
                        summary,
                    },
                };
                if (description)
                    issueData.fields.description = description;
                if (assignee)
                    issueData.fields.assignee = { name: assignee };
                if (priority)
                    issueData.fields.priority = { name: priority };
                if (labels)
                    issueData.fields.labels = labels;
                if (customFields) {
                    Object.entries(customFields).forEach(([key, value]) => {
                        issueData.fields[key] = value;
                    });
                }
                const issue = await jira.addNewIssue(issueData);
                return {
                    key: issue.key,
                    id: issue.id,
                    url: `${jira.protocol}://${jira.host}/browse/${issue.key}`,
                };
            }
            catch (error) {
                return { error: `Failed to create issue: ${error.message}` };
            }
        },
    });
}
/**
 * Register the jira_update_issue tool
 */
function registerUpdateIssue(server, jira) {
    server.registerTool({
        name: 'jira_update_issue',
        description: 'Modify an existing Jira issue\'s details. Supports partial updates - only specified fields will be changed',
        parameters: z.object({
            issueKey: z.string().describe('The Jira issue key (e.g., PROJ-123)'),
            summary: z.string().optional().describe('New issue summary/title'),
            description: z.string().optional().describe('New detailed description'),
            assignee: z.string().optional().describe('Username of the new assignee'),
            priority: z.string().optional().describe('New priority level'),
            labels: z.array(z.string()).optional().describe('New labels (replaces existing labels)'),
            customFields: z.record(z.any()).optional().describe('Custom field values to update'),
        }),
        handler: async ({ issueKey, summary, description, assignee, priority, labels, customFields }) => {
            try {
                const issueData = {
                    fields: {},
                };
                if (summary)
                    issueData.fields.summary = summary;
                if (description)
                    issueData.fields.description = description;
                if (assignee !== undefined) {
                    issueData.fields.assignee = assignee ? { name: assignee } : null;
                }
                if (priority)
                    issueData.fields.priority = { name: priority };
                if (labels)
                    issueData.fields.labels = labels;
                if (customFields) {
                    Object.entries(customFields).forEach(([key, value]) => {
                        issueData.fields[key] = value;
                    });
                }
                await jira.updateIssue(issueKey, issueData);
                return { success: true, issueKey };
            }
            catch (error) {
                return { error: `Failed to update issue: ${error.message}` };
            }
        },
    });
}
/**
 * Register the jira_list_statuses tool
 */
function registerListStatuses(server, jira) {
    server.registerTool({
        name: 'jira_list_statuses',
        description: 'Retrieve all available issue status IDs and their names for a specific Jira project',
        parameters: z.object({
            projectKey: z.string().describe('The project key (e.g., PROJ)'),
        }),
        handler: async ({ projectKey }) => {
            try {
                const statuses = await jira.listStatus();
                return { statuses };
            }
            catch (error) {
                return { error: `Failed to list statuses: ${error.message}` };
            }
        },
    });
}
/**
 * Register the jira_transition_issue tool
 */
function registerTransitionIssue(server, jira) {
    server.registerTool({
        name: 'jira_transition_issue',
        description: 'Transition an issue through its workflow using a valid transition ID. Get available transitions from jira_get_issue',
        parameters: z.object({
            issueKey: z.string().describe('The Jira issue key (e.g., PROJ-123)'),
            transitionId: z.string().describe('ID of the transition to perform'),
            comment: z.string().optional().describe('Comment to add during the transition'),
            resolution: z.string().optional().describe('Resolution to set if transitioning to Resolved/Closed'),
        }),
        handler: async ({ issueKey, transitionId, comment, resolution }) => {
            try {
                const transitionData = {
                    transition: { id: transitionId },
                };
                if (comment) {
                    transitionData.update = {
                        comment: [
                            {
                                add: { body: comment },
                            },
                        ],
                    };
                }
                if (resolution) {
                    transitionData.fields = {
                        resolution: { name: resolution },
                    };
                }
                await jira.transitionIssue(issueKey, transitionData);
                return { success: true };
            }
            catch (error) {
                return { error: `Failed to transition issue: ${error.message}` };
            }
        },
    });
}
