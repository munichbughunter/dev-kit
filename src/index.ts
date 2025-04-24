#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Gitlab } from '@gitbeaker/rest';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import fs from 'fs';

import axios from 'axios';
import { 
    AddMergeRequestDiffCommentSchema,
    CreateBranchOptionsSchema, 
    CreateBranchSchema, 
    CreateIssueLinkSchema, 
    CreateIssueOptionsSchema, 
    CreateIssueSchema, 
    CreateLabelSchema, 
    CreateMergeRequestOptionsSchema, 
    CreateMergeRequestSchema, 
    CreateNoteSchema, 
    CreateOrUpdateFileSchema, 
    CreateRepositoryOptionsSchema, 
    CreateRepositorySchema, 
    DeleteIssueLinkSchema, 
    DeleteIssueSchema, 
    DeleteLabelSchema, 
    FileOperation, 
    ForkRepositorySchema, 
    GetFileContentsSchema, 
    GetIssueLinkSchema, 
    GetIssueSchema, 
    GetLabelSchema, 
    GetMergeRequestCommentsSchema, 
    GetMergeRequestDiffsSchema, 
    GetMergeRequestSchema, 
    GetNamespaceSchema, 
    GetProjectSchema, 
    GitLabCommit, 
    GitLabCommitSchema, 
    GitLabContent, 
    GitLabContentSchema, 
    GitLabCreateUpdateFileResponse, 
    GitLabCreateUpdateFileResponseSchema, 
    GitLabDiscussion, 
    GitLabDiscussionNote, 
    GitLabDiscussionNoteSchema, 
    GitLabDiscussionSchema, 
    GitLabFork, 
    GitLabForkSchema, 
    GitLabIssueLinkSchema, 
    GitLabIssueSchema, 
    GitLabIssueWithLinkDetailsSchema, 
    GitLabLabel, 
    GitLabMergeRequest, 
    GitLabMergeRequestDiff, 
    GitLabMergeRequestDiffSchema, 
    GitLabMergeRequestSchema, 
    GitLabNamespace, 
    GitLabNamespaceExistsResponse, 
    GitLabNamespaceExistsResponseSchema, 
    GitLabNamespaceSchema, 
    GitLabProject, 
    GitLabProjectSchema, 
    GitLabReferenceSchema, 
    GitLabRepository, 
    GitLabRepositorySchema, 
    GitLabSearchResponse, 
    GitLabSearchResponseSchema, 
    GitLabTree, 
    GitLabTreeSchema, 
    ListGroupProjectsSchema, 
    ListIssueLinksSchema, 
    ListIssuesSchema, 
    ListLabelsSchema, 
    ListMergeRequestDiscussionsSchema, 
    ListNamespacesSchema, 
    ListOpenMergeRequestsSchema, 
    ListProjectsSchema, 
    PushFilesSchema, 
    SearchRepositoriesSchema,
    UpdateIssueSchema, 
    UpdateLabelSchema, 
    UpdateMergeRequestNoteSchema, 
    UpdateMergeRequestSchema, 
    VerifyNamespaceSchema 
} from './schema.js';

/**
 * Read version from package.json
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = path.resolve(__dirname, '../package.json');
let SERVER_VERSION = 'unknown';
try {
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        SERVER_VERSION = packageJson.version || SERVER_VERSION;
    }
} catch (error) {
    console.error('Warning: Could not read version from package.json:', error);
}

const server = new Server(
    {
        name: 'dev-kit-gitlab-mcp-server',
        version: SERVER_VERSION,
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

const { GITLAB_PERSONAL_ACCESS_TOKEN } = process.env;
const GITLAB_READ_ONLY_MODE = process.env.GITLAB_READ_ONLY_MODE === 'true';

// Define all available tools
const allTools = [
    {
        name: 'create_or_update_file',
        description: 'Create or update a file in a GitLab repository',
        inputSchema: zodToJsonSchema(CreateOrUpdateFileSchema),
    },
    {
        name: 'search_repositories',
        description: 'Search for GitLab projects',
        inputSchema: zodToJsonSchema(SearchRepositoriesSchema),
    },
    {
        name: 'create_repository',
        description: 'Create a new GitLab project',
        inputSchema: zodToJsonSchema(CreateRepositorySchema),
    },
    {
        name: 'get_file_contents',
        description: 'Get the contents of a file or directory from a GitLab project',
        inputSchema: zodToJsonSchema(GetFileContentsSchema),
    },
    {
        name: 'push_files',
        description: 'Push multiple files to a GitLab project in a single commit',
        inputSchema: zodToJsonSchema(PushFilesSchema),
    },
    {
        name: 'create_issue',
        description: 'Create a new issue in a GitLab project',
        inputSchema: zodToJsonSchema(CreateIssueSchema),
    },
    {
        name: 'create_merge_request',
        description: 'Create a new merge request in a GitLab project',
        inputSchema: zodToJsonSchema(CreateMergeRequestSchema),
    },
    {
        name: 'fork_repository',
        description: 'Fork a GitLab project to your account or specified namespace',
        inputSchema: zodToJsonSchema(ForkRepositorySchema),
    },
    {
        name: 'create_branch',
        description: 'Create a new branch in a GitLab project',
        inputSchema: zodToJsonSchema(CreateBranchSchema),
    },
    {
        name: 'get_merge_request',
        description: 'Get details of a merge request',
        inputSchema: zodToJsonSchema(GetMergeRequestSchema),
    },
    {
        name: 'get_merge_request_diffs',
        description: 'Get the changes/diffs of a merge request',
        inputSchema: zodToJsonSchema(GetMergeRequestDiffsSchema),
    },
    {
        name: 'update_merge_request',
        description: 'Update a merge request',
        inputSchema: zodToJsonSchema(UpdateMergeRequestSchema),
    },
    {
        name: 'create_note',
        description: 'Create a new note (comment) to an issue or merge request',
        inputSchema: zodToJsonSchema(CreateNoteSchema),
    },
    {
        name: 'list_merge_request_discussions',
        description: 'List discussion items for a merge request',
        inputSchema: zodToJsonSchema(ListMergeRequestDiscussionsSchema),
    },
    {
        name: 'update_merge_request_note',
        description: 'Modify an existing merge request thread note',
        inputSchema: zodToJsonSchema(UpdateMergeRequestNoteSchema),
    },
    {
        name: 'list_issues',
        description: 'List issues in a GitLab project with filtering options',
        inputSchema: zodToJsonSchema(ListIssuesSchema),
    },
    {
        name: 'get_issue',
        description: 'Get details of a specific issue in a GitLab project',
        inputSchema: zodToJsonSchema(GetIssueSchema),
    },
    {
        name: 'update_issue',
        description: 'Update an issue in a GitLab project',
        inputSchema: zodToJsonSchema(UpdateIssueSchema),
    },
    {
        name: 'delete_issue',
        description: 'Delete an issue from a GitLab project',
        inputSchema: zodToJsonSchema(DeleteIssueSchema),
    },
    {
        name: 'list_issue_links',
        description: 'List all issue links for a specific issue',
        inputSchema: zodToJsonSchema(ListIssueLinksSchema),
    },
    {
        name: 'get_issue_link',
        description: 'Get a specific issue link',
        inputSchema: zodToJsonSchema(GetIssueLinkSchema),
    },
    {
        name: 'create_issue_link',
        description: 'Create an issue link between two issues',
        inputSchema: zodToJsonSchema(CreateIssueLinkSchema),
    },
    {
        name: 'delete_issue_link',
        description: 'Delete an issue link',
        inputSchema: zodToJsonSchema(DeleteIssueLinkSchema),
    },
    {
        name: 'list_namespaces',
        description: 'List all namespaces available to the current user',
        inputSchema: zodToJsonSchema(ListNamespacesSchema),
    },
    {
        name: 'get_namespace',
        description: 'Get details of a namespace by ID or path',
        inputSchema: zodToJsonSchema(GetNamespaceSchema),
    },
    {
        name: 'verify_namespace',
        description: 'Verify if a namespace path exists',
        inputSchema: zodToJsonSchema(VerifyNamespaceSchema),
    },
    {
        name: 'get_project',
        description: 'Get details of a specific project',
        inputSchema: zodToJsonSchema(GetProjectSchema),
    },
    {
        name: 'list_projects',
        description: 'Get a list of projects with id, name, description, web_url and other useful information',
        inputSchema: zodToJsonSchema(ListProjectsSchema),
    },
    {
        name: 'list_labels',
        description: 'List labels for a project',
        inputSchema: zodToJsonSchema(ListLabelsSchema),
    },
    {
        name: 'get_label',
        description: 'Get a single label from a project',
        inputSchema: zodToJsonSchema(GetLabelSchema),
    },
    {
        name: 'create_label',
        description: 'Create a new label in a project',
        inputSchema: zodToJsonSchema(CreateLabelSchema),
    },
    {
        name: 'update_label',
        description: 'Update an existing label in a project',
        inputSchema: zodToJsonSchema(UpdateLabelSchema),
    },
    {
        name: 'delete_label',
        description: 'Delete a label from a project',
        inputSchema: zodToJsonSchema(DeleteLabelSchema),
    },
    {
        name: 'list_group_projects',
        description: 'List projects in a GitLab group with filtering options',
        inputSchema: zodToJsonSchema(ListGroupProjectsSchema),
    },
    {
        name: 'list_open_merge_requests',
        description: 'Lists all open merge requests in the project',
        inputSchema: zodToJsonSchema(ListOpenMergeRequestsSchema),
    },
    {
        name: 'get_merge_request_details',
        description: 'Get details about a specific merge request of a project like title, description, author, assignee, state, and more',
        inputSchema: zodToJsonSchema(GitLabMergeRequestSchema),
    },
    {
        name: 'get_merge_request_comments',
        description: 'Get general and file diff comments of a certain merge request',
        inputSchema: zodToJsonSchema(GetMergeRequestCommentsSchema),
    },
    {
        name: 'add_merge_request_diff_comment',
        description: 'Add a comment of a merge request at a specific line in a file diff',
        inputSchema: zodToJsonSchema(AddMergeRequestDiffCommentSchema),
    },
];

// Define which tools are read-only
const readOnlyTools = [
    'search_repositories',
    'get_file_contents',
    'get_merge_request',
    'get_merge_request_diffs',
    'list_merge_request_discussions',
    'list_issues',
    'get_issue',
    'list_issue_links',
    'get_issue_link',
    'list_namespaces',
    'get_namespace',
    'verify_namespace',
    'get_project',
    'list_projects',
    'list_labels',
    'get_label',
    'list_group_projects',
];

/**
 * Smart URL handling for GitLab API
 *
 * @param {string | undefined} url - Input GitLab API URL
 * @returns {string} Normalized GitLab API URL with /api/v4 path
 */
