import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Employs the modern, unified Deno.serve instead of legacy std/http imports 
Deno.serve(async (req: Request) => {
  // Edge Preflight handler
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Null safety extraction to prevent TS crash on header parsing
    const authHeader = req.headers.get('Authorization')

    // Standard User-Context Sandbox Client 
    const supabaseClient = createClient(
      'https://epcgbfogzqumjybibwiz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwY2diZm9nenF1bWp5Ymlid2l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjYxMzQsImV4cCI6MjA5MTIwMjEzNH0.V5QLc-rMb6jsYQHx9IuTvCEszXhZPAMD1mQgh294B7c',
      { global: { headers: { Authorization: authHeader ?? '' } } }
    )

    // Escalated Service Role Privileges (Bypasses Frontend RLS to evaluate properly)
    const supabaseAdmin = createClient(
      'https://epcgbfogzqumjybibwiz.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Cryptographic validation of invoking learner identifier
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) throw new Error('Unauthorized Network Invocation')

    const { assessment_id, answers } = await req.json()

    // Service Role extracts correct_answers explicitly hidden from normal public users via RLS columns
    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('question_id, correct_answer')
      .eq('assessment_id', assessment_id)

    if (error || !questions) throw new Error('Database isolation anomaly')

    let correctCount = 0;
    const totalQuestions = questions.length;

    // Fast O(N) evaluation verification bypassing client execution boundaries 
    questions.forEach((q: any) => {
      const learnerAnswer = answers[q.question_id];
      if (learnerAnswer && learnerAnswer === q.correct_answer) correctCount++;
    });

    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passStatus = scorePercentage >= 60 ? 'pass' : 'fail'; // System-wide compliance threshold

    // Silent logging via Admin privileges into Results ensuring no tampering limits
    const { data: resultInsert, error: insertError } = await supabaseAdmin
      .from('results')
      .insert({
        user_id: user.id,
        assessment_id: assessment_id,
        score: scorePercentage,
        status: passStatus
      })
      .select()
      .single()

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ score: scorePercentage, status: passStatus, result_id: resultInsert.result_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    // Rigid safety check: Error object typing gracefully handles 'undefined' or object bounds
    return new Response(JSON.stringify({ error: error?.message ?? 'Unknown exception raised.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
