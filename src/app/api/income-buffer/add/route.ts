import { moveIncomeBuffer } from '@/lib/income-buffer-move';

export async function POST(request: Request) {
  return moveIncomeBuffer(request, 'add');
}
