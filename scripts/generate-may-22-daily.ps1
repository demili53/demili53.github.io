$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $root "blog\posts"
$indexPath = Join-Path $root "blog\index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$blogSitemapPath = Join-Path $root "blog\sitemap-longform.xml"
$aiPath = Join-Path $root "ai-ranking\index.html"
$gamePath = Join-Path $root "game-ranking\index.html"
$fruitPath = Join-Path $root "fruit-ranking\index.html"
$date = "2026-05-22"
$iso = "2026-05-22T10:30:00+09:00"

$items = @(
  [ordered]@{
    title = "주말 데이트 피로 줄이는 일정 합의 가이드 2026"
    slug = "romance-weekend-date-fatigue-schedule-guide-2026.html"
    summary = "주말마다 데이트가 의무처럼 느껴질 때 관계를 식히지 않으면서 일정, 휴식, 만남 빈도를 조정하는 실전 대화법입니다."
    tags = @("연애", "주말데이트", "일정조율")
    section = "연애"
    keywords = "연애,주말데이트,데이트피로,일정조율,관계대화"
    image = "vacation-lake.jpg"
    topic = "주말 데이트 피로"
    angle = "만남의 양보다 회복 가능한 리듬을 맞추는 것"
    action = "이번 주말은 반나절 데이트와 각자 회복 시간을 분리하자"
  },
  [ordered]@{
    title = "연애 초반 연락 온도차 조율 가이드 2026"
    slug = "romance-early-texting-temperature-guide-2026.html"
    summary = "연애 초반 연락 빈도와 표현 속도가 다를 때 부담을 주지 않고 서로의 연락 온도를 맞추는 기준과 문장을 정리했습니다."
    tags = @("연애", "연락", "연애초반")
    section = "연애"
    keywords = "연애,연애초반,연락빈도,카톡,소통"
    image = "first-hello-warm.jpg"
    topic = "연애 초반 연락 온도차"
    angle = "호감 확인보다 예측 가능한 연락 리듬을 만드는 것"
    action = "평일에는 짧게라도 하루 한 번 안부를 주고받자"
  },
  [ordered]@{
    title = "AI 프로필 사진 사용 전 연애 신뢰 가이드 2026"
    slug = "romance-ai-profile-photo-trust-guide-2026.html"
    summary = "AI 보정 프로필과 실제 만남 사이의 괴리감을 줄이기 위해 사진 사용 범위, 소개 문구, 첫 만남 신뢰 기준을 정리했습니다."
    tags = @("연애", "AI프로필", "신뢰")
    section = "연애"
    keywords = "연애,AI프로필,소개팅앱,신뢰,첫만남"
    image = "face-og.jpg"
    topic = "AI 프로필 사진 사용"
    angle = "좋아 보이는 이미지보다 만났을 때 신뢰가 깨지지 않는 선을 찾는 것"
    action = "AI 보정 사진은 보조로 쓰고 최근 일반 사진을 함께 올리자"
  },
  [ordered]@{
    title = "커플 여행 예약 전 비용 분담 가이드 2026"
    slug = "romance-couple-trip-booking-cost-share-guide-2026.html"
    summary = "여행 예약 전에 숙소, 교통, 식비, 취소 수수료를 어떻게 나눌지 정해두는 커플 비용 분담 체크리스트입니다."
    tags = @("연애", "커플여행", "비용분담")
    section = "연애"
    keywords = "연애,커플여행,여행비용,비용분담,예약"
    image = "bff-travel.jpg"
    topic = "커플 여행 예약 전 비용 분담"
    angle = "여행의 설렘을 지키기 위해 돈 이야기를 예약 전에 끝내는 것"
    action = "예약 전 총액과 환불 불가 비용을 먼저 공유하자"
  },
  [ordered]@{
    title = "장마철 데이트 취소 갈등 줄이는 대화 가이드 2026"
    slug = "romance-rainy-season-date-cancel-guide-2026.html"
    summary = "비 예보와 컨디션 때문에 데이트가 자주 바뀔 때 서운함을 줄이는 취소 기준, 대체 일정, 사과 문장을 정리했습니다."
    tags = @("연애", "장마철", "데이트취소")
    section = "연애"
    keywords = "연애,장마철데이트,데이트취소,일정변경,소통"
    image = "first-hello-breeze.jpg"
    topic = "장마철 데이트 취소"
    angle = "취소 자체보다 취소 후 복구 방식을 미리 정하는 것"
    action = "비 예보가 70% 이상이면 실내 대안으로 자동 전환하자"
  },
  [ordered]@{
    title = "여름 냉방비 예산 선반영 가이드 2026"
    slug = "economy-summer-cooling-bill-prebudget-guide-2026.html"
    summary = "본격적인 더위 전에 냉방비를 생활비에 미리 반영하고 전기요금 충격을 줄이는 월간 예산 조정법입니다."
    tags = @("경제", "냉방비", "생활비")
    section = "경제"
    keywords = "경제,냉방비,전기요금,생활비,여름예산"
    image = "summerbti-meadow.jpg"
    topic = "여름 냉방비 예산 선반영"
    angle = "아낄 의지보다 계절 비용을 미리 예산에 올리는 것"
    action = "6~8월 생활비에 냉방 예비비를 별도 항목으로 넣자"
  },
  [ordered]@{
    title = "AI 구독료 월간 ROI 점검 가이드 2026"
    slug = "economy-ai-subscription-monthly-roi-guide-2026.html"
    summary = "ChatGPT, Claude, Gemini 같은 AI 유료 구독을 유지할지 판단하기 위해 사용 시간, 대체 비용, 결과물을 점검하는 기준입니다."
    tags = @("경제", "AI구독", "고정비")
    section = "경제"
    keywords = "경제,AI구독,구독료,고정비,ROI"
    image = "startup-vision.jpg"
    topic = "AI 구독료 월간 ROI"
    angle = "새로운 기능보다 내 생활에서 실제로 줄어든 시간과 비용을 보는 것"
    action = "한 달에 만든 결과물 5개와 줄인 시간을 기록하자"
  },
  [ordered]@{
    title = "휴가 전 카드값 폭주 방지 예산 가이드 2026"
    slug = "economy-vacation-card-spending-control-guide-2026.html"
    summary = "휴가 준비 과정에서 숙소, 교통, 쇼핑, 예약금이 한꺼번에 몰릴 때 카드값 폭주를 막는 예산 분리법입니다."
    tags = @("경제", "휴가예산", "카드값")
    section = "경제"
    keywords = "경제,휴가예산,카드값,여행비,소비관리"
    image = "vacation-beach.jpg"
    topic = "휴가 전 카드값 폭주"
    angle = "여행 총액을 감으로 보지 않고 결제일 기준 현금흐름으로 쪼개는 것"
    action = "예약금과 현지 지출을 결제일별로 나눠 적자"
  },
  [ordered]@{
    title = "배달앱 쿠폰 과소비 차단 루틴 2026"
    slug = "economy-delivery-app-coupon-overspending-routine-2026.html"
    summary = "할인 쿠폰 때문에 오히려 배달비가 늘어나는 패턴을 막기 위해 주문 기준, 장바구니 대기, 월 한도를 정리했습니다."
    tags = @("경제", "배달앱", "식비절약")
    section = "경제"
    keywords = "경제,배달앱,쿠폰,식비절약,과소비"
    image = "dinner-pizza.jpg"
    topic = "배달앱 쿠폰 과소비"
    angle = "할인율보다 결제 후 남는 식비 한도를 기준으로 보는 것"
    action = "쿠폰을 쓰기 전 이번 주 배달 잔여 한도를 먼저 확인하자"
  },
  [ordered]@{
    title = "중고폰 교체 전 데이터 이전 비용 체크리스트 2026"
    slug = "economy-used-phone-data-transfer-cost-checklist-2026.html"
    summary = "중고폰으로 바꾸기 전에 기기값 외에 케이스, 보호필름, 데이터 이전, 앱 인증 비용까지 점검하는 체크리스트입니다."
    tags = @("경제", "중고폰", "소비판단")
    section = "경제"
    keywords = "경제,중고폰,데이터이전,휴대폰교체,소비판단"
    image = "strategy-plan.jpg"
    topic = "중고폰 교체 전 데이터 이전 비용"
    angle = "기기값만 비교하지 않고 교체 과정의 숨은 비용까지 보는 것"
    action = "구매 전 이전 작업과 부가 액세서리 비용을 총액에 넣자"
  }
)

