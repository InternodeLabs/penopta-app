"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  setProjectVisibilityAction,
  type ProjectVisibility,
} from "@/lib/projects/actions";

const OPTIONS: {
  value: ProjectVisibility;
  label: string;
  description: string;
}[] = [
  {
    value: "private",
    label: "Private",
    description: "Only you can see this project.",
  },
  {
    value: "public",
    label: "Public",
    description: "Everyone in this org can see it.",
  },
];

/** Owner control to switch a project between private and org-public. */
export function ProjectVisibilityControl({
  projectId,
  visibility,
  canEdit,
}: {
  projectId: string;
  visibility: ProjectVisibility;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setVisibility(next: ProjectVisibility) {
    if (!canEdit || next === visibility || pending) return;
    startTransition(async () => {
      const result = await setProjectVisibilityAction(projectId, next);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.visibility === "public"
          ? "Shared with everyone in this org"
          : "Project is private to you",
      );
      router.refresh();
    });
  }

  if (!canEdit) {
    const current = OPTIONS.find((o) => o.value === visibility) ?? OPTIONS[0];
    return (
      <div>
        <p className="text-sm font-medium text-foreground">{current.label}</p>
        <p className="mt-0.5 text-sm text-muted">{current.description}</p>
      </div>
    );
  }

  return (
    <fieldset disabled={pending} className="space-y-2">
      <legend className="sr-only">Project visibility</legend>
      {OPTIONS.map((option) => {
        const selected = visibility === option.value;
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
              selected
                ? "border-foreground/25 bg-background"
                : "border-border hover:bg-background"
            } ${pending ? "opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="project-visibility"
              value={option.value}
              checked={selected}
              onChange={() => setVisibility(option.value)}
              className="mt-1 h-3.5 w-3.5 shrink-0 accent-accent"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                {option.label}
              </span>
              <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                {option.description}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