function normalizeGitLabApiUrl(url?: string): string {
    if (!url) {
        return 'https://gitlab.com/api/v4';
    }

    // Remove trailing slash if present
    let normalizedUrl = url.endsWith('/') ? url.slice(0, -1) : url;

    // Check if URL already has /api/v4
    if (
        !normalizedUrl.endsWith('/api/v4')
    && !normalizedUrl.endsWith('/api/v4/')
    ) {
    // Append /api/v4 if not already present
        normalizedUrl = `${normalizedUrl}/api/v4`;
    }

    return normalizedUrl;
}

// Use the normalizeGitLabApiUrl function to handle various URL formats
const GITLAB_API_URL = normalizeGitLabApiUrl(process.env.GITLAB_API_URL || '');
const GITLAB_HOST = GITLAB_API_URL.replace('/api/v4', '');

if (!GITLAB_PERSONAL_ACCESS_TOKEN) {
    console.error('GITLAB_PERSONAL_ACCESS_TOKEN environment variable is not set');
    process.exit(1);
}

const api = new Gitlab({
    host: GITLAB_HOST,
    token: GITLAB_PERSONAL_ACCESS_TOKEN,
});

/**
 * Common headers for GitLab API requests
 */
const DEFAULT_HEADERS = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${GITLAB_PERSONAL_ACCESS_TOKEN}`,
};

/**
 * Handle GitLab API errors from Axios responses
 *
 * @param {import("axios").AxiosResponse} response - The Axios response object
 * @returns {Promise<void>} A promise that resolves if there's no error
 * @throws {Error} If the response indicates an error
 */
export async function handleGitLabError(
    response: import('axios').AxiosResponse,
): Promise<void> {
    if (response.status < 200 || response.status >= 300) {
        const errorBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        // Check specifically for Rate Limit error
        if (response.status === 403 && errorBody.includes('User API Key Rate limit exceeded')) {
            console.error('GitLab API Rate Limit Exceeded:', errorBody);
            console.log('User API Key Rate limit exceeded. Please try again later.');
            throw new Error(
                `GitLab API Rate Limit Exceeded: ${errorBody}`,
            );
        } else {
            // Handle other API errors
            throw new Error(
                `GitLab API error: ${response.status} ${response.statusText}\n${errorBody}`,
            );
        }
    }
}

/**
 * Create a new branch in a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {z.infer<typeof CreateBranchOptionsSchema>} options - Branch creation options
 * @returns {Promise<z.infer<typeof GitLabReferenceSchema>>} The created branch reference
 */
export async function createBranch(
    projectId: string,
    options: z.infer<typeof CreateBranchOptionsSchema>,
): Promise<z.infer<typeof GitLabReferenceSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/repository/branches`,
    );

    try {
        const response = await axios.post(url.toString(), {
            branch: options.name,
            ref: options.ref,
        }, {
            headers: DEFAULT_HEADERS,
        });

        return GitLabReferenceSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Get the default branch for a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @returns {Promise<string>} The name of the default branch
 */
export async function getDefaultBranchRef(projectId: string): Promise<string> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}`,
    );

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        const project = GitLabRepositorySchema.parse(response.data);
        return project.default_branch ?? 'main';
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Get the contents of a file from a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {string} filePath - The path of the file to get
 * @param {string} [ref] - The name of the branch, tag or commit
 * @returns {Promise<z.infer<typeof GitLabContentSchema>>} The file content
 */
export async function getFileContents(
    projectId: string,
    filePath: string,
    ref?: string,
): Promise<z.infer<typeof GitLabContentSchema>> {
    const encodedPath = encodeURIComponent(filePath);

    if (!ref) {
        // eslint-disable-next-line no-param-reassign
        ref = await getDefaultBranchRef(projectId);
    }

    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/repository/files/${encodedPath}`,
    );

    url.searchParams.append('ref', ref);

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        const parsedData = GitLabContentSchema.parse(response.data);

        if (!Array.isArray(parsedData) && parsedData.content) {
            parsedData.content = Buffer.from(parsedData.content, 'base64').toString(
                'utf8',
            );
            parsedData.encoding = 'utf8';
        }

        return parsedData;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // File not found handling
            if (error.response?.status === 404) {
                throw new Error(`File not found: ${filePath}`);
            }

            if (error.response) {
                await handleGitLabError(error.response);
            }
        }
        throw error;
    }
}

