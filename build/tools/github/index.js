import { z } from 'zod';
import { Octokit } from '@octokit/rest';
/**
 * Register GitHub tools with the MCP server
 */
export function registerGitHubTools(server, config) {
    // Check if GitHub configuration is available
    if (!config.githubToken) {
        console.warn('GitHub token missing, GitHub tools will not be available');
        return;
    }
    // Create GitHub client
    const octokit = new Octokit({
        auth: config.githubToken,
    });
    // Register GitHub tools
    registerListRepos(server, octokit);
    registerGetRepo(server, octokit);
    registerListPRs(server, octokit);
    registerGetPRDetails(server, octokit);
    registerCreatePRComment(server, octokit);
    registerGetFileContent(server, octokit);
    registerCreatePR(server, octokit);
    registerPRAction(server, octokit);
    registerListIssues(server, octokit);
    registerGetIssue(server, octokit);
    registerCommentIssue(server, octokit);
    registerIssueAction(server, octokit);
}
/**
 * Register the github_list_repos tool
 */
function registerListRepos(server, octokit) {
    server.registerTool({
        name: 'github_list_repos',
        description: 'List GitHub repositories for a user or organization',
        parameters: z.object({
            owner: z.string().describe('GitHub username or organization name'),
            type: z.enum(['all', 'owner', 'public', 'private', 'member']).optional().describe('Type of repositories to list'),
            sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional().describe('How to sort the results'),
            direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ owner, type, sort, direction, perPage, page }) => {
            try {
                const { data } = await octokit.repos.listForUser({
                    username: owner,
                    type,
                    sort,
                    direction,
                    per_page: perPage,
                    page,
                });
                return { repositories: data };
            }
            catch (error) {
                return { error: `Failed to list repositories: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_get_repo tool
 */
function registerGetRepo(server, octokit) {
    server.registerTool({
        name: 'github_get_repo',
        description: 'Get GitHub repository details',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
        }),
        handler: async ({ owner, repo }) => {
            try {
                const { data } = await octokit.repos.get({
                    owner,
                    repo,
                });
                return { repository: data };
            }
            catch (error) {
                return { error: `Failed to get repository: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_list_prs tool
 */
function registerListPRs(server, octokit) {
    server.registerTool({
        name: 'github_list_prs',
        description: 'List pull requests',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            state: z.enum(['open', 'closed', 'all']).optional().describe('PR state to filter by'),
            sort: z.enum(['created', 'updated', 'popularity', 'long-running']).optional().describe('How to sort the results'),
            direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ owner, repo, state, sort, direction, perPage, page }) => {
            try {
                const { data } = await octokit.pulls.list({
                    owner,
                    repo,
                    state,
                    sort,
                    direction,
                    per_page: perPage,
                    page,
                });
                return { pullRequests: data };
            }
            catch (error) {
                return { error: `Failed to list pull requests: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_get_pr_details tool
 */
function registerGetPRDetails(server, octokit) {
    server.registerTool({
        name: 'github_get_pr_details',
        description: 'Get pull request details',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            prNumber: z.number().describe('Pull request number'),
        }),
        handler: async ({ owner, repo, prNumber }) => {
            try {
                const { data: pr } = await octokit.pulls.get({
                    owner,
                    repo,
                    pull_number: prNumber,
                });
                const { data: comments } = await octokit.pulls.listReviews({
                    owner,
                    repo,
                    pull_number: prNumber,
                });
                const { data: commits } = await octokit.pulls.listCommits({
                    owner,
                    repo,
                    pull_number: prNumber,
                });
                return {
                    pullRequest: pr,
                    reviews: comments,
                    commits: commits,
                };
            }
            catch (error) {
                return { error: `Failed to get pull request details: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_create_pr_comment tool
 */
function registerCreatePRComment(server, octokit) {
    server.registerTool({
        name: 'github_create_pr_comment',
        description: 'Create a comment on a pull request',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            prNumber: z.number().describe('Pull request number'),
            body: z.string().describe('Comment content'),
        }),
        handler: async ({ owner, repo, prNumber, body }) => {
            try {
                const { data } = await octokit.issues.createComment({
                    owner,
                    repo,
                    issue_number: prNumber,
                    body,
                });
                return { comment: data };
            }
            catch (error) {
                return { error: `Failed to create comment: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_get_file_content tool
 */
function registerGetFileContent(server, octokit) {
    server.registerTool({
        name: 'github_get_file_content',
        description: 'Get file content from a GitHub repository',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            path: z.string().describe('Path to the file'),
            ref: z.string().optional().describe('The name of the commit/branch/tag'),
        }),
        handler: async ({ owner, repo, path, ref }) => {
            try {
                const { data } = await octokit.repos.getContent({
                    owner,
                    repo,
                    path,
                    ref,
                });
                if (Array.isArray(data)) {
                    return { error: 'Path points to a directory, not a file' };
                }
                // @ts-ignore - content exists on file objects but not directory objects
                const content = Buffer.from(data.content, 'base64').toString('utf-8');
                return {
                    content,
                    encoding: 'utf-8',
                    sha: data.sha,
                    size: data.size,
                    name: data.name,
                    path: data.path,
                    url: data.html_url,
                };
            }
            catch (error) {
                return { error: `Failed to get file content: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_create_pr tool
 */
function registerCreatePR(server, octokit) {
    server.registerTool({
        name: 'github_create_pr',
        description: 'Create a new pull request',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            title: z.string().describe('Pull request title'),
            body: z.string().optional().describe('Pull request description'),
            head: z.string().describe('The name of the branch where your changes are implemented'),
            base: z.string().describe('The name of the branch you want the changes pulled into'),
            draft: z.boolean().optional().describe('Whether to create a draft pull request'),
        }),
        handler: async ({ owner, repo, title, body, head, base, draft }) => {
            try {
                const { data } = await octokit.pulls.create({
                    owner,
                    repo,
                    title,
                    body,
                    head,
                    base,
                    draft,
                });
                return {
                    pullRequest: data,
                    url: data.html_url,
                };
            }
            catch (error) {
                return { error: `Failed to create pull request: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_pr_action tool
 */
function registerPRAction(server, octokit) {
    server.registerTool({
        name: 'github_pr_action',
        description: 'Approve or close a pull request',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            prNumber: z.number().describe('Pull request number'),
            action: z.enum(['approve', 'close']).describe('Action to perform'),
            comment: z.string().optional().describe('Comment to include with the action'),
        }),
        handler: async ({ owner, repo, prNumber, action, comment }) => {
            try {
                if (action === 'approve') {
                    const { data } = await octokit.pulls.createReview({
                        owner,
                        repo,
                        pull_number: prNumber,
                        event: 'APPROVE',
                        body: comment,
                    });
                    return { review: data };
                }
                else if (action === 'close') {
                    const { data } = await octokit.pulls.update({
                        owner,
                        repo,
                        pull_number: prNumber,
                        state: 'closed',
                    });
                    if (comment) {
                        await octokit.issues.createComment({
                            owner,
                            repo,
                            issue_number: prNumber,
                            body: comment,
                        });
                    }
                    return { pullRequest: data };
                }
                return { error: 'Invalid action' };
            }
            catch (error) {
                return { error: `Failed to perform action: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_list_issues tool
 */
function registerListIssues(server, octokit) {
    server.registerTool({
        name: 'github_list_issues',
        description: 'List GitHub issues for a repository',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            state: z.enum(['open', 'closed', 'all']).optional().describe('Issue state to filter by'),
            labels: z.string().optional().describe('Comma-separated list of label names'),
            sort: z.enum(['created', 'updated', 'comments']).optional().describe('How to sort the results'),
            direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
            since: z.string().optional().describe('Only issues updated after this time (ISO 8601)'),
            perPage: z.number().optional().describe('Number of results per page (max 100)'),
            page: z.number().optional().describe('Page number for pagination'),
        }),
        handler: async ({ owner, repo, state, labels, sort, direction, since, perPage, page }) => {
            try {
                const { data } = await octokit.issues.listForRepo({
                    owner,
                    repo,
                    state,
                    labels,
                    sort,
                    direction,
                    since,
                    per_page: perPage,
                    page,
                });
                return { issues: data };
            }
            catch (error) {
                return { error: `Failed to list issues: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_get_issue tool
 */
function registerGetIssue(server, octokit) {
    server.registerTool({
        name: 'github_get_issue',
        description: 'Get GitHub issue details',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            issueNumber: z.number().describe('Issue number'),
        }),
        handler: async ({ owner, repo, issueNumber }) => {
            try {
                const { data: issue } = await octokit.issues.get({
                    owner,
                    repo,
                    issue_number: issueNumber,
                });
                const { data: comments } = await octokit.issues.listComments({
                    owner,
                    repo,
                    issue_number: issueNumber,
                });
                return {
                    issue,
                    comments,
                };
            }
            catch (error) {
                return { error: `Failed to get issue: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_comment_issue tool
 */
function registerCommentIssue(server, octokit) {
    server.registerTool({
        name: 'github_comment_issue',
        description: 'Comment on a GitHub issue',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            issueNumber: z.number().describe('Issue number'),
            body: z.string().describe('Comment content'),
        }),
        handler: async ({ owner, repo, issueNumber, body }) => {
            try {
                const { data } = await octokit.issues.createComment({
                    owner,
                    repo,
                    issue_number: issueNumber,
                    body,
                });
                return { comment: data };
            }
            catch (error) {
                return { error: `Failed to create comment: ${error.message}` };
            }
        },
    });
}
/**
 * Register the github_issue_action tool
 */
function registerIssueAction(server, octokit) {
    server.registerTool({
        name: 'github_issue_action',
        description: 'Close or reopen a GitHub issue',
        parameters: z.object({
            owner: z.string().describe('Repository owner (user or organization)'),
            repo: z.string().describe('Repository name'),
            issueNumber: z.number().describe('Issue number'),
            action: z.enum(['close', 'reopen']).describe('Action to perform'),
            comment: z.string().optional().describe('Comment to include with the action'),
        }),
        handler: async ({ owner, repo, issueNumber, action, comment }) => {
            try {
                if (comment) {
                    await octokit.issues.createComment({
                        owner,
                        repo,
                        issue_number: issueNumber,
                        body: comment,
                    });
                }
                const { data } = await octokit.issues.update({
                    owner,
                    repo,
                    issue_number: issueNumber,
                    state: action === 'close' ? 'closed' : 'open',
                });
                return { issue: data };
            }
            catch (error) {
                return { error: `Failed to perform action: ${error.message}` };
            }
        },
    });
}
