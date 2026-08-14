// =====================================================================================
// 공통 헤더/상단바/푸터 마크업
// 파일을 더블클릭해서(file://) 열어도 동작하도록 AJAX($.load) 대신
// 문자열을 그대로 DOM에 주입하는 방식을 씁니다.
// 내용을 고칠 땐 이 파일 하나만 고치면 index/about/brand-story/data-crm/marketing.html + projects/ 안의
// 상세페이지까지 전부 반영됩니다.
//
// 사이드 탭(#header)은 더 이상 카테고리 이동 링크가 아니라, 현재 페이지 안의 화면높이(섹션) 스크롤 위치를
// 보여주는 용도입니다. 실제 <li> 목록은 js/site.js가 각 페이지의 섹션 개수에 맞춰 동적으로 생성합니다.
var NAV_HTML = '\
<div class="headerBox">\
    <ul class="menuBox"></ul>\
</div>';

var TOPBAR_HTML = '\
<div class="home_box row">\
    <div class="home_logo">\
        <a href="index.html" class="logoText">\
            <span class="logoTitle">PORTFOLIO</span>\
        </a>\
    </div>\
    <nav class="headerNav">\
        <ul>\
            <li data-nav="about"><a href="about.html">ABOUT</a></li>\
            <li data-nav="brand-story"><a href="brand-story.html">BRANDING</a></li>\
            <li data-nav="data-crm"><a href="data-crm.html">DATA &amp; CRM</a></li>\
            <li data-nav="marketing"><a href="marketing.html">MARKETING</a></li>\
        </ul>\
    </nav>\
</div>';

// 푸터: 왼쪽에 로고 + 맺음말, 오른쪽에 연락처를 세로로 쌓는 2단 구성.
// 바닥의 큰 THANKS는 배경 워터마크라 아래쪽이 잘려 보이는 게 정상입니다.
// {{BASE}}는 site.js가 body[data-base] 값으로 바꿔줍니다. (projects/ 하위 페이지 대비)
var FOOTER_HTML = '\
<span class="footerWatermark">THANKS</span>\
<div class="footerGrid">\
    <div class="footerLeft">\
        <a class="footerLogo logoText" href="{{BASE}}index.html">\
            <span class="logoTitle">PORTFOLIO</span>\
        </a>\
        <p class="siteFooterTagline"></p>\
    </div>\
    <div class="footerRight">\
        <p><i class="fas fa-mobile"></i> <a href="tel:010-2747-2659">010.2747.2659</a></p>\
        <p><i class="far fa-envelope"></i> <a href="mailto:eq900bmwm@gmail.com">eq900bmwm@gmail.com</a></p>\
        <p><i class="fas fa-file-pdf"></i> <a href="{{BASE}}pdf/simminyongresume.pdf" target="_blank">RESUME</a></p>\
    </div>\
</div>\
<p class="siteFooterCopy">copyright © 2026 SIM MIN YONG. all rights reserved.</p>';
