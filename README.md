# Dev Kit - Model Context Protocol (MCP) Server

Dev Kit is a powerful Model Context Protocol (MCP) server designed to enhance AI model capabilities by providing seamless integration with various development tools and services. It serves as a bridge between AI models (like Claude) and essential development services such as Jira, Confluence, GitHub, and GitLab.

## Overview

This TypeScript implementation of the Dev Kit server implements the Model Context Protocol, allowing AI models to interact with development tools in a structured and secure way. It's particularly useful for automating development workflows, managing documentation, and handling version control operations through natural language interactions.

## Prerequisites

* Node.js 16.x or higher
* Various API keys and tokens for the services you want to use

## Installation

### Installing via npm

```bash
npm install -g dev-kit
```

### Manual Installation from Source

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run the server:
   ```bash
   node build/index.js
   ```

## Configuration

Create a `.env` file with your configuration:

```
# Required for Atlassian services (Jira & Confluence)
ATLASSIAN_HOST=        # Your Atlassian instance URL (e.g., https://your-domain.atlassian.net)
ATLASSIAN_EMAIL=       # Your Atlassian account email
ATLASSIAN_TOKEN=       # Your Atlassian API token

# Required for GitLab services
GITLAB_HOST=           # Your GitLab instance URL
GITLAB_TOKEN=          # Your GitLab personal access token

# Required for GitHub services
GITHUB_TOKEN=          # Your GitHub personal access token

# Optional configurations
ENABLE_TOOLS=          # Comma-separated list of tool groups to enable (empty = all enabled)
PROXY_URL=             # Optional: HTTP/HTTPS proxy URL if needed
PORT=                  # Port for SSE server (default: 8080)
```

## Claude Integration

Configure Claude to use Dev Kit by adding this to your Claude configuration:

```json
{
  "mcpServers": {
    "dev_kit": {
      "command": "dev-kit",
      "args": [
        "-env", "/path/to/.env",
        "-protocol", "stdio"  // or "sse" for Server-Sent Events protocol
      ]
    }
  }
}
```

## Protocol Support

Dev Kit supports two protocols for communication:

1. **STDIO** (default): Standard input/output based communication
2. **SSE** (Server-Sent Events): HTTP-based protocol that enables real-time data streaming

To use SSE protocol:

1. Set the `-protocol` flag to `sse` when starting the server
2. Configure the `PORT` environment variable (default: 8080) if needed
3. The server will be available at `http://localhost:PORT`

## Enable Tools

You can use the `ENABLE_TOOLS` environment variable to specify which tool groups to enable. It is a comma-separated list of tool groups. If not set, all tools will be enabled. Leave it empty to enable all tools.

## Available Tools

### Group: confluence

- **confluence_search**: Search Confluence
- **confluence_get_page**: Get Confluence page content
- **confluence_create_page**: Create a new Confluence page
- **confluence_update_page**: Update an existing Confluence page

### Group: github

- **github_list_repos**: List GitHub repositories for a user or organization
- **github_get_repo**: Get GitHub repository details
- **github_list_prs**: List pull requests
- **github_get_pr_details**: Get pull request details
- **github_create_pr_comment**: Create a comment on a pull request
- **github_get_file_content**: Get file content from a GitHub repository
- **github_create_pr**: Create a new pull request
- **github_pr_action**: Approve or close a pull request
- **github_list_issues**: List GitHub issues for a repository
- **github_get_issue**: Get GitHub issue details
- **github_comment_issue**: Comment on a GitHub issue
- **github_issue_action**: Close or reopen a GitHub issue

### Group: gitlab

- **gitlab_list_projects**: List GitLab projects
- **gitlab_get_project**: Get GitLab project details
- **gitlab_list_mrs**: List merge requests
- **gitlab_get_mr_details**: Get merge request details
- **gitlab_create_MR_note**: Create a note on a merge request
- **gitlab_get_file_content**: Get file content from a GitLab repository
- **gitlab_list_pipelines**: List pipelines for a GitLab project
- **gitlab_list_commits**: List commits in a GitLab project within a date range
- **gitlab_get_commit_details**: Get details of a commit
- **gitlab_list_user_events**: List GitLab user events within a date range
- **gitlab_list_group_users**: List all users in a GitLab group
- **gitlab_create_mr**: Create a new merge request

### Group: jira

- **jira_get_issue**: Retrieve detailed information about a specific Jira issue
- **jira_search_issue**: Search for Jira issues using JQL
- **jira_list_sprints**: List all active and future sprints for a specific Jira board
- **jira_create_issue**: Create a new Jira issue with specified details
- **jira_update_issue**: Modify an existing Jira issue's details
- **jira_list_statuses**: Retrieve all available issue status IDs and their names for a specific Jira project
- **jira_transition_issue**: Transition an issue through its workflow using a valid transition ID

### Group: script

- **execute_comand_line_script**: Safely execute command line scripts on the user's system with security restrictions

## Development

To contribute to this project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Make your changes
4. Build: `npm run build`
5. Test your changes

## License

MIT
