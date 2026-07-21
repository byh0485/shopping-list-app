import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pageUrl = pathToFileURL(path.join(__dirname, "index.html")).href;

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

const browser = await chromium.launch();
const page = await browser.newPage();

// 콘솔 에러 수집
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

await page.goto(pageUrl);
// 이전 상태가 남아있지 않도록 초기화
await page.evaluate(() => localStorage.clear());
await page.reload();

// 헬퍼
const itemCount = () => page.locator("#list li:not(.empty)").count();
const rowText = (i) => page.locator("#list li .text").nth(i).textContent();

console.log("\n=== 쇼핑리스트 앱 자동 테스트 ===\n");

// ---------- 1. 초기 상태 ----------
console.log("[1] 초기 상태");
check("빈 목록 안내 메시지 표시", await page.locator("#list .empty").isVisible());
check("초기 항목 수 0개", (await itemCount()) === 0);

// ---------- 2. 아이템 추가 ----------
console.log("[2] 아이템 추가");
await page.fill("#itemInput", "우유");
await page.click("#addBtn");
check("버튼 클릭으로 추가됨", (await itemCount()) === 1);
check("추가된 항목 텍스트 일치", (await rowText(0)) === "우유");
check("추가 후 입력창 비워짐", (await page.inputValue("#itemInput")) === "");

// Enter 키로 추가
await page.fill("#itemInput", "계란");
await page.press("#itemInput", "Enter");
check("Enter 키로 추가됨", (await itemCount()) === 2);
check("두 번째 항목 텍스트 일치", (await rowText(1)) === "계란");

// 세 번째 추가
await page.fill("#itemInput", "사과");
await page.press("#itemInput", "Enter");
check("세 번째 항목 추가됨", (await itemCount()) === 3);

// 빈 값 추가 방지
await page.fill("#itemInput", "   ");
await page.click("#addBtn");
check("공백만 있는 입력은 추가 안 됨", (await itemCount()) === 3);

// 카운터 확인
check(
  "카운터에 '3개 항목' 표시",
  (await page.locator("#count").textContent()).includes("3개 항목")
);

// ---------- 3. 체크(완료 토글) ----------
console.log("[3] 체크 기능");
await page.locator("#list li .check").nth(0).click();
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
check(
  "다시 클릭 시 체크 해제됨",
  !(await page.locator("#list li").nth(0).evaluate((el) => el.classList.contains("done")))
);

// ---------- 4. 새로고침 후 유지(localStorage) ----------
console.log("[4] localStorage 영속성");
await page.locator("#list li .check").nth(1).click(); // '계란' 체크
await page.reload();
check("새로고침 후에도 3개 항목 유지", (await itemCount()) === 3);
check(
  "새로고침 후 체크 상태 유지",
  await page.locator("#list li").nth(1).evaluate((el) => el.classList.contains("done"))
);

// ---------- 5. 삭제 ----------
console.log("[5] 삭제 기능");
await page.locator("#list li .del").nth(0).click(); // '우유' 삭제
check("삭제 후 2개 항목", (await itemCount()) === 2);
check("삭제된 항목이 목록에서 사라짐", (await rowText(0)) === "계란");

// ---------- 6. 완료 항목 지우기 ----------
console.log("[6] 완료 항목 지우기");
// 현재: 계란(체크됨), 사과(미체크)
await page.click("#clearDone");
check("완료 항목만 제거되어 1개 남음", (await itemCount()) === 1);
check("남은 항목은 미체크였던 '사과'", (await rowText(0)) === "사과");

// 마지막 항목까지 삭제 → 빈 상태 복귀
await page.locator("#list li .del").nth(0).click();
check("모두 삭제 후 빈 목록 안내 재표시", await page.locator("#list .empty").isVisible());

// ---------- 콘솔 에러 확인 ----------
console.log("[7] 콘솔 에러");
check("실행 중 콘솔/페이지 에러 없음", consoleErrors.length === 0, consoleErrors.join("; "));

await browser.close();

// ---------- 결과 출력 ----------
console.log("\n--- 상세 결과 ---");
console.log(results.join("\n"));
console.log(`\n=== 총 ${passed + failed}개 중 통과 ${passed} / 실패 ${failed} ===`);
process.exit(failed === 0 ? 0 : 1);
