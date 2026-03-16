
import { NextResponse } from 'next/server';

/**
 * 네트워크 연결 상태를 확인하기 위한 간단한 헬스 체크 API
 * /api/health
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
