/* Intelligent Reality Lab — front page behaviour
   1) the floor plan in the hero (each room jumps to its section)
   2) counters, scroll reveal, sticky header
   3) news, research areas and publications loaded from news.txt / research.txt / publications.txt                      */

(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------- 1. the floor plan */
  // Each room on the plan jumps to the section that describes it. Keyboard users get the same
  // thing: the groups are focusable, Enter and Space activate them.
  var plan = document.querySelector(".plan svg");
  if (plan) {
    Array.prototype.forEach.call(plan.querySelectorAll("g.z"), function (g) {
      function go() {
        var target = g.getAttribute("data-target");
        if (!target) return;
        if (target.charAt(0) === "#") {
          var el = document.querySelector(target);
          if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        } else {
          window.location.href = target;          // each room has its own page now
        }
      }
      g.addEventListener("click", go);
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
  }

  /* --------------------------------------------- 2. header, counters, reveal */
  var header = document.querySelector("header.top");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function countUp(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = target + suffix; return; }
    var start = performance.now(), dur = 900;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + (t === 1 ? suffix : "");
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  // Reveal on scroll. Every check sweeps the whole list by position, so items
  // jumped over (fast scroll, anchor jump, "find in page") still show up.
  var pending = Array.prototype.slice.call(
    document.querySelectorAll("section, .card, .stat, figure.shot"));
  pending.forEach(function (el) { el.classList.add("reveal"); });

  var io = "IntersectionObserver" in window
    ? new IntersectionObserver(function () { onReveal(); }, { rootMargin: "0px 0px -8% 0px" })
    : null;
  if (io) pending.forEach(function (el) { io.observe(el); });

  var queued = false;
  function sweep() {
    queued = false;
    var limit = window.innerHeight * 0.92;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top > limit) return true;
      el.classList.add("in");
      if (io) io.unobserve(el);
      var n = el.matches("b[data-count]") ? el : el.querySelector("b[data-count]");
      if (n && !n.dataset.done) { n.dataset.done = "1"; countUp(n); }
      return false;
    });
    if (!pending.length && io) io.disconnect();
  }
  function onReveal() { if (!queued) { queued = true; requestAnimationFrame(sweep); } }
  window.addEventListener("scroll", onReveal, { passive: true });
  window.addEventListener("resize", onReveal);
  window.addEventListener("load", onReveal);
  sweep();

  /* ------------------------------------------------- 3. publications list */
  var TAG_LABEL = {
    foundation: "Spatial Computing, Vision & 3D Representation",
    interact: "Embodied & Spatial Interaction",
    understand: "Human Understanding & Embodied Agents",
    deploy: "Physical AI & Digital Twins"
  };

  /* publications.txt and research.txt — one record per block, blocks separated by a "---" line,
     fields written as "key: value". Lines starting with # are comments.
     A line that is not "key: value" continues the previous field.        */
  function parseRecords(text, requiredKey) {
    var blocks = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split(/^\s*-{3,}\s*$/m);
    return blocks.map(function (block) {
      var rec = {}, lastKey = null;
      block.split("\n").forEach(function (line) {
        if (/^\s*#/.test(line) || !line.trim()) { return; }
        var m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([\s\S]*)$/);
        if (m) { lastKey = m[1].toLowerCase(); rec[lastKey] = m[2].trim(); }
        else if (lastKey) { rec[lastKey] += " " + line.trim(); }
      });
      return rec;
    }).filter(function (rec) {
      var key = requiredKey || "title";
      return rec[key] && !/^(y|yes|true|1)$/i.test(rec.hide || "");
    });
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // hideTag: under a group heading the area is already named, so the per-paper label is dropped.
  function render(list, items, tag, hideTag) {
    list.innerHTML = "";
    var shown = items.filter(function (p) { return tag === "all" || p.tag === tag; });
    if (!shown.length) {
      list.innerHTML = '<li class="no-img"><p class="pub-meta">No publications in this area yet.</p></li>';
      return;
    }
    shown.forEach(function (p) {
      var li = document.createElement("li");
      var src = p.image ? "assets/research/" + p.image.split("/").pop() : "";
      if (!src) li.className = "no-img";
      var title = esc(p.title);
      li.innerHTML =
        (src ? '<a class="pub-thumb" href="' + esc(src) + '" target="_blank" rel="noopener" ' +
               'title="Open the full figure"><img src="' + esc(src) + '" alt="" loading="lazy"></a>' : "") +
        '<div>' +
          (hideTag ? "" : '<div class="pub-tag">' + esc(TAG_LABEL[p.tag] || p.tag || "") + '</div>') +
          '<div class="pub-title">' +
            (p.link ? '<a href="' + esc(p.link) + '" rel="noopener">' + title + '</a>' : title) +
          '</div>' +
          (p.authors ? '<p class="pub-meta">' + esc(p.authors) + '</p>' : "") +
          (p.venue ? '<p class="pub-meta"><em>' + esc(p.venue) + '</em></p>' : "") +
          (p.award ? '<span class="pub-award">' + esc(p.award) + '</span>' : "") +
        '</div>';
      list.appendChild(li);
    });
  }

  /* ------------------------------------------------- headline sentences on one line
     The big sentences - the front page headline in both languages, and the lead line on the
     inner pages - are meant to read as a single line. How long they are is up to whoever edits
     home.txt, so rather than guessing a font size in CSS we measure and shrink to fit.
     If even the smallest size would not fit (a phone, or a very long sentence), we let it wrap:
     a headline running off the side of the screen is worse than one on two lines.            */
  function fitOneLine(el, maxPx, minPx) {
    if (!el || !el.textContent.trim()) return;
    el.style.whiteSpace = "nowrap";
    el.style.fontSize = maxPx + "px";

    // A Range measures the text itself. scrollWidth is no use here: on a block element whose
    // overflow is visible, the browser reports it as the element's own width even when the
    // line runs past the edge.
    var range = document.createRange();
    function textWidth() {
      range.selectNodeContents(el);
      return range.getBoundingClientRect().width;
    }

    var room = el.clientWidth;
    if (!room) return;
    var wide = textWidth();
    if (wide > room) {
      // widths scale linearly with font size, so one step lands very close
      var size = Math.floor(maxPx * room / wide);
      if (size < minPx) size = minPx;
      el.style.fontSize = size + "px";
      // ...and a couple of single-pixel steps settle rounding and letter-spacing
      while (size > minPx && textWidth() > room) {
        size -= 1;
        el.style.fontSize = size + "px";
      }
      if (textWidth() > room) {
        el.style.whiteSpace = "";          // give up on one line rather than overflow
        el.style.fontSize = minPx + "px";
      }
    }
  }

  function fitHeadlines() {
    fitOneLine(document.querySelector(".hero-lab h1"), 46, 23);
    fitOneLine(document.querySelector(".hero-lab .h1-ko"), 24, 14);
    Array.prototype.forEach.call(document.querySelectorAll("section .lead, .page-head .lead"),
      function (el) { fitOneLine(el, 31, 17); });
  }

  fitHeadlines();
  window.addEventListener("load", fitHeadlines);
  var fitTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitHeadlines, 120);
  });

  /* ------------------------------------------------ front page text (home.txt)
     The words on the front page live in a text file so they can be rewritten without touching HTML.
     What is written in index.html stays as the fallback if the file is missing.               */
  function emphasis(text) {
    // " / " breaks the line, *starred* words are highlighted.
    // The line break has to be substituted first: doing it afterwards would eat the slash of </em>.
    return esc(text)
      .replace(/\s*\/\s*/g, "<br>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  // The front page has two parts: the lab itself (hero) and the way into the virtual space (step).
  // Both are written in home.txt, so the words can be rewritten without opening the HTML.
  function fillBlock(root, b) {
    if (!root || !b) return;
    function put(sel, html) {
      var el = root.querySelector(sel);
      if (el && html) el.innerHTML = html;
    }
    put(".eyebrow", esc(b.eyebrow || ""));
    put("h1", emphasis(b.title || ""));
    put("h2", emphasis(b.title || ""));
    put(".h1-ko", esc(b.titleko || ""));
    put(".h2-ko", esc(b.titleko || ""));
    put(".lede", emphasis(b.lede || ""));
    put(".lede-ko", emphasis(b.ledeko || ""));
    put(".lede2", emphasis(b.lede2 || ""));
    put(".lede2-ko", emphasis(b.lede2ko || ""));
    var cta = root.querySelector(".cta-row .btn.primary");
    if (cta && b.cta) {
      cta.innerHTML = esc(b.cta) +
        (b.ctako ? ' <span class="ko-inline" style="color:rgba(255,255,255,.8)">' + esc(b.ctako) + "</span>" : "");
    }
    var greet = root.querySelector(".greeter span");
    if (greet && b.greeter) {
      greet.innerHTML = emphasis(b.greeter).replace(/<em>/g, "<b>").replace(/<\/em>/g, "</b>") +
        (b.greeterko ? ' <span class="ko-inline">' + esc(b.greeterko) + "</span>" : "");
    }
  }

  var homeHero = document.getElementById("homeHero");
  if (homeHero) {
    fetch("home.txt", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var blocks = parseRecords(text, "title");
        var hero = blocks.filter(function (b) { return (b.block || "hero") === "hero"; })[0];
        var step = blocks.filter(function (b) { return b.block === "step"; })[0];
        fillBlock(homeHero, hero);
        fillBlock(document.getElementById("stepIn"), step);
        fitHeadlines();          // the sentence just changed; measure it again
        if (hero) {
          var head = document.getElementById("areasHead");
          if (head && hero.areashead) {
            head.innerHTML = esc(hero.areashead) +
              (hero.areasheadko ? ' <span class="ko-head">' + esc(hero.areasheadko) + "</span>" : "");
          }
          var more = document.getElementById("areasMore");
          if (more && hero.areasmore) {
            more.innerHTML = esc(hero.areasmore) + ' <span aria-hidden="true">→</span>';
          }
        }
        onReveal();
      })
      .catch(function () { /* the words written in the page stay as they are */ });
  }

  /* the four areas beside the front-page introduction, read from research.txt so the list on the
     home page and the one on the research page can never drift apart.                            */
  var heroAreas = document.getElementById("heroAreas");
  if (heroAreas) {
    fetch("research.txt", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var items = parseRecords(text);
        if (!items.length) return;
        heroAreas.innerHTML = items.map(function (a) {
          return "<li>" + areaIcon(a.icon || "") + "<div><b>" +
            esc(a.title).replace(/\s*\/\s*/, "<br>") + "</b>" +
            (a.ko ? "<span>" + esc(a.ko) + "</span>" : "") +
            "</div></li>";
        }).join("");
        onReveal();
      })
      .catch(function () { /* the list written in the page stays as it is */ });
  }

  /* ------------------------------------------------- symbols for the research areas
     Drawn rather than photographed: a lab figure is specific to one project, a symbol says what the
     whole area is about. Same line language as the floor plan in the hero.                        */
  var AREA_ICONS = {
    // 01 Understand & Represent — a real object caught inside a scan frame and rebuilt as geometry,
    // the brass dots being the measured points the reconstruction is made of.
    represent:
      '<path d="M6 22 V11 A5 5 0 0 1 11 6 H22 M42 6 H53 A5 5 0 0 1 58 11 V22' +
      ' M58 42 V53 A5 5 0 0 1 53 58 H42 M22 58 H11 A5 5 0 0 1 6 53 V42"/>' +
      '<path d="M32 16 L46 24 V40 L32 48 L18 40 V24 Z"/>' +
      '<path d="M18 24 L32 32 L46 24 M32 32 V48"/>' +
      '<circle class="lit" cx="32" cy="16" r="2.6"/>' +
      '<circle class="lit" cx="46" cy="24" r="2.6"/>' +
      '<circle class="lit" cx="18" cy="40" r="2.6"/>',

    // 02 Interact — a whole body as the input device: the raised hand carries the signal outward.
    interact:
      '<circle cx="23" cy="14" r="6"/>' +
      '<path d="M23 20 V38 M23 38 L16 56 M23 38 L30 56 M23 26 L13 33 M23 25 L37 16"/>' +
      '<path class="lit" d="M43 10 a10 10 0 0 1 0 14"/>' +
      '<path class="lit" d="M48 4 a17 17 0 0 1 0 26"/>',

    // 03 Understand & Adapt — voice, gesture and gaze read into a person's state, and the loop back
    // out: the agent changes its behaviour with what it just understood.
    adapt:
      '<path d="M40 14 C26 8, 12 16, 12 30 C12 40, 20 44, 20 52 H38 V44 C48 40, 52 30, 48 22"/>' +
      '<circle cx="34" cy="28" r="3"/>' +
      '<path class="lit" d="M2 30 q4 -9 8 0 t8 0"/>' +
      '<path class="lit" d="M53 28 a9 9 0 0 1 -7 15 M46 43 L51 38 M46 43 L52 46"/>',

    // 04 Connect to Reality — the thing on the floor and its twin, each kept true to the other.
    connect:
      '<rect x="5" y="17" width="23" height="30" rx="3"/>' +
      '<circle cx="16.5" cy="32" r="5"/>' +
      '<rect x="36" y="17" width="23" height="30" rx="3" stroke-dasharray="4 3.5"/>' +
      '<path d="M42 26 h11 M42 32 h11 M42 38 h7"/>' +
      '<path class="lit" d="M28 24 H36 M32.5 20 L36.5 24 L32.5 28"/>' +
      '<path class="lit" d="M36 40 H28 M31.5 36 L27.5 40 L31.5 44"/>'
  };

  // The publication tags were written before the areas were renamed; these keep working.
  AREA_ICONS.foundation = AREA_ICONS.represent;
  AREA_ICONS.understand = AREA_ICONS.adapt;
  AREA_ICONS.deploy = AREA_ICONS.connect;

  function areaIcon(key) {
    var d = AREA_ICONS[String(key).toLowerCase()];
    if (!d) return "";
    return '<svg class="area-icon" viewBox="0 0 64 64" aria-hidden="true">' + d + '</svg>';
  }

  /* ---------------------------------------------- news, talks, awards (news.txt) */
  var NEWS_LABEL = { news: "News", talk: "Talk", award: "Award", visit: "Milestone" };

  function renderNews(list, items, type) {
    var shown = items.filter(function (n) { return type === "all" || n.type === type; });
    if (!shown.length) {
      list.innerHTML = '<li class="no-img"><p class="pub-meta">Nothing here yet.</p></li>';
      return;
    }
    list.innerHTML = shown.map(function (n) {
      var title = esc(n.title);
      return '<li>' +
        '<div class="news-when"><span class="news-kind k-' + esc(n.type || "news") + '">' +
          esc(NEWS_LABEL[n.type] || n.type || "News") + '</span>' +
          '<time>' + esc(n.date || "") + '</time></div>' +
        '<div><div class="news-title">' +
          (n.link ? '<a href="' + esc(n.link) + '" rel="noopener">' + title + '</a>' : title) + '</div>' +
          (n.ko ? '<p class="ko">' + esc(n.ko) + '</p>' : "") +
          (n.body ? '<p class="pub-meta">' + esc(n.body) + '</p>' : "") +
        '</div></li>';
    }).join("");
  }

  var newsList = document.getElementById("newsList");
  var newsFilters = document.getElementById("newsFilters");
  if (newsList) {
    fetch("news.txt", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var items = parseRecords(text);
        renderNews(newsList, items, "all");
        if (newsFilters) {
          Array.prototype.forEach.call(newsFilters.children, function (b) {
            var t = b.getAttribute("data-type");
            b.hidden = !(t === "all" || items.some(function (n) { return n.type === t; }));
          });
          newsFilters.addEventListener("click", function (e) {
            var b = e.target.closest("button[data-type]");
            if (!b) return;
            Array.prototype.forEach.call(newsFilters.children, function (c) { c.classList.remove("active"); });
            b.classList.add("active");
            renderNews(newsList, items, b.getAttribute("data-type"));
          });
        }
        onReveal();
      })
      .catch(function () {
        newsList.innerHTML = '<li class="no-img"><p class="pub-meta">' +
          'The news list could not be loaded. Open this page over http rather than from a file.</p></li>';
      });
  }

  /* ------------------------------------------- research areas (research.txt) */
  var researchList = document.getElementById("researchCards");
  if (researchList) {
    fetch("research.txt", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var items = parseRecords(text);
        if (!items.length) return;
        researchList.innerHTML = items.map(function (a) {
          return '<article class="card">' +
            (a.badge ? '<span class="badge">' + esc(a.badge) + '</span>' : "") +
            areaIcon(a.icon || "") +
            '<h3>' + esc(a.title).replace(/\s*\/\s*/, "<br>") + '</h3>' +
            (a.ko ? '<p class="ko">' + esc(a.ko) + '</p>' : "") +
            (a.body ? '<p>' + esc(a.body) + '</p>' : "") +
            '</article>';
        }).join("");
        onReveal();
      })
      .catch(function () { /* the cards written in the page stay as they are */ });
  }

  var pubList = document.getElementById("pubList");
  var pubGroups = document.getElementById("pubGroups");
  var pubFilters = document.getElementById("pubFilters");

  if (pubList || pubGroups) {
    if (pubList) pubList.innerHTML = '<li class="no-img"><p class="pub-meta">Loading publications…</p></li>';
    fetch("publications.txt", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) {
        var items = parseRecords(text);

        // Grouped by year, newest first. The year comes from an explicit "year:" line when there
        // is one, otherwise from the last four-digit year in the venue - which is where it sits
        // in every entry so far ("IEEE TVCG (IEEE VR 2025 special issue), 2025" -> 2025).
        function yearOf(p) {
          if (p.year && /^\d{4}$/.test(p.year.trim())) return p.year.trim();
          var found = String(p.venue || "").match(/\b(?:19|20)\d{2}\b/g);
          return found ? found[found.length - 1] : "";
        }

        if (pubGroups) {
          var years = [];
          items.forEach(function (p) {
            var y = yearOf(p);
            if (years.indexOf(y) < 0) years.push(y);
          });
          // newest first; anything with no year readable at all goes last
          years.sort(function (x, y) { return (y || "0") .localeCompare(x || "0"); });

          pubGroups.innerHTML = years.map(function (y) {
            return '<h2 class="pub-group">' + esc(y || "Other") + "</h2><ul class=\"pubs\"></ul>";
          }).join("");

          var lists = pubGroups.querySelectorAll("ul.pubs");
          years.forEach(function (y, i) {
            // No research-area label on each paper: the list is organised by year, and the tag
            // added a second, competing classification to every entry. The tag: line stays in
            // publications.txt - it is still what the home page and the filters read.
            render(lists[i], items.filter(function (p) { return yearOf(p) === y; }), "all", true);
          });
          onReveal();
          return;
        }

        render(pubList, items, "all");
        if (pubFilters) {
          Array.prototype.forEach.call(pubFilters.children, function (b) {
            var t = b.getAttribute("data-tag");
            b.hidden = !(t === "all" || items.some(function (p) { return p.tag === t; }));
          });
          pubFilters.addEventListener("click", function (e) {
            var b = e.target.closest("button[data-tag]");
            if (!b) return;
            Array.prototype.forEach.call(pubFilters.children, function (c) { c.classList.remove("active"); });
            b.classList.add("active");
            render(pubList, items, b.getAttribute("data-tag"));
          });
        }
      })
      .catch(function () {
        var box = pubGroups || pubList;
        box.innerHTML = '<p class="pub-meta">The publication list could not be loaded. ' +
          'Open this page over http (a local server or GitHub Pages) rather than from a file.</p>';
      });
  }
})();
