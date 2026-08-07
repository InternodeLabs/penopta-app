import Link from "next/link";
import { redirect } from "next/navigation";

import { IntegrationsShell } from "@/components/IntegrationsShell";
import Mcp from "@/components/icons/Mcp";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import {
  listMcpSetupLinks,
  listMcpToolsByCategory,
  mcpIntegration,
} from "@/lib/integrations/mcp";
import { listIntegrationProviders } from "@/lib/integrations/providers";

export default async function McpIntegrationPage() {
  const session = await getSession();
  if (!session) {
    redirect(loginStartHref("/integrations/mcp"));
  }

  const providers = listIntegrationProviders();
  const setupLinks = listMcpSetupLinks();
  const toolGroups = listMcpToolsByCategory();

  return (
    <IntegrationsShell providers={providers} activeProviderId="mcp">
      <main className="mx-auto max-w-4xl px-8 py-10 sm:px-12">
        <Link
          href="/integrations"
          className="text-sm font-medium text-muted transition hover:text-foreground"
        >
          ← Integrations
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span
            aria-hidden
            className={`grid h-10 w-10 place-items-center rounded-full ${mcpIntegration.iconBg}`}
          >
            <Mcp className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mcpIntegration.setupTitle}
            </h1>
            <p className="text-sm text-muted">{mcpIntegration.byline}</p>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {mcpIntegration.intro}
        </p>

        <section className="mt-8 max-w-2xl">
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            Set up a connector
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Add Penopta in your agent first — then these tools become available
            in chat.
          </p>
          <ul className="mt-4 space-y-2">
            {setupLinks.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.id}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-foreground transition hover:bg-background"
                  >
                    <span
                      aria-hidden
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${link.iconBg}`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{link.label}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {link.byline}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-10 max-w-4xl">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
              MCP commands
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Tools exposed by the Penopta MCP server. Agents call these by
              name after you connect.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-zinc-50/80 text-xs font-semibold tracking-wide text-muted uppercase">
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Command
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    What it does
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    When to use
                  </th>
                </tr>
              </thead>
              <tbody>
                {toolGroups.flatMap((group) =>
                  group.tools.map((tool, index) => (
                    <tr
                      key={tool.name}
                      className="border-b border-border last:border-b-0 align-top"
                    >
                      {index === 0 ? (
                        <th
                          scope="row"
                          rowSpan={group.tools.length}
                          className="whitespace-nowrap border-r border-border bg-zinc-50/50 px-3 py-3 text-xs font-semibold tracking-wide text-muted uppercase"
                        >
                          {group.label}
                        </th>
                      ) : null}
                      <td className="px-3 py-3">
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[13px] text-foreground">
                          {tool.name}
                        </code>
                        <div className="mt-1 text-xs text-muted">{tool.title}</div>
                      </td>
                      <td className="px-3 py-3 leading-relaxed text-muted">
                        {tool.summary}
                      </td>
                      <td className="px-3 py-3 leading-relaxed text-muted">
                        {tool.whenToUse}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </IntegrationsShell>
  );
}
