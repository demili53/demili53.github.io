$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $root "blog\posts"
$indexPath = Join-Path $root "blog\index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$date = "2026-03-09"
$iso = "2026-03-09T21:40:00+09:00"

$items = @(
  [ordered]@{
    title = "커플 가계부 시작 합의 가이드 2026"
    slug = "romance-couple-budget-ledger-start-guide-2026.html"
    summary = "커플 가계부를 시작할 때 갈등을 줄이기 위해, 기록 범위·공개 수준·점검 주기를 정하는 실전 합의 가이드를 정리했습니다."
    tags = @("연애", "돈관리", "합의")
    section = "연애"
    keywords = "연애,커플가계부,돈관리,합의,관계운영"
    image = "love-midyear-steady.jpg"
    topic = "커플 가계부 합의"
  },
  [ordered]@{
    title = "소개팅 애프터 답장 템플릿 가이드 2026"
    slug = "romance-blind-date-followup-message-template-2026.html"
    summary = "소개팅 후 애매한 분위기에서 예의와 경계를 지키기 위해, 애프터 수락·보류·거절 답장 템플릿을 정리한 실전 가이드입니다."
    tags = @("연애", "소개팅", "메시지")
    section = "연애"
    keywords = "연애,소개팅,애프터,답장템플릿,대화법"
    image = "love-midyear-steady.jpg"
    topic = "소개팅 애프터 답장"
  },
  [ordered]@{
    title = "장거리 연애 주간 리듬 설계 가이드 2026"
    slug = "romance-long-distance-weekly-rhythm-design-guide-2026.html"
    summary = "장거리 연애의 피로를 줄이기 위해, 연락 빈도·통화 시간·만남 주기를 주간 단위로 설계하는 실전 가이드를 정리했습니다."
    tags = @("연애", "장거리", "시간관리")
    section = "연애"
    keywords = "연애,장거리연애,주간리듬,연락빈도,시간관리"
    image = "love-midyear-steady.jpg"
    topic = "장거리 연애 리듬"
  },
  [ordered]@{
    title = "커플 일정 공유 앱 운영 가이드 2026"
    slug = "romance-shared-calendar-operation-guide-2026.html"
    summary = "약속 충돌을 줄이기 위해, 커플 일정 공유 앱을 과하지 않게 운영하는 입력 규칙과 알림 기준을 정리했습니다."
    tags = @("연애", "일정관리", "소통")
    section = "연애"
    keywords = "연애,공유캘린더,일정관리,커플소통,약속관리"
    image = "love-midyear-steady.jpg"
    topic = "커플 일정 공유"
  },
  [ordered]@{
    title = "이별 후 SNS 노출 관리 가이드 2026"
    slug = "romance-post-breakup-social-media-boundary-guide-2026.html"
    summary = "이별 직후 감정 소모를 줄이기 위해, SNS 노출 범위와 차단·숨김 기준을 정리한 30대 실전 경계선 가이드입니다."
    tags = @("연애", "이별", "경계선")
    section = "연애"
    keywords = "연애,이별,SNS,경계선,감정관리"
    image = "love-midyear-steady.jpg"
    topic = "이별 후 SNS 경계선"
  },
  [ordered]@{
    title = "생활용품 묶음구매 손익 가이드 2026"
    slug = "economy-household-bulk-buying-cost-benefit-guide-2026.html"
    summary = "대용량이 항상 이득은 아니라는 전제에서, 생활용품 묶음구매의 단가·보관·소진기간을 함께 보는 손익 판단법을 정리했습니다."
    tags = @("경제", "생활비", "소비판단")
    section = "경제"
    keywords = "경제,묶음구매,생활용품,단가비교,소비판단"
    image = "strategy-plan.jpg"
    topic = "생활용품 묶음구매"
  },
  [ordered]@{
    title = "교통비 리셋 루틴 가이드 2026"
    slug = "economy-transportation-cost-reset-routine-2026.html"
    summary = "출퇴근과 이동비가 누적될 때 지출을 낮추기 위해, 교통수단 조합과 정기권 활용 루틴을 정리한 실전 가이드입니다."
    tags = @("경제", "교통비", "지출관리")
    section = "경제"
    keywords = "경제,교통비,정기권,출퇴근비,지출관리"
    image = "strategy-plan.jpg"
    topic = "교통비 리셋"
  },
  [ordered]@{
    title = "반려동물 월지출 관리 가이드 2026"
    slug = "economy-pet-monthly-expense-management-guide-2026.html"
    summary = "반려동물 양육비를 안정적으로 관리하기 위해, 필수·변동·비상비 항목으로 나누는 월지출 구조를 정리했습니다."
    tags = @("경제", "반려동물", "가계관리")
    section = "경제"
    keywords = "경제,반려동물,양육비,월지출,가계관리"
    image = "strategy-plan.jpg"
    topic = "반려동물 월지출 관리"
  },
  [ordered]@{
    title = "의류 쇼핑 과소비 차단 가이드 2026"
    slug = "economy-clothing-shopping-overspending-control-guide-2026.html"
    summary = "시즌 세일 때 예산이 무너지는 패턴을 막기 위해, 의류 구매 우선순위와 24시간 보류 규칙을 정리한 실전 가이드입니다."
    tags = @("경제", "의류", "소비관리")
    section = "경제"
    keywords = "경제,의류쇼핑,과소비,세일,소비관리"
    image = "strategy-plan.jpg"
    topic = "의류 쇼핑 과소비 관리"
  },
  [ordered]@{
    title = "자동차 유지비 월간 점검표 2026"
    slug = "economy-car-maintenance-monthly-checklist-2026.html"
    summary = "차량 유지비가 예상보다 커질 때 원인을 빠르게 파악하기 위해, 연료·보험·정비·주차비를 묶어 보는 월간 점검표를 정리했습니다."
    tags = @("경제", "자동차", "고정비")
    section = "경제"
    keywords = "경제,자동차유지비,정비비,주차비,고정비관리"
    image = "strategy-plan.jpg"
    topic = "자동차 유지비 점검"
  }
)

