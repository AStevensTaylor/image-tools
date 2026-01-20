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

Configuration is available in `.copilot/mcp-config.json`. When using GitHub Copilot or other MCP clients, the Cloudflare Workers Builds server will be automatically available after authentication.
