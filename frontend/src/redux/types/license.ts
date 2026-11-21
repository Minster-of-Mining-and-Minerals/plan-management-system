export interface LicenseType {
  license_type_id: string;
  name: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][]; // [ [ [lon, lat], [lon, lat], ... ] ]
}

export interface CompanyLicense {
  license_id: string;
  company_id: string;
  license_type_id: string;
  license_number: string;
  license_name?: string | null;
  status: "active" | "expired" | "suspended" | "inactive";
  issued_date?: string | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  effective_year_from?: number | null;
  effective_year_to?: number | null;
  mineral_type?: string | null;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  location_details?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  boundary_geojson?: GeoJSONPolygon | null;
  spatial_reference?: string;
  description?: string | null;
  supporting_document_ids?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: {
    company_id: string;
    name: string;
    code: string;
    abbreviation?: string | null;
    registration_number?: string | null;
    contact_person?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    logo_path?: string | null;
  };
  licenseType?: {
    license_type_id: string;
    name: string;
    code: string;
    description?: string | null;
  };
  productionAssignments?: Array<{
    assignment_id: string;
    production_item_id: string;
    productionItem?: {
      item_id: string;
      name: string;
      code: string;
      baseUnit?: { unit_id: string; name: string; symbol: string };
    };
    defaultReportingUnit?: {
      unit_id: string;
      name: string;
      symbol: string;
    };
  }>;
  production_items_count?: number;
  vertices?: Array<{
    order: number;
    latitude: number;
    longitude: number;
  }>;
}

export interface CreateLicensePayload {
  company_id: string;
  license_type_id: string;
  license_number: string;
  license_name?: string;
  status?: string;
  issued_date?: string;
  effective_start_date?: string;
  effective_end_date?: string;
  effective_year_from?: number;
  effective_year_to?: number;
  mineral_type?: string;
  region?: string;
  zone?: string;
  woreda?: string;
  location_details?: string;
  latitude?: number;
  longitude?: number;
  boundary_geojson?: GeoJSONPolygon;
  spatial_reference?: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateLicensePayload extends Partial<CreateLicensePayload> {}

export interface CreateLicenseTypePayload {
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateLicenseTypePayload extends Partial<CreateLicenseTypePayload> {}
