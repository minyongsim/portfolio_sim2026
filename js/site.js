// =====================================================================================
// 사이트 공통 스크립트
// 구조 요약
//  - js/partials.js 에 있는 NAV_HTML / TOPBAR_HTML / FOOTER_HTML 문자열을 그대로 DOM에 주입.
//    (AJAX $.load 대신 문자열 주입 방식이라 file://로 더블클릭해서 열어도 정상 동작함)
//  - body[data-page]: 현재 페이지 구분자 (about / brand-story / data-crm / marketing)
//  - body[data-base]: projects/ 처럼 한 단계 아래 폴더에서 열렸을 때 상대경로 보정용 ("../")
//  - #header(사이드 탭): 카테고리 이동 링크가 아니라, 현재 페이지 안의 화면높이(섹션) 스크롤
//    위치를 보여주는 인디케이터. <li> 목록은 페이지의 섹션 개수에 맞춰 여기서 동적으로 생성.
//  - 마우스 휠: 섹션 단위로 스냅 이동 (마지막 섹션 다음 칸은 푸터로 취급)
//  - #footer: 페이지 맨 아래 도달 시 살짝 더 커지는(grow) 연출 + 맨 위로(TOP) 버튼 표시/색 전환
// =====================================================================================

$(function ($) {

    var base = $('body').data('base') || '';
    var page = $('body').data('page') || '';

    var $topbar = $('#topbar');
    var $footer = $('#footer');
    var $header = $('#header');
    var $gotop = $('.gotop');

    // .siteFooter.grow 가 적용됐을 때 늘어나는 총 높이 (css/style.css 의 padding 값과 맞춰야 함)
    var GROW_EXTRA_PX = 300;

    // ---- 휠 스냅 감도 조절값 ----
    // 휠을 한 번 굴린 뒤 다음 입력을 받기까지 걸리는 시간 = WHEEL_ANIM_MS + WHEEL_COOLDOWN_MS.
    // 이 값이 작을수록 "감도가 높다"(연속으로 굴릴 때 바로바로 반응)고 느껴짐.
    // 다만 너무 작게 잡으면 트랙패드 관성 스크롤 한 번에 두 칸씩 넘어갈 수 있으니
    // 400~550ms 사이에서 조절하는 걸 권장.
    var WHEEL_ANIM_MS = 450;      // 다음 섹션까지 미끄러지는 시간 (이전 700)
    var WHEEL_COOLDOWN_MS = 60;   // 도착 후 다음 휠을 받기까지의 여유 (이전 100)
    var WHEEL_SAFETY_MS = 700;    // 애니메이션이 끊겼을 때 잠금이 영구히 안 풀리는 걸 막는 보험 (이전 1000)

    // ---- 상단바 채우기 + 현재 페이지 메뉴 active 표시 ----
    if ($topbar.length && typeof TOPBAR_HTML !== 'undefined') {
        $topbar.html(TOPBAR_HTML);
        if (page) $topbar.find('.headerNav li[data-nav="' + page + '"]').addClass('active');
    }

    // ---- 이력서: 총 경력 개월 수 자동 계산 ----
    // 재직 중인 회사가 있으면 '총 4년 8개월' 같은 숫자는 한 달만 지나도 틀림.
    // 끝난 경력의 합(data-fixed-months)에 재직 시작월(data-since)부터 오늘까지를
    // 더해 다시 적음. JS가 안 돌면 HTML에 적힌 값이 그대로 보임.
    $('[data-exp-total]').each(function () {
        var $el = $(this);
        var fixed = parseInt($el.attr('data-fixed-months'), 10) || 0;
        var since = String($el.attr('data-since') || '').split('-');
        if (since.length < 2) return;

        var now = new Date();
        var run = (now.getFullYear() - parseInt(since[0], 10)) * 12
                + (now.getMonth() + 1 - parseInt(since[1], 10)) + 1;
        var total = fixed + Math.max(0, run);

        var years = Math.floor(total / 12);
        var months = total % 12;
        var text = years + '년' + (months ? ' ' + months + '개월' : '');
        var prefix = $el.attr('data-prefix');
        $el.text((prefix === undefined ? '총 ' : prefix) + text);
    });

    // ---- 이력서: 'PDF로 저장' 버튼 ----
    // 미리 만들어 둔 PDF 파일을 두면 본문을 고칠 때마다 다시 내보내야 하고,
    // 안 하면 화면과 PDF가 달라짐. 브라우저 인쇄를 그대로 쓰면 항상 최신이고
    // 사용자 브라우저의 웹폰트로 렌더링돼 화면과 똑같이 나옴.
    // (인쇄용 규칙은 css/site.css의 @media print 블록)
    $(document).on('click', '[data-print]', function () {
        window.print();
    });

    // ---- 푸터 채우기 + 카피 문구 ----
    if ($footer.length && typeof FOOTER_HTML !== 'undefined') {
        // {{BASE}}는 projects/ 같은 하위 폴더에서 열렸을 때 '../'로 치환됨
        $footer.html(FOOTER_HTML.split('{{BASE}}').join(base));

        // 푸터 맺음말 (왼쪽 로고 아래)
        // 오른쪽에 연락처와 이력서 링크가 있으므로, 영업 문구 대신 문의를 열어두는 한 문장만 둠
        var FOOTER_COPY_DEFAULT = '더 궁금한 점이 있으시면 편하게 연락 주세요.';

        // 특정 페이지만 다른 문구를 쓰고 싶으면 여기에 'page이름': '문구' 형태로 추가하면 됨
        var footerCopyMap = {};

        $footer.find('.siteFooterTagline').text(footerCopyMap[page] || FOOTER_COPY_DEFAULT);
    }

    // ---- 상단 띠배너: 현재 카테고리 / 섹션 위치 / 스크롤 진행률 ----
    // 기존 .slideBar(얇은 코랄 진행바)가 하던 일을 흡수해서, 진행률뿐 아니라
    // "지금 어디를 보고 있는지"까지 알려줌. 페이지가 길어서 길잡이가 필요함.
    // HTML을 건드리지 않도록 상단바 앞에 JS로 끼워 넣음.
    var CATEGORY_LABEL = {
        'about': 'ABOUT',
        'brand-story': 'BRANDING',
        'data-crm': 'DATA &amp; CRM',
        'marketing': 'MARKETING',
        'resume': 'RESUME'
    };
    var $strip = null;

    if ($topbar.length) {
        $strip = $('\
        <div class="topStrip">\
            <div class="topStripInner">\
                <span class="tsCat"></span>\
                <span class="tsCtx"></span>\
                <span class="tsPct">0%</span>\
            </div>\
            <span class="tsProgress"></span>\
        </div>').insertBefore($topbar);

        $strip.find('.tsCat').html(CATEGORY_LABEL[page] || 'PORTFOLIO');
    }

    // ---- 상단 고정 영역(띠배너 + 상단바)이 가리는 높이 ----
    // 예전엔 상단바 높이만 빼고 띠배너(34px)를 빼먹어서, 섹션으로 스냅·이동했을 때
    // 섹션 머리가 헤더 뒤로 30~50px씩 숨었음.
    // 그리고 상단바는 스크롤하면 min-height까지 줄어드는데, 스냅은 항상 "스크롤된 뒤"에
    // 도착하므로 줄어든 뒤 높이(min-height)를 기준으로 잡아야 정확히 맞음.
    function chromeH() {
        var stripH = $strip && $strip.length ? $strip.outerHeight() : 0;
        var barH = 0;
        if ($topbar.length) {
            barH = parseFloat(window.getComputedStyle($topbar[0]).minHeight) || 0;
            if (!barH) barH = $topbar.outerHeight();
        }
        return Math.round(stripH + barH);
    }

    // 띠배너+상단바는 CSS에서 position:fixed라 문서 흐름에서 빠져 있음.
    // (sticky로 두면 상단바가 스크롤 중에 줄어들 때 문서 높이까지 같이 줄어서
    //  미리 계산해 둔 섹션 위치가 어긋나고, 스냅 후 섹션 머리가 헤더에 가려짐)
    // 그래서 "줄어들기 전" 높이만큼의 빈 자리를 여기서 만들어 끼워 넣음.
    var $chromeSpacer = null;

    if ($topbar.length) {
        $chromeSpacer = $('<div class="chromeSpacer" aria-hidden="true"></div>').insertAfter($topbar);
    }

    // ---- 요소의 '진짜' 문서상 위치 ----
    // 등장 애니메이션(.reveal)이 걸린 요소는 아직 나타나기 전에 transform: translateY(18px)이
    // 걸려 있어서, offset()/getBoundingClientRect()가 실제 레이아웃 위치보다 18px 아래로 나옴.
    // 그 값으로 스크롤 목표를 잡으면 도착했을 때(=애니메이션이 끝나 transform이 풀린 뒤)
    // 섹션이 18px 위로 올라가 버려서 머리가 헤더에 가려짐.
    // offsetTop은 transform의 영향을 받지 않으므로 이걸 누적해서 씀.
    function docTop($el) {
        var el = $el && $el.length ? $el[0] : null;
        var y = 0;
        while (el) {
            y += el.offsetTop;
            el = el.offsetParent;
        }
        return y;
    }

    // 섹션 높이를 calc(100vh - var(--chromeH))로 잡을 수 있게 CSS에 값을 넘겨줌.
    // 이게 없으면 섹션이 100vh라서 헤더가 가리는 만큼 아래가 화면 밖으로 밀려나고,
    // 가운데 정렬된 내용도 실제 보이는 영역 기준으로는 아래로 치우쳐 보임.
    function applyChromeVar() {
        document.documentElement.style.setProperty('--chromeH', chromeH() + 'px');

        if ($chromeSpacer) {
            // 빈 자리는 '줄어들기 전' 높이 기준. 그래야 맨 위에서 첫 섹션이 안 가려짐.
            var stripH = $strip && $strip.length ? $strip.outerHeight() : 0;
            var wasScrolled = $topbar.hasClass('scrolled');
            if (wasScrolled) $topbar.removeClass('scrolled');
            var fullBarH = $topbar.outerHeight();
            if (wasScrolled) $topbar.addClass('scrolled');
            $chromeSpacer.css('height', Math.round(stripH + fullBarH) + 'px');
        }
    }
    applyChromeVar();
    $(window).on('resize', applyChromeVar);

    // ---- 첫 화면 스크롤 유도 ----
    // 첫 화면만 보고 나가는 걸 막기 위해 "아래에 더 있다"는 신호를 첫 섹션 바닥에 둠.
    // HTML을 페이지마다 고치지 않도록 여기서 한 번만 넣고, 조금이라도 스크롤하면 사라짐.
    var $scrollCue = null;
    var $firstSection = $('.scrollTestSection').first();

    if ($firstSection.length) {
        $scrollCue = $('\
        <div class="scrollCue" aria-hidden="true">\
            <span class="scrollCueText">SCROLL</span>\
            <span class="scrollCueLine"></span>\
        </div>').appendTo($firstSection);

        // 이미 스크롤된 상태로 들어온 경우(새로고침 등)를 위해 첫 판정을 바로 한 번
        if ($(window).scrollTop() > 40) $scrollCue.addClass('isHidden');
    }

    // 섹션 위치는 이미 스크롤 스파이가 계산해 둔 사이드 탭(.menuBox li.active)을 그대로 읽어 씀.
    // 따로 계산하지 않으니 사이드 탭과 항상 같은 값을 가리킴.
    function updateStripContext() {
        if (!$strip) return;

        var parts = [];

        // brand-story는 브랜드 탭이 있어서 어느 브랜드를 보는 중인지도 같이 표시
        var $activeBrand = $('.brandTabBtn.active');
        if ($activeBrand.length) parts.push($activeBrand.text().trim());

        var $lis = $('#header .menuBox > li');
        if ($lis.length) {
            var idx = $lis.index($lis.filter('.active'));
            if (idx < 0) idx = 0;
            var name = $lis.eq(idx).find('a > span:nth-of-type(1)').text().trim();
            if (name) parts.push(name);
            parts.push((idx + 1) + ' / ' + $lis.length);
        }

        $strip.find('.tsCtx').text(parts.join(' · '));
    }

    // 브랜드 탭을 바꾸면 사이드 탭 목록이 통째로 새로 그려지므로 띠배너도 다시 읽어야 함
    $(document).on('click', '.brandTabBtn', function () { setTimeout(updateStripContext, 0); });

    // 사이드 탭이 다 그려진 뒤(현재 블록이 끝난 뒤) 첫 표시 + 이후 변화 감시.
    // 스크롤 스파이(IntersectionObserver)는 scroll 이벤트보다 늦게 실행되기 때문에,
    // scroll 핸들러에서만 갱신하면 띠배너의 섹션 번호가 한 칸씩 밀림.
    // 그래서 사이드 탭의 active 클래스가 바뀌는 순간을 직접 감시해서 같이 갱신함.
    setTimeout(function () {
        updateStripContext();

        var menuBoxEl = document.querySelector('#header .menuBox');
        if (menuBoxEl && window.MutationObserver) {
            new MutationObserver(updateStripContext).observe(menuBoxEl, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }
    }, 0);

    // ---- 사이드 탭(#header) 생성 + 스크롤 스파이 + 휠 스냅 스크롤 ----
    // projects/ 안의 상세 페이지는 위에서 아래로 한 번에 읽는 문서라 '섹션 이동'이라는 게 없음.
    // 그런데 아래 PROJECT_DETAIL_SELECTOR가 .projHeader/.projIntro/.projMeta/.projBody/.projNav를
    // 통째로 섹션으로 세는 바람에 "SECTION 1~5"라는 의미 없는 탭 다섯 개가 붙고 있었음.
    // (탭을 눌러도 메타 바나 하단 링크로 튀는 게 전부) 상세 페이지에선 아예 만들지 않음.
    var isProjectDetail = $('.projBody').length > 0;

    if (!isProjectDetail && $header.length && typeof NAV_HTML !== 'undefined') {
        $header.html(NAV_HTML.split('{{BASE}}').join(base));

        // about 페이지엔 화면높이(vh) 테스트 섹션만 있고,
        // brand-story / data-crm / marketing 은 카테고리 목록 페이지(.scrollTestSection)로도,
        // projects/ 안의 상세 페이지(.projHeader 등, data-page는 부모 카테고리와 동일)로도 열릴 수 있어서
        // 두 종류의 마크업을 모두 포함하는 공통 셀렉터를 씀.
        var PROJECT_DETAIL_SELECTOR = '.scrollTestSection, .projHeader, .projIntro, .projMeta, .projBody, .projNav';
        var sectionSelectors = {
            'about': '.scrollTestSection',
            'brand-story': PROJECT_DETAIL_SELECTOR,
            // data-crm 은 ABOUT 같은 한 화면짜리 덱이 아니라 BRANDING과 같은 문서형이라
            // 서브섹션(.brandSubSection)도 사이드 탭 대상에 포함시킴
            'data-crm': PROJECT_DETAIL_SELECTOR + ', .brandSubSection',
            'marketing': PROJECT_DETAIL_SELECTOR + ', .brandSubSection'
        };
        var $sections = $(sectionSelectors[page] || PROJECT_DETAIL_SELECTOR);
        var $menuBox = $header.find('.menuBox');
        var $brandPanels = $('.brandPanel');

        // brand-story는 위아래로 쌓인 스크롤 섹션이 아니라 탭 전환형(.brandPanel)이라,
        // 사이드 탭도 "브랜드 전환용"이 아니라 지금 열려있는 브랜드 패널 "안"의 서브섹션
        // (.brandSubSection)만 보여줌 -> 탭을 바꾸면 사이드 탭 목록도 그 브랜드 것으로 통째로 교체됨
        // (아래 일반 스크롤 스파이/휠 스냅 분기는 타지 않음)
        if (page === 'brand-story' && $brandPanels.length && $menuBox.length) {
            var brandSpyObserver = null;

            function renderBrandSideNav() {
                if (brandSpyObserver) { brandSpyObserver.disconnect(); brandSpyObserver = null; }
                $menuBox.empty();

                var $activePanel = $brandPanels.filter('.active');
                var $subs = $activePanel.find('.brandSubSection');

                $subs.each(function (i) {
                    var tabLabel = $(this).data('tab') || ('SECTION ' + (i + 1));
                    $menuBox.append(
                        '<li data-idx="' + i + '" class="' + (i === 0 ? 'active' : '') + '"><a href="#">' +
                        '<span><i class="fa-solid fa-folder-open"></i> ' + tabLabel + '</span>' +
                        '<span><i class="fa-solid fa-folder"></i> ' + (i + 1) + '</span>' +
                        '</a></li>'
                    );
                });

                var $navLis = $menuBox.find('li');

                // 탭 누르면 해당 서브섹션으로 스크롤 (지금은 서브섹션이 1개뿐이라도,
                // 나중에 브랜드별 콘텐츠가 늘어나면 그대로 여러 개로 확장됨)
                // .off()로 이전 탭 전환 때 걸어둔 핸들러부터 먼저 정리 (안 그러면 탭 바꿀 때마다 중복 바인딩됨)
                $menuBox.off('click', 'li a').on('click', 'li a', function (e) {
                    e.preventDefault();
                    var idx = $(this).closest('li').data('idx');
                    var $target = $subs.eq(idx);
                    if ($target.length) {
                        $('html,body').stop().animate({ scrollTop: docTop($target) - chromeH() }, 600);
                    }
                });

                if ($subs.length > 1 && 'IntersectionObserver' in window) {
                    var ratios = new Map();
                    brandSpyObserver = new IntersectionObserver(function (entries) {
                        entries.forEach(function (entry) { ratios.set(entry.target, entry.intersectionRatio); });
                        var bestIdx = -1, bestRatio = 0;
                        $subs.each(function (i) {
                            var r = ratios.get(this) || 0;
                            if (r > bestRatio) { bestRatio = r; bestIdx = i; }
                        });
                        if (bestIdx > -1) {
                            $navLis.removeClass('active');
                            $navLis.eq(bestIdx).addClass('active');
                        }
                    }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });
                    $subs.each(function () { brandSpyObserver.observe(this); });
                }
            }

            function activateBrandTab(target, updateHash) {
                $('.brandTabBtn').removeClass('active');
                $('.brandTabBtn[data-target="' + target + '"]').addClass('active');
                $brandPanels.removeClass('active');
                $brandPanels.filter('[data-brand="' + target + '"]').addClass('active');
                renderBrandSideNav();

                // 주소창에 #브랜드 를 남겨서 "메르디센트 쪽 보세요" 하고 링크로 보낼 수 있게 함.
                // pushState가 아니라 replaceState라 뒤로가기 기록이 쌓이지 않음.
                if (updateHash && window.history && history.replaceState) {
                    history.replaceState(null, '', '#' + target);
                }
            }

            // 브랜드를 바꾸면 화면 내용이 통째로 갈리므로, 보던 스크롤 위치를 그대로 두면
            // 새 브랜드의 엉뚱한 중간 지점을 보게 됨. (섹션 끝의 '다른 브랜드 보기' 버튼은
            // 4,000px 넘게 내려온 자리에 있어서 특히 티가 남) 그래서 맨 위로 올려줌.
            function scrollToBrandTop() {
                if ($(window).scrollTop() < 20) return;
                $('html,body').stop().animate({ scrollTop: 0 }, 500, 'swing');
            }

            $(document).on('click', '.brandTabBtn', function () {
                activateBrandTab($(this).data('target'), true);
                scrollToBrandTop();
            });

            // 링크에 #merdescent 처럼 붙어 있으면 그 탭을 열고 시작
            function applyHashTab() {
                var t = (location.hash || '').replace('#', '');
                if (t && $brandPanels.filter('[data-brand="' + t + '"]').length) {
                    activateBrandTab(t, false);
                    return true;
                }
                return false;
            }

            if (!applyHashTab()) renderBrandSideNav();

            // 이미 페이지를 보고 있는 상태에서 #해시 링크를 받으면 새로고침이 일어나지 않으므로
            // hashchange 로도 탭을 바꿔줌
            $(window).on('hashchange', function () {
                if (applyHashTab()) scrollToBrandTop();
            });

            // 휠 스냅(한 번 굴리면 다음 화면으로 넘어가는 동작)은 넣었다가 제거했습니다.
            // 브랜드 섹션은 높이가 제각각이라 스냅이 오히려 스크롤을 어색하게 만들었고,
            // 지금은 브라우저 기본 스크롤을 그대로 씁니다.
        } else if ($sections.length && $menuBox.length) {
            // 페이지에 있는 섹션 개수만큼 사이드 탭 생성 (예: SECTION 1~4)
            // 섹션 요소에 data-tab="INTRO" 같은 값이 있으면 그 이름을 쓰고,
            // 없으면 기본값인 "SECTION N"으로 표시함 (about은 data-tab 지정, 나머진 기본값)
            $sections.each(function (i) {
                var num = i + 1;
                var tabLabel = $(this).data('tab') || ('SECTION ' + num);
                $menuBox.append(
                    '<li data-idx="' + i + '"><a href="#">' +
                    '<span><i class="fa-solid fa-folder-open"></i> ' + tabLabel + '</span>' +
                    '<span><i class="fa-solid fa-folder"></i> ' + num + '</span>' +
                    '</a></li>'
                );
            });

            var $navLis = $menuBox.find('li');

            // 탭 클릭하면 해당 섹션으로 부드럽게 스크롤
            $menuBox.on('click', 'li a', function (e) {
                e.preventDefault();
                var idx = $(this).closest('li').data('idx');
                var $target = $sections.eq(idx);
                if ($target.length) {
                    $('html,body').stop().animate({ scrollTop: docTop($target) - chromeH() }, 600);
                }
            });

            // 스크롤 위치 기준으로 화면에 가장 많이 보이는 섹션의 탭을 active 처리
            if ('IntersectionObserver' in window) {
                var ratios = new Map();

                var spyObserver = new IntersectionObserver(function (entries) {
                    entries.forEach(function (entry) {
                        ratios.set(entry.target, entry.intersectionRatio);
                    });

                    var bestIdx = -1, bestRatio = 0;
                    $sections.each(function (i) {
                        var r = ratios.get(this) || 0;
                        if (r > bestRatio) { bestRatio = r; bestIdx = i; }
                    });

                    $navLis.removeClass('active');
                    if (bestIdx > -1) {
                        $navLis.eq(bestIdx).addClass('active');
                    }
                }, { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] });

                $sections.each(function () { spyObserver.observe(this); });
            }

            // 문서형 페이지(.brandStorySection: brand-story / data-crm)는 섹션 높이가
            // 제각각이라 휠 스냅이 오히려 스크롤을 어색하게 만듦. 덱(about/index)에서만 켬.
            var useWheelSnap = !$('.brandStorySection').length;

            // 마우스 휠 스크롤 시 다음/이전 섹션으로 부드럽게 애니메이션 이동
            // (한 번 휠을 굴리면 그 다음 섹션까지 스르륵 이동, 애니메이션 도중엔 추가 휠 입력 무시)
            // 푸터도 이 "칸" 목록의 마지막 한 칸으로 포함시켜서, 섹션4 -> 푸터로 스냅되고
            // 푸터 안에서 위로 휠을 굴리면 (섹션3이 아니라) 섹션4로 돌아오도록 함
            var $wheelAnchors = $footer.length ? $sections.add($footer) : $sections;
            var wheelLock = false;
            var wheelUnlockTimer = null;

            function unlockWheel() {
                clearTimeout(wheelUnlockTimer);
                wheelLock = false;
            }

            function handleWheel(e) {
                if (wheelLock) {
                    e.preventDefault();
                    return;
                }

                var deltaY = e.deltaY;
                if (Math.abs(deltaY) < 2) return;

                // 현재 스크롤 위치보다 위에 있는 칸들 중 가장 마지막(=가장 가까운) 칸을 현재 칸으로 판단
                // (소수점 오차로 위/아래 방향이 어긋나지 않도록 반올림해서 비교)
                var curScroll = Math.round($(window).scrollTop() + chromeH() + 1);
                var curIdx = -1;
                $wheelAnchors.each(function (i) {
                    if (Math.round(docTop($(this))) <= curScroll) curIdx = i;
                });

                var nextIdx = deltaY > 0 ? curIdx + 1 : curIdx - 1;
                if (nextIdx < 0 || nextIdx >= $wheelAnchors.length) return;

                e.preventDefault();
                wheelLock = true;
                // 애니메이션이 중간에 다른 스크롤(탭 클릭 등)로 끊겨서 complete 콜백이 못 불려도
                // 휠 입력이 영구히 막히지 않도록 안전장치로 일정 시간 뒤엔 무조건 잠금 해제
                clearTimeout(wheelUnlockTimer);
                wheelUnlockTimer = setTimeout(unlockWheel, WHEEL_SAFETY_MS);

                var $target = $wheelAnchors.eq(nextIdx);
                var targetTop;

                if ($footer.length && $target.is($footer)) {
                    // 푸터로 넘어갈 땐, grow(300px)까지 다 펼쳐진 뒤의 진짜 바텀 지점을 목표로 잡아서
                    // 한 번의 스크롤 동작으로 푸터 높이만큼 자연스럽게 끝까지 올라오게 함
                    var natDocH = $(document).height();
                    if ($footer.hasClass('grow')) { natDocH -= GROW_EXTRA_PX; }
                    targetTop = (natDocH + GROW_EXTRA_PX) - $(window).height();
                } else {
                    targetTop = docTop($target) - chromeH();
                }

                $('html,body').stop().animate({ scrollTop: targetTop }, WHEEL_ANIM_MS, 'swing', function () {
                    setTimeout(unlockWheel, WHEEL_COOLDOWN_MS);
                });
            }

            // jQuery의 .on('wheel', ...)로 등록하면 브라우저(특히 크롬)가 window의 wheel
            // 리스너를 기본적으로 passive로 취급해서 e.preventDefault()가 무시될 수 있음
            // (콘솔 경고만 뜨고 실제로는 브라우저 기본 스크롤이 같이 일어나 위/아래 스냅이
            // 서로 다르게 어긋나 보이는 원인이 됨). 그래서 네이티브 addEventListener로
            // { passive: false }를 명시해서 preventDefault가 확실히 먹히도록 등록함.
            if (useWheelSnap) window.addEventListener('wheel', handleWheel, { passive: false });
        }
    }

    // ---- ABOUT 스탯 숫자 카운트업 (화면에 들어오는 순간 0 -> 목표 숫자로 애니메이션) ----
    // 대상: <span class="aboutStatNum" data-count="6">0<small>개월</small></span> 형태
    // data-count 값까지 첫 텍스트 노드("0")만 바꿔가며 세므로, <small> 단위 표기는 그대로 유지됨
    var $statNums = $('.aboutStatNum[data-count]');
    if ($statNums.length && 'IntersectionObserver' in window) {
        var statObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;

                var el = entry.target;
                var target = parseInt(el.getAttribute('data-count'), 10) || 0;
                var textNode = el.firstChild;
                var duration = 700;
                var start = null;

                function step(ts) {
                    if (!start) start = ts;
                    var progress = Math.min((ts - start) / duration, 1);
                    textNode.nodeValue = Math.round(target * progress);
                    if (progress < 1) requestAnimationFrame(step);
                }
                requestAnimationFrame(step);
                obs.unobserve(el);
            });
        }, { threshold: 0.6 });

        $statNums.each(function () { statObserver.observe(this); });
    }

    // ---- 증거 사진 라이트박스 (클릭하면 크게 보기 + 슬라이드) ----
    // 대상: .aboutPhotoSlot img (about.html의 케이스 증거 사진, brand-story.html의 신산커피 패키지/현장 사진 등)
    // 같은 .aboutProof 안의 사진끼리를 한 그룹으로 묶어서, 그 그룹 안에서만 좌우로 슬라이드됨
    // 대표 배너(.kvShot / .projKvShot)도 포함 — 안에 인쇄된 조건 문구가
    // 모바일에서 작아지므로 눌러서 크게 볼 수 있어야 함
    var $photoTriggers = $('.aboutPhotoSlot img, .kvShot img, .projKvShot img');
    if ($photoTriggers.length) {
        var $lightbox = $('\
        <div class="photoLightbox" aria-hidden="true">\
            <button type="button" class="lightboxClose" aria-label="닫기"><i class="fa-solid fa-xmark"></i></button>\
            <button type="button" class="lightboxNav lightboxPrev" aria-label="이전 사진"><i class="fa-solid fa-chevron-left"></i></button>\
            <div class="lightboxStage">\
                <img src="" alt="">\
                <p class="lightboxCaption"></p>\
                <p class="lightboxCounter"></p>\
            </div>\
            <button type="button" class="lightboxNav lightboxNext" aria-label="다음 사진"><i class="fa-solid fa-chevron-right"></i></button>\
        </div>').appendTo('body');

        var $lbImg = $lightbox.find('.lightboxStage img');
        var $lbCounter = $lightbox.find('.lightboxCounter');
        var $lbCaption = $lightbox.find('.lightboxCaption');
        var $lbGroup = $();
        var lbIndex = 0;

        function lbRender() {
            var $img = $lbGroup.eq(lbIndex);
            $lbImg.attr('src', $img.attr('src')).attr('alt', $img.attr('alt') || '');
            var multi = $lbGroup.length > 1;
            $lightbox.find('.lightboxNav').toggle(multi);
            $lbCounter.text(multi ? (lbIndex + 1) + ' / ' + $lbGroup.length : '').toggle(multi);

            // 사진마다 alt에 설명을 적어뒀으므로 그대로 캡션으로 보여줌
            // (무슨 사진인지 크게 볼 때 알 수 있어야 함)
            var caption = $img.attr('alt') || '';
            $lbCaption.text(caption).toggle(!!caption);
        }

        function lbOpen($clicked) {
            var $proof = $clicked.closest('.aboutProof');
            $lbGroup = $proof.length ? $proof.find('.aboutPhotoSlot img') : $clicked;
            lbIndex = Math.max($lbGroup.index($clicked), 0);
            lbRender();
            $lightbox.addClass('active').attr('aria-hidden', 'false');
            $('body').addClass('lightboxOpen');
        }

        function lbClose() {
            $lightbox.removeClass('active').attr('aria-hidden', 'true');
            $('body').removeClass('lightboxOpen');
        }

        function lbStep(dir) {
            if (!$lbGroup.length) return;
            lbIndex = (lbIndex + dir + $lbGroup.length) % $lbGroup.length;
            lbRender();
        }

        $(document).on('click', '.aboutPhotoSlot img, .kvShot img, .projKvShot img', function () { lbOpen($(this)); });
        $lightbox.on('click', '.lightboxClose', lbClose);
        $lightbox.on('click', '.lightboxPrev', function () { lbStep(-1); });
        $lightbox.on('click', '.lightboxNext', function () { lbStep(1); });
        $lightbox.on('click', function (e) {
            if (e.target === this) lbClose();
        });
        $(document).on('keydown', function (e) {
            if (!$lightbox.hasClass('active')) return;
            if (e.key === 'Escape') lbClose();
            if (e.key === 'ArrowLeft') lbStep(-1);
            if (e.key === 'ArrowRight') lbStep(1);
        });
    }


    // ---- 섹션 진입 애니메이션 ----
    // 스크롤로 섹션이 화면에 들어올 때 살짝 올라오며 나타남.
    // 이미 지나간 요소는 다시 감추지 않음(위로 스크롤할 때 깜빡이면 거슬림).
    // prefers-reduced-motion 을 켠 사용자에겐 CSS 쪽에서 효과를 끔.
    var revealTargets = document.querySelectorAll('.brandSubSection, .scrollTestSection, .projSection, .brandIntro');
    if (revealTargets.length && 'IntersectionObserver' in window) {
        var revealObserver = new IntersectionObserver(function (entries, obs) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('revealed');
                obs.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -12% 0px', threshold: 0.06 });

        Array.prototype.forEach.call(revealTargets, function (el) {
            el.classList.add('reveal');
            revealObserver.observe(el);
        });
    }

    // ---- 새로 고침하면 스크롤 맨 위로 + 로딩 화면 숨기기 ----
    $(window).on('load', function () {
        setTimeout(function () {
            $('html,body').scrollTop(0);
        }, 100);

        setTimeout(function () {
            $('#pageLoader').addClass('hide');
        }, 500);
    });

    // ---- 스크롤 이벤트: 진행바 / 상단바 축소 / 맨 위로(TOP) 버튼 / 푸터 grow ----
    // 스크롤 1틱마다 문서 높이·푸터 위치 등 레이아웃을 여러 번 읽으면
    // 긴 페이지에서 끊길 수 있어, 프레임당 한 번만 실행되도록 묶음(rAF throttle).
    var scrollTicking = false;

    function onScrollFrame() {
        var scollSize = $(document).height() - $(window).height();
        var sct = $(window).scrollTop();
        var wid = scollSize > 0 ? (sct / scollSize) * 100 + '%' : '0%';
        // 띠배너: 진행률 막대 + 퍼센트 + 현재 섹션
        if ($strip) {
            $strip.find('.tsProgress').css('width', wid);
            $strip.find('.tsPct').text(Math.round(scollSize > 0 ? (sct / scollSize) * 100 : 0) + '%');
            updateStripContext();
        }

        // 스크롤 유도 표시: 조금이라도 내리면 역할을 다했으므로 숨김
        if ($scrollCue) {
            $scrollCue.toggleClass('isHidden', sct > 40);
        }

        // 탑바: 스크롤 80px 지점부터 알약이 작아지며 상단에 고정 + 블러
        if (sct > 80) {
            $('.home_header').addClass('scrolled')
        } else {
            $('.home_header').removeClass('scrolled')
        }

        // 맨 위로 버튼: 푸터가 화면에 들어오는 순간부터 나타남 (아이콘/글씨 화이트 전환 + 푸터 grow)
        // PC: 사이드탭과 같은 오른쪽(right:24px)에서 푸터 영역 위아래 가운데로 위치 계산
        // 모바일(≤600px): 계산 없이 우측 하단에 고정 (CSS가 위치 담당, JS는 보임/색상만 처리)
        var isMobile = $(window).width() <= 600;

        if ($footer.length) {
            var winH = $(window).height();
            var footerTop = $footer.offset().top;
            var footerHeight = $footer.outerHeight();
            var onFooter;

            // 페이지 맨 아래(=바텀) 기준으로 판단. 주의: 푸터가 커지면(grow) 문서 전체 높이도
            // 같이 늘어나서, 그 늘어난 문서 높이로 다시 바텀 판정을 하면 켜짐<->꺼짐이 반복되는
            // 되먹임(feedback) 문제가 생김. 그래서 grow로 붙은 만큼(GROW_EXTRA_PX)을 미리 빼서
            // "안 늘어났을 때 기준"의 문서 높이로 계산함.
            var docH = $(document).height();
            if ($footer.hasClass('grow')) { docH -= GROW_EXTRA_PX; }
            var maxScroll = docH - winH;
            var nearBottom = maxScroll <= 0 || sct >= maxScroll - 10;

            if (isMobile) {
                // 모바일은 버튼이 bottom:20px 고정이라, 화면 아래쪽 끝(=푸터)까지
                // 실제로 스크롤이 다 내려갔을 때만 보이게/색 반전 (안 그러면 흰 배경 위에서 흰 아이콘이 떠보임)
                onFooter = nearBottom;
            } else {
                onFooter = (sct + winH) > footerTop;
            }

            $gotop.toggleClass('onFooter', onFooter);
            $footer.toggleClass('grow', nearBottom && !isMobile);

            // 페이지가 길어져서 푸터에 닿아야만 TOP이 뜨면 중간에서 위로 갈 방법이 없음.
            // 한 화면 정도 내려가면 그때부터 우측 하단에 떠 있게 하고(floating),
            // 푸터에 닿으면 기존처럼 푸터 한가운데로 자리를 옮김.
            var scrolledEnough = sct > (winH * 0.8);

            // 푸터 위에 올라갔을 때만 JS가 top을 직접 잡고, 그 전에는 CSS(floating)에 맡김
            $gotop.toggleClass('floating', !onFooter && !isMobile);
            if (!onFooter) { $gotop.css('top', ''); }

            if (onFooter || scrolledEnough) {
                if (onFooter && !isMobile) {
                    var footerTopOnScreen = footerTop - sct;
                    var centerY = footerTopOnScreen + (footerHeight / 2);
                    $gotop.css('top', centerY);
                }
                $gotop.addClass('on').stop().animate({ opacity: 1 }, 300);
            } else {
                $gotop.removeClass('on').stop().animate({ opacity: 0 }, 300);
            }
        }
    }

    $(window).scroll(function () {
        if (scrollTicking) return;
        scrollTicking = true;
        window.requestAnimationFrame(function () {
            onScrollFrame();
            scrollTicking = false;
        });
    });

    // 맨 위로 버튼 클릭 시 최상단으로 스크롤
    $gotop.on("click", function () {
        $("html,body").stop().animate({ scrollTop: "0" }, 800, "linear")
    })

}, (jQuery))
