const GRID_SIZE = 10;
const STORAGE_KEY = "good_baby_stamp_v2";
const USE_PIN = true;
const STAMP_PIN = "980512";

const REWARDS = [
  { id: "r1", title: "喝一杯喜歡的手搖飲", cost: 3 },
  { id: "r2", title: "免做一次指定小事", cost: 5 },
  { id: "r3", title: "一起吃頓好料大餐", cost: 10 },
];

const gridEl = document.getElementById("grid");
const countEl = document.getElementById("count");
const milestoneTextEl = document.getElementById("milestoneText");
const reasonInputEl = document.getElementById("reasonInput");
const stampBtn = document.getElementById("stampBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const rewardListEl = document.getElementById("rewardList");
const historyListEl = document.getElementById("historyList");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");

let state = loadState();
let lastAnimatedIndex = -1;

// 在「獎勵兌換區」上方動態加入「自訂扣點」區塊，不用另外改 HTML
const deductBox = document.createElement("div");
deductBox.className = "stamp-box";
deductBox.style.marginBottom = "14px";
deductBox.innerHTML = `
  <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
    <input
      id="deductAmountInput"
      type="number"
      min="1"
      value="1"
      style="width:78px; margin-bottom:0; text-align:center;"
    />
    <input
      id="deductReasonInput"
      type="text"
      maxlength="30"
      placeholder="扣點原因（例如：犯規、兌換小東西）"
      style="flex:1; min-width:150px; margin-bottom:0;"
    />
    <button id="deductBtn" type="button" class="danger-ghost">扣點</button>
  </div>
`;
rewardListEl.parentElement.insertBefore(deductBox, rewardListEl);

const deductAmountInputEl = document.getElementById("deductAmountInput");
const deductReasonInputEl = document.getElementById("deductReasonInput");
const deductBtn = document.getElementById("deductBtn");

function defaultState() {
  return {
    points: 0,
    rotations: [],
    history: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return {
      points: Number(parsed.points) || 0,
      rotations: Array.isArray(parsed.rotations) ? parsed.rotations : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function syncRotationsToPoints() {
  const activeInPage =
    state.points % GRID_SIZE === 0 && state.points > 0
      ? GRID_SIZE
      : state.points % GRID_SIZE;

  while (state.rotations.length < activeInPage) {
    state.rotations.push(Math.floor(Math.random() * 17) - 8);
  }
  if (state.rotations.length > activeInPage) {
    state.rotations = state.rotations.slice(0, activeInPage);
  }
}

function formatNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function verifyPin(actionLabel) {
  if (!USE_PIN) return true;
  const input = prompt(`請輸入「${actionLabel}」密碼：`);
  if (input === null) return false;
  if (input !== STAMP_PIN) {
    alert("密碼錯誤，操作已取消！");
    return false;
  }
  return true;
}

function playStampSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(68, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    // 瀏覽器未授權音效時略過
  }
}

function renderGrid() {
  gridEl.innerHTML = "";
  const activeInPage =
    state.points % GRID_SIZE === 0 && state.points > 0
      ? GRID_SIZE
      : state.points % GRID_SIZE;

  for (let i = 0; i < GRID_SIZE; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";

    if (i < activeInPage) {
      const stamp = document.createElement("div");
      stamp.className = "stamp";
      if (i === lastAnimatedIndex) {
        stamp.classList.add("pop");
      }
      const rot = state.rotations[i] ?? -6;
      stamp.style.setProperty("--rot", `${rot}deg`);
      stamp.textContent = "乖寶寶";
      slot.appendChild(stamp);
    }

    gridEl.appendChild(slot);
  }

  countEl.textContent = state.points;
  const completedRounds = Math.floor(state.points / GRID_SIZE);
  milestoneTextEl.textContent =
    `本輪集點進度：${activeInPage} / ${GRID_SIZE}` +
    (completedRounds > 0 ? `（已完成 ${completedRounds} 輪）` : "");
}

function renderRewards() {
  rewardListEl.innerHTML = "";
  REWARDS.forEach((reward) => {
    const item = document.createElement("div");
    item.className = "reward-item";

    const info = document.createElement("div");
    info.className = "reward-info";
    info.innerHTML = `${reward.title}<span class="reward-cost">需要 ${reward.cost} 顆章</span>`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "redeem-btn";
    btn.textContent = "兌換";
    btn.disabled = state.points < reward.cost;
    btn.addEventListener("click", () => redeemReward(reward));

    item.append(info, btn);
    rewardListEl.appendChild(item);
  });
}

function renderHistory() {
  historyListEl.innerHTML = "";
  if (state.history.length === 0) {
    historyListEl.innerHTML = `<p class="empty-tip">還沒有任何紀錄，快蓋下第一個乖寶寶章吧！</p>`;
    return;
  }

  state.history.forEach((entry) => {
    const li = document.createElement("li");
    li.className = `history-item ${entry.type === "redeem" ? "redeem" : ""}`;
    li.innerHTML = `
      <div>${entry.text}</div>
      <div class="history-meta">${entry.time}</div>
    `;
    historyListEl.appendChild(li);
  });
}

function renderAll() {
  syncRotationsToPoints();
  renderGrid();
  renderRewards();
  renderHistory();
  deductBtn.disabled = state.points <= 0;
  undoBtn.disabled = state.history.length === 0;
  resetBtn.disabled = state.points === 0 && state.history.length === 0;
}

function addStamp() {
  if (!verifyPin("蓋章")) return;

  const reason = reasonInputEl.value.trim() || "表現超棒獲得乖寶寶章";
  state.points += 1;

  const posInPage = (state.points - 1) % GRID_SIZE;
  const randomAngle = Math.floor(Math.random() * 17) - 8;
  if (posInPage === 0) {
    state.rotations = [randomAngle];
  } else {
    state.rotations[posInPage] = randomAngle;
  }
  lastAnimatedIndex = posInPage;

  state.history.unshift({
    id: Date.now() + Math.random(),
    type: "stamp",
    delta: 1,
    reason,
    text: `獲得 +1 章｜${reason}`,
    time: formatNow(),
  });

  reasonInputEl.value = "";
  playStampSound();
  saveState();
  renderAll();
}

function deductPoints() {
  if (state.points <= 0) return;
  const rawAmount = Math.floor(Number(deductAmountInputEl.value));
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    alert("請輸入大於 0 的扣點數量！");
    return;
  }
  if (rawAmount > state.points) {
    alert(`目前只有 ${state.points} 顆章，無法扣 ${rawAmount} 顆！`);
    return;
  }
  if (!verifyPin("扣點")) return;

  const reason = deductReasonInputEl.value.trim() || "手動扣點";
  state.points -= rawAmount;
  lastAnimatedIndex = -1;

  state.history.unshift({
    id: Date.now() + Math.random(),
    type: "redeem",
    delta: -rawAmount,
    reason,
    text: `扣點 -${rawAmount} 章｜${reason}`,
    time: formatNow(),
  });

  deductReasonInputEl.value = "";
  deductAmountInputEl.value = "1";
  saveState();
  renderAll();
}

function redeemReward(reward) {
  if (state.points < reward.cost) return;
  if (!verifyPin("兌換獎勵")) return;

  state.points -= reward.cost;
  lastAnimatedIndex = -1;

  state.history.unshift({
    id: Date.now() + Math.random(),
    type: "redeem",
    delta: -reward.cost,
    rewardTitle: reward.title,
    text: `兌換「${reward.title}」(-${reward.cost} 章)`,
    time: formatNow(),
  });

  saveState();
  renderAll();
}

function undoLast() {
  if (state.history.length === 0) return;
  if (!verifyPin("撤銷上一筆")) return;

  const last = state.history.shift();
  state.points = Math.max(0, state.points - (last.delta || 0));
  lastAnimatedIndex = -1;

  saveState();
  renderAll();
}

function resetAll() {
  if (!confirm("確定要清空所有章數與歷史紀錄嗎？")) return;
  if (!verifyPin("清空全部")) return;

  state = defaultState();
  lastAnimatedIndex = -1;
  saveState();
  renderAll();
}

async function exportSave() {
  const payload = JSON.stringify(state);
  try {
    await navigator.clipboard.writeText(payload);
    alert("存檔代碼已複製到剪貼簿！可以貼到另一台裝置導入。");
  } catch {
    prompt("請手動複製以下存檔代碼：", payload);
  }
}

function importSave() {
  const raw = prompt("請貼上之前複製的存檔代碼（會覆蓋目前紀錄）：");
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw.trim());
    state = {
      points: Math.max(0, Number(parsed.points) || 0),
      rotations: Array.isArray(parsed.rotations) ? parsed.rotations : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
    lastAnimatedIndex = -1;
    saveState();
    renderAll();
    alert("存檔導入成功！");
  } catch {
    alert("存檔格式不正確，導入失敗！");
  }
}

stampBtn.addEventListener("click", addStamp);
reasonInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addStamp();
});
deductBtn.addEventListener("click", deductPoints);
deductReasonInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") deductPoints();
});
undoBtn.addEventListener("click", undoLast);
resetBtn.addEventListener("click", resetAll);
exportBtn.addEventListener("click", exportSave);
importBtn.addEventListener("click", importSave);

renderAll();
