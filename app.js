// T'as la source ? — landing prévente. Vanilla JS, aucune dépendance.

const PAYMENT_URL = "https://buy.stripe.com/00weVd5BQeMgfAp3aGb7y01";
// Optionnel : URL du formulaire Tally (ou lien Brevo) pour l'alerte e-mail. Laisser vide tant qu'il n'est pas créé.
const TALLY_URL = "";

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Animations seulement si ce script tourne ET si le mouvement est autorisé.
  // Sans JS (ou si ce fichier ne charge pas), la classe n'existe pas : tout reste visible.
  var animOn = !reduce;
  if (animOn) document.documentElement.classList.add("anim");

  // Change le libellé d'un CTA sans détruire une éventuelle flèche <span class="arr">.
  function setLabel(el, label) {
    var arr = el.querySelector(".arr");
    el.textContent = arr ? label + " " : label;
    if (arr) el.appendChild(arr);
  }

  /* ---------- Paiement / alerte ---------- */
  // Transmet les UTM de la page vers le Payment Link Stripe, et un client_reference_id compact.
  function paymentUrlWithUtm(base) {
    try {
      var out = new URL(base);
      var params = new URLSearchParams(window.location.search);
      var keys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      var parts = [];
      keys.forEach(function (k) {
        var v = params.get(k);
        if (v) {
          out.searchParams.set(k, v);
          parts.push(k.replace("utm_", "") + ":" + v);
        }
      });
      if (parts.length && !out.searchParams.has("client_reference_id")) {
        out.searchParams.set("client_reference_id", parts.join("|").slice(0, 200));
      }
      return out.toString();
    } catch (err) {
      return base;
    }
  }

  var paymentReady = !!PAYMENT_URL && /^https:\/\//.test(PAYMENT_URL);
  var tallyReady = !!TALLY_URL && /^https:\/\//.test(TALLY_URL);
  var PAY_LABEL = "Je précommande le guide — 24 € TTC";
  var payHref = paymentReady ? paymentUrlWithUtm(PAYMENT_URL) : "";

  if (paymentReady) {
    document.querySelectorAll("[data-cta='primary']").forEach(function (el) {
      el.href = payHref;
      setLabel(el, PAY_LABEL);
    });
    var sticky = $("btn-sticky");
    if (sticky) { sticky.href = payHref; setLabel(sticky, "Précommander"); }
    var stTxt = $("sticky-text");
    if (stTxt) stTxt.textContent = "Guide 2027 · 24 € TTC · livré le 22/01";
    var hr = $("hero-reassure");
    if (hr) hr.textContent = "Paiement sécurisé Stripe · PDF envoyé le 22 janvier 2027 · Remboursé si non livré · Rétractation 14 jours";
    ["paiement-manquant"].forEach(function (id) { var e = $(id); if (e) e.hidden = true; });
    ["pay-wrap", "pay-reassure"].forEach(function (id) { var e = $(id); if (e) e.hidden = false; });
    var pay = $("btn-pay"); if (pay) pay.href = payHref;
  }

  function openLegalIfHash() {
    var hash = (location.hash || "").toLowerCase();
    if (hash === "#mentions" || hash === "#cgv") {
      var details = document.querySelector("#mentions details");
      if (details) details.open = true;
    }
  }
  openLegalIfHash();
  window.addEventListener("hashchange", openLegalIfHash);

  var form = $("form-alerte");
  var intro = $("alerte-intro");
  // L'intro de l'alerte reste cachée tant qu'aucun formulaire n'est branché.
  if (intro) intro.hidden = !(tallyReady && form);
  if (tallyReady && form) {
    form.hidden = false;
    var wait = $("alerte-attente"); if (wait) wait.hidden = true;
    if (!paymentReady) {
      var st = $("btn-sticky");
      if (st) { st.href = "#precommande"; setLabel(st, "Être prévenu"); }
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = ($("email-alerte") || {}).value || "";
      var sep = TALLY_URL.indexOf("?") >= 0 ? "&" : "?";
      window.location.href = TALLY_URL + sep + "email=" + encodeURIComponent(email);
    });
  }

  /* ---------- Compteurs (chiffres officiels uniquement) ---------- */
  function fmt(n, dec) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = "1";
    var to = parseFloat(el.dataset.to);
    var dec = parseInt(el.dataset.dec || "0", 10);
    var pre = el.dataset.pre || "";
    var suf = el.dataset.suf || "";
    var final = pre + fmt(to, dec) + suf;
    if (!animOn) { el.textContent = final; return; }
    var dur = 1300, t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(to * e, p < 1 ? 0 : dec) + suf;
      if (p < 1) requestAnimationFrame(step); else el.textContent = final;
    }
    requestAnimationFrame(step);
  }
  var counters = Array.prototype.slice.call(document.querySelectorAll(".js-count"));

  /* ---------- Reveal au scroll ---------- */
  var watched = document.querySelectorAll(".reveal, .js-watch");
  if (!animOn || !("IntersectionObserver" in window)) {
    watched.forEach(function (el) { el.classList.add("is-in"); });
    document.querySelectorAll(".js-stamp").forEach(function (el) { el.classList.add("is-in"); });
    counters.forEach(runCounter);
  } else {
    counters.forEach(function (el) {
      el.textContent = (el.dataset.pre || "") + "0" + (el.dataset.suf || "");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var t = en.target;
        t.classList.add("is-in");
        t.querySelectorAll(".js-count").forEach(function (c) {
          setTimeout(function () { runCounter(c); }, 250);
        });
        if (t.classList.contains("js-count")) runCounter(t);
        io.unobserve(t);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    watched.forEach(function (el) { io.observe(el); });
    // Sécurité : rien ne reste masqué (prix, sources) si l'observer rate un bloc.
    setTimeout(function () {
      watched.forEach(function (el) { el.classList.add("is-in"); });
      counters.forEach(runCounter);
    }, 9000);
  }

  /* ---------- Barre CTA mobile ---------- */
  var bar = $("sticky-cta");
  var hero = $("top");
  var precoSec = $("precommande");
  if (bar && hero) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var passed = hero.getBoundingClientRect().bottom < 0;
      var precoVisible = false;
      if (precoSec) {
        var r = precoSec.getBoundingClientRect();
        precoVisible = r.top < window.innerHeight && r.bottom > 80;
      }
      var show = passed && !precoVisible;
      bar.classList.toggle("show", show);
      bar.setAttribute("aria-hidden", show ? "false" : "true");
      var a = bar.querySelector("a");
      if (a) a.tabIndex = show ? 0 : -1;
    };
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }
})();
