// Backend endpoint on Render
const API_URL = "https://molecule-mutation-backend.onrender.com/api/mutation-analysis";

const form = document.getElementById("mutation-form");
const loadingEl = document.getElementById("loading-indicator");
const errorEl = document.getElementById("error");
const resultsSection = document.getElementById("results");

// Elements for SMILES rendering
const smilesCanvas = document.getElementById("smiles-canvas");
const smilesErrorEl = document.getElementById("smiles-error");
const smilesInput = document.getElementById("smiles-input");

// Initialize SmilesDrawer drawer (if library is loaded)
let smilesDrawer = null;
if (window.SmilesDrawer) {
  smilesDrawer = new SmilesDrawer.Drawer({
    width: smilesCanvas ? smilesCanvas.width : 320,
    height: smilesCanvas ? smilesCanvas.height : 320,
  });
}

// Helper: draw a SMILES string (if provided)
function drawSmiles(smiles) {
  if (!smilesCanvas || !smilesDrawer) return;

  // Clear any previous error
  if (smilesErrorEl) {
    smilesErrorEl.style.display = "none";
    smilesErrorEl.textContent = "";
  }

  // Clear canvas
  const ctx = smilesCanvas.getContext("2d");
  ctx.clearRect(0, 0, smilesCanvas.width, smilesCanvas.height);

  if (!smiles || !smiles.trim()) {
    // Nothing to draw
    return;
  }

  const cleanSmiles = smiles.trim();

  // Parse and draw using SmilesDrawer
  SmilesDrawer.parse(
    cleanSmiles,
    (tree) => {
      smilesDrawer.draw(tree, "smiles-canvas", "light", false);
    },
    (err) => {
      console.error("SmilesDrawer parse error:", err);
      if (smilesErrorEl) {
        smilesErrorEl.textContent =
          "Could not parse SMILES. Please check the string.";
        smilesErrorEl.style.display = "block";
      }
    }
  );
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  errorEl.style.display = "none";
  errorEl.textContent = "";
  resultsSection.style.display = "none";
  loadingEl.style.display = "inline-block";

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  if (!payload.base_molecule || !payload.mutation) {
    loadingEl.style.display = "none";
    errorEl.textContent = "Please fill in both base molecule and mutation.";
    errorEl.style.display = "block";
    return;
  }

  // Capture SMILES here so we can use it after the fetch
  const smiles = payload.smiles || "";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), // backend ignores extra fields like "smiles"
    });

    const rawText = await res.text();
    console.log("Raw response from backend:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      throw new Error(
        `Backend returned non-JSON. Status ${res.status}. Body: ${rawText}`
      );
    }

    if (!res.ok) {
      const msg = data.error || data.message || `Server error ${res.status}.`;
      throw new Error(msg);
    }

    renderResults(data, smiles);
  } catch (err) {
    console.error("Frontend error:", err);
    errorEl.textContent =
      "Failed to analyze mutation: " + (err.message || "Unknown error.");
    errorEl.style.display = "block";
  } finally {
    loadingEl.style.display = "none";
  }
});

function renderResults(data, smiles) {
  // Summary
  document.getElementById("summary").textContent = data.summary || "";

  // Draw SMILES-based structure (if provided)
  drawSmiles(smiles);

  // Key changes
  const keyList = document.getElementById("key-changes");
  keyList.innerHTML = "";
  const kc = data.key_changes || {};
  const labels = {
    reactivity: "Reactivity",
    acidity_basicity: "Acidity / Basicity",
    sterics: "Steric effects",
    electronics: "Electronic effects",
    intermediate_stability: "Intermediate stability",
  };

  Object.entries(labels).forEach(([key, label]) => {
    if (kc[key]) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${label}:</strong> ${kc[key]}`;
      keyList.appendChild(li);
    }
  });

  // Mechanisms
  document.getElementById("mech-before").textContent =
    data.mechanisms?.before || "";
  document.getElementById("mech-after").textContent =
    data.mechanisms?.after || "";
  document.getElementById("mech-comparison").textContent =
    data.mechanisms?.comparison || "";

  // Example reactions
  const exList = document.getElementById("example-reactions");
  exList.innerHTML = "";
  (data.example_reactions || []).forEach((ex) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <p class="example-label">Scenario</p>
      <p>${ex.description}</p>
      <p class="example-label">Before mutation</p>
      <p>${ex.before_mutation_outcome}</p>
      <p class="example-label">After mutation</p>
      <p>${ex.after_mutation_outcome}</p>
    `;
    exList.appendChild(li);
  });

  // Explanations
  document.getElementById("explain-simple").textContent =
    data.explanation_levels?.simple || "";
  document.getElementById("explain-detailed").textContent =
    data.explanation_levels?.detailed || "";

  resultsSection.style.display = "block";
}

