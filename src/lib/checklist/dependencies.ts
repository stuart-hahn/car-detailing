import type { MasterStepsFile, StepInstance, StepTemplate } from "../types";

export function getStepTemplate(
  master: MasterStepsFile,
  templateId: string,
): StepTemplate | undefined {
  return master.steps.find((s) => s.id === templateId);
}

export function areDependenciesMet(
  step: StepInstance,
  allSteps: StepInstance[],
  master: MasterStepsFile,
): boolean {
  const template = getStepTemplate(master, step.template_id);
  if (!template?.dependencies?.length) return true;
  return template.dependencies.every((depId) =>
    allSteps.some(
      (s) => s.template_id === depId && s.status === "completed",
    ),
  );
}

export function getUnmetDependencies(
  step: StepInstance,
  allSteps: StepInstance[],
  master: MasterStepsFile,
): string[] {
  const template = getStepTemplate(master, step.template_id);
  if (!template?.dependencies?.length) return [];
  return template.dependencies.filter(
    (depId) =>
      !allSteps.some(
        (s) => s.template_id === depId && s.status === "completed",
      ),
  );
}

export function getDependentSteps(
  step: StepInstance,
  allSteps: StepInstance[],
  master: MasterStepsFile,
): StepInstance[] {
  return allSteps.filter((other) => {
    if (other.instance_id === step.instance_id) return false;
    if (other.status !== "completed") return false;
    const t = getStepTemplate(master, other.template_id);
    return t?.dependencies?.includes(step.template_id);
  });
}
