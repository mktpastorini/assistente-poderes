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
      'remote-addr', // Keep logging, but won't be used for clientIp directly
    ];
    headerNames.forEach(name => {
      console.log(`[get-client-ip] ${name}: ${headers.get(name)}`);
    });
    // Removed req.conn.remoteAddr.hostname as it's causing TypeError
    console.log("[get-client-ip] --- End Request Headers ---");

    const getFirstIp = (headerValue: string | null): string | null => {
      if (!headerValue) return null;
      const ips = headerValue.split(',').map(ip => ip.trim());
      return ips[0] || null;
    };

    const getLastIp = (headerValue: string | null): string | null => {
      if (!headerValue) return null;
      const ips = headerValue.split(',').map(ip => ip.trim());
      return ips[ips.length - 1] || null;
    };

    // Prioritized order for IP detection
    const xVercelForwardedFor = getFirstIp(headers.get('x-vercel-forwarded-for'));
    const cfConnectingIp = getFirstIp(headers.get('cf-connecting-ip'));
    const xForwardedFor = getLastIp(headers.get('x-forwarded-for')); // Using getLastIp for x-forwarded-for
    const xRealIp = getFirstIp(headers.get('x-real-ip'));
    const xClientIp = getFirstIp(headers.get('x-client-ip'));
    const remoteAddrHeader = getFirstIp(headers.get('remote-addr')); // Using getFirstIp for remote-addr header

    if (xVercelForwardedFor) {
      clientIp = xVercelForwardedFor;
      console.log("[get-client-ip] Using x-vercel-forwarded-for");
    } else if (cfConnectingIp) {
      clientIp = cfConnectingIp;
      console.log("[get-client-ip] Using cf-connecting-ip");
    } else if (xForwardedFor) {
      clientIp = xForwardedFor;
      console.log("[get-client-ip] Using x-forwarded-for (last IP)");
    } else if (xRealIp) {
      clientIp = xRealIp;
      console.log("[get-client-ip] Using x-real-ip");
    } else if (xClientIp) {
      clientIp = xClientIp;
      console.log("[get-client-ip] Using x-client-ip");
    } else if (remoteAddrHeader) {
      clientIp = remoteAddrHeader;
      console.log("[get-client-ip] Using remote-addr header");
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
      JSON.stringify({ error: error.message, ip: "Error", stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});