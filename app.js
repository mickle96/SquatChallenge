/***** CONFIG *****/
const TOTAL_DAYS = 30;
const SUPABASE_URL = "https://ugabrlgicybkrzuwsxpl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnYWJybGdpY3lia3J6dXdzeHBsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQwMDEsImV4cCI6MjA4NTk0MDAwMX0.X9XocmmWXAWe9CvsCzVj32Z_dXYnqXpZDQNZ4zU86XU";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/***** SCREENS *****/
const nameScreen = document.getElementById("nameScreen");
const mainScreen = document.getElementById("mainScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");

function show(screen) {
  [nameScreen, mainScreen, leaderboardScreen].forEach(s => s.classList.remove("active"));
  screen.classList.add("active");
}

/***** USER & DATA *****/
let userName = localStorage.getItem("squatName");
let DAILY_TARGET = Number(localStorage.getItem("dailyTarget")) || 75;

const today = new Date().toDateString();

let data = JSON.parse(localStorage.getItem("squatData")) || {
  todayDate: today,
  todayCount: 0,
  totalSquats: 0,
  daysCompleted: 0
};

if (data.todayDate !== today) {
  if (data.todayCount >= DAILY_TARGET) data.daysCompleted++;
  data.todayDate = today;
  data.todayCount = 0;
}

/***** UI UPDATE *****/
function updateUI() {
  document.getElementById("todayCount").textContent = `${data.todayCount} / ${DAILY_TARGET}`;
  document.getElementById("totalSquats").textContent = data.totalSquats;
  document.getElementById("daysCompleted").textContent = `${data.daysCompleted} / ${TOTAL_DAYS}`;
}

/***** LEVEL SELECTION (MOBILE-FRIENDLY) *****/
let selectedLevel = DAILY_TARGET;

document.querySelectorAll(".levelBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    selectedLevel = Number(btn.dataset.value);
    document.querySelectorAll(".levelBtn").forEach(b => b.classList.remove("secondary"));
    btn.classList.add("secondary");
  });
});

/***** NAME ENTRY *****/
document.getElementById("startBtn").addEventListener("click", () => {
  const input = document.getElementById("nameInput").value.trim();
  if (!input) return alert("Please enter your name");

  userName = input;
  localStorage.setItem("squatName", userName);
  DAILY_TARGET = selectedLevel;
  localStorage.setItem("dailyTarget", DAILY_TARGET);

  saveData();
  showMain();
});

/***** CORE FUNCTIONS *****/
function addSquats(amount) {
  if (data.todayCount >= DAILY_TARGET) return;
  const addable = Math.min(amount, DAILY_TARGET - data.todayCount);
  data.todayCount += addable;
  data.totalSquats += addable;
  saveData();
}

function saveData() {
  localStorage.setItem("squatData", JSON.stringify(data));
  updateUI();
  syncToSupabase();
}

/***** SUPABASE FUNCTIONS *****/
async function syncToSupabase() {
  if (!userName) return;
  await supabaseClient
    .from("squat_leaderboard")
    .upsert({
      name: userName,
      today_count: data.todayCount,
      total_squats: data.totalSquats,
      days_completed: data.daysCompleted,
      last_updated: today
    }, { onConflict: "name" });
}

async function loadLeaderboard() {
  const { data: rows } = await supabaseClient
    .from("squat_leaderboard")
    .select("*")
    .order("days_completed", { ascending: false })
    .order("total_squats", { ascending: false });

  const board = document.getElementById("leaderboard");
  if (!rows || rows.length === 0) {
    board.textContent = "No data yet";
    return;
  }

  board.innerHTML = rows.map((r,i) =>
    `<p>${i+1}. <strong>${r.name}</strong> — ${r.days_completed} days, ${r.total_squats} squats</p>`
  ).join("");
}

/***** SCREEN FUNCTIONS *****/
function showMain() {
  show(mainScreen);
  updateUI();
}

function showLeaderboard() {
  loadLeaderboard();
  show(leaderboardScreen);
}

/***** INIT *****/
if (!userName) {
  show(nameScreen);
} else {
  showMain();
  syncToSupabase();
}
