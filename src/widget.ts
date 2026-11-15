/**
 * Dati per i widget iPhone (app Scripting) del "Diario Alimentare".
 * Il diario e le attività del coach li salvano col tool `salva_widget`;
 * il telefono li legge da GET /widget/<token>, senza login.
 * Il token è casuale, creato al primo salvataggio, e sta nel KV.
 */
const KEY_DATA = "widget:dati";
const KEY_TOKEN = "widget:token";

export async function saveWidgetData(kv: KVNamespace, publicUrl: string, json: string) {
  const nuovi = JSON.parse(json);
  if (!nuovi || typeof nuovi !== "object" || Array.isArray(nuovi)) throw new Error("dati deve essere un oggetto JSON");
  const vecchi = ((await kv.get(KEY_DATA, "json")) as Record<string, unknown> | null) ?? {};
  // unione per chiave di primo livello: chi salva solo "corpo" non cancella "cibo"
  const dati = { ...vecchi, ...nuovi, aggiornato: new Date().toISOString() };
  const testo = JSON.stringify(dati);
  if (testo.length > 50_000) throw new Error("dati troppo grandi (max 50 KB)");
  await kv.put(KEY_DATA, testo);
  let token = await kv.get(KEY_TOKEN);
  if (!token) {
    const b = crypto.getRandomValues(new Uint8Array(18));
    token = btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await kv.put(KEY_TOKEN, token);
  }
  return { url: `${publicUrl.replace(/\/$/, "")}/widget/${token}`, chiavi: Object.keys(dati) };
}

export async function readWidgetData(kv: KVNamespace, token: string): Promise<string | null> {
  const giusto = await kv.get(KEY_TOKEN);
  if (!giusto || token.length !== giusto.length) return null;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ giusto.charCodeAt(i);
  if (diff) return null;
  return (await kv.get(KEY_DATA)) ?? "{}";
}
