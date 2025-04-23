import { MCPServer, StdioTransport, ServerSentEventsTransport } from '@modelcontextprotocol/sdk';
import { registerTools } from './tools/index.js';
import http from 'http';
import chalk from 'chalk';
/**
 * Start the Model Context Protocol server with the specified protocol
 */
export async function startMCPServer(protocol, port, config) {
    // Create MCP server
    const server = new MCPServer();
    // Register tools with the server
    registerTools(server, config);
    // Set up transport based on protocol
    if (protocol === 'sse') {
        console.log(chalk.blue(`Starting MCP Server with SSE protocol on port ${port}`));
        // Create HTTP server
        const httpServer = http.createServer();
        // Create SSE transport
        const transport = new ServerSentEventsTransport({
            server: httpServer
        });
        // Connect transport to the MCP server
        server.useTransport(transport);
        // Start HTTP server
        httpServer.listen(port, () => {
            console.log(chalk.green(`MCP Server started: http://localhost:${port}`));
        });
    }
    else {
        console.log(chalk.blue('Starting MCP Server with STDIO protocol'));
        // Create STDIO transport
        const transport = new StdioTransport();
        // Connect transport to the MCP server
        server.useTransport(transport);
        console.log(chalk.green('MCP Server started with STDIO transport'));
    }
}
