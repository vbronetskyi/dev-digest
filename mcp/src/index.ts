#!/usr/bin/env node
/* devdigest-mcp — stdio entry point. stdout carries the protocol, so logs go to stderr. */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const server = createServer();
// When the client goes away, stop: no point finishing a poll nobody will read.
server.server.onclose = () => process.exit(0);
await server.connect(new StdioServerTransport());
console.error(`devdigest-mcp ready (API ${process.env.DEVDIGEST_API ?? "http://localhost:3001"})`);
