# 무의미한 지표 조합 규칙

> **목적**: 33조 개의 조합 중 논리적으로 무의미하거나 중복되는 조합을 사전에 제거하여 검색 공간을 최소화

---

## 📊 현재 지표 현황

| 카테고리 | 지표 수 | 지표 목록 |
|----------|---------|-----------|
| trend | 10 | SMA, EMA, WMA, DEMA, HMA, VWMA, McGinleyDynamic, GuppyShort, GuppyLong, GuppySeparation |
| momentum | 19 | RSI, StochasticK, StochasticD, WilliamsR, MACD, ROC, Momentum, CCI, CMO, UltimateOscillator, AwesomeOscillator, PPO, TRIX, KST, RVI, DeMarker, ConnorsRSI, SchaffTrendCycle, ElderImpulse |
| volatility | 8 | ATR, BollingerBands, KeltnerChannel, DonchianChannel, StandardDeviation, HistoricalVolatility, ChaikinVolatility, UlcerIndex |
| volume | 13 | OBV, VolumeRatio, MFI, CMF, ADL, ChaikinOscillator, VWAP, ForceIndex, VolumeOscillator, KlingerOscillator, EaseOfMovement, IntradayIntensity, MarketFacilitationIndex |
| trend_strength | 8 | ADX, PlusDI, MinusDI, AroonUp, AroonDown, AroonOscillator, VortexPlus, VortexMinus |
| price_position | 7 | PricePosition, DistanceFromMA, PriceVsEMA, BollingerPercentB, BollingerWidth, PercentRank, ZScore |
| candle | 6 | ConsecutiveCandles, CandleSizeRatio, BullishRatio, HeikinAshiTrend, BalanceOfPower, Qstick |
| ichimoku | 4 | IchimokuTenkan, IchimokuKijun, IchimokuSenkouA, IchimokuSenkouB |
| regression | 5 | LinearRegressionValue, LinearRegressionSlope, RSquared, StandardError, ChandeForecastOscillator |
| composite | 4 | StochRSI, SqueezeIndicator, BullPower, BearPower |
| time | 3 | PriceChangeN, HigherHighsCount, LowerLowsCount |
| sentiment | 1 | BuySellPressure |
| **총합** | **88** | |

---

## 🚫 무의미한 조합 규칙

### 1. 동일 계열 중복 (Redundant Same-Family)

#### 1.1 이동평균 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| SMA + EMA | 둘 다 가격의 평활화. 같은 신호(price_above, cross_up)를 생성하므로 독립적 정보 없음 |
| SMA + WMA | WMA도 가격 평활화의 변형 |
| EMA + DEMA | DEMA는 EMA의 2중 적용 |
| EMA + HMA | HMA는 WMA 기반이나 같은 추세 추종 목적 |
| SMA + GuppyShort | Guppy도 다중 EMA 기반, 이동평균 계열 |
| GuppyShort + GuppyLong | 같은 Guppy 시스템의 구성요소 |
| GuppyShort + GuppySeparation | Separation은 Short/Long 차이 (종속) |
| 모든 MA 계열 상호 | `SMA, EMA, WMA, DEMA, HMA, VWMA, McGinleyDynamic, GuppyShort, GuppyLong, GuppySeparation` |

**규칙**: `trend` 카테고리 이동평균 중 **최대 1개만** 허용

#### 1.2 오실레이터 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| RSI + StochasticK | 둘 다 0-100 범위 과매수/과매도 오실레이터 |
| RSI + WilliamsR | Williams %R은 Stochastic과 수학적으로 동일 (스케일만 다름: 0~-100) |
| RSI + CCI | CCI도 평균 회귀 기반 오실레이터 |
| StochasticK + StochasticD | D는 K의 이동평균 (완전 종속) |
| RSI + StochRSI | StochRSI는 RSI에 Stochastic 적용 (종속적) |
| RSI + ConnorsRSI | ConnorsRSI는 RSI의 변형 |

**규칙**: 과매수/과매도 오실레이터 중 **최대 1개만** 허용
- 그룹: `RSI, StochasticK, StochasticD, WilliamsR, CCI, CMO, DeMarker, ConnorsRSI, StochRSI`

#### 1.3 MACD 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| MACD + PPO | PPO는 MACD의 퍼센트 버전 (동일 개념) |
| MACD + AwesomeOscillator | AO도 두 MA 차이 기반 |

