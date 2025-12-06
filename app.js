const API_URL = "https://YOUR-RENDER-URL.onrender.com/api/mutation-analysis";

document.getElementById("mutation-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  const errorEl = document.getElementById("error");
  const resultsEl = document.getElementById("results");
  errorEl.style.display = "none";
  resultsEl.style.display = "none";

  if (!payload.base_molecule || !payload.mutation) {
    errorEl.textContent = "Please fill in both base molecule and mutation.";
    errorEl.style.display = "block";
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Server error");

    const data = await res.json();
    renderResults(data);
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Failed to analyze mutation. Please try again.";
    errorEl.style.display = "block";
  }
});

function renderResults(data) {
  document.getElementById("summary").textContent = data.summary;

  const keyList = document.getElementById("key-changes");
  keyList.innerHTML = "";
  const kc = data.key_changes || {};
  const mapping = {
    reactivity: "Reactivity",
    acidity_basicity: "Acidity / Basicity",
    sterics: "Steric effects",
    electronics: "Electronic effects",
    intermediate_stability: "Intermediate stability"
  };

  Object.entries(mapping).forEach(([key, label]) => {
    if (kc[key]) {
      const li = document.createElement("li");
      li.textContent = `${label}: ${kc[key]}`;
      keyList.appendChild(li);
    }
  });

  document.getElementById("mech-before").textContent = data.mechanisms.before;
  document.getElementById("mech-after").textContent = data.mechanisms.after;
  document.getElementById("mech-comparison").textContent = data.mechanisms.comparison;

  const exList = document.getElementById("example-reactions");
  exList.innerHTML = "";
  (data.example_reactions || []).forEach((ex) => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${ex.description}</strong><br>
      Before: ${ex.before_mutation_outcome}<br>
      After: ${ex.after_mutation_outcome}`;
    exList.appendChild(li);
  });

  document.getElementById("explain-simple").textContent =
    data.explanation_levels.simple;
  document.getElementById("explain-detailed").textContent =
    data.explanation_levels.detailed;

  document.getElementById("results").style.display = "block";
}
