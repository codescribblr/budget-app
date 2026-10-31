import { envelopeCommand } from '@/lib/envelope-command-route';
export async function POST(request: Request) { return envelopeCommand(request, 'allocate'); }
