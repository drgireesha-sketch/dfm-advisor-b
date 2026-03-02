/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";

// ─── DFM Knowledge Base ───────────────────────────────────────────────────────
const PROCESSES = {
  injection_molding: {
    label: "Injection Molding", icon: "⬡",
    material_families: ["thermoplastic", "thermoset", "elastomer"],
    volume_fit: { min: 1000, ideal: 50000 }, tooling_cost: "High", unit_cost: "Very Low", lead_time: "8–16 weeks (tooling)",
    rules: [
      { id: "im1", severity: "critical", category: "Geometry", title: "Uniform Wall Thickness", desc: "Maintain 2–4mm wall thickness. Variations >25% cause sink marks and warpage.", fix: "Use coring to remove mass and add ribs for stiffness.", ref: "Boothroyd & Dewhurst, Ch.9" },
      { id: "im2", severity: "critical", category: "Geometry", title: "Draft Angles", desc: "Minimum 1° draft on all vertical surfaces. Textured surfaces require 3–5°.", fix: "Apply 1.5° as baseline; increase for deeper draws.", ref: "ISO 10135" },
      { id: "im3", severity: "warning", category: "Geometry", title: "Undercuts", desc: "Internal undercuts require side-actions, increasing tooling cost 15–40%.", fix: "Redesign with parting line geometry or use side-action inserts judiciously.", ref: "Rosato, Injection Molding Handbook" },
      { id: "im4", severity: "warning", category: "Geometry", title: "Rib Design", desc: "Rib thickness should be 50–60% of nominal wall to prevent sink marks.", fix: "T_rib = 0.5–0.6 × T_wall, height ≤ 3 × T_wall.", ref: "Boothroyd & Dewhurst" },
      { id: "im5", severity: "info", category: "Material", title: "Shrinkage Allowance", desc: "Account for 0.5–2% shrinkage depending on material. Crystalline materials shrink more.", fix: "Confirm shrinkage rate with material datasheet (MatWeb) and adjust tooling dimensions.", ref: "MatWeb / CAMPUS Database" },
    ],
    materials: ["ABS", "Polypropylene (PP)", "Nylon (PA6/66)", "Polycarbonate (PC)", "POM (Acetal)", "PEEK"],
    sustainability: { energy_intensity: "Medium", recyclability: "Medium", eol: "Recyclable (thermoplastics)", co2_index: 3.5 },
    cost_model: "Tooling: $15K–$100K+. Unit cost drops sharply after ~10K units.",
  },
  cnc_machining: {
    label: "CNC Machining", icon: "⚙",
    material_families: ["metal", "plastic", "composite"],
    volume_fit: { min: 1, ideal: 500 }, tooling_cost: "Low", unit_cost: "High", lead_time: "1–4 weeks",
    rules: [
      { id: "cnc1", severity: "critical", category: "Geometry", title: "Internal Corner Radii", desc: "Internal corners must match tool radius. Sharp internal corners are impossible.", fix: "Specify minimum internal radius = tool radius + 20% clearance (typically ≥ 0.5mm).", ref: "ASME Y14.5-2018" },
      { id: "cnc2", severity: "critical", category: "Geometry", title: "Thin Walls & Features", desc: "Walls <0.5mm (metals) or <1mm (plastics) are prone to vibration and deflection.", fix: "Maintain ≥1mm wall for metals, ≥1.5mm for plastics.", ref: "Kalpakjian, Manufacturing Engineering" },
      { id: "cnc3", severity: "warning", category: "Process", title: "Deep Cavities", desc: "Cavity depth >4× tool diameter requires special long-reach tooling and reduces accuracy.", fix: "Limit pocket depth to 3× tool diameter. Split deep features across setups.", ref: "Boothroyd & Dewhurst" },
      { id: "cnc4", severity: "warning", category: "Process", title: "Setup & Fixturing", desc: "Each additional setup orientation adds cost and potential alignment error.", fix: "Design parts completeable in ≤2 setups. Use geometric references for consistent fixturing.", ref: "Bralla, Design for Manufacturability Handbook" },
      { id: "cnc5", severity: "info", category: "Tolerances", title: "Tolerance Specification", desc: "Standard CNC holds ±0.1mm. Tighter tolerances increase cost exponentially.", fix: "Apply tight tolerances only to functional interfaces. Use ISO 2768-m as default.", ref: "ISO 2768" },
    ],
    materials: ["Aluminum 6061/7075", "Stainless Steel 304/316", "Steel 4140", "Titanium Ti-6Al-4V", "Brass", "Delrin/POM", "PEEK"],
    sustainability: { energy_intensity: "High", recyclability: "High (metal chips)", eol: "Fully recyclable", co2_index: 5.2 },
    cost_model: "No tooling investment. Cost driven by machining time. Complex parts: $50–$500+/unit.",
  },
  sheet_metal: {
    label: "Sheet Metal Fabrication", icon: "▱",
    material_families: ["metal"],
    volume_fit: { min: 10, ideal: 5000 }, tooling_cost: "Medium", unit_cost: "Low-Medium", lead_time: "2–6 weeks",
    rules: [
      { id: "sm1", severity: "critical", category: "Geometry", title: "Bend Radius", desc: "Minimum inside bend radius = 1× material thickness. Tighter radii cause cracking.", fix: "Use R = T (material thickness) as minimum. Increase for harder alloys.", ref: "FABRICATOR Magazine DFM Guide" },
      { id: "sm2", severity: "critical", category: "Geometry", title: "Hole-to-Edge Distance", desc: "Holes closer than 1.5× thickness to edges cause deformation during punching.", fix: "Maintain edge-to-hole spacing ≥ 1.5T. Hole-to-hole spacing ≥ 3T.", ref: "Bralla, Design for Manufacturability" },
      { id: "sm3", severity: "warning", category: "Geometry", title: "Bend Relief", desc: "Notches near bends without relief cuts cause tearing.", fix: "Add bend relief cuts: width ≥ T, depth ≥ T + bend radius.", ref: "SME Sheet Metal Handbook" },
      { id: "sm4", severity: "warning", category: "Process", title: "Flange Length", desc: "Minimum flange length must exceed 4× thickness to allow proper bending.", fix: "L_flange ≥ 4T. Avoid very short flanges; add return flanges for rigidity.", ref: "Boothroyd & Dewhurst" },
      { id: "sm5", severity: "info", category: "Assembly", title: "Hardware Integration", desc: "PEM fasteners, press-fit studs allow screw attachment without tapping thin sheet.", fix: "Use clinch hardware for t < 2mm. Specify PEM catalogue numbers on drawings.", ref: "PEM Fastening Systems Technical Ref." },
    ],
    materials: ["Mild Steel (CR/HR)", "Stainless Steel 304", "Aluminum 5052/6061", "Galvanized Steel", "Copper"],
    sustainability: { energy_intensity: "Medium", recyclability: "Very High", eol: "Fully recyclable", co2_index: 2.8 },
    cost_model: "Tooling: $500–$10K (dies/fixtures). Very efficient for flat-pattern designs at volume.",
  },
  die_casting: {
    label: "Die Casting", icon: "◈",
    material_families: ["metal"],
    volume_fit: { min: 5000, ideal: 100000 }, tooling_cost: "Very High", unit_cost: "Very Low", lead_time: "10–20 weeks (tooling)",
    rules: [
      { id: "dc1", severity: "critical", category: "Geometry", title: "Wall Thickness", desc: "Maintain 1.5–5mm walls. Min 1mm for zinc, 1.5mm for aluminum, 2mm for magnesium.", fix: "Use coring aggressively. Avoid thick sections that trap heat and cause porosity.", ref: "NADCA Product Spec Standards" },
      { id: "dc2", severity: "critical", category: "Geometry", title: "Draft Angles", desc: "Minimum 1° draft on external surfaces, 2° on internal surfaces.", fix: "1.5° standard draft, 3°+ for textured or deep features.", ref: "NADCA Design Guide" },
      { id: "dc3", severity: "warning", category: "Quality", title: "Porosity Risk", desc: "Thick sections and improper gating cause subsurface porosity, failing pressure tests.", fix: "Keep walls uniform, use overflow wells, apply vacuum assist for structural parts.", ref: "AFS Casting Source, ASM Handbook Vol.15" },
      { id: "dc4", severity: "warning", category: "Geometry", title: "Undercuts & Side-Actions", desc: "Side-actions add $3K–$20K+ per feature to tooling cost.", fix: "Redesign features to be accessible from main die parting direction.", ref: "Bralla, Design for Manufacturability" },
      { id: "dc5", severity: "info", category: "Finishing", title: "Machining Allowance", desc: "Critical surfaces require post-cast machining. Allow 0.5–1mm stock on tight-tolerance faces.", fix: "Identify datum surfaces early. Add machining pads to functional interfaces.", ref: "NADCA HPDC Standards" },
    ],
    materials: ["Aluminum A380", "Aluminum A413", "Zinc Zamak 3/5", "Magnesium AZ91D", "Copper Alloys"],
    sustainability: { energy_intensity: "Very High", recyclability: "High", eol: "Recyclable alloys", co2_index: 6.8 },
    cost_model: "Tooling: $30K–$250K. Extremely low unit cost at high volume (>10K units).",
  },
  forging_stamping: {
    label: "Forging / Stamping", icon: "⬟",
    material_families: ["metal"],
    volume_fit: { min: 500, ideal: 50000 }, tooling_cost: "High", unit_cost: "Low", lead_time: "6–14 weeks",
    rules: [
      { id: "fs1", severity: "critical", category: "Geometry", title: "Parting Line Design", desc: "Forging parting line determines flash location and die closure. Poor location increases trim cost.", fix: "Place parting line at maximum cross-section. Avoid placing on functional surfaces.", ref: "ASM Handbook Vol.14A, Metalworking" },
      { id: "fs2", severity: "critical", category: "Geometry", title: "Draft Angles (Forging)", desc: "External drafts: 5–7°. Internal drafts: 7–10°. Less draft = more die wear and extraction force.", fix: "7° as standard draft angle. Reduce only where functionally necessary with engineering sign-off.", ref: "Bralla, Design for Manufacturability" },
      { id: "fs3", severity: "warning", category: "Geometry", title: "Fillet & Corner Radii", desc: "Sharp corners in die stress-concentrate and crack both die and part during forging.", fix: "All corners: min R = 1.5–3mm for small parts, larger for heavy forgings.", ref: "SFSA Forging Design Guide" },
      { id: "fs4", severity: "warning", category: "Material", title: "Forgeability Index", desc: "Not all alloys forge well. High-alloy steels and some Al alloys require elevated temperature.", fix: "Verify forgeability: 1045 steel and Al 6061 are benchmarks. Avoid free-machining grades.", ref: "ASM Handbook Vol.14A" },
      { id: "fs5", severity: "info", category: "Quality", title: "Grain Flow Optimization", desc: "Forging aligns grain flow for maximum fatigue resistance — only if shape leverages this.", fix: "Orient load paths parallel to grain flow. Avoid machining through grain flow lines.", ref: "ASM Handbook Vol.14A" },
    ],
    materials: ["Carbon Steel 1045", "Alloy Steel 4140/4340", "Aluminum 6061/7075", "Titanium Ti-6Al-4V", "Stainless 17-4PH"],
    sustainability: { energy_intensity: "High", recyclability: "Very High", eol: "Fully recyclable", co2_index: 4.1 },
    cost_model: "Tooling: $10K–$80K. Best economics 1K–100K units. Excellent strength-to-cost at scale.",
  },
  investment_casting: {
    label: "Investment Casting", icon: "◎",
    material_families: ["metal"],
    volume_fit: { min: 10, ideal: 2000 }, tooling_cost: "Medium", unit_cost: "Medium", lead_time: "6–12 weeks",
    rules: [
      { id: "ic1", severity: "critical", category: "Geometry", title: "Wall Thickness Minimums", desc: "Min 1.5mm for small castings, 2.5mm for larger sections. Thin walls cause misruns.", fix: "Prototype wall thickness at 2mm minimum. Verify with foundry for specific alloy.", ref: "Investment Casting Institute (ICI) Design Guide" },
      { id: "ic2", severity: "critical", category: "Geometry", title: "Directional Solidification", desc: "Poor thermal design causes shrinkage porosity in last-to-solidify regions.", fix: "Design for progressive solidification toward gates/risers. Thicker sections near gate.", ref: "ASM Handbook Vol.15" },
      { id: "ic3", severity: "warning", category: "Geometry", title: "Core Complexity", desc: "Ceramic cores enable complex internals but add cost and yield risk.", fix: "Avoid blind internal passageways. Where required, budget for core qualification time.", ref: "ICI Process Design Guide" },
      { id: "ic4", severity: "warning", category: "Tolerances", title: "As-Cast Tolerances", desc: "Investment casting achieves ±0.1–0.25mm as-cast — tighter than sand or die casting.", fix: "Exploit near-net-shape capability; specify tight tolerances only on critical interfaces.", ref: "ASTM A957" },
      { id: "ic5", severity: "info", category: "Design", title: "Complexity is Free", desc: "Unlike machining, geometric complexity in investment casting costs relatively little extra.", fix: "Consolidate multiple machined parts into one casting. Add bosses, brackets, flanges.", ref: "Bralla, DFM Handbook" },
    ],
    materials: ["Stainless 316/17-4PH", "Inconel 718/625", "Titanium Ti-6Al-4V", "Aluminum A356", "Cobalt alloys", "Tool steels"],
    sustainability: { energy_intensity: "High", recyclability: "Medium", eol: "Metal recyclable, ceramic waste", co2_index: 5.5 },
    cost_model: "Tooling: $2K–$25K (wax dies). Near-net-shape reduces machining cost. Ideal for complex, low-medium volume.",
  },
};

