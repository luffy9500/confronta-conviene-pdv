import { NextRequest, NextResponse } from 'next/server'

const UA = 'HubPuntoVendita/1.0 (antonio.petrillo095@gmail.com)'

async function tryOFFbyEan(ean: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=image_front_small_url`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } }
    )
    const d = await r.json()
    return d.product?.image_front_small_url ?? null
  } catch { return null }
}

async function tryOFFbyName(name: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(name)
    const r = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&fields=image_front_small_url&page_size=1`,
      { headers: { 'User-Agent': UA }, next: { revalidate: 86400 } }
    )
    const d = await r.json()
    return d.products?.[0]?.image_front_small_url ?? null
  } catch { return null }
}

export async function GET(req: NextRequest) {
  const ean  = req.nextUrl.searchParams.get('ean')  ?? ''
  const name = req.nextUrl.searchParams.get('name') ?? ''

  if (ean) {
    const url = await tryOFFbyEan(ean)
    if (url) return NextResponse.json({ url })
  }

  if (name) {
    const url = await tryOFFbyName(name)
    if (url) return NextResponse.json({ url })
  }

  return NextResponse.json({ url: null })
}
