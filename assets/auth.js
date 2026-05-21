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

  // Forsøg token-refresh og prøv igen
  async function tryRefresh() {
    try {
      await fetch(REFRESH_URL);
    } catch {}
  }

  // Hoved auth-tjek — kalder callback med { user, roles, isAdmin }
  // Ved fejl redirecter til login automatisk
  async function requireAuth(callback) {
    let me = await fetchJson("/.auth/me");
    let principal = me?.clientPrincipal;

    // Hvis ingen principal — forsøg refresh og prøv igen
    if (!principal?.userDetails) {
      await tryRefresh();
      me = await fetchJson("/.auth/me");
      principal = me?.clientPrincipal;
    }

    // Stadig ingen principal — send til login
    if (!principal?.userDetails) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `${LOGIN_URL}?post_login_redirect_uri=${redirect}`;
      return;
    }

    // Hent roller
    let rolesData = await fetchJson("/api/getRoles");
    const roles = Array.isArray(rolesData?.roles) ? rolesData.roles : [];

    // Tjek adgang
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
