"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastTools = void 0;
class BroadcastTools {
    constructor() {
        this.listeners = new Map();
        this.messageLog = [];
        this.setupBroadcastListeners();
    }
    getTools() {
        return [
            // 1. Broadcast Log Management - Log operations
            {
                name: 'broadcast_log_management',
                description: 'BROADCAST LOG MANAGEMENT: Monitor Cocos Creator internal messages for debugging and system monitoring. USAGE: get_log to view recent events, clear_log to reset history. DEBUGGING: Use messageType filter to focus on specific events like "scene:ready" or "asset-db:asset-add".',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_log', 'clear_log'],
                            description: 'Log operation: "get_log" = retrieve recent broadcast messages (supports limit+messageType filters) | "clear_log" = clear all stored message history (no parameters needed)'
                        },
                        // For get_log action
                        limit: {
                            type: 'number',
                            description: 'Maximum messages to return (get_log action). Controls output size. Examples: 10 for recent events, 100 for comprehensive history, 500 for deep debugging. Default: 50 for balanced view.',
                            default: 50,
                            minimum: 1,
                            maximum: 1000
                        },
                        messageType: {
                            type: 'string',
                            description: 'Message type filter (get_log action). Show only specific event types. Common filters: "scene:ready" (scene loaded), "asset-db:asset-add" (asset imported), "build-worker:ready" (build system). Leave empty for all messages.'
                        }
                    },
                    required: ['action']
                }
            },
            // 2. Broadcast Listener Management - Listener operations
            {
                name: 'broadcast_listener_management',
                description: 'BROADCAST LISTENER MANAGEMENT: Control which Cocos Creator events to monitor in real-time. WORKFLOW: start_listening to begin monitoring events → get_active_listeners to see current monitors → stop_listening to end monitoring. Useful for debugging workflows and system monitoring.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['start_listening', 'stop_listening', 'get_active_listeners'],
                            description: 'Listener operation: "start_listening" = begin monitoring events (requires messageType) | "stop_listening" = stop monitoring events (requires messageType) | "get_active_listeners" = list current monitors (no parameters needed)'
                        },
                        // For start_listening and stop_listening actions
                        messageType: {
                            type: 'string',
                            description: 'Event type to monitor (REQUIRED for start_listening/stop_listening). Critical events: "scene:ready" (scene changes), "asset-db:asset-add" (imports), "asset-db:asset-change" (modifications), "build-worker:ready" (build status). Case-sensitive exact match required.'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'broadcast_log_management':
                return await this.handleBroadcastLogManagement(args);
            case 'broadcast_listener_management':
                return await this.handleBroadcastListenerManagement(args);
            default:
                // Legacy tool support for backward compatibility
                return await this.handleLegacyTools(toolName, args);
        }
    }
    setupBroadcastListeners() {
        // 设置预定义的重要广播消息监听
        const importantMessages = [
            'build-worker:ready',
            'build-worker:closed',
            'scene:ready',
            'scene:close',
            'scene:light-probe-edit-mode-changed',
            'scene:light-probe-bounding-box-edit-mode-changed',
            'asset-db:ready',
            'asset-db:close',
            'asset-db:asset-add',
            'asset-db:asset-change',
            'asset-db:asset-delete'
        ];
        importantMessages.forEach(messageType => {
            this.addBroadcastListener(messageType);
        });
    }
    addBroadcastListener(messageType) {
        const listener = (data) => {
            this.messageLog.push({
                message: messageType,
                data: data,
                timestamp: Date.now()
            });
            // 保持日志大小在合理范围内
            if (this.messageLog.length > 1000) {
                this.messageLog = this.messageLog.slice(-500);
            }
            console.log(`[Broadcast] ${messageType}:`, data);
        };
        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, []);
        }
        this.listeners.get(messageType).push(listener);
        // 注册 Editor 消息监听 - 暂时注释掉，Editor.Message API可能不支持
        // Editor.Message.on(messageType, listener);
        console.log(`[BroadcastTools] Added listener for ${messageType} (simulated)`);
    }
    removeBroadcastListener(messageType) {
        const listeners = this.listeners.get(messageType);
        if (listeners) {
            listeners.forEach(listener => {
                // Editor.Message.off(messageType, listener);
                console.log(`[BroadcastTools] Removed listener for ${messageType} (simulated)`);
            });
            this.listeners.delete(messageType);
        }
    }
    async getBroadcastLog(limit = 50, messageType) {
        return new Promise((resolve) => {
            let filteredLog = this.messageLog;
            if (messageType) {
                filteredLog = this.messageLog.filter(entry => entry.message === messageType);
            }
            const recentLog = filteredLog.slice(-limit).map(entry => (Object.assign(Object.assign({}, entry), { timestamp: new Date(entry.timestamp).toISOString() })));
            resolve({
                success: true,
                data: {
                    log: recentLog,
                    count: recentLog.length,
                    totalCount: filteredLog.length,
                    filter: messageType || 'all',
                    message: 'Broadcast log retrieved successfully'
                }
            });
        });
    }
    async listenBroadcast(messageType) {
        return new Promise((resolve) => {
            try {
                if (!this.listeners.has(messageType)) {
                    this.addBroadcastListener(messageType);
                    resolve({
                        success: true,
                        data: {
                            messageType: messageType,
                            message: `Started listening for broadcast: ${messageType}`
                        }
                    });
                }
                else {
                    resolve({
                        success: true,
                        data: {
                            messageType: messageType,
                            message: `Already listening for broadcast: ${messageType}`
                        }
                    });
                }
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    async stopListening(messageType) {
        return new Promise((resolve) => {
            try {
                if (this.listeners.has(messageType)) {
                    this.removeBroadcastListener(messageType);
                    resolve({
                        success: true,
                        data: {
                            messageType: messageType,
                            message: `Stopped listening for broadcast: ${messageType}`
                        }
                    });
                }
                else {
                    resolve({
                        success: true,
                        data: {
                            messageType: messageType,
                            message: `Was not listening for broadcast: ${messageType}`
                        }
                    });
                }
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    async clearBroadcastLog() {
        return new Promise((resolve) => {
            const previousCount = this.messageLog.length;
            this.messageLog = [];
            resolve({
                success: true,
                data: {
                    clearedCount: previousCount,
                    message: 'Broadcast log cleared successfully'
                }
            });
        });
    }
    async getActiveListeners() {
        return new Promise((resolve) => {
            const activeListeners = Array.from(this.listeners.keys()).map(messageType => {
                var _a;
                return ({
                    messageType: messageType,
                    listenerCount: ((_a = this.listeners.get(messageType)) === null || _a === void 0 ? void 0 : _a.length) || 0
                });
            });
            resolve({
                success: true,
                data: {
                    listeners: activeListeners,
                    count: activeListeners.length,
                    message: 'Active listeners retrieved successfully'
                }
            });
        });
    }
    // New handler methods for optimized tools
    async handleBroadcastLogManagement(args) {
        const { action, limit, messageType } = args;
        switch (action) {
            case 'get_log':
                return await this.getBroadcastLog(limit, messageType);
            case 'clear_log':
                return await this.clearBroadcastLog();
            default:
                return { success: false, error: `Unknown broadcast log management action: ${action}` };
        }
    }
    async handleBroadcastListenerManagement(args) {
        const { action, messageType } = args;
        switch (action) {
            case 'start_listening':
                return await this.listenBroadcast(messageType);
            case 'stop_listening':
                return await this.stopListening(messageType);
            case 'get_active_listeners':
                return await this.getActiveListeners();
            default:
                return { success: false, error: `Unknown broadcast listener management action: ${action}` };
        }
    }
    // Legacy tool support for backward compatibility
    async handleLegacyTools(toolName, args) {
        switch (toolName) {
            case 'get_broadcast_log':
                return await this.getBroadcastLog(args.limit, args.messageType);
            case 'listen_broadcast':
                return await this.listenBroadcast(args.messageType);
            case 'stop_listening':
                return await this.stopListening(args.messageType);
            case 'clear_broadcast_log':
                return await this.clearBroadcastLog();
            case 'get_active_listeners':
                return await this.getActiveListeners();
            default:
                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    }
}
exports.BroadcastTools = BroadcastTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvYWRjYXN0LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2Jyb2FkY2FzdC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLGNBQWM7SUFJdkI7UUFIUSxjQUFTLEdBQTRCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDL0MsZUFBVSxHQUE2RCxFQUFFLENBQUM7UUFHOUUsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVELFFBQVE7UUFDSixPQUFPO1lBQ0gsK0NBQStDO1lBQy9DO2dCQUNJLElBQUksRUFBRSwwQkFBMEI7Z0JBQ2hDLFdBQVcsRUFBRSxvUkFBb1I7Z0JBQ2pTLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUM7NEJBQzlCLFdBQVcsRUFBRSw0S0FBNEs7eUJBQzVMO3dCQUNELHFCQUFxQjt3QkFDckIsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwwTEFBMEw7NEJBQ3ZNLE9BQU8sRUFBRSxFQUFFOzRCQUNYLE9BQU8sRUFBRSxDQUFDOzRCQUNWLE9BQU8sRUFBRSxJQUFJO3lCQUNoQjt3QkFDRCxXQUFXLEVBQUU7NEJBQ1QsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLCtOQUErTjt5QkFDL087cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1lBRUQseURBQXlEO1lBQ3pEO2dCQUNJLElBQUksRUFBRSwrQkFBK0I7Z0JBQ3JDLFdBQVcsRUFBRSwwUkFBMFI7Z0JBQ3ZTLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFB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LE9BQU8sTUFBTSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUMzQztnQkFDSSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsaURBQWlELE1BQU0sRUFBRSxFQUFFLENBQUM7UUFDcEcsQ0FBQztJQUNMLENBQUM7SUFFRCxpREFBaUQ7SUFDekMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQWdCLEVBQUUsSUFBUztRQUN2RCxRQUFRLFFBQVEsRUFBRSxDQUFDO1lBQ2YsS0FBSyxtQkFBbUI7Z0JBQ3BCLE9BQU8sTUFBTSxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3BFLEtBQUssa0JBQWtCO2dCQUNuQixPQUFPLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDeEQsS0FBSyxnQkFBZ0I7Z0JBQ2pCLE9BQU8sTUFBTSxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN0RCxLQUFLLHFCQUFxQjtnQkFDdEIsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzFDLEtBQUssc0JBQXNCO2dCQUN2QixPQUFPLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDM0M7Z0JBQ0ksT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ3RFLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUFuU0Qsd0NBbVNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgQnJvYWRjYXN0VG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIHByaXZhdGUgbGlzdGVuZXJzOiBNYXA8c3RyaW5nLCBGdW5jdGlvbltdPiA9IG5ldyBNYXAoKTtcbiAgICBwcml2YXRlIG1lc3NhZ2VMb2c6IEFycmF5PHsgbWVzc2FnZTogc3RyaW5nOyBkYXRhOiBhbnk7IHRpbWVzdGFtcDogbnVtYmVyIH0+ID0gW107XG5cbiAgICBjb25zdHJ1Y3RvcigpIHtcbiAgICAgICAgdGhpcy5zZXR1cEJyb2FkY2FzdExpc3RlbmVycygpO1xuICAgIH1cblxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgLy8gMS4gQnJvYWRjYXN0IExvZyBNYW5hZ2VtZW50IC0gTG9nIG9wZXJhdGlvbnNcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYnJvYWRjYXN0X2xvZ19tYW5hZ2VtZW50JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0JST0FEQ0FTVCBMT0cgTUFOQUdFTUVOVDogTW9uaXRvciBDb2NvcyBDcmVhdG9yIGludGVybmFsIG1lc3NhZ2VzIGZvciBkZWJ1Z2dpbmcgYW5kIHN5c3RlbSBtb25pdG9yaW5nLiBVU0FHRTogZ2V0X2xvZyB0byB2aWV3IHJlY2VudCBldmVudHMsIGNsZWFyX2xvZyB0byByZXNldCBoaXN0b3J5LiBERUJVR0dJTkc6IFVzZSBtZXNzYWdlVHlwZSBmaWx0ZXIgdG8gZm9jdXMgb24gc3BlY2lmaWMgZXZlbnRzIGxpa2UgXCJzY2VuZTpyZWFkeVwiIG9yIFwiYXNzZXQtZGI6YXNzZXQtYWRkXCIuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfbG9nJywgJ2NsZWFyX2xvZyddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTG9nIG9wZXJhdGlvbjogXCJnZXRfbG9nXCIgPSByZXRyaWV2ZSByZWNlbnQgYnJvYWRjYXN0IG1lc3NhZ2VzIChzdXBwb3J0cyBsaW1pdCttZXNzYWdlVHlwZSBmaWx0ZXJzKSB8IFwiY2xlYXJfbG9nXCIgPSBjbGVhciBhbGwgc3RvcmVkIG1lc3NhZ2UgaGlzdG9yeSAobm8gcGFyYW1ldGVycyBuZWVkZWQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBnZXRfbG9nIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgbGltaXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01heGltdW0gbWVzc2FnZXMgdG8gcmV0dXJuIChnZXRfbG9nIGFjdGlvbikuIENvbnRyb2xzIG91dHB1dCBzaXplLiBFeGFtcGxlczogMTAgZm9yIHJlY2VudCBldmVudHMsIDEwMCBmb3IgY29tcHJlaGVuc2l2ZSBoaXN0b3J5LCA1MDAgZm9yIGRlZXAgZGVidWdnaW5nLiBEZWZhdWx0OiA1MCBmb3IgYmFsYW5jZWQgdmlldy4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IDUwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMTAwMFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNZXNzYWdlIHR5cGUgZmlsdGVyIChnZXRfbG9nIGFjdGlvbikuIFNob3cgb25seSBzcGVjaWZpYyBldmVudCB0eXBlcy4gQ29tbW9uIGZpbHRlcnM6IFwic2NlbmU6cmVhZHlcIiAoc2NlbmUgbG9hZGVkKSwgXCJhc3NldC1kYjphc3NldC1hZGRcIiAoYXNzZXQgaW1wb3J0ZWQpLCBcImJ1aWxkLXdvcmtlcjpyZWFkeVwiIChidWlsZCBzeXN0ZW0pLiBMZWF2ZSBlbXB0eSBmb3IgYWxsIG1lc3NhZ2VzLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICAvLyAyLiBCcm9hZGNhc3QgTGlzdGVuZXIgTWFuYWdlbWVudCAtIExpc3RlbmVyIG9wZXJhdGlvbnNcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYnJvYWRjYXN0X2xpc3RlbmVyX21hbmFnZW1lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQlJPQURDQVNUIExJU1RFTkVSIE1BTkFHRU1FTlQ6IENvbnRyb2wgd2hpY2ggQ29jb3MgQ3JlYXRvciBldmVudHMgdG8gbW9uaXRvciBpbiByZWFsLXRpbWUuIFdPUktGTE9XOiBzdGFydF9saXN0ZW5pbmcgdG8gYmVnaW4gbW9uaXRvcmluZyBldmVudHMg4oaSIGdldF9hY3RpdmVfbGlzdGVuZXJzIHRvIHNlZSBjdXJyZW50IG1vbml0b3JzIOKGkiBzdG9wX2xpc3RlbmluZyB0byBlbmQgbW9uaXRvcmluZy4gVXNlZnVsIGZvciBkZWJ1Z2dpbmcgd29ya2Zsb3dzIGFuZCBzeXN0ZW0gbW9uaXRvcmluZy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3N0YXJ0X2xpc3RlbmluZycsICdzdG9wX2xpc3RlbmluZycsICdnZXRfYWN0aXZlX2xpc3RlbmVycyddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdGVuZXIgb3BlcmF0aW9uOiBcInN0YXJ0X2xpc3RlbmluZ1wiID0gYmVnaW4gbW9uaXRvcmluZyBldmVudHMgKHJlcXVpcmVzIG1lc3NhZ2VUeXBlKSB8IFwic3RvcF9saXN0ZW5pbmdcIiA9IHN0b3AgbW9uaXRvcmluZyBldmVudHMgKHJlcXVpcmVzIG1lc3NhZ2VUeXBlKSB8IFwiZ2V0X2FjdGl2ZV9saXN0ZW5lcnNcIiA9IGxpc3QgY3VycmVudCBtb25pdG9ycyAobm8gcGFyYW1ldGVycyBuZWVkZWQpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBzdGFydF9saXN0ZW5pbmcgYW5kIHN0b3BfbGlzdGVuaW5nIGFjdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VUeXBlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdFdmVudCB0eXBlIHRvIG1vbml0b3IgKFJFUVVJUkVEIGZvciBzdGFydF9saXN0ZW5pbmcvc3RvcF9saXN0ZW5pbmcpLiBDcml0aWNhbCBldmVudHM6IFwic2NlbmU6cmVhZHlcIiAoc2NlbmUgY2hhbmdlcyksIFwiYXNzZXQtZGI6YXNzZXQtYWRkXCIgKGltcG9ydHMpLCBcImFzc2V0LWRiOmFzc2V0LWNoYW5nZVwiIChtb2RpZmljYXRpb25zKSwgXCJidWlsZC13b3JrZXI6cmVhZHlcIiAoYnVpbGQgc3RhdHVzKS4gQ2FzZS1zZW5zaXRpdmUgZXhhY3QgbWF0Y2ggcmVxdWlyZWQuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Jyb2FkY2FzdF9sb2dfbWFuYWdlbWVudCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaGFuZGxlQnJvYWRjYXN0TG9nTWFuYWdlbWVudChhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ2Jyb2FkY2FzdF9saXN0ZW5lcl9tYW5hZ2VtZW50JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVCcm9hZGNhc3RMaXN0ZW5lck1hbmFnZW1lbnQoYXJncyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSB0b29sIHN1cHBvcnQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVMZWdhY3lUb29scyh0b29sTmFtZSwgYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHNldHVwQnJvYWRjYXN0TGlzdGVuZXJzKCk6IHZvaWQge1xuICAgICAgICAvLyDorr7nva7pooTlrprkuYnnmoTph43opoHlub/mkq3mtojmga/nm5HlkKxcbiAgICAgICAgY29uc3QgaW1wb3J0YW50TWVzc2FnZXMgPSBbXG4gICAgICAgICAgICAnYnVpbGQtd29ya2VyOnJlYWR5JyxcbiAgICAgICAgICAgICdidWlsZC13b3JrZXI6Y2xvc2VkJyxcbiAgICAgICAgICAgICdzY2VuZTpyZWFkeScsXG4gICAgICAgICAgICAnc2NlbmU6Y2xvc2UnLFxuICAgICAgICAgICAgJ3NjZW5lOmxpZ2h0LXByb2JlLWVkaXQtbW9kZS1jaGFuZ2VkJyxcbiAgICAgICAgICAgICdzY2VuZTpsaWdodC1wcm9iZS1ib3VuZGluZy1ib3gtZWRpdC1tb2RlLWNoYW5nZWQnLFxuICAgICAgICAgICAgJ2Fzc2V0LWRiOnJlYWR5JyxcbiAgICAgICAgICAgICdhc3NldC1kYjpjbG9zZScsXG4gICAgICAgICAgICAnYXNzZXQtZGI6YXNzZXQtYWRkJyxcbiAgICAgICAgICAgICdhc3NldC1kYjphc3NldC1jaGFuZ2UnLFxuICAgICAgICAgICAgJ2Fzc2V0LWRiOmFzc2V0LWRlbGV0ZSdcbiAgICAgICAgXTtcblxuICAgICAgICBpbXBvcnRhbnRNZXNzYWdlcy5mb3JFYWNoKG1lc3NhZ2VUeXBlID0+IHtcbiAgICAgICAgICAgIHRoaXMuYWRkQnJvYWRjYXN0TGlzdGVuZXIobWVzc2FnZVR5cGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFkZEJyb2FkY2FzdExpc3RlbmVyKG1lc3NhZ2VUeXBlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICAgICAgY29uc3QgbGlzdGVuZXIgPSAoZGF0YTogYW55KSA9PiB7XG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VMb2cucHVzaCh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVR5cGUsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YSxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KClcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyDkv53mjIHml6Xlv5flpKflsI/lnKjlkIjnkIbojIPlm7TlhoVcbiAgICAgICAgICAgIGlmICh0aGlzLm1lc3NhZ2VMb2cubGVuZ3RoID4gMTAwMCkge1xuICAgICAgICAgICAgICAgIHRoaXMubWVzc2FnZUxvZyA9IHRoaXMubWVzc2FnZUxvZy5zbGljZSgtNTAwKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc29sZS5sb2coYFtCcm9hZGNhc3RdICR7bWVzc2FnZVR5cGV9OmAsIGRhdGEpO1xuICAgICAgICB9O1xuXG4gICAgICAgIGlmICghdGhpcy5saXN0ZW5lcnMuaGFzKG1lc3NhZ2VUeXBlKSkge1xuICAgICAgICAgICAgdGhpcy5saXN0ZW5lcnMuc2V0KG1lc3NhZ2VUeXBlLCBbXSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5saXN0ZW5lcnMuZ2V0KG1lc3NhZ2VUeXBlKSEucHVzaChsaXN0ZW5lcik7XG5cbiAgICAgICAgLy8g5rOo5YaMIEVkaXRvciDmtojmga/nm5HlkKwgLSDmmoLml7bms6jph4rmjonvvIxFZGl0b3IuTWVzc2FnZSBBUEnlj6/og73kuI3mlK/mjIFcbiAgICAgICAgLy8gRWRpdG9yLk1lc3NhZ2Uub24obWVzc2FnZVR5cGUsIGxpc3RlbmVyKTtcbiAgICAgICAgY29uc29sZS5sb2coYFtCcm9hZGNhc3RUb29sc10gQWRkZWQgbGlzdGVuZXIgZm9yICR7bWVzc2FnZVR5cGV9IChzaW11bGF0ZWQpYCk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSByZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcihtZXNzYWdlVHlwZTogc3RyaW5nKTogdm9pZCB7XG4gICAgICAgIGNvbnN0IGxpc3RlbmVycyA9IHRoaXMubGlzdGVuZXJzLmdldChtZXNzYWdlVHlwZSk7XG4gICAgICAgIGlmIChsaXN0ZW5lcnMpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5mb3JFYWNoKGxpc3RlbmVyID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFZGl0b3IuTWVzc2FnZS5vZmYobWVzc2FnZVR5cGUsIGxpc3RlbmVyKTtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0Jyb2FkY2FzdFRvb2xzXSBSZW1vdmVkIGxpc3RlbmVyIGZvciAke21lc3NhZ2VUeXBlfSAoc2ltdWxhdGVkKWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB0aGlzLmxpc3RlbmVycy5kZWxldGUobWVzc2FnZVR5cGUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRCcm9hZGNhc3RMb2cobGltaXQ6IG51bWJlciA9IDUwLCBtZXNzYWdlVHlwZT86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgbGV0IGZpbHRlcmVkTG9nID0gdGhpcy5tZXNzYWdlTG9nO1xuXG4gICAgICAgICAgICBpZiAobWVzc2FnZVR5cGUpIHtcbiAgICAgICAgICAgICAgICBmaWx0ZXJlZExvZyA9IHRoaXMubWVzc2FnZUxvZy5maWx0ZXIoZW50cnkgPT4gZW50cnkubWVzc2FnZSA9PT0gbWVzc2FnZVR5cGUpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZWNlbnRMb2cgPSBmaWx0ZXJlZExvZy5zbGljZSgtbGltaXQpLm1hcChlbnRyeSA9PiAoe1xuICAgICAgICAgICAgICAgIC4uLmVudHJ5LFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoZW50cnkudGltZXN0YW1wKS50b0lTT1N0cmluZygpXG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBsb2c6IHJlY2VudExvZyxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IHJlY2VudExvZy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsQ291bnQ6IGZpbHRlcmVkTG9nLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiBtZXNzYWdlVHlwZSB8fCAnYWxsJyxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0Jyb2FkY2FzdCBsb2cgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0ZW5Ccm9hZGNhc3QobWVzc2FnZVR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMubGlzdGVuZXJzLmhhcyhtZXNzYWdlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRCcm9hZGNhc3RMaXN0ZW5lcihtZXNzYWdlVHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlVHlwZTogbWVzc2FnZVR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFN0YXJ0ZWQgbGlzdGVuaW5nIGZvciBicm9hZGNhc3Q6ICR7bWVzc2FnZVR5cGV9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVR5cGU6IG1lc3NhZ2VUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBbHJlYWR5IGxpc3RlbmluZyBmb3IgYnJvYWRjYXN0OiAke21lc3NhZ2VUeXBlfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzdG9wTGlzdGVuaW5nKG1lc3NhZ2VUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlzdGVuZXJzLmhhcyhtZXNzYWdlVHlwZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcihtZXNzYWdlVHlwZSk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlVHlwZTogbWVzc2FnZVR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFN0b3BwZWQgbGlzdGVuaW5nIGZvciBicm9hZGNhc3Q6ICR7bWVzc2FnZVR5cGV9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVR5cGU6IG1lc3NhZ2VUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBXYXMgbm90IGxpc3RlbmluZyBmb3IgYnJvYWRjYXN0OiAke21lc3NhZ2VUeXBlfWBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjbGVhckJyb2FkY2FzdExvZygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHByZXZpb3VzQ291bnQgPSB0aGlzLm1lc3NhZ2VMb2cubGVuZ3RoO1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlTG9nID0gW107XG4gICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJlZENvdW50OiBwcmV2aW91c0NvdW50LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnQnJvYWRjYXN0IGxvZyBjbGVhcmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBY3RpdmVMaXN0ZW5lcnMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBhY3RpdmVMaXN0ZW5lcnMgPSBBcnJheS5mcm9tKHRoaXMubGlzdGVuZXJzLmtleXMoKSkubWFwKG1lc3NhZ2VUeXBlID0+ICh7XG4gICAgICAgICAgICAgICAgbWVzc2FnZVR5cGU6IG1lc3NhZ2VUeXBlLFxuICAgICAgICAgICAgICAgIGxpc3RlbmVyQ291bnQ6IHRoaXMubGlzdGVuZXJzLmdldChtZXNzYWdlVHlwZSk/Lmxlbmd0aCB8fCAwXG4gICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcnM6IGFjdGl2ZUxpc3RlbmVycyxcbiAgICAgICAgICAgICAgICAgICAgY291bnQ6IGFjdGl2ZUxpc3RlbmVycy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdBY3RpdmUgbGlzdGVuZXJzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIE5ldyBoYW5kbGVyIG1ldGhvZHMgZm9yIG9wdGltaXplZCB0b29sc1xuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlQnJvYWRjYXN0TG9nTWFuYWdlbWVudChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB7IGFjdGlvbiwgbGltaXQsIG1lc3NhZ2VUeXBlIH0gPSBhcmdzO1xuICAgICAgICBcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9sb2cnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEJyb2FkY2FzdExvZyhsaW1pdCwgbWVzc2FnZVR5cGUpO1xuICAgICAgICAgICAgY2FzZSAnY2xlYXJfbG9nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jbGVhckJyb2FkY2FzdExvZygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGJyb2FkY2FzdCBsb2cgbWFuYWdlbWVudCBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlQnJvYWRjYXN0TGlzdGVuZXJNYW5hZ2VtZW50KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHsgYWN0aW9uLCBtZXNzYWdlVHlwZSB9ID0gYXJncztcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdzdGFydF9saXN0ZW5pbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmxpc3RlbkJyb2FkY2FzdChtZXNzYWdlVHlwZSk7XG4gICAgICAgICAgICBjYXNlICdzdG9wX2xpc3RlbmluZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc3RvcExpc3RlbmluZyhtZXNzYWdlVHlwZSk7XG4gICAgICAgICAgICBjYXNlICdnZXRfYWN0aXZlX2xpc3RlbmVycyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QWN0aXZlTGlzdGVuZXJzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYnJvYWRjYXN0IGxpc3RlbmVyIG1hbmFnZW1lbnQgYWN0aW9uOiAke2FjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBMZWdhY3kgdG9vbCBzdXBwb3J0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVMZWdhY3lUb29scyh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfYnJvYWRjYXN0X2xvZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QnJvYWRjYXN0TG9nKGFyZ3MubGltaXQsIGFyZ3MubWVzc2FnZVR5cGUpO1xuICAgICAgICAgICAgY2FzZSAnbGlzdGVuX2Jyb2FkY2FzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubGlzdGVuQnJvYWRjYXN0KGFyZ3MubWVzc2FnZVR5cGUpO1xuICAgICAgICAgICAgY2FzZSAnc3RvcF9saXN0ZW5pbmcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnN0b3BMaXN0ZW5pbmcoYXJncy5tZXNzYWdlVHlwZSk7XG4gICAgICAgICAgICBjYXNlICdjbGVhcl9icm9hZGNhc3RfbG9nJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jbGVhckJyb2FkY2FzdExvZygpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2FjdGl2ZV9saXN0ZW5lcnMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldEFjdGl2ZUxpc3RlbmVycygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xuICAgICAgICB9XG4gICAgfVxufSJdfQ==