/**
 * Create a new issue in a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {z.infer<typeof CreateIssueOptionsSchema>} options - Issue creation options
 * @returns {Promise<z.infer<typeof GitLabIssueSchema>>} The created issue
 */
export async function createIssue(
    projectId: string,
    options: z.infer<typeof CreateIssueOptionsSchema>,
): Promise<z.infer<typeof GitLabIssueSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues`,
    );

    try {
        const response = await axios.post(url.toString(), {
            title: options.title,
            description: options.description,
            assignee_ids: options.assignee_ids,
            milestone_id: options.milestone_id,
            labels: options.labels?.join(','),
        }, {
            headers: DEFAULT_HEADERS,
        });

        return GitLabIssueSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 400) {
                const errorBody = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);
                throw new Error(`Invalid request: ${errorBody}`);
            }

            if (error.response) {
                await handleGitLabError(error.response);
            }
        }
        throw error;
    }
}

/**
 * List issues in a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {Object} options - Options for listing issues
 * @returns {Promise<z.infer<typeof GitLabIssueSchema>[]>} List of issues
 */
export async function listIssues(
    projectId: string,
    options: Omit<z.infer<typeof ListIssuesSchema>, 'project_id'> = {},
): Promise<z.infer<typeof GitLabIssueSchema>[]> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/issues`,
    );

    // Add all query parameters
    Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
            if (key === 'label_name' && Array.isArray(value)) {
                // Handle array of labels
                url.searchParams.append(key, value.join(','));
            } else {
                url.searchParams.append(key, value.toString());
            }
        }
    });

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        return z.array(GitLabIssueSchema).parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Get a single issue from a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} issueIid - The internal ID of the project issue
 * @returns {Promise<z.infer<typeof GitLabIssueSchema>>} The issue
 */
export async function getIssue(
    projectId: string,
    issueIid: number,
): Promise<z.infer<typeof GitLabIssueSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/issues/${issueIid}`,
    );

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        return GitLabIssueSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Update an issue in a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} issueIid - The internal ID of the project issue
 * @param {Object} options - Update options for the issue
 * @returns {Promise<z.infer<typeof GitLabIssueSchema>>} The updated issue
 */
export async function updateIssue(
    projectId: string,
    issueIid: number,
    options: Omit<z.infer<typeof UpdateIssueSchema>, 'project_id' | 'issue_iid'>,
): Promise<z.infer<typeof GitLabIssueSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/issues/${issueIid}`,
    );

    // Convert labels array to comma-separated string if present
    const body: Record<string, any> = { ...options };
    if (body.labels && Array.isArray(body.labels)) {
        body.labels = body.labels.join(',');
    }

    try {
        const response = await axios.put(url.toString(), body, {
            headers: DEFAULT_HEADERS,
        });

        return GitLabIssueSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Delete an issue from a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} issueIid - The internal ID of the project issue
 * @returns {Promise<void>}
 */
export async function deleteIssue(projectId: string, issueIid: number): Promise<void> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/issues/${issueIid}`,
    );

    try {
        const response = await axios.delete(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        await handleGitLabError(response);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * List all issue links for a specific issue
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} issueIid - The internal ID of the project issue
 * @returns {Promise<z.infer<typeof GitLabIssueWithLinkDetailsSchema>[]>} List of issues with link details
 */
export async function listIssueLinks(
    projectId: string,
    issueIid: number,
): Promise<z.infer<typeof GitLabIssueWithLinkDetailsSchema>[]> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/issues/${issueIid}/links`,
    );

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        await handleGitLabError(response);
        return z.array(GitLabIssueWithLinkDetailsSchema).parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Get a specific issue link
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} issueIid - The internal ID of the project issue
 * @param {number} issueLinkId - The ID of the issue link
 * @returns {Promise<z.infer<typeof GitLabIssueLinkSchema>>} The issue link
 */
export async function getIssueLink(
    projectId: string,
    issueIid: number,
    issueLinkId: number,
): Promise<z.infer<typeof GitLabIssueLinkSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/issues/${issueIid}/links/${issueLinkId}`,
    );

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        await handleGitLabError(response);
        return GitLabIssueLinkSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Create an issue link between two issues
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} issueIid - The internal ID of the project issue
 * @param {string} targetProjectId - The ID or URL-encoded path of the target project
 * @param {number} targetIssueIid - The internal ID of the target project issue
 * @param {string} linkType - The type of the relation (relates_to, blocks, is_blocked_by)
 * @returns {Promise<z.infer<typeof GitLabIssueLinkSchema>>} The created issue link
 */
export async function createIssueLink(
    projectId: string,
    issueIid: number,
    targetProjectId: string,
    targetIssueIid: number,
    linkType: 'relates_to' | 'blocks' | 'is_blocked_by' = 'relates_to',
): Promise<z.infer<typeof GitLabIssueLinkSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/issues/${issueIid}/links`,
    );

    try {
        const response = await axios.post(
            url.toString(),
            {
                target_project_id: targetProjectId,
                target_issue_iid: targetIssueIid,
                link_type: linkType,
            },
            {
                headers: DEFAULT_HEADERS,
            },
        );

        await handleGitLabError(response);
        return GitLabIssueLinkSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Delete an issue link
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} issueIid - The internal ID of the project issue
 * @param {number} issueLinkId - The ID of the issue link
 * @returns {Promise<void>}
 */
export async function deleteIssueLink(
    projectId: string,
    issueIid: number,
    issueLinkId: number,
): Promise<void> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/issues/${issueIid}/links/${issueLinkId}`,
    );

    try {
        const response = await axios.delete(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        await handleGitLabError(response);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * List labels for a project
 *
 * @param projectId The ID or URL-encoded path of the project
 * @param options Optional parameters for listing labels
 * @returns Array of GitLab labels
 */
export async function listLabels(
    projectId: string,
    options: Omit<z.infer<typeof ListLabelsSchema>, 'project_id'> = {},
): Promise<GitLabLabel[]> {
    // Construct the URL with project path
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/labels`,
    );

    // Add query parameters
    Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined) {
            if (typeof value === 'boolean') {
                url.searchParams.append(key, value ? 'true' : 'false');
            } else {
                url.searchParams.append(key, String(value));
            }
        }
    });

    // Make the API request
    const response = await axios.get(url.toString(), {
        headers: DEFAULT_HEADERS,
    });

    // Handle errors
    await handleGitLabError(response);

    // Parse and return the data
    return response.data as GitLabLabel[];
}

/**
 * Get a single label from a project
 *
 * @param projectId The ID or URL-encoded path of the project
 * @param labelId The ID or name of the label
 * @param includeAncestorGroups Whether to include ancestor groups
 * @returns GitLab label
 */
