"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneViewTools = void 0;
class SceneViewTools {
    getTools() {
        return [
            {
                name: 'scene_view_gizmo_management',
                description: 'GIZMO MANAGEMENT: Control scene manipulation tools and transformation handles. USAGE: Change between position/rotation/scale tools, switch coordinate systems (local/global), adjust pivot points. Essential for precise scene editing and object manipulation in the editor.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Gizmo operation to perform. Query actions get current state, change actions modify settings.',
                            enum: ['change_tool', 'query_tool', 'change_pivot', 'query_pivot', 'change_coordinate', 'query_coordinate', 'query_view_mode']
                        },
                        toolName: {
                            type: 'string',
                            description: 'Transformation tool type (REQUIRED for change_tool action). "position" = move objects, "rotation" = rotate objects, "scale" = resize objects, "rect" = 2D rect transform. Choose based on desired editing operation.',
                            enum: ['position', 'rotation', 'scale', 'rect']
                        },
                        pivotName: {
                            type: 'string',
                            description: 'Transform pivot point (REQUIRED for change_pivot action). "pivot" = use object\'s pivot point (local center), "center" = use geometric center (bounding box center). Affects rotation and scaling behavior.',
                            enum: ['pivot', 'center']
                        },
                        coordinateType: {
                            type: 'string',
                            description: 'Coordinate system reference (REQUIRED for change_coordinate action). "local" = relative to object\'s orientation, "global" = relative to world axes. Local useful for object-oriented editing, global for world-aligned operations.',
                            enum: ['local', 'global']
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'scene_view_mode_control',
                description: 'VIEW MODE CONTROL: Switch scene editor between 2D and 3D modes and control visual aids. USAGE: Toggle 2D/3D perspective for different editing contexts, show/hide grid for alignment reference. 2D mode for UI/sprite editing, 3D mode for 3D scene construction.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'View control operation. Change actions modify view state, query actions get current state.',
                            enum: ['change_2d_3d', 'query_2d_3d', 'set_grid', 'query_grid']
                        },
                        is2D: {
                            type: 'boolean',
                            description: 'View mode setting (REQUIRED for change_2d_3d action). true = 2D orthographic view (for UI, sprites, 2D games), false = 3D perspective view (for 3D scenes, spatial editing). Choose based on content type.'
                        },
                        gridVisible: {
                            type: 'boolean',
                            description: 'Grid display state (REQUIRED for set_grid action). true = show alignment grid (helpful for positioning), false = hide grid (cleaner view for final preview). Grid aids in precise object placement and alignment.'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'scene_view_icon_gizmo',
                description: 'ICON GIZMO CONTROL: Configure visual representation of scene nodes and components. USAGE: Adjust icon display mode (2D/3D) and size for better visibility. Useful for managing visual clutter and improving scene navigation when working with many objects.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Icon gizmo operation. Set actions modify appearance, query actions get current settings.',
                            enum: ['set_3d_mode', 'query_3d_mode', 'set_size', 'query_size']
                        },
                        is3D: {
                            type: 'boolean',
                            description: 'Icon display mode (REQUIRED for set_3d_mode action). true = 3D icons (spatial representation), false = 2D icons (flat representation). 3D mode for spatial awareness, 2D mode for reduced visual complexity.'
                        },
                        size: {
                            type: 'number',
                            description: 'Icon size scale (REQUIRED for set_size action). Range: 10-100. Smaller values = less visual noise, larger values = easier selection. Recommended: 20-30 for dense scenes, 40-60 for sparse scenes. Adjust based on scene complexity.',
                            minimum: 10,
                            maximum: 100
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'scene_view_camera_control',
                description: 'CAMERA CONTROL: Navigate and position the scene view camera for better editing workflow. USAGE: Focus on specific objects, align camera angles, and synchronize view positions. Essential for efficient scene navigation and precise editing of complex scenes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Camera operation: "focus_on_nodes" = center view on specific nodes (requires nodeUuids) | "align_camera_with_view" = sync camera to current view | "align_view_with_node" = position view to match node orientation.',
                            enum: ['focus_on_nodes', 'align_camera_with_view', 'align_view_with_node']
                        },
                        nodeUuids: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Node UUIDs to focus on (REQUIRED for focus_on_nodes action). Array of node UUIDs to center in view. Use node_query to get UUIDs first. Examples: ["node-uuid-1", "node-uuid-2"]. Empty array [] focuses on all scene nodes. Format: array of UUID strings.'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'scene_view_status_management',
                description: 'STATUS MANAGEMENT: Monitor scene view configuration and restore default settings. USAGE: "get_status" for comprehensive view state information, "reset_view" to restore default camera position and settings. Useful for troubleshooting view issues and standardizing editor state.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            description: 'Status operation: "get_status" = retrieve current scene view configuration and settings | "reset_view" = restore scene view to default camera position and settings (no parameters needed).',
                            enum: ['get_status', 'reset_view']
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'scene_view_gizmo_management':
                return await this.handleGizmoManagement(args);
            case 'scene_view_mode_control':
                return await this.handleViewModeControl(args);
            case 'scene_view_icon_gizmo':
                return await this.handleIconGizmo(args);
            case 'scene_view_camera_control':
                return await this.handleCameraControl(args);
            case 'scene_view_status_management':
                return await this.handleStatusManagement(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    async handleGizmoManagement(args) {
        const { action, toolName, pivotName, coordinateType } = args;
        switch (action) {
            case 'change_tool':
                if (!toolName) {
                    return { success: false, error: 'toolName is required for change_tool action' };
                }
                return await this.changeGizmoTool(toolName);
            case 'query_tool':
                return await this.queryGizmoToolName();
            case 'change_pivot':
                if (!pivotName) {
                    return { success: false, error: 'pivotName is required for change_pivot action' };
                }
                return await this.changeGizmoPivot(pivotName);
            case 'query_pivot':
                return await this.queryGizmoPivot();
            case 'change_coordinate':
                if (!coordinateType) {
                    return { success: false, error: 'coordinateType is required for change_coordinate action' };
                }
                return await this.changeGizmoCoordinate(coordinateType);
            case 'query_coordinate':
                return await this.queryGizmoCoordinate();
            case 'query_view_mode':
                return await this.queryGizmoViewMode();
            default:
                return { success: false, error: `Unknown action: ${action}` };
        }
    }
    async handleViewModeControl(args) {
        const { action, is2D, gridVisible } = args;
        switch (action) {
            case 'change_2d_3d':
                if (is2D === undefined) {
                    return { success: false, error: 'is2D is required for change_2d_3d action' };
                }
                return await this.changeViewMode2D3D(is2D);
            case 'query_2d_3d':
                return await this.queryViewMode2D3D();
            case 'set_grid':
                if (gridVisible === undefined) {
                    return { success: false, error: 'gridVisible is required for set_grid action' };
                }
                return await this.setGridVisible(gridVisible);
            case 'query_grid':
                return await this.queryGridVisible();
            default:
                return { success: false, error: `Unknown action: ${action}` };
        }
    }
    async handleIconGizmo(args) {
        const { action, is3D, size } = args;
        switch (action) {
            case 'set_3d_mode':
                if (is3D === undefined) {
                    return { success: false, error: 'is3D is required for set_3d_mode action' };
                }
                return await this.setIconGizmo3D(is3D);
            case 'query_3d_mode':
                return await this.queryIconGizmo3D();
            case 'set_size':
                if (size === undefined) {
                    return { success: false, error: 'size is required for set_size action' };
                }
                return await this.setIconGizmoSize(size);
            case 'query_size':
                return await this.queryIconGizmoSize();
            default:
                return { success: false, error: `Unknown action: ${action}` };
        }
    }
    async handleCameraControl(args) {
        const { action, nodeUuids } = args;
        switch (action) {
            case 'focus_on_nodes':
                return await this.focusCameraOnNodes(nodeUuids || []);
            case 'align_camera_with_view':
                return await this.alignCameraWithView();
            case 'align_view_with_node':
                return await this.alignViewWithNode();
            default:
                return { success: false, error: `Unknown action: ${action}` };
        }
    }
    async handleStatusManagement(args) {
        const { action } = args;
        switch (action) {
            case 'get_status':
                return await this.getSceneViewStatus();
            case 'reset_view':
                return await this.resetSceneView();
            default:
                return { success: false, error: `Unknown action: ${action}` };
        }
    }
    // Legacy tool support for backward compatibility
    async handleLegacyTools(toolName, args) {
        switch (toolName) {
            case 'change_gizmo_tool':
                return await this.changeGizmoTool(args.name);
            case 'query_gizmo_tool_name':
                return await this.queryGizmoToolName();
            case 'change_gizmo_pivot':
                return await this.changeGizmoPivot(args.name);
            case 'query_gizmo_pivot':
                return await this.queryGizmoPivot();
            case 'query_gizmo_view_mode':
                return await this.queryGizmoViewMode();
            case 'change_gizmo_coordinate':
                return await this.changeGizmoCoordinate(args.type);
            case 'query_gizmo_coordinate':
                return await this.queryGizmoCoordinate();
            case 'change_view_mode_2d_3d':
                return await this.changeViewMode2D3D(args.is2D);
            case 'query_view_mode_2d_3d':
                return await this.queryViewMode2D3D();
            case 'set_grid_visible':
                return await this.setGridVisible(args.visible);
            case 'query_grid_visible':
                return await this.queryGridVisible();
            case 'set_icon_gizmo_3d':
                return await this.setIconGizmo3D(args.is3D);
            case 'query_icon_gizmo_3d':
                return await this.queryIconGizmo3D();
            case 'set_icon_gizmo_size':
                return await this.setIconGizmoSize(args.size);
            case 'query_icon_gizmo_size':
                return await this.queryIconGizmoSize();
            case 'focus_camera_on_nodes':
                return await this.focusCameraOnNodes(args.uuids);
            case 'align_camera_with_view':
                return await this.alignCameraWithView();
            case 'align_view_with_node':
                return await this.alignViewWithNode();
            case 'get_scene_view_status':
                return await this.getSceneViewStatus();
            case 'reset_scene_view':
                return await this.resetSceneView();
            default:
                throw new Error(`Unknown legacy tool: ${toolName}`);
        }
    }
    // Private implementation methods
    async changeGizmoTool(name) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'change-gizmo-tool', name).then(() => {
                resolve({
                    success: true,
                    message: `Gizmo tool changed to '${name}'`,
                    data: { toolName: name }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryGizmoToolName() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-gizmo-tool-name').then((toolName) => {
                resolve({
                    success: true,
                    data: {
                        currentTool: toolName,
                        message: `Current Gizmo tool: ${toolName}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async changeGizmoPivot(name) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'change-gizmo-pivot', name).then(() => {
                resolve({
                    success: true,
                    message: `Gizmo pivot changed to '${name}'`,
                    data: { pivotName: name }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryGizmoPivot() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-gizmo-pivot').then((pivotName) => {
                resolve({
                    success: true,
                    data: {
                        currentPivot: pivotName,
                        message: `Current Gizmo pivot: ${pivotName}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryGizmoViewMode() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-gizmo-view-mode').then((viewMode) => {
                resolve({
                    success: true,
                    data: {
                        viewMode: viewMode,
                        message: `Current view mode: ${viewMode}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async changeGizmoCoordinate(type) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'change-gizmo-coordinate', type).then(() => {
                resolve({
                    success: true,
                    message: `Coordinate system changed to '${type}'`,
                    data: { coordinateType: type }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryGizmoCoordinate() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-gizmo-coordinate').then((coordinate) => {
                resolve({
                    success: true,
                    data: {
                        coordinate: coordinate,
                        message: `Current coordinate system: ${coordinate}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async changeViewMode2D3D(is2D) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'change-is2D', is2D).then(() => {
                resolve({
                    success: true,
                    message: `View mode changed to ${is2D ? '2D' : '3D'}`,
                    data: { is2D: is2D, viewMode: is2D ? '2D' : '3D' }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryViewMode2D3D() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-is2D').then((is2D) => {
                resolve({
                    success: true,
                    data: {
                        is2D: is2D,
                        viewMode: is2D ? '2D' : '3D',
                        message: `Current view mode: ${is2D ? '2D' : '3D'}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async setGridVisible(visible) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'set-grid-visible', visible).then(() => {
                resolve({
                    success: true,
                    message: `Grid ${visible ? 'shown' : 'hidden'}`,
                    data: { gridVisible: visible }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryGridVisible() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-is-grid-visible').then((visible) => {
                resolve({
                    success: true,
                    data: {
                        visible: visible,
                        message: `Grid is ${visible ? 'visible' : 'hidden'}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async setIconGizmo3D(is3D) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'set-icon-gizmo-3d', is3D).then(() => {
                resolve({
                    success: true,
                    message: `IconGizmo set to ${is3D ? '3D' : '2D'} mode`,
                    data: { is3D: is3D, mode: is3D ? '3D' : '2D' }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryIconGizmo3D() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-is-icon-gizmo-3d').then((is3D) => {
                resolve({
                    success: true,
                    data: {
                        is3D: is3D,
                        mode: is3D ? '3D' : '2D',
                        message: `IconGizmo is in ${is3D ? '3D' : '2D'} mode`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async setIconGizmoSize(size) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'set-icon-gizmo-size', size).then(() => {
                resolve({
                    success: true,
                    message: `IconGizmo size set to ${size}`,
                    data: { size: size }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async queryIconGizmoSize() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'query-icon-gizmo-size').then((size) => {
                resolve({
                    success: true,
                    data: {
                        size: size,
                        message: `IconGizmo size: ${size}`
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async focusCameraOnNodes(nodeUuids) {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'focus-camera', nodeUuids).then(() => {
                const message = nodeUuids.length === 0 ?
                    'Camera focused on all nodes' :
                    `Camera focused on ${nodeUuids.length} node(s)`;
                resolve({
                    success: true,
                    message: message,
                    data: { focusedNodes: nodeUuids }
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async alignCameraWithView() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'align-with-view').then(() => {
                resolve({
                    success: true,
                    message: 'Scene camera aligned with current view'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async alignViewWithNode() {
        return new Promise((resolve) => {
            Editor.Message.request('scene', 'align-view-with-node').then(() => {
                resolve({
                    success: true,
                    message: 'View aligned with selected node successfully'
                });
            }).catch((err) => {
                resolve({ success: false, error: err.message });
            });
        });
    }
    async getSceneViewStatus() {
        return new Promise(async (resolve) => {
            try {
                // Gather all view status information
                const [gizmoTool, gizmoPivot, gizmoCoordinate, viewMode2D3D, gridVisible, iconGizmo3D, iconGizmoSize] = await Promise.allSettled([
                    this.queryGizmoToolName(),
                    this.queryGizmoPivot(),
                    this.queryGizmoCoordinate(),
                    this.queryViewMode2D3D(),
                    this.queryGridVisible(),
                    this.queryIconGizmo3D(),
                    this.queryIconGizmoSize()
                ]);
                const status = {
                    timestamp: new Date().toISOString()
                };
                // Extract data from fulfilled promises
                if (gizmoTool.status === 'fulfilled' && gizmoTool.value.success) {
                    status.gizmoTool = gizmoTool.value.data.currentTool;
                }
                if (gizmoPivot.status === 'fulfilled' && gizmoPivot.value.success) {
                    status.gizmoPivot = gizmoPivot.value.data.currentPivot;
                }
                if (gizmoCoordinate.status === 'fulfilled' && gizmoCoordinate.value.success) {
                    status.coordinate = gizmoCoordinate.value.data.coordinate;
                }
                if (viewMode2D3D.status === 'fulfilled' && viewMode2D3D.value.success) {
                    status.is2D = viewMode2D3D.value.data.is2D;
                    status.viewMode = viewMode2D3D.value.data.viewMode;
                }
                if (gridVisible.status === 'fulfilled' && gridVisible.value.success) {
                    status.gridVisible = gridVisible.value.data.visible;
                }
                if (iconGizmo3D.status === 'fulfilled' && iconGizmo3D.value.success) {
                    status.iconGizmo3D = iconGizmo3D.value.data.is3D;
                }
                if (iconGizmoSize.status === 'fulfilled' && iconGizmoSize.value.success) {
                    status.iconGizmoSize = iconGizmoSize.value.data.size;
                }
                resolve({
                    success: true,
                    data: status,
                    message: 'Scene view status retrieved successfully'
                });
            }
            catch (err) {
                resolve({
                    success: false,
                    error: `Failed to get scene view status: ${err.message}`
                });
            }
        });
    }
    async resetSceneView() {
        return new Promise(async (resolve) => {
            try {
                // Reset scene view to default settings
                const resetActions = [
                    this.changeGizmoTool('position'),
                    this.changeGizmoPivot('pivot'),
                    this.changeGizmoCoordinate('local'),
                    this.changeViewMode2D3D(false), // 3D mode
                    this.setGridVisible(true),
                    this.setIconGizmo3D(true),
                    this.setIconGizmoSize(60)
                ];
                await Promise.all(resetActions);
                resolve({
                    success: true,
                    message: 'Scene view reset to default settings',
                    data: {
                        defaultSettings: {
                            gizmoTool: 'position',
                            gizmoPivot: 'pivot',
                            coordinate: 'local',
                            viewMode: '3D',
                            gridVisible: true,
                            iconGizmo3D: true,
                            iconGizmoSize: 60
                        }
                    }
                });
            }
            catch (err) {
                resolve({
                    success: false,
                    error: `Failed to reset scene view: ${err.message}`
                });
            }
        });
    }
}
exports.SceneViewTools = SceneViewTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdmlldy10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9zY2VuZS12aWV3LXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQWEsY0FBYztJQUN2QixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSw2QkFBNkI7Z0JBQ25DLFdBQVcsRUFBRSwrUUFBK1E7Z0JBQzVSLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFOzRCQUNKLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSw4RkFBOEY7NEJBQzNHLElBQUksRUFBRSxDQUFDLGFBQWEsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQzt5QkFDakk7d0JBQ0QsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSxzTkFBc047NEJBQ25PLElBQUksRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQzt5QkFDbEQ7d0JBQ0QsU0FBUyxFQUFFOzRCQUNQLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSw2TUFBNk07NEJBQzFOLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUM7eUJBQzVCO3dCQUNELGNBQWMsRUFBRTs0QkFDWixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUscU9BQXFPOzRCQUNsUCxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDO3lCQUM1QjtxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7aUJBQ3ZCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUseUJBQXlCO2dCQUMvQixXQUFXLEVBQUUsbVFBQW1RO2dCQUNoUixX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MUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDO29CQUN6QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDO2lCQUM1QixDQUFDO2dCQUVGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFFaEMsT0FBTyxDQUFDO29CQUNKLE9BQU8sRUFBRSxJQUFJO29CQUNiLE9BQU8sRUFBRSxzQ0FBc0M7b0JBQy9DLElBQUksRUFBRTt3QkFDRixlQUFlLEVBQUU7NEJBQ2IsU0FBUyxFQUFFLFVBQVU7NEJBQ3JCLFVBQVUsRUFBRSxPQUFPOzRCQUNuQixVQUFVLEVBQUUsT0FBTzs0QkFDbkIsUUFBUSxFQUFFLElBQUk7NEJBQ2QsV0FBVyxFQUFFLElBQUk7NEJBQ2pCLFdBQVcsRUFBRSxJQUFJOzRCQUNqQixhQUFhLEVBQUUsRUFBRTt5QkFDcEI7cUJBQ0o7aUJBQ0osQ0FBQyxDQUFDO1lBRVAsQ0FBQztZQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7Z0JBQ2hCLE9BQU8sQ0FBQztvQkFDSixPQUFPLEVBQUUsS0FBSztvQkFDZCxLQUFLLEVBQUUsK0JBQStCLEdBQUcsQ0FBQyxPQUFPLEVBQUU7aUJBQ3RELENBQUMsQ0FBQztZQUNQLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FDSjtBQTNwQkQsd0NBMnBCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIFNjZW5lVmlld1Rvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2NlbmVfdmlld19naXptb19tYW5hZ2VtZW50JyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dJWk1PIE1BTkFHRU1FTlQ6IENvbnRyb2wgc2NlbmUgbWFuaXB1bGF0aW9uIHRvb2xzIGFuZCB0cmFuc2Zvcm1hdGlvbiBoYW5kbGVzLiBVU0FHRTogQ2hhbmdlIGJldHdlZW4gcG9zaXRpb24vcm90YXRpb24vc2NhbGUgdG9vbHMsIHN3aXRjaCBjb29yZGluYXRlIHN5c3RlbXMgKGxvY2FsL2dsb2JhbCksIGFkanVzdCBwaXZvdCBwb2ludHMuIEVzc2VudGlhbCBmb3IgcHJlY2lzZSBzY2VuZSBlZGl0aW5nIGFuZCBvYmplY3QgbWFuaXB1bGF0aW9uIGluIHRoZSBlZGl0b3IuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHaXptbyBvcGVyYXRpb24gdG8gcGVyZm9ybS4gUXVlcnkgYWN0aW9ucyBnZXQgY3VycmVudCBzdGF0ZSwgY2hhbmdlIGFjdGlvbnMgbW9kaWZ5IHNldHRpbmdzLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydjaGFuZ2VfdG9vbCcsICdxdWVyeV90b29sJywgJ2NoYW5nZV9waXZvdCcsICdxdWVyeV9waXZvdCcsICdjaGFuZ2VfY29vcmRpbmF0ZScsICdxdWVyeV9jb29yZGluYXRlJywgJ3F1ZXJ5X3ZpZXdfbW9kZSddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbE5hbWU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RyYW5zZm9ybWF0aW9uIHRvb2wgdHlwZSAoUkVRVUlSRUQgZm9yIGNoYW5nZV90b29sIGFjdGlvbikuIFwicG9zaXRpb25cIiA9IG1vdmUgb2JqZWN0cywgXCJyb3RhdGlvblwiID0gcm90YXRlIG9iamVjdHMsIFwic2NhbGVcIiA9IHJlc2l6ZSBvYmplY3RzLCBcInJlY3RcIiA9IDJEIHJlY3QgdHJhbnNmb3JtLiBDaG9vc2UgYmFzZWQgb24gZGVzaXJlZCBlZGl0aW5nIG9wZXJhdGlvbi4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsncG9zaXRpb24nLCAncm90YXRpb24nLCAnc2NhbGUnLCAncmVjdCddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGl2b3ROYW1lOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUcmFuc2Zvcm0gcGl2b3QgcG9pbnQgKFJFUVVJUkVEIGZvciBjaGFuZ2VfcGl2b3QgYWN0aW9uKS4gXCJwaXZvdFwiID0gdXNlIG9iamVjdFxcJ3MgcGl2b3QgcG9pbnQgKGxvY2FsIGNlbnRlciksIFwiY2VudGVyXCIgPSB1c2UgZ2VvbWV0cmljIGNlbnRlciAoYm91bmRpbmcgYm94IGNlbnRlcikuIEFmZmVjdHMgcm90YXRpb24gYW5kIHNjYWxpbmcgYmVoYXZpb3IuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3Bpdm90JywgJ2NlbnRlciddXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZVR5cGU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Nvb3JkaW5hdGUgc3lzdGVtIHJlZmVyZW5jZSAoUkVRVUlSRUQgZm9yIGNoYW5nZV9jb29yZGluYXRlIGFjdGlvbikuIFwibG9jYWxcIiA9IHJlbGF0aXZlIHRvIG9iamVjdFxcJ3Mgb3JpZW50YXRpb24sIFwiZ2xvYmFsXCIgPSByZWxhdGl2ZSB0byB3b3JsZCBheGVzLiBMb2NhbCB1c2VmdWwgZm9yIG9iamVjdC1vcmllbnRlZCBlZGl0aW5nLCBnbG9iYWwgZm9yIHdvcmxkLWFsaWduZWQgb3BlcmF0aW9ucy4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnbG9jYWwnLCAnZ2xvYmFsJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdzY2VuZV92aWV3X21vZGVfY29udHJvbCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdWSUVXIE1PREUgQ09OVFJPTDogU3dpdGNoIHNjZW5lIGVkaXRvciBiZXR3ZWVuIDJEIGFuZCAzRCBtb2RlcyBhbmQgY29udHJvbCB2aXN1YWwgYWlkcy4gVVNBR0U6IFRvZ2dsZSAyRC8zRCBwZXJzcGVjdGl2ZSBmb3IgZGlmZmVyZW50IGVkaXRpbmcgY29udGV4dHMsIHNob3cvaGlkZSBncmlkIGZvciBhbGlnbm1lbnQgcmVmZXJlbmNlLiAyRCBtb2RlIGZvciBVSS9zcHJpdGUgZWRpdGluZywgM0QgbW9kZSBmb3IgM0Qgc2NlbmUgY29uc3RydWN0aW9uLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVmlldyBjb250cm9sIG9wZXJhdGlvbi4gQ2hhbmdlIGFjdGlvbnMgbW9kaWZ5IHZpZXcgc3RhdGUsIHF1ZXJ5IGFjdGlvbnMgZ2V0IGN1cnJlbnQgc3RhdGUuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2NoYW5nZV8yZF8zZCcsICdxdWVyeV8yZF8zZCcsICdzZXRfZ3JpZCcsICdxdWVyeV9ncmlkJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpczJEOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVmlldyBtb2RlIHNldHRpbmcgKFJFUVVJUkVEIGZvciBjaGFuZ2VfMmRfM2QgYWN0aW9uKS4gdHJ1ZSA9IDJEIG9ydGhvZ3JhcGhpYyB2aWV3IChmb3IgVUksIHNwcml0ZXMsIDJEIGdhbWVzKSwgZmFsc2UgPSAzRCBwZXJzcGVjdGl2ZSB2aWV3IChmb3IgM0Qgc2NlbmVzLCBzcGF0aWFsIGVkaXRpbmcpLiBDaG9vc2UgYmFzZWQgb24gY29udGVudCB0eXBlLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBncmlkVmlzaWJsZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdib29sZWFuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dyaWQgZGlzcGxheSBzdGF0ZSAoUkVRVUlSRUQgZm9yIHNldF9ncmlkIGFjdGlvbikuIHRydWUgPSBzaG93IGFsaWdubWVudCBncmlkIChoZWxwZnVsIGZvciBwb3NpdGlvbmluZyksIGZhbHNlID0gaGlkZSBncmlkIChjbGVhbmVyIHZpZXcgZm9yIGZpbmFsIHByZXZpZXcpLiBHcmlkIGFpZHMgaW4gcHJlY2lzZSBvYmplY3QgcGxhY2VtZW50IGFuZCBhbGlnbm1lbnQuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX3ZpZXdfaWNvbl9naXptbycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJQ09OIEdJWk1PIENPTlRST0w6IENvbmZpZ3VyZSB2aXN1YWwgcmVwcmVzZW50YXRpb24gb2Ygc2NlbmUgbm9kZXMgYW5kIGNvbXBvbmVudHMuIFVTQUdFOiBBZGp1c3QgaWNvbiBkaXNwbGF5IG1vZGUgKDJELzNEKSBhbmQgc2l6ZSBmb3IgYmV0dGVyIHZpc2liaWxpdHkuIFVzZWZ1bCBmb3IgbWFuYWdpbmcgdmlzdWFsIGNsdXR0ZXIgYW5kIGltcHJvdmluZyBzY2VuZSBuYXZpZ2F0aW9uIHdoZW4gd29ya2luZyB3aXRoIG1hbnkgb2JqZWN0cy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ljb24gZ2l6bW8gb3BlcmF0aW9uLiBTZXQgYWN0aW9ucyBtb2RpZnkgYXBwZWFyYW5jZSwgcXVlcnkgYWN0aW9ucyBnZXQgY3VycmVudCBzZXR0aW5ncy4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnc2V0XzNkX21vZGUnLCAncXVlcnlfM2RfbW9kZScsICdzZXRfc2l6ZScsICdxdWVyeV9zaXplJ11cbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpczNEOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSWNvbiBkaXNwbGF5IG1vZGUgKFJFUVVJUkVEIGZvciBzZXRfM2RfbW9kZSBhY3Rpb24pLiB0cnVlID0gM0QgaWNvbnMgKHNwYXRpYWwgcmVwcmVzZW50YXRpb24pLCBmYWxzZSA9IDJEIGljb25zIChmbGF0IHJlcHJlc2VudGF0aW9uKS4gM0QgbW9kZSBmb3Igc3BhdGlhbCBhd2FyZW5lc3MsIDJEIG1vZGUgZm9yIHJlZHVjZWQgdmlzdWFsIGNvbXBsZXhpdHkuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbnVtYmVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ljb24gc2l6ZSBzY2FsZSAoUkVRVUlSRUQgZm9yIHNldF9zaXplIGFjdGlvbikuIFJhbmdlOiAxMC0xMDAuIFNtYWxsZXIgdmFsdWVzID0gbGVzcyB2aXN1YWwgbm9pc2UsIGxhcmdlciB2YWx1ZXMgPSBlYXNpZXIgc2VsZWN0aW9uLiBSZWNvbW1lbmRlZDogMjAtMzAgZm9yIGRlbnNlIHNjZW5lcywgNDAtNjAgZm9yIHNwYXJzZSBzY2VuZXMuIEFkanVzdCBiYXNlZCBvbiBzY2VuZSBjb21wbGV4aXR5LicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWluaW11bTogMTAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWF4aW11bTogMTAwXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2NlbmVfdmlld19jYW1lcmFfY29udHJvbCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDQU1FUkEgQ09OVFJPTDogTmF2aWdhdGUgYW5kIHBvc2l0aW9uIHRoZSBzY2VuZSB2aWV3IGNhbWVyYSBmb3IgYmV0dGVyIGVkaXRpbmcgd29ya2Zsb3cuIFVTQUdFOiBGb2N1cyBvbiBzcGVjaWZpYyBvYmplY3RzLCBhbGlnbiBjYW1lcmEgYW5nbGVzLCBhbmQgc3luY2hyb25pemUgdmlldyBwb3NpdGlvbnMuIEVzc2VudGlhbCBmb3IgZWZmaWNpZW50IHNjZW5lIG5hdmlnYXRpb24gYW5kIHByZWNpc2UgZWRpdGluZyBvZiBjb21wbGV4IHNjZW5lcy4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhY3Rpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NhbWVyYSBvcGVyYXRpb246IFwiZm9jdXNfb25fbm9kZXNcIiA9IGNlbnRlciB2aWV3IG9uIHNwZWNpZmljIG5vZGVzIChyZXF1aXJlcyBub2RlVXVpZHMpIHwgXCJhbGlnbl9jYW1lcmFfd2l0aF92aWV3XCIgPSBzeW5jIGNhbWVyYSB0byBjdXJyZW50IHZpZXcgfCBcImFsaWduX3ZpZXdfd2l0aF9ub2RlXCIgPSBwb3NpdGlvbiB2aWV3IHRvIG1hdGNoIG5vZGUgb3JpZW50YXRpb24uJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2ZvY3VzX29uX25vZGVzJywgJ2FsaWduX2NhbWVyYV93aXRoX3ZpZXcnLCAnYWxpZ25fdmlld193aXRoX25vZGUnXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRHMgdG8gZm9jdXMgb24gKFJFUVVJUkVEIGZvciBmb2N1c19vbl9ub2RlcyBhY3Rpb24pLiBBcnJheSBvZiBub2RlIFVVSURzIHRvIGNlbnRlciBpbiB2aWV3LiBVc2Ugbm9kZV9xdWVyeSB0byBnZXQgVVVJRHMgZmlyc3QuIEV4YW1wbGVzOiBbXCJub2RlLXV1aWQtMVwiLCBcIm5vZGUtdXVpZC0yXCJdLiBFbXB0eSBhcnJheSBbXSBmb2N1c2VzIG9uIGFsbCBzY2VuZSBub2Rlcy4gRm9ybWF0OiBhcnJheSBvZiBVVUlEIHN0cmluZ3MuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NjZW5lX3ZpZXdfc3RhdHVzX21hbmFnZW1lbnQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU1RBVFVTIE1BTkFHRU1FTlQ6IE1vbml0b3Igc2NlbmUgdmlldyBjb25maWd1cmF0aW9uIGFuZCByZXN0b3JlIGRlZmF1bHQgc2V0dGluZ3MuIFVTQUdFOiBcImdldF9zdGF0dXNcIiBmb3IgY29tcHJlaGVuc2l2ZSB2aWV3IHN0YXRlIGluZm9ybWF0aW9uLCBcInJlc2V0X3ZpZXdcIiB0byByZXN0b3JlIGRlZmF1bHQgY2FtZXJhIHBvc2l0aW9uIGFuZCBzZXR0aW5ncy4gVXNlZnVsIGZvciB0cm91Ymxlc2hvb3RpbmcgdmlldyBpc3N1ZXMgYW5kIHN0YW5kYXJkaXppbmcgZWRpdG9yIHN0YXRlLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3RhdHVzIG9wZXJhdGlvbjogXCJnZXRfc3RhdHVzXCIgPSByZXRyaWV2ZSBjdXJyZW50IHNjZW5lIHZpZXcgY29uZmlndXJhdGlvbiBhbmQgc2V0dGluZ3MgfCBcInJlc2V0X3ZpZXdcIiA9IHJlc3RvcmUgc2NlbmUgdmlldyB0byBkZWZhdWx0IGNhbWVyYSBwb3NpdGlvbiBhbmQgc2V0dGluZ3MgKG5vIHBhcmFtZXRlcnMgbmVlZGVkKS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2V0X3N0YXR1cycsICdyZXNldF92aWV3J11cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdzY2VuZV92aWV3X2dpem1vX21hbmFnZW1lbnQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmhhbmRsZUdpem1vTWFuYWdlbWVudChhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3NjZW5lX3ZpZXdfbW9kZV9jb250cm9sJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVWaWV3TW9kZUNvbnRyb2woYXJncyk7XG4gICAgICAgICAgICBjYXNlICdzY2VuZV92aWV3X2ljb25fZ2l6bW8nOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmhhbmRsZUljb25HaXptbyhhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3NjZW5lX3ZpZXdfY2FtZXJhX2NvbnRyb2wnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmhhbmRsZUNhbWVyYUNvbnRyb2woYXJncyk7XG4gICAgICAgICAgICBjYXNlICdzY2VuZV92aWV3X3N0YXR1c19tYW5hZ2VtZW50JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVTdGF0dXNNYW5hZ2VtZW50KGFyZ3MpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlR2l6bW9NYW5hZ2VtZW50KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHsgYWN0aW9uLCB0b29sTmFtZSwgcGl2b3ROYW1lLCBjb29yZGluYXRlVHlwZSB9ID0gYXJncztcblxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnY2hhbmdlX3Rvb2wnOlxuICAgICAgICAgICAgICAgIGlmICghdG9vbE5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAndG9vbE5hbWUgaXMgcmVxdWlyZWQgZm9yIGNoYW5nZV90b29sIGFjdGlvbicgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2hhbmdlR2l6bW9Ub29sKHRvb2xOYW1lKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X3Rvb2wnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5R2l6bW9Ub29sTmFtZSgpO1xuICAgICAgICAgICAgY2FzZSAnY2hhbmdlX3Bpdm90JzpcbiAgICAgICAgICAgICAgICBpZiAoIXBpdm90TmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdwaXZvdE5hbWUgaXMgcmVxdWlyZWQgZm9yIGNoYW5nZV9waXZvdCBhY3Rpb24nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoYW5nZUdpem1vUGl2b3QocGl2b3ROYW1lKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X3Bpdm90JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUdpem1vUGl2b3QoKTtcbiAgICAgICAgICAgIGNhc2UgJ2NoYW5nZV9jb29yZGluYXRlJzpcbiAgICAgICAgICAgICAgICBpZiAoIWNvb3JkaW5hdGVUeXBlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2Nvb3JkaW5hdGVUeXBlIGlzIHJlcXVpcmVkIGZvciBjaGFuZ2VfY29vcmRpbmF0ZSBhY3Rpb24nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoYW5nZUdpem1vQ29vcmRpbmF0ZShjb29yZGluYXRlVHlwZSk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9jb29yZGluYXRlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUdpem1vQ29vcmRpbmF0ZSgpO1xuICAgICAgICAgICAgY2FzZSAncXVlcnlfdmlld19tb2RlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUdpem1vVmlld01vZGUoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlVmlld01vZGVDb250cm9sKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHsgYWN0aW9uLCBpczJELCBncmlkVmlzaWJsZSB9ID0gYXJncztcblxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnY2hhbmdlXzJkXzNkJzpcbiAgICAgICAgICAgICAgICBpZiAoaXMyRCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2lzMkQgaXMgcmVxdWlyZWQgZm9yIGNoYW5nZV8yZF8zZCBhY3Rpb24nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoYW5nZVZpZXdNb2RlMkQzRChpczJEKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5XzJkXzNkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVZpZXdNb2RlMkQzRCgpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X2dyaWQnOlxuICAgICAgICAgICAgICAgIGlmIChncmlkVmlzaWJsZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2dyaWRWaXNpYmxlIGlzIHJlcXVpcmVkIGZvciBzZXRfZ3JpZCBhY3Rpb24nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldEdyaWRWaXNpYmxlKGdyaWRWaXNpYmxlKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2dyaWQnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5R3JpZFZpc2libGUoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlSWNvbkdpem1vKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIGNvbnN0IHsgYWN0aW9uLCBpczNELCBzaXplIH0gPSBhcmdzO1xuXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdzZXRfM2RfbW9kZSc6XG4gICAgICAgICAgICAgICAgaWYgKGlzM0QgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdpczNEIGlzIHJlcXVpcmVkIGZvciBzZXRfM2RfbW9kZSBhY3Rpb24nIH07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldEljb25HaXptbzNEKGlzM0QpO1xuICAgICAgICAgICAgY2FzZSAncXVlcnlfM2RfbW9kZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlJY29uR2l6bW8zRCgpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X3NpemUnOlxuICAgICAgICAgICAgICAgIGlmIChzaXplID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnc2l6ZSBpcyByZXF1aXJlZCBmb3Igc2V0X3NpemUgYWN0aW9uJyB9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRJY29uR2l6bW9TaXplKHNpemUpO1xuICAgICAgICAgICAgY2FzZSAncXVlcnlfc2l6ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlJY29uR2l6bW9TaXplKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uOiAke2FjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZUNhbWVyYUNvbnRyb2woYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24sIG5vZGVVdWlkcyB9ID0gYXJncztcblxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZm9jdXNfb25fbm9kZXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmZvY3VzQ2FtZXJhT25Ob2Rlcyhub2RlVXVpZHMgfHwgW10pO1xuICAgICAgICAgICAgY2FzZSAnYWxpZ25fY2FtZXJhX3dpdGhfdmlldyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYWxpZ25DYW1lcmFXaXRoVmlldygpO1xuICAgICAgICAgICAgY2FzZSAnYWxpZ25fdmlld193aXRoX25vZGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmFsaWduVmlld1dpdGhOb2RlKCk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gYWN0aW9uOiAke2FjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZVN0YXR1c01hbmFnZW1lbnQoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24gfSA9IGFyZ3M7XG5cbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9zdGF0dXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmdldFNjZW5lVmlld1N0YXR1cygpO1xuICAgICAgICAgICAgY2FzZSAncmVzZXRfdmlldyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXRTY2VuZVZpZXcoKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIExlZ2FjeSB0b29sIHN1cHBvcnQgZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHlcbiAgICBhc3luYyBoYW5kbGVMZWdhY3lUb29scyh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XG4gICAgICAgICAgICBjYXNlICdjaGFuZ2VfZ2l6bW9fdG9vbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuY2hhbmdlR2l6bW9Ub29sKGFyZ3MubmFtZSk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9naXptb190b29sX25hbWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5R2l6bW9Ub29sTmFtZSgpO1xuICAgICAgICAgICAgY2FzZSAnY2hhbmdlX2dpem1vX3Bpdm90JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5jaGFuZ2VHaXptb1Bpdm90KGFyZ3MubmFtZSk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9naXptb19waXZvdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlHaXptb1Bpdm90KCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9naXptb192aWV3X21vZGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5R2l6bW9WaWV3TW9kZSgpO1xuICAgICAgICAgICAgY2FzZSAnY2hhbmdlX2dpem1vX2Nvb3JkaW5hdGUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoYW5nZUdpem1vQ29vcmRpbmF0ZShhcmdzLnR5cGUpO1xuICAgICAgICAgICAgY2FzZSAncXVlcnlfZ2l6bW9fY29vcmRpbmF0ZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlHaXptb0Nvb3JkaW5hdGUoKTtcbiAgICAgICAgICAgIGNhc2UgJ2NoYW5nZV92aWV3X21vZGVfMmRfM2QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNoYW5nZVZpZXdNb2RlMkQzRChhcmdzLmlzMkQpO1xuICAgICAgICAgICAgY2FzZSAncXVlcnlfdmlld19tb2RlXzJkXzNkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeVZpZXdNb2RlMkQzRCgpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X2dyaWRfdmlzaWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0R3JpZFZpc2libGUoYXJncy52aXNpYmxlKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2dyaWRfdmlzaWJsZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucXVlcnlHcmlkVmlzaWJsZSgpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X2ljb25fZ2l6bW9fM2QnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnNldEljb25HaXptbzNEKGFyZ3MuaXMzRCk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9pY29uX2dpem1vXzNkJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5xdWVyeUljb25HaXptbzNEKCk7XG4gICAgICAgICAgICBjYXNlICdzZXRfaWNvbl9naXptb19zaXplJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZXRJY29uR2l6bW9TaXplKGFyZ3Muc2l6ZSk7XG4gICAgICAgICAgICBjYXNlICdxdWVyeV9pY29uX2dpem1vX3NpemUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5SWNvbkdpem1vU2l6ZSgpO1xuICAgICAgICAgICAgY2FzZSAnZm9jdXNfY2FtZXJhX29uX25vZGVzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5mb2N1c0NhbWVyYU9uTm9kZXMoYXJncy51dWlkcyk7XG4gICAgICAgICAgICBjYXNlICdhbGlnbl9jYW1lcmFfd2l0aF92aWV3JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5hbGlnbkNhbWVyYVdpdGhWaWV3KCk7XG4gICAgICAgICAgICBjYXNlICdhbGlnbl92aWV3X3dpdGhfbm9kZSc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuYWxpZ25WaWV3V2l0aE5vZGUoKTtcbiAgICAgICAgICAgIGNhc2UgJ2dldF9zY2VuZV92aWV3X3N0YXR1cyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0U2NlbmVWaWV3U3RhdHVzKCk7XG4gICAgICAgICAgICBjYXNlICdyZXNldF9zY2VuZV92aWV3JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5yZXNldFNjZW5lVmlldygpO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gbGVnYWN5IHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQcml2YXRlIGltcGxlbWVudGF0aW9uIG1ldGhvZHNcbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZUdpem1vVG9vbChuYW1lOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NoYW5nZS1naXptby10b29sJywgbmFtZSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBHaXptbyB0b29sIGNoYW5nZWQgdG8gJyR7bmFtZX0nYCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogeyB0b29sTmFtZTogbmFtZSB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlHaXptb1Rvb2xOYW1lKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktZ2l6bW8tdG9vbC1uYW1lJykudGhlbigodG9vbE5hbWU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50VG9vbDogdG9vbE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ3VycmVudCBHaXptbyB0b29sOiAke3Rvb2xOYW1lfWBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZUdpem1vUGl2b3QobmFtZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjaGFuZ2UtZ2l6bW8tcGl2b3QnLCBuYW1lKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEdpem1vIHBpdm90IGNoYW5nZWQgdG8gJyR7bmFtZX0nYCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBwaXZvdE5hbWU6IG5hbWUgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5R2l6bW9QaXZvdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWdpem1vLXBpdm90JykudGhlbigocGl2b3ROYW1lOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFBpdm90OiBwaXZvdE5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ3VycmVudCBHaXptbyBwaXZvdDogJHtwaXZvdE5hbWV9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlHaXptb1ZpZXdNb2RlKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktZ2l6bW8tdmlldy1tb2RlJykudGhlbigodmlld01vZGU6IHN0cmluZykgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3TW9kZTogdmlld01vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ3VycmVudCB2aWV3IG1vZGU6ICR7dmlld01vZGV9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY2hhbmdlR2l6bW9Db29yZGluYXRlKHR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY2hhbmdlLWdpem1vLWNvb3JkaW5hdGUnLCB0eXBlKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvb3JkaW5hdGUgc3lzdGVtIGNoYW5nZWQgdG8gJyR7dHlwZX0nYCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBjb29yZGluYXRlVHlwZTogdHlwZSB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlHaXptb0Nvb3JkaW5hdGUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1naXptby1jb29yZGluYXRlJykudGhlbigoY29vcmRpbmF0ZTogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGU6IGNvb3JkaW5hdGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ3VycmVudCBjb29yZGluYXRlIHN5c3RlbTogJHtjb29yZGluYXRlfWBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNoYW5nZVZpZXdNb2RlMkQzRChpczJEOiBib29sZWFuKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjaGFuZ2UtaXMyRCcsIGlzMkQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgVmlldyBtb2RlIGNoYW5nZWQgdG8gJHtpczJEID8gJzJEJyA6ICczRCd9YCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBpczJEOiBpczJELCB2aWV3TW9kZTogaXMyRCA/ICcyRCcgOiAnM0QnIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVZpZXdNb2RlMkQzRCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWlzMkQnKS50aGVuKChpczJEOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzMkQ6IGlzMkQsXG4gICAgICAgICAgICAgICAgICAgICAgICB2aWV3TW9kZTogaXMyRCA/ICcyRCcgOiAnM0QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEN1cnJlbnQgdmlldyBtb2RlOiAke2lzMkQgPyAnMkQnIDogJzNEJ31gXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRHcmlkVmlzaWJsZSh2aXNpYmxlOiBib29sZWFuKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtZ3JpZC12aXNpYmxlJywgdmlzaWJsZSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBHcmlkICR7dmlzaWJsZSA/ICdzaG93bicgOiAnaGlkZGVuJ31gLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IGdyaWRWaXNpYmxlOiB2aXNpYmxlIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUdyaWRWaXNpYmxlKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktaXMtZ3JpZC12aXNpYmxlJykudGhlbigodmlzaWJsZTogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlOiB2aXNpYmxlLFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEdyaWQgaXMgJHt2aXNpYmxlID8gJ3Zpc2libGUnIDogJ2hpZGRlbid9YFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0SWNvbkdpem1vM0QoaXMzRDogYm9vbGVhbik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LWljb24tZ2l6bW8tM2QnLCBpczNEKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEljb25HaXptbyBzZXQgdG8gJHtpczNEID8gJzNEJyA6ICcyRCd9IG1vZGVgLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IGlzM0Q6IGlzM0QsIG1vZGU6IGlzM0QgPyAnM0QnIDogJzJEJyB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlJY29uR2l6bW8zRCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWlzLWljb24tZ2l6bW8tM2QnKS50aGVuKChpczNEOiBib29sZWFuKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzM0Q6IGlzM0QsXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlOiBpczNEID8gJzNEJyA6ICcyRCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgSWNvbkdpem1vIGlzIGluICR7aXMzRCA/ICczRCcgOiAnMkQnfSBtb2RlYFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2V0SWNvbkdpem1vU2l6ZShzaXplOiBudW1iZXIpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1pY29uLWdpem1vLXNpemUnLCBzaXplKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYEljb25HaXptbyBzaXplIHNldCB0byAke3NpemV9YCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBzaXplOiBzaXplIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUljb25HaXptb1NpemUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1pY29uLWdpem1vLXNpemUnKS50aGVuKChzaXplOiBudW1iZXIpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBJY29uR2l6bW8gc2l6ZTogJHtzaXplfWBcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGZvY3VzQ2FtZXJhT25Ob2Rlcyhub2RlVXVpZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdmb2N1cy1jYW1lcmEnLCBub2RlVXVpZHMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBub2RlVXVpZHMubGVuZ3RoID09PSAwID8gXG4gICAgICAgICAgICAgICAgICAgICdDYW1lcmEgZm9jdXNlZCBvbiBhbGwgbm9kZXMnIDogXG4gICAgICAgICAgICAgICAgICAgIGBDYW1lcmEgZm9jdXNlZCBvbiAke25vZGVVdWlkcy5sZW5ndGh9IG5vZGUocylgO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IGZvY3VzZWROb2Rlczogbm9kZVV1aWRzIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhbGlnbkNhbWVyYVdpdGhWaWV3KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnYWxpZ24td2l0aC12aWV3JykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTY2VuZSBjYW1lcmEgYWxpZ25lZCB3aXRoIGN1cnJlbnQgdmlldydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBhbGlnblZpZXdXaXRoTm9kZSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2FsaWduLXZpZXctd2l0aC1ub2RlJykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdWaWV3IGFsaWduZWQgd2l0aCBzZWxlY3RlZCBub2RlIHN1Y2Nlc3NmdWxseSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRTY2VuZVZpZXdTdGF0dXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIEdhdGhlciBhbGwgdmlldyBzdGF0dXMgaW5mb3JtYXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBbXG4gICAgICAgICAgICAgICAgICAgIGdpem1vVG9vbCxcbiAgICAgICAgICAgICAgICAgICAgZ2l6bW9QaXZvdCxcbiAgICAgICAgICAgICAgICAgICAgZ2l6bW9Db29yZGluYXRlLFxuICAgICAgICAgICAgICAgICAgICB2aWV3TW9kZTJEM0QsXG4gICAgICAgICAgICAgICAgICAgIGdyaWRWaXNpYmxlLFxuICAgICAgICAgICAgICAgICAgICBpY29uR2l6bW8zRCxcbiAgICAgICAgICAgICAgICAgICAgaWNvbkdpem1vU2l6ZVxuICAgICAgICAgICAgICAgIF0gPSBhd2FpdCBQcm9taXNlLmFsbFNldHRsZWQoW1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnF1ZXJ5R2l6bW9Ub29sTmFtZSgpLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnF1ZXJ5R2l6bW9QaXZvdCgpLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnF1ZXJ5R2l6bW9Db29yZGluYXRlKCksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucXVlcnlWaWV3TW9kZTJEM0QoKSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5xdWVyeUdyaWRWaXNpYmxlKCksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucXVlcnlJY29uR2l6bW8zRCgpLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLnF1ZXJ5SWNvbkdpem1vU2l6ZSgpXG4gICAgICAgICAgICAgICAgXSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXM6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcbiAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgLy8gRXh0cmFjdCBkYXRhIGZyb20gZnVsZmlsbGVkIHByb21pc2VzXG4gICAgICAgICAgICAgICAgaWYgKGdpem1vVG9vbC5zdGF0dXMgPT09ICdmdWxmaWxsZWQnICYmIGdpem1vVG9vbC52YWx1ZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1cy5naXptb1Rvb2wgPSBnaXptb1Rvb2wudmFsdWUuZGF0YS5jdXJyZW50VG9vbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGdpem1vUGl2b3Quc3RhdHVzID09PSAnZnVsZmlsbGVkJyAmJiBnaXptb1Bpdm90LnZhbHVlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmdpem1vUGl2b3QgPSBnaXptb1Bpdm90LnZhbHVlLmRhdGEuY3VycmVudFBpdm90O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZ2l6bW9Db29yZGluYXRlLnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcgJiYgZ2l6bW9Db29yZGluYXRlLnZhbHVlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmNvb3JkaW5hdGUgPSBnaXptb0Nvb3JkaW5hdGUudmFsdWUuZGF0YS5jb29yZGluYXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmlld01vZGUyRDNELnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcgJiYgdmlld01vZGUyRDNELnZhbHVlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmlzMkQgPSB2aWV3TW9kZTJEM0QudmFsdWUuZGF0YS5pczJEO1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMudmlld01vZGUgPSB2aWV3TW9kZTJEM0QudmFsdWUuZGF0YS52aWV3TW9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGdyaWRWaXNpYmxlLnN0YXR1cyA9PT0gJ2Z1bGZpbGxlZCcgJiYgZ3JpZFZpc2libGUudmFsdWUuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuZ3JpZFZpc2libGUgPSBncmlkVmlzaWJsZS52YWx1ZS5kYXRhLnZpc2libGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpY29uR2l6bW8zRC5zdGF0dXMgPT09ICdmdWxmaWxsZWQnICYmIGljb25HaXptbzNELnZhbHVlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzLmljb25HaXptbzNEID0gaWNvbkdpem1vM0QudmFsdWUuZGF0YS5pczNEO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaWNvbkdpem1vU2l6ZS5zdGF0dXMgPT09ICdmdWxmaWxsZWQnICYmIGljb25HaXptb1NpemUudmFsdWUuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXMuaWNvbkdpem1vU2l6ZSA9IGljb25HaXptb1NpemUudmFsdWUuZGF0YS5zaXplO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBzdGF0dXMsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTY2VuZSB2aWV3IHN0YXR1cyByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5J1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gZ2V0IHNjZW5lIHZpZXcgc3RhdHVzOiAke2Vyci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldFNjZW5lVmlldygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gUmVzZXQgc2NlbmUgdmlldyB0byBkZWZhdWx0IHNldHRpbmdzXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzZXRBY3Rpb25zID0gW1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUdpem1vVG9vbCgncG9zaXRpb24nKSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VHaXptb1Bpdm90KCdwaXZvdCcpLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUdpem1vQ29vcmRpbmF0ZSgnbG9jYWwnKSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VWaWV3TW9kZTJEM0QoZmFsc2UpLCAvLyAzRCBtb2RlXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0R3JpZFZpc2libGUodHJ1ZSksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0SWNvbkdpem1vM0QodHJ1ZSksXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0SWNvbkdpem1vU2l6ZSg2MClcbiAgICAgICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwocmVzZXRBY3Rpb25zKTtcblxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU2NlbmUgdmlldyByZXNldCB0byBkZWZhdWx0IHNldHRpbmdzJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdFNldHRpbmdzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2l6bW9Ub29sOiAncG9zaXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdpem1vUGl2b3Q6ICdwaXZvdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29vcmRpbmF0ZTogJ2xvY2FsJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2aWV3TW9kZTogJzNEJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBncmlkVmlzaWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpY29uR2l6bW8zRDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpY29uR2l6bW9TaXplOiA2MFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byByZXNldCBzY2VuZSB2aWV3OiAke2Vyci5tZXNzYWdlfWBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSJdfQ==