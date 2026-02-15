/***** CONFIG *****/
const TOTAL_DAYS = 30;
const SUPABASE_URL = "https://oowqpvkotawvktzwpcfu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vd3FwdmtvdGF3dmt0endwY2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNzk0MzMsImV4cCI6MjA4NjY1NTQzM30.vyesrLFhI1PZ7gAAPgLzcEbcSrpaRhLLdPfYpPw006Q";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/***** SCREENS *****/
const welcomeScreen = document.getElementById("welcomeScreen");
const newUserScreen = document.getElementById("newUserScreen");
const existingUserScreen = document.getElementById("existingUserScreen");
const mainScreen = document.getElementById("mainScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");
const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const completeModal = document.getElementById("completeModal");
const completeMessage = document.getElementById("completeMessage");
const completeOk = document.getElementById("completeOk");

function show(screen) {
  [welcomeScreen, newUserScreen, existingUserScreen, mainScreen, leaderboardScreen].forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

function showConfirm(message, onYes, yesLabel = "Yes", noLabel = "No") {
  confirmMessage.textContent = message;
  confirmYes.textContent = yesLabel;
  confirmNo.textContent = noLabel;
  confirmModal.style.display = "block";
  confirmYes.onclick = () => {
    confirmModal.style.display = "none";
    onYes();
  };
  confirmNo.onclick = () => {
    confirmModal.style.display = "none";
  };
}

function showComplete(message) {
  completeMessage.textContent = message;
  completeModal.style.display = "block";
  completeOk.onclick = () => {
    completeModal.style.display = "none";
  };
}

/***** USER & DATA *****/
let fullName = localStorage.getItem("squatFullName");
let DAILY_TARGET = Number(localStorage.getItem("dailyTarget")) || 75;

function getAestDateString() {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

const today = getAestDateString();

let data = JSON.parse(localStorage.getItem("squatData")) || {
  todayDate: today,
  todayCount: 0,
  totalSquats: 0,
  daysCompleted: 0,
  dailyTarget: DAILY_TARGET,
  history: [],
  completedToday: false
};

if (data.todayDate !== today) {
  if (data.todayCount >= data.dailyTarget) data.daysCompleted++;
  data.todayDate = today;
  data.todayCount = 0;
  data.history = [];
  data.completedToday = false;
}

/***** UI UPDATE *****/
function updateUI() {
  document.getElementById("todayCount").textContent = `${data.todayCount} / ${data.dailyTarget}`;
  document.getElementById("totalSquats").textContent = data.totalSquats;
  document.getElementById("daysCompleted").textContent = `${data.daysCompleted} / ${TOTAL_DAYS}`;
}

/***** LEVEL SELECTION (MOBILE-FRIENDLY) *****/
let selectedLevel = null;

document.querySelectorAll("#newUserScreen .levelBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedLevel = Number(btn.dataset.value);
    document.querySelectorAll("#newUserScreen .levelBtn").forEach(b => b.classList.remove("secondary"));
    btn.classList.add("secondary");
  });
});

/***** WELCOME SCREEN *****/
document.getElementById("newUserOption").addEventListener("click", () => {
  show(newUserScreen);
});

document.getElementById("existingUserOption").addEventListener("click", () => {
  show(existingUserScreen);
});

/***** NEW USER *****/
document.getElementById("createBtn").addEventListener("click", async () => {
  const first = document.getElementById("newFirstNameInput").value.trim();
  const last = document.getElementById("newLastNameInput").value.trim();
  if (!first || !last) return alert("Please enter both first and last name");
  if (!selectedLevel) return alert("Please select a challenge level");

  const name = `${first} ${last}`;
  const { data: existing } = await supabaseClient
    .from("squat_leaderboard")
    .select("name")
    .eq("name", name)
    .limit(1);

  if (existing && existing.length > 0) {
    showConfirm(
      "That name already exists. Try a different name or log in instead.",
      () => {
        document.getElementById("existingFirstNameInput").value = first;
        document.getElementById("existingLastNameInput").value = last;
        show(existingUserScreen);
      },
      "Login",
      "Use Different Name"
    );
    return;
  }

  fullName = name;
  DAILY_TARGET = selectedLevel;
  data = {
    todayDate: today,
    todayCount: 0,
    totalSquats: 0,
    daysCompleted: 0,
    dailyTarget: DAILY_TARGET,
    history: [],
    completedToday: false
  };
  localStorage.setItem("squatFullName", fullName);
  localStorage.setItem("dailyTarget", DAILY_TARGET);
  saveData();
  showMain();
});