**규칙**: MACD 계열 중 **최대 1개만** 허용
- 그룹: `MACD, PPO, AwesomeOscillator`

#### 1.4 Aroon 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| AroonUp + AroonDown | 서로 종속적 (Up + Down ≈ 100) |
| AroonUp + AroonOscillator | Oscillator = Up - Down (완전 종속) |
| AroonDown + AroonOscillator | 위와 동일 |

**규칙**: Aroon 중 **최대 1개만** 허용
- 그룹: `AroonUp, AroonDown, AroonOscillator`

#### 1.5 Vortex 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| VortexPlus + VortexMinus | 서로 반대 방향 지표, 크로스로 사용해야 의미 |

**규칙**: Vortex 중 **최대 1개만** 허용 (또는 크로스 신호로만 사용)

#### 1.6 DI 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| PlusDI + MinusDI | ADX 계산의 구성요소, 개별 사용시 불완전 |
| ADX + PlusDI | ADX가 이미 DI 정보를 내포 |
| ADX + MinusDI | 위와 동일 |

**규칙**: ADX/DI 중 **ADX만 허용** 또는 DI 크로스만 허용

#### 1.7 볼린저 밴드 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| BollingerBands + BollingerPercentB | %B는 BB에서 파생 (종속) |
| BollingerBands + BollingerWidth | Width도 BB에서 파생 |
| BollingerPercentB + BollingerWidth | 둘 다 BB 파생, 정보 중복 |
| BollingerBands + SqueezeIndicator | Squeeze도 BB/Keltner 기반 |
| BollingerBands + StandardDeviation | BB가 이미 StdDev 포함 |

**규칙**: 볼린저 계열 중 **최대 1개만** 허용
- 그룹: `BollingerBands, BollingerPercentB, BollingerWidth, SqueezeIndicator`

#### 1.8 OBV/ADL 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| OBV + ADL | 둘 다 거래량 누적 지표, 같은 개념 |
| OBV + ChaikinOscillator | Chaikin Osc는 ADL 기반 |
| ADL + ChaikinOscillator | 종속 관계 |

**규칙**: 거래량 누적 중 **최대 1개만** 허용
- 그룹: `OBV, ADL, ChaikinOscillator`

#### 1.9 Ichimoku 계열 중복
| 금지 조합 | 이유 |
|-----------|------|
| IchimokuTenkan + IchimokuKijun | 개별 사용보다 크로스로 사용해야 의미 |
| IchimokuSenkouA + IchimokuSenkouB | 구름 상단/하단, 함께 사용해야 의미 |
| 모든 Ichimoku 개별 조합 | Ichimoku는 단일 시스템으로 설계됨 |

**규칙**: Ichimoku 중 **1개만 허용** 또는 **전체를 하나의 전략으로** 취급

#### 1.10 변동성 중복
| 금지 조합 | 이유 |
|-----------|------|
| ATR + StandardDeviation | 둘 다 변동성 측정, 목적 동일 |
| ATR + HistoricalVolatility | 동일 개념 다른 계산법 |
| StandardDeviation + HistoricalVolatility | 거의 동일한 값 |
| ATR + ChaikinVolatility | 둘 다 변동성 |
| KeltnerChannel + ATR | Keltner가 ATR 포함 |

**규칙**: 순수 변동성 지표 중 **최대 1개만** 허용
- 그룹: `ATR, StandardDeviation, HistoricalVolatility, ChaikinVolatility`

#### 1.11 채널 지표 중복
| 금지 조합 | 이유 |
|-----------|------|
| KeltnerChannel + DonchianChannel | 둘 다 가격 채널, 유사한 돌파 신호 생성 |
| BollingerBands + KeltnerChannel | 둘 다 밴드 기반, 스퀴즈 외에는 중복 |

**규칙**: 채널 지표 중 **최대 1개만** 허용
- 그룹: `BollingerBands, KeltnerChannel, DonchianChannel`

#### 1.12 Power 지표 중복
| 금지 조합 | 이유 |
|-----------|------|
| BullPower + BearPower | 둘 다 같은 가격 데이터에서 파생, 상관관계 높음 |

**규칙**: Power 지표 중 **최대 1개만** 허용

