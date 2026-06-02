$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $root "blog\posts"
$indexPath = Join-Path $root "blog\index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$blogSitemapPath = Join-Path $root "blog\sitemap-longform.xml"
$aiPath = Join-Path $root "ai-ranking\index.html"
$gamePath = Join-Path $root "game-ranking\index.html"
$fruitPath = Join-Path $root "fruit-ranking\index.html"
$webtoonPath = Join-Path $root "webtoon-ranking\index.html"
$date = "2026-06-02"
$iso = "2026-06-02T10:30:00+09:00"

$items = @(
  [ordered]@{ title="여름 데이트 비용 합의 가이드 2026"; slug="romance-summer-date-cost-agreement-guide-2026.html"; summary="더운 날씨와 휴가 시즌에 데이트 비용이 커질 때 예산을 상하지 않게 맞추는 대화 기준을 정리했습니다."; tags=@("연애","데이트비용","여름데이트"); section="연애"; keywords="연애,여름데이트,데이트비용,커플예산,비용합의"; image="vacation-lake.jpg"; topic="여름 데이트 비용 합의"; angle="기분 좋은 만남을 유지하려면 즉흥 결제보다 이번 달 한도를 먼저 공유하는 것"; action="이번 달 데이트 예산은 총액을 정하고 실내 코스와 야외 코스를 번갈아 잡자" },
  [ordered]@{ title="장마철 카톡 답장 온도 조절 가이드 2026"; slug="romance-rainy-season-texting-temperature-guide-2026.html"; summary="비 오는 날 컨디션과 일정 변경 때문에 연락이 예민해질 때 오해를 줄이는 답장 문장과 기준입니다."; tags=@("연애","연락","장마철"); section="연애"; keywords="연애,장마철,카톡답장,연락온도,소통"; image="first-hello-breeze.jpg"; topic="장마철 카톡 답장 온도"; angle="답장 속도보다 상황 설명과 다음 약속을 짧게 남기는 것"; action="답장이 늦어질 때는 이유와 다시 연락할 시간을 한 문장으로 같이 보내자" },
  [ordered]@{ title="커플 휴가 일정 충돌 줄이는 캘린더 운영법 2026"; slug="romance-couple-vacation-calendar-guide-2026.html"; summary="휴가, 가족 일정, 회사 일정이 겹칠 때 커플이 캘린더로 갈등을 줄이는 실전 운영법입니다."; tags=@("연애","커플휴가","일정관리"); section="연애"; keywords="연애,커플휴가,일정관리,캘린더,휴가계획"; image="bff-travel.jpg"; topic="커플 휴가 일정 충돌"; angle="가고 싶은 곳을 정하기 전에 빠질 수 없는 날짜와 회복일을 먼저 막아두는 것"; action="휴가 후보 날짜를 정하기 전에 각자 불가능한 날짜와 다음 날 회복 필요 여부를 표시하자" },
  [ordered]@{ title="AI 사진 보정 후 첫 만남 신뢰 대화 가이드 2026"; slug="romance-ai-photo-first-meeting-trust-guide-2026.html"; summary="AI 보정 사진과 실제 모습의 차이로 어색함이 생기지 않도록 첫 만남 전 신뢰를 지키는 표현 기준입니다."; tags=@("연애","AI사진","첫만남"); section="연애"; keywords="연애,AI사진,프로필보정,첫만남,신뢰"; image="face-og.jpg"; topic="AI 사진 보정 후 첫 만남 신뢰"; angle="예쁘게 보이는 것보다 만났을 때 설명이 필요 없는 선을 지키는 것"; action="프로필에는 보정 사진과 최근 일상 사진을 함께 두고 과한 필터 사용 여부를 가볍게 말하자" },
  [ordered]@{ title="초여름 소개팅 장소 예산 조율 가이드 2026"; slug="romance-early-summer-blind-date-place-budget-guide-2026.html"; summary="소개팅 장소를 고를 때 가격대, 이동 거리, 날씨 변수를 함께 고려하는 현실적인 선택 기준입니다."; tags=@("연애","소개팅","장소선택"); section="연애"; keywords="연애,소개팅,데이트장소,예산,초여름"; image="date-look-romantic.jpg"; topic="초여름 소개팅 장소 예산"; angle="분위기보다 서로 부담 없이 도착하고 계산할 수 있는 범위를 먼저 보는 것"; action="첫 만남 장소는 1인 예상 비용과 역에서 걷는 시간을 함께 확인하고 제안하자" },
  [ordered]@{ title="6월 생활비 리셋 체크리스트 2026"; slug="economy-june-living-cost-reset-checklist-2026.html"; summary="상반기 지출이 흐트러졌을 때 6월 기준으로 고정비, 식비, 교통비를 다시 맞추는 체크리스트입니다."; tags=@("경제","생활비","가계부"); section="경제"; keywords="경제,6월생활비,가계부,고정비,지출관리"; image="strategy-plan.jpg"; topic="6월 생활비 리셋"; angle="절약 의지보다 이미 새는 항목을 보이는 표로 올려놓는 것"; action="이번 주 안에 고정비, 변동비, 계절비를 세 줄로 나눠 적고 한 항목만 줄이자" },
  [ordered]@{ title="여름 전기요금 누진 구간 대비 가이드 2026"; slug="economy-summer-electricity-tier-prep-guide-2026.html"; summary="냉방 사용이 늘기 전 전기요금 누진 구간을 의식해 예산과 사용 습관을 조정하는 방법입니다."; tags=@("경제","전기요금","냉방비"); section="경제"; keywords="경제,전기요금,누진제,냉방비,여름고정비"; image="summerbti-meadow.jpg"; topic="여름 전기요금 누진 구간 대비"; angle="아끼는 날을 늘리는 것보다 사용량이 튀는 시간을 먼저 찾는 것"; action="에어컨 사용 시간과 제습기 사용 시간을 일주일만 메모해 가장 긴 구간 하나를 줄이자" },
  [ordered]@{ title="AI 유료 구독 중복 정리 가이드 2026"; slug="economy-ai-paid-subscription-overlap-audit-2026.html"; summary="ChatGPT, Claude, Gemini, 이미지·영상 AI 구독이 겹칠 때 유지할 서비스와 쉬어갈 서비스를 고르는 기준입니다."; tags=@("경제","AI구독","고정비"); section="경제"; keywords="경제,AI구독,구독정리,고정비,생산성"; image="startup-vision.jpg"; topic="AI 유료 구독 중복"; angle="기능 목록보다 지난 30일 동안 실제 결과물을 만든 서비스를 남기는 것"; action="각 AI 구독별로 지난달 만든 결과물과 대체 가능 서비스를 한 줄씩 적자" },
  [ordered]@{ title="여름 휴가 예약금 카드값 분산 가이드 2026"; slug="economy-summer-vacation-deposit-card-split-guide-2026.html"; summary="숙소 예약금과 항공권 결제가 한 번에 몰릴 때 카드값 부담을 줄이는 결제일 분산 기준입니다."; tags=@("경제","휴가예산","카드값"); section="경제"; keywords="경제,휴가예약,카드값,여행예산,예약금"; image="vacation-beach.jpg"; topic="여름 휴가 예약금 카드값 분산"; angle="총 여행비보다 결제일별 빠져나가는 금액을 먼저 보는 것"; action="예약 전 결제일 달력에 숙소, 교통, 현지 지출 예상일을 따로 표시하자" },
  [ordered]@{ title="배달앱 장마철 식비 방어 루틴 2026"; slug="economy-rainy-season-delivery-food-budget-routine-2026.html"; summary="비 오는 날 배달 주문이 잦아질 때 쿠폰과 최소주문금액에 흔들리지 않는 식비 방어 루틴입니다."; tags=@("경제","배달앱","식비절약"); section="경제"; keywords="경제,배달앱,장마철,식비절약,쿠폰"; image="dinner-pizza.jpg"; topic="배달앱 장마철 식비"; angle="비 오는 날의 편함을 부정하지 않고 횟수와 총액을 미리 정하는 것"; action="장마철에는 배달 가능 횟수를 주 2회처럼 먼저 정하고 나머지는 냉동식품이나 간편식으로 대체하자" }
)