function Escape-Html {
  param([string]$Value)
  return [System.Net.WebUtility]::HtmlEncode($Value)
}

function Make-PostHtml {
  param($item)

  $title = Escape-Html $item.title
  $summary = Escape-Html $item.summary
  $topic = Escape-Html $item.topic
  $angle = Escape-Html $item.angle
  $action = Escape-Html $item.action
  $canonical = "https://partygame.pe.kr/blog/posts/$($item.slug)"
  $ogImage = "https://partygame.pe.kr/brainTest/images/$($item.image)"
  $keywords = Escape-Html $item.keywords
  $section = Escape-Html $item.section
  $tagHtml = ($item.tags | ForEach-Object { "          <span class=""px-3 py-1 rounded-full border border-white/20 text-slate-200"">#$(Escape-Html $_)</span>" }) -join "`r`n"

  $intro = "$topic 문제는 보통 어느 날 갑자기 커지지 않습니다. 작은 불편이 쌓이고, 그 불편을 설명할 문장이 없을 때 마음속에서 크게 부풀어 올라요. 그래서 오늘 버전의 핵심은 거창한 결심보다 바로 적어볼 수 있는 기준표입니다. $angle 이 기준이 되면 선택이 훨씬 가벼워집니다. 특히 30대의 일상은 시간, 체력, 돈이 동시에 움직이기 때문에 감정만으로 밀어붙이거나 숫자만으로 판단하면 오래 유지하기 어렵습니다. 이 글은 생활 리듬을 망치지 않으면서도 지금 바로 적용할 수 있는 순서로 정리했습니다."
  $p1 = "첫 번째는 현재 상태를 한 문장으로 정의하는 것입니다. 막연히 힘들다, 서운하다, 돈이 많이 든다로 시작하면 대화가 흐려집니다. 대신 '이번 달에는 이 항목 때문에 부담이 커졌다', '나는 이 상황에서 예측이 안 돼서 불안하다'처럼 원인을 좁혀보세요. 실전 문장은 '$action'처럼 행동으로 연결되는 형태가 좋습니다. 이렇게 말하면 상대나 나 자신이 무엇을 바꾸면 되는지 바로 보입니다. $topic 상황에서는 감정의 크기보다 수정 가능한 지점을 먼저 찾는 태도가 중요합니다."
  $p2 = "두 번째는 기준을 숫자로 바꾸는 것입니다. 숫자는 차갑게 들릴 수 있지만, 관계와 생활을 지키는 안전장치가 되기도 합니다. 예를 들어 주 1회, 월 10만 원, 하루 15분, 예약 전 확인 같은 단위가 있으면 같은 문제를 매번 처음부터 설명하지 않아도 됩니다. 기준을 정할 때는 이상적인 수준이 아니라 피곤한 날에도 지킬 수 있는 최저선을 잡아야 합니다. 최저선이 지켜지면 마음의 소모가 줄고, 여유가 있을 때 더 좋은 선택을 할 수 있습니다."
  $p3 = "세 번째는 예외 규칙을 미리 정하는 것입니다. 현실에서는 날씨, 업무, 컨디션, 갑작스러운 지출처럼 계획을 흔드는 변수가 계속 생깁니다. 예외가 생길 때마다 감정으로 대응하면 관계도 예산도 쉽게 지칩니다. 그래서 '어쩔 수 없는 변경이 생기면 언제까지 알릴지', '예산을 넘기면 어떤 항목에서 줄일지', '이번 주에 못 하면 다음 주에 어떻게 보완할지'를 정해두면 좋습니다. 예외 규칙은 느슨함이 아니라 복구력을 높이는 장치입니다."
  $p4 = "네 번째는 말투를 부드럽게 하되 요청은 흐리지 않는 것입니다. 좋은 대화는 상대를 기분 좋게만 만드는 대화가 아니라, 필요한 조정을 실제로 일어나게 만드는 대화입니다. '네가 문제야' 대신 '나는 이 부분이 반복되면 힘들어'라고 말하고, 바로 다음에 원하는 행동을 붙이세요. 예를 들어 '다음부터는 예약 전에 총액을 같이 확인하자', '취소가 필요하면 전날 밤까지 말해주면 좋겠어'처럼 구체적으로 말하는 방식입니다. 부드러운 말투와 선명한 요청은 함께 갈 수 있습니다."
  $p5 = "다섯 번째는 기록입니다. 머릿속으로만 기억하면 가장 힘들었던 장면만 크게 남습니다. 간단히 메모 앱에 날짜, 상황, 쓴 돈 또는 쓴 시간, 다음 수정점만 적어도 패턴이 보입니다. 한 달 뒤에 보면 내가 과하게 걱정한 부분과 실제로 반복된 부분이 구분됩니다. $topic 이슈도 기록이 쌓이면 감정 싸움이 아니라 운영 문제로 다룰 수 있습니다. 기록은 나를 몰아붙이기 위한 도구가 아니라, 다음 선택을 가볍게 하기 위한 도구입니다."
  $p6 = "마지막으로 오늘 바로 실행할 체크리스트를 남겨보세요. 1) 지금 가장 부담되는 지점 하나를 적기. 2) 그 지점에 대해 숫자 기준 하나를 만들기. 3) 예외 상황에서 쓸 문장 하나를 미리 정하기. 4) 일주일 뒤 같은 기준이 도움이 됐는지 확인하기. 이 네 단계만 해도 문제의 크기가 줄어듭니다. 완벽한 해결보다 반복 가능한 조정이 더 현실적입니다. 오늘 정한 작은 기준이 다음 주의 피로를 줄여줄 수 있습니다."

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
  <meta property="article:published_time" content="$iso">
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
        <p class="text-slate-200">$summary</p>
        <p class="text-sm text-slate-400">업데이트: $date</p>
        <img src="/brainTest/images/$($item.image)" alt="$title 대표 이미지" class="w-full rounded-2xl border border-white/10">
      </header>

      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">왜 지금 이 기준이 필요한가</h2>
        <p class="leading-relaxed text-slate-200">$intro</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">상황을 한 문장으로 좁히기</h2>
        <p class="leading-relaxed text-slate-200">$p1</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">숫자 기준 만들기</h2>
        <p class="leading-relaxed text-slate-200">$p2</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">예외 상황을 미리 정하기</h2>
        <p class="leading-relaxed text-slate-200">$p3</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">부드럽지만 선명하게 요청하기</h2>
        <p class="leading-relaxed text-slate-200">$p4</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">기록으로 패턴 확인하기</h2>
        <p class="leading-relaxed text-slate-200">$p5</p>
      </section>
      <section class="space-y-4">
        <h2 class="text-2xl font-semibold text-indigo-200">오늘 바로 실행할 체크리스트</h2>
        <p class="leading-relaxed text-slate-200">$p6</p>
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

$indexRaw = Get-Content -Raw -Path $indexPath
$newIndexEntries = @()
foreach ($item in $items) {
  $path = "/blog/posts/$($item.slug)"
  if ($indexRaw -notmatch [regex]::Escape($path)) {
    $obj = [ordered]@{
      title = $item.title
      path = $path
      summary = $item.summary
      tags = $item.tags
    }
    $newIndexEntries += ($obj | ConvertTo-Json -Depth 3)
  }
}
if ($newIndexEntries.Count -gt 0) {
  $insertion = ($newIndexEntries -join ",`r`n") + ",`r`n"
  $indexRaw = $indexRaw -replace '(const posts = \[\r?\n)', ('$1' + $insertion)
  Set-Content -Path $indexPath -Value $indexRaw -Encoding utf8
}

$sitemapRaw = Get-Content -Raw -Path $sitemapPath
$sitemapRaw = [regex]::Replace(
  $sitemapRaw,
  '(?s)(<loc>https://partygame.pe.kr/blog/</loc>\s*<lastmod>)([^<]+)(</lastmod>)',
  { param($m) $m.Groups[1].Value + $iso + $m.Groups[3].Value }
)
foreach ($mainUrl in @("https://partygame.pe.kr/ai-ranking/", "https://partygame.pe.kr/game-ranking/", "https://partygame.pe.kr/fruit-ranking/")) {
  $escaped = [regex]::Escape($mainUrl)
  $sitemapRaw = [regex]::Replace(
    $sitemapRaw,
    "(?s)(<loc>$escaped</loc>\s*<lastmod>)([^<]+)(</lastmod>)",
    { param($m) $m.Groups[1].Value + $iso + $m.Groups[3].Value }
  )
}
$sitemapAdd = @()
foreach ($item in $items) {
  $loc = "https://partygame.pe.kr/blog/posts/$($item.slug)"
  if ($sitemapRaw -notmatch [regex]::Escape($loc)) {
    $sitemapAdd += @"
  <url>
        <loc>$loc</loc>
        <lastmod>$iso</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
      </url>
"@
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
      $blogSitemapAdd += @"
  <url>
    <loc>$loc</loc>
    <lastmod>$iso</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
"@
    }
  }
  if ($blogSitemapAdd.Count -gt 0) {
    $blogSitemapRaw = $blogSitemapRaw -replace '</urlset>', (($blogSitemapAdd -join "`r`n") + "`r`n</urlset>")
    Set-Content -Path $blogSitemapPath -Value $blogSitemapRaw -Encoding utf8
  }
}