#### 1.13 회귀 지표 중복
| 금지 조합 | 이유 |
|-----------|------|
| LinearRegressionValue + LinearRegressionSlope | 같은 회귀선에서 파생 |
| RSquared + StandardError | 회귀 적합도의 다른 표현 |
| ChandeForecastOscillator + LinearRegressionValue | CFO는 회귀 기반 |

**규칙**: 회귀 지표 중 **최대 1개만** 허용

#### 1.14 거래량 오실레이터 중복
| 금지 조합 | 이유 |
|-----------|------|
| VolumeOscillator + KlingerOscillator | 둘 다 거래량 모멘텀 |
| VolumeOscillator + ChaikinOscillator | 유사 개념 |

**규칙**: 거래량 오실레이터 중 **최대 1개만** 허용

#### 1.15 캔들 방향 지표 중복
| 금지 조합 | 이유 |
|-----------|------|
| HeikinAshiTrend + BalanceOfPower | 둘 다 캔들 방향성 측정 |
| BalanceOfPower + Qstick | 유사한 바디 기반 계산 |

**규칙**: 캔들 방향 지표 중 **최대 1개만** 허용

---

### 2. 논리적 충돌 (Logical Conflicts)

#### 2.1 추세추종 + 평균회귀 충돌
| 금지 조합 | 이유 |
|-----------|------|
| EMA(price_above) + RSI(oversold) | 가격이 EMA 위 = 상승 추세, RSI 과매도 = 하락 국면. 모순 |
| MACD(golden_cross) + BollingerBands(touch_lower) | 골든크로스 = 상승 시작, 하단 터치 = 하락 극단. 동시 발생 불가 |
| ADX(strong_trend) + ZScore(극값) | 강한 추세 ↔ 평균 회귀 기대는 상반됨 |

**규칙**: 전략 유형을 `추세추종` 또는 `평균회귀` 중 하나로 지정하고 혼합 금지

#### 2.2 변동성 방향 없음 문제
| 금지 조합 | 이유 |
|-----------|------|
| ATR 단독 | ATR 확대는 상승/하락 모두에서 발생. 방향 정보 없음 |
| StandardDeviation 단독 | 위와 동일 |
| HistoricalVolatility 단독 | 위와 동일 |

**규칙**: 변동성 지표는 **반드시 방향 지표(추세/모멘텀)와 함께** 사용

#### 2.3 상반된 신호 동시 사용
| 금지 조합 | 이유 |
|-----------|------|
| Buy: RSI < 30 + Sell: RSI > 70 (같은 전략 내) | 논리적으로 맞지만, 다른 조건과 조합 시 충돌 가능 |
| Buy: price_above_EMA + Buy: price_below_EMA | 동시 만족 불가 |

---

### 3. 수학적 종속 (Mathematical Dependency)

#### 3.1 파생 지표
| 금지 조합 | 이유 |
|-----------|------|
| StochasticK + StochasticD | D = SMA(K), 완전 종속 |
| MACD(line) + MACD(signal) | signal = EMA(line) |
| BullPower + BearPower | 같은 가격 데이터에서 파생, 상관 높음 |

#### 3.2 동일 데이터 다른 표현
| 금지 조합 | 이유 |
|-----------|------|
| PricePosition + BollingerPercentB | 둘 다 가격의 상대 위치 |
| DistanceFromMA + PriceVsEMA | 개념 동일 |
| PercentRank + ZScore | 비슷한 정보 제공 |

---

### 4. 노이즈 지표 제한

#### 4.1 단독 사용 금지 지표
| 지표 | 이유 |
|------|------|
| ConsecutiveCandles | 연속 양봉/음봉은 노이즈 많음, 확인 신호로만 사용 |
| CandleSizeRatio | 캔들 크기 비율은 변동성 크면 오작동 |
| HigherHighsCount | 패턴 인식용, 단독 신호로 부적합 |
| LowerLowsCount | 위와 동일 |

**규칙**: 이 지표들은 **반드시 다른 지표와 조합**해서만 사용

---

## 📐 적용 후 경우의 수 (실제 계산)

### 원본 (88개 지표)
| 조합 수 | 경우의 수 |
|---------|-----------|
| 2개 조합 | 3,828 |
| 3개 조합 | 109,736 |

### 규칙 적용 후 (그룹 중복 제거)
| 조합 수 | 유효 | 제거율 |
|---------|------|--------|
| 2개 조합 | **3,667** | 4.2% |
| 3개 조합 | **96,476** | 12.1% |