function Make-PostHtml {
  param($item)

  $title = $item.title
  $summary = $item.summary
  $topic = $item.topic
  $tags = $item.tags
  $canonical = "https://partygame.pe.kr/blog/posts/$($item.slug)"
  $ogImage = "https://partygame.pe.kr/brainTest/images/$($item.image)"
  $keywords = $item.keywords
  $section = $item.section
  $tagHtml = ($tags | ForEach-Object { '          <span class="px-3 py-1 rounded-full border border-white/20 text-slate-200">#{0}</span>' -f $_ }) -join "`r`n"

  $intro = "$topic 주제는 감정과 돈, 시간의 균형이 동시에 필요한 영역이라 한 가지 기준만으로 해결하기 어렵습니다. 30대 생활에서는 일과 컨디션, 예산이 매주 달라지기 때문에 즉흥 대응이 반복되면 쉽게 지치게 됩니다. 그래서 저는 완벽한 정답보다 반복 가능한 운영 루틴을 먼저 맞추는 편입니다. 이 글은 실제로 바로 써볼 수 있는 질문, 문장, 점검 순서 중심으로 구성했습니다. 작게 시작해도 꾸준히 유지되면 체감 변화가 분명히 생깁니다. 관계와 재정 모두 결국 관리 가능한 구조를 만드는 것이 핵심입니다."
  $p1 = "첫 번째 기준은 사실과 해석을 분리하는 것입니다. 문제가 생긴 날에는 사실보다 의미 해석이 먼저 커져 갈등이 확대되기 쉽습니다. 실전에서는 사실 한 줄, 감정 한 줄, 요청 한 줄 순서로 말해보세요. 예를 들어 '이번 주 계획이 두 번 바뀌어서 피로했어. 다음 주는 최소 하루 전에 공유해주면 좋겠어'처럼 구체적으로 말하는 방식입니다. $topic 이슈에서는 맞고 틀림을 가르기보다 대화의 형태를 안정시키는 것이 우선입니다. 표현 순서만 바꿔도 대화 온도가 크게 달라집니다."
  $p2 = "두 번째 기준은 대화 시간대를 예약하는 것입니다. 감정이 올라온 순간 즉시 결론을 내리려 하면 대체로 후회가 남습니다. 그래서 확인 대화와 결론 대화를 분리해 짧게라도 시간 약속을 잡는 게 좋습니다. 실전 문장은 '지금은 서로 예민하니 저녁 9시에 15분만 정리하자'가 효과적입니다. 예고된 대화는 상대에게도 안전 신호가 됩니다. $topic 문제는 타이밍 관리만으로도 절반 이상 줄어드는 경우가 많습니다."
  $p3 = "세 번째 기준은 숫자 경계선을 합의하는 것입니다. 월 예산, 주간 빈도, 최소 연락 신호처럼 수치가 있으면 오해가 줄어듭니다. 기준이 없으면 매번 감정 상태에 따라 판단이 흔들리기 쉽습니다. 핵심은 상대를 통제하는 것이 아니라 서로의 한계를 보이게 만드는 데 있습니다. 실전에서는 '나는 이 선을 넘으면 부담이 커져'라고 내 기준을 먼저 공개하세요. $topic 상황에서도 경계선이 생기면 반복 소모가 눈에 띄게 줄어듭니다."
  $p4 = "네 번째 기준은 예외 상황 문장입니다. 일정 붕괴, 컨디션 저하, 예상 밖 지출은 누구에게나 생깁니다. 문제는 변수 자체보다 변수 상황에서 쓸 문장이 없어서 생기는 오해입니다. 그래서 '오늘은 길게 대화하기 어렵고 내일 오전에 다시 이야기하자' 같은 문장을 미리 합의해 두는 것이 좋습니다. $topic 이슈도 예외 규칙만 세워두면 감정 폭발 구간을 짧게 만들 수 있습니다. 준비된 한 문장이 관계 체력을 지켜줍니다."
  $p5 = "다섯 번째 기준은 월 1회 회고 루틴입니다. 문제가 생길 때마다 반응만 하면 같은 패턴이 반복됩니다. 한 달에 한 번 20분만 투자해 잘한 점 1개, 아쉬운 점 1개, 다음 달 수정 1개를 기록해보세요. 기록이 쌓이면 감정 기억이 아니라 운영 데이터로 판단할 수 있습니다. 실전 문장은 '이번 달에는 이 방식이 좋았고 다음 달에는 이 부분만 바꿔보자'가 좋습니다. $topic 주제는 단기 완벽보다 작은 조정의 누적이 훨씬 현실적입니다."
  $summaryRun = "바로 실행할 3줄 요약입니다. 1) 사실-감정-요청 순서로 말하기. 2) 즉흥 반응 대신 대화 시간을 예약하기. 3) 숫자 경계선과 예외 문장을 합의하고 월 1회 회고하기. 이 루틴을 반복하면 $topic 관련 스트레스를 관리 가능한 영역으로 바꿀 수 있습니다."

  return @"
<!DOCTYPE html>
<html lang="ko">
<head>
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
  <meta property="article:published_time" content="$date">
  <meta name="google-adsense-account" content="ca-pub-1087435977438565">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <title>$title | 연애경제 블로그</title>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-50">
  <main class="max-w-4xl mx-auto px-6 py-12 space-y-8">
    <article class="rounded-3xl border border-white/10 bg-white/5 p-8 space-y-6">
      <header class="space-y-4">
        <div class="flex flex-wrap gap-2 text-sm">
$tagHtml
        </div>
        <h1 class="text-3xl md:text-4xl font-bold">$title</h1>
        <p class="text-slate-200">30대 여성의 현실 감각으로 정리한 실전 적용형 가이드</p>
        <p class="text-sm text-slate-400">업데이트: $date</p>
        <img src="/brainTest/images/$($item.image)" alt="$title 대표 이미지" class="w-full rounded-2xl border border-white/10">
      </header>

      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">핵심 배경: 왜 지금 점검이 필요한가</h2>
        <p class="leading-relaxed text-slate-200">$intro</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">실전 기준 1</h2>
        <p class="leading-relaxed text-slate-200">$p1</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">실전 기준 2</h2>
        <p class="leading-relaxed text-slate-200">$p2</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">실전 기준 3</h2>
        <p class="leading-relaxed text-slate-200">$p3</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">실전 기준 4</h2>
        <p class="leading-relaxed text-slate-200">$p4</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">실전 기준 5</h2>
        <p class="leading-relaxed text-slate-200">$p5</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">바로 실행할 요약</h2>
        <p class="leading-relaxed text-slate-200">$summaryRun</p>
      </section>

      <footer class="pt-6 border-t border-white/10">
        <p class="text-sm text-slate-400">본 글은 일반 정보 제공 목적이며 개인 상황에 따라 적용 결과는 달라질 수 있습니다.</p>
      </footer>
    </article>

    <nav class="rounded-2xl border border-white/10 bg-white/5 p-6">
      <a href="/blog/" class="text-indigo-200 hover:text-indigo-100 transition">← 블로그 목록으로 돌아가기</a>
    </nav>
  </main>
</body>
</html>
"@
}

