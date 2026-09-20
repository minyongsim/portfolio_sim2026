// =====================================================================================
// ABOUT 그래픽 모션 레이어 (index.html / about.html 전용)
// - 떠다니는 도형·밑줄 스우시·맥박 링·마퀴를 JS로 만들어 넣습니다.
//   (index/about 두 파일의 마크업을 손대지 않고 한 곳에서 관리하려는 목적)
// - 스타일과 애니메이션은 css/about-fx.css 에 있습니다.
// - jQuery 없이 동작합니다. 실패해도 페이지 내용에는 영향이 없습니다.
// =====================================================================================
(function () {
    'use strict';

    var reduceMotion = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html) e.innerHTML = html;
        return e;
    }

    // ── 1. 섹션별 떠다니는 도형 ──────────────────────────────────
    // [클래스, top, left/right] — 본문(가운데 700px)과 안 겹치는 가장자리 위치만 씀
    var SQUIGGLE_SVG = '<svg viewBox="0 0 64 18" aria-hidden="true">'
        + '<path d="M2 12 C 10 2, 18 2, 26 10 S 44 18, 52 8 S 60 4, 62 6"/></svg>';

    var SHAPES = {
        t1: [
            ['fxShape fxDot', 'top:24%;left:12%'],
            ['fxShape fxRing', 'top:62%;left:8%'],
            ['fxShape fxPlus isPcOnly', 'top:30%;right:11%'],
            ['fxShape fxDot isSmall', 'top:70%;right:16%'],
            ['fxShape fxSquiggle', 'top:78%;right:9%'],
            ['fxShape fxRing isOrange isPcOnly', 'top:16%;right:22%']
        ],
        t2: [
            ['fxShape fxRing isOrange', 'top:20%;left:9%'],
            ['fxShape fxPlus isPcOnly', 'top:68%;right:8%'],
            ['fxShape fxDot isSmall', 'top:26%;right:13%']
        ],
        t3: [
            ['fxShape fxDot', 'top:22%;right:10%'],
            ['fxShape fxSquiggle isPcOnly', 'top:72%;left:8%'],
            ['fxShape fxRing isPcOnly', 'top:30%;left:12%']
        ],
        t4: [
            ['fxShape fxRing isOrange', 'top:64%;left:10%'],
            ['fxShape fxPlus isPcOnly', 'top:28%;right:12%']
        ]
    };

    Object.keys(SHAPES).forEach(function (key) {
        var sec = document.querySelector('.scrollTestSection.' + key);
        if (!sec) return;
        SHAPES[key].forEach(function (def) {
            var shape = el('span', def[0]);
            shape.setAttribute('style', def[1]);
            shape.setAttribute('aria-hidden', 'true');
            if (def[0].indexOf('fxSquiggle') !== -1) shape.innerHTML = SQUIGGLE_SVG;
            sec.appendChild(shape);
        });
    });

    // ── 2. 히어로: '확인합니다' 밑줄 스우시 ─────────────────────
    var verbs = document.querySelectorAll('.scrollTestSection.t1 .hv');
    var last = verbs.length ? verbs[verbs.length - 1] : null;
    if (last && !last.querySelector('svg')) {
        last.classList.add('hvUnderline');
        last.innerHTML += '<svg viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden="true">'
            + '<path d="M4 16 C 60 8, 150 6, 296 12"/></svg>';
    }

    // ── 3. CAREER: 8% 숫자 뒤 맥박 링 ───────────────────────────
    var stat = document.querySelector('.scrollTestSection.t2 .aboutStat');
    if (stat) stat.insertBefore(el('span', 'fxPulse'), stat.firstChild);

    // ── 4. NEXT: 마퀴 띠 ────────────────────────────────────────
    var t4 = document.querySelector('.scrollTestSection.t4');
    if (t4) {
        var words = 'BRANDING <b>·</b> DATA &amp; CRM <b>·</b> MARKETING <b>·</b> '
            + '만들고 <b>·</b> 팔고 <b>·</b> 확인합니다 <b>·</b> ';
        // 트랙을 두 번 이어 붙여 절반(-50%)까지 이동하면 처음과 같은 그림이 되게 함
        var half = '<span>' + words + words + words + '</span>';
        var marquee = el('div', 'fxMarquee', '<div class="fxMarqueeTrack">' + half + half + '</div>');
        marquee.setAttribute('aria-hidden', 'true');
        t4.appendChild(marquee);
    }

    // ── 5. 히어로 도형 마우스 패럴랙스 (PC · 모션 허용시에만) ────
    if (!reduceMotion && window.matchMedia && window.matchMedia('(hover: hover)').matches) {
        var t1 = document.querySelector('.scrollTestSection.t1');
        if (t1) {
            var shapes = t1.querySelectorAll('.fxShape');
            var raf = null;
            var mx = 0, my = 0;
            t1.addEventListener('mousemove', function (e) {
                mx = (e.clientX / window.innerWidth) - 0.5;
                my = (e.clientY / window.innerHeight) - 0.5;
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    raf = null;
                    for (var i = 0; i < shapes.length; i++) {
                        var depth = (i % 3) + 1; // 도형마다 깊이 다르게
                        shapes[i].style.marginLeft = (mx * depth * 14) + 'px';
                        shapes[i].style.marginTop = (my * depth * 10) + 'px';
                    }
                });
            });
        }
    }
})();
