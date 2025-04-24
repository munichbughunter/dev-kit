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
   npm run prepare
   ```
## Environment Variable Configuration

Before running the server, you need to set the following environment variables:

- `GITLAB_PERSONAL_ACCESS_TOKEN`: Your GitLab personal access token.
- `GITLAB_API_URL`: Your GitLab API URL. Default: `https://gitlab.com/api/v4`
- `GITLAB_READ_ONLY_MODE`: Optional: Enable read-only mode. Default set to 'true', restricts the server to only expose read-only operations. Useful for enhanced security or when write access is not needed. Also useful for using with Cursor and it's 40 tool limit.

## Claude Integration / VS-Code Integration

Configure Claude to use Dev Kit by adding this to your Claude configuration or VS-Code configuration:

```json
"mcp": {
        "servers": {
            "dev-kit": {
                "command": "npx",
                "args": [
                    "-y",
                    "@munichbughunter/dev-kit",
                ],
                "env": {
                    "GITLAB_PERSONAL_ACCESS_TOKEN": "<ACCESS TOKEN>",
                    "GITLAB_API_URL": "<GITLAB API URL>",
                    "GITLAB_READ_ONLY_MODE": "false"
                }
            }
        }
    },
```

## Available Tools 🛠️

### Group: gitlab

- **create_or_update_file**: Create or update a single file in a GitLab project. 📝
   - Inputs:
     - `project_id` (string): Project ID or namespace/project_path
     - `file_path` (string): Path to create/update the file
     - `content` (string): File content
     - `commit_message` (string): Commit message
     - `branch` (string): Branch to create/update the file in
     - `previous_path` (optional string): Previous file path when renaming a file
   - Returns: File content and commit details

- **push_files**: Push multiple files in a single commit. 📤
  - Inputs:
     - `project_id` (string): Project ID or namespace/project_path
     - `branch` (string): Branch to push to
     - `files` (array): Array of files to push, each with `file_path` and `content` properties
     - `commit_message` (string): Commit message
   - Returns: Updated branch reference

- **search_repositories**: Search for GitLab projects. 🔍
  - Inputs:
     - `search` (string): Search query
     - `page` (optional number): Page number (default: 1)
     - `per_page` (optional number): Results per page (default: 20, max: 100)
   - Returns: Project search results

- **create_repository**: Create a new GitLab project. ➕
  - Inputs:
     - `name` (string): Project name
     - `description` (optional string): Project description
     - `visibility` (optional string): Project visibility level (public, private, internal)
     - `initialize_with_readme` (optional boolean): Initialize with README
   - Returns: Details of the created project

- **get_file_contents**: Get the contents of a file or directory. 📂
   - Inputs:
     - `project_id` (string): Project ID or namespace/project_path
     - `file_path` (string): Path to the file/directory
     - `ref` (optional string): Branch, tag, or commit SHA (default: default branch)
   - Returns: File/directory content

- **create_issue**: Create a new issue. 🐛
   - Inputs:
     - `project_id` (string): Project ID or namespace/project_path
     - `title` (string): Issue title
     - `description` (string): Issue description
     - `assignee_ids` (optional number[]): Array of assignee IDs
     - `milestone_id` (optional number): Milestone ID
     - `labels` (optional string[]): Array of labels
   - Returns: Details of the created issue

- **create_merge_request**: Create a new merge request. 🚀
   - Inputs:
     - `project_id` (string): Project ID or namespace/project_path
     - `title` (string): Merge request title
     - `description` (string): Merge request description
     - `source_branch` (string): Branch with changes
     - `target_branch` (string): Branch to merge into
     - `allow_collaboration` (optional boolean): Allow collaborators to push commits to the source branch
     - `draft` (optional boolean): Create as a draft merge request
   - Returns: Details of the created merge request

- **fork_repository**: Fork a project. 🍴
   - Inputs:
     - `project_id` (string): Project ID or namespace/project_path to fork
     - `namespace` (optional string): Namespace to fork into (default: user namespace)
   - Returns: Details of the forked project

- **create_branch**: Create a new branch. 🌿
   - Inputs:
     - `project_id` (string): Project ID or namespace/project_path
     - `name` (string): New branch name
     - `ref` (optional string): Ref to create the branch from (branch, tag, commit SHA, default: default branch)
   - Returns: Created branch reference

- **get_merge_request**: Get details of a merge request. ℹ️
    - Inputs:
      - `project_id` (string): Project ID or namespace/project_path
      - `merge_request_iid` (number): Merge request IID
    - Returns: Merge request details

- **get_merge_request_diffs**: Get changes (diffs) of a merge request. 
    - Inputs:
      - `project_id` (string): Project ID or namespace/project_path
      - `merge_request_iid` (number): Merge request IID
      - `view` (optional string): Diff view type ('inline' or 'parallel')
    - Returns: Array of merge request diff information

