$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $root "blog\posts"
$indexPath = Join-Path $root "blog\index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$blogSitemapPath = Join-Path $root "blog\sitemap-longform.xml"
$date = "2026-06-30"
$iso = "2026-06-30T10:30:00+09:00"

$items = @(
  [ordered]@{ title="폭염 소개팅 실내 코스 선택 가이드 2026"; slug="romance-heatwave-blind-date-indoor-course-guide-2026.html"; summary="폭염 속 소개팅에서 이동 피로와 비용 부담을 줄이도록 실내 장소, 이동 거리, 만남 시간을 정하는 현실적인 기준입니다."; tags=@("연애","소개팅","폭염데이트"); section="연애"; keywords="연애,소개팅,폭염데이트,실내데이트,데이트장소"; image="date-look-romantic.jpg"; topic="폭염 소개팅 실내 코스"; problem="예쁜 장소만 보고 정하면 짧은 야외 이동도 큰 피로가 되고 첫인상보다 더위가 오래 기억될 수 있습니다"; standard="지하철역에서 도보 7분 이내, 실내 이동 중심, 1인 예산 상한을 함께 확인하는 것"; phrase="날씨가 많이 더우니 역에서 가까운 실내 카페에서 만나고, 괜찮으면 같은 건물에서 식사할까요?"; checklist="역과의 거리, 대기 공간, 예약 가능 여부, 1인 예상 비용, 귀가 동선" },
  [ordered]@{ title="여름휴가 중 연락 빈도 맞추는 대화 가이드 2026"; slug="romance-vacation-texting-frequency-agreement-guide-2026.html"; summary="친구·가족과 떠난 휴가 중 연락 간격 때문에 서운해지지 않도록 출발 전에 빈도와 예외 상황을 맞추는 대화법입니다."; tags=@("연애","여름휴가","연락빈도"); section="연애"; keywords="연애,여름휴가,연락빈도,카톡,커플대화"; image="bff-travel.jpg"; topic="여름휴가 중 연락 빈도"; problem="평소 답장 속도를 그대로 기대하면 일정이 빽빽한 여행지에서 연락이 끊긴 시간을 관계의 온도로 오해하기 쉽습니다"; standard="실시간 보고 대신 아침 일정 공유와 자기 전 안부처럼 서로 지킬 수 있는 최소 연락 지점을 정하는 것"; phrase="여행 중에는 답장이 늦어도 괜찮아. 대신 숙소에 들어가면 짧게 안부만 알려줘."; checklist="여행 일정, 이동 시간, 음주 계획, 숙소 도착 예상, 긴급 연락 방식" },
  [ordered]@{ title="커플 상반기 관계 결산 대화 가이드 2026"; slug="romance-midyear-relationship-review-conversation-guide-2026.html"; summary="상반기 동안 좋았던 점과 반복된 갈등을 평가가 아닌 조정의 언어로 돌아보는 커플 대화 순서입니다."; tags=@("연애","관계점검","커플대화"); section="연애"; keywords="연애,관계점검,커플대화,상반기결산,관계회복"; image="love-midyear-steady.jpg"; topic="커플 상반기 관계 결산"; problem="잘잘못을 따지는 회고가 되면 상대는 평가받는다고 느끼고 다음 반기의 약속까지 방어적으로 받아들일 수 있습니다"; standard="고마웠던 장면 하나, 아쉬웠던 반복 하나, 다음 달에 바꿀 행동 하나만 차례로 말하는 것"; phrase="상반기에 네가 해줘서 좋았던 일부터 말하고, 우리 둘이 하나만 바꿔보면 좋을 것도 이야기하고 싶어."; checklist="좋았던 장면, 반복된 갈등, 각자의 피로 요인, 유지할 습관, 한 달 실험" },
  [ordered]@{ title="사내 연애 휴가철 경계 설정 가이드 2026"; slug="romance-workplace-couple-vacation-boundary-guide-2026.html"; summary="사내 연애 커플이 휴가 일정과 회사 메신저, 동료의 질문 사이에서 관계와 업무의 경계를 지키는 실전 기준입니다."; tags=@("연애","사내연애","경계설정"); section="연애"; keywords="연애,사내연애,여름휴가,회사메신저,관계경계"; image="strategy-plan.jpg"; topic="사내 연애 휴가철 경계"; problem="같은 시기 휴가와 사진 공개가 겹치면 원하지 않은 추측이 생기고 쉬는 동안에도 업무와 관계 대화가 뒤섞일 수 있습니다"; standard="공개 범위, 회사 채널에서의 호칭, 휴가 중 업무 연락 대응을 둘이 먼저 합의하는 것"; phrase="회사에서는 평소처럼 업무 기준으로 대하고, 휴가 사진은 서로 확인한 뒤 공개하자."; checklist="휴가 일정 공개, SNS 공개 범위, 회사 호칭, 업무 인수인계, 긴급 연락" },
  [ordered]@{ title="데이트앱 여름휴가 위치 정보 안전 가이드 2026"; slug="romance-dating-app-vacation-location-safety-guide-2026.html"; summary="여름휴가 중 데이트앱을 사용할 때 실시간 위치와 숙소 정보 노출을 줄이면서 안전하게 약속을 잡는 기준입니다."; tags=@("연애","데이트앱","개인정보"); section="연애"; keywords="연애,데이트앱,여름휴가,위치정보,소개팅안전"; image="first-hello-breeze.jpg"; topic="데이트앱 휴가 위치 정보"; problem="여행의 들뜬 분위기 때문에 숙소, 이동 시간, 혼자 있다는 사실을 너무 빨리 공유하면 불필요한 위험이 커질 수 있습니다"; standard="실시간 위치 대신 넓은 지역만 말하고 첫 약속은 낮 시간의 사람이 많은 공공장소로 잡는 것"; phrase="지금 숙소 위치는 공유하지 않을게요. 내일 오후에 역 근처 큰 카페에서 먼저 만나요."; checklist="프로필 위치, 숙소 노출, 만남 장소, 지인 공유, 귀가 교통편" },
  [ordered]@{ title="7월 생활비 예산 리셋 체크리스트 2026"; slug="economy-july-living-budget-reset-checklist-2026.html"; summary="휴가비와 냉방비가 시작되는 7월에 고정비·생활비·계절비를 다시 나눠 월 예산을 현실적으로 조정하는 방법입니다."; tags=@("경제","7월예산","생활비"); section="경제"; keywords="경제,7월예산,생활비,가계부,여름지출"; image="strategy-plan.jpg"; topic="7월 생활비 예산 리셋"; problem="평소 생활비 안에 휴가비와 냉방비를 섞으면 월 중반에 남은 돈을 잘못 판단하고 카드 결제로 버티기 쉽습니다"; standard="고정비, 평소 생활비, 여름 계절비를 서로 다른 칸으로 나누고 계절비 상한을 먼저 잡는 것"; phrase="7월에는 휴가비와 냉방비를 생활비에서 분리하고, 각각 쓸 수 있는 한도를 먼저 적어두자."; checklist="고정비, 식비, 교통비, 냉방비, 휴가비, 예비비" },
  [ordered]@{ title="여름 세일 충동구매 막는 장바구니 가이드 2026"; slug="economy-summer-sale-cart-control-guide-2026.html"; summary="여름 정기 세일과 타임딜에서 할인율보다 실제 필요와 총지출을 확인해 충동구매를 줄이는 장바구니 규칙입니다."; tags=@("경제","여름세일","충동구매"); section="경제"; keywords="경제,여름세일,충동구매,장바구니,쇼핑절약"; image="lucky-clover.jpg"; topic="여름 세일 장바구니 관리"; problem="마감 시간과 높은 할인율을 먼저 보면 원래 살 계획이 없던 물건도 절약한 소비처럼 느끼기 쉽습니다"; standard="정가 대비 할인액보다 결제 후 통장에서 빠지는 총액과 30일 안의 사용 횟수를 계산하는 것"; phrase="오늘은 장바구니에만 넣고, 내일도 필요한 이유를 세 가지 말할 수 있을 때 결제하자."; checklist="구매 목적, 보유 대체품, 예상 사용 횟수, 배송비, 반품비, 결제 총액" },
  [ordered]@{ title="에어컨 필터 청소 비용 절약 루틴 2026"; slug="economy-air-conditioner-filter-cleaning-saving-routine-2026.html"; summary="에어컨 사용이 늘기 전 필터 상태와 냉방 습관을 점검해 불필요한 전력 사용과 출장비를 줄이는 관리 루틴입니다."; tags=@("경제","에어컨","전기요금"); section="경제"; keywords="경제,에어컨필터,전기요금,냉방비,여름절약"; image="summerbti-river.jpg"; topic="에어컨 필터 청소 비용"; problem="냉방이 약하다고 바로 온도를 더 낮추거나 유료 세척을 부르면 필터 점검만으로 해결할 수 있는 문제에도 비용이 늘 수 있습니다"; standard="제품 설명서의 안전 수칙과 청소 주기를 먼저 확인하고 필터, 실외기 주변, 설정 온도를 차례로 점검하는 것"; phrase="전문 세척을 예약하기 전에 전원을 끄고 설명서에 따라 필터 상태부터 확인하자."; checklist="전원 차단, 설명서, 필터 먼지, 완전 건조, 실외기 통풍, 냉방 변화" },
  [ordered]@{ title="해외여행 카드 결제 환율 수수료 체크 가이드 2026"; slug="economy-overseas-travel-card-exchange-fee-check-guide-2026.html"; summary="해외여행에서 원화 결제와 현지 통화 결제, 카드 수수료를 구분해 예상 밖의 여행비 증가를 줄이는 확인 순서입니다."; tags=@("경제","해외여행","카드수수료"); section="경제"; keywords="경제,해외여행,카드수수료,환율,현지통화결제"; image="lucky-travel.jpg"; topic="해외여행 카드 환율 수수료"; problem="결제 화면의 원화 금액이 익숙해 보여도 해외 원화 결제 과정에서 별도 환전 비용이 붙을 수 있고 카드별 수수료도 다릅니다"; standard="출국 전에 카드사의 해외 이용 수수료와 원화 결제 차단 설정을 확인하고 현지에서는 통화 단위를 다시 보는 것"; phrase="결제 단말기에 원화와 현지 통화가 함께 나오면 수수료 조건을 확인한 뒤 현지 통화를 선택하자."; checklist="카드 수수료, 원화 결제 차단, 현지 통화, 환율 알림, 분실 신고 번호, 예비 카드" },
  [ordered]@{ title="장마철 빨래 건조 전기요금 절약 가이드 2026"; slug="economy-rainy-season-laundry-drying-cost-saving-guide-2026.html"; summary="장마철 건조기와 제습기 사용이 겹칠 때 빨래 양, 사용 시간, 환기 순서를 조정해 전기요금을 관리하는 방법입니다."; tags=@("경제","장마철","전기요금"); section="경제"; keywords="경제,장마철빨래,건조기,제습기,전기요금"; image="summerbti-meadow.jpg"; topic="장마철 빨래 건조 전기요금"; problem="습한 날마다 소량 세탁과 건조를 반복하고 제습기까지 오래 켜두면 편리함에 비해 사용 시간이 크게 늘어날 수 있습니다"; standard="빨래를 적정량 모으고 탈수를 충분히 한 뒤 건조기와 제습기의 역할이 겹치지 않게 한 가지 방식을 먼저 쓰는 것"; phrase="오늘 빨래는 한 번에 모아 추가 탈수하고, 건조기 사용 시간을 기록해 다음 주와 비교하자."; checklist="세탁량, 추가 탈수, 건조 방식, 사용 시간, 필터 청소, 환기 시점" }
)