$aiRaw = Get-Content -Raw -Path $aiPath
$aiRaw = $aiRaw -replace '업데이트: 2026-\d{2}-\d{2}', "업데이트: $date"
$aiTools = @'
    const tools = [
      { name: "ChatGPT", url: "https://chatgpt.com", desc: "범용 대화, 문서, 이미지, 코딩까지 일상 업무 전반에 쓰기 좋은 대표 AI 서비스입니다." },
      { name: "Claude", url: "https://claude.ai", desc: "긴 문서 해석과 자연스러운 장문 작성, 복잡한 업무 추론에서 강점이 큽니다." },
      { name: "Google Gemini", url: "https://gemini.google.com", desc: "구글 검색과 워크스페이스 흐름을 함께 쓰기 좋은 멀티모달 AI입니다." },
      { name: "Perplexity", url: "https://www.perplexity.ai", desc: "출처 기반 답변과 최신 리서치 정리에 강한 검색형 AI 서비스입니다." },
      { name: "Midjourney", url: "https://www.midjourney.com", desc: "스타일 완성도가 높은 이미지와 콘셉트 아트 제작에서 선호도가 높습니다." },
      { name: "Sora", url: "https://sora.com", desc: "텍스트와 이미지 기반 영상 생성 실험에 적합한 대표 영상 AI 서비스입니다." },
      { name: "Runway", url: "https://runwayml.com", desc: "영상 생성과 편집 기능을 함께 제공해 숏폼 제작 워크플로에 잘 맞습니다." },
      { name: "Adobe Firefly", url: "https://www.adobe.com/products/firefly.html", desc: "Adobe 앱과 연동해 상업 디자인 시안 제작에 활용하기 좋습니다." },
      { name: "Canva Magic Studio", url: "https://www.canva.com/magic-studio/", desc: "SNS 이미지, 발표 자료, 마케팅 소재를 빠르게 만들기 좋은 디자인 AI입니다." },
      { name: "ElevenLabs", url: "https://elevenlabs.io", desc: "음성 합성, 더빙, 내레이션 제작에 특화된 오디오 생성 AI입니다." },
      { name: "Suno", url: "https://suno.com", desc: "가사와 분위기 입력만으로 음악 초안을 빠르게 만들 수 있습니다." },
      { name: "Cursor", url: "https://www.cursor.com", desc: "코드베이스 이해와 파일 편집 흐름에 초점을 맞춘 AI 코딩 에디터입니다." },
      { name: "GitHub Copilot", url: "https://github.com/features/copilot", desc: "IDE와 GitHub 워크플로에 자연스럽게 붙는 코드 보조 도구입니다." },
      { name: "Grok", url: "https://grok.com", desc: "실시간 이슈 탐색과 추론형 답변을 함께 활용하기 좋은 대화형 AI입니다." },
      { name: "Kling AI", url: "https://klingai.com", desc: "이미지-투-비디오와 짧은 영상 생성 실험에 쓰기 좋은 영상 AI입니다." },
      { name: "Ideogram", url: "https://ideogram.ai", desc: "텍스트가 들어간 이미지와 포스터형 비주얼 생성에 활용하기 좋습니다." },
      { name: "Leonardo AI", url: "https://leonardo.ai", desc: "게임 에셋, 제품 콘셉트, 일러스트 시안 제작에 강한 이미지 AI입니다." },
      { name: "Recraft", url: "https://www.recraft.ai", desc: "브랜드 그래픽, 벡터풍 이미지, 아이콘 제작 흐름에 잘 맞습니다." },
      { name: "Gamma", url: "https://gamma.app", desc: "문서형 입력을 발표 자료와 웹 문서 형태로 빠르게 바꿔줍니다." },
      { name: "Notion AI", url: "https://www.notion.com/product/ai", desc: "노트, 문서, 회의 기록을 정리하고 요약하는 생산성 보조에 적합합니다." }
    ];