- **update_merge_request**: Update a merge request. 🔄
    - Inputs:
      - `project_id` (string): Project ID or namespace/project_path
      - `merge_request_iid` (number): Merge request IID
      - `title` (optional string): New title
      - `description` (string): New description
      - `target_branch` (optional string): New target branch
      - `state_event` (optional string): Merge request state change event ('close', 'reopen')
      - `remove_source_branch` (optional boolean): Remove source branch after merge
      - `allow_collaboration` (optional boolean): Allow collaborators to push commits to the source branch
    - Returns: Updated merge request details

- **create_note**: Create a new note (comment) to an issue or merge request. 💬
    - Inputs:
      - `project_id` (string): Project ID or namespace/project_path
      - `noteable_type` (string): Type of noteable ("issue" or "merge_request")
      - `noteable_iid` (number): IID of the issue or merge request
      - `body` (string): Note content
    - Returns: Details of the created note

- **list_merge_request_discussions**: List discussion items for a merge request. 💬
    - Inputs:
      - `project_id` (string): Project ID or namespace/project_path
      - `merge_request_iid` (number): Merge request IID
    - Returns: Merge request discussions

- **update_merge_request_note**: Modify an existing merge request thread note
    - Inputs:
      - `project_id` (string): Project ID or namespace/project_path
      - `merge_request_iid` (number): Merge request IID
      - `discussion_id` (string): The ID of a thread
      - `note_id` (number): The ID of a thread note
      - `body`(string): The content of the note or reply
      - `resolved` (boolean): OPTIONAL: Resolve or unresolve the note
    - Returns: Updated merge request note

- **get_issue_link**: Get a specific issue link. 
    - Inputs:
      - `project_id` (string): Project ID or namespace/project_path
      - `issue_iid` (number): The internal ID of a project's issue
      - `issue_link_id` (number): ID of an issue relationship
    - Returns: The issue link

- **list_projects**: List accessible projects with rich filtering options 📊
    - Inputs:
      - Search/filtering:
        - `search`
        - `owned`
        - `membership`
        - `archived`
        - `visibility`
      - Features filtering:
        - `with_issues_enabled`
        - `with_merge_requests_enabled`
      - Sorting:
        - `order_by`
        - `sort`
      - Access control:
        - `min_access_level`
      - Pagination:
        - `page`
        - `per_page`
        - `simple`
    - Returns: Array of projects 

- **list_labels**: List all labels for a project with filtering options 🏷️
    - Inputs:
      - `project_id` (string): Project ID or path
      - `with_counts` (optional): Include issue and merge request counts
      - `include_ancestor_groups` (optional): Include ancestor groups
      - `search` (optional): Filter labels by keyword
    - Returns: Array of labels

- **get_label**: Get a single label from a project
    - Inputs:
      -  `project_id` (string): Project ID or path
      - `label_id` (number/string): Label ID or name
      - `include_ancestor_groups` (optional): Include ancestor groups 
    - Returns: label details

- **create_label**: Create a new label in an object 🏷️➕
    - Inputs:
      - `project_id` (string): Project ID or path
      - `name` (string): Label name
      - `color` (string): Color in hex format (e.g., "#FF0000")
      - `description` (optional): Label description
      - `priority` (optional): Label priority
    - Returns: Created label details

- **update_label**: Update an existing label in a project 🏷️✏️
    - Inputs:
      - `project_id` (string): Project ID or path
      - `label_id` (number/string): Label ID or name
      - `new_name` (optional): New label name
      - `color` (optional): New color in hex format
      - `description` (optional): New description
      - `priority` (optional): New priority
    - Returns: Updated label details

- **delete_label**: Delete a label from a project 🏷️❌
    - Inputs:
      - `project_id` (string): Project ID or path
      - `label_id` (number/string): Label ID or name
    - Returns: Success message

- **list_group_projects**: List all projects in a GitLab group. 📂
    - Inputs:
      - `group_id` (string): Project ID or namespace/project_path
      - Filtering options:
        - `include_subgroups` (optional boolean): Include projects from subgroups
        - `search` (optional string): Search term to filter projects
        - `archived` (optional boolean): Filter for archived projects
        - `visibility` (optional string): Filter by project visibility (public/internal/private)
        - `with_programming_language` (optional string): Filter by programming language
        - `starred` (optional boolean): Filter by starred projects
      - Feature filtering:
        - `with_issues_enabled` (optional boolean): Filter projects with issues feature enabled
        - `with_merge_requests_enabled` (optional boolean): Filter projects with merge requests feature enabled
        - `min_access_level` (optional number): Filter by minimum access level
      - Pagination:
        - `page` (optional number): Page number
        - `per_page` (optional number): Results per page
      - Sorting:
        - `order_by` (optional string): Field to sort by
        - `sort` (optional string): Sort direction (asc/desc)
      - Additional data:
        - `statistics` (optional boolean): Include project statistics
        - `with_custom_attributes` (optional boolean): Include custom attributes
        - `with_security_reports` (optional boolean): Include security reports
    - Returns: List of projects



## Development

To contribute to this project:

1. Clone the repository
2. Install dependencies: `npm install`
3. Make your changes
4. Build: `npm run prepare`
5. Test your changes

## License

MIT
