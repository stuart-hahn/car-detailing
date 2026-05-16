import careTemplates from "../../data/care_templates.json";
import addonsFile from "../../data/addons.json";
import type { AppSettings } from "../db";
import type { JobRecord } from "../db";
import type { TierId } from "../types";

export interface CareSheetInput {
  tier: TierId;
  pre_sold_addons: string[];
  upholstery_type: JobRecord["upholstery_type"];
  vehicle_ymmt: string;
  customer_name: string;
  business_name: string;
  business_phone: string;
  referral_note?: string;
  products: AppSettings["products"];
}

const templates = careTemplates as {
  tier_intro: Record<"refresh" | "showroom", string>;
  maintenance_snippet: string;
  sections: Record<string, string>;
};

const addonNames = new Map(
  addonsFile.addons.map((a) => [a.id, a.display_name]),
);

function formatProductBlock(products: AppSettings["products"]): string {
  const lines: string[] = [];
  const groups: [keyof AppSettings["products"], string][] = [
    ["exterior", "Exterior products used"],
    ["interior", "Interior products used"],
    ["wheels", "Wheel products used"],
    ["engine", "Engine products used"],
  ];
  for (const [key, label] of groups) {
    const items = products[key].filter((p) => p.trim());
    if (items.length) {
      lines.push(`${label}: ${items.join(", ")}`);
    }
  }
  return lines.length ? `Products on this visit:\n${lines.join("\n")}` : "";
}

function addonSection(addonId: string): string | null {
  switch (addonId) {
    case "addon_clay":
      return templates.sections.exterior_clay_addon;
    case "addon_engine_bay":
      return templates.sections.engine_addon;
    case "addon_ozone_treatment":
      return templates.sections.ozone_addon;
    case "addon_pet_hair_removal":
      return templates.sections.pet_hair_addon;
    default:
      return null;
  }
}

/** Tier-gated plain-text care sheet for customer handoff. */
export function generateCareSheet(input: CareSheetInput): string {
  const header = [
    input.business_name,
    input.vehicle_ymmt,
    input.customer_name ? `Prepared for ${input.customer_name}` : null,
    input.business_phone ? `Questions: ${input.business_phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (input.tier === "maintenance") {
    const productBlock = formatProductBlock(input.products);
    return [header, "", templates.maintenance_snippet, productBlock]
      .filter(Boolean)
      .join("\n\n");
  }

  const intro = templates.tier_intro[input.tier];
  const sections: string[] = [
    templates.sections.exterior_base,
    templates.sections.interior_base,
  ];

  if (
    input.upholstery_type === "leather" ||
    input.upholstery_type === "mixed"
  ) {
    sections.push(templates.sections.interior_leather);
  }

  sections.push(templates.sections.wheels);

  if (input.tier === "showroom") {
    sections.push(templates.sections.protection);
  }

  for (const addonId of input.pre_sold_addons) {
    const block = addonSection(addonId);
    if (block) sections.push(block);
  }

  const addonLabels = input.pre_sold_addons
    .map((id) => addonNames.get(id))
    .filter(Boolean);
  const addonLine =
    addonLabels.length > 0
      ? `Services included today: ${addonLabels.join(", ")}`
      : "";

  const productBlock = formatProductBlock(input.products);
  const referral = input.referral_note?.trim()
    ? `Referral: ${input.referral_note.trim()}`
    : "";

  return [
    header,
    "",
    intro,
    addonLine,
    "",
    ...sections,
    "",
    productBlock,
    referral,
    templates.sections.closing,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function careSheetFromJob(
  job: Pick<
    JobRecord,
    | "tier"
    | "pre_sold_addons"
    | "upholstery_type"
    | "vehicle_ymmt"
    | "customer_name"
  >,
  settings: Pick<
    AppSettings,
    "business_name" | "phone" | "referral_note" | "products"
  >,
): string {
  return generateCareSheet({
    tier: job.tier,
    pre_sold_addons: job.pre_sold_addons,
    upholstery_type: job.upholstery_type,
    vehicle_ymmt: job.vehicle_ymmt,
    customer_name: job.customer_name,
    business_name: settings.business_name,
    business_phone: settings.phone,
    referral_note: settings.referral_note,
    products: settings.products,
  });
}
