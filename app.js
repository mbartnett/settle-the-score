const defaults = {
  teams: [
    { name: "Me", score: 0, color: "#ff3b45" },
    { name: "You", score: 0, color: "#1188ef" }
  ],
  font: "rounded",
  layout: "auto",
  allowNegative: false
};

const fontStacks = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
  condensed: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
  metal: 'Impact, Haettenschweiler, "Arial Narrow Bold", fantasy'
};

const palette = ["#ff3b45", "#1188ef", "#f39c12", "#8e44ad", "#16a085", "#ef6c35", "#e91e63", "#202124", "#f4f0e8", "#76000b"];

const saved = JSON.parse(localStorage.getItem("split-score-settings") || "null");
let state = saved ? { ...defaults, ...saved, teams: saved.teams || defaults.teams } : structuredClone(defaults);

const $ = (selector) => document.querySelector(selector);
const scoreboard = $("#scoreboard");
const modal = $("#modal-backdrop");
const toast = $("#toast");
let toastTimer;

function save() {
  localStorage.setItem("split-score-settings", JSON.stringify(state));
}

function render() {
  state.teams.forEach((team, index) => {
    $(`#team-${index ? "two" : "one"}-name`).textContent = team.name;
    $(`#team-${index ? "two" : "one"}-score`).textContent = team.score;
    $(`#team-${index ? "two" : "one"}-score`).setAttribute("aria-label", `Add one point to ${team.name}`);
  });
  document.documentElement.style.setProperty("--team-one", state.teams[0].color);
  document.documentElement.style.setProperty("--team-two", state.teams[1].color);
  document.documentElement.style.setProperty("--font", fontStacks[state.font]);
  scoreboard.classList.toggle("layout-stacked", state.layout === "stacked");
  scoreboard.classList.toggle("layout-side-by-side", state.layout === "side-by-side");
  scoreboard.classList.toggle("font-metal", state.font === "metal");
  document.querySelector('meta[name="theme-color"]').content = state.teams[0].color;
  save();
}

function changeScore(teamIndex, amount) {
  const next = state.teams[teamIndex].score + amount;
  state.teams[teamIndex].score = state.allowNegative ? next : Math.max(0, next);
  render();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function syncForm() {
  $("#team-one-input").value = state.teams[0].name;
  $("#team-two-input").value = state.teams[1].name;
  $("#team-one-color").value = state.teams[0].color;
  $("#team-two-color").value = state.teams[1].color;
  $("#font-select").value = state.font;
  $("#negative-toggle").checked = state.allowNegative;
  document.querySelector(`input[name="layout"][value="${state.layout}"]`).checked = true;
  updateFontPreview();
}

function updateFontPreview() {
  $("#font-preview").style.fontFamily = fontStacks[$("#font-select").value];
  $("#font-preview").classList.toggle("font-metal", $("#font-select").value === "metal");
}

function openSettings() {
  syncForm();
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  $("#team-one-input").focus();
}

function closeSettings() {
  modal.hidden = true;
  document.body.style.overflow = "hidden";
  $("#settings-button").focus();
}

function applyForm() {
  state.teams[0].name = $("#team-one-input").value.trim() || "Team 1";
  state.teams[1].name = $("#team-two-input").value.trim() || "Team 2";
  state.teams[0].color = $("#team-one-color").value;
  state.teams[1].color = $("#team-two-color").value;
  state.font = $("#font-select").value;
  state.allowNegative = $("#negative-toggle").checked;
  state.layout = document.querySelector('input[name="layout"]:checked').value;
  render();
}

$("#team-one-score").addEventListener("click", () => changeScore(0, 1));
$("#team-two-score").addEventListener("click", () => changeScore(1, 1));
document.querySelectorAll("[data-change]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    changeScore(Number(button.dataset.team), Number(button.dataset.change));
  });
});

document.querySelectorAll(".swatches").forEach((container) => {
  palette.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.style.background = color;
    button.setAttribute("aria-label", `Use color ${color}`);
    button.addEventListener("click", () => {
      $(`#${container.dataset.colorTarget}`).value = color;
    });
    container.append(button);
  });
});

let touchStartY = 0;
let touchStartX = 0;
let swipeHandled = false;
document.querySelectorAll(".team").forEach((team, teamIndex) => {
  team.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStartY = touch.clientY;
    touchStartX = touch.clientX;
    swipeHandled = false;
  }, { passive: true });
  team.addEventListener("touchend", (event) => {
    const touch = event.changedTouches[0];
    const deltaY = touchStartY - touch.clientY;
    const deltaX = touchStartX - touch.clientX;
    if (Math.abs(deltaY) >= 48 && Math.abs(deltaY) > Math.abs(deltaX)) {
      swipeHandled = true;
      changeScore(teamIndex, deltaY > 0 ? 1 : -1);
      showToast(deltaY > 0 ? "+1" : "−1");
    }
  }, { passive: true });
});

document.querySelectorAll(".score").forEach((button) => {
  button.addEventListener("click", (event) => {
    if (swipeHandled) {
      event.stopImmediatePropagation();
      swipeHandled = false;
    }
  }, true);
});

$("#reset-button").addEventListener("click", () => {
  state.teams.forEach((team) => { team.score = 0; });
  render();
  showToast("Scores reset");
});

$("#swap-button").addEventListener("click", () => {
  state.teams.reverse();
  render();
  showToast("Teams swapped");
});

$("#settings-button").addEventListener("click", openSettings);
$("#fullscreen-button").addEventListener("click", async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }

  if (document.documentElement.requestFullscreen) {
    try {
      await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      return;
    } catch (error) {
      // Some mobile browsers expose the API but still reject page fullscreen.
    }
  }

  $("#install-dialog").showModal();
});

document.addEventListener("fullscreenchange", () => {
  const button = $("#fullscreen-button");
  const active = Boolean(document.fullscreenElement);
  button.textContent = active ? "⊡" : "⛶";
  button.setAttribute("aria-label", active ? "Exit full screen" : "Enter full screen");
  button.title = active ? "Exit full screen" : "Full screen";
});

$("#close-install").addEventListener("click", () => $("#install-dialog").close());
$("#install-done").addEventListener("click", () => $("#install-dialog").close());
$("#font-select").addEventListener("change", updateFontPreview);
$("#close-settings").addEventListener("click", closeSettings);
$("#done-settings").addEventListener("click", () => {
  applyForm();
  closeSettings();
  showToast("Settings saved");
});

$("#restore-defaults").addEventListener("click", () => {
  state = structuredClone(defaults);
  syncForm();
  render();
  showToast("Defaults restored");
});

$("#metal-button").addEventListener("click", () => $("#metal-dialog").showModal());
$("#cancel-metal").addEventListener("click", () => $("#metal-dialog").close());
$("#confirm-metal").addEventListener("click", () => {
  state.font = "metal";
  state.teams[0].color = "#111111";
  state.teams[1].color = "#76000b";
  render();
  syncForm();
  $("#metal-dialog").close();
  showToast("Metal mode unleashed");
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeSettings();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.hidden) closeSettings();
  if (!modal.hidden || ["INPUT", "SELECT"].includes(document.activeElement.tagName)) return;
  if (event.key === "ArrowLeft") changeScore(0, event.shiftKey ? -1 : 1);
  if (event.key === "ArrowRight") changeScore(1, event.shiftKey ? -1 : 1);
  if (event.key.toLowerCase() === "r") $("#reset-button").click();
});

render();
