// Tarot reading page: read the worry text, shuffle, pick face-down cards, flip, and build a tailored reading.
(() => {
  const BASE = '/assets/tarot/';
  const R = window.TAROT_READINGS || {};
  const FIELD = { p: 0, rev: 1, advice: 2, feel: 3, love: 4, money: 5, work: 6, study: 7, health: 8, people: 9 };

  // ---------- Worry analysis ----------
  const TOPICS = [
    { id: 'crush', label: '짝사랑 · 썸', domain: 'love', goal: '마음이 이어질', words: ['짝사랑', '썸', '고백', '좋아하는 사람', '좋아하는 애', '호감', '소개팅', '관심 있는', '첫눈', '설레는 사람', '그 사람', '그사람', '걔'], tips: ['부담 없는 대화와 작은 관심 표현부터 시작해 보세요.', '상대의 반응을 너무 하나하나 해석하지 말고, 자연스럽게 함께하는 시간을 늘려 보세요.'] },
    { id: 'couple', label: '연인 관계', domain: 'love', goal: '관계가 더 좋아질', words: ['남자친구', '여자친구', '남친', '여친', '애인', '연인', '사귀', '연애', '권태', '데이트', '커플'], tips: ['서운한 점은 쌓아 두지 말고 차분한 말투로 나누세요.', '둘만의 새로운 경험을 하나 만들어 보면 관계에 활력이 생깁니다.'] },
    { id: 'reunion', label: '재회 · 이별', domain: 'love', goal: '다시 만날', words: ['재회', '헤어진', '헤어졌', '헤어지', '전남친', '전여친', '전 남친', '전 여친', '이별', '다시 만', '연락이 끊', '연락 끊', '차였', '돌아올', '잊을 수', '못 잊'], tips: ['연락하기 전에 헤어진 이유가 정말 달라졌는지 먼저 돌아보세요.', '재회든 정리든, 지금은 나를 회복하는 시간이 먼저입니다.'] },
    { id: 'marriage', label: '결혼', domain: 'love', goal: '결혼이 순조롭게 이루어질', words: ['결혼', '혼인', '상견례', '배우자', '남편', '아내', '신혼', '예비', '프러포즈', '청혼', '이혼'], tips: ['돈, 집, 가족 문제처럼 현실적인 이야기를 미루지 말고 함께 정리하세요.', '서로의 가족과 생활 방식을 이해하는 대화가 필요합니다.'] },
    { id: 'money', label: '금전 · 재물', domain: 'money', goal: '금전 상황이 나아질', words: ['돈', '금전', '재물', '재정', '빚', '대출', '월급', '수입', '지출', '용돈', '저축', '생활비', '카드값', '적금', '부자', '금전운', '재물운'], tips: ['이번 달 지출부터 적어 보면 새는 돈이 보입니다.', '큰돈이 오가는 결정은 하루 이틀 미루고 다시 계산해 보세요.'] },
    { id: 'invest', label: '투자', domain: 'money', goal: '투자에서 이익을 볼', words: ['투자', '주식', '코인', '비트코인', '부동산', '청약', '펀드', '매수', '매도', '집값', '아파트'], tips: ['잃어도 생활에 지장이 없는 금액 안에서만 움직이세요.', '남의 말보다 직접 확인한 정보로 판단하세요. 타로는 투자 조언이 아닙니다.'] },
    { id: 'work', label: '직장 · 일', domain: 'work', goal: '일이 잘 풀릴', words: ['회사', '직장', '상사', '팀장', '부장', '업무', '승진', '연봉', '퇴사', '야근', '프로젝트', '출근', '일이', '일을', '사표', '평가'], tips: ['우선순위를 세 가지로 줄이고 하나씩 끝내 보세요.', '혼자 해결하려 하지 말고 믿을 만한 동료와 상의하세요.'] },
    { id: 'job', label: '취업 · 이직', domain: 'work', goal: '원하는 곳에 들어갈', words: ['취업', '이직', '면접', '구직', '입사', '채용', '서류', '알바', '아르바이트', '취준', '이력서', '자소서', '공채', '붙을', '합격'], tips: ['지원서를 한 번 더 다듬고, 지원하는 곳마다 맞춤으로 고쳐 보세요.', '면접에서는 내가 해 온 일을 구체적인 경험으로 말하세요.'] },
    { id: 'business', label: '사업 · 장사', domain: 'work', goal: '사업이 잘될', words: ['사업', '창업', '가게', '장사', '매출', '손님', '거래처', '쇼핑몰', '스마트스토어', '개업', '폐업', '고객', '동업'], tips: ['숫자로 확인하세요. 매출과 비용을 매주 점검하면 흐름이 보입니다.', '고객이 왜 오는지, 왜 떠나는지를 직접 물어보세요.'] },
    { id: 'study', label: '학업 · 시험', domain: 'study', goal: '원하는 결과를 얻을', words: ['시험', '공부', '성적', '수능', '학교', '대학', '입시', '자격증', '공무원', '학점', '토익', '고시', '수험', '재수', '편입', '유학', '논문', '졸업'], tips: ['하루 공부량을 작게 정하고 매일 지키는 것부터 시작하세요.', '틀린 문제를 다시 보는 시간이 새 문제를 푸는 시간보다 중요합니다.'] },
    { id: 'health', label: '건강', domain: 'health', goal: '건강이 회복될', words: ['건강', '아프', '아파', '병원', '수술', '다이어트', '살 빼', '살빼', '체중', '운동', '불면', '잠을', '몸이', '통증', '치료', '회복', '컨디션'], tips: ['잠, 식사, 가벼운 움직임 세 가지만 먼저 챙기세요.', '불편한 증상이 계속되면 타로보다 병원 진료가 먼저입니다.'] },
    { id: 'people', label: '인간관계', domain: 'people', goal: '관계가 좋아질', words: ['친구', '사람들', '인간관계', '동료', '모임', '싸웠', '싸움', '오해', '절교', '무시', '뒷담', '왕따', '단톡', '선배', '후배', '눈치'], tips: ['하고 싶은 말은 상대를 탓하지 않고 내 감정 중심으로 전해 보세요.', '모든 사람과 잘 지낼 필요는 없습니다. 나를 아껴 주는 사람에게 집중하세요.'] },
    { id: 'family', label: '가족', domain: 'people', goal: '가족 문제가 풀릴', words: ['가족', '부모', '엄마', '아빠', '어머니', '아버지', '형제', '자매', '동생', '언니', '오빠', '누나', '자식', '아들', '딸', '시댁', '처가', '시어머니', '육아'], tips: ['가족일수록 말하지 않으면 모릅니다. 짧게라도 마음을 전해 보세요.', '모든 것을 내가 책임지려 하지 말고 할 수 있는 만큼만 하세요.'] },
    { id: 'move', label: '이사 · 여행 · 변화', domain: 'general', goal: '계획대로 옮겨 갈', words: ['이사', '여행', '해외', '이민', '워홀', '독립', '자취', '이동', '새 집', '전세', '월세'], tips: ['일정과 비용을 표로 정리하면 막연한 걱정이 줄어듭니다.', '떠나기 전에 정리할 것과 가져갈 것을 나눠 보세요.'] },
    { id: 'general', label: '전체 운세', domain: 'general', goal: '바라는 일이 이루어질', words: ['운세', '올해', '이번 달', '이번달', '요즘', '오늘', '전체'], tips: ['오늘 할 수 있는 작은 일 하나를 정해 바로 해 보세요.', '지금 마음을 무겁게 하는 일을 종이에 적어 보면 생각이 정리됩니다.'] }
  ];
  const QTYPES = [
    { id: 'choice', label: '어느 쪽을 고를까', spread: 'choice', words: ['아니면', ' vs', 'vs ', '또는', '중에', '중 어느', '중에서', '어느 쪽', '어디로', '어떤 걸', '어떤걸', '할까 말까', '할지 말지', '말아야', '선택'] },
    { id: 'timing', label: '언제쯤일까', spread: 'time', words: ['언제', '시기', '몇 월', '몇월', '얼마나 걸', '언제쯤', '때가'] },
    { id: 'feeling', label: '상대의 마음', spread: 'relation', words: ['속마음', '마음이 있', '마음은', '마음을', '나를 어떻게', '날 어떻게', '좋아할까', '좋아하는지', '관심 있을까', '관심이 있', '생각하고 있', '감정', '나를 좋아', '날 좋아'] },
    { id: 'how', label: '어떻게 하면 좋을까', spread: 'advice', words: ['어떻게 하면', '어떻게 해야', '어떡하', '어떻게 할까', '방법', '뭘 해야', '무엇을 해야', '해야 할까', '조언'] },
    { id: 'outlook', label: '앞으로의 흐름', spread: 'time', words: ['어떻게 될', '앞으로', '미래', '전망', '흐름', '결과'] },
    { id: 'possible', label: '이루어질까', spread: 'one', words: ['될까', '될지', '있을까', '할 수 있', '가능', '붙을까', '합격할', '성공할', '이루어', '돌아올까', '잘될까', '잘 될까', '괜찮을까', '맞을까', '올까', '줄까', '생길까', '풀릴까', '나아질까'] },
    { id: 'general', label: '전체적인 흐름', spread: 'advice', words: [] }
  ];
  const EMOTIONS = [
    { id: 'anxious', words: ['불안', '걱정', '무서', '두려', '초조', '떨려', '조마조마'], lines: ['불안한 마음이 글에서 느껴집니다. 걱정은 실제보다 크게 보이기 마련이니, 카드를 차분히 함께 보겠습니다.', '걱정이 많으셨겠어요. 불안은 아직 정해지지 않았다는 뜻이기도 합니다.'] },
    { id: 'tired', words: ['지쳐', '지친', '힘들', '힘든', '피곤', '버거', '번아웃', '지침', '포기하고'], lines: ['많이 지치셨다는 게 느껴집니다. 지금까지 버텨 온 것만으로도 충분히 애쓰셨어요.', '힘든 시간을 지나고 계시네요. 카드가 숨 돌릴 길을 함께 찾아 줄 거예요.'] },
    { id: 'sad', words: ['슬프', '우울', '눈물', '외로', '울었', '공허', '허전'], lines: ['마음이 많이 아프셨겠어요. 슬픔을 억지로 밀어내지 않아도 괜찮습니다.', '외롭고 허전한 마음이 전해집니다. 카드를 통해 마음을 조금 정리해 보세요.'] },
    { id: 'angry', words: ['화가', '화나', '억울', '짜증', '서운', '열받', '배신'], lines: ['서운하고 억울한 마음이 크시군요. 그 감정은 충분히 이해받아야 할 마음입니다.', '화가 나는 상황이었겠어요. 감정을 인정한 뒤에 다음 걸음을 보겠습니다.'] },
    { id: 'hopeful', words: ['설레', '기대', '행복', '좋아서', '신나', '두근'], lines: ['설레는 마음이 글에 담겨 있네요. 그 기대가 어디로 이어질지 보겠습니다.', '기대하는 마음이 느껴집니다. 좋은 흐름을 잘 붙잡을 방법을 찾아보세요.'] }
  ];
  const SPREADS = {
    one: { label: '한 장 답', positions: [{ name: '답', lead: '이 질문에 대한 카드의 답은' }] },
    time: { label: '과거 · 현재 · 미래', positions: [
      { name: '과거', lead: '지금의 고민을 만든 지난 흐름은' },
      { name: '현재', lead: '지금 가장 크게 작용하는 기운은' },
      { name: '미래', lead: '이대로 흘러갈 때 다가올 모습은' }] },
    advice: { label: '상황 · 조언 · 결과', positions: [
      { name: '상황', lead: '지금 처한 상황의 핵심은' },
      { name: '조언', lead: '카드가 건네는 조언은', use: 'advice' },
      { name: '결과', lead: '조언을 따를 때 기대할 수 있는 결과는' }] },
    choice: { label: '두 갈래 선택', positions: [
      { name: '선택 A', lead: '첫 번째 선택을 했을 때의 흐름은' },
      { name: '선택 B', lead: '두 번째 선택을 했을 때의 흐름은' },
      { name: '조언', lead: '선택을 앞둔 당신에게 필요한 태도는', use: 'advice' }] },
    relation: { label: '나 · 상대 · 관계', positions: [
      { name: '나의 마음', lead: '지금 당신의 마음 상태는' },
      { name: '상대의 마음', lead: '상대의 속마음을 보여 주는 카드는', use: 'feel' },
      { name: '관계의 앞날', lead: '두 사람 관계의 앞날은' }] }
  };
  const SUITS = {
    wands: { ko: '완드', theme: '열정과 일, 추진력', time: '며칠에서 몇 주 안에 빠르게' },
    cups: { ko: '컵', theme: '감정과 관계, 마음', time: '한두 달 안에 마음이 움직이는 일과 함께' },
    swords: { ko: '소드', theme: '생각과 갈등, 결단', time: '몇 주 안에, 결정을 내리는 순간에' },
    pentacles: { ko: '펜타클', theme: '돈과 현실, 안정', time: '몇 달에 걸쳐 천천히' }
  };

  // Korean particle choice: josa('펜타클 6', '은', '는') -> '은'
  function josa(word, withBatchim, without) {
    const ch = String(word).trim().slice(-1);
    const code = ch.charCodeAt(0);
    let has;
    if (code >= 0xac00 && code <= 0xd7a3) has = (code - 0xac00) % 28 !== 0;
    else if (/[0-9]/.test(ch)) has = '013678'.includes(ch);
    else has = false;
    return has ? withBatchim : without;
  }
  const norm = s => ' ' + s.toLowerCase().replace(/\s+/g, ' ') + ' ';
  const countHits = (text, words) => words.reduce((n, w) => n + (text.includes(w.toLowerCase()) ? 1 + (w.length > 2 ? 0.5 : 0) : 0), 0);

  function analyze(raw) {
    const text = norm(raw || '');
    let topic = TOPICS[TOPICS.length - 1], best = 0;
    for (const t of TOPICS) { const n = countHits(text, t.words); if (n > best) { best = n; topic = t; } }
    let qtype = QTYPES[QTYPES.length - 1];
    for (const q of QTYPES) { if (q.words.length && countHits(text, q.words) > 0) { qtype = q; break; } }
    if (qtype.id === 'general' && /까요|까\?|까 /.test(text)) qtype = QTYPES.find(q => q.id === 'possible');
    // A love worry that asks about the other person reads best as a relation spread.
    if (qtype.id === 'general' && topic.domain === 'love' && /(그 사람|상대|걔|그 애|그분)/.test(text)) qtype = QTYPES.find(q => q.id === 'feeling');
    let emotion = null, eBest = 0;
    for (const e of EMOTIONS) { const n = countHits(text, e.words); if (n > eBest) { eBest = n; emotion = e; } }
    const choices = parseChoices(raw || '');
    return { topic, qtype, emotion, choices, empty: !raw.trim() };
  }

  function parseChoices(raw) {
    const m = raw.replace(/[?？!.]/g, ' ').match(/([^\s,]{1,14}(?:\s[^\s,]{1,10})?)\s*(?:아니면|vs\.?|VS|또는)\s*([^\s,]{1,14}(?:\s[^\s,]{1,10})?)/);
    if (!m) return null;
    const clean = s => s.replace(/(을|를|이|가|은|는|로|으로|에|이랑|랑|하고)$/, '').replace(/(할까|갈까|할지|해야|하는게|하는 게)$/, '').trim();
    const a = clean(m[1]), b = clean(m[2]);
    return a && b && a !== b ? [a.slice(0, 12), b.slice(0, 12)] : null;
  }

  // ---------- Random helpers ----------
  function randomInt(n) {
    const buf = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / n) * n;
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return buf[0] % n;
  }
  const pickOne = list => list[randomInt(list.length)];
  function shuffled(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ---------- Reading text ----------
  const data = (card, field) => (R[card.id] || [])[FIELD[field]];
  function score(p) {
    const base = data(p.card, 'p') ?? 0;
    if (!p.rev) return base;
    return base >= 0 ? -1 : base === -1 ? 0.5 : 1; // a hard card reversed reads as recovery
  }
  function domainText(card, domain) {
    if (domain === 'general') return `이 카드의 뜻은 ‘${card.meaning}’입니다. ${data(card, 'advice') || ''}.`;
    return (data(card, domain) || `이 카드의 뜻은 ‘${card.meaning}’입니다`) + '.';
  }
  // Card text for a position kind ('advice', 'feel' or a topic domain), aware of reversed cards.
  function cardBody(p, use, domain) {
    let body;
    if (use === 'advice') body = (data(p.card, 'advice') || p.card.meaning) + '.';
    else if (use === 'feel') body = (data(p.card, 'feel') || p.card.meaning) + '.';
    else body = domainText(p.card, domain);
    if (!p.rev) return body;
    const rev = data(p.card, 'rev') || '흐름이 막혀 있는 상태입니다';
    const base = data(p.card, 'p') ?? 0;
    if (base < 0) return `역방향으로 나와 오히려 ${rev.replace(/(상태|시기|때)입니다$/, '$1라는 신호입니다')}. 힘든 고비가 지나가고 있습니다.`;
    const first = body.split('. ')[0].replace(/\.$/, '');
    if (use === 'advice') return `지금은 ${rev}. 그래도 카드는 “${first}”라고 말합니다. 서두르지 말고 준비가 되었을 때 실천하세요.`;
    if (use === 'feel') return `마음 깊은 곳을 보면 ${first}. 다만 역방향이라 지금은 그 마음을 겉으로 드러내지 못하고 망설이고 있습니다.`;
    return `지금은 ${rev}. 바로 섰다면 ${first}. 역방향인 지금은 그 흐름이 늦게 오거나 약하게 나타납니다.`;
  }
  function positionText(p, pos, topic) {
    return `${pos.lead} ${p.rev ? '역방향 ' : ''}‘${p.card.ko}’입니다. ${cardBody(p, pos.use, topic.domain)}`;
  }

  function level(avg) {
    if (avg >= 1.3) return { word: '매우 높습니다', tone: 2 };
    if (avg >= 0.5) return { word: '높은 편입니다', tone: 1 };
    if (avg > -0.3) return { word: '반반입니다', tone: 0 };
    if (avg > -1.2) return { word: '지금 흐름으로는 낮은 편입니다', tone: -1 };
    return { word: '지금은 많이 낮습니다', tone: -2 };
  }
  const TONE_TAIL = {
    2: ['카드 흐름이 분명히 당신 편입니다. 망설이지 말고 움직이세요.', '좋은 기운이 겹쳐 있습니다. 지금이 행동할 때입니다.'],
    1: ['좋은 흐름이지만 노력이 더해져야 완성됩니다.', '방향은 맞습니다. 꾸준히 이어 가면 결과가 따라옵니다.'],
    0: ['결과는 아직 정해지지 않았습니다. 당신의 선택과 행동이 저울을 기울입니다.', '좋은 기운과 막힌 기운이 섞여 있습니다. 작은 행동 하나가 차이를 만듭니다.'],
    '-1': ['서두르면 어긋나기 쉽습니다. 준비할 시간을 더 가지세요.', '지금은 밀어붙이기보다 상황을 다시 정리할 때입니다.'],
    '-2': ['지금 방식 그대로라면 어렵다는 신호가 강합니다. 방향을 다시 생각해 보세요.', '무리해서 붙잡기보다 한발 물러서서 나를 지키는 것이 먼저입니다.']
  };

  function timingText(p) {
    const c = p.card;
    let t;
    if (c.arcana === 'major') {
      const n = parseInt(c.id.split('_')[1], 10);
      t = n <= 7 ? '한두 주 안의 가까운 시기에' : n <= 14 ? '한두 달 안에' : '몇 달 이상 시간이 지난 뒤에';
    } else t = SUITS[c.suit].time;
    return `‘${c.ko}’ 카드로 보면 변화는 ${t} 찾아올 가능성이 큽니다.${p.rev ? ' 다만 역방향이라 예상보다 늦어질 수 있습니다.' : ''}`;
  }

  function conclusion(st) {
    const { picks, spread, analysis } = st;
    const { topic, qtype } = analysis;
    const scores = picks.map(score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const last = picks[picks.length - 1];
    const lv = level(avg);
    const parts = [];
    switch (qtype.id) {
      case 'possible':
        parts.push(`${topic.goal} 가능성은 ${lv.word}.`, pickOne(TONE_TAIL[lv.tone]));
        break;
      case 'timing':
        parts.push(timingText(last), `${topic.goal} 흐름 자체는 ${lv.tone >= 1 ? '밝은 편입니다' : lv.tone === 0 ? '아직 열려 있습니다' : '시간이 더 필요해 보입니다'}.`);
        break;
      case 'feeling': {
        const i = spread.positions.findIndex(pos => pos.use === 'feel');
        const p = picks[i >= 0 ? i : 0];
        parts.push(`상대의 마음은 ‘${p.card.ko}’${p.rev ? '(역방향)' : ''} 카드가 보여 줍니다. ${cardBody(p, 'feel')}`);
        parts.push(`관계가 ${lv.tone >= 1 ? '좋은 쪽으로 이어질 기운이 강합니다' : lv.tone === 0 ? '어느 쪽으로든 갈 수 있으니 솔직한 대화가 열쇠입니다' : '지금은 거리를 두고 지켜볼 때입니다'}.`);
        break;
      }
      case 'choice': {
        const names = st.choiceNames || ['A', 'B'];
        if (picks.length >= 2) {
          const d = scores[0] - scores[1];
          if (d >= 1) parts.push(`두 갈래 중에서는 첫 번째 선택(${names[0]})의 흐름이 더 밝습니다.`);
          else if (d <= -1) parts.push(`두 갈래 중에서는 두 번째 선택(${names[1]})의 흐름이 더 밝습니다.`);
          else parts.push(`두 선택(${names[0]}, ${names[1]})의 기운이 비슷합니다. 조건보다 마음이 더 편한 쪽을 고르세요.`);
          if (picks[2]) parts.push(`조언 카드 ‘${picks[2].card.ko}’${josa(picks[2].card.ko, '은', '는')} 이렇게 말합니다. ${cardBody(picks[2], 'advice')}`);
        } else parts.push(`카드는 ${lv.tone >= 1 ? '해 보는 쪽' : lv.tone === 0 ? '조금 더 알아본 뒤 정하는 쪽' : '지금은 멈추는 쪽'}에 무게를 둡니다.`);
        break;
      }
      case 'how': {
        const i = spread.positions.findIndex(pos => pos.use === 'advice');
        const p = picks[i >= 0 ? i : picks.length - 1];
        parts.push(`가장 중요한 조언은 ‘${p.card.ko}’${p.rev ? '(역방향)' : ''} 카드에 있습니다. ${cardBody(p, 'advice')}`, pickOne(TONE_TAIL[lv.tone]));
        break;
      }
      case 'outlook':
        parts.push(`앞으로의 흐름은 ‘${last.card.ko}’${last.rev ? '(역방향)' : ''} 카드가 가리킵니다. ${cardBody(last, null, topic.domain)}`, pickOne(TONE_TAIL[lv.tone]));
        break;
      default:
        parts.push(`전체 흐름은 ${lv.tone >= 1 ? '밝은 편입니다' : lv.tone === 0 ? '좋고 나쁨이 섞여 있습니다' : '조심스러운 편입니다'}.`, pickOne(TONE_TAIL[lv.tone]));
    }
    // Deck pattern notes
    if (picks.length > 1) {
      const majors = picks.filter(p => p.card.arcana === 'major').length;
      if (majors >= 2) parts.push(`메이저 카드가 ${majors}장이나 나와, 이 고민은 일상의 작은 일이 아니라 삶의 큰 전환과 이어져 있습니다.`);
      const counts = {};
      picks.forEach(p => { if (p.card.suit) counts[p.card.suit] = (counts[p.card.suit] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) parts.push(`${SUITS[top[0]].ko} 카드가 ${top[1]}장으로, ${SUITS[top[0]].theme}${josa(SUITS[top[0]].theme, '이', '가')} 이번 고민의 중심입니다.`);
      const revs = picks.filter(p => p.rev).length;
      if (revs >= 2) parts.push(`역방향 카드가 ${revs}장이라 아직 막힌 부분이 많습니다. 결과를 서두르지 마세요.`);
    }
    if (topic.id === 'health') parts.push('몸이 계속 불편하다면 카드보다 병원 진료를 먼저 받으세요.');
    return parts.join(' ');
  }

  function opening(st) {
    const { analysis, question } = st;
    const parts = [];
    if (analysis.emotion) parts.push(pickOne(analysis.emotion.lines));
    if (!analysis.empty) {
      const q = question.length > 60 ? question.slice(0, 58) + '…' : question;
      parts.push(`“${q}” 이 고민을 ${analysis.topic.label} 주제로, ‘${analysis.qtype.label}’${josa(analysis.qtype.label, '을', '를')} 묻는 질문으로 읽었습니다.`);
    } else parts.push('질문 없이 뽑은 카드는 지금 당신에게 가장 필요한 메시지를 보여 줍니다.');
    return parts.join(' ');
  }

  // ---------- UI ----------
  const DECK_SIZE = 26;
  const $ = id => document.getElementById(id);
  const deckEl = $('deck'), slotsEl = $('slots'), statusEl = $('status');
  const shuffleBtn = $('shuffleBtn'), reading = $('reading'), questionEl = $('question');
  const topicSel = $('topicSelect'), qtypeSel = $('qtypeSelect');
  let cards = [], state = null, spreadTouched = false, topicTouched = false, qtypeTouched = false;

  topicSel.innerHTML = TOPICS.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
  qtypeSel.innerHTML = QTYPES.map(q => `<option value="${q.id}">${q.label}</option>`).join('');

  const spreadKey = () => document.querySelector('input[name=spread]:checked').value;
  const setStatus = text => { statusEl.textContent = text; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function currentAnalysis() {
    const a = analyze(questionEl.value);
    if (topicTouched) a.topic = TOPICS.find(t => t.id === topicSel.value);
    if (qtypeTouched) a.qtype = QTYPES.find(q => q.id === qtypeSel.value);
    return a;
  }
  function refreshAnalysis() {
    const a = currentAnalysis();
    if (!topicTouched) topicSel.value = a.topic.id;
    if (!qtypeTouched) qtypeSel.value = a.qtype.id;
    $('charCount').textContent = `${questionEl.value.length} / 300`;
    if (!spreadTouched && !state) {
      const key = questionEl.value.trim() ? a.qtype.spread : 'one';
      document.querySelector(`input[name=spread][value=${key}]`).checked = true;
      if (cards.length) renderSlots(SPREADS[key], a);
    }
    return a;
  }

  function slotName(spread, i, a) {
    const pos = spread.positions[i];
    if (spread === SPREADS.choice && i < 2 && a && a.choices) return `${pos.name} · ${a.choices[i]}`;
    return pos.name;
  }
  function renderSlots(spread, a) {
    slotsEl.className = 'slots' + (spread.positions.length === 1 ? ' one' : '');
    slotsEl.innerHTML = spread.positions.map((p, i) => `<div class="slot"><div class="pos">${esc(slotName(spread, i, a))}</div>
      <button class="flip empty" type="button" data-slot="${i}" disabled aria-label="${esc(p.name)} 자리, 아직 카드 없음"><span class="inner"><span class="face back"><img src="${BASE}back.jpg" alt=""></span><span class="face front"><img alt=""></span></span></button>
      <div class="name"></div><div class="en"></div></div>`).join('');
  }

  function start() {
    if (!cards.length) return;
    const analysis = currentAnalysis();
    const key = spreadKey(), spread = SPREADS[key];
    state = { key, spread, analysis, question: questionEl.value.trim(), choiceNames: analysis.choices, reversed: $('useReversed').checked, pool: shuffled(cards).slice(0, DECK_SIZE), picks: [], opened: 0 };
    reading.hidden = true;
    deckEl.innerHTML = state.pool.map((_, i) => `<button type="button" data-i="${i}" aria-label="엎어 놓은 카드 ${i + 1}번" style="--dx:${randomInt(40) - 20}px;--dy:${randomInt(24) - 12}px;--rot:${randomInt(24) - 12}deg"><img src="${BASE}back.jpg" alt=""></button>`).join('');
    deckEl.classList.remove('shuffling'); void deckEl.offsetWidth; deckEl.classList.add('shuffling');
    renderSlots(spread, analysis);
    shuffleBtn.textContent = '다시 섞기';
    setStatus(`고민을 떠올리며 끌리는 카드를 ${spread.positions.length}장 고르세요.`);
  }

  function pick(i) {
    if (!state || state.picks.length >= state.spread.positions.length) return;
    const btn = deckEl.querySelector(`[data-i="${i}"]`);
    if (!btn || btn.disabled) return;
    btn.disabled = true; btn.classList.add('taken');
    const card = state.pool[i];
    const rev = state.reversed && randomInt(2) === 1;
    const slotIndex = state.picks.length;
    state.picks.push({ card, rev });
    const slot = slotsEl.querySelector(`[data-slot="${slotIndex}"]`);
    slot.classList.remove('empty'); slot.disabled = false;
    slot.setAttribute('aria-label', `${state.spread.positions[slotIndex].name} 카드 뒤집기`);
    const front = slot.querySelector('.front');
    front.classList.toggle('reversed', rev);
    front.querySelector('img').src = BASE + card.img;
    const left = state.spread.positions.length - state.picks.length;
    if (left) setStatus(`${left}장 더 고르세요.`);
    else {
      deckEl.querySelectorAll('button:not(.taken)').forEach(b => { b.disabled = true; });
      setStatus('고른 카드를 눌러 하나씩 뒤집어 보세요.');
      slotsEl.querySelector('.flip:not(.open)').focus();
    }
  }

  function open(slotIndex) {
    const slot = slotsEl.querySelector(`[data-slot="${slotIndex}"]`);
    const p = state && state.picks[slotIndex];
    if (!p || slot.classList.contains('open')) return;
    slot.classList.add('open');
    const name = p.card.ko + (p.rev ? ' (역방향)' : '');
    slot.setAttribute('aria-label', `${state.spread.positions[slotIndex].name}: ${name}`);
    const box = slot.parentElement;
    box.querySelector('.name').textContent = name;
    box.querySelector('.en').textContent = p.card.en;
    state.opened++;
    const total = state.spread.positions.length;
    if (state.opened === total && state.picks.length === total) setTimeout(showReading, 650);
    else if (state.picks.length === total) setStatus(`${total - state.opened}장 남았습니다.`);
  }

  function showReading() {
    const { analysis, spread } = state;
    $('readingQuestion').textContent = `${spread.label} · ${analysis.topic.label} · ${analysis.qtype.label}`;
    $('readingOpening').textContent = opening(state);
    $('readingList').innerHTML = state.picks.map((p, i) => {
      const pos = spread.positions[i];
      return `<li><img src="${BASE + p.card.img}" alt="${esc(p.card.ko)} 카드"${p.rev ? ' class="reversed"' : ''}><div><span class="tag">${esc(slotName(spread, i, analysis))}</span><b>${esc(p.card.ko)}${p.rev ? ' · 역방향' : ''} <small style="font-weight:400;color:#9a93b8">${esc(p.card.en)}</small></b><p>${esc(positionText(p, pos, analysis.topic))}</p></div></li>`;
    }).join('');
    state.summary = conclusion(state);
    state.tip = pickOne(analysis.topic.tips);
    $('readingSummary').textContent = state.summary;
    $('readingTip').textContent = state.tip;
    reading.hidden = false;
    setStatus('해석이 준비되었습니다.');
    reading.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function resultText() {
    const lines = [`[타로점] ${state.spread.label} / ${state.analysis.topic.label}`];
    if (state.question) lines.push(`고민: ${state.question}`);
    state.picks.forEach((p, i) => lines.push(`${slotName(state.spread, i, state.analysis)}: ${p.card.ko}${p.rev ? '(역방향)' : ''} - ${p.card.meaning}`));
    lines.push(state.summary, `조언: ${state.tip}`, location.origin + location.pathname);
    return lines.join('\n');
  }

  function renderDict(filter) {
    const list = cards.filter(c => filter === 'major' ? c.arcana === 'major' : c.suit === filter);
    $('dictGrid').innerHTML = list.map(c => `<li><img src="${BASE + c.img}" alt="${esc(c.ko)} 카드" loading="lazy" width="300" height="434"><b>${esc(c.ko)}</b><small>${esc(c.en)}</small><p>${esc(c.meaning)}</p></li>`).join('');
    document.querySelectorAll('#dictTabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  }

  questionEl.addEventListener('input', () => { refreshAnalysis(); });
  topicSel.addEventListener('change', () => { topicTouched = true; });
  qtypeSel.addEventListener('change', () => { qtypeTouched = true; if (!spreadTouched && !state) { const q = QTYPES.find(x => x.id === qtypeSel.value); document.querySelector(`input[name=spread][value=${q.spread}]`).checked = true; renderSlots(SPREADS[q.spread], currentAnalysis()); } });
  deckEl.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) pick(+b.dataset.i); });
  slotsEl.addEventListener('click', e => { const b = e.target.closest('button[data-slot]'); if (b) open(+b.dataset.slot); });
  shuffleBtn.addEventListener('click', start);
  document.querySelectorAll('input[name=spread]').forEach(r => r.addEventListener('change', () => {
    spreadTouched = true;
    if (state) start(); else if (cards.length) renderSlots(SPREADS[spreadKey()], currentAnalysis());
  }));
  $('againBtn').addEventListener('click', () => { state = null; start(); $('deck').scrollIntoView({ block: 'center' }); });
  $('newBtn').addEventListener('click', () => {
    state = null; spreadTouched = topicTouched = qtypeTouched = false;
    questionEl.value = ''; reading.hidden = true; deckEl.innerHTML = ''; shuffleBtn.textContent = '카드 섞기';
    refreshAnalysis(); renderSlots(SPREADS[spreadKey()], currentAnalysis());
    setStatus('고민을 적은 뒤 카드 섞기를 누르세요.');
    questionEl.focus();
  });
  $('copyBtn').addEventListener('click', async () => {
    const btn = $('copyBtn');
    try { await navigator.clipboard.writeText(resultText()); btn.textContent = '복사했습니다'; }
    catch { btn.textContent = '복사하지 못했습니다'; }
    setTimeout(() => { btn.textContent = '결과 복사'; }, 1800);
  });
  $('dictTabs').addEventListener('click', e => { const b = e.target.closest('button[data-filter]'); if (b) renderDict(b.dataset.filter); });

  shuffleBtn.disabled = true;
  refreshAnalysis();
  fetch(BASE + 'cards.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(json => {
    cards = json.cards;
    shuffleBtn.disabled = false;
    renderDict('major');
    setStatus('고민을 적은 뒤 카드 섞기를 누르세요.');
    renderSlots(SPREADS[spreadKey()], currentAnalysis());
  }).catch(() => setStatus('카드를 불러오지 못했습니다. 새로고침해 주세요.'));

  window.TarotReader = { analyze, TOPICS, QTYPES, SPREADS }; // used by the page test
})();
