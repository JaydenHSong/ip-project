# TASK-05: Complete 리포트에서 리스팅 클릭 시 리포트 큐로 돌아가는 버그

## 상태: DONE
## 우선순위: Medium
## 예상 난이도: Low
## 담당: Developer B

---

## 현재 동작

Completed(resolved) 상태의 리포트 상세 페이지에서:
- 리스팅 정보(ASIN, 제목 등) 클릭 시 → `/reports` (리포트 큐 목록)로 돌아감

**기대 동작**: 리스팅 클릭 시 해당 리스팅의 상세 정보를 보여줘야 함 (또는 아마존 페이지로 이동)

## 원인 추정

ReportDetailContent.tsx에서 리스팅 관련 요소에 잘못된 링크/onClick이 걸려있을 가능성:
- `router.push('/reports')` 또는 `<Link href="/reports">` 가 리스팅 영역에 적용됨
- 또는 뒤로가기 버튼의 클릭 영역이 리스팅 카드까지 확장됨

## 수정 방법

### `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`

1. 리스팅 정보 영역의 onClick/href 확인
2. 리스팅 클릭 시 동작 결정:
   - **옵션 A**: 아마존 상품 페이지로 새 탭 열기 (`window.open(amazonUrl)`)
   - **옵션 B**: 리스팅 상세 모달/패널 표시
   - **옵션 C**: 클릭 동작 제거 (텍스트만 표시)

**권장**: 옵션 A — ASIN 클릭 시 아마존 페이지 새 탭

```
https://www.amazon.com/dp/{ASIN}
```

마켓플레이스별 URL:
- US: amazon.com/dp/{ASIN}
- UK: amazon.co.uk/dp/{ASIN}
- JP: amazon.co.jp/dp/{ASIN}
- DE: amazon.de/dp/{ASIN}

## 테스트

- [ ] completed 리포트에서 리스팅 클릭 시 아마존 페이지 열림 (새 탭)
- [ ] draft/pending 등 다른 상태에서도 동일 동작
- [ ] 리포트 큐로 잘못 이동하지 않음
