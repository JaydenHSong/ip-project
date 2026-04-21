// Design Ref: products-sync.design.md §7.2 — 매칭 이유 설명 툴팁 (Kano Delight)
// Plan SC: SC-05 (5-enum reason), Kano model Delight tier (Framework Value Review v2 §7)
//
// Operator가 Unmapped queue에서 "왜 매칭 실패했나" 5초 안에 이해할 수 있도록
// 도메인 enum → 한국어 friendly message + action hint 매핑.

import type { UnmappedReason } from './types';

export type ReasonKind = UnmappedReason | 'manual_flag' | 'schema_drift';

export type ReasonMessage = {
  title: string;       // short label (badge text)
  detail: string;      // expanded tooltip
  actionHint: string;  // what operator should typically do
};

// DB enum 'products.unmapped_reason' 값과 1:1 일치해야 함.
export const REASON_MESSAGES: Record<ReasonKind, ReasonMessage> = {
  no_ean_no_prefix: {
    title: 'EAN 없음 + SKU 불일치',
    detail: '이 리스팅에 EAN이 없고, seller_sku의 앞 8자리가 ERP master에 존재하지 않습니다.',
    actionHint: 'SKU를 직접 검색해서 매칭하거나, 신규 SKU로 등록하세요.',
  },
  prefix_ambiguous: {
    title: 'SKU prefix 중복',
    detail: 'SKU 앞 8자리에 해당하는 ERP master SKU가 여러 개(색상/사이즈 variant)이며 EAN으로도 구분 불가합니다.',
    actionHint: '후보 중 올바른 SKU를 수동으로 선택하세요.',
  },
  invalid_sku_format: {
    title: 'SKU 형식 오류',
    detail: 'seller_sku가 비어 있거나 Spigen SKU 패턴(예: ACS06234, 000AD20806)을 따르지 않습니다.',
    actionHint: '신규 SKU로 등록하거나, 채널 담당자에게 SKU 수정 요청하세요.',
  },
  schema_drift: {
    title: '소스 스키마 변경 감지',
    detail: 'SQ DataHub 원본 테이블의 컬럼이 변경되어 자동 매칭 알고리즘이 안전하게 실행되지 못했습니다.',
    actionHint: '개발팀에 알리고 다음 sync까지 수동 대기하세요.',
  },
  manual_flag: {
    title: '수동 플래그',
    detail: '운영자가 명시적으로 이 리스팅을 재검토 대상으로 지정했습니다.',
    actionHint: 'flag한 운영자의 메모를 확인 후 조치하세요.',
  },
};

export function getReasonMessage(reason: ReasonKind): ReasonMessage {
  return REASON_MESSAGES[reason];
}
