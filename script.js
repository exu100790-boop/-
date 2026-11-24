const GRID_SIZE = 10;
const MAX_POINTS = 20;
const STORAGE_KEY = "good_baby_stamp_v2";
const USE_PIN = true;
const STAMP_PIN = "980512";

const FIREBASE_DB_URL = "https://babycard-87f1b-default-rtdb.asia-southeast1.firebasedatabase.app";

const REWARDS = [
  { id: "r1", title: "100元以下商品／美食兌換", cost: 2 },
  { id: "r2", title: "100元～200元 商品", cost: 3 },
  { id: "r3", title: "200元～300元 商品", cost: 4 },
  { id: "r4", title: "300元～400元 商品", cost: 5 },
  { id: "r5", title: "400元～500元 商品", cost: 6 },
  { id: "r6", title: "500元～600元 商品", cost: 7 },
  { id: "r7", title: "600元～700元 商品", cost: 8 },
  { id: "r8", title: "700元～800元 商品", cost: 9 },
  { id: "r9", title: "800元～900元 商品", cost: 10 },
  { id: "r10", title: "900元～1000元 商品", cost: 11 },
  { id: "r11", title: "吃大餐", cost: 20 },
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
const refreshBtn = document.getElementById("refreshBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const syncStatusEl = document.getElementById("syncStatus");

const mascotBox = document.getElementById("mascotBox");
const mascotFrame = document.getElementById("mascotFrame");
const speechBubble = document.getElementById("speechBubble");

const KUROMI_LINES = [
  "哼哼，表現不錯嘛！繼續保持～",
  "再多集幾顆章就可以換獎勵囉！",
  "今天也有乖乖聽話嗎？",
  "庫洛米正在盯著你的集點卡喔！",
  "超棒的！離大獎又更近一步了！",
];

let state = loadLocalState();
let lastAnimatedIndex = -1;

// 動態建立自訂扣點區塊
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

function setSyncStatus(text) {
  if (syncStatusEl) syncStatusEl.textContent = text;
}

function isCloudConfigured() {
  return FIREBASE_DB_URL && !FIREBASE_DB_URL.includes("你的專案名稱");
}

function getCloudEndpoint() {
  return `${FIREBASE_DB_URL.replace(/\/+$/, "")}/kuromi_card.json`;
}

function triggerKuromiCheer(customLine) {
  if (!mascotFrame || !speechBubble) return;
  if (customLine) {
    speechBubble.textContent = customLine;
  } else {
    const pick = KUROMI_LINES[Math.floor(Math.random() * KUROMI_LINES.length)];
    speechBubble.textContent = pick;
  }
  mascotFrame.classList.remove("cheer");
  void mascotFrame.offsetWidth;
  mascotFrame.classList.add("cheer");
}

function defaultState() {
  return {
    points: 0,
    rotations: [],
    history: [],
    updatedAt: 0,
  };
}

function normalizeState(parsed) {
  return {
    points: Math.min(MAX_POINTS, Math.max(0, Number(parsed?.points) || 0)),
    rotations: Array.isArray(parsed?.rotations) ? parsed.rotations : [],
    history: Array.isArray(parsed?.history) ? parsed.history : [],
    updatedAt: Number(parsed?.updatedAt) || 0,
  };
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

async function saveState() {
  state.points = Math.min(MAX_POINTS, Math.max(0, state.points));
  state.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  if (!isCloudConfigured()) {
    setSyncStatus("僅本機儲存");
    return;
  }

  setSyncStatus("雲端同步中...");
  try {
    const res = await fetch(getCloudEndpoint(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!res.ok) throw new Error("Upload failed");
    setSyncStatus("已同步至雲端 ✓");
  } catch {
    setSyncStatus("雲端離線（已存本機）");
  }
}

async function loadCloudState(showToast = false) {
  if (!isCloudConfigured()) {
    setSyncStatus("尚未填寫雲端網址");
    return;
  }

  setSyncStatus("讀取雲端中...");
  try {
    const res = await fetch(getCloudEndpoint());
    if (!res.ok) throw new Error("Fetch failed");
    const remoteRaw = await res.json();

    if (remoteRaw && typeof remoteRaw === "object") {
      const remote = normalizeState(remoteRaw);
      if (remote.updatedAt >= state.updatedAt || (state.points === 0 && state.history.length === 0)) {
        state = remote;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        lastAnimatedIndex = -1;
        renderAll();
      } else if (state.points > 0 || state.history.length > 0) {
        await saveState();
      }
    } else if (state.points > 0 || state.history.length > 0) {
      await saveState();
    }

    setSyncStatus("已同步至雲端 ✓");
    if (showToast) triggerKuromiCheer("已經跟雲端同步到最新進度囉！");
  } catch {
    setSyncStatus("雲端連線失敗");
  }
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

function createKuromiStampElement(rot, shouldPop) {
  const stamp = document.createElement("div");
  stamp.className = "stamp";
  if (shouldPop) {
    stamp.classList.add("pop");
  }
  stamp.style.setProperty("--rot", `${rot}deg`);
  stamp.innerHTML = `
    <svg viewBox="0 0 120 110" aria-hidden="true">
      <polygon points="22,55 12,10 48,35" fill="#2b262d" />
      <polygon points="98,55 108,10 72,35" fill="#2b262d" />
      <circle cx="12" cy="10" r="5" fill="#ff8fb1" />
      <circle cx="108" cy="10" r="5" fill="#ff8fb1" />
      <ellipse cx="60" cy="64" rx="38" ry="32" fill="#2b262d" />
      <ellipse cx="60" cy="69" rx="28" ry="22" fill="#ffffff" />
      <circle cx="60" cy="44" r="7" fill="#ff8fb1" />
      <ellipse cx="48" cy="68" rx="3.5" ry="5" fill="#2b262d" />
      <ellipse cx="72" cy="68" rx="3.5" ry="5" fill="#2b262d" />
      <ellipse cx="60" cy="73" rx="3" ry="2" fill="#ff8fb1" />
      <path d="M54 79 Q60 85 66 79" stroke="#2b262d" stroke-width="2.5" fill="none" stroke-linecap="round" />
    </svg>
    <span class="stamp-label">庫洛米</span>
  `;
  return stamp;
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
      const rot = state.rotations[i] ?? -6;
      const stamp = createKuromiStampElement(rot, i === lastAnimatedIndex);
      slot.appendChild(stamp);
    }

    gridEl.appendChild(slot);
  }

  countEl.textContent = `${state.points} / ${MAX_POINTS}`;
  const completedRounds = Math.floor(state.points / GRID_SIZE);
  milestoneTextEl.textContent =
    `本輪集點進度：${activeInPage} / ${GRID_SIZE}` +
    (completedRounds > 0 ? `（已完成 ${completedRounds} 輪，上限 ${MAX_POINTS} 顆）` : `（上限 ${MAX_POINTS} 顆）`);
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
  state.points = Math.min(MAX_POINTS, Math.max(0, state.points));
  syncRotationsToPoints();
  renderGrid();
  renderRewards();
  renderHistory();
  stampBtn.disabled = state.points >= MAX_POINTS;
  deductBtn.disabled = state.points <= 0;
  undoBtn.disabled = state.history.length === 0;
  resetBtn.disabled = state.points === 0 && state.history.length === 0;
}

function addStamp() {
  if (state.points >= MAX_POINTS) {
    alert(`已經集滿最高上限 ${MAX_POINTS} 顆章囉！先去兌換獎勵吧～`);
    return;
  }
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
  renderAll();
  saveState();
  triggerKuromiCheer(
    state.points >= MAX_POINTS
      ? `哇！集滿 ${MAX_POINTS} 顆章啦！可以換吃大餐囉！`
      : "耶！成功蓋下一顆庫洛米章！"
  );
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
  renderAll();
  saveState();
  triggerKuromiCheer("哎呀被扣點了，下次要加油喔！");
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

  renderAll();
  saveState();
  triggerKuromiCheer(`哇～成功兌換「${reward.title}」囉！`);
}

function undoLast() {
  if (state.history.length === 0) return;
  if (!verifyPin("撤銷上一筆")) return;

  const last = state.history.shift();
  state.points = Math.min(MAX_POINTS, Math.max(0, state.points - (last.delta || 0)));
  lastAnimatedIndex = -1;

  renderAll();
  saveState();
}

function resetAll() {
  if (!confirm("確定要清空所有章數與歷史紀錄嗎？")) return;
  if (!verifyPin("清空全部")) return;

  state = defaultState();
  lastAnimatedIndex = -1;
  renderAll();
  saveState();
}

async function exportSave() {
  const payload = JSON.stringify(state);
  try {
    await navigator.clipboard.writeText(payload);
    alert("存檔代碼已複製到剪貼簿！");
  } catch {
    prompt("請手動複製以下存檔代碼：", payload);
  }
}

function importSave() {
  const raw = prompt("請貼上之前複製的存檔代碼（會覆蓋目前紀錄）：");
  if (!raw) return;
  try {
    state = normalizeState(JSON.parse(raw.trim()));
    lastAnimatedIndex = -1;
    renderAll();
    saveState();
    alert("存檔匯入成功並已同步！");
  } catch {
    alert("存檔格式不正確，匯入失敗！");
  }
}

if (mascotBox) {
  mascotBox.addEventListener("click", () => triggerKuromiCheer());
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
if (refreshBtn) refreshBtn.addEventListener("click", () => loadCloudState(true));
exportBtn.addEventListener("click", exportSave);
importBtn.addEventListener("click", importSave);

renderAll();
loadCloudState(false);