export async function getLabel(
    projectId: string,
    labelId: number | string,
    includeAncestorGroups?: boolean,
): Promise<GitLabLabel> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/labels/${encodeURIComponent(String(labelId))}`,
    );

    // Add query parameters
    if (includeAncestorGroups !== undefined) {
        url.searchParams.append(
            'include_ancestor_groups',
            includeAncestorGroups ? 'true' : 'false',
        );
    }

    // Make the API request
    const response = await axios.get(url.toString(), {
        headers: DEFAULT_HEADERS,
    });

    // Handle errors
    await handleGitLabError(response);

    // Return the data
    return response.data as GitLabLabel;
}

/**
 * Create a new label in a project
 *
 * @param projectId The ID or URL-encoded path of the project
 * @param options Options for creating the label
 * @returns Created GitLab label
 */
export async function createLabel(
    projectId: string,
    options: Omit<z.infer<typeof CreateLabelSchema>, 'project_id'>,
): Promise<GitLabLabel> {
    // Make the API request
    const response = await axios.post(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/labels`,
        options,
        {
            headers: DEFAULT_HEADERS,
        },
    );

    // Handle errors
    await handleGitLabError(response);

    // Return the data
    return response.data as GitLabLabel;
}

/**
 * Update an existing label in a project
 *
 * @param projectId The ID or URL-encoded path of the project
 * @param labelId The ID or name of the label to update
 * @param options Options for updating the label
 * @returns Updated GitLab label
 */
export async function updateLabel(
    projectId: string,
    labelId: number | string,
    options: Omit<z.infer<typeof UpdateLabelSchema>, 'project_id' | 'label_id'>,
): Promise<GitLabLabel> {
    // Make the API request
    const response = await axios.put(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/labels/${encodeURIComponent(String(labelId))}`,
        options,
        {
            headers: DEFAULT_HEADERS,
        },
    );

    // Handle errors
    await handleGitLabError(response);

    // Return the data
    return response.data as GitLabLabel;
}

/**
 * Delete a label from a project
 *
 * @param projectId The ID or URL-encoded path of the project
 * @param labelId The ID or name of the label to delete
 */
export async function deleteLabel(
    projectId: string,
    labelId: number | string,
): Promise<void> {
    // Make the API request
    const response = await axios.delete(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/labels/${encodeURIComponent(String(labelId))}`,
        {
            headers: DEFAULT_HEADERS,
        },
    );

    // Handle errors
    await handleGitLabError(response);
}

/**
 * Create a new merge request in a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {z.infer<typeof CreateMergeRequestOptionsSchema>} options - Merge request creation options
 * @returns {Promise<z.infer<typeof GitLabMergeRequestSchema>>} The created merge request
 */
export async function createMergeRequest(
    projectId: string,
    options: z.infer<typeof CreateMergeRequestOptionsSchema>,
): Promise<z.infer<typeof GitLabMergeRequestSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/merge_requests`,
    );

    try {
        const response = await axios.post(
            url.toString(),
            {
                title: options.title,
                description: options.description,
                source_branch: options.source_branch,
                target_branch: options.target_branch,
                allow_collaboration: options.allow_collaboration,
                draft: options.draft,
            },
            {
                headers: DEFAULT_HEADERS,
            },
        );

        return GitLabMergeRequestSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 400) {
                const errorBody = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);
                throw new Error(`Invalid request: ${errorBody}`);
            }

            if (error.response) {
                await handleGitLabError(error.response);
            }
        }
        throw error;
    }
}

/**
 * List merge request discussion items
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} mergeRequestIid - The IID of a merge request
 * @returns {Promise<z.infer<typeof GitLabDiscussionSchema>[]>} List of discussions
 */
export async function listMergeRequestDiscussions(
    projectId: string,
    mergeRequestIid: number,
): Promise<z.infer<typeof GitLabDiscussionSchema>[]> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/merge_requests/${mergeRequestIid}/discussions`,
    );

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        await handleGitLabError(response);
        return z.array(GitLabDiscussionSchema).parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Modify an existing merge request thread note
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} mergeRequestIid - The IID of a merge request
 * @param {string} discussionId - The ID of a thread
 * @param {number} noteId - The ID of a thread note
 * @param {string} body - The new content of the note
 * @param {boolean} [resolved] - Resolve/unresolve state
 * @returns {Promise<z.infer<typeof GitLabDiscussionNoteSchema>>} The updated note
 */
