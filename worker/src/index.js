const ALLOWED_ORIGIN = "https://notl-puuki9122.github.io";

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed." }, 403, origin);
    const url = new URL(request.url);
    if (url.pathname !== "/api/profile" || request.method !== "GET") return json({ error: "Not found." }, 404, origin);
    if (!env.HYPIXEL_API_KEY) return json({ error: "The profile API is not configured yet." }, 503, origin);
    const name = (url.searchParams.get("name") || "").trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return json({ error: "Enter a valid Minecraft username." }, 400, origin);

    try {
      const mojang = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`, { headers: { Accept: "application/json" } });
      if (mojang.status === 204 || mojang.status === 404) return json({ error: "That Minecraft username could not be found." }, 404, origin);
      if (!mojang.ok) return json({ error: "Minecraft name lookup is temporarily unavailable. Try again shortly." }, 502, origin);
      const identity = await mojang.json();
      const uuid = identity.id;
      const response = await fetch(`https://api.hypixel.net/v2/skyblock/profiles?uuid=${encodeURIComponent(uuid)}`, {
        headers: { "API-Key": env.HYPIXEL_API_KEY, Accept: "application/json" }
      });
      if (response.status === 403) return json({ error: "The configured Hypixel API key was rejected." }, 502, origin);
      if (response.status === 429) return json({ error: "Hypixel's API limit was reached. Wait a moment and try again." }, 429, origin);
      if (!response.ok) return json({ error: "Hypixel profile lookup failed. Try again shortly." }, 502, origin);
      const result = await response.json();
      if (!result.success) return json({ error: "Hypixel could not return this profile." }, 502, origin);
      const profiles = (result.profiles || []).filter(p => p?.members?.[uuid]);
      if (!profiles.length) return json({ error: "No public SkyBlock profile was found for this player." }, 404, origin);
      const active = profiles.find(p => p.selected) || profiles.sort((a, b) => (b.members[uuid].last_save || 0) - (a.members[uuid].last_save || 0))[0];
      const member = active.members[uuid];
      const playerData = member.player_data || {};
      const miningCore = member.mining_core || {};
      return json({
        player: { name: identity.name, uuid },
        profile: { id: active.profile_id, cuteName: active.cute_name || "SkyBlock", selected: !!active.selected },
        fetchedAt: Date.now(),
        stats: {
          skillXp: playerData.experience || {},
          collections: member.collection || {},
          hotm: miningCore,
          garden: member.garden || null,
          leveling: member.leveling || null,
          currencies: member.currencies || null
        },
        available: { inventory: false, gear: false, prices: false, leaderboards: false }
      }, 200, origin);
    } catch {
      return json({ error: "The profile service could not be reached. Try again shortly." }, 502, origin);
    }
  }
};

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
