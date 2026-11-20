/* 비행기 게임의 모든 기체 그림. 그림 파일 없이 코드로 그려 어떤 해상도에서도 선명하다.
   좌표는 가로세로 -50..50, 기수는 위쪽. 적과 보스는 그린 뒤 뒤집어 아래를 향하게 한다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShooterSprites = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const OUTLINE = '#020617';

  function tools(g) {
    const path = (points, mirror) => {
      g.beginPath();
      points.forEach(([x, y], i) => { const px = mirror ? -x : x; if (i) g.lineTo(px, y); else g.moveTo(px, y); });
      g.closePath();
    };
    const paint = (fill, stroke, width) => {
      if (fill) { g.fillStyle = fill; g.fill(); }
      if (stroke !== null) { g.strokeStyle = stroke || OUTLINE; g.lineWidth = width || 1.6; g.lineJoin = 'round'; g.stroke(); }
    };
    return {
      // 세로 그러데이션
      lin(y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; },
      // 가로 그러데이션: 가운데가 밝은 금속 느낌
      metal(x, stops) { const gr = g.createLinearGradient(-x, 0, x, 0); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); return gr; },
      // 한 번 그리는 도형
      shape(points, fill, stroke, width) { path(points, false); paint(fill, stroke, width); },
      // 좌우 대칭으로 두 번 그리는 도형
      pair(points, fill, stroke, width) { path(points, false); paint(fill, stroke, width); path(points, true); paint(fill, stroke, width); },
      oval(x, y, rx, ry, fill, stroke, width) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); paint(fill, stroke, width); },
      ovals(x, y, rx, ry, fill, stroke, width) { this.oval(x, y, rx, ry, fill, stroke, width); this.oval(-x, y, rx, ry, fill, stroke, width); },
      light(x, y, r, color) {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(.35, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      },
      lights(x, y, r, color) { this.light(x, y, r, color); this.light(-x, y, r, color); },
      line(points, color, width) { g.beginPath(); points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokeStyle = color; g.lineWidth = width || 1; g.lineCap = 'round'; g.stroke(); },
      lines(points, color, width) { this.line(points, color, width); this.line(points.map(([x, y]) => [-x, y]), color, width); },
      glass(x, y, rx, ry, a, b) {
        const gr = g.createLinearGradient(0, y - ry, 0, y + ry); gr.addColorStop(0, a); gr.addColorStop(1, b);
        this.oval(x, y, rx, ry, gr, OUTLINE, 1.2);
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(x - rx * .25, y - ry * .4, rx * .28, ry * .3, 0, 0, Math.PI * 2); g.fill();
      }
    };
  }

  const DRAW = {
    // ---------- 플레이어 ----------
    'player-power'(g, t) {
      // 중장갑 공격기: 넓은 삼각 날개와 쌍포
      t.pair([[10, 6], [44, 26], [46, 36], [30, 40], [12, 34]], t.lin(6, 40, ['#be123c', '#4c0519']));
      t.pair([[30, 20], [34, 20], [34, -14], [32, -20], [30, -14]], t.lin(-20, 20, ['#e2e8f0', '#475569']));
      t.pair([[14, 12], [40, 28], [38, 31], [14, 20]], '#fb7185', null);
      t.pair([[6, 30], [20, 34], [22, 46], [8, 44]], t.lin(30, 46, ['#64748b', '#1e293b']));
      t.shape([[0, -46], [8, -30], [13, -4], [15, 30], [8, 42], [-8, 42], [-15, 30], [-13, -4], [-8, -30]], t.metal(15, ['#7f1d1d', '#f43f5e', '#fecdd3', '#f43f5e', '#7f1d1d']));
      t.shape([[0, -40], [4, -28], [5, 6], [0, 12], [-5, 6], [-4, -28]], t.lin(-40, 12, ['#fff1f2', '#fda4af']), null);
      t.lines([[9, -8], [12, 28]], 'rgba(2,6,23,.55)', 1);
      t.glass(0, -18, 4.5, 9, '#fde68a', '#b45309');
      t.lights(32, -19, 4, '#fbbf24'); t.lights(15, 44, 5, '#fb923c'); t.light(0, 42, 5, '#fb923c');
    },
    'player-balanced'(g, t) {
      // 균형형 요격기: 후퇴익과 쌍꼬리
      t.pair([[8, -2], [42, 22], [46, 34], [26, 30], [10, 24]], t.lin(-2, 34, ['#38bdf8', '#0c4a6e']));
      t.pair([[12, 6], [38, 24], [34, 26], [12, 14]], '#bae6fd', null);
      t.pair([[42, 12], [45, 12], [46, 34], [41, 34]], t.lin(12, 34, ['#e0f2fe', '#0369a1']));
      t.pair([[6, 26], [18, 40], [16, 46], [5, 42]], t.lin(26, 46, ['#0ea5e9', '#082f49']));
      t.shape([[0, -48], [6, -32], [10, -6], [11, 28], [6, 42], [-6, 42], [-11, 28], [-10, -6], [-6, -32]], t.metal(11, ['#0c4a6e', '#7dd3fc', '#f0f9ff', '#7dd3fc', '#0c4a6e']));
      t.shape([[0, -42], [3, -30], [3.5, 18], [0, 24], [-3.5, 18], [-3, -30]], '#f0f9ff', null);
      t.lines([[7, -4], [9, 30]], 'rgba(2,6,23,.5)', 1);
      t.glass(0, -20, 4, 10, '#a5f3fc', '#0e7490');
      t.lights(43.5, 12, 3.5, '#22d3ee'); t.light(0, 43, 6, '#38bdf8'); t.lights(11, 44, 3.5, '#38bdf8');
    },
    'player-speed'(g, t) {
      // 고속 전투기: 가늘고 날카로운 전진익
      t.pair([[5, 4], [34, -6], [40, -2], [24, 22], [8, 26]], t.lin(-6, 26, ['#fbbf24', '#78350f']));
      t.pair([[8, 8], [32, -3], [30, 2], [10, 14]], '#fef3c7', null);
      t.pair([[5, 28], [22, 42], [18, 46], [4, 40]], t.lin(28, 46, ['#f59e0b', '#451a03']));
      t.shape([[0, -49], [4, -34], [7, -4], [8, 30], [4, 44], [-4, 44], [-8, 30], [-7, -4], [-4, -34]], t.metal(8, ['#78350f', '#fbbf24', '#fffbeb', '#fbbf24', '#78350f']));
      t.shape([[0, -44], [2, -30], [2.5, 20], [0, 26], [-2.5, 20], [-2, -30]], '#1e293b', null);
      t.glass(0, -22, 3.2, 10, '#bae6fd', '#0369a1');
      t.lights(37, -4, 3.5, '#fde047'); t.lights(4.5, 45, 4.5, '#facc15');
    },
    drone(g, t) {
      t.pair([[4, 0], [30, 16], [26, 30], [8, 22]], t.lin(0, 30, ['#7dd3fc', '#0c4a6e']));
      t.shape([[0, -40], [10, -8], [10, 26], [0, 34], [-10, 26], [-10, -8]], t.metal(10, ['#155e75', '#a5f3fc', '#155e75']));
      t.glass(0, -6, 5, 8, '#f0f9ff', '#0ea5e9'); t.light(0, 36, 10, '#38bdf8');
    },

    // ---------- 적 ----------
    grunt(g, t) {
      // 일반기: 딱정벌레 같은 붉은 요격기
      t.pair([[10, -10], [40, 2], [46, 24], [34, 34], [14, 22]], t.lin(-10, 34, ['#ef4444', '#450a0a']));
      t.pair([[30, -34], [36, -30], [40, 2], [32, 4]], t.lin(-34, 4, ['#fecaca', '#991b1b']));
      t.pair([[14, 0], [38, 8], [36, 14], [14, 8]], '#fca5a5', null);
      t.shape([[0, -40], [14, -24], [18, 6], [10, 34], [-10, 34], [-18, 6], [-14, -24]], t.metal(18, ['#450a0a', '#dc2626', '#fca5a5', '#dc2626', '#450a0a']));
      t.shape([[0, -30], [8, -18], [9, 4], [0, 12], [-9, 4], [-8, -18]], '#1c1917', OUTLINE, 1);
      t.light(0, -8, 9, '#fb923c'); t.lights(8, 36, 5, '#f97316'); t.lights(33, -32, 3, '#fde047');
    },
    shooter(g, t) {
      // 사수기: 양옆에 포신을 단 보라색 포격기
      t.pair([[10, -4], [38, -14], [46, 4], [40, 26], [14, 20]], t.lin(-14, 26, ['#a855f7', '#2e1065']));
      t.pair([[26, -44], [32, -44], [33, 6], [25, 6]], t.lin(-44, 6, ['#e2e8f0', '#475569']));
      t.pair([[24, -12], [34, -12], [35, -6], [23, -6]], '#1e293b');
      t.pair([[14, 2], [38, -6], [40, 0], [14, 10]], '#d8b4fe', null);
      t.shape([[0, -36], [10, -26], [14, 0], [12, 30], [0, 42], [-12, 30], [-14, 0], [-10, -26]], t.metal(14, ['#2e1065', '#9333ea', '#e9d5ff', '#9333ea', '#2e1065']));
      t.shape([[0, 14], [6, 26], [0, 36], [-6, 26]], '#f0abfc', null);
      t.glass(0, -12, 6, 10, '#f0abfc', '#86198f');
      t.lights(29, -44, 4.5, '#e879f9'); t.lights(42, 20, 3, '#c084fc'); t.light(0, 40, 5, '#c084fc');
    },
    rusher(g, t) {
      // 돌격기: 창처럼 뾰족한 주황색 강습기
      t.pair([[5, 0], [30, 24], [40, 44], [22, 36], [6, 24]], t.lin(0, 44, ['#fb923c', '#7c2d12']));
      t.pair([[5, -18], [18, -4], [14, 4], [5, -6]], t.lin(-18, 4, ['#fed7aa', '#c2410c']));
      t.pair([[10, 12], [28, 28], [24, 30], [10, 20]], '#ffedd5', null);
      t.shape([[0, -49], [6, -26], [9, 10], [7, 36], [0, 44], [-7, 36], [-9, 10], [-6, -26]], t.metal(9, ['#7c2d12', '#f97316', '#ffedd5', '#f97316', '#7c2d12']));
      t.shape([[0, -46], [2.5, -28], [0, -18], [-2.5, -28]], '#fef3c7', null);
      t.glass(0, -4, 4, 9, '#67e8f9', '#0e7490');
      t.lights(5, 44, 5, '#38bdf8'); t.lights(36, 42, 3, '#fde047');
    },
    splitter(g, t) {
      // 분열기: 가운데 이음매로 맞붙은 쌍동선
      t.pair([[4, -34], [26, -40], [42, -16], [44, 16], [30, 38], [6, 34]], t.lin(-40, 38, ['#a3e635', '#1a2e05']));
      t.pair([[10, -26], [26, -30], [34, -12], [12, -10]], '#d9f99d', null);
      t.pair([[14, 6], [36, 6], [30, 28], [14, 26]], t.lin(6, 28, ['#365314', '#1a2e05']));
      t.ovals(24, -2, 9, 12, t.lin(-14, 10, ['#fef9c3', '#65a30d']));
      t.shape([[-4, -36], [4, -36], [3, 36], [-3, 36]], '#0f172a');
      t.line([[0, -34], [-2.5, -18], [2.5, -4], [-2.5, 12], [0, 34]], '#bef264', 1.6);
      t.lights(24, -2, 6, '#bef264'); t.lights(20, 38, 5, '#84cc16');
    },
    mini(g, t) {
      // 분열 소형기: 쌍동선의 한쪽 몸체
      t.shape([[0, -44], [28, -24], [34, 12], [18, 40], [-18, 40], [-34, 12], [-28, -24]], t.lin(-44, 40, ['#bef264', '#1a2e05']));
      t.shape([[0, -34], [18, -20], [20, -4], [-20, -4], [-18, -20]], '#d9f99d', null);
      t.oval(0, 6, 13, 15, t.lin(-9, 21, ['#fef9c3', '#65a30d'])); t.light(0, 6, 10, '#bef264'); t.lights(12, 40, 6, '#84cc16');
    },
    sniper(g, t) {
      // 저격기: 긴 포신 하나와 얇은 안정 날개
      t.pair([[6, 4], [44, 16], [46, 22], [8, 22]], t.lin(4, 22, ['#f87171', '#450a0a']));
      t.pair([[8, 26], [26, 40], [22, 44], [6, 36]], t.lin(26, 44, ['#b91c1c', '#450a0a']));
      t.shape([[-4, -49], [4, -49], [5, -8], [-5, -8]], t.metal(5, ['#334155', '#e2e8f0', '#334155']));
      t.shape([[-6, -40], [6, -40], [6, -34], [-6, -34]], '#0f172a'); t.shape([[-6, -26], [6, -26], [6, -20], [-6, -20]], '#0f172a');
      t.shape([[0, -12], [11, -2], [12, 28], [6, 42], [-6, 42], [-12, 28], [-11, -2]], t.metal(12, ['#450a0a', '#dc2626', '#fecaca', '#dc2626', '#450a0a']));
      t.glass(0, 10, 6, 9, '#fecaca', '#7f1d1d');
      t.light(0, -48, 6, '#f87171'); t.lights(44, 19, 3, '#fca5a5'); t.light(0, 42, 5, '#fb7185');
    },
    carrier(g, t) {
      // 보급 수송기: 화물칸을 단 넓고 둔한 선체
      t.pair([[18, -22], [44, -12], [46, 22], [18, 30]], t.lin(-22, 30, ['#34d399', '#022c22']));
      t.pair([[22, -12], [40, -6], [40, 6], [22, 6]], t.lin(-12, 6, ['#fde68a', '#b45309'])); t.pair([[22, 10], [40, 10], [40, 20], [22, 22]], t.lin(10, 22, ['#fde68a', '#b45309']));
      t.shape([[-12, -42], [12, -42], [20, -24], [20, 32], [10, 42], [-10, 42], [-20, 32], [-20, -24]], t.metal(20, ['#022c22', '#10b981', '#d1fae5', '#10b981', '#022c22']));
      t.shape([[-14, -8], [14, -8], [14, 0], [-14, 0]], '#064e3b', null); t.shape([[-14, 12], [14, 12], [14, 20], [-14, 20]], '#064e3b', null);
      t.glass(0, -28, 8, 7, '#ecfdf5', '#047857');
      t.lights(12, 43, 6, '#6ee7b7'); t.lights(43, -10, 3, '#fde047');
    },
    elite(g, t) {
      // 정예 지휘기: 왕관처럼 솟은 금빛 날개
      t.pair([[10, -8], [34, -38], [40, -30], [44, 8], [32, 30], [12, 22]], t.lin(-38, 30, ['#fde047', '#713f12']));
      t.pair([[16, -6], [34, -30], [38, 4], [18, 12]], '#fef9c3', null);
      t.pair([[6, 24], [24, 40], [18, 46], [5, 38]], t.lin(24, 46, ['#eab308', '#422006']));
      t.shape([[0, -46], [10, -28], [14, 0], [12, 30], [0, 44], [-12, 30], [-14, 0], [-10, -28]], t.metal(14, ['#422006', '#eab308', '#fef9c3', '#eab308', '#422006']));
      t.shape([[0, -40], [5, -24], [0, -10], [-5, -24]], '#b91c1c', OUTLINE, 1);
      t.glass(0, 4, 6, 10, '#fecaca', '#991b1b');
      t.lights(37, -36, 4.5, '#fef08a'); t.light(0, -26, 6, '#f87171'); t.light(0, 42, 6, '#fde047');
    },
    armored(g, t) {
      // 장갑기: 겹겹의 강철판으로 감싼 일반기
      t.pair([[12, -28], [42, -18], [46, 20], [34, 36], [12, 30]], t.lin(-28, 36, ['#94a3b8', '#0f172a']));
      t.pair([[16, -20], [38, -12], [40, 2], [16, -2]], '#e2e8f0', null); t.pair([[16, 4], [40, 8], [36, 26], [16, 22]], t.lin(4, 26, ['#cbd5e1', '#475569']), OUTLINE, 1);
      t.shape([[0, -42], [16, -28], [18, 22], [10, 38], [-10, 38], [-18, 22], [-16, -28]], t.metal(18, ['#0f172a', '#64748b', '#f1f5f9', '#64748b', '#0f172a']));
      t.shape([[-16, -12], [16, -12], [17, -6], [-17, -6]], '#1e293b', null); t.shape([[-17, 10], [17, 10], [17, 16], [-17, 16]], '#1e293b', null);
      [[-11, -9], [11, -9], [-11, 13], [11, 13], [28, -4], [-28, -4], [28, 16], [-28, 16]].forEach(([x, y]) => t.oval(x, y, 1.8, 1.8, '#f8fafc', null));
      t.shape([[-7, -30], [7, -30], [5, -22], [-5, -22]], '#ef4444', OUTLINE, 1); t.light(0, -26, 6, '#f87171'); t.lights(8, 39, 5, '#f97316');
    },

    // ---------- 보스 (가로로 넓은 그림: x는 -50..50, y는 -34..34 안에서 그린다) ----------
    'boss-destroyer'(g, t) {
      // 파괴자: 낫 모양 날개와 뿔을 단 전함
      t.pair([[10, -8], [34, -30], [49, -22], [46, 6], [36, 26], [14, 18]], t.lin(-30, 26, ['#c026d3', '#3b0764']));
      t.pair([[38, -26], [48, -34], [47, -12], [41, -10]], t.lin(-34, -10, ['#f5d0fe', '#86198f']));
      t.pair([[16, -6], [34, -22], [42, -14], [38, 4], [18, 8]], '#e879f9', null);
      t.pair([[18, 12], [34, 20], [28, 33], [16, 26]], t.lin(12, 33, ['#7e22ce', '#1e1b4b']));
      t.pair([[22, -14], [26, -14], [27, 12], [21, 12]], t.lin(-14, 12, ['#e2e8f0', '#334155']));
      t.shape([[0, -34], [10, -22], [16, 4], [12, 26], [0, 34], [-12, 26], [-16, 4], [-10, -22]], t.metal(16, ['#3b0764', '#a21caf', '#f5d0fe', '#a21caf', '#3b0764']));
      t.shape([[0, -28], [6, -18], [8, 2], [0, 10], [-8, 2], [-6, -18]], '#1e1b4b', OUTLINE, 1);
      t.light(0, -6, 10, '#f0abfc'); t.lights(24, 13, 4, '#f472b6'); t.lights(44, -30, 3.5, '#fde047'); t.lights(7, 31, 4, '#c084fc');
    },
    'boss-weaver'(g, t) {
      // 직조자: 초승달 팔과 가는 다리를 가진 거미형 함선
      t.pair([[8, -10], [30, -30], [48, -18], [49, 8], [40, -4], [28, -12], [14, 2]], t.lin(-30, 8, ['#2dd4bf', '#042f2e']));
      t.pair([[10, 2], [34, 6], [46, 26], [40, 28], [30, 14], [12, 12]], t.lin(2, 28, ['#14b8a6', '#042f2e']));
      t.pair([[8, 12], [22, 20], [28, 34], [22, 34], [16, 24], [8, 20]], t.lin(12, 34, ['#0d9488', '#042f2e']));
      t.pair([[14, -10], [30, -24], [42, -16], [30, -16], [16, -4]], '#99f6e4', null);
      t.shape([[0, -30], [9, -20], [13, 2], [8, 24], [0, 32], [-8, 24], [-13, 2], [-9, -20]], t.metal(13, ['#042f2e', '#0d9488', '#ccfbf1', '#0d9488', '#042f2e']));
      t.ovals(5, -10, 3, 4, '#f0fdfa', OUTLINE, 1); t.oval(0, 6, 6, 9, t.lin(-3, 15, ['#f0fdfa', '#0f766e']), OUTLINE, 1.2);
      t.light(0, 6, 9, '#5eead4'); t.lights(46, -16, 4.5, '#5eead4'); t.lights(43, 26, 3.5, '#99f6e4'); t.lights(25, 33, 3, '#99f6e4');
    },
    'boss-fortress'(g, t) {
      // 요새: 성벽 같은 장갑판과 포탑을 올린 육중한 함선
      t.pair([[14, -22], [46, -22], [49, -10], [49, 18], [42, 28], [14, 28]], t.lin(-22, 28, ['#f59e0b', '#451a03']));
      t.pair([[18, -18], [44, -18], [45, -8], [18, -8]], '#fde68a', null);
      t.pair([[20, -4], [45, -4], [45, 12], [20, 12]], t.lin(-4, 12, ['#92400e', '#451a03']), OUTLINE, 1);
      t.pair([[26, -34], [32, -34], [33, -20], [25, -20]], t.lin(-34, -20, ['#e2e8f0', '#475569'])); t.pair([[38, -32], [43, -32], [44, -20], [37, -20]], t.lin(-32, -20, ['#e2e8f0', '#475569']));
      t.pair([[22, 26], [40, 26], [36, 34], [24, 34]], t.lin(26, 34, ['#78350f', '#1c1917']));
      t.shape([[-12, -32], [12, -32], [18, -18], [18, 24], [10, 34], [-10, 34], [-18, 24], [-18, -18]], t.metal(18, ['#451a03', '#d97706', '#fef3c7', '#d97706', '#451a03']));
      t.shape([[-12, -14], [12, -14], [12, -6], [-12, -6]], '#1c1917', null); t.shape([[-12, 12], [12, 12], [12, 18], [-12, 18]], '#1c1917', null);
      t.oval(0, 2, 8, 8, t.lin(-6, 10, ['#fef3c7', '#b45309']), OUTLINE, 1.4);
      [[26, 0], [32, 0], [38, 0], [26, 8], [32, 8], [38, 8]].forEach(([x, y]) => { t.oval(x, y, 1.6, 1.6, '#fde68a', null); t.oval(-x, y, 1.6, 1.6, '#fde68a', null); });
      t.light(0, 2, 9, '#fbbf24'); t.lights(29, -34, 4, '#fb923c'); t.lights(40.5, -32, 3.5, '#fb923c'); t.lights(30, 33, 4, '#f97316');
    }
  };
  const FACING_DOWN = new Set(['grunt', 'shooter', 'rusher', 'splitter', 'mini', 'sniper', 'carrier', 'elite', 'armored', 'boss-destroyer', 'boss-weaver', 'boss-fortress']);

  /** 주어진 2D 컨텍스트의 (0,0)-(width,height) 영역에 key 그림을 채워 그린다. */
  function render(g, key, width, height) {
    const draw = DRAW[key];
    if (!draw) return false;
    g.save();
    g.translate(width / 2, height / 2);
    // 보스는 가로 100 × 세로 68 비율로, 나머지는 100 × 100으로 그린다.
    g.scale(width / 100, height / (key.startsWith('boss-') ? 70 : 100));
    if (FACING_DOWN.has(key)) g.scale(1, -1);
    draw(g, tools(g));
    g.restore();
    return true;
  }
  return Object.freeze({ render, keys: Object.freeze(Object.keys(DRAW)), has: key => Boolean(DRAW[key]) });
});