function Escape-Html { param([string]$Value) [System.Net.WebUtility]::HtmlEncode($Value) }

function Make-PostHtml {
  param($item)
  $title = Escape-Html $item.title
  $summary = Escape-Html $item.summary
  $topic = Escape-Html $item.topic
  $angle = Escape-Html $item.angle
  $action = Escape-Html $item.action
  $keywords = Escape-Html $item.keywords
  $section = Escape-Html $item.section
  $canonical = "https://partygame.pe.kr/blog/posts/$($item.slug)"
  $ogImage = "https://partygame.pe.kr/brainTest/images/$($item.image)"
  $tagHtml = ($item.tags | ForEach-Object { "          <span class=""px-3 py-1 rounded-full border border-white/20 text-slate-200"">#$(Escape-Html $_)</span>" }) -join "`r`n"
  $intro = "$topic 문제는 날씨, 일정, 체력, 돈이 한꺼번에 움직일 때 더 커집니다. 특히 6월은 여름 준비와 휴가 계획이 겹치면서 평소에는 괜찮았던 약속이나 지출도 갑자기 부담스럽게 느껴질 수 있어요. 그래서 이 글의 핵심은 감정만 참거나 숫자만 들이대는 방식이 아니라, 생활 리듬 안에서 반복 가능한 기준을 세우는 것입니다. $angle 이 기준이 되면 선택이 조금 더 선명해집니다. 중요한 것은 완벽한 해결이 아니라 다음 주에도 다시 꺼내 쓸 수 있는 말과 숫자를 남기는 일입니다."
  $p1 = "첫 번째는 지금 불편한 지점을 한 문장으로 좁히는 것입니다. '요즘 너무 힘들어', '돈이 너무 많이 나가'처럼 넓게 말하면 상대도 나도 무엇을 바꿔야 할지 찾기 어렵습니다. 대신 '이번 달에는 예약금이 몰려서 부담이 커졌어', '비 오는 날에는 이동 시간이 길어져서 피곤해'처럼 상황과 이유를 붙이면 대화가 부드러워집니다. 실전 문장은 '$action'처럼 바로 행동으로 이어지는 형태가 좋습니다. 이렇게 시작하면 탓하는 말보다 조정하는 말에 가까워집니다."
  $p2 = "두 번째는 감정 뒤에 숫자 기준을 붙이는 것입니다. 숫자는 차갑게 보일 수 있지만, 반복되는 갈등을 줄이는 데 꽤 유용합니다. 예를 들어 주 2회, 월 15만 원, 오후 9시 전 공유, 예약 전 총액 확인처럼 작은 단위를 정하면 매번 처음부터 설명하지 않아도 됩니다. 기준은 이상적인 수준보다 지친 날에도 지킬 수 있는 최저선으로 잡는 편이 오래갑니다. 최저선이 지켜지면 마음이 덜 흔들리고, 여유가 있는 날에는 더 좋은 선택을 할 수 있습니다."
  $p3 = "세 번째는 예외 규칙을 미리 만들어두는 것입니다. 여름에는 비 예보, 냉방비, 휴가 예약, 갑작스러운 컨디션 저하처럼 계획을 흔드는 변수가 많습니다. 예외가 생길 때마다 즉흥적으로 대응하면 작은 일도 쉽게 감정싸움으로 번집니다. 그래서 변경이 필요할 때 언제까지 말할지, 예산을 넘기면 어디서 줄일지, 이번 주에 못 한 약속을 어떻게 보완할지를 미리 정해두면 좋습니다. 예외 규칙은 빡빡한 통제가 아니라 관계와 생활을 다시 제자리로 돌리는 장치입니다."
  $p4 = "네 번째는 말투를 부드럽게 하되 요청을 흐리지 않는 것입니다. '네가 문제야'라고 말하면 상대는 방어적으로 변하기 쉽고, '그냥 괜찮아'라고 넘기면 내 마음만 쌓입니다. 더 나은 문장은 '나는 이 부분이 반복되면 부담이 커져서, 다음부터는 이렇게 맞추고 싶어'처럼 감정과 요청을 함께 말하는 방식입니다. 요청은 하나만 고르는 것이 좋습니다. 한 번에 여러 가지를 바꾸려 하면 대화가 길어지고 핵심이 흐려지기 때문입니다."
  $p5 = "다섯 번째는 기록으로 패턴을 확인하는 것입니다. 머릿속으로만 기억하면 가장 서운했던 장면이나 가장 큰 결제 금액만 남습니다. 메모 앱에 날짜, 상황, 쓴 돈 또는 쓴 시간, 다음 수정점 네 가지만 적어도 한 달 뒤에는 반복되는 패턴이 보입니다. $topic 이슈도 기록이 있으면 감정의 크기와 실제 반복 빈도를 분리해서 볼 수 있습니다. 기록은 나를 몰아붙이는 도구가 아니라 다음 선택을 덜 피곤하게 만드는 도구입니다."
  $p6 = "마지막으로 오늘 할 일은 크게 잡지 않는 편이 좋습니다. 1) 지금 가장 부담되는 지점 하나를 적기. 2) 그 지점에 붙일 숫자 기준 하나를 정하기. 3) 예외 상황에서 쓸 문장 하나를 미리 써두기. 4) 일주일 뒤 같은 기준이 실제로 도움이 됐는지 확인하기. 이 네 단계만 해도 문제의 크기가 줄어듭니다. 관계든 생활비든 오래가는 방식은 극단적인 결심보다 작고 반복 가능한 조정에서 나옵니다."

  return @"
<!DOCTYPE html>
<html lang="ko">
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T2KDKBN8');</script>
<!-- End Google Tag Manager -->
<link rel="stylesheet" href="/styles/site-theme.css">
<meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="$summary">
  <meta name="keywords" content="$keywords">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="$canonical">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <meta property="og:type" content="article">
  <meta property="og:title" content="$title | 연애경제 블로그">
  <meta property="og:description" content="$summary">
  <meta property="og:url" content="$canonical">
  <meta property="og:image" content="$ogImage">
  <meta property="article:section" content="$section">
  <meta property="article:published_time" content="$iso">
  <meta name="google-adsense-account" content="ca-pub-1087435977438565">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <title>$title | 연애경제 블로그</title>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-50">
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-T2KDKBN8"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
  <main class="max-w-4xl mx-auto px-6 py-12 space-y-8">
    <article class="rounded-3xl border border-white/10 bg-white/5 p-8 space-y-6">
      <header class="space-y-4">
        <div class="flex flex-wrap gap-2 text-sm">
$tagHtml
        </div>
        <h1 class="text-3xl md:text-4xl font-bold">$title</h1>
        <p class="text-slate-200">$summary</p>
        <p class="text-sm text-slate-400">업데이트: $date</p>
        <img src="/brainTest/images/$($item.image)" alt="$title 대표 이미지" class="w-full rounded-2xl border border-white/10">
      </header>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">왜 지금 이 기준이 필요한가</h2><p class="leading-relaxed text-slate-200">$intro</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">상황을 한 문장으로 좁히기</h2><p class="leading-relaxed text-slate-200">$p1</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">숫자 기준 만들기</h2><p class="leading-relaxed text-slate-200">$p2</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">예외 상황을 미리 정하기</h2><p class="leading-relaxed text-slate-200">$p3</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">부드럽지만 선명하게 요청하기</h2><p class="leading-relaxed text-slate-200">$p4</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">기록으로 패턴 확인하기</h2><p class="leading-relaxed text-slate-200">$p5</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">오늘 바로 실행할 체크리스트</h2><p class="leading-relaxed text-slate-200">$p6</p></section>
      <footer class="pt-6 border-t border-white/10"><p class="text-sm text-slate-400">본 글은 일반 정보 제공 목적이며 개인 상황에 따라 적용 결과는 달라질 수 있습니다.</p></footer>
    </article>
    <nav class="rounded-2xl border border-white/10 bg-white/5 p-6"><a href="/blog/" class="text-indigo-200 hover:text-indigo-100 transition">← 블로그 목록으로 돌아가기</a></nav>
  </main>
</body>
</html>
"@
}

