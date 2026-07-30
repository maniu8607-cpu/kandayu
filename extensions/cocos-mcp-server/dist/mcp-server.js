"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const uuid_1 = require("uuid");
const scene_tools_1 = require("./tools/scene-tools");
const node_tools_1 = require("./tools/node-tools");
const component_tools_1 = require("./tools/component-tools");
const prefab_tools_1 = require("./tools/prefab-tools");
const project_tools_1 = require("./tools/project-tools");
const debug_tools_1 = require("./tools/debug-tools");
const preferences_tools_1 = require("./tools/preferences-tools");
const server_tools_1 = require("./tools/server-tools");
const broadcast_tools_1 = require("./tools/broadcast-tools");
const scene_view_tools_1 = require("./tools/scene-view-tools");
const reference_image_tools_1 = require("./tools/reference-image-tools");
const asset_advanced_tools_1 = require("./tools/asset-advanced-tools");
const validation_tools_1 = require("./tools/validation-tools");
class MCPServer {
    constructor(settings) {
        this.httpServer = null;
        this.clients = new Map();
        this.tools = {};
        this.toolsList = [];
        this.enabledTools = [];
        console.log('[MCPServer] Constructor received settings:', settings);
        console.log('[MCPServer] Transport: Streamable HTTP (MCP 2025-03-26)');
        this.settings = settings;
        this.initializeTools();
    }
    initializeTools() {
        try {
            console.log('[MCPServer] Initializing tools...');
            this.tools.scene = new scene_tools_1.SceneTools();
            this.tools.node = new node_tools_1.NodeTools();
            this.tools.component = new component_tools_1.ComponentTools();
            this.tools.prefab = new prefab_tools_1.PrefabTools();
            this.tools.project = new project_tools_1.ProjectTools();
            this.tools.debug = new debug_tools_1.DebugTools();
            this.tools.preferences = new preferences_tools_1.PreferencesTools();
            this.tools.server = new server_tools_1.ServerTools();
            this.tools.broadcast = new broadcast_tools_1.BroadcastTools();
            this.tools.sceneView = new scene_view_tools_1.SceneViewTools();
            this.tools.referenceImage = new reference_image_tools_1.ReferenceImageTools();
            this.tools.assetAdvanced = new asset_advanced_tools_1.AssetAdvancedTools();
            this.tools.validation = new validation_tools_1.ValidationTools();
            console.log('[MCPServer] Tools initialized successfully');
        }
        catch (error) {
            console.error('[MCPServer] Error initializing tools:', error);
            throw error;
        }
    }
    async start() {
        if (this.httpServer) {
            console.log('[MCPServer] Server is already running');
            return;
        }
        try {
            console.log(`[MCPServer] Starting Streamable HTTP server on port ${this.settings.port}...`);
            this.httpServer = http.createServer(this.handleHttpRequest.bind(this));
            await new Promise((resolve, reject) => {
                this.httpServer.listen(this.settings.port, '127.0.0.1', () => {
                    console.log(`[MCPServer] ✅ Streamable HTTP server started on http://127.0.0.1:${this.settings.port}`);
                    console.log(`[MCPServer] Health check: http://127.0.0.1:${this.settings.port}/health`);
                    console.log(`[MCPServer] MCP endpoint: http://127.0.0.1:${this.settings.port}/mcp`);
                    resolve();
                });
                this.httpServer.on('error', (err) => {
                    console.error('[MCPServer] ❌ Failed to start server:', err);
                    if (err.code === 'EADDRINUSE') {
                        console.error(`[MCPServer] Port ${this.settings.port} is already in use. Please change the port in settings.`);
                    }
                    reject(err);
                });
            });
            this.setupTools();
            console.log('[MCPServer] 🚀 Streamable HTTP MCP Server is ready for connections');
        }
        catch (error) {
            console.error('[MCPServer] ❌ Failed to start server:', error);
            throw error;
        }
    }
    setupTools() {
        this.toolsList = [];
        if (!this.enabledTools || this.enabledTools.length === 0) {
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    this.toolsList.push({
                        name: `${category}_${tool.name}`,
                        description: tool.description,
                        inputSchema: tool.inputSchema
                    });
                }
            }
        }
        else {
            const enabledToolNames = new Set(this.enabledTools.map(tool => `${tool.category}_${tool.name}`));
            for (const [category, toolSet] of Object.entries(this.tools)) {
                const tools = toolSet.getTools();
                for (const tool of tools) {
                    const toolName = `${category}_${tool.name}`;
                    if (enabledToolNames.has(toolName)) {
                        this.toolsList.push({
                            name: toolName,
                            description: tool.description,
                            inputSchema: tool.inputSchema
                        });
                    }
                }
            }
        }
        console.log(`[MCPServer] Setup tools: ${this.toolsList.length} tools available`);
    }
    async executeToolCall(toolName, args) {
        const parts = toolName.split('_');
        const category = parts[0];
        const toolMethodName = parts.slice(1).join('_');
        if (this.tools[category]) {
            return await this.tools[category].execute(toolMethodName, args);
        }
        throw new Error(`Tool ${toolName} not found`);
    }
    getClients() {
        return Array.from(this.clients.values());
    }
    getAvailableTools() {
        return this.toolsList;
    }
    updateEnabledTools(enabledTools) {
        console.log(`[MCPServer] Updating enabled tools: ${enabledTools.length} tools`);
        this.enabledTools = enabledTools;
        this.setupTools();
    }
    getSettings() {
        return this.settings;
    }
    async handleHttpRequest(req, res) {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;
        // Basic request logging (only when debug enabled)
        if (this.settings.enableDebugLog) {
            console.log(`[MCPServer] ${req.method} ${req.url}`);
        }
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        try {
            if (pathname === '/mcp') {
                if (req.method === 'POST') {
                    console.log('[MCPServer] Handling Streamable HTTP MCP request');
                    await this.handleMCPRequest(req, res);
                }
                else if (req.method === 'GET') {
                    console.log('[MCPServer] Handling streaming connection request');
                    await this.handleStreamingConnection(req, res);
                }
                else {
                    res.writeHead(405);
                    res.end(JSON.stringify({ error: 'Method not allowed' }));
                }
            }
            else if (pathname === '/health' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'ok',
                    transport: 'streamable-http',
                    protocolVersion: '2025-03-26',
                    tools: this.toolsList.length,
                    clients: this.clients.size
                }));
            }
            else if ((pathname === null || pathname === void 0 ? void 0 : pathname.startsWith('/api/')) && req.method === 'POST') {
                await this.handleSimpleAPIRequest(req, res, pathname);
            }
            else if (pathname === '/api/tools' && req.method === 'GET') {
                res.writeHead(200);
                res.end(JSON.stringify({ tools: this.getSimplifiedToolsList() }));
            }
            else {
                res.writeHead(404);
                res.end(JSON.stringify({ error: 'Not found' }));
            }
        }
        catch (error) {
            console.error('HTTP request error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error' }));
        }
    }
    async handleMCPRequest(req, res) {
        // Validate origin for security
        if (!this.validateOrigin(req)) {
            console.log('[MCPServer] MCP request rejected: invalid origin');
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Forbidden origin' }));
            return;
        }
        const sessionId = this.getSessionId(req);
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                let message;
                try {
                    message = JSON.parse(body);
                    if (this.settings.enableDebugLog) {
                        console.log(`[MCPServer] Processing: ${message.method}, id: ${message.id}`);
                    }
                }
                catch (parseError) {
                    throw new Error(`JSON parsing failed: ${parseError.message}`);
                }
                console.log(`[MCPServer] Processing: ${message.method}, id: ${message.id}`);
                const response = await this.handleMessage(message);
                // Streamable HTTP: standard JSON response
                const isNotification = message.method && (message.id === undefined || message.id === null);
                if (isNotification) {
                    console.log('[MCPServer] Notification processed, returning 202');
                    res.writeHead(202);
                    res.end();
                }
                else {
                    console.log('[MCPServer] Returning JSON response');
                    const responseHeaders = {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    };
                    if (sessionId) {
                        responseHeaders['Mcp-Session-Id'] = sessionId;
                    }
                    else if (message.method === 'initialize') {
                        const newSessionId = (0, uuid_1.v4)();
                        responseHeaders['Mcp-Session-Id'] = newSessionId;
                        console.log(`[MCPServer] Generated session ID: ${newSessionId}`);
                    }
                    res.writeHead(200, responseHeaders);
                    res.end(JSON.stringify(response));
                }
            }
            catch (error) {
                console.error('Error handling MCP request:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                        code: -32700,
                        message: `Parse error: ${error.message}`
                    }
                }));
            }
        });
    }
    async handleMessage(message) {
        const { id, method, params } = message;
        try {
            let result;
            switch (method) {
                case 'tools/list':
                    result = { tools: this.getAvailableTools() };
                    break;
                case 'tools/call':
                    const { name, arguments: args } = params;
                    const toolResult = await this.executeToolCall(name, args);
                    result = { content: [{ type: 'text', text: JSON.stringify(toolResult) }] };
                    break;
                case 'initialize':
                    const clientProtocolVersion = params === null || params === void 0 ? void 0 : params.protocolVersion;
                    const supportedVersion = '2025-03-26';
                    result = {
                        protocolVersion: supportedVersion,
                        capabilities: {
                            tools: {
                                listChanged: true
                            }
                        },
                        serverInfo: {
                            name: 'cocos-mcp-server',
                            version: '1.5.4'
                        }
                    };
                    console.log(`[MCPServer] Initialize: client=${clientProtocolVersion}, server=${supportedVersion}`);
                    break;
                case 'notifications/initialized':
                    // Client confirms initialization is complete - this is a notification
                    console.log('[MCPServer] Client initialization confirmed');
                    result = null;
                    break;
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
            return {
                jsonrpc: '2.0',
                id,
                result
            };
        }
        catch (error) {
            return {
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32603,
                    message: error.message
                }
            };
        }
    }
    getSessionId(req) {
        return req.headers['mcp-session-id'] || null;
    }
    validateOrigin(req) {
        const origin = req.headers.origin;
        if (!origin)
            return true;
        return origin.includes('localhost') || origin.includes('127.0.0.1') || origin === 'null';
    }
    async handleStreamingConnection(req, res) {
        if (!this.validateOrigin(req)) {
            console.log('[MCPServer] Streaming connection rejected: invalid origin');
            res.writeHead(403);
            res.end(JSON.stringify({ error: 'Forbidden origin' }));
            return;
        }
        const sessionId = this.getSessionId(req) || (0, uuid_1.v4)();
        console.log(`[MCPServer] Establishing streaming connection for session: ${sessionId}`);
        // Set streaming headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': req.headers.origin || '*',
            'Access-Control-Expose-Headers': 'Mcp-Session-Id',
            'Mcp-Session-Id': sessionId
        });
        // Create client record
        const client = {
            id: sessionId,
            lastActivity: new Date(),
            userAgent: req.headers['user-agent'],
            response: res
        };
        this.clients.set(sessionId, client);
        // Send connection confirmation
        res.write(`: Streamable HTTP connection established\n\n`);
        console.log(`[MCPServer] Streaming connection ready for session: ${sessionId}`);
        // Handle client disconnect
        req.on('close', () => {
            console.log(`[MCPServer] Streaming client disconnected gracefully: ${sessionId}`);
            this.clients.delete(sessionId);
        });
        req.on('error', (err) => {
            // Distinguish between normal disconnections and actual errors
            if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
                console.log(`[MCPServer] Streaming client disconnected: ${sessionId} (${err.code})`);
            }
            else {
                console.error(`[MCPServer] Streaming client error: ${sessionId}`, err);
            }
            this.clients.delete(sessionId);
        });
    }
    stop() {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            console.log('[MCPServer] Streamable HTTP server stopped');
        }
        this.clients.clear();
    }
    getStatus() {
        return {
            running: !!this.httpServer,
            port: this.settings.port,
            clients: this.clients.size
        };
    }
    updateSettings(settings) {
        this.settings = settings;
        if (this.httpServer) {
            this.stop();
            this.start();
        }
    }
    getFilteredTools(enabledTools) {
        if (!enabledTools || enabledTools.length === 0) {
            return this.toolsList;
        }
        const enabledToolNames = new Set(enabledTools.map(tool => `${tool.category}_${tool.name}`));
        return this.toolsList.filter(tool => enabledToolNames.has(tool.name));
    }
    async handleSimpleAPIRequest(req, res, pathname) {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length < 3) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid API path. Use /api/{category}/{tool_name}' }));
                    return;
                }
                const category = pathParts[1];
                const toolName = pathParts[2];
                const fullToolName = `${category}_${toolName}`;
                let params;
                try {
                    params = body ? JSON.parse(body) : {};
                }
                catch (parseError) {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        error: 'Invalid JSON in request body',
                        details: parseError.message
                    }));
                    return;
                }
                const result = await this.executeToolCall(fullToolName, params);
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    tool: fullToolName,
                    result: result
                }));
            }
            catch (error) {
                console.error('Simple API error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({
                    success: false,
                    error: error.message,
                    tool: pathname
                }));
            }
        });
    }
    getSimplifiedToolsList() {
        return this.toolsList.map(tool => {
            const parts = tool.name.split('_');
            const category = parts[0];
            const toolName = parts.slice(1).join('_');
            return {
                name: tool.name,
                category: category,
                toolName: toolName,
                description: tool.description,
                apiPath: `/api/${category}/${toolName}`
            };
        });
    }
}
exports.MCPServer = MCPServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3Qix5Q0FBMkI7QUFDM0IsK0JBQW9DO0FBRXBDLHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHVEQUFtRDtBQUNuRCx5REFBcUQ7QUFDckQscURBQWlEO0FBQ2pELGlFQUE2RDtBQUM3RCx1REFBbUQ7QUFDbkQsNkRBQXlEO0FBQ3pELCtEQUEwRDtBQUMxRCx5RUFBb0U7QUFDcEUsdUVBQWtFO0FBQ2xFLCtEQUEyRDtBQUUzRCxNQUFhLFNBQVM7SUFRbEIsWUFBWSxRQUEyQjtRQU4vQixlQUFVLEdBQXVCLElBQUksQ0FBQztRQUN0QyxZQUFPLEdBQTJCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDNUMsVUFBSyxHQUF3QixFQUFFLENBQUM7UUFDaEMsY0FBUyxHQUFxQixFQUFFLENBQUM7UUFDakMsaUJBQVksR0FBVSxFQUFFLENBQUM7UUFHN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNwRSxPQUFPLENBQUMsR0FBRyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7UUFDdkUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFFTyxlQUFlO1FBQ25CLElBQUksQ0FBQztZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLHNCQUFTLEVBQUUsQ0FBQztZQUNsQyxJQUFJ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LEVBQUUsS0FBSztvQkFDZCxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU87b0JBQ3BCLElBQUksRUFBRSxRQUFRO2lCQUNqQixDQUFDLENBQUMsQ0FBQztZQUNSLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFTyxzQkFBc0I7UUFDMUIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFMUMsT0FBTztnQkFDSCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLFFBQVEsRUFBRSxRQUFRO2dCQUNsQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLE9BQU8sRUFBRSxRQUFRLFFBQVEsSUFBSSxRQUFRLEVBQUU7YUFDMUMsQ0FBQztRQUNOLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUNKO0FBeGVELDhCQXdlQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MsIFNlcnZlclN0YXR1cywgTUNQQ2xpZW50LCBUb29sRGVmaW5pdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgU2NlbmVUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdG9vbHMnO1xuaW1wb3J0IHsgTm9kZVRvb2xzIH0gZnJvbSAnLi90b29scy9ub2RlLXRvb2xzJztcbmltcG9ydCB7IENvbXBvbmVudFRvb2xzIH0gZnJvbSAnLi90b29scy9jb21wb25lbnQtdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmFiVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ByZWZhYi10b29scyc7XG5pbXBvcnQgeyBQcm9qZWN0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3Byb2plY3QtdG9vbHMnO1xuaW1wb3J0IHsgRGVidWdUb29scyB9IGZyb20gJy4vdG9vbHMvZGVidWctdG9vbHMnO1xuaW1wb3J0IHsgUHJlZmVyZW5jZXNUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMnO1xuaW1wb3J0IHsgU2VydmVyVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NlcnZlci10b29scyc7XG5pbXBvcnQgeyBCcm9hZGNhc3RUb29scyB9IGZyb20gJy4vdG9vbHMvYnJvYWRjYXN0LXRvb2xzJztcbmltcG9ydCB7IFNjZW5lVmlld1Rvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS12aWV3LXRvb2xzJztcbmltcG9ydCB7IFJlZmVyZW5jZUltYWdlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3JlZmVyZW5jZS1pbWFnZS10b29scyc7XG5pbXBvcnQgeyBBc3NldEFkdmFuY2VkVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2Fzc2V0LWFkdmFuY2VkLXRvb2xzJztcbmltcG9ydCB7IFZhbGlkYXRpb25Ub29scyB9IGZyb20gJy4vdG9vbHMvdmFsaWRhdGlvbi10b29scyc7XG5cbmV4cG9ydCBjbGFzcyBNQ1BTZXJ2ZXIge1xuICAgIHByaXZhdGUgc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzO1xuICAgIHByaXZhdGUgaHR0cFNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcbiAgICBwcml2YXRlIGNsaWVudHM6IE1hcDxzdHJpbmcsIE1DUENsaWVudD4gPSBuZXcgTWFwKCk7XG4gICAgcHJpdmF0ZSB0b29sczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgIHByaXZhdGUgdG9vbHNMaXN0OiBUb29sRGVmaW5pdGlvbltdID0gW107XG4gICAgcHJpdmF0ZSBlbmFibGVkVG9vbHM6IGFueVtdID0gW107XG5cbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIENvbnN0cnVjdG9yIHJlY2VpdmVkIHNldHRpbmdzOicsIHNldHRpbmdzKTtcbiAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIFRyYW5zcG9ydDogU3RyZWFtYWJsZSBIVFRQIChNQ1AgMjAyNS0wMy0yNiknKTtcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuICAgICAgICB0aGlzLmluaXRpYWxpemVUb29scygpO1xuICAgIH1cblxuICAgIHByaXZhdGUgaW5pdGlhbGl6ZVRvb2xzKCk6IHZvaWQge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIEluaXRpYWxpemluZyB0b29scy4uLicpO1xuICAgICAgICAgICAgdGhpcy50b29scy5zY2VuZSA9IG5ldyBTY2VuZVRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLm5vZGUgPSBuZXcgTm9kZVRvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLmNvbXBvbmVudCA9IG5ldyBDb21wb25lbnRUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5wcmVmYWIgPSBuZXcgUHJlZmFiVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMucHJvamVjdCA9IG5ldyBQcm9qZWN0VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuZGVidWcgPSBuZXcgRGVidWdUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5wcmVmZXJlbmNlcyA9IG5ldyBQcmVmZXJlbmNlc1Rvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnNlcnZlciA9IG5ldyBTZXJ2ZXJUb29scygpO1xuICAgICAgICAgICAgdGhpcy50b29scy5icm9hZGNhc3QgPSBuZXcgQnJvYWRjYXN0VG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuc2NlbmVWaWV3ID0gbmV3IFNjZW5lVmlld1Rvb2xzKCk7XG4gICAgICAgICAgICB0aGlzLnRvb2xzLnJlZmVyZW5jZUltYWdlID0gbmV3IFJlZmVyZW5jZUltYWdlVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMuYXNzZXRBZHZhbmNlZCA9IG5ldyBBc3NldEFkdmFuY2VkVG9vbHMoKTtcbiAgICAgICAgICAgIHRoaXMudG9vbHMudmFsaWRhdGlvbiA9IG5ldyBWYWxpZGF0aW9uVG9vbHMoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBUb29scyBpbml0aWFsaXplZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1BTZXJ2ZXJdIEVycm9yIGluaXRpYWxpemluZyB0b29sczonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBhc3luYyBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIFNlcnZlciBpcyBhbHJlYWR5IHJ1bm5pbmcnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gU3RhcnRpbmcgU3RyZWFtYWJsZSBIVFRQIHNlcnZlciBvbiBwb3J0ICR7dGhpcy5zZXR0aW5ncy5wb3J0fS4uLmApO1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIodGhpcy5oYW5kbGVIdHRwUmVxdWVzdC5iaW5kKHRoaXMpKTtcblxuICAgICAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciEubGlzdGVuKHRoaXMuc2V0dGluZ3MucG9ydCwgJzEyNy4wLjAuMScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIOKchSBTdHJlYW1hYmxlIEhUVFAgc2VydmVyIHN0YXJ0ZWQgb24gaHR0cDovLzEyNy4wLjAuMToke3RoaXMuc2V0dGluZ3MucG9ydH1gKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIEhlYWx0aCBjaGVjazogaHR0cDovLzEyNy4wLjAuMToke3RoaXMuc2V0dGluZ3MucG9ydH0vaGVhbHRoYCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBNQ1AgZW5kcG9pbnQ6IGh0dHA6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBvcnR9L21jcGApO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyIS5vbignZXJyb3InLCAoZXJyOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01DUFNlcnZlcl0g4p2MIEZhaWxlZCB0byBzdGFydCBzZXJ2ZXI6JywgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRUFERFJJTlVTRScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BTZXJ2ZXJdIFBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9IGlzIGFscmVhZHkgaW4gdXNlLiBQbGVhc2UgY2hhbmdlIHRoZSBwb3J0IGluIHNldHRpbmdzLmApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHRoaXMuc2V0dXBUb29scygpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BTZXJ2ZXJdIPCfmoAgU3RyZWFtYWJsZSBIVFRQIE1DUCBTZXJ2ZXIgaXMgcmVhZHkgZm9yIGNvbm5lY3Rpb25zJyk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQU2VydmVyXSDinYwgRmFpbGVkIHRvIHN0YXJ0IHNlcnZlcjonLCBlcnJvcik7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgc2V0dXBUb29scygpOiB2b2lkIHtcbiAgICAgICAgdGhpcy50b29sc0xpc3QgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghdGhpcy5lbmFibGVkVG9vbHMgfHwgdGhpcy5lbmFibGVkVG9vbHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwgdG9vbFNldF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy50b29scykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29scyA9IHRvb2xTZXQuZ2V0VG9vbHMoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sc0xpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRvb2wuaW5wdXRTY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xOYW1lcyA9IG5ldyBTZXQodGhpcy5lbmFibGVkVG9vbHMubWFwKHRvb2wgPT4gYCR7dG9vbC5jYXRlZ29yeX1fJHt0b29sLm5hbWV9YCkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwgdG9vbFNldF0gb2YgT2JqZWN0LmVudHJpZXModGhpcy50b29scykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29scyA9IHRvb2xTZXQuZ2V0VG9vbHMoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuYWJsZWRUb29sTmFtZXMuaGFzKHRvb2xOYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b29sc0xpc3QucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRvb2wuaW5wdXRTY2hlbWFcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gU2V0dXAgdG9vbHM6ICR7dGhpcy50b29sc0xpc3QubGVuZ3RofSB0b29scyBhdmFpbGFibGVgKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgYXN5bmMgZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8YW55PiB7XG4gICAgICAgIGNvbnN0IHBhcnRzID0gdG9vbE5hbWUuc3BsaXQoJ18nKTtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBwYXJ0c1swXTtcbiAgICAgICAgY29uc3QgdG9vbE1ldGhvZE5hbWUgPSBwYXJ0cy5zbGljZSgxKS5qb2luKCdfJyk7XG4gICAgICAgIFxuICAgICAgICBpZiAodGhpcy50b29sc1tjYXRlZ29yeV0pIHtcbiAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnRvb2xzW2NhdGVnb3J5XS5leGVjdXRlKHRvb2xNZXRob2ROYW1lLCBhcmdzKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUb29sICR7dG9vbE5hbWV9IG5vdCBmb3VuZGApO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRDbGllbnRzKCk6IE1DUENsaWVudFtdIHtcbiAgICAgICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jbGllbnRzLnZhbHVlcygpKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0QXZhaWxhYmxlVG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdDtcbiAgICB9XG5cbiAgICBwdWJsaWMgdXBkYXRlRW5hYmxlZFRvb2xzKGVuYWJsZWRUb29sczogYW55W10pOiB2b2lkIHtcbiAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIFVwZGF0aW5nIGVuYWJsZWQgdG9vbHM6ICR7ZW5hYmxlZFRvb2xzLmxlbmd0aH0gdG9vbHNgKTtcbiAgICAgICAgdGhpcy5lbmFibGVkVG9vbHMgPSBlbmFibGVkVG9vbHM7XG4gICAgICAgIHRoaXMuc2V0dXBUb29scygpO1xuICAgIH1cblxuICAgIHB1YmxpYyBnZXRTZXR0aW5ncygpOiBNQ1BTZXJ2ZXJTZXR0aW5ncyB7XG4gICAgICAgIHJldHVybiB0aGlzLnNldHRpbmdzO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlSHR0cFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgICAgIGNvbnN0IHBhcnNlZFVybCA9IHVybC5wYXJzZShyZXEudXJsIHx8ICcnLCB0cnVlKTtcbiAgICAgICAgY29uc3QgcGF0aG5hbWUgPSBwYXJzZWRVcmwucGF0aG5hbWU7XG4gICAgICAgIFxuICAgICAgICAvLyBCYXNpYyByZXF1ZXN0IGxvZ2dpbmcgKG9ubHkgd2hlbiBkZWJ1ZyBlbmFibGVkKVxuICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZykge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdICR7cmVxLm1ldGhvZH0gJHtyZXEudXJsfWApO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgQ09SUyBoZWFkZXJzXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uLCBNY3AtU2Vzc2lvbi1JZCcpO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1FeHBvc2UtSGVhZGVycycsICdNY3AtU2Vzc2lvbi1JZCcpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgaWYgKHBhdGhuYW1lID09PSAnL21jcCcpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBIYW5kbGluZyBTdHJlYW1hYmxlIEhUVFAgTUNQIHJlcXVlc3QnKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5oYW5kbGVNQ1BSZXF1ZXN0KHJlcSwgcmVzKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBIYW5kbGluZyBzdHJlYW1pbmcgY29ubmVjdGlvbiByZXF1ZXN0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlU3RyZWFtaW5nQ29ubmVjdGlvbihyZXEsIHJlcyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDUpO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnIH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lID09PSAnL2hlYWx0aCcgJiYgcmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6ICdvaycsIFxuICAgICAgICAgICAgICAgICAgICB0cmFuc3BvcnQ6ICdzdHJlYW1hYmxlLWh0dHAnLFxuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbFZlcnNpb246ICcyMDI1LTAzLTI2JyxcbiAgICAgICAgICAgICAgICAgICAgdG9vbHM6IHRoaXMudG9vbHNMaXN0Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50czogdGhpcy5jbGllbnRzLnNpemVcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhdGhuYW1lPy5zdGFydHNXaXRoKCcvYXBpLycpICYmIHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuaGFuZGxlU2ltcGxlQVBJUmVxdWVzdChyZXEsIHJlcywgcGF0aG5hbWUpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwYXRobmFtZSA9PT0gJy9hcGkvdG9vbHMnICYmIHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyB0b29sczogdGhpcy5nZXRTaW1wbGlmaWVkVG9vbHNMaXN0KCkgfSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTm90IGZvdW5kJyB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdIVFRQIHJlcXVlc3QgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNQ1BSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xuICAgICAgICAvLyBWYWxpZGF0ZSBvcmlnaW4gZm9yIHNlY3VyaXR5XG4gICAgICAgIGlmICghdGhpcy52YWxpZGF0ZU9yaWdpbihyZXEpKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUFNlcnZlcl0gTUNQIHJlcXVlc3QgcmVqZWN0ZWQ6IGludmFsaWQgb3JpZ2luJyk7XG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMyk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdGb3JiaWRkZW4gb3JpZ2luJyB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBzZXNzaW9uSWQgPSB0aGlzLmdldFNlc3Npb25JZChyZXEpO1xuICAgICAgICBcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcbiAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rKSA9PiB7XG4gICAgICAgICAgICBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIFByb2Nlc3Npbmc6ICR7bWVzc2FnZS5tZXRob2R9LCBpZDogJHttZXNzYWdlLmlkfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAocGFyc2VFcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSlNPTiBwYXJzaW5nIGZhaWxlZDogJHtwYXJzZUVycm9yLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBQcm9jZXNzaW5nOiAke21lc3NhZ2UubWV0aG9kfSwgaWQ6ICR7bWVzc2FnZS5pZH1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTdHJlYW1hYmxlIEhUVFA6IHN0YW5kYXJkIEpTT04gcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBpc05vdGlmaWNhdGlvbiA9IG1lc3NhZ2UubWV0aG9kICYmIChtZXNzYWdlLmlkID09PSB1bmRlZmluZWQgfHwgbWVzc2FnZS5pZCA9PT0gbnVsbCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGlzTm90aWZpY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBOb3RpZmljYXRpb24gcHJvY2Vzc2VkLCByZXR1cm5pbmcgMjAyJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAyKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBSZXR1cm5pbmcgSlNPTiByZXNwb25zZScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZUhlYWRlcnM6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBpZiAoc2Vzc2lvbklkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZUhlYWRlcnNbJ01jcC1TZXNzaW9uLUlkJ10gPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5tZXRob2QgPT09ICdpbml0aWFsaXplJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U2Vzc2lvbklkID0gdXVpZHY0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZUhlYWRlcnNbJ01jcC1TZXNzaW9uLUlkJ10gPSBuZXdTZXNzaW9uSWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUFNlcnZlcl0gR2VuZXJhdGVkIHNlc3Npb24gSUQ6ICR7bmV3U2Vzc2lvbklkfWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgcmVzcG9uc2VIZWFkZXJzKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBoYW5kbGluZyBNQ1AgcmVxdWVzdDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29kZTogLTMyNzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFBhcnNlIGVycm9yOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1lc3NhZ2UobWVzc2FnZTogYW55KTogUHJvbWlzZTxhbnk+IHtcbiAgICAgICAgY29uc3QgeyBpZCwgbWV0aG9kLCBwYXJhbXMgfSA9IG1lc3NhZ2U7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGxldCByZXN1bHQ6IGFueTtcblxuICAgICAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgICAgICAgICAgICBjYXNlICd0b29scy9saXN0JzpcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0geyB0b29sczogdGhpcy5nZXRBdmFpbGFibGVUb29scygpIH07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2NhbGwnOlxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IG5hbWUsIGFyZ3VtZW50czogYXJncyB9ID0gcGFyYW1zO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sUmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlVG9vbENhbGwobmFtZSwgYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHsgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh0b29sUmVzdWx0KSB9XSB9O1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdpbml0aWFsaXplJzpcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpZW50UHJvdG9jb2xWZXJzaW9uID0gcGFyYW1zPy5wcm90b2NvbFZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN1cHBvcnRlZFZlcnNpb24gPSAnMjAyNS0wMy0yNic7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbFZlcnNpb246IHN1cHBvcnRlZFZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsaXN0Q2hhbmdlZDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJJbmZvOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ2NvY29zLW1jcC1zZXJ2ZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjUuNCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIEluaXRpYWxpemU6IGNsaWVudD0ke2NsaWVudFByb3RvY29sVmVyc2lvbn0sIHNlcnZlcj0ke3N1cHBvcnRlZFZlcnNpb259YCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ25vdGlmaWNhdGlvbnMvaW5pdGlhbGl6ZWQnOlxuICAgICAgICAgICAgICAgICAgICAvLyBDbGllbnQgY29uZmlybXMgaW5pdGlhbGl6YXRpb24gaXMgY29tcGxldGUgLSB0aGlzIGlzIGEgbm90aWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBDbGllbnQgaW5pdGlhbGl6YXRpb24gY29uZmlybWVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxuICAgICAgICAgICAgICAgIGlkLFxuICAgICAgICAgICAgICAgIHJlc3VsdFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgICAgICBjb2RlOiAtMzI2MDMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRTZXNzaW9uSWQocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICByZXR1cm4gcmVxLmhlYWRlcnNbJ21jcC1zZXNzaW9uLWlkJ10gYXMgc3RyaW5nIHx8IG51bGw7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSB2YWxpZGF0ZU9yaWdpbihyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlKTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IG9yaWdpbiA9IHJlcS5oZWFkZXJzLm9yaWdpbjtcbiAgICAgICAgaWYgKCFvcmlnaW4pIHJldHVybiB0cnVlO1xuICAgICAgICByZXR1cm4gb3JpZ2luLmluY2x1ZGVzKCdsb2NhbGhvc3QnKSB8fCBvcmlnaW4uaW5jbHVkZXMoJzEyNy4wLjAuMScpIHx8IG9yaWdpbiA9PT0gJ251bGwnO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU3RyZWFtaW5nQ29ubmVjdGlvbihyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgaWYgKCF0aGlzLnZhbGlkYXRlT3JpZ2luKHJlcSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBTdHJlYW1pbmcgY29ubmVjdGlvbiByZWplY3RlZDogaW52YWxpZCBvcmlnaW4nKTtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAzKTtcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ZvcmJpZGRlbiBvcmlnaW4nIH0pKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHNlc3Npb25JZCA9IHRoaXMuZ2V0U2Vzc2lvbklkKHJlcSkgfHwgdXVpZHY0KCk7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBFc3RhYmxpc2hpbmcgc3RyZWFtaW5nIGNvbm5lY3Rpb24gZm9yIHNlc3Npb246ICR7c2Vzc2lvbklkfWApO1xuXG4gICAgICAgIC8vIFNldCBzdHJlYW1pbmcgaGVhZGVyc1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwge1xuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L2V2ZW50LXN0cmVhbScsXG4gICAgICAgICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1jYWNoZScsXG4gICAgICAgICAgICAnQ29ubmVjdGlvbic6ICdrZWVwLWFsaXZlJyxcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiByZXEuaGVhZGVycy5vcmlnaW4gfHwgJyonLFxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUV4cG9zZS1IZWFkZXJzJzogJ01jcC1TZXNzaW9uLUlkJyxcbiAgICAgICAgICAgICdNY3AtU2Vzc2lvbi1JZCc6IHNlc3Npb25JZFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgY2xpZW50IHJlY29yZFxuICAgICAgICBjb25zdCBjbGllbnQ6IE1DUENsaWVudCA9IHtcbiAgICAgICAgICAgIGlkOiBzZXNzaW9uSWQsXG4gICAgICAgICAgICBsYXN0QWN0aXZpdHk6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICB1c2VyQWdlbnQ6IHJlcS5oZWFkZXJzWyd1c2VyLWFnZW50J10sXG4gICAgICAgICAgICByZXNwb25zZTogcmVzXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5jbGllbnRzLnNldChzZXNzaW9uSWQsIGNsaWVudCk7XG5cbiAgICAgICAgLy8gU2VuZCBjb25uZWN0aW9uIGNvbmZpcm1hdGlvblxuICAgICAgICByZXMud3JpdGUoYDogU3RyZWFtYWJsZSBIVFRQIGNvbm5lY3Rpb24gZXN0YWJsaXNoZWRcXG5cXG5gKTtcbiAgICAgICAgY29uc29sZS5sb2coYFtNQ1BTZXJ2ZXJdIFN0cmVhbWluZyBjb25uZWN0aW9uIHJlYWR5IGZvciBzZXNzaW9uOiAke3Nlc3Npb25JZH1gKTtcblxuICAgICAgICAvLyBIYW5kbGUgY2xpZW50IGRpc2Nvbm5lY3RcbiAgICAgICAgcmVxLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBTdHJlYW1pbmcgY2xpZW50IGRpc2Nvbm5lY3RlZCBncmFjZWZ1bGx5OiAke3Nlc3Npb25JZH1gKTtcbiAgICAgICAgICAgIHRoaXMuY2xpZW50cy5kZWxldGUoc2Vzc2lvbklkKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmVxLm9uKCdlcnJvcicsIChlcnI6IGFueSkgPT4ge1xuICAgICAgICAgICAgLy8gRGlzdGluZ3Vpc2ggYmV0d2VlbiBub3JtYWwgZGlzY29ubmVjdGlvbnMgYW5kIGFjdHVhbCBlcnJvcnNcbiAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VDT05OUkVTRVQnIHx8IGVyci5jb2RlID09PSAnRUNPTk5BQk9SVEVEJykge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQU2VydmVyXSBTdHJlYW1pbmcgY2xpZW50IGRpc2Nvbm5lY3RlZDogJHtzZXNzaW9uSWR9ICgke2Vyci5jb2RlfSlgKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW01DUFNlcnZlcl0gU3RyZWFtaW5nIGNsaWVudCBlcnJvcjogJHtzZXNzaW9uSWR9YCwgZXJyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY2xpZW50cy5kZWxldGUoc2Vzc2lvbklkKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHVibGljIHN0b3AoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlci5jbG9zZSgpO1xuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gbnVsbDtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQU2VydmVyXSBTdHJlYW1hYmxlIEhUVFAgc2VydmVyIHN0b3BwZWQnKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmNsaWVudHMuY2xlYXIoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgZ2V0U3RhdHVzKCk6IFNlcnZlclN0YXR1cyB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBydW5uaW5nOiAhIXRoaXMuaHR0cFNlcnZlcixcbiAgICAgICAgICAgIHBvcnQ6IHRoaXMuc2V0dGluZ3MucG9ydCxcbiAgICAgICAgICAgIGNsaWVudHM6IHRoaXMuY2xpZW50cy5zaXplXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHVibGljIHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHRoaXMuc3RvcCgpO1xuICAgICAgICAgICAgdGhpcy5zdGFydCgpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIGdldEZpbHRlcmVkVG9vbHMoZW5hYmxlZFRvb2xzOiBhbnlbXSk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICBpZiAoIWVuYWJsZWRUb29scyB8fCBlbmFibGVkVG9vbHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3Q7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xOYW1lcyA9IG5ldyBTZXQoZW5hYmxlZFRvb2xzLm1hcCh0b29sID0+IGAke3Rvb2wuY2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWApKTtcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbHNMaXN0LmZpbHRlcih0b29sID0+IGVuYWJsZWRUb29sTmFtZXMuaGFzKHRvb2wubmFtZSkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlU2ltcGxlQVBJUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UsIHBhdGhuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcbiAgICAgICAgXG4gICAgICAgIHJlcS5vbignZGF0YScsIChjaHVuaykgPT4ge1xuICAgICAgICAgICAgYm9keSArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoUGFydHMgPSBwYXRobmFtZS5zcGxpdCgnLycpLmZpbHRlcihwID0+IHApO1xuICAgICAgICAgICAgICAgIGlmIChwYXRoUGFydHMubGVuZ3RoIDwgMykge1xuICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludmFsaWQgQVBJIHBhdGguIFVzZSAvYXBpL3tjYXRlZ29yeX0ve3Rvb2xfbmFtZX0nIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHBhdGhQYXJ0c1sxXTtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IHBhdGhQYXJ0c1syXTtcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsVG9vbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sTmFtZX1gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGxldCBwYXJhbXM7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gYm9keSA/IEpTT04ucGFyc2UoYm9keSkgOiB7fTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChwYXJzZUVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDApO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBKU09OIGluIHJlcXVlc3QgYm9keScsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXRhaWxzOiBwYXJzZUVycm9yLm1lc3NhZ2VcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVRvb2xDYWxsKGZ1bGxUb29sTmFtZSwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHRvb2w6IGZ1bGxUb29sTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiByZXN1bHRcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU2ltcGxlIEFQSSBlcnJvcjonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgIHRvb2w6IHBhdGhuYW1lXG4gICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGdldFNpbXBsaWZpZWRUb29sc0xpc3QoKTogYW55W10ge1xuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QubWFwKHRvb2wgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB0b29sLm5hbWUuc3BsaXQoJ18nKTtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gcGFydHNbMF07XG4gICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IHBhcnRzLnNsaWNlKDEpLmpvaW4oJ18nKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBuYW1lOiB0b29sLm5hbWUsXG4gICAgICAgICAgICAgICAgY2F0ZWdvcnk6IGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgIHRvb2xOYW1lOiB0b29sTmFtZSxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvbixcbiAgICAgICAgICAgICAgICBhcGlQYXRoOiBgL2FwaS8ke2NhdGVnb3J5fS8ke3Rvb2xOYW1lfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=