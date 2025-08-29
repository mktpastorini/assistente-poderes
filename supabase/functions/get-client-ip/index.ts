import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let clientIp = "Unknown";
    const headers = req.headers;

    // Log all potentially relevant IP headers for debugging
    console.log("[get-client-ip] --- Request Headers for IP Detection ---");
    const headerNames = [
      'x-vercel-forwarded-for',
      'cf-connecting-ip',
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'remote-addr',
    ];
    headerNames.forEach(name => {
      console.log(`[get-client-ip] ${name}: ${headers.get(name)}`);
    });
    console.log(`[get-client-ip] Request IP (Deno.Conn.remoteAddr): ${req.conn.remoteAddr.hostname}`);
    console.log("[get-client-ip] --- End Request Headers ---");

    const getFirstIp = (headerValue: string | null): string | null => {
      if (!headerValue) return null;
      const ips = headerValue.split(',').map(ip => ip.trim());
      return ips[0] || null;
    };

    // Prioritized order for IP detection
    const xVercelForwardedFor = getFirstIp(headers.get('x-vercel-forwarded-for'));
    const cfConnectingIp = getFirstIp(headers.get('cf-connecting-ip'));
    const xForwardedFor = getFirstIp(headers.get('x-forwarded-for'));
    const xRealIp = getFirstIp(headers.get('x-real-ip'));
    const xClientIp = getFirstIp(headers.get('x-client-ip'));
    const remoteAddr = req.conn.remoteAddr.hostname; // Deno's direct connection IP

    if (xVercelForwardedFor) {
      clientIp = xVercelForwardedFor;
      console.log("[get-client-ip] Using x-vercel-forwarded-for");
    } else if (cfConnectingIp) {
      clientIp = cfConnectingIp;
      console.log("[get-client-ip] Using cf-connecting-ip");
    } else if (xForwardedFor) {
      clientIp = xForwardedFor;
      console.log("[get-client-ip] Using x-forwarded-for");
    } else if (xRealIp) {
      clientIp = xRealIp;
      console.log("[get-client-ip] Using x-real-ip");
    } else if (xClientIp) {
      clientIp = xClientIp;
      console.log("[get-client-ip] Using x-client-ip");
    } else if (remoteAddr) {
      clientIp = remoteAddr;
      console.log("[get-client-ip] Using Deno.Conn.remoteAddr");
    } else {
      clientIp = "Unknown";
      console.log("[get-client-ip] No IP header found, defaulting to Unknown");
    }

    console.log(`[get-client-ip] Final Detected Client IP: ${clientIp}`);

    return new Response(
      JSON.stringify({ ip: clientIp }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Edge Function Error (get-client-ip):', error);
    return new Response(
      JSON.stringify({ error: error.message, ip: "Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});