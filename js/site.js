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

    // ---- 상단바 채우기 + 현재 페이지 메뉴 active 표시 ----
    if ($topbar.length && typeof TOPBAR_HTML !== 'undefined') {
        $topbar.html(TOPBAR_HTML);
        if (page) $topbar.find('.headerNav li[data-nav="' + page + '"]').addClass('active');
    }

    // ---- 푸터 채우기 + 페이지별 임시 카피 문구 ----
    if ($footer.length && typeof FOOTER_HTML !== 'undefined') {
        $footer.html(FOOTER_HTML);

        // 페이지별 푸터 카피 (연락처 위, 가운데 정렬)
        // about은 확정 카피로 교체, 나머지는 아직 임시 문구
        var footerCopyMap = {
            'about': '이런 결과가 필요하시면, 편하게 연락 주세요.',
            'brand-story': '(임시 카피) BRAND STORAGE 페이지 문구 자리입니다.',
            'data-crm': '(임시 카피) DATA & CRM 페이지 문구 자리입니다.',
            'marketing': '(임시 카피) MARKETING 페이지 문구 자리입니다.'
        };
        $footer.find('.siteFooterTagline').text(footerCopyMap[page] || '(임시 카피) 문구 자리입니다.');
    }

    // ---- 사이드 탭(#header) 생성 + 스크롤 스파이 + 휠 스냅 스크롤 ----
    if ($header.length && typeof NAV_HTML !== 'undefined') {
        $header.html(NAV_HTML.split('{{BASE}}').join(base));

        // about 페이지엔 화면높이(vh) 테스트 섹션만 있고,
        // brand-story / data-crm / marketing 은 카테고리 목록 페이지(.scrollTestSection)로도,
        // projects/ 안의 상세 페이지(.projHeader 등, data-page는 부모 카테고리와 동일)로도 열릴 수 있어서
        // 두 종류의 마크업을 모두 포함하는 공통 셀렉터를 씀.
        var PROJECT_DETAIL_SELECTOR = '.scrollTestSection, .projHeader, .projIntro, .projMeta, .projBody, .projNav';
        var sectionSelectors = {
            'about': '.scrollTestSection',
            'brand-story': PROJECT_DETAIL_SELECTOR,
            'data-crm': PROJECT_DETAIL_SELECTOR,
            'marketing': PROJECT_DETAIL_SELECTOR
        };
        var $sections = $(sectionSelectors[page] || PROJECT_DETAIL_SELECTOR);
        var $menuBox = $header.find('.menuBox');

        if ($sections.length && $menuBox.length) {
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
            var headerH = $topbar.length ? $topbar.outerHeight() : 0;

            // 탭 클릭하면 해당 섹션으로 부드럽게 스크롤
            $menuBox.on('click', 'li a', function (e) {
                e.preventDefault();
                var idx = $(this).closest('li').data('idx');
                var $target = $sections.eq(idx);
                if ($target.length) {
                    $('html,body').stop().animate({ scrollTop: $target.offset().top - headerH }, 600);
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
                var curScroll = Math.round($(window).scrollTop() + headerH + 1);
                var curIdx = -1;
                $wheelAnchors.each(function (i) {
                    if (Math.round($(this).offset().top) <= curScroll) curIdx = i;
                });

                var nextIdx = deltaY > 0 ? curIdx + 1 : curIdx - 1;
                if (nextIdx < 0 || nextIdx >= $wheelAnchors.length) return;

                e.preventDefault();
                wheelLock = true;
                // 애니메이션이 중간에 다른 스크롤(탭 클릭 등)로 끊겨서 complete 콜백이 못 불려도
                // 휠 입력이 영구히 막히지 않도록 안전장치로 최대 1초 뒤엔 무조건 잠금 해제
                clearTimeout(wheelUnlockTimer);
                wheelUnlockTimer = setTimeout(unlockWheel, 1000);

                var $target = $wheelAnchors.eq(nextIdx);
                var targetTop;

                if ($footer.length && $target.is($footer)) {
                    // 푸터로 넘어갈 땐, grow(300px)까지 다 펼쳐진 뒤의 진짜 바텀 지점을 목표로 잡아서
                    // 한 번의 스크롤 동작으로 푸터 높이만큼 자연스럽게 끝까지 올라오게 함
                    var natDocH = $(document).height();
                    if ($footer.hasClass('grow')) { natDocH -= GROW_EXTRA_PX; }
                    targetTop = (natDocH + GROW_EXTRA_PX) - $(window).height();
                } else {
                    targetTop = $target.offset().top - headerH;
                }

                $('html,body').stop().animate({ scrollTop: targetTop }, 700, 'swing', function () {
                    setTimeout(unlockWheel, 100);
                });
            }

            // jQuery의 .on('wheel', ...)로 등록하면 브라우저(특히 크롬)가 window의 wheel
            // 리스너를 기본적으로 passive로 취급해서 e.preventDefault()가 무시될 수 있음
            // (콘솔 경고만 뜨고 실제로는 브라우저 기본 스크롤이 같이 일어나 위/아래 스냅이
            // 서로 다르게 어긋나 보이는 원인이 됨). 그래서 네이티브 addEventListener로
            // { passive: false }를 명시해서 preventDefault가 확실히 먹히도록 등록함.
            window.addEventListener('wheel', handleWheel, { passive: false });
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
    $(window).scroll(function () {
        var scollSize = $(document).height() - $(window).height();
        var sct = $(this).scrollTop();
        var wid = scollSize > 0 ? (sct / scollSize) * 100 + '%' : '0%';
        $('.slideBar').css({
            opacity: 1,
            width: wid
        });

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

            if (onFooter) {
                if (!isMobile) {
                    var footerTopOnScreen = footerTop - sct;
                    var centerY = footerTopOnScreen + (footerHeight / 2);
                    $gotop.css('top', centerY);
                }
                $gotop.addClass('on').stop().animate({ opacity: 1 }, 300);
            } else {
                $gotop.removeClass('on').stop().animate({ opacity: 0 }, 300);
            }
        }
    });

    // 맨 위로 버튼 클릭 시 최상단으로 스크롤
    $gotop.on("click", function () {
        $("html,body").stop().animate({ scrollTop: "0" }, 800, "linear")
    })

}, (jQuery))
