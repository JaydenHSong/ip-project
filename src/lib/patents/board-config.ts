// Monday.com 보드별 컬럼 매핑 + 상태 변환 설정
// 실제 API 컬럼 ID 기반 (2026-03-03 검증)

import type { IpType, IpAssetStatus } from '@/types/ip-assets'

type BoardConfig = {
  ipType: IpType
  envKey: string
  columns: {
    managementNumber: 'name'  // Monday.com item name = 관리번호
    name: string              // 프로젝트명/표장/제호
    description: string | null
    country: string
    status: string
    applicationNumber: string | null
    applicationDate: string | null
    registrationNumber: string | null
    registrationDate: string | null
    expiryDate: string | null
    assignee: string | null
    notes: string | null
    reportUrl: string | null
  }
  statusMap: Record<string, IpAssetStatus>
}

// Board 3: 기술특허 (162 items)
export const PATENT_BOARD: BoardConfig = {
  ipType: 'patent',
  envKey: 'MONDAY_PATENT_BOARD_ID',
  columns: {
    managementNumber: 'name',
    name: 'text__1',                     // 프로젝트
    description: 'text_mkvv4mpx',        // 비고(권리 범위 요약 등)
    country: 'color2__1',                // 국가 (status type, .text 사용)
    status: 'color1__1',                 // 현황
    applicationNumber: 'text3__1',       // 출원번호(정규)
    applicationDate: 'date__1',          // 출원일자(정규)
    registrationNumber: 'text1__1',      // 등록번호
    registrationDate: 'date2__1',        // 등록일자
    expiryDate: 'date_mktbrac',          // 존속만료일
    assignee: 'person',                  // 담당자 (people type, .text 사용)
    notes: 'long_text__1',              // 상세현황
    reportUrl: 'link__1',               // 보고서 (link type)
  },
  statusMap: {
    '등록': 'registered',
    'N/A': 'filed',
    '포기': 'abandoned',
    '거절': 'abandoned',
    '양도(NPE)': 'transferred',
    '소멸': 'expired',
    '출원': 'filed',
    'NFOA 통지': 'oa',
    '출원(심사청구X)': 'filed',
    '등록 예정': 'oa',
  },
}

// Board 4: 디자인특허 (500+ items)
export const DESIGN_PATENT_BOARD: BoardConfig = {
  ipType: 'design_patent',
  envKey: 'MONDAY_DESIGN_PATENT_BOARD_ID',
  columns: {
    managementNumber: 'name',
    name: 'text__1',                     // 프로젝트
    description: 'long_text_mkxxc28t',   // [디자인] 권리 요약
    country: 'text789__1',               // 국가코드(T)
    status: 'color25__1',                // 현황
    applicationNumber: 'text3__1',       // ✨출원번호
    applicationDate: 'date__1',          // 출원일자
    registrationNumber: 'text1__1',      // ✨등록번호
    registrationDate: 'date12__1',       // 등록일자
    expiryDate: 'date282__1',            // 존속만료일
    assignee: 'person',                  // 지재담당 (people type, .text 사용)
    notes: 'long_text__1',              // 🚩비고
    reportUrl: null,
  },
  statusMap: {
    '등록': 'registered',
    '출원(심사중)': 'filed',
    '출원준비': 'preparing',
    'OA': 'oa',
  },
}

// Board 5: ✅상표DB (500+ items)
export const TRADEMARK_BOARD: BoardConfig = {
  ipType: 'trademark',
  envKey: 'MONDAY_TRADEMARK_BOARD_ID',
  columns: {
    managementNumber: 'name',
    name: 'text09__1',                   // 기술명 상세
    description: 'text20__1',            // 🟩지정상품 (text type)
    country: 'text761__1',               // 국가(T) 텍스트
    status: 'color81__1',                // 현황
    applicationNumber: 'text92__1',      // 🩷출원번호
    applicationDate: 'date0__1',         // 출원일자
    registrationNumber: 'text3__1',      // 💚등록번호
    registrationDate: 'date6__1',        // 등록일자
    expiryDate: 'date7__1',             // 존속만료일🔷
    assignee: null,
    notes: 'long_text7__1',             // 🚩비고/ 심판이력
    reportUrl: null,
  },
  statusMap: {
    '등록': 'registered',
    '진행중': 'filed',
    'Action필요(OA)': 'oa',
    '대기중': 'preparing',
    '현업문의중(OA)': 'oa',
    '출원지시': 'preparing',
  },
}

// Board 6: 저작권 (40 items)
export const COPYRIGHT_BOARD: BoardConfig = {
  ipType: 'copyright',
  envKey: 'MONDAY_COPYRIGHT_BOARD_ID',
  columns: {
    managementNumber: 'name',
    name: 'text__1',                     // 제호 (제목)
    description: 'long_text_mkpkmyq7',   // 내용(컨셉)
    country: 'text789__1',               // 국가코드(T)
    status: 'color25__1',                // 현황
    applicationNumber: 'text3__1',       // ✨신청번호
    applicationDate: 'date__1',          // 신청일자
    registrationNumber: 'text1__1',      // ✨등록번호
    registrationDate: 'date12__1',       // 등록일자
    expiryDate: 'date282__1',            // 존속만료일
    assignee: 'person',                  // 지재담당 (people type, .text 사용)
    notes: 'long_text__1',              // 🚩비고
    reportUrl: null,
  },
  statusMap: {
    '등록': 'registered',
    '출원준비': 'preparing',
    '심판/소송/경고장': 'disputed',
    '삭제금지': 'registered',
    '출원(심사중)': 'filed',
  },
}

export const ALL_BOARDS = [PATENT_BOARD, DESIGN_PATENT_BOARD, TRADEMARK_BOARD, COPYRIGHT_BOARD] as const

export type { BoardConfig }
