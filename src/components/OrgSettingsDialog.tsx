"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  inviteOrgMemberAction,
  listOrgMembersAction,
  removeOrgMemberAction,
  renameOrgAction,
  updateOrgMemberRoleAction,
  type OrgMemberView,
} from "@/lib/orgs/actions";
import type { OrgRole } from "@/lib/orgs/data";

/** Dialog to rename an org and manage its members (invite / role / remove). */
export function OrgSettingsDialog({
  open,
  onClose,
  orgId,
  orgName,
}: {
  open: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(orgName);
  const [members, setMembers] = useState<OrgMemberView[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("member");

  useEffect(() => {
    if (!open) return;
    setName(orgName);
    setInviteEmail("");
    setInviteRole("member");
    setLoading(true);
    startTransition(async () => {
      const result = await listOrgMembersAction(orgId);
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setMembers(result.members);
      setCanManage(result.canManage);
    });
  }, [open, orgId, orgName]);

  if (!open) return null;

  function close() {
    if (pending) return;
    onClose();
  }

  function saveName(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await renameOrgAction(orgId, name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Organization renamed");
    });
  }

  function invite(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await inviteOrgMemberAction(orgId, inviteEmail, inviteRole);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Member invited");
      setInviteEmail("");
      setInviteRole("member");
      const refreshed = await listOrgMembersAction(orgId);
      if (refreshed.ok) setMembers(refreshed.members);
    });
  }

  function changeRole(userId: string, role: OrgRole) {
    startTransition(async () => {
      const result = await updateOrgMemberRoleAction(orgId, userId, role);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Role updated");
      setMembers((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role } : m)),
      );
    });
  }

  function remove(userId: string) {
    startTransition(async () => {
      const result = await removeOrgMemberAction(orgId, userId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Member removed");
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Manage organization"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(90dvh,640px)] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Manage organization
          </h2>
          <p className="mt-0.5 truncate text-sm text-muted" title={orgName}>
            {orgName}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {canManage ? (
            <form onSubmit={saveName}>
              <label
                htmlFor="org-name"
                className="block text-[11px] font-semibold tracking-wider text-muted uppercase"
              >
                Name
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent"
                />
                <button
                  type="submit"
                  disabled={pending || !name.trim() || name.trim() === orgName}
                  className="inline-flex h-10 shrink-0 items-center rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            </form>
          ) : null}

          <section>
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              Members
            </p>
            {loading ? (
              <p className="mt-2 text-sm text-muted">Loading…</p>
            ) : members.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No members yet</p>
            ) : (
              <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                {members.map((member) => {
                  const label =
                    member.name ||
                    member.email ||
                    (member.isYou ? "You" : member.userId);
                  return (
                    <li
                      key={member.id}
                      className="flex items-center gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground" title={label}>
                          {label}
                          {member.isYou ? (
                            <span className="text-muted"> · you</span>
                          ) : null}
                        </p>
                        {member.email && member.name ? (
                          <p className="truncate text-[11px] text-muted">
                            {member.email}
                          </p>
                        ) : null}
                      </div>
                      {canManage ? (
                        <>
                          <select
                            value={member.role}
                            disabled={pending}
                            onChange={(e) =>
                              changeRole(
                                member.userId,
                                e.target.value as OrgRole,
                              )
                            }
                            aria-label={`Role for ${label}`}
                            className="h-8 rounded-md border border-border bg-background px-1.5 text-xs text-foreground outline-none focus:border-accent disabled:opacity-60"
                          >
                            <option value="owner">Owner</option>
                            <option value="member">Member</option>
                          </select>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(member.userId)}
                            className="shrink-0 text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-60"
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-muted capitalize">
                          {member.role}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {canManage ? (
            <form onSubmit={invite}>
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                Invite
              </p>
              <p className="mt-1 text-xs text-muted">
                They need a portal account. We&apos;ll email them when they&apos;re
                added.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  aria-label="Invite as"
                  className="h-10 rounded-lg border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-accent"
                >
                  <option value="member">Member</option>
                  <option value="owner">Owner</option>
                </select>
                <button
                  type="submit"
                  disabled={pending || !inviteEmail.trim()}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "Inviting…" : "Invite"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-muted">
              Ask an owner if you need to invite someone or rename this org.
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-3">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-60"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
