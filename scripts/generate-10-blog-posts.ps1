$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $root "blog\posts"
$indexPath = Join-Path $root "blog\index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$date = "2026-02-25"
$iso = "2026-02-25T11:45:00+09:00"

$items = @(
  [ordered]@{
    title = "연애 한 달차 경계선 체크리스트 2026"
    slug = "romance-first-month-boundary-checklist-2026.html"
    summary = "연애 초반 한 달 안에 꼭 맞춰야 할 연락·만남·돈 기준을 체크리스트로 정리해 불필요한 오해를 줄이는 실전 가이드입니다."
    tags = @("연애", "초반관계", "경계선")
    section = "연애"
    keywords = "연애,초반관계,경계선,연락텀,대화합의"
    image = "love-midyear-steady.jpg"
    topic = "연애 한 달차 경계선"
  },
  [ordered]@{
    title = "답장 지연 오해 줄이는 대화 가이드 2026"
    slug = "romance-reply-delay-misunderstanding-fix-guide-2026.html"
    summary = "답장 속도 차이로 생기는 서운함을 줄이기 위해, 기대치 합의 문장과 상황별 대응 기준을 정리한 실전 연애 커뮤니케이션 가이드입니다."
    tags = @("연애", "연락텀", "소통")
    section = "연애"
    keywords = "연애,답장지연,연락텀,소통,오해해소"
    image = "love-midyear-steady.jpg"
    topic = "답장 지연 오해"
  },
  [ordered]@{
    title = "두 번째 데이트 신호 읽기 가이드 2026"
    slug = "romance-second-date-signal-reading-guide-2026.html"
    summary = "첫 만남 이후 헷갈리는 신호를 과해석하지 않도록, 두 번째 데이트에서 확인할 기준과 대화 흐름을 정리한 실전 안내서입니다."
    tags = @("연애", "데이트", "관계진전")
    section = "연애"
    keywords = "연애,두번째데이트,신호해석,대화법,관계진전"
    image = "love-midyear-steady.jpg"
    topic = "두 번째 데이트 신호"
  },
  [ordered]@{
    title = "커플 여행 예산 대화 가이드 2026"
    slug = "romance-couple-travel-budget-conversation-guide-2026.html"
    summary = "여행 전 예산 대화를 미루다 생기는 갈등을 줄이기 위해, 비용 범위 설정과 결제 분담 문장을 정리한 커플 실전 가이드입니다."
    tags = @("연애", "커플여행", "예산관리")
    section = "연애"
    keywords = "연애,커플여행,예산대화,비용분담,갈등관리"
    image = "love-midyear-steady.jpg"
    topic = "커플 여행 예산"
  },
  [ordered]@{
    title = "일중독 파트너와의 대화 균형 가이드 2026"
    slug = "romance-workaholic-partner-communication-guide-2026.html"
    summary = "일이 우선인 파트너와 연애할 때 지치지 않도록, 기대치 조정과 관계 유지 문장을 정리한 30대 실전 커뮤니케이션 가이드입니다."
    tags = @("연애", "커리어", "대화법")
    section = "연애"
    keywords = "연애,일중독,커리어,관계균형,소통"
    image = "love-midyear-steady.jpg"
    topic = "일중독 파트너와의 균형"
  },
  [ordered]@{
    title = "월말 제로베이스 예산 루틴 2026"
    slug = "economy-month-end-zero-based-budget-routine-2026.html"
    summary = "월급이 어디로 사라지는지 모르겠을 때, 월말 30분으로 고정비와 변동비를 재설계하는 제로베이스 예산 루틴을 정리했습니다."
    tags = @("경제", "가계부", "예산관리")
    section = "경제"
    keywords = "경제,제로베이스예산,가계부,월말점검,지출관리"
    image = "strategy-plan.jpg"
    topic = "월말 제로베이스 예산"
  },
  [ordered]@{
    title = "소액 저축 자동화 52주 가이드 2026"
    slug = "economy-small-savings-automation-52week-guide-2026.html"
    summary = "큰 금액이 부담스러운 30대를 위해, 소액 자동이체로 52주 동안 저축 습관을 만드는 현실적인 실행 루틴을 정리했습니다."
    tags = @("경제", "저축", "자동화")
    section = "경제"
    keywords = "경제,소액저축,52주저축,자동이체,습관만들기"
    image = "strategy-plan.jpg"
    topic = "소액 저축 자동화"
  },
  [ordered]@{
    title = "전월세 vs 매수 준비도 스코어카드 2026"
    slug = "economy-rent-vs-buy-ready-scorecard-2026.html"
    summary = "지금 집을 사야 할지 더 거주해야 할지 고민될 때, 감정이 아닌 준비도 점수로 판단하는 30대 주거 의사결정 스코어카드를 정리했습니다."
    tags = @("경제", "주거", "의사결정")
    section = "경제"
    keywords = "경제,주거,매수준비도,전월세,의사결정"
    image = "strategy-plan.jpg"
    topic = "전월세와 매수 준비도"
  },
  [ordered]@{
    title = "프리랜서 세금 적립 시스템 2026"
    slug = "economy-freelancer-tax-reserve-system-2026.html"
    summary = "프리랜서 소득의 세금 쇼크를 줄이기 위해, 입금 즉시 분리 적립하는 세금 버킷 운영법과 월간 점검 루틴을 정리했습니다."
    tags = @("경제", "프리랜서", "세금관리")
    section = "경제"
    keywords = "경제,프리랜서,세금적립,현금흐름,종합소득세"
    image = "strategy-plan.jpg"
    topic = "프리랜서 세금 적립"
  },
  [ordered]@{
    title = "결혼 준비 예산 우선순위 프레임 2026"
    slug = "economy-wedding-budget-priority-framework-2026.html"
    summary = "결혼 준비 지출이 불어날 때, 후회 없는 선택을 위해 필수·만족·과시 항목을 구분하는 예산 우선순위 프레임을 정리했습니다."
    tags = @("경제", "결혼준비", "예산관리")
    section = "경제"
    keywords = "경제,결혼준비,예산우선순위,웨딩비용,가계관리"
    image = "strategy-plan.jpg"
    topic = "결혼 준비 예산 우선순위"
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

  $intro = "$topic 이슈는 감정만으로 결정하면 금방 흔들리고, 숫자만으로 보면 사람 마음이 놓칩니다. 30대 여성의 생활 리듬에서 가장 어려운 지점은 일상 피로가 큰 상태에서도 관계와 돈의 균형을 지켜야 한다는 점이에요. 그래서 저는 이 주제를 다룰 때 항상 '오늘 당장 실행 가능한 문장과 순서'를 먼저 봅니다. 머리로 이해하는 정보보다, 실제로 써먹을 수 있는 체크리스트가 훨씬 오래 갑니다. 이 글도 같은 기준으로 구성했어요. 큰 이론보다 작은 실행, 완벽한 답보다 반복 가능한 루틴에 초점을 맞췄습니다. 실전 문장을 바로 복붙해도 어색하지 않도록 생활 톤으로 정리했습니다."
  $p1 = "첫 번째 기준은 사실과 해석을 분리하는 것입니다. 문제가 생길 때 우리는 사실보다 해석을 먼저 붙여서 더 크게 상처받기 쉬워요. 예를 들어 일정 변경, 지출 초과, 답장 지연 같은 사실에 '나를 가볍게 본다'는 해석이 바로 붙으면 대화가 경직됩니다. 실전에서는 사실 한 줄, 감정 한 줄, 요청 한 줄 순서로 말해보세요. 이 구조만 지켜도 갈등 온도가 내려갑니다. 특히 $topic 상황에서는 공격 문장보다 정보 문장이 효과가 큽니다. 말투를 바꾸는 건 상대를 위한 배려이면서 동시에 내 에너지를 지키는 방법입니다."
  $p2 = "두 번째 기준은 시간대를 나누는 것입니다. 바쁜 일정 속에서 모든 문제를 즉시 해결하려고 하면 피로만 커집니다. 그래서 점검 시간과 실행 시간을 분리해 두는 게 좋아요. 예를 들어 평일에는 짧은 확인, 주말에는 깊은 조정처럼 리듬을 만들 수 있습니다. 실전 문장으로는 '지금 결론 내기보다 오늘 밤 9시에 15분만 정리하자'가 유용합니다. $topic 같은 민감한 주제일수록 예고된 대화 시간이 안전장치가 됩니다. 무조건 참거나 즉시 폭발하는 패턴 대신, 예측 가능한 리듬을 만들면 관계와 재정 모두 안정성이 올라갑니다."
  $p3 = "세 번째 기준은 숫자 경계선을 합의하는 것입니다. 연애든 경제든 기준이 없으면 매번 감정에 따라 판단하게 됩니다. 그래서 '어디까지 괜찮고 어디부터 부담인지'를 숫자로 한번 정해두세요. 비용이면 월 상한선, 시간이면 주간 빈도, 연락이면 최소 신호 기준처럼 구체화하면 됩니다. 여기서 중요한 건 통제가 아니라 투명성입니다. 실전에서는 '나는 이 범위를 넘으면 불안이 커져'라고 말하면 상대도 이해하기 쉽습니다. $topic 문제를 줄이는 핵심은 정답을 맞히는 게 아니라, 서로의 한계를 보이게 만드는 데 있습니다."
  $p4 = "네 번째 기준은 예외 상황 규칙입니다. 계획은 평온한 날을 기준으로 짜기 쉬운데, 실제 갈등은 예외 상황에서 터집니다. 갑작스러운 일정 변화, 예상 밖 지출, 컨디션 저하 같은 변수에 대한 대응 문장을 미리 준비해두세요. 예를 들어 '오늘은 상태가 안 좋아서 길게 못 말해. 내일 오전에 다시 이야기하자' 같은 한 줄이 큰 차이를 만듭니다. $topic 상황에서도 예외 규칙이 있으면 불필요한 오해가 줄어듭니다. 관계를 지키는 사람들은 완벽해서가 아니라, 흔들릴 때 돌아올 문장을 갖고 있습니다."
  $p5 = "다섯 번째 기준은 월간 회고입니다. 문제를 겪은 날에만 반응하면 같은 패턴이 반복됩니다. 한 달에 한 번 20분만 투자해 '잘 된 것 1개, 아쉬운 것 1개, 다음 달 수정 1개'를 기록해보세요. 기록이 쌓이면 감정의 기억 대신 데이터로 판단할 수 있습니다. 실전 문장으로는 '이번 달에는 이 방식이 효과 있었고, 다음 달엔 이 부분만 바꿔보자'가 좋습니다. $topic 주제는 단기간 완벽 해결보다, 작은 개선의 누적이 훨씬 현실적입니다. 관계와 돈 모두 결국 운영의 문제라는 점을 기억하면 방향이 명확해집니다."
  $summaryRun = "바로 실행할 3줄 요약입니다. 1) 사실-감정-요청 순서로 말하기. 2) 대화 시간대를 미리 정해 충돌 줄이기. 3) 숫자 경계선과 예외 규칙을 합의하고 월 1회 회고하기. 이 루틴을 반복하면 $topic 관련 갈등이 감정 소모에서 관리 가능한 문제로 바뀝니다. 오늘 한 번의 점검이 다음 한 달의 안정감을 만듭니다."

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
