const { ConvexHttpClient } = require("convex/browser");
const client = new ConvexHttpClient("https://peaceful-frog-360.convex.cloud");

const guidelines = [
  // Assembly (4)
  { name: "Max AOI 60°", category: "assembly", strength: "strong", weight: 0.8, parameterName: "AOI", maxValue: 60, unit: "degrees", description: "Maximum angle of incidence on any surface should not exceed 60°. High AOI increases sensitivity to tilt/decenter and coating difficulty.", tags: ["assembly", "sensitivity"] },
  { name: "Air gap minimum", category: "assembly", strength: "hard", weight: 1.0, parameterName: "air_gap", minValue: 0.1, unit: "mm", description: "Minimum air gap between elements must be ≥0.1mm to allow assembly tooling access.", tags: ["assembly", "manufacturing"] },
  { name: "Element count justification", category: "assembly", strength: "moderate", weight: 0.5, description: "Every element must earn its place. If removing an element degrades performance by <5%, flag for review.", tags: ["assembly", "cost"] },
  { name: "Barrel diameter consistency", category: "assembly", strength: "soft", weight: 0.3, description: "Prefer consistent element diameters within a group to simplify barrel design and reduce spacer count.", tags: ["assembly", "manufacturing"] },

  // Meniscus (4)
  { name: "Meniscus CT/ET ratio", category: "meniscus", strength: "strong", weight: 0.8, parameterName: "CT_ET_ratio", minValue: 1.5, description: "Center thickness to edge thickness ratio ≥1.5 for meniscus elements. Below this, centering becomes unreliable.", tags: ["meniscus", "manufacturing"] },
  { name: "Meniscus edge thickness", category: "meniscus", strength: "hard", weight: 1.0, parameterName: "edge_thickness", minValue: 0.5, unit: "mm", description: "Meniscus edge thickness must be ≥0.5mm. Thinner edges chip during centering and coating.", tags: ["meniscus", "manufacturing"] },
  { name: "Meniscus steep radius warning", category: "meniscus", strength: "moderate", weight: 0.6, description: "Flag meniscus elements where either radius is less than 2× the clear aperture. Steep radii increase centering difficulty and cost.", tags: ["meniscus", "cost"] },
  { name: "Meniscus centering difficulty", category: "meniscus", strength: "soft", weight: 0.4, description: "Meniscus elements with near-concentric radii are difficult to center. Flag when radius difference < 10% of element diameter.", tags: ["meniscus", "manufacturing"] },

  // Plano-Convex (3)
  { name: "Plano-convex CT minimum", category: "plano_convex", strength: "hard", weight: 1.0, parameterName: "center_thickness", minValue: 1.0, unit: "mm", description: "Plano-convex center thickness must be ≥1.0mm for structural integrity during processing.", tags: ["plano-convex", "manufacturing"] },
  { name: "Plano-convex orientation", category: "plano_convex", strength: "moderate", weight: 0.6, description: "Prefer curved side toward the long conjugate (object for finite systems) to minimize spherical aberration.", tags: ["plano-convex", "aberration"] },
  { name: "Plano-convex flatness testing", category: "plano_convex", strength: "soft", weight: 0.3, description: "Plano surfaces can be tested on a flat reference — note this advantage when comparing against curved alternatives.", tags: ["plano-convex", "testing"] },

  // Plano-Concave (2)
  { name: "Plano-concave CT minimum", category: "plano_concave", strength: "hard", weight: 1.0, parameterName: "center_thickness", minValue: 1.0, unit: "mm", description: "Plano-concave center thickness must be ≥1.0mm. Thin centers risk breakage during edging.", tags: ["plano-concave", "manufacturing"] },
  { name: "Plano-concave edge buildup", category: "plano_concave", strength: "moderate", weight: 0.5, description: "Check edge thickness buildup on plano-concave elements. Excessive edge thickness increases weight and barrel diameter.", tags: ["plano-concave", "manufacturing"] },

  // Bi-Convex (3)
  { name: "Bi-convex ET minimum", category: "bi_convex", strength: "hard", weight: 1.0, parameterName: "edge_thickness", minValue: 0.5, unit: "mm", description: "Bi-convex edge thickness must be ≥0.5mm to survive edging and coating.", tags: ["bi-convex", "manufacturing"] },
  { name: "Bi-convex centering advantage", category: "bi_convex", strength: "soft", weight: 0.3, description: "Bi-convex elements self-center well in V-block fixtures. Note this advantage vs meniscus or plano forms.", tags: ["bi-convex", "manufacturing"] },
  { name: "Bi-convex minimum aberration bending", category: "bi_convex", strength: "moderate", weight: 0.6, description: "For positive singlets, prefer the minimum-aberration bending (Coddington shape factor ~+0.7 for distant objects) unless other constraints dominate.", tags: ["bi-convex", "aberration"] },

  // Bi-Concave (2)
  { name: "Bi-concave CT minimum", category: "bi_concave", strength: "hard", weight: 1.0, parameterName: "center_thickness", minValue: 1.0, unit: "mm", description: "Bi-concave center thickness must be ≥1.0mm. This is the thinnest point — must survive all processing.", tags: ["bi-concave", "manufacturing"] },
  { name: "Bi-concave design review flag", category: "bi_concave", strength: "moderate", weight: 0.6, description: "Bi-concave elements are unusual in imaging systems. Flag for design review — optimizer may be stuck in a local minimum.", tags: ["bi-concave", "review"] },

  // Cemented (3)
  { name: "Cemented radius matching", category: "cemented", strength: "strong", weight: 0.9, parameterName: "radius_mismatch", maxValue: 0.5, unit: "%", description: "Cemented interface radii must match within 0.5%. Larger mismatch causes cement layer thickness variation and potential delamination.", tags: ["cemented", "manufacturing"] },
  { name: "Cemented max diameter", category: "cemented", strength: "moderate", weight: 0.5, parameterName: "diameter", maxValue: 25, unit: "mm", description: "Prefer cemented doublets ≤25mm diameter. Larger cemented elements have higher thermal stress risk and alignment difficulty.", tags: ["cemented", "manufacturing"] },
  { name: "Cemented layer thickness", category: "cemented", strength: "strong", weight: 0.8, parameterName: "cement_thickness", minValue: 0.005, maxValue: 0.05, unit: "mm", description: "Cement layer thickness should be 5-50µm. Thinner risks incomplete fill, thicker degrades optical performance.", tags: ["cemented", "manufacturing"] },

  // General (1)
  { name: "M12 TTL limit", category: "general", strength: "hard", weight: 1.0, parameterName: "TTL", maxValue: 20, unit: "mm", description: "M12 lens total track length must be ≤20mm. This is a hard mechanical constraint of the M12 format.", tags: ["general", "M12", "mechanical"] },

  // Glass (1)
  { name: "Glass availability check", category: "glass", strength: "strong", weight: 0.8, description: "Verify glass availability before committing to a design. Check preferred vendor catalogs (Schott, Ohara, CDGM) and confirm lead times for non-stock items.", tags: ["glass", "supply-chain"] },

  // Mount (1)
  { name: "M12 thread engagement", category: "mount", strength: "moderate", weight: 0.6, description: "Ensure sufficient thread engagement for M12 mount — minimum 2 full turns. Under-engagement risks cross-threading in the field.", tags: ["mount", "M12", "mechanical"] },
];

(async () => {
  console.log(`Seeding ${guidelines.length} design guidelines...`);
  for (const g of guidelines) {
    try {
      const id = await client.mutation("designGuidelines:create", { ...g, addedByName: "Theia" });
      console.log(`✅ ${g.category} | ${g.name} → ${id}`);
    } catch (e) {
      console.error(`❌ ${g.category} | ${g.name}: ${e.message}\n${e.data || JSON.stringify(e)}`);
    }
  }
  console.log("Done.");
})();
