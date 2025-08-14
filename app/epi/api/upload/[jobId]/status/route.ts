import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: Request, context: { params: Promise<{ jobId: string }>}) {
  const { jobId } = await context.params;        // <-- aguarde aqui
  const id = Number(jobId);

  const { data, error } = await supabaseAdmin
    .from('import_job')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  return NextResponse.json({
    id: data.id,
    filename: data.filename,
    total: data.total_rows,
    processed: data.processed,
    ok: data.ok_count,
    errors: data.error_count,
    status: data.status,
    finished_at: data.finished_at
  });
}