### signals × periods 포함 시
| 구분 | 원본 | 규칙 적용 후 (예상) |
|------|------|---------------------|
| Buy 조건 | 311 | ~250 |
| Sell 조건 | 344 | ~280 |
| 1개 조합 | 106,984 | ~70,000 |
| 2개 조합 | 28억 | ~15억 |
| 3개 조합 | 33조 | ~18조 |

→ 그룹 중복 제거만으로는 부족. **유전 알고리즘** 또는 **그리디 방식** 필수

---

## 🏷️ 지표 그룹 정의 (코드용)

```javascript
const INDICATOR_GROUPS = {
    // 같은 그룹 내 지표는 최대 1개만 허용
    moving_averages: ['SMA', 'EMA', 'WMA', 'DEMA', 'HMA', 'VWMA', 'McGinleyDynamic', 'GuppyShort', 'GuppyLong', 'GuppySeparation'],
    oscillators: ['RSI', 'StochasticK', 'StochasticD', 'WilliamsR', 'CCI', 'CMO', 'DeMarker', 'ConnorsRSI', 'StochRSI', 'UltimateOscillator'],
    macd_family: ['MACD', 'PPO', 'AwesomeOscillator'],
    aroon_family: ['AroonUp', 'AroonDown', 'AroonOscillator'],
    vortex_family: ['VortexPlus', 'VortexMinus'],
    di_family: ['ADX', 'PlusDI', 'MinusDI'],
    bollinger_family: ['BollingerBands', 'BollingerPercentB', 'BollingerWidth', 'SqueezeIndicator', 'StandardDeviation'],
    volume_accumulation: ['OBV', 'ADL', 'ChaikinOscillator'],
    ichimoku_family: ['IchimokuTenkan', 'IchimokuKijun', 'IchimokuSenkouA', 'IchimokuSenkouB'],
    volatility_pure: ['ATR', 'StandardDeviation', 'HistoricalVolatility', 'ChaikinVolatility'],
    price_position: ['PricePosition', 'DistanceFromMA', 'PriceVsEMA', 'PercentRank', 'ZScore', 'BollingerPercentB'],
    channel_family: ['KeltnerChannel', 'DonchianChannel'],  // 둘 다 채널, 하나만 사용
    power_family: ['BullPower', 'BearPower'],  // 종속 관계
    regression_family: ['LinearRegressionValue', 'LinearRegressionSlope', 'RSquared', 'StandardError', 'ChandeForecastOscillator'],
    volume_oscillator: ['VolumeOscillator', 'KlingerOscillator', 'ChaikinOscillator'],  // 거래량 오실레이터
    candle_pattern: ['HeikinAshiTrend', 'BalanceOfPower', 'Qstick'],  // 캔들 방향 지표
    
    // 단독 사용 금지 (반드시 다른 지표와 조합)
    noise_indicators: ['ConsecutiveCandles', 'CandleSizeRatio', 'HigherHighsCount', 'LowerLowsCount', 'BullishRatio'],
    
    // 반드시 방향 지표와 함께 사용
    direction_required: ['ATR', 'StandardDeviation', 'HistoricalVolatility', 'ChaikinVolatility', 'BollingerWidth', 'VolumeRatio']
};
```

---

## ✅ 추천 3개 조합 (실효성 검증)

> 각 조합은 **서로 다른 정보**를 제공하고, **논리적으로 일관**되며, **실무에서 검증**된 패턴 기반

### 🔵 추세추종형 (Trend Following)

