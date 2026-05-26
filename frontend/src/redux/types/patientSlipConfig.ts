export type SlipObjectFit = "cover" | "contain" | "fill";

export type SlipDecorConfig = {
  enabled: boolean;
  image_url: string;
  height_px: number;
  object_fit: SlipObjectFit;
  object_position: string;
};

export type SlipBodyLayout = "columns" | "rows";

export type SlipFieldSlot = {
  id: string;
  label_am: string;
  label_en: string;
  field_key: string;
  enabled: boolean;
};

export type PatientSlipConfig = {
  header: {
    use_branding_logo: boolean;
    logo_url: string | null;
    use_branding_title: boolean;
    title_am: string | null;
    title_en: string | null;
    logo_width_px: number;
    logo_height_px: number;
  };
  decor: {
    top: SlipDecorConfig;
    bottom: SlipDecorConfig;
  };
  barcode_field_key: string | null;
  /** Side-by-side columns, or stacked rows with a divider between sections */
  layout: SlipBodyLayout;
  left_columns: SlipFieldSlot[];
  right_columns: SlipFieldSlot[];
};

export type ReservedFieldKey = {
  key: string;
  label: string;
};

export type PatientSlipConfigResponse = {
  branding_id: string | null;
  slip_config: PatientSlipConfig;
  defaults: PatientSlipConfig;
  reserved_field_keys: ReservedFieldKey[];
};
