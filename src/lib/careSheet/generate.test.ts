import { describe, expect, it } from "vitest";
import { careSheetFromJob, generateCareSheet } from "./generate";

const baseProducts = {
  exterior: ["Synthetic sealant"],
  interior: ["Interior cleaner"],
  wheels: ["Wheel cleaner"],
  engine: ["Engine degreaser"],
};

const baseInput = {
  tier: "refresh" as const,
  pre_sold_addons: [] as string[],
  upholstery_type: "cloth" as const,
  vehicle_ymmt: "2020 Honda Civic",
  customer_name: "Alex",
  business_name: "Mobile Detail Co",
  business_phone: "555-0100",
  products: baseProducts,
};

describe("generateCareSheet", () => {
  it("returns short snippet for maintenance tier", () => {
    const text = generateCareSheet({ ...baseInput, tier: "maintenance" });
    expect(text).toContain("Maintenance Wash");
    expect(text).not.toContain("Full Refresh");
    expect(text).toContain("Synthetic sealant");
  });

  it("includes tier intro and protection for showroom", () => {
    const text = generateCareSheet({ ...baseInput, tier: "showroom" });
    expect(text).toContain("Showroom Reset");
    expect(text).toContain("Hand-wash only for the first 2 weeks");
  });

  it("adds clay and engine sections for pre-sold addons", () => {
    const text = generateCareSheet({
      ...baseInput,
      pre_sold_addons: ["addon_clay", "addon_engine_bay"],
    });
    expect(text).toContain("Decontamination (clay/iron)");
    expect(text).toContain("Engine bay:");
    expect(text).toContain("Clay Bar Decontamination");
  });

  it("adds leather care for leather upholstery", () => {
    const text = generateCareSheet({
      ...baseInput,
      upholstery_type: "leather",
    });
    expect(text).toContain("Leather/vinyl:");
  });
});

describe("careSheetFromJob", () => {
  it("uses settings business name and phone", () => {
    const text = careSheetFromJob(
      {
        tier: "refresh",
        pre_sold_addons: [],
        upholstery_type: "cloth",
        vehicle_ymmt: "2021 Tesla Model 3",
        customer_name: "Sam",
      },
      {
        business_name: "Shine Mobile",
        phone: "555-9999",
        products: baseProducts,
      },
    );
    expect(text).toContain("Shine Mobile");
    expect(text).toContain("555-9999");
    expect(text).toContain("Sam");
  });
});