export async function updateMergeRequestNote(
    projectId: string,
    mergeRequestIid: number,
    discussionId: string,
    noteId: number,
    body: string,
    resolved?: boolean,
): Promise<z.infer<typeof GitLabDiscussionNoteSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/merge_requests/${mergeRequestIid}/discussions/${discussionId}/notes/${noteId}`,
    );

    const payload: { body: string; resolved?: boolean } = { body };
    if (resolved !== undefined) {
        payload.resolved = resolved;
    }

    try {
        const response = await axios.put(url.toString(), payload, {
            headers: DEFAULT_HEADERS,
        });

        await handleGitLabError(response);
        return GitLabDiscussionNoteSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Create or update a file in a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {string} filePath - The path of the file to create or update
 * @param {string} content - The content of the file
 * @param {string} commitMessage - The commit message
 * @param {string} branch - The branch name
 * @param {string} [previousPath] - The previous path of the file in case of rename
 * @returns {Promise<z.infer<typeof GitLabCreateUpdateFileResponseSchema>>} The file update response
 */
export async function createOrUpdateFile(
    projectId: string,
    filePath: string,
    content: string,
    commitMessage: string,
    branch: string,
    previousPath?: string,
    last_commit_id?: string,
    commit_id?: string,
): Promise<z.infer<typeof GitLabCreateUpdateFileResponseSchema>> {
    const encodedPath = encodeURIComponent(filePath);
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/repository/files/${encodedPath}`,
    );

    const body: Record<string, any> = {
        branch,
        content,
        commit_message: commitMessage,
        encoding: 'text',
        ...(previousPath ? { previous_path: previousPath } : {}),
    };

    // Check if file exists
    let method = 'POST';
    try {
    // Get file contents to check existence and retrieve commit IDs
        const fileData = await getFileContents(projectId, filePath, branch);
        method = 'PUT';

        // If fileData is not an array, it's a file content object with commit IDs
        if (!Array.isArray(fileData)) {
            // Use commit IDs from the file data if not provided in parameters
            if (!commit_id && fileData.commit_id) {
                body.commit_id = fileData.commit_id;
            } else if (commit_id) {
                body.commit_id = commit_id;
            }

            if (!last_commit_id && fileData.last_commit_id) {
                body.last_commit_id = fileData.last_commit_id;
            } else if (last_commit_id) {
                body.last_commit_id = last_commit_id;
            }
        }
    } catch (error) {
        if (!(error instanceof Error && error.message.includes('File not found'))) {
            throw error;
        }
        // File doesn't exist, use POST - no need for commit IDs for new files
        // But still use any provided as parameters if they exist
        if (commit_id) {
            body.commit_id = commit_id;
        }
        if (last_commit_id) {
            body.last_commit_id = last_commit_id;
        }
    }

    try {
        const response = await axios({
            method,
            url: url.toString(),
            headers: DEFAULT_HEADERS,
            data: body,
        });

        return GitLabCreateUpdateFileResponseSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Create a commit in a GitLab project repository
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {string} message - The commit message
 * @param {string} branch - The branch name
 * @param {FileOperation[]} actions - Array of file operations for the commit
 * @returns {Promise<z.infer<typeof GitLabCommitSchema>>} The created commit
 */
export async function createCommit(
    projectId: string,
    message: string,
    branch: string,
    actions: FileOperation[],
): Promise<z.infer<typeof GitLabCommitSchema>> {
    const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/repository/commits`);
    try {
        const response = await axios.post(
            url.toString(),
            {
                branch,
                commit_message: message,
                actions: actions.map((action) => ({
                    action: 'create',
                    file_path: action.path,
                    content: action.content,
                    encoding: 'text',
                })),
            },
            {
                headers: DEFAULT_HEADERS,
            },
        );
        return GitLabCommitSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 400) {
                const errorBody = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);
                throw new Error(`Invalid request: ${errorBody}`);
            }

            if (error.response) {
                await handleGitLabError(error.response);
            }
        }
        throw error;
    }
}

/**
 * Create a new GitLab repository
 *
 * @param {z.infer<typeof CreateRepositoryOptionsSchema>} options - Repository creation options
 * @returns {Promise<GitLabRepository>} The created repository
 */
export async function createRepository(
    options: z.infer<typeof CreateRepositoryOptionsSchema>,
): Promise<z.infer<typeof GitLabRepositorySchema>> {
    try {
        const response = await axios.post(
            `${GITLAB_API_URL}/projects`,
            {
                name: options.name,
                description: options.description,
                visibility: options.visibility,
                initialize_with_readme: options.initialize_with_readme,
                default_branch: 'main',
                path: options.name.toLowerCase().replace(/\s+/g, '-'),
            },
            {
                headers: DEFAULT_HEADERS,
            },
        );

        return GitLabRepositorySchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Search for GitLab projects
 *
 * @param {string} query - The search query
 * @param {number} [page=1] - The page number
 * @param {number} [perPage=20] - Number of items per page
 * @returns {Promise<z.infer<typeof GitLabSearchResponseSchema>>} The search results
 */
export async function searchProjects(
    query: string,
    page: number = 1,
    perPage: number = 20,
): Promise<z.infer<typeof GitLabSearchResponseSchema>> {
    const url = new URL(`${GITLAB_API_URL}/projects`);
    url.searchParams.append('search', query);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', perPage.toString());
    url.searchParams.append('order_by', 'id');
    url.searchParams.append('sort', 'desc');

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        const projects = response.data;
        const totalCount = response.headers['x-total'];
        const totalPages = response.headers['x-total-pages'];

        // GitLab API doesn't return these headers for results > 10,000
        const count = totalCount ? parseInt(totalCount, 10) : projects.length;

        return GitLabSearchResponseSchema.parse({
            count,
            total_pages: totalPages ? parseInt(totalPages, 10) : Math.ceil(count / perPage),
            current_page: page,
            items: projects,
        });
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Get a single project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {Object} options - Options for getting project details
 * @returns {Promise<z.infer<typeof GitLabRepositorySchema>>} Project details
 */
export async function getProject(
    projectId: string,
    options: {
        license?: boolean;
        statistics?: boolean;
        with_custom_attributes?: boolean;
    } = {},
): Promise<z.infer<typeof GitLabRepositorySchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}`,
    );

    if (options.license) {
        url.searchParams.append('license', 'true');
    }

    if (options.statistics) {
        url.searchParams.append('statistics', 'true');
    }

    if (options.with_custom_attributes) {
        url.searchParams.append('with_custom_attributes', 'true');
    }

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        return GitLabRepositorySchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Create a tree structure in a GitLab project repository
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {FileOperation[]} files - Array of file operations
 * @param {string} [ref] - The name of the branch, tag or commit
 * @returns {Promise<z.infer<typeof GitLabTreeSchema>>} The created tree
 */
export async function createTree(
    projectId: string,
    files: FileOperation[],
    ref?: string,
): Promise<z.infer<typeof GitLabTreeSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/repository/tree`,
    );

    if (ref) {
        url.searchParams.append('ref', ref);
    }

    try {
        const response = await axios.post(
            url.toString(),
            {
                files: files.map((file) => ({
                    file_path: file.path,
                    content: file.content,
                    encoding: 'text',
                })),
            },
            {
                headers: DEFAULT_HEADERS,
            },
        );

        return GitLabTreeSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            if (error.response.status === 400) {
                const errorBody = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);
                throw new Error(`Invalid request: ${errorBody}`);
            }

            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Create a fork of a GitLab project
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {string} [namespace] - The namespace to fork the project to
 * @returns {Promise<z.infer<typeof GitLabForkSchema>>} The created fork
 */
export async function forkProject(
    projectId: string,
    namespace?: string,
): Promise<z.infer<typeof GitLabForkSchema>> {
    // API URL
    const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/fork`);

    if (namespace) {
        url.searchParams.append('namespace', namespace);
    }

    try {
        const response = await axios.post(url.toString(), {}, {
            headers: DEFAULT_HEADERS,
        });

        return GitLabForkSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            // Check for project already exists error
            if (error.response?.status === 409) {
                throw new Error('Project already exists in the target namespace');
            }
            // Handle other GitLab API errors
            if (error.response) {
                await handleGitLabError(error.response);
            }
        }
        // Re-throw if it's not an axios error
        throw error;
    }
}

/**
 * List projects
 *
 * @param {Object} options - Options for listing projects
 * @returns {Promise<GitLabProject[]>} List of projects
 */
export async function listProjects(
    options: z.infer<typeof ListProjectsSchema> = {},
): Promise<GitLabProject[]> {
    // Construct the query parameters
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (typeof value === 'boolean') {
                params.append(key, value ? 'true' : 'false');
            } else {
                params.append(key, String(value));
            }
        }
    });

    // Make the API request
    const response = await axios.get(
        `${GITLAB_API_URL}/projects?${params.toString()}`,
        {
            headers: DEFAULT_HEADERS,
        },
    );

    // Handle errors
    await handleGitLabError(response);

    // Parse and return the data
    return z.array(GitLabProjectSchema).parse(response.data);
}

/**
 * List all projects in a GitLab group
 *
 * @param {z.infer<typeof ListGroupProjectsSchema>} options - Options for listing group projects
 * @returns {Promise<GitLabProject[]>} Array of projects in the group
 */
export async function listGroupProjects(
    options: z.infer<typeof ListGroupProjectsSchema>,
): Promise<GitLabProject[]> {
    const url = new URL(
        `${GITLAB_API_URL}/groups/${encodeURIComponent(options.group_id)}/projects`,
    );

    // Add optional parameters to URL
    if (options.include_subgroups) url.searchParams.append('include_subgroups', 'true');
    if (options.search) url.searchParams.append('search', options.search);
    if (options.order_by) url.searchParams.append('order_by', options.order_by);
    if (options.sort) url.searchParams.append('sort', options.sort);
    if (options.page) url.searchParams.append('page', options.page.toString());
    if (options.per_page) url.searchParams.append('per_page', options.per_page.toString());
    if (options.archived !== undefined) url.searchParams.append('archived', options.archived.toString());
    if (options.visibility) url.searchParams.append('visibility', options.visibility);
    if (options.with_issues_enabled !== undefined) {
        url.searchParams.append(
            'with_issues_enabled',
            options.with_issues_enabled.toString(),
        );
    }
    if (options.with_merge_requests_enabled !== undefined) {
        url.searchParams.append(
            'with_merge_requests_enabled',
            options.with_merge_requests_enabled.toString(),
        );
    }
    if (options.min_access_level !== undefined) {
        url.searchParams.append(
            'min_access_level',
            options.min_access_level.toString(),
        );
    }
    if (options.with_programming_language) {
        url.searchParams.append(
            'with_programming_language',
            options.with_programming_language,
        );
    }
    if (options.starred !== undefined) url.searchParams.append('starred', options.starred.toString());
    if (options.statistics !== undefined) url.searchParams.append('statistics', options.statistics.toString());
    if (options.with_custom_attributes !== undefined) {
        url.searchParams.append(
            'with_custom_attributes',
            options.with_custom_attributes.toString(),
        );
    }
    if (options.with_security_reports !== undefined) {
        url.searchParams.append(
            'with_security_reports',
            options.with_security_reports.toString(),
        );
    }

    const response = await axios.get(url.toString(), {
        headers: DEFAULT_HEADERS,
    });

    await handleGitLabError(response);
    return GitLabProjectSchema.array().parse(response.data);
}

