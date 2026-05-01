import { NextRequest, NextResponse } from 'next/server'

const UA = 'HubPuntoVendita/1.0 (antonio.petrillo095@gmail.com)'

async function tryUPCitemdb(ean: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${ean}`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } }
    )
    const d = await r.json()
    return d.items?.[0]?.images?.[0] ?? null
  } catch { return null }
}

async function trySerpApi(name: string): Promise<string | null> {
  try {
    const key = process.env.SERPAPI_KEY
    if (!key) return null
    const q = encodeURIComponent(name)
    const r = await fetch(
      `https://serpapi.com/search.json?engine=google_images&q=${q}&num=1&ijn=0&api_key=${key}`,
      { next: { revalidate: 86400 } }
    )
    const d = await r.json()
    const img = d.images_results?.[0]
    return img?.thumbnail ?? img?.original ?? null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const ean  = req.nextUrl.searchParams.get('ean')  ?? ''
  const name = req.nextUrl.searchParams.get('name') ?? ''

  if (!ean && !name) return NextResponse.json({ url: null })

  let url: string | null = null

  if (ean) url = await tryUPCitemdb(ean)
  if (!url && name) url = await trySerpApi(name)

  return NextResponse.json({ url })
}
