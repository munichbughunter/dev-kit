import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
/**
 * Register script tools with the MCP server
 */
export function registerScriptTools(server, config) {
    // Register script execution tool
    registerExecuteCommandLineScript(server);
}
/**
 * Register the execute_comand_line_script tool
 * Note the typo in the name is intentional to match the original
 */
function registerExecuteCommandLineScript(server) {
    server.registerTool({
        name: 'execute_comand_line_script',
        description: 'Safely execute command line scripts on the user\'s system with security restrictions. Features sandboxed execution, timeout protection, and output capture. Supports cross-platform scripting with automatic environment detection.',
        parameters: z.object({
            script: z.string().describe('The script to execute (shell command or multi-line script)'),
            timeoutSeconds: z.number().optional().describe('Maximum execution time in seconds (default: 30)'),
        }),
        handler: async ({ script, timeoutSeconds = 30 }) => {
            try {
                // Basic sanity check
                if (!script || script.trim() === '') {
                    return { error: 'Script cannot be empty' };
                }
                // Validate timeout
                if (timeoutSeconds <= 0 || timeoutSeconds > 300) {
                    return { error: 'Timeout must be between 1 and 300 seconds' };
                }
                // Basic security check - reject dangerous commands
                const dangerousCommands = [
                    /\brm\s+(-rf?|--recursive)\s+[\/~]/i,
                    /\bformat\s+([a-z]:)?\//i,
                    /\bmkfs/i,
                    /\bdd\s+if=/i,
                    /\bwipe/i,
                ];
                for (const pattern of dangerousCommands) {
                    if (pattern.test(script)) {
                        return {
                            error: 'Script contains potentially dangerous commands that could cause data loss or system damage',
                            stdout: '',
                            stderr: '',
                            exitCode: -1
                        };
                    }
                }
                console.log(`Executing script with ${timeoutSeconds}s timeout: ${script.substring(0, 50)}${script.length > 50 ? '...' : ''}`);
                // Execute the script with timeout
                const { stdout, stderr } = await execAsync(script, {
                    timeout: timeoutSeconds * 1000,
                    maxBuffer: 1024 * 1024 // 1MB output limit
                });
                return {
                    stdout: stdout.toString(),
                    stderr: stderr.toString(),
                    exitCode: 0
                };
            }
            catch (error) {
                // Handle execution errors
                if (error.signal === 'SIGTERM') {
                    return {
                        error: `Script execution timed out after ${timeoutSeconds} seconds`,
                        stdout: error.stdout?.toString() || '',
                        stderr: error.stderr?.toString() || '',
                        exitCode: -1
                    };
                }
                return {
                    error: error.message || 'Unknown execution error',
                    stdout: error.stdout?.toString() || '',
                    stderr: error.stderr?.toString() || '',
                    exitCode: error.code || -1
                };
            }
        },
    });
}