/**
 * Get merge request details
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} mergeRequestIid - The internal ID of the merge request
 * @returns {Promise<z.infer<typeof GitLabMergeRequestSchema>>} The merge request details
 */
export async function getMergeRequest(
    projectId: string,
    mergeRequestIId: number,
): Promise<z.infer<typeof GitLabMergeRequestSchema>> {
    const url = new URL(`${GITLAB_API_URL}/projects/${encodeURIComponent(projectId)}/merge_requests/${mergeRequestIId}`);
    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });
        await handleGitLabError(response);
        return GitLabMergeRequestSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Get merge request changes/diffs
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} mergeRequestIid - The internal ID of the merge request
 * @param {string} [view] - The view type for the diff (inline or parallel)
 * @returns {Promise<z.infer<typeof GitLabMergeRequestDiffSchema>[]>} The merge request diffs
 */
export async function getMergeRequestDiffs(
    projectId: string,
    mergeRequestIid: number,
    view?: 'inline' | 'parallel',
): Promise<z.infer<typeof GitLabMergeRequestDiffSchema>[]> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/merge_requests/${mergeRequestIid}/changes`,
    );

    if (view) {
        url.searchParams.append('view', view);
    }

    try {
        const response = await axios.get(url.toString(), {
            headers: DEFAULT_HEADERS,
        });

        await handleGitLabError(response);
        const data = response.data as { changes: unknown };
        return z.array(GitLabMergeRequestDiffSchema).parse(data.changes);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Update a merge request
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {number} mergeRequestIid - The internal ID of the merge request
 * @param {Object} options - The update options
 * @returns {Promise<z.infer<typeof GitLabMergeRequestSchema>>} The updated merge request
 */
export async function updateMergeRequest(
    projectId: string,
    mergeRequestIid: number,
    options: Omit<
    z.infer<typeof UpdateMergeRequestSchema>,
    'project_id' | 'merge_request_iid'
    >,
): Promise<z.infer<typeof GitLabMergeRequestSchema>> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/merge_requests/${mergeRequestIid}`,
    );

    try {
        const response = await axios.put(url.toString(), options, {
            headers: DEFAULT_HEADERS,
        });

        await handleGitLabError(response);
        return GitLabMergeRequestSchema.parse(response.data);
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            await handleGitLabError(error.response);
        }
        throw error;
    }
}

/**
 * Create a new note (comment) on an issue or merge request
 * (New function: createNote - Function to add a note (comment) to an issue or merge request)
 *
 * @param {string} projectId - The ID or URL-encoded path of the project
 * @param {"issue" | "merge_request"} noteableType - The type of the item to add a note to (issue or merge_request)
 * @param {number} noteableIid - The internal ID of the issue or merge request
 * @param {string} body - The content of the note
 * @returns {Promise<any>} The created note
 */
export async function createNote(
    projectId: string,
    noteableType: 'issue' | 'merge_request', // 'issue' 또는 'merge_request' 타입 명시
    noteableIid: number,
    body: string,
): Promise<any> {
    const url = new URL(
        `${GITLAB_API_URL}/projects/${encodeURIComponent(
            projectId,
        )}/${noteableType}s/${noteableIid}/notes`, // Using plural form (issues/merge_requests) as per GitLab API documentation
    );

    const response = await axios.post(url.toString(), { body }, {
        headers: DEFAULT_HEADERS,
    });

    await handleGitLabError(response);
    return response.data;
}

/**
 * List all namespaces
 *
 * @param {Object} options - Options for listing namespaces
 * @param {string} [options.search] - Search query to filter namespaces
 * @param {boolean} [options.owned_only] - Only return namespaces owned by the authenticated user
 * @param {boolean} [options.top_level_only] - Only return top-level namespaces
 * @returns {Promise<GitLabNamespace[]>} List of namespaces
 */
export async function listNamespaces(options: {
    search?: string;
    owned_only?: boolean;
    top_level_only?: boolean;
}): Promise<GitLabNamespace[]> {
    const url = new URL(`${GITLAB_API_URL}/namespaces`);

    if (options.search) {
        url.searchParams.append('search', options.search);
    }

    if (options.owned_only) {
        url.searchParams.append('owned_only', 'true');
    }

    if (options.top_level_only) {
        url.searchParams.append('top_level_only', 'true');
    }

    const response = await axios.get(url.toString(), {
        headers: DEFAULT_HEADERS,
    });

    await handleGitLabError(response);
    return z.array(GitLabNamespaceSchema).parse(response.data);
}

/**
 * Get details on a namespace
 *
 * @param {string} id - The ID or URL-encoded path of the namespace
 * @returns {Promise<GitLabNamespace>} The namespace details
 */
export async function getNamespace(id: string): Promise<GitLabNamespace> {
    const url = new URL(`${GITLAB_API_URL}/namespaces/${encodeURIComponent(id)}`);

    const response = await axios.get(url.toString(), {
        headers: DEFAULT_HEADERS,
    });

    await handleGitLabError(response);
    return GitLabNamespaceSchema.parse(response.data);
}

/**
 * Verify if a namespace exists
 *
 * @param {string} namespacePath - The path of the namespace to check
 * @param {number} [parentId] - The ID of the parent namespace
 * @returns {Promise<GitLabNamespaceExistsResponse>} The verification result
 */
