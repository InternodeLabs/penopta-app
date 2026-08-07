"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  getAccountSettingsAction,
  type AccountSettingsView,
} from "@/lib/auth/account-actions";
import { authClient } from "@/lib/auth/client";

function deviceLabelFromUserAgent(): string {
  if (typeof navigator === "undefined") return "device";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows PC";
  return "device";
}

function firstNameFromDisplayName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0];
  return first || null;
}

/** e.g. "Sean's Mac" when a first name is available. */
function defaultPasskeyName(displayName?: string | null): string {
  const device = deviceLabelFromUserAgent();
  const first = firstNameFromDisplayName(displayName);
  if (!first) return device === "device" ? "This device" : device;
  const possessive = first.endsWith("s") || first.endsWith("S") ? `${first}'` : `${first}'s`;
  return `${possessive} ${device}`;
}

/** Dialog with profile details, sign-in providers, and passkey management. */
export function AccountSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState<AccountSettingsView | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  function reload() {
    setLoading(true);
    startTransition(async () => {
      const result = await getAccountSettingsAction();
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAccount(result.account);
    });
  }

  useEffect(() => {
    if (!open) return;
    setAccount(null);
    setEditingId(null);
    setEditingName("");
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per open
  }, [open]);

  if (!open) return null;

  function close() {
    if (pending) return;
    onClose();
  }

  function addPasskey() {
    const name = defaultPasskeyName(account?.name);
    startTransition(async () => {
      const { error } = await authClient.passkey.addPasskey({ name });
      if (error) {
        toast.error(error.message || "Couldn't add a passkey.");
        return;
      }
      toast.success("Passkey added. You can use it next time you sign in.");
      reload();
    });
  }

  function removePasskey(id: string, label: string) {
    const confirmed = window.confirm(
      `Remove passkey “${label}”? You won’t be able to sign in with it anymore.`,
    );
    if (!confirmed) return;

    startTransition(async () => {
      const { error } = await authClient.passkey.deletePasskey({ id });
      if (error) {
        toast.error(error.message || "Couldn't remove that passkey.");
        return;
      }
      toast.success("Passkey removed.");
      if (editingId === id) {
        setEditingId(null);
        setEditingName("");
      }
      reload();
    });
  }

  function startRename(id: string, label: string) {
    setEditingId(id);
    setEditingName(label === "Passkey" ? "" : label);
  }

  function cancelRename() {
    setEditingId(null);
    setEditingName("");
  }

  function saveRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) {
      toast.error("Give this passkey a name.");
      return;
    }
    if (name.length > 64) {
      toast.error("Keep the name under 64 characters.");
      return;
    }

    const id = editingId;
    startTransition(async () => {
      const { error } = await authClient.passkey.updatePasskey({ id, name });
      if (error) {
        toast.error(error.message || "Couldn't rename that passkey.");
        return;
      }
      toast.success("Passkey renamed.");
      setEditingId(null);
      setEditingName("");
      reload();
    });
  }

  const providerLabel =
    account?.providers.map((p) => p.label).join(", ") ||
    (loading ? "…" : "None");

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Manage account"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(90dvh,560px)] w-full max-w-md flex-col rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Manage account
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Your profile and sign-in methods
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {loading && !account ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : account ? (
            <>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Name
                </p>
                <p className="mt-1 text-sm text-foreground">{account.name}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Email
                </p>
                <p
                  className="mt-1 truncate text-sm text-foreground"
                  title={account.email}
                >
                  {account.email}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Sign-in provider
                </p>
                <p className="mt-1 text-sm text-foreground">{providerLabel}</p>
              </div>

              <section>
                <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                  Passkeys
                </p>
                {account.passkeys.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">
                    No passkeys yet. Add one to sign in without Google or GitHub next time.
                  </p>
                ) : (
                  <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                    {account.passkeys.map((item) => {
                      const label = item.name?.trim() || "Passkey";
                      const isEditing = editingId === item.id;
                      return (
                        <li key={item.id} className="px-3 py-2">
                          {isEditing ? (
                            <form
                              onSubmit={saveRename}
                              className="flex flex-col gap-2 sm:flex-row sm:items-center"
                            >
                              <input
                                autoFocus
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                maxLength={64}
                                aria-label="Passkey name"
                                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 text-sm text-foreground outline-none transition focus:border-accent"
                              />
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="submit"
                                  disabled={pending || !editingName.trim()}
                                  className="text-xs font-medium text-foreground transition hover:opacity-80 disabled:opacity-60"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={cancelRename}
                                  className="text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-60"
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate text-sm text-foreground">
                                {label}
                              </span>
                              <div className="flex shrink-0 gap-3">
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => startRename(item.id, label)}
                                  className="text-xs font-medium text-muted transition hover:text-foreground disabled:opacity-60"
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => removePasskey(item.id, label)}
                                  className="text-xs font-medium text-muted transition hover:text-red-600 disabled:opacity-60"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={addPasskey}
                  className="mt-3 inline-flex h-10 items-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition hover:bg-surface disabled:opacity-60"
                >
                  {pending ? "Working…" : "Add new Passkey"}
                </button>
              </section>
            </>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-60"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