| 조합 | 역할 분배 | 추천 이유 |
|------|-----------|-----------|
| **EMA + MACD + ADX** | 추세방향 + 모멘텀 + 추세강도 | ⭐ 클래식 조합. EMA로 방향, MACD로 진입타이밍, ADX로 추세 유효성 확인 |
| **DonchianChannel + ADX + ForceIndex** | 돌파 + 추세강도 + 거래량모멘텀 | 터틀 트레이딩 스타일. 신고가 돌파 + 강한 추세 + 거래량 확인 |
| **HMA + MACD + CMF** | 빠른추세 + 모멘텀 + 자금흐름 | HMA의 빠른 반응 + MACD 확인 + 스마트머니 방향 |
| **SMA + PPO + OBV** | 추세 + %모멘텀 + 누적거래량 | 클래식. PPO는 MACD 퍼센트 버전으로 비교 용이 |
| **KeltnerChannel + ADX + VolumeOscillator** | 채널돌파 + 추세강도 + 거래량변화 | 채널 상단 돌파 + 강한 추세 + 거래량 증가 확인 |
| **AroonOscillator + Momentum + CMF** | 추세강도 + 모멘텀 + 자금흐름 | Aroon으로 신고/신저 추적, Momentum으로 가속도, CMF로 확인 |
| **VWMA + ROC + CMF** | 거래량가중추세 + 변화율 + 자금흐름 | 거래량 중심 추세 전략. 기관 매집 감지에 유리 |

### 🟢 평균회귀형 (Mean Reversion)

| 조합 | 역할 분배 | 추천 이유 |
|------|-----------|-----------|
| **BollingerBands + RSI + MFI** | 가격극단 + 과매도 + 자금흐름 | ⭐ 클래식. BB하단 + RSI<30 + MFI 자금유입 = 강한 반등 신호 |
| **ZScore + RSI + CMF** | 통계극단 + 과매도 + 자금흐름 | 2σ 이상 이탈 + RSI 확인 + 자금유입. 통계적 근거 명확 |
| **KeltnerChannel + CCI + MFI** | 채널극단 + 오실레이터 + 자금흐름 | Keltner 하단 + CCI<-100 + MFI 상승. BB보다 노이즈 적음 |
| **PricePosition + StochRSI + MFI** | 가격위치 + 이중오실레이터 + 자금흐름 | 저점 구간 + StochRSI 민감한 과매도 + 자금확인 |
| **DistanceFromMA + CMO + VolumeRatio** | MA이격도 + 오실레이터 + 거래량비율 | 이격 과다 + CMO 과매도 + 거래량 급증 = 반등 |
| **DonchianChannel + WilliamsR + OBV** | 채널위치 + 과매도 + 누적거래량 | 채널 하단 근처 + Williams 과매도 + OBV 상승전환 |

### 🟡 변동성 돌파형 (Volatility Breakout)

| 조합 | 역할 분배 | 추천 이유 |
|------|-----------|-----------|
| **ATR + ADX + DonchianChannel** | 변동성 + 추세강도 + 돌파 | ⭐ ATR 확대 + ADX 상승 + 신고가 = 강한 돌파. 클래식 |
| **SqueezeIndicator + EMA + VolumeRatio** | 스퀴즈해제 + 추세방향 + 거래량 | TTM Squeeze 전략. 압축 후 폭발 + 방향 + 거래량 확인 |
| **BollingerWidth + MACD + VolumeOscillator** | 밴드확장 + 모멘텀 + 거래량변화 | 스퀴즈 해제 감지 + MACD 방향 + 거래량 증가 |
| **ChaikinVolatility + MACD + DonchianChannel** | 변동성변화 + 모멘텀 + 돌파 | Chaikin Vol 급등 + MACD 골든 + 신고가 |
| **StandardDeviation + EMA + VolumeRatio** | 변동성 + 추세 + 거래량 | StdDev 저점→확대 + EMA 상향 + 거래량 동반 |

### 🟠 거래량 확인형 (Volume Confirmation)

| 조합 | 역할 분배 | 추천 이유 |
|------|-----------|-----------|
| **EMA + RSI + CMF** | 추세 + 모멘텀 + 자금흐름 | ⭐ 기본이자 강력함. 방향 + 타이밍 + 스마트머니 |
| **ADX + OBV + VolumeRatio** | 추세강도 + 누적거래량 + 상대거래량 | 추세 유효 + 장기 매집 + 단기 거래량 급증 |
| **SMA + MACD + ForceIndex** | 추세 + 모멘텀 + 거래량모멘텀 | Force Index가 가격×거래량 모멘텀 제공 |
| **HMA + PPO + VWAP** | 빠른추세 + 모멘텀 + 거래량가중가격 | VWAP 위 = 매수세 우위, HMA+PPO로 타이밍 |
| **DonchianChannel + MACD + KlingerOscillator** | 돌파 + 모멘텀 + 거래량오실레이터 | Klinger가 장단기 거래량 흐름 비교 |

### 🟣 회귀/통계형 (Regression/Statistical)

