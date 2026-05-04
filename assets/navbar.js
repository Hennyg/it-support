(function () {
  async function fetchJson(url) {
    try {
      const r = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!r.ok) return null;
      const txt = await r.text();
      try { return txt ? JSON.parse(txt) : null; } catch { return null; }
    } catch {
      return null;
    }
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

  async function init() {
    const title = document.querySelector('meta[name="herrup-title"]')?.content || "IT Support";
    const sub = document.querySelector('meta[name="herrup-subtitle"]')?.content || "";

    const nav = buildNavbar({ title, subtitle: sub });
    document.body.prepend(nav);

    const navRight = nav.querySelector("#hpNavRight");
    const userEl = nav.querySelector("#hpUser");

    const me = await fetchJson("/.auth/me");
    const user = me?.clientPrincipal?.userDetails || "";
    userEl.textContent = user ? user : "Ikke logget ind";

    const roleData = await fetchJson("/api/getRoles");
    const roles = Array.isArray(roleData?.roles) ? roleData.roles : [];

    const isAdmin = roles.includes("portal_admin");

    // Admin-specifikke links kan tilføjes her fremadrettet
    // Eksempel:
    // if (isAdmin) {
    //   addNavLink(navRight, { id: "navAdminLink", href: "/admin.html", text: "Admin" });
    // }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
