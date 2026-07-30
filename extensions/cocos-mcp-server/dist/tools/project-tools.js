"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTools = void 0;
class ProjectTools {
    getTools() {
        return [
            {
                name: 'project_manage',
                description: 'PROJECT MANAGEMENT: Core project operations and configuration. COMMON WORKFLOWS: get_info for project details, run for preview testing, build for deployment preparation, get_settings for configuration inspection. Note: Build operations require manual interaction due to API limitations.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['run', 'build', 'get_info', 'get_settings'],
                            description: 'Project operation: "run" = start preview/testing (requires platform) | "build" = prepare for deployment (requires buildPlatform) | "get_info" = project metadata and paths | "get_settings" = configuration by category (requires category)'
                        },
                        // For run action
                        platform: {
                            type: 'string',
                            enum: ['browser', 'simulator', 'preview'],
                            description: 'Preview platform (run action). "browser" = web preview (most common), "simulator" = device simulation, "preview" = editor preview. Recommended: browser for quick testing.',
                            default: 'browser'
                        },
                        // For build action
                        buildPlatform: {
                            type: 'string',
                            enum: ['web-mobile', 'web-desktop', 'ios', 'android', 'windows', 'mac'],
                            description: 'Target deployment platform (REQUIRED for build action). "web-mobile" = mobile web, "web-desktop" = desktop web, "ios" = iPhone/iPad, "android" = Android devices, "windows" = Windows desktop, "mac" = macOS desktop.'
                        },
                        debug: {
                            type: 'boolean',
                            description: 'Build configuration (build action). true = development build with debug info and source maps (larger size, easier debugging), false = optimized production build (smaller size, harder debugging). Recommended: true for testing.',
                            default: true
                        },
                        // For get_settings action
                        category: {
                            type: 'string',
                            enum: ['general', 'physics', 'render', 'assets'],
                            description: 'Configuration category (get_settings action). "general" = basic project settings, "physics" = physics engine config, "render" = rendering settings, "assets" = asset processing. Default: general for basic info.',
                            default: 'general'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'project_build_system',
                description: 'BUILD SYSTEM: Control build panel, check builder status, and manage preview servers. Use this for build-related operations and preview management.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_build_settings', 'open_build_panel', 'check_builder_status', 'start_preview_server', 'stop_preview_server'],
                            description: 'Build system action to perform'
                        },
                        port: {
                            type: 'number',
                            description: 'Preview server port (start_preview_server action only)',
                            default: 7456
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'project_manage':
                return await this.handleProjectManage(args);
            case 'project_build_system':
                return await this.handleBuildSystem(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    // New consolidated handlers
    async handleProjectManage(args) {
        const { action } = args;
        switch (action) {
            case 'run':
                return await this.runProject(args.platform);
            case 'build':
                return await this.buildProject({ platform: args.buildPlatform, debug: args.debug });
            case 'get_info':
                return await this.getProjectInfo();
            case 'get_settings':
                return await this.getProjectSettings(args.category);
            default:
                return { success: false, error: `Unknown project manage action: ${action}` };
        }
    }
    async handleBuildSystem(args) {
        const { action } = args;
        switch (action) {
            case 'get_build_settings':
                return await this.getBuildSettings();
            case 'open_build_panel':
                return await this.openBuildPanel();
            case 'check_builder_status':
                return await this.checkBuilderStatus();
            case 'start_preview_server':
                return await this.startPreviewServer(args.port);
            case 'stop_preview_server':
                return await this.stopPreviewServer();
            default:
                return { success: false, error: `Unknown build system action: ${action}` };
        }
    }
    // Original implementation methods
    async runProject(platform = 'browser') {
        return new Promise((resolve) => {
            // Note: Preview module is not documented in official API
            // Using fallback approach - open build panel as alternative
            Editor.Message.request('builder', 'open').then(() => {
                resolve({
                    success: true,
                    message: `✅ Build panel opened. Preview functionality requires manual setup for ${platform}.`,
                    data: {
                        platform,
                        instruction: "Use the build panel to configure and start preview manually"
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async buildProject(args) {
        return new Promise((resolve) => {
            const buildOptions = {
                platform: args.platform,
                debug: args.debug !== false,
                sourceMaps: args.debug !== false,
                buildPath: `build/${args.platform}`
            };
            // Note: Builder module only supports 'open' and 'query-worker-ready'
            // Building requires manual interaction through the build panel
            Editor.Message.request('builder', 'open').then(() => {
                resolve({
                    success: true,
                    message: `✅ Build panel opened for ${args.platform}. Please configure and start build manually.`,
                    data: {
                        platform: args.platform,
                        debug: args.debug,
                        instruction: "Use the build panel to configure and start the build process",
                        buildOptions
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getProjectInfo() {
        return new Promise((resolve) => {
            var _a;
            const info = {
                name: Editor.Project.name,
                path: Editor.Project.path,
                uuid: Editor.Project.uuid,
                version: Editor.Project.version || '1.0.0',
                cocosVersion: ((_a = Editor.versions) === null || _a === void 0 ? void 0 : _a.cocos) || 'Unknown'
            };
            // Note: 'query-info' API doesn't exist, using 'query-config' instead
            Editor.Message.request('project', 'query-config', 'project').then((additionalInfo) => {
                if (additionalInfo) {
                    Object.assign(info, { config: additionalInfo });
                }
                resolve({
                    success: true,
                    message: `✅ Project info retrieved: ${info.name}`,
                    data: info
                });
            }).catch(() => {
                // Return basic info even if detailed query fails
                resolve({
                    success: true,
                    message: `✅ Basic project info retrieved: ${info.name}`,
                    data: info
                });
            });
        });
    }
    async getProjectSettings(category = 'general') {
        return new Promise((resolve) => {
            const configMap = {
                general: 'project',
                physics: 'physics',
                render: 'render',
                assets: 'asset-db'
            };
            const configName = configMap[category] || 'project';
            Editor.Message.request('project', 'query-config', configName).then((settings) => {
                resolve({
                    success: true,
                    message: `✅ ${category} settings retrieved successfully`,
                    data: {
                        category: category,
                        config: settings
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getBuildSettings() {
        return new Promise((resolve) => {
            Editor.Message.request('builder', 'query-worker-ready').then((ready) => {
                resolve({
                    success: true,
                    message: `✅ Build settings status retrieved`,
                    data: {
                        builderReady: ready,
                        message: 'Build settings are limited in MCP plugin environment',
                        availableActions: [
                            'Open build panel with project_build_system action "open_build_panel"',
                            'Check builder status with project_build_system action "check_builder_status"',
                            'Start preview server with project_build_system action "start_preview_server"',
                            'Stop preview server with project_build_system action "stop_preview_server"'
                        ],
                        limitation: 'Full build configuration requires direct Editor UI access'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async openBuildPanel() {
        return new Promise((resolve) => {
            Editor.Message.request('builder', 'open').then(() => {
                resolve({
                    success: true,
                    message: '✅ Build panel opened successfully'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async checkBuilderStatus() {
        return new Promise((resolve) => {
            Editor.Message.request('builder', 'query-worker-ready').then((ready) => {
                resolve({
                    success: true,
                    message: '✅ Builder status checked successfully',
                    data: {
                        ready: ready,
                        status: ready ? 'Builder worker is ready' : 'Builder worker is not ready'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async startPreviewServer(port = 7456) {
        return new Promise((resolve) => {
            resolve({
                success: false,
                error: 'Preview server control is not supported through MCP API',
                instruction: 'Please start the preview server manually using the editor menu: Project > Preview, or use the preview panel in the editor',
                data: { requestedPort: port }
            });
        });
    }
    async stopPreviewServer() {
        return new Promise((resolve) => {
            resolve({
                success: false,
                error: 'Preview server control is not supported through MCP API',
                instruction: 'Please stop the preview server manually using the preview panel in the editor'
            });
        });
    }
}
exports.ProjectTools = ProjectTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9wcm9qZWN0LXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQWEsWUFBWTtJQUNyQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLFdBQVcsRUFBRSxnU0FBZ1M7Z0JBQzdTLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQzs0QkFDbEQsV0FBVyxFQUFFLDZPQUE2Tzt5QkFDN1A7d0JBQ0QsaUJBQWlCO3dCQUNqQixRQUFRLEVBQUU7NEJBQ04sSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUM7NEJBQ3pDLFdBQVcsRUFBRSw0S0FBNEs7NEJBQ3pMLE9BQU8sRUFBRSxTQUFTO3lCQUNyQjt3QkFDRCxtQkFBbUI7d0JBQ25CLGFBQWEsRUFBRTs0QkFDWCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxZQUFZLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQzs0QkFDdkUsV0FBVyxFQUFFLHVOQUF1Tjt5QkFDdk87d0JBQ0QsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxTQUFTOzRCQUNmLFdBQVcsRUFBRSxtT0FBbU87NEJBQ2hQLE9BQU8sRUFBRSxJQUFJO3lCQUNoQjt3QkFDRCwwQkFBMEI7d0JBQzFCLFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFF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LENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQWUsSUFBSTtRQUNoRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDM0IsT0FBTyxDQUFDO2dCQUNKLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSx5REFBeUQ7Z0JBQ2hFLFdBQVcsRUFBRSwySEFBMkg7Z0JBQ3hJLElBQUksRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUU7YUFDaEMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQjtRQUMzQixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDM0IsT0FBTyxDQUFDO2dCQUNKLE9BQU8sRUFBRSxLQUFLO2dCQUNkLEtBQUssRUFBRSx5REFBeUQ7Z0JBQ2hFLFdBQVcsRUFBRSwrRUFBK0U7YUFDL0YsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0o7QUFyU0Qsb0NBcVNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBQcm9qZWN0SW5mbyB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIFByb2plY3RUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3Byb2plY3RfbWFuYWdlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BST0pFQ1QgTUFOQUdFTUVOVDogQ29yZSBwcm9qZWN0IG9wZXJhdGlvbnMgYW5kIGNvbmZpZ3VyYXRpb24uIENPTU1PTiBXT1JLRkxPV1M6IGdldF9pbmZvIGZvciBwcm9qZWN0IGRldGFpbHMsIHJ1biBmb3IgcHJldmlldyB0ZXN0aW5nLCBidWlsZCBmb3IgZGVwbG95bWVudCBwcmVwYXJhdGlvbiwgZ2V0X3NldHRpbmdzIGZvciBjb25maWd1cmF0aW9uIGluc3BlY3Rpb24uIE5vdGU6IEJ1aWxkIG9wZXJhdGlvbnMgcmVxdWlyZSBtYW51YWwgaW50ZXJhY3Rpb24gZHVlIHRvIEFQSSBsaW1pdGF0aW9ucy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3J1bicsICdidWlsZCcsICdnZXRfaW5mbycsICdnZXRfc2V0dGluZ3MnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb2plY3Qgb3BlcmF0aW9uOiBcInJ1blwiID0gc3RhcnQgcHJldmlldy90ZXN0aW5nIChyZXF1aXJlcyBwbGF0Zm9ybSkgfCBcImJ1aWxkXCIgPSBwcmVwYXJlIGZvciBkZXBsb3ltZW50IChyZXF1aXJlcyBidWlsZFBsYXRmb3JtKSB8IFwiZ2V0X2luZm9cIiA9IHByb2plY3QgbWV0YWRhdGEgYW5kIHBhdGhzIHwgXCJnZXRfc2V0dGluZ3NcIiA9IGNvbmZpZ3VyYXRpb24gYnkgY2F0ZWdvcnkgKHJlcXVpcmVzIGNhdGVnb3J5KSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgcnVuIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhdGZvcm06IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2Jyb3dzZXInLCAnc2ltdWxhdG9yJywgJ3ByZXZpZXcnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZXZpZXcgcGxhdGZvcm0gKHJ1biBhY3Rpb24pLiBcImJyb3dzZXJcIiA9IHdlYiBwcmV2aWV3IChtb3N0IGNvbW1vbiksIFwic2ltdWxhdG9yXCIgPSBkZXZpY2Ugc2ltdWxhdGlvbiwgXCJwcmV2aWV3XCIgPSBlZGl0b3IgcHJldmlldy4gUmVjb21tZW5kZWQ6IGJyb3dzZXIgZm9yIHF1aWNrIHRlc3RpbmcuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnYnJvd3NlcidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgYnVpbGQgYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBidWlsZFBsYXRmb3JtOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWyd3ZWItbW9iaWxlJywgJ3dlYi1kZXNrdG9wJywgJ2lvcycsICdhbmRyb2lkJywgJ3dpbmRvd3MnLCAnbWFjJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUYXJnZXQgZGVwbG95bWVudCBwbGF0Zm9ybSAoUkVRVUlSRUQgZm9yIGJ1aWxkIGFjdGlvbikuIFwid2ViLW1vYmlsZVwiID0gbW9iaWxlIHdlYiwgXCJ3ZWItZGVza3RvcFwiID0gZGVza3RvcCB3ZWIsIFwiaW9zXCIgPSBpUGhvbmUvaVBhZCwgXCJhbmRyb2lkXCIgPSBBbmRyb2lkIGRldmljZXMsIFwid2luZG93c1wiID0gV2luZG93cyBkZXNrdG9wLCBcIm1hY1wiID0gbWFjT1MgZGVza3RvcC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVidWc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdCdWlsZCBjb25maWd1cmF0aW9uIChidWlsZCBhY3Rpb24pLiB0cnVlID0gZGV2ZWxvcG1lbnQgYnVpbGQgd2l0aCBkZWJ1ZyBpbmZvIGFuZCBzb3VyY2UgbWFwcyAobGFyZ2VyIHNpemUsIGVhc2llciBkZWJ1Z2dpbmcpLCBmYWxzZSA9IG9wdGltaXplZCBwcm9kdWN0aW9uIGJ1aWxkIChzbWFsbGVyIHNpemUsIGhhcmRlciBkZWJ1Z2dpbmcpLiBSZWNvbW1lbmRlZDogdHJ1ZSBmb3IgdGVzdGluZy4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgZ2V0X3NldHRpbmdzIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dlbmVyYWwnLCAncGh5c2ljcycsICdyZW5kZXInLCAnYXNzZXRzJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25maWd1cmF0aW9uIGNhdGVnb3J5IChnZXRfc2V0dGluZ3MgYWN0aW9uKS4gXCJnZW5lcmFsXCIgPSBiYXNpYyBwcm9qZWN0IHNldHRpbmdzLCBcInBoeXNpY3NcIiA9IHBoeXNpY3MgZW5naW5lIGNvbmZpZywgXCJyZW5kZXJcIiA9IHJlbmRlcmluZyBzZXR0aW5ncywgXCJhc3NldHNcIiA9IGFzc2V0IHByb2Nlc3NpbmcuIERlZmF1bHQ6IGdlbmVyYWwgZm9yIGJhc2ljIGluZm8uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZ2VuZXJhbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcm9qZWN0X2J1aWxkX3N5c3RlbScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdCVUlMRCBTWVNURU06IENvbnRyb2wgYnVpbGQgcGFuZWwsIGNoZWNrIGJ1aWxkZXIgc3RhdHVzLCBhbmQgbWFuYWdlIHByZXZpZXcgc2VydmVycy4gVXNlIHRoaXMgZm9yIGJ1aWxkLXJlbGF0ZWQgb3BlcmF0aW9ucyBhbmQgcHJldmlldyBtYW5hZ2VtZW50LicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X2J1aWxkX3NldHRpbmdzJywgJ29wZW5fYnVpbGRfcGFuZWwnLCAnY2hlY2tfYnVpbGRlcl9zdGF0dXMnLCAnc3RhcnRfcHJldmlld19zZXJ2ZXInLCAnc3RvcF9wcmV2aWV3X3NlcnZlciddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQnVpbGQgc3lzdGVtIGFjdGlvbiB0byBwZXJmb3JtJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZXZpZXcgc2VydmVyIHBvcnQgKHN0YXJ0X3ByZXZpZXdfc2VydmVyIGFjdGlvbiBvbmx5KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogNzQ1NlxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3Byb2plY3RfbWFuYWdlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVQcm9qZWN0TWFuYWdlKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAncHJvamVjdF9idWlsZF9zeXN0ZW0nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmhhbmRsZUJ1aWxkU3lzdGVtKGFyZ3MpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIE5ldyBjb25zb2xpZGF0ZWQgaGFuZGxlcnNcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZVByb2plY3RNYW5hZ2UoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24gfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAncnVuJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5ydW5Qcm9qZWN0KGFyZ3MucGxhdGZvcm0pO1xuICAgICAgICAgICAgY2FzZSAnYnVpbGQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmJ1aWxkUHJvamVjdCh7IHBsYXRmb3JtOiBhcmdzLmJ1aWxkUGxhdGZvcm0sIGRlYnVnOiBhcmdzLmRlYnVnIH0pO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2luZm8nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFByb2plY3RJbmZvKCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfc2V0dGluZ3MnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFByb2plY3RTZXR0aW5ncyhhcmdzLmNhdGVnb3J5KTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBwcm9qZWN0IG1hbmFnZSBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlQnVpbGRTeXN0ZW0oYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24gfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2J1aWxkX3NldHRpbmdzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRCdWlsZFNldHRpbmdzKCk7XG4gICAgICAgICAgICBjYXNlICdvcGVuX2J1aWxkX3BhbmVsJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5vcGVuQnVpbGRQYW5lbCgpO1xuICAgICAgICAgICAgY2FzZSAnY2hlY2tfYnVpbGRlcl9zdGF0dXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoZWNrQnVpbGRlclN0YXR1cygpO1xuICAgICAgICAgICAgY2FzZSAnc3RhcnRfcHJldmlld19zZXJ2ZXInOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnN0YXJ0UHJldmlld1NlcnZlcihhcmdzLnBvcnQpO1xuICAgICAgICAgICAgY2FzZSAnc3RvcF9wcmV2aWV3X3NlcnZlcic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc3RvcFByZXZpZXdTZXJ2ZXIoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBidWlsZCBzeXN0ZW0gYWN0aW9uOiAke2FjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPcmlnaW5hbCBpbXBsZW1lbnRhdGlvbiBtZXRob2RzXG4gICAgcHJpdmF0ZSBhc3luYyBydW5Qcm9qZWN0KHBsYXRmb3JtOiBzdHJpbmcgPSAnYnJvd3NlcicpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIE5vdGU6IFByZXZpZXcgbW9kdWxlIGlzIG5vdCBkb2N1bWVudGVkIGluIG9mZmljaWFsIEFQSVxuICAgICAgICAgICAgLy8gVXNpbmcgZmFsbGJhY2sgYXBwcm9hY2ggLSBvcGVuIGJ1aWxkIHBhbmVsIGFzIGFsdGVybmF0aXZlXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdidWlsZGVyJywgJ29wZW4nKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYOKchSBCdWlsZCBwYW5lbCBvcGVuZWQuIFByZXZpZXcgZnVuY3Rpb25hbGl0eSByZXF1aXJlcyBtYW51YWwgc2V0dXAgZm9yICR7cGxhdGZvcm19LmAsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF0Zm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiBcIlVzZSB0aGUgYnVpbGQgcGFuZWwgdG8gY29uZmlndXJlIGFuZCBzdGFydCBwcmV2aWV3IG1hbnVhbGx5XCJcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGJ1aWxkUHJvamVjdChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGJ1aWxkT3B0aW9ucyA9IHtcbiAgICAgICAgICAgICAgICBwbGF0Zm9ybTogYXJncy5wbGF0Zm9ybSxcbiAgICAgICAgICAgICAgICBkZWJ1ZzogYXJncy5kZWJ1ZyAhPT0gZmFsc2UsXG4gICAgICAgICAgICAgICAgc291cmNlTWFwczogYXJncy5kZWJ1ZyAhPT0gZmFsc2UsXG4gICAgICAgICAgICAgICAgYnVpbGRQYXRoOiBgYnVpbGQvJHthcmdzLnBsYXRmb3JtfWBcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIE5vdGU6IEJ1aWxkZXIgbW9kdWxlIG9ubHkgc3VwcG9ydHMgJ29wZW4nIGFuZCAncXVlcnktd29ya2VyLXJlYWR5J1xuICAgICAgICAgICAgLy8gQnVpbGRpbmcgcmVxdWlyZXMgbWFudWFsIGludGVyYWN0aW9uIHRocm91Z2ggdGhlIGJ1aWxkIHBhbmVsXG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdidWlsZGVyJywgJ29wZW4nKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYOKchSBCdWlsZCBwYW5lbCBvcGVuZWQgZm9yICR7YXJncy5wbGF0Zm9ybX0uIFBsZWFzZSBjb25maWd1cmUgYW5kIHN0YXJ0IGJ1aWxkIG1hbnVhbGx5LmAsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGF0Zm9ybTogYXJncy5wbGF0Zm9ybSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnOiBhcmdzLmRlYnVnLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdHJ1Y3Rpb246IFwiVXNlIHRoZSBidWlsZCBwYW5lbCB0byBjb25maWd1cmUgYW5kIHN0YXJ0IHRoZSBidWlsZCBwcm9jZXNzXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBidWlsZE9wdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGdldFByb2plY3RJbmZvKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgaW5mbzogUHJvamVjdEluZm8gPSB7XG4gICAgICAgICAgICAgICAgbmFtZTogRWRpdG9yLlByb2plY3QubmFtZSxcbiAgICAgICAgICAgICAgICBwYXRoOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxuICAgICAgICAgICAgICAgIHV1aWQ6IEVkaXRvci5Qcm9qZWN0LnV1aWQsXG4gICAgICAgICAgICAgICAgdmVyc2lvbjogKEVkaXRvci5Qcm9qZWN0IGFzIGFueSkudmVyc2lvbiB8fCAnMS4wLjAnLFxuICAgICAgICAgICAgICAgIGNvY29zVmVyc2lvbjogKEVkaXRvciBhcyBhbnkpLnZlcnNpb25zPy5jb2NvcyB8fCAnVW5rbm93bidcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIE5vdGU6ICdxdWVyeS1pbmZvJyBBUEkgZG9lc24ndCBleGlzdCwgdXNpbmcgJ3F1ZXJ5LWNvbmZpZycgaW5zdGVhZFxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgncHJvamVjdCcsICdxdWVyeS1jb25maWcnLCAncHJvamVjdCcpLnRoZW4oKGFkZGl0aW9uYWxJbmZvOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYWRkaXRpb25hbEluZm8pIHtcbiAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihpbmZvLCB7IGNvbmZpZzogYWRkaXRpb25hbEluZm8gfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSwgXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDinIUgUHJvamVjdCBpbmZvIHJldHJpZXZlZDogJHtpbmZvLm5hbWV9YCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogaW5mbyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBSZXR1cm4gYmFzaWMgaW5mbyBldmVuIGlmIGRldGFpbGVkIHF1ZXJ5IGZhaWxzXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYOKchSBCYXNpYyBwcm9qZWN0IGluZm8gcmV0cmlldmVkOiAke2luZm8ubmFtZX1gLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBpbmZvIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0UHJvamVjdFNldHRpbmdzKGNhdGVnb3J5OiBzdHJpbmcgPSAnZ2VuZXJhbCcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZ01hcDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgICAgICAgICAgICAgICBnZW5lcmFsOiAncHJvamVjdCcsXG4gICAgICAgICAgICAgICAgcGh5c2ljczogJ3BoeXNpY3MnLFxuICAgICAgICAgICAgICAgIHJlbmRlcjogJ3JlbmRlcicsXG4gICAgICAgICAgICAgICAgYXNzZXRzOiAnYXNzZXQtZGInXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBjb25zdCBjb25maWdOYW1lID0gY29uZmlnTWFwW2NhdGVnb3J5XSB8fCAncHJvamVjdCc7XG5cbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3Byb2plY3QnLCAncXVlcnktY29uZmlnJywgY29uZmlnTmFtZSkudGhlbigoc2V0dGluZ3M6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBg4pyFICR7Y2F0ZWdvcnl9IHNldHRpbmdzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHlgLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogY2F0ZWdvcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWc6IHNldHRpbmdzXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRCdWlsZFNldHRpbmdzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYnVpbGRlcicsICdxdWVyeS13b3JrZXItcmVhZHknKS50aGVuKChyZWFkeTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBg4pyFIEJ1aWxkIHNldHRpbmdzIHN0YXR1cyByZXRyaWV2ZWRgLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBidWlsZGVyUmVhZHk6IHJlYWR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0J1aWxkIHNldHRpbmdzIGFyZSBsaW1pdGVkIGluIE1DUCBwbHVnaW4gZW52aXJvbm1lbnQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXZhaWxhYmxlQWN0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdPcGVuIGJ1aWxkIHBhbmVsIHdpdGggcHJvamVjdF9idWlsZF9zeXN0ZW0gYWN0aW9uIFwib3Blbl9idWlsZF9wYW5lbFwiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnQ2hlY2sgYnVpbGRlciBzdGF0dXMgd2l0aCBwcm9qZWN0X2J1aWxkX3N5c3RlbSBhY3Rpb24gXCJjaGVja19idWlsZGVyX3N0YXR1c1wiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU3RhcnQgcHJldmlldyBzZXJ2ZXIgd2l0aCBwcm9qZWN0X2J1aWxkX3N5c3RlbSBhY3Rpb24gXCJzdGFydF9wcmV2aWV3X3NlcnZlclwiJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAnU3RvcCBwcmV2aWV3IHNlcnZlciB3aXRoIHByb2plY3RfYnVpbGRfc3lzdGVtIGFjdGlvbiBcInN0b3BfcHJldmlld19zZXJ2ZXJcIidcbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBsaW1pdGF0aW9uOiAnRnVsbCBidWlsZCBjb25maWd1cmF0aW9uIHJlcXVpcmVzIGRpcmVjdCBFZGl0b3IgVUkgYWNjZXNzJ1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgb3BlbkJ1aWxkUGFuZWwoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdidWlsZGVyJywgJ29wZW4nKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ+KchSBCdWlsZCBwYW5lbCBvcGVuZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNoZWNrQnVpbGRlclN0YXR1cygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2J1aWxkZXInLCAncXVlcnktd29ya2VyLXJlYWR5JykudGhlbigocmVhZHk6IGJvb2xlYW4pID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ+KchSBCdWlsZGVyIHN0YXR1cyBjaGVja2VkIHN1Y2Nlc3NmdWxseScsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYWR5OiByZWFkeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogcmVhZHkgPyAnQnVpbGRlciB3b3JrZXIgaXMgcmVhZHknIDogJ0J1aWxkZXIgd29ya2VyIGlzIG5vdCByZWFkeSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHN0YXJ0UHJldmlld1NlcnZlcihwb3J0OiBudW1iZXIgPSA3NDU2KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogJ1ByZXZpZXcgc2VydmVyIGNvbnRyb2wgaXMgbm90IHN1cHBvcnRlZCB0aHJvdWdoIE1DUCBBUEknLFxuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uOiAnUGxlYXNlIHN0YXJ0IHRoZSBwcmV2aWV3IHNlcnZlciBtYW51YWxseSB1c2luZyB0aGUgZWRpdG9yIG1lbnU6IFByb2plY3QgPiBQcmV2aWV3LCBvciB1c2UgdGhlIHByZXZpZXcgcGFuZWwgaW4gdGhlIGVkaXRvcicsXG4gICAgICAgICAgICAgICAgZGF0YTogeyByZXF1ZXN0ZWRQb3J0OiBwb3J0IH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHN0b3BQcmV2aWV3U2VydmVyKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6ICdQcmV2aWV3IHNlcnZlciBjb250cm9sIGlzIG5vdCBzdXBwb3J0ZWQgdGhyb3VnaCBNQ1AgQVBJJyxcbiAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbjogJ1BsZWFzZSBzdG9wIHRoZSBwcmV2aWV3IHNlcnZlciBtYW51YWxseSB1c2luZyB0aGUgcHJldmlldyBwYW5lbCBpbiB0aGUgZWRpdG9yJ1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn0iXX0=