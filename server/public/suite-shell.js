(function () {
  var TAB_ID = "hc-tab";
  var MOBILE_TAB_ID = "hc-mtab";
  var USERS_TAB_ID = "hc-users-tab";
  var USERS_MOBILE_TAB_ID = "hc-users-mtab";
  var PANEL_ID = "hc-panel";
  var MODES = {
    containers: { path: "/app/containers", own: true },
    users: { path: "/app/users", own: true },
    quotations: { path: "/app/quotations", labels: ["Quotation"] },
    purchases: { path: "/app/purchases", labels: ["Purchase Management", "Purchases"] },
    payments: { path: "/app/payments", labels: ["Payment Accounts", "Accounts"] },
  };
  var ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="CLS"><path d="M22 7.7c0-.6-.4-1.2-.8-1.5l-6.3-3.9a1.72 1.72 0 0 0-1.7 0l-10.3 6c-.5.2-.9.8-.9 1.4v6.6c0 .5.4 1.2.8 1.5l6.3 3.9a1.72 1.72 0 0 0 1.7 0l10.3-6c.5-.3.9-1 .9-1.5Z"></path><path d="M10 21.9V14L2.1 9.1"></path><path d="m10 14 11.9-6.9"></path><path d="M14 19.8v-8.1"></path><path d="M18 17.5V9.4"></path></svg>';
  var active = false;
  var panelMode = "containers";
  var isAdmin = false;
  var signedInUser = null;
  var scheduled = false;

  var css = [
    "body.hc-on main,body.hc-on footer{visibility:hidden}",
    "body.hc-on{overflow:hidden}",
    "#hc-panel{position:fixed;right:0;z-index:30;background:#f8fafc;display:none}",
    "#hadi-account{display:flex;align-items:center;gap:10px;margin-left:14px;padding-left:14px;border-left:1px solid #e2e8f0;flex-shrink:0}",
    "#hadi-account .hadi-avatar{width:32px;height:32px;border-radius:999px;background:#0b2545;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;letter-spacing:.02em;cursor:pointer}",
    "#hadi-account .hadi-who{display:flex;flex-direction:column;line-height:1.15}",
    "#hadi-account .hadi-name{font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap}",
    "#hadi-account .hadi-role{font-size:11px;color:#64748b}",
    "#hadi-account button{font:inherit;cursor:pointer;border-radius:8px;padding:6px 11px;font-size:12px;font-weight:600;line-height:1.2;white-space:nowrap}",
    "#hadi-account .hadi-users{border:1px solid #cbd5e1;background:#fff;color:#0f172a}",
    "#hadi-account .hadi-users:hover{border-color:#2563eb;color:#1d4ed8}",
    "#hadi-account .hadi-logout{border:1px solid transparent;background:#f1f5f9;color:#334155}",
    "#hadi-account .hadi-logout:hover{background:#e2e8f0}",
    "@media (max-width:900px){#hadi-account .hadi-who,#hadi-account .hadi-users{display:none}}",
    "#hadi-menu{position:fixed;z-index:70;right:10px;top:60px;min-width:200px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 12px 32px rgba(15,23,42,.16);padding:6px}",
    "#hadi-menu .hadi-menu-who{padding:8px 10px 6px;border-bottom:1px solid #f1f5f9;margin-bottom:4px}",
    "#hadi-menu strong{display:block;font-size:13px;color:#0f172a}",
    "#hadi-menu span{display:block;font-size:11px;color:#64748b}",
    "#hadi-menu button{display:block;width:100%;text-align:left;border:0;background:transparent;border-radius:8px;padding:9px 10px;font:inherit;font-size:13px;font-weight:600;color:#0f172a;cursor:pointer}",
    "#hadi-menu button:hover{background:#f1f5f9}",
    "@media (min-width:901px){#hadi-menu{display:none}}",
    "@media (max-width:640px){input,select,textarea{font-size:16px!important}}",
    "@media (min-width:768px){body:has(aside.w-64) .md\\:pl-20{padding-left:16rem!important}}",
    "body.hc-on #hc-panel{display:block}",
    "#hc-panel iframe{width:100%;height:100%;border:0;display:block}",
    "body.hc-own aside>div.flex-1>button:not(#hc-tab):not(#hc-users-tab){background-color:transparent!important;border-left-width:0!important;box-shadow:none!important}",
    "body.hc-own aside>div.flex-1>button:not(#hc-tab):not(#hc-users-tab)>div:first-child{background-color:#f1f5f9!important;color:#64748b!important;box-shadow:none!important}",
    "body.hc-own aside>div.flex-1>button:not(#hc-tab):not(#hc-users-tab) .text-blue-950{color:#334155!important}",
    "#hc-tab.hc-active{background-color:rgba(239,246,255,.9)!important;border-left:4px solid #2563eb!important;box-shadow:0 1px 2px rgba(15,23,42,.06)!important}",
    "#hc-tab.hc-active>div:first-child{background-color:#2563eb!important;color:#fff!important}",
    "#hc-tab.hc-active .hc-label{color:#172554!important;font-weight:700!important}",
    "body.hc-own nav>button:not(#hc-mtab):not(#hc-users-mtab){background-color:transparent!important;box-shadow:none!important}",
    "body.hc-own nav>button:not(#hc-mtab):not(#hc-users-mtab),body.hc-own nav>button:not(#hc-mtab):not(#hc-users-mtab) *{color:#64748b!important;font-weight:500!important}",
    "body.hc-own nav>button:not(#hc-mtab):not(#hc-users-mtab) span.absolute{display:none!important}",
    "#hc-mtab.hc-active{background-color:#eff6ff!important}",
    "#hc-mtab.hc-active,#hc-mtab.hc-active *{color:#2563eb!important;font-weight:700!important}",
    "#hc-users-tab.hc-active{background-color:rgba(239,246,255,.9)!important;border-left:4px solid #2563eb!important;box-shadow:0 1px 2px rgba(15,23,42,.06)!important}",
    "#hc-users-tab.hc-active>div:first-child{background-color:#2563eb!important;color:#fff!important}",
    "#hc-users-tab.hc-active .hc-label{color:#172554!important;font-weight:700!important}",
    "#hc-users-mtab.hc-active{background-color:#eff6ff!important}",
    "#hc-users-mtab.hc-active,#hc-users-mtab.hc-active *{color:#2563eb!important;font-weight:700!important}",
  ].join("");

  function addStyle() {
    if (document.getElementById("hc-style")) return;
    var style = document.createElement("style");
    style.id = "hc-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function aside() {
    return document.querySelector("aside");
  }

  function moduleList() {
    var a = aside();
    return a ? a.querySelector(":scope > div.flex-1") : null;
  }

  function mobileNav() {
    return document.querySelector("nav");
  }

  function swapIcon(button) {
    var svg = button.querySelector("svg");
    if (!svg) return;
    svg.outerHTML = ICON.replace("CLS", svg.getAttribute("class") || "w-5 h-5");
  }

  function buildDesktopTab(list) {
    var buttons = Array.prototype.filter.call(list.children, function (node) {
      return node.tagName === "BUTTON" && node.id !== TAB_ID && node.id !== USERS_TAB_ID;
    });
    var inactive = buttons.filter(function (button) {
      return button.className.indexOf("border-l-4") === -1;
    });
    var source = inactive.indexOf(buttons[1]) >= 0 ? buttons[1] : inactive[0];
    if (!source) return null;

    var tab = source.cloneNode(true);
    tab.id = TAB_ID;
    tab.type = "button";
    tab.title = "Containers - shipping document folders";
    swapIcon(tab);
    var textBox = tab.querySelector("div.min-w-0");
    if (textBox) {
      var spans = textBox.querySelectorAll("span");
      if (spans[0]) {
        spans[0].textContent = "Containers";
        spans[0].classList.add("hc-label");
      }
      if (spans[1]) spans[1].textContent = "6";
      if (textBox.children[1]) textBox.children[1].textContent = "Shipping Documents & PDF Merge";
    }
    return tab;
  }

  function labelTab(tab, title, subtitle, badge) {
    tab.title = title;
    swapIcon(tab);
    var textBox = tab.querySelector("div.min-w-0");
    if (!textBox) return tab;
    var spans = textBox.querySelectorAll("span");
    if (spans[0]) {
      spans[0].textContent = title;
      spans[0].classList.add("hc-label");
    }
    if (spans[1]) spans[1].textContent = badge;
    if (textBox.children[1]) textBox.children[1].textContent = subtitle;
    return tab;
  }

  function buildUsersTab(list) {
    var source = document.getElementById(TAB_ID) || buildDesktopTab(list);
    if (!source) return null;
    var tab = source.cloneNode(true);
    tab.id = USERS_TAB_ID;
    tab.type = "button";
    tab.classList.remove("hc-active");
    return labelTab(tab, "User management", "Create, update, and delete users", "Admin");
  }

  function buildMobileTab(nav) {
    var buttons = Array.prototype.filter.call(nav.children, function (node) {
      return node.tagName === "BUTTON" && node.id !== MOBILE_TAB_ID && node.id !== USERS_MOBILE_TAB_ID;
    });
    var inactive = buttons.filter(function (button) {
      return button.className.indexOf("bg-blue-50") === -1;
    });
    var source = inactive.indexOf(buttons[1]) >= 0 ? buttons[1] : inactive[0];
    if (!source) return null;

    var tab = source.cloneNode(true);
    tab.id = MOBILE_TAB_ID;
    tab.type = "button";
    swapIcon(tab);
    Array.prototype.forEach.call(tab.querySelectorAll("span.absolute"), function (dot) {
      dot.remove();
    });
    var labels = tab.querySelectorAll(":scope > span");
    if (labels.length) labels[labels.length - 1].textContent = "Containers";
    return tab;
  }

  function panel(create) {
    var existing = document.getElementById(PANEL_ID);
    if (existing || !create) return existing;
    var wrapper = document.createElement("div");
    wrapper.id = PANEL_ID;
    var frame = document.createElement("iframe");
    frame.src = MODES[panelMode].path;
    frame.title = "Hadi Impex";
    frame.addEventListener("load", function () {
      frame.setAttribute("data-ready", "1");
    });
    frame.setAttribute("allow", "web-share; clipboard-write");
    wrapper.appendChild(frame);
    document.body.appendChild(wrapper);
    return wrapper;
  }

  function position() {
    var box = panel(false);
    if (!box) return;
    var header = document.querySelector("header");
    var side = aside();
    var nav = mobileNav();
    var top = header ? header.getBoundingClientRect().bottom : 0;
    var left = side && getComputedStyle(side).display !== "none" ? side.getBoundingClientRect().right : 0;
    var bottom = nav && getComputedStyle(nav).display !== "none" ? nav.getBoundingClientRect().height : 0;
    box.style.top = Math.max(0, top) + "px";
    box.style.left = Math.max(0, left) + "px";
    box.style.bottom = Math.max(0, bottom) + "px";
  }

  function paint() {
    document.body.classList.toggle("hc-on", active);
    document.body.classList.toggle("hc-own", active && !!MODES[panelMode].own);
    var tab = document.getElementById(TAB_ID);
    var mobileTab = document.getElementById(MOBILE_TAB_ID);
    var usersTab = document.getElementById(USERS_TAB_ID);
    var usersMobile = document.getElementById(USERS_MOBILE_TAB_ID);
    if (tab) tab.classList.toggle("hc-active", active && panelMode === "containers");
    if (mobileTab) mobileTab.classList.toggle("hc-active", active && panelMode === "containers");
    if (usersTab) usersTab.classList.toggle("hc-active", active && panelMode === "users");
    if (usersMobile) usersMobile.classList.toggle("hc-active", active && panelMode === "users");
    if (active) {
      panel(true);
      position();
    }
  }

  function showPanel(mode) {
    var changed = !active || panelMode !== mode;
    panelMode = mode;
    active = true;
    var frame = document.querySelector("#" + PANEL_ID + " iframe");
    var src = MODES[mode].path;
    if (frame && changed) {
      if (frame.getAttribute("data-ready") && frame.contentWindow) {
        frame.contentWindow.postMessage({ type: "hadi-navigate", path: src.replace(/^\/app/, "") }, location.origin);
      } else if (frame.getAttribute("src") !== src) {
        frame.src = src;
      }
    }
    window.scrollTo(0, 0);
    if (location.hash !== "#" + mode) history.replaceState(null, "", "#" + mode);
    paint();
  }

  function setActive(on) {
    active = on;
    if (!on && MODES[location.hash.slice(1)]) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    paint();
  }

  function nativeMode(button) {
    var lines = (button.innerText || "").split("\n").map(function (line) { return line.trim(); });
    for (var key in MODES) {
      var labels = MODES[key].labels;
      if (!labels) continue;
      for (var i = 0; i < labels.length; i += 1) if (lines.indexOf(labels[i]) >= 0) return key;
    }
    return "";
  }

  function openMode(mode) {
    var button = MODES[mode].own ? null : nativeButton(mode);
    if (button) button.click();
    else showPanel(mode);
  }

  function nativeButton(mode) {
    var buttons = document.querySelectorAll("aside > div.flex-1 > button, nav > button");
    for (var i = 0; i < buttons.length; i += 1) {
      if (buttons[i].offsetParent !== null && nativeMode(buttons[i]) === mode) return buttons[i];
    }
    return null;
  }

  function ensure() {
    var list = moduleList();
    var side = aside();
    if (list && side) {
      var key = side.className.indexOf("w-64") >= 0 ? "wide" : "narrow";
      var tab = document.getElementById(TAB_ID);
      if (!tab || tab.parentNode !== list || tab.getAttribute("data-key") !== key) {
        if (tab) tab.remove();
        tab = buildDesktopTab(list);
        if (tab) {
          tab.setAttribute("data-key", key);
          list.appendChild(tab);
        }
      }
    }
    if (isAdmin && list) {
      var usersTab = document.getElementById(USERS_TAB_ID);
      var containersTab = document.getElementById(TAB_ID);
      if (!usersTab || usersTab.parentNode !== list) {
        if (usersTab) usersTab.remove();
        usersTab = buildUsersTab(list);
        if (usersTab) list.appendChild(usersTab);
      }
      if (usersTab && containersTab && usersTab.previousElementSibling !== containersTab) {
        if (containersTab.nextSibling) list.insertBefore(usersTab, containersTab.nextSibling);
        else list.appendChild(usersTab);
      }
      bindTab(usersTab, "users");
    }
    bindTab(document.getElementById(TAB_ID), "containers");
    bindTab(document.getElementById(MOBILE_TAB_ID), "containers");
    bindTab(document.getElementById(USERS_MOBILE_TAB_ID), "users");
    mountAccount();
    var nav = mobileNav();
    if (nav && !document.getElementById(MOBILE_TAB_ID)) {
      var mobileTab = buildMobileTab(nav);
      if (mobileTab) nav.appendChild(mobileTab);
    }
    paint();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      ensure();
    }, 60);
  }

  document.addEventListener(
    "click",
    function (event) {
      if (!event.target.closest) return;
      if (event.target.closest("#hadi-menu, .hadi-avatar")) return;
      closeMenu();
      if (event.target.closest("#" + USERS_TAB_ID + ",#" + USERS_MOBILE_TAB_ID + ",#hadi-open-users")) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        showPanel("users");
        return;
      }
      if (event.target.closest("#" + TAB_ID + ",#" + MOBILE_TAB_ID)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        showPanel("containers");
        return;
      }
      var native = event.target.closest("aside > div.flex-1 > button, nav > button");
      if (native) {
        var mode = nativeMode(native);
        if (mode) showPanel(mode);
        else if (active) setActive(false);
      }
      if (event.target.closest("aside button")) setTimeout(position, 340);
    },
    true
  );

  function bindTab(tab, mode) {
    if (!tab || tab.getAttribute("data-bound") === mode) return;
    tab.setAttribute("data-bound", mode);
    tab.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      showPanel(mode);
    });
  }

  function closeMenu() {
    var menu = document.getElementById("hadi-menu");
    if (menu) menu.remove();
  }

  function mountAccount() {
    if (!signedInUser) return;
    var header = document.querySelector("header");
    if (!header) return;
    var groups = Array.prototype.filter.call(header.children, function (el) {
      return el.id !== "hadi-account" && el.tagName === "DIV";
    });
    var cluster = groups.length ? groups[groups.length - 1] : header;
    var slot = document.getElementById("hadi-account");
    if (!slot) {
      slot = document.createElement("div");
      slot.id = "hadi-account";
      cluster.appendChild(slot);
    } else if (slot.parentNode !== cluster) {
      cluster.appendChild(slot);
    }
    var marker = signedInUser.displayName + ":" + signedInUser.role;
    if (slot.getAttribute("data-user") === marker) return;
    slot.setAttribute("data-user", marker);
    slot.textContent = "";
    var avatar = document.createElement("div");
    avatar.className = "hadi-avatar";
    avatar.title = "Account";
    avatar.setAttribute("role", "button");
    avatar.tabIndex = 0;
    avatar.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      if (window.innerWidth > 900) return;
      if (document.getElementById("hadi-menu")) {
        closeMenu();
        return;
      }
      var menu = document.createElement("div");
      menu.id = "hadi-menu";
      var who = document.createElement("div");
      who.className = "hadi-menu-who";
      var strong = document.createElement("strong");
      strong.textContent = signedInUser.displayName;
      var detail = document.createElement("span");
      detail.textContent = role.textContent;
      who.appendChild(strong);
      who.appendChild(detail);
      menu.appendChild(who);
      if (signedInUser.role === "admin") {
        var users = document.createElement("button");
        users.type = "button";
        users.textContent = "User management";
        users.addEventListener("click", function (click) {
          click.preventDefault();
          click.stopPropagation();
          closeMenu();
          showPanel("users");
        });
        menu.appendChild(users);
      }
      document.body.appendChild(menu);
    });
    avatar.textContent = String(signedInUser.displayName || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0).toUpperCase(); })
      .join("");
    slot.appendChild(avatar);
    var who = document.createElement("div");
    who.className = "hadi-who";
    var name = document.createElement("span");
    name.className = "hadi-name";
    name.textContent = signedInUser.displayName;
    var role = document.createElement("span");
    role.className = "hadi-role";
    role.textContent = signedInUser.role === "admin" ? "Administrator" : signedInUser.role === "write" ? "Can edit" : "View only";
    who.appendChild(name);
    who.appendChild(role);
    slot.appendChild(who);
    if (signedInUser.role === "admin") {
      var users = document.createElement("button");
      users.type = "button";
      users.id = "hadi-open-users";
      users.className = "hadi-users";
      users.textContent = "User management";
      users.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        showPanel("users");
      });
      slot.appendChild(users);
    }
    var logout = document.createElement("button");
    logout.type = "button";
    logout.className = "hadi-logout";
    logout.textContent = "Log out";
    logout.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      fetch("/api/logout", { method: "POST" }).then(function () {
        location.href = "/login";
      });
    });
    slot.appendChild(logout);
  }

  function start() {
    addStyle();
    var startMode = location.hash.slice(1);
    if (MODES[startMode] && MODES[startMode].own) {
      panelMode = startMode;
      active = true;
    } else if (MODES[startMode]) {
      setTimeout(function () { openMode(startMode); }, 0);
    }
    window.addEventListener("hashchange", function () {
      var mode = location.hash.slice(1);
      if (!MODES[mode]) {
        if (active) setActive(false);
        return;
      }
      if (!active || mode !== panelMode) openMode(mode);
    });
    fetch("/api/me")
      .then(function (response) { return response.json(); })
      .then(function (data) {
        signedInUser = data.user || null;
        isAdmin = signedInUser && signedInUser.role === "admin";
        ensure();
      })
      .catch(function () {});
    ensure();
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    window.addEventListener("resize", position);
    var side = aside();
    if (side) side.addEventListener("transitionend", position);
  }

  if (document.readyState === "complete") setTimeout(start, 300);
  else
    window.addEventListener("load", function () {
      setTimeout(start, 300);
    });
})();
