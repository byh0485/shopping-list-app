# 🛒 쇼핑리스트 앱

바닐라 JavaScript로 만든 간단한 쇼핑리스트 웹 앱입니다. 별도의 빌드 과정 없이 `index.html` 하나로 동작하며, 데이터는 **Supabase**(Postgres) 데이터베이스에 저장됩니다.

## ✨ 기능

- 항목 추가 (버튼 클릭 또는 Enter 키)
- 체크/체크 해제로 완료 표시 (취소선 스타일)
- 항목 개별 삭제
- 완료된 항목 일괄 지우기
- 전체 / 남은 항목 개수 표시
- **Supabase 기반 영속성** — 새로고침해도, 다른 기기에서 열어도 같은 목록이 유지됩니다

> ℹ️ 현재는 로그인이 없어 **모든 사용자가 하나의 목록을 공유**합니다. (사용자별 분리 없음)

## 🚀 실행 방법

브라우저에서 `index.html` 파일을 열기만 하면 됩니다.

```bash
# 예시: 로컬에서 바로 열기
open index.html    # macOS
start index.html   # Windows
```

## 🗄 데이터베이스 (Supabase)

- 데이터는 Supabase의 `shopping_items` 테이블에 저장됩니다.
  - 컬럼: `id (uuid)`, `name (text)`, `done (boolean)`, `created_at (timestamptz)`
- 브라우저에서 [`@supabase/supabase-js`](https://github.com/supabase/supabase-js)를 CDN으로 불러와 연결합니다.
- `index.html` 상단에 프로젝트 URL과 **publishable(공개) 키**가 들어 있습니다. 이 키는 브라우저에 노출되도록 설계된 공개용 키이며, 데이터 접근은 서버 측 RLS(Row Level Security) 정책이 통제합니다. (비밀 키 아님)

## 🧪 테스트

Playwright 기반 자동 테스트가 포함되어 있습니다. (실제 Supabase DB를 대상으로 실행되며, 테스트 전후로 테이블을 비웁니다.)

```bash
npm install
npx playwright install chromium
npm test
```

## 🛠 기술 스택

- HTML / CSS / Vanilla JavaScript
- Supabase (Postgres, `@supabase/supabase-js`)
- Playwright (테스트)

## 📄 라이선스

MIT
