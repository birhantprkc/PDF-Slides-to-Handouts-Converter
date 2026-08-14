const DEFAULT_PROJECT = process.env.PROJECT_ID ?? "hand-outs";

export function normalizeProject(project) {
  const value = String(project ?? DEFAULT_PROJECT)
    .trim()
    .toLowerCase();

  return (value || DEFAULT_PROJECT)
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}
