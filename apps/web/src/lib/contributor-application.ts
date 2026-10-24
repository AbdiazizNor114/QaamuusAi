import { z } from "zod";
export const contributorRoles = [
  { value: "frontend", label: "Frontend developer", group: "Technology" },
  { value: "backend", label: "Backend developer", group: "Technology" },
  { value: "fullstack", label: "Full-stack developer", group: "Technology" },
  { value: "devops", label: "DevOps engineer", group: "Technology" },
  { value: "data_science", label: "Data scientist", group: "Technology" },
  { value: "ml", label: "AI / machine learning engineer", group: "Technology" },
  { value: "design", label: "UI / UX designer", group: "Technology" },
  { value: "linguist", label: "Linguist", group: "Language & education" },
  { value: "grammar_teacher", label: "Grammar teacher", group: "Language & education" },
  { value: "language_teacher", label: "Somali language teacher", group: "Language & education" },
  { value: "translator", label: "Translator", group: "Language & education" },
  { value: "writer", label: "Writer", group: "Language & education" },
  { value: "editor", label: "Editor / proofreader", group: "Language & education" },
  { value: "researcher", label: "Researcher", group: "Other backgrounds" },
  { value: "student", label: "Student", group: "Other backgrounds" },
  { value: "other", label: "Other", group: "Other backgrounds" },
] as const;
export const contributorApplicationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  study: z.string().trim().min(1).max(200),
  professional_role: z.enum(contributorRoles.map((role) => role.value)),
});
export function contributorRoleLabel(value: string) {
  return contributorRoles.find((role) => role.value === value)?.label ?? value;
}
