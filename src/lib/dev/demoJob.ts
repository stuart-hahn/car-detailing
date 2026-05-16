import type { TierId, UpholsteryType } from "../types";

export interface NewJobFormValues {
  tier: TierId;
  upholstery_type: UpholsteryType;
  pre_sold_addons: string[];
  customer_name: string;
  customer_phone: string;
  vehicle_ymmt: string;
  license_plate: string;
  service_address: string;
  vin: string;
}

/** Default values for manual New Job testing (Maintenance, minimal photos). */
export const DEMO_NEW_JOB: NewJobFormValues = {
  tier: "maintenance",
  upholstery_type: "cloth",
  pre_sold_addons: [],
  customer_name: "Dev Test Customer",
  customer_phone: "555-0100",
  vehicle_ymmt: "2024 Test Sedan",
  license_plate: "DEV-001",
  service_address: "123 Dev Lane",
  vin: "",
};

export const DEMO_CUSTOMER = {
  customer_name: DEMO_NEW_JOB.customer_name,
  customer_phone: DEMO_NEW_JOB.customer_phone,
  vehicle_ymmt: DEMO_NEW_JOB.vehicle_ymmt,
  license_plate: DEMO_NEW_JOB.license_plate,
  service_address: DEMO_NEW_JOB.service_address,
} as const;
