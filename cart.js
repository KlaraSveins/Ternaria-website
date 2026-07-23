/* ================================================================
   Ternaria Biosciences — Shopping Cart  (cart.js v1.0)
   Static, localStorage-based cart. Works on GitHub Pages.

   CHECKOUT NOTE
   ─────────────
   Checkout currently sends a pre-filled email to sales@ternariabio.com.
   When your Teya API credentials are ready, deploy a small serverless
   function (Netlify Functions or Vercel) that accepts a POST with the
   cart items and returns a Teya hosted-checkout redirect URL.
   Then swap out the checkoutViaEmail() call in checkout() below.
================================================================ */

(function () {
  'use strict';

  var CART_KEY = 'ternaria_cart_v1';

  /* ── State helpers ────────────────────────────────────────────── */
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  /* ── Public API ───────────────────────────────────────────────── */
  window.ternCart = {
    add: addItem,
    remove: removeItem,
    qty: updateQty,
    open: openDrawer,
    close: closeDrawer,
    toggle: toggleDrawer,
    checkout: checkout
  };

  function addItem(sku, name, size, priceDisplay, priceNumeric) {
    var cart = getCart();
    var existing = cart.find(function (c) { return c.sku === sku; });
    if (existing) {
      existing.qty++;
    } else {
      cart.push({
        sku: sku,
        name: name,
        size: size,
        priceDisplay: priceDisplay || '–',
        priceNumeric: parseFloat(priceNumeric) || 0,
        qty: 1
      });
    }
    saveCart(cart);
    renderCart();
    openDrawer();
    flashAddedFeedback(sku);
  }

  function removeItem(sku) {
    saveCart(getCart().filter(function (c) { return c.sku !== sku; }));
    renderCart();
  }

  function updateQty(sku, delta) {
    var cart = getCart();
    var item = cart.find(function (c) { return c.sku === sku; });
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    saveCart(cart);
    renderCart();
  }

  /* ── Drawer visibility ────────────────────────────────────────── */
  function openDrawer() {
    var overlay = document.getElementById('tnCart-overlay');
    var drawer  = document.getElementById('tnCart-drawer');
    if (overlay) overlay.classList.add('visible');
    if (drawer)  drawer.classList.add('open');
  }
  function closeDrawer() {
    var overlay = document.getElementById('tnCart-overlay');
    var drawer  = document.getElementById('tnCart-drawer');
    if (overlay) overlay.classList.remove('visible');
    if (drawer)  drawer.classList.remove('open');
  }
  function toggleDrawer() {
    var drawer = document.getElementById('tnCart-drawer');
    if (drawer && drawer.classList.contains('open')) closeDrawer();
    else openDrawer();
  }

  /* ── Add feedback flash ───────────────────────────────────────── */
  function flashAddedFeedback(sku) {
    var btn = document.querySelector('.add-to-cart-btn[data-sku="' + sku + '"]');
    if (!btn) return;
    var orig = btn.innerHTML;
    btn.innerHTML = '✓ Added';
    btn.style.background = 'var(--navy, #213a5d)';
    setTimeout(function () {
      btn.innerHTML = orig;
      btn.style.background = '';
    }, 1600);
  }

  /* ── Render cart drawer contents ──────────────────────────────── */
  function renderCart() {
    var cart  = getCart();
    var count = cart.reduce(function (n, c) { return n + c.qty; }, 0);

    /* Badge */
    var badge = document.getElementById('tnCart-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }

    var itemsEl  = document.getElementById('tnCart-items');
    var emptyEl  = document.getElementById('tnCart-empty');
    var footerEl = document.getElementById('tnCart-footer');
    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = '';
      if (emptyEl)  emptyEl.style.display  = 'flex';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyEl)  emptyEl.style.display  = 'none';
    if (footerEl) footerEl.style.display = 'block';

    itemsEl.innerHTML = cart.map(function (item) {
      return (
        '<div class="tnCart-item">' +
          '<div class="tnCart-item-info">' +
            '<div class="tnCart-item-name">' + escHtml(item.name) + '</div>' +
            '<div class="tnCart-item-meta">' + escHtml(item.sku) + ' · ' + escHtml(item.size) + '</div>' +
            '<div class="tnCart-item-price">' + escHtml(item.priceDisplay) + '</div>' +
          '</div>' +
          '<div class="tnCart-item-controls">' +
            '<button class="tnCart-qty-btn" onclick="ternCart.qty(\'' + escHtml(item.sku) + '\',-1)">−</button>' +
            '<span class="tnCart-qty">' + item.qty + '</span>' +
            '<button class="tnCart-qty-btn" onclick="ternCart.qty(\'' + escHtml(item.sku) + '\',1)">+</button>' +
            '<button class="tnCart-remove" onclick="ternCart.remove(\'' + escHtml(item.sku) + '\')" title="Remove">✕</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    /* Subtotal */
    var allPriced = cart.every(function (c) { return c.priceNumeric > 0; });
    var subtotal  = cart.reduce(function (s, c) { return s + c.priceNumeric * c.qty; }, 0);
    var subtotalEl = document.getElementById('tnCart-subtotal');
    if (subtotalEl) {
      subtotalEl.textContent = allPriced
        ? '€' + subtotal.toLocaleString('is-IS', { minimumFractionDigits: 0 })
        : 'Price on request';
    }
  }

  /* ── Checkout ─────────────────────────────────────────────────── */
  function checkout() {
    var cart = getCart();
    if (cart.length === 0) return;

    /* ── TODO: Replace this block with your Teya API call ──────────
    *
    *  When you have Teya API credentials, deploy a serverless function:
    *
    *    POST /api/teya-checkout
    *    Body: { items: cart }          ← each item has sku/name/size/priceNumeric/qty
    *    Response: { redirectUrl: "https://checkout.teya.com/..." }
    *
    *  Then replace checkoutViaEmail() below with:
    *
    *    var btn = document.querySelector('.tnCart-checkout-btn');
    *    if (btn) { btn.disabled = true; btn.textContent = 'Processing…'; }
    *    fetch('/api/teya-checkout', {
    *      method: 'POST',
    *      headers: { 'Content-Type': 'application/json' },
    *      body: JSON.stringify({ items: cart })
    *    })
    *    .then(function(r) { return r.json(); })
    *    .then(function(data) { window.location.href = data.redirectUrl; })
    *    .catch(function() {
    *      alert('Could not connect to payment provider. Please try again or contact sales@ternariabio.com.');
    *      if (btn) { btn.disabled = false; btn.textContent = 'Proceed to checkout →'; }
    *    });
    *
    ──────────────────────────────────────────────────────────────── */

    checkoutViaEmail(cart);
  }

  function checkoutViaEmail(cart) {
    var subject = 'Order enquiry – ternariabio.com';
    var lines = cart.map(function (c) {
      return '  · ' + c.name + ' (' + c.sku + ') — ' + c.size + ' × ' + c.qty
        + (c.priceNumeric > 0 ? '   ' + c.priceDisplay : '');
    }).join('\n');
    var body = 'Hello,\n\nI would like to order the following:\n\n'
      + lines
      + '\n\nPlease confirm availability and send a payment link.\n\nThank you.';
    window.location.href = 'mailto:sales@ternariabio.com'
      + '?subject=' + encodeURIComponent(subject)
      + '&body='    + encodeURIComponent(body);
  }

  /* ── HTML injection ───────────────────────────────────────────── */
  function injectCartHTML() {
    /* Cart icon button in nav */
    var nav = document.querySelector('nav');
    if (nav) {
      var btn = document.createElement('button');
      btn.id = 'tnCart-toggle';
      btn.setAttribute('aria-label', 'View cart');
      btn.onclick = toggleDrawer;
      btn.innerHTML =
        '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
          '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
        '</svg>' +
        '<span id="tnCart-badge">0</span>';
      nav.appendChild(btn);
    }

    /* Overlay */
    var overlay = document.createElement('div');
    overlay.id = 'tnCart-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.onclick = closeDrawer;
    document.body.appendChild(overlay);

    /* Drawer */
    var drawer = document.createElement('div');
    drawer.id = 'tnCart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-label', 'Shopping cart');
    drawer.innerHTML =
      '<div class="tnCart-header">' +
        '<h2>Your cart</h2>' +
        '<button class="tnCart-close" onclick="ternCart.close()" aria-label="Close cart">✕</button>' +
      '</div>' +
      '<div id="tnCart-empty" class="tnCart-empty">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a0b4be" stroke-width="1.3" style="margin-bottom:1rem">' +
          '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>' +
          '<path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' +
        '</svg>' +
        '<p>Your cart is empty.</p>' +
        '<p class="tnCart-empty-sub">Add products from any product page.</p>' +
      '</div>' +
      '<div id="tnCart-items" class="tnCart-items-list"></div>' +
      '<div id="tnCart-footer" class="tnCart-footer" style="display:none">' +
        '<div class="tnCart-subtotal-row">' +
          '<span>Subtotal (excl. VAT)</span>' +
          '<span id="tnCart-subtotal">–</span>' +
        '</div>' +
        '<p class="tnCart-footer-note">Shipping and applicable taxes calculated at checkout.</p>' +
        '<button class="tnCart-checkout-btn" onclick="ternCart.checkout()">Request order →</button>' +
        '<button class="tnCart-clear-btn" onclick="if(confirm(\'Clear cart?\'))' +
          '{localStorage.removeItem(\'ternaria_cart_v1\');ternCart.close();location.reload();}">Clear cart</button>' +
      '</div>';
    document.body.appendChild(drawer);
  }

  /* ── Wire Add-to-Cart buttons already in the DOM ─────────────── */
  function wireButtons() {
    document.querySelectorAll('.add-to-cart-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        ternCart.add(
          btn.dataset.sku,
          btn.dataset.name,
          btn.dataset.size,
          btn.dataset.priceDisplay || '–',
          btn.dataset.price || '0'
        );
      });
    });
  }

  /* ── Utility ──────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Init ─────────────────────────────────────────────────────── */
  function init() {
    injectCartHTML();
    renderCart();
    wireButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
