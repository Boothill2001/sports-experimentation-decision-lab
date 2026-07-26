const state = {
  data: null,
  scenario: "clean",
  step: "design",
  lab: "L01",
  prediction: null
};

const decisions = ["SHIP", "HOLD", "WAIT", "INVALID", "INCONCLUSIVE"];
const interpretations = {
  clean: "A credible primary lift with healthy guardrails—ready for a controlled rollout.",
  srm: "An attractive lift cannot be trusted because assignment itself is broken.",
  guardrail: "Conversion improves, but reliability harm gives the crash guardrail a veto.",
  novelty: "Early excitement fades in later cohorts; durability remains unproven.",
  simpson: "The aggregate direction reverses after controlling for platform mix.",
  exposure_bias: "Post-assignment filtering changes the estimate and breaks causal interpretation."
};
const nextActions = {
  clean: ["Ship a controlled rollout and monitor guardrails for seven days.", "Product owner · Analytics monitors"],
  srm: ["Repair assignment or logging, then restart with a clean population.", "Experiment platform owner"],
  guardrail: ["Hold launch, isolate the crash regression and rerun the treatment.", "Mobile Engineering owner"],
  novelty: ["Extend the predeclared observation window without sequential peeking.", "Experiment owner"],
  simpson: ["Audit platform allocation and rerun with stratified randomization.", "Analytics + Experiment platform"],
  exposure_bias: ["Restore the ITT population and diagnose treatment compliance separately.", "Analytics owner"]
};

