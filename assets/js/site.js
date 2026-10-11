/* James Cubitt Interiors — progressive enhancement.
 *
 * Everything here is optional. With JavaScript off the site is a complete,
 * navigable, readable set of documents; this file only adds the header
 * state, the mobile menu, the mega-menus, the search overlay, the hero
 * carousel, the reveal transitions, the project filters and the film.
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

  /* ---- Project filters -------------------------------------------------
   * /projects/all/ filters on three dimensions at once. Every chip is a
   * real link to the page that holds the same set (a practice, a research
   * topic or an office), so with JavaScript off nothing is a dead control;
   * the handler just saves the round trip and keeps the state in the URL.
   */
  var groups = document.querySelectorAll("[data-filter-group]");
  var results = document.querySelector("[data-filter-results]");
  if (groups.length && results) {
    var cards = Array.prototype.slice.call(results.children);
    var count = document.querySelector("[data-filter-count]");
    var empty = document.querySelector("[data-filter-empty]");
    var state = { practice: "", topic: "", office: "" };

    var matches = function (card) {
      var has = function (attr, value) {
        if (!value) return true;
        return (card.getAttribute(attr) || "").split(" ").indexOf(value) !== -1;
      };
      return has("data-practices", state.practice) &&
             has("data-topics", state.topic) &&
             (!state.office || card.getAttribute("data-office") === state.office);
    };

    var apply = function (push) {
      var shown = 0;
      cards.forEach(function (card) {
        var ok = matches(card);
        card.classList.toggle("is-hidden", !ok);
        if (ok) shown += 1;
      });
      groups.forEach(function (group) {
        group.querySelectorAll("[data-filter-practice],[data-filter-topic],[data-filter-office],[data-filter-all]")
          .forEach(function (chip) {
            var on = false;
            if (chip.hasAttribute("data-filter-all")) {
              on = !state.practice && !state.topic && !state.office;
            } else {
              // getAttribute returns null for a dimension this chip does not
              // carry, so compare only the dimension it actually has.
              ["practice", "topic", "office"].forEach(function (k) {
                var value = chip.getAttribute("data-filter-" + k);
                if (value !== null && state[k] && value === state[k]) on = true;
              });
            }
            if (on) chip.setAttribute("aria-current", "true");
            else chip.removeAttribute("aria-current");
          });
      });
      if (count) count.textContent = shown + (shown === 1 ? " project" : " projects");
      if (empty) empty.classList.toggle("is-hidden", shown !== 0);
      if (push && window.history && window.history.replaceState) {
        var params = new URLSearchParams();
        ["practice", "topic", "office"].forEach(function (k) {
          if (state[k]) params.set(k, state[k]);
        });
        var query = params.toString();
        window.history.replaceState(null, "", window.location.pathname + (query ? "?" + query : ""));
      }
    };

    groups.forEach(function (group) {
      group.addEventListener("click", function (event) {
        var chip = event.target.closest("[data-filter-practice],[data-filter-topic],[data-filter-office],[data-filter-all]");
        if (!chip) return;
        event.preventDefault();
        if (chip.hasAttribute("data-filter-all")) {
          state = { practice: "", topic: "", office: "" };
        } else {
          ["practice", "topic", "office"].forEach(function (k) {
            var value = chip.getAttribute("data-filter-" + k);
            if (value !== null) state[k] = state[k] === value ? "" : value;
          });
        }
        apply(true);
      });
    });

    var initial = new URLSearchParams(window.location.search);
    ["practice", "topic", "office"].forEach(function (k) {
      state[k] = initial.get(k) || "";
    });
    apply(false);
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

  /* ---- Mega-menus -------------------------------------------------------
   * Three of the eight primary items open a panel, as the architecture
   * document's header spec sets out. The link itself still navigates, so
   * the panel is an addition rather than a replacement.
   */
  var megaLinks = document.querySelectorAll("[data-mega]");
  if (megaLinks.length) {
    var closeMegas = function (except) {
      megaLinks.forEach(function (link) {
        var panel = document.getElementById(link.getAttribute("data-mega"));
        if (!panel || panel === except) return;
        panel.hidden = true;
        link.setAttribute("aria-expanded", "false");
      });
    };
    megaLinks.forEach(function (link) {
      var panel = document.getElementById(link.getAttribute("data-mega"));
      if (!panel) return;
      var open = function () {
        closeMegas(panel);
        panel.hidden = false;
        link.setAttribute("aria-expanded", "true");
      };
      link.addEventListener("mouseenter", open);
      link.addEventListener("focus", open);
      link.addEventListener("click", function (event) {
        // On a touch device the first tap opens the panel instead of
        // following the link, which is the only way to reach its children.
        if (window.matchMedia("(hover: none)").matches && panel.hidden) {
          event.preventDefault();
          open();
        }
      });
      panel.addEventListener("mouseleave", function () { closeMegas(null); });
    });
    document.querySelector(".header").addEventListener("mouseleave", function () { closeMegas(null); });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMegas(null);
    });
  }

  /* ---- Search overlay ---------------------------------------------------
   * Client-side over search-index.json, which the build emits alongside the
   * pages. Filters and sort match the document's search-overlay spec.
   */
  var overlay = document.getElementById("searchlay");
  if (overlay) {
    var input = overlay.querySelector("[data-search-input]");
    var box = overlay.querySelector("[data-search-results]");
    var sortSel = overlay.querySelector("[data-search-sort]");
    var filters = overlay.querySelectorAll("[data-search-filter]");
    var index = null;
    var root = window.JCI_ROOT || "./";

    var fill = function (select, values) {
      values.sort().forEach(function (v) {
        if (!v) return;
        var option = document.createElement("option");
        option.value = v;
        option.textContent = v;
        select.appendChild(option);
      });
    };

    var load = function () {
      if (index) return Promise.resolve(index);
      return fetch(root + "search-index.json")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          index = data;
          var cats = [], topics = [], offices = [];
          data.forEach(function (e) {
            if (cats.indexOf(e.category) === -1) cats.push(e.category);
            if (e.office && offices.indexOf(e.office) === -1) offices.push(e.office);
            (e.topics || []).forEach(function (t) {
              if (topics.indexOf(t) === -1) topics.push(t);
            });
          });
          filters.forEach(function (select) {
            var kind = select.getAttribute("data-search-filter");
            fill(select, kind === "category" ? cats : kind === "topic" ? topics : offices);
          });
          return index;
        })
        .catch(function () { index = []; return index; });
    };

    var render = function () {
      if (!index) return;
      var q = (input.value || "").trim().toLowerCase();
      var picked = {};
      filters.forEach(function (select) {
        picked[select.getAttribute("data-search-filter")] = select.value;
      });
      var hits = index.filter(function (e) {
        if (picked.category && e.category !== picked.category) return false;
        if (picked.office && e.office !== picked.office) return false;
        if (picked.topic && (e.topics || []).indexOf(picked.topic) === -1) return false;
        if (!q) return true;
        return (e.title + " " + e.summary + " " + e.category + " " +
                (e.topics || []).join(" ") + " " + e.office).toLowerCase().indexOf(q) !== -1;
      });
      var sort = sortSel ? sortSel.value : "relevance";
      if (sort === "name") {
        hits.sort(function (a, b) { return a.title.localeCompare(b.title); });
      } else if (sort === "date") {
        hits.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      } else if (q) {
        hits.sort(function (a, b) {
          var ai = a.title.toLowerCase().indexOf(q), bi = b.title.toLowerCase().indexOf(q);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
      }
      if (!hits.length) {
        box.innerHTML = '<p class="t-lede" style="padding-top:var(--s-md)">Nothing matches that.</p>';
        return;
      }
      box.innerHTML = hits.slice(0, 40).map(function (e) {
        var meta = [e.office, e.date].filter(Boolean).join(" · ");
        return '<a class="sresult" href="' + root + e.url.replace(/^\//, "") + '">' +
          '<span class="sresult__cat">' + e.category + "</span>" +
          '<span class="sresult__title">' + e.title + "</span>" +
          '<span class="sresult__meta">' + meta + "</span></a>";
      }).join("");
    };

    var openSearch = function () {
      overlay.hidden = false;
      document.body.style.overflow = "hidden";
      load().then(render);
      input.focus();
    };
    var closeSearch = function () {
      overlay.hidden = true;
      document.body.style.overflow = "";
    };

    document.querySelectorAll("[data-search-open]").forEach(function (b) {
      b.addEventListener("click", openSearch);
    });
    overlay.querySelector("[data-search-close]").addEventListener("click", closeSearch);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !overlay.hidden) closeSearch();
      if (event.key === "/" && overlay.hidden && document.activeElement === document.body) {
        event.preventDefault();
        openSearch();
      }
    });
    input.addEventListener("input", render);
    if (sortSel) sortSel.addEventListener("change", render);
    filters.forEach(function (select) { select.addEventListener("change", render); });
    overlay.querySelectorAll("[data-search-term]").forEach(function (link) {
      link.addEventListener("click", function (event) {
        event.preventDefault();
        input.value = link.getAttribute("data-search-term");
        render();
        input.focus();
      });
    });
  }

  /* ---- Hero carousel ----------------------------------------------------
   * The track is a scroll-snap row, so it already works by swipe and by
   * keyboard without this. Here we add the dots, the arrows and a slow
   * autoplay that stops on interaction.
   */
  var carousel = document.querySelector("[data-carousel]");
  if (carousel) {
    var track = carousel.querySelector("[data-carousel-track]");
    var slides = Array.prototype.slice.call(track.children);
    var dots = Array.prototype.slice.call(carousel.querySelectorAll("[data-goto]"));
    var at = 0;
    var timer = null;
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var show = function (i, smooth) {
      at = (i + slides.length) % slides.length;
      track.scrollTo({ left: track.clientWidth * at, behavior: smooth === false || reduce ? "auto" : "smooth" });
      dots.forEach(function (dot, n) {
        if (n === at) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    };
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    var play = function () {
      stop();
      if (reduce) return;
      timer = setInterval(function () { show(at + 1); }, 7000);
    };

    carousel.querySelector("[data-next]").addEventListener("click", function () { stop(); show(at + 1); });
    carousel.querySelector("[data-prev]").addEventListener("click", function () { stop(); show(at - 1); });
    dots.forEach(function (dot, n) {
      dot.addEventListener("click", function () { stop(); show(n); });
    });
    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("mouseleave", play);
    window.addEventListener("resize", function () { show(at, false); });
    show(0, false);
    play();
  }

  /* ---- Current year in the footer --------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
