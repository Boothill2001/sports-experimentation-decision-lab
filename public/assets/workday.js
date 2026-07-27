const storageKey = "sports-exp-workday-v1";
const state = {
  report: null,
  current: 0,
  completed: new Set(),
  hintOpen: false
};

const percent = value => `${(value * 100).toFixed(2)}%`;
const pp = value => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)} pp`;
const pValue = value => value < .0001 ? "<0.0001" : value.toFixed(4);

function missionData(report) {
  const crash = report.guardrails.find(item => item.metric === "Crash rate");

  return [
    {
      time: "09:00",
      short: "Nhận task",
      title: "Hiểu quyết định trước khi mở SQL",
      sender: ["Linh", "Product Manager", "L"],
      message: "Match Center v2 đang tăng subscription khoảng 28%. Team muốn rollout 100% trước trận đấu cuối tuần. Em kiểm tra giúp có nên triển khai không và gửi recommendation trước 16:00 nhé.",
      goal: "Chuyển một yêu cầu mơ hồ thành quyết định, phạm vi và đầu ra rõ ràng.",
      questions: [
        "PM đang cần quyết định điều gì: xem dashboard hay rollout sản phẩm?",
        "Deadline thật sự là lúc nào và tại sao lại gấp?",
        "Ai là người sở hữu quyết định rollout cuối cùng?",
        "PM muốn nhận một con số, dashboard hay recommendation có lý do?"
      ],
      hint: "Tìm ba danh từ trong tin nhắn: decision, deadline và deliverable. Chưa cần hỏi dữ liệu nằm ở bảng nào.",
      actions: [
        "Mở bảng events và viết SQL tính conversion ngay.",
        "Xác nhận decision, deadline, decision owner và dạng đầu ra trước.",
        "Trả lời rằng conversion tăng 28% nên có thể ship."
      ],
      correct: 1,
      success: "Đúng. Analyst cần biết mình đang hỗ trợ quyết định nào trước khi chọn metric hoặc query.",
      wrong: "Chưa vội query hay kết luận. Nếu scope sai, một câu SQL đúng vẫn có thể trả lời sai câu hỏi kinh doanh.",
      deliverable: `
        <div class="deliverable-preview">
          <header>SLACK · SCOPE CONFIRMATION</header>
          <p>Em sẽ review bốn lớp: experiment integrity, primary effect,
