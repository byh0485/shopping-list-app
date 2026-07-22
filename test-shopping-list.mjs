import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(path.join(__dirname, "index.html")).href;

// Supabase 연결 정보 (앱과 동일한 publishable 키, RLS로 보호됨)
const SUPABASE_URL = "https://efplhfpkksjnzmlghvby.supabase.co";
const SUPABASE_KEY = "sb_publishable_BHZgfaj7TuDWPh2Qb40eeg_nWm3D4GI";

// 자동 테스트 전용 계정. 이메일 확인(email confirmation)이 꺼져 있어야
// 가입 즉시 세션이 발급된다. 최초 실행 시 자동으로 생성된다.
const TEST_EMAIL = "shopping.list.tester@proton.me";
const TEST_PASSWORD = "TestUser123!";

const authHeaders = {
  apikey: SUPABASE_KEY,
  "Content-Type": "application/json",
};

// 테스트 계정의 access token을 확보한다. (없으면 가입 후 발급)
async function getTestToken() {
  const passwordGrant = () =>
    fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

  let res = await passwordGrant();
  if (res.ok) return (await res.json()).access_token;

  // 계정이 없으면 가입 (이메일 확인이 꺼져 있으면 세션이 바로 발급됨)
  const signup = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const signupJson = await signup.json();
  if (signupJson.access_token) return signupJson.access_token;

  // 가입은 됐지만 세션이 없으면(=이메일 확인이 켜져 있음) 다시 로그인 시도
  res = await passwordGrant();
  if (res.ok) return (await res.json()).access_token;

  throw new Error(
    "테스트 계정 토큰 발급 실패. Supabase에서 이메일 확인을 꺼야 합니다. " +
      `signup 응답: ${JSON.stringify(signupJson)}`
  );
}

// 테스트 격리를 위해 해당 사용자의 항목을 모두 지운다. (RLS로 본인 것만 삭제됨)
async function resetDb(token) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/shopping_items?created_at=gte.1900-01-01`,
    {
      method: "DELETE",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`DB 초기화 실패: ${res.status} ${await res.text()}`);
  }
}

let passed = 0;
let failed = 0;
const results = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name}${detail ? " — " + detail : ""}`);
  }
}

const token = await getTestToken();
await resetDb(token);

const browser = await chromium.launch();
const page = await browser.newPage();

// 콘솔 에러 수집
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

await page.goto(pageUrl);

// 헬퍼
const itemCount = () => page.locator("#list li:not(.empty)").count();
const rowText = (i) => page.locator("#list li .text").nth(i).textContent();

// 비동기(DB 왕복) 반영을 기다린다.
const waitCount = (n) =>
  page.waitForFunction(
    (expected) =>
      document.querySelectorAll("#list li:not(.empty)").length === expected,
    n,
    { timeout: 8000 }
  );
const waitDone = (i, expected) =>
  page.waitForFunction(
    ({ idx, want }) => {
      const li = document.querySelectorAll("#list li")[idx];
      return li && li.classList.contains("done") === want;
    },
    { idx: i, want: expected },
    { timeout: 8000 }
  );

async function loginViaUI() {
  await page.fill("#emailInput", TEST_EMAIL);
  await page.fill("#passwordInput", TEST_PASSWORD);
  await page.click("#loginBtn");
  await page.locator("#appView").waitFor({ state: "visible", timeout: 8000 });
}

console.log("\n=== 쇼핑리스트 앱 자동 테스트 (Supabase Auth 연동) ===\n");

// ---------- 1. 로그인 전 상태 ----------
console.log("[1] 로그인 전 상태");
await page.locator("#authView").waitFor({ state: "visible", timeout: 8000 });
check("로그인 화면 표시", await page.locator("#authView").isVisible());
check("쇼핑리스트 화면은 숨김", !(await page.locator("#appView").isVisible()));

// ---------- 2. 로그인 ----------
console.log("[2] 로그인");
await loginViaUI();
check("로그인 후 쇼핑리스트 화면 표시", await page.locator("#appView").isVisible());
check("로그인 화면은 숨김", !(await page.locator("#authView").isVisible()));
check(
  "로그인한 사용자 이메일 표시",
  (await page.locator("#userEmail").textContent()) === TEST_EMAIL
);
await page.locator("#list .empty").waitFor({ state: "visible", timeout: 8000 });
check("초기 항목 수 0개", (await itemCount()) === 0);

// ---------- 3. 아이템 추가 ----------
console.log("[3] 아이템 추가");
await page.fill("#itemInput", "우유");
await page.click("#addBtn");
await waitCount(1);
check("버튼 클릭으로 추가됨", (await itemCount()) === 1);
check("추가된 항목 텍스트 일치", (await rowText(0)) === "우유");
check("추가 후 입력창 비워짐", (await page.inputValue("#itemInput")) === "");