'@
$aiRaw = [regex]::Replace($aiRaw, '(?s)    const tools = \[.*?\];', $aiTools)
Set-Content -Path $aiPath -Value $aiRaw -Encoding utf8

$gameRaw = Get-Content -Raw -Path $gamePath
$gameRaw = $gameRaw -replace '<p class="mt-2 text-2xl font-bold text-white">2026-\d{2}-\d{2}</p>', "<p class=""mt-2 text-2xl font-bold text-white"">$date</p>"
$gameRaw = $gameRaw -replace '참고: 최신 공개값은 게임트릭스 2026-\d{2}-\d{2} 종합게임지수 상위권을 기준으로 반영했고, 11~20위는 편집형 보조 순위입니다.', '참고: 게임트릭스 2026년 5월 2주차 공개 흐름과 5월 PC방 인기 순위 자료를 함께 참고했고, 최신 일자는 편집형 보조 순위입니다.'
if ($gameRaw -notmatch '"2026-05-22"') {
  $rankingInsertion = 'const rankingByDate = {' + "`r`n" + '      "2026-05-22": ["lol","lineageclassic","pubg","valorant","overwatch2","suddenattack","fconline","msworlds","maple","starcraft","dnf","lostark","roblox","wow","minecraft","apex","diablo4","gtaonline","poe2","warframe"],' + "`r`n"
  $gameRaw = $gameRaw -replace 'const rankingByDate = \{\r?\n', $rankingInsertion
}
Set-Content -Path $gamePath -Value $gameRaw -Encoding utf8