guardrails và durability. Em gửi recommendation cùng limitation,
owner và next action trước 16:00. Cho em xác nhận user_id là
randomization unit và crash rate là blocking guardrail nhé.</p>
        </div>`,
      coach: [
        "Đừng mở SQL quá sớm.",
        "Task của analyst bắt đầu bằng một quyết định kinh doanh, không bắt đầu bằng tên bảng.",
        "Scope trước. Query sau."
      ]
    },
    {
      time: "09:30",
      short: "Chốt contract",
      title: "Định nghĩa thế nào là một kết quả đúng",
      sender: ["Linh", "Product Manager", "L"],
      message: "Đúng rồi: randomize theo user_id, primary metric là subscription trong 7 ngày. Crash và cancellation đều là guardrail; crash có quyền chặn rollout.",
      goal: "Viết metric contract để Product, Engineering và Analytics đang nói cùng một ngôn ngữ.",
      questions: [
        "Một dòng trong bảng assignment đại diện cho user, device hay session?",
        "Mẫu số conversion là assigned users hay chỉ những người đã mở tính năng?",
        "Subscription phải xảy ra trong cửa sổ bao nhiêu ngày?",
        "Metric nào có quyền biến một conversion win thành HOLD?"
      ],
      hint: "Hãy chốt grain, population, time window, primary metric và veto metric.",
      actions: [
        "Dùng exposed users vì họ thật sự nhìn thấy tính năng.",
        "Đổi primary metric sau khi thấy metric khác đẹp hơn.",
        "Giữ ITT population, 7-day subscription và predeclared guardrails."
      ],
      correct: 2,
      success: "Đúng. ITT giữ nguyên randomization; metric và guardrail phải được chốt trước khi đọc kết quả.",
      wrong: "Exposed-only là diagnostic, không phải population chính. Đổi metric sau khi xem kết quả cũng làm quyết định thiếu tin cậy.",
      deliverable: `
        <div class="deliverable-preview">
          <header>EXPERIMENT CONTRACT</header>
          <ul>
            <li>Randomization unit: user_id</li>
            <li>Estimand: intent-to-treat</li>
            <li>Primary: 7-day subscription conversion</li>
            <li>Vetoes: crash rate, cancellation rate</li>
            <li>Confidence: 95%, two-sided</li>
          </ul>
        </div>`,
      coach: [
        "Metric không chỉ là công thức.",
        "Một metric hoàn chỉnh phải có population, event, time window và aggregation.",
        "Không có contract, không có một nguồn sự thật."
      ]
    },
    {
      time: "10:00",
      short: "Check integrity",
      title: "Kiểm tra xem thí nghiệm có đáng tin không",
      sender: ["Data Bot", "Automated quality report", "D"],
      message: `20,000 users được assign. Control ${report.primary.control_n.toLocaleString("en-US")}, Treatment ${report.primary.treatment_n.toLocaleString("en-US")}. Exposure rate ${percent(report.exposure_rate)}. Không phát hiện crossover.`,
      goal: "Xác nhận eligibility, assignment, exposure và outcome trước khi diễn giải lift.",
      questions: [
        "Control và Treatment có gần tỷ lệ kế hoạch 50/50 không?",
        "SRM p-value có cho thấy sample-ratio mismatch không?",
        "Có user nào xuất hiện trong cả hai variant không?",
        "Outcome đã đủ cửa sổ 7 ngày và giữ nguyên assigned population chưa?"
      ],
      hint: "Integrity trả lời 'có thể diễn giải không?', không trả lời 'treatment có tốt không?'.",
      actions: [
        "Integrity đạt; tiếp tục đọc effect nhưng vẫn ghi exposure là diagnostic.",
        "Loại toàn bộ user không exposed rồi tính lại primary metric.",
        "Bỏ qua integrity vì p-value của conversion rất nhỏ."
      ],
      correct: 0,
      success: "Đúng. Assignment cân bằng, không crossover và ITT được giữ. Thí nghiệm đủ điều kiện để đọc effect.",
      wrong: "Không được lọc population sau assignment hoặc dùng significance của outcome để che lỗi integrity.",
      deliverable: `
        <div class="deliverable-preview">
          <header>INTEGRITY CHECKLIST</header>
          <ul>
            <li>Eligibility: PASS</li>
            <li>Random assignment: PASS · SRM p=${report.srm_p_value.toFixed(4)}</li>
            <li>Exposure lineage: PASS · ${percent(report.exposure_rate)}</li>
            <li>Outcome completeness: PASS</li>
            <li>Crossover: 0 users</li>
          </ul>
        </div>`,
      coach: [
        "Đừng hỏi 'significant chưa?' đầu tiên.",
        "Một thí nghiệm không interpretable thì effect size đẹp đến đâu cũng không cứu được.",
        "Trust trước. Effect sau."
      ]
    },
    {
      time: "11:00",
      short: "Đọc effect",
      title: "Biến một con số thành business evidence",
      sender: ["Experiment Engine", "Intent-to-treat result", "E"],
      message: `Control ${percent(report.primary.control_rate)}, Treatment ${percent(report.primary.treatment_rate)}. Absolute lift ${pp(report.primary.absolute_lift)}; 95% CI ${pp(report.primary.ci_low)} đến ${pp(report.primary.ci_high)}.`,
      goal: "Diễn giải magnitude và uncertainty thay vì chỉ đọc p-value.",
      questions: [
        "Absolute lift là bao nhiêu điểm phần trăm?",
        "Relative lift khác absolute lift như thế nào?",
        "Confidence interval có đi qua zero không?",
        "Khoảng tác động hợp lý mà business nên kỳ vọng là bao nhiêu?"
      ],
      hint: "Nói theo thứ tự: baseline → absolute lift → interval → ý nghĩa kinh doanh.",
      actions: [
        `Báo "p=${pValue(report.primary.p_value)}, significant" rồi kết thúc phân tích.`,
        `Báo treatment tăng ${pp(report.primary.absolute_lift)}, 95% CI từ ${pp(report.primary.ci_low)} đến ${pp(report.primary.ci_high)}, sau đó kiểm tra safety.`,
        "Đổi sang exposed-only vì lift của nhóm này cao hơn."
      ],
      correct: 1,
      success: "Đúng. Effect có magnitude và uncertainty rõ; đây mới là evidence, chưa phải quyết định ship.",
      wrong: "P-value không nói effect lớn bao nhiêu, còn exposed-only có thể làm hỏng causal interpretation.",
      deliverable: `
        <div class="deliverable-preview">
          <header>PRIMARY EFFECT NOTE</header>
          <p>Treatment tăng 7-day subscription ${pp(report.primary.absolute_lift)}