| 조합 | 역할 분배 | 추천 이유 |
|------|-----------|-----------|
| **LinearRegressionSlope + RSI + VolumeRatio** | 회귀기울기 + 오실레이터 + 거래량 | LR Slope 양전환 + RSI 상승 + 거래량 = 추세 시작 |
| **ChandeForecastOscillator + CMO + CMF** | 회귀예측 + 오실레이터 + 자금흐름 | CFO가 실제가격 vs 예측가격 괴리, CMO/CMF로 확인 |

### ⚠️ 효과 의문 (제외)

| 조합 | 제외 이유 |
|------|-----------|
| McGinleyDynamic + TRIX + MFI | TRIX가 너무 느림 (3중 EMA). 신호 지연 심함 |
| GuppyLong + MACD + VolumeRatio | Guppy가 이미 다중 MA, MACD와 정보 중복 |
| RSquared + MACD + OBV | R²는 추세 "적합도"일 뿐, 방향/타이밍 신호 아님 |
| StandardError + EMA + VolumeRatio | StdErr는 신뢰구간용, 트레이딩 신호로 부적합 |
| ADX + Qstick + MACD | Qstick 신뢰도 낮음 (단순 body 평균) |
| DonchianChannel + BullishRatio + MFI | BullishRatio 노이즈 많음, 확인 신호로만 사용해야 |
| VortexPlus + MACD + VolumeRatio | VortexPlus 단독은 불완전 (Minus와 함께 사용해야) |

---

## ❌ 불합리한 조합 예시 (제외)

### 동일 계열 중복 (정보 중복)
| 조합 | 이유 | 상태 |
|------|------|------|
| SMA + EMA | 둘 다 가격 평활화, 같은 신호 | ❌ 제외 |
| SMA + GuppyShort | Guppy도 다중 EMA 기반 | ❌ 제외 |
| SMA + GuppyLong | 위와 동일 | ❌ 제외 |
| RSI + StochasticK | 둘 다 과매수/과매도 오실레이터 | ❌ 제외 |
| RSI + WilliamsR | Williams = Stochastic 역스케일 | ❌ 제외 |
| RSI + CCI | CCI도 평균회귀 오실레이터 | ❌ 제외 |
| MACD + PPO | PPO = MACD 퍼센트 버전 | ❌ 제외 |
| MACD + AwesomeOscillator | AO도 두 MA 차이 | ❌ 제외 |
| BollingerBands + BollingerPercentB | %B는 BB 파생 | ❌ 제외 |
| BollingerBands + StandardDeviation | BB가 StdDev 포함 | ❌ 제외 |
| OBV + ADL | 둘 다 거래량 누적 | ❌ 제외 |
| AroonUp + AroonDown | 서로 종속 (Up + Down ≈ 100) | ❌ 제외 |
| ADX + PlusDI | ADX가 DI 정보 내포 | ❌ 제외 |
| KeltnerChannel + ATR | Keltner가 ATR 사용 | ❌ 제외 |

### 3개 조합 - 불합리
| 조합 | 이유 | 상태 |
|------|------|------|
| SMA + EMA + WMA | 이동평균 3개 = 완전 중복 | ❌ 제외 |
| RSI + StochasticK + CCI | 오실레이터 3개 = 중복 | ❌ 제외 |
| SMA + GuppyShort + RSI | MA 2개 포함 | ❌ 제외 |
| BollingerBands + BollingerPercentB + RSI | BB 2개 포함 | ❌ 제외 |
| ConsecutiveCandles + CandleSizeRatio + HigherHighsCount | 노이즈 지표만 3개 | ❌ 제외 |

### 방향성 없는 단독 사용
| 조합 | 이유 | 상태 |
|------|------|------|
| ATR 단독 | 변동성만, 방향 정보 없음 | ❌ 제외 |
| StandardDeviation 단독 | 위와 동일 | ❌ 제외 |
| VolumeRatio 단독 | 거래량만, 방향 없음 | ❌ 제외 |
| BollingerWidth 단독 | 밴드폭만, 방향 없음 | ❌ 제외 |

---

## 📝 다음 단계

1. 위 규칙을 코드로 구현 (`strategy-validator.js`)
2. 유효한 조합만 생성하는 제너레이터 작성
3. 유전 알고리즘 또는 그리디 방식으로 최적화