$fruitRaw = Get-Content -Raw -Path $fruitPath
$fruitRaw = $fruitRaw -replace '업데이트: 2026-\d{2}-\d{2}', "업데이트: $date"
$fruitRaw = $fruitRaw -replace '항산화 성분\(안토시아닌\)이 풍부해 노화 스트레스 관리에 도움\.', '안토시아닌 등 폴리페놀을 챙기기 좋아 베리류 섭취를 늘릴 때 우선 고려하기 좋음.'
$fruitRaw = $fruitRaw -replace '펙틴 식이섬유가 장 건강과 혈당 완만화에 도움\.', '껍질째 먹으면 펙틴과 식물성 화합물을 함께 챙기기 좋은 일상 과일.'
$fruitRaw = $fruitRaw -replace '비타민 C 밀도가 높고 소화 효소\(액티니딘\) 함유\.', '비타민 C 밀도가 높고 식후 과일로 활용하기 쉬운 새콤한 과일.'
$fruitRaw = $fruitRaw -replace '비타민 C와 수분 보충에 좋아 피로 관리에 활용하기 쉬움\.', '비타민 C와 수분을 함께 보충하기 쉬운 대표 감귤류 과일.'
Set-Content -Path $fruitPath -Value $fruitRaw -Encoding utf8
