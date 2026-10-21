import { createClient } from "@supabase/supabase-js";
import { AccessToken } from "livekit-server-sdk";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const authorization = request.headers.authorization;
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const { callId } = request.body ?? {};

  if (!accessToken || typeof callId !== "string" || !/^[0-9a-f-]{36}$/i.test(callId)) {
    return response.status(400).json({ error: "Invalid call request" });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const livekitUrl = process.env.LIVEKIT_URL;
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

  if (!supabaseUrl || !supabaseKey || !livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return response.status(503).json({ error: "Voice calling is not configured yet." });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !user) {
    return response.status(401).json({ error: "Sign in to join this call." });
  }

  const { data: call, error: callError } = await supabase
    .from("calls")
    .select("id, caller_id, callee_id, status")
    .eq("id", callId)
    .maybeSingle();

  if (callError || !call || (call.caller_id !== user.id && call.callee_id !== user.id)) {
    return response.status(404).json({ error: "Call not found." });
  }
  if (call.status !== "accepted") {
    return response.status(409).json({ error: "The call has not been accepted." });
  }

  const token = new AccessToken(livekitApiKey, livekitApiSecret, {
    identity: user.id,
    ttl: "10m",
  });
  token.addGrant({
    roomJoin: true,
    room: call.id,
    canPublish: true,
    canSubscribe: true,
    canPublishData: false,
  });

  return response.status(200).json({
    serverUrl: livekitUrl,
    participantToken: await token.toJwt(),
  });
}