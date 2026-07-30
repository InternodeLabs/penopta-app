import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";

import type { ApiKeyOwner } from "@/lib/keys/data";
import { buildPenoptaMcpServer } from "@/lib/mcp/server";
import { PROTECTED_RESOURCE_METADATA_PATH } from "@/lib/oauth/config";
import { hashToken, verifyAccessToken } from "@/lib/oauth/tokens";

/** Owner plus the token hash, so tools can stamp the connection row. */
type McpAuthExtra = ApiKeyOwner & { accessTokenHash?: string };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remote MCP server, protected by OAuth 2.1 (the flow ChatGPT/Claude connectors
 * use). `withMcpAuth` verifies the bearer access token and, on failure, returns
 * a 401 with a WWW-Authenticate challenge pointing at our protected-resource
 * metadata. The verified owner (portal user + active org) is read from
 * `request.auth.extra` and every tool is scoped to it.
 */
const baseHandler = (request: Request) => {
  const extra = request.auth?.extra as McpAuthExtra | undefined;
  const handler = createMcpHandler(
    (server) => {
      if (extra) buildPenoptaMcpServer(server, extra, extra.accessTokenHash);
    },
    { serverInfo: { name: "penopta", version: "1.0.0" } },
  );
  return handler(request);
};

async function verifyToken(
  _request: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const owner = await verifyAccessToken(bearerToken);
  if (!owner) return undefined;
  return {
    token: bearerToken,
    clientId: owner.clientId,
    scopes: owner.scope ? owner.scope.split(" ") : ["mcp"],
    extra: {
      ownerUserId: owner.ownerUserId,
      orgId: owner.orgId,
      accessTokenHash: await hashToken(bearerToken),
    } satisfies McpAuthExtra,
  };
}

const handler = withMcpAuth(baseHandler, verifyToken, {
  required: true,
  resourceMetadataPath: PROTECTED_RESOURCE_METADATA_PATH,
});

export { handler as GET, handler as POST, handler as DELETE };
