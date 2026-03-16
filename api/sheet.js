// Vercel Serverless Function — proxy Google Sheets API
// Nasconde la API key lato server, nessuna cache CDN per dati sempre freschi.

const SHEET_ID = '1OAuJr6h77tCnQRFx0sRB_Sd20fLaSzQpbUO_VhBhAwQ';
const API_KEY  = process.env.SHEETS_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');

  const range = req.query.range;
  if (!range) {
    return res.status(400).json({ error: 'range mancante' });
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) {
    return res.status(r.status).json({ error: 'Sheets API error' });
  }

  const data = await r.json();
  return res.status(200).json(data);
}
