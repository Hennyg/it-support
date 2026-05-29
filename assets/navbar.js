(function () {
  const AGENT = "http://localhost:5199";
  const REQUIRED_ENDPOINTS = ["/api/run-ps", "/api/download"];

  async function fetchJson(url) {
    try {
      const r = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!r.ok) return null;
      const txt = await r.text();
      try { return txt ? JSON.parse(txt) : null; } catch { return null; }
    } catch { return null; }
  }

  function buildNavbar({ title, subtitle }) {
    const el = document.createElement("div");
    el.className = "navbar";
    el.innerHTML = `
      <div class="navbar-inner">
        <div class="brand">
          <div>
            <div class="title" id="hpTitle"></div>
            <div class="sub" id="hpSub"></div>
          </div>
        </div>
        <div class="nav" id="hpNavRight">
          <span class="userLine" id="hpUser">Henter bruger...</span>
          <span class="sep">|</span>
          <a id="hpLogout" href="/.auth/logout?post_logout_redirect_uri=/">Log ud</a>
        </div>
      </div>
      <div class="nav-accent"></div>
    `;
    el.querySelector("#hpTitle").textContent = title || "IT Support";
    el.querySelector("#hpSub").textContent = subtitle || "";
    return el;
  }

  function buildAgentBanner(type, message) {
    const el = document.createElement("div");
    el.id = "agentBanner";
    el.style.cssText = `
      background: ${type === "outdated" ? "#fef3c7" : "#fef2f2"};
      border-bottom: 1px solid ${type === "outdated" ? "#fcd34d" : "#fecaca"};
      color: ${type === "outdated" ? "#92400e" : "#991b1b"};
      padding: 8px 20px;
      font-size: .85rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    el.innerHTML = `<span>${type === "outdated" ? "⚠️" : "🔌"}</span><span>${message}</span>`;
    return el;
  }

  function addNavLink(navRight, { id, href, text }) {
    if (!navRight || document.getElementById(id)) return;
    const sep = document.createElement("span");
    sep.className = "sep";
    sep.textContent = "|";
    const a = document.createElement("a");
    a.id = id;
    a.href = href;
    a.textContent = text;
    navRight.prepend(sep);
    navRight.prepend(a);
  }

  async function checkAgent() {
    try {
      const ping = await fetch(AGENT + "/api/ping", { signal: AbortSignal.timeout(2000) });
      if (!ping.ok) return { status: "missing" };

      // Tjek påkrævede endpoints
      const checks = await Promise.all(REQUIRED_ENDPOINTS.map(ep =>
        fetch(AGENT + ep, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _check: true }),
          signal: AbortSignal.timeout(2000)
        }).then(r => ({ ep, ok: r.status !== 404 })).catch(() => ({ ep, ok: false }))
      ));

      const missing = checks.filter(c => !c.ok).map(c => c.ep);
      if (missing.length > 0) return { status: "outdated", missing };

      return { status: "ok" };
    } catch {
      return { status: "missing" };
    }
  }

  async function init() {
    const title = document.querySelector('meta[name="herrup-title"]')?.content || "IT Support";
    const sub   = document.querySelector('meta[name="herrup-subtitle"]')?.content || "";

    const nav = buildNavbar({ title, subtitle: sub });
    document.body.prepend(nav);

    const navRight = nav.querySelector("#hpNavRight");
    const userEl   = nav.querySelector("#hpUser");

    // Bruger og agent-tjek parallelt
    const [me, agentResult] = await Promise.all([
      fetchJson("/.auth/me"),
      checkAgent()
    ]);

    const user = me?.clientPrincipal?.userDetails || "";
    userEl.textContent = user ? user : "Ikke logget ind";

    // Vis agent-advarsel hvis relevant
    if (agentResult.status === "outdated") {
      const banner = buildAgentBanner("outdated",
        `Forældet IT Support Agent — mangler: ${agentResult.missing.join(", ")}. Kontakt IT-support for opdatering.`
      );
      nav.after(banner);
    }

    const path = window.location.pathname;

    if (path !== "/" && path !== "/index.html") {
      addNavLink(navRight, { id: "navHomeLink", href: "/", text: "Forside" });
    }

    if (path.startsWith("/adgang-")) {
      addNavLink(navRight, { id: "navAdgangLink", href: "/adgang.html", text: "Adgang" });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