const MATERIAL_DB = {
  metals: {
    "Aluminum 6061": { density: 2.7, tensile: "276 MPa", machinability: "Excellent", cost_index: 2.1, co2_kg: 8.2, recyclability: "95%", source: "MatWeb / ASM" },
    "Stainless 316": { density: 8.0, tensile: "515 MPa", machinability: "Fair", cost_index: 5.5, co2_kg: 6.1, recyclability: "90%", source: "MatWeb" },
    "Steel 4140": { density: 7.85, tensile: "655 MPa", machinability: "Good", cost_index: 1.8, co2_kg: 1.9, recyclability: "99%", source: "ASM Handbook" },
    "Titanium Ti-6Al-4V": { density: 4.43, tensile: "950 MPa", machinability: "Difficult", cost_index: 18, co2_kg: 35, recyclability: "85%", source: "TIMET / MatWeb" },
  },
  polymers: {
    "ABS": { density: 1.05, tensile: "40 MPa", machinability: "Good", cost_index: 1.0, co2_kg: 3.4, recyclability: "60%", source: "CAMPUS Database" },
    "Polypropylene PP": { density: 0.91, tensile: "35 MPa", machinability: "Good", cost_index: 0.8, co2_kg: 2.0, recyclability: "70%", source: "PlasticsEurope" },
    "PEEK": { density: 1.32, tensile: "100 MPa", machinability: "Excellent", cost_index: 42, co2_kg: 9.5, recyclability: "40%", source: "Victrex Data" },
    "Nylon PA66": { density: 1.14, tensile: "83 MPa", machinability: "Good", cost_index: 1.9, co2_kg: 7.9, recyclability: "55%", source: "CAMPUS Database" },
  },
};

const VOLUME_BANDS = [
  { label: "Prototype (1–10)", value: "prototype", qty: 5 },
  { label: "Low Volume (10–500)", value: "low", qty: 250 },
  { label: "Medium Volume (500–10K)", value: "medium", qty: 5000 },
  { label: "High Volume (10K–100K)", value: "high", qty: 50000 },
  { label: "Mass Production (100K+)", value: "mass", qty: 500000 },
];

const SECTORS = ["Aerospace", "Automotive", "Consumer Electronics", "Medical/MedTech", "Industrial Equipment", "Defence", "Energy/Oil & Gas", "General Manufacturing"];
const SUPPORTED_IMAGE = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"];
const SUPPORTED_3D = [".stl", ".obj", ".step", ".stp", ".iges", ".igs"];

function getProcessScore(process, volume, materialFamily) {
  const p = PROCESSES[process];
  const qty = VOLUME_BANDS.find(v => v.value === volume)?.qty || 1000;
  let score = 100;
  if (qty < p.volume_fit.min) score -= 40;
  else if (qty < p.volume_fit.ideal) score -= 15;
  if (materialFamily && !p.material_families.includes(materialFamily)) score -= 50;
  return Math.max(0, score);
}
function getSeverityColor(s) {
  return s === "critical" ? "#ff4757" : s === "warning" ? "#ffa502" : "#2ed573";
}
function getSustainabilityGrade(idx) {
  if (idx <= 2) return { grade: "A", color: "#2ed573" };
  if (idx <= 4) return { grade: "B", color: "#7bed9f" };
  if (idx <= 5.5) return { grade: "C", color: "#ffa502" };
  return { grade: "D", color: "#ff4757" };
}

async function parse3DModelMeta(file) {
  const ext = "." + file.name.split(".").pop().toLowerCase();
  const meta = { format: ext.toUpperCase(), fileName: file.name, fileSize: (file.size / 1024).toFixed(1) + " KB" };
  try {
    const text = await file.text();
    if (ext === ".stl") {
      const isBinary = !text.trimStart().startsWith("solid");
      meta.encoding = isBinary ? "Binary STL" : "ASCII STL";
      const triMatches = text.match(/facet normal/g);
      if (triMatches) meta.triangles = triMatches.length.toLocaleString();
      const verts = text.match(/vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g);
      if (verts && verts.length > 2) {
        const coords = verts.map(v => v.replace("vertex", "").trim().split(/\s+/).map(Number));
        const xs = coords.map(c => c[0]), ys = coords.map(c => c[1]), zs = coords.map(c => c[2]);
        const bb = { x: (Math.max(...xs) - Math.min(...xs)).toFixed(1), y: (Math.max(...ys) - Math.min(...ys)).toFixed(1), z: (Math.max(...zs) - Math.min(...zs)).toFixed(1) };
        meta.boundingBox = `${bb.x} × ${bb.y} × ${bb.z} mm`;
      }
    } else if (ext === ".obj") {
      meta.vertices = (text.match(/^v\s/gm) || []).length.toLocaleString();
      meta.faces = (text.match(/^f\s/gm) || []).length.toLocaleString();
    } else if ([".step", ".stp"].includes(ext)) {
      meta.encoding = "STEP (ISO 10303)";
      const prod = text.match(/PRODUCT\('([^']+)'/i);
      if (prod) meta.productName = prod[1];
    } else if ([".iges", ".igs"].includes(ext)) {
      meta.encoding = "IGES (ASME Y14.26M)";
    }
  } catch (e) { meta.parseNote = "Binary file — metadata estimated from size"; }
  return meta;
}


// ─── ISO Tolerance Data & Selector ───────────────────────────────────────────
const ISO_TOLERANCE_CLASSES = [
  {
    group: "ISO 2768 — General Tolerances (Linear)",
    standard: "ISO 2768-1",
    hint: "For linear dimensions not individually toleranced on a drawing",
    options: [
      {
        value: "2768-f",
        label: "Fine — f",
        range: "±0.05 to ±0.2mm",
        typical: "±0.1mm at 30mm",
        processes: ["CNC Machining", "Investment Casting"],
        note: "For precision machined parts. Typical on mating interfaces requiring close fit.",
        color: "#2ed573",
      },
      {
        value: "2768-m",
        label: "Medium — m  (Default)",
        range: "±0.1 to ±0.5mm",
        typical: "±0.2mm at 30mm",
        processes: ["CNC Machining", "Sheet Metal", "Investment Casting"],
        note: "Most common class. Suitable for the majority of machined and fabricated parts. Apply unless design demands otherwise.",
        color: "#00d4aa",
      },
      {
        value: "2768-c",
        label: "Coarse — c",
        range: "±0.2 to ±1.0mm",
        typical: "±0.5mm at 30mm",
        processes: ["Sheet Metal", "Die Casting", "Forging / Stamping"],
        note: "Appropriate for sheet metal, weldments, and cast parts where tight tolerances are unnecessary.",
        color: "#ffa502",
      },
      {
        value: "2768-v",
        label: "Very Coarse — v",
        range: "±0.5 to ±2.0mm+",
        typical: "±1.0mm at 30mm",
        processes: ["Die Casting", "Forging / Stamping", "Investment Casting"],
        note: "For semi-finished or rough-machined surfaces. Sand casting, forging flash lines.",
        color: "#ff6b81",
      },
    ],
  },
  {
    group: "ISO 2768 — General Tolerances (Angular)",
    standard: "ISO 2768-1 Angular",
    hint: "Angular tolerance classes for un-toleranced angular dimensions",
    options: [
      {
        value: "2768-ang-f",
        label: "Angular Fine — f",
        range: "±0°5′ to ±0°20′",
        typical: "±0°10′ up to 100mm",
        processes: ["CNC Machining"],
        note: "Precision angular features requiring accurate machining setups.",
        color: "#2ed573",
      },
      {
        value: "2768-ang-m",
        label: "Angular Medium — m",
        range: "±0°10′ to ±0°30′",
        typical: "±0°20′ up to 100mm",
        processes: ["CNC Machining", "Sheet Metal"],
        note: "Standard for most angular features.",
        color: "#00d4aa",
      },
      {
        value: "2768-ang-c",
        label: "Angular Coarse — c",
        range: "±0°20′ to ±1°",
        typical: "±0°30′ up to 100mm",
        processes: ["Sheet Metal", "Die Casting"],
        note: "For less critical angular features on cast or formed parts.",
        color: "#ffa502",
      },
    ],
  },
  {
    group: "ISO 2768 — Geometrical Tolerances",
    standard: "ISO 2768-2",
    hint: "General geometrical tolerances for straightness, flatness, roundness, cylindricity, symmetry, and run-out",
    options: [
      {
        value: "2768-H",
        label: "Class H",
        range: "Straightness/flatness: 0.02–0.3mm",
        typical: "Flatness ±0.1mm at 100mm",
        processes: ["CNC Machining", "Investment Casting"],
        note: "Precise geometrical control. Used where form accuracy is critical (sealing surfaces, bearing seats).",
        color: "#2ed573",
      },
      {
        value: "2768-K",
        label: "Class K",
        range: "Straightness/flatness: 0.05–0.6mm",
        typical: "Flatness ±0.2mm at 100mm",
        processes: ["CNC Machining", "Sheet Metal", "Die Casting"],
        note: "General purpose geometrical tolerance. Most common for machined components.",
        color: "#00d4aa",
      },
      {
        value: "2768-L",
        label: "Class L",
        range: "Straightness/flatness: 0.1–1.0mm",
        typical: "Flatness ±0.5mm at 100mm",
        processes: ["Sheet Metal", "Die Casting", "Forging / Stamping"],
        note: "Relaxed geometrical control. Suitable for castings, weldments, and structural parts.",
        color: "#ffa502",
      },
    ],
  },
  {
    group: "ISO 286 — Fits & Shaft/Hole Tolerances",
    standard: "ISO 286-1",
    hint: "For cylindrical features requiring defined fits — use alongside ISO 2768 for mating interfaces",
    options: [
      {
        value: "286-H7h6",
        label: "H7/h6 — Clearance Fit",
        range: "Clearance: 0 to ~30µm (at ø25mm)",
        typical: "Shaft: -13µm/0, Hole: 0/+21µm",
        processes: ["CNC Machining"],
        note: "Standard sliding or location clearance fit. Shaft slides freely in hole with minimal play. Common for shafts, pins, locating features.",
        color: "#2ed573",
      },
      {
        value: "286-H7p6",
        label: "H7/p6 — Interference Fit",
        range: "Interference: ~12 to ~42µm (at ø25mm)",
        typical: "Shaft: +22µm/+35µm, Hole: 0/+21µm",
        processes: ["CNC Machining"],
        note: "Press or shrink fit. Permanent assembly requiring press or heating to install. Used for bearing seats, gear hubs.",
        color: "#ff4757",
      },
      {
        value: "286-H7k6",
        label: "H7/k6 — Transition Fit",
        range: "±0 to ~25µm (at ø25mm)",
        typical: "Shaft: +2µm/+15µm, Hole: 0/+21µm",
        processes: ["CNC Machining"],
        note: "Between clearance and interference. Used where accurate location is needed with occasional disassembly. Keys, splines.",
        color: "#ffa502",
      },
      {
        value: "286-H8f7",
        label: "H8/f7 — Running Fit",
        range: "Clearance: ~20 to ~70µm (at ø25mm)",
        typical: "Shaft: -20µm/-41µm, Hole: 0/+33µm",
        processes: ["CNC Machining"],
        note: "Free running fit for lubricated bearings and journal bearings. Not suitable for precision location.",
        color: "#00d4aa",
      },
      {
        value: "286-js6",
        label: "JS6 — Symmetrical Tolerance",
        range: "±IT6/2 (e.g. ±4µm at ø10mm)",
        typical: "±6µm at ø25mm",
        processes: ["CNC Machining", "Grinding"],
        note: "Symmetrical deviation — equal plus and minus. Used for precision shafts and gauging applications.",
        color: "#2ed573",
      },
    ],
  },
];

function ToleranceSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hoveredVal, setHoveredVal] = useState(null);
  const ref = useRef(null);

  const allOptions = ISO_TOLERANCE_CLASSES.flatMap(g => g.options);
  const selected = allOptions.find(o => o.value === value) || allOptions[1];
  const hovered = allOptions.find(o => o.value === hoveredVal);
  const displayInfo = hovered || selected;

  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref}>
      <div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: "0.12em", marginBottom: "6px" }}>
        TOLERANCE CLASS
        <span style={{ color: "#2a3340", textTransform: "none", letterSpacing: "normal" }}> — ISO 2768 / ISO 286</span>
      </div>

      {/* Trigger */}
      <div onClick={() => setOpen(o => !o)} style={{ ...inputStyle, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none", border: open ? "1px solid #00d4aa" : "1px solid #1e2530" }}>
        <span>
          <span style={{ color: allOptions.find(o=>o.value===value)?.color || "#00d4aa", marginRight: "8px" }}>●</span>
          {selected.label}
        </span>
        <span style={{ color: "#3d4a5c", fontSize: "10px" }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Dropdown panel */}
      {open && (
        <div style={{ position: "relative", zIndex: 300 }}>
          <div style={{ position: "absolute", top: "4px", left: 0, right: 0, background: "#0d1117", border: "1px solid #1e2530", borderRadius: "8px", boxShadow: "0 12px 40px rgba(0,0,0,0.6)", overflow: "hidden", display: "flex" }}>

            {/* Left: grouped options list */}
            <div style={{ width: "230px", flexShrink: 0, overflowY: "auto", maxHeight: "360px", borderRight: "1px solid #1e2530" }}>
              {ISO_TOLERANCE_CLASSES.map(group => (
                <div key={group.group}>
                  <div style={{ padding: "8px 12px 4px", fontSize: "9px", color: "#3d4a5c", letterSpacing: "0.1em", background: "#0a0c0f", borderBottom: "1px solid #1a1f28", textTransform: "uppercase" }}>
                    {group.standard}
                  </div>
                  {group.options.map(opt => (
                    <div
                      key={opt.value}
                      onClick={() => { onChange(opt.value); setOpen(false); }}
                      onMouseEnter={() => setHoveredVal(opt.value)}
                      onMouseLeave={() => setHoveredVal(null)}
                      style={{ padding: "9px 12px", cursor: "pointer", background: value === opt.value ? "rgba(0,212,170,0.08)" : hoveredVal === opt.value ? "rgba(255,255,255,0.03)" : "transparent", borderBottom: "1px solid #1a1f28", display: "flex", alignItems: "center", gap: "8px" }}
                    >
                      <span style={{ color: opt.color, fontSize: "8px" }}>●</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "11px", color: value === opt.value ? "#00d4aa" : "#c8d0dc", fontWeight: value === opt.value ? "600" : "400" }}>{opt.label}</div>
                        <div style={{ fontSize: "9px", color: "#3d4a5c", marginTop: "1px" }}>{opt.range}</div>
                      </div>
                      {value === opt.value && <span style={{ fontSize: "10px", color: "#00d4aa" }}>✓</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Right: info panel */}
            <div style={{ flex: 1, padding: "14px", minWidth: 0 }}>
              <div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: "0.1em", marginBottom: "8px" }}>CLASS DETAIL</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <span style={{ color: displayInfo.color, fontSize: "14px" }}>●</span>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#e8e6e1" }}>{displayInfo.label}</span>
              </div>

              <InfoRow label="TOLERANCE RANGE" value={displayInfo.range} />
              <InfoRow label="TYPICAL VALUE" value={displayInfo.typical} />

              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: "0.08em", marginBottom: "4px" }}>SUITABLE PROCESSES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {displayInfo.processes.map(p => (
                    <span key={p} style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(0,212,170,0.1)", color: "#00d4aa", borderRadius: "8px" }}>{p}</span>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: "10px", color: "#8899aa", lineHeight: 1.6, borderTop: "1px solid #1e2530", paddingTop: "8px" }}>
                {displayInfo.note}
              </div>

              <div style={{ marginTop: "10px", fontSize: "9px", color: "#2a3a4a", fontStyle: "italic" }}>
                Source: {ISO_TOLERANCE_CLASSES.find(g => g.options.some(o => o.value === displayInfo.value))?.standard}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ marginBottom: "7px" }}>
      <div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: "11px", color: "#c8d0dc", fontFamily: "'IBM Plex Mono',monospace", marginTop: "1px" }}>{value}</div>
    </div>
  );
}

const inputStyle = { width: "100%", background: "#0d1117", border: "1px solid #1e2530", borderRadius: "6px", color: "#e8e6e1", padding: "10px 12px", fontSize: "12px", fontFamily: "'IBM Plex Mono',monospace", outline: "none", boxSizing: "border-box" };
const secondaryBtn = { padding: "14px 18px", background: "transparent", color: "#6b7888", border: "1px solid #1e2530", borderRadius: "6px", fontSize: "12px", letterSpacing: ".08em", cursor: "pointer", fontFamily: "'IBM Plex Mono',monospace" };


// ─── PDF Report Generator ─────────────────────────────────────────────────────
function generatePDFReport({ form, results, uploadedFile, VOLUME_BANDS, PROCESSES }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const volumeLabel = VOLUME_BANDS.find(v => v.value === form.volume)?.label || form.volume;

  const sevColor = (s) => s === "critical" ? "#c0392b" : s === "warning" ? "#d68910" : "#1e8449";
  const sevBg = (s) => s === "critical" ? "#fdf2f2" : s === "warning" ? "#fefdf0" : "#f0fdf4";

  const co2Grade = (idx) => {
    if (idx <= 2) return { grade: "A", color: "#1e8449" };
    if (idx <= 4) return { grade: "B", color: "#239b56" };
    if (idx <= 5.5) return { grade: "C", color: "#d68910" };
    return { grade: "D", color: "#c0392b" };
  };

  const aiSection = uploadedFile?.aiAnalysis ? `
    <div class="section">
      <div class="section-title">AI Component Analysis
        <span class="conf-badge conf-${uploadedFile.aiAnalysis.confidenceLevel}">${uploadedFile.aiAnalysis.confidenceLevel} confidence</span>
      </div>
      <div class="ai-card">
        <div class="ai-file-row">
          <span class="ai-icon">${uploadedFile.type === "image" ? "🖼" : "📐"}</span>
          <div>
            <div class="ai-filename">${uploadedFile.file.name}</div>
            <div class="ai-filetype">${uploadedFile.type === "image" ? "Component Image" : "3D Model"} · ${(uploadedFile.file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <p class="ai-description">${uploadedFile.aiAnalysis.partDescription || ""}</p>
        ${uploadedFile.aiAnalysis.visibleFeatures?.length ? `
          <div class="tag-row-label">Detected Features</div>
          <div class="tag-row">${uploadedFile.aiAnalysis.visibleFeatures.map(f => `<span class="tag">${f}</span>`).join("")}</div>
        ` : ""}
        ${uploadedFile.aiAnalysis.dfmObservations?.length ? `
          <div class="tag-row-label" style="margin-top:10px">DFM Signals from Upload</div>
          ${uploadedFile.aiAnalysis.dfmObservations.map(o => `<div class="obs-row">· ${o}</div>`).join("")}
        ` : ""}
        ${uploadedFile.aiAnalysis.probableProcesses?.length ? `
          <div class="tag-row-label" style="margin-top:10px">AI-Suggested Processes</div>
          <div class="tag-row">${uploadedFile.aiAnalysis.probableProcesses.slice(0, 4).map(p => `<span class="tag tag-teal">${p}</span>`).join("")}</div>
        ` : ""}
        ${uploadedFile.aiAnalysis.caveats ? `<p class="caveat">⚠ ${uploadedFile.aiAnalysis.caveats}</p>` : ""}
      </div>
    </div>
  ` : "";

  // Build material DB rows for the report
  const machinabilityColor = (m) => m === "Excellent" ? "#1e8449" : m === "Good" ? "#1a7a5e" : m === "Fair" ? "#d68910" : "#c0392b";
  const machinabilityBg = (m) => m === "Excellent" ? "#f0fdf4" : m === "Good" ? "#f0fdf9" : m === "Fair" ? "#fffbeb" : "#fff5f5";

  const materialTableHTML = Object.entries(MATERIAL_DB).map(([family, mats]) => `
    <div style="margin-bottom:16px">
      <div style="font-size:10px;color:#64748b;font-weight:600;text-transform:capitalize;margin-bottom:6px;padding:4px 0;border-bottom:1px solid #f1f5f9;">${family}</div>
      <table class="mat-table">
        <thead>
          <tr>
            <th>Material</th><th>Density</th><th>Tensile</th><th>Machinability</th><th>Cost Index</th><th>CO&#8322;/kg</th><th>Recyclability</th><th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(mats).map(([name, d]) => `
            <tr>
              <td style="font-weight:600;color:#1a1a2e">${name}</td>
              <td>${d.density} g/cm&#179;</td>
              <td>${d.tensile}</td>
              <td><span style="font-size:9px;padding:2px 6px;border-radius:8px;font-weight:600;background:${machinabilityBg(d.machinability)};color:${machinabilityColor(d.machinability)}">${d.machinability}</span></td>
              <td>&#215;${d.cost_index}</td>
              <td>${d.co2_kg} kg</td>
              <td>
                <div style="display:flex;align-items:center;gap:5px;">
                  <div style="width:36px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;">
                    <div style="width:${d.recyclability};height:4px;background:#00b894;border-radius:2px;"></div>
                  </div>
                  ${d.recyclability}
                </div>
              </td>
              <td style="color:#9aa5b4;font-size:9px">${d.source}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `).join("");

  const processesHTML = results.map((proc, idx) => {
    const criticals = proc.rules.filter(r => r.severity === "critical");
    const warnings = proc.rules.filter(r => r.severity === "warning");
    const sg = co2Grade(proc.sustainability.co2_index);
    const isTop = idx === 0;

    return `
    <div class="process-block ${isTop ? "process-top" : ""}">

      <!-- Process Header -->
      <div class="process-header">
        <div class="process-title-group">
          ${isTop ? '<span class="top-badge">TOP RECOMMENDATION</span>' : ""}
          <div class="process-name">${proc.icon} ${proc.label}</div>
          <div class="process-subtitle">${proc.cost_model}</div>
        </div>
        <div class="process-chips">
          <div class="chip chip-red"><span class="chip-val">${criticals.length}</span><span class="chip-lbl">CRITICAL</span></div>
          <div class="chip chip-amber"><span class="chip-val">${warnings.length}</span><span class="chip-lbl">WARNINGS</span></div>
          <div class="chip chip-teal"><span class="chip-val">${proc.score}%</span><span class="chip-lbl">FIT SCORE</span></div>
        </div>
      </div>

      <!-- ① DFM Rules -->
      <div class="proc-section-title">① DFM Rules Checklist</div>
      <div style="padding:0 16px 12px">
        ${proc.rules.map(rule => `
          <div class="rule-row" style="border-left-color:${sevColor(rule.severity)};background:${sevBg(rule.severity)}">
            <div class="rule-header">
              <span class="sev-badge" style="color:${sevColor(rule.severity)};background:${sevBg(rule.severity)};border:1px solid ${sevColor(rule.severity)}44">${rule.severity.toUpperCase()}</span>
              <span class="rule-cat">${rule.category}</span>
              <span class="rule-title">${rule.title}</span>
            </div>
            <div class="rule-desc">${rule.desc}</div>
            <div class="rule-fix"><span class="fix-label">&#10003; Fix:</span> ${rule.fix}</div>
            <div class="rule-ref">&#128218; ${rule.ref}</div>
          </div>
        `).join("")}
      </div>

      <!-- ② Materials -->
      <div class="proc-section-title">② Compatible Materials</div>
      <div style="padding:0 16px 14px">
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
          ${proc.materials.map(m => `<span class="tag">${m}</span>`).join("")}
        </div>
        <div style="font-size:9px;color:#9aa5b4;margin-bottom:8px;font-style:italic">
          Full material property database (MatWeb / ASM Handbook / CAMPUS):
        </div>
        ${materialTableHTML}
      </div>

      <!-- ③ Cost & Lead Time -->
      <div class="proc-section-title">③ Cost &amp; Lead Time</div>
      <div style="padding:0 16px 14px">
        <div class="cost-grid">
          <div class="cost-card">
            <div class="cost-card-label">&#128295; TOOLING COST</div>
            <div class="cost-card-value">${proc.tooling_cost}</div>
            <div class="cost-card-detail">${proc.cost_model}</div>
          </div>
          <div class="cost-card">
            <div class="cost-card-label">&#128230; UNIT COST</div>
            <div class="cost-card-value">${proc.unit_cost}</div>
            <div class="cost-card-detail">At stated production volume</div>
          </div>
          <div class="cost-card">
            <div class="cost-card-label">&#9201; LEAD TIME</div>
            <div class="cost-card-value">${proc.lead_time}</div>
            <div class="cost-card-detail">From order to first article</div>
          </div>
          <div class="cost-card">
            <div class="cost-card-label">&#128200; VOLUME SWEET SPOT</div>
            <div class="cost-card-value">${proc.volume_fit.min.toLocaleString()}&#8211;${proc.volume_fit.ideal.toLocaleString()}+</div>
            <div class="cost-card-detail">Units/year for best economics</div>
          </div>
        </div>
        <div class="cost-note">
          <div style="font-size:9px;color:#9aa5b4;margin-bottom:4px;letter-spacing:.06em;text-transform:uppercase">Cost Model Basis</div>
          <div style="font-size:10px;color:#64748b;line-height:1.6">${proc.cost_model}</div>
          <div style="font-size:9px;color:#c0c8d4;margin-top:4px;font-style:italic">Sources: Ostwald Cost Analysis, Niazi et al. (2006), Bralla DFM Handbook, industry benchmarks</div>
        </div>
      </div>

      <!-- ④ Sustainability -->
      <div class="proc-section-title">④ Sustainability</div>
      <div style="padding:0 16px 16px">
        <div class="sust-grid">
          <div class="sust-card">
            <div class="sust-label">&#9889; ENERGY INTENSITY</div>
            <div class="sust-value">${proc.sustainability.energy_intensity}</div>
          </div>
          <div class="sust-card">
            <div class="sust-label">&#9851; RECYCLABILITY</div>
            <div class="sust-value">${proc.sustainability.recyclability}</div>
          </div>
          <div class="sust-card">
            <div class="sust-label">&#128260; END OF LIFE</div>
            <div class="sust-value">${proc.sustainability.eol}</div>
          </div>
          <div class="sust-card" style="text-align:center">
            <div class="sust-label">CO&#8322; RATING</div>
            <div style="font-size:32px;font-weight:800;color:${sg.color};line-height:1.1">${sg.grade}</div>
            <div style="font-size:9px;color:#9aa5b4;margin-top:2px">Index: ${proc.sustainability.co2_index} (relative)</div>
          </div>
        </div>
        <div class="cost-note" style="margin-top:10px">
          <div style="font-size:10px;color:#64748b;line-height:1.7">
            <span style="color:#1e8449;font-weight:600">&#10003; Ecodesign Directive (2009/125/EC)</span> — Consider energy in use phase, not just manufacture.<br/>
            <span style="color:#1e8449;font-weight:600">&#10003; RoHS / REACH</span> — Verify material declarations against restricted substance lists.<br/>
            <span style="color:#d68910;font-weight:600">&#9888; Ecoinvent v3</span> — Process-specific LCA data available for detailed environmental assessment.
          </div>
          <div style="font-size:9px;color:#c0c8d4;margin-top:4px;font-style:italic">Sources: Ecoinvent v3, GaBi LCA, ISO 14040/44, EU Ecodesign Regulation</div>
        </div>
      </div>

    </div>
    `;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>DFM Report — ${form.description || "Component"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter',sans-serif;background:#fff;color:#1a1a2e;font-size:11px;line-height:1.5}
    
    /* ── Cover Page ── */
    .cover{
      min-height:100vh;display:flex;flex-direction:column;
      background:linear-gradient(160deg,#0a0c0f 0%,#0d1420 50%,#091a2e 100%);
      color:#fff;padding:60px 64px;position:relative;overflow:hidden;
      page-break-after:always;
    }
    .cover::before{
      content:'';position:absolute;top:-200px;right:-200px;width:600px;height:600px;
      background:radial-gradient(circle,rgba(0,212,170,.12) 0%,transparent 70%);
    }
    .cover::after{
      content:'';position:absolute;bottom:-100px;left:-100px;width:400px;height:400px;
      background:radial-gradient(circle,rgba(0,102,255,.1) 0%,transparent 70%);
    }
    .cover-logo{display:flex;align-items:center;gap:12px;margin-bottom:auto}
    .cover-logo-box{
      width:36px;height:36px;background:linear-gradient(135deg,#00d4aa,#0066ff);
      border-radius:6px;display:flex;align-items:center;justify-content:center;
      font-size:18px;
    }
    .cover-logo-text{font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.12em;color:#00d4aa;font-weight:600}
    .cover-logo-ver{font-family:'JetBrains Mono',monospace;font-size:11px;color:#3d4a5c;margin-left:6px}
    .cover-main{flex:1;display:flex;flex-direction:column;justify-content:center;padding:60px 0 40px}
    .cover-tag{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;color:#00d4aa;margin-bottom:16px;text-transform:uppercase}
    .cover-title{font-size:42px;font-weight:800;line-height:1.1;letter-spacing:-.02em;margin-bottom:8px}
    .cover-title span{background:linear-gradient(135deg,#fff 50%,#00d4aa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
    .cover-subtitle{font-size:16px;color:#4a5568;margin-bottom:40px;font-weight:400}
    .cover-meta{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:500px}
    .cover-meta-item{padding:14px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px}
    .cover-meta-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:#3d4a5c;letter-spacing:.12em;margin-bottom:4px;text-transform:uppercase}
    .cover-meta-value{font-size:13px;color:#e8e6e1;font-weight:600}
    .cover-footer{display:flex;justify-content:space-between;align-items:center;padding-top:32px;border-top:1px solid rgba(255,255,255,.08)}
    .cover-footer-left{font-family:'JetBrains Mono',monospace;font-size:10px;color:#3d4a5c}
    .cover-footer-right{font-family:'JetBrains Mono',monospace;font-size:10px;color:#3d4a5c;text-align:right}
    .cover-process-summary{margin-top:32px}
    .cover-process-summary-title{font-family:'JetBrains Mono',monospace;font-size:9px;color:#3d4a5c;letter-spacing:.12em;margin-bottom:12px;text-transform:uppercase}
    .cover-proc-row{display:flex;justify-content:space-between;align-items:center;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.05)}
    .cover-proc-name{font-size:12px;color:#c8d0dc}
    .score-bar-wrap{display:flex;align-items:center;gap:10px}
    .score-bar{width:100px;height:4px;background:rgba(255,255,255,.08);border-radius:2px}
    .score-bar-fill{height:4px;border-radius:2px}
    .score-val{font-family:'JetBrains Mono',monospace;font-size:10px;min-width:32px;text-align:right}

    /* ── Content Pages ── */
    .page{padding:48px 56px;max-width:900px;margin:0 auto}
    @media print{
      .page{padding:32px 48px}
      .process-block{page-break-inside:avoid}
      .rule-row{page-break-inside:avoid}
    }

    .report-header{display:flex;justify-content:space-between;align-items:center;padding-bottom:18px;border-bottom:2px solid #0a0c0f;margin-bottom:32px}
    .report-header-left h2{font-size:20px;font-weight:800;letter-spacing:-.01em}
    .report-header-left p{font-size:11px;color:#6b7888;margin-top:3px}
    .report-header-right{font-family:'JetBrains Mono',monospace;font-size:10px;color:#9aa5b4;text-align:right}

    .section{margin-bottom:32px}
    .section-title{font-size:13px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#1a1a2e;margin-bottom:14px;display:flex;align-items:center;gap:10px;padding-bottom:7px;border-bottom:1px solid #e8ecf0}

    /* brief card */
    .brief-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
    .brief-item{padding:12px 14px;background:#f8fafc;border:1px solid #e8ecf0;border-radius:6px}
    .brief-item-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:#9aa5b4;letter-spacing:.1em;margin-bottom:4px;text-transform:uppercase}
    .brief-item-value{font-size:12px;font-weight:600;color:#1a1a2e}
    .brief-desc{padding:14px;background:#f8fafc;border:1px solid #e8ecf0;border-radius:6px;font-size:12px;color:#334155;line-height:1.6;grid-column:1/-1}

    /* process blocks */
    .process-block{border:1px solid #e8ecf0;border-radius:10px;overflow:hidden;margin-bottom:28px;break-inside:avoid}
    .process-top{border-color:#00b894;border-width:2px}
    .process-header{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 20px;background:#f8fafc;border-bottom:1px solid #e8ecf0}
    .process-title-group{flex:1}
    .top-badge{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.1em;color:#00b894;background:rgba(0,184,148,.1);border:1px solid rgba(0,184,148,.3);padding:2px 8px;border-radius:8px;margin-bottom:6px}
    .process-name{font-size:16px;font-weight:700;color:#1a1a2e}
    .process-subtitle{font-size:10px;color:#9aa5b4;margin-top:3px}
    .process-chips{display:flex;gap:12px;flex-shrink:0;margin-left:20px}
    .chip{text-align:center;padding:8px 14px;border-radius:6px;min-width:64px}
    .chip-red{background:#fff5f5;border:1px solid #fcd5d5}
    .chip-amber{background:#fffbeb;border:1px solid #fde68a}
    .chip-teal{background:#f0fdf9;border:1px solid #a7f3e4}
    .chip-val{display:block;font-size:18px;font-weight:800;line-height:1}
    .chip-red .chip-val{color:#c0392b}
    .chip-amber .chip-val{color:#d68910}
    .chip-teal .chip-val{color:#00b894}
    .chip-lbl{font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:.08em;color:#9aa5b4;margin-top:2px;display:block}

    .meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e8ecf0;border-bottom:1px solid #e8ecf0}
    .meta-item{padding:10px 14px;background:#fff}
    .meta-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:#9aa5b4;letter-spacing:.08em;text-transform:uppercase;margin-bottom:3px}
    .meta-value{font-size:11px;font-weight:600;color:#334155}

    .subsection-title{font-family:'JetBrains Mono',monospace;font-size:9px;color:#9aa5b4;letter-spacing:.12em;text-transform:uppercase;padding:12px 20px 6px;border-top:1px solid #f0f4f8}
    .rule-row{margin:0 20px 8px;padding:10px 12px;border-left:3px solid;border-radius:0 6px 6px 0}
    .rule-header{display:flex;align-items:center;gap:8px;margin-bottom:5px}
    .sev-badge{font-family:'JetBrains Mono',monospace;font-size:8px;padding:1px 7px;border-radius:8px;font-weight:600;letter-spacing:.06em;white-space:nowrap}
    .rule-cat{font-size:9px;color:#9aa5b4}
    .rule-title{font-size:11px;font-weight:700;color:#1a1a2e}
    .rule-desc{font-size:10px;color:#64748b;line-height:1.55;margin-bottom:5px}
    .rule-fix{font-size:10px;color:#334155;margin-bottom:3px}
    .fix-label{font-weight:700;color:#00b894}
    .rule-ref{font-family:'JetBrains Mono',monospace;font-size:9px;color:#9aa5b4}

    .tag-row{display:flex;flex-wrap:wrap;gap:6px;padding:10px 20px 14px}
    .tag-row-label{font-family:'JetBrains Mono',monospace;font-size:9px;color:#9aa5b4;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px}
    .tag{padding:4px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;font-size:10px;color:#334155;font-weight:500}
    .tag-teal{background:rgba(0,184,148,.08);border-color:rgba(0,184,148,.3);color:#00866a}

    /* AI section */
    .ai-card{background:#f8fffd;border:1px solid rgba(0,184,148,.25);border-radius:8px;padding:16px}
    .ai-file-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
    .ai-icon{font-size:22px}
    .ai-filename{font-size:12px;font-weight:600;color:#1a1a2e}
    .ai-filetype{font-size:10px;color:#9aa5b4}
    .ai-description{font-size:11px;color:#334155;line-height:1.6;margin-bottom:8px}
    .obs-row{font-size:10px;color:#64748b;line-height:1.6;margin-bottom:3px}
    .caveat{font-size:10px;color:#9aa5b4;font-style:italic;margin-top:8px}
    .conf-badge{font-family:'JetBrains Mono',monospace;font-size:9px;padding:2px 8px;border-radius:8px;font-weight:600;letter-spacing:.06em}
    .conf-high{background:rgba(0,184,148,.12);color:#00866a}
    .conf-medium{background:rgba(214,137,16,.12);color:#d68910}
    .conf-low{background:rgba(192,57,43,.12);color:#c0392b}

    /* process ranking table */
    .rank-table{width:100%;border-collapse:collapse;font-size:11px}
    .rank-table th{background:#f1f5f9;padding:8px 12px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:9px;color:#9aa5b4;letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid #e2e8f0}
    .rank-table td{padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle}
    .rank-table tr:last-child td{border-bottom:none}
    .rank-num{font-weight:700;color:#9aa5b4;width:28px}
    .score-pill{display:inline-block;padding:2px 9px;border-radius:10px;font-weight:700;font-size:10px}

    /* footer */
    .report-footer{margin-top:48px;padding-top:16px;border-top:1px solid #e8ecf0;display:flex;justify-content:space-between;align-items:center}
    .footer-brand{font-family:'JetBrains Mono',monospace;font-size:9px;color:#c0c8d4;letter-spacing:.1em}
    .footer-page{font-family:'JetBrains Mono',monospace;font-size:9px;color:#c0c8d4}
    .disclaimer{margin-top:8px;font-size:9px;color:#c0c8d4;line-height:1.5;font-style:italic}

    /* ── Process section titles ── */
    .proc-section-title{font-family:'JetBrains Mono',monospace;font-size:10px;color:#334155;letter-spacing:.1em;text-transform:uppercase;padding:12px 16px 8px;background:#f8fafc;border-top:1px solid #e8ecf0;border-bottom:1px solid #e8ecf0;font-weight:600}

    /* ── Material table ── */
    .mat-table{width:100%;border-collapse:collapse;font-size:10px}
    .mat-table th{background:#f1f5f9;padding:6px 8px;text-align:left;font-family:'JetBrains Mono',monospace;font-size:8px;color:#9aa5b4;letter-spacing:.06em;text-transform:uppercase;border-bottom:1px solid #e2e8f0;white-space:nowrap}
    .mat-table td{padding:7px 8px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle}
    .mat-table tr:last-child td{border-bottom:none}
    .mat-table tr:hover td{background:#fafbfc}

    /* ── Cost & Lead Time ── */
    .cost-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px}
    .cost-card{padding:12px 14px;border:1px solid #e8ecf0;border-radius:6px;background:#fafbfc}
    .cost-card-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:#9aa5b4;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
    .cost-card-value{font-size:16px;font-weight:700;color:#1a1a2e;margin-bottom:4px}
    .cost-card-detail{font-size:9px;color:#64748b;line-height:1.5}
    .cost-note{padding:12px 14px;background:#f8fafc;border:1px solid #e8ecf0;border-radius:6px}

    /* ── Sustainability ── */
    .sust-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .sust-card{padding:12px 14px;border:1px solid #e8ecf0;border-radius:6px;background:#fafbfc}
    .sust-label{font-family:'JetBrains Mono',monospace;font-size:8px;color:#9aa5b4;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
    .sust-value{font-size:12px;font-weight:600;color:#1a1a2e;line-height:1.4}

    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .cover{min-height:100vh}
      .no-print{display:none}
      .process-block{page-break-inside:avoid}
      .mat-table{font-size:8px}
      .cost-grid{grid-template-columns:repeat(4,1fr)}
      .sust-grid{grid-template-columns:repeat(4,1fr)}
    }
  </style>
</head>
<body>

<!-- ══ COVER PAGE ══ -->
<div class="cover">
  <div class="cover-logo">
    <div class="cover-logo-box">⬡</div>
    <span class="cover-logo-text">DFM CONCEPT ADVISOR</span>
    <span class="cover-logo-ver">v1.1</span>
  </div>

  <div class="cover-main">
    <div class="cover-tag">Design for Manufacturing Report</div>
    <h1 class="cover-title"><span>${form.description || "Component DFM Analysis"}</span></h1>
    <p class="cover-subtitle">${form.sector ? form.sector + " Sector" : "Manufacturing Analysis"} · Concept Stage Assessment</p>

    <div class="cover-meta">
      <div class="cover-meta-item">
        <div class="cover-meta-label">Sector</div>
        <div class="cover-meta-value">${form.sector || "Not specified"}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Production Volume</div>
        <div class="cover-meta-value">${volumeLabel}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Material Family</div>
        <div class="cover-meta-value">${form.materialFamily || "Not specified"}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Processes Evaluated</div>
        <div class="cover-meta-value">${results.length} processes</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Tolerance Class</div>
        <div class="cover-meta-value">${ISO_TOLERANCE_CLASSES.flatMap(g=>g.options).find(o=>o.value===form.toleranceClass)?.label || form.toleranceClass}</div>
      </div>
      <div class="cover-meta-item">
        <div class="cover-meta-label">Geometry Complexity</div>
        <div class="cover-meta-value">${form.complexity || "Medium"}</div>
      </div>
    </div>

    <div class="cover-process-summary">
      <div class="cover-process-summary-title">Process Ranking Summary</div>
      ${results.map((p, i) => {
        const scoreColor = p.score >= 70 ? "#00d4aa" : p.score >= 40 ? "#ffa502" : "#ff4757";
        const barWidth = Math.round(p.score);
        return `
          <div class="cover-proc-row">
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#3d4a5c;margin-right:10px">#${i+1}</span>
            <span class="cover-proc-name" style="flex:1">${p.icon} ${p.label}</span>
            <div class="score-bar-wrap">
              <div class="score-bar"><div class="score-bar-fill" style="width:${barWidth}%;background:${scoreColor}"></div></div>
              <span class="score-val" style="color:${scoreColor}">${p.score}%</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-footer-left">Generated ${dateStr} at ${timeStr}</div>
    <div class="cover-footer-right">DFM Concept Advisor · AI-Assisted Engineering Tool<br/>For concept-stage guidance only — not a substitute for detailed engineering review</div>
  </div>
</div>

<!-- ══ CONTENT PAGES ══ -->
<div class="page">

  <div class="report-header">
    <div class="report-header-left">
      <h2>DFM Analysis Report</h2>
      <p>${form.description || "Component"} · ${form.sector || "General Manufacturing"}</p>
    </div>
    <div class="report-header-right">
      <div style="font-size:13px;font-weight:700;color:#00b894">DFM CONCEPT ADVISOR</div>
      <div>${dateStr} · ${timeStr}</div>
    </div>
  </div>

  <!-- Design Brief -->
  <div class="section">
    <div class="section-title">Design Brief</div>
    <div class="brief-grid">
      <div class="brief-item" style="grid-column:1/-1">
        <div class="brief-item-label">Part Description</div>
        <div class="brief-item-value" style="font-weight:400;font-size:12px;color:#334155;line-height:1.6">${form.description || "No description provided"}</div>
      </div>
      <div class="brief-item"><div class="brief-item-label">Sector</div><div class="brief-item-value">${form.sector || "—"}</div></div>
      <div class="brief-item"><div class="brief-item-label">Material Family</div><div class="brief-item-value">${form.materialFamily || "—"}</div></div>
      <div class="brief-item"><div class="brief-item-label">Volume Band</div><div class="brief-item-value">${volumeLabel}</div></div>
      <div class="brief-item"><div class="brief-item-label">Tolerance Class</div><div class="brief-item-value">${ISO_TOLERANCE_CLASSES.flatMap(g=>g.options).find(o=>o.value===form.toleranceClass)?.label || form.toleranceClass}</div></div>
      <div class="brief-item"><div class="brief-item-label">Complexity</div><div class="brief-item-value">${form.complexity}</div></div>
      <div class="brief-item"><div class="brief-item-label">Processes Evaluated</div><div class="brief-item-value">${results.length}</div></div>
    </div>
  </div>

  <!-- AI Analysis -->
  ${aiSection}

  <!-- Process Ranking Table -->
  <div class="section">
    <div class="section-title">Process Ranking Overview</div>
    <table class="rank-table">
      <thead>
        <tr>
          <th>#</th><th>Process</th><th>Fit Score</th><th>Tooling</th><th>Unit Cost</th><th>Lead Time</th><th>Critical Rules</th>
        </tr>
      </thead>
      <tbody>
        ${results.map((p, i) => {
          const sc = p.score >= 70 ? "#00b894" : p.score >= 40 ? "#d68910" : "#c0392b";
          const scBg = p.score >= 70 ? "rgba(0,184,148,.1)" : p.score >= 40 ? "rgba(214,137,16,.1)" : "rgba(192,57,43,.1)";
          return `
            <tr ${i === 0 ? 'style="background:#f0fdf9"' : ""}>
              <td class="rank-num">${i+1}</td>
              <td style="font-weight:600;color:#1a1a2e">${p.icon} ${p.label}</td>
              <td><span class="score-pill" style="color:${sc};background:${scBg}">${p.score}%</span></td>
              <td>${p.tooling_cost}</td>
              <td>${p.unit_cost}</td>
              <td style="white-space:nowrap">${p.lead_time}</td>
              <td style="font-weight:700;color:#c0392b">${p.rules.filter(r=>r.severity==="critical").length}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  </div>

  <!-- Detailed Process Reports -->
  <div class="section">
    <div class="section-title">Detailed Process Reports</div>
    ${processesHTML}
  </div>

  <!-- Footer -->
  <div class="report-footer">
    <div class="footer-brand">⬡ DFM CONCEPT ADVISOR · v1.1</div>
    <div class="footer-page">Generated ${dateStr}</div>
  </div>
  <p class="disclaimer">This report is generated by an AI-assisted tool for concept-stage design guidance. All recommendations should be verified by a qualified manufacturing engineer before production decisions are made. DFM rules sourced from Boothroyd & Dewhurst, NADCA, ASM Handbook, ISO, ASME, and industry standards. Cost estimates are indicative benchmarks only.</p>
</div>

  <!-- Print button -->
  <div class="no-print" style="position:fixed;bottom:28px;right:28px;z-index:999;">
    <button onclick="window.print()" style="padding:12px 24px;background:linear-gradient(135deg,#00b894,#0066ff);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;letter-spacing:.04em;box-shadow:0 4px 20px rgba(0,184,148,.35);">
      Save as PDF
    </button>
    <div style="font-size:10px;color:#9aa5b4;text-align:center;margin-top:6px;font-family:Inter,sans-serif;">Open in browser → Save as PDF</div>
  </div>
</body>
</html>`;

  // Create a Blob and trigger direct download — works in sandboxed iframes
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (form.description || "component").replace(/[^a-z0-9]/gi, "_").toLowerCase().slice(0, 40);
  a.download = `DFM_Report_${safeName}_${now.toISOString().slice(0,10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}


// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ description: "", sector: "", materialFamily: "", volume: "", processes: [], toleranceClass: "2768-m", complexity: "medium" });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [results, setResults] = useState(null);
  const [activeProcess, setActiveProcess] = useState(null);
  const [expandedRule, setExpandedRule] = useState(null);
  const [chat, setChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);
  const updateForm = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleProcess = (key) => setForm(p => ({ ...p, processes: p.processes.includes(key) ? p.processes.filter(x => x !== key) : [...p.processes, key] }));

  async function handleFileSelect(file) {
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    const isImage = SUPPORTED_IMAGE.includes(ext);
    const is3D = SUPPORTED_3D.includes(ext);
    if (!isImage && !is3D) { alert("Unsupported file. Please upload an image (JPG, PNG, WebP) or 3D model (STL, OBJ, STEP, IGES)."); return; }

    setUploadedFile({ type: isImage ? "image" : "model", file, preview: null, base64: null, mediaType: null, meta: null, aiAnalysis: null, analyzing: true });

    if (isImage) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        const base64 = dataUrl.split(",")[1];
        const mediaType = file.type || "image/jpeg";
        setUploadedFile(p => ({ ...p, preview: dataUrl, base64, mediaType }));
        await analyzeImageWithAI(base64, mediaType, file.name);
      };
      reader.readAsDataURL(file);
    } else {
      const meta = await parse3DModelMeta(file);
      setUploadedFile(p => ({ ...p, meta }));
      await analyze3DWithAI(meta, file.name);
    }
  }

  async function analyzeImageWithAI(base64, mediaType, fileName) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are a senior DFM engineer analyzing a component image. Extract manufacturing-relevant information. Respond ONLY with valid JSON, no markdown fences, no preamble:
{"partDescription":"string","estimatedGeometry":"prismatic|rotational|sheet|freeform|complex","visibleFeatures":["array"],"suggestedMaterialFamily":"metal|thermoplastic|composite|elastomer","likelySuggestedMaterials":["array"],"estimatedComplexity":"simple|medium|complex|very_complex","probableProcesses":["ranked array"],"dfmObservations":["array of specific DFM concerns"],"confidenceLevel":"low|medium|high","caveats":"string"}`,
          messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: `Analyze this engineering component for DFM. File: ${fileName}` }] }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "{}";
      let analysis;
      try { analysis = JSON.parse(raw); } catch { try { analysis = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { analysis = { partDescription: "Image received — AI parsing error", confidenceLevel: "low" }; } }
      setUploadedFile(p => ({ ...p, aiAnalysis: analysis, analyzing: false }));
      if (analysis.partDescription && !form.description) updateForm("description", analysis.partDescription);
      if (analysis.suggestedMaterialFamily && !form.materialFamily) updateForm("materialFamily", analysis.suggestedMaterialFamily);
      if (analysis.estimatedComplexity) updateForm("complexity", analysis.estimatedComplexity);
    } catch {
      setUploadedFile(p => ({ ...p, analyzing: false, aiAnalysis: { partDescription: "Connection error during image analysis.", confidenceLevel: "low" } }));
    }
  }

  async function analyze3DWithAI(meta, fileName) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are a senior DFM engineer. Analyse 3D model metadata and infer manufacturing characteristics. Respond ONLY with valid JSON, no markdown:
{"partDescription":"string","estimatedGeometry":"prismatic|rotational|sheet|freeform|complex","estimatedComplexity":"simple|medium|complex|very_complex","suggestedMaterialFamily":"metal|thermoplastic|composite","probableProcesses":["ranked array"],"dfmObservations":["inferred observations"],"sizeCategory":"miniature|small|medium|large","confidenceLevel":"low|medium|high","caveats":"string"}`,
          messages: [{ role: "user", content: `Analyse this 3D model metadata for DFM:\n${JSON.stringify(meta, null, 2)}\nFile: ${fileName}` }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "{}";
      let analysis;
      try { analysis = JSON.parse(raw); } catch { try { analysis = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { analysis = { partDescription: "3D metadata parsed — AI analysis error", confidenceLevel: "low" }; } }
      setUploadedFile(p => ({ ...p, aiAnalysis: analysis, analyzing: false }));
      if (analysis.partDescription && !form.description) updateForm("description", analysis.partDescription);
      if (analysis.suggestedMaterialFamily && !form.materialFamily) updateForm("materialFamily", analysis.suggestedMaterialFamily);
    } catch {
      setUploadedFile(p => ({ ...p, analyzing: false, aiAnalysis: { partDescription: "Connection error during 3D analysis.", confidenceLevel: "low" } }));
    }
  }

  function runAnalysis() {
    setIsAnalyzing(true);
    setTimeout(() => {
      const selectedProcs = form.processes.length > 0 ? form.processes : Object.keys(PROCESSES);
      const scored = selectedProcs.map(k => ({ key: k, score: getProcessScore(k, form.volume, form.materialFamily), ...PROCESSES[k] })).sort((a, b) => b.score - a.score);
      setResults(scored); setActiveProcess(scored[0]?.key); setIsAnalyzing(false); setStep(2);
      const uploadNote = uploadedFile?.aiAnalysis ? `\n\n📎 ${uploadedFile.type === "image" ? "Image" : "3D model"} analysed (${uploadedFile.aiAnalysis.confidenceLevel} confidence). Key insight: ${uploadedFile.aiAnalysis.dfmObservations?.[0] || uploadedFile.aiAnalysis.partDescription}` : "";
      setChat([{ role: "assistant", text: `Analysis complete. Evaluated ${scored.length} processes for your ${form.sector || "engineering"} design.\n\nTop recommendation: **${scored[0]?.label}** (${scored[0]?.score}% fit). ${scored[0]?.rules.filter(r => r.severity === "critical").length} critical DFM rules require attention.${uploadNote}\n\nAsk me anything about processes, design rules, materials or tolerances.` }]);
    }, 1600);
  }

  async function sendChat() {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim(); setChatInput("");
    setChat(p => [...p, { role: "user", text: userMsg }]); setIsChatLoading(true);
    const ctx = results ? `Part: ${form.description || "unspecified"}. Sector: ${form.sector}. Volume: ${form.volume}. Material: ${form.materialFamily}. Top process: ${results[0]?.label} (${results[0]?.score}%). Flags: ${results[0]?.rules.filter(r => r.severity === "critical").map(r => r.title).join(", ")}.` : "";
    const uploadCtx = uploadedFile?.aiAnalysis ? ` Upload (${uploadedFile.type}): ${uploadedFile.aiAnalysis.partDescription}. Features: ${(uploadedFile.aiAnalysis.visibleFeatures || []).join(", ")}. Observations: ${(uploadedFile.aiAnalysis.dfmObservations || []).join("; ")}.` : "";
    const apiMessages = (uploadedFile?.type === "image" && uploadedFile?.base64)
      ? [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: uploadedFile.mediaType || "image/jpeg", data: uploadedFile.base64 } }, { type: "text", text: `Context: ${ctx}${uploadCtx}\n\nQuestion: ${userMsg}` }] }]
      : [{ role: "user", content: `Context: ${ctx}${uploadCtx}\n\nQuestion: ${userMsg}` }];
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: "You are a senior manufacturing engineer and DFM expert. Be specific, cite real standards (ASME, ISO, ASM Handbook, NADCA). Use **bold** for key points. Be concise but technically precise.", messages: apiMessages }),
      });
      const data = await res.json();
      setChat(p => [...p, { role: "assistant", text: data.content?.[0]?.text || "Sorry, try again." }]);
    } catch { setChat(p => [...p, { role: "assistant", text: "Connection error." }]); }
    setIsChatLoading(false);
  }

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files?.[0]); }, []);
  const activeProc = results?.find(r => r.key === activeProcess);

  function handleExportPDF() {
    if (!results) return;
    generatePDFReport({ form, results, uploadedFile, VOLUME_BANDS, PROCESSES });
  }

  function handleReset() {
    setStep(0);
    setForm({ description: "", sector: "", materialFamily: "", volume: "", processes: [], toleranceClass: "2768-m", complexity: "medium" });
    setResults(null);
    setActiveProcess(null);
    setExpandedRule(null);
    setChat([]);
    setChatInput("");
    setUploadedFile(null);
    setIsAnalyzing(false);
    setIsChatLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e8e6e1", fontFamily: "'IBM Plex Mono','Courier New',monospace", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;600;800&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0a0c0f}::-webkit-scrollbar-thumb{background:#1e2530;border-radius:2px}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .hz:hover{border-color:#2a3a4a!important}
        .rr:hover{background:rgba(255,255,255,.02)!important}
        .uz:hover{border-color:#00d4aa!important;background:rgba(0,212,170,.04)!important}
      `}</style>

      {/* Header */}
      <header style={{ borderBottom: "1px solid #1e2530", padding: "0 32px", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0d1117", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "28px", height: "28px", background: "linear-gradient(135deg,#00d4aa,#0066ff)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>⬡</div>
          <span style={{ fontSize: "14px", letterSpacing: "0.12em", color: "#00d4aa", fontWeight: "600" }}>DFM CONCEPT ADVISOR</span>
          <span style={{ fontSize: "11px", color: "#3d4a5c" }}>/ v1.1</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ display: "flex", gap: "20px", fontSize: "11px", letterSpacing: "0.1em" }}>
            {["01 BRIEF", "02 PROCESS", "03 ANALYSIS"].map((s, i) => (
              <span key={s} style={{ color: step >= i ? "#00d4aa" : "#3d4a5c" }}>{s}</span>
            ))}
          </div>
          {step === 2 && results && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button onClick={handleReset} title="Clear everything and start a new analysis" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: "transparent", color: "#c8d0dc", border: "1px solid #2a3440", borderRadius: "5px", fontSize: "11px", fontWeight: "600", letterSpacing: "0.08em", cursor: "pointer", fontFamily: "inherit", transition: "all .2s", flexShrink: 0 }}>
                ↺ NEW ANALYSIS
              </button>
              <button onClick={handleExportPDF} title="Downloads an HTML report — open in browser and use Print → Save as PDF" style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 16px", background: "linear-gradient(135deg,#00d4aa,#0066ff)", color: "#000", border: "none", borderRadius: "5px", fontSize: "11px", fontWeight: "700", letterSpacing: "0.08em", cursor: "pointer", fontFamily: "inherit", transition: "all .2s", flexShrink: 0 }}>
                <span style={{fontSize:"13px"}}>↓</span> EXPORT REPORT
              </button>
            </div>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", height: "calc(100vh - 56px)" }}>

        {/* Left Panel */}
        <div style={{ width: step === 2 ? "340px" : "100%", maxWidth: step === 2 ? "340px" : "700px", margin: step === 2 ? "0" : "auto", padding: "32px", borderRight: step === 2 ? "1px solid #1e2530" : "none", overflow: "auto", transition: "all .4s ease", flexShrink: 0 }}>

          {step < 2 && (
            <div style={{ marginBottom: "28px" }}>
              <h1 style={{ fontSize: step === 0 ? "36px" : "26px", lineHeight: 1.1, fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: "800", letterSpacing: "-.02em", marginBottom: "10px", background: "linear-gradient(135deg,#fff 60%,#00d4aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {step === 0 ? "What are you designing?" : "Select processes to evaluate"}
              </h1>
              <p style={{ fontSize: "12px", color: "#4a5568", lineHeight: 1.6 }}>
                {step === 0 ? "Describe your part and optionally upload a component image or 3D model for AI-powered DFM insights." : "Select processes to compare, or leave all unselected for a full analysis."}
              </p>
            </div>
          )}

          {step === 2 && (
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: "0.12em", marginBottom: "6px" }}>DESIGN BRIEF</div>
              <div style={{ fontSize: "11px", color: "#6b7888", lineHeight: 1.5, marginBottom: "10px" }}>{form.description || "No description"}</div>
              {uploadedFile && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", background: "rgba(0,212,170,.08)", border: "1px solid rgba(0,212,170,.2)", borderRadius: "4px", marginBottom: "10px" }}>
                  <span>{uploadedFile.type === "image" ? "🖼" : "📐"}</span>
                  <span style={{ fontSize: "10px", color: "#00d4aa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{uploadedFile.file.name}</span>
                  <span style={{ fontSize: "9px", color: "#3d4a5c", background: "rgba(0,212,170,.15)", padding: "1px 6px", borderRadius: "8px" }}>{uploadedFile.aiAnalysis?.confidenceLevel} conf.</span>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "12px" }}>
                {form.sector && <Tag>{form.sector}</Tag>}
                {form.volume && <Tag>{VOLUME_BANDS.find(v => v.value === form.volume)?.label}</Tag>}
                {form.materialFamily && <Tag>{form.materialFamily}</Tag>}
              </div>
              <button onClick={handleReset} style={{ fontSize: "11px", color: "#3d4a5c", background: "none", border: "1px solid #1e2530", borderRadius: "4px", padding: "6px 12px", cursor: "pointer", letterSpacing: "0.08em" }}>↺ RESET ALL</button>
            </div>
          )}

          {/* STEP 0 */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* ── Upload Zone ── */}
              <div>
                <div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: "0.12em", marginBottom: "8px" }}>
                  COMPONENT UPLOAD <span style={{ color: "#2a3340", textTransform: "none", letterSpacing: "normal", fontSize: "10px" }}>— optional · AI-powered analysis</span>
                </div>

                {!uploadedFile ? (
                  <div className="uz" onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${dragOver ? "#00d4aa" : "#1e2530"}`, borderRadius: "10px", padding: "28px 20px", textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(0,212,170,.04)" : "#0d1117", transition: "all .2s" }}>
                    <div style={{ fontSize: "30px", marginBottom: "10px", color: "#2a3a4a" }}>↑</div>
                    <div style={{ fontSize: "13px", color: "#6b7888", marginBottom: "6px", fontFamily: "'IBM Plex Sans',sans-serif", fontWeight: "600" }}>Drop your file here or click to browse</div>
                    <div style={{ fontSize: "11px", color: "#3d4a5c", marginBottom: "16px" }}>AI will extract geometry, features and DFM signals</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
                      <FormatBadge icon="🖼" label="Component Images" formats="JPG · PNG · WebP · BMP" />
                      <FormatBadge icon="📐" label="3D Models" formats="STL · OBJ · STEP · IGES" />
                    </div>
                    <input ref={fileInputRef} type="file" style={{ display: "none" }} accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.stl,.obj,.step,.stp,.iges,.igs" onChange={e => handleFileSelect(e.target.files?.[0])} />
                  </div>
                ) : (
                  <UploadedFileCard uf={uploadedFile} onRemove={() => setUploadedFile(null)} />
                )}
              </div>

              <FormGroup label="PART DESCRIPTION" hint="geometry, function, key features">
                <textarea value={form.description} onChange={e => updateForm("description", e.target.value)} placeholder="e.g. Structural bracket for motor mount. Roughly 150×80×40mm, requires M6 tapped holes and a slot for cable routing. Must withstand 500N load..." style={{ ...inputStyle, height: "88px", resize: "vertical" }} />
              </FormGroup>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <FormGroup label="SECTOR">
                  <select value={form.sector} onChange={e => updateForm("sector", e.target.value)} style={inputStyle}>
                    <option value="">Select sector</option>
                    {SECTORS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="MATERIAL FAMILY">
                  <select value={form.materialFamily} onChange={e => updateForm("materialFamily", e.target.value)} style={inputStyle}>
                    <option value="">Not specified</option>
                    <option value="metal">Metals</option>
                    <option value="thermoplastic">Thermoplastics</option>
                    <option value="thermoset">Thermosets</option>
                    <option value="composite">Composites</option>
                    <option value="elastomer">Elastomers</option>
                  </select>
                </FormGroup>
              </div>

              <FormGroup label="PRODUCTION VOLUME">
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {VOLUME_BANDS.map(v => (
                    <label key={v.value} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", border: `1px solid ${form.volume === v.value ? "#00d4aa" : "#1e2530"}`, borderRadius: "6px", cursor: "pointer", background: form.volume === v.value ? "rgba(0,212,170,.06)" : "transparent", transition: "all .15s" }}>
                      <input type="radio" name="vol" value={v.value} checked={form.volume === v.value} onChange={() => updateForm("volume", v.value)} style={{ accentColor: "#00d4aa" }} />
                      <span style={{ fontSize: "12px", letterSpacing: "0.04em" }}>{v.label}</span>
                    </label>
                  ))}
                </div>
              </FormGroup>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <ToleranceSelector value={form.toleranceClass} onChange={v => updateForm("toleranceClass", v)} />
                <FormGroup label="GEOMETRIC COMPLEXITY">
                  <select value={form.complexity} onChange={e => updateForm("complexity", e.target.value)} style={inputStyle}>
                    <option value="simple">Simple (2D-ish)</option>
                    <option value="medium">Medium (3D features)</option>
                    <option value="complex">Complex (undercuts)</option>
                    <option value="very_complex">Very Complex (organic)</option>
                  </select>
                </FormGroup>
              </div>

              <button onClick={() => setStep(1)} disabled={!form.volume} style={{ padding: "14px", background: form.volume ? "linear-gradient(135deg,#00d4aa,#0066ff)" : "#1e2530", color: form.volume ? "#000" : "#3d4a5c", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", cursor: form.volume ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all .2s" }}>
                NEXT: SELECT PROCESSES →
              </button>
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px" }}>
                {Object.entries(PROCESSES).map(([key, proc]) => {
                  const sel = form.processes.includes(key);
                  const score = getProcessScore(key, form.volume, form.materialFamily);
                  const aiSug = uploadedFile?.aiAnalysis?.probableProcesses?.some(p => p.toLowerCase().includes(proc.label.toLowerCase().split(" ")[0]));
                  return (
                    <div key={key} className="hz" onClick={() => toggleProcess(key)} style={{ padding: "13px", border: `1px solid ${sel ? "#00d4aa" : aiSug ? "rgba(0,212,170,.3)" : "#1e2530"}`, borderRadius: "8px", cursor: "pointer", background: sel ? "rgba(0,212,170,.06)" : "#0d1117", transition: "all .15s", position: "relative" }}>
                      {aiSug && !sel && <div style={{ position: "absolute", top: "5px", right: "6px", fontSize: "8px", color: "#00d4aa", background: "rgba(0,212,170,.15)", padding: "1px 6px", borderRadius: "8px" }}>AI ◈</div>}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "18px" }}>{proc.icon}</span>
                        <ScoreBadge score={score} />
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "2px" }}>{proc.label}</div>
                      <div style={{ fontSize: "10px", color: "#3d4a5c" }}>Tooling: {proc.tooling_cost}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep(0)} style={secondaryBtn}>← BACK</button>
                <button onClick={runAnalysis} style={{ flex: 1, padding: "14px", background: "linear-gradient(135deg,#00d4aa,#0066ff)", color: "#000", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", cursor: "pointer", fontFamily: "inherit" }}>
                  {isAnalyzing ? "ANALYSING..." : "RUN DFM ANALYSIS →"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 LEFT */}
          {step === 2 && results && (
            <div>
              <div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: "0.12em", marginBottom: "10px" }}>PROCESS RANKING</div>
              {results.map((proc, i) => (
                <div key={proc.key} onClick={() => setActiveProcess(proc.key)} style={{ padding: "12px 13px", marginBottom: "6px", border: `1px solid ${activeProcess === proc.key ? "#00d4aa" : "#1e2530"}`, borderRadius: "6px", cursor: "pointer", background: activeProcess === proc.key ? "rgba(0,212,170,.06)" : "transparent", transition: "all .15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#3d4a5c" }}>#{i + 1}</span>
                      <span>{proc.icon}</span>
                      <span style={{ fontSize: "12px", fontWeight: "600" }}>{proc.label}</span>
                    </div>
                    <ScoreBadge score={proc.score} />
                  </div>
                  <div style={{ marginTop: "6px", display: "flex", gap: "5px" }}>
                    <MiniTag>⏱ {proc.lead_time}</MiniTag>
                    <MiniTag color={proc.tooling_cost === "Very High" ? "rgba(255,71,87,.2)" : proc.tooling_cost === "High" ? "rgba(255,165,2,.2)" : "rgba(46,213,115,.2)"}>🔧 {proc.tooling_cost}</MiniTag>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        {step === 2 && activeProc && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <ResultsPanel proc={activeProc} expandedRule={expandedRule} setExpandedRule={setExpandedRule} form={form} uploadedFile={uploadedFile} />
            {/* Chat */}
            <div style={{ borderTop: "1px solid #1e2530", background: "#0d1117", display: "flex", flexDirection: "column", height: "250px", flexShrink: 0 }}>
              <div style={{ padding: "7px 16px", fontSize: "10px", color: "#3d4a5c", letterSpacing: "0.1em", borderBottom: "1px solid #1a1f28", display: "flex", alignItems: "center", gap: "8px" }}>
                ◈ DFM AI ASSISTANT
                {uploadedFile && <span style={{ fontSize: "9px", color: "rgba(0,212,170,.6)" }}>— {uploadedFile.type === "image" ? "🖼 image" : "📐 3D model"} context active</span>}
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px", display: "flex", flexDirection: "column", gap: "7px" }}>
                {chat.map((msg, i) => (
                  <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start", animation: "fadeUp .2s ease" }}>
                    <span style={{ fontSize: "10px", color: msg.role === "assistant" ? "#00d4aa" : "#6b7888", flexShrink: 0, paddingTop: "2px" }}>{msg.role === "assistant" ? "AI>" : "YOU>"}</span>
                    <span style={{ fontSize: "12px", lineHeight: 1.55, color: msg.role === "assistant" ? "#c8d0dc" : "#8899aa", whiteSpace: "pre-wrap" }}>{msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                  </div>
                ))}
                {isChatLoading && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <span style={{ fontSize: "10px", color: "#00d4aa" }}>AI></span>
                    <span style={{ fontSize: "12px", color: "#3d4a5c", animation: "pulse 1.2s infinite" }}>thinking...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div style={{ padding: "8px 12px", display: "flex", gap: "8px", borderTop: "1px solid #1a1f28" }}>
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChat()} placeholder="Ask about processes, rules, materials, tolerances — or your uploaded component..." style={{ flex: 1, background: "#0a0c0f", border: "1px solid #1e2530", borderRadius: "4px", color: "#e8e6e1", padding: "8px 12px", fontSize: "12px", fontFamily: "inherit", outline: "none" }} />
                <button onClick={sendChat} disabled={isChatLoading} style={{ padding: "8px 16px", background: "#00d4aa", color: "#000", border: "none", borderRadius: "4px", fontSize: "11px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>SEND</button>
              </div>
            </div>
          </div>
        )}

        {isAnalyzing && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(10,12,15,.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
            <div style={{ fontSize: "40px", marginBottom: "16px", animation: "spin 2s linear infinite" }}>⬡</div>
            <div style={{ fontSize: "13px", color: "#00d4aa", letterSpacing: "0.12em", marginBottom: "8px" }}>RUNNING DFM ANALYSIS</div>
            <div style={{ fontSize: "11px", color: "#3d4a5c" }}>Evaluating {Object.keys(PROCESSES).length} process rule sets{uploadedFile ? ` · integrating ${uploadedFile.type} data` : ""}...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Uploaded File Card ───────────────────────────────────────────────────────
function UploadedFileCard({ uf, onRemove }) {
  const { type, file, preview, meta, aiAnalysis, analyzing } = uf;
  return (
    <div style={{ border: "1px solid #1e2530", borderRadius: "10px", overflow: "hidden", background: "#0d1117", animation: "fadeUp .3s ease" }}>
      {/* Card header */}
      <div style={{ padding: "9px 14px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid #1a1f28", background: "rgba(0,212,170,.04)" }}>
        <span style={{ fontSize: "15px" }}>{type === "image" ? "🖼" : "📐"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "12px", fontWeight: "600", color: "#c8d0dc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
          <div style={{ fontSize: "10px", color: "#3d4a5c" }}>{(file.size / 1024).toFixed(1)} KB · {type === "image" ? "Component Image" : "3D Model"}</div>
        </div>
        {analyzing
          ? <div style={{ fontSize: "9px", color: "#ffa502", animation: "pulse 1s infinite", letterSpacing: ".08em" }}>ANALYSING...</div>
          : <div style={{ fontSize: "9px", color: "#00d4aa", letterSpacing: ".08em" }}>✓ ANALYSED</div>}
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#3d4a5c", cursor: "pointer", fontSize: "14px", padding: "2px 6px" }}>✕</button>
      </div>

      <div style={{ display: "flex" }}>
        {/* Left: preview or metadata */}
        <div style={{ width: "130px", flexShrink: 0, borderRight: "1px solid #1a1f28" }}>
          {type === "image" && preview ? (
            <img src={preview} alt="Component preview" style={{ width: "100%", height: "120px", objectFit: "cover", display: "block" }} />
          ) : type === "model" && meta ? (
            <div style={{ padding: "10px", height: "120px", overflow: "auto" }}>
              <div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: ".08em", marginBottom: "6px" }}>MODEL META</div>
              {Object.entries(meta).filter(([k]) => !["fileName"].includes(k)).slice(0, 6).map(([k, v]) => (
                <div key={k} style={{ marginBottom: "5px" }}>
                  <div style={{ fontSize: "8px", color: "#2a3a4a", textTransform: "uppercase" }}>{k}</div>
                  <div style={{ fontSize: "10px", color: "#6b7888", lineHeight: 1.3 }}>{String(v)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: "28px", opacity: .3 }}>{type === "image" ? "🖼" : "📐"}</div>
            </div>
          )}
        </div>

        {/* Right: AI analysis */}
        <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
          {analyzing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", paddingTop: "4px" }}>
              <div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: ".08em", marginBottom: "2px" }}>AI EXTRACTING INSIGHTS...</div>
              {[75, 55, 65, 45, 80].map((w, i) => (
                <div key={i} style={{ height: "7px", borderRadius: "4px", background: "linear-gradient(90deg,#1e2530 25%,#2a3440 50%,#1e2530 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          ) : aiAnalysis ? (
            <div style={{ animation: "fadeUp .3s ease" }}>
              <div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: ".08em", marginBottom: "5px", display: "flex", alignItems: "center", gap: "8px" }}>
                AI ANALYSIS
                <ConfBadge level={aiAnalysis.confidenceLevel} />
              </div>
              <div style={{ fontSize: "11px", color: "#c8d0dc", marginBottom: "8px", lineHeight: 1.5 }}>{aiAnalysis.partDescription}</div>
              {aiAnalysis.visibleFeatures?.length > 0 && (
                <div style={{ marginBottom: "7px" }}>
                  <div style={{ fontSize: "8px", color: "#3d4a5c", marginBottom: "4px" }}>DETECTED FEATURES</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {aiAnalysis.visibleFeatures.slice(0, 5).map((f, i) => <MiniTag key={i}>{f}</MiniTag>)}
                  </div>
                </div>
              )}
              {aiAnalysis.dfmObservations?.length > 0 && (
                <div style={{ marginBottom: "7px" }}>
                  <div style={{ fontSize: "8px", color: "#3d4a5c", marginBottom: "4px" }}>DFM SIGNALS</div>
                  {aiAnalysis.dfmObservations.slice(0, 3).map((obs, i) => (
                    <div key={i} style={{ fontSize: "10px", color: "#6b7888", lineHeight: 1.5, marginBottom: "2px" }}>· {obs}</div>
                  ))}
                </div>
              )}
              {aiAnalysis.probableProcesses?.length > 0 && (
                <div style={{ marginBottom: "6px" }}>
                  <div style={{ fontSize: "8px", color: "#3d4a5c", marginBottom: "4px" }}>SUGGESTED PROCESSES</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {aiAnalysis.probableProcesses.slice(0, 3).map((p, i) => (
                      <span key={i} style={{ fontSize: "9px", padding: "2px 7px", background: "rgba(0,212,170,.12)", color: "#00d4aa", borderRadius: "8px" }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
              {aiAnalysis.caveats && <div style={{ fontSize: "9px", color: "#3d4a5c", fontStyle: "italic", lineHeight: 1.4, marginTop: "4px" }}>⚠ {aiAnalysis.caveats}</div>}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────
function ResultsPanel({ proc, expandedRule, setExpandedRule, form, uploadedFile }) {
  const [tab, setTab] = useState("rules");
  const sg = getSustainabilityGrade(proc.sustainability.co2_index);
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "18px 24px 0", borderBottom: "1px solid #1e2530" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "26px" }}>{proc.icon}</span>
            <div>
              <div style={{ fontSize: "17px", fontWeight: "700", fontFamily: "'IBM Plex Sans',sans-serif" }}>{proc.label}</div>
              <div style={{ fontSize: "10px", color: "#4a5568", marginTop: "2px" }}>{proc.cost_model}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "14px" }}>
            <StatChip label="CRITICAL" value={proc.rules.filter(r => r.severity === "critical").length} color="#ff4757" />
            <StatChip label="WARNINGS" value={proc.rules.filter(r => r.severity === "warning").length} color="#ffa502" />
            <StatChip label="FIT SCORE" value={`${proc.score}%`} color="#00d4aa" />
          </div>
        </div>
        <div style={{ display: "flex" }}>
          {[{ id: "rules", label: "DFM RULES" }, { id: "materials", label: "MATERIALS" }, { id: "cost", label: "COST & LEAD TIME" }, { id: "sustainability", label: "SUSTAINABILITY" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "7px 13px", fontSize: "11px", letterSpacing: ".07em", background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#00d4aa" : "transparent"}`, color: tab === t.id ? "#00d4aa" : "#3d4a5c", cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
        {tab === "rules" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {/* AI observations panel */}
            {uploadedFile?.aiAnalysis?.dfmObservations?.length > 0 && (
              <div style={{ padding: "12px 14px", border: "1px solid rgba(0,212,170,.25)", borderLeft: "3px solid #00d4aa", borderRadius: "6px", marginBottom: "8px", background: "rgba(0,212,170,.04)", animation: "fadeUp .3s ease" }}>
                <div style={{ fontSize: "9px", color: "#00d4aa", letterSpacing: ".1em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                  ◈ AI OBSERVATIONS FROM YOUR {uploadedFile.type === "image" ? "IMAGE" : "3D MODEL"}
                  <ConfBadge level={uploadedFile.aiAnalysis.confidenceLevel} />
                </div>
                {uploadedFile.aiAnalysis.dfmObservations.map((obs, i) => (
                  <div key={i} style={{ fontSize: "11px", color: "#8899aa", lineHeight: 1.5, marginBottom: "3px" }}>· {obs}</div>
                ))}
              </div>
            )}
            {proc.rules.map(rule => (
              <div key={rule.id}>
                <div className="rr" onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)} style={{ padding: "11px 13px", border: `1px solid ${expandedRule === rule.id ? getSeverityColor(rule.severity) : "#1e2530"}`, borderLeft: `3px solid ${getSeverityColor(rule.severity)}`, borderRadius: "6px", cursor: "pointer", transition: "all .15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "9px", padding: "1px 7px", borderRadius: "10px", fontWeight: "600", background: `${getSeverityColor(rule.severity)}22`, color: getSeverityColor(rule.severity), letterSpacing: ".07em", whiteSpace: "nowrap" }}>{rule.severity.toUpperCase()}</span>
                    <span style={{ fontSize: "10px", color: "#3d4a5c" }}>{rule.category}</span>
                    <span style={{ fontSize: "12px", fontWeight: "600", flex: 1 }}>{rule.title}</span>
                    <span style={{ fontSize: "10px", color: "#3d4a5c" }}>{expandedRule === rule.id ? "▲" : "▼"}</span>
                  </div>
                  {expandedRule !== rule.id && <div style={{ fontSize: "11px", color: "#4a5568", marginTop: "5px", lineHeight: 1.5 }}>{rule.desc}</div>}
                </div>
                {expandedRule === rule.id && (
                  <div style={{ padding: "13px", marginTop: "-3px", border: `1px solid ${getSeverityColor(rule.severity)}44`, borderTop: "none", borderRadius: "0 0 6px 6px", background: "rgba(0,212,170,.02)" }}>
                    <div style={{ marginBottom: "9px" }}>
                      <div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "3px" }}>ISSUE</div>
                      <div style={{ fontSize: "12px", color: "#8899aa", lineHeight: 1.6 }}>{rule.desc}</div>
                    </div>
                    <div style={{ marginBottom: "9px" }}>
                      <div style={{ fontSize: "9px", color: "#00d4aa", letterSpacing: ".1em", marginBottom: "3px" }}>✓ RECOMMENDED FIX</div>
                      <div style={{ fontSize: "12px", color: "#c8d0dc", lineHeight: 1.6 }}>{rule.fix}</div>
                    </div>
                    <div style={{ fontSize: "10px", color: "#3d4a5c", background: "#0d1117", padding: "5px 10px", borderRadius: "4px", display: "inline-block" }}>📚 {rule.ref}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "materials" && (
          <div>
            <div style={{ marginBottom: "18px" }}>
              <div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "10px" }}>COMPATIBLE MATERIALS</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                {proc.materials.map(m => {
                  const aiSug = uploadedFile?.aiAnalysis?.likelySuggestedMaterials?.some(am => am.toLowerCase().includes(m.toLowerCase().split(" ")[0]));
                  return (
                    <div key={m} style={{ padding: "7px 12px", border: `1px solid ${aiSug ? "rgba(0,212,170,.4)" : "#1e2530"}`, borderRadius: "6px", fontSize: "12px", background: aiSug ? "rgba(0,212,170,.07)" : "#0d1117" }}>
                      {m}{aiSug && <span style={{ fontSize: "8px", color: "#00d4aa", marginLeft: "5px" }}>◈ AI</span>}
                    </div>
                  );
                })}
              </div>
              {uploadedFile?.aiAnalysis?.likelySuggestedMaterials?.length > 0 && <div style={{ fontSize: "10px", color: "#3d4a5c", marginTop: "6px" }}>◈ = suggested from your uploaded {uploadedFile.type}</div>}
            </div>
            <div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "10px" }}>MATERIAL DATA (MatWeb / ASM Handbook)</div>
            {Object.entries(MATERIAL_DB).map(([family, mats]) => (
              <div key={family} style={{ marginBottom: "18px" }}>
                <div style={{ fontSize: "11px", color: "#6b7888", marginBottom: "7px", textTransform: "capitalize" }}>{family}</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1e2530" }}>
                        {["Material", "Density", "Tensile", "Machinability", "Cost ×", "CO₂/kg", "Recyclability", "Source"].map(h => (
                          <th key={h} style={{ padding: "5px 8px", color: "#3d4a5c", textAlign: "left", fontWeight: "normal", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(mats).map(([name, d]) => (
                        <tr key={name} style={{ borderBottom: "1px solid #1a1f28" }}>
                          <td style={{ padding: "6px 8px", color: "#c8d0dc", fontWeight: "600" }}>{name}</td>
                          <td style={{ padding: "6px 8px", color: "#6b7888" }}>{d.density} g/cm³</td>
                          <td style={{ padding: "6px 8px", color: "#6b7888" }}>{d.tensile}</td>
                          <td style={{ padding: "6px 8px" }}><span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: d.machinability === "Excellent" ? "rgba(46,213,115,.15)" : d.machinability === "Good" ? "rgba(0,212,170,.15)" : d.machinability === "Fair" ? "rgba(255,165,2,.15)" : "rgba(255,71,87,.15)", color: d.machinability === "Excellent" ? "#2ed573" : d.machinability === "Good" ? "#00d4aa" : d.machinability === "Fair" ? "#ffa502" : "#ff4757" }}>{d.machinability}</span></td>
                          <td style={{ padding: "6px 8px", color: "#6b7888" }}>×{d.cost_index}</td>
                          <td style={{ padding: "6px 8px", color: "#6b7888" }}>{d.co2_kg}</td>
                          <td style={{ padding: "6px 8px" }}><div style={{ display: "flex", alignItems: "center", gap: "5px" }}><div style={{ width: "40px", height: "3px", background: "#1e2530", borderRadius: "2px" }}><div style={{ width: d.recyclability, height: "3px", background: "#00d4aa", borderRadius: "2px" }} /></div><span style={{ color: "#6b7888", fontSize: "10px" }}>{d.recyclability}</span></div></td>
                          <td style={{ padding: "6px 8px", color: "#3d4a5c", fontSize: "10px" }}>{d.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "cost" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <CostCard label="TOOLING COST" value={proc.tooling_cost} detail={proc.cost_model} icon="🔧" />
            <CostCard label="UNIT COST" value={proc.unit_cost} detail={`At ${VOLUME_BANDS.find(v => v.value === form.volume)?.label || "stated"} volume`} icon="📦" />
            <CostCard label="LEAD TIME" value={proc.lead_time} detail="From order to first article" icon="⏱" />
            <CostCard label="VOLUME SWEET SPOT" value={`${proc.volume_fit.min.toLocaleString()}–${proc.volume_fit.ideal.toLocaleString()}+`} detail="Units/year for best economics" icon="📈" />
            <div style={{ gridColumn: "1/-1", padding: "14px", border: "1px solid #1e2530", borderRadius: "8px", background: "#0d1117" }}>
              <div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "7px" }}>COST MODEL BASIS</div>
              <div style={{ fontSize: "12px", color: "#8899aa", lineHeight: 1.7 }}>{proc.cost_model}<br /><br /><span style={{ color: "#3d4a5c", fontSize: "10px" }}>Sources: Ostwald Cost Analysis, Niazi et al. (2006), Bralla DFM Handbook</span></div>
            </div>
          </div>
        )}

        {tab === "sustainability" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "10px" }}>
              <SustCard label="ENERGY" value={proc.sustainability.energy_intensity} icon="⚡" />
              <SustCard label="RECYCLABILITY" value={proc.sustainability.recyclability} icon="♻" />
              <SustCard label="END OF LIFE" value={proc.sustainability.eol} icon="🔄" />
              <div style={{ padding: "13px", border: "1px solid #1e2530", borderRadius: "8px", background: "#0d1117", textAlign: "center" }}>
                <div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "5px" }}>CO₂ INDEX</div>
                <div style={{ fontSize: "32px", fontWeight: "800", color: sg.color, fontFamily: "'IBM Plex Sans',sans-serif" }}>{sg.grade}</div>
                <div style={{ fontSize: "10px", color: "#4a5568", marginTop: "3px" }}>{proc.sustainability.co2_index} rel.</div>
              </div>
            </div>
            <div style={{ padding: "14px", border: "1px solid #1e2530", borderRadius: "8px", background: "#0d1117" }}>
              <div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "8px" }}>SUSTAINABILITY GUIDANCE</div>
              <div style={{ fontSize: "12px", color: "#8899aa", lineHeight: 1.8 }}>
                <span style={{ color: "#2ed573" }}>✓ Ecodesign Directive (2009/125/EC)</span> — Consider energy in use phase, not just manufacture.<br />
                <span style={{ color: "#2ed573" }}>✓ RoHS / REACH</span> — Verify material declarations against restricted substance lists.<br />
                <span style={{ color: "#ffa502" }}>⚠ Ecoinvent v3</span> — Process-specific LCA data available for detailed environmental assessment.<br />
                <span style={{ color: "#3d4a5c", fontSize: "10px" }}>References: Ecoinvent v3, GaBi LCA, ISO 14040/44</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mini Components ──────────────────────────────────────────────────────────
function FormatBadge({ icon, label, formats }) {
  return (
    <div style={{ padding: "8px 14px", border: "1px solid #1e2530", borderRadius: "6px", textAlign: "center", minWidth: "110px" }}>
      <div style={{ fontSize: "18px", marginBottom: "3px" }}>{icon}</div>
      <div style={{ fontSize: "11px", color: "#6b7888", fontWeight: "600", fontFamily: "'IBM Plex Sans',sans-serif" }}>{label}</div>
      <div style={{ fontSize: "10px", color: "#3d4a5c", marginTop: "2px" }}>{formats}</div>
    </div>
  );
}
function ConfBadge({ level }) {
  const c = level === "high" ? { bg: "rgba(46,213,115,.15)", col: "#2ed573" } : level === "medium" ? { bg: "rgba(255,165,2,.15)", col: "#ffa502" } : { bg: "rgba(255,71,87,.15)", col: "#ff4757" };
  return <span style={{ fontSize: "8px", padding: "1px 7px", borderRadius: "8px", background: c.bg, color: c.col, letterSpacing: ".06em" }}>{level} confidence</span>;
}
function FormGroup({ label, hint, children }) {
  return <div><div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: ".12em", marginBottom: "6px" }}>{label}{hint && <span style={{ color: "#2a3340", textTransform: "none", letterSpacing: "normal" }}> — {hint}</span>}</div>{children}</div>;
}
function Tag({ children }) { return <span style={{ fontSize: "10px", padding: "3px 8px", background: "#1e2530", borderRadius: "4px", color: "#6b7888", letterSpacing: ".05em" }}>{children}</span>; }
function MiniTag({ children, color }) { return <span style={{ fontSize: "10px", padding: "2px 7px", background: color || "#1e2530", borderRadius: "10px", color: "#8899aa" }}>{children}</span>; }
function ScoreBadge({ score }) {
  const c = score >= 70 ? "#2ed573" : score >= 40 ? "#ffa502" : "#ff4757";
  return <div style={{ fontSize: "11px", fontWeight: "700", color: c, padding: "2px 8px", background: `${c}18`, borderRadius: "10px" }}>{score}%</div>;
}
function StatChip({ label, value, color }) {
  return <div style={{ textAlign: "center" }}><div style={{ fontSize: "9px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "2px" }}>{label}</div><div style={{ fontSize: "17px", fontWeight: "700", color, fontFamily: "'IBM Plex Sans',sans-serif" }}>{value}</div></div>;
}
function CostCard({ label, value, detail, icon }) {
  return <div style={{ padding: "13px", border: "1px solid #1e2530", borderRadius: "8px", background: "#0d1117" }}><div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "6px" }}>{icon} {label}</div><div style={{ fontSize: "18px", fontWeight: "700", color: "#e8e6e1", fontFamily: "'IBM Plex Sans',sans-serif", marginBottom: "4px" }}>{value}</div><div style={{ fontSize: "11px", color: "#4a5568", lineHeight: 1.5 }}>{detail}</div></div>;
}
function SustCard({ label, value, icon }) {
  return <div style={{ padding: "13px", border: "1px solid #1e2530", borderRadius: "8px", background: "#0d1117" }}><div style={{ fontSize: "10px", color: "#3d4a5c", letterSpacing: ".1em", marginBottom: "6px" }}>{icon} {label}</div><div style={{ fontSize: "13px", fontWeight: "600", color: "#e8e6e1", lineHeight: 1.4 }}>{value}</div></div>;
}
