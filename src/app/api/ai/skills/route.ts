// Skill 목록 API
// GET /api/ai/skills — V01~V19 Skill 문서 목록

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { skillManager } from '@/lib/ai/skills/manager'
import { getBrFormTypeLabel } from '@/constants/br-form-types'

export const GET = withAuth(async () => {
  const skills = await skillManager.list()

  const response = skills.map(skill => ({
    violationType: skill.violationType,
    violationName: getBrFormTypeLabel(skill.violationType),
    version: skill.version,
    lastUpdatedBy: skill.lastUpdatedBy,
    lastUpdatedAt: skill.lastUpdatedAt,
    approveRate: skill.metadata.approveRate,
    totalDrafts: skill.metadata.totalDrafts,
  }))

  return NextResponse.json({ skills: response })
}, ['owner', 'admin', 'editor'])
