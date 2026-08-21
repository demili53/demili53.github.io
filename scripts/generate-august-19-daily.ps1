$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$postsDir = Join-Path $root "blog\posts"
$indexPath = Join-Path $root "blog\index.html"
$sitemapPath = Join-Path $root "sitemap.xml"
$blogSitemapPath = Join-Path $root "blog\sitemap-longform.xml"
$date = "2026-08-19"
$iso = "2026-08-19T10:30:00+09:00"

$items = @(
  [ordered]@{ title="연인과 휴대폰 비밀번호 경계 정하는 법 2026"; slug="romance-phone-password-privacy-boundary-guide-2026.html"; summary="휴대폰 비밀번호 공유를 사랑의 증명으로 만들지 않고 신뢰와 사생활의 경계를 함께 정하는 대화법입니다."; tags=@("연애","사생활","신뢰"); section="연애"; topic="휴대폰 비밀번호와 사생활 경계"; problem="비밀번호를 알려주지 않는 행동을 곧바로 숨기는 일로 해석하거나, 허락 없이 알림과 대화를 확인하면서 신뢰가 더 약해지는 상황"; standard="기기 접근이 필요한 예외와 절대 열어보지 않을 영역을 말로 합의하는 것"; phrase="서로 숨길 것이 없다는 믿음과 각자의 사생활을 지키는 건 함께 가능하다고 생각해. 긴급할 때 필요한 범위부터 정해볼까?"; checklist="공유 목적, 긴급 상황, 사진과 메신저 범위, 알림 노출, 비밀번호 변경, 합의 재확인 날짜" },
  [ordered]@{ title="결혼 시기 압박 없이 미래 계획 묻는 대화 가이드 2026"; slug="romance-marriage-timeline-pressure-conversation-guide-2026.html"; summary="결혼 이야기를 재촉이나 회피로 만들지 않고 각자의 희망 시기와 준비 조건을 구체적으로 확인하는 순서입니다."; tags=@("연애","결혼준비","미래계획"); section="연애"; topic="결혼 시기와 미래 계획"; problem="주변의 결혼 소식과 가족 질문이 많아질수록 상대의 속도를 확인하기 전에 답을 요구하거나 막연히 기다리게 되는 상황"; standard="희망 시기, 필요한 준비, 아직 모르는 부분을 서로 다른 항목으로 나눠 말하는 것"; phrase="당장 날짜를 정하자는 뜻은 아니고, 우리는 결혼을 어떻게 생각하고 어떤 준비가 필요할지 차분히 맞춰보고 싶어."; checklist="결혼 의향, 희망 시기, 주거 계획, 재정 공개 범위, 가족 의견, 다음 대화 날짜" },
  [ordered]@{ title="동거 전 생활 규칙 합의 체크리스트 2026"; slug="romance-before-cohabitation-house-rules-checklist-2026.html"; summary="동거를 시작하기 전에 집안일, 생활비, 혼자 있는 시간과 퇴거 상황까지 현실적으로 합의하는 체크리스트입니다."; tags=@("연애","동거","생활규칙"); section="연애"; topic="동거 전 생활 규칙"; problem="함께 있는 시간이 늘면 자연히 맞을 것이라 기대했다가 수면, 청소, 손님 초대와 비용 문제에서 작은 불만이 반복되는 상황"; standard="사랑의 크기가 아니라 실제 행동과 금액, 담당 주기를 문장으로 남기는 것"; phrase="같이 살면 더 가까워지겠지만 생활 방식은 다를 수 있으니, 비용과 집안일을 시작 전에 표로 맞춰보자."; checklist="보증금과 월세, 공과금, 집안일 주기, 수면 시간, 손님 초대, 반려동물, 종료 시 정산" },
  [ordered]@{ title="연인에게 빚과 대출 말하는 순서 2026"; slug="romance-debt-disclosure-conversation-order-2026.html"; summary="관계가 진지해질 때 빚과 대출을 숨기거나 과장하지 않고 상환 계획과 책임 범위를 설명하는 대화 순서입니다."; tags=@("연애","돈대화","대출"); section="연애"; topic="연인 사이 부채 공개"; problem="부채가 있다는 사실 자체보다 늦게 알게 됐다는 충격과 상대가 대신 책임져야 할지 모른다는 불안이 커지는 상황"; standard="잔액, 금리, 월 상환액, 연체 여부와 상대에게 기대하는 역할을 분리해 공개하는 것"; phrase="우리 관계가 진지해져서 내 재정 상황을 정확히 말하고 싶어. 해결을 맡기려는 게 아니라 현재 숫자와 내 상환 계획을 공유하려고 해."; checklist="부채 종류, 남은 원금, 금리, 월 상환액, 연체 여부, 보증 관계, 상환 목표일" },
  [ordered]@{ title="커플 비상연락망 공유 범위 가이드 2026"; slug="romance-couple-emergency-contact-sharing-guide-2026.html"; summary="여행과 야간 귀가 중 비상 상황에 대비해 위치와 가족 연락처를 과도한 감시 없이 공유하는 기준입니다."; tags=@("연애","비상연락","안전"); section="연애"; topic="커플 비상연락망"; problem="안전을 이유로 실시간 위치를 늘 요구하거나 반대로 꼭 필요한 연락처도 몰라 긴급 상황에서 대응이 늦어지는 상황"; standard="평상시 확인과 비상시 접근을 구분하고 위치 공유가 자동으로 끝나는 시간을 정하는 것"; phrase="평소 이동을 확인하려는 건 아니고, 늦은 귀가나 여행 때만 쓸 비상 연락 방식과 종료 시간을 정해두고 싶어."; checklist="긴급 연락 기준, 가족 또는 지인 한 명, 위치 공유 시작과 종료, 복용 정보, 귀가 확인 문장, 정보 삭제" },
  [ordered]@{ title="여름휴가 후 카드값 회복 플랜 2026"; slug="economy-post-vacation-card-bill-recovery-plan-2026.html"; summary="휴가 뒤 늘어난 카드 청구액을 확인하고 생활비를 무리하게 줄이지 않으면서 4주 안에 현금흐름을 되돌리는 방법입니다."; tags=@("경제","카드값","휴가비"); section="경제"; topic="휴가 후 카드값 회복"; problem="여행 결제가 여러 카드와 할부에 흩어져 총액을 늦게 알고, 다음 달 생활비까지 카드로 메우는 상황"; standard="확정 청구액과 아직 반영되지 않은 금액을 합친 뒤 4주 단위로 조정하는 것"; phrase="이번 주에는 무조건 아끼기보다 휴가 관련 미청구액까지 합쳐서 다음 결제일 전 필요한 현금을 먼저 계산하자."; checklist="카드별 결제일, 미청구 금액, 할부 잔액, 고정비, 4주 생활비, 취소 환급, 예비비" },
  [ordered]@{ title="추석 교통비와 선물비 사전 예산표 2026"; slug="economy-chuseok-travel-gift-prebudget-guide-2026.html"; summary="추석 이동비, 선물, 식비와 가족 용돈이 한꺼번에 몰리지 않도록 항목별 상한을 미리 정하는 예산표입니다."; tags=@("경제","추석예산","명절비"); section="경제"; topic="추석 교통비와 선물비"; problem="예매와 선물 주문 시점이 달라 지출을 따로 인식하고 명절 직전에 용돈과 식비가 추가되는 상황"; standard="확정 지출, 선택 지출, 현장 예비비를 나누고 총액 상한을 먼저 정하는 것"; phrase="선물부터 고르기 전에 교통비와 용돈을 포함한 명절 전체 한도를 먼저 적고, 남는 범위에서 품목을 정하자."; checklist="왕복 교통비, 취소 수수료, 선물 대상, 가족 용돈, 식비, 배송비, 현장 예비비" },
  [ordered]@{ title="가을 결혼식 축의금 일정 관리 가이드 2026"; slug="economy-autumn-wedding-gift-budget-calendar-2026.html"; summary="가을 결혼식 일정이 겹칠 때 축의금과 교통·의상 비용을 월 예산 안에서 관리하는 현실적인 기준입니다."; tags=@("경제","축의금","가을결혼식"); section="경제"; topic="가을 결혼식 축의금 예산"; problem="청첩장을 받을 때마다 축의금만 생각하고 교통, 숙박, 식사, 의상 관리 비용을 뒤늦게 더하는 상황"; standard="참석 여부를 먼저 정하고 관계 기준과 월간 경조사비 상한을 함께 적용하는 것"; phrase="이번 가을 경조사 일정을 달력에 모두 넣고, 축의금뿐 아니라 이동비까지 합친 총액으로 참석 계획을 정하자."; checklist="예식 날짜, 참석 여부, 관계 기준, 축의금, 교통과 숙박, 의상 비용, 월 상한" },
  [ordered]@{ title="온라인 티켓 중고거래 사기 예방 체크리스트 2026"; slug="economy-online-ticket-resale-scam-prevention-checklist-2026.html"; summary="공연과 스포츠 티켓을 개인 거래할 때 조급한 송금을 피하고 예매 정보와 거래 방식을 확인하는 안전 체크리스트입니다."; tags=@("경제","중고거래","티켓사기"); section="경제"; topic="온라인 티켓 개인 거래"; problem="매진과 임박한 일정 때문에 신분 확인, 예매 내역, 취소 가능 여부를 검토하지 않고 계좌로 먼저 보내는 상황"; standard="플랫폼 보호 절차를 우선하고 확인할 수 없는 정보가 하나라도 있으면 결제를 멈추는 것"; phrase="좌석을 놓칠까 조급해도 보호 결제와 예매 내역 확인이 안 되면 송금하지 않고 공식 취소표를 다시 확인하자."; checklist="공식 판매처, 예매자명, 좌석 정보, 양도 가능 조건, 보호 결제, 계좌 신고 이력, 환불 방식" },
  [ordered]@{ title="9월 생활비 선반영 예산 리셋 2026"; slug="economy-september-living-cost-prebudget-reset-2026.html"; summary="명절과 환절기 지출이 시작되기 전 9월 고정비·생활비·계절비를 미리 나눠 보는 월간 예산 리셋입니다."; tags=@("경제","9월예산","생활비"); section="경제"; topic="9월 생활비 선반영"; problem="8월 휴가비가 아직 청구되는 동안 명절, 가을 의류, 건강검진과 모임 비용이 같은 생활비 통장에서 빠지는 상황"; standard="다음 달 확정 일정을 먼저 달력에 넣고 평소 생활비와 계절성 지출을 별도 칸으로 나누는 것"; phrase="9월이 시작된 뒤 줄이기보다 지금 확정된 일정과 결제일을 적고, 계절비 한도를 별도로 빼두자."; checklist="급여일, 카드 결제일, 명절비, 환절기 의류, 모임, 정기 구독, 비상금" }
)

