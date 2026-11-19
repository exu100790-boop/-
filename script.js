const MAX_STAMPS = 10;
const STORAGE_KEY = "good_baby_stamps";

const gridEl = document.getElementById("grid");
const countEl = document.getElementById("count");
const stampBtn = document.getElementById("stampBtn");
const resetBtn = document.getElementById("resetBtn");

let stamps = Number(localStorage.getItem(STORAGE_KEY)) || 0;

function render() {
  countEl.textContent = stamps;
  gridEl.innerHTML = "";

  for (let i = 0; i < MAX_STAMPS; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";

    if (i < stamps) {
      const stamp = document.createElement("div");
      stamp.className = "stamp";
      stamp.textContent = "乖寶寶";
      slot.appendChild(stamp);
    }

    gridEl.appendChild(slot);
  }

  stampBtn.disabled = stamps >= MAX_STAMPS;
  stampBtn.textContent = stamps >= MAX_STAMPS ? "已集滿 10 個！" : "蓋一個乖寶寶章";
}

stampBtn.addEventListener("click", () => {
  if (stamps < MAX_STAMPS) {
    stamps += 1;
    localStorage.setItem(STORAGE_KEY, String(stamps));
    render();
  }
});

resetBtn.addEventListener("click", () => {
  stamps = 0;
  localStorage.removeItem(STORAGE_KEY);
  render();
});

render();
