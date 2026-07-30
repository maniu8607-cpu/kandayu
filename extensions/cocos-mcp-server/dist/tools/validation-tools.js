"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationTools = void 0;
class ValidationTools {
    getTools() {
        return [
            {
                name: 'validate_json_params',
                description: 'JSON PARAMETER VALIDATION: Validate and auto-fix JSON strings before sending to other tools. USAGE: Paste malformed JSON and get corrected version. Handles common issues like unescaped quotes, trailing commas, missing brackets. Essential for ensuring tool parameters are properly formatted.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        jsonString: {
                            type: 'string',
                            description: 'JSON string to validate and repair (REQUIRED). Can be malformed - tool will attempt automatic fixes. Examples: missing quotes, trailing commas, unescaped characters. Paste your JSON here for validation and correction.'
                        },
                        expectedSchema: {
                            type: 'object',
                            description: 'Expected JSON structure for validation (optional). Provides schema-based validation beyond syntax checking. Useful for ensuring JSON matches specific tool requirements. Leave empty for syntax-only validation.'
                        }
                    },
                    required: ['jsonString']
                }
            },
            {
                name: 'safe_string_value',
                description: 'STRING SAFETY: Convert text into JSON-safe format by escaping special characters. USAGE: When you have strings with quotes, newlines, or special characters that break JSON. Automatically handles escaping and formatting for safe JSON inclusion.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        value: {
                            type: 'string',
                            description: 'Text to make JSON-safe (REQUIRED). Can contain quotes, newlines, special characters. Examples: file paths with backslashes, text with quotes, multi-line strings. Tool will escape all problematic characters.'
                        }
                    },
                    required: ['value']
                }
            },
            {
                name: 'format_mcp_request',
                description: 'MCP REQUEST FORMATTING: Generate properly formatted MCP tool call request with correct JSON structure. USAGE: Provide tool name and arguments, get back complete MCP request ready to send. Handles all JSON escaping and protocol formatting automatically.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        toolName: {
                            type: 'string',
                            description: 'Target MCP tool name (REQUIRED). Must be exact tool name from available tools. Examples: "node_query", "asset_manage", "scene_management". Case-sensitive exact match required.'
                        },
                        arguments: {
                            type: 'object',
                            description: 'Tool parameters object (REQUIRED). Must be valid JSON object containing all required parameters for the specified tool. Example: {"action": "info", "uuid": "node-uuid-here"}. Use tool documentation for required fields.'
                        }
                    },
                    required: ['toolName', 'arguments']
                }
            }
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'validate_json_params':
                return await this.validateJsonParams(args.jsonString, args.expectedSchema);
            case 'safe_string_value':
                return await this.createSafeStringValue(args.value);
            case 'format_mcp_request':
                return await this.formatMcpRequest(args.toolName, args.arguments);
            default:
                return { success: false, error: `Unknown validation tool: ${toolName}. Available tools: validate_json_params, safe_string_value, format_mcp_request` };
        }
    }
    async validateJsonParams(jsonString, expectedSchema) {
        try {
            // First try to parse as-is
            let parsed;
            try {
                parsed = JSON.parse(jsonString);
            }
            catch (error) {
                // Try to fix common issues
                const fixed = this.fixJsonString(jsonString);
                try {
                    parsed = JSON.parse(fixed);
                }
                catch (secondError) {
                    return {
                        success: false,
                        error: `Cannot fix JSON: ${error.message}`,
                        data: {
                            originalJson: jsonString,
                            fixedAttempt: fixed,
                            suggestions: this.getJsonFixSuggestions(jsonString)
                        }
                    };
                }
            }
            // Validate against schema if provided
            if (expectedSchema) {
                const validation = this.validateAgainstSchema(parsed, expectedSchema);
                if (!validation.valid) {
                    return {
                        success: false,
                        error: 'Schema validation failed',
                        data: {
                            parsedJson: parsed,
                            validationErrors: validation.errors,
                            suggestions: validation.suggestions
                        }
                    };
                }
            }
            return {
                success: true,
                data: {
                    parsedJson: parsed,
                    fixedJson: JSON.stringify(parsed, null, 2),
                    isValid: true
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async createSafeStringValue(value) {
        const safeValue = this.escapJsonString(value);
        return {
            success: true,
            data: {
                originalValue: value,
                safeValue: safeValue,
                jsonReady: JSON.stringify(safeValue),
                usage: `Use "${safeValue}" in your JSON parameters`
            }
        };
    }
    async formatMcpRequest(toolName, toolArgs) {
        try {
            const mcpRequest = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: toolArgs
                }
            };
            const formattedJson = JSON.stringify(mcpRequest, null, 2);
            const compactJson = JSON.stringify(mcpRequest);
            return {
                success: true,
                data: {
                    request: mcpRequest,
                    formattedJson: formattedJson,
                    compactJson: compactJson,
                    curlCommand: this.generateCurlCommand(compactJson)
                }
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Failed to format MCP request: ${error.message}`
            };
        }
    }
    fixJsonString(jsonStr) {
        let fixed = jsonStr;
        // Fix common escape character issues
        fixed = fixed
            // Fix unescaped quotes in string values
            .replace(/(\{[^}]*"[^"]*":\s*")([^"]*")([^"]*")([^}]*\})/g, (match, prefix, content, suffix, end) => {
            const escapedContent = content.replace(/"/g, '\\"');
            return prefix + escapedContent + suffix + end;
        })
            // Fix unescaped backslashes
            .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1\\\\$2')
            // Fix trailing commas
            .replace(/,(\s*[}\]])/g, '$1')
            // Fix control characters
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            // Fix single quotes to double quotes
            .replace(/'/g, '"');
        return fixed;
    }
    escapJsonString(str) {
        return str
            .replace(/\\/g, '\\\\') // Escape backslashes first
            .replace(/"/g, '\\"') // Escape quotes
            .replace(/\n/g, '\\n') // Escape newlines
            .replace(/\r/g, '\\r') // Escape carriage returns
            .replace(/\t/g, '\\t') // Escape tabs
            .replace(/\f/g, '\\f') // Escape form feeds
            .replace(/\b/g, '\\b'); // Escape backspaces
    }
    validateAgainstSchema(data, schema) {
        const errors = [];
        const suggestions = [];
        // Basic type checking
        if (schema.type) {
            const actualType = Array.isArray(data) ? 'array' : typeof data;
            if (actualType !== schema.type) {
                errors.push(`Expected type ${schema.type}, got ${actualType}`);
                suggestions.push(`Convert value to ${schema.type}`);
            }
        }
        // Required fields checking
        if (schema.required && Array.isArray(schema.required)) {
            for (const field of schema.required) {
                if (!Object.prototype.hasOwnProperty.call(data, field)) {
                    errors.push(`Missing required field: ${field}`);
                    suggestions.push(`Add required field "${field}"`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            suggestions
        };
    }
    getJsonFixSuggestions(jsonStr) {
        const suggestions = [];
        if (jsonStr.includes('\\"')) {
            suggestions.push('Check for improperly escaped quotes');
        }
        if (jsonStr.includes("'")) {
            suggestions.push('Replace single quotes with double quotes');
        }
        if (jsonStr.includes('\n') || jsonStr.includes('\t')) {
            suggestions.push('Escape newlines and tabs properly');
        }
        if (jsonStr.match(/,\s*[}\]]/)) {
            suggestions.push('Remove trailing commas');
        }
        return suggestions;
    }
    generateCurlCommand(jsonStr) {
        const escapedJson = jsonStr.replace(/'/g, "'\"'\"'");
        return `curl -X POST http://127.0.0.1:8585/mcp \\
  -H "Content-Type: application/json" \\
  -d '${escapedJson}'`;
    }
}
exports.ValidationTools = ValidationTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy92YWxpZGF0aW9uLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQWEsZUFBZTtJQUN4QixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxzQkFBc0I7Z0JBQzVCLFdBQVcsRUFBRSxvU0FBb1M7Z0JBQ2pULFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsVUFBVSxFQUFFOzRCQUNSLElBQUksRUFBRSxRQUFROzRCQUNkLFdBQVcsRUFBRSwyTkFBMk47eUJBQzNPO3dCQUNELGNBQWMsRUFBRTs0QkFDWixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsa05BQWtOO3lCQUNsTztxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUM7aUJBQzNCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsbUJBQW1CO2dCQUN6QixXQUFXLEVBQUUscVBBQXFQO2dCQUNsUSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLEtBQUssRUFBRTs0QkFDSCxJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsZ05BQWdOO3lCQUNoTztxQkFDSjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUM7aUJBQ3RCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsb0JBQW9CO2dCQUMxQixXQUFXLEVBQUUsOFBBQThQO2dCQUMzUSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRTs0QkFDTixJQUFJLEVBQUUsUUFBUTs0QkFDZCxXQUFXLEVBQUUsaUxBQWlMO3lCQUNqTTt3QkFDRCxTQUFTLEVBQUU7NEJBQ1AsSUFBSSxFQUFFLFFBQVE7NEJBQ2Qs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cnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XG5cbmV4cG9ydCBjbGFzcyBWYWxpZGF0aW9uVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd2YWxpZGF0ZV9qc29uX3BhcmFtcycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdKU09OIFBBUkFNRVRFUiBWQUxJREFUSU9OOiBWYWxpZGF0ZSBhbmQgYXV0by1maXggSlNPTiBzdHJpbmdzIGJlZm9yZSBzZW5kaW5nIHRvIG90aGVyIHRvb2xzLiBVU0FHRTogUGFzdGUgbWFsZm9ybWVkIEpTT04gYW5kIGdldCBjb3JyZWN0ZWQgdmVyc2lvbi4gSGFuZGxlcyBjb21tb24gaXNzdWVzIGxpa2UgdW5lc2NhcGVkIHF1b3RlcywgdHJhaWxpbmcgY29tbWFzLCBtaXNzaW5nIGJyYWNrZXRzLiBFc3NlbnRpYWwgZm9yIGVuc3VyaW5nIHRvb2wgcGFyYW1ldGVycyBhcmUgcHJvcGVybHkgZm9ybWF0dGVkLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25TdHJpbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0pTT04gc3RyaW5nIHRvIHZhbGlkYXRlIGFuZCByZXBhaXIgKFJFUVVJUkVEKS4gQ2FuIGJlIG1hbGZvcm1lZCAtIHRvb2wgd2lsbCBhdHRlbXB0IGF1dG9tYXRpYyBmaXhlcy4gRXhhbXBsZXM6IG1pc3NpbmcgcXVvdGVzLCB0cmFpbGluZyBjb21tYXMsIHVuZXNjYXBlZCBjaGFyYWN0ZXJzLiBQYXN0ZSB5b3VyIEpTT04gaGVyZSBmb3IgdmFsaWRhdGlvbiBhbmQgY29ycmVjdGlvbi4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4cGVjdGVkIEpTT04gc3RydWN0dXJlIGZvciB2YWxpZGF0aW9uIChvcHRpb25hbCkuIFByb3ZpZGVzIHNjaGVtYS1iYXNlZCB2YWxpZGF0aW9uIGJleW9uZCBzeW50YXggY2hlY2tpbmcuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgSlNPTiBtYXRjaGVzIHNwZWNpZmljIHRvb2wgcmVxdWlyZW1lbnRzLiBMZWF2ZSBlbXB0eSBmb3Igc3ludGF4LW9ubHkgdmFsaWRhdGlvbi4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2pzb25TdHJpbmcnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3NhZmVfc3RyaW5nX3ZhbHVlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NUUklORyBTQUZFVFk6IENvbnZlcnQgdGV4dCBpbnRvIEpTT04tc2FmZSBmb3JtYXQgYnkgZXNjYXBpbmcgc3BlY2lhbCBjaGFyYWN0ZXJzLiBVU0FHRTogV2hlbiB5b3UgaGF2ZSBzdHJpbmdzIHdpdGggcXVvdGVzLCBuZXdsaW5lcywgb3Igc3BlY2lhbCBjaGFyYWN0ZXJzIHRoYXQgYnJlYWsgSlNPTi4gQXV0b21hdGljYWxseSBoYW5kbGVzIGVzY2FwaW5nIGFuZCBmb3JtYXR0aW5nIGZvciBzYWZlIEpTT04gaW5jbHVzaW9uLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUZXh0IHRvIG1ha2UgSlNPTi1zYWZlIChSRVFVSVJFRCkuIENhbiBjb250YWluIHF1b3RlcywgbmV3bGluZXMsIHNwZWNpYWwgY2hhcmFjdGVycy4gRXhhbXBsZXM6IGZpbGUgcGF0aHMgd2l0aCBiYWNrc2xhc2hlcywgdGV4dCB3aXRoIHF1b3RlcywgbXVsdGktbGluZSBzdHJpbmdzLiBUb29sIHdpbGwgZXNjYXBlIGFsbCBwcm9ibGVtYXRpYyBjaGFyYWN0ZXJzLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndmFsdWUnXVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2Zvcm1hdF9tY3BfcmVxdWVzdCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNQ1AgUkVRVUVTVCBGT1JNQVRUSU5HOiBHZW5lcmF0ZSBwcm9wZXJseSBmb3JtYXR0ZWQgTUNQIHRvb2wgY2FsbCByZXF1ZXN0IHdpdGggY29ycmVjdCBKU09OIHN0cnVjdHVyZS4gVVNBR0U6IFByb3ZpZGUgdG9vbCBuYW1lIGFuZCBhcmd1bWVudHMsIGdldCBiYWNrIGNvbXBsZXRlIE1DUCByZXF1ZXN0IHJlYWR5IHRvIHNlbmQuIEhhbmRsZXMgYWxsIEpTT04gZXNjYXBpbmcgYW5kIHByb3RvY29sIGZvcm1hdHRpbmcgYXV0b21hdGljYWxseS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sTmFtZToge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IE1DUCB0b29sIG5hbWUgKFJFUVVJUkVEKS4gTXVzdCBiZSBleGFjdCB0b29sIG5hbWUgZnJvbSBhdmFpbGFibGUgdG9vbHMuIEV4YW1wbGVzOiBcIm5vZGVfcXVlcnlcIiwgXCJhc3NldF9tYW5hZ2VcIiwgXCJzY2VuZV9tYW5hZ2VtZW50XCIuIENhc2Utc2Vuc2l0aXZlIGV4YWN0IG1hdGNoIHJlcXVpcmVkLidcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Rvb2wgcGFyYW1ldGVycyBvYmplY3QgKFJFUVVJUkVEKS4gTXVzdCBiZSB2YWxpZCBKU09OIG9iamVjdCBjb250YWluaW5nIGFsbCByZXF1aXJlZCBwYXJhbWV0ZXJzIGZvciB0aGUgc3BlY2lmaWVkIHRvb2wuIEV4YW1wbGU6IHtcImFjdGlvblwiOiBcImluZm9cIiwgXCJ1dWlkXCI6IFwibm9kZS11dWlkLWhlcmVcIn0uIFVzZSB0b29sIGRvY3VtZW50YXRpb24gZm9yIHJlcXVpcmVkIGZpZWxkcy4nXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3Rvb2xOYW1lJywgJ2FyZ3VtZW50cyddXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAndmFsaWRhdGVfanNvbl9wYXJhbXMnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLnZhbGlkYXRlSnNvblBhcmFtcyhhcmdzLmpzb25TdHJpbmcsIGFyZ3MuZXhwZWN0ZWRTY2hlbWEpO1xuICAgICAgICAgICAgY2FzZSAnc2FmZV9zdHJpbmdfdmFsdWUnOlxuICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNyZWF0ZVNhZmVTdHJpbmdWYWx1ZShhcmdzLnZhbHVlKTtcbiAgICAgICAgICAgIGNhc2UgJ2Zvcm1hdF9tY3BfcmVxdWVzdCc6XG4gICAgICAgICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZm9ybWF0TWNwUmVxdWVzdChhcmdzLnRvb2xOYW1lLCBhcmdzLmFyZ3VtZW50cyk7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gdmFsaWRhdGlvbiB0b29sOiAke3Rvb2xOYW1lfS4gQXZhaWxhYmxlIHRvb2xzOiB2YWxpZGF0ZV9qc29uX3BhcmFtcywgc2FmZV9zdHJpbmdfdmFsdWUsIGZvcm1hdF9tY3BfcmVxdWVzdGAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVKc29uUGFyYW1zKGpzb25TdHJpbmc6IHN0cmluZywgZXhwZWN0ZWRTY2hlbWE/OiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRmlyc3QgdHJ5IHRvIHBhcnNlIGFzLWlzXG4gICAgICAgICAgICBsZXQgcGFyc2VkO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb25TdHJpbmcpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgICAgIC8vIFRyeSB0byBmaXggY29tbW9uIGlzc3Vlc1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpeGVkID0gdGhpcy5maXhKc29uU3RyaW5nKGpzb25TdHJpbmcpO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZCA9IEpTT04ucGFyc2UoZml4ZWQpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHNlY29uZEVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgQ2Fubm90IGZpeCBKU09OOiAke2Vycm9yLm1lc3NhZ2V9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbEpzb246IGpzb25TdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZml4ZWRBdHRlbXB0OiBmaXhlZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uczogdGhpcy5nZXRKc29uRml4U3VnZ2VzdGlvbnMoanNvblN0cmluZylcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFZhbGlkYXRlIGFnYWluc3Qgc2NoZW1hIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAoZXhwZWN0ZWRTY2hlbWEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB2YWxpZGF0aW9uID0gdGhpcy52YWxpZGF0ZUFnYWluc3RTY2hlbWEocGFyc2VkLCBleHBlY3RlZFNjaGVtYSk7XG4gICAgICAgICAgICAgICAgaWYgKCF2YWxpZGF0aW9uLnZhbGlkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiAnU2NoZW1hIHZhbGlkYXRpb24gZmFpbGVkJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWRKc29uOiBwYXJzZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsaWRhdGlvbkVycm9yczogdmFsaWRhdGlvbi5lcnJvcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnM6IHZhbGlkYXRpb24uc3VnZ2VzdGlvbnNcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZEpzb246IHBhcnNlZCxcbiAgICAgICAgICAgICAgICAgICAgZml4ZWRKc29uOiBKU09OLnN0cmluZ2lmeShwYXJzZWQsIG51bGwsIDIpLFxuICAgICAgICAgICAgICAgICAgICBpc1ZhbGlkOiB0cnVlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlU2FmZVN0cmluZ1ZhbHVlKHZhbHVlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBjb25zdCBzYWZlVmFsdWUgPSB0aGlzLmVzY2FwSnNvblN0cmluZyh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIG9yaWdpbmFsVmFsdWU6IHZhbHVlLFxuICAgICAgICAgICAgICAgIHNhZmVWYWx1ZTogc2FmZVZhbHVlLFxuICAgICAgICAgICAgICAgIGpzb25SZWFkeTogSlNPTi5zdHJpbmdpZnkoc2FmZVZhbHVlKSxcbiAgICAgICAgICAgICAgICB1c2FnZTogYFVzZSBcIiR7c2FmZVZhbHVlfVwiIGluIHlvdXIgSlNPTiBwYXJhbWV0ZXJzYFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZm9ybWF0TWNwUmVxdWVzdCh0b29sTmFtZTogc3RyaW5nLCB0b29sQXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IG1jcFJlcXVlc3QgPSB7XG4gICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXG4gICAgICAgICAgICAgICAgaWQ6IERhdGUubm93KCksXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAndG9vbHMvY2FsbCcsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvb2xOYW1lLFxuICAgICAgICAgICAgICAgICAgICBhcmd1bWVudHM6IHRvb2xBcmdzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY29uc3QgZm9ybWF0dGVkSnNvbiA9IEpTT04uc3RyaW5naWZ5KG1jcFJlcXVlc3QsIG51bGwsIDIpO1xuICAgICAgICAgICAgY29uc3QgY29tcGFjdEpzb24gPSBKU09OLnN0cmluZ2lmeShtY3BSZXF1ZXN0KTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgcmVxdWVzdDogbWNwUmVxdWVzdCxcbiAgICAgICAgICAgICAgICAgICAgZm9ybWF0dGVkSnNvbjogZm9ybWF0dGVkSnNvbixcbiAgICAgICAgICAgICAgICAgICAgY29tcGFjdEpzb246IGNvbXBhY3RKc29uLFxuICAgICAgICAgICAgICAgICAgICBjdXJsQ29tbWFuZDogdGhpcy5nZW5lcmF0ZUN1cmxDb21tYW5kKGNvbXBhY3RKc29uKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gZm9ybWF0IE1DUCByZXF1ZXN0OiAke2Vycm9yLm1lc3NhZ2V9YFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZml4SnNvblN0cmluZyhqc29uU3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBsZXQgZml4ZWQgPSBqc29uU3RyO1xuICAgICAgICBcbiAgICAgICAgLy8gRml4IGNvbW1vbiBlc2NhcGUgY2hhcmFjdGVyIGlzc3Vlc1xuICAgICAgICBmaXhlZCA9IGZpeGVkXG4gICAgICAgICAgICAvLyBGaXggdW5lc2NhcGVkIHF1b3RlcyBpbiBzdHJpbmcgdmFsdWVzXG4gICAgICAgICAgICAucmVwbGFjZSgvKFxce1tefV0qXCJbXlwiXSpcIjpcXHMqXCIpKFteXCJdKlwiKShbXlwiXSpcIikoW159XSpcXH0pL2csIChtYXRjaCwgcHJlZml4LCBjb250ZW50LCBzdWZmaXgsIGVuZCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVzY2FwZWRDb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByZWZpeCArIGVzY2FwZWRDb250ZW50ICsgc3VmZml4ICsgZW5kO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC8vIEZpeCB1bmVzY2FwZWQgYmFja3NsYXNoZXNcbiAgICAgICAgICAgIC5yZXBsYWNlKC8oW15cXFxcXSlcXFxcKFteXCJcXFxcXFwvYmZucnR1XSkvZywgJyQxXFxcXFxcXFwkMicpXG4gICAgICAgICAgICAvLyBGaXggdHJhaWxpbmcgY29tbWFzXG4gICAgICAgICAgICAucmVwbGFjZSgvLChcXHMqW31cXF1dKS9nLCAnJDEnKVxuICAgICAgICAgICAgLy8gRml4IGNvbnRyb2wgY2hhcmFjdGVyc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKVxuICAgICAgICAgICAgLy8gRml4IHNpbmdsZSBxdW90ZXMgdG8gZG91YmxlIHF1b3Rlc1xuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJ1wiJyk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gZml4ZWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBlc2NhcEpzb25TdHJpbmcoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICByZXR1cm4gc3RyXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKSAgLy8gRXNjYXBlIGJhY2tzbGFzaGVzIGZpcnN0XG4gICAgICAgICAgICAucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpICAgIC8vIEVzY2FwZSBxdW90ZXNcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJykgICAvLyBFc2NhcGUgbmV3bGluZXNcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJykgICAvLyBFc2NhcGUgY2FycmlhZ2UgcmV0dXJuc1xuICAgICAgICAgICAgLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKSAgIC8vIEVzY2FwZSB0YWJzXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxmL2csICdcXFxcZicpICAgLy8gRXNjYXBlIGZvcm0gZmVlZHNcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cXGIvZywgJ1xcXFxiJyk7ICAvLyBFc2NhcGUgYmFja3NwYWNlc1xuICAgIH1cblxuICAgIHByaXZhdGUgdmFsaWRhdGVBZ2FpbnN0U2NoZW1hKGRhdGE6IGFueSwgc2NoZW1hOiBhbnkpOiB7IHZhbGlkOiBib29sZWFuOyBlcnJvcnM6IHN0cmluZ1tdOyBzdWdnZXN0aW9uczogc3RyaW5nW10gfSB7XG4gICAgICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgY29uc3Qgc3VnZ2VzdGlvbnM6IHN0cmluZ1tdID0gW107XG5cbiAgICAgICAgLy8gQmFzaWMgdHlwZSBjaGVja2luZ1xuICAgICAgICBpZiAoc2NoZW1hLnR5cGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjdHVhbFR5cGUgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gJ2FycmF5JyA6IHR5cGVvZiBkYXRhO1xuICAgICAgICAgICAgaWYgKGFjdHVhbFR5cGUgIT09IHNjaGVtYS50eXBlKSB7XG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goYEV4cGVjdGVkIHR5cGUgJHtzY2hlbWEudHlwZX0sIGdvdCAke2FjdHVhbFR5cGV9YCk7XG4gICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnMucHVzaChgQ29udmVydCB2YWx1ZSB0byAke3NjaGVtYS50eXBlfWApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVxdWlyZWQgZmllbGRzIGNoZWNraW5nXG4gICAgICAgIGlmIChzY2hlbWEucmVxdWlyZWQgJiYgQXJyYXkuaXNBcnJheShzY2hlbWEucmVxdWlyZWQpKSB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpZWxkIG9mIHNjaGVtYS5yZXF1aXJlZCkge1xuICAgICAgICAgICAgICAgIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGRhdGEsIGZpZWxkKSkge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChgTWlzc2luZyByZXF1aXJlZCBmaWVsZDogJHtmaWVsZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbnMucHVzaChgQWRkIHJlcXVpcmVkIGZpZWxkIFwiJHtmaWVsZH1cImApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICAgICAgICAgIGVycm9ycyxcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBnZXRKc29uRml4U3VnZ2VzdGlvbnMoanNvblN0cjogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgICAgICBjb25zdCBzdWdnZXN0aW9uczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgXG4gICAgICAgIGlmIChqc29uU3RyLmluY2x1ZGVzKCdcXFxcXCInKSkge1xuICAgICAgICAgICAgc3VnZ2VzdGlvbnMucHVzaCgnQ2hlY2sgZm9yIGltcHJvcGVybHkgZXNjYXBlZCBxdW90ZXMnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoanNvblN0ci5pbmNsdWRlcyhcIidcIikpIHtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zLnB1c2goJ1JlcGxhY2Ugc2luZ2xlIHF1b3RlcyB3aXRoIGRvdWJsZSBxdW90ZXMnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoanNvblN0ci5pbmNsdWRlcygnXFxuJykgfHwganNvblN0ci5pbmNsdWRlcygnXFx0JykpIHtcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zLnB1c2goJ0VzY2FwZSBuZXdsaW5lcyBhbmQgdGFicyBwcm9wZXJseScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChqc29uU3RyLm1hdGNoKC8sXFxzKlt9XFxdXS8pKSB7XG4gICAgICAgICAgICBzdWdnZXN0aW9ucy5wdXNoKCdSZW1vdmUgdHJhaWxpbmcgY29tbWFzJyk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBzdWdnZXN0aW9ucztcbiAgICB9XG5cbiAgICBwcml2YXRlIGdlbmVyYXRlQ3VybENvbW1hbmQoanNvblN0cjogc3RyaW5nKTogc3RyaW5nIHtcbiAgICAgICAgY29uc3QgZXNjYXBlZEpzb24gPSBqc29uU3RyLnJlcGxhY2UoLycvZywgXCInXFxcIidcXFwiJ1wiKTtcbiAgICAgICAgcmV0dXJuIGBjdXJsIC1YIFBPU1QgaHR0cDovLzEyNy4wLjAuMTo4NTg1L21jcCBcXFxcXG4gIC1IIFwiQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXCIgXFxcXFxuICAtZCAnJHtlc2NhcGVkSnNvbn0nYDtcbiAgICB9XG59Il19