const pct = value => `${(value * 100).toFixed(2)}%`;
const pp = value => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)} pp`;
const relativePct = value => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
const number = value => new Intl.NumberFormat("en-US").format(value);
const pValue = value => value < .0001 ? "<0.0001" : value.toFixed(4);
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

async function loadData() {
  const response = await fetch("data/experiments.json");
  if (!response.ok) throw new Error(`Recorded evidence returned ${response.status}`);
  state.data = await response.json();
  setupScenarioCommand();
  setupStepper();
  setupPractice();
  setupLearning();
  setupKeyboard();
  renderLearning();
  renderAll();
}

function setupScenarioCommand() {
  const select = document.querySelector("#scenario-select");
  Object.entries(state.data.reports).forEach(([key, report]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = report.title;
    select.appendChild(option);
  });
  select.value = state.scenario;
  select.addEventListener("change", event => {
    state.scenario = event.target.value;
    renderAll();
  });
}

function setupStepper() {
  document.querySelectorAll(".step").forEach(button => {
    button.addEventListener("click", () => switchStep(button.dataset.step));
  });
  document.querySelector("#rail-jump").addEventListener("click", () => switchStep("decision"));
}

function switchStep(step) {
  state.step = step;
  document.querySelectorAll(".step").forEach(button => {
    const active = button.dataset.step === step;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll(".review-stage").forEach(stage => {
    stage.classList.toggle("active", stage.dataset.stage === step);
  });
  document.querySelector("#review-canvas").scrollIntoView({ behavior: "smooth", block: "start" });
}

function report() {
  return state.data.reports[state.scenario];
}

function renderAll() {
  const current = report();
  document.querySelector("#scenario-title").textContent = current.title;
  document.querySelector("#scenario-interpretation").textContent = interpretations[state.scenario];
  renderDesign(current);
  renderIntegrity(current);
  renderEffect(current);
  renderGuardrails(current);
  renderDecision(current);
  renderRail(current);
}

function renderDesign(current) {
  document.querySelector("#design-control-n").textContent = number(current.primary.control_n);
  document.querySelector("#design-treatment-n").textContent = number(current.primary.treatment_n);
  document.querySelector("#design-control-rate").textContent = pct(current.primary.control_rate);
  document.querySelector("#design-treatment-rate").textContent = pct(current.primary.treatment_rate);
  document.querySelector("#design-sample").textContent = `${number(current.assigned_users)} users`;
}

function gateState(current) {
  const exposureGap = Math.abs(current.exposed_only_lift - current.primary.absolute_lift) > .005;
  const guardrailBroken = current.guardrails.some(item => item.breached);
  return {
    exposureGap,
    guardrailBroken,
    integrityPassed: !current.srm_detected && !exposureGap,
    intervalPassed: current.primary.ci_low > 0,
    durabilityPassed: !current.novelty_detected,
    mixPassed: !current.simpson_detected
  };
}

function renderIntegrity(current) {
  const gates = gateState(current);
  const controlShare = current.primary.control_n / current.assigned_users;
  const treatmentShare = current.primary.treatment_n / current.assigned_users;
  document.querySelector("#allocation-control").style.width = `${controlShare * 100}%`;
  document.querySelector("#allocation-treatment").style.width = `${treatmentShare * 100}%`;
  document.querySelector("#allocation-control-copy").textContent = pct(controlShare);
  document.querySelector("#allocation-treatment-copy").textContent = pct(treatmentShare);
  document.querySelector("#srm-p").textContent = `p ${pValue(current.srm_p_value)}`;
  document.querySelector("#exposure-rate").textContent = pct(current.exposure_rate);
  document.querySelector("#itt-lift").textContent = pp(current.primary.absolute_lift);
  document.querySelector("#exposed-lift").textContent = pp(current.exposed_only_lift);

  const word = current.srm_detected ? "BLOCKED" : gates.exposureGap ? "REVIEW" : "INTERPRETABLE";
  const summary = current.srm_detected
    ? "The planned 50/50 assignment is inconsistent with observed allocation. Stop effect interpretation."
    : gates.exposureGap
      ? "Assigned and exposed-only estimates diverge materially. Preserve intent-to-treat."
      : "Assignment, exposure lineage and outcome population support effect interpretation.";
  const integrityWord = document.querySelector("#integrity-word");
  integrityWord.textContent = word;
  integrityWord.classList.toggle("fail", word !== "INTERPRETABLE");
  document.querySelector("#integrity-summary").textContent = summary;

  const status = document.querySelector("#integrity-status");
  status.textContent = gates.integrityPassed ? "Integrity gates passed" : "Interpretation blocked";
  status.className = `stage-note ${gates.integrityPassed ? "pass" : "fail"}`;
  document.querySelector("#population-note").textContent = gates.exposureGap
    ? "Filtering to exposed users changes the estimate enough to threaten causal interpretation."
    : "The exposed-only diagnostic stays close to ITT; assigned users remain the analysis population.";

  const ledger = [
    ["Eligibility", "PASS", "pass"],
    ["Random assignment", current.srm_detected ? "FAIL · SRM" : "PASS", current.srm_detected ? "fail" : "pass"],
    ["Exposure lineage", gates.exposureGap ? "REVIEW" : "PASS", gates.exposureGap ? "review" : "pass"],
    ["Outcome completeness", "PASS", "pass"]
  ];
  document.querySelector("#gate-ledger").innerHTML = ledger.map(([label, copy, kind]) =>
    `<li><strong>${label}</strong><span class="${kind}">${copy}</span></li>`).join("");
}

function renderEffect(current) {
  document.querySelector("#effect-lift").textContent = pp(current.primary.absolute_lift);
  document.querySelector("#effect-relative").textContent =
    `${relativePct(current.primary.relative_lift)} relative`;
  document.querySelector("#effect-ci-copy").textContent =
    `${pp(current.primary.ci_low)} to ${pp(current.primary.ci_high)}`;
  document.querySelector("#effect-p").textContent = pValue(current.primary.p_value);
  document.querySelector("#effect-p-note").textContent = current.primary.p_value < .05
    ? "statistically distinguishable from zero"
    : "current evidence remains compatible with zero";
  document.querySelector("#effect-cuped").textContent = pct(current.cuped_variance_reduction);
  document.querySelector("#effect-interpretation").textContent = current.primary.ci_low > 0
    ? "The entire interval is above zero. Pair statistical evidence with business value and guardrails."
    : "The interval crosses zero. The observed estimate is not yet a durable positive conclusion.";

  const scaleMin = -.05;
  const scaleMax = .05;
  const toPosition = value => clamp((value - scaleMin) / (scaleMax - scaleMin) * 100, 0, 100);
  const left = toPosition(current.primary.ci_low);
  const right = toPosition(current.primary.ci_high);
  const point = toPosition(current.primary.absolute_lift);
  const range = document.querySelector("#effect-ci-range");
  range.style.left = `${left}%`;
  range.style.width = `${Math.max(1.5, right - left)}%`;
  document.querySelector("#effect-point").style.left =
    `${clamp((point - left) / Math.max(1.5, right - left) * 100, 0, 100)}%`;

  const maxRate = Math.max(current.primary.control_rate, current.primary.treatment_rate) * 1.12;
  document.querySelector("#effect-bars").innerHTML = [
    ["Control", current.primary.control_rate, ""],
    ["Treatment", current.primary.treatment_rate, "treatment"]
  ].map(([label, value, variant]) => `
    <div class="effect-bar">
      <span>${label}</span>
      <div class="effect-track"><div class="effect-fill ${variant}" style="width:${value / maxRate * 100}%"></div></div>
      <strong>${pct(value)}</strong>
    </div>`).join("");
}

function renderGuardrails(current) {
  const gates = gateState(current);
  const breached = current.guardrails.some(item => item.breached);
  const overall = document.querySelector("#guardrail-overall");
  overall.textContent = breached ? "Veto triggered" : "No safety veto";
  overall.className = `stage-note ${breached ? "fail" : "pass"}`;

  document.querySelector("#veto-board").innerHTML = current.guardrails.map((item, index) => `
    <article class="veto-item ${item.breached ? "breached" : ""}">
      <div class="veto-top"><p>VETO 0${index + 1}</p><span>${item.breached ? "BREACHED" : "HEALTHY"}</span></div>
      <h3>${item.metric}</h3>
      <div class="veto-change">
        <strong>${pp(item.absolute_change)}</strong>
        <span>absolute change</span>
      </div>
      <small>${pct(item.control_rate)} control → ${pct(item.treatment_rate)} treatment · p=${pValue(item.p_value)}</small>
    </article>`).join("");

  const novelty = document.querySelector("#novelty-tag");
  novelty.textContent = current.novelty_detected ? "DECAY DETECTED" : "DURABLE";
  novelty.className = current.novelty_detected ? "bad" : "good";
  const durationScale = Math.max(.01, Math.abs(current.early_lift), Math.abs(current.late_lift)) * 1.15;
  document.querySelector("#durability-bars").innerHTML = [
    ["Early", current.early_lift],
    ["Late", current.late_lift]
  ].map(([label, value]) => `
    <div class="duration-row">
      <span>${label}</span>
      <div class="duration-track"><div class="duration-fill" style="width:${Math.abs(value) / durationScale * 100}%"></div></div>
      <strong>${pp(value)}</strong>
    </div>`).join("");

  const simpson = document.querySelector("#simpson-tag");
  simpson.textContent = current.simpson_detected ? "MIX CONFOUNDING" : "CONSISTENT";
  simpson.className = current.simpson_detected ? "bad" : "good";
  const segmentMax = Math.max(
    ...current.segments.flatMap(item => [item.control_rate, item.treatment_rate])
  ) * 1.08;
  document.querySelector("#segment-board").innerHTML = current.segments.map(item => `
    <div class="segment-row">
      <header><strong>${item.segment.toUpperCase()}</strong><span>${number(item.users)} users · ${pp(item.absolute_lift)} lift</span></header>
      <div class="segment-lines">
        <div class="mini-line"><span>Control</span><div class="mini-track"><div class="mini-fill" style="width:${item.control_rate / segmentMax * 100}%"></div></div><b>${pct(item.control_rate)}</b></div>
        <div class="mini-line"><span>Treatment</span><div class="mini-track"><div class="mini-fill treatment" style="width:${item.treatment_rate / segmentMax * 100}%"></div></div><b>${pct(item.treatment_rate)}</b></div>
      </div>
    </div>`).join("");

  return gates;
}

function memoParts(current) {
  const gates = gateState(current);
  const safety = gates.guardrailBroken
    ? "A predeclared guardrail regressed and vetoes immediate launch."
    : "Crash and cancellation guardrails remain within the accepted boundary.";
  const durability = current.simpson_detected
    ? "Aggregate direction conflicts with platform effects because allocation mix changed."
    : current.novelty_detected
      ? "Early cohort lift decays materially in later cohorts."
      : "The direction is durable across cohort windows and planned platform diagnostics.";
  return {
    trust: current.srm_detected
      ? `SRM detected at p=${pValue(current.srm_p_value)}; assignment is not interpretable.`
      : gates.exposureGap
        ? "Exposed-only filtering changes the estimate; retain the assigned ITT population."
        : `No SRM detected; ${pct(current.exposure_rate)} of assigned users were exposed.`,
    effect: `${pp(current.primary.absolute_lift)} absolute lift (${relativePct(current.primary.relative_lift)} relative), 95% CI ${pp(current.primary.ci_low)} to ${pp(current.primary.ci_high)}, p=${pValue(current.primary.p_value)}.`,
    safety,
    durability,
    rationale: current.rationale,
    action: nextActions[state.scenario][0],
    owner: nextActions[state.scenario][1]
  };
}

function renderDecision(current) {
  const memo = memoParts(current);
  document.querySelector("#memo-decision").textContent = current.decision;
  document.querySelector("#memo-trust").textContent = memo.trust;
  document.querySelector("#memo-effect").textContent = memo.effect;
  document.querySelector("#memo-safety").textContent = memo.safety;
  document.querySelector("#memo-durability").textContent = memo.durability;
  document.querySelector("#memo-rationale").textContent = memo.rationale;
  document.querySelector("#memo-action").textContent = `${memo.action} ${memo.owner}`;
  document.querySelector("#memo-limitation").textContent = current.limitation;
}

function railGateMarkup(current) {
  const gates = gateState(current);
  return [
    ["Integrity", gates.integrityPassed ? "PASS" : "FAIL", gates.integrityPassed ? "" : "fail"],
    ["Confidence", gates.intervalPassed ? "PASS" : "OPEN", gates.intervalPassed ? "" : "review"],
    ["Guardrails", gates.guardrailBroken ? "VETO" : "PASS", gates.guardrailBroken ? "fail" : ""],
    ["Durability", gates.durabilityPassed ? "PASS" : "WAIT", gates.durabilityPassed ? "" : "review"],
    ["Platform mix", gates.mixPassed ? "PASS" : "REVIEW", gates.mixPassed ? "" : "fail"]
  ];
}

function renderRail(current) {
  const rail = document.querySelector("#decision-rail");
  rail.className = `decision-rail ${current.decision.toLowerCase()}`;
  document.querySelector("#rail-decision").textContent = current.decision;
  document.querySelector("#rail-rationale").textContent = current.rationale;
  document.querySelector("#rail-gates").innerHTML = railGateMarkup(current).map(([label, copy, kind]) =>
    `<div class="rail-gate"><span>${label}</span><b class="${kind}">${copy}</b></div>`).join("");
  document.querySelector("#rail-action").textContent = nextActions[state.scenario][0];
  document.querySelector("#rail-owner").textContent = nextActions[state.scenario][1];
}

function setupPractice() {
  const select = document.querySelector("#lab-select");
  Object.entries(state.data.labs).forEach(([id, lab]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${id} · ${lab.title}`;
    select.appendChild(option);
  });
  select.value = state.lab;
  select.addEventListener("change", event => {
    state.lab = event.target.value;
    renderLab();
  });
  document.querySelector("#prediction-options").innerHTML = decisions.map(decision =>
    `<button type="button" data-prediction="${decision}">${decision}</button>`).join("");
  document.querySelectorAll("[data-prediction]").forEach(button => {
    button.addEventListener("click", () => {
      state.prediction = button.dataset.prediction;
      document.querySelectorAll("[data-prediction]").forEach(item =>
        item.classList.toggle("selected", item === button));
      document.querySelector("#reveal-button").disabled = false;
      document.querySelector("#lab-answer").hidden = true;
    });
  });
  document.querySelector("#reveal-button").addEventListener("click", revealLab);
  document.querySelector("#practice-open").addEventListener("click", openPractice);
  document.querySelector("#practice-open-inline").addEventListener("click", openPractice);
  document.querySelector("#practice-close").addEventListener("click", closePractice);
  document.querySelector("#drawer-backdrop").addEventListener("click", closePractice);
  renderLab();
}

