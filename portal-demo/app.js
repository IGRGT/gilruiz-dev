(() => {
  const state = {
    inventory: null,
    currency: "MXN",
    rate: 17.20,
    cart: {},
    filter: { q: "", category: "" }
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function fmtPrice(mxn) {
    const value = state.currency === "USD" ? mxn / state.rate : mxn;
    return `$${value.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ${state.currency}`;
  }

  async function loadInventory() {
    const res = await fetch("./inventory.json");
    state.inventory = await res.json();
    state.rate = state.inventory.exchange_rate_mxn_per_usd;
    populateCategories();
    render();
    $("#rate-note").textContent =
      `Tipo de cambio referencia: 1 USD = ${state.rate.toFixed(2)} MXN ` +
      `(actualizado ${state.inventory.rate_updated})`;
  }

  function populateCategories() {
    const sel = $("#category");
    state.inventory.categories.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      sel.appendChild(opt);
    });
  }

  function filteredItems() {
    const q = state.filter.q.toLowerCase().trim();
    const cat = state.filter.category;
    return state.inventory.items.filter((it) => {
      if (cat && it.category !== cat) return false;
      if (!q) return true;
      return (
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q)
      );
    });
  }

  function render() {
    const root = $("#catalog");
    root.innerHTML = "";
    const items = filteredItems();
    if (items.length === 0) {
      root.innerHTML = "<p>No se encontraron productos.</p>";
      return;
    }
    items.forEach((it) => {
      const card = document.createElement("article");
      card.className = "card";

      const stockClass = it.stock === 0 ? "out" : it.stock < 50 ? "low" : "";
      const stockLabel = it.stock === 0
        ? "Sin existencias"
        : `Disponible: ${it.stock} ${it.unit}`;

      card.innerHTML = `
        <span class="code"></span>
        <span class="cat"></span>
        <h3></h3>
        <p class="desc"></p>
        <p class="price"></p>
        <p class="stock ${stockClass}"></p>
        <div class="qty-row">
          <input type="number" min="${it.min_order}" step="${it.min_order}"
                 value="${it.min_order}" data-code="${it.code}">
          <button data-add="${it.code}" ${it.stock === 0 ? "disabled" : ""}>
            Agregar
          </button>
        </div>
      `;
      card.querySelector(".code").textContent = it.code;
      card.querySelector(".cat").textContent = it.category;
      card.querySelector("h3").textContent = it.name;
      card.querySelector(".desc").textContent = it.description;
      card.querySelector(".price").textContent = `${fmtPrice(it.price_mxn)} / ${it.unit}`;
      card.querySelector(".stock").textContent = stockLabel;
      root.appendChild(card);
    });

    $$("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const code = btn.dataset.add;
        const input = document.querySelector(`input[data-code="${code}"]`);
        const qty = Number(input.value);
        if (!qty || qty <= 0) return;
        addToCart(code, qty);
      });
    });
  }

  function addToCart(code, qty) {
    state.cart[code] = (state.cart[code] || 0) + qty;
    renderCart();
    openCart();
  }

  function removeFromCart(code) {
    delete state.cart[code];
    renderCart();
  }

  function cartTotalMxn() {
    return Object.entries(state.cart).reduce((sum, [code, qty]) => {
      const it = state.inventory.items.find((x) => x.code === code);
      return sum + (it ? it.price_mxn * qty : 0);
    }, 0);
  }

  function renderCart() {
    const wrap = $("#cart-items");
    wrap.innerHTML = "";
    const codes = Object.keys(state.cart);
    if (codes.length === 0) {
      wrap.innerHTML = "<p style='color:#9ca3af;font-size:0.9rem'>Carrito vacío.</p>";
    } else {
      codes.forEach((code) => {
        const it = state.inventory.items.find((x) => x.code === code);
        if (!it) return;
        const qty = state.cart[code];
        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `
          <div>
            <strong></strong> &mdash;
            <span class="rname"></span><br>
            <small></small>
          </div>
          <div style="text-align:right">
            <div class="line-total"></div>
            <button data-rm="${code}">quitar</button>
          </div>
        `;
        row.querySelector("strong").textContent = it.code;
        row.querySelector(".rname").textContent = it.name;
        row.querySelector("small").textContent =
          `${qty} ${it.unit} × ${fmtPrice(it.price_mxn)}`;
        row.querySelector(".line-total").textContent = fmtPrice(it.price_mxn * qty);
        wrap.appendChild(row);
      });
      wrap.querySelectorAll("[data-rm]").forEach((b) => {
        b.addEventListener("click", () => removeFromCart(b.dataset.rm));
      });
    }

    $("#cart-total").textContent = fmtPrice(cartTotalMxn());
    $("#cart-count").textContent = Object.values(state.cart).reduce((a, b) => a + b, 0);
  }

  function openCart() { $("#cart-panel").classList.add("open"); }
  function closeCart() { $("#cart-panel").classList.remove("open"); }

  function buildOrderText() {
    const form = $("#order-form");
    const fd = new FormData(form);
    const lines = [];
    lines.push("PEDIDO DEMO (datos ficticios)");
    lines.push("");
    lines.push(`Cliente: ${fd.get("name") || "—"}`);
    if (fd.get("company")) lines.push(`Empresa: ${fd.get("company")}`);
    if (fd.get("email")) lines.push(`Correo: ${fd.get("email")}`);
    if (fd.get("phone")) lines.push(`Teléfono: ${fd.get("phone")}`);
    lines.push("");
    lines.push("Artículos:");
    Object.keys(state.cart).forEach((code) => {
      const it = state.inventory.items.find((x) => x.code === code);
      if (!it) return;
      const qty = state.cart[code];
      lines.push(`  ${it.code} ${it.name} — ${qty} ${it.unit} × ${fmtPrice(it.price_mxn)} = ${fmtPrice(it.price_mxn * qty)}`);
    });
    lines.push("");
    lines.push(`Total: ${fmtPrice(cartTotalMxn())}`);
    if (fd.get("notes")) {
      lines.push("");
      lines.push(`Notas: ${fd.get("notes")}`);
    }
    return lines.join("\n");
  }

  function sendWhatsApp() {
    if (!validateOrder()) return;
    const text = encodeURIComponent(buildOrderText());
    const num = state.inventory.whatsapp_number || "525555555555";
    window.open(`https://wa.me/${num}?text=${text}`, "_blank");
    setStatus("Abriendo WhatsApp con tu pedido pre-llenado.", "success");
  }

  function sendEmail() {
    if (!validateOrder()) return;
    const to = state.inventory.company_email || "ventas@ejemplo-demo.mx";
    const subject = encodeURIComponent("Pedido Demo — Portal de Clientes");
    const body = encodeURIComponent(buildOrderText());
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setStatus("Abriendo cliente de correo con tu pedido pre-llenado.", "success");
  }

  function validateOrder() {
    const form = $("#order-form");
    const fd = new FormData(form);
    if (!fd.get("name")) {
      setStatus("Captura tu nombre antes de enviar.", "error");
      return false;
    }
    if (Object.keys(state.cart).length === 0) {
      setStatus("Tu carrito está vacío.", "error");
      return false;
    }
    return true;
  }

  function setStatus(msg, kind) {
    const el = $("#order-status");
    el.textContent = msg;
    el.className = "order-status" + (kind ? " " + kind : "");
  }

  function bindCurrency() {
    $$(".currency-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currency = btn.dataset.cur;
        $$(".currency-toggle button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        render();
        renderCart();
      });
    });
  }

  function bindFilters() {
    $("#search").addEventListener("input", (e) => {
      state.filter.q = e.target.value;
      render();
    });
    $("#category").addEventListener("change", (e) => {
      state.filter.category = e.target.value;
      render();
    });
  }

  function bindCart() {
    $("#btn-cart").addEventListener("click", openCart);
    $("#cart-close").addEventListener("click", closeCart);
    $("#send-wa").addEventListener("click", sendWhatsApp);
    $("#send-mail").addEventListener("click", sendEmail);
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindCurrency();
    bindFilters();
    bindCart();
    loadInventory();
  });
})();
