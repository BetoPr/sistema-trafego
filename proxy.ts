import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/cadastro",
  "/auth", // /auth/callback do OAuth — handler cria sessão antes de redirecionar
  "/oauth",
  "/termos",
  "/privacidade",
  "/api", // todas API routes — cada handler valida sua própria auth
  // (webhooks via secret no path, cron via Bearer header, user routes via getUser)
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/apresentacao",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh de sessão (importante: NÃO remover esta chamada)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Lock de licença: se acesso_bloqueado=true OU vencimento passou,
  // empurra usuário pra /pagamentos (única área liberada).
  // Whitelist: /pagamentos, /conta (perfil), /api (endpoints), /auth (logout).
  if (user && !isPublic(pathname) && pathname !== "/pagamentos" && !pathname.startsWith("/pagamentos/") && pathname !== "/conta") {
    try {
      const { data: u } = await supabase
        .from("usuarios")
        .select("agencia_id, role")
        .eq("id", user.id)
        .maybeSingle();
      if (u && u.role !== "super_admin") {
        const { data: ag } = await supabase
          .from("agencias")
          .select("acesso_bloqueado, vencimento_em, trial_acaba_em")
          .eq("id", u.agencia_id)
          .maybeSingle();
        if (ag) {
          const agora = new Date();
          const trialOk = ag.trial_acaba_em ? new Date(ag.trial_acaba_em as string) > agora : false;
          const vencOk = ag.vencimento_em ? new Date(ag.vencimento_em as string) >= agora : false;
          const bloqueado = ag.acesso_bloqueado === true || (!trialOk && !vencOk && !!ag.vencimento_em);
          if (bloqueado) {
            const url = request.nextUrl.clone();
            url.pathname = "/pagamentos";
            url.searchParams.set("trancado", "1");
            return NextResponse.redirect(url);
          }
        }
      }
    } catch {
      // não bloqueia request em caso de erro do lookup
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
