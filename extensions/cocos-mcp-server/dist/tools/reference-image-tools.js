"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferenceImageTools = void 0;
class ReferenceImageTools {
    getTools() {
        return [
            // 1. Reference Image Management - Basic operations
            {
                name: 'reference_image_management',
                description: 'REFERENCE IMAGE MANAGEMENT: Manage overlay reference images in the scene editor for design guidance. WORKFLOW: "add" images from file paths → "switch" between multiple references → "remove" when no longer needed OR "clear_all" to reset. Essential for UI design and scene layout matching.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['add', 'remove', 'switch', 'clear_all'],
                            description: 'Management operation: "add" = add reference images from file paths (requires paths array) | "remove" = remove specific images (requires removePaths array) | "switch" = change active reference (requires path) | "clear_all" = remove all references (no parameters)'
                        },
                        // For add action
                        paths: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Image file paths to add (REQUIRED for add action). Array of absolute paths to image files. Supported formats: PNG, JPG, JPEG, GIF. Examples: ["/Users/username/Desktop/mockup.png", "/path/to/ui-design.jpg"]. Files must exist and be readable.'
                        },
                        // For remove action
                        removePaths: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Image paths to remove (remove action). Array of absolute paths matching previously added images. If empty array [], removes current active reference. Examples: ["/path/to/old-mockup.png"]. Use exact paths from previous add operations.'
                        },
                        // For switch action
                        path: {
                            type: 'string',
                            description: 'Target reference image path (REQUIRED for switch action). Absolute path to previously added reference image. Must match exactly with previously added image path. Example: "/Users/username/Desktop/design-mockup.png".'
                        },
                        sceneUUID: {
                            type: 'string',
                            description: 'Scene UUID for switch operation (switch action, optional). Specifies which scene to switch reference in. If omitted, uses current active scene. Format: "12345678-abcd-1234-5678-123456789abc". Rarely needed unless working with multiple scenes.'
                        }
                    },
                    required: ['action']
                }
            },
            // 2. Reference Image Query - Get information
            {
                name: 'reference_image_query',
                description: 'REFERENCE IMAGE QUERY: Inspect current reference image state and configuration. USAGE: "get_config" for system settings, "get_current" for active image details, "list_all" for inventory of added images. Essential for understanding current reference setup and debugging display issues.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_config', 'get_current', 'list_all'],
                            description: 'Query operation: "get_config" = system configuration and settings | "get_current" = active reference image details (path, position, scale, opacity) | "list_all" = complete inventory of added reference images'
                        }
                    },
                    required: ['action']
                }
            },
            // 3. Reference Image Transform - Position, scale, opacity
            {
                name: 'reference_image_transform',
                description: 'REFERENCE IMAGE TRANSFORM: Adjust reference image display properties for better design alignment. USAGE: Fine-tune position, scale, and opacity to overlay images properly with scene content. Essential for precise UI design matching and layout guidance.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['set_position', 'set_scale', 'set_opacity', 'set_data'],
                            description: 'Transform operation: "set_position" = adjust image position (requires x, y) | "set_scale" = resize image (requires sx, sy) | "set_opacity" = change transparency (requires opacity) | "set_data" = modify any property (requires key, value)'
                        },
                        // For set_position action
                        x: {
                            type: 'number',
                            description: 'Horizontal position offset (REQUIRED for set_position). Pixels from center. Positive = right, negative = left. Examples: 100 moves right, -50 moves left. Use for precise image alignment with scene elements.'
                        },
                        y: {
                            type: 'number',
                            description: 'Vertical position offset (REQUIRED for set_position). Pixels from center. Positive = up, negative = down. Examples: 200 moves up, -100 moves down. Coordinate system follows Cocos Creator convention.'
                        },
                        // For set_scale action
                        sx: {
                            type: 'number',
                            description: 'Horizontal scale multiplier (REQUIRED for set_scale). Range: 0.1-10.0. 1.0 = original size, 0.5 = half size, 2.0 = double size. Examples: 0.8 for smaller overlay, 1.2 for slightly larger reference.',
                            minimum: 0.1,
                            maximum: 10
                        },
                        sy: {
                            type: 'number',
                            description: 'Vertical scale multiplier (REQUIRED for set_scale). Range: 0.1-10.0. 1.0 = original size, 0.5 = half size, 2.0 = double size. Usually matches sx for proportional scaling. Set different values for aspect ratio adjustment.',
                            minimum: 0.1,
                            maximum: 10
                        },
                        // For set_opacity action
                        opacity: {
                            type: 'number',
                            description: 'Transparency level (REQUIRED for set_opacity). Range: 0.0-1.0. 0.0 = invisible, 1.0 = fully opaque, 0.5 = semi-transparent. Recommended: 0.3-0.7 for subtle overlay, 0.8-1.0 for clear reference.',
                            minimum: 0,
                            maximum: 1
                        },
                        // For set_data action
                        key: {
                            type: 'string',
                            description: 'Property name to modify (REQUIRED for set_data). Available keys: "path" (image file), "x" (horizontal position), "y" (vertical position), "sx" (horizontal scale), "sy" (vertical scale), "opacity" (transparency). Use for programmatic property updates.',
                            enum: ['path', 'x', 'y', 'sx', 'sy', 'opacity']
                        },
                        value: {
                            description: 'Property value to assign (REQUIRED for set_data). Type varies by key: string for "path" (file path), number for position/scale/opacity. Examples: "/new/path.png" for path, 150 for x/y, 1.5 for sx/sy, 0.7 for opacity.'
                        }
                    },
                    required: ['action']
                }
            },
            // 4. Reference Image Display - Refresh and utilities
            {
                name: 'reference_image_display',
                description: 'REFERENCE IMAGE DISPLAY: Update and refresh reference image rendering in the scene view. USAGE: "refresh" to force display update after changes or when images appear corrupted. Use when reference images don\'t display correctly or after system changes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['refresh'],
                            description: 'Display operation: "refresh" = force update reference image rendering and visibility (no parameters needed). Use when images don\'t appear or display incorrectly.'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'reference_image_management':
                return await this.handleImageManagement(args);
            case 'reference_image_query':
                return await this.handleImageQuery(args);
            case 'reference_image_transform':
                return await this.handleImageTransform(args);
            case 'reference_image_display':
                return await this.handleImageDisplay(args);
            default:
                // Legacy tool support for backward compatibility
                return await this.handleLegacyTools(toolName, args);
        }
    }
    async addReferenceImage(paths) {
        return new Promise((resolve) => {
            // 验证路径格式
            const invalidPaths = paths.filter(path => !path || typeof path !== 'string');
            if (invalidPaths.length > 0) {
                resolve({
                    success: false,
                    error: `Invalid paths provided: ${invalidPaths.join(', ')}`
                });
                return;
            }
            Editor.Message.request('reference-image', 'add-image', paths).then(() => {
                resolve({
                    success: true,
                    data: {
                        addedPaths: paths,
                        count: paths.length,
                        message: `Added ${paths.length} reference image(s)`
                    }
                });
            }).catch((err) => {
                // 增强错误信息
                let errorMessage = err.message;
                if (err.message.includes('not found') || err.message.includes('not exist')) {
                    errorMessage = `Image file not found: ${paths.join(', ')}. Please check if the file exists and the path is correct.`;
                }
                else if (err.message.includes('permission')) {
                    errorMessage = `Permission denied accessing image files: ${paths.join(', ')}. Please check file permissions.`;
                }
                else if (err.message.includes('format')) {
                    errorMessage = `Unsupported image format: ${paths.join(', ')}. Please use supported formats (PNG, JPG, JPEG).`;
                }
                resolve({
                    success: false,
                    error: errorMessage,
                    data: {
                        failedPaths: paths,
                        suggestion: 'Please verify the image paths and file existence.'
                    }
                });
            });
        });
    }
    async removeReferenceImage(paths) {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'remove-image', paths).then(() => {
                const message = paths && paths.length > 0 ?
                    `Removed ${paths.length} reference image(s)` :
                    'Removed current reference image';
                resolve({
                    success: true,
                    message: message
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async switchReferenceImage(path, sceneUUID) {
        return new Promise((resolve) => {
            // 验证路径格式
            if (!path || typeof path !== 'string') {
                resolve({
                    success: false,
                    error: 'Invalid image path provided. Please provide a valid file path.'
                });
                return;
            }
            const args = sceneUUID ? [path, sceneUUID] : [path];
            Editor.Message.request('reference-image', 'switch-image', ...args).then((result) => {
                var _a, _b;
                // 检查是否有警告信息
                const hasWarning = result && (result.warning || ((_a = result.message) === null || _a === void 0 ? void 0 : _a.includes('blank')) || ((_b = result.message) === null || _b === void 0 ? void 0 : _b.includes('not found')));
                resolve({
                    success: true,
                    data: {
                        path: path,
                        sceneUUID: sceneUUID,
                        message: `Switched to reference image: ${path}`,
                        warning: hasWarning ? 'Image may be blank or not found. Please verify the image file exists.' : undefined
                    },
                    warning: hasWarning ? 'Image may be blank or not found. Please verify the image file exists.' : undefined
                });
            }).catch((err) => {
                let errorMessage = err.message;
                if (err.message.includes('not found') || err.message.includes('not exist')) {
                    errorMessage = `Image file not found: ${path}. Please check if the file exists and the path is correct.`;
                }
                else if (err.message.includes('permission')) {
                    errorMessage = `Permission denied accessing image file: ${path}. Please check file permissions.`;
                }
                else if (err.message.includes('format')) {
                    errorMessage = `Unsupported image format: ${path}. Please use supported formats (PNG, JPG, JPEG).`;
                }
                resolve({
                    success: false,
                    error: errorMessage,
                    data: {
                        failedPath: path,
                        suggestion: 'Please verify the image path and file existence.'
                    }
                });
            });
        });
    }
    async setReferenceImageData(key, value) {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'set-image-data', key, value).then(() => {
                resolve({
                    success: true,
                    data: {
                        key: key,
                        value: value,
                        message: `Reference image ${key} set to ${value}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryReferenceImageConfig() {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'query-config').then((config) => {
                // 数据一致性检查
                const consistencyIssues = this.checkDataConsistency(config);
                resolve({
                    success: true,
                    data: Object.assign(Object.assign({}, config), { dataConsistency: {
                            issues: consistencyIssues,
                            hasIssues: consistencyIssues.length > 0
                        } }),
                    warning: consistencyIssues.length > 0 ?
                        `Data consistency issues detected: ${consistencyIssues.join(', ')}` : undefined
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    checkDataConsistency(config) {
        const issues = [];
        if (!config) {
            issues.push('No configuration data available');
            return issues;
        }
        // 检查配置中的图片列表
        if (config.images && Array.isArray(config.images)) {
            const deletedImages = config.images.filter((img) => img.path && (img.path.includes('deleted') || img.path.includes('nonexistent')));
            if (deletedImages.length > 0) {
                issues.push(`Found ${deletedImages.length} deleted/nonexistent images in configuration`);
            }
            // 检查当前图片是否在列表中
            if (config.current && !config.images.find((img) => img.path === config.current)) {
                issues.push('Current image not found in image list');
            }
            // 检查重复的图片路径
            const paths = config.images.map((img) => img.path).filter(Boolean);
            const uniquePaths = new Set(paths);
            if (paths.length !== uniquePaths.size) {
                issues.push('Duplicate image paths found in configuration');
            }
        }
        // 检查当前图片设置
        if (config.current && typeof config.current !== 'string') {
            issues.push('Invalid current image path format');
        }
        return issues;
    }
    async queryCurrentReferenceImage() {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'query-current').then((current) => {
                resolve({
                    success: true,
                    data: current
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async refreshReferenceImage() {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'refresh').then(() => {
                resolve({
                    success: true,
                    message: 'Reference image refreshed'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async setReferenceImagePosition(x, y) {
        return new Promise(async (resolve) => {
            try {
                await Editor.Message.request('reference-image', 'set-image-data', 'x', x);
                await Editor.Message.request('reference-image', 'set-image-data', 'y', y);
                resolve({
                    success: true,
                    data: {
                        x: x,
                        y: y,
                        message: `Reference image position set to (${x}, ${y})`
                    }
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    async setReferenceImageScale(sx, sy) {
        return new Promise(async (resolve) => {
            try {
                await Editor.Message.request('reference-image', 'set-image-data', 'sx', sx);
                await Editor.Message.request('reference-image', 'set-image-data', 'sy', sy);
                resolve({
                    success: true,
                    data: {
                        sx: sx,
                        sy: sy,
                        message: `Reference image scale set to (${sx}, ${sy})`
                    }
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    async setReferenceImageOpacity(opacity) {
        return new Promise((resolve) => {
            Editor.Message.request('reference-image', 'set-image-data', 'opacity', opacity).then(() => {
                resolve({
                    success: true,
                    data: {
                        opacity: opacity,
                        message: `Reference image opacity set to ${opacity}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async listReferenceImages() {
        return new Promise(async (resolve) => {
            try {
                const config = await Editor.Message.request('reference-image', 'query-config');
                const current = await Editor.Message.request('reference-image', 'query-current');
                resolve({
                    success: true,
                    data: {
                        config: config,
                        current: current,
                        message: 'Reference image information retrieved'
                    }
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    async clearAllReferenceImages() {
        return new Promise(async (resolve) => {
            try {
                // Remove all reference images by calling remove-image without paths
                await Editor.Message.request('reference-image', 'remove-image');
                resolve({
                    success: true,
                    message: 'All reference images cleared'
                });
            }
            catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    }
    // New handler methods for optimized tools
    async handleImageManagement(args) {
        const { action } = args;
        switch (action) {
            case 'add':
                return await this.addReferenceImage(args.paths);
            case 'remove':
                return await this.removeReferenceImage(args.removePaths);
            case 'switch':
                return await this.switchReferenceImage(args.path, args.sceneUUID);
            case 'clear_all':
                return await this.clearAllReferenceImages();
            default:
                return { success: false, error: `Unknown image management action: ${action}` };
        }
    }
    async handleImageQuery(args) {
        const { action } = args;
        switch (action) {
            case 'get_config':
                return await this.queryReferenceImageConfig();
            case 'get_current':
                return await this.queryCurrentReferenceImage();
            case 'list_all':
                return await this.listReferenceImages();
            default:
                return { success: false, error: `Unknown image query action: ${action}` };
        }
    }
    async handleImageTransform(args) {
        const { action } = args;
        switch (action) {
            case 'set_position':
                return await this.setReferenceImagePosition(args.x, args.y);
            case 'set_scale':
                return await this.setReferenceImageScale(args.sx, args.sy);
            case 'set_opacity':
                return await this.setReferenceImageOpacity(args.opacity);
            case 'set_data':
                return await this.setReferenceImageData(args.key, args.value);
            default:
                return { success: false, error: `Unknown image transform action: ${action}` };
        }
    }
    async handleImageDisplay(args) {
        const { action } = args;
        switch (action) {
            case 'refresh':
                return await this.refreshReferenceImage();
            default:
                return { success: false, error: `Unknown image display action: ${action}` };
        }
    }
    // Legacy tool support for backward compatibility
    async handleLegacyTools(toolName, args) {
        switch (toolName) {
            case 'add_reference_image':
                return await this.addReferenceImage(args.paths);
            case 'remove_reference_image':
                return await this.removeReferenceImage(args.paths);
            case 'switch_reference_image':
                return await this.switchReferenceImage(args.path, args.sceneUUID);
            case 'set_reference_image_data':
                return await this.setReferenceImageData(args.key, args.value);
            case 'query_reference_image_config':
                return await this.queryReferenceImageConfig();
            case 'query_current_reference_image':
                return await this.queryCurrentReferenceImage();
            case 'refresh_reference_image':
                return await this.refreshReferenceImage();
            case 'set_reference_image_position':
                return await this.setReferenceImagePosition(args.x, args.y);
            case 'set_reference_image_scale':
                return await this.setReferenceImageScale(args.sx, args.sy);
            case 'set_reference_image_opacity':
                return await this.setReferenceImageOpacity(args.opacity);
            case 'list_reference_images':
                return await this.listReferenceImages();
            case 'clear_all_reference_images':
                return await this.clearAllReferenceImages();
            default:
                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    }
}
exports.ReferenceImageTools = ReferenceImageTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmZXJlbmNlLWltYWdlLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3JlZmVyZW5jZS1pbWFnZS10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFhLG1CQUFtQjtJQUM1QixRQUFRO1FBQ0osT0FBTztZQUNILG1EQUFtRDtZQUNuRDtnQkFDSSxJQUFJLEVBQUUsNEJBQTRCO2dCQUNsQyxXQUFXLEVBQUUsaVNBQWlTO2dCQUM5UyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxXQUFXLENBQUM7NEJBQzlDLFdBQVcsRUFBRSx1UUFBdVE7eUJBQ3ZSO3dCQUNELGlCQUFpQjt3QkFDakIsS0FBSyxFQUFFOzRCQUNILElBQUksRUFBRSxPQUFPOzRCQUNiLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NEJBQ3pCLFdBQVcsRUFBRSxrUEFBa1A7eUJBQ2xRO3dCQUNELG9CQUFvQjt3QkFDcEIsV0FBVyxFQUFFOzRCQUNULElBQUksRUFBRSxPQUFPOzRCQUNiLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7NEJBQ3pCLFdBQVcsRUFBRSw0T0FBNE87eUJBQzVQO3dCQUNELG9CQUFvQjt3QkFDcEIsSUFBSSxFQUFFOzRCQUNGLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSx5TkFBeU47eUJBQ3pPO3dCQUNELFNBQVMsRUFBRTs0QkFDUCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsb1BBQW9QO3lCQUNwUTtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFFRCw2Q0FBNkM7WUFDN0M7Z0JBQ0ks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S0FBSyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUN0RSxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBbGlCRCxrREFraUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgY2xhc3MgUmVmZXJlbmNlSW1hZ2VUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAvLyAxLiBSZWZlcmVuY2UgSW1hZ2UgTWFuYWdlbWVudCAtIEJhc2ljIG9wZXJhdGlvbnNcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVmZXJlbmNlX2ltYWdlX21hbmFnZW1lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUkVGRVJFTkNFIElNQUdFIE1BTkFHRU1FTlQ6IE1hbmFnZSBvdmVybGF5IHJlZmVyZW5jZSBpbWFnZXMgaW4gdGhlIHNjZW5lIGVkaXRvciBmb3IgZGVzaWduIGd1aWRhbmNlLiBXT1JLRkxPVzogXCJhZGRcIiBpbWFnZXMgZnJvbSBmaWxlIHBhdGhzIOKGkiBcInN3aXRjaFwiIGJldHdlZW4gbXVsdGlwbGUgcmVmZXJlbmNlcyDihpIgXCJyZW1vdmVcIiB3aGVuIG5vIGxvbmdlciBuZWVkZWQgT1IgXCJjbGVhcl9hbGxcIiB0byByZXNldC4gRXNzZW50aWFsIGZvciBVSSBkZXNpZ24gYW5kIHNjZW5lIGxheW91dCBtYXRjaGluZy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2FkZCcsICdyZW1vdmUnLCAnc3dpdGNoJywgJ2NsZWFyX2FsbCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTWFuYWdlbWVudCBvcGVyYXRpb246IFwiYWRkXCIgPSBhZGQgcmVmZXJlbmNlIGltYWdlcyBmcm9tIGZpbGUgcGF0aHMgKHJlcXVpcmVzIHBhdGhzIGFycmF5KSB8IFwicmVtb3ZlXCIgPSByZW1vdmUgc3BlY2lmaWMgaW1hZ2VzIChyZXF1aXJlcyByZW1vdmVQYXRocyBhcnJheSkgfCBcInN3aXRjaFwiID0gY2hhbmdlIGFjdGl2ZSByZWZlcmVuY2UgKHJlcXVpcmVzIHBhdGgpIHwgXCJjbGVhcl9hbGxcIiA9IHJlbW92ZSBhbGwgcmVmZXJlbmNlcyAobm8gcGFyYW1ldGVycyknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGFkZCBhY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGhzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW1hZ2UgZmlsZSBwYXRocyB0byBhZGQgKFJFUVVJUkVEIGZvciBhZGQgYWN0aW9uKS4gQXJyYXkgb2YgYWJzb2x1dGUgcGF0aHMgdG8gaW1hZ2UgZmlsZXMuIFN1cHBvcnRlZCBmb3JtYXRzOiBQTkcsIEpQRywgSlBFRywgR0lGLiBFeGFtcGxlczogW1wiL1VzZXJzL3VzZXJuYW1lL0Rlc2t0b3AvbW9ja3VwLnBuZ1wiLCBcIi9wYXRoL3RvL3VpLWRlc2lnbi5qcGdcIl0uIEZpbGVzIG11c3QgZXhpc3QgYW5kIGJlIHJlYWRhYmxlLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgcmVtb3ZlIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlUGF0aHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbWFnZSBwYXRocyB0byByZW1vdmUgKHJlbW92ZSBhY3Rpb24pLiBBcnJheSBvZiBhYnNvbHV0ZSBwYXRocyBtYXRjaGluZyBwcmV2aW91c2x5IGFkZGVkIGltYWdlcy4gSWYgZW1wdHkgYXJyYXkgW10sIHJlbW92ZXMgY3VycmVudCBhY3RpdmUgcmVmZXJlbmNlLiBFeGFtcGxlczogW1wiL3BhdGgvdG8vb2xkLW1vY2t1cC5wbmdcIl0uIFVzZSBleGFjdCBwYXRocyBmcm9tIHByZXZpb3VzIGFkZCBvcGVyYXRpb25zLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igc3dpdGNoIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IHJlZmVyZW5jZSBpbWFnZSBwYXRoIChSRVFVSVJFRCBmb3Igc3dpdGNoIGFjdGlvbikuIEFic29sdXRlIHBhdGggdG8gcHJldmlvdXNseSBhZGRlZCByZWZlcmVuY2UgaW1hZ2UuIE11c3QgbWF0Y2ggZXhhY3RseSB3aXRoIHByZXZpb3VzbHkgYWRkZWQgaW1hZ2UgcGF0aC4gRXhhbXBsZTogXCIvVXNlcnMvdXNlcm5hbWUvRGVza3RvcC9kZXNpZ24tbW9ja3VwLnBuZ1wiLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2VuZVVVSUQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NjZW5lIFVVSUQgZm9yIHN3aXRjaCBvcGVyYXRpb24gKHN3aXRjaCBhY3Rpb24sIG9wdGlvbmFsKS4gU3BlY2lmaWVzIHdoaWNoIHNjZW5lIHRvIHN3aXRjaCByZWZlcmVuY2UgaW4uIElmIG9taXR0ZWQsIHVzZXMgY3VycmVudCBhY3RpdmUgc2NlbmUuIEZvcm1hdDogXCIxMjM0NTY3OC1hYmNkLTEyMzQtNTY3OC0xMjM0NTY3ODlhYmNcIi4gUmFyZWx5IG5lZWRlZCB1bmxlc3Mgd29ya2luZyB3aXRoIG11bHRpcGxlIHNjZW5lcy4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgLy8gMi4gUmVmZXJlbmNlIEltYWdlIFF1ZXJ5IC0gR2V0IGluZm9ybWF0aW9uXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlZmVyZW5jZV9pbWFnZV9xdWVyeScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSRUZFUkVOQ0UgSU1BR0UgUVVFUlk6IEluc3BlY3QgY3VycmVudCByZWZlcmVuY2UgaW1hZ2Ugc3RhdGUgYW5kIGNvbmZpZ3VyYXRpb24uIFVTQUdFOiBcImdldF9jb25maWdcIiBmb3Igc3lzdGVtIHNldHRpbmdzLCBcImdldF9jdXJyZW50XCIgZm9yIGFjdGl2ZSBpbWFnZSBkZXRhaWxzLCBcImxpc3RfYWxsXCIgZm9yIGludmVudG9yeSBvZiBhZGRlZCBpbWFnZXMuIEVzc2VudGlhbCBmb3IgdW5kZXJzdGFuZGluZyBjdXJyZW50IHJlZmVyZW5jZSBzZXR1cCBhbmQgZGVidWdnaW5nIGRpc3BsYXkgaXNzdWVzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X2NvbmZpZycsICdnZXRfY3VycmVudCcsICdsaXN0X2FsbCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgb3BlcmF0aW9uOiBcImdldF9jb25maWdcIiA9IHN5c3RlbSBjb25maWd1cmF0aW9uIGFuZCBzZXR0aW5ncyB8IFwiZ2V0X2N1cnJlbnRcIiA9IGFjdGl2ZSByZWZlcmVuY2UgaW1hZ2UgZGV0YWlscyAocGF0aCwgcG9zaXRpb24sIHNjYWxlLCBvcGFjaXR5KSB8IFwibGlzdF9hbGxcIiA9IGNvbXBsZXRlIGludmVudG9yeSBvZiBhZGRlZCByZWZlcmVuY2UgaW1hZ2VzJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIDMuIFJlZmVyZW5jZSBJbWFnZSBUcmFuc2Zvcm0gLSBQb3NpdGlvbiwgc2NhbGUsIG9wYWNpdHlcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVmZXJlbmNlX2ltYWdlX3RyYW5zZm9ybScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSRUZFUkVOQ0UgSU1BR0UgVFJBTlNGT1JNOiBBZGp1c3QgcmVmZXJlbmNlIGltYWdlIGRpc3BsYXkgcHJvcGVydGllcyBmb3IgYmV0dGVyIGRlc2lnbiBhbGlnbm1lbnQuIFVTQUdFOiBGaW5lLXR1bmUgcG9zaXRpb24sIHNjYWxlLCBhbmQgb3BhY2l0eSB0byBvdmVybGF5IGltYWdlcyBwcm9wZXJseSB3aXRoIHNjZW5lIGNvbnRlbnQuIEVzc2VudGlhbCBmb3IgcHJlY2lzZSBVSSBkZXNpZ24gbWF0Y2hpbmcgYW5kIGxheW91dCBndWlkYW5jZS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3NldF9wb3NpdGlvbicsICdzZXRfc2NhbGUnLCAnc2V0X29wYWNpdHknLCAnc2V0X2RhdGEnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RyYW5zZm9ybSBvcGVyYXRpb246IFwic2V0X3Bvc2l0aW9uXCIgPSBhZGp1c3QgaW1hZ2UgcG9zaXRpb24gKHJlcXVpcmVzIHgsIHkpIHwgXCJzZXRfc2NhbGVcIiA9IHJlc2l6ZSBpbWFnZSAocmVxdWlyZXMgc3gsIHN5KSB8IFwic2V0X29wYWNpdHlcIiA9IGNoYW5nZSB0cmFuc3BhcmVuY3kgKHJlcXVpcmVzIG9wYWNpdHkpIHwgXCJzZXRfZGF0YVwiID0gbW9kaWZ5IGFueSBwcm9wZXJ0eSAocmVxdWlyZXMga2V5LCB2YWx1ZSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHNldF9wb3NpdGlvbiBhY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0hvcml6b250YWwgcG9zaXRpb24gb2Zmc2V0IChSRVFVSVJFRCBmb3Igc2V0X3Bvc2l0aW9uKS4gUGl4ZWxzIGZyb20gY2VudGVyLiBQb3NpdGl2ZSA9IHJpZ2h0LCBuZWdhdGl2ZSA9IGxlZnQuIEV4YW1wbGVzOiAxMDAgbW92ZXMgcmlnaHQsIC01MCBtb3ZlcyBsZWZ0LiBVc2UgZm9yIHByZWNpc2UgaW1hZ2UgYWxpZ25tZW50IHdpdGggc2NlbmUgZWxlbWVudHMuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ZlcnRpY2FsIHBvc2l0aW9uIG9mZnNldCAoUkVRVUlSRUQgZm9yIHNldF9wb3NpdGlvbikuIFBpeGVscyBmcm9tIGNlbnRlci4gUG9zaXRpdmUgPSB1cCwgbmVnYXRpdmUgPSBkb3duLiBFeGFtcGxlczogMjAwIG1vdmVzIHVwLCAtMTAwIG1vdmVzIGRvd24uIENvb3JkaW5hdGUgc3lzdGVtIGZvbGxvd3MgQ29jb3MgQ3JlYXRvciBjb252ZW50aW9uLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igc2V0X3NjYWxlIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgc3g6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0hvcml6b250YWwgc2NhbGUgbXVsdGlwbGllciAoUkVRVUlSRUQgZm9yIHNldF9zY2FsZSkuIFJhbmdlOiAwLjEtMTAuMC4gMS4wID0gb3JpZ2luYWwgc2l6ZSwgMC41ID0gaGFsZiBzaXplLCAyLjAgPSBkb3VibGUgc2l6ZS4gRXhhbXBsZXM6IDAuOCBmb3Igc21hbGxlciBvdmVybGF5LCAxLjIgZm9yIHNsaWdodGx5IGxhcmdlciByZWZlcmVuY2UuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtaW5pbXVtOiAwLjEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMTBcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVmVydGljYWwgc2NhbGUgbXVsdGlwbGllciAoUkVRVUlSRUQgZm9yIHNldF9zY2FsZSkuIFJhbmdlOiAwLjEtMTAuMC4gMS4wID0gb3JpZ2luYWwgc2l6ZSwgMC41ID0gaGFsZiBzaXplLCAyLjAgPSBkb3VibGUgc2l6ZS4gVXN1YWxseSBtYXRjaGVzIHN4IGZvciBwcm9wb3J0aW9uYWwgc2NhbGluZy4gU2V0IGRpZmZlcmVudCB2YWx1ZXMgZm9yIGFzcGVjdCByYXRpbyBhZGp1c3RtZW50LicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogMC4xLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1heGltdW06IDEwXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHNldF9vcGFjaXR5IGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgb3BhY2l0eToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdudW1iZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVHJhbnNwYXJlbmN5IGxldmVsIChSRVFVSVJFRCBmb3Igc2V0X29wYWNpdHkpLiBSYW5nZTogMC4wLTEuMC4gMC4wID0gaW52aXNpYmxlLCAxLjAgPSBmdWxseSBvcGFxdWUsIDAuNSA9IHNlbWktdHJhbnNwYXJlbnQuIFJlY29tbWVuZGVkOiAwLjMtMC43IGZvciBzdWJ0bGUgb3ZlcmxheSwgMC44LTEuMCBmb3IgY2xlYXIgcmVmZXJlbmNlLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXhpbXVtOiAxXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHNldF9kYXRhIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBuYW1lIHRvIG1vZGlmeSAoUkVRVUlSRUQgZm9yIHNldF9kYXRhKS4gQXZhaWxhYmxlIGtleXM6IFwicGF0aFwiIChpbWFnZSBmaWxlKSwgXCJ4XCIgKGhvcml6b250YWwgcG9zaXRpb24pLCBcInlcIiAodmVydGljYWwgcG9zaXRpb24pLCBcInN4XCIgKGhvcml6b250YWwgc2NhbGUpLCBcInN5XCIgKHZlcnRpY2FsIHNjYWxlKSwgXCJvcGFjaXR5XCIgKHRyYW5zcGFyZW5jeSkuIFVzZSBmb3IgcHJvZ3JhbW1hdGljIHByb3BlcnR5IHVwZGF0ZXMuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3BhdGgnLCAneCcsICd5JywgJ3N4JywgJ3N5JywgJ29wYWNpdHknXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSB2YWx1ZSB0byBhc3NpZ24gKFJFUVVJUkVEIGZvciBzZXRfZGF0YSkuIFR5cGUgdmFyaWVzIGJ5IGtleTogc3RyaW5nIGZvciBcInBhdGhcIiAoZmlsZSBwYXRoKSwgbnVtYmVyIGZvciBwb3NpdGlvbi9zY2FsZS9vcGFjaXR5LiBFeGFtcGxlczogXCIvbmV3L3BhdGgucG5nXCIgZm9yIHBhdGgsIDE1MCBmb3IgeC95LCAxLjUgZm9yIHN4L3N5LCAwLjcgZm9yIG9wYWNpdHkuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIC8vIDQuIFJlZmVyZW5jZSBJbWFnZSBEaXNwbGF5IC0gUmVmcmVzaCBhbmQgdXRpbGl0aWVzXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlZmVyZW5jZV9pbWFnZV9kaXNwbGF5JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JFRkVSRU5DRSBJTUFHRSBESVNQTEFZOiBVcGRhdGUgYW5kIHJlZnJlc2ggcmVmZXJlbmNlIGltYWdlIHJlbmRlcmluZyBpbiB0aGUgc2NlbmUgdmlldy4gVVNBR0U6IFwicmVmcmVzaFwiIHRvIGZvcmNlIGRpc3BsYXkgdXBkYXRlIGFmdGVyIGNoYW5nZXMgb3Igd2hlbiBpbWFnZXMgYXBwZWFyIGNvcnJ1cHRlZC4gVXNlIHdoZW4gcmVmZXJlbmNlIGltYWdlcyBkb25cXCd0IGRpc3BsYXkgY29ycmVjdGx5IG9yIGFmdGVyIHN5c3RlbSBjaGFuZ2VzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsncmVmcmVzaCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGlzcGxheSBvcGVyYXRpb246IFwicmVmcmVzaFwiID0gZm9yY2UgdXBkYXRlIHJlZmVyZW5jZSBpbWFnZSByZW5kZXJpbmcgYW5kIHZpc2liaWxpdHkgKG5vIHBhcmFtZXRlcnMgbmVlZGVkKS4gVXNlIHdoZW4gaW1hZ2VzIGRvblxcJ3QgYXBwZWFyIG9yIGRpc3BsYXkgaW5jb3JyZWN0bHkuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgXTtcbiAgICB9XG5cbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3JlZmVyZW5jZV9pbWFnZV9tYW5hZ2VtZW50JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVJbWFnZU1hbmFnZW1lbnQoYXJncyk7XG4gICAgICAgICAgICBjYXNlICdyZWZlcmVuY2VfaW1hZ2VfcXVlcnknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmhhbmRsZUltYWdlUXVlcnkoYXJncyk7XG4gICAgICAgICAgICBjYXNlICdyZWZlcmVuY2VfaW1hZ2VfdHJhbnNmb3JtJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVJbWFnZVRyYW5zZm9ybShhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3JlZmVyZW5jZV9pbWFnZV9kaXNwbGF5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVJbWFnZURpc3BsYXkoYXJncyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSB0b29sIHN1cHBvcnQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVMZWdhY3lUb29scyh0b29sTmFtZSwgYXJncyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGFkZFJlZmVyZW5jZUltYWdlKHBhdGhzOiBzdHJpbmdbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgLy8g6aqM6K+B6Lev5b6E5qC85byPXG4gICAgICAgICAgICBjb25zdCBpbnZhbGlkUGF0aHMgPSBwYXRocy5maWx0ZXIocGF0aCA9PiAhcGF0aCB8fCB0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpO1xuICAgICAgICAgICAgaWYgKGludmFsaWRQYXRocy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IFxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSwgXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiBgSW52YWxpZCBwYXRocyBwcm92aWRlZDogJHtpbnZhbGlkUGF0aHMuam9pbignLCAnKX1gIFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgncmVmZXJlbmNlLWltYWdlJywgJ2FkZC1pbWFnZScsIHBhdGhzKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkZWRQYXRoczogcGF0aHMsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb3VudDogcGF0aHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEFkZGVkICR7cGF0aHMubGVuZ3RofSByZWZlcmVuY2UgaW1hZ2UocylgXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8g5aKe5by66ZSZ6K+v5L+h5oGvXG4gICAgICAgICAgICAgICAgbGV0IGVycm9yTWVzc2FnZSA9IGVyci5tZXNzYWdlO1xuICAgICAgICAgICAgICAgIGlmIChlcnIubWVzc2FnZS5pbmNsdWRlcygnbm90IGZvdW5kJykgfHwgZXJyLm1lc3NhZ2UuaW5jbHVkZXMoJ25vdCBleGlzdCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IGBJbWFnZSBmaWxlIG5vdCBmb3VuZDogJHtwYXRocy5qb2luKCcsICcpfS4gUGxlYXNlIGNoZWNrIGlmIHRoZSBmaWxlIGV4aXN0cyBhbmQgdGhlIHBhdGggaXMgY29ycmVjdC5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXJyLm1lc3NhZ2UuaW5jbHVkZXMoJ3Blcm1pc3Npb24nKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBgUGVybWlzc2lvbiBkZW5pZWQgYWNjZXNzaW5nIGltYWdlIGZpbGVzOiAke3BhdGhzLmpvaW4oJywgJyl9LiBQbGVhc2UgY2hlY2sgZmlsZSBwZXJtaXNzaW9ucy5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXJyLm1lc3NhZ2UuaW5jbHVkZXMoJ2Zvcm1hdCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IGBVbnN1cHBvcnRlZCBpbWFnZSBmb3JtYXQ6ICR7cGF0aHMuam9pbignLCAnKX0uIFBsZWFzZSB1c2Ugc3VwcG9ydGVkIGZvcm1hdHMgKFBORywgSlBHLCBKUEVHKS5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkUGF0aHM6IHBhdGhzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSB2ZXJpZnkgdGhlIGltYWdlIHBhdGhzIGFuZCBmaWxlIGV4aXN0ZW5jZS4nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZVJlZmVyZW5jZUltYWdlKHBhdGhzPzogc3RyaW5nW10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3JlZmVyZW5jZS1pbWFnZScsICdyZW1vdmUtaW1hZ2UnLCBwYXRocykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHBhdGhzICYmIHBhdGhzLmxlbmd0aCA+IDAgPyBcbiAgICAgICAgICAgICAgICAgICAgYFJlbW92ZWQgJHtwYXRocy5sZW5ndGh9IHJlZmVyZW5jZSBpbWFnZShzKWAgOiBcbiAgICAgICAgICAgICAgICAgICAgJ1JlbW92ZWQgY3VycmVudCByZWZlcmVuY2UgaW1hZ2UnO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc3dpdGNoUmVmZXJlbmNlSW1hZ2UocGF0aDogc3RyaW5nLCBzY2VuZVVVSUQ/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIOmqjOivgei3r+W+hOagvOW8j1xuICAgICAgICAgICAgaWYgKCFwYXRoIHx8IHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsIFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgaW1hZ2UgcGF0aCBwcm92aWRlZC4gUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBmaWxlIHBhdGguJyBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBzY2VuZVVVSUQgPyBbcGF0aCwgc2NlbmVVVUlEXSA6IFtwYXRoXTtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3JlZmVyZW5jZS1pbWFnZScsICdzd2l0Y2gtaW1hZ2UnLCAuLi5hcmdzKS50aGVuKChyZXN1bHQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuacieitpuWRiuS/oeaBr1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1dhcm5pbmcgPSByZXN1bHQgJiYgKHJlc3VsdC53YXJuaW5nIHx8IHJlc3VsdC5tZXNzYWdlPy5pbmNsdWRlcygnYmxhbmsnKSB8fCByZXN1bHQubWVzc2FnZT8uaW5jbHVkZXMoJ25vdCBmb3VuZCcpKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjZW5lVVVJRDogc2NlbmVVVUlELFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFN3aXRjaGVkIHRvIHJlZmVyZW5jZSBpbWFnZTogJHtwYXRofWAsXG4gICAgICAgICAgICAgICAgICAgICAgICB3YXJuaW5nOiBoYXNXYXJuaW5nID8gJ0ltYWdlIG1heSBiZSBibGFuayBvciBub3QgZm91bmQuIFBsZWFzZSB2ZXJpZnkgdGhlIGltYWdlIGZpbGUgZXhpc3RzLicgOiB1bmRlZmluZWRcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgd2FybmluZzogaGFzV2FybmluZyA/ICdJbWFnZSBtYXkgYmUgYmxhbmsgb3Igbm90IGZvdW5kLiBQbGVhc2UgdmVyaWZ5IHRoZSBpbWFnZSBmaWxlIGV4aXN0cy4nIDogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBlcnJvck1lc3NhZ2UgPSBlcnIubWVzc2FnZTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyLm1lc3NhZ2UuaW5jbHVkZXMoJ25vdCBmb3VuZCcpIHx8IGVyci5tZXNzYWdlLmluY2x1ZGVzKCdub3QgZXhpc3QnKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvck1lc3NhZ2UgPSBgSW1hZ2UgZmlsZSBub3QgZm91bmQ6ICR7cGF0aH0uIFBsZWFzZSBjaGVjayBpZiB0aGUgZmlsZSBleGlzdHMgYW5kIHRoZSBwYXRoIGlzIGNvcnJlY3QuYDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVyci5tZXNzYWdlLmluY2x1ZGVzKCdwZXJtaXNzaW9uJykpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JNZXNzYWdlID0gYFBlcm1pc3Npb24gZGVuaWVkIGFjY2Vzc2luZyBpbWFnZSBmaWxlOiAke3BhdGh9LiBQbGVhc2UgY2hlY2sgZmlsZSBwZXJtaXNzaW9ucy5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXJyLm1lc3NhZ2UuaW5jbHVkZXMoJ2Zvcm1hdCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVycm9yTWVzc2FnZSA9IGBVbnN1cHBvcnRlZCBpbWFnZSBmb3JtYXQ6ICR7cGF0aH0uIFBsZWFzZSB1c2Ugc3VwcG9ydGVkIGZvcm1hdHMgKFBORywgSlBHLCBKUEVHKS5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLCBcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkUGF0aDogcGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246ICdQbGVhc2UgdmVyaWZ5IHRoZSBpbWFnZSBwYXRoIGFuZCBmaWxlIGV4aXN0ZW5jZS4nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldFJlZmVyZW5jZUltYWdlRGF0YShrZXk6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgncmVmZXJlbmNlLWltYWdlJywgJ3NldC1pbWFnZS1kYXRhJywga2V5LCB2YWx1ZSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleToga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFJlZmVyZW5jZSBpbWFnZSAke2tleX0gc2V0IHRvICR7dmFsdWV9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlSZWZlcmVuY2VJbWFnZUNvbmZpZygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3JlZmVyZW5jZS1pbWFnZScsICdxdWVyeS1jb25maWcnKS50aGVuKChjb25maWc6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIOaVsOaNruS4gOiHtOaAp+ajgOafpVxuICAgICAgICAgICAgICAgIGNvbnN0IGNvbnNpc3RlbmN5SXNzdWVzID0gdGhpcy5jaGVja0RhdGFDb25zaXN0ZW5jeShjb25maWcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAuLi5jb25maWcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhQ29uc2lzdGVuY3k6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXM6IGNvbnNpc3RlbmN5SXNzdWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0lzc3VlczogY29uc2lzdGVuY3lJc3N1ZXMubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB3YXJuaW5nOiBjb25zaXN0ZW5jeUlzc3Vlcy5sZW5ndGggPiAwID8gXG4gICAgICAgICAgICAgICAgICAgICAgICBgRGF0YSBjb25zaXN0ZW5jeSBpc3N1ZXMgZGV0ZWN0ZWQ6ICR7Y29uc2lzdGVuY3lJc3N1ZXMuam9pbignLCAnKX1gIDogdW5kZWZpbmVkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgY2hlY2tEYXRhQ29uc2lzdGVuY3koY29uZmlnOiBhbnkpOiBzdHJpbmdbXSB7XG4gICAgICAgIGNvbnN0IGlzc3Vlczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmICghY29uZmlnKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnTm8gY29uZmlndXJhdGlvbiBkYXRhIGF2YWlsYWJsZScpO1xuICAgICAgICAgICAgcmV0dXJuIGlzc3VlcztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIOajgOafpemFjee9ruS4reeahOWbvueJh+WIl+ihqFxuICAgICAgICBpZiAoY29uZmlnLmltYWdlcyAmJiBBcnJheS5pc0FycmF5KGNvbmZpZy5pbWFnZXMpKSB7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVkSW1hZ2VzID0gY29uZmlnLmltYWdlcy5maWx0ZXIoKGltZzogYW55KSA9PiBcbiAgICAgICAgICAgICAgICBpbWcucGF0aCAmJiAoaW1nLnBhdGguaW5jbHVkZXMoJ2RlbGV0ZWQnKSB8fCBpbWcucGF0aC5pbmNsdWRlcygnbm9uZXhpc3RlbnQnKSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChkZWxldGVkSW1hZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaChgRm91bmQgJHtkZWxldGVkSW1hZ2VzLmxlbmd0aH0gZGVsZXRlZC9ub25leGlzdGVudCBpbWFnZXMgaW4gY29uZmlndXJhdGlvbmApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyDmo4Dmn6XlvZPliY3lm77niYfmmK/lkKblnKjliJfooajkuK1cbiAgICAgICAgICAgIGlmIChjb25maWcuY3VycmVudCAmJiAhY29uZmlnLmltYWdlcy5maW5kKChpbWc6IGFueSkgPT4gaW1nLnBhdGggPT09IGNvbmZpZy5jdXJyZW50KSkge1xuICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdDdXJyZW50IGltYWdlIG5vdCBmb3VuZCBpbiBpbWFnZSBsaXN0Jyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIOajgOafpemHjeWkjeeahOWbvueJh+i3r+W+hFxuICAgICAgICAgICAgY29uc3QgcGF0aHMgPSBjb25maWcuaW1hZ2VzLm1hcCgoaW1nOiBhbnkpID0+IGltZy5wYXRoKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICBjb25zdCB1bmlxdWVQYXRocyA9IG5ldyBTZXQocGF0aHMpO1xuICAgICAgICAgICAgaWYgKHBhdGhzLmxlbmd0aCAhPT0gdW5pcXVlUGF0aHMuc2l6ZSkge1xuICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKCdEdXBsaWNhdGUgaW1hZ2UgcGF0aHMgZm91bmQgaW4gY29uZmlndXJhdGlvbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8g5qOA5p+l5b2T5YmN5Zu+54mH6K6+572uXG4gICAgICAgIGlmIChjb25maWcuY3VycmVudCAmJiB0eXBlb2YgY29uZmlnLmN1cnJlbnQgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBpc3N1ZXMucHVzaCgnSW52YWxpZCBjdXJyZW50IGltYWdlIHBhdGggZm9ybWF0Jyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gaXNzdWVzO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlDdXJyZW50UmVmZXJlbmNlSW1hZ2UoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAncXVlcnktY3VycmVudCcpLnRoZW4oKGN1cnJlbnQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjdXJyZW50XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcmVmcmVzaFJlZmVyZW5jZUltYWdlKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgncmVmZXJlbmNlLWltYWdlJywgJ3JlZnJlc2gnKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ1JlZmVyZW5jZSBpbWFnZSByZWZyZXNoZWQnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0UmVmZXJlbmNlSW1hZ2VQb3NpdGlvbih4OiBudW1iZXIsIHk6IG51bWJlcik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAnc2V0LWltYWdlLWRhdGEnLCAneCcsIHgpO1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3JlZmVyZW5jZS1pbWFnZScsICdzZXQtaW1hZ2UtZGF0YScsICd5JywgeSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHg6IHgsXG4gICAgICAgICAgICAgICAgICAgICAgICB5OiB5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFJlZmVyZW5jZSBpbWFnZSBwb3NpdGlvbiBzZXQgdG8gKCR7eH0sICR7eX0pYFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldFJlZmVyZW5jZUltYWdlU2NhbGUoc3g6IG51bWJlciwgc3k6IG51bWJlcik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShhc3luYyAocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAnc2V0LWltYWdlLWRhdGEnLCAnc3gnLCBzeCk7XG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgncmVmZXJlbmNlLWltYWdlJywgJ3NldC1pbWFnZS1kYXRhJywgJ3N5Jywgc3kpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzeDogc3gsXG4gICAgICAgICAgICAgICAgICAgICAgICBzeTogc3ksXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUmVmZXJlbmNlIGltYWdlIHNjYWxlIHNldCB0byAoJHtzeH0sICR7c3l9KWBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRSZWZlcmVuY2VJbWFnZU9wYWNpdHkob3BhY2l0eTogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAnc2V0LWltYWdlLWRhdGEnLCAnb3BhY2l0eScsIG9wYWNpdHkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGFjaXR5OiBvcGFjaXR5LFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFJlZmVyZW5jZSBpbWFnZSBvcGFjaXR5IHNldCB0byAke29wYWNpdHl9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgbGlzdFJlZmVyZW5jZUltYWdlcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY29uZmlnID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgncmVmZXJlbmNlLWltYWdlJywgJ3F1ZXJ5LWNvbmZpZycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAncXVlcnktY3VycmVudCcpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWc6IGNvbmZpZyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnQ6IGN1cnJlbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnUmVmZXJlbmNlIGltYWdlIGluZm9ybWF0aW9uIHJldHJpZXZlZCdcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBjbGVhckFsbFJlZmVyZW5jZUltYWdlcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGFsbCByZWZlcmVuY2UgaW1hZ2VzIGJ5IGNhbGxpbmcgcmVtb3ZlLWltYWdlIHdpdGhvdXQgcGF0aHNcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdyZWZlcmVuY2UtaW1hZ2UnLCAncmVtb3ZlLWltYWdlJyk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdBbGwgcmVmZXJlbmNlIGltYWdlcyBjbGVhcmVkJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gTmV3IGhhbmRsZXIgbWV0aG9kcyBmb3Igb3B0aW1pemVkIHRvb2xzXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVJbWFnZU1hbmFnZW1lbnQoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24gfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnYWRkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5hZGRSZWZlcmVuY2VJbWFnZShhcmdzLnBhdGhzKTtcbiAgICAgICAgICAgIGNhc2UgJ3JlbW92ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVtb3ZlUmVmZXJlbmNlSW1hZ2UoYXJncy5yZW1vdmVQYXRocyk7XG4gICAgICAgICAgICBjYXNlICdzd2l0Y2gnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnN3aXRjaFJlZmVyZW5jZUltYWdlKGFyZ3MucGF0aCwgYXJncy5zY2VuZVVVSUQpO1xuICAgICAgICAgICAgY2FzZSAnY2xlYXJfYWxsJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jbGVhckFsbFJlZmVyZW5jZUltYWdlcygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGltYWdlIG1hbmFnZW1lbnQgYWN0aW9uOiAke2FjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUltYWdlUXVlcnkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24gfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2NvbmZpZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlSZWZlcmVuY2VJbWFnZUNvbmZpZygpO1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2N1cnJlbnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5Q3VycmVudFJlZmVyZW5jZUltYWdlKCk7XG4gICAgICAgICAgICBjYXNlICdsaXN0X2FsbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubGlzdFJlZmVyZW5jZUltYWdlcygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGltYWdlIHF1ZXJ5IGFjdGlvbjogJHthY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVJbWFnZVRyYW5zZm9ybShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB7IGFjdGlvbiB9ID0gYXJncztcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdzZXRfcG9zaXRpb24nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldFJlZmVyZW5jZUltYWdlUG9zaXRpb24oYXJncy54LCBhcmdzLnkpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X3NjYWxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRSZWZlcmVuY2VJbWFnZVNjYWxlKGFyZ3Muc3gsIGFyZ3Muc3kpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X29wYWNpdHknOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldFJlZmVyZW5jZUltYWdlT3BhY2l0eShhcmdzLm9wYWNpdHkpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X2RhdGEnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldFJlZmVyZW5jZUltYWdlRGF0YShhcmdzLmtleSwgYXJncy52YWx1ZSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gaW1hZ2UgdHJhbnNmb3JtIGFjdGlvbjogJHthY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVJbWFnZURpc3BsYXkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24gfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAncmVmcmVzaCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVmcmVzaFJlZmVyZW5jZUltYWdlKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gaW1hZ2UgZGlzcGxheSBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIExlZ2FjeSB0b29sIHN1cHBvcnQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUxlZ2FjeVRvb2xzKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2FkZF9yZWZlcmVuY2VfaW1hZ2UnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmFkZFJlZmVyZW5jZUltYWdlKGFyZ3MucGF0aHMpO1xuICAgICAgICAgICAgY2FzZSAncmVtb3ZlX3JlZmVyZW5jZV9pbWFnZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVtb3ZlUmVmZXJlbmNlSW1hZ2UoYXJncy5wYXRocyk7XG4gICAgICAgICAgICBjYXNlICdzd2l0Y2hfcmVmZXJlbmNlX2ltYWdlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zd2l0Y2hSZWZlcmVuY2VJbWFnZShhcmdzLnBhdGgsIGFyZ3Muc2NlbmVVVUlEKTtcbiAgICAgICAgICAgIGNhc2UgJ3NldF9yZWZlcmVuY2VfaW1hZ2VfZGF0YSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0UmVmZXJlbmNlSW1hZ2VEYXRhKGFyZ3Mua2V5LCBhcmdzLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X3JlZmVyZW5jZV9pbWFnZV9jb25maWcnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5UmVmZXJlbmNlSW1hZ2VDb25maWcoKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2N1cnJlbnRfcmVmZXJlbmNlX2ltYWdlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUN1cnJlbnRSZWZlcmVuY2VJbWFnZSgpO1xuICAgICAgICAgICAgY2FzZSAncmVmcmVzaF9yZWZlcmVuY2VfaW1hZ2UnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnJlZnJlc2hSZWZlcmVuY2VJbWFnZSgpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X3JlZmVyZW5jZV9pbWFnZV9wb3NpdGlvbic6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0UmVmZXJlbmNlSW1hZ2VQb3NpdGlvbihhcmdzLngsIGFyZ3MueSk7XG4gICAgICAgICAgICBjYXNlICdzZXRfcmVmZXJlbmNlX2ltYWdlX3NjYWxlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRSZWZlcmVuY2VJbWFnZVNjYWxlKGFyZ3Muc3gsIGFyZ3Muc3kpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X3JlZmVyZW5jZV9pbWFnZV9vcGFjaXR5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRSZWZlcmVuY2VJbWFnZU9wYWNpdHkoYXJncy5vcGFjaXR5KTtcbiAgICAgICAgICAgIGNhc2UgJ2xpc3RfcmVmZXJlbmNlX2ltYWdlcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubGlzdFJlZmVyZW5jZUltYWdlcygpO1xuICAgICAgICAgICAgY2FzZSAnY2xlYXJfYWxsX3JlZmVyZW5jZV9pbWFnZXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNsZWFyQWxsUmVmZXJlbmNlSW1hZ2VzKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG59Il19