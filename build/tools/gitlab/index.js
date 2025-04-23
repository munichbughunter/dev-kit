import { z } from 'zod';
import { Gitlab } from 'gitlab';
/**
 * Register GitLab tools with the MCP server
 */
export function registerGitLabTools(server, config) {
    // Check if GitLab configuration is available
    if (!config.gitlabHost || !config.gitlabToken) {
        console.warn('GitLab configuration missing, GitLab tools will not be available');
        return;
    }
    // Create GitLab client
    const gitlab = new Gitlab({
        host: config.gitlabHost,
        token: config.gitlabToken,
    });
    // Register GitLab tools
    registerListProjects(server, gitlab);
    registerGetProject(server, gitlab);
    registerListMRs(server, gitlab);
    registerGetMRDetails(server, gitlab);
    registerCreateMRNote(server, gitlab);
    registerGetFileContent(server, gitlab);
    registerListPipelines(server, gitlab);
    registerListCommits(server, gitlab);
    registerGetCommitDetails(server, gitlab);
    registerListUserEvents(server, gitlab);
    registerListGroupUsers(server, gitlab);
    registerCreateMR(server, gitlab);
}
/**
 * Register the gitlab_list_projects tool
 */
function registerListProjects(server, gitlab) {
    server.registerTool({
        name: 'gitlab_list_projects',
        description: 'List GitLab projects',
        parameters: z.object({
            searchTerm: z.string().optional().describe('Search term for filtering projects'),
            owned: z.boolean().optional().describe('List only projects explicitly owned by the authenticated user'),
            membership: z.boolean().optional().describe('List only projects which the authenticated user is a member of'),
            starred: z.boolean().optional().describe('List only projects starred by the authenticated user'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ searchTerm, owned, membership, starred, perPage, page }) => {
            try {
                const projects = await gitlab.Projects.all({
                    search: searchTerm,
                    owned,
                    membership,
                    starred,
                    per_page: perPage,
                    page,
                });
                return { projects };
            }
            catch (error) {
                return { error: `Failed to list projects: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_get_project tool
 */
function registerGetProject(server, gitlab) {
    server.registerTool({
        name: 'gitlab_get_project',
        description: 'Get GitLab project details',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
        }),
        handler: async ({ projectId }) => {
            try {
                const project = await gitlab.Projects.show(projectId);
                return { project };
            }
            catch (error) {
                return { error: `Failed to get project: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_list_mrs tool
 */
function registerListMRs(server, gitlab) {
    server.registerTool({
        name: 'gitlab_list_mrs',
        description: 'List merge requests',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
            state: z.enum(['opened', 'closed', 'locked', 'merged', 'all']).optional().describe('MR state to filter by'),
            orderBy: z.enum(['created_at', 'updated_at', 'title', 'priority']).optional().describe('How to order the results'),
            sort: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ projectId, state, orderBy, sort, perPage, page }) => {
            try {
                const mrs = await gitlab.MergeRequests.all({
                    projectId,
                    state,
                    orderBy,
                    sort,
                    perPage,
                    page,
                });
                return { mergeRequests: mrs };
            }
            catch (error) {
                return { error: `Failed to list merge requests: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_get_mr_details tool
 */
function registerGetMRDetails(server, gitlab) {
    server.registerTool({
        name: 'gitlab_get_mr_details',
        description: 'Get merge request details',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
            mergeRequestIid: z.number().describe('The internal ID of the merge request'),
        }),
        handler: async ({ projectId, mergeRequestIid }) => {
            try {
                const mr = await gitlab.MergeRequests.show(projectId, mergeRequestIid);
                const notes = await gitlab.MergeRequestNotes.all(projectId, mergeRequestIid);
                const commits = await gitlab.MergeRequests.commits(projectId, mergeRequestIid);
                return {
                    mergeRequest: mr,
                    notes,
                    commits,
                };
            }
            catch (error) {
                return { error: `Failed to get merge request details: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_create_MR_note tool
 */
function registerCreateMRNote(server, gitlab) {
    server.registerTool({
        name: 'gitlab_create_MR_note',
        description: 'Create a note on a merge request',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
            mergeRequestIid: z.number().describe('The internal ID of the merge request'),
            body: z.string().describe('The content of the note'),
        }),
        handler: async ({ projectId, mergeRequestIid, body }) => {
            try {
                const note = await gitlab.MergeRequestNotes.create(projectId, mergeRequestIid, body);
                return { note };
            }
            catch (error) {
                return { error: `Failed to create note: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_get_file_content tool
 */
function registerGetFileContent(server, gitlab) {
    server.registerTool({
        name: 'gitlab_get_file_content',
        description: 'Get file content from a GitLab repository',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
            filePath: z.string().describe('Path to the file'),
            ref: z.string().optional().describe('The name of the branch, tag or commit'),
        }),
        handler: async ({ projectId, filePath, ref = 'main' }) => {
            try {
                const file = await gitlab.RepositoryFiles.show(projectId, filePath, ref);
                const content = Buffer.from(file.content, file.encoding === 'base64' ? 'base64' : 'utf8').toString('utf8');
                return {
                    content,
                    filePath: file.file_path,
                    fileName: file.file_name,
                    size: content.length,
                    encoding: 'utf8',
                    ref: file.ref,
                    blobId: file.blob_id,
                    commitId: file.commit_id,
                };
            }
            catch (error) {
                return { error: `Failed to get file content: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_list_pipelines tool
 */
function registerListPipelines(server, gitlab) {
    server.registerTool({
        name: 'gitlab_list_pipelines',
        description: 'List pipelines for a GitLab project',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
            scope: z.enum(['running', 'pending', 'finished', 'branches', 'tags', 'all']).optional().describe('The scope of pipelines'),
            status: z.enum(['created', 'waiting_for_resource', 'preparing', 'pending', 'running', 'success', 'failed', 'canceled', 'skipped', 'manual', 'scheduled']).optional().describe('The status of pipelines'),
            ref: z.string().optional().describe('The ref (branch or tag) to filter by'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ projectId, scope, status, ref, perPage, page }) => {
            try {
                const pipelines = await gitlab.Pipelines.all(projectId, {
                    scope,
                    status,
                    ref,
                    per_page: perPage,
                    page,
                });
                return { pipelines };
            }
            catch (error) {
                return { error: `Failed to list pipelines: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_list_commits tool
 */
function registerListCommits(server, gitlab) {
    server.registerTool({
        name: 'gitlab_list_commits',
        description: 'List commits in a GitLab project within a date range',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
            refName: z.string().optional().describe('The branch or tag name to filter by'),
            since: z.string().optional().describe('Only commits after this date (ISO 8601)'),
            until: z.string().optional().describe('Only commits before this date (ISO 8601)'),
            path: z.string().optional().describe('The file path to filter by'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ projectId, refName, since, until, path, perPage, page }) => {
            try {
                const commits = await gitlab.Commits.all(projectId, {
                    ref_name: refName,
                    since,
                    until,
                    path,
                    per_page: perPage,
                    page,
                });
                return { commits };
            }
            catch (error) {
                return { error: `Failed to list commits: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_get_commit_details tool
 */
function registerGetCommitDetails(server, gitlab) {
    server.registerTool({
        name: 'gitlab_get_commit_details',
        description: 'Get details of a commit',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
            sha: z.string().describe('The commit hash'),
        }),
        handler: async ({ projectId, sha }) => {
            try {
                const commit = await gitlab.Commits.show(projectId, sha);
                const diff = await gitlab.Commits.diff(projectId, sha);
                return {
                    commit,
                    diff,
                };
            }
            catch (error) {
                return { error: `Failed to get commit details: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_list_user_events tool
 */
function registerListUserEvents(server, gitlab) {
    server.registerTool({
        name: 'gitlab_list_user_events',
        description: 'List GitLab user events within a date range',
        parameters: z.object({
            userId: z.number().optional().describe('The ID of the user (defaults to current user)'),
            action: z.string().optional().describe('The action to filter by (e.g., "created", "updated", "closed")'),
            targetType: z.string().optional().describe('The target type to filter by (e.g., "issue", "milestone", "merge_request")'),
            before: z.string().optional().describe('Events created before this date (ISO 8601)'),
            after: z.string().optional().describe('Events created after this date (ISO 8601)'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ userId, action, targetType, before, after, perPage, page }) => {
            try {
                const params = {
                    action,
                    target_type: targetType,
                    before,
                    after,
                    per_page: perPage,
                    page,
                };
                const events = userId
                    ? await gitlab.Users.events(userId, params)
                    : await gitlab.Events.all(params);
                return { events };
            }
            catch (error) {
                return { error: `Failed to list user events: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_list_group_users tool
 */
function registerListGroupUsers(server, gitlab) {
    server.registerTool({
        name: 'gitlab_list_group_users',
        description: 'List all users in a GitLab group',
        parameters: z.object({
            groupId: z.number().describe('The ID of the group'),
            query: z.string().optional().describe('Search query to filter users'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ groupId, query, perPage, page }) => {
            try {
                const users = await gitlab.GroupMembers.all(groupId, {
                    query,
                    per_page: perPage,
                    page,
                });
                return { users };
            }
            catch (error) {
                return { error: `Failed to list group users: ${error.message}` };
            }
        },
    });
}
/**
 * Register the gitlab_create_mr tool
 */
function registerCreateMR(server, gitlab) {
    server.registerTool({
        name: 'gitlab_create_mr',
        description: 'Create a new merge request',
        parameters: z.object({
            projectId: z.number().describe('The ID or URL-encoded path of the project'),
            sourceBranch: z.string().describe('The source branch name'),
            targetBranch: z.string().describe('The target branch name'),
            title: z.string().describe('The title of the merge request'),
            description: z.string().optional().describe('The description of the merge request'),
            assigneeId: z.number().optional().describe('The ID of the user to assign the MR to'),
            targetProjectId: z.number().optional().describe('The ID of the target project (if different from source)'),
            labels: z.string().optional().describe('Comma-separated list of labels to apply'),
            removeSourceBranch: z.boolean().optional().describe('Whether to remove the source branch after merge'),
        }),
        handler: async ({ projectId, sourceBranch, targetBranch, title, description, assigneeId, targetProjectId, labels, removeSourceBranch }) => {
            try {
                const mr = await gitlab.MergeRequests.create(projectId, sourceBranch, targetBranch, title, {
                    description,
                    assignee_id: assigneeId,
                    target_project_id: targetProjectId,
                    labels,
                    remove_source_branch: removeSourceBranch,
                });
                return { mergeRequest: mr };
            }
            catch (error) {
                return { error: `Failed to create merge request: ${error.message}` };
            }
        },
    });
}