function openPractice() {
  document.querySelector("#practice-drawer").classList.add("open");
  document.querySelector("#practice-drawer").setAttribute("aria-hidden", "false");
  document.querySelector("#drawer-backdrop").classList.add("open");
  document.body.classList.add("locked");
  setTimeout(() => document.querySelector("#practice-close").focus(), 50);
}

function closePractice() {
  document.querySelector("#practice-drawer").classList.remove("open");
  document.querySelector("#practice-drawer").setAttribute("aria-hidden", "true");
  document.querySelector("#drawer-backdrop").classList.remove("open");
  document.body.classList.remove("locked");
}

function renderLab() {
  const lab = state.data.labs[state.lab];
  const labReport = state.data.reports[lab.scenario];
  state.prediction = null;
  document.querySelector("#lab-number").textContent = `${state.lab} · ${labReport.title}`;
  document.querySelector("#lab-title").textContent = lab.title;
  document.querySelector("#lab-question").textContent = lab.question;
  document.querySelector("#lab-clarify").innerHTML =
    lab.clarify.map(item => `<li>${item}</li>`).join("");
  document.querySelector("#lab-decision").textContent = labReport.decision;
  document.querySelector("#lab-evidence").textContent = lab.evidence;
  document.querySelector("#lab-rationale").textContent = labReport.rationale;
  document.querySelector("#lab-answer").hidden = true;
  document.querySelector("#reveal-button").disabled = true;
  document.querySelectorAll("[data-prediction]").forEach(button => button.classList.remove("selected"));
}

