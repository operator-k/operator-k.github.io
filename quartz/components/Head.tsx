import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"

export default (() => {
  const Head: QuartzComponent = ({
    cfg,
    fileData,
    externalResources,
    ctx,
  }: QuartzComponentProps) => {
    const titleSuffix = cfg.pageTitleSuffix ?? ""
    const title =
      (fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title) + titleSuffix
    const description =
      fileData.frontmatter?.socialDescription ??
      fileData.frontmatter?.description ??
      unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

    const { css, js, additionalHead } = externalResources

    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")

    // Url of current page
    const socialUrl =
      fileData.slug === "404" ? url.toString() : joinSegments(url.toString(), fileData.slug!)

    const usesCustomOgImage = ctx.cfg.plugins.emitters.some((e) => e.name === "CustomOgImages")
    const ogImageDefaultPath = `https://${cfg.baseUrl}/static/og-image.png`

    const coreStylesheet = css[0]?.content
    const coreScript = js.find(
      (r) => r.loadTime === "beforeDOMReady" && r.contentType === "external",
    )

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        {coreStylesheet && <link rel="preload" href={coreStylesheet} as="style" />}
        {coreScript && coreScript.contentType === "external" && (
          <link rel="preload" href={coreScript.src} as="script" />
        )}
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            {cfg.theme.typography.title && (
              <link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />
            )}
          </>
        )}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  if (window.location.search.indexOf("share=1") !== -1) {
                    document.documentElement.setAttribute("data-share", "1");
                  } else if (window.matchMedia("(min-width: 801px)").matches && (window.location.pathname === "/" || window.location.pathname === "/index" || window.location.pathname === "/index.html")) {
                    document.documentElement.classList.add("sidebar-open");
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <meta name="og:site_name" content={cfg.pageTitle}></meta>
        <meta property="og:title" content={title} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta property="og:description" content={description} />
        <meta property="og:image:alt" content={description} />

        {!usesCustomOgImage && (
          <>
            <meta property="og:image" content={ogImageDefaultPath} />
            <meta property="og:image:url" content={ogImageDefaultPath} />
            <meta name="twitter:image" content={ogImageDefaultPath} />
            <meta
              property="og:image:type"
              content={`image/${getFileExtension(ogImageDefaultPath) ?? "png"}`}
            />
          </>
        )}

        {cfg.baseUrl && (
          <>
            <meta property="twitter:domain" content={cfg.baseUrl}></meta>
            <meta property="og:url" content={socialUrl}></meta>
            <meta property="twitter:url" content={socialUrl}></meta>
          </>
        )}

        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />

        {cfg.analytics?.provider === "google" && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${cfg.analytics.tagId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${cfg.analytics.tagId}');
                `,
              }}
            />
          </>
        )}

        {/* 모바일 탐색기 드로어: 바깥(딤 영역) 탭 / Esc 로 닫기.
            explorer 플러그인은 햄버거 버튼 클릭만 처리하므로 바깥 탭 닫기를 여기서 보완한다.
            SPA 네비게이션에도 살아남도록 document 레벨 위임 리스너를 1회만 등록한다. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (window.__drawerDismissBound) return;
                window.__drawerDismissBound = true;

                var MOBILE = "(max-width: 800px)";

                function closeDrawer(exp) {
                  exp.classList.add("collapsed");
                  exp.setAttribute("aria-expanded", "false");
                  document.documentElement.classList.remove("mobile-no-scroll");
                }

                function openExplorer() {
                  if (!window.matchMedia(MOBILE).matches) return null;
                  return document.querySelector(".sidebar.left .explorer:not(.collapsed)");
                }

                document.addEventListener("click", function (e) {
                  var exp = openExplorer();
                  if (!exp) return;
                  var t = e.target;
                  if (!(t instanceof Element)) return;
                  // 드로어 내부 클릭이나 햄버거 버튼 클릭은 그대로 둔다
                  if (t.closest(".explorer-content")) return;
                  if (t.closest(".explorer-toggle, .mobile-explorer")) return;
                  closeDrawer(exp);
                });

                // 넓은 재무 표를 스크롤 래퍼로 감싼다.
                // table 자체에 overflow-x 를 걸면 표 레이아웃이 깨져
                // sticky 첫 열이 잘리므로, 감싸는 컨테이너를 만들어 준다.
                function wrapTables() {
                  var tables = document.querySelectorAll("article table");
                  for (var i = 0; i < tables.length; i++) {
                    var t = tables[i];
                    var p = t.parentElement;
                    if (p && p.classList.contains("table-scroll")) continue;
                    var w = document.createElement("div");
                    w.className = "table-scroll";
                    t.parentNode.insertBefore(w, t);
                    w.appendChild(t);
                    // 모바일에서 시계열 표(헤더에 FY2024·3Q26 같은 기간이 3개 이상)는
                    // 최신 열이 오른쪽 끝에 있으므로 처음부터 오른쪽 끝을 보여준다.
                    if (window.matchMedia("(max-width: 800px)").matches) {
                      var ths = t.querySelectorAll("thead th");
                      var periods = 0;
                      for (var j = 0; j < ths.length; j++) {
                        // 템플릿 문자열 안이라 역슬래시(\d 등)를 쓰면 빌드 때 사라진다. 문자 클래스만 쓴다.
                        if (/^(FY ?[0-9]{2,4}|[1-4]Q ?[0-9]{2}|[0-9]{4}[AE]?)$/.test(ths[j].textContent.trim())) periods++;
                      }
                      // 2026-11-05: fin-fit(전열 fit) 폐기. 10px 글씨 강요가 스크롤보다 가독성이 나빴다.
                      // 스크롤+첫열고정을 유지하고, 최신 열이 보이도록 오른쪽 끝에서 시작한다.
                      if (periods >= 3) {
                        requestAnimationFrame(function () {
                          w.scrollLeft = w.scrollWidth;
                        });
                      }
                    }
                  }
                }

                // 본문 인라인 차트(SVG)를 스크롤 래퍼로 감싼다.
                // 차트는 viewBox 680px 로 그려지는데 모바일에서 폭 100% 로 축소되면
                // 11px 라벨이 6px 수준이 된다. 래퍼 안에서 최소 폭을 보장해 글씨를 살린다.
                // 콜아웃 아이콘 등 작은 SVG 는 viewBox 폭으로 걸러낸다.
                function wrapCharts() {
                  var svgs = document.querySelectorAll("article svg");
                  for (var i = 0; i < svgs.length; i++) {
                    var s = svgs[i];
                    var p = s.parentElement;
                    if (p && p.classList.contains("chart-scroll")) continue;
                    if (s.closest(".callout")) continue;
                    var vb = s.viewBox;
                    if (!vb || !vb.baseVal || vb.baseVal.width < 400) continue;
                    var w = document.createElement("div");
                    w.className = "chart-scroll";
                    s.parentNode.insertBefore(w, s);
                    w.appendChild(s);
                  }
                }

                // Notion 상단바(☰ 종목 목록 · 검색 · 다크모드 · 공유) 및 좌측 슬라이드 사이드바 초기화
                function initNotionShell() {
                  if (window.location.search.indexOf("share=1") !== -1) {
                    document.documentElement.setAttribute("data-share", "1");
                  } else {
                    document.documentElement.removeAttribute("data-share");
                  }

                  var slug = document.body.getAttribute("data-slug") || "";
                  var base = document.body.getAttribute("data-basepath") || "";
                  var homeHref = base ? base + "/" : "/";
                  var isDesktop = window.matchMedia("(min-width: 801px)").matches;

                  // 홈(index)에서는 탐색기를 기본 열어두고, 개별 리포트 진입 시 기본 접힘 상태로 전환
                  if (isDesktop) {
                    if (slug === "index") {
                      document.documentElement.classList.add("sidebar-open");
                    } else {
                      document.documentElement.classList.remove("sidebar-open");
                    }
                  }

                  // 데스크탑 Notion 상단바 생성 (1회 생성 후 페이지 이동 시 제목/경로만 갱신)
                  var topbar = document.querySelector(".notion-topbar");
                  if (!topbar) {
                    topbar = document.createElement("header");
                    topbar.className = "notion-topbar";
                    topbar.innerHTML =
                      '<div class="ntb-left">' +
                        '<button type="button" class="ntb-btn ntb-menu-btn" aria-label="종목 목록 열기" title="종목 탐색기 열기/닫기">' +
                          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2.2" y1="4" x2="13.8" y2="4"/><line x1="2.2" y1="8" x2="13.8" y2="8"/><line x1="2.2" y1="12" x2="13.8" y2="12"/></svg>' +
                          '<span>종목 목록</span>' +
                        '</button>' +
                        '<span class="ntb-sep">/</span>' +
                        '<a class="ntb-home" href="' + homeHref + '">Research Archive</a>' +
                        '<span class="ntb-sep ntb-cur-sep">/</span>' +
                        '<span class="ntb-cur"></span>' +
                      '</div>' +
                      '<div class="ntb-right">' +
                        '<button type="button" class="ntb-btn ntb-search-btn" title="종목·리포트 검색">' +
                          '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="4.8"/><line x1="10.6" y1="10.6" x2="14" y2="14"/></svg>' +
                          '<span>검색</span>' +
                        '</button>' +
                        '<button type="button" class="ntb-btn ntb-theme-btn" title="라이트/다크 모드 전환" aria-label="테마 전환">' +
                          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>' +
                        '</button>' +
                        '<button type="button" class="ntb-btn ntb-share-btn" title="사이드바 없는 단독 공유 링크 복사">공유</button>' +
                      '</div>';
                    document.body.insertBefore(topbar, document.body.firstChild);

                    var menuBtn = topbar.querySelector(".ntb-menu-btn");
                    if (menuBtn) {
                      menuBtn.addEventListener("click", function (ev) {
                        ev.stopPropagation();
                        document.documentElement.classList.toggle("sidebar-open");
                      });
                    }
                    var searchBtn = topbar.querySelector(".ntb-search-btn");
                    if (searchBtn) {
                      searchBtn.addEventListener("click", function () {
                        var origSearch = document.querySelector(".sidebar.left .search button.search-button");
                        if (origSearch) origSearch.click();
                      });
                    }
                    var themeBtn = topbar.querySelector(".ntb-theme-btn");
                    if (themeBtn) {
                      themeBtn.addEventListener("click", function () {
                        var origTheme = document.querySelector(".sidebar.left button.darkmode");
                        if (origTheme) origTheme.click();
                      });
                    }
                    var shareBtn = topbar.querySelector(".ntb-share-btn");
                    if (shareBtn) {
                      shareBtn.addEventListener("click", function () {
                        var shareUrl = window.location.origin + window.location.pathname + "?share=1";
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          navigator.clipboard.writeText(shareUrl).then(function () {
                            shareBtn.textContent = "복사됨";
                            setTimeout(function () { shareBtn.textContent = "공유"; }, 1600);
                          });
                        }
                      });
                    }
                  }

                  // 상단바 홈 링크 및 현재 문서명 동기화
                  var homeEl = topbar.querySelector(".ntb-home");
                  if (homeEl) homeEl.setAttribute("href", homeHref);
                  var h1El = document.querySelector(".page-header h1, h1.article-title");
                  var curTitle = h1El ? h1El.textContent.trim() : "";
                  var curEl = topbar.querySelector(".ntb-cur");
                  var curSep = topbar.querySelector(".ntb-cur-sep");
                  if (curEl && curSep) {
                    if (slug === "index" || !curTitle || curTitle === "Research Archive") {
                      curEl.style.display = "none";
                      curSep.style.display = "none";
                    } else {
                      curEl.textContent = curTitle;
                      curEl.style.display = "inline";
                      curSep.style.display = "inline";
                    }
                  }

                  // 좌측 사이드바 내부 닫기(«) 버튼 삽입
                  var pageTitleEl = document.querySelector(".sidebar.left .page-title");
                  if (pageTitleEl && !pageTitleEl.querySelector(".sidebar-close-btn")) {
                    var closeBtn = document.createElement("button");
                    closeBtn.type = "button";
                    closeBtn.className = "sidebar-close-btn";
                    closeBtn.title = "사이드바 접기";
                    closeBtn.setAttribute("aria-label", "사이드바 접기");
                    closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9.5 4 5.5 8 9.5 12"/><polyline points="13 4 9 8 13 12"/></svg>';
                    closeBtn.addEventListener("click", function (ev) {
                      ev.stopPropagation();
                      document.documentElement.classList.remove("sidebar-open");
                    });
                    pageTitleEl.appendChild(closeBtn);
                  }
                }

                // 데스크탑에서 열린 사이드바 바깥 클릭 시 자동 닫기 (홈 화면 제외)
                document.addEventListener("click", function (e) {
                  if (!window.matchMedia("(min-width: 801px)").matches) return;
                  if (!document.documentElement.classList.contains("sidebar-open")) return;
                  var slug = document.body.getAttribute("data-slug") || "";
                  if (slug === "index") return;
                  var t = e.target;
                  if (!(t instanceof Element)) return;
                  if (t.closest(".sidebar.left") && !t.closest("a.nav-file-title")) return;
                  if (t.closest(".ntb-menu-btn") || t.closest(".search-container")) return;
                  document.documentElement.classList.remove("sidebar-open");
                });

                // Notion 톤 리포트 레이아웃 자동 변환 + ?share=1 단독 공유 모드 동기화
                function enhanceNotionView() {
                  initNotionShell();

                  var article = document.querySelector("article");
                  if (!article || article.getAttribute("data-notion-enhanced") === "1") return;
                  article.setAttribute("data-notion-enhanced", "1");

                  // 1) 최상단 1줄 요약표(투자의견 | 현재가 | 목표주가...) -> Notion Page Properties 블록 변환
                  var firstTable = article.querySelector("table");
                  if (firstTable) {
                    var ths = firstTable.querySelectorAll("thead th");
                    var trs = firstTable.querySelectorAll("tbody tr");
                    if (ths.length >= 5 && trs.length === 1) {
                      var hTexts = [];
                      for (var hi = 0; hi < ths.length; hi++) hTexts.push(ths[hi].textContent.trim());
                      if (hTexts[0] === "투자의견" && hTexts.indexOf("목표주가") !== -1) {
                        var tds = trs[0].querySelectorAll("td");
                        var map = {};
                        for (var k = 0; k < ths.length && k < tds.length; k++) {
                          map[hTexts[k]] = tds[k].textContent.trim();
                        }
                        var rating = map["투자의견"] || "";
                        var pillCls = "n-pill";
                        if (rating.toUpperCase().indexOf("BUY") !== -1) pillCls += " buy";
                        else if (rating.toUpperCase().indexOf("SELL") !== -1) pillCls += " sell";

                        // 밸류에이션 배수 컬럼명 탐색 (6번째 열 등)
                        var multVal = "";
                        for (var mi = 0; mi < hTexts.length; mi++) {
                          if (hTexts[mi] !== "투자의견" && hTexts[mi] !== "현재가" && hTexts[mi] !== "목표주가" && hTexts[mi] !== "상승여력" && hTexts[mi] !== "시가총액" && hTexts[mi] !== "핵심 모멘텀") {
                            multVal = map[hTexts[mi]] || "";
                            break;
                          }
                        }
                        var metaDateEl = document.querySelector(".page-header .content-meta time, .content-meta time, .content-meta");
                        var dateStr = metaDateEl ? metaDateEl.textContent.trim() : "";
                        var descMeta = document.querySelector('meta[name="description"]');
                        var descStr = descMeta ? (descMeta.getAttribute("content") || "").trim() : "";

                        var propsDiv = document.createElement("div");
                        propsDiv.className = "n-props";
                        var rowsHtml = "";
                        rowsHtml += '<div class="n-prop-row"><div class="n-prop-key">투자의견 · 목표가</div><div class="n-prop-val"><span class="' + pillCls + '">' + rating + '</span>목표주가 ' + (map["목표주가"] || "-") + (map["상승여력"] ? " · 상승여력 " + map["상승여력"] : "") + "</div></div>";
                        rowsHtml += '<div class="n-prop-row"><div class="n-prop-key">현재가 · 시가총액</div><div class="n-prop-val">' + (map["현재가"] || "-") + (map["시가총액"] ? " · " + map["시가총액"] : "") + (multVal ? " · " + multVal : "") + "</div></div>";
                        if (dateStr || map["핵심 모멘텀"]) {
                          rowsHtml += '<div class="n-prop-row"><div class="n-prop-key">작성일 · 일정</div><div class="n-prop-val">' + dateStr + (map["핵심 모멘텀"] ? " (" + map["핵심 모멘텀"] + ")" : "") + "</div></div>";
                        }
                        if (descStr) {
                          rowsHtml += '<div class="n-prop-row"><div class="n-prop-key">핵심 요약</div><div class="n-prop-val">' + descStr + "</div></div>";
                        }
                        propsDiv.innerHTML = rowsHtml;

                        var targetWrap = firstTable.parentElement && firstTable.parentElement.classList.contains("table-scroll") ? firstTable.parentElement : firstTable;
                        targetWrap.parentNode.insertBefore(propsDiv, targetWrap);
                        targetWrap.remove();
                        document.body.classList.add("has-notion-props");
                      }
                    }
                  } else {
                    document.body.classList.remove("has-notion-props");
                  }
                  if (!article.querySelector(".n-props")) {
                    document.body.classList.remove("has-notion-props");
                  }

                  // 2) ## 결론 + ul -> Notion 연회색 콜아웃 박스 변환
                  var h2s = article.querySelectorAll("h2");
                  for (var i = 0; i < h2s.length; i++) {
                    var h2 = h2s[i];
                    if (h2.textContent.trim() === "결론") {
                      var nextEl = h2.nextElementSibling;
                      if (nextEl && nextEl.tagName === "UL") {
                        var callout = document.createElement("div");
                        callout.className = "notion-callout";
                        if (h2.id) callout.id = h2.id;
                        var titleDiv = document.createElement("div");
                        titleDiv.className = "nc-title";
                        titleDiv.textContent = "결론 요약";
                        callout.appendChild(titleDiv);
                        h2.parentNode.insertBefore(callout, h2);
                        callout.appendChild(nextEl);
                        h2.remove();
                      }
                      break;
                    }
                  }

                  // 3) 표 각주 단일 불릿(표 기준 / 선례 시사점) 캡션 변환 (본문 불릿 볼드 처리 제거)
                  var uls = article.querySelectorAll("ul");
                  for (var ui = 0; ui < uls.length; ui++) {
                    var ul = uls[ui];
                    if (ul.classList.contains("tags") || ul.classList.contains("section-ul") || ul.classList.contains("recent-ul")) continue;
                    var directLis = ul.children;
                    if (directLis.length === 1 && directLis[0].tagName === "LI") {
                      var rawTxt = directLis[0].textContent.trim();
                      if (rawTxt.indexOf("표 기준 :") === 0 || rawTxt.indexOf("선례 시사점 :") === 0) {
                        var capP = document.createElement("p");
                        capP.className = "caption-note";
                        capP.textContent = rawTxt;
                        ul.parentNode.replaceChild(capP, ul);
                        continue;
                      }
                    }
                  }

                  // 4) 표 숫자열(우측 정렬) vs 설명열(좌측 정렬) 자동 분류 및 요약/목표 행 강조 (백슬래시 없이 문자 클래스만 사용)
                  var numRe = /^[+-]?[0-9,.]+[%xX배대억만B]?$|^(?:N[/]A|-)$|^[+-]?[0-9,.]+ *(?:USD|RMB|HKD|KRW|원|배|억 *USD|B *RMB|B *USD|M *USD)(?: *[(][^)]+[)])?$|^(?:P[/]S|EV[/]S|P[/]E) *[0-9.]+x$/;
                  var allTables = article.querySelectorAll("table");
                  for (var ti = 0; ti < allTables.length; ti++) {
                    var tb = allTables[ti];
                    var rows = tb.querySelectorAll("tbody tr");
                    for (var ri = 0; ri < rows.length; ri++) {
                      var tr = rows[ri];
                      var rowText = tr.textContent || "";
                      if (rowText.indexOf("목표 (Base)") !== -1 || rowText.indexOf("연결 합계") !== -1 || rowText.indexOf("전사 매출액 합계") !== -1) {
                        tr.classList.add("emph-row");
                      }
                      var cells = tr.querySelectorAll("td");
                      for (var ci = 1; ci < cells.length; ci++) {
                        var cellTxt = cells[ci].textContent.trim();
                        cells[ci].classList.add(numRe.test(cellTxt) ? "num" : "txt");
                      }
                    }
                  }

                  // 5) 마크다운 이미지 alt 텍스트 -> Notion 스타일 하단 캡션 변환
                  var imgs = article.querySelectorAll("p > img");
                  for (var im = 0; im < imgs.length; im++) {
                    var img = imgs[im];
                    var parentP = img.parentElement;
                    if (!parentP || parentP.children.length !== 1) continue;
                    var altTxt = (img.getAttribute("alt") || "").trim();
                    var fig = document.createElement("figure");
                    fig.className = "doc-fig";
                    parentP.parentNode.insertBefore(fig, parentP);
                    fig.appendChild(img);
                    if (altTxt) {
                      var cap = document.createElement("figcaption");
                      cap.textContent = altTxt;
                      fig.appendChild(cap);
                    }
                    parentP.remove();
                  }

                  // 6) 상단 툴바에 1클릭 '?share=1' 단독 공유 링크 복사 버튼 추가
                  var toolbar = document.querySelector(".sidebar.left .flex-component");
                  if (toolbar && !document.querySelector(".share-link-btn")) {
                    var btnWrap = document.createElement("div");
                    var sBtn = document.createElement("button");
                    sBtn.type = "button";
                    sBtn.className = "share-link-btn";
                    sBtn.title = "사이드바 없는 단독 공유 링크 복사";
                    sBtn.textContent = "공유";
                    sBtn.addEventListener("click", function () {
                      var shareUrl = window.location.origin + window.location.pathname + "?share=1";
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(shareUrl).then(function () {
                          sBtn.textContent = "복사됨";
                          setTimeout(function () { sBtn.textContent = "공유"; }, 1600);
                        });
                      }
                    });
                    btnWrap.appendChild(sBtn);
                    toolbar.appendChild(btnWrap);
                  }
                }

                function runPageEnhancers() {
                  enhanceNotionView();
                  wrapTables();
                  wrapCharts();
                }

                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", runPageEnhancers);
                } else {
                  runPageEnhancers();
                }
                document.addEventListener("nav", runPageEnhancers);

                document.addEventListener("keydown", function (e) {
                  if (e.key !== "Escape") return;
                  var exp = openExplorer();
                  if (exp) closeDrawer(exp);
                  if (document.documentElement.classList.contains("sidebar-open")) {
                    document.documentElement.classList.remove("sidebar-open");
                  }
                });
              })();
            `,
          }}
        />

        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => {
          if (typeof resource === "function") {
            return resource(fileData)
          } else {
            return resource
          }
        })}
              <script
          dangerouslySetInnerHTML={{
            __html: `
              function initMobileHeader() {
                const explorer = document.querySelector(".sidebar.left .explorer");
                if (explorer && !document.querySelector(".mobile-home-btn")) {
                  const homeBtn = document.createElement("a");
                  homeBtn.className = "mobile-home-btn";
                  const base = document.body.getAttribute("data-basepath") || "";
                  homeBtn.href = base ? base + "/" : "/";
                  homeBtn.title = "홈 화면으로 이동";
                  homeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
                  explorer.parentNode.insertBefore(homeBtn, explorer.nextSibling);
                }
              }
              document.addEventListener("DOMContentLoaded", initMobileHeader);
              document.addEventListener("nav", initMobileHeader);
            `,
          }}
        />

      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
