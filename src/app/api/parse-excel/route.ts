import { NextRequest, NextResponse } from 'next/server';
import { parseExcelBuffer } from '@/lib/excel-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const members = parseExcelBuffer(buffer);

    return NextResponse.json({
      members,
      summary: {
        total: members.length,
        fc5Count: members.filter((m) => m.isFC5).length,
        avgCombatPower:
          members.reduce((sum, m) => sum + m.combatPowerNumeric, 0) / members.length,
      },
    });
  } catch (error) {
    console.error('Excel parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse Excel file' },
      { status: 500 },
    );
  }
}
