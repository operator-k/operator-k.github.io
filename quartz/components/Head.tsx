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

                if (document.readyState === "loading") {
                  document.addEventListener("DOMContentLoaded", wrapTables);
                  document.addEventListener("DOMContentLoaded", wrapCharts);
                } else {
                  wrapTables();
                  wrapCharts();
                }
                document.addEventListener("nav", wrapTables);
                document.addEventListener("nav", wrapCharts);

                document.addEventListener("keydown", function (e) {
                  if (e.key !== "Escape") return;
                  var exp = openExplorer();
                  if (exp) closeDrawer(exp);
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
