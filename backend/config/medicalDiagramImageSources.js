"use strict";

/**
 * Wikimedia Commons file titles (open licenses) for medical diagram backgrounds.
 * Resolved at runtime via Commons API — see scripts/seedMedicalDiagramImages.js
 */
const MEDICAL_DIAGRAM_WIKIMEDIA_SOURCES = {
  heart: ["Heart numlabels.svg"],
  eye: ["Human eye cross-sectional view grayscale.png"],
  brain: ["Brain human normal inferior view with labels en.svg"],
  body_front: ["Anterior view of human male, retouched.jpg"],
  body_back: ["Posterior view of human male, retouched.jpg"],
  lung: ["Lungs diagram detailed.svg"],
  liver: ["Liver vascular anatomy.svg"],
  kidney: ["Kidney-numbered.png"],
  ear: ["Blausen 0329 EarAnatomy InternalEar.png"],
  nose: ["Illu nose nasal cavities.jpg"],
  throat: ["Illu larynx.jpg"],
  dental_chart: [
    "Comparison of dental notations.svg",
    "ISO-3950 37+.png",
  ],
  skin_map: [
    "Anterior view of human male, retouched.jpg",
    "Posterior view of human male, retouched.jpg",
  ],
  orthopedic: ["Human skeleton front en.svg"],
  oph_anterior_segment: ["Human eye cross-sectional view grayscale.png"],
  oph_cornea: ["Human eye cross-sectional view grayscale.png"],
  oph_fundus_retina: ["Fundus photograph of normal left eye.jpg"],
  oph_optic_disc: ["Fundus photograph of normal left eye.jpg"],
  oph_cataract: ["Schematic diagram of human eye multilingual.svg"],
  oph_glaucoma: ["Optic disc topography, case 1, R, glaucoma.png"],
  oph_diabetic_retinopathy: ["Fundus - diabetic retinopathy.png"],
  oph_macular_degeneration: [
    "Intermediate age related macular degeneration.jpg",
    "MacularDegenerationFundus.jpg",
  ],
  oph_retinal_detachment: ["Human eye cross section detached retina-es.svg"],
  oph_pterygium: ["Pterygium of the eye.jpg", "Pterygium.png"],
};

module.exports = { MEDICAL_DIAGRAM_WIKIMEDIA_SOURCES };