foreach ($item in $items) {
  $html = Make-PostHtml -item $item
  Set-Content -Path (Join-Path $postsDir $item.slug) -Value $html -Encoding utf8
}

$jsonEntries = ($items | ForEach-Object {
  [ordered]@{
    title = $_.title
    path = "/blog/posts/$($_.slug)"
    summary = $_.summary
    tags = $_.tags
  }
} | ConvertTo-Json -Depth 3)

$indexRaw = Get-Content -Raw $indexPath
$insertion = ($jsonEntries -replace '^\[\s*', '' -replace '\s*\]$', '').Trim()
$indexRaw = $indexRaw -replace '(const posts = \[\r?\n)', ('$1' + $insertion + ",`r`n")
Set-Content -Path $indexPath -Value $indexRaw -Encoding utf8

$sitemapAdd = ($items | ForEach-Object {
@"
  <url>
        <loc>https://partygame.pe.kr/blog/posts/$($_.slug)</loc>
        <lastmod>$iso</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>
"@
}) -join "`r`n"

$sitemapRaw = Get-Content -Raw $sitemapPath
$sitemapRaw = [regex]::Replace(
  $sitemapRaw,
  '(?s)(<loc>https://partygame.pe.kr/blog/</loc>\s*<lastmod>)([^<]+)(</lastmod>)',
  { param($m) $m.Groups[1].Value + $iso + $m.Groups[3].Value }
)
$sitemapRaw = $sitemapRaw -replace '</urlset>', ($sitemapAdd + "`r`n</urlset>")
Set-Content -Path $sitemapPath -Value $sitemapRaw -Encoding utf8
