const GRID_SIZE = 10;
const STORAGE_KEY = "good_baby_stamp_v2";
const USE_PIN = true;
const STAMP_PIN = "1234"; // 可自行修改盖章/兑换/清空密码

const REWARDS = [
  { id: "r1", title: "喝一杯喜欢的手摇饮", cost: 3 },
  { id: "r2", title: "免做一次指定小事", cost: 5 },
  { id: "r3", title: "一起吃顿好料大餐", cost: 10 },
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

function formatNow() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function verifyPin(actionLabel) {
  if (!USE_PIN) return true;
  const input = prompt(`请输入「${actionLabel}」密码（默认 1234）：`);
  if (input === null) return false;
  if (input !== STAMP_PIN) {
    alert("密码错误，操作已取消！");
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
    // 浏览器未授权音效时略过
  }
}

function renderGrid() {
  gridEl.innerHTML = "";
  const activeInPage = state.points % GRID_SIZE === 0 && state.points > 0
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
      stamp.textContent = "乖宝宝";
      slot.appendChild(stamp);
    }

    gridEl.appendChild(slot);
  }

  countEl.textContent = state.points;
  const completedRounds = Math.floor(state.points / GRID_SIZE);
  milestoneTextEl.textContent =
    `本轮集点进度：${activeInPage} / ${GRID_SIZE}` +
    (completedRounds > 0 ? `（已完成 ${completedRounds} 轮）` : "");
}

function renderRewards() {
  rewardListEl.innerHTML = "";
  REWARDS.forEach((reward) => {
    const item = document.createElement("div");
    item.className = "reward-item";

    const info = document.createElement("div");
    info.className = "reward-info";
    info.innerHTML = `${reward.title}<span class="reward-cost">需要 ${reward.cost} 颗章</span>`;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "redeem-btn";
    btn.textContent = "兑换";
    btn.disabled = state.points < reward.cost;
    btn.addEventListener("click", () => redeemReward(reward));

    item.append(info, btn);
    rewardListEl.appendChild(item);
  });
}

function renderHistory() {
  historyListEl.innerHTML = "";
  if (state.history.length === 0) {
    historyListEl.innerHTML = `<p class="empty-tip">还没有任何纪录，快盖下第一个乖宝宝章吧！</p>`;
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
  renderGrid();
  renderRewards();
  renderHistory();
  undoBtn.disabled = state.history.length === 0;
  resetBtn.disabled = state.points === 0 && state.history.length === 0;
}

function addStamp() {
  if (!verifyPin("盖章")) return;

  const reason = reasonInputEl.value.trim() || "表现超棒获得乖宝宝章";
  state.points += 1;

  const posInPage = ((state.points - 1) % GRID_SIZE);
  const randomAngle = Math.floor(Math.random() * 17) - 8; // -8deg ~ +8deg
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
    text: `获得 +1 章｜${reason}`,
    time: formatNow(),
  });

  reasonInputEl.value = "";
  playStampSound();
  saveState();
  renderAll();
}

function redeemReward(reward) {
  if (state.points < reward.cost) return;
  if (!verifyPin("兑换奖励")) return;

  state.points -= reward.cost;
  const activeInPage = state.points % GRID_SIZE;
  state.rotations = state.rotations.slice(0, activeInPage);
  lastAnimatedIndex = -1;

  state.history.unshift({
    id: Date.now() + Math.random(),
    type: "redeem",
    delta: -reward.cost,
    rewardTitle: reward.title,
    text: `兑换「${reward.title}」(-${reward.cost} 章)`,
    time: formatNow(),
  });

  saveState();
  renderAll();
}

function undoLast() {
  if (state.history.length === 0) return;
  if (!verifyPin("撤销上一笔")) return;

  const last = state.history.shift();
  state.points = Math.max(0, state.points - (last.delta || 0));
  const activeInPage = state.points % GRID_SIZE;
  state.rotations = state.rotations.slice(0, activeInPage);
  lastAnimatedIndex = -1;

  saveState();
  renderAll();
}

function resetAll() {
  if (!confirm("确定要清空所有章数与历史纪录吗？")) return;
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
    alert("存檔代码已复制到剪贴簿！可以贴到另一台装置导入。");
  } catch {
    prompt("请手动复制以下存檔代码：", payload);
  }
}

function importSave() {
  const raw = prompt("请贴上之前复制的存檔代码（会覆盖目前纪录）：");
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
    alert("存檔导入成功！");
  } catch {
    alert("存檔格式不正确，导入失败！");
  }
}

stampBtn.addEventListener("click", addStamp);
reasonInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addStamp();
});
undoBtn.addEventListener("click", undoLast);
resetBtn.addEventListener("click", resetAll);
exportBtn.addEventListener("click", exportSave);
importBtn.addEventListener("click", importSave);

renderAll();