/***** EXISTING USER *****/
document.getElementById("loginBtn").addEventListener("click", async () => {
  const first = document.getElementById("existingFirstNameInput").value.trim();
  const last = document.getElementById("existingLastNameInput").value.trim();
  if (!first || !last) return alert("Please enter both first and last name");

  const name = `${first} ${last}`;
  const { data: row } = await supabaseClient
    .from("squat_leaderboard")
    .select("*")
    .eq("name", name)
    .single();

  if (!row) return alert("User not found. Please check your name or create a new account.");

  fullName = name;
  DAILY_TARGET = row.daily_target;
  data = {
    todayDate: row.last_updated,
    todayCount: row.today_count,
    totalSquats: row.total_squats,
    daysCompleted: row.days_completed,
    dailyTarget: row.daily_target,
    history: [],
    completedToday: row.today_count >= row.daily_target
  };
  if (data.todayDate !== today) {
    if (data.todayCount >= data.dailyTarget) data.daysCompleted++;
    data.todayDate = today;
    data.todayCount = 0;
  }
  localStorage.setItem("squatFullName", fullName);
  localStorage.setItem("dailyTarget", DAILY_TARGET);
  localStorage.setItem("squatData", JSON.stringify(data));
  updateUI();
  showMain();
});

/***** CORE FUNCTIONS *****/
function addSquats(amount) {
  const newCount = data.todayCount + amount;
  if (newCount < 0 || newCount > data.dailyTarget) return;
  data.todayCount = newCount;
  if (amount > 0) {
    data.totalSquats += amount;
    data.history.push(amount);
    if (data.todayCount >= data.dailyTarget && !data.completedToday) {
      data.completedToday = true;
      showComplete("Day complete! Great work. Your count will reset at midnight AEST.");
    }
  }
  saveData();
}

function undoLast() {
  if (data.history.length > 0) {
    const lastAmount = data.history.pop();
    data.todayCount -= lastAmount;
    data.totalSquats -= lastAmount;
    if (data.todayCount < data.dailyTarget) data.completedToday = false;
    saveData();
  }
}

function resetToday() {
  showConfirm("Are you sure you want to reset today's count to 0?", () => {
    const removed = data.todayCount;
    data.todayCount = 0;
    data.totalSquats = Math.max(0, data.totalSquats - removed);
    data.history = [];
    data.completedToday = false;
    saveData();
  });
}

function saveData() {
  localStorage.setItem("squatData", JSON.stringify(data));
  updateUI();
  syncToSupabase();
}

/***** SUPABASE FUNCTIONS *****/
async function syncToSupabase() {
  if (!fullName) return;
  await supabaseClient
    .from("squat_leaderboard")
    .upsert({
      name: fullName,
      today_count: data.todayCount,
      total_squats: data.totalSquats,
      days_completed: data.daysCompleted,
      daily_target: data.dailyTarget,
      last_updated: getAestDateString()
    }, { onConflict: "name" });
}

let currentLevelFilter = "all";
let currentTypeFilter = "overall";

async function loadLeaderboard() {
  const level = currentLevelFilter;
  const type = currentTypeFilter;

  let query = supabaseClient
    .from("squat_leaderboard")
    .select("*");

  if (level !== "all") {
    query = query.eq("daily_target", parseInt(level));
  }

  if (type === "overall") {
    query = query.order("days_completed", { ascending: false }).order("total_squats", { ascending: false });
  } else {
    query = query.order("today_count", { ascending: false });
  }

  const { data: rows } = await query;

  const board = document.getElementById("leaderboard");
  if (!rows || rows.length === 0) {
    board.innerHTML = "<p>No data yet</p>";
    return;
  }

  const levelNames = { 56: "Power", 112: "Super", 174: "Ultra" };

  board.innerHTML = rows.map((r, i) =>
    `<p>${i+1}. <strong>${r.name}</strong> (${levelNames[r.daily_target] || "Unknown"}) — ${r.days_completed} days, ${r.total_squats} total, ${r.today_count} today</p>`
  ).join("");
}

/***** SCREEN FUNCTIONS *****/
function showWelcome() {
  show(welcomeScreen);
}

function showMain() {
  show(mainScreen);
  updateUI();
}

function showLeaderboard() {
  loadLeaderboard();
  show(leaderboardScreen);
}

// Leaderboard filters
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const level = btn.dataset.level;
    const type = btn.dataset.type;

    if (level) {
      currentLevelFilter = level;
      document.querySelectorAll(".filter-btn[data-level]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }

    if (type) {
      currentTypeFilter = type;
      document.querySelectorAll(".filter-btn[data-type]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }

    loadLeaderboard();
  });
});

/***** INIT *****/
async function init() {
  if (!fullName) {
    show(welcomeScreen);
  } else {
    // Load latest data from Supabase
    const { data: row } = await supabaseClient
      .from("squat_leaderboard")
      .select("*")
      .eq("name", fullName)
      .single();
    if (row) {
      DAILY_TARGET = row.daily_target;
      data = {
        todayDate: row.last_updated,
        todayCount: row.today_count,
        totalSquats: row.total_squats,
        daysCompleted: row.days_completed,
        dailyTarget: row.daily_target,
        history: [],
        completedToday: row.today_count >= row.daily_target
      };
      if (data.todayDate !== today) {
        if (data.todayCount >= data.dailyTarget) data.daysCompleted++;
        data.todayDate = today;
        data.todayCount = 0;
        data.completedToday = false;
      }
      localStorage.setItem("squatData", JSON.stringify(data));
    }
    showMain();
  }
}

init();
