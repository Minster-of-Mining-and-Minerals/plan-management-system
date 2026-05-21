const Joi = require("joi");

const hslPattern = Joi.string().trim().min(3).max(120);

const systemInfoFields = {
  system_name: Joi.string().trim().min(2).max(255).required(),
  system_name_am: Joi.string().trim().max(255).allow("", null).optional(),
  tagline: Joi.string().trim().max(500).allow("", null).optional(),
  logo_url: Joi.string().trim().max(500).required(),
  logo_login_url: Joi.string().trim().max(500).required(),
  is_active: Joi.boolean().optional(),
};

const legacyColorFields = {
  golden_dark_hsl: hslPattern,
  golden_metallic_hsl: hslPattern,
  golden_dark_hover_hsl: hslPattern,
};

const colorFields = {
  theme_json: Joi.object().pattern(Joi.string(), hslPattern).min(1),
  primary_hsl: hslPattern,
  accent_hsl: hslPattern,
  sidebar_hover_hsl: hslPattern,
  accent_hover_hsl: hslPattern,
  ...legacyColorFields,
};

const createBrandingSchema = Joi.object({
  ...systemInfoFields,
  ...colorFields,
}).or("theme_json", "primary_hsl", "accent_hsl", "golden_dark_hsl");

const updateBrandingSchema = Joi.object({
  system_name: Joi.string().trim().min(2).max(255).optional(),
  system_name_am: Joi.string().trim().max(255).allow("", null).optional(),
  tagline: Joi.string().trim().max(500).allow("", null).optional(),
  logo_url: Joi.string().trim().max(500).optional(),
  logo_login_url: Joi.string().trim().max(500).optional(),
  theme_json: Joi.object().pattern(Joi.string(), hslPattern).min(1).optional(),
  primary_hsl: hslPattern.optional(),
  accent_hsl: hslPattern.optional(),
  sidebar_hover_hsl: hslPattern.optional(),
  accent_hover_hsl: hslPattern.optional(),
  ...Object.fromEntries(
    Object.entries(legacyColorFields).map(([key, schema]) => [key, schema.optional()])
  ),
  is_active: Joi.boolean().optional(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details.map((d) => d.message).join(", "),
    });
  }
  next();
};

module.exports = {
  validateCreateBranding: validate(createBrandingSchema),
  validateUpdateBranding: validate(updateBrandingSchema),
};
