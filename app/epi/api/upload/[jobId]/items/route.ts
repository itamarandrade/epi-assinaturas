import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request, context: { params: Promise<{ jobId: string }>}) {
  const { jobId } = await context.params;        // <-- aguarde aqui
  const id = Number(jobId);

  const { searchParams } = new URL(req.url);
  const limit  = Number(searchParams.get('limit')  ?? 200);
  const offset = Number(searchParams.get('offset') ?? 0);

  const { data, error, count } = await supabaseAdmin
    .from('import_item')
    .select('*', { count: 'exact' })
    .eq('job_id', id)
    .order('row_number', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data, total: count ?? 0 });
}