(${(report.primary.relative_lift * 100).toFixed(1)}% relative). 95% CI từ
${pp(report.primary.ci_low)} đến ${pp(report.primary.ci_high)} và không đi
qua zero. Primary effect tích cực; cần kiểm tra blocking guardrails
trước khi đưa recommendation.</p>
        </div>`,
      coach: [
        "Significant chưa có nghĩa là nên ship.",
        "Confidence interval cho business thấy mức tác động nào còn hợp lý, không chỉ có/không có effect.",
        "Magnitude + uncertainty, không chỉ p-value."
      ]
    },
    {
      time: "13:00",
      short: "Check safety",
      title: "Cho guardrail quyền phủ quyết",
      sender: ["Quality Monitor", "Treatment safety alert", "Q"],
      message: `Crash rate tăng từ ${percent(crash.control_rate)} lên ${percent(crash.treatment_rate)} (${pp(crash.absolute_change)}), p=${pValue(crash.p_value)}. Cancellation không breach.`,
      goal: "Quyết định primary win có an toàn để rollout hay không.",
      questions: [
        "Crash rate đã được khai báo là blocking guardrail chưa?",
        "Mức tăng crash là bao nhiêu điểm phần trăm?",
        "Regression có đủ rõ để xem là product harm không?",
        "Conversion thắng có được phép xóa bỏ guardrail breach không?"
      ],
      hint: "Guardrail được chốt trước để ngăn team hợp lý hóa rủi ro sau khi thấy một primary win đẹp.",
      actions: [
        "SHIP vì subscription tăng 28.3% relative.",
        "WAIT vì cần thêm user để p-value conversion nhỏ hơn.",
        "HOLD rollout và điều tra crash regression trước."
      ],
      correct: 2,
      success: "Đúng. Blocking guardrail đã breach, nên recommendation chuyển từ SHIP thành HOLD.",
      wrong: "Một primary-metric win không có quyền xóa product harm đã được định nghĩa trước.",
      deliverable: `
        <div class="deliverable-preview">
          <header>SAFETY REVIEW</header>
          <p>DECISION GATE: HOLD

