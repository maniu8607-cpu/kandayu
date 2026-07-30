"use strict";
/* eslint-disable vue/one-component-per-file */
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const panelDataMap = new WeakMap();
module.exports = Editor.Panel.define({
    listeners: {
        show() {
            console.log('[MCP Panel] Panel shown');
        },
        hide() {
            console.log('[MCP Panel] Panel hidden');
        },
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        app: '#app',
        panelTitle: '#panelTitle',
    },
    ready() {
        if (this.$.app) {
            const app = (0, vue_1.createApp)({});
            app.config.compilerOptions.isCustomElement = (tag) => tag.startsWith('ui-');
            // 创建主应用组件
            app.component('McpServerApp', (0, vue_1.defineComponent)({
                setup() {
                    // 响应式数据
                    const activeTab = (0, vue_1.ref)('server');
                    const serverRunning = (0, vue_1.ref)(false);
                    const serverStatus = (0, vue_1.ref)('已停止');
                    const connectedClients = (0, vue_1.ref)(0);
                    const httpUrl = (0, vue_1.ref)('');
                    const isProcessing = (0, vue_1.ref)(false);
                    const settings = (0, vue_1.ref)({
                        port: 3000,
                        autoStart: false,
                        debugLog: false,
                        maxConnections: 10
                    });
                    const availableTools = (0, vue_1.ref)([]);
                    const toolCategories = (0, vue_1.ref)([]);
                    // 一键配置相关数据
                    const configServerName = (0, vue_1.ref)('cocos-creator');
                    const configTimeout = (0, vue_1.ref)(30000);
                    const cliScope = (0, vue_1.ref)('user'); // CLI配置范围: user 或 project
                    const ideClients = (0, vue_1.ref)([]);
                    const cliClients = (0, vue_1.ref)([]);
                    const cliCommands = (0, vue_1.ref)({
                        claude: '',
                        gemini: ''
                    });
                    const configLogs = (0, vue_1.ref)([]);
                    // 计算属性
                    const statusClass = (0, vue_1.computed)(() => ({
                        'status-running': serverRunning.value,
                        'status-stopped': !serverRunning.value
                    }));
                    const totalTools = (0, vue_1.computed)(() => availableTools.value.length);
                    const enabledTools = (0, vue_1.computed)(() => availableTools.value.filter(t => t.enabled).length);
                    const disabledTools = (0, vue_1.computed)(() => totalTools.value - enabledTools.value);
                    const settingsChanged = (0, vue_1.ref)(false);
                    // 计算配置服务器URL
                    const configServerUrl = (0, vue_1.computed)(() => {
                        return `http://127.0.0.1:${settings.value.port}/mcp`;
                    });
                    // 方法
                    const switchTab = (tabName) => {
                        activeTab.value = tabName;
                        if (tabName === 'tools') {
                            loadToolManagerState();
                        }
                        else if (tabName === 'config') {
                            loadConfigStatus();
                        }
                    };
                    const toggleServer = async () => {
                        try {
                            isProcessing.value = true;
                            if (serverRunning.value) {
                                console.log('[Vue App] Stopping server...');
                                await Editor.Message.request('cocos-mcp-server', 'stop-server');
                            }
                            else {
                                console.log('[Vue App] Starting server with settings:', settings.value);
                                // 启动服务器时使用当前面板设置
                                const currentSettings = {
                                    port: settings.value.port,
                                    autoStart: settings.value.autoStart,
                                    enableDebugLog: settings.value.debugLog,
                                    allowedOrigins: ['*'],
                                    maxConnections: settings.value.maxConnections
                                };
                                console.log('[Vue App] Updating settings before start:', currentSettings);
                                const updateResult = await Editor.Message.request('cocos-mcp-server', 'update-settings', currentSettings);
                                console.log('[Vue App] Update settings result:', updateResult);
                                await Editor.Message.request('cocos-mcp-server', 'start-server');
                            }
                            // 等待一下再更新状态
                            setTimeout(async () => {
                                await updateServerStatusOnly();
                            }, 500);
                            console.log('[Vue App] Server toggle completed');
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to toggle server:', error);
                            isProcessing.value = false;
                        }
                    };
                    const saveSettings = async () => {
                        try {
                            // 创建一个简单的对象，避免克隆错误
                            const settingsData = {
                                port: settings.value.port,
                                autoStart: settings.value.autoStart,
                                enableDebugLog: settings.value.debugLog,
                                allowedOrigins: ['*'],
                                maxConnections: settings.value.maxConnections
                            };
                            console.log('[Vue App] Current panel settings.value:', settings.value);
                            console.log('[Vue App] Settings data prepared for save');
                            console.log('[Vue App] Saving settings data:', settingsData);
                            console.log('[Vue App] Saving Streamable HTTP settings');
                            const result = await Editor.Message.request('cocos-mcp-server', 'update-settings', settingsData);
                            console.log('[Vue App] Save settings result:', result);
                            settingsChanged.value = false;
                            // 保存后等待一下再检查设置是否正确保存
                            setTimeout(async () => {
                                const status = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                                console.log('[Vue App] Settings after save:', status.settings);
                            }, 100);
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to save settings:', error);
                        }
                    };
                    const copyUrl = async () => {
                        try {
                            await navigator.clipboard.writeText(httpUrl.value);
                            console.log('[Vue App] URL copied to clipboard');
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to copy URL:', error);
                        }
                    };
                    const loadToolManagerState = async () => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'getToolManagerState');
                            if (result && result.success) {
                                // 总是加载后端状态，确保数据是最新的
                                availableTools.value = result.availableTools || [];
                                console.log('[Vue App] Loaded tools:', availableTools.value.length);
                                // 更新工具分类
                                const categories = new Set(availableTools.value.map(tool => tool.category));
                                toolCategories.value = Array.from(categories);
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to load tool manager state:', error);
                        }
                    };
                    const updateToolStatus = async (category, name, enabled) => {
                        try {
                            console.log('[Vue App] updateToolStatus called:', category, name, enabled);
                            // 先更新本地状态
                            const toolIndex = availableTools.value.findIndex(t => t.category === category && t.name === name);
                            if (toolIndex !== -1) {
                                availableTools.value[toolIndex].enabled = enabled;
                                // 强制触发响应式更新
                                availableTools.value = [...availableTools.value];
                                console.log('[Vue App] Local state updated, tool enabled:', availableTools.value[toolIndex].enabled);
                            }
                            // 调用后端更新
                            const result = await Editor.Message.request('cocos-mcp-server', 'updateToolStatus', category, name, enabled);
                            if (!result || !result.success) {
                                // 如果后端更新失败，回滚本地状态
                                if (toolIndex !== -1) {
                                    availableTools.value[toolIndex].enabled = !enabled;
                                    availableTools.value = [...availableTools.value];
                                }
                                console.error('[Vue App] Backend update failed, rolled back local state');
                            }
                            else {
                                console.log('[Vue App] Backend update successful');
                            }
                        }
                        catch (error) {
                            // 如果发生错误，回滚本地状态
                            const toolIndex = availableTools.value.findIndex(t => t.category === category && t.name === name);
                            if (toolIndex !== -1) {
                                availableTools.value[toolIndex].enabled = !enabled;
                                availableTools.value = [...availableTools.value];
                            }
                            console.error('[Vue App] Failed to update tool status:', error);
                        }
                    };
                    const selectAllTools = async () => {
                        try {
                            // 直接更新本地状态，然后保存
                            availableTools.value.forEach(tool => tool.enabled = true);
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to select all tools:', error);
                        }
                    };
                    const deselectAllTools = async () => {
                        try {
                            // 直接更新本地状态，然后保存
                            availableTools.value.forEach(tool => tool.enabled = false);
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to deselect all tools:', error);
                        }
                    };
                    const saveChanges = async () => {
                        try {
                            // 创建普通对象，避免Vue3响应式对象克隆错误
                            const updates = availableTools.value.map(tool => ({
                                category: String(tool.category),
                                name: String(tool.name),
                                enabled: Boolean(tool.enabled)
                            }));
                            console.log('[Vue App] Sending updates:', updates.length, 'tools');
                            const result = await Editor.Message.request('cocos-mcp-server', 'updateToolStatusBatch', updates);
                            if (result && result.success) {
                                console.log('[Vue App] Tool changes saved successfully');
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to save tool changes:', error);
                        }
                    };
                    const toggleCategoryTools = async (category, enabled) => {
                        try {
                            // 直接更新本地状态，然后保存
                            availableTools.value.forEach(tool => {
                                if (tool.category === category) {
                                    tool.enabled = enabled;
                                }
                            });
                            await saveChanges();
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to toggle category tools:', error);
                        }
                    };
                    const getToolsByCategory = (category) => {
                        return availableTools.value.filter(tool => tool.category === category);
                    };
                    const getCategoryDisplayName = (category) => {
                        const categoryNames = {
                            'scene': '场景工具',
                            'node': '节点工具',
                            'component': '组件工具',
                            'prefab': '预制体工具',
                            'project': '项目工具',
                            'debug': '调试工具',
                            'preferences': '偏好设置工具',
                            'server': '服务器工具',
                            'broadcast': '广播工具',
                            'sceneAdvanced': '高级场景工具',
                            'sceneView': '场景视图工具',
                            'referenceImage': '参考图片工具',
                            'assetAdvanced': '高级资源工具',
                            'validation': '验证工具'
                        };
                        return categoryNames[category] || category;
                    };
                    // 监听设置变化
                    (0, vue_1.watch)(settings, (newSettings, oldSettings) => {
                        console.log('[Vue App] Settings changed:', newSettings);
                        settingsChanged.value = true;
                    }, { deep: true });
                    // 上次的服务器状态，用于避免重复日志
                    let lastServerState = { running: false, clients: 0 };
                    let settingsLoaded = false;
                    // 更新服务器状态的函数（仅用于初始加载）
                    const loadInitialServerStatus = async () => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                            if (result) {
                                serverRunning.value = result.running || false;
                                serverStatus.value = result.running ? '运行中' : '已停止';
                                connectedClients.value = result.clients || 0;
                                httpUrl.value = result.running ? `http://127.0.0.1:${result.port}/mcp` : '';
                                isProcessing.value = false;
                                // 只在首次加载时从服务器加载设置
                                if (result.settings && !settingsLoaded) {
                                    console.log('[Vue App] Raw settings from server:', result.settings);
                                    settings.value = {
                                        port: result.settings.port || 3000,
                                        autoStart: result.settings.autoStart || false,
                                        debugLog: result.settings.enableDebugLog || false,
                                        maxConnections: result.settings.maxConnections || 10
                                    };
                                    console.log('[Vue App] Settings loaded from server:', settings.value);
                                    console.log('[Vue App] Settings loaded from Streamable HTTP server');
                                    settingsLoaded = true;
                                }
                                lastServerState = { running: result.running || false, clients: result.clients || 0 };
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to get server status:', error);
                            serverRunning.value = false;
                            serverStatus.value = '连接失败';
                        }
                    };
                    // 定期更新服务器状态的函数（只更新状态，不更新设置）
                    const updateServerStatusOnly = async () => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'get-server-status');
                            if (result) {
                                const currentRunning = result.running || false;
                                const currentClients = result.clients || 0;
                                // 只在状态真正变化时输出日志
                                if (currentRunning !== lastServerState.running ||
                                    currentClients !== lastServerState.clients) {
                                    console.log('[Vue App] Server status changed:', {
                                        running: currentRunning,
                                        port: result.port,
                                        clients: currentClients,
                                        // Streamable HTTP transport
                                    });
                                }
                                serverRunning.value = currentRunning;
                                serverStatus.value = currentRunning ? '运行中' : '已停止';
                                connectedClients.value = currentClients;
                                httpUrl.value = currentRunning ? `http://127.0.0.1:${result.port}/mcp` : '';
                                isProcessing.value = false;
                                lastServerState = { running: currentRunning, clients: currentClients };
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to get server status:', error);
                            serverRunning.value = false;
                            serverStatus.value = '连接失败';
                        }
                    };
                    // ========== 一键配置相关方法 ==========
                    const addLog = (message, type = 'info') => {
                        const now = new Date();
                        const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
                        configLogs.value.unshift({ time, message, type });
                        // 只保留最近50条日志
                        if (configLogs.value.length > 50) {
                            configLogs.value = configLogs.value.slice(0, 50);
                        }
                    };
                    const loadConfigStatus = async () => {
                        try {
                            console.log('[Vue App] Loading config status for:', configServerName.value);
                            const result = await Editor.Message.request('cocos-mcp-server', 'get-config-status', configServerName.value);
                            console.log('[Vue App] Config status result:', result);
                            if (result && result.success) {
                                // 分离自动配置和手动配置的客户端
                                ideClients.value = result.clients.filter((c) => c.isAutoConfig);
                                cliClients.value = result.clients.filter((c) => !c.isAutoConfig);
                                refreshCLICommands();
                            }
                            else {
                                console.warn('[Vue App] Config status request failed or returned no data');
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to load config status:', error);
                            addLog(`加载配置状态失败: ${error}`, 'error');
                        }
                    };
                    const refreshCLICommands = async () => {
                        try {
                            const serverConfig = {
                                serverName: configServerName.value,
                                serverUrl: configServerUrl.value,
                                scope: cliScope.value
                            };
                            console.log('[Vue App] Refreshing CLI commands with scope:', cliScope.value);
                            const result = await Editor.Message.request('cocos-mcp-server', 'generate-cli-commands', serverConfig);
                            if (result && result.success) {
                                console.log('[Vue App] CLI commands updated:', result.commands);
                                cliCommands.value = result.commands;
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to generate CLI commands:', error);
                            addLog(`生成CLI命令失败: ${error}`, 'error');
                        }
                    };
                    const addToClient = async (clientId) => {
                        try {
                            const serverConfig = {
                                serverName: configServerName.value,
                                serverUrl: configServerUrl.value
                            };
                            const result = await Editor.Message.request('cocos-mcp-server', 'add-to-client', clientId, serverConfig);
                            if (result && result.success) {
                                addLog(result.message, 'success');
                                await loadConfigStatus();
                            }
                            else {
                                addLog(result.message, 'error');
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to add to client:', error);
                            addLog(`添加到${clientId}失败: ${error}`, 'error');
                        }
                    };
                    const removeFromClient = async (clientId) => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'remove-from-client', clientId, configServerName.value);
                            if (result && result.success) {
                                addLog(result.message, 'success');
                                await loadConfigStatus();
                            }
                            else {
                                addLog(result.message, 'error');
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to remove from client:', error);
                            addLog(`从${clientId}删除失败: ${error}`, 'error');
                        }
                    };
                    const addToAllIDE = async () => {
                        try {
                            const serverConfig = {
                                serverName: configServerName.value,
                                serverUrl: configServerUrl.value
                            };
                            const result = await Editor.Message.request('cocos-mcp-server', 'add-to-all-clients', serverConfig);
                            if (result && result.success) {
                                for (const [clientType, msg] of Object.entries(result.results)) {
                                    addLog(`${clientType}: ${msg}`, 'info');
                                }
                                await loadConfigStatus();
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to add to all IDE:', error);
                            addLog(`批量添加失败: ${error}`, 'error');
                        }
                    };
                    const removeFromAllIDE = async () => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'remove-from-all-clients', configServerName.value);
                            if (result && result.success) {
                                for (const [clientType, msg] of Object.entries(result.results)) {
                                    addLog(`${clientType}: ${msg}`, 'info');
                                }
                                await loadConfigStatus();
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to remove from all IDE:', error);
                            addLog(`批量删除失败: ${error}`, 'error');
                        }
                    };
                    const copyClientConfig = async (clientType) => {
                        try {
                            const serverConfig = {
                                serverName: configServerName.value,
                                serverUrl: configServerUrl.value
                            };
                            const result = await Editor.Message.request('cocos-mcp-server', 'generate-client-config', clientType, serverConfig);
                            if (result && result.success) {
                                await navigator.clipboard.writeText(result.content);
                                addLog(`已复制${clientType}配置到剪贴板`, 'success');
                            }
                            else {
                                addLog(result.message || '生成配置失败', 'error');
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to copy config:', error);
                            addLog(`复制配置失败: ${error}`, 'error');
                        }
                    };
                    const copyCLICommand = async (cli) => {
                        try {
                            await navigator.clipboard.writeText(cliCommands.value[cli]);
                            addLog(`已复制${cli}命令到剪贴板`, 'success');
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to copy command:', error);
                            addLog(`复制命令失败: ${error}`, 'error');
                        }
                    };
                    const openConfigFile = async (configPath) => {
                        try {
                            const result = await Editor.Message.request('cocos-mcp-server', 'open-config-file', configPath);
                            if (result && result.success) {
                                addLog(`已打开配置文件: ${configPath}`, 'success');
                            }
                            else {
                                addLog(result.message || '打开配置文件失败', 'error');
                            }
                        }
                        catch (error) {
                            console.error('[Vue App] Failed to open config file:', error);
                            addLog(`打开配置文件失败: ${error}`, 'error');
                        }
                    };
                    // 监听cliScope变化，自动刷新CLI命令
                    (0, vue_1.watch)(cliScope, (newVal) => {
                        console.log('[Vue App] cliScope changed to:', newVal);
                        refreshCLICommands();
                    });
                    // 组件挂载时加载数据
                    (0, vue_1.onMounted)(async () => {
                        // 加载工具管理器状态
                        await loadToolManagerState();
                        // 初始加载服务器状态和设置
                        await loadInitialServerStatus();
                        // 加载一键配置状态
                        await loadConfigStatus();
                        // 定期更新服务器状态（每3秒，只更新状态不更新设置）
                        setInterval(async () => {
                            await updateServerStatusOnly();
                        }, 3000);
                    });
                    return {
                        // 数据
                        activeTab,
                        serverRunning,
                        serverStatus,
                        connectedClients,
                        httpUrl,
                        isProcessing,
                        settings,
                        availableTools,
                        toolCategories,
                        settingsChanged,
                        // 一键配置数据
                        configServerName,
                        configTimeout,
                        configServerUrl,
                        cliScope,
                        ideClients,
                        cliClients,
                        cliCommands,
                        configLogs,
                        // 计算属性
                        statusClass,
                        totalTools,
                        enabledTools,
                        disabledTools,
                        // 方法
                        switchTab,
                        toggleServer,
                        saveSettings,
                        copyUrl,
                        loadToolManagerState,
                        updateToolStatus,
                        selectAllTools,
                        deselectAllTools,
                        saveChanges,
                        toggleCategoryTools,
                        getToolsByCategory,
                        getCategoryDisplayName,
                        // 一键配置方法
                        loadConfigStatus,
                        refreshCLICommands,
                        addToClient,
                        removeFromClient,
                        addToAllIDE,
                        removeFromAllIDE,
                        copyClientConfig,
                        copyCLICommand,
                        openConfigFile
                    };
                },
                template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/vue/mcp-server-app.html'), 'utf-8'),
            }));
            app.mount(this.$.app);
            panelDataMap.set(this, app);
            console.log('[MCP Panel] Vue3 app mounted successfully');
        }
    },
    beforeClose() { },
    close() {
        const app = panelDataMap.get(this);
        if (app) {
            app.unmount();
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLCtDQUErQzs7QUFFL0MsdUNBQXdDO0FBQ3hDLCtCQUE0QjtBQUM1Qiw2QkFBaUc7QUFFakcsTUFBTSxZQUFZLEdBQUcsSUFBSSxPQUFPLEVBQVksQ0FBQztBQTRCN0MsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNqQyxTQUFTLEVBQUU7UUFDUCxJQUFJO1lBQ0EsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCxJQUFJO1lBQ0EsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzVDLENBQUM7S0FDSjtJQUNELFFBQVEsRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLDZDQUE2QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQy9GLEtBQUssRUFBRSxJQUFBLHVCQUFZLEVBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLHlDQUF5QyxDQUFDLEVBQUUsT0FBTyxDQUFDO0lBQ3hGLENBQUMsRUFBRTtRQUNDLEdBQUcsRUFBRSxNQUFNO1FBQ1gsVUFBVSxFQUFFLGFBQWE7S0FDNUI7SUFDRCxLQUFLO1FBQ0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2IsTUFBTSxHQUFHLEdBQUcsSUFBQSxlQUFTLEVBQUMsRUFBRSxDQUFDLENBQUM7WUFDMUIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsZUFBZSxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTVFLFVBQVU7WUFDVixHQUFHLENBQUMsU0FBUyxDQUFDLGNB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QUFTO3dCQUNULGdCQUFnQjt3QkFDaEIsa0JBQWtCO3dCQUNsQixXQUFXO3dCQUNYLGdCQUFnQjt3QkFDaEIsV0FBVzt3QkFDWCxnQkFBZ0I7d0JBQ2hCLGdCQUFnQjt3QkFDaEIsY0FBYzt3QkFDZCxjQUFjO3FCQUNqQixDQUFDO2dCQUNOLENBQUM7Z0JBQ0QsUUFBUSxFQUFFLElBQUEsdUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFTLEVBQUUsa0RBQWtELENBQUMsRUFBRSxPQUFPLENBQUM7YUFDdkcsQ0FBQyxDQUFDLENBQUM7WUFFSixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEIsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFFNUIsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBQzdELENBQUM7SUFDTCxDQUFDO0lBQ0QsV0FBVyxLQUFLLENBQUM7SUFDakIsS0FBSztRQUNELE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNOLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHZ1ZS9vbmUtY29tcG9uZW50LXBlci1maWxlICovXG5cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGNyZWF0ZUFwcCwgQXBwLCBkZWZpbmVDb21wb25lbnQsIHJlZiwgY29tcHV0ZWQsIG9uTW91bnRlZCwgd2F0Y2gsIG5leHRUaWNrIH0gZnJvbSAndnVlJztcblxuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XG5cbi8vIOWumuS5ieW3peWFt+mFjee9ruaOpeWPo1xuaW50ZXJmYWNlIFRvb2xDb25maWcge1xuICAgIGNhdGVnb3J5OiBzdHJpbmc7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIGVuYWJsZWQ6IGJvb2xlYW47XG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcbn1cblxuLy8g5a6a5LmJ6YWN572u5o6l5Y+jXG5pbnRlcmZhY2UgQ29uZmlndXJhdGlvbiB7XG4gICAgaWQ6IHN0cmluZztcbiAgICBuYW1lOiBzdHJpbmc7XG4gICAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgICB0b29sczogVG9vbENvbmZpZ1tdO1xuICAgIGNyZWF0ZWRBdDogc3RyaW5nO1xuICAgIHVwZGF0ZWRBdDogc3RyaW5nO1xufVxuXG4vLyDlrprkuYnmnI3liqHlmajorr7nva7mjqXlj6NcbmludGVyZmFjZSBTZXJ2ZXJTZXR0aW5ncyB7XG4gICAgcG9ydDogbnVtYmVyO1xuICAgIGF1dG9TdGFydDogYm9vbGVhbjtcbiAgICBkZWJ1Z0xvZzogYm9vbGVhbjtcbiAgICBtYXhDb25uZWN0aW9uczogbnVtYmVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xuICAgIGxpc3RlbmVyczoge1xuICAgICAgICBzaG93KCkgeyBcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQIFBhbmVsXSBQYW5lbCBzaG93bicpOyBcbiAgICAgICAgfSxcbiAgICAgICAgaGlkZSgpIHsgXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUCBQYW5lbF0gUGFuZWwgaGlkZGVuJyk7IFxuICAgICAgICB9LFxuICAgIH0sXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXG4gICAgc3R5bGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9zdHlsZS9kZWZhdWx0L2luZGV4LmNzcycpLCAndXRmLTgnKSxcbiAgICAkOiB7XG4gICAgICAgIGFwcDogJyNhcHAnLFxuICAgICAgICBwYW5lbFRpdGxlOiAnI3BhbmVsVGl0bGUnLFxuICAgIH0sXG4gICAgcmVhZHkoKSB7XG4gICAgICAgIGlmICh0aGlzLiQuYXBwKSB7XG4gICAgICAgICAgICBjb25zdCBhcHAgPSBjcmVhdGVBcHAoe30pO1xuICAgICAgICAgICAgYXBwLmNvbmZpZy5jb21waWxlck9wdGlvbnMuaXNDdXN0b21FbGVtZW50ID0gKHRhZykgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyDliJvlu7rkuLvlupTnlKjnu4Tku7ZcbiAgICAgICAgICAgIGFwcC5jb21wb25lbnQoJ01jcFNlcnZlckFwcCcsIGRlZmluZUNvbXBvbmVudCh7XG4gICAgICAgICAgICAgICAgc2V0dXAoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIOWTjeW6lOW8j+aVsOaNrlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3RpdmVUYWIgPSByZWYoJ3NlcnZlcicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJSdW5uaW5nID0gcmVmKGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VydmVyU3RhdHVzID0gcmVmKCflt7LlgZzmraInKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29ubmVjdGVkQ2xpZW50cyA9IHJlZigwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaHR0cFVybCA9IHJlZignJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzUHJvY2Vzc2luZyA9IHJlZihmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHJlZjxTZXJ2ZXJTZXR0aW5ncz4oe1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogMzAwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWJ1Z0xvZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhDb25uZWN0aW9uczogMTBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdmFpbGFibGVUb29scyA9IHJlZjxUb29sQ29uZmlnW10+KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbENhdGVnb3JpZXMgPSByZWY8c3RyaW5nW10+KFtdKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyDkuIDplK7phY3nva7nm7jlhbPmlbDmja5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmlnU2VydmVyTmFtZSA9IHJlZignY29jb3MtY3JlYXRvcicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maWdUaW1lb3V0ID0gcmVmKDMwMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpU2NvcGUgPSByZWYoJ3VzZXInKTsgLy8gQ0xJ6YWN572u6IyD5Zu0OiB1c2VyIOaIliBwcm9qZWN0XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlkZUNsaWVudHMgPSByZWY8YW55W10+KFtdKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xpQ2xpZW50cyA9IHJlZjxhbnlbXT4oW10pO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjbGlDb21tYW5kcyA9IHJlZih7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGF1ZGU6ICcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2VtaW5pOiAnJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmlnTG9ncyA9IHJlZjxBcnJheTx7IHRpbWU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nOyB0eXBlOiBzdHJpbmcgfT4+KFtdKTtcblxuXG4gICAgICAgICAgICAgICAgICAgIC8vIOiuoeeul+WxnuaAp1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IGNvbXB1dGVkKCgpID0+ICh7XG4gICAgICAgICAgICAgICAgICAgICAgICAnc3RhdHVzLXJ1bm5pbmcnOiBzZXJ2ZXJSdW5uaW5nLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3N0YXR1cy1zdG9wcGVkJzogIXNlcnZlclJ1bm5pbmcudmFsdWVcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG90YWxUb29scyA9IGNvbXB1dGVkKCgpID0+IGF2YWlsYWJsZVRvb2xzLnZhbHVlLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IGNvbXB1dGVkKCgpID0+IGF2YWlsYWJsZVRvb2xzLnZhbHVlLmZpbHRlcih0ID0+IHQuZW5hYmxlZCkubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGlzYWJsZWRUb29scyA9IGNvbXB1dGVkKCgpID0+IHRvdGFsVG9vbHMudmFsdWUgLSBlbmFibGVkVG9vbHMudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBcblxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3NDaGFuZ2VkID0gcmVmKGZhbHNlKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyDorqHnrpfphY3nva7mnI3liqHlmahVUkxcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmlnU2VydmVyVXJsID0gY29tcHV0ZWQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGBodHRwOi8vMTI3LjAuMC4xOiR7c2V0dGluZ3MudmFsdWUucG9ydH0vbWNwYDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8g5pa55rOVXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN3aXRjaFRhYiA9ICh0YWJOYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVRhYi52YWx1ZSA9IHRhYk5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGFiTmFtZSA9PT0gJ3Rvb2xzJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRUb29sTWFuYWdlclN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRhYk5hbWUgPT09ICdjb25maWcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9hZENvbmZpZ1N0YXR1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9nZ2xlU2VydmVyID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc1Byb2Nlc3NpbmcudmFsdWUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzZXJ2ZXJSdW5uaW5nLnZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU3RvcHBpbmcgc2VydmVyLi4uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnc3RvcC1zZXJ2ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFN0YXJ0aW5nIHNlcnZlciB3aXRoIHNldHRpbmdzOicsIHNldHRpbmdzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5ZCv5Yqo5pyN5Yqh5Zmo5pe25L2/55So5b2T5YmN6Z2i5p2/6K6+572uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHNldHRpbmdzLnZhbHVlLnBvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHNldHRpbmdzLnZhbHVlLmF1dG9TdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZURlYnVnTG9nOiBzZXR0aW5ncy52YWx1ZS5kZWJ1Z0xvZyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heENvbm5lY3Rpb25zOiBzZXR0aW5ncy52YWx1ZS5tYXhDb25uZWN0aW9uc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFVwZGF0aW5nIHNldHRpbmdzIGJlZm9yZSBzdGFydDonLCBjdXJyZW50U2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVSZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3VwZGF0ZS1zZXR0aW5ncycsIGN1cnJlbnRTZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gVXBkYXRlIHNldHRpbmdzIHJlc3VsdDonLCB1cGRhdGVSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3N0YXJ0LXNlcnZlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnrYnlvoXkuIDkuIvlho3mm7TmlrDnirbmgIFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBkYXRlU2VydmVyU3RhdHVzT25seSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTZXJ2ZXIgdG9nZ2xlIGNvbXBsZXRlZCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIHRvZ2dsZSBzZXJ2ZXI6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzUHJvY2Vzc2luZy52YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2F2ZVNldHRpbmdzID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rkuIDkuKrnroDljZXnmoTlr7nosaHvvIzpgb/lhY3lhYvpmobplJnor69cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5nc0RhdGEgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHNldHRpbmdzLnZhbHVlLnBvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogc2V0dGluZ3MudmFsdWUuYXV0b1N0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVEZWJ1Z0xvZzogc2V0dGluZ3MudmFsdWUuZGVidWdMb2csXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4Q29ubmVjdGlvbnM6IHNldHRpbmdzLnZhbHVlLm1heENvbm5lY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIEN1cnJlbnQgcGFuZWwgc2V0dGluZ3MudmFsdWU6Jywgc2V0dGluZ3MudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU2V0dGluZ3MgZGF0YSBwcmVwYXJlZCBmb3Igc2F2ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU2F2aW5nIHNldHRpbmdzIGRhdGE6Jywgc2V0dGluZ3NEYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFNhdmluZyBTdHJlYW1hYmxlIEhUVFAgc2V0dGluZ3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ3VwZGF0ZS1zZXR0aW5ncycsIHNldHRpbmdzRGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTYXZlIHNldHRpbmdzIHJlc3VsdDonLCByZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ2hhbmdlZC52YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS/neWtmOWQjuetieW+heS4gOS4i+WGjeajgOafpeiuvue9ruaYr+WQpuato+ehruS/neWtmFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gU2V0dGluZ3MgYWZ0ZXIgc2F2ZTonLCBzdGF0dXMuc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gc2F2ZSBzZXR0aW5nczonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3B5VXJsID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dChodHRwVXJsLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFVSTCBjb3BpZWQgdG8gY2xpcGJvYXJkJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gY29weSBVUkw6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9hZFRvb2xNYW5hZ2VyU3RhdGUgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnZ2V0VG9vbE1hbmFnZXJTdGF0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5oC75piv5Yqg6L295ZCO56uv54q25oCB77yM56Gu5L+d5pWw5o2u5piv5pyA5paw55qEXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlID0gcmVzdWx0LmF2YWlsYWJsZVRvb2xzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIExvYWRlZCB0b29sczonLCBhdmFpbGFibGVUb29scy52YWx1ZS5sZW5ndGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw5bel5YW35YiG57G7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBuZXcgU2V0KGF2YWlsYWJsZVRvb2xzLnZhbHVlLm1hcCh0b29sID0+IHRvb2wuY2F0ZWdvcnkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9vbENhdGVnb3JpZXMudmFsdWUgPSBBcnJheS5mcm9tKGNhdGVnb3JpZXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBsb2FkIHRvb2wgbWFuYWdlciBzdGF0ZTonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVUb29sU3RhdHVzID0gYXN5bmMgKGNhdGVnb3J5OiBzdHJpbmcsIG5hbWU6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIHVwZGF0ZVRvb2xTdGF0dXMgY2FsbGVkOicsIGNhdGVnb3J5LCBuYW1lLCBlbmFibGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlhYjmm7TmlrDmnKzlnLDnirbmgIFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0b29sSW5kZXggPSBhdmFpbGFibGVUb29scy52YWx1ZS5maW5kSW5kZXgodCA9PiB0LmNhdGVnb3J5ID09PSBjYXRlZ29yeSAmJiB0Lm5hbWUgPT09IG5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b29sSW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlW3Rvb2xJbmRleF0uZW5hYmxlZCA9IGVuYWJsZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOW8uuWItuinpuWPkeWTjeW6lOW8j+abtOaWsFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZSA9IFsuLi5hdmFpbGFibGVUb29scy52YWx1ZV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gTG9jYWwgc3RhdGUgdXBkYXRlZCwgdG9vbCBlbmFibGVkOicsIGF2YWlsYWJsZVRvb2xzLnZhbHVlW3Rvb2xJbmRleF0uZW5hYmxlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiwg+eUqOWQjuerr+abtOaWsFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAndXBkYXRlVG9vbFN0YXR1cycsIGNhdGVnb3J5LCBuYW1lLCBlbmFibGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5ZCO56uv5pu05paw5aSx6LSl77yM5Zue5rua5pys5Zyw54q25oCBXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0b29sSW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZVt0b29sSW5kZXhdLmVuYWJsZWQgPSAhZW5hYmxlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF2YWlsYWJsZVRvb2xzLnZhbHVlID0gWy4uLmF2YWlsYWJsZVRvb2xzLnZhbHVlXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gQmFja2VuZCB1cGRhdGUgZmFpbGVkLCByb2xsZWQgYmFjayBsb2NhbCBzdGF0ZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gQmFja2VuZCB1cGRhdGUgc3VjY2Vzc2Z1bCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5Y+R55Sf6ZSZ6K+v77yM5Zue5rua5pys5Zyw54q25oCBXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbEluZGV4ID0gYXZhaWxhYmxlVG9vbHMudmFsdWUuZmluZEluZGV4KHQgPT4gdC5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkgJiYgdC5uYW1lID09PSBuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodG9vbEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZVt0b29sSW5kZXhdLmVuYWJsZWQgPSAhZW5hYmxlZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMudmFsdWUgPSBbLi4uYXZhaWxhYmxlVG9vbHMudmFsdWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIHVwZGF0ZSB0b29sIHN0YXR1czonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RBbGxUb29scyA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g55u05o6l5pu05paw5pys5Zyw54q25oCB77yM54S25ZCO5L+d5a2YXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMudmFsdWUuZm9yRWFjaCh0b29sID0+IHRvb2wuZW5hYmxlZCA9IHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHNhdmVDaGFuZ2VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gc2VsZWN0IGFsbCB0b29sczonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXNlbGVjdEFsbFRvb2xzID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnm7TmjqXmm7TmlrDmnKzlnLDnirbmgIHvvIznhLblkI7kv53lrZhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVUb29scy52YWx1ZS5mb3JFYWNoKHRvb2wgPT4gdG9vbC5lbmFibGVkID0gZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHNhdmVDaGFuZ2VzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gZGVzZWxlY3QgYWxsIHRvb2xzOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2F2ZUNoYW5nZXMgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIm+W7uuaZrumAmuWvueixoe+8jOmBv+WFjVZ1ZTPlk43lupTlvI/lr7nosaHlhYvpmobplJnor69cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVzID0gYXZhaWxhYmxlVG9vbHMudmFsdWUubWFwKHRvb2wgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IFN0cmluZyh0b29sLmNhdGVnb3J5KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogU3RyaW5nKHRvb2wubmFtZSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IEJvb2xlYW4odG9vbC5lbmFibGVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFNlbmRpbmcgdXBkYXRlczonLCB1cGRhdGVzLmxlbmd0aCwgJ3Rvb2xzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICd1cGRhdGVUb29sU3RhdHVzQmF0Y2gnLCB1cGRhdGVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gVG9vbCBjaGFuZ2VzIHNhdmVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBzYXZlIHRvb2wgY2hhbmdlczonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b2dnbGVDYXRlZ29yeVRvb2xzID0gYXN5bmMgKGNhdGVnb3J5OiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g55u05o6l5pu05paw5pys5Zyw54q25oCB77yM54S25ZCO5L+d5a2YXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMudmFsdWUuZm9yRWFjaCh0b29sID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRvb2wuY2F0ZWdvcnkgPT09IGNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sLmVuYWJsZWQgPSBlbmFibGVkO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2F2ZUNoYW5nZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byB0b2dnbGUgY2F0ZWdvcnkgdG9vbHM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2V0VG9vbHNCeUNhdGVnb3J5ID0gKGNhdGVnb3J5OiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhdmFpbGFibGVUb29scy52YWx1ZS5maWx0ZXIodG9vbCA9PiB0b29sLmNhdGVnb3J5ID09PSBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBjb25zdCBnZXRDYXRlZ29yeURpc3BsYXlOYW1lID0gKGNhdGVnb3J5OiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlOYW1lczogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2NlbmUnOiAn5Zy65pmv5bel5YW3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnbm9kZSc6ICfoioLngrnlt6XlhbcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdjb21wb25lbnQnOiAn57uE5Lu25bel5YW3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHJlZmFiJzogJ+mihOWItuS9k+W3peWFtycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3Byb2plY3QnOiAn6aG555uu5bel5YW3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZGVidWcnOiAn6LCD6K+V5bel5YW3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAncHJlZmVyZW5jZXMnOiAn5YGP5aW96K6+572u5bel5YW3JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnc2VydmVyJzogJ+acjeWKoeWZqOW3peWFtycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2Jyb2FkY2FzdCc6ICflub/mkq3lt6XlhbcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdzY2VuZUFkdmFuY2VkJzogJ+mrmOe6p+WcuuaZr+W3peWFtycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3NjZW5lVmlldyc6ICflnLrmma/op4blm77lt6XlhbcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdyZWZlcmVuY2VJbWFnZSc6ICflj4LogIPlm77niYflt6XlhbcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldEFkdmFuY2VkJzogJ+mrmOe6p+i1hOa6kOW3peWFtycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3ZhbGlkYXRpb24nOiAn6aqM6K+B5bel5YW3J1xuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYXRlZ29yeU5hbWVzW2NhdGVnb3J5XSB8fCBjYXRlZ29yeTtcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOebkeWQrOiuvue9ruWPmOWMllxuICAgICAgICAgICAgICAgICAgICB3YXRjaChzZXR0aW5ncywgKG5ld1NldHRpbmdzLCBvbGRTZXR0aW5ncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTZXR0aW5ncyBjaGFuZ2VkOicsIG5ld1NldHRpbmdzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ2hhbmdlZC52YWx1ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIH0sIHsgZGVlcDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOS4iuasoeeahOacjeWKoeWZqOeKtuaAge+8jOeUqOS6jumBv+WFjemHjeWkjeaXpeW/l1xuICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdFNlcnZlclN0YXRlID0geyBydW5uaW5nOiBmYWxzZSwgY2xpZW50czogMCB9O1xuICAgICAgICAgICAgICAgICAgICBsZXQgc2V0dGluZ3NMb2FkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsOacjeWKoeWZqOeKtuaAgeeahOWHveaVsO+8iOS7heeUqOS6juWIneWni+WKoOi9ve+8iVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2FkSW5pdGlhbFNlcnZlclN0YXR1cyA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnY29jb3MtbWNwLXNlcnZlcicsICdnZXQtc2VydmVyLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVyUnVubmluZy52YWx1ZSA9IHJlc3VsdC5ydW5uaW5nIHx8IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJTdGF0dXMudmFsdWUgPSByZXN1bHQucnVubmluZyA/ICfov5DooYzkuK0nIDogJ+W3suWBnOatoic7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbm5lY3RlZENsaWVudHMudmFsdWUgPSByZXN1bHQuY2xpZW50cyB8fCAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBodHRwVXJsLnZhbHVlID0gcmVzdWx0LnJ1bm5pbmcgPyBgaHR0cDovLzEyNy4wLjAuMToke3Jlc3VsdC5wb3J0fS9tY3BgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzUHJvY2Vzc2luZy52YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Y+q5Zyo6aaW5qyh5Yqg6L295pe25LuO5pyN5Yqh5Zmo5Yqg6L296K6+572uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQuc2V0dGluZ3MgJiYgIXNldHRpbmdzTG9hZGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFJhdyBzZXR0aW5ncyBmcm9tIHNlcnZlcjonLCByZXN1bHQuc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3MudmFsdWUgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogcmVzdWx0LnNldHRpbmdzLnBvcnQgfHwgMzAwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHJlc3VsdC5zZXR0aW5ncy5hdXRvU3RhcnQgfHwgZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVidWdMb2c6IHJlc3VsdC5zZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZyB8fCBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhDb25uZWN0aW9uczogcmVzdWx0LnNldHRpbmdzLm1heENvbm5lY3Rpb25zIHx8IDEwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTZXR0aW5ncyBsb2FkZWQgZnJvbSBzZXJ2ZXI6Jywgc2V0dGluZ3MudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTZXR0aW5ncyBsb2FkZWQgZnJvbSBTdHJlYW1hYmxlIEhUVFAgc2VydmVyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXR0aW5nc0xvYWRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RTZXJ2ZXJTdGF0ZSA9IHsgcnVubmluZzogcmVzdWx0LnJ1bm5pbmcgfHwgZmFsc2UsIGNsaWVudHM6IHJlc3VsdC5jbGllbnRzIHx8IDAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gZ2V0IHNlcnZlciBzdGF0dXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclJ1bm5pbmcudmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJTdGF0dXMudmFsdWUgPSAn6L+e5o6l5aSx6LSlJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIOWumuacn+abtOaWsOacjeWKoeWZqOeKtuaAgeeahOWHveaVsO+8iOWPquabtOaWsOeKtuaAge+8jOS4jeabtOaWsOiuvue9ru+8iVxuICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGRhdGVTZXJ2ZXJTdGF0dXNPbmx5ID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50UnVubmluZyA9IHJlc3VsdC5ydW5uaW5nIHx8IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Q2xpZW50cyA9IHJlc3VsdC5jbGllbnRzIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlj6rlnKjnirbmgIHnnJ/mraPlj5jljJbml7bovpPlh7rml6Xlv5dcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRSdW5uaW5nICE9PSBsYXN0U2VydmVyU3RhdGUucnVubmluZyB8fCBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRDbGllbnRzICE9PSBsYXN0U2VydmVyU3RhdGUuY2xpZW50cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBTZXJ2ZXIgc3RhdHVzIGNoYW5nZWQ6Jywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1bm5pbmc6IGN1cnJlbnRSdW5uaW5nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHJlc3VsdC5wb3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHM6IGN1cnJlbnRDbGllbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFN0cmVhbWFibGUgSFRUUCB0cmFuc3BvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJSdW5uaW5nLnZhbHVlID0gY3VycmVudFJ1bm5pbmc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclN0YXR1cy52YWx1ZSA9IGN1cnJlbnRSdW5uaW5nID8gJ+i/kOihjOS4rScgOiAn5bey5YGc5q2iJztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkQ2xpZW50cy52YWx1ZSA9IGN1cnJlbnRDbGllbnRzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBodHRwVXJsLnZhbHVlID0gY3VycmVudFJ1bm5pbmcgPyBgaHR0cDovLzEyNy4wLjAuMToke3Jlc3VsdC5wb3J0fS9tY3BgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzUHJvY2Vzc2luZy52YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdFNlcnZlclN0YXRlID0geyBydW5uaW5nOiBjdXJyZW50UnVubmluZywgY2xpZW50czogY3VycmVudENsaWVudHMgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gZ2V0IHNlcnZlciBzdGF0dXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclJ1bm5pbmcudmFsdWUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJTdGF0dXMudmFsdWUgPSAn6L+e5o6l5aSx6LSlJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAvLyA9PT09PT09PT09IOS4gOmUrumFjee9ruebuOWFs+aWueazlSA9PT09PT09PT09XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZExvZyA9IChtZXNzYWdlOiBzdHJpbmcsIHR5cGU6IHN0cmluZyA9ICdpbmZvJykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWUgPSBgJHtub3cuZ2V0SG91cnMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyl9OiR7bm93LmdldE1pbnV0ZXMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyl9OiR7bm93LmdldFNlY29uZHMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJyl9YDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ0xvZ3MudmFsdWUudW5zaGlmdCh7IHRpbWUsIG1lc3NhZ2UsIHR5cGUgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDlj6rkv53nlZnmnIDov5E1MOadoeaXpeW/l1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbmZpZ0xvZ3MudmFsdWUubGVuZ3RoID4gNTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWdMb2dzLnZhbHVlID0gY29uZmlnTG9ncy52YWx1ZS5zbGljZSgwLCA1MCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9hZENvbmZpZ1N0YXR1cyA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tWdWUgQXBwXSBMb2FkaW5nIGNvbmZpZyBzdGF0dXMgZm9yOicsIGNvbmZpZ1NlcnZlck5hbWUudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnZ2V0LWNvbmZpZy1zdGF0dXMnLCBjb25maWdTZXJ2ZXJOYW1lLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIENvbmZpZyBzdGF0dXMgcmVzdWx0OicsIHJlc3VsdCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIhuemu+iHquWKqOmFjee9ruWSjOaJi+WKqOmFjee9rueahOWuouaIt+err1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZGVDbGllbnRzLnZhbHVlID0gcmVzdWx0LmNsaWVudHMuZmlsdGVyKChjOiBhbnkpID0+IGMuaXNBdXRvQ29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpQ2xpZW50cy52YWx1ZSA9IHJlc3VsdC5jbGllbnRzLmZpbHRlcigoYzogYW55KSA9PiAhYy5pc0F1dG9Db25maWcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlZnJlc2hDTElDb21tYW5kcygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignW1Z1ZSBBcHBdIENvbmZpZyBzdGF0dXMgcmVxdWVzdCBmYWlsZWQgb3IgcmV0dXJuZWQgbm8gZGF0YScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byBsb2FkIGNvbmZpZyBzdGF0dXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZExvZyhg5Yqg6L296YWN572u54q25oCB5aSx6LSlOiAke2Vycm9yfWAsICdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlZnJlc2hDTElDb21tYW5kcyA9IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VydmVyQ29uZmlnID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJOYW1lOiBjb25maWdTZXJ2ZXJOYW1lLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJVcmw6IGNvbmZpZ1NlcnZlclVybC52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGU6IGNsaVNjb3BlLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIFJlZnJlc2hpbmcgQ0xJIGNvbW1hbmRzIHdpdGggc2NvcGU6JywgY2xpU2NvcGUudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnZ2VuZXJhdGUtY2xpLWNvbW1hbmRzJywgc2VydmVyQ29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbVnVlIEFwcF0gQ0xJIGNvbW1hbmRzIHVwZGF0ZWQ6JywgcmVzdWx0LmNvbW1hbmRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpQ29tbWFuZHMudmFsdWUgPSByZXN1bHQuY29tbWFuZHM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIGdlbmVyYXRlIENMSSBjb21tYW5kczonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKGDnlJ/miJBDTEnlkb3ku6TlpLHotKU6ICR7ZXJyb3J9YCwgJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYWRkVG9DbGllbnQgPSBhc3luYyAoY2xpZW50SWQ6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJDb25maWcgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlck5hbWU6IGNvbmZpZ1NlcnZlck5hbWUudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclVybDogY29uZmlnU2VydmVyVXJsLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2FkZC10by1jbGllbnQnLCBjbGllbnRJZCwgc2VydmVyQ29uZmlnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZExvZyhyZXN1bHQubWVzc2FnZSwgJ3N1Y2Nlc3MnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbG9hZENvbmZpZ1N0YXR1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZExvZyhyZXN1bHQubWVzc2FnZSwgJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIGFkZCB0byBjbGllbnQ6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZExvZyhg5re75Yqg5YiwJHtjbGllbnRJZH3lpLHotKU6ICR7ZXJyb3J9YCwgJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3ZlRnJvbUNsaWVudCA9IGFzeW5jIChjbGllbnRJZDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAncmVtb3ZlLWZyb20tY2xpZW50JywgY2xpZW50SWQsIGNvbmZpZ1NlcnZlck5hbWUudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKHJlc3VsdC5tZXNzYWdlLCAnc3VjY2VzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBsb2FkQ29uZmlnU3RhdHVzKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKHJlc3VsdC5tZXNzYWdlLCAnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gcmVtb3ZlIGZyb20gY2xpZW50OicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRMb2coYOS7jiR7Y2xpZW50SWR95Yig6Zmk5aSx6LSlOiAke2Vycm9yfWAsICdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFkZFRvQWxsSURFID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJDb25maWcgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlck5hbWU6IGNvbmZpZ1NlcnZlck5hbWUudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclVybDogY29uZmlnU2VydmVyVXJsLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2FkZC10by1hbGwtY2xpZW50cycsIHNlcnZlckNvbmZpZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCAmJiByZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IFtjbGllbnRUeXBlLCBtc2ddIG9mIE9iamVjdC5lbnRyaWVzKHJlc3VsdC5yZXN1bHRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKGAke2NsaWVudFR5cGV9OiAke21zZ31gLCAnaW5mbycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGxvYWRDb25maWdTdGF0dXMoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tWdWUgQXBwXSBGYWlsZWQgdG8gYWRkIHRvIGFsbCBJREU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZExvZyhg5om56YeP5re75Yqg5aSx6LSlOiAke2Vycm9yfWAsICdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbW92ZUZyb21BbGxJREUgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAncmVtb3ZlLWZyb20tYWxsLWNsaWVudHMnLCBjb25maWdTZXJ2ZXJOYW1lLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ICYmIHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgW2NsaWVudFR5cGUsIG1zZ10gb2YgT2JqZWN0LmVudHJpZXMocmVzdWx0LnJlc3VsdHMpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRMb2coYCR7Y2xpZW50VHlwZX06ICR7bXNnfWAsICdpbmZvJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbG9hZENvbmZpZ1N0YXR1cygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW1Z1ZSBBcHBdIEZhaWxlZCB0byByZW1vdmUgZnJvbSBhbGwgSURFOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRMb2coYOaJuemHj+WIoOmZpOWksei0pTogJHtlcnJvcn1gLCAnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3B5Q2xpZW50Q29uZmlnID0gYXN5bmMgKGNsaWVudFR5cGU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJDb25maWcgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlck5hbWU6IGNvbmZpZ1NlcnZlck5hbWUudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclVybDogY29uZmlnU2VydmVyVXJsLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdjb2Nvcy1tY3Atc2VydmVyJywgJ2dlbmVyYXRlLWNsaWVudC1jb25maWcnLCBjbGllbnRUeXBlLCBzZXJ2ZXJDb25maWcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQocmVzdWx0LmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRMb2coYOW3suWkjeWItiR7Y2xpZW50VHlwZX3phY3nva7liLDliarotLTmnb9gLCAnc3VjY2VzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZExvZyhyZXN1bHQubWVzc2FnZSB8fCAn55Sf5oiQ6YWN572u5aSx6LSlJywgJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIGNvcHkgY29uZmlnOicsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRMb2coYOWkjeWItumFjee9ruWksei0pTogJHtlcnJvcn1gLCAnZXJyb3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb3B5Q0xJQ29tbWFuZCA9IGFzeW5jIChjbGk6ICdjbGF1ZGUnIHwgJ2dlbWluaScpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoY2xpQ29tbWFuZHMudmFsdWVbY2xpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKGDlt7LlpI3liLYke2NsaX3lkb3ku6TliLDliarotLTmnb9gLCAnc3VjY2VzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIGNvcHkgY29tbWFuZDonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKGDlpI3liLblkb3ku6TlpLHotKU6ICR7ZXJyb3J9YCwgJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3BlbkNvbmZpZ0ZpbGUgPSBhc3luYyAoY29uZmlnUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2NvY29zLW1jcC1zZXJ2ZXInLCAnb3Blbi1jb25maWctZmlsZScsIGNvbmZpZ1BhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgcmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkTG9nKGDlt7LmiZPlvIDphY3nva7mlofku7Y6ICR7Y29uZmlnUGF0aH1gLCAnc3VjY2VzcycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZExvZyhyZXN1bHQubWVzc2FnZSB8fCAn5omT5byA6YWN572u5paH5Lu25aSx6LSlJywgJ2Vycm9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbVnVlIEFwcF0gRmFpbGVkIHRvIG9wZW4gY29uZmlnIGZpbGU6JywgZXJyb3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZExvZyhg5omT5byA6YWN572u5paH5Lu25aSx6LSlOiAke2Vycm9yfWAsICdlcnJvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIOebkeWQrGNsaVNjb3Bl5Y+Y5YyW77yM6Ieq5Yqo5Yi35pawQ0xJ5ZG95LukXG4gICAgICAgICAgICAgICAgICAgIHdhdGNoKGNsaVNjb3BlLCAobmV3VmFsKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW1Z1ZSBBcHBdIGNsaVNjb3BlIGNoYW5nZWQgdG86JywgbmV3VmFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZnJlc2hDTElDb21tYW5kcygpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyDnu4Tku7bmjILovb3ml7bliqDovb3mlbDmja5cbiAgICAgICAgICAgICAgICAgICAgb25Nb3VudGVkKGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWKoOi9veW3peWFt+euoeeQhuWZqOeKtuaAgVxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgbG9hZFRvb2xNYW5hZ2VyU3RhdGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Yid5aeL5Yqg6L295pyN5Yqh5Zmo54q25oCB5ZKM6K6+572uXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBsb2FkSW5pdGlhbFNlcnZlclN0YXR1cygpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDliqDovb3kuIDplK7phY3nva7nirbmgIFcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGxvYWRDb25maWdTdGF0dXMoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5a6a5pyf5pu05paw5pyN5Yqh5Zmo54q25oCB77yI5q+PM+enku+8jOWPquabtOaWsOeKtuaAgeS4jeabtOaWsOiuvue9ru+8iVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0SW50ZXJ2YWwoYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHVwZGF0ZVNlcnZlclN0YXR1c09ubHkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmlbDmja5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZVRhYixcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclJ1bm5pbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJTdGF0dXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWRDbGllbnRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgaHR0cFVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzUHJvY2Vzc2luZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlVG9vbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sQ2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldHRpbmdzQ2hhbmdlZCxcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LiA6ZSu6YWN572u5pWw5o2uXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWdTZXJ2ZXJOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnVGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ1NlcnZlclVybCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaVNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWRlQ2xpZW50cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaUNsaWVudHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGlDb21tYW5kcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZ0xvZ3MsXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOiuoeeul+WxnuaAp1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ2xhc3MsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b3RhbFRvb2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZFRvb2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWRUb29scyxcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pa55rOVXG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYWIsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVTZXJ2ZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBzYXZlU2V0dGluZ3MsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3B5VXJsLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZFRvb2xNYW5hZ2VyU3RhdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVUb29sU3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VsZWN0QWxsVG9vbHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNlbGVjdEFsbFRvb2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2F2ZUNoYW5nZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICB0b2dnbGVDYXRlZ29yeVRvb2xzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0VG9vbHNCeUNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2V0Q2F0ZWdvcnlEaXNwbGF5TmFtZSxcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LiA6ZSu6YWN572u5pa55rOVXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2FkQ29uZmlnU3RhdHVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVmcmVzaENMSUNvbW1hbmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkVG9DbGllbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVGcm9tQ2xpZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkVG9BbGxJREUsXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmVGcm9tQWxsSURFLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29weUNsaWVudENvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvcHlDTElDb21tYW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbkNvbmZpZ0ZpbGVcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvdnVlL21jcC1zZXJ2ZXItYXBwLmh0bWwnKSwgJ3V0Zi04JyksXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGFwcC5tb3VudCh0aGlzLiQuYXBwKTtcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1AgUGFuZWxdIFZ1ZTMgYXBwIG1vdW50ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGJlZm9yZUNsb3NlKCkgeyB9LFxuICAgIGNsb3NlKCkge1xuICAgICAgICBjb25zdCBhcHAgPSBwYW5lbERhdGFNYXAuZ2V0KHRoaXMpO1xuICAgICAgICBpZiAoYXBwKSB7XG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xuICAgICAgICB9XG4gICAgfSxcbn0pOyJdfQ==