export async function verifyNamespaceExistence(
    namespacePath: string,
    parentId?: number,
): Promise<GitLabNamespaceExistsResponse> {
    const url = new URL(
        `${GITLAB_API_URL}/namespaces/${encodeURIComponent(namespacePath)}/exists`,
    );

    if (parentId) {
        url.searchParams.append('parent_id', parentId.toString());
    }

    const response = await axios.get(url.toString(), {
        headers: DEFAULT_HEADERS,
    });

    await handleGitLabError(response);
    return GitLabNamespaceExistsResponseSchema.parse(response.data);
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
    // If read-only mode is enabled, filter out write operations
    const tools = GITLAB_READ_ONLY_MODE
        ? allTools.filter((tool) => readOnlyTools.includes(tool.name))
        : allTools;

    return {
        tools,
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        if (!request.params.arguments) {
            throw new Error('Arguments are required');
        }

        switch (request.params.name) {
            case 'fork_repository': {
                const args = ForkRepositorySchema.parse(request.params.arguments);
                try {
                    const forkedProject = await forkProject(
                        args.project_id,
                        args.namespace,
                    );
                    return {
                        content: [
                            { type: 'text', text: JSON.stringify(forkedProject, null, 2) },
                        ],
                    };
                } catch (forkError) {
                    console.error('Error forking repository:', forkError);
                    let forkErrorMessage = 'Failed to fork repository';
                    if (forkError instanceof Error) {
                        forkErrorMessage = `${forkErrorMessage}: ${forkError.message}`;
                    }
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({ error: forkErrorMessage }, null, 2),
                            },
                        ],
                    };
                }
            }

            case 'add_merge_request_diff_comment': {
                const args = AddMergeRequestDiffCommentSchema.parse(request.params.arguments);
                const discussion = await api.MergeRequestDiscussions.create(
                    args.project_id,
                    args.merge_request_iid,
                    args.comment,
                    {
                        position: {
                            baseSha: args.base_sha,
                            startSha: args.start_sha,
                            headSha: args.head_sha,
                            oldPath: args.file_path,
                            newPath: args.file_path,
                            positionType: 'text',
                            new_line: args.line_number,
                        },
                    },
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(discussion, null, 2) }],
                };
            }

            case 'create_branch': {
                const args = CreateBranchSchema.parse(request.params.arguments);
                let { ref } = args;
                if (!ref) {
                    ref = await getDefaultBranchRef(args.project_id);
                }

                const branch = await createBranch(args.project_id, {
                    name: args.branch,
                    ref,
                });

                return {
                    content: [{ type: 'text', text: JSON.stringify(branch, null, 2) }],
                };
            }

            case 'search_repositories': {
                const args = SearchRepositoriesSchema.parse(request.params.arguments);
                const results = await searchProjects(
                    args.search,
                    args.page,
                    args.per_page,
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
                };
            }

            case 'create_repository': {
                const args = CreateRepositorySchema.parse(request.params.arguments);
                const repository = await createRepository(args);
                return {
                    content: [
                        { type: 'text', text: JSON.stringify(repository, null, 2) },
                    ],
                };
            }

            case 'get_file_contents': {
                const args = GetFileContentsSchema.parse(request.params.arguments);
                const contents = await getFileContents(
                    args.project_id,
                    args.file_path,
                    args.ref,
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(contents, null, 2) }],
                };
            }

            case 'create_or_update_file': {
                const args = CreateOrUpdateFileSchema.parse(request.params.arguments);
                const result = await createOrUpdateFile(
                    args.project_id,
                    args.file_path,
                    args.content,
                    args.commit_message,
                    args.branch,
                    args.previous_path,
                    args.last_commit_id,
                    args.commit_id,
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            }

            case 'push_files': {
                const args = PushFilesSchema.parse(request.params.arguments);
                const result = await createCommit(
                    args.project_id,
                    args.commit_message,
                    args.branch,
                    args.files.map((f) => ({ path: f.file_path, content: f.content })),
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
                };
            }

            case 'create_issue': {
                const args = CreateIssueSchema.parse(request.params.arguments);
                const { project_id, ...options } = args;
                const issue = await createIssue(project_id, options);
                return {
                    content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
                };
            }

            case 'create_merge_request': {
                const args = CreateMergeRequestSchema.parse(request.params.arguments);
                const { project_id, ...options } = args;
                const mergeRequest = await createMergeRequest(project_id, options);
                return {
                    content: [
                        { type: 'text', text: JSON.stringify(mergeRequest, null, 2) },
                    ],
                };
            }

            case 'update_merge_request_note': {
                const args = UpdateMergeRequestNoteSchema.parse(
                    request.params.arguments,
                );
                const note = await updateMergeRequestNote(
                    args.project_id,
                    args.merge_request_iid,
                    args.discussion_id,
                    args.note_id,
                    args.body,
                    args.resolved, // Pass resolved if provided
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
                };
            }

            case 'get_merge_request': {
                const args = GetMergeRequestSchema.parse(request.params.arguments);
                const mergeRequest = await getMergeRequest(
                    args.project_id,
                    args.merge_request_iid,
                );
                return {
                    content: [
                        { type: 'text', text: JSON.stringify(mergeRequest, null, 2) },
                    ],
                };
            }

            case 'get_merge_request_diffs': {
                const args = GetMergeRequestDiffsSchema.parse(request.params.arguments);
                const diffs = await getMergeRequestDiffs(
                    args.project_id,
                    args.merge_request_iid,
                    args.view,
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(diffs, null, 2) }],
                };
            }

            case 'update_merge_request': {
                const args = UpdateMergeRequestSchema.parse(request.params.arguments);
                const { project_id, merge_request_iid, ...options } = args;
                const mergeRequest = await updateMergeRequest(
                    project_id,
                    merge_request_iid,
                    options,
                );
                return {
                    content: [
                        { type: 'text', text: JSON.stringify(mergeRequest, null, 2) },
                    ],
                };
            }

            case 'list_merge_request_discussions': {
                const args = ListMergeRequestDiscussionsSchema.parse(
                    request.params.arguments,
                );
                const discussions = await listMergeRequestDiscussions(
                    args.project_id,
                    args.merge_request_iid,
                );
                return {
                    content: [
                        { type: 'text', text: JSON.stringify(discussions, null, 2) },
                    ],
                };
            }

            case 'list_namespaces': {
                const args = ListNamespacesSchema.parse(request.params.arguments);
                const url = new URL(`${GITLAB_API_URL}/namespaces`);

                if (args.search) {
                    url.searchParams.append('search', args.search);
                }
                if (args.page) {
                    url.searchParams.append('page', args.page.toString());
                }
                if (args.per_page) {
                    url.searchParams.append('per_page', args.per_page.toString());
                }
                if (args.owned) {
                    url.searchParams.append('owned', args.owned.toString());
                }

                const response = await axios.get(url.toString(), {
                    headers: DEFAULT_HEADERS,
                });

                await handleGitLabError(response);
                const namespaces = z.array(GitLabNamespaceSchema).parse(response.data);

                return {
                    content: [
                        { type: 'text', text: JSON.stringify(namespaces, null, 2) },
                    ],
                };
            }

            case 'get_namespace': {
                const args = GetNamespaceSchema.parse(request.params.arguments);
                const url = new URL(
                    `${GITLAB_API_URL}/namespaces/${encodeURIComponent(
                        args.namespace_id,
                    )}`,
                );

                const response = await axios.get(url.toString(), {
                    headers: DEFAULT_HEADERS,
                });

                await handleGitLabError(response);
                const namespace = GitLabNamespaceSchema.parse(response.data);

                return {
                    content: [{ type: 'text', text: JSON.stringify(namespace, null, 2) }],
                };
            }

            case 'verify_namespace': {
                const args = VerifyNamespaceSchema.parse(request.params.arguments);
                const url = new URL(
                    `${GITLAB_API_URL}/namespaces/${encodeURIComponent(args.path)}/exists`,
                );

                const response = await axios.get(url.toString(), {
                    headers: DEFAULT_HEADERS,
                });

                await handleGitLabError(response);
                const namespaceExists = GitLabNamespaceExistsResponseSchema.parse(response.data);

                return {
                    content: [
                        { type: 'text', text: JSON.stringify(namespaceExists, null, 2) },
                    ],
                };
            }

            case 'get_project': {
                const args = GetProjectSchema.parse(request.params.arguments);
                const url = new URL(
                    `${GITLAB_API_URL}/projects/${encodeURIComponent(args.project_id)}`,
                );

                const response = await axios.get(url.toString(), {
                    headers: DEFAULT_HEADERS,
                });

                await handleGitLabError(response);
                const project = GitLabProjectSchema.parse(response.data);

                return {
                    content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
                };
            }

            case 'list_projects': {
                const args = ListProjectsSchema.parse(request.params.arguments);
                const projects = await listProjects(args);

                return {
                    content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }],
                };
            }

            case 'create_note': {
                const args = CreateNoteSchema.parse(request.params.arguments);
                const {
                    project_id, noteable_type, noteable_iid, body,
                } = args;

                const note = await createNote(
                    project_id,
                    noteable_type,
                    noteable_iid,
                    body,
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
                };
            }

            case 'list_issues': {
                const args = ListIssuesSchema.parse(request.params.arguments);
                const { project_id, ...options } = args;
                const issues = await listIssues(project_id, options);
                return {
                    content: [{ type: 'text', text: JSON.stringify(issues, null, 2) }],
                };
            }

            case 'get_issue': {
                const args = GetIssueSchema.parse(request.params.arguments);
                const issue = await getIssue(args.project_id, args.issue_iid);
                return {
                    content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
                };
            }

            case 'update_issue': {
                const args = UpdateIssueSchema.parse(request.params.arguments);
                const { project_id, issue_iid, ...options } = args;
                const issue = await updateIssue(project_id, issue_iid, options);
                return {
                    content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
                };
            }

            case 'delete_issue': {
                const args = DeleteIssueSchema.parse(request.params.arguments);
                await deleteIssue(args.project_id, args.issue_iid);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                { status: 'success', message: 'Issue deleted successfully' },
                                null,
                                2,
                            ),
                        },
                    ],
                };
            }

            case 'list_issue_links': {
                const args = ListIssueLinksSchema.parse(request.params.arguments);
                const links = await listIssueLinks(args.project_id, args.issue_iid);
                return {
                    content: [{ type: 'text', text: JSON.stringify(links, null, 2) }],
                };
            }

            case 'get_issue_link': {
                const args = GetIssueLinkSchema.parse(request.params.arguments);
                const link = await getIssueLink(
                    args.project_id,
                    args.issue_iid,
                    args.issue_link_id,
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(link, null, 2) }],
                };
            }

            case 'create_issue_link': {
                const args = CreateIssueLinkSchema.parse(request.params.arguments);
                const link = await createIssueLink(
                    args.project_id,
                    args.issue_iid,
                    args.target_project_id,
                    args.target_issue_iid,
                    args.link_type,
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(link, null, 2) }],
                };
            }

            case 'delete_issue_link': {
                const args = DeleteIssueLinkSchema.parse(request.params.arguments);
                await deleteIssueLink(
                    args.project_id,
                    args.issue_iid,
                    args.issue_link_id,
                );
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                {
                                    status: 'success',
                                    message: 'Issue link deleted successfully',
                                },
                                null,
                                2,
                            ),
                        },
                    ],
                };
            }

            case 'list_labels': {
                const args = ListLabelsSchema.parse(request.params.arguments);
                const labels = await listLabels(args.project_id, args);
                return {
                    content: [{ type: 'text', text: JSON.stringify(labels, null, 2) }],
                };
            }

            case 'get_label': {
                const args = GetLabelSchema.parse(request.params.arguments);
                const label = await getLabel(
                    args.project_id,
                    args.label_id,
                    args.include_ancestor_groups,
                );
                return {
                    content: [{ type: 'text', text: JSON.stringify(label, null, 2) }],
                };
            }

            case 'create_label': {
                const args = CreateLabelSchema.parse(request.params.arguments);
                const label = await createLabel(args.project_id, args);
                return {
                    content: [{ type: 'text', text: JSON.stringify(label, null, 2) }],
                };
            }

            case 'update_label': {
                const args = UpdateLabelSchema.parse(request.params.arguments);
                const { project_id, label_id, ...options } = args;
                const label = await updateLabel(project_id, label_id, options);
                return {
                    content: [{ type: 'text', text: JSON.stringify(label, null, 2) }],
                };
            }

            case 'delete_label': {
                const args = DeleteLabelSchema.parse(request.params.arguments);
                await deleteLabel(args.project_id, args.label_id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(
                                { status: 'success', message: 'Label deleted successfully' },
                                null,
                                2,
                            ),
                        },
                    ],
                };
            }
            case 'list_group_projects': {
                const args = ListGroupProjectsSchema.parse(request.params.arguments);
                const projects = await listGroupProjects(args);
                return {
                    content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }],
                };
            }
            case 'list_open_merge_requests': {
                const args = ListOpenMergeRequestsSchema.parse(request.params.arguments);
                const mergeRequests = await api.MergeRequests.all({ projectId: args.project_id, state: 'opened' });
                const filteredMergeRequests = args.verbose ? mergeRequests : mergeRequests.map((mr: any) => ({
                    iid: mr.iid,
                    project_id: mr.project_id,
                    title: mr.title,
                    description: mr.description,
                    state: mr.state,
                    web_url: mr.web_url,
                }));
                return {
                    content: [{ type: 'text', text: JSON.stringify(filteredMergeRequests, null, 2) }],
                };
            }
            case 'get_merge_request_details': {
                const args = GetMergeRequestSchema.parse(request.params.arguments);
                const mr = await api.MergeRequests.show(args.project_id, args.merge_request_iid);
                const filteredMr = args.verbose ? mr : {
                    title: mr.title,
                    description: mr.description,
                    state: mr.state,
                    web_url: mr.web_url,
                    target_branch: mr.target_branch,
                    source_branch: mr.source_branch,
                    merge_status: mr.merge_status,
                    detailed_merge_status: mr.detailed_merge_status,
                    diff_refs: mr.diff_refs,
                };
                return {
                    content: [
                        { type: 'text', text: JSON.stringify(filteredMr, null, 2) },
                    ],
                };
            }
            case 'get_merge_request_comments': {
                const args = GetMergeRequestCommentsSchema.parse(request.params.arguments);
                const discussions = await api.MergeRequestDiscussions.all(args.project_id, args.merge_request_iid);
                if (args.verbose) {
                    return {
                        content: [{ type: 'text', text: JSON.stringify(discussions, null, 2) }],
                    };
                }

                const unresolvedNotes = discussions.flatMap((note:any) => note.notes).filter((note:any) => note?.resolved === false);
                const disscussionNotes = unresolvedNotes.filter((note:any) => note?.type === 'DiscussionNote').map((note:any) => ({
                    id: note?.id,
                    noteable_id: note?.noteable_id,
                    body: note?.body,
                    author_name: note?.author.name,
                }));
                const diffNotes = unresolvedNotes.filter((note:any) => note?.type === 'DiffNote').map((note:any) => ({
                    id: note?.id,
                    noteable_id: note?.noteable_id,
                    body: note?.body,
                    author_name: note?.author?.name,
                    position: note?.position,
                }));
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            disscussionNotes,
                            diffNotes,
                        }, null, 2),
                    }],
                };
            }

            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(
                `Invalid arguments: ${error.errors
                    .map((e) => `${e.path.join('.')}: ${e.message}`)
                    .join(', ')}`,
            );
        }
        throw error;
    }
});

/**
 * Initialize and run the server
 * 서버 초기화 및 실행
 */
async function runServer() {
    try {
        console.error('========================');
        console.error(`GitLab MCP Server v${SERVER_VERSION}`);
        console.error(`API URL: ${GITLAB_API_URL}`);
        console.error('========================');

        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error('GitLab MCP Server running on stdio');
    } catch (error) {
        console.error('Error initializing server:', error);
        process.exit(1);
    }
}

runServer().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
