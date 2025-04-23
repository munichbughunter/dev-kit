import { isToolGroupEnabled } from '../config.js';
import { registerConfluenceTools } from './confluence/index.js';
import { registerGitHubTools } from './github/index.js';
import { registerGitLabTools } from './gitlab/index.js';
import { registerJiraTools } from './jira/index.js';
import { registerScriptTools } from './script/index.js';
/**
 * Register all enabled tools with the MCP server
 */
export function registerTools(server, config) {
    // Register Confluence tools
    if (isToolGroupEnabled(config, 'confluence')) {
        registerConfluenceTools(server, config);
    }
    // Register GitHub tools
    if (isToolGroupEnabled(config, 'github')) {
        registerGitHubTools(server, config);
    }
    // Register GitLab tools
    if (isToolGroupEnabled(config, 'gitlab')) {
        registerGitLabTools(server, config);
    }
    // Register Jira tools
    if (isToolGroupEnabled(config, 'jira')) {
        registerJiraTools(server, config);
    }
    // Register Script tools
    if (isToolGroupEnabled(config, 'script')) {
        registerScriptTools(server, config);
    }
}
