// assets/auth.js
// Fælles auth-hjælper til alle sider
// Inkludér med: <script src="/assets/auth.js"></script>

window.ITAuth = (function () {

  const ALLOWED_ROLES = ["portal_admin", "portal_it_support"];
  const LOGIN_URL     = "/.auth/login/aad";
  const REFRESH_URL   = "/.auth/refresh";

  async function fetchJson(url) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (!r.ok) return null;
      const txt = await r.text();
      try { return txt ? JSON.parse(txt) : null; } catch { return null; }
    } catch { return null; }
  }

  async function tryRefresh() {
    try {
      await fetch(REFRESH_URL);
    } catch {}
  }

  function getRolesFromPrincipal(principal) {
    return [
      ...(principal.userRoles || []),
      ...(principal.claims || [])
        .filter(c => {
          const t = String(c.typ || "").toLowerCase();
          return t === "roles" || t === "role" || t.includes("claims/role");
        })
        .map(c => String(c.val || ""))
    ].map(r => String(r).toLowerCase());
  }

  async function requireAuth(callback) {
    let me = await fetchJson("/.auth/me");
    let principal = me?.clientPrincipal;

    if (!principal?.userDetails) {
      await tryRefresh();
      me = await fetchJson("/.auth/me");
      principal = me?.clientPrincipal;
    }

    if (!principal?.userDetails) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${LOGIN_URL}?post_login_redirect_uri=${redirect}`;
      return;
    }

    const roles = getRolesFromPrincipal(principal);

    if (!roles.some(r => ALLOWED_ROLES.includes(r))) {
      window.location.href = "/unauthorized.html";
      return;
    }

    const isAdmin = roles.includes("portal_admin");
    const user    = principal.userDetails;

    if (typeof callback === "function") {
      callback({ user, roles, isAdmin });
    }
  }

  return { requireAuth, fetchJson };
})();
