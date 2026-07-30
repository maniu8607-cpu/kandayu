"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreferencesTools = void 0;
class PreferencesTools {
    getTools() {
        return [
            {
                name: 'preferences_manage',
                description: 'PREFERENCES MANAGEMENT: Configure Cocos Creator editor settings and open preferences panel. WORKFLOW: open_panel to access GUI settings, get_config to read current values, set_config to modify settings, reset_config to restore defaults. Supports global/local/default scopes.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['open_panel', 'get_config', 'set_config', 'reset_config'],
                            description: 'Preference operation: "open_panel" = launch preferences GUI (optional tab parameter) | "get_config" = read configuration values (requires category+path) | "set_config" = modify settings (requires category+path+value) | "reset_config" = restore defaults (requires category)'
                        },
                        // For open_panel action
                        tab: {
                            type: 'string',
                            enum: ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions', 'preview', 'console', 'native', 'builder'],
                            description: 'Preferences tab to display (open_panel action). Available tabs: "general" (basic settings), "external-tools" (editor tools), "data-editor" (data editing), "laboratory" (experimental features), "extensions" (plugins), "preview" (preview settings), "console" (console config), "native" (native build), "builder" (build settings).'
                        },
                        // For get_config/set_config/reset_config actions
                        category: {
                            type: 'string',
                            enum: ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions', 'preview', 'console', 'native', 'builder'],
                            description: 'Configuration category (REQUIRED for get_config/set_config/reset_config). Categories match preferences tabs. "general" = basic editor settings, "external-tools" = tool integration, "data-editor" = data editing preferences. Default: general for common settings.',
                            default: 'general'
                        },
                        path: {
                            type: 'string',
                            description: 'Setting path within category (REQUIRED for get_config/set_config). Use dot notation for nested values. Examples: "editor.fontSize" for editor text size, "preview.autoRefresh" for auto-refresh setting. Check available paths with get_all action first.'
                        },
                        value: {
                            description: 'New setting value (REQUIRED for set_config). Type depends on setting: string for paths/names, number for sizes/delays, boolean for on/off options, object for complex settings. Examples: 14 for fontSize, true for autoSave, "/usr/bin/code" for editor path.'
                        },
                        scope: {
                            type: 'string',
                            enum: ['global', 'local', 'default'],
                            description: 'Setting scope level. "global" = applies to all projects (most common), "local" = current project only (overrides global), "default" = factory settings (read-only for comparison). Recommended: global for general preferences, local for project-specific overrides.',
                            default: 'global'
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'preferences_query',
                description: 'PREFERENCES QUERY: Get all available preferences, list categories, or search for specific preference settings. Use this for preference discovery and inspection.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['get_all', 'list_categories', 'search_settings'],
                            description: 'Query action: "get_all" = retrieve all preference configurations | "list_categories" = get available preference categories | "search_settings" = find settings by keyword'
                        },
                        // For get_all action
                        scope: {
                            type: 'string',
                            enum: ['global', 'local', 'default'],
                            description: 'Configuration scope to query (get_all action only)',
                            default: 'global'
                        },
                        categories: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions', 'preview', 'console', 'native', 'builder']
                            },
                            description: 'Specific categories to include (get_all action only). If not specified, all categories are included.'
                        },
                        // For search_settings action
                        keyword: {
                            type: 'string',
                            description: 'Search keyword for finding settings (search_settings action only)'
                        },
                        includeValues: {
                            type: 'boolean',
                            description: 'Include current values in search results (search_settings action only)',
                            default: true
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'preferences_backup',
                description: 'PREFERENCES BACKUP: Export current preferences to JSON format or prepare for backup operations. Use this for preference backup and restore workflows.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['export', 'validate_backup'],
                            description: 'Backup action: "export" = export preferences to JSON | "validate_backup" = check backup file format'
                        },
                        // For export action
                        categories: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions', 'preview', 'console', 'native', 'builder']
                            },
                            description: 'Categories to export (export action only). If not specified, all categories are exported.'
                        },
                        scope: {
                            type: 'string',
                            enum: ['global', 'local'],
                            description: 'Configuration scope to export (export action only)',
                            default: 'global'
                        },
                        includeDefaults: {
                            type: 'boolean',
                            description: 'Include default values in export (export action only)',
                            default: false
                        },
                        // For validate_backup action
                        backupData: {
                            type: 'object',
                            description: 'Backup data to validate (validate_backup action only)'
                        }
                    },
                    required: ['action']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'preferences_manage':
                return await this.handlePreferencesManage(args);
            case 'preferences_query':
                return await this.handlePreferencesQuery(args);
            case 'preferences_backup':
                return await this.handlePreferencesBackup(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    // New consolidated handlers
    async handlePreferencesManage(args) {
        const { action } = args;
        switch (action) {
            case 'open_panel':
                return await this.openPreferencesPanel(args.tab);
            case 'get_config':
                return await this.getPreferencesConfig(args.category, args.path, args.scope);
            case 'set_config':
                return await this.setPreferencesConfig(args.category, args.path, args.value, args.scope);
            case 'reset_config':
                return await this.resetPreferencesConfig(args.category, args.scope);
            default:
                return { success: false, error: `Unknown preferences manage action: ${action}` };
        }
    }
    async handlePreferencesQuery(args) {
        const { action } = args;
        switch (action) {
            case 'get_all':
                return await this.getAllPreferences(args.scope, args.categories);
            case 'list_categories':
                return await this.listPreferencesCategories();
            case 'search_settings':
                return await this.searchPreferencesSettings(args.keyword, args.includeValues);
            default:
                return { success: false, error: `Unknown preferences query action: ${action}` };
        }
    }
    async handlePreferencesBackup(args) {
        const { action } = args;
        switch (action) {
            case 'export':
                return await this.exportPreferences(args.categories, args.scope, args.includeDefaults);
            case 'validate_backup':
                return await this.validateBackupData(args.backupData);
            default:
                return { success: false, error: `Unknown preferences backup action: ${action}` };
        }
    }
    // Implementation methods
    async openPreferencesPanel(tab) {
        return new Promise((resolve) => {
            const requestArgs = tab ? [tab] : [];
            Editor.Message.request('preferences', 'open-settings', ...requestArgs).then(() => {
                resolve({
                    success: true,
                    message: `✅ Preferences panel opened${tab ? ` on "${tab}" tab` : ''}`,
                    data: { tab: tab || 'general' }
                });
            }).catch((err) => {
                resolve({ success: false, error: `Failed to open preferences panel: ${err.message}` });
            });
        });
    }
    async getPreferencesConfig(category, path, scope = 'global') {
        return new Promise((resolve) => {
            // Validate category parameter
            if (!category || typeof category !== 'string' || category.trim().length === 0) {
                resolve({
                    success: false,
                    error: 'Category is required and must be a non-empty string'
                });
                return;
            }
            const trimmedCategory = category.trim();
            const requestArgs = [trimmedCategory];
            if (path && typeof path === 'string' && path.trim().length > 0) {
                requestArgs.push(path.trim());
            }
            requestArgs.push(scope);
            Editor.Message.request('preferences', 'query-config', ...requestArgs).then((config) => {
                resolve({
                    success: true,
                    message: `✅ Configuration retrieved for ${trimmedCategory}${path ? `.${path.trim()}` : ''}`,
                    data: {
                        category: trimmedCategory,
                        path: path ? path.trim() : undefined,
                        scope,
                        config
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: `Failed to get preference config: ${err.message}` });
            });
        });
    }
    async setPreferencesConfig(category, path, value, scope = 'global') {
        return new Promise((resolve) => {
            // Validate required parameters
            if (!category || typeof category !== 'string' || category.trim().length === 0) {
                resolve({
                    success: false,
                    error: 'Category is required and must be a non-empty string'
                });
                return;
            }
            if (!path || typeof path !== 'string' || path.trim().length === 0) {
                resolve({
                    success: false,
                    error: 'Path is required and must be a non-empty string'
                });
                return;
            }
            if (value === undefined) {
                resolve({
                    success: false,
                    error: 'Value is required and cannot be undefined'
                });
                return;
            }
            const trimmedCategory = category.trim();
            const trimmedPath = path.trim();
            Editor.Message.request('preferences', 'set-config', trimmedCategory, trimmedPath, value, scope).then((success) => {
                if (success) {
                    resolve({
                        success: true,
                        message: `✅ Preference "${trimmedCategory}.${trimmedPath}" updated successfully`,
                        data: {
                            category: trimmedCategory,
                            path: trimmedPath,
                            value,
                            scope
                        }
                    });
                }
                else {
                    resolve({
                        success: false,
                        error: `Failed to update preference "${trimmedCategory}.${trimmedPath}". Value may be invalid or read-only.`
                    });
                }
            }).catch((err) => {
                resolve({ success: false, error: `Error setting preference: ${err.message}` });
            });
        });
    }
    async resetPreferencesConfig(category, scope = 'global') {
        return new Promise((resolve) => {
            // Validate category parameter
            if (!category || typeof category !== 'string' || category.trim().length === 0) {
                resolve({
                    success: false,
                    error: 'Category is required and must be a non-empty string'
                });
                return;
            }
            const trimmedCategory = category.trim();
            // Get default configuration first
            Editor.Message.request('preferences', 'query-config', trimmedCategory, undefined, 'default').then((defaultConfig) => {
                if (!defaultConfig) {
                    throw new Error(`No default configuration found for category "${trimmedCategory}"`);
                }
                // Apply default configuration
                return Editor.Message.request('preferences', 'set-config', trimmedCategory, '', defaultConfig, scope);
            }).then((success) => {
                if (success) {
                    resolve({
                        success: true,
                        message: `✅ Preference category "${trimmedCategory}" reset to defaults`,
                        data: {
                            category: trimmedCategory,
                            scope,
                            action: 'reset'
                        }
                    });
                }
                else {
                    resolve({
                        success: false,
                        error: `Failed to reset preference category "${trimmedCategory}". Category may not support reset operation.`
                    });
                }
            }).catch((err) => {
                resolve({ success: false, error: `Error resetting preferences: ${err.message}` });
            });
        });
    }
    async getAllPreferences(scope = 'global', categories) {
        return new Promise((resolve) => {
            const availableCategories = [
                'general',
                'external-tools',
                'data-editor',
                'laboratory',
                'extensions',
                'preview',
                'console',
                'native',
                'builder'
            ];
            // Use specified categories or all available ones
            const categoriesToQuery = categories || availableCategories;
            const preferences = {};
            const queryPromises = categoriesToQuery.map(category => {
                return Editor.Message.request('preferences', 'query-config', category, undefined, scope)
                    .then((config) => {
                    preferences[category] = config;
                })
                    .catch(() => {
                    // Category doesn't exist or access denied
                    preferences[category] = null;
                });
            });
            Promise.all(queryPromises).then(() => {
                // Filter out null entries
                const validPreferences = Object.fromEntries(Object.entries(preferences).filter(([_, value]) => value !== null));
                resolve({
                    success: true,
                    message: `✅ Retrieved preferences for ${Object.keys(validPreferences).length} categories`,
                    data: {
                        scope,
                        requestedCategories: categoriesToQuery,
                        availableCategories: Object.keys(validPreferences),
                        preferences: validPreferences,
                        summary: {
                            totalCategories: Object.keys(validPreferences).length,
                            scope: scope
                        }
                    }
                });
            }).catch((err) => {
                resolve({ success: false, error: `Error retrieving preferences: ${err.message}` });
            });
        });
    }
    async listPreferencesCategories() {
        return new Promise((resolve) => {
            const categories = [
                { name: 'general', description: 'General editor settings and UI preferences' },
                { name: 'external-tools', description: 'External tool integrations and paths' },
                { name: 'data-editor', description: 'Data editor configurations and templates' },
                { name: 'laboratory', description: 'Experimental features and beta functionality' },
                { name: 'extensions', description: 'Extension manager and plugin settings' },
                { name: 'preview', description: 'Game preview and simulator settings' },
                { name: 'console', description: 'Console panel display and logging options' },
                { name: 'native', description: 'Native platform build configurations' },
                { name: 'builder', description: 'Build system and compilation settings' }
            ];
            resolve({
                success: true,
                message: `✅ Listed ${categories.length} available preference categories`,
                data: {
                    categories,
                    totalCount: categories.length,
                    usage: 'Use these category names with preferences_manage or preferences_query tools'
                }
            });
        });
    }
    async searchPreferencesSettings(keyword, includeValues = true) {
        return new Promise(async (resolve) => {
            var _a;
            try {
                // Validate keyword parameter
                if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
                    resolve({
                        success: false,
                        error: 'Search keyword is required and must be a non-empty string'
                    });
                    return;
                }
                const trimmedKeyword = keyword.trim();
                const allPrefsResponse = await this.getAllPreferences('global');
                if (!allPrefsResponse.success) {
                    resolve(allPrefsResponse);
                    return;
                }
                const preferences = ((_a = allPrefsResponse.data) === null || _a === void 0 ? void 0 : _a.preferences) || {};
                const searchResults = [];
                // Search through all categories and their settings
                for (const [category, config] of Object.entries(preferences)) {
                    if (config && typeof config === 'object') {
                        this.searchInObject(config, trimmedKeyword, category, '', searchResults, includeValues);
                    }
                }
                resolve({
                    success: true,
                    message: `✅ Found ${searchResults.length} settings matching "${trimmedKeyword}"`,
                    data: {
                        keyword: trimmedKeyword,
                        includeValues,
                        resultCount: searchResults.length,
                        results: searchResults.slice(0, 50), // Limit results to prevent overwhelming output
                        hasMoreResults: searchResults.length > 50
                    }
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    error: `Search failed: ${error.message}`
                });
            }
        });
    }
    searchInObject(obj, keyword, category, pathPrefix, results, includeValues) {
        if (!obj || typeof obj !== 'object' || !keyword || typeof keyword !== 'string') {
            return;
        }
        const lowerKeyword = keyword.toLowerCase();
        try {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof key !== 'string')
                    continue;
                const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
                const keyMatches = key.toLowerCase().includes(lowerKeyword);
                const valueMatches = typeof value === 'string' && value.toLowerCase().includes(lowerKeyword);
                if (keyMatches || valueMatches) {
                    const result = {
                        category,
                        path: currentPath,
                        key,
                        matchType: keyMatches ? (valueMatches ? 'both' : 'key') : 'value'
                    };
                    if (includeValues) {
                        result.value = value;
                        result.valueType = typeof value;
                    }
                    results.push(result);
                }
                // Recursively search nested objects (with depth limit to prevent infinite recursion)
                if (value && typeof value === 'object' && !Array.isArray(value) && pathPrefix.split('.').length < 10) {
                    this.searchInObject(value, keyword, category, currentPath, results, includeValues);
                }
            }
        }
        catch (error) {
            // Skip objects that can't be enumerated
        }
    }
    async exportPreferences(categories, scope = 'global', includeDefaults = false) {
        return new Promise(async (resolve) => {
            var _a, _b, _c, _d;
            try {
                // Validate scope parameter
                const validScopes = ['global', 'local'];
                if (!validScopes.includes(scope)) {
                    resolve({
                        success: false,
                        error: `Invalid scope "${scope}". Must be one of: ${validScopes.join(', ')}`
                    });
                    return;
                }
                // Validate categories parameter if provided
                if (categories) {
                    if (!Array.isArray(categories)) {
                        resolve({
                            success: false,
                            error: 'Categories must be an array'
                        });
                        return;
                    }
                    const validCategories = ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions', 'preview', 'console', 'native', 'builder'];
                    const invalidCategories = categories.filter(cat => !validCategories.includes(cat));
                    if (invalidCategories.length > 0) {
                        resolve({
                            success: false,
                            error: `Invalid categories: ${invalidCategories.join(', ')}. Valid categories are: ${validCategories.join(', ')}`
                        });
                        return;
                    }
                }
                const allPrefsResponse = await this.getAllPreferences(scope, categories);
                if (!allPrefsResponse.success) {
                    resolve(allPrefsResponse);
                    return;
                }
                const exportData = {
                    metadata: {
                        exportDate: new Date().toISOString(),
                        scope: scope,
                        includeDefaults: includeDefaults,
                        cocosVersion: ((_a = Editor.versions) === null || _a === void 0 ? void 0 : _a.cocos) || 'Unknown',
                        exportedCategories: Object.keys(((_b = allPrefsResponse.data) === null || _b === void 0 ? void 0 : _b.preferences) || {}),
                        requestedCategories: categories || 'all'
                    },
                    preferences: ((_c = allPrefsResponse.data) === null || _c === void 0 ? void 0 : _c.preferences) || {}
                };
                // Include defaults if requested
                if (includeDefaults) {
                    try {
                        const defaultsResponse = await this.getAllPreferences('default', categories);
                        if (defaultsResponse.success) {
                            exportData.defaults = ((_d = defaultsResponse.data) === null || _d === void 0 ? void 0 : _d.preferences) || {};
                        }
                        else {
                            exportData.metadata.defaultsWarning = 'Could not retrieve default preferences';
                        }
                    }
                    catch (error) {
                        exportData.metadata.defaultsWarning = 'Error retrieving default preferences';
                    }
                }
                const jsonData = JSON.stringify(exportData, null, 2);
                const exportPath = `cocos_preferences_${scope}_${Date.now()}.json`;
                resolve({
                    success: true,
                    message: `✅ Preferences exported for ${exportData.metadata.exportedCategories.length} categories`,
                    data: {
                        exportPath,
                        metadata: exportData.metadata,
                        preferences: exportData.preferences,
                        jsonData,
                        fileSize: Buffer.byteLength(jsonData, 'utf8'),
                        summary: {
                            totalCategories: exportData.metadata.exportedCategories.length,
                            scope: scope,
                            includeDefaults: includeDefaults,
                            hasDefaults: !!exportData.defaults
                        }
                    }
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    error: `Export failed: ${error.message}`
                });
            }
        });
    }
    async validateBackupData(backupData) {
        return new Promise((resolve) => {
            try {
                const validation = {
                    isValid: true,
                    errors: [],
                    warnings: [],
                    metadata: null
                };
                // Check if backupData is provided
                if (backupData === undefined || backupData === null) {
                    validation.isValid = false;
                    validation.errors.push('Backup data is required and cannot be null or undefined');
                    resolve({
                        success: false,
                        error: 'Backup data is required for validation'
                    });
                    return;
                }
                // Check basic structure
                if (typeof backupData !== 'object' || Array.isArray(backupData)) {
                    validation.isValid = false;
                    validation.errors.push('Backup data must be a valid object (not array or primitive type)');
                }
                else {
                    // Check for metadata
                    if (backupData.metadata) {
                        if (typeof backupData.metadata !== 'object') {
                            validation.errors.push('Metadata must be an object');
                            validation.isValid = false;
                        }
                        else {
                            validation.metadata = backupData.metadata;
                            if (!backupData.metadata.exportDate) {
                                validation.warnings.push('Missing export date in metadata');
                            }
                            else if (typeof backupData.metadata.exportDate !== 'string') {
                                validation.warnings.push('Export date should be a string');
                            }
                            if (!backupData.metadata.scope) {
                                validation.warnings.push('Missing scope information in metadata');
                            }
                            else if (!['global', 'local', 'default'].includes(backupData.metadata.scope)) {
                                validation.warnings.push('Invalid scope value in metadata');
                            }
                            if (backupData.metadata.cocosVersion && typeof backupData.metadata.cocosVersion !== 'string') {
                                validation.warnings.push('Cocos version should be a string');
                            }
                        }
                    }
                    else {
                        validation.warnings.push('No metadata found in backup file');
                    }
                    // Check for preferences data
                    if (!backupData.preferences) {
                        validation.errors.push('No preferences data found in backup');
                        validation.isValid = false;
                    }
                    else if (typeof backupData.preferences !== 'object' || Array.isArray(backupData.preferences)) {
                        validation.errors.push('Preferences data must be an object (not array or primitive type)');
                        validation.isValid = false;
                    }
                    else {
                        // Count categories and validate structure
                        const categoryCount = Object.keys(backupData.preferences).length;
                        if (categoryCount === 0) {
                            validation.warnings.push('Backup contains no preference categories');
                        }
                        // Validate category names
                        const validCategories = ['general', 'external-tools', 'data-editor', 'laboratory', 'extensions', 'preview', 'console', 'native', 'builder'];
                        const invalidCategories = Object.keys(backupData.preferences).filter(cat => !validCategories.includes(cat));
                        if (invalidCategories.length > 0) {
                            validation.warnings.push(`Unknown categories found: ${invalidCategories.join(', ')}`);
                        }
                    }
                }
                resolve({
                    success: true,
                    message: `✅ Backup validation completed: ${validation.isValid ? 'Valid' : 'Invalid'}`,
                    data: {
                        isValid: validation.isValid,
                        errors: validation.errors,
                        warnings: validation.warnings,
                        metadata: validation.metadata,
                        summary: {
                            hasErrors: validation.errors.length > 0,
                            hasWarnings: validation.warnings.length > 0,
                            categoryCount: (backupData === null || backupData === void 0 ? void 0 : backupData.preferences) ? Object.keys(backupData.preferences).length : 0,
                            errorCount: validation.errors.length,
                            warningCount: validation.warnings.length
                        }
                    }
                });
            }
            catch (error) {
                resolve({
                    success: false,
                    error: `Validation failed: ${error.message}`
                });
            }
        });
    }
}
exports.PreferencesTools = PreferencesTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXMtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvcHJlZmVyZW5jZXMtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxnQkFBZ0I7SUFDekIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQUUsb1JBQW9SO2dCQUNqUyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE1BQU0sRUFBRTs0QkFDSixJQUFJLEVBQUUsUUFBUTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxjQUFjLENBQUM7NEJBQ2hFLFdBQVcsRUFBRSxrUkFBa1I7eUJBQ2xTO3dCQUNELHdCQUF3Qjt3QkFDeEIsR0FBRyxFQUFFOzRCQUNELElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7NEJBQ3pILFdBQVcsRUFBRSx5VUFBeVU7eUJBQ3pWO3dCQUNELGlEQUFpRDt3QkFDakQsUUFBUSxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFROzRCQUNkLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUM7NEJBQ3pILFdBQVcsRUFBRSxzUUFBc1E7NEJBQ25SLE9BQU8sRUFBRSxTQUFTO3lCQUNyQjt3QkFDRCxJQUFJLEVBQUU7NEJBQ0YsSUFBSSxFQUFFLFFBQVE7NEJBQ2QsV0FBVyxFQUFFLDJQQUEyUDt5QkFDM1E7d0JBQ0QsS0FB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ZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcblxuZXhwb3J0IGNsYXNzIFByZWZlcmVuY2VzVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmZXJlbmNlc19tYW5hZ2UnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUFJFRkVSRU5DRVMgTUFOQUdFTUVOVDogQ29uZmlndXJlIENvY29zIENyZWF0b3IgZWRpdG9yIHNldHRpbmdzIGFuZCBvcGVuIHByZWZlcmVuY2VzIHBhbmVsLiBXT1JLRkxPVzogb3Blbl9wYW5lbCB0byBhY2Nlc3MgR1VJIHNldHRpbmdzLCBnZXRfY29uZmlnIHRvIHJlYWQgY3VycmVudCB2YWx1ZXMsIHNldF9jb25maWcgdG8gbW9kaWZ5IHNldHRpbmdzLCByZXNldF9jb25maWcgdG8gcmVzdG9yZSBkZWZhdWx0cy4gU3VwcG9ydHMgZ2xvYmFsL2xvY2FsL2RlZmF1bHQgc2NvcGVzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnb3Blbl9wYW5lbCcsICdnZXRfY29uZmlnJywgJ3NldF9jb25maWcnLCAncmVzZXRfY29uZmlnJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmVmZXJlbmNlIG9wZXJhdGlvbjogXCJvcGVuX3BhbmVsXCIgPSBsYXVuY2ggcHJlZmVyZW5jZXMgR1VJIChvcHRpb25hbCB0YWIgcGFyYW1ldGVyKSB8IFwiZ2V0X2NvbmZpZ1wiID0gcmVhZCBjb25maWd1cmF0aW9uIHZhbHVlcyAocmVxdWlyZXMgY2F0ZWdvcnkrcGF0aCkgfCBcInNldF9jb25maWdcIiA9IG1vZGlmeSBzZXR0aW5ncyAocmVxdWlyZXMgY2F0ZWdvcnkrcGF0aCt2YWx1ZSkgfCBcInJlc2V0X2NvbmZpZ1wiID0gcmVzdG9yZSBkZWZhdWx0cyAocmVxdWlyZXMgY2F0ZWdvcnkpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBvcGVuX3BhbmVsIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgdGFiOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZW5lcmFsJywgJ2V4dGVybmFsLXRvb2xzJywgJ2RhdGEtZWRpdG9yJywgJ2xhYm9yYXRvcnknLCAnZXh0ZW5zaW9ucycsICdwcmV2aWV3JywgJ2NvbnNvbGUnLCAnbmF0aXZlJywgJ2J1aWxkZXInXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByZWZlcmVuY2VzIHRhYiB0byBkaXNwbGF5IChvcGVuX3BhbmVsIGFjdGlvbikuIEF2YWlsYWJsZSB0YWJzOiBcImdlbmVyYWxcIiAoYmFzaWMgc2V0dGluZ3MpLCBcImV4dGVybmFsLXRvb2xzXCIgKGVkaXRvciB0b29scyksIFwiZGF0YS1lZGl0b3JcIiAoZGF0YSBlZGl0aW5nKSwgXCJsYWJvcmF0b3J5XCIgKGV4cGVyaW1lbnRhbCBmZWF0dXJlcyksIFwiZXh0ZW5zaW9uc1wiIChwbHVnaW5zKSwgXCJwcmV2aWV3XCIgKHByZXZpZXcgc2V0dGluZ3MpLCBcImNvbnNvbGVcIiAoY29uc29sZSBjb25maWcpLCBcIm5hdGl2ZVwiIChuYXRpdmUgYnVpbGQpLCBcImJ1aWxkZXJcIiAoYnVpbGQgc2V0dGluZ3MpLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgZ2V0X2NvbmZpZy9zZXRfY29uZmlnL3Jlc2V0X2NvbmZpZyBhY3Rpb25zXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2VuZXJhbCcsICdleHRlcm5hbC10b29scycsICdkYXRhLWVkaXRvcicsICdsYWJvcmF0b3J5JywgJ2V4dGVuc2lvbnMnLCAncHJldmlldycsICdjb25zb2xlJywgJ25hdGl2ZScsICdidWlsZGVyJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25maWd1cmF0aW9uIGNhdGVnb3J5IChSRVFVSVJFRCBmb3IgZ2V0X2NvbmZpZy9zZXRfY29uZmlnL3Jlc2V0X2NvbmZpZykuIENhdGVnb3JpZXMgbWF0Y2ggcHJlZmVyZW5jZXMgdGFicy4gXCJnZW5lcmFsXCIgPSBiYXNpYyBlZGl0b3Igc2V0dGluZ3MsIFwiZXh0ZXJuYWwtdG9vbHNcIiA9IHRvb2wgaW50ZWdyYXRpb24sIFwiZGF0YS1lZGl0b3JcIiA9IGRhdGEgZWRpdGluZyBwcmVmZXJlbmNlcy4gRGVmYXVsdDogZ2VuZXJhbCBmb3IgY29tbW9uIHNldHRpbmdzLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2dlbmVyYWwnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2V0dGluZyBwYXRoIHdpdGhpbiBjYXRlZ29yeSAoUkVRVUlSRUQgZm9yIGdldF9jb25maWcvc2V0X2NvbmZpZykuIFVzZSBkb3Qgbm90YXRpb24gZm9yIG5lc3RlZCB2YWx1ZXMuIEV4YW1wbGVzOiBcImVkaXRvci5mb250U2l6ZVwiIGZvciBlZGl0b3IgdGV4dCBzaXplLCBcInByZXZpZXcuYXV0b1JlZnJlc2hcIiBmb3IgYXV0by1yZWZyZXNoIHNldHRpbmcuIENoZWNrIGF2YWlsYWJsZSBwYXRocyB3aXRoIGdldF9hbGwgYWN0aW9uIGZpcnN0LidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTmV3IHNldHRpbmcgdmFsdWUgKFJFUVVJUkVEIGZvciBzZXRfY29uZmlnKS4gVHlwZSBkZXBlbmRzIG9uIHNldHRpbmc6IHN0cmluZyBmb3IgcGF0aHMvbmFtZXMsIG51bWJlciBmb3Igc2l6ZXMvZGVsYXlzLCBib29sZWFuIGZvciBvbi9vZmYgb3B0aW9ucywgb2JqZWN0IGZvciBjb21wbGV4IHNldHRpbmdzLiBFeGFtcGxlczogMTQgZm9yIGZvbnRTaXplLCB0cnVlIGZvciBhdXRvU2F2ZSwgXCIvdXNyL2Jpbi9jb2RlXCIgZm9yIGVkaXRvciBwYXRoLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2xvYmFsJywgJ2xvY2FsJywgJ2RlZmF1bHQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NldHRpbmcgc2NvcGUgbGV2ZWwuIFwiZ2xvYmFsXCIgPSBhcHBsaWVzIHRvIGFsbCBwcm9qZWN0cyAobW9zdCBjb21tb24pLCBcImxvY2FsXCIgPSBjdXJyZW50IHByb2plY3Qgb25seSAob3ZlcnJpZGVzIGdsb2JhbCksIFwiZGVmYXVsdFwiID0gZmFjdG9yeSBzZXR0aW5ncyAocmVhZC1vbmx5IGZvciBjb21wYXJpc29uKS4gUmVjb21tZW5kZWQ6IGdsb2JhbCBmb3IgZ2VuZXJhbCBwcmVmZXJlbmNlcywgbG9jYWwgZm9yIHByb2plY3Qtc3BlY2lmaWMgb3ZlcnJpZGVzLicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2dsb2JhbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmZXJlbmNlc19xdWVyeScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQUkVGRVJFTkNFUyBRVUVSWTogR2V0IGFsbCBhdmFpbGFibGUgcHJlZmVyZW5jZXMsIGxpc3QgY2F0ZWdvcmllcywgb3Igc2VhcmNoIGZvciBzcGVjaWZpYyBwcmVmZXJlbmNlIHNldHRpbmdzLiBVc2UgdGhpcyBmb3IgcHJlZmVyZW5jZSBkaXNjb3ZlcnkgYW5kIGluc3BlY3Rpb24uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZXRfYWxsJywgJ2xpc3RfY2F0ZWdvcmllcycsICdzZWFyY2hfc2V0dGluZ3MnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGFjdGlvbjogXCJnZXRfYWxsXCIgPSByZXRyaWV2ZSBhbGwgcHJlZmVyZW5jZSBjb25maWd1cmF0aW9ucyB8IFwibGlzdF9jYXRlZ29yaWVzXCIgPSBnZXQgYXZhaWxhYmxlIHByZWZlcmVuY2UgY2F0ZWdvcmllcyB8IFwic2VhcmNoX3NldHRpbmdzXCIgPSBmaW5kIHNldHRpbmdzIGJ5IGtleXdvcmQnXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGdldF9hbGwgYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2xvYmFsJywgJ2xvY2FsJywgJ2RlZmF1bHQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbmZpZ3VyYXRpb24gc2NvcGUgdG8gcXVlcnkgKGdldF9hbGwgYWN0aW9uIG9ubHkpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAnZ2xvYmFsJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3JpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ2dlbmVyYWwnLCAnZXh0ZXJuYWwtdG9vbHMnLCAnZGF0YS1lZGl0b3InLCAnbGFib3JhdG9yeScsICdleHRlbnNpb25zJywgJ3ByZXZpZXcnLCAnY29uc29sZScsICduYXRpdmUnLCAnYnVpbGRlciddXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NwZWNpZmljIGNhdGVnb3JpZXMgdG8gaW5jbHVkZSAoZ2V0X2FsbCBhY3Rpb24gb25seSkuIElmIG5vdCBzcGVjaWZpZWQsIGFsbCBjYXRlZ29yaWVzIGFyZSBpbmNsdWRlZC4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHNlYXJjaF9zZXR0aW5ncyBhY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIGtleXdvcmQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NlYXJjaCBrZXl3b3JkIGZvciBmaW5kaW5nIHNldHRpbmdzIChzZWFyY2hfc2V0dGluZ3MgYWN0aW9uIG9ubHkpJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVWYWx1ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbmNsdWRlIGN1cnJlbnQgdmFsdWVzIGluIHNlYXJjaCByZXN1bHRzIChzZWFyY2hfc2V0dGluZ3MgYWN0aW9uIG9ubHkpJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAncHJlZmVyZW5jZXNfYmFja3VwJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1BSRUZFUkVOQ0VTIEJBQ0tVUDogRXhwb3J0IGN1cnJlbnQgcHJlZmVyZW5jZXMgdG8gSlNPTiBmb3JtYXQgb3IgcHJlcGFyZSBmb3IgYmFja3VwIG9wZXJhdGlvbnMuIFVzZSB0aGlzIGZvciBwcmVmZXJlbmNlIGJhY2t1cCBhbmQgcmVzdG9yZSB3b3JrZmxvd3MuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydleHBvcnQnLCAndmFsaWRhdGVfYmFja3VwJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdCYWNrdXAgYWN0aW9uOiBcImV4cG9ydFwiID0gZXhwb3J0IHByZWZlcmVuY2VzIHRvIEpTT04gfCBcInZhbGlkYXRlX2JhY2t1cFwiID0gY2hlY2sgYmFja3VwIGZpbGUgZm9ybWF0J1xuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleHBvcnQgYWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydnZW5lcmFsJywgJ2V4dGVybmFsLXRvb2xzJywgJ2RhdGEtZWRpdG9yJywgJ2xhYm9yYXRvcnknLCAnZXh0ZW5zaW9ucycsICdwcmV2aWV3JywgJ2NvbnNvbGUnLCAnbmF0aXZlJywgJ2J1aWxkZXInXVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDYXRlZ29yaWVzIHRvIGV4cG9ydCAoZXhwb3J0IGFjdGlvbiBvbmx5KS4gSWYgbm90IHNwZWNpZmllZCwgYWxsIGNhdGVnb3JpZXMgYXJlIGV4cG9ydGVkLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudW06IFsnZ2xvYmFsJywgJ2xvY2FsJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25maWd1cmF0aW9uIHNjb3BlIHRvIGV4cG9ydCAoZXhwb3J0IGFjdGlvbiBvbmx5KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogJ2dsb2JhbCdcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlRGVmYXVsdHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYm9vbGVhbicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbmNsdWRlIGRlZmF1bHQgdmFsdWVzIGluIGV4cG9ydCAoZXhwb3J0IGFjdGlvbiBvbmx5KScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgdmFsaWRhdGVfYmFja3VwIGFjdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgYmFja3VwRGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmFja3VwIGRhdGEgdG8gdmFsaWRhdGUgKHZhbGlkYXRlX2JhY2t1cCBhY3Rpb24gb25seSknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAncHJlZmVyZW5jZXNfbWFuYWdlJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVQcmVmZXJlbmNlc01hbmFnZShhcmdzKTtcbiAgICAgICAgICAgIGNhc2UgJ3ByZWZlcmVuY2VzX3F1ZXJ5JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVQcmVmZXJlbmNlc1F1ZXJ5KGFyZ3MpO1xuICAgICAgICAgICAgY2FzZSAncHJlZmVyZW5jZXNfYmFja3VwJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5oYW5kbGVQcmVmZXJlbmNlc0JhY2t1cChhcmdzKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBOZXcgY29uc29saWRhdGVkIGhhbmRsZXJzXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVQcmVmZXJlbmNlc01hbmFnZShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCB7IGFjdGlvbiB9ID0gYXJncztcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdvcGVuX3BhbmVsJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5vcGVuUHJlZmVyZW5jZXNQYW5lbChhcmdzLnRhYik7XG4gICAgICAgICAgICBjYXNlICdnZXRfY29uZmlnJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5nZXRQcmVmZXJlbmNlc0NvbmZpZyhhcmdzLmNhdGVnb3J5LCBhcmdzLnBhdGgsIGFyZ3Muc2NvcGUpO1xuICAgICAgICAgICAgY2FzZSAnc2V0X2NvbmZpZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc2V0UHJlZmVyZW5jZXNDb25maWcoYXJncy5jYXRlZ29yeSwgYXJncy5wYXRoLCBhcmdzLnZhbHVlLCBhcmdzLnNjb3BlKTtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc2V0X2NvbmZpZyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucmVzZXRQcmVmZXJlbmNlc0NvbmZpZyhhcmdzLmNhdGVnb3J5LCBhcmdzLnNjb3BlKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBwcmVmZXJlbmNlcyBtYW5hZ2UgYWN0aW9uOiAke2FjdGlvbn1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZVByZWZlcmVuY2VzUXVlcnkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24gfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZ2V0X2FsbCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZ2V0QWxsUHJlZmVyZW5jZXMoYXJncy5zY29wZSwgYXJncy5jYXRlZ29yaWVzKTtcbiAgICAgICAgICAgIGNhc2UgJ2xpc3RfY2F0ZWdvcmllcyc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMubGlzdFByZWZlcmVuY2VzQ2F0ZWdvcmllcygpO1xuICAgICAgICAgICAgY2FzZSAnc2VhcmNoX3NldHRpbmdzJzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zZWFyY2hQcmVmZXJlbmNlc1NldHRpbmdzKGFyZ3Mua2V5d29yZCwgYXJncy5pbmNsdWRlVmFsdWVzKTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBwcmVmZXJlbmNlcyBxdWVyeSBhY3Rpb246ICR7YWN0aW9ufWAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlUHJlZmVyZW5jZXNCYWNrdXAoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3QgeyBhY3Rpb24gfSA9IGFyZ3M7XG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZXhwb3J0JzpcbiAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5leHBvcnRQcmVmZXJlbmNlcyhhcmdzLmNhdGVnb3JpZXMsIGFyZ3Muc2NvcGUsIGFyZ3MuaW5jbHVkZURlZmF1bHRzKTtcbiAgICAgICAgICAgIGNhc2UgJ3ZhbGlkYXRlX2JhY2t1cCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMudmFsaWRhdGVCYWNrdXBEYXRhKGFyZ3MuYmFja3VwRGF0YSk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gcHJlZmVyZW5jZXMgYmFja3VwIGFjdGlvbjogJHthY3Rpb259YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gSW1wbGVtZW50YXRpb24gbWV0aG9kc1xuICAgIHByaXZhdGUgYXN5bmMgb3BlblByZWZlcmVuY2VzUGFuZWwodGFiPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0QXJncyA9IHRhYiA/IFt0YWJdIDogW107XG5cbiAgICAgICAgICAgIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3ByZWZlcmVuY2VzJywgJ29wZW4tc2V0dGluZ3MnLCAuLi5yZXF1ZXN0QXJncykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDinIUgUHJlZmVyZW5jZXMgcGFuZWwgb3BlbmVkJHt0YWIgPyBgIG9uIFwiJHt0YWJ9XCIgdGFiYCA6ICcnfWAsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgdGFiOiB0YWIgfHwgJ2dlbmVyYWwnIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBvcGVuIHByZWZlcmVuY2VzIHBhbmVsOiAke2Vyci5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRQcmVmZXJlbmNlc0NvbmZpZyhjYXRlZ29yeTogc3RyaW5nLCBwYXRoPzogc3RyaW5nLCBzY29wZTogc3RyaW5nID0gJ2dsb2JhbCcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGNhdGVnb3J5IHBhcmFtZXRlclxuICAgICAgICAgICAgaWYgKCFjYXRlZ29yeSB8fCB0eXBlb2YgY2F0ZWdvcnkgIT09ICdzdHJpbmcnIHx8IGNhdGVnb3J5LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAnQ2F0ZWdvcnkgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdHJpbW1lZENhdGVnb3J5ID0gY2F0ZWdvcnkudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgcmVxdWVzdEFyZ3MgPSBbdHJpbW1lZENhdGVnb3J5XTtcbiAgICAgICAgICAgIGlmIChwYXRoICYmIHR5cGVvZiBwYXRoID09PSAnc3RyaW5nJyAmJiBwYXRoLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdEFyZ3MucHVzaChwYXRoLnRyaW0oKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXF1ZXN0QXJncy5wdXNoKHNjb3BlKTtcblxuICAgICAgICAgICAgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgncHJlZmVyZW5jZXMnLCAncXVlcnktY29uZmlnJywgLi4ucmVxdWVzdEFyZ3MpLnRoZW4oKGNvbmZpZzogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDinIUgQ29uZmlndXJhdGlvbiByZXRyaWV2ZWQgZm9yICR7dHJpbW1lZENhdGVnb3J5fSR7cGF0aCA/IGAuJHtwYXRoLnRyaW0oKX1gIDogJyd9YCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2F0ZWdvcnk6IHRyaW1tZWRDYXRlZ29yeSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHBhdGggPyBwYXRoLnRyaW0oKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBnZXQgcHJlZmVyZW5jZSBjb25maWc6ICR7ZXJyLm1lc3NhZ2V9YCB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHNldFByZWZlcmVuY2VzQ29uZmlnKGNhdGVnb3J5OiBzdHJpbmcsIHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSwgc2NvcGU6IHN0cmluZyA9ICdnbG9iYWwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBwYXJhbWV0ZXJzXG4gICAgICAgICAgICBpZiAoIWNhdGVnb3J5IHx8IHR5cGVvZiBjYXRlZ29yeSAhPT0gJ3N0cmluZycgfHwgY2F0ZWdvcnkudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdDYXRlZ29yeSBpcyByZXF1aXJlZCBhbmQgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIXBhdGggfHwgdHlwZW9mIHBhdGggIT09ICdzdHJpbmcnIHx8IHBhdGgudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdQYXRoIGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ1ZhbHVlIGlzIHJlcXVpcmVkIGFuZCBjYW5ub3QgYmUgdW5kZWZpbmVkJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgdHJpbW1lZENhdGVnb3J5ID0gY2F0ZWdvcnkudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgdHJpbW1lZFBhdGggPSBwYXRoLnRyaW0oKTtcblxuICAgICAgICAgICAgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgncHJlZmVyZW5jZXMnLCAnc2V0LWNvbmZpZycsIHRyaW1tZWRDYXRlZ29yeSwgdHJpbW1lZFBhdGgsIHZhbHVlLCBzY29wZSkudGhlbigoc3VjY2VzczogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDinIUgUHJlZmVyZW5jZSBcIiR7dHJpbW1lZENhdGVnb3J5fS4ke3RyaW1tZWRQYXRofVwiIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogdHJpbW1lZENhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHRyaW1tZWRQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byB1cGRhdGUgcHJlZmVyZW5jZSBcIiR7dHJpbW1lZENhdGVnb3J5fS4ke3RyaW1tZWRQYXRofVwiLiBWYWx1ZSBtYXkgYmUgaW52YWxpZCBvciByZWFkLW9ubHkuYFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBFcnJvciBzZXR0aW5nIHByZWZlcmVuY2U6ICR7ZXJyLm1lc3NhZ2V9YCB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIHJlc2V0UHJlZmVyZW5jZXNDb25maWcoY2F0ZWdvcnk6IHN0cmluZywgc2NvcGU6IHN0cmluZyA9ICdnbG9iYWwnKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICAvLyBWYWxpZGF0ZSBjYXRlZ29yeSBwYXJhbWV0ZXJcbiAgICAgICAgICAgIGlmICghY2F0ZWdvcnkgfHwgdHlwZW9mIGNhdGVnb3J5ICE9PSAnc3RyaW5nJyB8fCBjYXRlZ29yeS50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0NhdGVnb3J5IGlzIHJlcXVpcmVkIGFuZCBtdXN0IGJlIGEgbm9uLWVtcHR5IHN0cmluZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHRyaW1tZWRDYXRlZ29yeSA9IGNhdGVnb3J5LnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gR2V0IGRlZmF1bHQgY29uZmlndXJhdGlvbiBmaXJzdFxuICAgICAgICAgICAgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgncHJlZmVyZW5jZXMnLCAncXVlcnktY29uZmlnJywgdHJpbW1lZENhdGVnb3J5LCB1bmRlZmluZWQsICdkZWZhdWx0JykudGhlbigoZGVmYXVsdENvbmZpZzogYW55KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCFkZWZhdWx0Q29uZmlnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTm8gZGVmYXVsdCBjb25maWd1cmF0aW9uIGZvdW5kIGZvciBjYXRlZ29yeSBcIiR7dHJpbW1lZENhdGVnb3J5fVwiYCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIEFwcGx5IGRlZmF1bHQgY29uZmlndXJhdGlvblxuICAgICAgICAgICAgICAgIHJldHVybiAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdwcmVmZXJlbmNlcycsICdzZXQtY29uZmlnJywgdHJpbW1lZENhdGVnb3J5LCAnJywgZGVmYXVsdENvbmZpZywgc2NvcGUpO1xuICAgICAgICAgICAgfSkudGhlbigoc3VjY2VzczogYm9vbGVhbikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDinIUgUHJlZmVyZW5jZSBjYXRlZ29yeSBcIiR7dHJpbW1lZENhdGVnb3J5fVwiIHJlc2V0IHRvIGRlZmF1bHRzYCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXRlZ29yeTogdHJpbW1lZENhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGlvbjogJ3Jlc2V0J1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gcmVzZXQgcHJlZmVyZW5jZSBjYXRlZ29yeSBcIiR7dHJpbW1lZENhdGVnb3J5fVwiLiBDYXRlZ29yeSBtYXkgbm90IHN1cHBvcnQgcmVzZXQgb3BlcmF0aW9uLmBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRXJyb3IgcmVzZXR0aW5nIHByZWZlcmVuY2VzOiAke2Vyci5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBbGxQcmVmZXJlbmNlcyhzY29wZTogc3RyaW5nID0gJ2dsb2JhbCcsIGNhdGVnb3JpZXM/OiBzdHJpbmdbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlQ2F0ZWdvcmllcyA9IFtcbiAgICAgICAgICAgICAgICAnZ2VuZXJhbCcsXG4gICAgICAgICAgICAgICAgJ2V4dGVybmFsLXRvb2xzJywgXG4gICAgICAgICAgICAgICAgJ2RhdGEtZWRpdG9yJyxcbiAgICAgICAgICAgICAgICAnbGFib3JhdG9yeScsXG4gICAgICAgICAgICAgICAgJ2V4dGVuc2lvbnMnLFxuICAgICAgICAgICAgICAgICdwcmV2aWV3JyxcbiAgICAgICAgICAgICAgICAnY29uc29sZScsXG4gICAgICAgICAgICAgICAgJ25hdGl2ZScsXG4gICAgICAgICAgICAgICAgJ2J1aWxkZXInXG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICAvLyBVc2Ugc3BlY2lmaWVkIGNhdGVnb3JpZXMgb3IgYWxsIGF2YWlsYWJsZSBvbmVzXG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yaWVzVG9RdWVyeSA9IGNhdGVnb3JpZXMgfHwgYXZhaWxhYmxlQ2F0ZWdvcmllcztcbiAgICAgICAgICAgIGNvbnN0IHByZWZlcmVuY2VzOiBhbnkgPSB7fTtcblxuICAgICAgICAgICAgY29uc3QgcXVlcnlQcm9taXNlcyA9IGNhdGVnb3JpZXNUb1F1ZXJ5Lm1hcChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3ByZWZlcmVuY2VzJywgJ3F1ZXJ5LWNvbmZpZycsIGNhdGVnb3J5LCB1bmRlZmluZWQsIHNjb3BlKVxuICAgICAgICAgICAgICAgICAgICAudGhlbigoY29uZmlnOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZlcmVuY2VzW2NhdGVnb3J5XSA9IGNvbmZpZztcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgLmNhdGNoKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENhdGVnb3J5IGRvZXNuJ3QgZXhpc3Qgb3IgYWNjZXNzIGRlbmllZFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmVyZW5jZXNbY2F0ZWdvcnldID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgUHJvbWlzZS5hbGwocXVlcnlQcm9taXNlcykudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRmlsdGVyIG91dCBudWxsIGVudHJpZXNcbiAgICAgICAgICAgICAgICBjb25zdCB2YWxpZFByZWZlcmVuY2VzID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICAgICAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhwcmVmZXJlbmNlcykuZmlsdGVyKChbXywgdmFsdWVdKSA9PiB2YWx1ZSAhPT0gbnVsbClcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDinIUgUmV0cmlldmVkIHByZWZlcmVuY2VzIGZvciAke09iamVjdC5rZXlzKHZhbGlkUHJlZmVyZW5jZXMpLmxlbmd0aH0gY2F0ZWdvcmllc2AsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdGVkQ2F0ZWdvcmllczogY2F0ZWdvcmllc1RvUXVlcnksXG4gICAgICAgICAgICAgICAgICAgICAgICBhdmFpbGFibGVDYXRlZ29yaWVzOiBPYmplY3Qua2V5cyh2YWxpZFByZWZlcmVuY2VzKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZWZlcmVuY2VzOiB2YWxpZFByZWZlcmVuY2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VtbWFyeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsQ2F0ZWdvcmllczogT2JqZWN0LmtleXModmFsaWRQcmVmZXJlbmNlcykubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlOiBzY29wZVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBFcnJvciByZXRyaWV2aW5nIHByZWZlcmVuY2VzOiAke2Vyci5tZXNzYWdlfWAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0UHJlZmVyZW5jZXNDYXRlZ29yaWVzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IFtcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdnZW5lcmFsJywgZGVzY3JpcHRpb246ICdHZW5lcmFsIGVkaXRvciBzZXR0aW5ncyBhbmQgVUkgcHJlZmVyZW5jZXMnIH0sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiAnZXh0ZXJuYWwtdG9vbHMnLCBkZXNjcmlwdGlvbjogJ0V4dGVybmFsIHRvb2wgaW50ZWdyYXRpb25zIGFuZCBwYXRocycgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdkYXRhLWVkaXRvcicsIGRlc2NyaXB0aW9uOiAnRGF0YSBlZGl0b3IgY29uZmlndXJhdGlvbnMgYW5kIHRlbXBsYXRlcycgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdsYWJvcmF0b3J5JywgZGVzY3JpcHRpb246ICdFeHBlcmltZW50YWwgZmVhdHVyZXMgYW5kIGJldGEgZnVuY3Rpb25hbGl0eScgfSxcbiAgICAgICAgICAgICAgICB7IG5hbWU6ICdleHRlbnNpb25zJywgZGVzY3JpcHRpb246ICdFeHRlbnNpb24gbWFuYWdlciBhbmQgcGx1Z2luIHNldHRpbmdzJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ3ByZXZpZXcnLCBkZXNjcmlwdGlvbjogJ0dhbWUgcHJldmlldyBhbmQgc2ltdWxhdG9yIHNldHRpbmdzJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2NvbnNvbGUnLCBkZXNjcmlwdGlvbjogJ0NvbnNvbGUgcGFuZWwgZGlzcGxheSBhbmQgbG9nZ2luZyBvcHRpb25zJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ25hdGl2ZScsIGRlc2NyaXB0aW9uOiAnTmF0aXZlIHBsYXRmb3JtIGJ1aWxkIGNvbmZpZ3VyYXRpb25zJyB9LFxuICAgICAgICAgICAgICAgIHsgbmFtZTogJ2J1aWxkZXInLCBkZXNjcmlwdGlvbjogJ0J1aWxkIHN5c3RlbSBhbmQgY29tcGlsYXRpb24gc2V0dGluZ3MnIH1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYOKchSBMaXN0ZWQgJHtjYXRlZ29yaWVzLmxlbmd0aH0gYXZhaWxhYmxlIHByZWZlcmVuY2UgY2F0ZWdvcmllc2AsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBjYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICB0b3RhbENvdW50OiBjYXRlZ29yaWVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgdXNhZ2U6ICdVc2UgdGhlc2UgY2F0ZWdvcnkgbmFtZXMgd2l0aCBwcmVmZXJlbmNlc19tYW5hZ2Ugb3IgcHJlZmVyZW5jZXNfcXVlcnkgdG9vbHMnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgc2VhcmNoUHJlZmVyZW5jZXNTZXR0aW5ncyhrZXl3b3JkOiBzdHJpbmcsIGluY2x1ZGVWYWx1ZXM6IGJvb2xlYW4gPSB0cnVlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGFzeW5jIChyZXNvbHZlKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIC8vIFZhbGlkYXRlIGtleXdvcmQgcGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgaWYgKCFrZXl3b3JkIHx8IHR5cGVvZiBrZXl3b3JkICE9PSAnc3RyaW5nJyB8fCBrZXl3b3JkLnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnU2VhcmNoIGtleXdvcmQgaXMgcmVxdWlyZWQgYW5kIG11c3QgYmUgYSBub24tZW1wdHkgc3RyaW5nJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHRyaW1tZWRLZXl3b3JkID0ga2V5d29yZC50cmltKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYWxsUHJlZnNSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0QWxsUHJlZmVyZW5jZXMoJ2dsb2JhbCcpO1xuICAgICAgICAgICAgICAgIGlmICghYWxsUHJlZnNSZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYWxsUHJlZnNSZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBwcmVmZXJlbmNlcyA9IGFsbFByZWZzUmVzcG9uc2UuZGF0YT8ucHJlZmVyZW5jZXMgfHwge307XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoUmVzdWx0czogYW55W10gPSBbXTtcblxuICAgICAgICAgICAgICAgIC8vIFNlYXJjaCB0aHJvdWdoIGFsbCBjYXRlZ29yaWVzIGFuZCB0aGVpciBzZXR0aW5nc1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgW2NhdGVnb3J5LCBjb25maWddIG9mIE9iamVjdC5lbnRyaWVzKHByZWZlcmVuY2VzKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoY29uZmlnICYmIHR5cGVvZiBjb25maWcgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNlYXJjaEluT2JqZWN0KGNvbmZpZyBhcyBhbnksIHRyaW1tZWRLZXl3b3JkLCBjYXRlZ29yeSwgJycsIHNlYXJjaFJlc3VsdHMsIGluY2x1ZGVWYWx1ZXMpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDinIUgRm91bmQgJHtzZWFyY2hSZXN1bHRzLmxlbmd0aH0gc2V0dGluZ3MgbWF0Y2hpbmcgXCIke3RyaW1tZWRLZXl3b3JkfVwiYCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAga2V5d29yZDogdHJpbW1lZEtleXdvcmQsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlVmFsdWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0Q291bnQ6IHNlYXJjaFJlc3VsdHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0czogc2VhcmNoUmVzdWx0cy5zbGljZSgwLCA1MCksIC8vIExpbWl0IHJlc3VsdHMgdG8gcHJldmVudCBvdmVyd2hlbG1pbmcgb3V0cHV0XG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNNb3JlUmVzdWx0czogc2VhcmNoUmVzdWx0cy5sZW5ndGggPiA1MFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFNlYXJjaCBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgc2VhcmNoSW5PYmplY3Qob2JqOiBhbnksIGtleXdvcmQ6IHN0cmluZywgY2F0ZWdvcnk6IHN0cmluZywgcGF0aFByZWZpeDogc3RyaW5nLCByZXN1bHRzOiBhbnlbXSwgaW5jbHVkZVZhbHVlczogYm9vbGVhbik6IHZvaWQge1xuICAgICAgICBpZiAoIW9iaiB8fCB0eXBlb2Ygb2JqICE9PSAnb2JqZWN0JyB8fCAha2V5d29yZCB8fCB0eXBlb2Yga2V5d29yZCAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxvd2VyS2V5d29yZCA9IGtleXdvcmQudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhvYmopKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBrZXkgIT09ICdzdHJpbmcnKSBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50UGF0aCA9IHBhdGhQcmVmaXggPyBgJHtwYXRoUHJlZml4fS4ke2tleX1gIDoga2V5O1xuICAgICAgICAgICAgICAgIGNvbnN0IGtleU1hdGNoZXMgPSBrZXkudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlcktleXdvcmQpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlTWF0Y2hlcyA9IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlcktleXdvcmQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChrZXlNYXRjaGVzIHx8IHZhbHVlTWF0Y2hlcykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5LFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogY3VycmVudFBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRjaFR5cGU6IGtleU1hdGNoZXMgPyAodmFsdWVNYXRjaGVzID8gJ2JvdGgnIDogJ2tleScpIDogJ3ZhbHVlJ1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVWYWx1ZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0LnZhbHVlVHlwZSA9IHR5cGVvZiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlYXJjaCBuZXN0ZWQgb2JqZWN0cyAod2l0aCBkZXB0aCBsaW1pdCB0byBwcmV2ZW50IGluZmluaXRlIHJlY3Vyc2lvbilcbiAgICAgICAgICAgICAgICBpZiAodmFsdWUgJiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSkgJiYgcGF0aFByZWZpeC5zcGxpdCgnLicpLmxlbmd0aCA8IDEwKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VhcmNoSW5PYmplY3QodmFsdWUsIGtleXdvcmQsIGNhdGVnb3J5LCBjdXJyZW50UGF0aCwgcmVzdWx0cywgaW5jbHVkZVZhbHVlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgLy8gU2tpcCBvYmplY3RzIHRoYXQgY2FuJ3QgYmUgZW51bWVyYXRlZFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyBleHBvcnRQcmVmZXJlbmNlcyhjYXRlZ29yaWVzPzogc3RyaW5nW10sIHNjb3BlOiBzdHJpbmcgPSAnZ2xvYmFsJywgaW5jbHVkZURlZmF1bHRzOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoYXN5bmMgKHJlc29sdmUpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgLy8gVmFsaWRhdGUgc2NvcGUgcGFyYW1ldGVyXG4gICAgICAgICAgICAgICAgY29uc3QgdmFsaWRTY29wZXMgPSBbJ2dsb2JhbCcsICdsb2NhbCddO1xuICAgICAgICAgICAgICAgIGlmICghdmFsaWRTY29wZXMuaW5jbHVkZXMoc2NvcGUpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEludmFsaWQgc2NvcGUgXCIke3Njb3BlfVwiLiBNdXN0IGJlIG9uZSBvZjogJHt2YWxpZFNjb3Blcy5qb2luKCcsICcpfWBcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBWYWxpZGF0ZSBjYXRlZ29yaWVzIHBhcmFtZXRlciBpZiBwcm92aWRlZFxuICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yaWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShjYXRlZ29yaWVzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6ICdDYXRlZ29yaWVzIG11c3QgYmUgYW4gYXJyYXknXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbGlkQ2F0ZWdvcmllcyA9IFsnZ2VuZXJhbCcsICdleHRlcm5hbC10b29scycsICdkYXRhLWVkaXRvcicsICdsYWJvcmF0b3J5JywgJ2V4dGVuc2lvbnMnLCAncHJldmlldycsICdjb25zb2xlJywgJ25hdGl2ZScsICdidWlsZGVyJ107XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGludmFsaWRDYXRlZ29yaWVzID0gY2F0ZWdvcmllcy5maWx0ZXIoY2F0ID0+ICF2YWxpZENhdGVnb3JpZXMuaW5jbHVkZXMoY2F0KSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnZhbGlkQ2F0ZWdvcmllcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEludmFsaWQgY2F0ZWdvcmllczogJHtpbnZhbGlkQ2F0ZWdvcmllcy5qb2luKCcsICcpfS4gVmFsaWQgY2F0ZWdvcmllcyBhcmU6ICR7dmFsaWRDYXRlZ29yaWVzLmpvaW4oJywgJyl9YFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBhbGxQcmVmc1Jlc3BvbnNlID0gYXdhaXQgdGhpcy5nZXRBbGxQcmVmZXJlbmNlcyhzY29wZSwgY2F0ZWdvcmllcyk7XG4gICAgICAgICAgICAgICAgaWYgKCFhbGxQcmVmc1Jlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbGxQcmVmc1Jlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGV4cG9ydERhdGE6IGFueSA9IHtcbiAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydERhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlOiBzY29wZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVEZWZhdWx0czogaW5jbHVkZURlZmF1bHRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgY29jb3NWZXJzaW9uOiAoRWRpdG9yIGFzIGFueSkudmVyc2lvbnM/LmNvY29zIHx8ICdVbmtub3duJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9ydGVkQ2F0ZWdvcmllczogT2JqZWN0LmtleXMoYWxsUHJlZnNSZXNwb25zZS5kYXRhPy5wcmVmZXJlbmNlcyB8fCB7fSksXG4gICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0ZWRDYXRlZ29yaWVzOiBjYXRlZ29yaWVzIHx8ICdhbGwnXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHByZWZlcmVuY2VzOiBhbGxQcmVmc1Jlc3BvbnNlLmRhdGE/LnByZWZlcmVuY2VzIHx8IHt9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgIC8vIEluY2x1ZGUgZGVmYXVsdHMgaWYgcmVxdWVzdGVkXG4gICAgICAgICAgICAgICAgaWYgKGluY2x1ZGVEZWZhdWx0cykge1xuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdHNSZXNwb25zZSA9IGF3YWl0IHRoaXMuZ2V0QWxsUHJlZmVyZW5jZXMoJ2RlZmF1bHQnLCBjYXRlZ29yaWVzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkZWZhdWx0c1Jlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBvcnREYXRhLmRlZmF1bHRzID0gZGVmYXVsdHNSZXNwb25zZS5kYXRhPy5wcmVmZXJlbmNlcyB8fCB7fTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YS5tZXRhZGF0YS5kZWZhdWx0c1dhcm5pbmcgPSAnQ291bGQgbm90IHJldHJpZXZlIGRlZmF1bHQgcHJlZmVyZW5jZXMnO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0RGF0YS5tZXRhZGF0YS5kZWZhdWx0c1dhcm5pbmcgPSAnRXJyb3IgcmV0cmlldmluZyBkZWZhdWx0IHByZWZlcmVuY2VzJztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGpzb25EYXRhID0gSlNPTi5zdHJpbmdpZnkoZXhwb3J0RGF0YSwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgY29uc3QgZXhwb3J0UGF0aCA9IGBjb2Nvc19wcmVmZXJlbmNlc18ke3Njb3BlfV8ke0RhdGUubm93KCl9Lmpzb25gO1xuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGDinIUgUHJlZmVyZW5jZXMgZXhwb3J0ZWQgZm9yICR7ZXhwb3J0RGF0YS5tZXRhZGF0YS5leHBvcnRlZENhdGVnb3JpZXMubGVuZ3RofSBjYXRlZ29yaWVzYCxcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhwb3J0UGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiBleHBvcnREYXRhLm1ldGFkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJlZmVyZW5jZXM6IGV4cG9ydERhdGEucHJlZmVyZW5jZXMsXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uRGF0YSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVTaXplOiBCdWZmZXIuYnl0ZUxlbmd0aChqc29uRGF0YSwgJ3V0ZjgnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1bW1hcnk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b3RhbENhdGVnb3JpZXM6IGV4cG9ydERhdGEubWV0YWRhdGEuZXhwb3J0ZWRDYXRlZ29yaWVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZTogc2NvcGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZURlZmF1bHRzOiBpbmNsdWRlRGVmYXVsdHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGFzRGVmYXVsdHM6ICEhZXhwb3J0RGF0YS5kZWZhdWx0c1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEV4cG9ydCBmYWlsZWQ6ICR7ZXJyb3IubWVzc2FnZX1gXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVCYWNrdXBEYXRhKGJhY2t1cERhdGE6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0ge1xuICAgICAgICAgICAgICAgICAgICBpc1ZhbGlkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IFtdIGFzIHN0cmluZ1tdLFxuICAgICAgICAgICAgICAgICAgICB3YXJuaW5nczogW10gYXMgc3RyaW5nW10sXG4gICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiBudWxsIGFzIGFueVxuICAgICAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBiYWNrdXBEYXRhIGlzIHByb3ZpZGVkXG4gICAgICAgICAgICAgICAgaWYgKGJhY2t1cERhdGEgPT09IHVuZGVmaW5lZCB8fCBiYWNrdXBEYXRhID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb24uaXNWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uLmVycm9ycy5wdXNoKCdCYWNrdXAgZGF0YSBpcyByZXF1aXJlZCBhbmQgY2Fubm90IGJlIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogJ0JhY2t1cCBkYXRhIGlzIHJlcXVpcmVkIGZvciB2YWxpZGF0aW9uJ1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIENoZWNrIGJhc2ljIHN0cnVjdHVyZVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYmFja3VwRGF0YSAhPT0gJ29iamVjdCcgfHwgQXJyYXkuaXNBcnJheShiYWNrdXBEYXRhKSkge1xuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uLmlzVmFsaWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbi5lcnJvcnMucHVzaCgnQmFja3VwIGRhdGEgbXVzdCBiZSBhIHZhbGlkIG9iamVjdCAobm90IGFycmF5IG9yIHByaW1pdGl2ZSB0eXBlKScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGZvciBtZXRhZGF0YVxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFja3VwRGF0YS5tZXRhZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBiYWNrdXBEYXRhLm1ldGFkYXRhICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb24uZXJyb3JzLnB1c2goJ01ldGFkYXRhIG11c3QgYmUgYW4gb2JqZWN0Jyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbi5pc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb24ubWV0YWRhdGEgPSBiYWNrdXBEYXRhLm1ldGFkYXRhO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghYmFja3VwRGF0YS5tZXRhZGF0YS5leHBvcnREYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb24ud2FybmluZ3MucHVzaCgnTWlzc2luZyBleHBvcnQgZGF0ZSBpbiBtZXRhZGF0YScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJhY2t1cERhdGEubWV0YWRhdGEuZXhwb3J0RGF0ZSAhPT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbi53YXJuaW5ncy5wdXNoKCdFeHBvcnQgZGF0ZSBzaG91bGQgYmUgYSBzdHJpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFiYWNrdXBEYXRhLm1ldGFkYXRhLnNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb24ud2FybmluZ3MucHVzaCgnTWlzc2luZyBzY29wZSBpbmZvcm1hdGlvbiBpbiBtZXRhZGF0YScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIVsnZ2xvYmFsJywgJ2xvY2FsJywgJ2RlZmF1bHQnXS5pbmNsdWRlcyhiYWNrdXBEYXRhLm1ldGFkYXRhLnNjb3BlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uLndhcm5pbmdzLnB1c2goJ0ludmFsaWQgc2NvcGUgdmFsdWUgaW4gbWV0YWRhdGEnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYmFja3VwRGF0YS5tZXRhZGF0YS5jb2Nvc1ZlcnNpb24gJiYgdHlwZW9mIGJhY2t1cERhdGEubWV0YWRhdGEuY29jb3NWZXJzaW9uICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uLndhcm5pbmdzLnB1c2goJ0NvY29zIHZlcnNpb24gc2hvdWxkIGJlIGEgc3RyaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbi53YXJuaW5ncy5wdXNoKCdObyBtZXRhZGF0YSBmb3VuZCBpbiBiYWNrdXAgZmlsZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQ2hlY2sgZm9yIHByZWZlcmVuY2VzIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFiYWNrdXBEYXRhLnByZWZlcmVuY2VzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uLmVycm9ycy5wdXNoKCdObyBwcmVmZXJlbmNlcyBkYXRhIGZvdW5kIGluIGJhY2t1cCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbi5pc1ZhbGlkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGJhY2t1cERhdGEucHJlZmVyZW5jZXMgIT09ICdvYmplY3QnIHx8IEFycmF5LmlzQXJyYXkoYmFja3VwRGF0YS5wcmVmZXJlbmNlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb24uZXJyb3JzLnB1c2goJ1ByZWZlcmVuY2VzIGRhdGEgbXVzdCBiZSBhbiBvYmplY3QgKG5vdCBhcnJheSBvciBwcmltaXRpdmUgdHlwZSknKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbGlkYXRpb24uaXNWYWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ291bnQgY2F0ZWdvcmllcyBhbmQgdmFsaWRhdGUgc3RydWN0dXJlXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUNvdW50ID0gT2JqZWN0LmtleXMoYmFja3VwRGF0YS5wcmVmZXJlbmNlcykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNhdGVnb3J5Q291bnQgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxpZGF0aW9uLndhcm5pbmdzLnB1c2goJ0JhY2t1cCBjb250YWlucyBubyBwcmVmZXJlbmNlIGNhdGVnb3JpZXMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVmFsaWRhdGUgY2F0ZWdvcnkgbmFtZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbGlkQ2F0ZWdvcmllcyA9IFsnZ2VuZXJhbCcsICdleHRlcm5hbC10b29scycsICdkYXRhLWVkaXRvcicsICdsYWJvcmF0b3J5JywgJ2V4dGVuc2lvbnMnLCAncHJldmlldycsICdjb25zb2xlJywgJ25hdGl2ZScsICdidWlsZGVyJ107XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnZhbGlkQ2F0ZWdvcmllcyA9IE9iamVjdC5rZXlzKGJhY2t1cERhdGEucHJlZmVyZW5jZXMpLmZpbHRlcihjYXQgPT4gIXZhbGlkQ2F0ZWdvcmllcy5pbmNsdWRlcyhjYXQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnZhbGlkQ2F0ZWdvcmllcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbi53YXJuaW5ncy5wdXNoKGBVbmtub3duIGNhdGVnb3JpZXMgZm91bmQ6ICR7aW52YWxpZENhdGVnb3JpZXMuam9pbignLCAnKX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBg4pyFIEJhY2t1cCB2YWxpZGF0aW9uIGNvbXBsZXRlZDogJHt2YWxpZGF0aW9uLmlzVmFsaWQgPyAnVmFsaWQnIDogJ0ludmFsaWQnfWAsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzVmFsaWQ6IHZhbGlkYXRpb24uaXNWYWxpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yczogdmFsaWRhdGlvbi5lcnJvcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICB3YXJuaW5nczogdmFsaWRhdGlvbi53YXJuaW5ncyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB2YWxpZGF0aW9uLm1ldGFkYXRhLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3VtbWFyeToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhhc0Vycm9yczogdmFsaWRhdGlvbi5lcnJvcnMubGVuZ3RoID4gMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNXYXJuaW5nczogdmFsaWRhdGlvbi53YXJuaW5ncy5sZW5ndGggPiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhdGVnb3J5Q291bnQ6IGJhY2t1cERhdGE/LnByZWZlcmVuY2VzID8gT2JqZWN0LmtleXMoYmFja3VwRGF0YS5wcmVmZXJlbmNlcykubGVuZ3RoIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50OiB2YWxpZGF0aW9uLmVycm9ycy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2FybmluZ0NvdW50OiB2YWxpZGF0aW9uLndhcm5pbmdzLmxlbmd0aFxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogYFZhbGlkYXRpb24gZmFpbGVkOiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59Il19