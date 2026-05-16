import type { JobIntake } from "../types";

/** Map intake severities / toggles to generator flag IDs. */
export function deriveGeneratorFlags(intake: JobIntake): string[] {
  const flags = new Set<string>(intake.condition_flag_ids);

  if (intake.pet_hair_severity === 1) flags.add("pet_hair_light");
  if (intake.pet_hair_severity === 2) flags.add("pet_hair_severe");

  if (intake.odor_severity === 1) flags.add("odor_1");
  if (intake.odor_severity === 2) flags.add("odor_2");
  if (intake.odor_severity === 3) flags.add("odor_3");

  return [...flags];
}

export function hasHardBlockFlag(flags: string[]): boolean {
  return flags.some((f) => f === "mold" || f === "biohazard");
}