Subscription tăng ${pp(report.primary.absolute_lift)}, nhưng crash rate tăng
${pp(crash.absolute_change)} và breach blocking guardrail. Không rollout
100% cho đến khi xác định và sửa nguyên nhân.</p>
        </div>`,
      coach: [
        "Một win có thể vẫn gây hại.",
        "Guardrail tồn tại để bảo vệ user và buộc team tôn trọng decision rule đã thống nhất.",
        "Primary win + product harm = HOLD."
      ]
    },
    {
      time: "14:00",
      short: "Tìm nguyên nhân",
      title: "Biến phát hiện thành một investigation có owner",
      sender: ["Minh", "Mobile Engineering Lead", "M"],
      message: "Team Mobile có thể kiểm tra, nhưng cần Analytics khoanh vùng platform, app version và error signature. Em gửi impact breakdown giúp anh nhé.",
      goal: "Khoanh vùng rủi ro đủ cụ thể để Engineering hành động, nhưng không biến correlation thành kết luận quá mức.",
      questions: [
        "Crash tập trung ở Android hay iOS?",
        "App version nào đóng góp nhiều nhất vào regression?",
        "Error signature nào tăng mạnh trong Treatment?",
        "Sau khi sửa, ai sẽ chạy lại safety review và theo dõi bao lâu?"
      ],
      hint: "Một follow-up tốt luôn có slice, owner, action và validation criterion.",
      actions: [
        "Gửi toàn bộ event log và bảo Engineering tự tìm.",
        "Khoanh vùng platform/version/signature, giao Mobile làm owner và Analytics re-check sau fix.",
        "Tự sửa mobile crash vì analyst là người phát hiện vấn đề."
      ],
      correct: 1,
      success: "Đúng. Analyst định lượng và khoanh vùng; Engineering sở hữu fix; Analytics sở hữu phép kiểm tra sau fix.",
      wrong: "Đừng đẩy một data dump mơ hồ hoặc nhận ownership ngoài vai trò. Hãy giao một investigation có cấu trúc.",
      deliverable: `
        <div class="deliverable-preview">
          <header>ENGINEERING HANDOFF</header>
          <ul>
            <li>Slice impact theo platform và app_version</li>
            <li>Rank crash error_signature theo treatment delta</li>
            <li>Owner: Mobile Engineering</li>
            <li>Acceptance: crash guardrail trở lại boundary</li>
            <li>Analytics: rerun safety review sau fix</li>
          </ul>
        </div>`,
      coach: [
        "Insight phải dẫn đến hành động.",
        "Một recommendation tốt luôn chỉ rõ ai làm gì, kiểm tra lại bằng điều kiện nào.",
        "Finding → owner → action → validation."
      ]
    },
    {
      time: "15:30",
      short: "Nộp kết quả",
      title: "Giao một decision package có thể sử dụng",
      sender: ["Linh", "Product Manager", "L"],
      message: "Sắp đến giờ review. Em gửi recommendation cuối cùng, bằng chứng chính, limitation và người phụ trách bước tiếp theo nhé.",
      goal: "Tóm tắt một ngày phân tích thành recommendation ngắn, có bằng chứng và trách nhiệm rõ ràng.",
      questions: [
        "Recommendation cuối cùng là SHIP, HOLD, WAIT hay INVALID?",
        "Hai bằng chứng quan trọng nhất hỗ trợ quyết định là gì?",
        "Limitation nào PM cần biết trước khi hành động?",
        "Ai là owner và khi nào Analytics review lại?"
      ],
      hint: "Đặt decision ở dòng đầu. Sau đó mới đến evidence, rationale, next action, owner và limitation.",
      actions: [
        "Gửi link dashboard mà không ghi recommendation.",
        "Gửi tất cả query và yêu cầu PM tự đọc.",
        "Gửi HOLD memo, evidence, limitation, owner và next review."
      ],
      correct: 2,
      success: "Đúng. Đây là khác biệt giữa phân tích xong và giao được một quyết định cho business.",
      wrong: "Dashboard và SQL là evidence, không phải recommendation. Stakeholder cần biết nên làm gì và ai chịu trách nhiệm.",
      deliverable: `
        <div class="deliverable-preview">
          <header>16:00 · DECISION MEMO</header>
          <p>RECOMMENDATION: HOLD

Integrity checks passed. Match Center v2 increased subscription
${pp(report.primary.absolute_lift)}, 95% CI [${pp(report.primary.ci_low)},
${pp(report.primary.ci_high)}]. However, crash rate increased
${pp(crash.absolute_change)} and breached the blocking guardrail.

