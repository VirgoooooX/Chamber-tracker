export default {
  async fetch(request, env) {
    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    const url = new URL(request.url)
    if (request.method === 'GET' && url.pathname === '/health') {
      const headers = new Headers(corsHeaders)
      headers.set('content-type', 'application/json')
      return new Response(
        JSON.stringify({
          ok: true,
          hasBucket: Boolean(env.R2_BUCKET),
          publicBaseUrl: env.PUBLIC_BASE_URL || null,
        }),
        { status: 200, headers }
      )
    }

    if (request.method === 'GET' && url.pathname === '/file') {
      const path = url.searchParams.get('path')
      if (!path) {
        return new Response('missing path', { status: 400, headers: corsHeaders })
      }

      const obj = await env.R2_BUCKET.get(path)
      if (!obj) {
        return new Response('not found', { status: 404, headers: corsHeaders })
      }

      const headers = new Headers(corsHeaders)
      const contentType = obj.httpMetadata?.contentType
      if (contentType) headers.set('content-type', contentType)
      headers.set('cache-control', 'public, max-age=3600')
      return new Response(obj.body, { status: 200, headers })
    }

    if (request.method === 'POST' && url.pathname === '/upload') {
      const path = url.searchParams.get('path')
      if (!path) {
        return new Response('missing path', { status: 400, headers: corsHeaders })
      }

      const contentType = request.headers.get('content-type') || 'application/octet-stream'
      const body = await request.arrayBuffer()

      await env.R2_BUCKET.put(path, body, {
        httpMetadata: {
          contentType,
        },
      })

      const base = env.PUBLIC_BASE_URL || ''
      const normalized = base.endsWith('/') ? base.slice(0, -1) : base
      const fileUrl = `${url.origin}/file?path=${encodeURIComponent(path)}`
      const publicUrl = normalized ? `${normalized}/${path}` : null
      const urlValue = publicUrl || fileUrl
      return Response.json({ url: urlValue, path, fileUrl, publicUrl }, { headers: corsHeaders })
    }

    if (request.method === 'DELETE' && url.pathname === '/delete') {
      const path = url.searchParams.get('path')
      if (!path) {
        return new Response('missing path', { status: 400, headers: corsHeaders })
      }
      await env.R2_BUCKET.delete(path)
      return Response.json({ ok: true }, { headers: corsHeaders })
    }

    return new Response('not found', { status: 404, headers: corsHeaders })
  },
}
