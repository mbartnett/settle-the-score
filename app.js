const defaults = {
  teams: [
    { name: "Me", score: 0, color: "#111111", textColor: "#fdfbf7" },
    { name: "You", score: 0, color: "#fdfbf7", textColor: "#111111" }
  ],
  font: "rounded",
  allowNegative: false
};

const fontStacks = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Avenir Next", system-ui, sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
  gothamBlack: '"Gotham Black", "Arial Black", sans-serif',
  gothamUltra: '"Gotham Ultra", "Arial Black", sans-serif',
  hollowe: '"Hollowe Genesis", Impact, fantasy',
  sounder: '"Sounder", Impact, fantasy',
  violent: '"Violent Brave", Impact, fantasy',
  midnight: '"Midnight Legacy", Impact, fantasy',
  zeus: '"Zeus Borne", Impact, fantasy'
};

function freshDefaults() {
  return {
    ...defaults,
    teams: defaults.teams.map((team) => ({ ...team }))
  };
}

let saved = null;
try {
  saved = JSON.parse(localStorage.getItem("split-score-settings") || "null");
} catch (error) {
  localStorage.removeItem("split-score-settings");
}

let state = saved && Array.isArray(saved.teams)
  ? { ...freshDefaults(), ...saved }
  : freshDefaults();
state.teams = defaults.teams.map((fallback, index) => ({ ...fallback, ...(state.teams[index] || {}) }));
if (state.font === "gotham") state.font = "gothamBlack";
if (state.font === "metal") state.font = "hollowe";
if (saved?.teams?.[0]?.color === "#ff3b45" && saved?.teams?.[1]?.color === "#1188ef") {
  state.teams[0].color = defaults.teams[0].color;
  state.teams[0].textColor = defaults.teams[0].textColor;
  state.teams[1].color = defaults.teams[1].color;
  state.teams[1].textColor = defaults.teams[1].textColor;
}
if (!fontStacks[state.font]) state.font = defaults.font;

const $ = (selector) => document.querySelector(selector);
const scoreboard = $("#scoreboard");
const modal = $("#modal-backdrop");
const toast = $("#toast");
let toastTimer;
let activeColorButton = null;

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
  document.documentElement.style.setProperty("--team-one-text", state.teams[0].textColor);
  document.documentElement.style.setProperty("--team-two-text", state.teams[1].textColor);
  document.documentElement.style.setProperty("--font", fontStacks[state.font]);
  scoreboard.classList.toggle("font-extreme", ["hollowe", "sounder", "violent", "midnight", "zeus"].includes(state.font));
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
  setColorButton($("#team-one-color"), state.teams[0].color);
  setColorButton($("#team-two-color"), state.teams[1].color);
  $("#team-one-text-color").value = state.teams[0].textColor;
  $("#team-two-text-color").value = state.teams[1].textColor;
  $("#font-select").value = state.font;
  $("#negative-toggle").checked = state.allowNegative;
  updateFontChoices();
}

function setColorButton(button, color) {
  button.value = color;
  button.style.backgroundColor = color;
  button.setAttribute("aria-label", `${button.id === "team-one-color" ? "First" : "Second"} team color ${color}`);
}

function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs(section % 2 - 1));
  const [r1, g1, b1] = section < 1 ? [chroma, x, 0]
    : section < 2 ? [x, chroma, 0]
      : section < 3 ? [0, chroma, x]
        : section < 4 ? [0, x, chroma]
          : section < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const m = l - chroma / 2;
  return `#${[r1, g1, b1].map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function buildColorGrid() {
  const grid = $("#color-grid");
  const colors = Array.from({ length: 12 }, (_, index) => {
    const value = Math.round(255 - (index * 255 / 11)).toString(16).padStart(2, "0");
    return `#${value}${value}${value}`;
  });
  [20, 30, 40, 50, 60, 70, 82].forEach((lightness) => {
    [190, 215, 245, 275, 320, 355, 20, 38, 50, 62, 78, 100].forEach((hue) => {
      colors.push(hslToHex(hue, lightness < 35 ? 88 : 92, lightness));
    });
  });
  colors.forEach((color) => {
    const choice = document.createElement("button");
    choice.type = "button";
    choice.className = "color-choice";
    choice.style.backgroundColor = color;
    choice.setAttribute("aria-label", `Choose ${color}`);
    choice.addEventListener("click", () => {
      setColorButton(activeColorButton, color);
      $("#color-grid-dialog").close();
      activeColorButton.focus();
    });
    grid.append(choice);
  });
}

function updateFontChoices() {
  document.querySelectorAll("[data-font]").forEach((button) => {
    button.setAttribute("aria-checked", String(button.dataset.font === $("#font-select").value));
  });
}

function openSettings() {
  syncForm();
  modal.hidden = false;
  document.body.style.overflow = "hidden";
  $("#close-settings").focus();
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
  state.teams[0].textColor = $("#team-one-text-color").value;
  state.teams[1].textColor = $("#team-two-text-color").value;
  state.font = $("#font-select").value;
  state.allowNegative = $("#negative-toggle").checked;
  render();
}

$("#team-one-score").addEventListener("click", () => changeScore(0, 1));
$("#team-two-score").addEventListener("click", () => changeScore(1, 1));
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
});

$("#swap-button").addEventListener("click", () => {
  state.teams.reverse();
  render();
  showToast("Teams swapped");
});

$("#settings-button").addEventListener("click", openSettings);
document.querySelectorAll("[data-font]").forEach((button) => {
  button.style.fontFamily = fontStacks[button.dataset.font];
  button.setAttribute("role", "radio");
  button.addEventListener("click", () => {
    $("#font-select").value = button.dataset.font;
    updateFontChoices();
  });
});
document.querySelectorAll(".color-picker-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeColorButton = button;
    $("#color-grid-dialog").showModal();
  });
});
$("#close-color-grid").addEventListener("click", () => {
  $("#color-grid-dialog").close();
  activeColorButton?.focus();
});
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
$("#close-settings").addEventListener("click", closeSettings);
$("#done-settings").addEventListener("click", () => {
  applyForm();
  closeSettings();
  showToast("Settings saved");
});

$("#restore-defaults").addEventListener("click", () => {
  state = freshDefaults();
  syncForm();
  render();
  showToast("Defaults restored");
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

buildColorGrid();
render();
