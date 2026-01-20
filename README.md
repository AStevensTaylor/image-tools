# Image Tools

A browser-based image manipulation application built with React and Bun. This tool provides a suite of utilities for working with images directly in your browser, with no server uploads required.

## Features

- **Aspect Ratio Crop**: Crop images with custom or preset aspect ratios, including common film, social media, and photo formats
- **GIF/WebP Frame Extractor**: Extract individual frames from animated GIF and WebP images
- **PNG Converter**: Convert any image format to PNG while preserving transparency

## Getting Started

To install dependencies:

```bash
bun install
```

To start a development server:

```bash
bun dev
```

To run for production:

```bash
bun start
```

## Tech Stack

- **Runtime**: [Bun](https://bun.com) - Fast all-in-one JavaScript runtime
- **Framework**: React 19
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS
- **Image Processing**: Canvas API, gifuct-js

## Development Tools

### MCP Server Integration

This project includes a Model Context Protocol (MCP) server configuration for enhanced development workflows with GitHub Copilot and other MCP-compatible tools.

The configured server provides tools to:
- List and manage Cloudflare Workers builds
- Get build details and logs
- Track deployment status

#### Configuration

Configuration is available in `.copilot/mcp-config.json`.

#### Authentication

The Cloudflare Workers Builds MCP server (`https://builds.mcp.cloudflare.com/mcp`) uses OAuth authentication, which requires a browser-based login flow. 

**Important:** This MCP server is designed for local development environments where a browser is available. It will **not work in GitHub Copilot Workspace** or other headless/CI environments (such as Docker containers, CI pipelines, or remote development servers) because:
- OAuth requires interactive browser authentication
- GitHub Copilot Workspace runs in a sandboxed environment without browser access

**For Local Development:**
When using GitHub Copilot in VS Code or other IDEs with MCP client support:
1. The MCP client will automatically detect the configuration
2. On first use, a browser window will open for Cloudflare OAuth authentication
3. After authentication, the Cloudflare Workers Builds tools become available

**For GitHub Copilot Workspace:**
The MCP server configuration is included in the repository for documentation purposes, but the tools will not be functional in the Copilot Workspace environment. Consider this feature as available only for local development workflows.
