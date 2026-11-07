import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { INTERFACE_COOKIE } from '@/lib/new-look'
import { legacyOriginResponse } from '@/lib/deployment/legacy-origin'
import { stagingAccessStatus } from '@/lib/deployment/staging'

export async function middleware(request: NextRequest) {
  const response = await handleRequest(request);
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'staging') {
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

async function handleRequest(request: NextRequest) {
  const transition = await legacyOriginResponse(request, process.env.LEGACY_HOST_REDIRECT);
  if (transition) return transition;
  // A staging smoke artifact has no working service credentials. Keep API
  // handlers, authentication callbacks and server actions inaccessible as well.
  if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'smoke') {
    const path = request.nextUrl.pathname;
    const allowed = ['/login', '/privacy', '/terms', '/api/health/live', '/api/health/ready', '/api/version', '/version.json', '/manifest.json', '/sw.js'];
    if (!['GET', 'HEAD'].includes(request.method) || !allowed.includes(path)) {
      return NextResponse.json({ error: 'This staging site only tests deployment. Sign-in and budget changes are disabled.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
    }
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex');
    return response;
  }
  // These public probes do not refresh sessions or depend on cookie middleware.
  if (['/api/health/live', '/api/health/ready', '/api/version', '/version.json'].includes(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  if (process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'staging') {
    const status = stagingAccessStatus(request.nextUrl.pathname, request.method, user?.id, {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      STAGING_ALLOWED_USER_IDS: process.env.STAGING_ALLOWED_USER_IDS,
    });
    if (status) {
      if (status === 401 && request.method === 'GET' && !request.nextUrl.pathname.startsWith('/api/')) {
        const url = request.nextUrl.clone(); url.pathname = '/login'; url.search = '';
        return NextResponse.redirect(url);
      }
      return NextResponse.json({ error: status === 503 ? 'This operation is disabled in staging.' : 'Staging is limited to dedicated test accounts.' }, { status });
    }
  }

  // Admin routes - require admin privileges (includes /admin/test/*)
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin')
  
  // Legacy test pages at root level - require admin privileges
  const isTestPath = request.nextUrl.pathname.startsWith('/test')
  
  if (isAdminPath || isTestPath) {
    // Require authentication
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = ''
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search)
      return NextResponse.redirect(url)
    }
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()
    
    // If not admin, return 404 to hide admin/test routes
    if (!profile || !profile.is_admin) {
      return new NextResponse(null, { status: 404 })
    }
  }

  // Protected routes - require authentication
  const protectedPaths = ['/new', '/dashboard', '/categories', '/accounts', '/credit-cards', '/transactions', '/reports', '/import', '/imports', '/goals', '/loans', '/settings', '/help', '/income', '/income-buffer', '/money-movement', '/category-rules', '/non-cash-assets', '/pending-checks']
  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  )

  // Public routes - allow without authentication
  const publicPaths = ['/login', '/signup', '/auth', '/privacy', '/terms', '/invite']
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path))
  
  // Invitations choose page requires authentication
  const isInvitationsChoose = request.nextUrl.pathname === '/invitations/choose'

  // Redirect to login if accessing protected route without authentication
  if ((isProtectedPath || isInvitationsChoose) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if accessing login/signup while authenticated
  if (isPublicPath && user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = request.cookies.get(INTERFACE_COOKIE)?.value === 'new' ? '/new' : '/dashboard'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users from home page to dashboard
  if (request.nextUrl.pathname === '/' && user) {
    const url = request.nextUrl.clone()
    url.pathname = request.cookies.get(INTERFACE_COOKIE)?.value === 'new' ? '/new' : '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // API identifiers may contain dots; never let the static-file exclusion
    // bypass staging isolation or retirement guards for an API mutation.
    '/api/:path*',
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


