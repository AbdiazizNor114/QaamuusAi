import { z } from "zod";
export const areas = ["engineering", "design", "language", "data", "community"] as const;
export type Area = (typeof areas)[number];
export const areaLabels: Record<Area, string> = {
  engineering: "Engineering & DevOps",
  design: "Design & accessibility",
  language: "Language & editorial",
  data: "Data & machine learning",
  community: "Community & stewardship",
};
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  track: z.enum(areas),
  scope: z.string(),
  acceptance: z.string(),
  guidance: z.string(),
  dependencies: z.array(z.string()),
  status: z.enum(["open", "claimed", "in_progress", "review", "completed"]),
  owner_id: z.string().nullable(),
  reviewer_id: z.string().nullable(),
  owner_name: z.string().nullable(),
  reviewer_name: z.string().nullable(),
  evidence_url: z.string(),
  note: z.string(),
  version: z.number().int(),
  updated_at: z.string(),
});
export type ProjectTask = z.infer<typeof taskSchema>;
export const boardSchema = z.object({ area: z.enum(areas).nullable(), tasks: z.array(taskSchema) });
export function mayReviewTask(task: ProjectTask, userId: string, roles: string[]) {
  return (
    task.status === "review" &&
    task.owner_id !== userId &&
    (task.track === "language"
      ? roles.some((role) => ["reviewer", "editor"].includes(role))
      : roles.includes("technical_admin"))
  );
}
export const projectCommand = z.discriminatedUnion("command", [
  z.object({ command: z.literal("area"), area: z.enum(areas) }),
  z.object({
    command: z.literal("task"),
    task_id: z.string().regex(/^T\d{2}$/),
    expected_version: z.number().int().positive(),
    action: z.enum(["claim", "start", "submit", "release", "complete", "request_changes"]),
    evidence: z
      .union([
        z.literal(""),
        z
          .url()
          .max(2000)
          .refine((value) => /^https?:\/\//.test(value)),
      ])
      .default(""),
    explanation: z.string().trim().max(2000).default(""),
  }),
]);