NEXT: Mobile Engineering investigates the crash regression.
Analytics repeats the safety review after the fix.

LIMITATION: Synthetic seeded evidence demonstrates the method;
it is not a production or Unity Sport result.</p>
        </div>`,
      coach: [
        "Đừng bắt stakeholder tự tìm kết luận.",
        "Đầu ra tốt nhất của analyst là một quyết định rõ, truy ngược được và có bước tiếp theo.",
        "Decision first. Evidence second."
      ]
    }
  ];
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return;
    state.current = Math.min(6, Math.max(0, Number(saved.current) || 0));
    state.completed = new Set((saved.completed || []).filter(index => index >= 0 && index <= 6));
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveProgress() {
  localStorage.setItem(storageKey, JSON.stringify({
    current: state.current,
    completed: [...state.completed]
  }));
}

function renderTimeline(missions) {
  const unlockedThrough = Math.min(6, Math.max(state.current, state.completed.size));
  const timeline = document.querySelector("#timeline");
  timeline.innerHTML = missions.map((mission, index) => {
    const done = state.completed.has(index);
    const locked = index > unlockedThrough;
    return `
      <button type="button" data-index="${index}"
        class="${index === state.current ? "active" : ""} ${done ? "done" : ""} ${locked ? "locked" : ""}"
        ${locked ? "disabled" : ""}>
        <i>${done ? "✓" : String(index + 1).padStart(2, "0")}</i>
        <span>${mission.time}</span><strong>${mission.short}</strong>
      </button>`;
  }).join("");

  timeline.querySelectorAll("button:not(:disabled)").forEach(button => {
    button.addEventListener("click", () => {
      state.current = Number(button.dataset.index);
      state.hintOpen = false;
      saveProgress();
      render();
      document.querySelector("#mission").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const count = state.completed.size;
  document.querySelector("#progress-copy").textContent = `${count} / 7 hoàn thành`;
  document.querySelector("#progress-fill").style.width = `${count / 7 * 100}%`;
}

function renderMission(mission, index) {
  const done = state.completed.has(index);
  document.querySelector("#mission-kicker").textContent = `${mission.time} · CHẶNG ${String(index + 1).padStart(2, "0")}`;
  document.querySelector("#mission-title").textContent = mission.title;
  document.querySelector("#mission-status").textContent = done ? "HOÀN THÀNH" : "ĐANG LÀM";
  document.querySelector("#mission-status").classList.toggle("done", done);
  document.querySelector("#sender-name").textContent = mission.sender[0];
  document.querySelector("#sender-role").textContent = mission.sender[1];
  document.querySelector("#sender-avatar").textContent = mission.sender[2];
  document.querySelector("#inbox-message").textContent = mission.message;
  document.querySelector("#mission-goal").textContent = mission.goal;
  document.querySelector("#question-list").innerHTML = mission.questions.map(question => `<li>${question}</li>`).join("");

  const hint = document.querySelector("#hint-box");
  hint.textContent = mission.hint;
  hint.hidden = !state.hintOpen;
  document.querySelector("#hint-button").textContent = state.hintOpen ? "Ẩn gợi ý" : "Cần gợi ý?";

  const options = document.querySelector("#action-options");
  options.innerHTML = mission.actions.map((action, optionIndex) => `
    <button type="button" data-option="${optionIndex}" data-letter="${String.fromCharCode(65 + optionIndex)}"
      ${done ? "disabled" : ""}>${action}</button>`).join("");
  options.querySelectorAll("button").forEach(button => {
    button.addEventListener("click", () => chooseAction(mission, Number(button.dataset.option)));
  });

  const feedback = document.querySelector("#feedback");
  feedback.hidden = !done;
  feedback.className = "feedback";
  if (done) {
    document.querySelector("#feedback-icon").textContent = "✓";
    document.querySelector("#feedback-title").textContent = "Đúng hướng";
    document.querySelector("#feedback-copy").textContent = mission.success;
    const correctButton = options.querySelector(`[data-option="${mission.correct}"]`);
    if (correctButton) correctButton.classList.add("correct");
  }

  const deliverable = document.querySelector("#deliverable");
  deliverable.setAttribute("aria-disabled", String(!done));
  document.querySelector("#deliverable-body").innerHTML = mission.deliverable;

  document.querySelector("#coach-title").textContent = mission.coach[0];
  document.querySelector("#coach-copy").textContent = mission.coach[1];
  document.querySelector("#coach-rule").textContent = mission.coach[2];

  const previous = document.querySelector("#previous-mission");
  const next = document.querySelector("#next-mission");
  previous.disabled = index === 0;
  next.disabled = !done;
  next.textContent = index === 6 ? "Hoàn thành ngày làm việc →" : "Chặng tiếp theo →";
}

function chooseAction(mission, optionIndex) {
  const isCorrect = optionIndex === mission.correct;
  const options = document.querySelectorAll("#action-options button");
  options.forEach(button => button.classList.remove("selected", "correct", "wrong"));
  const selected = document.querySelector(`#action-options [data-option="${optionIndex}"]`);
  selected.classList.add("selected", isCorrect ? "correct" : "wrong");

  const feedback = document.querySelector("#feedback");
  feedback.hidden = false;
  feedback.classList.toggle("wrong", !isCorrect);
  document.querySelector("#feedback-icon").textContent = isCorrect ? "✓" : "!";
  document.querySelector("#feedback-title").textContent = isCorrect ? "Đúng hướng" : "Chưa đúng — thử lại được";
  document.querySelector("#feedback-copy").textContent = isCorrect ? mission.success : mission.wrong;

  if (!isCorrect) return;
  state.completed.add(state.current);
  saveProgress();
  window.setTimeout(render, 450);
}

