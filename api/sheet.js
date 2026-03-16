// Vercel Serverless Function — proxy Google Sheets API con cache in memoria
// Tutti gli utenti chiamano questo endpoint, Google Sheets viene chiamato
// al massimo una volta ogni CACHE_TTL secondi, indipendentemente dal traffico.

const SHEET_ID = '1OAuJr6h77tCnQRFx0sRB_Sd20fLaSzQpbUO_VhBhAwQ';
const API_KEY  = process.env.SHEETS_API_KEY;
const CACHE_TTL = 60 * 1000; // 60 secondi in ms

const cache = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const range = req.query.range;
  if (!range) {
    return res.status(400).json({ error: 'range mancante' });
  }

  const now = Date.now();
  const cached = cache[range];
  if (cached && now - cached.ts < CACHE_TTL) {
    return res.status(200).json(cached.data);
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) {
    // Se Google dà errore ma ho dati vecchi, li restituisco comunque
    if (cached) return res.status(200).json(cached.data);
    return res.status(r.status).json({ error: 'Sheets API error' });
  }

  const data = await r.json();
  cache[range] = { ts: now, data };

  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  return res.status(200).json(data);
}
