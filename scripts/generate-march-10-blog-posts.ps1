$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $root "blog\posts"
$indexPath = Join-Path $root "blog\index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$date = "2026-03-06"
$iso = "2026-03-06T10:30:00+09:00"

$items = @(
  [ordered]@{
    title = "잠수 이별 직전 신호 대화 가이드 2026"
    slug = "romance-silent-treatment-recovery-conversation-guide-2026.html"
    summary = "연락이 급격히 줄어드는 잠수 패턴에서 상처를 줄이기 위해, 확인 질문과 관계 정리 문장을 단계별로 정리한 실전 가이드입니다."
    tags = @("연애", "소통", "관계정리")
    section = "연애"
    keywords = "연애,잠수,연락두절,대화법,관계정리"
    image = "love-midyear-steady.jpg"
    topic = "잠수 패턴 대처"
  },
  [ordered]@{
    title = "진지한 만남 전 돈 이야기 가이드 2026"
    slug = "romance-money-talk-before-commitment-guide-2026.html"
    summary = "진지한 관계로 가기 전 피하기 어려운 돈 이야기를 안전하게 꺼내기 위해, 지출 기준과 부담 신호를 정리한 대화 가이드입니다."
    tags = @("연애", "돈관리", "대화법")
    section = "연애"
    keywords = "연애,돈이야기,커플예산,관계진전,대화가이드"
    image = "love-midyear-steady.jpg"
    topic = "진지한 만남 전 돈 대화"
  },
  [ordered]@{
    title = "평일 저녁 데이트 루틴 설계 가이드 2026"
    slug = "romance-weeknight-date-routine-guide-2026.html"
    summary = "퇴근 후 지친 상태에서도 관계를 유지하기 위해, 평일 저녁 데이트 빈도와 체력 배분 기준을 정리한 실전 루틴 가이드입니다."
    tags = @("연애", "시간관리", "데이트")
    section = "연애"
    keywords = "연애,평일데이트,시간관리,직장인연애,루틴"
    image = "love-midyear-steady.jpg"
    topic = "평일 저녁 데이트 루틴"
  },
  [ordered]@{
    title = "부모님 인사 전 경계선 체크리스트 2026"
    slug = "romance-parents-meeting-boundary-checklist-2026.html"
    summary = "부모님 인사 전 과속으로 생기는 부담을 줄이기 위해, 시기·역할·질문 범위를 정리한 관계 경계선 체크리스트입니다."
    tags = @("연애", "가족", "체크리스트")
    section = "연애"
    keywords = "연애,부모님인사,관계경계선,결혼압박,체크리스트"
    image = "love-midyear-steady.jpg"
    topic = "부모님 인사 전 경계선"
  },
  [ordered]@{
    title = "이별 문자 후 마무리 대화 가이드 2026"
    slug = "romance-breakup-message-closure-guide-2026.html"
    summary = "이별 문자를 받은 뒤 감정 소모를 줄이기 위해, 꼭 확인할 질문과 연락 종료 기준을 정리한 마무리 대화 가이드입니다."
    tags = @("연애", "이별", "회복")
    section = "연애"
    keywords = "연애,이별문자,마무리대화,감정관리,회복"
    image = "love-midyear-steady.jpg"
    topic = "이별 후 마무리 대화"
  },
  [ordered]@{
    title = "장보기 물가 방어 루틴 2026"
    slug = "economy-grocery-price-defense-routine-2026.html"
    summary = "식비가 계속 오르는 상황에서 체감 물가를 낮추기 위해, 장보기 전후 점검표와 품목 우선순위를 정리한 실전 가이드입니다."
    tags = @("경제", "식비", "생활비")
    section = "경제"
    keywords = "경제,장보기,물가,식비절약,생활비관리"
    image = "strategy-plan.jpg"
    topic = "장보기 물가 방어"
  },
  [ordered]@{
    title = "구독서비스 정리 시스템 가이드 2026"
    slug = "economy-subscription-audit-system-2026.html"
    summary = "새는 고정비를 줄이기 위해, 구독서비스를 해지·유지·대체로 나누는 월간 점검 시스템을 정리한 실전 가이드입니다."
    tags = @("경제", "고정비", "구독관리")
    section = "경제"
    keywords = "경제,구독서비스,고정비절감,해지,가계관리"
    image = "strategy-plan.jpg"
    topic = "구독서비스 정리"
  },
  [ordered]@{
    title = "의료비 비상 버퍼 예산 가이드 2026"
    slug = "economy-emergency-medical-budget-buffer-guide-2026.html"
    summary = "갑작스러운 병원비로 생활비가 흔들리지 않도록, 월별 의료비 버퍼를 만드는 현실적인 예산 설계법을 정리했습니다."
    tags = @("경제", "의료비", "비상자금")
    section = "경제"
    keywords = "경제,의료비,비상예산,생활비,버퍼자금"
    image = "strategy-plan.jpg"
    topic = "의료비 비상 버퍼"
  },
  [ordered]@{
    title = "이직기 현금흐름 브릿지 플랜 2026"
    slug = "economy-job-change-cashflow-bridge-plan-2026.html"
    summary = "퇴사와 입사 사이 공백 기간의 불안을 줄이기 위해, 월별 현금흐름과 고정비 대응 순서를 정리한 이직기 재무 가이드입니다."
    tags = @("경제", "이직", "현금흐름")
    section = "경제"
    keywords = "경제,이직,현금흐름,비상자금,고정비관리"
    image = "strategy-plan.jpg"
    topic = "이직기 현금흐름 관리"
  },
  [ordered]@{
    title = "가전 교체 타이밍 판단 가이드 2026"
    slug = "economy-home-appliance-replacement-timing-guide-2026.html"
    summary = "고장 전 교체와 수리 사이에서 손해를 줄이기 위해, 가전 교체 타이밍을 비용 기준으로 판단하는 체크 포인트를 정리했습니다."
    tags = @("경제", "가전", "소비판단")
    section = "경제"
    keywords = "경제,가전교체,수리비,소비판단,생활비"
    image = "strategy-plan.jpg"
    topic = "가전 교체 타이밍"
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
  $tagHtml = ($tags | ForEach-Object { "          <span class=""px-3 py-1 rounded-full border border-white/20 text-slate-200"">#$_</span>" }) -join "`r`n"

  $intro = "$topic 주제는 감정만으로 밀어붙이면 쉽게 지치고, 숫자만으로 보면 관계와 생활의 맥락이 빠집니다. 30대 여성의 현실에서는 일과 건강, 집안일, 인간관계가 동시에 움직여서 작은 선택도 피로로 이어지기 쉬워요. 그래서 저는 복잡한 이론보다 당장 실행 가능한 문장과 순서를 먼저 맞추는 편입니다. 특히 이 이슈는 한 번의 완벽한 해결보다 반복 가능한 운영 기준이 훨씬 중요합니다. 이 글은 부담을 키우지 않으면서도 체감 변화를 만드는 방법에 집중했습니다. 오늘 바로 써볼 수 있는 질문과 점검 포인트를 중심으로 정리했습니다."
  $p1 = "첫 번째 기준은 사실과 해석을 분리하는 것입니다. 문제가 생기면 우리는 사실보다 의미를 먼저 붙여서 스스로 더 상처받기 쉬워요. 실전에서는 사실 한 줄, 감정 한 줄, 요청 한 줄의 순서로 말해보세요. 예를 들어 '이번 주 두 번 일정이 바뀌어서 아쉬웠어. 다음 주는 최소 하루 전에 알려주면 좋겠어'처럼요. 이렇게 말하면 상대도 방어보다 조정으로 반응하기 쉽습니다. $topic 이슈에서는 정답 찾기보다 대화 구조를 안정시키는 것이 우선입니다."
  $p2 = "두 번째 기준은 시간대를 분리하는 것입니다. 피곤한 상태에서 즉시 결론을 내리려 하면 갈등만 커집니다. 그래서 확인 대화와 의사결정 시간을 따로 잡아두는 게 좋아요. 실전 문장은 '지금은 감정이 올라와서, 오늘 밤 15분만 차분히 이야기하자'가 효과적입니다. 예고된 대화는 상대에게도 안전 신호가 됩니다. $topic 문제는 대화 타이밍만 바꿔도 절반은 정리되는 경우가 많습니다. 즉흥 반응보다 예약된 점검이 관계 체력을 지켜줍니다."
  $p3 = "세 번째 기준은 숫자 경계선입니다. 연애도 경제도 기준이 없으면 매번 감정에 흔들립니다. 월 예산, 주간 빈도, 최소 연락 신호처럼 수치화 가능한 선을 정해두세요. 핵심은 통제가 아니라 예측 가능성입니다. 실전에서는 '나는 이 선을 넘으면 불안이 커져'라고 설명하면 방어를 줄일 수 있어요. $topic 상황에서도 경계선이 있으면 같은 패턴의 소모를 줄일 수 있습니다. 작은 기준이 큰 오해를 막아줍니다."
  $p4 = "네 번째 기준은 예외 상황 문장입니다. 일정 붕괴, 컨디션 저하, 예상 밖 지출 같은 변수는 누구에게나 생깁니다. 문제는 변수가 아니라, 변수 때 쓸 문장이 없어서 생기는 오해예요. 그래서 '오늘은 길게 대화하기 어렵고 내일 오전에 다시 얘기할게' 같은 문장을 미리 합의해 두는 게 좋습니다. $topic 이슈에서도 예외 규칙을 만들어두면 감정 폭발 구간이 짧아집니다. 미리 준비한 한 문장이 관계를 오래 지켜줍니다."
  $p5 = "다섯 번째 기준은 월 1회 회고입니다. 그때그때 대응만 하면 같은 패턴이 반복됩니다. 한 달에 20분만 투자해 잘한 점 1개, 아쉬운 점 1개, 다음 달 수정 1개를 적어보세요. 기록이 쌓이면 감정 기억 대신 운영 데이터가 생깁니다. 실전 문장은 '이번 달에는 이 방식이 좋았고, 다음 달에는 이 부분만 바꿔보자'가 좋습니다. $topic 문제는 완벽하게 없애는 것보다, 재발 빈도를 줄이는 방식이 현실적입니다. 작은 조정의 누적이 결국 큰 안정으로 이어집니다."
  $summaryRun = "바로 실행할 3줄 요약입니다. 1) 사실-감정-요청 순서로 말하기. 2) 즉흥 반응 대신 대화 시간대를 예약하기. 3) 숫자 경계선과 예외 문장을 합의하고 월 1회 회고하기. 이 루틴을 반복하면 $topic 관련 스트레스가 관리 가능한 영역으로 바뀝니다."

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