function render() {
  const missions = missionData(state.report);
  renderTimeline(missions);
  renderMission(missions[state.current], state.current);
}

function resetDay() {
  localStorage.removeItem(storageKey);
  state.current = 0;
  state.completed.clear();
  state.hintOpen = false;
  document.querySelector("#completion-dialog").close();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupControls() {
  document.querySelector("#hint-button").addEventListener("click", () => {
    state.hintOpen = !state.hintOpen;
    const hint = document.querySelector("#hint-box");
    hint.hidden = !state.hintOpen;
    document.querySelector("#hint-button").textContent = state.hintOpen ? "Ẩn gợi ý" : "Cần gợi ý?";
  });
  document.querySelector("#previous-mission").addEventListener("click", () => {
    if (state.current === 0) return;
    state.current -= 1;
    state.hintOpen = false;
    saveProgress();
    render();
  });
  document.querySelector("#next-mission").addEventListener("click", () => {
    if (!state.completed.has(state.current)) return;
    if (state.current === 6) {
      document.querySelector("#completion-dialog").showModal();
      return;
    }
    state.current += 1;
    state.hintOpen = false;
    saveProgress();
    render();
    document.querySelector("#mission").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.querySelector("#reset-day").addEventListener("click", resetDay);
  document.querySelector("#restart-day").addEventListener("click", resetDay);
  document.querySelector("#completion-close").addEventListener("click", () => {
    document.querySelector("#completion-dialog").close();
  });
}

async function start() {
  const response = await fetch("data/experiments.json");
  if (!response.ok) throw new Error(`Recorded evidence returned ${response.status}`);
  const data = await response.json();
  state.report = data.reports.guardrail;
  loadProgress();
  setupControls();
  render();
}

start().catch(error => {
  document.body.innerHTML = `
    <main style="padding:40px;font-family:system-ui">
      <h1>Không tải được dữ liệu mô phỏng.</h1><pre>${String(error)}</pre>
    </main>`;
});