function Escape-Html { param([string]$Value) [System.Net.WebUtility]::HtmlEncode($Value) }

function Make-PostHtml {
  param($item)
  $title = Escape-Html $item.title
  $summary = Escape-Html $item.summary
  $topic = Escape-Html $item.topic
  $problem = Escape-Html $item.problem
  $standard = Escape-Html $item.standard
  $phrase = Escape-Html $item.phrase
  $checklist = Escape-Html $item.checklist
  $keywords = Escape-Html $item.keywords
  $section = Escape-Html $item.section
  $canonical = "https://partygame.pe.kr/blog/posts/$($item.slug)"
  $ogImage = "https://partygame.pe.kr/brainTest/images/$($item.image)"
  $tagHtml = ($item.tags | ForEach-Object { "          <span class=`"px-3 py-1 rounded-full border border-white/20 text-slate-200`">#$(Escape-Html $_)</span>" }) -join "`r`n"
  return @"
<!DOCTYPE html>
<html lang="ko">
<head>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-T2KDKBN8');</script>
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
  <script async src="https://pagead2.googlesyndication.com/pagead/js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <title>$title | 연애경제 블로그</title>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-50">
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-T2KDKBN8" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  <main class="max-w-4xl mx-auto px-5 sm:px-6 py-10 md:py-12 space-y-8">
    <article class="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-7">
      <header class="space-y-4">
        <div class="flex flex-wrap gap-2 text-sm">$tagHtml</div>
        <h1 class="text-3xl md:text-4xl font-bold leading-tight">$title</h1>
        <p class="text-slate-200 leading-relaxed">$summary</p>
        <p class="text-sm text-slate-400">업데이트: $date</p>
        <img src="/brainTest/images/$($item.image)" alt="$title 대표 이미지" class="w-full rounded-2xl border border-white/10" loading="eager">
      </header>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">지금 이 문제를 따로 봐야 하는 이유</h2><p class="leading-8 text-slate-200">$topic 문제는 한 가지 원인으로만 생기지 않습니다. 날씨와 일정, 체력, 비용이 동시에 움직이는 여름에는 평소 잘 지키던 기준도 쉽게 흐려집니다. $problem. 그래서 불편함이 커진 뒤 해결하려 하기보다 선택하기 전에 작은 기준을 적어두는 편이 현실적입니다. 핵심은 $standard 입니다. 완벽한 계획을 만드는 것이 아니라 지친 날에도 다시 확인할 수 있는 최소선을 만드는 데 목적을 두세요.</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">감정과 사실을 두 줄로 분리하기</h2><p class="leading-8 text-slate-200">먼저 메모에 지금 느끼는 감정과 확인 가능한 사실을 한 줄씩 적어봅니다. “불안하다”는 감정이고 “어제 정한 예산을 4만 원 넘겼다”는 사실입니다. 둘을 섞으면 상대나 나 자신을 탓하기 쉽지만 분리하면 바꿀 행동이 보입니다. 실전에서는 “나는 이 상황이 반복되면 부담을 느껴. 지금 확인된 것은 이것이고, 다음에는 이렇게 맞추고 싶어”라는 순서가 유용합니다. 감정을 숨길 필요는 없지만 감정만으로 결론을 정하지 않는 것이 중요합니다. $topic 역시 사실을 먼저 확인하면 문제의 크기를 과장하지 않고 필요한 부분만 조정할 수 있습니다.</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">숫자로 실행 기준 정하기</h2><p class="leading-8 text-slate-200">좋은 기준은 구체적이고 확인 가능해야 합니다. “적당히”, “자주”, “조심해서”처럼 사람마다 뜻이 다른 말 대신 금액, 횟수, 시간, 거리 중 하나를 붙여보세요. 예를 들어 1인 예산, 하루 연락 지점, 결제 전 대기 시간, 기기 사용 시간을 정하면 매번 처음부터 판단하는 피로가 줄어듭니다. 기준은 가장 의욕적인 날이 아니라 피곤한 평일에도 지킬 수 있는 수준이 적합합니다. 한 번에 세 가지를 바꾸기보다 이번 주에 확인할 숫자 하나만 고르고, 실제로 지켰는지 일주일 뒤 검토하세요. 지키지 못했다면 의지를 탓하기보다 기준이 현실적이었는지부터 조정합니다.</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">바로 써도 되는 실전 문장</h2><div class="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-5"><p class="leading-8 text-indigo-50">“$phrase”</p></div><p class="leading-8 text-slate-200">이 문장은 상황 설명, 원하는 행동, 선택의 여지를 한 번에 담습니다. 명령처럼 들리지 않게 이유를 짧게 붙이되 요청을 흐리지 않는 것이 포인트입니다. 상대가 바로 동의하지 않더라도 여러 문제를 한꺼번에 꺼내지 말고 지금 정한 한 가지 기준만 다뤄보세요. 혼자 결정하는 소비나 생활 관리라면 문장을 메모 앱의 알림 제목으로 바꿔도 좋습니다. 결제나 약속 직전에 짧은 문장을 다시 보는 것만으로도 자동적인 선택을 한 번 멈출 수 있습니다.</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">예외 상황과 중단 기준 만들기</h2><p class="leading-8 text-slate-200">여름 일정에는 폭염, 폭우, 교통 지연, 컨디션 저하처럼 계획 밖의 변수가 많습니다. 예외가 생겼을 때 무조건 원래 계획을 지키는 것은 좋은 관리가 아닙니다. 언제 계획을 바꾸고, 추가 비용은 어디까지 허용하며, 누구에게 언제 알릴지를 미리 정해두세요. 안전이나 개인정보와 관련된 상황이라면 비용이나 분위기보다 중단과 이동을 우선합니다. 반대로 단순히 귀찮아진 상황이라면 10분만 점검한 뒤 결정하는 대기 규칙이 도움이 됩니다. 예외 규칙은 실패를 허용하는 구멍이 아니라, 예상하지 못한 상황에서도 원래 목적을 지키기 위한 장치입니다.</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">오늘 확인할 체크리스트</h2><p class="leading-8 text-slate-200">확인 항목은 $checklist 입니다. 모든 항목을 완벽하게 관리하려 하지 말고 지금 가장 불확실한 것부터 표시하세요. 첫째, 현재 상태를 숫자나 한 문장으로 적습니다. 둘째, 오늘 바꿀 행동을 하나 고릅니다. 셋째, 예외가 생겼을 때 사용할 문장을 저장합니다. 넷째, 일주일 뒤 결과를 확인할 날짜를 캘린더에 넣습니다. 기록은 길 필요가 없습니다. 날짜, 선택, 실제 결과, 다음 수정점 네 칸이면 충분합니다. 이렇게 남긴 기록은 $topic 문제를 감정적인 기억이 아니라 반복 가능한 생활 데이터로 바꿔줍니다.</p></section>
      <section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">일주일 뒤에는 결과보다 기준을 검토하기</h2><p class="leading-8 text-slate-200">일주일 뒤에는 성공과 실패만 세지 말고 기준이 실제 상황에 맞았는지 봅니다. 너무 자주 예외가 생겼다면 계획이 빡빡했을 수 있고, 아무 변화도 없었다면 행동이 모호했을 수 있습니다. 잘된 부분은 그대로 유지하고 불편했던 부분만 한 단계 낮추거나 구체화하세요. 관계에서는 상대의 동의 없이 규칙을 확정하지 않고, 돈 관리에서는 다음 달 현금흐름까지 함께 확인합니다. 작은 기준을 반복해서 다듬는 방식이 큰 결심을 한 번 하는 것보다 오래갑니다. 오늘은 체크리스트의 첫 항목 하나를 확인하는 것으로 시작해도 충분합니다.</p></section>
      <footer class="pt-6 border-t border-white/10"><p class="text-sm leading-6 text-slate-400">본 글은 일반 정보 제공 목적이며 개인의 관계, 재정, 제품 사용 환경에 따라 적용 결과는 달라질 수 있습니다.</p></footer>
    </article>
    <nav class="rounded-2xl border border-white/10 bg-white/5 p-6"><a href="/blog/" class="inline-flex min-h-11 items-center text-indigo-200 hover:text-indigo-100 transition">← 블로그 목록으로 돌아가기</a></nav>
  </main>
</body>
</html>
"@
}

foreach ($item in $items) {
  $postPath = Join-Path $postsDir $item.slug
  if (-not (Test-Path $postPath)) {
    Set-Content -Path $postPath -Value (Make-PostHtml -item $item) -Encoding utf8
  }
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
  Set-Content -Path $indexPath -Value ($indexRaw.TrimEnd() + "`r`n") -Encoding utf8
}

foreach ($relativePath in @("ai-ranking\index.html", "fruit-ranking\index.html", "webtoon-ranking\index.html")) {
  $path = Join-Path $root $relativePath
  $raw = Get-Content -Raw -Path $path
  $raw = $raw -replace '업데이트: 2026-\d{2}-\d{2}', "업데이트: $date"
  if ($relativePath -eq "ai-ranking\index.html") {
    $raw = $raw -replace '2026년 5월 기준 AI 생성 사이트 Top 20', '2026년 6월 기준 AI 생성 사이트 Top 20'
  }
  Set-Content -Path $path -Value ($raw.TrimEnd() + "`r`n") -Encoding utf8
}

$gamePath = Join-Path $root "game-ranking\index.html"
$gameRaw = Get-Content -Raw -Path $gamePath
$gameRaw = $gameRaw -replace '<p class="mt-2 text-2xl font-bold text-white">2026-\d{2}-\d{2}</p>', "<p class=`"mt-2 text-2xl font-bold text-white`">$date</p>"
$gameRaw = $gameRaw -replace '참고:.*?</p>', '참고: 게임트릭스의 2026년 6월 4주차 및 6월 28일 공개 PC방 사용 흐름을 바탕으로 정리한 편집형 Top 20입니다.</p>'
if ($gameRaw -notmatch '"2026-06-30"') {
  $newRanking = 'const rankingByDate = {' + "`r`n" + '      "2026-06-30": ["lol","pubg","fconline","maple","valorant","lineageclassic","overwatch2","lostark","suddenattack","dnf","roblox","starcraft","minecraft","wow","diablo4","apex","gtaonline","ff14","poe2","warframe"],' + "`r`n"
  $gameRaw = $gameRaw -replace 'const rankingByDate = \{\r?\n', $newRanking
}
Set-Content -Path $gamePath -Value ($gameRaw.TrimEnd() + "`r`n") -Encoding utf8

$sitemapRaw = Get-Content -Raw -Path $sitemapPath
foreach ($mainUrl in @("https://partygame.pe.kr/blog/", "https://partygame.pe.kr/ai-ranking/", "https://partygame.pe.kr/game-ranking/", "https://partygame.pe.kr/fruit-ranking/", "https://partygame.pe.kr/webtoon-ranking/")) {
  $escaped = [regex]::Escape($mainUrl)
  $sitemapRaw = [regex]::Replace($sitemapRaw, "(?s)(<loc>$escaped</loc>\s*<lastmod>)([^<]+)(</lastmod>)", { param($m) $m.Groups[1].Value + $iso + $m.Groups[3].Value })
}
$sitemapAdd = @()
foreach ($item in $items) {
  $loc = "https://partygame.pe.kr/blog/posts/$($item.slug)"
  if ($sitemapRaw -notmatch [regex]::Escape($loc)) {
    $sitemapAdd += "  <url>`r`n    <loc>$loc</loc>`r`n    <lastmod>$iso</lastmod>`r`n    <changefreq>weekly</changefreq>`r`n    <priority>0.8</priority>`r`n  </url>"
  }
}
if ($sitemapAdd.Count -gt 0) {
  $sitemapRaw = $sitemapRaw -replace '</urlset>', (($sitemapAdd -join "`r`n") + "`r`n</urlset>")
}
Set-Content -Path $sitemapPath -Value ($sitemapRaw.TrimEnd() + "`r`n") -Encoding utf8

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
    Set-Content -Path $blogSitemapPath -Value ($blogSitemapRaw.TrimEnd() + "`r`n") -Encoding utf8
  }
}

Write-Output "Generated $($items.Count) daily posts for $date."
