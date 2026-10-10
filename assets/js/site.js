/* James Cubitt Interiors — progressive enhancement.
 *
 * Everything here is optional. With JavaScript off the site is a complete,
 * navigable, readable set of documents; this file only adds the header
 * state, the mobile menu, the reveal transitions and the work filter.
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  /* ---- Header: solid once the hero is behind us ------------------------ */
  var header = document.querySelector(".header");
  if (header) {
    var setStuck = function () {
      header.classList.toggle("is-stuck", window.scrollY > 24);
    };
    setStuck();
    window.addEventListener("scroll", setStuck, { passive: true });
  }

  /* ---- Mobile menu ------------------------------------------------------ */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector("#primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
      }
    });
  }

  /* ---- Reveal on scroll ------------------------------------------------- */
  var revealables = document.querySelectorAll("[data-reveal]");
  if (revealables.length) {
    if (!("IntersectionObserver" in window)) {
      revealables.forEach(function (el) { el.classList.add("is-in"); });
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      revealables.forEach(function (el) { observer.observe(el); });
    }
  }

  /* ---- Work filter ------------------------------------------------------
   * Filters are real links to /work/?sector=… so the state survives a page
   * load and can be shared; the click handler just avoids the round trip.
   */
  var filters = document.querySelector("[data-filter-group]");
  var results = document.querySelector("[data-filter-results]");
  if (filters && results) {
    var cards = Array.prototype.slice.call(results.querySelectorAll("[data-sectors]"));
    var count = document.querySelector("[data-filter-count]");
    var empty = document.querySelector("[data-filter-empty]");

    var apply = function (value, push) {
      var shown = 0;
      cards.forEach(function (card) {
        var sectors = (card.getAttribute("data-sectors") || "").split(" ");
        var match = value === "all" || sectors.indexOf(value) !== -1;
        card.classList.toggle("is-hidden", !match);
        if (match) shown += 1;
      });
      filters.querySelectorAll("[data-filter]").forEach(function (chip) {
        if (chip.getAttribute("data-filter") === value) {
          chip.setAttribute("aria-current", "true");
        } else {
          chip.removeAttribute("aria-current");
        }
      });
      if (count) {
        count.textContent = shown + (shown === 1 ? " project" : " projects");
      }
      if (empty) empty.classList.toggle("is-hidden", shown !== 0);
      if (push && window.history && window.history.replaceState) {
        var url = value === "all"
          ? window.location.pathname
          : window.location.pathname + "?sector=" + encodeURIComponent(value);
        window.history.replaceState(null, "", url);
      }
    };

    filters.addEventListener("click", function (event) {
      var button = event.target.closest("[data-filter]");
      if (!button) return;
      event.preventDefault();
      apply(button.getAttribute("data-filter"), true);
    });

    var initial = new URLSearchParams(window.location.search).get("sector");
    apply(initial && filters.querySelector('[data-filter="' + CSS.escape(initial) + '"]')
      ? initial
      : "all", false);
  }

  /* ---- Film: click the poster to play ----------------------------------
   * The markup ships `controls` so that with JavaScript off the <video> is
   * a working native player. Here we take those controls away, put the
   * poster overlay in their place, and hand them back the moment the film
   * starts — otherwise the native control bar paints on top of the overlay.
   */
  document.querySelectorAll("[data-film]").forEach(function (figure) {
    var video = figure.querySelector("video");
    var button = figure.querySelector("[data-film-play]");
    if (!video || !button) return;

    video.removeAttribute("controls");

    var reveal = function () {
      figure.setAttribute("data-playing", "");
      video.setAttribute("controls", "");
    };
    var restore = function () {
      figure.removeAttribute("data-playing");
      video.removeAttribute("controls");
    };

    button.addEventListener("click", function () {
      reveal();
      var started = video.play();
      if (started && typeof started.catch === "function") {
        // Playback with sound can be refused, and the file may simply fail
        // to decode. Put the poster back rather than leaving a dead frame.
        started.catch(restore);
      }
      video.focus({ preventScroll: true });
    });

    // Keep the overlay in step with the native controls: gone while the film
    // is running or paused part-way, back again once it has finished so it
    // can be replayed.
    video.addEventListener("play", reveal);
    video.addEventListener("ended", restore);
    video.addEventListener("error", restore);
  });

  /* ---- Current year in the footer --------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
