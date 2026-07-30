# Cocos Creator MCP Server v1.5.4

## 🚀 安装说明

1. **解压文件**: 解压 ZIP 文件，得到 `cocos-mcp-server` 文件夹
2. **复制到项目**: 将整个 `cocos-mcp-server` 文件夹复制到您的 Cocos Creator 项目的 `extensions` 目录中
3. **重启编辑器**: 重启 Cocos Creator 或按 Ctrl+R (Windows) / Cmd+R (Mac) 刷新扩展
4. **启用插件**: 在扩展菜单中点击 "Cocos MCP Server"
5. **启动服务**: 在面板中点击"启动服务器"

## 📱 AI 客户端配置

### Claude Desktop

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

## 🛠️ 技术特性

- **50 个强力工具**: 99%编辑器功能覆盖
- **Streamable HTTP 协议**: 基于 MCP 2025-03-26 标准
- **完美 AI 兼容**: 支持 Cursor、Claude 等所有 MCP 客户端
- **版本**: 1.5.4
