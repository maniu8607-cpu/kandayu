"use strict";
/**
 * MCP客户端配置文件管理器
 * 负责读取、合并、添加、删除各个AI编辑器的MCP配置
 */
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
exports.MCPConfigManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const toml = __importStar(require("@iarna/toml"));
const mcp_client_configs_1 = require("./mcp-client-configs");
/**
 * MCP配置管理器
 */
class MCPConfigManager {
    /**
     * 检查配置文件是否存在
     */
    static configFileExists(clientType) {
        try {
            const configPath = (0, mcp_client_configs_1.getConfigFilePath)(clientType);
            return fs.existsSync(configPath);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * 读取现有配置文件
     */
    static readConfig(clientType) {
        const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
        const configPath = (0, mcp_client_configs_1.getConfigFilePath)(clientType);
        if (!fs.existsSync(configPath)) {
            // 配置文件不存在，返回空配置
            if (client.configFormat === 'json') {
                return { mcpServers: {} };
            }
            else {
                return { mcp_servers: {} };
            }
        }
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            if (client.configFormat === 'json') {
                return JSON.parse(content);
            }
            else {
                return toml.parse(content);
            }
        }
        catch (error) {
            console.error(`[MCPConfigManager] Failed to read config for ${clientType}:`, error);
            throw new Error(`无法读取配置文件: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 备份现有配置文件
     */
    static backupConfig(clientType) {
        const configPath = (0, mcp_client_configs_1.getConfigFilePath)(clientType);
        if (!fs.existsSync(configPath)) {
            return null;
        }
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `${configPath}.backup-${timestamp}`;
            fs.copyFileSync(configPath, backupPath);
            console.log(`[MCPConfigManager] Config backed up to: ${backupPath}`);
            return backupPath;
        }
        catch (error) {
            console.error(`[MCPConfigManager] Failed to backup config:`, error);
            return null;
        }
    }
    /**
     * 确保配置文件目录存在
     */
    static ensureConfigDir(configPath) {
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`[MCPConfigManager] Created config directory: ${dir}`);
        }
    }
    /**
     * 写入配置文件
     */
    static writeConfig(clientType, config) {
        const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
        const configPath = (0, mcp_client_configs_1.getConfigFilePath)(clientType);
        // 确保目录存在
        this.ensureConfigDir(configPath);
        try {
            let content;
            if (client.configFormat === 'json') {
                content = JSON.stringify(config, null, 2);
            }
            else {
                content = toml.stringify(config);
            }
            fs.writeFileSync(configPath, content, 'utf-8');
            console.log(`[MCPConfigManager] Config written to: ${configPath}`);
        }
        catch (error) {
            console.error(`[MCPConfigManager] Failed to write config:`, error);
            throw new Error(`无法写入配置文件: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 添加MCP服务器配置
     */
    static addServer(clientType, serverConfig) {
        try {
            const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
            console.log(`[MCPConfigManager] Adding server ${serverConfig.serverName} to ${clientType}`);
            // 备份现有配置
            const backupPath = this.backupConfig(clientType);
            // 读取现有配置
            const config = this.readConfig(clientType);
            // 获取服务器配置对象
            const serversKey = client.configFormat === 'json' ? 'mcpServers' : 'mcp_servers';
            if (!config[serversKey]) {
                config[serversKey] = {};
            }
            // 检查服务器是否已存在
            if (config[serversKey][serverConfig.serverName]) {
                return {
                    success: false,
                    message: `服务器 "${serverConfig.serverName}" 已存在于配置文件中`,
                    configPath: (0, mcp_client_configs_1.getConfigFilePath)(clientType)
                };
            }
            // 生成服务器配置项
            const serverEntry = {};
            // 不同客户端使用不同的字段名
            if (clientType === 'windsurf') {
                // Windsurf使用serverUrl
                serverEntry.serverUrl = serverConfig.serverUrl;
            }
            else if (clientType === 'gemini-cli') {
                // Gemini CLI使用httpUrl
                serverEntry.httpUrl = serverConfig.serverUrl;
            }
            else {
                // Cursor, Trae, Claude CLI, Codex CLI都使用url
                serverEntry.url = serverConfig.serverUrl;
            }
            if (serverConfig.headers && Object.keys(serverConfig.headers).length > 0) {
                serverEntry.headers = serverConfig.headers;
            }
            // 添加到配置
            config[serversKey][serverConfig.serverName] = serverEntry;
            // 写入配置文件
            this.writeConfig(clientType, config);
            return {
                success: true,
                message: `成功添加服务器 "${serverConfig.serverName}" 到 ${client.name}`,
                configPath: (0, mcp_client_configs_1.getConfigFilePath)(clientType),
                backupPath: backupPath || undefined
            };
        }
        catch (error) {
            console.error(`[MCPConfigManager] Failed to add server:`, error);
            return {
                success: false,
                message: `添加失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    /**
     * 删除MCP服务器配置
     */
    static removeServer(clientType, serverName) {
        try {
            const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
            console.log(`[MCPConfigManager] Removing server ${serverName} from ${clientType}`);
            const configPath = (0, mcp_client_configs_1.getConfigFilePath)(clientType);
            if (!fs.existsSync(configPath)) {
                return {
                    success: false,
                    message: `配置文件不存在`,
                    configPath: configPath
                };
            }
            // 备份现有配置
            const backupPath = this.backupConfig(clientType);
            // 读取现有配置
            const config = this.readConfig(clientType);
            // 获取服务器配置对象
            const serversKey = client.configFormat === 'json' ? 'mcpServers' : 'mcp_servers';
            if (!config[serversKey] || !config[serversKey][serverName]) {
                return {
                    success: false,
                    message: `服务器 "${serverName}" 不存在于配置文件中`,
                    configPath: configPath
                };
            }
            // 删除服务器
            delete config[serversKey][serverName];
            // 写入配置文件
            this.writeConfig(clientType, config);
            return {
                success: true,
                message: `成功从 ${client.name} 中删除服务器 "${serverName}"`,
                configPath: configPath,
                backupPath: backupPath || undefined
            };
        }
        catch (error) {
            console.error(`[MCPConfigManager] Failed to remove server:`, error);
            return {
                success: false,
                message: `删除失败: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    /**
     * 检查服务器是否存在
     */
    static serverExists(clientType, serverName) {
        try {
            const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
            const config = this.readConfig(clientType);
            const serversKey = client.configFormat === 'json' ? 'mcpServers' : 'mcp_servers';
            return config[serversKey] && config[serversKey][serverName] !== undefined;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * 获取配置文件中的所有服务器名称
     */
    static listServers(clientType) {
        try {
            const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
            const config = this.readConfig(clientType);
            const serversKey = client.configFormat === 'json' ? 'mcpServers' : 'mcp_servers';
            if (!config[serversKey]) {
                return [];
            }
            return Object.keys(config[serversKey]);
        }
        catch (error) {
            console.error(`[MCPConfigManager] Failed to list servers:`, error);
            return [];
        }
    }
    /**
     * 生成当前Cocos MCP服务器的配置
     */
    static generateCocosServerConfig(port = 3000) {
        return {
            serverName: 'cocos-creator',
            serverUrl: `http://127.0.0.1:${port}/mcp`
        };
    }
    /**
     * 一键添加到所有支持的客户端
     */
    static addToAllClients(serverConfig) {
        const results = new Map();
        // 添加到IDE编辑器和Codex CLI（Codex CLI支持自动配置）
        const autoConfigClients = ['cursor', 'windsurf', 'trae', 'codex-cli'];
        for (const clientType of autoConfigClients) {
            const result = this.addServer(clientType, serverConfig);
            results.set(clientType, result);
        }
        return results;
    }
    /**
     * 从所有客户端删除
     */
    static removeFromAllClients(serverName) {
        const results = new Map();
        const autoConfigClients = ['cursor', 'windsurf', 'trae', 'codex-cli'];
        for (const clientType of autoConfigClients) {
            if (this.serverExists(clientType, serverName)) {
                const result = this.removeServer(clientType, serverName);
                results.set(clientType, result);
            }
        }
        return results;
    }
    /**
     * 生成CLI命令（用于显示给用户，仅手动配置的CLI）
     */
    static generateCLICommands(serverConfig) {
        const scope = serverConfig.scope || 'user';
        return {
            claude: (0, mcp_client_configs_1.generateCLICommand)({
                clientType: 'claude-cli',
                serverConfig,
                transport: 'streamable-http',
                scope: scope
            }),
            gemini: (0, mcp_client_configs_1.generateCLICommand)({
                clientType: 'gemini-cli',
                serverConfig,
                transport: 'streamable-http',
                scope: scope
            })
        };
    }
    /**
     * 生成指定客户端的配置内容（用于复制）
     */
    static generateConfigContent(clientType, serverConfig) {
        const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
        if (client.configFormat === 'json') {
            return (0, mcp_client_configs_1.generateJSONConfig)(clientType, serverConfig, 'streamable-http');
        }
        else {
            // TOML格式
            return (0, mcp_client_configs_1.generateTOMLConfig)(serverConfig);
        }
    }
    /**
     * 获取配置状态摘要
     */
    static getConfigStatus(serverName) {
        const allClients = ['cursor', 'windsurf', 'trae', 'codex-cli', 'claude-cli', 'gemini-cli'];
        const results = allClients.map(clientType => {
            try {
                const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
                // 自动配置的客户端: Cursor, Windsurf, Trae, Codex CLI
                const isAutoConfig = clientType === 'cursor' || clientType === 'windsurf' ||
                    clientType === 'trae' || clientType === 'codex-cli';
                const configPath = (0, mcp_client_configs_1.getConfigFilePath)(clientType);
                const exists = this.serverExists(clientType, serverName);
                return {
                    clientType,
                    clientName: client.name,
                    exists: exists,
                    configPath: configPath,
                    isIDE: client.isIDE,
                    isAutoConfig: isAutoConfig
                };
            }
            catch (error) {
                console.error(`[MCPConfigManager] Failed to get status for ${clientType}:`, error);
                const client = mcp_client_configs_1.MCP_CLIENTS[clientType];
                const isAutoConfig = clientType === 'cursor' || clientType === 'windsurf' ||
                    clientType === 'trae' || clientType === 'codex-cli';
                return {
                    clientType,
                    clientName: client.name,
                    exists: false,
                    configPath: 'Error loading path',
                    isIDE: client.isIDE,
                    isAutoConfig: isAutoConfig
                };
            }
        });
        return results;
    }
}
exports.MCPConfigManager = MCPConfigManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLWNvbmZpZy1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc291cmNlL21jcC1jb25maWctbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLGtEQUFvQztBQUNwQyw2REFTOEI7QUFTOUI7O0dBRUc7QUFDSCxNQUFhLGdCQUFnQjtJQUN6Qjs7T0FFRztJQUNJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFzQjtRQUNqRCxJQUFJLENBQUM7WUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFBLHNDQUFpQixFQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2pELE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNiLE9BQU8sS0FBSyxDQUFDO1FBQ2pCLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsVUFBVSxDQUFDLFVBQXNCO1FBQzNDLE1BQU0sTUFBTSxHQUFHLGdDQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDdkMsTUFBTSxVQUFVLEdBQUcsSUFBQSxzQ0FBaUIsRUFBQyxVQUFVLENBQUMsQ0FBQztRQUVqRCxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQzdCLGdCQUFnQjtZQUNoQixJQUFJLE1BQU0sQ0FBQyxZQUFZLEtBQUssTUFBTSxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDOUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDL0IsQ0FBQztRQUNMLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDRCxNQUFN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LENBQUM7Q0FDSjtBQTlZRCw0Q0E4WUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1DUOWuouaIt+err+mFjee9ruaWh+S7tueuoeeQhuWZqFxuICog6LSf6LSj6K+75Y+W44CB5ZCI5bm244CB5re75Yqg44CB5Yig6Zmk5ZCE5LiqQUnnvJbovpHlmajnmoRNQ1DphY3nva5cbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgdG9tbCBmcm9tICdAaWFybmEvdG9tbCc7XG5pbXBvcnQge1xuICAgIENsaWVudFR5cGUsXG4gICAgTUNQU2VydmVyQ29uZmlnLFxuICAgIE1DUF9DTElFTlRTLFxuICAgIGdldENvbmZpZ0ZpbGVQYXRoLFxuICAgIGdlbmVyYXRlSlNPTkNvbmZpZyxcbiAgICBnZW5lcmF0ZVRPTUxDb25maWcsXG4gICAgZ2VuZXJhdGVDTElDb21tYW5kLFxuICAgIENMSUNvbW1hbmRDb25maWdcbn0gZnJvbSAnLi9tY3AtY2xpZW50LWNvbmZpZ3MnO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ09wZXJhdGlvblJlc3VsdCB7XG4gICAgc3VjY2VzczogYm9vbGVhbjtcbiAgICBtZXNzYWdlOiBzdHJpbmc7XG4gICAgY29uZmlnUGF0aD86IHN0cmluZztcbiAgICBiYWNrdXBQYXRoPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIE1DUOmFjee9rueuoeeQhuWZqFxuICovXG5leHBvcnQgY2xhc3MgTUNQQ29uZmlnTWFuYWdlciB7XG4gICAgLyoqXG4gICAgICog5qOA5p+l6YWN572u5paH5Lu25piv5ZCm5a2Y5ZyoXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBjb25maWdGaWxlRXhpc3RzKGNsaWVudFR5cGU6IENsaWVudFR5cGUpOiBib29sZWFuIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZ1BhdGggPSBnZXRDb25maWdGaWxlUGF0aChjbGllbnRUeXBlKTtcbiAgICAgICAgICAgIHJldHVybiBmcy5leGlzdHNTeW5jKGNvbmZpZ1BhdGgpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog6K+75Y+W546w5pyJ6YWN572u5paH5Lu2XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyByZWFkQ29uZmlnKGNsaWVudFR5cGU6IENsaWVudFR5cGUpOiBhbnkge1xuICAgICAgICBjb25zdCBjbGllbnQgPSBNQ1BfQ0xJRU5UU1tjbGllbnRUeXBlXTtcbiAgICAgICAgY29uc3QgY29uZmlnUGF0aCA9IGdldENvbmZpZ0ZpbGVQYXRoKGNsaWVudFR5cGUpO1xuXG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhjb25maWdQYXRoKSkge1xuICAgICAgICAgICAgLy8g6YWN572u5paH5Lu25LiN5a2Y5Zyo77yM6L+U5Zue56m66YWN572uXG4gICAgICAgICAgICBpZiAoY2xpZW50LmNvbmZpZ0Zvcm1hdCA9PT0gJ2pzb24nKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbWNwU2VydmVyczoge30gfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbWNwX3NlcnZlcnM6IHt9IH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhjb25maWdQYXRoLCAndXRmLTgnKTtcblxuICAgICAgICAgICAgaWYgKGNsaWVudC5jb25maWdGb3JtYXQgPT09ICdqc29uJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGNvbnRlbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9tbC5wYXJzZShjb250ZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BDb25maWdNYW5hZ2VyXSBGYWlsZWQgdG8gcmVhZCBjb25maWcgZm9yICR7Y2xpZW50VHlwZX06YCwgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDml6Dms5Xor7vlj5bphY3nva7mlofku7Y6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5aSH5Lu9546w5pyJ6YWN572u5paH5Lu2XG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBiYWNrdXBDb25maWcoY2xpZW50VHlwZTogQ2xpZW50VHlwZSk6IHN0cmluZyB8IG51bGwge1xuICAgICAgICBjb25zdCBjb25maWdQYXRoID0gZ2V0Q29uZmlnRmlsZVBhdGgoY2xpZW50VHlwZSk7XG5cbiAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGNvbmZpZ1BhdGgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkucmVwbGFjZSgvWzouXS9nLCAnLScpO1xuICAgICAgICAgICAgY29uc3QgYmFja3VwUGF0aCA9IGAke2NvbmZpZ1BhdGh9LmJhY2t1cC0ke3RpbWVzdGFtcH1gO1xuICAgICAgICAgICAgZnMuY29weUZpbGVTeW5jKGNvbmZpZ1BhdGgsIGJhY2t1cFBhdGgpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BDb25maWdNYW5hZ2VyXSBDb25maWcgYmFja2VkIHVwIHRvOiAke2JhY2t1cFBhdGh9YCk7XG4gICAgICAgICAgICByZXR1cm4gYmFja3VwUGF0aDtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BDb25maWdNYW5hZ2VyXSBGYWlsZWQgdG8gYmFja3VwIGNvbmZpZzpgLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOehruS/nemFjee9ruaWh+S7tuebruW9leWtmOWcqFxuICAgICAqL1xuICAgIHByaXZhdGUgc3RhdGljIGVuc3VyZUNvbmZpZ0Rpcihjb25maWdQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aC5kaXJuYW1lKGNvbmZpZ1BhdGgpO1xuICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICAgICAgZnMubWtkaXJTeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUENvbmZpZ01hbmFnZXJdIENyZWF0ZWQgY29uZmlnIGRpcmVjdG9yeTogJHtkaXJ9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDlhpnlhaXphY3nva7mlofku7ZcbiAgICAgKi9cbiAgICBwcml2YXRlIHN0YXRpYyB3cml0ZUNvbmZpZyhjbGllbnRUeXBlOiBDbGllbnRUeXBlLCBjb25maWc6IGFueSk6IHZvaWQge1xuICAgICAgICBjb25zdCBjbGllbnQgPSBNQ1BfQ0xJRU5UU1tjbGllbnRUeXBlXTtcbiAgICAgICAgY29uc3QgY29uZmlnUGF0aCA9IGdldENvbmZpZ0ZpbGVQYXRoKGNsaWVudFR5cGUpO1xuXG4gICAgICAgIC8vIOehruS/neebruW9leWtmOWcqFxuICAgICAgICB0aGlzLmVuc3VyZUNvbmZpZ0Rpcihjb25maWdQYXRoKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbGV0IGNvbnRlbnQ6IHN0cmluZztcbiAgICAgICAgICAgIGlmIChjbGllbnQuY29uZmlnRm9ybWF0ID09PSAnanNvbicpIHtcbiAgICAgICAgICAgICAgICBjb250ZW50ID0gSlNPTi5zdHJpbmdpZnkoY29uZmlnLCBudWxsLCAyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGVudCA9IHRvbWwuc3RyaW5naWZ5KGNvbmZpZyBhcyB0b21sLkpzb25NYXApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGNvbmZpZ1BhdGgsIGNvbnRlbnQsICd1dGYtOCcpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BDb25maWdNYW5hZ2VyXSBDb25maWcgd3JpdHRlbiB0bzogJHtjb25maWdQYXRofWApO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW01DUENvbmZpZ01hbmFnZXJdIEZhaWxlZCB0byB3cml0ZSBjb25maWc6YCwgZXJyb3IpO1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGDml6Dms5XlhpnlhaXphY3nva7mlofku7Y6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5re75YqgTUNQ5pyN5Yqh5Zmo6YWN572uXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBhZGRTZXJ2ZXIoXG4gICAgICAgIGNsaWVudFR5cGU6IENsaWVudFR5cGUsXG4gICAgICAgIHNlcnZlckNvbmZpZzogTUNQU2VydmVyQ29uZmlnXG4gICAgKTogQ29uZmlnT3BlcmF0aW9uUmVzdWx0IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IE1DUF9DTElFTlRTW2NsaWVudFR5cGVdO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BDb25maWdNYW5hZ2VyXSBBZGRpbmcgc2VydmVyICR7c2VydmVyQ29uZmlnLnNlcnZlck5hbWV9IHRvICR7Y2xpZW50VHlwZX1gKTtcblxuICAgICAgICAgICAgLy8g5aSH5Lu9546w5pyJ6YWN572uXG4gICAgICAgICAgICBjb25zdCBiYWNrdXBQYXRoID0gdGhpcy5iYWNrdXBDb25maWcoY2xpZW50VHlwZSk7XG5cbiAgICAgICAgICAgIC8vIOivu+WPlueOsOaciemFjee9rlxuICAgICAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5yZWFkQ29uZmlnKGNsaWVudFR5cGUpO1xuXG4gICAgICAgICAgICAvLyDojrflj5bmnI3liqHlmajphY3nva7lr7nosaFcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlcnNLZXkgPSBjbGllbnQuY29uZmlnRm9ybWF0ID09PSAnanNvbicgPyAnbWNwU2VydmVycycgOiAnbWNwX3NlcnZlcnMnO1xuICAgICAgICAgICAgaWYgKCFjb25maWdbc2VydmVyc0tleV0pIHtcbiAgICAgICAgICAgICAgICBjb25maWdbc2VydmVyc0tleV0gPSB7fTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g5qOA5p+l5pyN5Yqh5Zmo5piv5ZCm5bey5a2Y5ZyoXG4gICAgICAgICAgICBpZiAoY29uZmlnW3NlcnZlcnNLZXldW3NlcnZlckNvbmZpZy5zZXJ2ZXJOYW1lXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBg5pyN5Yqh5ZmoIFwiJHtzZXJ2ZXJDb25maWcuc2VydmVyTmFtZX1cIiDlt7LlrZjlnKjkuo7phY3nva7mlofku7bkuK1gLFxuICAgICAgICAgICAgICAgICAgICBjb25maWdQYXRoOiBnZXRDb25maWdGaWxlUGF0aChjbGllbnRUeXBlKVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIOeUn+aIkOacjeWKoeWZqOmFjee9rumhuVxuICAgICAgICAgICAgY29uc3Qgc2VydmVyRW50cnk6IGFueSA9IHt9O1xuXG4gICAgICAgICAgICAvLyDkuI3lkIzlrqLmiLfnq6/kvb/nlKjkuI3lkIznmoTlrZfmrrXlkI1cbiAgICAgICAgICAgIGlmIChjbGllbnRUeXBlID09PSAnd2luZHN1cmYnKSB7XG4gICAgICAgICAgICAgICAgLy8gV2luZHN1cmbkvb/nlKhzZXJ2ZXJVcmxcbiAgICAgICAgICAgICAgICBzZXJ2ZXJFbnRyeS5zZXJ2ZXJVcmwgPSBzZXJ2ZXJDb25maWcuc2VydmVyVXJsO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjbGllbnRUeXBlID09PSAnZ2VtaW5pLWNsaScpIHtcbiAgICAgICAgICAgICAgICAvLyBHZW1pbmkgQ0xJ5L2/55SoaHR0cFVybFxuICAgICAgICAgICAgICAgIHNlcnZlckVudHJ5Lmh0dHBVcmwgPSBzZXJ2ZXJDb25maWcuc2VydmVyVXJsO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDdXJzb3IsIFRyYWUsIENsYXVkZSBDTEksIENvZGV4IENMSemDveS9v+eUqHVybFxuICAgICAgICAgICAgICAgIHNlcnZlckVudHJ5LnVybCA9IHNlcnZlckNvbmZpZy5zZXJ2ZXJVcmw7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzZXJ2ZXJDb25maWcuaGVhZGVycyAmJiBPYmplY3Qua2V5cyhzZXJ2ZXJDb25maWcuaGVhZGVycykubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIHNlcnZlckVudHJ5LmhlYWRlcnMgPSBzZXJ2ZXJDb25maWcuaGVhZGVycztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g5re75Yqg5Yiw6YWN572uXG4gICAgICAgICAgICBjb25maWdbc2VydmVyc0tleV1bc2VydmVyQ29uZmlnLnNlcnZlck5hbWVdID0gc2VydmVyRW50cnk7XG5cbiAgICAgICAgICAgIC8vIOWGmeWFpemFjee9ruaWh+S7tlxuICAgICAgICAgICAgdGhpcy53cml0ZUNvbmZpZyhjbGllbnRUeXBlLCBjb25maWcpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYOaIkOWKn+a3u+WKoOacjeWKoeWZqCBcIiR7c2VydmVyQ29uZmlnLnNlcnZlck5hbWV9XCIg5YiwICR7Y2xpZW50Lm5hbWV9YCxcbiAgICAgICAgICAgICAgICBjb25maWdQYXRoOiBnZXRDb25maWdGaWxlUGF0aChjbGllbnRUeXBlKSxcbiAgICAgICAgICAgICAgICBiYWNrdXBQYXRoOiBiYWNrdXBQYXRoIHx8IHVuZGVmaW5lZFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BDb25maWdNYW5hZ2VyXSBGYWlsZWQgdG8gYWRkIHNlcnZlcjpgLCBlcnJvcik7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDmt7vliqDlpLHotKU6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiDliKDpmaRNQ1DmnI3liqHlmajphY3nva5cbiAgICAgKi9cbiAgICBwdWJsaWMgc3RhdGljIHJlbW92ZVNlcnZlcihcbiAgICAgICAgY2xpZW50VHlwZTogQ2xpZW50VHlwZSxcbiAgICAgICAgc2VydmVyTmFtZTogc3RyaW5nXG4gICAgKTogQ29uZmlnT3BlcmF0aW9uUmVzdWx0IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IE1DUF9DTElFTlRTW2NsaWVudFR5cGVdO1xuICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BDb25maWdNYW5hZ2VyXSBSZW1vdmluZyBzZXJ2ZXIgJHtzZXJ2ZXJOYW1lfSBmcm9tICR7Y2xpZW50VHlwZX1gKTtcblxuICAgICAgICAgICAgY29uc3QgY29uZmlnUGF0aCA9IGdldENvbmZpZ0ZpbGVQYXRoKGNsaWVudFR5cGUpO1xuICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGNvbmZpZ1BhdGgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDphY3nva7mlofku7bkuI3lrZjlnKhgLFxuICAgICAgICAgICAgICAgICAgICBjb25maWdQYXRoOiBjb25maWdQYXRoXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8g5aSH5Lu9546w5pyJ6YWN572uXG4gICAgICAgICAgICBjb25zdCBiYWNrdXBQYXRoID0gdGhpcy5iYWNrdXBDb25maWcoY2xpZW50VHlwZSk7XG5cbiAgICAgICAgICAgIC8vIOivu+WPlueOsOaciemFjee9rlxuICAgICAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5yZWFkQ29uZmlnKGNsaWVudFR5cGUpO1xuXG4gICAgICAgICAgICAvLyDojrflj5bmnI3liqHlmajphY3nva7lr7nosaFcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlcnNLZXkgPSBjbGllbnQuY29uZmlnRm9ybWF0ID09PSAnanNvbicgPyAnbWNwU2VydmVycycgOiAnbWNwX3NlcnZlcnMnO1xuICAgICAgICAgICAgaWYgKCFjb25maWdbc2VydmVyc0tleV0gfHwgIWNvbmZpZ1tzZXJ2ZXJzS2V5XVtzZXJ2ZXJOYW1lXSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBg5pyN5Yqh5ZmoIFwiJHtzZXJ2ZXJOYW1lfVwiIOS4jeWtmOWcqOS6jumFjee9ruaWh+S7tuS4rWAsXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ1BhdGg6IGNvbmZpZ1BhdGhcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDliKDpmaTmnI3liqHlmahcbiAgICAgICAgICAgIGRlbGV0ZSBjb25maWdbc2VydmVyc0tleV1bc2VydmVyTmFtZV07XG5cbiAgICAgICAgICAgIC8vIOWGmeWFpemFjee9ruaWh+S7tlxuICAgICAgICAgICAgdGhpcy53cml0ZUNvbmZpZyhjbGllbnRUeXBlLCBjb25maWcpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYOaIkOWKn+S7jiAke2NsaWVudC5uYW1lfSDkuK3liKDpmaTmnI3liqHlmaggXCIke3NlcnZlck5hbWV9XCJgLFxuICAgICAgICAgICAgICAgIGNvbmZpZ1BhdGg6IGNvbmZpZ1BhdGgsXG4gICAgICAgICAgICAgICAgYmFja3VwUGF0aDogYmFja3VwUGF0aCB8fCB1bmRlZmluZWRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbTUNQQ29uZmlnTWFuYWdlcl0gRmFpbGVkIHRvIHJlbW92ZSBzZXJ2ZXI6YCwgZXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBg5Yig6Zmk5aSx6LSlOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5qOA5p+l5pyN5Yqh5Zmo5piv5ZCm5a2Y5ZyoXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBzZXJ2ZXJFeGlzdHMoY2xpZW50VHlwZTogQ2xpZW50VHlwZSwgc2VydmVyTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBjbGllbnQgPSBNQ1BfQ0xJRU5UU1tjbGllbnRUeXBlXTtcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucmVhZENvbmZpZyhjbGllbnRUeXBlKTtcbiAgICAgICAgICAgIGNvbnN0IHNlcnZlcnNLZXkgPSBjbGllbnQuY29uZmlnRm9ybWF0ID09PSAnanNvbicgPyAnbWNwU2VydmVycycgOiAnbWNwX3NlcnZlcnMnO1xuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZ1tzZXJ2ZXJzS2V5XSAmJiBjb25maWdbc2VydmVyc0tleV1bc2VydmVyTmFtZV0gIT09IHVuZGVmaW5lZDtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOiOt+WPlumFjee9ruaWh+S7tuS4reeahOaJgOacieacjeWKoeWZqOWQjeensFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgbGlzdFNlcnZlcnMoY2xpZW50VHlwZTogQ2xpZW50VHlwZSk6IHN0cmluZ1tdIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IE1DUF9DTElFTlRTW2NsaWVudFR5cGVdO1xuICAgICAgICAgICAgY29uc3QgY29uZmlnID0gdGhpcy5yZWFkQ29uZmlnKGNsaWVudFR5cGUpO1xuICAgICAgICAgICAgY29uc3Qgc2VydmVyc0tleSA9IGNsaWVudC5jb25maWdGb3JtYXQgPT09ICdqc29uJyA/ICdtY3BTZXJ2ZXJzJyA6ICdtY3Bfc2VydmVycyc7XG5cbiAgICAgICAgICAgIGlmICghY29uZmlnW3NlcnZlcnNLZXldKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoY29uZmlnW3NlcnZlcnNLZXldKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BDb25maWdNYW5hZ2VyXSBGYWlsZWQgdG8gbGlzdCBzZXJ2ZXJzOmAsIGVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOeUn+aIkOW9k+WJjUNvY29zIE1DUOacjeWKoeWZqOeahOmFjee9rlxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2VuZXJhdGVDb2Nvc1NlcnZlckNvbmZpZyhwb3J0OiBudW1iZXIgPSAzMDAwKTogTUNQU2VydmVyQ29uZmlnIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNlcnZlck5hbWU6ICdjb2Nvcy1jcmVhdG9yJyxcbiAgICAgICAgICAgIHNlcnZlclVybDogYGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fS9tY3BgXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog5LiA6ZSu5re75Yqg5Yiw5omA5pyJ5pSv5oyB55qE5a6i5oi356uvXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBhZGRUb0FsbENsaWVudHMoc2VydmVyQ29uZmlnOiBNQ1BTZXJ2ZXJDb25maWcpOiBNYXA8Q2xpZW50VHlwZSwgQ29uZmlnT3BlcmF0aW9uUmVzdWx0PiB7XG4gICAgICAgIGNvbnN0IHJlc3VsdHMgPSBuZXcgTWFwPENsaWVudFR5cGUsIENvbmZpZ09wZXJhdGlvblJlc3VsdD4oKTtcblxuICAgICAgICAvLyDmt7vliqDliLBJREXnvJbovpHlmajlkoxDb2RleCBDTEnvvIhDb2RleCBDTEnmlK/mjIHoh6rliqjphY3nva7vvIlcbiAgICAgICAgY29uc3QgYXV0b0NvbmZpZ0NsaWVudHM6IENsaWVudFR5cGVbXSA9IFsnY3Vyc29yJywgJ3dpbmRzdXJmJywgJ3RyYWUnLCAnY29kZXgtY2xpJ107XG5cbiAgICAgICAgZm9yIChjb25zdCBjbGllbnRUeXBlIG9mIGF1dG9Db25maWdDbGllbnRzKSB7XG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLmFkZFNlcnZlcihjbGllbnRUeXBlLCBzZXJ2ZXJDb25maWcpO1xuICAgICAgICAgICAgcmVzdWx0cy5zZXQoY2xpZW50VHlwZSwgcmVzdWx0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHRzO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOS7juaJgOacieWuouaIt+err+WIoOmZpFxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgcmVtb3ZlRnJvbUFsbENsaWVudHMoc2VydmVyTmFtZTogc3RyaW5nKTogTWFwPENsaWVudFR5cGUsIENvbmZpZ09wZXJhdGlvblJlc3VsdD4ge1xuICAgICAgICBjb25zdCByZXN1bHRzID0gbmV3IE1hcDxDbGllbnRUeXBlLCBDb25maWdPcGVyYXRpb25SZXN1bHQ+KCk7XG5cbiAgICAgICAgY29uc3QgYXV0b0NvbmZpZ0NsaWVudHM6IENsaWVudFR5cGVbXSA9IFsnY3Vyc29yJywgJ3dpbmRzdXJmJywgJ3RyYWUnLCAnY29kZXgtY2xpJ107XG5cbiAgICAgICAgZm9yIChjb25zdCBjbGllbnRUeXBlIG9mIGF1dG9Db25maWdDbGllbnRzKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5zZXJ2ZXJFeGlzdHMoY2xpZW50VHlwZSwgc2VydmVyTmFtZSkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSB0aGlzLnJlbW92ZVNlcnZlcihjbGllbnRUeXBlLCBzZXJ2ZXJOYW1lKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnNldChjbGllbnRUeXBlLCByZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICog55Sf5oiQQ0xJ5ZG95Luk77yI55So5LqO5pi+56S657uZ55So5oi377yM5LuF5omL5Yqo6YWN572u55qEQ0xJ77yJXG4gICAgICovXG4gICAgcHVibGljIHN0YXRpYyBnZW5lcmF0ZUNMSUNvbW1hbmRzKHNlcnZlckNvbmZpZzogTUNQU2VydmVyQ29uZmlnICYgeyBzY29wZT86ICd1c2VyJyB8ICdwcm9qZWN0JyB9KToge1xuICAgICAgICBjbGF1ZGU6IHN0cmluZztcbiAgICAgICAgZ2VtaW5pOiBzdHJpbmc7XG4gICAgfSB7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gc2VydmVyQ29uZmlnLnNjb3BlIHx8ICd1c2VyJztcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNsYXVkZTogZ2VuZXJhdGVDTElDb21tYW5kKHtcbiAgICAgICAgICAgICAgICBjbGllbnRUeXBlOiAnY2xhdWRlLWNsaScsXG4gICAgICAgICAgICAgICAgc2VydmVyQ29uZmlnLFxuICAgICAgICAgICAgICAgIHRyYW5zcG9ydDogJ3N0cmVhbWFibGUtaHR0cCcsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGdlbWluaTogZ2VuZXJhdGVDTElDb21tYW5kKHtcbiAgICAgICAgICAgICAgICBjbGllbnRUeXBlOiAnZ2VtaW5pLWNsaScsXG4gICAgICAgICAgICAgICAgc2VydmVyQ29uZmlnLFxuICAgICAgICAgICAgICAgIHRyYW5zcG9ydDogJ3N0cmVhbWFibGUtaHR0cCcsXG4gICAgICAgICAgICAgICAgc2NvcGU6IHNjb3BlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOeUn+aIkOaMh+WumuWuouaIt+err+eahOmFjee9ruWGheWuue+8iOeUqOS6juWkjeWItu+8iVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2VuZXJhdGVDb25maWdDb250ZW50KGNsaWVudFR5cGU6IENsaWVudFR5cGUsIHNlcnZlckNvbmZpZzogTUNQU2VydmVyQ29uZmlnKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgY2xpZW50ID0gTUNQX0NMSUVOVFNbY2xpZW50VHlwZV07XG5cbiAgICAgICAgaWYgKGNsaWVudC5jb25maWdGb3JtYXQgPT09ICdqc29uJykge1xuICAgICAgICAgICAgcmV0dXJuIGdlbmVyYXRlSlNPTkNvbmZpZyhjbGllbnRUeXBlLCBzZXJ2ZXJDb25maWcsICdzdHJlYW1hYmxlLWh0dHAnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFRPTUzmoLzlvI9cbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZVRPTUxDb25maWcoc2VydmVyQ29uZmlnKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIOiOt+WPlumFjee9rueKtuaAgeaRmOimgVxuICAgICAqL1xuICAgIHB1YmxpYyBzdGF0aWMgZ2V0Q29uZmlnU3RhdHVzKHNlcnZlck5hbWU6IHN0cmluZyk6IHtcbiAgICAgICAgY2xpZW50VHlwZTogQ2xpZW50VHlwZTtcbiAgICAgICAgY2xpZW50TmFtZTogc3RyaW5nO1xuICAgICAgICBleGlzdHM6IGJvb2xlYW47XG4gICAgICAgIGNvbmZpZ1BhdGg6IHN0cmluZztcbiAgICAgICAgaXNJREU6IGJvb2xlYW47XG4gICAgICAgIGlzQXV0b0NvbmZpZzogYm9vbGVhbjtcbiAgICB9W10ge1xuICAgICAgICBjb25zdCBhbGxDbGllbnRzOiBDbGllbnRUeXBlW10gPSBbJ2N1cnNvcicsICd3aW5kc3VyZicsICd0cmFlJywgJ2NvZGV4LWNsaScsICdjbGF1ZGUtY2xpJywgJ2dlbWluaS1jbGknXTtcblxuICAgICAgICBjb25zdCByZXN1bHRzID0gYWxsQ2xpZW50cy5tYXAoY2xpZW50VHlwZSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IE1DUF9DTElFTlRTW2NsaWVudFR5cGVdO1xuXG4gICAgICAgICAgICAgICAgLy8g6Ieq5Yqo6YWN572u55qE5a6i5oi356uvOiBDdXJzb3IsIFdpbmRzdXJmLCBUcmFlLCBDb2RleCBDTElcbiAgICAgICAgICAgICAgICBjb25zdCBpc0F1dG9Db25maWcgPSBjbGllbnRUeXBlID09PSAnY3Vyc29yJyB8fCBjbGllbnRUeXBlID09PSAnd2luZHN1cmYnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50VHlwZSA9PT0gJ3RyYWUnIHx8IGNsaWVudFR5cGUgPT09ICdjb2RleC1jbGknO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY29uZmlnUGF0aCA9IGdldENvbmZpZ0ZpbGVQYXRoKGNsaWVudFR5cGUpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0cyA9IHRoaXMuc2VydmVyRXhpc3RzKGNsaWVudFR5cGUsIHNlcnZlck5hbWUpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgY2xpZW50TmFtZTogY2xpZW50Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGV4aXN0czogZXhpc3RzLFxuICAgICAgICAgICAgICAgICAgICBjb25maWdQYXRoOiBjb25maWdQYXRoLFxuICAgICAgICAgICAgICAgICAgICBpc0lERTogY2xpZW50LmlzSURFLFxuICAgICAgICAgICAgICAgICAgICBpc0F1dG9Db25maWc6IGlzQXV0b0NvbmZpZ1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BDb25maWdNYW5hZ2VyXSBGYWlsZWQgdG8gZ2V0IHN0YXR1cyBmb3IgJHtjbGllbnRUeXBlfTpgLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgY29uc3QgY2xpZW50ID0gTUNQX0NMSUVOVFNbY2xpZW50VHlwZV07XG4gICAgICAgICAgICAgICAgY29uc3QgaXNBdXRvQ29uZmlnID0gY2xpZW50VHlwZSA9PT0gJ2N1cnNvcicgfHwgY2xpZW50VHlwZSA9PT0gJ3dpbmRzdXJmJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudFR5cGUgPT09ICd0cmFlJyB8fCBjbGllbnRUeXBlID09PSAnY29kZXgtY2xpJztcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBjbGllbnRUeXBlLFxuICAgICAgICAgICAgICAgICAgICBjbGllbnROYW1lOiBjbGllbnQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgZXhpc3RzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnUGF0aDogJ0Vycm9yIGxvYWRpbmcgcGF0aCcsXG4gICAgICAgICAgICAgICAgICAgIGlzSURFOiBjbGllbnQuaXNJREUsXG4gICAgICAgICAgICAgICAgICAgIGlzQXV0b0NvbmZpZzogaXNBdXRvQ29uZmlnXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxufVxuIl19