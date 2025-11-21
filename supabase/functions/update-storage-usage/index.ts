import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase Service Role Client (Bu Edge Function'ga DBga to'liq kirish imkonini beradi)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Fayl yo'lidan foydalanuvchi ID sini ajratib olish
function getUserIdFromPath(path: string): string | null {
  // Yo'l formati: user_id/file_name.webm
  const parts = path.split('/');
  if (parts.length >= 2) {
    const userId = parts[0]; // Birinchi qism user_id bo'lishi kerak
    // Oddiy UUID tekshiruvi
    if (userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return userId;
    }
  }
  return null;
}

// Foydalanuvchining barcha fayllari umumiy hajmini hisoblash
async function calculateTotalStorageUsed(userId: string): Promise<number> {
  console.log(`[Storage] Listing files for user: ${userId}`);
  
  // Storage list chaqiruvi. Prefix sifatida userId ni ishlatamiz.
  const { data, error } = await supabaseAdmin.storage.from('recordings').list(userId, {
    limit: 1000, 
    offset: 0,
  });

  if (error) {
    console.error(`[Storage] Error listing storage files for user ${userId}:`, error.message);
    return 0;
  }
  
  if (!data) {
    console.log(`[Storage] No files found for user ${userId}.`);
    return 0;
  }

  console.log(`[Storage] Found ${data.length} files in the recordings bucket under prefix ${userId}.`);

  // Fayl hajmini metadata.size dan olish
  const totalSize = data.reduce((sum, file) => {
    // XATO TUZATILDI: file.size o'rniga file.metadata.size ishlatildi
    const size = file.metadata?.size ?? 0; 
    console.log(`[Storage] File: ${file.name}, Size: ${size}, Metadata: ${JSON.stringify(file.metadata)}`);
    return sum + size;
  }, 0);
  
  console.log(`[Storage] Calculated total size: ${totalSize} bytes.`);
  return totalSize;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const eventType = payload.event_type;
    
    let objectName: string | undefined;
    
    // Storage trigger payloadida 'name' ustuni 'user_id/file_name' ni o'z ichiga oladi.
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
        objectName = payload.new?.name; 
    } else if (eventType === 'DELETE') {
        objectName = payload.old?.name;
    }

    console.log(`[Trigger] Received event: ${eventType}, Object Name: ${objectName}`);

    if (!objectName) {
        // Bu ogohlantirish endi 'Missing object name' deb chiqadi
        console.warn(`[Trigger] Missing object name in payload for event type: ${eventType}`);
        return new Response('Missing object name in payload', { status: 400, headers: corsHeaders });
    }

    // objectName ni path sifatida ishlatamiz
    const userId = getUserIdFromPath(objectName);

    if (!userId) {
      console.warn(`[Trigger] Could not extract user ID from object name: ${objectName}`);
      return new Response('User ID not found', { status: 200, headers: corsHeaders });
    }

    // Umumiy hajmni qayta hisoblash
    const totalUsedBytes = await calculateTotalStorageUsed(userId);

    // Profiles jadvalini yangilash
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ storage_used_bytes: totalUsedBytes })
      .eq('id', userId);

    if (updateError) {
      console.error("[DB Update] Error updating profile storage usage:", updateError.message);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Success] Storage usage updated for user ${userId}: ${totalUsedBytes} bytes.`);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[Fatal] Edge Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});