// =====================================================================================
// 케이스·이력서·프로젝트 페이지 모션 (css/case-fx.css 와 한 쌍)
// - 히어로(.brandIntro / .rsHead)에 떠다니는 도형을 넣고,
// - site.js 관찰 대상이 아닌 요소(이력서 행 등)는 여기서 직접 관찰해
//   화면에 들어올 때 .fxIn 을 붙입니다.
// - jQuery 없이 동작. 실패해도 내용 표시에는 영향 없음.
// =====================================================================================
(function () {
    'use strict';

    function el(tag, cls) {
        var e = document.createElement(tag);
        e.className = cls;
        e.setAttribute('aria-hidden', 'true');
        return e;
    }

    // ── 1. 히어로 장식 도형 ─────────────────────────────────────
    function addShapes(host, defs) {
        if (!host) return;
        var cs = window.getComputedStyle(host);
        if (cs.position === 'static') host.style.position = 'relative';
        defs.forEach(function (d) {
            var s = el('span', 'fxShape ' + d[0]);
            s.setAttribute('style', d[1]);
            host.appendChild(s);
        });
    }

    addShapes(document.querySelector('.brandIntro'), [
        ['fxDot', 'top:18%;left:8%'],
        ['fxRing', 'top:64%;left:12%'],
        ['fxPlus isPcOnly', 'top:26%;right:10%'],
        ['fxRing isOrange', 'top:70%;right:8%']
    ]);

    addShapes(document.querySelector('.rsHead'), [
        ['fxRing isOrange', 'top:12%;right:4%'],
        ['fxPlus isPcOnly', 'top:70%;right:12%'],
        ['fxDot', 'top:30%;right:22%']
    ]);

    // ── 2. 개별 요소 등장 관찰 ──────────────────────────────────
    // 섹션이 길어서(경력 전체가 한 섹션) 통째로 띄우면 아래 항목이 이미 떠 있음.
    // 행 단위로 관찰해 각자 화면에 들어올 때 올라오게 함.
    var targets = [];

    ['.rsHead', '.rsKpiItem', '.rsJob', '.rsRow', '.rsAch', '.rsTaskGroup',
        '.rsSectionTitle', '.rsActions',
        '.projStats .projStat', '.projMetaItem'].forEach(function (sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (n) {
            targets.push(n);
        });
    });

    // 스킬 태그는 통통 팝 + 순번 딜레이
    Array.prototype.forEach.call(
        document.querySelectorAll('.rsTags .aboutTag'),
        function (n, i) {
            n.classList.add('fxPop', 'fxD' + ((i % 3) + 1));
            targets.push(n);
        }
    );

    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
        targets.forEach(function (n) { n.classList.add('fxIn'); });
        return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('fxIn');
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (n) {
        n.classList.add('fxObs');
        io.observe(n);
    });
})();