foreach ($item in $items) {
  Set-Content -Path (Join-Path $postsDir $item.slug) -Value (Make-PostHtml -item $item) -Encoding utf8
}

$indexRaw = Get-Content -Raw -Path $indexPath
$newIndexEntries = @()
foreach ($item in $items) {
  $path = "/blog/posts/$($item.slug)"
  if ($indexRaw -notmatch [regex]::Escape($path)) {
    $newIndexEntries += ([ordered]@{ title=$item.title; path=$path; summary=$item.summary; tags=$item.tags } | ConvertTo-Json -Depth 3)
  }
}
if ($newIndexEntries.Count -gt 0) {
  $indexRaw = $indexRaw -replace '(const posts = \[\r?\n)', ('$1' + (($newIndexEntries -join ",`r`n") + ",`r`n"))
  Set-Content -Path $indexPath -Value $indexRaw -Encoding utf8
}

function Update-MainPageDate {
  param([string]$Path)
  $raw = Get-Content -Raw -Path $Path
  $raw = $raw -replace '업데이트: 2026-\d{2}-\d{2}', "업데이트: $date"
  $raw = $raw -replace '<p class="mt-2 text-2xl font-bold text-white">2026-\d{2}-\d{2}</p>', "<p class=""mt-2 text-2xl font-bold text-white"">$date</p>"
  Set-Content -Path $Path -Value $raw -Encoding utf8
}

