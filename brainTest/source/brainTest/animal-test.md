# 동물 성격 심리 테스트 (정규화 데이터 포맷)
title: "동물 성격 심리 테스트"

## 문항
- id: 1
  text: "중요한 약속이 있는 날, 시간이 조금 남았다면?"
  options:
    A: { text: "일찍 가서 주변을 살핀다", trait: "owl" }
    B: { text: "딱 맞춰 도착한다", trait: "fox" }
    C: { text: "다른 일부터 처리한다", trait: "fox" }
- id: 2
  text: "팀 프로젝트에서 갈등이 생기면?"
  options:
    A: { text: "중재하며 모두의 의견을 듣는다", trait: "dolphin" }
    B: { text: "결정권자에게 방향을 맡긴다", trait: "fennec" }
    C: { text: "내 주장을 밀어붙인다", trait: "tiger" }
- id: 3
  text: "새 취미를 시작할 때?"
  options:
    A: { text: "자료를 충분히 조사하고 시작한다", trait: "owl" }
    B: { text: "일단 해보며 배우는 편이다", trait: "tiger" }
    C: { text: "주변 사람을 끌어들여 함께 한다", trait: "dolphin" }
- id: 4
  text: "예상치 못한 일정 변경이 생기면?"
  options:
    A: { text: "빠르게 플랜 B를 세운다", trait: "owl" }
    B: { text: "큰 그림만 맞으면 괜찮다", trait: "fox" }
    C: { text: "당황하지만 금방 적응한다", trait: "fox" }
- id: 5
  text: "스트레스 해소법은?"
  options:
    A: { text: "혼자 집중할 수 있는 활동", trait: "owl" }
    B: { text: "운동/액션", trait: "tiger" }
    C: { text: "사람들과 수다/모임", trait: "dolphin" }
- id: 6
  text: "목표를 세울 때?"
  options:
    A: { text: "세부 계획과 체크리스트", trait: "owl" }
    B: { text: "큰 목표 하나로 밀어붙이기", trait: "tiger" }
    C: { text: "상황을 보며 유연하게 조정", trait: "fox" }
- id: 7
  text: "새로운 사람을 만날 때?"
  options:
    A: { text: "먼저 질문하며 알아간다", trait: "dolphin" }
    B: { text: "관찰 후 천천히 가까워진다", trait: "fennec" }
    C: { text: "분위기를 주도하며 친해진다", trait: "tiger" }
- id: 8
  text: "실수를 했을 때?"
  options:
    A: { text: "원인 분석부터 한다", trait: "fennec" }
    B: { text: "일단 수습하고 나중에 정리", trait: "tiger" }
    C: { text: "주변 도움을 받아 공유하며 해결", trait: "dolphin" }
- id: 9
  text: "복잡한 문제를 풀 때?"
  options:
    A: { text: "구조를 그리며 분해한다", trait: "owl" }
    B: { text: "직관적으로 핵심부터 건드린다", trait: "tiger" }
    C: { text: "여러 사람 의견을 모아본다", trait: "fox" }
- id: 10
  text: "여행을 갈 때?"
  options:
    A: { text: "상세 일정표를 만든다", trait: "owl" }
    B: { text: "주요 스폿만 정해두고 즉흥적으로", trait: "fox" }
    C: { text: "동행자와 즉석에서 정한다", trait: "dolphin" }

## trait-meta
- key: owl
  name: "부엉이"
  tags: "계획형·분석형"
  desc: "넓게 보고 조용히 계산하는 전략가입니다. 정보를 정리하고 플랜을 세운 뒤 움직이며, 안정적 결과를 추구합니다."
- key: tiger
  name: "호랑이"
  tags: "주도형·직진형"
  desc: "목표에 집중하고 추진력이 강한 리더 타입입니다. 빠른 결단과 행동으로 팀을 이끌며, 속도와 성과를 중시합니다."
- key: dolphin
  name: "돌고래"
  tags: "사교형·협력형"
  desc: "팀워크와 소통을 통해 문제를 풀어가는 타입입니다. 분위기를 부드럽게 만들고 협업을 즐깁니다."
- key: fox
  name: "여우"
  tags: "적응형·유연형"
  desc: "환경에 따라 빠르게 전술을 바꾸는 유연한 해결사입니다. 즉흥적 변화에도 잘 적응하며, 상황을 살피는 감각이 뛰어납니다."
- key: fennec
  name: "사막여우"
  tags: "관찰형·신중형"
  desc: "조용히 살피고 안전을 확보한 뒤 움직이는 안정 추구자입니다. 리스크를 최소화하며 세심한 관찰로 해법을 찾습니다."

## 사용법
각 문항의 선택을 세고 최다 득표 trait를 구한다. 동점이면 여러 trait를 모두 노출한다.