// Enter 키로 추가
await page.fill("#itemInput", "계란");
await page.press("#itemInput", "Enter");
await waitCount(2);
check("Enter 키로 추가됨", (await itemCount()) === 2);
check("두 번째 항목 텍스트 일치", (await rowText(1)) === "계란");

// 세 번째 추가
await page.fill("#itemInput", "사과");
await page.press("#itemInput", "Enter");
await waitCount(3);
check("세 번째 항목 추가됨", (await itemCount()) === 3);

// 빈 값 추가 방지
await page.fill("#itemInput", "   ");
await page.click("#addBtn");
await page.waitForTimeout(500);
check("공백만 있는 입력은 추가 안 됨", (await itemCount()) === 3);

// 카운터 확인
check(
  "카운터에 '3개 항목' 표시",
  (await page.locator("#count").textContent()).includes("3개 항목")
);

// ---------- 4. 체크(완료 토글) ----------
console.log("[4] 체크 기능");
await page.locator("#list li .check").nth(0).click();
await waitDone(0, true);
check(
  "첫 항목 체크 시 done 클래스 부여",
  await page.locator("#list li").nth(0).evaluate((el) => el.classList.contains("done"))
);
check(
  "체크 시 취소선 스타일 적용",
  (await page.locator("#list li .text").nth(0).evaluate(
    (el) => getComputedStyle(el).textDecorationLine
  )).includes("line-through")
);
check(
  "남은 항목 카운트 감소(남은 것 2개)",
  (await page.locator("#count").textContent()).includes("남은 것 2개")
);

// 체크 해제(토글)
await page.locator("#list li .check").nth(0).click();
await waitDone(0, false);
check(
  "다시 클릭 시 체크 해제됨",
  !(await page.locator("#list li").nth(0).evaluate((el) => el.classList.contains("done")))
);

// ---------- 5. 새로고침 후 유지(Supabase 영속성 + 세션 유지) ----------
console.log("[5] Supabase 영속성 & 세션 유지");
await page.locator("#list li .check").nth(1).click(); // '계란' 체크
await waitDone(1, true);
await page.reload();
await page.locator("#appView").waitFor({ state: "visible", timeout: 8000 });
check("새로고침 후에도 로그인 유지", await page.locator("#appView").isVisible());
await waitCount(3);
check("새로고침 후에도 3개 항목 유지", (await itemCount()) === 3);
check(
  "새로고침 후 체크 상태 유지",
  await page.locator("#list li").nth(1).evaluate((el) => el.classList.contains("done"))
);

// ---------- 6. 삭제 ----------
console.log("[6] 삭제 기능");
await page.locator("#list li .del").nth(0).click(); // '우유' 삭제
await waitCount(2);
check("삭제 후 2개 항목", (await itemCount()) === 2);
check("삭제된 항목이 목록에서 사라짐", (await rowText(0)) === "계란");

// ---------- 7. 완료 항목 지우기 ----------
console.log("[7] 완료 항목 지우기");
// 현재: 계란(체크됨), 사과(미체크)
await page.click("#clearDone");
await waitCount(1);
check("완료 항목만 제거되어 1개 남음", (await itemCount()) === 1);
check("남은 항목은 미체크였던 '사과'", (await rowText(0)) === "사과");

// 마지막 항목까지 삭제 → 빈 상태 복귀
await page.locator("#list li .del").nth(0).click();
await waitCount(0);
check("모두 삭제 후 빈 목록 안내 재표시", await page.locator("#list .empty").isVisible());

// ---------- 8. 로그아웃 ----------
console.log("[8] 로그아웃");
await page.click("#logoutBtn");
await page.locator("#authView").waitFor({ state: "visible", timeout: 8000 });
check("로그아웃 후 로그인 화면 복귀", await page.locator("#authView").isVisible());
check("로그아웃 후 쇼핑리스트 화면 숨김", !(await page.locator("#appView").isVisible()));

// ---------- 콘솔 에러 확인 ----------
console.log("[9] 콘솔 에러");
check("실행 중 콘솔/페이지 에러 없음", consoleErrors.length === 0, consoleErrors.join("; "));

await browser.close();

// 테스트가 남긴 데이터 정리
await resetDb(token);

// ---------- 결과 출력 ----------
console.log("\n--- 상세 결과 ---");
console.log(results.join("\n"));
console.log(`\n=== 총 ${passed + failed}개 중 통과 ${passed} / 실패 ${failed} ===`);
process.exit(failed === 0 ? 0 : 1);