function E([string]$value) { [System.Net.WebUtility]::HtmlEncode($value) }
function Write-Utf8([string]$path, [string]$value) {
  [System.IO.File]::WriteAllText($path, $value, [System.Text.UTF8Encoding]::new($false))
}

function New-PostHtml($item) {
  $title = E $item.title; $summary = E $item.summary; $topic = E $item.topic
  $problem = E $item.problem; $standard = E $item.standard; $phrase = E $item.phrase
  $checklist = E $item.checklist; $section = E $item.section
  $canonical = "https://partygame.pe.kr/blog/posts/$($item.slug)"
  $tagHtml = ($item.tags | ForEach-Object { "<span class=`"px-3 py-1 rounded-full border border-white/20 text-slate-200`">#$(E $_)</span>" }) -join ""
  @"
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="$summary">
<meta name="robots" content="index, follow">
<link rel="canonical" href="$canonical">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<meta property="og:type" content="article">
<meta property="og:title" content="$title | 연애경제 블로그">
<meta property="og:description" content="$summary">
<meta property="og:url" content="$canonical">
<meta property="og:image" content="https://partygame.pe.kr/site-share.png">
<meta property="article:section" content="$section">
<meta property="article:published_time" content="$iso">
<meta name="google-adsense-account" content="ca-pub-1087435977438565">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1087435977438565" crossorigin="anonymous"></script>
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="/styles/site-theme.css">
<title>$title | 연애경제 블로그</title>
</head>
<body class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-50">
<main class="max-w-4xl mx-auto px-5 sm:px-6 py-10 md:py-12 space-y-8">
<article class="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8 space-y-7">
<header class="space-y-4"><div class="flex flex-wrap gap-2 text-sm">$tagHtml</div><h1 class="text-3xl md:text-4xl font-bold leading-tight">$title</h1><p class="text-slate-200 leading-relaxed">$summary</p><p class="text-sm text-slate-400">업데이트: $date</p><img src="/site-share.png" alt="$title 대표 이미지" class="w-full rounded-2xl border border-white/10" loading="eager"></header>
<section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">지금 이 문제를 따로 봐야 하는 이유</h2><p class="leading-8 text-slate-200">$topic 문제는 어느 날 갑자기 생기기보다 말하지 않은 기대가 여러 번 어긋날 때 커집니다. 특히 30대의 일상에서는 관계, 일정, 체력과 돈이 동시에 움직여 한 부분의 불편이 다른 영역으로 번지기 쉬워요. 대표적인 장면은 $problem 입니다. 이럴 때 상대나 자신의 성격부터 평가하면 대화가 방어적으로 흐릅니다. 먼저 확인할 수 있는 사실과 바꾸고 싶은 행동을 한 줄씩 나눠 적어보세요. 이번 글의 기준은 $standard 입니다. 완벽한 답을 한 번에 찾기보다 다음 선택에서 다시 사용할 수 있는 작은 기준을 남기는 것이 목표입니다.</p></section>
<section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">감정과 사실을 두 줄로 분리하기</h2><p class="leading-8 text-slate-200">메모 첫 줄에는 지금 느끼는 감정을, 둘째 줄에는 날짜와 금액처럼 확인 가능한 사실을 씁니다. “불안하다”는 감정이고 “지난 두 번의 약속에서 합의한 시간이 바뀌었다”는 사실입니다. 둘을 섞지 않으면 불편함을 무시하지 않으면서도 과장된 결론을 피할 수 있어요. 그다음 “나는 이 상황에서 이런 부담을 느꼈고, 다음에는 이 행동을 함께 정하고 싶다”는 순서로 말합니다. 상대의 의도를 추측하거나 과거의 모든 사례를 꺼내기보다 가장 최근 장면 하나만 다루세요. $topic 역시 사실의 범위를 좁히면 누가 옳은지를 다투는 대신 무엇을 조정할지 찾기 쉬워집니다.</p></section>
<section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">바로 써도 되는 실전 문장</h2><div class="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-5"><p class="leading-8 text-indigo-50">“$phrase”</p></div><p class="leading-8 text-slate-200">좋은 요청은 상황, 이유, 원하는 행동이 짧게 들어가고 상대가 의견을 말할 자리를 남깁니다. “항상”, “절대”, “원래”처럼 상대 전체를 규정하는 단어는 빼고 이번에 확인할 항목 하나만 붙이세요. 대화 시간이 길어질 것 같다면 시작 전에 20분만 이야기하고 결론이 나지 않은 항목은 다음 날짜에 이어가기로 합의하는 것도 좋습니다. 혼자 관리하는 돈 문제라면 이 문장을 메모 앱이나 결제 알림 제목으로 바꿔보세요. 행동 직전에 짧은 기준을 다시 읽는 것만으로 자동적인 선택을 멈출 틈이 생깁니다.</p></section>
<section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">숫자와 행동으로 기준 만들기</h2><p class="leading-8 text-slate-200">“적당히”, “자주”, “알아서” 같은 말은 사람마다 뜻이 달라 실행 단계에서 다시 흔들립니다. 금액, 횟수, 시간, 담당자, 확인 날짜 중 최소 하나를 붙이세요. 기준은 가장 여유로운 날이 아니라 피곤한 평일에도 지킬 수 있는 수준이어야 합니다. 처음부터 모든 항목을 고정하지 말고 이번 주에 실험할 행동 하나를 정한 뒤 실제 결과를 기록합니다. 지키지 못했다면 의지 부족으로 결론 내리지 말고 시간과 비용이 현실적이었는지 확인하세요. $standard 이라는 원칙도 생활에 맞춰 조정할 때 오래갑니다. 합의는 통제 장치가 아니라 같은 문제를 매번 처음부터 설명하지 않도록 돕는 공용 메모에 가깝습니다.</p></section>
<section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">예외와 중단 기준 정하기</h2><p class="leading-8 text-slate-200">계획에는 예외가 필요합니다. 안전, 건강, 개인정보, 큰 금액이 걸린 상황에서는 분위기나 매몰비용보다 중단과 재확인을 먼저 선택하세요. 반대로 단순히 귀찮거나 조급해진 상황이라면 10분 또는 하루의 대기 시간을 두고 다시 봅니다. 누가 언제 알려야 하는지, 추가 비용은 어디까지 허용할지, 합의가 지켜지지 않았을 때 어떤 단계로 돌아갈지도 미리 적어두면 좋아요. 예외 규칙은 약속을 빠져나가기 위한 구멍이 아니라 예상하지 못한 상황에서도 원래 목적을 지키는 안전장치입니다. 상대의 동의가 필요한 일은 혼자 확정하지 않고, 금융이나 계약 조건은 해당 기관의 최신 안내를 다시 확인하세요.</p></section>
<section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">오늘 확인할 체크리스트</h2><p class="leading-8 text-slate-200">확인 항목은 $checklist 입니다. 전부 완벽하게 채우려고 하지 말고 가장 불확실한 것부터 표시하세요. 첫째, 현재 상태를 숫자나 한 문장으로 적습니다. 둘째, 오늘 바꿀 행동 한 가지를 고릅니다. 셋째, 예외 상황에서 사용할 연락 문장을 저장합니다. 넷째, 일주일 뒤 결과를 확인할 날짜를 캘린더에 넣습니다. 기록은 날짜, 선택, 실제 결과, 다음 수정점 네 칸이면 충분합니다. 기억만으로 판단하면 가장 불편했던 장면이 크게 남지만 간단한 기록이 있으면 반복 빈도와 실제 부담을 구분할 수 있어요. 이 과정은 자신이나 상대를 감시하기 위한 것이 아니라 다음 결정을 덜 피곤하게 만드는 작업입니다.</p></section>
<section class="space-y-4"><h2 class="text-2xl font-semibold text-indigo-200">일주일 뒤 기준을 검토하는 법</h2><p class="leading-8 text-slate-200">일주일 뒤에는 성공과 실패만 세지 말고 기준이 실제 생활에 맞았는지 봅니다. 예외가 너무 자주 생겼다면 계획이 빡빡했을 수 있고, 변화가 전혀 없었다면 행동 문장이 모호했을 수 있어요. 잘된 부분은 그대로 두고 불편했던 부분만 한 단계 낮추거나 더 구체화하세요. 관계에서는 상대의 동의와 감정을 다시 확인하고, 돈 문제에서는 다음 결제일과 현금흐름까지 함께 봅니다. 한 번의 대화나 절약으로 모든 문제가 끝난다고 기대하지 않는 편이 오히려 꾸준합니다. 오늘은 체크리스트의 첫 항목 하나를 확인하고, 다음 검토 날짜를 정하는 것만으로 시작해도 충분합니다.</p></section>
<footer class="pt-6 border-t border-white/10"><p class="text-sm leading-6 text-slate-400">본 글은 일반 정보 제공 목적이며 개인의 관계, 재정, 계약 및 생활 환경에 따라 적용 결과가 달라질 수 있습니다.</p></footer>
</article><nav class="rounded-2xl border border-white/10 bg-white/5 p-6"><a href="/blog/" class="inline-flex min-h-11 items-center text-indigo-200 hover:text-indigo-100 transition">← 블로그 목록으로 돌아가기</a></nav>
</main></body></html>
"@
}

foreach ($item in $items) {
  $postPath = Join-Path $postsDir $item.slug
  if (Test-Path $postPath) { throw "Post already exists: $($item.slug)" }
  Write-Utf8 $postPath ((New-PostHtml $item).TrimEnd() + "`r`n")
}

$indexRaw = Get-Content -Raw -Encoding UTF8 $indexPath
$entries = foreach ($item in $items) {
  [ordered]@{ title=$item.title; path="/blog/posts/$($item.slug)"; summary=$item.summary; tags=$item.tags } | ConvertTo-Json -Depth 3
}
$indexRaw = $indexRaw -replace '(const posts = \[\r?\n)', ('$1' + (($entries -join ",`r`n") + ",`r`n"))
Write-Utf8 $indexPath ($indexRaw.TrimEnd() + "`r`n")

foreach ($relativePath in @("ai-ranking\index.html", "webtoon-ranking\index.html")) {
  $path = Join-Path $root $relativePath
  $raw = Get-Content -Raw -Encoding UTF8 $path
  $raw = $raw -replace '업데이트: 2026-\d{2}-\d{2}', "업데이트: $date"
  $raw = $raw -replace '2026년 6월 기준 AI 생성 사이트 Top 20', '2026년 8월 기준 AI 생성 사이트 Top 20'
  if ($relativePath -eq "ai-ranking\index.html") {
    $aiPair = '{ name: "Google Gemini", url: "https://gemini.google.com", desc: "구글 서비스 연동과 멀티모달 작업, 깊이 있는 리서치 흐름을 함께 쓰기 좋은 범용 AI입니다." },' + "`r`n" + '      { name: "Claude", url: "https://claude.ai", desc: "긴 문서 해석과 자연스러운 장문 작성, 복잡한 업무 추론에서 강점이 큰 AI입니다." },'
    $raw = $raw -replace '(?s)\{ name: "Claude".*?\},\r?\n      \{ name: "Google Gemini".*?\},', $aiPair
  }
  Write-Utf8 $path ($raw.TrimEnd() + "`r`n")
}

$gamePath = Join-Path $root "game-ranking\index.html"
$gameRaw = Get-Content -Raw -Encoding UTF8 $gamePath
$gameRaw = $gameRaw -replace '<p class="mt-2 text-2xl font-bold text-white">2026-\d{2}-\d{2}</p>', '<p class="mt-2 text-2xl font-bold text-white">2026-08-18</p>'
$gameRaw = $gameRaw -replace '참고:.*?</p>', '참고: 게임트릭스가 공개한 2026년 8월 18일 PC방 사용 순위를 바탕으로 상위 10위를 반영하고, 11~20위는 최근 흐름을 참고해 정리한 편집형 목록입니다.</p>'
$newGameRanking = 'const rankingByDate = {' + "`r`n" + '      "2026-08-18": ["lol","pubg","valorant","fconline","lineageclassic","suddenattack","overwatch2","maple","roblox","lostark","dnf","starcraft","minecraft","wow","diablo4","apex","gtaonline","ff14","poe2","warframe"],' + "`r`n"
$gameRaw = $gameRaw -replace 'const rankingByDate = \{\r?\n', $newGameRanking
Write-Utf8 $gamePath ($gameRaw.TrimEnd() + "`r`n")

function Update-Sitemap($path, $priority) {
  $raw = Get-Content -Raw -Encoding UTF8 $path
  foreach ($mainUrl in @("https://partygame.pe.kr/blog/", "https://partygame.pe.kr/ai-ranking/", "https://partygame.pe.kr/game-ranking/", "https://partygame.pe.kr/webtoon-ranking/")) {
    $escaped = [regex]::Escape($mainUrl)
    $raw = [regex]::Replace($raw, "(?s)(<loc>$escaped</loc>\s*<lastmod>)([^<]+)(</lastmod>)", { param($m) $m.Groups[1].Value + $iso + $m.Groups[3].Value })
  }
  $add = foreach ($item in $items) {
    $loc = "https://partygame.pe.kr/blog/posts/$($item.slug)"
    if ($raw -notmatch [regex]::Escape($loc)) { "  <url>`r`n    <loc>$loc</loc>`r`n    <lastmod>$iso</lastmod>`r`n    <changefreq>weekly</changefreq>`r`n    <priority>$priority</priority>`r`n  </url>" }
  }
  if ($add) { $raw = $raw -replace '</urlset>', (($add -join "`r`n") + "`r`n</urlset>") }
  Write-Utf8 $path ($raw.TrimEnd() + "`r`n")
}

Update-Sitemap $sitemapPath "0.8"
if (Test-Path $blogSitemapPath) { Update-Sitemap $blogSitemapPath "0.9" }
Write-Output "Generated $($items.Count) daily posts and refreshed ranking pages for $date."
