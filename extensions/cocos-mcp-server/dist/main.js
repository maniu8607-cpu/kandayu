"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
const mcp_server_1 = require("./mcp-server");
const settings_1 = require("./settings");
const tool_manager_1 = require("./tools/tool-manager");
const mcp_config_manager_1 = require("./mcp-config-manager");
const mcp_client_configs_1 = require("./mcp-client-configs");
let mcpServer = null;
let toolManager;
/**
 * @en Registration method for the main process of Extension
 * @zh 为扩展的主进程的注册方法
 */
exports.methods = {
    /**
     * @en Open the MCP server panel
     * @zh 打开 MCP 服务器面板
     */
    openPanel() {
        Editor.Panel.open('cocos-mcp-server');
    },
    /**
     * @en Start the MCP server
     * @zh 启动 MCP 服务器
     */
    async startServer() {
        if (mcpServer) {
            // 确保使用最新的工具配置
            const enabledTools = toolManager.getEnabledTools();
            mcpServer.updateEnabledTools(enabledTools);
            await mcpServer.start();
        }
        else {
            console.warn('[MCP插件] mcpServer 未初始化');
        }
    },
    /**
     * @en Stop the MCP server
     * @zh 停止 MCP 服务器
     */
    async stopServer() {
        if (mcpServer) {
            mcpServer.stop();
        }
        else {
            console.warn('[MCP插件] mcpServer 未初始化');
        }
    },
    /**
     * @en Get server status
     * @zh 获取服务器状态
     */
    getServerStatus() {
        const status = mcpServer ? mcpServer.getStatus() : { running: false, port: 0, clients: 0, protocol: 'http' };
        const settings = mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
        return Object.assign(Object.assign({}, status), { settings: settings });
    },
    /**
     * @en Update server settings
     * @zh 更新服务器设置
     */
    updateSettings(settings) {
        console.log('[MCP插件] Received settings to update:', settings);
        console.log('[MCP插件] Settings updated for Streamable HTTP transport');
        (0, settings_1.saveSettings)(settings);
        if (mcpServer) {
            const wasRunning = mcpServer.getStatus().running;
            mcpServer.stop();
            mcpServer = new mcp_server_1.MCPServer(settings);
            console.log('[MCP插件] New MCPServer created with settings:', mcpServer.getSettings());
            // 只有在之前运行的情况下才自动重启
            if (wasRunning) {
                mcpServer.start();
            }
        }
        else {
            mcpServer = new mcp_server_1.MCPServer(settings);
            console.log('[MCP插件] First MCPServer created with settings:', mcpServer.getSettings());
        }
        console.log('[MCP插件] Final server settings:', mcpServer ? mcpServer.getSettings() : 'No server');
        return { success: true, settings: mcpServer ? mcpServer.getSettings() : settings };
    },
    /**
     * @en Get tools list
     * @zh 获取工具列表
     */
    getToolsList() {
        return mcpServer ? mcpServer.getAvailableTools() : [];
    },
    getFilteredToolsList() {
        if (!mcpServer)
            return [];
        // 获取当前启用的工具
        const enabledTools = toolManager.getEnabledTools();
        // 更新MCP服务器的启用工具列表
        mcpServer.updateEnabledTools(enabledTools);
        return mcpServer.getFilteredTools(enabledTools);
    },
    /**
     * @en Get server settings
     * @zh 获取服务器设置
     */
    async getServerSettings() {
        return mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
    },
    /**
     * @en Get server settings (alternative method)
     * @zh 获取服务器设置（替代方法）
     */
    async getSettings() {
        return mcpServer ? mcpServer.getSettings() : (0, settings_1.readSettings)();
    },
    // 工具管理器相关方法
    async getToolManagerState() {
        return toolManager.getToolManagerState();
    },
    async createToolConfiguration(name, description) {
        try {
            const config = toolManager.createConfiguration(name, description);
            return { success: true, id: config.id, config };
        }
        catch (error) {
            throw new Error(`创建配置失败: ${error.message}`);
        }
    },
    async updateToolConfiguration(configId, updates) {
        try {
            return toolManager.updateConfiguration(configId, updates);
        }
        catch (error) {
            throw new Error(`更新配置失败: ${error.message}`);
        }
    },
    async deleteToolConfiguration(configId) {
        try {
            toolManager.deleteConfiguration(configId);
            return { success: true };
        }
        catch (error) {
            throw new Error(`删除配置失败: ${error.message}`);
        }
    },
    async setCurrentToolConfiguration(configId) {
        try {
            toolManager.setCurrentConfiguration(configId);
            return { success: true };
        }
        catch (error) {
            throw new Error(`设置当前配置失败: ${error.message}`);
        }
    },
    async updateToolStatus(category, toolName, enabled) {
        try {
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('没有当前配置');
            }
            toolManager.updateToolStatus(currentConfig.id, category, toolName, enabled);
            // 更新MCP服务器的工具列表
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            return { success: true };
        }
        catch (error) {
            throw new Error(`更新工具状态失败: ${error.message}`);
        }
    },
    async updateToolStatusBatch(updates) {
        try {
            console.log(`[Main] updateToolStatusBatch called with updates count:`, updates ? updates.length : 0);
            const currentConfig = toolManager.getCurrentConfiguration();
            if (!currentConfig) {
                throw new Error('没有当前配置');
            }
            toolManager.updateToolStatusBatch(currentConfig.id, updates);
            // 更新MCP服务器的工具列表
            if (mcpServer) {
                const enabledTools = toolManager.getEnabledTools();
                mcpServer.updateEnabledTools(enabledTools);
            }
            return { success: true };
        }
        catch (error) {
            throw new Error(`批量更新工具状态失败: ${error.message}`);
        }
    },
    async exportToolConfiguration(configId) {
        try {
            return { configJson: toolManager.exportConfiguration(configId) };
        }
        catch (error) {
            throw new Error(`导出配置失败: ${error.message}`);
        }
    },
    async importToolConfiguration(configJson) {
        try {
            return toolManager.importConfiguration(configJson);
        }
        catch (error) {
            throw new Error(`导入配置失败: ${error.message}`);
        }
    },
    async getEnabledTools() {
        return toolManager.getEnabledTools();
    },
    // ========== 一键配置相关方法 ==========
    /**
     * @en Get configuration status for all clients
     * @zh 获取所有客户端的配置状态
     */
    async getConfigStatus(serverName) {
        try {
            console.log('[MCP插件] getConfigStatus called with serverName:', serverName);
            const clients = mcp_config_manager_1.MCPConfigManager.getConfigStatus(serverName);
            console.log('[MCP插件] getConfigStatus returning', clients.length, 'clients');
            // WORKAROUND: 手动添加isAutoConfig属性,因为可能有模块缓存问题
            const autoConfigClients = ['cursor', 'windsurf', 'trae', 'codex-cli'];
            const clientsWithAutoConfig = clients.map((client) => {
                const isAutoConfig = autoConfigClients.includes(client.clientType);
                console.log(`[MCP插件] Setting isAutoConfig for ${client.clientType}: ${isAutoConfig}`);
                return Object.assign(Object.assign({}, client), { isAutoConfig: isAutoConfig });
            });
            // Debug: 查看第一个客户端的完整结构
            if (clientsWithAutoConfig.length > 0) {
                console.log('[MCP插件] First client structure:', JSON.stringify(clientsWithAutoConfig[0], null, 2));
                console.log('[MCP插件] First client isAutoConfig:', clientsWithAutoConfig[0].isAutoConfig);
            }
            // Debug: 统计isAutoConfig的数量
            const autoConfigCount = clientsWithAutoConfig.filter((c) => c.isAutoConfig).length;
            console.log('[MCP插件] Auto-config clients count:', autoConfigCount);
            return {
                success: true,
                clients: clientsWithAutoConfig
            };
        }
        catch (error) {
            console.error('[MCP插件] Failed to get config status:', error);
            return {
                success: false,
                message: error.message,
                clients: []
            };
        }
    },
    /**
     * @en Generate CLI commands for all CLI tools
     * @zh 为所有CLI工具生成命令
     */
    async generateCLICommands(serverConfig) {
        try {
            const commands = mcp_config_manager_1.MCPConfigManager.generateCLICommands(serverConfig);
            return {
                success: true,
                commands: commands
            };
        }
        catch (error) {
            console.error('[MCP插件] Failed to generate CLI commands:', error);
            return {
                success: false,
                message: error.message,
                commands: { claude: '', gemini: '' }
            };
        }
    },
    /**
     * @en Generate config content for a specific client
     * @zh 为指定客户端生成配置内容
     */
    async generateClientConfig(clientType, serverConfig) {
        try {
            const configContent = mcp_config_manager_1.MCPConfigManager.generateConfigContent(clientType, serverConfig);
            return {
                success: true,
                content: configContent
            };
        }
        catch (error) {
            console.error('[MCP插件] Failed to generate config:', error);
            return {
                success: false,
                message: error.message,
                content: ''
            };
        }
    },
    /**
     * @en Add MCP server to a specific client
     * @zh 添加MCP服务器到指定客户端
     */
    async addToClient(clientType, serverConfig) {
        try {
            console.log(`[MCP插件] Adding server to ${clientType}:`, serverConfig);
            const result = mcp_config_manager_1.MCPConfigManager.addServer(clientType, serverConfig);
            return result;
        }
        catch (error) {
            console.error('[MCP插件] Failed to add to client:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },
    /**
     * @en Remove MCP server from a specific client
     * @zh 从指定客户端删除MCP服务器
     */
    async removeFromClient(clientType, serverName) {
        try {
            console.log(`[MCP插件] Removing server from ${clientType}:`, serverName);
            const result = mcp_config_manager_1.MCPConfigManager.removeServer(clientType, serverName);
            return result;
        }
        catch (error) {
            console.error('[MCP插件] Failed to remove from client:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },
    /**
     * @en Add MCP server to all IDE clients
     * @zh 添加MCP服务器到所有IDE客户端
     */
    async addToAllClients(serverConfig) {
        try {
            console.log('[MCP插件] Adding server to all IDE clients:', serverConfig);
            const results = mcp_config_manager_1.MCPConfigManager.addToAllClients(serverConfig);
            const formattedResults = {};
            for (const [clientType, result] of results.entries()) {
                const clientName = mcp_client_configs_1.MCP_CLIENTS[clientType].name;
                formattedResults[clientName] = result.message;
            }
            return {
                success: true,
                results: formattedResults
            };
        }
        catch (error) {
            console.error('[MCP插件] Failed to add to all clients:', error);
            return {
                success: false,
                message: error.message,
                results: {}
            };
        }
    },
    /**
     * @en Remove MCP server from all IDE clients
     * @zh 从所有IDE客户端删除MCP服务器
     */
    async removeFromAllClients(serverName) {
        try {
            console.log('[MCP插件] Removing server from all IDE clients:', serverName);
            const results = mcp_config_manager_1.MCPConfigManager.removeFromAllClients(serverName);
            const formattedResults = {};
            for (const [clientType, result] of results.entries()) {
                const clientName = mcp_client_configs_1.MCP_CLIENTS[clientType].name;
                formattedResults[clientName] = result.message;
            }
            return {
                success: true,
                results: formattedResults
            };
        }
        catch (error) {
            console.error('[MCP插件] Failed to remove from all clients:', error);
            return {
                success: false,
                message: error.message,
                results: {}
            };
        }
    },
    /**
     * @en Open configuration file in default editor
     * @zh 在默认编辑器中打开配置文件
     */
    async openConfigFile(configPath) {
        try {
            // 展开路径中的~和环境变量
            let expandedPath = configPath;
            if (expandedPath.startsWith('~')) {
                const home = process.env.HOME || process.env.USERPROFILE;
                if (home) {
                    expandedPath = expandedPath.replace('~', home);
                }
            }
            // 展开Windows环境变量
            if (process.platform === 'win32') {
                expandedPath = expandedPath.replace(/%([^%]+)%/g, (_, key) => {
                    return process.env[key] || '';
                });
            }
            console.log('[MCP插件] Opening config file:', expandedPath);
            // 使用Node.js的child_process打开文件
            const { exec } = require('child_process');
            let command;
            if (process.platform === 'darwin') {
                // macOS使用open命令
                command = `open "${expandedPath}"`;
            }
            else if (process.platform === 'win32') {
                // Windows使用start命令
                command = `start "" "${expandedPath}"`;
            }
            else {
                // Linux使用xdg-open命令
                command = `xdg-open "${expandedPath}"`;
            }
            exec(command, (error) => {
                if (error) {
                    console.error('[MCP插件] Failed to open config file:', error);
                }
            });
            return {
                success: true,
                message: `已打开配置文件: ${expandedPath}`
            };
        }
        catch (error) {
            console.error('[MCP插件] Failed to open config file:', error);
            return {
                success: false,
                message: `打开配置文件失败: ${error.message}`
            };
        }
    }
};
/**
 * @en Method Triggered on Extension Startup
 * @zh 扩展启动时触发的方法
 */
function load() {
    console.log('Cocos MCP Server extension loaded');
    // 初始化工具管理器
    toolManager = new tool_manager_1.ToolManager();
    // 读取设置
    const settings = (0, settings_1.readSettings)();
    console.log('[MCP插件] Plugin load - initial settings:', settings);
    console.log('[MCP插件] Plugin load - transport: Streamable HTTP');
    mcpServer = new mcp_server_1.MCPServer(settings);
    // 初始化MCP服务器的工具列表
    const enabledTools = toolManager.getEnabledTools();
    mcpServer.updateEnabledTools(enabledTools);
    // 不自动启动服务器，完全由用户手动控制
    console.log('[MCP插件] Server initialized but not started. Use panel to start manually.');
    console.log('[MCP插件] AutoStart setting:', settings.autoStart, '- but auto-start is disabled for stability.');
}
/**
 * @en Method triggered when uninstalling the extension
 * @zh 卸载扩展时触发的方法
 */
function unload() {
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQStkQSxvQkFtQkM7QUFNRCx3QkFLQztBQTdmRCw2Q0FBeUM7QUFDekMseUNBQXdEO0FBRXhELHVEQUFtRDtBQUNuRCw2REFBd0Q7QUFDeEQsNkRBQStEO0FBRS9ELElBQUksU0FBUyxHQUFxQixJQUFJLENBQUM7QUFDdkMsSUFBSSxXQUF3QixDQUFDO0FBRTdCOzs7R0FHRztBQUNVLFFBQUEsT0FBTyxHQUE0QztJQUM1RDs7O09BR0c7SUFDSCxTQUFTO1FBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBSUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLFdBQVc7UUFDYixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ1osY0FBYztZQUNkLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUNuRCxTQUFTLENBQUMsa0JBQWtCLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDM0MsTUFBTSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDNUIsQ0FBQzthQUFNLENBQUM7WUFDSixPQUFPLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDM0MsQ0FBQztJQUNMLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsVUFBVTtRQUNaLElBQUksU0FBUyxFQUFFLENBQUM7WUFDWixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDckIsQ0FBQzthQUFNLENBQUM7WUFDSixPQUFPLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDM0MsQ0FBQztJQUNMLENBQUM7SUFFRDs7O09BR0c7SUFDSCxlQUFlO1FBQ1gsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUMs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QUcsQ0FBQyw0QkFBNEIsRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLDZDQUE2QyxDQUFDLENBQUM7QUFDakgsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLE1BQU07SUFDbEIsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQixTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUNQU2VydmVyIH0gZnJvbSAnLi9tY3Atc2VydmVyJztcbmltcG9ydCB7IHJlYWRTZXR0aW5ncywgc2F2ZVNldHRpbmdzIH0gZnJvbSAnLi9zZXR0aW5ncyc7XG5pbXBvcnQgeyBNQ1BTZXJ2ZXJTZXR0aW5ncyB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgVG9vbE1hbmFnZXIgfSBmcm9tICcuL3Rvb2xzL3Rvb2wtbWFuYWdlcic7XG5pbXBvcnQgeyBNQ1BDb25maWdNYW5hZ2VyIH0gZnJvbSAnLi9tY3AtY29uZmlnLW1hbmFnZXInO1xuaW1wb3J0IHsgTUNQX0NMSUVOVFMsIENsaWVudFR5cGUgfSBmcm9tICcuL21jcC1jbGllbnQtY29uZmlncyc7XG5cbmxldCBtY3BTZXJ2ZXI6IE1DUFNlcnZlciB8IG51bGwgPSBudWxsO1xubGV0IHRvb2xNYW5hZ2VyOiBUb29sTWFuYWdlcjtcblxuLyoqXG4gKiBAZW4gUmVnaXN0cmF0aW9uIG1ldGhvZCBmb3IgdGhlIG1haW4gcHJvY2VzcyBvZiBFeHRlbnNpb25cbiAqIEB6aCDkuLrmianlsZXnmoTkuLvov5vnqIvnmoTms6jlhozmlrnms5VcbiAqL1xuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcbiAgICAvKipcbiAgICAgKiBAZW4gT3BlbiB0aGUgTUNQIHNlcnZlciBwYW5lbFxuICAgICAqIEB6aCDmiZPlvIAgTUNQIOacjeWKoeWZqOmdouadv1xuICAgICAqL1xuICAgIG9wZW5QYW5lbCgpIHtcbiAgICAgICAgRWRpdG9yLlBhbmVsLm9wZW4oJ2NvY29zLW1jcC1zZXJ2ZXInKTtcbiAgICB9LFxuXG5cblxuICAgIC8qKlxuICAgICAqIEBlbiBTdGFydCB0aGUgTUNQIHNlcnZlclxuICAgICAqIEB6aCDlkK/liqggTUNQIOacjeWKoeWZqFxuICAgICAqL1xuICAgIGFzeW5jIHN0YXJ0U2VydmVyKCkge1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICAvLyDnoa7kv53kvb/nlKjmnIDmlrDnmoTlt6XlhbfphY3nva5cbiAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xuICAgICAgICAgICAgbWNwU2VydmVyLnVwZGF0ZUVuYWJsZWRUb29scyhlbmFibGVkVG9vbHMpO1xuICAgICAgICAgICAgYXdhaXQgbWNwU2VydmVyLnN0YXJ0KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tNQ1Dmj5Lku7ZdIG1jcFNlcnZlciDmnKrliJ3lp4vljJYnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZW4gU3RvcCB0aGUgTUNQIHNlcnZlclxuICAgICAqIEB6aCDlgZzmraIgTUNQIOacjeWKoeWZqFxuICAgICAqL1xuICAgIGFzeW5jIHN0b3BTZXJ2ZXIoKSB7XG4gICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcbiAgICAgICAgICAgIG1jcFNlcnZlci5zdG9wKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tNQ1Dmj5Lku7ZdIG1jcFNlcnZlciDmnKrliJ3lp4vljJYnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNlcnZlciBzdGF0dXNcbiAgICAgKiBAemgg6I635Y+W5pyN5Yqh5Zmo54q25oCBXG4gICAgICovXG4gICAgZ2V0U2VydmVyU3RhdHVzKCkge1xuICAgICAgICBjb25zdCBzdGF0dXMgPSBtY3BTZXJ2ZXIgPyBtY3BTZXJ2ZXIuZ2V0U3RhdHVzKCkgOiB7IHJ1bm5pbmc6IGZhbHNlLCBwb3J0OiAwLCBjbGllbnRzOiAwLCBwcm90b2NvbDogJ2h0dHAnIH07XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gbWNwU2VydmVyID8gbWNwU2VydmVyLmdldFNldHRpbmdzKCkgOiByZWFkU2V0dGluZ3MoKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIC4uLnN0YXR1cyxcbiAgICAgICAgICAgIHNldHRpbmdzOiBzZXR0aW5nc1xuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZW4gVXBkYXRlIHNlcnZlciBzZXR0aW5nc1xuICAgICAqIEB6aCDmm7TmlrDmnI3liqHlmajorr7nva5cbiAgICAgKi9cbiAgICB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIFJlY2VpdmVkIHNldHRpbmdzIHRvIHVwZGF0ZTonLCBzZXR0aW5ncyk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbTUNQ5o+S5Lu2XSBTZXR0aW5ncyB1cGRhdGVkIGZvciBTdHJlYW1hYmxlIEhUVFAgdHJhbnNwb3J0Jyk7XG4gICAgICAgIFxuICAgICAgICBzYXZlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1jcFNlcnZlcikge1xuICAgICAgICAgICAgY29uc3Qgd2FzUnVubmluZyA9IG1jcFNlcnZlci5nZXRTdGF0dXMoKS5ydW5uaW5nO1xuICAgICAgICAgICAgbWNwU2VydmVyLnN0b3AoKTtcbiAgICAgICAgICAgIG1jcFNlcnZlciA9IG5ldyBNQ1BTZXJ2ZXIoc2V0dGluZ3MpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIE5ldyBNQ1BTZXJ2ZXIgY3JlYXRlZCB3aXRoIHNldHRpbmdzOicsIG1jcFNlcnZlci5nZXRTZXR0aW5ncygpKTtcbiAgICAgICAgICAgIC8vIOWPquacieWcqOS5i+WJjei/kOihjOeahOaDheWGteS4i+aJjeiHquWKqOmHjeWQr1xuICAgICAgICAgICAgaWYgKHdhc1J1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICBtY3BTZXJ2ZXIuc3RhcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1jcFNlcnZlciA9IG5ldyBNQ1BTZXJ2ZXIoc2V0dGluZ3MpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIEZpcnN0IE1DUFNlcnZlciBjcmVhdGVkIHdpdGggc2V0dGluZ3M6JywgbWNwU2VydmVyLmdldFNldHRpbmdzKCkpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBjb25zb2xlLmxvZygnW01DUOaPkuS7tl0gRmluYWwgc2VydmVyIHNldHRpbmdzOicsIG1jcFNlcnZlciA/IG1jcFNlcnZlci5nZXRTZXR0aW5ncygpIDogJ05vIHNlcnZlcicpO1xuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBzZXR0aW5nczogbWNwU2VydmVyID8gbWNwU2VydmVyLmdldFNldHRpbmdzKCkgOiBzZXR0aW5ncyB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHRvb2xzIGxpc3RcbiAgICAgKiBAemgg6I635Y+W5bel5YW35YiX6KGoXG4gICAgICovXG4gICAgZ2V0VG9vbHNMaXN0KCkge1xuICAgICAgICByZXR1cm4gbWNwU2VydmVyID8gbWNwU2VydmVyLmdldEF2YWlsYWJsZVRvb2xzKCkgOiBbXTtcbiAgICB9LFxuXG4gICAgZ2V0RmlsdGVyZWRUb29sc0xpc3QoKSB7XG4gICAgICAgIGlmICghbWNwU2VydmVyKSByZXR1cm4gW107XG4gICAgICAgIFxuICAgICAgICAvLyDojrflj5blvZPliY3lkK/nlKjnmoTlt6XlhbdcbiAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xzID0gdG9vbE1hbmFnZXIuZ2V0RW5hYmxlZFRvb2xzKCk7XG4gICAgICAgIFxuICAgICAgICAvLyDmm7TmlrBNQ1DmnI3liqHlmajnmoTlkK/nlKjlt6XlhbfliJfooahcbiAgICAgICAgbWNwU2VydmVyLnVwZGF0ZUVuYWJsZWRUb29scyhlbmFibGVkVG9vbHMpO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIG1jcFNlcnZlci5nZXRGaWx0ZXJlZFRvb2xzKGVuYWJsZWRUb29scyk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBAZW4gR2V0IHNlcnZlciBzZXR0aW5nc1xuICAgICAqIEB6aCDojrflj5bmnI3liqHlmajorr7nva5cbiAgICAgKi9cbiAgICBhc3luYyBnZXRTZXJ2ZXJTZXR0aW5ncygpIHtcbiAgICAgICAgcmV0dXJuIG1jcFNlcnZlciA/IG1jcFNlcnZlci5nZXRTZXR0aW5ncygpIDogcmVhZFNldHRpbmdzKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZXQgc2VydmVyIHNldHRpbmdzIChhbHRlcm5hdGl2ZSBtZXRob2QpXG4gICAgICogQHpoIOiOt+WPluacjeWKoeWZqOiuvue9ru+8iOabv+S7o+aWueazle+8iVxuICAgICAqL1xuICAgIGFzeW5jIGdldFNldHRpbmdzKCkge1xuICAgICAgICByZXR1cm4gbWNwU2VydmVyID8gbWNwU2VydmVyLmdldFNldHRpbmdzKCkgOiByZWFkU2V0dGluZ3MoKTtcbiAgICB9LFxuXG4gICAgLy8g5bel5YW3566h55CG5Zmo55u45YWz5pa55rOVXG4gICAgYXN5bmMgZ2V0VG9vbE1hbmFnZXJTdGF0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRvb2xNYW5hZ2VyLmdldFRvb2xNYW5hZ2VyU3RhdGUoKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgY3JlYXRlVG9vbENvbmZpZ3VyYXRpb24obmFtZTogc3RyaW5nLCBkZXNjcmlwdGlvbj86IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY29uZmlnID0gdG9vbE1hbmFnZXIuY3JlYXRlQ29uZmlndXJhdGlvbihuYW1lLCBkZXNjcmlwdGlvbik7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBpZDogY29uZmlnLmlkLCBjb25maWcgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDliJvlu7rphY3nva7lpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhc3luYyB1cGRhdGVUb29sQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nLCB1cGRhdGVzOiBhbnkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiB0b29sTWFuYWdlci51cGRhdGVDb25maWd1cmF0aW9uKGNvbmZpZ0lkLCB1cGRhdGVzKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDmm7TmlrDphY3nva7lpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhc3luYyBkZWxldGVUb29sQ29uZmlndXJhdGlvbihjb25maWdJZDogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0b29sTWFuYWdlci5kZWxldGVDb25maWd1cmF0aW9uKGNvbmZpZ0lkKTtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDliKDpmaTphY3nva7lpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhc3luYyBzZXRDdXJyZW50VG9vbENvbmZpZ3VyYXRpb24oY29uZmlnSWQ6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdG9vbE1hbmFnZXIuc2V0Q3VycmVudENvbmZpZ3VyYXRpb24oY29uZmlnSWQpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOiuvue9ruW9k+WJjemFjee9ruWksei0pTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFzeW5jIHVwZGF0ZVRvb2xTdGF0dXMoY2F0ZWdvcnk6IHN0cmluZywgdG9vbE5hbWU6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY3VycmVudENvbmZpZyA9IHRvb2xNYW5hZ2VyLmdldEN1cnJlbnRDb25maWd1cmF0aW9uKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRDb25maWcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ+ayoeacieW9k+WJjemFjee9ricpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0b29sTWFuYWdlci51cGRhdGVUb29sU3RhdHVzKGN1cnJlbnRDb25maWcuaWQsIGNhdGVnb3J5LCB0b29sTmFtZSwgZW5hYmxlZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOabtOaWsE1DUOacjeWKoeWZqOeahOW3peWFt+WIl+ihqFxuICAgICAgICAgICAgaWYgKG1jcFNlcnZlcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xuICAgICAgICAgICAgICAgIG1jcFNlcnZlci51cGRhdGVFbmFibGVkVG9vbHMoZW5hYmxlZFRvb2xzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOabtOaWsOW3peWFt+eKtuaAgeWksei0pTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFzeW5jIHVwZGF0ZVRvb2xTdGF0dXNCYXRjaCh1cGRhdGVzOiBhbnlbXSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNYWluXSB1cGRhdGVUb29sU3RhdHVzQmF0Y2ggY2FsbGVkIHdpdGggdXBkYXRlcyBjb3VudDpgLCB1cGRhdGVzID8gdXBkYXRlcy5sZW5ndGggOiAwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc3QgY3VycmVudENvbmZpZyA9IHRvb2xNYW5hZ2VyLmdldEN1cnJlbnRDb25maWd1cmF0aW9uKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRDb25maWcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ+ayoeacieW9k+WJjemFjee9ricpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0b29sTWFuYWdlci51cGRhdGVUb29sU3RhdHVzQmF0Y2goY3VycmVudENvbmZpZy5pZCwgdXBkYXRlcyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIOabtOaWsE1DUOacjeWKoeWZqOeahOW3peWFt+WIl+ihqFxuICAgICAgICAgICAgaWYgKG1jcFNlcnZlcikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRvb2xNYW5hZ2VyLmdldEVuYWJsZWRUb29scygpO1xuICAgICAgICAgICAgICAgIG1jcFNlcnZlci51cGRhdGVFbmFibGVkVG9vbHMoZW5hYmxlZFRvb2xzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOaJuemHj+abtOaWsOW3peWFt+eKtuaAgeWksei0pTogJHtlcnJvci5tZXNzYWdlfWApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGFzeW5jIGV4cG9ydFRvb2xDb25maWd1cmF0aW9uKGNvbmZpZ0lkOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiB7IGNvbmZpZ0pzb246IHRvb2xNYW5hZ2VyLmV4cG9ydENvbmZpZ3VyYXRpb24oY29uZmlnSWQpIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihg5a+85Ye66YWN572u5aSx6LSlOiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgYXN5bmMgaW1wb3J0VG9vbENvbmZpZ3VyYXRpb24oY29uZmlnSnNvbjogc3RyaW5nKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gdG9vbE1hbmFnZXIuaW1wb3J0Q29uZmlndXJhdGlvbihjb25maWdKc29uKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDlr7zlhaXphY3nva7lpLHotKU6ICR7ZXJyb3IubWVzc2FnZX1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBhc3luYyBnZXRFbmFibGVkVG9vbHMoKSB7XG4gICAgICAgIHJldHVybiB0b29sTWFuYWdlci5nZXRFbmFibGVkVG9vbHMoKTtcbiAgICB9LFxuXG4gICAgLy8gPT09PT09PT09PSDkuIDplK7phY3nva7nm7jlhbPmlrnms5UgPT09PT09PT09PVxuXG4gICAgLyoqXG4gICAgICogQGVuIEdldCBjb25maWd1cmF0aW9uIHN0YXR1cyBmb3IgYWxsIGNsaWVudHNcbiAgICAgKiBAemgg6I635Y+W5omA5pyJ5a6i5oi356uv55qE6YWN572u54q25oCBXG4gICAgICovXG4gICAgYXN5bmMgZ2V0Q29uZmlnU3RhdHVzKHNlcnZlck5hbWU6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIGdldENvbmZpZ1N0YXR1cyBjYWxsZWQgd2l0aCBzZXJ2ZXJOYW1lOicsIHNlcnZlck5hbWUpO1xuICAgICAgICAgICAgY29uc3QgY2xpZW50cyA9IE1DUENvbmZpZ01hbmFnZXIuZ2V0Q29uZmlnU3RhdHVzKHNlcnZlck5hbWUpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIGdldENvbmZpZ1N0YXR1cyByZXR1cm5pbmcnLCBjbGllbnRzLmxlbmd0aCwgJ2NsaWVudHMnKTtcblxuICAgICAgICAgICAgLy8gV09SS0FST1VORDog5omL5Yqo5re75YqgaXNBdXRvQ29uZmln5bGe5oCnLOWboOS4uuWPr+iDveacieaooeWdl+e8k+WtmOmXrumimFxuICAgICAgICAgICAgY29uc3QgYXV0b0NvbmZpZ0NsaWVudHMgPSBbJ2N1cnNvcicsICd3aW5kc3VyZicsICd0cmFlJywgJ2NvZGV4LWNsaSddO1xuICAgICAgICAgICAgY29uc3QgY2xpZW50c1dpdGhBdXRvQ29uZmlnID0gY2xpZW50cy5tYXAoKGNsaWVudDogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNBdXRvQ29uZmlnID0gYXV0b0NvbmZpZ0NsaWVudHMuaW5jbHVkZXMoY2xpZW50LmNsaWVudFR5cGUpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQ5o+S5Lu2XSBTZXR0aW5nIGlzQXV0b0NvbmZpZyBmb3IgJHtjbGllbnQuY2xpZW50VHlwZX06ICR7aXNBdXRvQ29uZmlnfWApO1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIC4uLmNsaWVudCxcbiAgICAgICAgICAgICAgICAgICAgaXNBdXRvQ29uZmlnOiBpc0F1dG9Db25maWdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIERlYnVnOiDmn6XnnIvnrKzkuIDkuKrlrqLmiLfnq6/nmoTlrozmlbTnu5PmnoRcbiAgICAgICAgICAgIGlmIChjbGllbnRzV2l0aEF1dG9Db25maWcubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQ5o+S5Lu2XSBGaXJzdCBjbGllbnQgc3RydWN0dXJlOicsIEpTT04uc3RyaW5naWZ5KGNsaWVudHNXaXRoQXV0b0NvbmZpZ1swXSwgbnVsbCwgMikpO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQ5o+S5Lu2XSBGaXJzdCBjbGllbnQgaXNBdXRvQ29uZmlnOicsIGNsaWVudHNXaXRoQXV0b0NvbmZpZ1swXS5pc0F1dG9Db25maWcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEZWJ1Zzog57uf6K6haXNBdXRvQ29uZmln55qE5pWw6YePXG4gICAgICAgICAgICBjb25zdCBhdXRvQ29uZmlnQ291bnQgPSBjbGllbnRzV2l0aEF1dG9Db25maWcuZmlsdGVyKChjOiBhbnkpID0+IGMuaXNBdXRvQ29uZmlnKS5sZW5ndGg7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUOaPkuS7tl0gQXV0by1jb25maWcgY2xpZW50cyBjb3VudDonLCBhdXRvQ29uZmlnQ291bnQpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgY2xpZW50czogY2xpZW50c1dpdGhBdXRvQ29uZmlnXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQ5o+S5Lu2XSBGYWlsZWQgdG8gZ2V0IGNvbmZpZyBzdGF0dXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIGNsaWVudHM6IFtdXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBlbiBHZW5lcmF0ZSBDTEkgY29tbWFuZHMgZm9yIGFsbCBDTEkgdG9vbHNcbiAgICAgKiBAemgg5Li65omA5pyJQ0xJ5bel5YW355Sf5oiQ5ZG95LukXG4gICAgICovXG4gICAgYXN5bmMgZ2VuZXJhdGVDTElDb21tYW5kcyhzZXJ2ZXJDb25maWc6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY29tbWFuZHMgPSBNQ1BDb25maWdNYW5hZ2VyLmdlbmVyYXRlQ0xJQ29tbWFuZHMoc2VydmVyQ29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb21tYW5kczogY29tbWFuZHNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1Dmj5Lku7ZdIEZhaWxlZCB0byBnZW5lcmF0ZSBDTEkgY29tbWFuZHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIGNvbW1hbmRzOiB7IGNsYXVkZTogJycsIGdlbWluaTogJycgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZW4gR2VuZXJhdGUgY29uZmlnIGNvbnRlbnQgZm9yIGEgc3BlY2lmaWMgY2xpZW50XG4gICAgICogQHpoIOS4uuaMh+WumuWuouaIt+err+eUn+aIkOmFjee9ruWGheWuuVxuICAgICAqL1xuICAgIGFzeW5jIGdlbmVyYXRlQ2xpZW50Q29uZmlnKGNsaWVudFR5cGU6IENsaWVudFR5cGUsIHNlcnZlckNvbmZpZzogYW55KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjb25maWdDb250ZW50ID0gTUNQQ29uZmlnTWFuYWdlci5nZW5lcmF0ZUNvbmZpZ0NvbnRlbnQoY2xpZW50VHlwZSwgc2VydmVyQ29uZmlnKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBjb25maWdDb250ZW50XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQ5o+S5Lu2XSBGYWlsZWQgdG8gZ2VuZXJhdGUgY29uZmlnOicsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiAnJ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIE1DUCBzZXJ2ZXIgdG8gYSBzcGVjaWZpYyBjbGllbnRcbiAgICAgKiBAemgg5re75YqgTUNQ5pyN5Yqh5Zmo5Yiw5oyH5a6a5a6i5oi356uvXG4gICAgICovXG4gICAgYXN5bmMgYWRkVG9DbGllbnQoY2xpZW50VHlwZTogQ2xpZW50VHlwZSwgc2VydmVyQ29uZmlnOiBhbnkpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQ5o+S5Lu2XSBBZGRpbmcgc2VydmVyIHRvICR7Y2xpZW50VHlwZX06YCwgc2VydmVyQ29uZmlnKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IE1DUENvbmZpZ01hbmFnZXIuYWRkU2VydmVyKGNsaWVudFR5cGUsIHNlcnZlckNvbmZpZyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQ5o+S5Lu2XSBGYWlsZWQgdG8gYWRkIHRvIGNsaWVudDonLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2VcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGVuIFJlbW92ZSBNQ1Agc2VydmVyIGZyb20gYSBzcGVjaWZpYyBjbGllbnRcbiAgICAgKiBAemgg5LuO5oyH5a6a5a6i5oi356uv5Yig6ZmkTUNQ5pyN5Yqh5ZmoXG4gICAgICovXG4gICAgYXN5bmMgcmVtb3ZlRnJvbUNsaWVudChjbGllbnRUeXBlOiBDbGllbnRUeXBlLCBzZXJ2ZXJOYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQ5o+S5Lu2XSBSZW1vdmluZyBzZXJ2ZXIgZnJvbSAke2NsaWVudFR5cGV9OmAsIHNlcnZlck5hbWUpO1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gTUNQQ29uZmlnTWFuYWdlci5yZW1vdmVTZXJ2ZXIoY2xpZW50VHlwZSwgc2VydmVyTmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQ5o+S5Lu2XSBGYWlsZWQgdG8gcmVtb3ZlIGZyb20gY2xpZW50OicsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBAZW4gQWRkIE1DUCBzZXJ2ZXIgdG8gYWxsIElERSBjbGllbnRzXG4gICAgICogQHpoIOa3u+WKoE1DUOacjeWKoeWZqOWIsOaJgOaciUlEReWuouaIt+err1xuICAgICAqL1xuICAgIGFzeW5jIGFkZFRvQWxsQ2xpZW50cyhzZXJ2ZXJDb25maWc6IGFueSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIEFkZGluZyBzZXJ2ZXIgdG8gYWxsIElERSBjbGllbnRzOicsIHNlcnZlckNvbmZpZyk7XG4gICAgICAgICAgICBjb25zdCByZXN1bHRzID0gTUNQQ29uZmlnTWFuYWdlci5hZGRUb0FsbENsaWVudHMoc2VydmVyQ29uZmlnKTtcblxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzdWx0czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgICAgICAgICAgZm9yIChjb25zdCBbY2xpZW50VHlwZSwgcmVzdWx0XSBvZiByZXN1bHRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsaWVudE5hbWUgPSBNQ1BfQ0xJRU5UU1tjbGllbnRUeXBlXS5uYW1lO1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3VsdHNbY2xpZW50TmFtZV0gPSByZXN1bHQubWVzc2FnZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IGZvcm1hdHRlZFJlc3VsdHNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1Dmj5Lku7ZdIEZhaWxlZCB0byBhZGQgdG8gYWxsIGNsaWVudHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IHt9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEBlbiBSZW1vdmUgTUNQIHNlcnZlciBmcm9tIGFsbCBJREUgY2xpZW50c1xuICAgICAqIEB6aCDku47miYDmnIlJREXlrqLmiLfnq6/liKDpmaRNQ1DmnI3liqHlmahcbiAgICAgKi9cbiAgICBhc3luYyByZW1vdmVGcm9tQWxsQ2xpZW50cyhzZXJ2ZXJOYW1lOiBzdHJpbmcpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQ5o+S5Lu2XSBSZW1vdmluZyBzZXJ2ZXIgZnJvbSBhbGwgSURFIGNsaWVudHM6Jywgc2VydmVyTmFtZSk7XG4gICAgICAgICAgICBjb25zdCByZXN1bHRzID0gTUNQQ29uZmlnTWFuYWdlci5yZW1vdmVGcm9tQWxsQ2xpZW50cyhzZXJ2ZXJOYW1lKTtcblxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkUmVzdWx0czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xuICAgICAgICAgICAgZm9yIChjb25zdCBbY2xpZW50VHlwZSwgcmVzdWx0XSBvZiByZXN1bHRzLmVudHJpZXMoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsaWVudE5hbWUgPSBNQ1BfQ0xJRU5UU1tjbGllbnRUeXBlXS5uYW1lO1xuICAgICAgICAgICAgICAgIGZvcm1hdHRlZFJlc3VsdHNbY2xpZW50TmFtZV0gPSByZXN1bHQubWVzc2FnZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIHJlc3VsdHM6IGZvcm1hdHRlZFJlc3VsdHNcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1Dmj5Lku7ZdIEZhaWxlZCB0byByZW1vdmUgZnJvbSBhbGwgY2xpZW50czonLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgcmVzdWx0czoge31cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQGVuIE9wZW4gY29uZmlndXJhdGlvbiBmaWxlIGluIGRlZmF1bHQgZWRpdG9yXG4gICAgICogQHpoIOWcqOm7mOiupOe8lui+keWZqOS4reaJk+W8gOmFjee9ruaWh+S7tlxuICAgICAqL1xuICAgIGFzeW5jIG9wZW5Db25maWdGaWxlKGNvbmZpZ1BhdGg6IHN0cmluZykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8g5bGV5byA6Lev5b6E5Lit55qEfuWSjOeOr+Wig+WPmOmHj1xuICAgICAgICAgICAgbGV0IGV4cGFuZGVkUGF0aCA9IGNvbmZpZ1BhdGg7XG5cbiAgICAgICAgICAgIGlmIChleHBhbmRlZFBhdGguc3RhcnRzV2l0aCgnficpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaG9tZSA9IHByb2Nlc3MuZW52LkhPTUUgfHwgcHJvY2Vzcy5lbnYuVVNFUlBST0ZJTEU7XG4gICAgICAgICAgICAgICAgaWYgKGhvbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgZXhwYW5kZWRQYXRoID0gZXhwYW5kZWRQYXRoLnJlcGxhY2UoJ34nLCBob21lKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIOWxleW8gFdpbmRvd3Pnjq/looPlj5jph49cbiAgICAgICAgICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnd2luMzInKSB7XG4gICAgICAgICAgICAgICAgZXhwYW5kZWRQYXRoID0gZXhwYW5kZWRQYXRoLnJlcGxhY2UoLyUoW14lXSspJS9nLCAoXywga2V5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9jZXNzLmVudltrZXldIHx8ICcnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUOaPkuS7tl0gT3BlbmluZyBjb25maWcgZmlsZTonLCBleHBhbmRlZFBhdGgpO1xuXG4gICAgICAgICAgICAvLyDkvb/nlKhOb2RlLmpz55qEY2hpbGRfcHJvY2Vzc+aJk+W8gOaWh+S7tlxuICAgICAgICAgICAgY29uc3QgeyBleGVjIH0gPSByZXF1aXJlKCdjaGlsZF9wcm9jZXNzJyk7XG4gICAgICAgICAgICBsZXQgY29tbWFuZDogc3RyaW5nO1xuXG4gICAgICAgICAgICBpZiAocHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ2RhcndpbicpIHtcbiAgICAgICAgICAgICAgICAvLyBtYWNPU+S9v+eUqG9wZW7lkb3ku6RcbiAgICAgICAgICAgICAgICBjb21tYW5kID0gYG9wZW4gXCIke2V4cGFuZGVkUGF0aH1cImA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHByb2Nlc3MucGxhdGZvcm0gPT09ICd3aW4zMicpIHtcbiAgICAgICAgICAgICAgICAvLyBXaW5kb3dz5L2/55Soc3RhcnTlkb3ku6RcbiAgICAgICAgICAgICAgICBjb21tYW5kID0gYHN0YXJ0IFwiXCIgXCIke2V4cGFuZGVkUGF0aH1cImA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIExpbnV45L2/55SoeGRnLW9wZW7lkb3ku6RcbiAgICAgICAgICAgICAgICBjb21tYW5kID0gYHhkZy1vcGVuIFwiJHtleHBhbmRlZFBhdGh9XCJgO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBleGVjKGNvbW1hbmQsIChlcnJvcjogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1Dmj5Lku7ZdIEZhaWxlZCB0byBvcGVuIGNvbmZpZyBmaWxlOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDlt7LmiZPlvIDphY3nva7mlofku7Y6ICR7ZXhwYW5kZWRQYXRofWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1Dmj5Lku7ZdIEZhaWxlZCB0byBvcGVuIGNvbmZpZyBmaWxlOicsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYOaJk+W8gOmFjee9ruaWh+S7tuWksei0pTogJHtlcnJvci5tZXNzYWdlfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIEBlbiBNZXRob2QgVHJpZ2dlcmVkIG9uIEV4dGVuc2lvbiBTdGFydHVwXG4gKiBAemgg5omp5bGV5ZCv5Yqo5pe26Kem5Y+R55qE5pa55rOVXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkge1xuICAgIGNvbnNvbGUubG9nKCdDb2NvcyBNQ1AgU2VydmVyIGV4dGVuc2lvbiBsb2FkZWQnKTtcbiAgICBcbiAgICAvLyDliJ3lp4vljJblt6XlhbfnrqHnkIblmahcbiAgICB0b29sTWFuYWdlciA9IG5ldyBUb29sTWFuYWdlcigpO1xuICAgIFxuICAgIC8vIOivu+WPluiuvue9rlxuICAgIGNvbnN0IHNldHRpbmdzID0gcmVhZFNldHRpbmdzKCk7XG4gICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIFBsdWdpbiBsb2FkIC0gaW5pdGlhbCBzZXR0aW5nczonLCBzZXR0aW5ncyk7XG4gICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIFBsdWdpbiBsb2FkIC0gdHJhbnNwb3J0OiBTdHJlYW1hYmxlIEhUVFAnKTtcbiAgICBtY3BTZXJ2ZXIgPSBuZXcgTUNQU2VydmVyKHNldHRpbmdzKTtcbiAgICBcbiAgICAvLyDliJ3lp4vljJZNQ1DmnI3liqHlmajnmoTlt6XlhbfliJfooahcbiAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0b29sTWFuYWdlci5nZXRFbmFibGVkVG9vbHMoKTtcbiAgICBtY3BTZXJ2ZXIudXBkYXRlRW5hYmxlZFRvb2xzKGVuYWJsZWRUb29scyk7XG4gICAgXG4gICAgLy8g5LiN6Ieq5Yqo5ZCv5Yqo5pyN5Yqh5Zmo77yM5a6M5YWo55Sx55So5oi35omL5Yqo5o6n5Yi2XG4gICAgY29uc29sZS5sb2coJ1tNQ1Dmj5Lku7ZdIFNlcnZlciBpbml0aWFsaXplZCBidXQgbm90IHN0YXJ0ZWQuIFVzZSBwYW5lbCB0byBzdGFydCBtYW51YWxseS4nKTtcbiAgICBjb25zb2xlLmxvZygnW01DUOaPkuS7tl0gQXV0b1N0YXJ0IHNldHRpbmc6Jywgc2V0dGluZ3MuYXV0b1N0YXJ0LCAnLSBidXQgYXV0by1zdGFydCBpcyBkaXNhYmxlZCBmb3Igc3RhYmlsaXR5LicpO1xufVxuXG4vKipcbiAqIEBlbiBNZXRob2QgdHJpZ2dlcmVkIHdoZW4gdW5pbnN0YWxsaW5nIHRoZSBleHRlbnNpb25cbiAqIEB6aCDljbjovb3mianlsZXml7bop6blj5HnmoTmlrnms5VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVubG9hZCgpIHtcbiAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgIG1jcFNlcnZlci5zdG9wKCk7XG4gICAgICAgIG1jcFNlcnZlciA9IG51bGw7XG4gICAgfVxufSJdfQ==