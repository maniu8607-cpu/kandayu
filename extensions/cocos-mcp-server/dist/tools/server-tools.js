"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerTools = void 0;
class ServerTools {
    getTools() {
        return [
            // 1. Server Information Management - Basic server info
            {
                name: 'server_information',
                description: 'SERVER INFORMATION: Get Cocos Creator editor server network details and status. USAGE: Essential for network configuration, debugging connection issues, and understanding server setup. Use "get_ip_list" to see available network interfaces, "get_port" for current server port.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_ip_list', 'get_sorted_ip_list', 'get_port', 'get_comprehensive_status'],
                            description: 'Information query: "get_ip_list" = all available network IP addresses | "get_sorted_ip_list" = IPs sorted by priority/type | "get_port" = current editor server port number | "get_comprehensive_status" = complete server status with IPs, port, and system info'
                        }
                    },
                    required: ['action']
                }
            },
            // 2. Server Connectivity Testing - Network and connectivity
            {
                name: 'server_connectivity',
                description: 'SERVER CONNECTIVITY: Test and diagnose network connectivity for the Cocos Creator editor server. USAGE: "test_connectivity" to verify server accessibility with custom timeout, "get_network_interfaces" for detailed network adapter information. Critical for troubleshooting connection problems.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['test_connectivity', 'get_network_interfaces'],
                            description: 'Connectivity operation: "test_connectivity" = verify server connection and response time (optional timeout parameter) | "get_network_interfaces" = detailed network adapter and interface information (no parameters needed)'
                        },
                        timeout: {
                            type: 'number',
                            description: 'Connection timeout duration (test_connectivity action). Milliseconds to wait for server response. Examples: 1000 for quick test, 5000 for standard check, 10000 for slow networks. Default: 5000ms provides good balance between speed and reliability.',
                            default: 5000,
                            minimum: 1000,
                            maximum: 30000
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'server_information':
                return await this.handleServerInformation(args);
            case 'server_connectivity':
                return await this.handleServerConnectivity(args);
            default:
                // Legacy tool support for backward compatibility
                return await this.handleLegacyTools(toolName, args);
        }
    }
    async queryServerIPList() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-ip-list').then((ipList) => {
                resolve({
                    success: true,
                    data: {
                        ipList: ipList,
                        count: ipList.length,
                        message: 'IP list retrieved successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async querySortedServerIPList() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-sort-ip-list').then((sortedIPList) => {
                resolve({
                    success: true,
                    data: {
                        sortedIPList: sortedIPList,
                        count: sortedIPList.length,
                        message: 'Sorted IP list retrieved successfully'
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryServerPort() {
        return new Promise((resolve) => {
            Editor.Message.request('server', 'query-port').then((port) => {
                resolve({
                    success: true,
                    data: {
                        port: port,
                        message: `Editor server is running on port ${port}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getServerStatus() {
        return new Promise(async (resolve) => {
            var _a;
            try {
                // Gather comprehensive server information
                const [ipListResult, portResult] = await Promise.allSettled([
                    this.queryServerIPList(),
                    this.queryServerPort()
                ]);
                const status = {
                    timestamp: new Date().toISOString(),
                    serverRunning: true
                };
                if (ipListResult.status === 'fulfilled' && ipListResult.value.success) {
                    status.availableIPs = ipListResult.value.data.ipList;
                    status.ipCount = ipListResult.value.data.count;
                }
                else {
                    status.availableIPs = [];
                    status.ipCount = 0;
                    status.ipError = ipListResult.status === 'rejected' ? ipListResult.reason : ipListResult.value.error;
                }
                if (portResult.status === 'fulfilled' && portResult.value.success) {
                    status.port = portResult.value.data.port;
                }
                else {
                    status.port = null;
                    status.portError = portResult.status === 'rejected' ? portResult.reason : portResult.value.error;
                }
                // Add additional server info
                status.mcpServerPort = 3000; // Our MCP server port
                status.editorVersion = ((_a = Editor.versions) === null || _a === void 0 ? void 0 : _a.cocos) || 'Unknown';
                status.platform = process.platform;
                status.nodeVersion = process.version;
                resolve({
                    success: true,
                    data: status
                });
            }
            catch (err) {
                resolve({
                    success: false,
                    error: `Failed to get server status: ${err.message}`
                });
            }
        });
    }
    async checkServerConnectivity(timeout = 5000) {
        return new Promise(async (resolve) => {
            const startTime = Date.now();
            try {
                // Test basic Editor API connectivity
                const testPromise = Editor.Message.request('server', 'query-port');
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Connection timeout')), timeout);
                });
                await Promise.race([testPromise, timeoutPromise]);
                const responseTime = Date.now() - startTime;
                resolve({
                    success: true,
                    data: {
                        connected: true,
                        responseTime: responseTime,
                        timeout: timeout,
                        message: `Server connectivity confirmed in ${responseTime}ms`
                    }
                });
            }
            catch (err) {
                const responseTime = Date.now() - startTime;
                resolve({
                    success: false,
                    data: {
                        connected: false,
                        responseTime: responseTime,
                        timeout: timeout,
                        error: err.message
                    }
                });
            }
        });
    }
    async getNetworkInterfaces() {
        return new Promise(async (resolve) => {
            try {
                // Get network interfaces using Node.js os module
                const os = require('os');
                const interfaces = os.networkInterfaces();
                const networkInfo = Object.entries(interfaces).map(([name, addresses]) => ({
                    name: name,
                    addresses: addresses.map((addr) => ({
                        address: addr.address,
                        family: addr.family,
                        internal: addr.internal,
                        cidr: addr.cidr
                    }))
                }));
                // Also try to get server IPs for comparison
                const serverIPResult = await this.queryServerIPList();
                resolve({
                    success: true,
                    data: {
                        networkInterfaces: networkInfo,
                        serverAvailableIPs: serverIPResult.success ? serverIPResult.data.ipList : [],
                        message: 'Network interfaces retrieved successfully'
                    }
                });
            }
            catch (err) {
                resolve({
                    success: false,
                    error: `Failed to get network interfaces: ${err.message}`
                });
            }
        });
    }
    // New handler methods for optimized tools
    async handleServerInformation(args) {
        const { action } = args;
        switch (action) {
            case 'get_ip_list':
                return await this.queryServerIPList();
            case 'get_sorted_ip_list':
                return await this.querySortedServerIPList();
            case 'get_port':
                return await this.queryServerPort();
            case 'get_comprehensive_status':
                return await this.getServerStatus();
            default:
                return { success: false, error: `Unknown server information action: ${action}` };
        }
    }
    async handleServerConnectivity(args) {
        const { action, timeout } = args;
        switch (action) {
            case 'test_connectivity':
                return await this.checkServerConnectivity(timeout);
            case 'get_network_interfaces':
                return await this.getNetworkInterfaces();
            default:
                return { success: false, error: `Unknown server connectivity action: ${action}` };
        }
    }
    // Legacy tool support for backward compatibility
    async handleLegacyTools(toolName, args) {
        switch (toolName) {
            case 'query_server_ip_list':
                return await this.queryServerIPList();
            case 'query_sorted_server_ip_list':
                return await this.querySortedServerIPList();
            case 'query_server_port':
                return await this.queryServerPort();
            case 'get_server_status':
                return await this.getServerStatus();
            case 'check_server_connectivity':
                return await this.checkServerConnectivity(args.timeout);
            case 'get_network_interfaces':
                return await this.getNetworkInterfaces();
            default:
                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    }
}
exports.ServerTools = ServerTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3NlcnZlci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLFdBQVc7SUFDcEIsUUFBUTtRQUNKLE9BQU87WUFDSCx1REFBdUQ7WUFDdkQ7Z0JBQ0ksSUFBSSxFQUFFLG9CQUFvQjtnQkFDMUIsV0FBVyxFQUFFLHFSQUFxUjtnQkFDbFMsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixNQUFNLEVBQUU7NEJBQ0osSUFBSSxFQUFFLFFBQVE7NEJBQ2QsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFFLG9CQUFvQixFQUFFLFVBQVUsRUFBRSwwQkFBMEIsQ0FBQzs0QkFDbkYsV0FBVyxFQUFFLG1RQUFtUTt5QkFDblI7cUJBQ0o7b0JBQ0QsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDO2lCQUN2QjthQUNKO1lBRUQsNERBQTREO1lBQzVEO2dCQUNJLElBQUksRUFBRSxxQkFBcUI7Z0JBQzNCLFdBQVcsRUFBRSxzU0FBc1M7Z0JBQ25ULFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLG1CQUFtQixFQUFFLHdCQUF3QixDQUFDOzRCQUNyRCxXQUFXLEVBQUUsOE5BQThOO3lCQUM5Tzt3QkFDRCxPQUFPLEVBQUU7NEJBQ0wsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLHlQQUF5UDs0QkFDdFEsT0FBTyxFQUFFLElBQUk7NEJBQ2IsT0FBTyxFQUFFLElBQUk7NEJBQ2IsT0FBTyxFQUFFLEtBQUs7eUJBQ2pCO3FCQUNKO29CQUNELFFBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQztpQkFDdkI7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lB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QVEsUUFBUSxFQUFFLENBQUM7WUFDZixLQUFLLHNCQUFzQjtnQkFDdkIsT0FBTyxNQUFNLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBQzFDLEtBQUssNkJBQTZCO2dCQUM5QixPQUFPLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDaEQsS0FBSyxtQkFBbUI7Z0JBQ3BCLE9BQU8sTUFBTSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDeEMsS0FBSyxtQkFBbUI7Z0JBQ3BCLE9BQU8sTUFBTSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDeEMsS0FBSywyQkFBMkI7Z0JBQzVCLE9BQU8sTUFBTSxJQUFJLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVELEtBQUssd0JBQXdCO2dCQUN6QixPQUFPLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDN0M7Z0JBQ0ksT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ3RFLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUEvUkQsa0NBK1JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgU2VydmVyVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgLy8gMS4gU2VydmVyIEluZm9ybWF0aW9uIE1hbmFnZW1lbnQgLSBCYXNpYyBzZXJ2ZXIgaW5mb1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXJ2ZXJfaW5mb3JtYXRpb24nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU0VSVkVSIElORk9STUFUSU9OOiBHZXQgQ29jb3MgQ3JlYXRvciBlZGl0b3Igc2VydmVyIG5ldHdvcmsgZGV0YWlscyBhbmQgc3RhdHVzLiBVU0FHRTogRXNzZW50aWFsIGZvciBuZXR3b3JrIGNvbmZpZ3VyYXRpb24sIGRlYnVnZ2luZyBjb25uZWN0aW9uIGlzc3VlcywgYW5kIHVuZGVyc3RhbmRpbmcgc2VydmVyIHNldHVwLiBVc2UgXCJnZXRfaXBfbGlzdFwiIHRvIHNlZSBhdmFpbGFibGUgbmV0d29yayBpbnRlcmZhY2VzLCBcImdldF9wb3J0XCIgZm9yIGN1cnJlbnQgc2VydmVyIHBvcnQuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfaXBfbGlzdCcsICdnZXRfc29ydGVkX2lwX2xpc3QnLCAnZ2V0X3BvcnQnLCAnZ2V0X2NvbXByZWhlbnNpdmVfc3RhdHVzJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbmZvcm1hdGlvbiBxdWVyeTogXCJnZXRfaXBfbGlzdFwiID0gYWxsIGF2YWlsYWJsZSBuZXR3b3JrIElQIGFkZHJlc3NlcyB8IFwiZ2V0X3NvcnRlZF9pcF9saXN0XCIgPSBJUHMgc29ydGVkIGJ5IHByaW9yaXR5L3R5cGUgfCBcImdldF9wb3J0XCIgPSBjdXJyZW50IGVkaXRvciBzZXJ2ZXIgcG9ydCBudW1iZXIgfCBcImdldF9jb21wcmVoZW5zaXZlX3N0YXR1c1wiID0gY29tcGxldGUgc2VydmVyIHN0YXR1cyB3aXRoIElQcywgcG9ydCwgYW5kIHN5c3RlbSBpbmZvJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIDIuIFNlcnZlciBDb25uZWN0aXZpdHkgVGVzdGluZyAtIE5ldHdvcmsgYW5kIGNvbm5lY3Rpdml0eVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXJ2ZXJfY29ubmVjdGl2aXR5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NFUlZFUiBDT05ORUNUSVZJVFk6IFRlc3QgYW5kIGRpYWdub3NlIG5ldHdvcmsgY29ubmVjdGl2aXR5IGZvciB0aGUgQ29jb3MgQ3JlYXRvciBlZGl0b3Igc2VydmVyLiBVU0FHRTogXCJ0ZXN0X2Nvbm5lY3Rpdml0eVwiIHRvIHZlcmlmeSBzZXJ2ZXIgYWNjZXNzaWJpbGl0eSB3aXRoIGN1c3RvbSB0aW1lb3V0LCBcImdldF9uZXR3b3JrX2ludGVyZmFjZXNcIiBmb3IgZGV0YWlsZWQgbmV0d29yayBhZGFwdGVyIGluZm9ybWF0aW9uLiBDcml0aWNhbCBmb3IgdHJvdWJsZXNob290aW5nIGNvbm5lY3Rpb24gcHJvYmxlbXMuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWyd0ZXN0X2Nvbm5lY3Rpdml0eScsICdnZXRfbmV0d29ya19pbnRlcmZhY2VzJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25uZWN0aXZpdHkgb3BlcmF0aW9uOiBcInRlc3RfY29ubmVjdGl2aXR5XCIgPSB2ZXJpZnkgc2VydmVyIGNvbm5lY3Rpb24gYW5kIHJlc3BvbnNlIHRpbWUgKG9wdGlvbmFsIHRpbWVvdXQgcGFyYW1ldGVyKSB8IFwiZ2V0X25ldHdvcmtfaW50ZXJmYWNlc1wiID0gZGV0YWlsZWQgbmV0d29yayBhZGFwdGVyIGFuZCBpbnRlcmZhY2UgaW5mb3JtYXRpb24gKG5vIHBhcmFtZXRlcnMgbmVlZGVkKSdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0aW1lb3V0OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25uZWN0aW9uIHRpbWVvdXQgZHVyYXRpb24gKHRlc3RfY29ubmVjdGl2aXR5IGFjdGlvbikuIE1pbGxpc2Vjb25kcyB0byB3YWl0IGZvciBzZXJ2ZXIgcmVzcG9uc2UuIEV4YW1wbGVzOiAxMDAwIGZvciBxdWljayB0ZXN0LCA1MDAwIGZvciBzdGFuZGFyZCBjaGVjaywgMTAwMDAgZm9yIHNsb3cgbmV0d29ya3MuIERlZmF1bHQ6IDUwMDBtcyBwcm92aWRlcyBnb29kIGJhbGFuY2UgYmV0d2VlbiBzcGVlZCBhbmQgcmVsaWFiaWxpdHkuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiA1MDAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1pbmltdW06IDEwMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMzAwMDBcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdzZXJ2ZXJfaW5mb3JtYXRpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmhhbmRsZVNlcnZlckluZm9ybWF0aW9uKGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAnc2VydmVyX2Nvbm5lY3Rpdml0eSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaGFuZGxlU2VydmVyQ29ubmVjdGl2aXR5KGFyZ3MpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBMZWdhY3kgdG9vbCBzdXBwb3J0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuaGFuZGxlTGVnYWN5VG9vbHModG9vbE5hbWUsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNlcnZlcklQTGlzdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NlcnZlcicsICdxdWVyeS1pcC1saXN0JykudGhlbigoaXBMaXN0OiBzdHJpbmdbXSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpcExpc3Q6IGlwTGlzdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50OiBpcExpc3QubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ0lQIGxpc3QgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5U29ydGVkU2VydmVySVBMaXN0KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LXNvcnQtaXAtbGlzdCcpLnRoZW4oKHNvcnRlZElQTGlzdDogc3RyaW5nW10pID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ydGVkSVBMaXN0OiBzb3J0ZWRJUExpc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogc29ydGVkSVBMaXN0Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTb3J0ZWQgSVAgbGlzdCByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlTZXJ2ZXJQb3J0KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LXBvcnQnKS50aGVuKChwb3J0OiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogcG9ydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBFZGl0b3Igc2VydmVyIGlzIHJ1bm5pbmcgb24gcG9ydCAke3BvcnR9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U2VydmVyU3RhdHVzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAvLyBHYXRoZXIgY29tcHJlaGVuc2l2ZSBzZXJ2ZXIgaW5mb3JtYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBbaXBMaXN0UmVzdWx0LCBwb3J0UmVzdWx0XSA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChbXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucXVlcnlTZXJ2ZXJJUExpc3QoKSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5xdWVyeVNlcnZlclBvcnQoKVxuICAgICAgICAgICAgICAgIF0pO1xuXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzOiBhbnkgPSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJSdW5uaW5nOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIGlmIChpcExpc3RSZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJyAmJiBpcExpc3RSZXN1bHQudmFsdWUuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuYXZhaWxhYmxlSVBzID0gaXBMaXN0UmVzdWx0LnZhbHVlLmRhdGEuaXBMaXN0O1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuaXBDb3VudCA9IGlwTGlzdFJlc3VsdC52YWx1ZS5kYXRhLmNvdW50O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5hdmFpbGFibGVJUHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmlwQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuaXBFcnJvciA9IGlwTGlzdFJlc3VsdC5zdGF0dXMgPT09ICdyZWplY3RlZCcgPyBpcExpc3RSZXN1bHQucmVhc29uIDogaXBMaXN0UmVzdWx0LnZhbHVlLmVycm9yO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGlmIChwb3J0UmVzdWx0LnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcgJiYgcG9ydFJlc3VsdC52YWx1ZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5wb3J0ID0gcG9ydFJlc3VsdC52YWx1ZS5kYXRhLnBvcnQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLnBvcnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMucG9ydEVycm9yID0gcG9ydFJlc3VsdC5zdGF0dXMgPT09ICdyZWplY3RlZCcgPyBwb3J0UmVzdWx0LnJlYXNvbiA6IHBvcnRSZXN1bHQudmFsdWUuZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGFkZGl0aW9uYWwgc2VydmVyIGluZm9cbiAgICAgICAgICAgICAgICBzdGF0dXMubWNwU2VydmVyUG9ydCA9IDMwMDA7IC8vIE91ciBNQ1Agc2VydmVyIHBvcnRcbiAgICAgICAgICAgICAgICBzdGF0dXMuZWRpdG9yVmVyc2lvbiA9IChFZGl0b3IgYXMgYW55KS52ZXJzaW9ucz8uY29jb3MgfHwgJ1Vua25vd24nO1xuICAgICAgICAgICAgICAgIHN0YXR1cy5wbGF0Zm9ybSA9IHByb2Nlc3MucGxhdGZvcm07XG4gICAgICAgICAgICAgICAgc3RhdHVzLm5vZGVWZXJzaW9uID0gcHJvY2Vzcy52ZXJzaW9uO1xuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHN0YXR1c1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gZ2V0IHNlcnZlciBzdGF0dXM6ICR7ZXJyLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNoZWNrU2VydmVyQ29ubmVjdGl2aXR5KHRpbWVvdXQ6IG51bWJlciA9IDUwMDApOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gVGVzdCBiYXNpYyBFZGl0b3IgQVBJIGNvbm5lY3Rpdml0eVxuICAgICAgICAgICAgICAgIGNvbnN0IHRlc3RQcm9taXNlID0gRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LXBvcnQnKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0aW1lb3V0UHJvbWlzZSA9IG5ldyBQcm9taXNlKChfLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKCdDb25uZWN0aW9uIHRpbWVvdXQnKSksIHRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5yYWNlKFt0ZXN0UHJvbWlzZSwgdGltZW91dFByb21pc2VdKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZVRpbWU6IHJlc3BvbnNlVGltZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVvdXQ6IHRpbWVvdXQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2VydmVyIGNvbm5lY3Rpdml0eSBjb25maXJtZWQgaW4gJHtyZXNwb25zZVRpbWV9bXNgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlVGltZTogcmVzcG9uc2VUaW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogdGltZW91dCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnIubWVzc2FnZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0TmV0d29ya0ludGVyZmFjZXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIEdldCBuZXR3b3JrIGludGVyZmFjZXMgdXNpbmcgTm9kZS5qcyBvcyBtb2R1bGVcbiAgICAgICAgICAgICAgICBjb25zdCBvcyA9IHJlcXVpcmUoJ29zJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlcyA9IG9zLm5ldHdvcmtJbnRlcmZhY2VzKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgbmV0d29ya0luZm8gPSBPYmplY3QuZW50cmllcyhpbnRlcmZhY2VzKS5tYXAoKFtuYW1lLCBhZGRyZXNzZXNdOiBbc3RyaW5nLCBhbnldKSA9PiAoe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICAgICAgICBhZGRyZXNzZXM6IGFkZHJlc3Nlcy5tYXAoKGFkZHI6IGFueSkgPT4gKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3M6IGFkZHIuYWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZhbWlseTogYWRkci5mYW1pbHksXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcm5hbDogYWRkci5pbnRlcm5hbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNpZHI6IGFkZHIuY2lkclxuICAgICAgICAgICAgICAgICAgICB9KSlcbiAgICAgICAgICAgICAgICB9KSk7XG5cbiAgICAgICAgICAgICAgICAvLyBBbHNvIHRyeSB0byBnZXQgc2VydmVyIElQcyBmb3IgY29tcGFyaXNvblxuICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZlcklQUmVzdWx0ID0gYXdhaXQgdGhpcy5xdWVyeVNlcnZlcklQTGlzdCgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXR3b3JrSW50ZXJmYWNlczogbmV0d29ya0luZm8sXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJBdmFpbGFibGVJUHM6IHNlcnZlcklQUmVzdWx0LnN1Y2Nlc3MgPyBzZXJ2ZXJJUFJlc3VsdC5kYXRhLmlwTGlzdCA6IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ05ldHdvcmsgaW50ZXJmYWNlcyByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBnZXQgbmV0d29yayBpbnRlcmZhY2VzOiAke2Vyci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gTmV3IGhhbmRsZXIgbWV0aG9kcyBmb3Igb3B0aW1pemVkIHRvb2xzXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTZXJ2ZXJJbmZvcm1hdGlvbihhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB7IGFjdGlvbiB9ID0gYXJncztcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdnZXRfaXBfbGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTZXJ2ZXJJUExpc3QoKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9zb3J0ZWRfaXBfbGlzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTb3J0ZWRTZXJ2ZXJJUExpc3QoKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9wb3J0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVNlcnZlclBvcnQoKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9jb21wcmVoZW5zaXZlX3N0YXR1cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U2VydmVyU3RhdHVzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gc2VydmVyIGluZm9ybWF0aW9uIGFjdGlvbjogJHthY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVTZXJ2ZXJDb25uZWN0aXZpdHkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24sIHRpbWVvdXQgfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAndGVzdF9jb25uZWN0aXZpdHknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoZWNrU2VydmVyQ29ubmVjdGl2aXR5KHRpbWVvdXQpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X25ldHdvcmtfaW50ZXJmYWNlcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0TmV0d29ya0ludGVyZmFjZXMoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBzZXJ2ZXIgY29ubmVjdGl2aXR5IGFjdGlvbjogJHthY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTGVnYWN5IHRvb2wgc3VwcG9ydCBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTGVnYWN5VG9vbHModG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAncXVlcnlfc2VydmVyX2lwX2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U2VydmVySVBMaXN0KCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9zb3J0ZWRfc2VydmVyX2lwX2xpc3QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5U29ydGVkU2VydmVySVBMaXN0KCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9zZXJ2ZXJfcG9ydCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlTZXJ2ZXJQb3J0KCk7XG4gICAgICAgICAgICBjYXNlICdnZXRfc2VydmVyX3N0YXR1cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U2VydmVyU3RhdHVzKCk7XG4gICAgICAgICAgICBjYXNlICdjaGVja19zZXJ2ZXJfY29ubmVjdGl2aXR5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jaGVja1NlcnZlckNvbm5lY3Rpdml0eShhcmdzLnRpbWVvdXQpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X25ldHdvcmtfaW50ZXJmYWNlcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0TmV0d29ya0ludGVyZmFjZXMoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWAgfTtcbiAgICAgICAgfVxuICAgIH1cbn0iXX0=