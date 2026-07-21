# 🛒 쇼핑리스트 앱

바닐라 JavaScript로 만든 간단한 쇼핑리스트 웹 앱입니다. 별도의 빌드 과정 없이 `index.html` 하나로 동작하며, 브라우저의 `localStorage`에 데이터를 저장합니다.

## ✨ 기능

- 항목 추가 (버튼 클릭 또는 Enter 키)
- 체크/체크 해제로 완료 표시 (취소선 스타일)
- 항목 개별 삭제
- 완료된 항목 일괄 지우기
- 전체 / 남은 항목 개수 표시
- `localStorage` 기반 영속성 (새로고침해도 유지)

## 🚀 실행 방법

브라우저에서 `index.html` 파일을 열기만 하면 됩니다.

```bash
# 예시: 로컬에서 바로 열기
open index.html    # macOS
start index.html   # Windows
```

## 🧪 테스트

Playwright 기반 자동 테스트가 포함되어 있습니다.

```bash
npm install
npx playwright install chromium
npm test
```

## 🛠 기술 스택

- HTML / CSS / Vanilla JavaScript
- localStorage
- Playwright (테스트)

## 📄 라이선스

MIT