Update-MainPageDate $aiPath
Update-MainPageDate $fruitPath
Update-MainPageDate $webtoonPath

$gameRaw = Get-Content -Raw -Path $gamePath
$gameRaw = $gameRaw -replace '<p class="mt-2 text-2xl font-bold text-white">2026-\d{2}-\d{2}</p>', "<p class=""mt-2 text-2xl font-bold text-white"">$date</p>"
$gameRaw = $gameRaw -replace '참고:.*?</p>', '참고: 2026년 6월 초 국내 PC방 인기 흐름과 주요 온라인 게임 서비스 지표를 함께 참고한 편집형 Top 20입니다.</p>'
if ($gameRaw -notmatch '"2026-06-02"') {
  $line = 'const rankingByDate = {' + "`r`n" + '      "2026-06-02": ["lol","pubg","valorant","fconline","suddenattack","maple","lineageclassic","overwatch2","dnf","lostark","starcraft","roblox","minecraft","wow","diablo4","apex","gtaonline","poe2","warframe","ff14"],' + "`r`n"
  $gameRaw = $gameRaw -replace 'const rankingByDate = \{\r?\n', $line
}
Set-Content -Path $gamePath -Value $gameRaw -Encoding utf8

$sitemapRaw = Get-Content -Raw -Path $sitemapPath
foreach ($mainUrl in @("https://partygame.pe.kr/blog/","https://partygame.pe.kr/ai-ranking/","https://partygame.pe.kr/game-ranking/","https://partygame.pe.kr/fruit-ranking/","https://partygame.pe.kr/webtoon-ranking/")) {
  $escaped = [regex]::Escape($mainUrl)
  $sitemapRaw = [regex]::Replace($sitemapRaw, "(?s)(<loc>$escaped</loc>\s*<lastmod>)([^<]+)(</lastmod>)", { param($m) $m.Groups[1].Value + $iso + $m.Groups[3].Value })
}
$sitemapAdd = @()
foreach ($item in $items) {
  $loc = "https://partygame.pe.kr/blog/posts/$($item.slug)"
  if ($sitemapRaw -notmatch [regex]::Escape($loc)) {
    $sitemapAdd += "  <url>`r`n        <loc>$loc</loc>`r`n        <lastmod>$iso</lastmod>`r`n        <changefreq>weekly</changefreq>`r`n        <priority>0.8</priority>`r`n      </url>"
  }
}
if ($sitemapAdd.Count -gt 0) {
  $sitemapRaw = $sitemapRaw -replace '</urlset>', (($sitemapAdd -join "`r`n") + "`r`n</urlset>")
}
Set-Content -Path $sitemapPath -Value $sitemapRaw -Encoding utf8

if (Test-Path $blogSitemapPath) {
  $blogSitemapRaw = Get-Content -Raw -Path $blogSitemapPath
  $blogSitemapAdd = @()
  foreach ($item in $items) {
    $loc = "https://partygame.pe.kr/blog/posts/$($item.slug)"
    if ($blogSitemapRaw -notmatch [regex]::Escape($loc)) {
      $blogSitemapAdd += "  <url>`r`n    <loc>$loc</loc>`r`n    <lastmod>$iso</lastmod>`r`n    <changefreq>weekly</changefreq>`r`n    <priority>0.9</priority>`r`n  </url>"
    }
  }
  if ($blogSitemapAdd.Count -gt 0) {
    $blogSitemapRaw = $blogSitemapRaw -replace '</urlset>', (($blogSitemapAdd -join "`r`n") + "`r`n</urlset>")
    Set-Content -Path $blogSitemapPath -Value $blogSitemapRaw -Encoding utf8
  }
}

