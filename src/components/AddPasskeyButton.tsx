"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth/client";

/** Register a platform passkey for the signed-in user. */
export function AddPasskeyButton() {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function addPasskey() {
    startTransition(async () => {
      const { error } = await authClient.passkey.addPasskey({
        name: "Penopta",
      });
      if (error) {
        toast.error(error.message || "Couldn't add a passkey.");
        return;
      }
      setDone(true);
      toast.success("Passkey added. You can use it next time you sign in.");
    });
  }

  return (
    <button
      type="button"
      disabled={pending || done}
      onClick={addPasskey}
      className="text-left text-sm text-muted transition hover:text-foreground disabled:opacity-60"
    >
      {done ? "Passkey added" : pending ? "Adding passkey…" : "Add a passkey"}
    </button>
  );
}
