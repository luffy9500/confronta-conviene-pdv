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

export async function GET(req: NextRequest) {
  const ean = req.nextUrl.searchParams.get('ean') ?? ''
  if (!ean) return NextResponse.json({ url: null })

  const url = await tryUPCitemdb(ean)
  return NextResponse.json({ url: url ?? null })
}