function revealLab() {
  if (!state.prediction) return;
  const lab = state.data.labs[state.lab];
  const labReport = state.data.reports[lab.scenario];
  const matched = state.prediction === labReport.decision;
  document.querySelector("#answer-match").textContent = matched
    ? "DECISION MATCH · YOUR REASONING PASSED"
    : `DECISION GAP · YOU CHOSE ${state.prediction}`;
  document.querySelector("#lab-answer").hidden = false;
}

function setupLearning() {
  document.querySelector("#learning-open").addEventListener("click", openLearning);
  document.querySelector("#learning-close").addEventListener("click", closeLearning);
  document.querySelector("#learning-overlay").addEventListener("click", event => {
    if (event.target.id === "learning-overlay") closeLearning();
  });
}

function openLearning() {
  document.querySelector("#learning-overlay").classList.add("open");
  document.querySelector("#learning-overlay").setAttribute("aria-hidden", "false");
  document.body.classList.add("locked");
  setTimeout(() => document.querySelector("#learning-close").focus(), 50);
}

function closeLearning() {
  document.querySelector("#learning-overlay").classList.remove("open");
  document.querySelector("#learning-overlay").setAttribute("aria-hidden", "true");
  document.body.classList.remove("locked");
}

function renderLearning() {
  const days = [
    ["Day 1", "Grain, estimand & metric contract", "Define randomization unit, ITT population and primary metric before querying."],
    ["Day 2", "SRM & data lineage", "Reconcile eligibility, assignment, exposure and outcome joins."],
    ["Day 3", "Effect size & confidence", "Explain absolute lift, uncertainty and practical significance."],
    ["Day 4", "Guardrails & decision rights", "Defend HOLD when conversion wins but product safety regresses."],
    ["Day 5", "Novelty & sequential peeking", "Separate early excitement from durable cohort behavior."],
    ["Day 6", "Segments, Simpson & CUPED", "Control mix, inspect heterogeneity and reduce variance safely."],
    ["Day 7", "90-second review board", "Recommend SHIP/HOLD/WAIT/INVALID with evidence and limitation."]
  ];
  document.querySelector("#learning-timeline").innerHTML = days.map(([day, title, copy], index) => `
    <article class="learning-day">
      <i>0${index + 1}</i><span>${day}</span><h3>${title}</h3><p>${copy}</p>
    </article>`).join("");
}

function setupKeyboard() {
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      document.querySelector("#scenario-select").focus();
    }
    if (event.key === "Escape") {
      closePractice();
      closeLearning();
    }
  });
  document.querySelector("#memo-copy").addEventListener("click", copyMemo);
}

async function copyMemo() {
  const current = report();
  const memo = memoParts(current);
  const text = [
    `MATCH CENTER V2 · ${current.decision}`,
    `Trust: ${memo.trust}`,
    `Effect: ${memo.effect}`,
    `Safety: ${memo.safety}`,
    `Durability: ${memo.durability}`,
    `Rationale: ${memo.rationale}`,
    `Next action: ${memo.action}`,
    `Owner: ${memo.owner}`,
    `Limitation: ${current.limitation}`
  ].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    showToast("Decision memo copied");
  } catch {
    showToast("Clipboard unavailable—memo remains visible");
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

loadData().catch(error => {
  document.body.innerHTML = `
    <main style="padding:40px;font-family:system-ui">
      <h1>Recorded evidence failed to load.</h1><pre>${String(error)}</pre>
    </main>`;
});
