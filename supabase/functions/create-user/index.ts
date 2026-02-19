import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyAdmin(supabaseAdmin: any, req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('Avtorizatsiya talab qilinadi');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user: caller }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !caller) throw new Error('Yaroqsiz token');
  const { data: callerRole } = await supabaseAdmin.rpc('get_user_role', { _user_id: caller.id });
  if (callerRole !== 'admin') throw new Error('Faqat admin');
  return caller;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await verifyAdmin(supabaseAdmin, req);

    const body = await req.json();
    const { action } = body;

    // Delete user
    if (action === 'delete') {
      const { user_id } = body;
      if (!user_id) throw new Error('user_id kerak');
      
      await supabaseAdmin.from('teacher_students').delete().or(`teacher_id.eq.${user_id},student_id.eq.${user_id}`);
      await supabaseAdmin.from('test_results').delete().eq('user_id', user_id);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id);
      await supabaseAdmin.from('profiles').delete().eq('user_id', user_id);
      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update password
    if (action === 'update_password') {
      const { user_id, password } = body;
      if (!user_id || !password) throw new Error('user_id va password kerak');
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Reset device fingerprint
    if (action === 'reset_device') {
      const { user_id, device_type } = body;
      if (!user_id) throw new Error('user_id kerak');
      
      const update: Record<string, null> = {};
      if (device_type === 'pc' || device_type === 'all') update.pc_device_id = null;
      if (device_type === 'mobile' || device_type === 'all') update.mobile_device_id = null;
      if (!device_type) { update.pc_device_id = null; update.mobile_device_id = null; }
      
      const { error } = await supabaseAdmin.from('profiles').update(update).eq('user_id', user_id);
      if (error) throw error;
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create user (default action)
    const { email, password, full_name, role } = body;
    if (!email || !password || !full_name || !role) {
      throw new Error('Barcha maydonlar to\'ldirilishi kerak');
    }
    if (!['teacher', 'student'].includes(role)) {
      throw new Error('Yaroqsiz rol');
    }

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name }
    });
    if (createError) throw createError;

    const { error: roleError } = await supabaseAdmin.from('user_roles').insert({ user_id: userData.user.id, role });
    if (roleError) throw roleError;

    return new Response(JSON.stringify({ user: userData.user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
