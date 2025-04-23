import { z } from 'zod';
// Define configuration schema using Zod
const ConfigSchema = z.object({
    // Server configuration
    port: z.string().optional().default('8080'),
    enableTools: z.string().optional().default(''),
    proxyUrl: z.string().optional(),
    // Atlassian configuration
    atlassianHost: z.string().optional(),
    atlassianEmail: z.string().optional(),
    atlassianToken: z.string().optional(),
    // GitLab configuration
    gitlabHost: z.string().optional(),
    gitlabToken: z.string().optional(),
    // GitHub configuration
    githubToken: z.string().optional(),
});
/**
 * Load configuration from environment variables
 */
export function loadConfig() {
    const config = {
        port: process.env.PORT,
        enableTools: process.env.ENABLE_TOOLS,
        proxyUrl: process.env.PROXY_URL,
        atlassianHost: process.env.ATLASSIAN_HOST,
        atlassianEmail: process.env.ATLASSIAN_EMAIL,
        atlassianToken: process.env.ATLASSIAN_TOKEN,
        gitlabHost: process.env.GITLAB_HOST,
        gitlabToken: process.env.GITLAB_TOKEN,
        githubToken: process.env.GITHUB_TOKEN,
    };
    // Parse and validate configuration
    return ConfigSchema.parse(config);
}
/**
 * Check if a specific tool group is enabled in the configuration
 */
export function isToolGroupEnabled(config, group) {
    if (!config.enableTools || config.enableTools.trim() === '') {
        return true; // All tools are enabled by default
    }
    const enabledGroups = config.enableTools.split(',').map(g => g.trim());
    return enabledGroups.includes(group);
}
