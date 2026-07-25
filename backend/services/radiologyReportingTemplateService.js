"use strict";

const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const auditService = require("./auditService");

class RadiologyReportingTemplateService {
  async logAudit(action, resourceId, staffId, details = {}) {
    if (auditService && typeof auditService.logAudit === "function") {
      await auditService.logAudit({
        actorUserId: staffId,
        action,
        resourceType: "RadiologyReportTemplate",
        resourceId,
        details,
      });
    }
  }

  /**
   * Create structured report template with sections.
   */
  async createTemplate(payload, staffId) {
    const { name, procedure_type, modality = "XRAY", sections = [] } = payload || {};

    if (!name?.trim()) {
      const err = new Error("Template name is required");
      err.status = 400;
      throw err;
    }

    const t = await db.sequelize.transaction();
    try {
      const template = await db.RadiologyReportTemplate.create(
        {
          id: uuidv4(),
          name: name.trim(),
          procedure_type: procedure_type ? procedure_type.trim() : null,
          modality: modality.trim().toUpperCase(),
          active: true,
        },
        { transaction: t }
      );

      const defaultSections = sections.length > 0 ? sections : [
        { section_name: "Clinical History", display_order: 1, required: true, default_text: "Standard clinical indication." },
        { section_name: "Technique", display_order: 2, required: true, default_text: "Standard imaging technique applied." },
        { section_name: "Findings", display_order: 3, required: true, default_text: "No acute abnormalities demonstrated." },
        { section_name: "Impression", display_order: 4, required: true, default_text: "Unremarkable examination." },
        { section_name: "Recommendations", display_order: 5, required: false, default_text: "None." },
      ];

      for (const s of defaultSections) {
        await db.RadiologyReportTemplateSection.create(
          {
            id: uuidv4(),
            template_id: template.id,
            section_name: s.section_name.trim(),
            display_order: Number(s.display_order) || 1,
            required: Boolean(s.required),
            default_text: s.default_text ? s.default_text.trim() : null,
          },
          { transaction: t }
        );
      }

      await this.logAudit("RADIOLOGY_TEMPLATE_CREATED", template.id, staffId, { name: template.name });

      await t.commit();
      return await this.getTemplateById(template.id);
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }

  /**
   * Get template by ID with sections.
   */
  async getTemplateById(id) {
    const template = await db.RadiologyReportTemplate.findByPk(id, {
      include: [{ model: db.RadiologyReportTemplateSection, as: "sections" }],
      order: [[{ model: db.RadiologyReportTemplateSection, as: "sections" }, "display_order", "ASC"]],
    });

    if (!template) {
      const err = new Error("Report template not found");
      err.status = 404;
      throw err;
    }

    return template.get({ plain: true });
  }

  /**
   * Get matching template for procedure type or modality.
   */
  async getTemplateForProcedure(procedureType, modality) {
    const where = { active: true };
    if (modality) where.modality = modality;

    const templates = await db.RadiologyReportTemplate.findAll({
      where,
      include: [{ model: db.RadiologyReportTemplateSection, as: "sections" }],
      order: [["created_at", "DESC"]],
    });

    if (templates.length === 0) {
      return null;
    }

    if (procedureType) {
      const match = templates.find((t) => t.procedure_type && t.procedure_type.toLowerCase() === procedureType.toLowerCase());
      if (match) return match.get({ plain: true });
    }

    return templates[0].get({ plain: true });
  }

  /**
   * Apply structured report template sections to a report draft.
   */
  async applyTemplateToReport(reportId, templateId, sectionData, staffId) {
    const template = await this.getTemplateById(templateId);
    const report = await db.RadiologyReport.findByPk(reportId);

    if (!report) {
      const err = new Error("Radiology report not found");
      err.status = 404;
      throw err;
    }

    const structuredSections = (template.sections || []).map((sec) => {
      const userContent = sectionData ? sectionData[sec.section_name] : null;
      return {
        section_name: sec.section_name,
        display_order: sec.display_order,
        required: sec.required,
        content: userContent || sec.default_text || "",
      };
    });

    const findingsSection = structuredSections.find((s) => s.section_name.toLowerCase() === "findings")?.content || report.findings;
    const impressionSection = structuredSections.find((s) => s.section_name.toLowerCase() === "impression")?.content || report.impression;
    const recSection = structuredSections.find((s) => s.section_name.toLowerCase() === "recommendations")?.content || report.recommendations;

    await report.update({
      template_id: templateId,
      structured_sections: structuredSections,
      findings: findingsSection,
      impression: impressionSection,
      recommendations: recSection,
    });

    await this.logAudit("RADIOLOGY_TEMPLATE_APPLIED", reportId, staffId, { template_id: templateId });

    return report.get({ plain: true });
  }
}

module.exports = new RadiologyReportingTemplateService();
