const state = { data: null, scenario: "clean", view: "decision", lab: "L01" };
const titles = {
  decision: "Experiment decision board",
  integrity: "Experiment integrity gates",
  segments: "Segments, durability & CUPED",
  lab: "Challenge and reveal lab",
  learn: "Seven-day learning path"
};
const pct = value => `${(value * 100).toFixed(2)}%`;
const signedPct = value => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)} pp`;
const num = value => new Intl.NumberFormat("en-US").format(value);

async function loadData() {
  const response = await fetch("data/experiments.json");
  state.data = await response.json();
  const select = document.querySelector("#scenario-select");
  Object.entries(state.data.reports).forEach(([key, report]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = report.title;
    select.appendChild(option);
  });
  select.addEventListener("change", event => { state.scenario = event.target.value; renderAll(); });
  setupNavigation();
  setupLabs();
  renderLearning();
  renderAll();
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
      document.querySelectorAll(".view").forEach(view => view.classList.toggle("active", view.id === `${state.view}-view`));
      document.querySelector("#page-title").textContent = titles[state.view];
    });
  });
}

function report() { return state.data.reports[state.scenario]; }

function renderAll() {
  renderDecision();
  renderIntegrity();
  renderSegments();
}

function renderDecision() {
  const r = report();
  document.querySelector("#decision-word").textContent = r.decision;
  document.querySelector("#decision-rationale").textContent = r.rationale;
  document.querySelector("#absolute-lift").textContent = signedPct(r.primary.absolute_lift);
  document.querySelector("#confidence-copy").textContent =
    `95% CI ${signedPct(r.primary.ci_low)} to ${signedPct(r.primary.ci_high)}`;
  document.querySelector("#assigned-users").textContent = num(r.assigned_users);
  document.querySelector("#control-rate").textContent = pct(r.primary.control_rate);
  document.querySelector("#treatment-rate").textContent = pct(r.primary.treatment_rate);
  document.querySelector("#p-value").textContent = r.primary.p_value < .0001 ? "<0.0001" : r.primary.p_value.toFixed(4);
  document.querySelector("#significance-label").textContent = r.primary.p_value < .05 ? "statistically significant" : "not yet conclusive";
  document.querySelector("#limitation").textContent = `LIMITATION · ${r.limitation}`;

  const maxRate = Math.max(r.primary.control_rate, r.primary.treatment_rate) * 1.15;
  document.querySelector("#conversion-bars").innerHTML = [
    ["Control", r.primary.control_rate, ""],
    ["Treatment", r.primary.treatment_rate, "treatment"]
  ].map(([label, value, kind]) => `
    <div class="bar-row"><span>${label}</span><div class="bar-track">
    <div class="bar-fill ${kind}" style="width:${value / maxRate * 100}%"></div>
    </div><strong>${pct(value)}</strong></div>`).join("");
  document.querySelector("#ci-label").textContent =
    `95% confidence interval: ${signedPct(r.primary.ci_low)} → ${signedPct(r.primary.ci_high)}`;
  const scaleMin = -.05, scaleMax = .05;
  const left = Math.max(0, (r.primary.ci_low - scaleMin) / (scaleMax - scaleMin) * 100);
  const right = Math.min(100, (r.primary.ci_high - scaleMin) / (scaleMax - scaleMin) * 100);
  const range = document.querySelector("#ci-range");
  range.style.left = `${left}%`;
  range.style.width = `${Math.max(2, right - left)}%`;

  const breached = r.guardrails.some(item => item.breached);
  const status = document.querySelector("#guardrail-status");
  status.textContent = breached ? "BREACHED" : "HEALTHY";
  status.className = `tag ${breached ? "bad" : "good"}`;
  document.querySelector("#guardrail-list").innerHTML = r.guardrails.map(item => `
    <div class="guardrail ${item.breached ? "breached" : ""}">
      <strong>${item.metric}</strong>
      <span>${pct(item.control_rate)} → ${pct(item.treatment_rate)} · p=${item.p_value.toFixed(4)}</span>
      <b>${item.breached ? "VETO" : "PASS"}</b>
    </div>`).join("");
}

function renderIntegrity() {
  const r = report();
  document.querySelector("#srm-p").textContent = r.srm_p_value < .0001 ? "<0.0001" : r.srm_p_value.toFixed(4);
  document.querySelector("#srm-copy").textContent = r.srm_detected ? "allocation mismatch" : "50/50 assignment healthy";
  document.querySelector("#exposure-rate").textContent = pct(r.exposure_rate);
  document.querySelector("#itt-lift").textContent = signedPct(r.primary.absolute_lift);
  document.querySelector("#exposed-lift").textContent = signedPct(r.exposed_only_lift);
  const exposureGap = Math.abs(r.exposed_only_lift - r.primary.absolute_lift) > .005;
  const guardsBroken = r.guardrails.some(item => item.breached);
  const gates = [
    ["Eligibility & assignment", !r.srm_detected, r.srm_detected ? "FAIL · SRM" : "PASS"],
    ["Exposure reconciliation", !exposureGap, exposureGap ? "REVIEW" : "PASS"],
    ["Primary confidence interval", r.primary.ci_low > 0, r.primary.ci_low > 0 ? "PASS" : "OPEN"],
    ["Guardrail veto", !guardsBroken, guardsBroken ? "FAIL" : "PASS"],
    ["Durability", !r.novelty_detected, r.novelty_detected ? "WAIT" : "PASS"]
  ];
  document.querySelector("#trust-gates").innerHTML = gates.map(([label, pass, copy]) =>
    `<li><span>${label}</span><b class="${pass ? "" : "fail"}">${copy}</b></li>`).join("");
}

function renderSegments() {
  const r = report();
  const max = Math.max(...r.segments.flatMap(item => [item.control_rate, item.treatment_rate])) * 1.1;
  document.querySelector("#segment-bars").innerHTML = r.segments.map(item => `
    <div class="segment-block">
      <strong>${item.segment.toUpperCase()} · ${num(item.users)} users · lift ${signedPct(item.absolute_lift)}</strong>
      <div class="bar-row"><span>Control</span><div class="bar-track"><div class="bar-fill" style="width:${item.control_rate/max*100}%"></div></div><b>${pct(item.control_rate)}</b></div>
      <div class="bar-row"><span>Treatment</span><div class="bar-track"><div class="bar-fill treatment" style="width:${item.treatment_rate/max*100}%"></div></div><b>${pct(item.treatment_rate)}</b></div>
    </div>`).join("");
  const simpson = document.querySelector("#simpson-tag");
  simpson.textContent = r.simpson_detected ? "MIX CONFOUNDING" : "DIRECTION CONSISTENT";
  simpson.className = `tag ${r.simpson_detected ? "bad" : "good"}`;
  document.querySelector("#cuped-reduction").textContent = pct(r.cuped_variance_reduction);
  document.querySelector("#variance-after").style.width = `${(1-r.cuped_variance_reduction)*100}%`;
  const novelty = document.querySelector("#novelty-tag");
  novelty.textContent = r.novelty_detected ? "DECAY DETECTED" : "DURABLE";
  novelty.className = `tag ${r.novelty_detected ? "bad" : "good"}`;
  const values = [["Early cohort", r.early_lift], ["Late cohort", r.late_lift]];
  const scale = Math.max(.01, ...values.map(item => Math.abs(item[1]))) * 1.2;
  document.querySelector("#cohort-bars").innerHTML = values.map(([label, value]) => `
    <div class="bar-row"><span>${label}</span><div class="bar-track"><div class="bar-fill treatment" style="width:${Math.abs(value)/scale*100}%"></div></div><strong>${signedPct(value)}</strong></div>`).join("");
}

function setupLabs() {
  const picker = document.querySelector("#lab-picker");
  Object.entries(state.data.labs).forEach(([id, lab], index) => {
    const button = document.createElement("button");
    button.textContent = `${id} · ${lab.title}`;
    button.classList.toggle("active", index === 0);
    button.addEventListener("click", () => {
      state.lab = id;
      picker.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
      renderLab();
    });
    picker.appendChild(button);
  });
  document.querySelector("#reveal-button").addEventListener("click", () => {
    document.querySelector("#lab-answer").classList.toggle("hidden");
  });
  renderLab();
}

function renderLab() {
  const lab = state.data.labs[state.lab];
  const r = state.data.reports[lab.scenario];
  document.querySelector("#lab-number").textContent = `${state.lab} · ${r.title}`;
  document.querySelector("#lab-title").textContent = lab.title;
  document.querySelector("#lab-question").textContent = lab.question;
  document.querySelector("#lab-clarify").innerHTML = lab.clarify.map(item => `<li>${item}</li>`).join("");
  document.querySelector("#lab-decision").textContent = r.decision;
  document.querySelector("#lab-evidence").textContent = lab.evidence;
  document.querySelector("#lab-rationale").textContent = r.rationale;
  document.querySelector("#lab-answer").classList.add("hidden");
}

function renderLearning() {
  const days = [
    ["Day 1", "Grain, estimand & metric contract", "Define randomization unit, ITT population and primary metric before query."],
    ["Day 2", "SRM & data lineage", "Reconcile eligibility, assignment, exposure and outcome joins."],
    ["Day 3", "Effect size & confidence", "Explain absolute lift, uncertainty and practical significance."],
    ["Day 4", "Guardrails & decision rights", "Defend HOLD when conversion wins but product safety regresses."],
    ["Day 5", "Novelty & sequential peeking", "Separate early excitement from durable cohort behavior."],
    ["Day 6", "Segments, Simpson & CUPED", "Control mix, inspect heterogeneity and reduce variance safely."],
    ["Day 7", "90-second review board", "Recommend SHIP/HOLD/WAIT/INVALID with evidence and limitation."]
  ];
  document.querySelector("#learning-grid").innerHTML = days.map(([day, title, copy]) =>
    `<article class="learning-day"><span>${day}</span><h3>${title}</h3><p>${copy}</p></article>`).join("");
}

loadData().catch(error => {
  document.body.innerHTML = `<pre style="padding:30px">Failed to load recorded lab: ${error}</pre>`;
});

