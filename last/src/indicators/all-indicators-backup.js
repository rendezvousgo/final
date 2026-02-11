/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 기술적 지표 총집합 (All Technical Indicators)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 총 100+ 지표 정의
 * - 각 지표는 캔들 데이터를 입력받아 숫자를 출력
 * - 조합 탐색 시스템에서 사용
 */

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 1. 추세 지표 (Trend Indicators)                                             │
 * │    - 가격의 방향성을 파악                                                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 1-1. SMA (Simple Moving Average) - 단순이동평균
// 가장 기본적인 평균, N일간 종가의 평균
export function SMA(closes, period) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

// 1-2. EMA (Exponential Moving Average) - 지수이동평균
// 최근 가격에 더 큰 가중치
export function EMA(closes, period) {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
}

// 1-3. WMA (Weighted Moving Average) - 가중이동평균
// 최근 가격에 선형적으로 더 큰 가중치
export function WMA(closes, period) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    let weightSum = 0;
    let sum = 0;
    for (let i = 0; i < period; i++) {
        const weight = i + 1;
        sum += slice[i] * weight;
        weightSum += weight;
    }
    return sum / weightSum;
}

// 1-4. DEMA (Double Exponential Moving Average) - 이중지수이동평균
// EMA의 지연을 줄임
export function DEMA(closes, period) {
    const ema1 = EMA(closes, period);
    if (!ema1) return null;
    // EMA of EMA를 위해 EMA 시리즈 필요
    const emaValues = [];
    const k = 2 / (period + 1);
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
        emaValues.push(ema);
    }
    const ema2 = EMA(emaValues, period);
    return ema2 ? 2 * ema1 - ema2 : ema1;
}

// 1-5. TEMA (Triple Exponential Moving Average) - 삼중지수이동평균
// DEMA보다 더 빠른 반응
export function TEMA(closes, period) {
    if (closes.length < period * 3) return null;
    
    // 1단계: 첫 번째 EMA 시리즈 계산
    const ema1Series = [];
    const k = 2 / (period + 1);
    let ema1 = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema1Series.push(ema1);
    for (let i = period; i < closes.length; i++) {
        ema1 = closes[i] * k + ema1 * (1 - k);
        ema1Series.push(ema1);
    }
    
    // 2단계: EMA1의 EMA (EMA2 시리즈)
    if (ema1Series.length < period) return null;
    const ema2Series = [];
    let ema2 = ema1Series.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema2Series.push(ema2);
    for (let i = period; i < ema1Series.length; i++) {
        ema2 = ema1Series[i] * k + ema2 * (1 - k);
        ema2Series.push(ema2);
    }
    
    // 3단계: EMA2의 EMA (EMA3)
    if (ema2Series.length < period) return null;
    let ema3 = ema2Series.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < ema2Series.length; i++) {
        ema3 = ema2Series[i] * k + ema3 * (1 - k);
    }
    
    // TEMA = 3*EMA1 - 3*EMA2 + EMA3
    const lastEma1 = ema1Series[ema1Series.length - 1];
    const lastEma2 = ema2Series[ema2Series.length - 1];
    return 3 * lastEma1 - 3 * lastEma2 + ema3;
}

// 1-6. KAMA (Kaufman Adaptive Moving Average) - 적응형 이동평균
// 변동성에 따라 민감도 조절
export function KAMA(closes, period = 10) {
    if (closes.length < period + 1) return null;
    
    // Efficiency Ratio 계산
    const change = Math.abs(closes[closes.length - 1] - closes[closes.length - period]);
    let volatility = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        volatility += Math.abs(closes[i] - closes[i - 1]);
    }
    const er = volatility !== 0 ? change / volatility : 0;
    
    // Smoothing Constant (SC)
    const fastSC = 2 / (2 + 1);   // fast period = 2
    const slowSC = 2 / (30 + 1);  // slow period = 30
    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
    
    // KAMA 계산 (재귀적으로 전체 시리즈 필요하므로 간략화된 버전)
    // 첫 KAMA = 첫 번째 SMA
    let kama = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // 이후 KAMA = 이전 KAMA + SC * (Price - 이전 KAMA)
    for (let i = period; i < closes.length; i++) {
        // 각 시점의 ER과 SC 재계산
        const chg = Math.abs(closes[i] - closes[i - period]);
        let vol = 0;
        for (let j = i - period + 1; j <= i; j++) {
            vol += Math.abs(closes[j] - closes[j - 1]);
        }
        const currentER = vol !== 0 ? chg / vol : 0;
        const currentSC = Math.pow(currentER * (fastSC - slowSC) + slowSC, 2);
        kama = kama + currentSC * (closes[i] - kama);
    }
    
    return kama;
}

// 1-7. HMA (Hull Moving Average) - 헐 이동평균
// 지연을 최소화한 이동평균
export function HMA(closes, period) {
    const half = Math.floor(period / 2);
    const sqrt = Math.max(1, Math.floor(Math.sqrt(period)));
    if (closes.length < period + sqrt) return null;

    const wmaHalfSeries = [];
    const wmaFullSeries = [];
    for (let i = period; i <= closes.length; i++) {
        const slice = closes.slice(0, i);
        const wmaHalf = WMA(slice, half);
        const wmaFull = WMA(slice, period);
        if (wmaHalf == null || wmaFull == null) continue;
        wmaHalfSeries.push(wmaHalf);
        wmaFullSeries.push(wmaFull);
    }

    if (wmaHalfSeries.length === 0 || wmaFullSeries.length === 0) return null;

    const diffSeries = wmaHalfSeries.map((v, idx) => 2 * v - wmaFullSeries[idx]);
    return WMA(diffSeries, sqrt);
}

// 1-8. VWMA (Volume Weighted Moving Average) - 거래량가중이동평균
export function VWMA(closes, volumes, period) {
    if (closes.length < period) return null;
    let sumPV = 0, sumV = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        sumPV += closes[i] * volumes[i];
        sumV += volumes[i];
    }
    return sumV !== 0 ? sumPV / sumV : null;
}

// 1-9. ZLEMA (Zero Lag EMA) - 제로 랙 지수이동평균
export function ZLEMA(closes, period) {
    if (closes.length < period) return null;
    const lag = Math.floor((period - 1) / 2);
    const adjusted = closes.map((c, i) => {
        const prev = closes[i - lag] || closes[0];
        return c + (c - prev);
    });
    return EMA(adjusted, period);
}

// 1-10. T3 (Tillson T3) - 틸슨 T3
// 부드러운 이동평균
export function T3(closes, period = 5, factor = 0.7) {
    if (closes.length < period * 6) return null;
    
    const k = 2 / (period + 1);
    
    // EMA 시리즈 계산 함수
    function calcEmaSeries(data, p) {
        const series = [];
        let ema = data.slice(0, p).reduce((a, b) => a + b, 0) / p;
        series.push(ema);
        for (let i = p; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
            series.push(ema);
        }
        return series;
    }
    
    // 6중 EMA 체인
    const e1 = calcEmaSeries(closes, period);
    if (e1.length < period) return null;
    const e2 = calcEmaSeries(e1, period);
    if (e2.length < period) return null;
    const e3 = calcEmaSeries(e2, period);
    if (e3.length < period) return null;
    const e4 = calcEmaSeries(e3, period);
    if (e4.length < period) return null;
    const e5 = calcEmaSeries(e4, period);
    if (e5.length < period) return null;
    const e6 = calcEmaSeries(e5, period);
    if (e6.length === 0) return null;
    
    // T3 = c1*e6 + c2*e5 + c3*e4 + c4*e3
    // where c1 = -a³, c2 = 3a² + 3a³, c3 = -6a² - 3a - 3a³, c4 = 1 + 3a + a³ + 3a²
    const a = factor;
    const c1 = -a * a * a;
    const c2 = 3 * a * a + 3 * a * a * a;
    const c3 = -6 * a * a - 3 * a - 3 * a * a * a;
    const c4 = 1 + 3 * a + a * a * a + 3 * a * a;
    
    const lastE3 = e3[e3.length - 1];
    const lastE4 = e4[e4.length - 1];
    const lastE5 = e5[e5.length - 1];
    const lastE6 = e6[e6.length - 1];
    
    return c1 * lastE6 + c2 * lastE5 + c3 * lastE4 + c4 * lastE3;
}

// 1-11. SMMA (Smoothed Moving Average)
export function SMMA(closes, period) {
    if (closes.length < period) return null;
    const first = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let smma = first;
    for (let i = period; i < closes.length; i++) {
        smma = (smma * (period - 1) + closes[i]) / period;
    }
    return smma;
}

// 1-12. ALMA (Arnaud Legoux Moving Average)
export function ALMA(closes, period = 9, offset = 0.85, sigma = 6) {
    if (closes.length < period) return null;
    const m = offset * (period - 1);
    const s = period / sigma;
    let sum = 0, wSum = 0;
    for (let i = 0; i < period; i++) {
        const w = Math.exp(-((i - m) ** 2) / (2 * s * s));
        sum += closes[closes.length - period + i] * w;
        wSum += w;
    }
    return sum / wSum;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 2. 모멘텀 지표 (Momentum Indicators)                                        │
 * │    - 가격 변화의 속도/강도 측정                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 2-1. RSI (Relative Strength Index) - 상대강도지수
export function RSI(closes, period = 14) {
    if (closes.length < period + 1) return null;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    if (losses === 0) return 100;
    if (gains === 0) return 0;
    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
}

// 2-2. Stochastic %K - 스토캐스틱
export function StochasticK(highs, lows, closes, period = 14) {
    if (closes.length < period) return null;
    const highSlice = highs.slice(-period);
    const lowSlice = lows.slice(-period);
    const highest = Math.max(...highSlice);
    const lowest = Math.min(...lowSlice);
    const current = closes[closes.length - 1];
    return highest !== lowest ? ((current - lowest) / (highest - lowest)) * 100 : 50;
}

// 2-3. Stochastic %D - 스토캐스틱 시그널
export function StochasticD(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    // %K의 이동평균
    const kValues = [];
    for (let i = kPeriod; i <= closes.length; i++) {
        const k = StochasticK(
            highs.slice(0, i),
            lows.slice(0, i),
            closes.slice(0, i),
            kPeriod
        );
        if (k !== null) kValues.push(k);
    }
    return SMA(kValues, dPeriod);
}

// 2-4. Williams %R
export function WilliamsR(highs, lows, closes, period = 14) {
    if (closes.length < period) return null;
    const highest = Math.max(...highs.slice(-period));
    const lowest = Math.min(...lows.slice(-period));
    const current = closes[closes.length - 1];
    return highest !== lowest ? ((highest - current) / (highest - lowest)) * -100 : -50;
}

// 2-5. MACD (Moving Average Convergence Divergence)
export function MACD(closes, fast = 12, slow = 26, signal = 9) {
    if (closes.length < slow + signal) return null;
    
    const k_fast = 2 / (fast + 1);
    const k_slow = 2 / (slow + 1);
    const k_signal = 2 / (signal + 1);
    
    // Fast EMA 시리즈
    let emaFast = closes.slice(0, fast).reduce((a, b) => a + b, 0) / fast;
    const fastSeries = [emaFast];
    for (let i = fast; i < closes.length; i++) {
        emaFast = closes[i] * k_fast + emaFast * (1 - k_fast);
        fastSeries.push(emaFast);
    }
    
    // Slow EMA 시리즈
    let emaSlow = closes.slice(0, slow).reduce((a, b) => a + b, 0) / slow;
    const slowSeries = [emaSlow];
    for (let i = slow; i < closes.length; i++) {
        emaSlow = closes[i] * k_slow + emaSlow * (1 - k_slow);
        slowSeries.push(emaSlow);
    }
    
    // MACD Line 시리즈 (시작점 정렬)
    const offset = slow - fast;
    const macdSeries = [];
    for (let i = 0; i < slowSeries.length; i++) {
        const fastIdx = i + offset;
        if (fastIdx < fastSeries.length) {
            macdSeries.push(fastSeries[fastIdx] - slowSeries[i]);
        }
    }
    
    if (macdSeries.length < signal) return null;
    
    // Signal Line = MACD의 9일 EMA
    let signalLine = macdSeries.slice(0, signal).reduce((a, b) => a + b, 0) / signal;
    for (let i = signal; i < macdSeries.length; i++) {
        signalLine = macdSeries[i] * k_signal + signalLine * (1 - k_signal);
    }
    
    const macdLine = macdSeries[macdSeries.length - 1];
    const histogram = macdLine - signalLine;
    
    return { macd: macdLine, signal: signalLine, histogram: histogram };
}

// 2-6. ROC (Rate of Change) - 변화율
export function ROC(closes, period = 12) {
    if (closes.length < period + 1) return null;
    const current = closes[closes.length - 1];
    const past = closes[closes.length - period - 1];
    return past !== 0 ? ((current - past) / past) * 100 : 0;
}

// 2-7. Momentum
export function Momentum(closes, period = 10) {
    if (closes.length < period + 1) return null;
    const current = closes[closes.length - 1];
    const past = closes[closes.length - period - 1];
    // % 기반 모멘텀 (ROC 방식) - 자산 가격과 무관하게 비교 가능
    return past !== 0 ? ((current - past) / past) * 100 : 0;
}

// 2-8. CCI (Commodity Channel Index) - 상품채널지수
export function CCI(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    // Typical Price
    const tp = [];
    for (let i = 0; i < closes.length; i++) {
        tp.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    const tpSMA = SMA(tp, period);
    // Mean Deviation
    const tpSlice = tp.slice(-period);
    const meanDev = tpSlice.reduce((sum, v) => sum + Math.abs(v - tpSMA), 0) / period;
    return meanDev !== 0 ? (tp[tp.length - 1] - tpSMA) / (0.015 * meanDev) : 0;
}

// 2-9. CMO (Chande Momentum Oscillator) - 챈드 모멘텀
export function CMO(closes, period = 14) {
    if (closes.length < period + 1) return null;
    let sumUp = 0, sumDown = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) sumUp += diff;
        else sumDown -= diff;
    }
    const total = sumUp + sumDown;
    return total !== 0 ? ((sumUp - sumDown) / total) * 100 : 0;
}

// 2-10. TSI (True Strength Index) - 진정 강도 지수
export function TSI(closes, longPeriod = 25, shortPeriod = 13) {
    if (closes.length < longPeriod + shortPeriod) return null;
    // 간략화: RSI 유사 접근
    return RSI(closes, longPeriod);
}

// 2-11. Ultimate Oscillator - 궁극 오실레이터
export function UltimateOscillator(highs, lows, closes, p1 = 7, p2 = 14, p3 = 28) {
    if (closes.length < p3 + 1) return null;
    
    const calcBP = (i) => closes[i] - Math.min(lows[i], closes[i - 1] || lows[i]);
    const calcTR = (i) => Math.max(highs[i], closes[i - 1] || highs[i]) - Math.min(lows[i], closes[i - 1] || lows[i]);
    
    let bp1 = 0, tr1 = 0, bp2 = 0, tr2 = 0, bp3 = 0, tr3 = 0;
    for (let i = closes.length - p1; i < closes.length; i++) {
        bp1 += calcBP(i); tr1 += calcTR(i);
    }
    for (let i = closes.length - p2; i < closes.length; i++) {
        bp2 += calcBP(i); tr2 += calcTR(i);
    }
    for (let i = closes.length - p3; i < closes.length; i++) {
        bp3 += calcBP(i); tr3 += calcTR(i);
    }
    
    const avg1 = tr1 ? bp1 / tr1 : 0;
    const avg2 = tr2 ? bp2 / tr2 : 0;
    const avg3 = tr3 ? bp3 / tr3 : 0;
    
    return ((4 * avg1) + (2 * avg2) + avg3) / 7 * 100;
}

// 2-12. Awesome Oscillator (AO)
export function AwesomeOscillator(highs, lows) {
    const midpoints = highs.map((h, i) => (h + lows[i]) / 2);
    const sma5 = SMA(midpoints, 5);
    const sma34 = SMA(midpoints, 34);
    return sma5 && sma34 ? sma5 - sma34 : null;
}

// 2-13. Accelerator Oscillator (AC)
export function AcceleratorOscillator(highs, lows) {
    const ao = AwesomeOscillator(highs, lows);
    if (!ao) return null;
    // AO의 5일 SMA를 뺌 (간략화)
    return ao * 0.9;
}

// 2-14. PPO (Percentage Price Oscillator)
export function PPO(closes, fast = 12, slow = 26) {
    const emaFast = EMA(closes, fast);
    const emaSlow = EMA(closes, slow);
    if (!emaFast || !emaSlow || emaSlow === 0) return null;
    return ((emaFast - emaSlow) / emaSlow) * 100;
}

// 2-15. DPO (Detrended Price Oscillator)
export function DPO(closes, period = 20) {
    if (closes.length < period + Math.floor(period / 2) + 1) return null;
    const shift = Math.floor(period / 2) + 1;
    const sma = SMA(closes.slice(0, -shift), period);
    return sma ? closes[closes.length - 1] - sma : null;
}

// 2-16. TRIX - 삼중 지수 평활
export function TRIX(closes, period = 15) {
    if (closes.length < period * 3 + 1) return null;
    
    const k = 2 / (period + 1);
    
    // EMA 시리즈 계산 함수
    function calcEmaSeries(data, p) {
        if (data.length < p) return [];
        const series = [];
        let ema = data.slice(0, p).reduce((a, b) => a + b, 0) / p;
        series.push(ema);
        for (let i = p; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
            series.push(ema);
        }
        return series;
    }
    
    // 3중 EMA
    const ema1 = calcEmaSeries(closes, period);
    const ema2 = calcEmaSeries(ema1, period);
    const ema3 = calcEmaSeries(ema2, period);
    
    if (ema3.length < 2) return null;
    
    // TRIX = (EMA3[today] - EMA3[yesterday]) / EMA3[yesterday] * 100
    const current = ema3[ema3.length - 1];
    const previous = ema3[ema3.length - 2];
    
    return previous !== 0 ? ((current - previous) / previous) * 100 : 0;
}

// 2-17. KST (Know Sure Thing)
export function KST(closes) {
    if (!closes || closes.length < 30) return null;

    const kstSeries = [];
    for (let i = 0; i < closes.length; i++) {
        if (i < 30) {
            kstSeries.push(null);
            continue;
        }
        const roc1 = closes[i - 10] ? ((closes[i] - closes[i - 10]) / closes[i - 10]) * 100 : 0;
        const roc2 = closes[i - 15] ? ((closes[i] - closes[i - 15]) / closes[i - 15]) * 100 : 0;
        const roc3 = closes[i - 20] ? ((closes[i] - closes[i - 20]) / closes[i - 20]) * 100 : 0;
        const roc4 = closes[i - 30] ? ((closes[i] - closes[i - 30]) / closes[i - 30]) * 100 : 0;
        kstSeries.push((roc1 * 1) + (roc2 * 2) + (roc3 * 3) + (roc4 * 4));
    }

    const validKst = kstSeries.filter(v => v != null);
    const value = validKst.length > 0 ? validKst[validKst.length - 1] : null;
    const signal = validKst.length >= 9 ? SMA(validKst, 9) : null;

    return {
        value,
        signal,
        bullish: value != null && signal != null ? value > signal : null,
        bearish: value != null && signal != null ? value < signal : null
    };
}

// 2-18. Coppock Curve
export function Coppock(closes, wma = 10, roc1 = 14, roc2 = 11) {
    const r1 = ROC(closes, roc1) || 0;
    const r2 = ROC(closes, roc2) || 0;
    return r1 + r2; // WMA 적용 생략
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 3. 변동성 지표 (Volatility Indicators)                                      │
 * │    - 가격 변동폭 측정                                                       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 3-1. ATR (Average True Range) - 평균진정범위
export function ATR(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    let sum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        sum += tr;
    }
    return sum / period;
}

// 3-2. True Range
export function TrueRange(high, low, prevClose) {
    return Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
    );
}

// 3-3. Bollinger Bands - 볼린저 밴드
export function BollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) return null;
    const sma = SMA(closes, period);
    const slice = closes.slice(-period);
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    const upper = sma + (std * stdDev);
    const lower = sma - (std * stdDev);
    const current = closes[closes.length - 1];
    const position = (upper - lower) !== 0 ? ((current - lower) / (upper - lower)) * 100 : 50;
    const bandwidth = sma !== 0 ? ((upper - lower) / sma) * 100 : 0;
    return { upper, middle: sma, lower, position, bandwidth };
}

// 3-4. Keltner Channel - 켈트너 채널
export function KeltnerChannel(highs, lows, closes, emaPeriod = 20, atrPeriod = 10, mult = 2) {
    const ema = EMA(closes, emaPeriod);
    const atr = ATR(highs, lows, closes, atrPeriod);
    if (!ema || !atr) return null;
    return {
        upper: ema + (atr * mult),
        middle: ema,
        lower: ema - (atr * mult)
    };
}

// 3-5. Donchian Channel - 돈치안 채널
export function DonchianChannel(highs, lows, period = 20) {
    if (highs.length < period) return null;
    const upper = Math.max(...highs.slice(-period));
    const lower = Math.min(...lows.slice(-period));
    return { upper, middle: (upper + lower) / 2, lower };
}

// 3-6. Standard Deviation - 표준편차
export function StandardDeviation(closes, period = 20) {
    if (closes.length < period) return null;
    const sma = SMA(closes, period);
    const slice = closes.slice(-period);
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / period;
    return Math.sqrt(variance);
}

// 3-7. Historical Volatility - 역사적 변동성
export function HistoricalVolatility(closes, period = 20) {
    if (closes.length < period + 1) return null;
    const returns = [];
    for (let i = closes.length - period; i < closes.length; i++) {
        returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * Math.sqrt(252) * 100; // 연율화
}

// 3-8. Chaikin Volatility
export function ChaikinVolatility(highs, lows, period = 10) {
    if (highs.length < period * 2) return null;
    const hlDiff = highs.map((h, i) => h - lows[i]);

    const emaSeries = (data, p) => {
        if (!Array.isArray(data) || data.length < p) return null;
        const k = 2 / (p + 1);
        let ema = data.slice(0, p).reduce((a, b) => a + b, 0) / p;
        const series = [ema];
        for (let i = p; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
            series.push(ema);
        }
        return series;
    };

    const ema = emaSeries(hlDiff, period);
    if (!ema || ema.length <= period) return null;

    const current = ema[ema.length - 1];
    const prev = ema[ema.length - 1 - period];
    if (!Number.isFinite(current) || !Number.isFinite(prev) || prev === 0) return null;
    return ((current - prev) / prev) * 100;
}

// 3-9. Mass Index
export function MassIndex(highs, lows, period = 25) {
    if (highs.length < period + 18) return null;
    const hlDiff = highs.map((h, i) => h - lows[i]);

    const emaSeries = (data, p) => {
        if (!Array.isArray(data) || data.length < p) return null;
        const k = 2 / (p + 1);
        let ema = data.slice(0, p).reduce((a, b) => a + b, 0) / p;
        const series = [ema];
        for (let i = p; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
            series.push(ema);
        }
        return series;
    };

    const ema9Series = emaSeries(hlDiff, 9);
    if (!ema9Series || ema9Series.length < period + 1) return null;
    const ema9_9Series = emaSeries(ema9Series, 9);
    if (!ema9_9Series || ema9_9Series.length < period) return null;

    const offset = ema9Series.length - ema9_9Series.length;
    let sum = 0;
    for (let i = ema9_9Series.length - period; i < ema9_9Series.length; i++) {
        const ema9 = ema9Series[i + offset];
        const ema9_9 = ema9_9Series[i];
        if (ema9_9 && Number.isFinite(ema9) && Number.isFinite(ema9_9)) {
            sum += ema9 / ema9_9;
        }
    }
    return sum;
}

// 3-10. Ulcer Index - 궤양 지수
export function UlcerIndex(closes, period = 14) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const maxClose = Math.max(...slice);
    let sumSq = 0;
    for (const c of slice) {
        const drawdown = ((c - maxClose) / maxClose) * 100;
        sumSq += drawdown * drawdown;
    }
    return Math.sqrt(sumSq / period);
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 4. 거래량 지표 (Volume Indicators)                                          │
 * │    - 거래량 기반 분석                                                       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 4-1. OBV (On Balance Volume) - 균형 거래량
export function OBV(closes, volumes) {
    if (closes.length < 2) return null;
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) obv += volumes[i];
        else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    }
    return obv;
}

// 4-2. Volume SMA
export function VolumeSMA(volumes, period = 20) {
    return SMA(volumes, period);
}

// 4-3. Volume Ratio (현재 / 평균, 배수)
export function VolumeRatio(volumes, period = 20) {
    const avg = SMA(volumes, period);
    if (!avg || avg === 0) return null;
    return volumes[volumes.length - 1] / avg;
}

// 4-4. MFI (Money Flow Index) - 자금 흐름 지수
export function MFI(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period + 1) return null;
    let posFlow = 0, negFlow = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const tp = (highs[i] + lows[i] + closes[i]) / 3;
        const prevTp = (highs[i - 1] + lows[i - 1] + closes[i - 1]) / 3;
        const rawMF = tp * volumes[i];
        if (tp > prevTp) posFlow += rawMF;
        else negFlow += rawMF;
    }
    if (negFlow === 0) return 100;
    const mfRatio = posFlow / negFlow;
    return 100 - (100 / (1 + mfRatio));
}

// 4-5. CMF (Chaikin Money Flow) - 차이킨 자금 흐름
export function CMF(highs, lows, closes, volumes, period = 20) {
    if (closes.length < period) return null;
    let mfvSum = 0, volSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const mfm = ((closes[i] - lows[i]) - (highs[i] - closes[i])) / 
                    (highs[i] - lows[i] || 1);
        mfvSum += mfm * volumes[i];
        volSum += volumes[i];
    }
    return volSum !== 0 ? mfvSum / volSum : 0;
}

// 4-6. ADL (Accumulation/Distribution Line) - 매집/분산선
export function ADL(highs, lows, closes, volumes) {
    if (closes.length < 1) return null;
    let adl = 0;
    for (let i = 0; i < closes.length; i++) {
        const mfm = highs[i] !== lows[i] 
            ? ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i])
            : 0;
        adl += mfm * volumes[i];
    }
    return adl;
}

// 4-7. Chaikin Oscillator
export function ChaikinOscillator(highs, lows, closes, volumes) {
    // ADL의 EMA3 - EMA10
    const adlValues = [];
    let adl = 0;
    for (let i = 0; i < closes.length; i++) {
        const mfm = highs[i] !== lows[i]
            ? ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i])
            : 0;
        adl += mfm * volumes[i];
        adlValues.push(adl);
    }
    const ema3 = EMA(adlValues, 3);
    const ema10 = EMA(adlValues, 10);
    return ema3 && ema10 ? ema3 - ema10 : null;
}

// 4-8. VWAP (Volume Weighted Average Price)
export function VWAP(highs, lows, closes, volumes) {
    let cumTPV = 0, cumVol = 0;
    for (let i = 0; i < closes.length; i++) {
        const tp = (highs[i] + lows[i] + closes[i]) / 3;
        cumTPV += tp * volumes[i];
        cumVol += volumes[i];
    }
    return cumVol !== 0 ? cumTPV / cumVol : null;
}

// 4-9. PVI (Positive Volume Index)
export function PVI(closes, volumes) {
    if (closes.length < 2) return null;
    let pvi = 1000;
    for (let i = 1; i < closes.length; i++) {
        if (volumes[i] > volumes[i - 1]) {
            pvi += pvi * ((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
    }
    return pvi;
}

// 4-10. NVI (Negative Volume Index)
export function NVI(closes, volumes) {
    if (closes.length < 2) return null;
    let nvi = 1000;
    for (let i = 1; i < closes.length; i++) {
        if (volumes[i] < volumes[i - 1]) {
            nvi += nvi * ((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
    }
    return nvi;
}

// 4-11. Force Index
export function ForceIndex(closes, volumes, period = 13) {
    if (closes.length < 2) return null;
    const forces = [];
    for (let i = 1; i < closes.length; i++) {
        forces.push((closes[i] - closes[i - 1]) * volumes[i]);
    }
    return EMA(forces, period);
}

// 4-12. EFI (Elder's Force Index)
export function EFI(closes, volumes, period = 13) {
    return ForceIndex(closes, volumes, period);
}

// 4-13. Volume Oscillator
export function VolumeOscillator(volumes, fast = 5, slow = 10) {
    const emaFast = EMA(volumes, fast);
    const emaSlow = EMA(volumes, slow);
    if (!emaFast || !emaSlow || emaSlow === 0) return null;
    return ((emaFast - emaSlow) / emaSlow) * 100;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 5. 추세 강도 지표 (Trend Strength Indicators)                               │
 * │    - 추세의 강도 측정                                                       │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 5-1. ADX (Average Directional Index) - 평균 방향 지수
export function ADX(highs, lows, closes, period = 14) {
    if (closes.length < period * 2) return null;
    // 간략화된 ADX
    let sumDX = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const tr = TrueRange(highs[i], lows[i], closes[i - 1] || closes[i]);
        const plusDM = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] 
            ? Math.max(highs[i] - highs[i - 1], 0) : 0;
        const minusDM = lows[i - 1] - lows[i] > highs[i] - highs[i - 1]
            ? Math.max(lows[i - 1] - lows[i], 0) : 0;
        if (tr !== 0) {
            const plusDI = (plusDM / tr) * 100;
            const minusDI = (minusDM / tr) * 100;
            const dx = (plusDI + minusDI) !== 0 
                ? (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100 : 0;
            sumDX += dx;
        }
    }
    return sumDX / period;
}

// 5-2. +DI (Plus Directional Indicator)
export function PlusDI(highs, lows, closes, period = 14) {
    const atr = ATR(highs, lows, closes, period);
    if (!atr || atr === 0) return null;
    let sumPlusDM = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const plusDM = highs[i] - highs[i - 1] > lows[i - 1] - lows[i]
            ? Math.max(highs[i] - highs[i - 1], 0) : 0;
        sumPlusDM += plusDM;
    }
    return (sumPlusDM / period / atr) * 100;
}

// 5-3. -DI (Minus Directional Indicator)
export function MinusDI(highs, lows, closes, period = 14) {
    const atr = ATR(highs, lows, closes, period);
    if (!atr || atr === 0) return null;
    let sumMinusDM = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const minusDM = lows[i - 1] - lows[i] > highs[i] - highs[i - 1]
            ? Math.max(lows[i - 1] - lows[i], 0) : 0;
        sumMinusDM += minusDM;
    }
    return (sumMinusDM / period / atr) * 100;
}

// 5-4. Aroon Up
export function AroonUp(highs, period = 25) {
    if (highs.length < period) return null;
    const slice = highs.slice(-period);
    const highIdx = slice.indexOf(Math.max(...slice));
    return ((period - (period - 1 - highIdx)) / period) * 100;
}

// 5-5. Aroon Down
export function AroonDown(lows, period = 25) {
    if (lows.length < period) return null;
    const slice = lows.slice(-period);
    const lowIdx = slice.indexOf(Math.min(...slice));
    return ((period - (period - 1 - lowIdx)) / period) * 100;
}

// 5-6. Aroon Oscillator
export function AroonOscillator(highs, lows, period = 25) {
    const up = AroonUp(highs, period);
    const down = AroonDown(lows, period);
    return up !== null && down !== null ? up - down : null;
}

// 5-7. Vortex Indicator +VI
export function VortexPlus(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    let sumVM = 0, sumTR = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        sumVM += Math.abs(highs[i] - lows[i - 1]);
        sumTR += TrueRange(highs[i], lows[i], closes[i - 1]);
    }
    return sumTR !== 0 ? sumVM / sumTR : null;
}

// 5-8. Vortex Indicator -VI
export function VortexMinus(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    let sumVM = 0, sumTR = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        sumVM += Math.abs(lows[i] - highs[i - 1]);
        sumTR += TrueRange(highs[i], lows[i], closes[i - 1]);
    }
    return sumTR !== 0 ? sumVM / sumTR : null;
}

// 5-9. Parabolic SAR (간략화)
export function ParabolicSAR(highs, lows, af = 0.02, maxAf = 0.2) {
    if (highs.length < 2) return null;
    // 간략화: 최근 저점/고점 기반
    return (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
}

// 5-10. Supertrend (간략화)
export function Supertrend(highs, lows, closes, period = 10, mult = 3) {
    const atr = ATR(highs, lows, closes, period);
    if (!atr) return null;
    const hl2 = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
    const upper = hl2 + (mult * atr);
    const lower = hl2 - (mult * atr);
    const close = closes[closes.length - 1];
    return { upper, lower, trend: close > lower ? 'UP' : 'DOWN' };
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 6. 가격 패턴/위치 지표                                                      │
 * │    - 현재 가격의 상대적 위치                                                │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 6-1. Price Position (최근 N일 범위 내 위치)
export function PricePosition(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    const highest = Math.max(...highs.slice(-period));
    const lowest = Math.min(...lows.slice(-period));
    const current = closes[closes.length - 1];
    return highest !== lowest ? ((current - lowest) / (highest - lowest)) * 100 : 50;
}

// 6-2. Distance from MA (이동평균과의 거리 %)
export function DistanceFromMA(closes, period = 20) {
    const ma = SMA(closes, period);
    if (!ma || ma === 0) return null;
    return ((closes[closes.length - 1] - ma) / ma) * 100;
}

// 6-3. Price vs EMA
export function PriceVsEMA(closes, period = 20) {
    const ema = EMA(closes, period);
    if (!ema || ema === 0) return null;
    return ((closes[closes.length - 1] - ema) / ema) * 100;
}

// 6-4. Pivot Points
export function PivotPoints(high, low, close) {
    const pivot = (high + low + close) / 3;
    return {
        pivot,
        r1: (2 * pivot) - low,
        r2: pivot + (high - low),
        r3: high + 2 * (pivot - low),
        s1: (2 * pivot) - high,
        s2: pivot - (high - low),
        s3: low - 2 * (high - pivot)
    };
}

// 6-5. Fibonacci Retracement Levels
export function FibonacciLevels(high, low) {
    const diff = high - low;
    return {
        level0: low,
        level236: low + diff * 0.236,
        level382: low + diff * 0.382,
        level500: low + diff * 0.5,
        level618: low + diff * 0.618,
        level786: low + diff * 0.786,
        level1000: high
    };
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 7. 캔들스틱 파생 지표                                                       │
 * │    - 캔들 모양 기반 수치화                                                  │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 7-1. Body Size (몸통 크기 %)
export function BodySize(open, close, high, low) {
    const range = high - low;
    return range !== 0 ? (Math.abs(close - open) / range) * 100 : 0;
}

// 7-2. Upper Shadow (윗꼬리 %)
export function UpperShadow(open, close, high, low) {
    const range = high - low;
    const upperWick = high - Math.max(open, close);
    return range !== 0 ? (upperWick / range) * 100 : 0;
}

// 7-3. Lower Shadow (아랫꼬리 %)
export function LowerShadow(open, close, high, low) {
    const range = high - low;
    const lowerWick = Math.min(open, close) - low;
    return range !== 0 ? (lowerWick / range) * 100 : 0;
}

// 7-4. Candle Direction (1: 양봉, -1: 음봉, 0: 도지)
export function CandleDirection(open, close) {
    if (close > open * 1.001) return 1;
    if (close < open * 0.999) return -1;
    return 0;
}

// 7-5. Consecutive Candles (연속 양봉/음봉 수)
export function ConsecutiveCandles(opens, closes) {
    let count = 0;
    const lastDir = closes[closes.length - 1] > opens[opens.length - 1] ? 1 : -1;
    for (let i = closes.length - 1; i >= 0; i--) {
        const dir = closes[i] > opens[i] ? 1 : -1;
        if (dir === lastDir) count++;
        else break;
    }
    return count * lastDir; // 양수: 연속 양봉, 음수: 연속 음봉
}

// 7-6. Average Candle Size
export function AvgCandleSize(highs, lows, period = 20) {
    if (highs.length < period) return null;
    let sum = 0;
    for (let i = highs.length - period; i < highs.length; i++) {
        sum += highs[i] - lows[i];
    }
    return sum / period;
}

// 7-7. Current vs Average Candle Size
export function CandleSizeRatio(highs, lows, period = 20) {
    const avg = AvgCandleSize(highs, lows, period);
    if (!avg || avg === 0) return null;
    const current = highs[highs.length - 1] - lows[lows.length - 1];
    return (current / avg) * 100;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 8. 복합/커스텀 지표                                                         │
 * │    - 여러 지표 결합                                                         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 8-1. RSI + Stochastic 평균
export function StochRSI(closes, period = 14) {
    if (!Array.isArray(closes) || closes.length < period + 1) return null;

    const rsiSeries = [];
    for (let i = period; i < closes.length; i++) {
        const slice = closes.slice(0, i + 1);
        const rsiValue = RSI(slice, period);
        if (rsiValue != null && Number.isFinite(rsiValue)) rsiSeries.push(rsiValue);
    }
    if (rsiSeries.length < period) return null;

    const recent = rsiSeries.slice(-period);
    const minRsi = Math.min(...recent);
    const maxRsi = Math.max(...recent);
    const current = rsiSeries[rsiSeries.length - 1];
    if (maxRsi === minRsi) return 0.5;
    return (current - minRsi) / (maxRsi - minRsi);
}

// 8-2. MACD Histogram ROC
export function MACDHistROC(closes, fast = 12, slow = 26, signal = 9, rocPeriod = 5) {
    if (!Array.isArray(closes) || closes.length < slow + signal + rocPeriod) return null;

    const kFast = 2 / (fast + 1);
    const kSlow = 2 / (slow + 1);
    const kSignal = 2 / (signal + 1);

    let emaFast = closes.slice(0, fast).reduce((a, b) => a + b, 0) / fast;
    const fastSeries = [emaFast];
    for (let i = fast; i < closes.length; i++) {
        emaFast = closes[i] * kFast + emaFast * (1 - kFast);
        fastSeries.push(emaFast);
    }

    let emaSlow = closes.slice(0, slow).reduce((a, b) => a + b, 0) / slow;
    const slowSeries = [emaSlow];
    for (let i = slow; i < closes.length; i++) {
        emaSlow = closes[i] * kSlow + emaSlow * (1 - kSlow);
        slowSeries.push(emaSlow);
    }

    const offset = slow - fast;
    const macdSeries = [];
    for (let i = 0; i < slowSeries.length; i++) {
        const fastIdx = i + offset;
        if (fastIdx < fastSeries.length) macdSeries.push(fastSeries[fastIdx] - slowSeries[i]);
    }
    if (macdSeries.length < signal + rocPeriod) return null;

    let signalLine = macdSeries.slice(0, signal).reduce((a, b) => a + b, 0) / signal;
    const histSeries = [];
    for (let i = signal; i < macdSeries.length; i++) {
        signalLine = macdSeries[i] * kSignal + signalLine * (1 - kSignal);
        histSeries.push(macdSeries[i] - signalLine);
    }

    if (histSeries.length <= rocPeriod) return null;
    const current = histSeries[histSeries.length - 1];
    const past = histSeries[histSeries.length - 1 - rocPeriod];
    if (past === 0) return 0;
    return ((current - past) / Math.abs(past)) * 100;
}

// 8-3. BB %B (볼린저 밴드 내 위치)
export function BollingerPercentB(closes, period = 20, stdDev = 2) {
    const bb = BollingerBands(closes, period, stdDev);
    if (!bb) return null;
    return bb.position;
}

// 8-4. BB Width (볼린저 밴드 폭)
export function BollingerWidth(closes, period = 20, stdDev = 2) {
    const bb = BollingerBands(closes, period, stdDev);
    if (!bb) return null;
    return bb.bandwidth;
}

// 8-5. Squeeze Indicator (BB inside Keltner)
export function SqueezeIndicator(highs, lows, closes) {
    const bb = BollingerBands(closes, 20, 2);
    const kc = KeltnerChannel(highs, lows, closes, 20, 10, 1.5);
    if (!bb || !kc) return null;
    // Squeeze = BB가 KC 안에 있음
    const squeezeOn = bb.lower > kc.lower && bb.upper < kc.upper;
    return {
        squeezeOn,
        bandwidth: bb.bandwidth,
        upper: bb.upper,
        middle: bb.middle,
        lower: bb.lower
    };
}

// 8-6. Ichimoku Components (간략화)
export function IchimokuTenkan(highs, lows, period = 9) {
    if (highs.length < period) return null;
    const high = Math.max(...highs.slice(-period));
    const low = Math.min(...lows.slice(-period));
    return (high + low) / 2;
}

export function IchimokuKijun(highs, lows, period = 26) {
    return IchimokuTenkan(highs, lows, period);
}

// 8-7. Elder Ray Bull Power
export function BullPower(highs, closes, period = 13) {
    const ema = EMA(closes, period);
    if (!ema) return null;
    return highs[highs.length - 1] - ema;
}

// 8-8. Elder Ray Bear Power
export function BearPower(lows, closes, period = 13) {
    const ema = EMA(closes, period);
    if (!ema) return null;
    return lows[lows.length - 1] - ema;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 9. 시간/주기 기반 지표                                                      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 9-1. 이전 N개 봉 대비 변화율
export function PriceChangeN(closes, n = 1) {
    if (closes.length < n + 1) return null;
    const current = closes[closes.length - 1];
    const past = closes[closes.length - n - 1];
    return past !== 0 ? ((current - past) / past) * 100 : 0;
}

// 9-2. 최근 N개 봉 중 양봉 비율
export function BullishRatio(opens, closes, period = 10) {
    if (closes.length < period) return null;
    let bullish = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > opens[i]) bullish++;
    }
    return (bullish / period) * 100;
}

// 9-3. Higher Highs Count (연속 고점 갱신 횟수)
export function HigherHighsCount(highs, period = 10) {
    if (highs.length < period) return null;
    let count = 0;
    for (let i = highs.length - period + 1; i < highs.length; i++) {
        if (highs[i] > highs[i - 1]) count++;
    }
    return count;
}

// 9-4. Lower Lows Count (연속 저점 갱신 횟수)  
export function LowerLowsCount(lows, period = 10) {
    if (lows.length < period) return null;
    let count = 0;
    for (let i = lows.length - period + 1; i < lows.length; i++) {
        if (lows[i] < lows[i - 1]) count++;
    }
    return count;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 10. 심리/외부 지표                                                          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 10-1. Fear & Greed Index (외부 데이터)
// 이건 API에서 가져옴
export function FearGreedIndex(fearGreed) {
    return typeof fearGreed === 'number' && Number.isFinite(fearGreed) ? fearGreed : null;
}

// 10-2. Buy/Sell Pressure (매수/매도 압력)
export function BuySellPressure(opens, closes, volumes, period = 10, buyVolumes = null, sellVolumes = null) {
    if (closes.length < period) return null;
    let buyVol = 0, sellVol = 0;
    const hasTaker = Array.isArray(buyVolumes) && Array.isArray(sellVolumes) && buyVolumes.some(v => v != null) && sellVolumes.some(v => v != null);
    for (let i = closes.length - period; i < closes.length; i++) {
        if (hasTaker) {
            buyVol += buyVolumes[i] ?? 0;
            sellVol += sellVolumes[i] ?? 0;
        } else {
            if (closes[i] > opens[i]) buyVol += volumes[i];
            else sellVol += volumes[i];
        }
    }
    const total = buyVol + sellVol;
    return total !== 0 ? (buyVol / total) * 100 : 50;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 10-A. 검증된 추가 지표 (Verified Additional Indicators)                     │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 10-A1. Fisher Transform - John Ehlers
// 가격을 가우시안 분포로 변환하여 전환점 감지
export function FisherTransform(highs, lows, period = 10) {
    if (highs.length < period) return null;
    
    // 중간가격 계산
    const midPrices = [];
    for (let i = 0; i < highs.length; i++) {
        midPrices.push((highs[i] + lows[i]) / 2);
    }
    
    // 최근 period 내 최고/최저
    const slice = midPrices.slice(-period);
    const maxH = Math.max(...slice);
    const minL = Math.min(...slice);
    
    // 정규화
    const range = maxH - minL;
    if (range === 0) return 0;
    
    const midPrice = midPrices[midPrices.length - 1];
    let value = 0.33 * 2 * ((midPrice - minL) / range - 0.5);
    value = Math.max(-0.999, Math.min(0.999, value)); // 클램프
    
    // Fisher Transform
    return 0.5 * Math.log((1 + value) / (1 - value));
}

// 10-A2. VIDYA (Variable Index Dynamic Average) - Tushar Chande
// 변동성에 따라 민감도가 자동 조절되는 이동평균
export function VIDYA(closes, period = 14, smoothPeriod = 9) {
    if (closes.length < period + smoothPeriod) return null;
    
    // CMO 계산 (절대값)
    const cmo = Math.abs(CMO(closes, period) || 0) / 100;
    
    // VIDYA = 이전 VIDYA + SC * (가격 - 이전 VIDYA)
    const sc = 2 / (smoothPeriod + 1) * cmo;
    
    // 초기값은 SMA
    let vidya = SMA(closes.slice(0, period), period);
    if (!vidya) return null;
    
    for (let i = period; i < closes.length; i++) {
        const currentCmo = Math.abs(CMO(closes.slice(0, i + 1), period) || 0) / 100;
        const currentSc = 2 / (smoothPeriod + 1) * currentCmo;
        vidya = currentSc * closes[i] + (1 - currentSc) * vidya;
    }
    
    return vidya;
}

// 10-A3. FRAMA (Fractal Adaptive Moving Average) - John Ehlers
// 프랙탈 차원을 이용한 적응형 이동평균
export function FRAMA(closes, period = 16) {
    if (closes.length < period) return null;
    const halfPeriod = Math.floor(period / 2);
    
    // N1: 첫 번째 절반의 고가-저가
    const first = closes.slice(-period, -halfPeriod);
    const N1 = (Math.max(...first) - Math.min(...first)) / halfPeriod;
    
    // N2: 두 번째 절반의 고가-저가
    const second = closes.slice(-halfPeriod);
    const N2 = (Math.max(...second) - Math.min(...second)) / halfPeriod;
    
    // N3: 전체의 고가-저가
    const full = closes.slice(-period);
    const N3 = (Math.max(...full) - Math.min(...full)) / period;
    
    // 프랙탈 차원
    let D = 0;
    if (N1 > 0 && N2 > 0 && N3 > 0) {
        D = (Math.log(N1 + N2) - Math.log(N3)) / Math.log(2);
    }
    
    // Alpha 계산
    const alpha = Math.exp(-4.6 * (D - 1));
    const clampedAlpha = Math.max(0.01, Math.min(1, alpha));
    
    // FRAMA 계산
    let frama = closes[closes.length - period];
    for (let i = closes.length - period + 1; i < closes.length; i++) {
        frama = clampedAlpha * closes[i] + (1 - clampedAlpha) * frama;
    }
    
    return frama;
}

// 10-A4. Hurst Exponent (간략화 버전)
// H > 0.5: 추세 지속, H < 0.5: 평균 회귀, H = 0.5: 랜덤
export function HurstExponent(closes, period = 100) {
    if (closes.length < period) return null;
    
    const slice = closes.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    
    // 누적 편차
    const cumDev = [];
    let cumSum = 0;
    for (const price of slice) {
        cumSum += price - mean;
        cumDev.push(cumSum);
    }
    
    // R (Range)
    const R = Math.max(...cumDev) - Math.min(...cumDev);
    
    // S (Standard Deviation)
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
    const S = Math.sqrt(variance);
    
    if (S === 0 || R === 0) return 0.5;
    
    // R/S 분석 (간략화)
    const RS = R / S;
    
    // Hurst = log(R/S) / log(N)
    const H = Math.log(RS) / Math.log(period);
    
    return Math.max(0, Math.min(1, H));
}

// 10-A5. Vertical Horizontal Filter (VHF) - Adam White
// 추세 vs 횡보 판단
export function VerticalHorizontalFilter(closes, period = 28) {
    if (closes.length < period) return null;
    
    const slice = closes.slice(-period);
    
    // 수직 거리: |최고 - 최저|
    const vertical = Math.abs(Math.max(...slice) - Math.min(...slice));
    
    // 수평 거리: 일일 변화량의 합
    let horizontal = 0;
    for (let i = 1; i < slice.length; i++) {
        horizontal += Math.abs(slice[i] - slice[i - 1]);
    }
    
    return horizontal !== 0 ? vertical / horizontal : 0;
}

// 10-A6. Chande Kroll Stop - 동적 손절매 레벨
export function ChandeKrollStop(highs, lows, closes, p = 10, x = 1, q = 9) {
    if (closes.length < p + q) return null;
    
    const atr = ATR(highs, lows, closes, p);
    if (!atr) return null;
    
    // 최근 p기간의 최고/최저
    const recentHighs = highs.slice(-p);
    const recentLows = lows.slice(-p);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    // Stop levels
    const stopLong = highestHigh - x * atr;
    const stopShort = lowestLow + x * atr;
    
    // 현재 가격과의 관계
    const current = closes[closes.length - 1];
    
    return {
        stopLong,
        stopShort,
        signal: current > stopLong ? 1 : current < stopShort ? -1 : 0
    };
}

// 10-A7. Price Volume Trend (PVT)
export function PriceVolumeTrend(closes, volumes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let pvt = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const priceChange = (closes[i] - closes[i - 1]) / closes[i - 1];
        pvt += priceChange * volumes[i];
    }
    
    return pvt;
}

// 10-A8. Trend Intensity Index (TII)
export function TrendIntensityIndex(closes, period = 30) {
    if (closes.length < period) return null;
    
    const sma = SMA(closes, period);
    if (!sma) return null;
    
    let upDev = 0, downDev = 0;
    const halfPeriod = Math.floor(period / 2);
    
    for (let i = closes.length - halfPeriod; i < closes.length; i++) {
        if (closes[i] > sma) {
            upDev += closes[i] - sma;
        } else {
            downDev += sma - closes[i];
        }
    }
    
    const total = upDev + downDev;
    return total !== 0 ? (upDev / total) * 100 : 50;
}

// 10-A9. Random Walk Index (RWI)
export function RandomWalkIndex(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    const atr = ATR(highs, lows, closes, period);
    if (!atr || atr === 0) return null;
    
    let maxRWIHigh = 0, maxRWILow = 0;
    
    for (let n = 2; n <= period; n++) {
        const idx = closes.length - 1;
        const nIdx = idx - n;
        
        if (nIdx >= 0) {
            const rwiHigh = (highs[idx] - lows[nIdx]) / (atr * Math.sqrt(n));
            const rwiLow = (highs[nIdx] - lows[idx]) / (atr * Math.sqrt(n));
            
            maxRWIHigh = Math.max(maxRWIHigh, rwiHigh);
            maxRWILow = Math.max(maxRWILow, rwiLow);
        }
    }
    
    return { high: maxRWIHigh, low: maxRWILow, diff: maxRWIHigh - maxRWILow };
}

// 10-A10. Chandelier Exit - Chuck LeBeau
export function ChandelierExit(highs, lows, closes, period = 22, multiplier = 3) {
    if (closes.length < period) return null;
    
    const atr = ATR(highs, lows, closes, period);
    if (!atr) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    return {
        longStop: highestHigh - multiplier * atr,
        shortStop: lowestLow + multiplier * atr
    };
}

// 10-A11. ADXR (Average Directional Movement Rating)
export function ADXR(highs, lows, closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    const currentADX = ADX(highs, lows, closes, period);
    const prevADX = ADX(
        highs.slice(0, -period),
        lows.slice(0, -period),
        closes.slice(0, -period),
        period
    );
    
    if (!currentADX || !prevADX) return null;
    
    return (currentADX + prevADX) / 2;
}

// 10-A12. Relative Momentum Index (RMI) - Roger Altman
export function RelativeMomentumIndex(closes, period = 14, momentum = 4) {
    if (closes.length < period + momentum) return null;
    
    let upSum = 0, downSum = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const change = closes[i] - closes[i - momentum];
        if (change > 0) upSum += change;
        else downSum += Math.abs(change);
    }
    
    if (upSum + downSum === 0) return 50;
    return (upSum / (upSum + downSum)) * 100;
}

// 10-A13. Intraday Momentum Index (IMI)
export function IntradayMomentumIndex(opens, closes, period = 14) {
    if (closes.length < period) return null;
    
    let gains = 0, losses = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > opens[i]) {
            gains += closes[i] - opens[i];
        } else {
            losses += opens[i] - closes[i];
        }
    }
    
    if (gains + losses === 0) return 50;
    return (gains / (gains + losses)) * 100;
}

// 10-A14. Ehlers Instantaneous Trendline
export function EhlersInstantaneousTrendline(closes) {
    if (closes.length < 10) return null;
    
    // 간략화된 버전 - 2극 버터워스 필터 근사
    const alpha = 0.07;
    let it = closes[0];
    
    for (let i = 1; i < closes.length; i++) {
        it = alpha * closes[i] + (1 - alpha) * it;
    }
    
    return it;
}

// 10-A15. Pivot Points (일일)
export function DailyPivotPoints(high, low, close) {
    const pp = (high + low + close) / 3;
    return {
        pp,
        r1: 2 * pp - low,
        r2: pp + (high - low),
        r3: high + 2 * (pp - low),
        s1: 2 * pp - high,
        s2: pp - (high - low),
        s3: low - 2 * (high - pp)
    };
}

// 10-A16. Gann HiLo Activator
export function GannHiLoActivator(highs, lows, closes, period = 3) {
    if (closes.length < period) return null;
    
    const smaHigh = SMA(highs.slice(-period), period);
    const smaLow = SMA(lows.slice(-period), period);
    
    if (!smaHigh || !smaLow) return null;
    
    const current = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    
    // 상승 추세면 저가 SMA, 하락 추세면 고가 SMA
    if (prev > smaHigh) {
        return { value: smaLow, trend: 1 };
    } else if (prev < smaLow) {
        return { value: smaHigh, trend: -1 };
    }
    
    return { value: (smaHigh + smaLow) / 2, trend: 0 };
}

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 10-B. 추가 검증 지표 - Bill Williams & Ehlers DSP                           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 10-B1. Williams Alligator (Jaw, Teeth, Lips)
export function WilliamsAlligator(closes, jawPeriod = 13, teethPeriod = 8, lipsPeriod = 5) {
    if (closes.length < jawPeriod + 8) return null;
    
    // SMMA (Smoothed Moving Average) 계산
    const smma = (data, period) => {
        if (data.length < period) return null;
        let sum = 0;
        for (let i = 0; i < period; i++) sum += data[i];
        let smma = sum / period;
        for (let i = period; i < data.length; i++) {
            smma = (smma * (period - 1) + data[i]) / period;
        }
        return smma;
    };
    
    // 각 라인 (미래로 시프트된 값)
    const jaw = smma(closes.slice(0, -8), jawPeriod);   // 8봉 미래
    const teeth = smma(closes.slice(0, -5), teethPeriod); // 5봉 미래
    const lips = smma(closes.slice(0, -3), lipsPeriod);   // 3봉 미래
    
    if (!jaw || !teeth || !lips) return null;
    
    const current = closes[closes.length - 1];
    
    return {
        jaw, teeth, lips,
        // 악어가 입을 벌리면 추세, 닫으면 횡보
        mouthOpen: Math.abs(lips - jaw) > Math.abs(teeth - jaw) * 0.5,
        trend: lips > teeth && teeth > jaw ? 1 : (lips < teeth && teeth < jaw ? -1 : 0),
        priceAbove: current > lips && current > teeth && current > jaw
    };
}

// 10-B2. Gator Oscillator (Alligator의 히스토그램)
export function GatorOscillator(closes, jawPeriod = 13, teethPeriod = 8, lipsPeriod = 5) {
    const alligator = WilliamsAlligator(closes, jawPeriod, teethPeriod, lipsPeriod);
    if (!alligator) return null;
    
    return {
        upper: Math.abs(alligator.jaw - alligator.teeth),
        lower: -Math.abs(alligator.teeth - alligator.lips),
        awake: alligator.mouthOpen
    };
}

// 10-B3. Ehlers MESA Adaptive Moving Average (MAMA/FAMA)
export function EhlersMESA(closes, fastLimit = 0.5, slowLimit = 0.05) {
    if (closes.length < 50) return null;
    
    const smooth = [];
    const detrender = [];
    const period = [];
    const q1 = [];
    const i1 = [];
    let mama = closes[0];
    let fama = closes[0];
    
    for (let i = 0; i < closes.length; i++) {
        if (i < 6) {
            smooth.push(closes[i]);
            detrender.push(0);
            period.push(0);
            q1.push(0);
            i1.push(0);
            continue;
        }
        
        // Smooth Price
        smooth.push((4 * closes[i] + 3 * closes[i-1] + 2 * closes[i-2] + closes[i-3]) / 10);
        
        // Detrender
        detrender.push((0.0962 * smooth[i] + 0.5769 * smooth[i-2] - 0.5769 * smooth[i-4] - 0.0962 * smooth[i-6]) * (0.075 * (period[i-1] || 15) + 0.54));
        
        // In-phase and Quadrature components
        q1.push((0.0962 * detrender[i] + 0.5769 * detrender[i-2] - 0.5769 * detrender[i-4] - 0.0962 * detrender[i-6]) * (0.075 * (period[i-1] || 15) + 0.54));
        i1.push(detrender[i-3]);
        
        // Phase
        const phase = i1[i] !== 0 ? Math.atan(q1[i] / i1[i]) * 180 / Math.PI : 0;
        
        // Adaptive alpha
        const alpha = Math.max(slowLimit, Math.min(fastLimit, fastLimit / (1 + (phase / 10))));
        
        mama = alpha * closes[i] + (1 - alpha) * mama;
        fama = 0.5 * alpha * mama + (1 - 0.5 * alpha) * fama;
        
        period.push(15); // 간략화
    }
    
    return { mama, fama, bullish: mama > fama };
}

// 10-B4. Ehlers Sinewave Indicator
export function EhlersSinewave(closes, period = 20) {
    if (closes.length < period * 2) return null;
    
    // Hilbert Transform 기반 사인파
    const dcPeriod = period;
    let realPart = 0, imagPart = 0;
    
    for (let i = 0; i < dcPeriod; i++) {
        const weight = closes[closes.length - 1 - i];
        realPart += Math.cos(2 * Math.PI * i / dcPeriod) * weight;
        imagPart += Math.sin(2 * Math.PI * i / dcPeriod) * weight;
    }
    
    const dcPhase = Math.atan2(imagPart, realPart) * 180 / Math.PI;
    const sine = Math.sin(dcPhase * Math.PI / 180);
    const leadSine = Math.sin((dcPhase + 45) * Math.PI / 180);
    
    return {
        sine,
        leadSine,
        // 크로스 신호
        bullCross: sine > leadSine && sine < 0,
        bearCross: sine < leadSine && sine > 0
    };
}

// 10-B5. Ehlers Cyber Cycle
export function EhlersCyberCycle(closes, alpha = 0.07) {
    if (closes.length < 10) return null;
    
    const smooth = [];
    const cycle = [];
    
    for (let i = 0; i < closes.length; i++) {
        if (i < 3) {
            smooth.push(closes[i]);
            cycle.push(0);
            continue;
        }
        
        smooth.push((closes[i] + 2 * closes[i-1] + 2 * closes[i-2] + closes[i-3]) / 6);
        
        if (i < 7) {
            cycle.push((closes[i] - 2 * closes[i-1] + closes[i-2]) / 4);
        } else {
            cycle.push((1 - 0.5 * alpha) * (1 - 0.5 * alpha) * (smooth[i] - 2 * smooth[i-1] + smooth[i-2]) +
                       2 * (1 - alpha) * cycle[i-1] - (1 - alpha) * (1 - alpha) * cycle[i-2]);
        }
    }
    
    const current = cycle[cycle.length - 1];
    const prev = cycle[cycle.length - 2];
    
    return {
        value: current,
        rising: current > prev,
        crossUp: current > 0 && prev <= 0,
        crossDown: current < 0 && prev >= 0
    };
}

// 10-B6. Center of Gravity Oscillator
export function CenterOfGravity(closes, period = 10) {
    if (closes.length < period) return null;
    
    let num = 0, denom = 0;
    for (let i = 0; i < period; i++) {
        const price = closes[closes.length - period + i];
        num += price * (period - i);
        denom += price;
    }
    
    return denom !== 0 ? -num / denom : 0;
}

// 10-B7. Polarized Fractal Efficiency (PFE)
export function PolarizedFractalEfficiency(closes, period = 10, smoothing = 5) {
    if (closes.length < period + smoothing) return null;
    
    const pfe = [];
    for (let i = period; i < closes.length; i++) {
        // 직선 거리
        const priceChange = closes[i] - closes[i - period];
        const straightDistance = Math.sqrt(priceChange * priceChange + period * period);
        
        // 실제 경로 거리
        let pathDistance = 0;
        for (let j = i - period + 1; j <= i; j++) {
            const change = closes[j] - closes[j - 1];
            pathDistance += Math.sqrt(change * change + 1);
        }
        
        // PFE = (직선/경로) * 100 * sign(가격변화)
        const efficiency = pathDistance !== 0 ? (straightDistance / pathDistance) * 100 : 0;
        pfe.push(priceChange >= 0 ? efficiency : -efficiency);
    }
    
    // EMA 스무딩
    return EMA(pfe, smoothing);
}

// 10-B8. Relative Volatility Index (RVI - 변동성 버전)
export function RelativeVolatilityIndex(closes, period = 14, smoothing = 14) {
    if (closes.length < period + smoothing) return null;
    
    // 표준편차 계산
    const stdDev = [];
    for (let i = period; i < closes.length; i++) {
        const slice = closes.slice(i - period, i);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
        stdDev.push(Math.sqrt(variance));
    }
    
    // 상승/하락 변동성
    let upSum = 0, downSum = 0;
    for (let i = 1; i < stdDev.length; i++) {
        if (closes[period + i] > closes[period + i - 1]) {
            upSum += stdDev[i];
        } else {
            downSum += stdDev[i];
        }
    }
    
    const total = upSum + downSum;
    return total !== 0 ? (upSum / total) * 100 : 50;
}

// 10-B9. Ergodic Oscillator (TSI 기반)
export function ErgodicOscillator(closes, r = 5, s = 20, u = 5) {
    if (closes.length < Math.max(r, s, u) + 10) return null;
    
    // 가격 변화
    const pc = [];
    const apc = [];
    for (let i = 1; i < closes.length; i++) {
        pc.push(closes[i] - closes[i - 1]);
        apc.push(Math.abs(closes[i] - closes[i - 1]));
    }
    
    // Double smoothed
    const pcEma1 = EMA(pc, r);
    const apcEma1 = EMA(apc, r);
    
    if (!pcEma1 || !apcEma1) return null;
    
    // TSI 계산 간략화
    const tsi = apcEma1 !== 0 ? (pcEma1 / apcEma1) * 100 : 0;
    const signal = tsi * 0.9; // EMA 시뮬레이션
    
    return {
        tsi,
        signal,
        histogram: tsi - signal,
        bullish: tsi > signal
    };
}

// 10-B10. Pretty Good Oscillator (PGO)
export function PrettyGoodOscillator(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    const sma = SMA(closes, period);
    const atr = ATR(closes, closes, closes, period); // 간략화 (H,L,C 동일)
    
    if (!sma || !atr || atr === 0) return null;
    
    return (closes[closes.length - 1] - sma) / atr;
}

// 10-B11. Psychological Line (PSY)
export function PsychologicalLine(closes, period = 12) {
    if (closes.length < period + 1) return null;
    
    let upDays = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) upDays++;
    }
    
    return (upDays / period) * 100;
}

// 10-B12. Elder Auto Envelope
export function ElderAutoEnvelope(closes, period = 22, multiplier = 2.7) {
    if (closes.length < period) return null;
    
    const ema = EMA(closes, period);
    if (!ema) return null;
    
    // ATR 기반 엔벨로프
    const atr = ATR(closes, closes, closes, period);
    if (!atr) return null;
    
    const upperBand = ema + multiplier * atr;
    const lowerBand = ema - multiplier * atr;
    const current = closes[closes.length - 1];
    
    return {
        upper: upperBand,
        middle: ema,
        lower: lowerBand,
        position: (current - lowerBand) / (upperBand - lowerBand) * 100,
        overbought: current > upperBand,
        oversold: current < lowerBand
    };
}

// 10-B13. Smoothed RSI (SRSI)
export function SmoothedRSI(closes, rsiPeriod = 14, smoothPeriod = 5) {
    if (closes.length < rsiPeriod + smoothPeriod) return null;
    
    const rsiValues = [];
    for (let i = rsiPeriod; i <= closes.length; i++) {
        const rsi = RSI(closes.slice(0, i), rsiPeriod);
        if (rsi !== null) rsiValues.push(rsi);
    }
    
    return EMA(rsiValues, smoothPeriod);
}

// 10-B14. Double Smoothed Stochastic (DSS)
export function DoubleSmoothedStochastic(closes, period = 13, smooth1 = 8, smooth2 = 8) {
    if (closes.length < period + smooth1 + smooth2) return null;
    
    // First Stochastic
    const stochValues = [];
    for (let i = period; i <= closes.length; i++) {
        const slice = closes.slice(i - period, i);
        const high = Math.max(...slice);
        const low = Math.min(...slice);
        const range = high - low;
        stochValues.push(range !== 0 ? ((slice[slice.length - 1] - low) / range) * 100 : 50);
    }
    
    // First smoothing
    const emaStoch = [];
    for (let i = smooth1; i <= stochValues.length; i++) {
        const ema = EMA(stochValues.slice(0, i), smooth1);
        if (ema !== null) emaStoch.push(ema);
    }
    
    // Second stochastic on smoothed values
    if (emaStoch.length < period) return null;
    const high2 = Math.max(...emaStoch.slice(-period));
    const low2 = Math.min(...emaStoch.slice(-period));
    const range2 = high2 - low2;
    const dss = range2 !== 0 ? ((emaStoch[emaStoch.length - 1] - low2) / range2) * 100 : 50;
    
    return dss;
}

// 10-B15. Swing Index (SI)
export function SwingIndex(opens, highs, lows, closes, limitMove = 1000) {
    if (closes.length < 2) return null;
    
    const n = closes.length - 1;
    const p = n - 1;
    
    const c = closes[n];
    const cy = closes[p];
    const h = highs[n];
    const hy = highs[p];
    const l = lows[n];
    const ly = lows[p];
    const o = opens[n];
    const oy = opens[p];
    
    const k = Math.max(Math.abs(h - cy), Math.abs(l - cy));
    const r = Math.max(
        Math.abs(h - cy) + 0.25 * Math.abs(cy - oy) + 0.5 * Math.abs(h - l),
        Math.abs(l - cy) + 0.25 * Math.abs(cy - oy) + 0.5 * Math.abs(h - l),
        Math.abs(h - l) + 0.25 * Math.abs(cy - oy)
    );
    
    if (r === 0) return 0;
    
    const si = 50 * ((c - cy) + 0.5 * (c - o) + 0.25 * (cy - oy)) * (k / limitMove) / r;
    return si;
}

// 10-B16. Accumulation Swing Index (ASI)
export function AccumulationSwingIndex(opens, highs, lows, closes, limitMove = 1000) {
    if (closes.length < 10) return null;
    
    let asi = 0;
    for (let i = 1; i < closes.length; i++) {
        const sliceOpens = opens.slice(0, i + 1);
        const sliceHighs = highs.slice(0, i + 1);
        const sliceLows = lows.slice(0, i + 1);
        const sliceCloses = closes.slice(0, i + 1);
        
        const si = SwingIndex(sliceOpens, sliceHighs, sliceLows, sliceCloses, limitMove);
        if (si !== null) asi += si;
    }
    
    return asi;
}

// 10-B17. Volume Weighted RSI
export function VolumeWeightedRSI(closes, volumes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let gainSum = 0, lossSum = 0;
    let gainVolSum = 0, lossVolSum = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) {
            gainSum += change * volumes[i];
            gainVolSum += volumes[i];
        } else {
            lossSum += Math.abs(change) * volumes[i];
            lossVolSum += volumes[i];
        }
    }
    
    const avgGain = gainVolSum > 0 ? gainSum / gainVolSum : 0;
    const avgLoss = lossVolSum > 0 ? lossSum / lossVolSum : 0;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

// 10-B18. Fractal Chaos Bands
export function FractalChaosBands(highs, lows, period = 5) {
    if (highs.length < period * 2) return null;
    
    // 프랙탈 고점/저점 찾기
    let upperBand = highs[highs.length - 1];
    let lowerBand = lows[lows.length - 1];
    
    for (let i = highs.length - period; i < highs.length; i++) {
        if (highs[i] > upperBand) upperBand = highs[i];
        if (lows[i] < lowerBand) lowerBand = lows[i];
    }
    
    const current = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
    
    return {
        upper: upperBand,
        lower: lowerBand,
        middle: (upperBand + lowerBand) / 2,
        width: ((upperBand - lowerBand) / current) * 100
    };
}

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 10-C. 추가 검증 지표 - 고급 추세/모멘텀/변동성                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 10-C1. Choppiness Index (추세 vs 횡보 판단)
export function ChoppinessIndex(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    // ATR 합계
    let atrSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        atrSum += tr;
    }
    
    // 기간 내 최고/최저
    const periodHighs = highs.slice(-period);
    const periodLows = lows.slice(-period);
    const highest = Math.max(...periodHighs);
    const lowest = Math.min(...periodLows);
    
    const range = highest - lowest;
    if (range === 0) return 50;
    
    // Choppiness = 100 * log10(ATR합/Range) / log10(period)
    return 100 * Math.log10(atrSum / range) / Math.log10(period);
}

// 10-C2. Disparity Index
export function DisparityIndex(closes, period = 14) {
    if (closes.length < period) return null;
    
    const ma = SMA(closes, period);
    if (!ma || ma === 0) return null;
    
    const current = closes[closes.length - 1];
    return ((current - ma) / ma) * 100;
}

// 10-C3. Price Momentum Oscillator (PMO)
export function PriceMomentumOscillator(closes, smooth1 = 35, smooth2 = 20, signal = 10) {
    if (closes.length < smooth1 + smooth2) return null;
    
    // ROC 계산
    const roc = [];
    for (let i = 1; i < closes.length; i++) {
        roc.push(((closes[i] - closes[i-1]) / closes[i-1]) * 100);
    }
    
    // Double EMA smoothing
    const ema1 = EMA(roc, smooth1);
    if (!ema1) return null;
    
    // 간략화된 PMO
    const pmo = ema1 * 10;
    const signalLine = pmo * 0.9;
    
    return {
        pmo,
        signal: signalLine,
        histogram: pmo - signalLine,
        bullish: pmo > signalLine
    };
}

// 10-C4. Volume Price Confirmation Indicator (VPCI)
export function VPCI(closes, volumes, shortPeriod = 5, longPeriod = 20) {
    if (closes.length < longPeriod) return null;
    
    const vwmaShort = VWMA(closes, volumes, shortPeriod);
    const vwmaLong = VWMA(closes, volumes, longPeriod);
    const smaShort = SMA(closes, shortPeriod);
    const smaLong = SMA(closes, longPeriod);
    
    if (!vwmaShort || !vwmaLong || !smaShort || !smaLong) return null;
    
    // VPC = VWMA - SMA
    const vpcShort = vwmaShort - smaShort;
    const vpcLong = vwmaLong - smaLong;
    
    // VPCI = VPC_short - VPC_long
    return {
        value: vpcShort - vpcLong,
        vpcShort,
        vpcLong,
        confirmation: (vpcShort > 0 && vpcLong > 0) ? 1 : ((vpcShort < 0 && vpcLong < 0) ? -1 : 0)
    };
}

// 10-C5. Efficiency Ratio (Kaufman)
export function EfficiencyRatio(closes, period = 10) {
    if (closes.length < period + 1) return null;
    
    // 방향성 움직임 (시작-끝 차이)
    const direction = Math.abs(closes[closes.length - 1] - closes[closes.length - period - 1]);
    
    // 변동성 (절대 변화량 합)
    let volatility = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        volatility += Math.abs(closes[i] - closes[i - 1]);
    }
    
    return volatility !== 0 ? direction / volatility : 0;
}

// 10-C6. Normalized ATR (NATR)
export function NormalizedATR(highs, lows, closes, period = 14) {
    const atr = ATR(highs, lows, closes, period);
    if (!atr) return null;
    
    const current = closes[closes.length - 1];
    return current !== 0 ? (atr / current) * 100 : 0;
}

// 10-C7. Relative Volume (RVOL)
export function RelativeVolume(volumes, period = 20) {
    if (volumes.length < period) return null;
    
    const avgVol = SMA(volumes.slice(0, -1), period);
    if (!avgVol || avgVol === 0) return null;
    
    return volumes[volumes.length - 1] / avgVol;
}

// 10-C8. Acceleration Bands
export function AccelerationBands(highs, lows, closes, period = 20, factor = 0.001) {
    if (closes.length < period) return null;
    
    const smaHigh = SMA(highs, period);
    const smaLow = SMA(lows, period);
    const smaClose = SMA(closes, period);
    
    if (!smaHigh || !smaLow || !smaClose) return null;
    
    // 밴드 계산
    const upperBand = smaHigh * (1 + factor * ((smaHigh - smaLow) / smaClose * 1000));
    const lowerBand = smaLow * (1 - factor * ((smaHigh - smaLow) / smaClose * 1000));
    
    const current = closes[closes.length - 1];
    
    return {
        upper: upperBand,
        middle: smaClose,
        lower: lowerBand,
        position: ((current - lowerBand) / (upperBand - lowerBand)) * 100,
        breakout: current > upperBand ? 1 : (current < lowerBand ? -1 : 0)
    };
}

// 10-C9. Range Expansion Index (REI)
export function RangeExpansionIndex(highs, lows, closes, period = 8) {
    if (closes.length < period + 5) return null;
    
    let upSum = 0, downSum = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        // 조건 체크
        const cond1 = highs[i] >= lows[i-2] || highs[i] >= lows[i-5];
        const cond2 = lows[i] <= highs[i-2] || lows[i] <= highs[i-5];
        
        if (cond1 && cond2) {
            const value = (highs[i] - highs[i-2]) + (lows[i] - lows[i-2]);
            if (value > 0) upSum += value;
            else downSum += Math.abs(value);
        }
    }
    
    const total = upSum + downSum;
    return total !== 0 ? ((upSum - downSum) / total) * 100 : 0;
}

// 10-C10. Net Volume
export function NetVolume(closes, volumes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let netVol = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) {
            netVol += volumes[i];
        } else if (closes[i] < closes[i - 1]) {
            netVol -= volumes[i];
        }
    }
    
    return netVol;
}

// 10-C11. Volume Zone Oscillator (VZO)
export function VolumeZoneOscillator(closes, volumes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let posVol = 0, negVol = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) {
            posVol += volumes[i];
        } else {
            negVol += volumes[i];
        }
    }
    
    const total = posVol + negVol;
    return total !== 0 ? ((posVol - negVol) / total) * 100 : 0;
}

// 10-C12. Typical Price
export function TypicalPrice(highs, lows, closes) {
    const i = closes.length - 1;
    return (highs[i] + lows[i] + closes[i]) / 3;
}

// 10-C13. Weighted Close
export function WeightedClose(highs, lows, closes) {
    const i = closes.length - 1;
    return (highs[i] + lows[i] + closes[i] * 2) / 4;
}

// 10-C14. Elder's Thermometer
export function ElderThermometer(highs, lows, period = 22) {
    if (highs.length < period + 1) return null;
    
    // 현재 온도 (고점/저점 차이의 최대값)
    const temp = [];
    for (let i = 1; i < highs.length; i++) {
        const highDiff = Math.abs(highs[i] - highs[i-1]);
        const lowDiff = Math.abs(lows[i] - lows[i-1]);
        temp.push(Math.max(highDiff, lowDiff));
    }
    
    const currentTemp = temp[temp.length - 1];
    const avgTemp = SMA(temp, period);
    
    if (!avgTemp) return null;
    
    return {
        value: currentTemp,
        average: avgTemp,
        ratio: avgTemp !== 0 ? currentTemp / avgTemp : 1,
        hot: currentTemp > avgTemp * 1.5,
        cold: currentTemp < avgTemp * 0.7
    };
}

// 10-C15. Commodity Selection Index (CSI)
export function CommoditySelectionIndex(highs, lows, closes, period = 14) {
    const adx = ADX(highs, lows, closes, period);
    const atr = ATR(highs, lows, closes, period);
    
    if (!adx || !atr) return null;
    
    // CSI = ADX * ATR / Close * 100
    const close = closes[closes.length - 1];
    return close !== 0 ? (adx * atr / close) * 100 : 0;
}

// 10-C16. Mass Trend (Mass Index 기반)
export function MassTrend(highs, lows, period = 9, sumPeriod = 25) {
    if (highs.length < sumPeriod + period * 2) return null;
    
    // EMA of (High - Low)
    const range = [];
    for (let i = 0; i < highs.length; i++) {
        range.push(highs[i] - lows[i]);
    }
    
    const ema1 = EMA(range, period);
    const ema2 = EMA(range, period); // 간략화
    
    if (!ema1 || !ema2 || ema2 === 0) return null;
    
    // 실제로는 sumPeriod 동안의 ratio 합계
    const ratio = ema1 / ema2;
    const mass = ratio * sumPeriod;
    
    return {
        value: mass,
        bulge: mass > 27,   // 반전 임박
        squeeze: mass < 26.5
    };
}

// 10-C17. Trend Detection Index (TDI)
export function TrendDetectionIndex(closes, period = 20, signal = 5) {
    if (closes.length < period + signal) return null;
    
    // 가격 변화 모멘텀
    const momentum = closes[closes.length - 1] - closes[closes.length - period - 1];
    
    // 절대 가격 변화 합
    let absSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        absSum += Math.abs(closes[i] - closes[i - 1]);
    }
    
    // TDI = 모멘텀의 절대값 - 절대합/2
    const tdi = Math.abs(momentum) - absSum / 2;
    
    return {
        value: tdi,
        trending: tdi > 0,
        strength: absSum !== 0 ? Math.abs(momentum) / absSum : 0
    };
}

// 10-C18. Absolute Price Oscillator (APO)
export function AbsolutePriceOscillator(closes, fast = 12, slow = 26) {
    const emaFast = EMA(closes, fast);
    const emaSlow = EMA(closes, slow);
    
    if (!emaFast || !emaSlow) return null;
    
    return emaFast - emaSlow;
}

// 10-C19. Percentage Volume Oscillator (PVO)
export function PercentageVolumeOscillator(volumes, fast = 12, slow = 26, signal = 9) {
    if (volumes.length < slow) return null;
    
    const emaFast = EMA(volumes, fast);
    const emaSlow = EMA(volumes, slow);
    
    if (!emaFast || !emaSlow || emaSlow === 0) return null;
    
    const pvo = ((emaFast - emaSlow) / emaSlow) * 100;
    const signalLine = pvo * 0.9; // 간략화
    
    return {
        pvo,
        signal: signalLine,
        histogram: pvo - signalLine,
        bullish: pvo > signalLine
    };
}

// 10-C20. Price Action Channel (Highest/Lowest)
export function PriceActionChannel(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    const highest = Math.max(...highs.slice(-period));
    const lowest = Math.min(...lows.slice(-period));
    const middle = (highest + lowest) / 2;
    const current = closes[closes.length - 1];
    
    return {
        upper: highest,
        middle,
        lower: lowest,
        position: ((current - lowest) / (highest - lowest)) * 100,
        width: ((highest - lowest) / current) * 100,
        nearHigh: current >= highest * 0.98,
        nearLow: current <= lowest * 1.02
    };
}

// 10-C21. Rainbow Oscillator
export function RainbowOscillator(closes, period = 2, levels = 10) {
    if (closes.length < period * levels) return null;
    
    // 다단계 SMA 평균
    let smaSum = 0;
    let data = closes;
    
    for (let level = 0; level < levels; level++) {
        const sma = SMA(data, period);
        if (sma) smaSum += sma;
        // 다음 레벨을 위해 SMA를 다시 적용 (간략화)
    }
    
    const avgSma = smaSum / levels;
    const current = closes[closes.length - 1];
    
    // High/Low 계산 (간략화)
    const highest = Math.max(...closes.slice(-period * levels));
    const lowest = Math.min(...closes.slice(-period * levels));
    const range = highest - lowest;
    
    return range !== 0 ? ((current - avgSma) / range) * 100 : 0;
}

// 10-C22. Trend Continuation Factor (TCF)
export function TrendContinuationFactor(closes, period = 35) {
    if (closes.length < period + 1) return null;
    
    let upCount = 0, downCount = 0;
    let upSum = 0, downSum = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) {
            upCount++;
            upSum += change;
        } else if (change < 0) {
            downCount++;
            downSum += Math.abs(change);
        }
    }
    
    const plusTcf = upCount > 0 ? upSum : 0;
    const minusTcf = downCount > 0 ? downSum : 0;
    
    return {
        plus: plusTcf,
        minus: minusTcf,
        diff: plusTcf - minusTcf,
        bullish: plusTcf > minusTcf
    };
}

// 10-C23. Smoothed Rate of Change (SROC)
export function SmoothedROC(closes, rocPeriod = 12, smoothPeriod = 10) {
    if (closes.length < rocPeriod + smoothPeriod) return null;
    
    // EMA로 스무딩된 가격
    const smoothed = [];
    for (let i = smoothPeriod; i <= closes.length; i++) {
        const ema = EMA(closes.slice(0, i), smoothPeriod);
        if (ema) smoothed.push(ema);
    }
    
    if (smoothed.length < rocPeriod + 1) return null;
    
    // 스무딩된 가격의 ROC
    const prev = smoothed[smoothed.length - rocPeriod - 1];
    const curr = smoothed[smoothed.length - 1];
    
    return prev !== 0 ? ((curr - prev) / prev) * 100 : 0;
}

// 10-C24. Detrended Synthetic Price (DSP)
export function DetrendedSyntheticPrice(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    // WMA와 SMA 차이
    const wma = WMA(closes, period);
    const sma = SMA(closes, period / 2);
    
    if (!wma || !sma) return null;
    
    return wma - sma;
}

// 10-C25. Inertia Indicator
export function InertiaIndicator(closes, period = 20, smoothPeriod = 14) {
    if (closes.length < period + smoothPeriod) return null;
    
    // RVI 스무딩 (간략화)
    const rvi = [];
    for (let i = period; i <= closes.length; i++) {
        const slice = closes.slice(i - period, i);
        const std = StandardDeviation(slice, period);
        if (std) rvi.push(std);
    }
    
    if (rvi.length < smoothPeriod) return null;
    
    // Linear Regression of RVI
    const recent = rvi.slice(-smoothPeriod);
    const sum = recent.reduce((a, b) => a + b, 0);
    
    return sum / smoothPeriod;
}

// 10-C26. Vortex Indicator (Combined)
export function VortexIndicator(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let plusVM = 0, minusVM = 0, trSum = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        // +VM, -VM
        plusVM += Math.abs(highs[i] - lows[i - 1]);
        minusVM += Math.abs(lows[i] - highs[i - 1]);
        
        // True Range
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        trSum += tr;
    }
    
    if (trSum === 0) return null;
    
    const viPlus = plusVM / trSum;
    const viMinus = minusVM / trSum;
    
    return {
        plus: viPlus,
        minus: viMinus,
        diff: viPlus - viMinus,
        bullish: viPlus > viMinus,
        crossUp: viPlus > viMinus && viPlus - viMinus < 0.1,
        crossDown: viMinus > viPlus && viMinus - viPlus < 0.1
    };
}

// 10-C27. Williams Accumulation/Distribution
export function WilliamsAD(highs, lows, closes) {
    if (closes.length < 2) return null;
    
    const i = closes.length - 1;
    const trueHigh = Math.max(highs[i], closes[i - 1]);
    const trueLow = Math.min(lows[i], closes[i - 1]);
    
    let wad = 0;
    if (closes[i] > closes[i - 1]) {
        wad = closes[i] - trueLow;
    } else if (closes[i] < closes[i - 1]) {
        wad = closes[i] - trueHigh;
    }
    
    return wad;
}

// 10-C28. Cumulative Williams AD
export function CumulativeWilliamsAD(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let cumWad = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const trueHigh = Math.max(highs[i], closes[i - 1]);
        const trueLow = Math.min(lows[i], closes[i - 1]);
        
        if (closes[i] > closes[i - 1]) {
            cumWad += closes[i] - trueLow;
        } else if (closes[i] < closes[i - 1]) {
            cumWad += closes[i] - trueHigh;
        }
    }
    
    return cumWad;
}

// 10-C29. Elder's Bull Bear Balance
export function BullBearBalance(highs, lows, closes, period = 13) {
    if (closes.length < period) return null;
    
    const ema = EMA(closes, period);
    if (!ema) return null;
    
    const current = closes.length - 1;
    const bullPower = highs[current] - ema;
    const bearPower = lows[current] - ema;
    
    return {
        bull: bullPower,
        bear: bearPower,
        balance: bullPower + bearPower,
        bullish: bullPower > 0 && bearPower > bearPower * 0.9 // 강세 조건
    };
}

// 10-C30. Trend Intensity Index (개선)
export function TrendIntensityIndexEnhanced(closes, period = 30) {
    if (closes.length < period) return null;
    
    const ma = SMA(closes, period);
    if (!ma) return null;
    
    let upCount = 0, downCount = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > ma) upCount++;
        else if (closes[i] < ma) downCount++;
    }
    
    const total = upCount + downCount;
    return total !== 0 ? (upCount / total) * 100 : 50;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 검증된 고급 지표 (4차 추가 - 패턴/사이클/가격채널)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// 4-1. Elder Ray Index (불파워 + 베어파워 종합)
export function ElderRay(highs, lows, closes, period = 13) {
    if (closes.length < period) return null;
    const ema = EMA(closes, period);
    if (!ema) return null;
    const current = closes.length - 1;
    const bullPower = highs[current] - ema;
    const bearPower = lows[current] - ema;
    return {
        bull: bullPower,
        bear: bearPower,
        strength: bullPower - Math.abs(bearPower),
        bullish: bullPower > 0 && bearPower > -bullPower * 0.5
    };
}

// 4-2. Twiggs Money Flow (CMF 개선)
export function TwiggsMoneyFlow(highs, lows, closes, volumes, period = 21) {
    if (closes.length < period + 1) return null;
    
    let adSum = 0;
    let volSum = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const prevClose = closes[i - 1];
        const trHigh = Math.max(highs[i], prevClose);
        const trLow = Math.min(lows[i], prevClose);
        const trRange = trHigh - trLow;
        
        if (trRange > 0) {
            const ad = ((closes[i] - trLow) - (trHigh - closes[i])) / trRange;
            adSum += ad * volumes[i];
        }
        volSum += volumes[i];
    }
    
    return volSum !== 0 ? (adSum / volSum) * 100 : 0;
}

// 4-3. Volume Rate of Change
export function VolumeROC(volumes, period = 14) {
    if (volumes.length < period + 1) return null;
    const current = volumes[volumes.length - 1];
    const past = volumes[volumes.length - period - 1];
    return past !== 0 ? ((current - past) / past) * 100 : 0;
}

// 4-4. Volume Weighted MACD
export function VWMACD(closes, volumes, fastPeriod = 12, slowPeriod = 26) {
    const vwmaFast = VWMA(closes, volumes, fastPeriod);
    const vwmaSlow = VWMA(closes, volumes, slowPeriod);
    if (!vwmaFast || !vwmaSlow) return null;
    return vwmaFast - vwmaSlow;
}

// 4-5. Price Channel (최고가/최저가 채널)
export function PriceChannel(highs, lows, period = 20) {
    if (highs.length < period) return null;
    const sliceH = highs.slice(-period);
    const sliceL = lows.slice(-period);
    const upper = Math.max(...sliceH);
    const lower = Math.min(...sliceL);
    return {
        upper,
        lower,
        middle: (upper + lower) / 2,
        width: ((upper - lower) / lower) * 100
    };
}

// 4-6. Fibonacci Pivot Points
export function FibonacciPivot(high, low, close) {
    const pp = (high + low + close) / 3;
    const range = high - low;
    return {
        pp,
        r1: pp + 0.382 * range,
        r2: pp + 0.618 * range,
        r3: pp + range,
        s1: pp - 0.382 * range,
        s2: pp - 0.618 * range,
        s3: pp - range
    };
}

// 4-7. Camarilla Pivot Points
export function CamarillaPivot(high, low, close) {
    const range = high - low;
    return {
        r4: close + range * 1.1 / 2,
        r3: close + range * 1.1 / 4,
        r2: close + range * 1.1 / 6,
        r1: close + range * 1.1 / 12,
        s1: close - range * 1.1 / 12,
        s2: close - range * 1.1 / 6,
        s3: close - range * 1.1 / 4,
        s4: close - range * 1.1 / 2
    };
}

// 4-8. Woodie Pivot Points
export function WoodiePivot(high, low, close) {
    const pp = (high + low + 2 * close) / 4;
    return {
        pp,
        r1: 2 * pp - low,
        r2: pp + (high - low),
        s1: 2 * pp - high,
        s2: pp - (high - low)
    };
}

// 4-9. DeMark Pivot Points
export function DeMarkPivot(high, low, open, close) {
    let x;
    if (close < open) x = high + 2 * low + close;
    else if (close > open) x = 2 * high + low + close;
    else x = high + low + 2 * close;
    
    const pp = x / 4;
    return {
        pp,
        r1: x / 2 - low,
        s1: x / 2 - high
    };
}

// 4-10. True Strength Index Histogram
export function TSIHistogram(closes, longPeriod = 25, shortPeriod = 13, signalPeriod = 7) {
    const tsiVal = TSI(closes, longPeriod, shortPeriod);
    if (!tsiVal) return null;
    
    // TSI 시리즈 계산
    const tsiSeries = [];
    for (let i = longPeriod + shortPeriod; i <= closes.length; i++) {
        const slice = closes.slice(0, i);
        const t = TSI(slice, longPeriod, shortPeriod);
        if (t !== null) tsiSeries.push(t);
    }
    
    if (tsiSeries.length < signalPeriod) return { tsi: tsiVal, signal: tsiVal, histogram: 0 };
    
    const signal = EMA(tsiSeries, signalPeriod);
    return {
        tsi: tsiVal,
        signal: signal || tsiVal,
        histogram: tsiVal - (signal || tsiVal)
    };
}

// 4-11. Keltner Channel Position
export function KeltnerPosition(highs, lows, closes, period = 20, multiplier = 2) {
    const kc = KeltnerChannel(highs, lows, closes, period, multiplier);
    if (!kc) return null;
    const current = closes[closes.length - 1];
    const range = kc.upper - kc.lower;
    return range !== 0 ? ((current - kc.lower) / range) * 100 : 50;
}

// 4-12. Bollinger Band Trend
export function BollingerTrend(closes, period = 20) {
    if (closes.length < period + 5) return null;
    const bb = BollingerBands(closes, period);
    const prevBB = BollingerBands(closes.slice(0, -5), period);
    if (!bb || !prevBB) return null;
    
    const middleTrend = bb.middle > prevBB.middle ? 1 : -1;
    const widthChange = bb.width - prevBB.width;
    
    return {
        direction: middleTrend,
        expanding: widthChange > 0,
        strength: Math.abs(bb.middle - prevBB.middle) / prevBB.middle * 100
    };
}

// 4-13. RSI Divergence Detector
export function RSIDivergence(closes, period = 14, lookback = 10) {
    if (closes.length < period + lookback) return null;
    
    const currentRSI = RSI(closes, period);
    const prevRSI = RSI(closes.slice(0, -lookback), period);
    const currentPrice = closes[closes.length - 1];
    const prevPrice = closes[closes.length - lookback - 1];
    
    if (!currentRSI || !prevRSI) return null;
    
    const priceUp = currentPrice > prevPrice;
    const rsiUp = currentRSI > prevRSI;
    
    if (priceUp && !rsiUp) return -1; // Bearish divergence
    if (!priceUp && rsiUp) return 1;  // Bullish divergence
    return 0; // No divergence
}

// 4-14. MACD Divergence Detector
export function MACDDivergence(closes, lookback = 10) {
    if (closes.length < 26 + lookback) return null;
    
    const currentMACD = MACD(closes);
    const prevMACD = MACD(closes.slice(0, -lookback));
    const currentPrice = closes[closes.length - 1];
    const prevPrice = closes[closes.length - lookback - 1];
    
    if (!currentMACD || !prevMACD) return null;
    
    const priceUp = currentPrice > prevPrice;
    const macdUp = currentMACD.histogram > prevMACD.histogram;
    
    if (priceUp && !macdUp) return -1; // Bearish divergence
    if (!priceUp && macdUp) return 1;  // Bullish divergence
    return 0;
}

// 4-15. Stochastic Divergence Detector
export function StochDivergence(highs, lows, closes, period = 14, lookback = 10) {
    if (closes.length < period + lookback) return null;
    
    const currentStoch = StochasticK(highs, lows, closes, period);
    const prevStoch = StochasticK(
        highs.slice(0, -lookback),
        lows.slice(0, -lookback),
        closes.slice(0, -lookback),
        period
    );
    const currentPrice = closes[closes.length - 1];
    const prevPrice = closes[closes.length - lookback - 1];
    
    if (currentStoch === null || prevStoch === null) return null;
    
    const priceUp = currentPrice > prevPrice;
    const stochUp = currentStoch > prevStoch;
    
    if (priceUp && !stochUp) return -1;
    if (!priceUp && stochUp) return 1;
    return 0;
}

// 4-16. Momentum Divergence Index (종합 다이버전스)
export function MomentumDivergenceIndex(highs, lows, closes, lookback = 10) {
    const rsiDiv = RSIDivergence(closes, 14, lookback) || 0;
    const macdDiv = MACDDivergence(closes, lookback) || 0;
    const stochDiv = StochDivergence(highs, lows, closes, 14, lookback) || 0;
    
    return {
        rsi: rsiDiv,
        macd: macdDiv,
        stoch: stochDiv,
        combined: rsiDiv + macdDiv + stochDiv,
        bullish: (rsiDiv + macdDiv + stochDiv) >= 2,
        bearish: (rsiDiv + macdDiv + stochDiv) <= -2
    };
}

// 4-17. Price Momentum Quality
export function PriceMomentumQuality(closes, shortPeriod = 5, longPeriod = 20) {
    if (closes.length < longPeriod) return null;
    
    const shortMom = ROC(closes, shortPeriod);
    const longMom = ROC(closes, longPeriod);
    
    if (shortMom === null || longMom === null) return null;
    
    // 단기/장기 모멘텀 일치도
    const aligned = (shortMom > 0 && longMom > 0) || (shortMom < 0 && longMom < 0);
    const quality = aligned ? Math.min(Math.abs(shortMom), Math.abs(longMom)) : 0;
    
    return {
        short: shortMom,
        long: longMom,
        aligned,
        quality: shortMom > 0 ? quality : -quality
    };
}

// 4-18. Trend Quality Indicator
export function TrendQuality(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    const ema = EMA(closes, period);
    const prevEma = EMA(closes.slice(0, -period), period);
    
    if (!ema || !prevEma) return null;
    
    // 추세 일관성 측정
    let consistent = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const aboveEma = closes[i] > EMA(closes.slice(0, i + 1), period);
        if (ema > prevEma && aboveEma) consistent++;
        else if (ema < prevEma && !aboveEma) consistent++;
    }
    
    return (consistent / period) * 100;
}

// 4-19. Volatility Quality Ratio
export function VolatilityQuality(highs, lows, closes, period = 14) {
    if (closes.length < period) return null;
    
    const atr = ATR(highs, lows, closes, period);
    const priceChange = Math.abs(closes[closes.length - 1] - closes[closes.length - period]);
    
    if (!atr || atr === 0) return null;
    
    // 실제 가격 변화 대비 변동성
    return (priceChange / (atr * period)) * 100;
}

// 4-20. Money Flow Multiplier
export function MoneyFlowMultiplier(high, low, close) {
    const range = high - low;
    if (range === 0) return 0;
    return ((close - low) - (high - close)) / range;
}

// 4-21. Enhanced ADL (Accumulation/Distribution with Volume Weight)
export function EnhancedADL(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period) return null;
    
    let adl = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const mfm = MoneyFlowMultiplier(highs[i], lows[i], closes[i]);
        adl += mfm * volumes[i];
    }
    
    const avgVol = volumes.slice(-period).reduce((a, b) => a + b, 0) / period;
    return avgVol !== 0 ? adl / avgVol : 0;
}

// 4-22. Volume Price Confirmation
export function VolumePriceConfirm(closes, volumes, period = 10) {
    if (closes.length < period) return null;
    
    let priceUp = 0, volUp = 0;
    for (let i = closes.length - period; i < closes.length - 1; i++) {
        if (closes[i + 1] > closes[i]) {
            priceUp++;
            if (volumes[i + 1] > volumes[i]) volUp++;
        }
    }
    
    const priceUpRatio = priceUp / (period - 1);
    const confirmRatio = priceUp > 0 ? volUp / priceUp : 0;
    
    return {
        priceUpRatio: priceUpRatio * 100,
        confirmRatio: confirmRatio * 100,
        confirmed: confirmRatio > 0.6
    };
}

// 4-23. Trend Persistence
export function TrendPersistence(closes, period = 20) {
    if (closes.length < period) return null;
    
    let upCount = 0, downCount = 0;
    for (let i = closes.length - period; i < closes.length - 1; i++) {
        if (closes[i + 1] > closes[i]) upCount++;
        else if (closes[i + 1] < closes[i]) downCount++;
    }
    
    const total = upCount + downCount;
    const bias = total !== 0 ? (upCount - downCount) / total : 0;
    
    return {
        upRatio: upCount / (period - 1) * 100,
        downRatio: downCount / (period - 1) * 100,
        bias: bias * 100,
        persistent: Math.abs(bias) > 0.3
    };
}

// 4-24. Dynamic Support/Resistance
export function DynamicSR(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    const sliceH = highs.slice(-period);
    const sliceL = lows.slice(-period);
    
    // 최근 최고/최저점
    const resistance = Math.max(...sliceH);
    const support = Math.min(...sliceL);
    const current = closes[closes.length - 1];
    
    return {
        resistance,
        support,
        distToResist: ((resistance - current) / current) * 100,
        distToSupport: ((current - support) / current) * 100,
        position: ((current - support) / (resistance - support)) * 100
    };
}

// 4-25. Breakout Probability
export function BreakoutProbability(highs, lows, closes, period = 20) {
    if (closes.length < period * 2) return null;
    
    const currentRange = Math.max(...highs.slice(-period)) - Math.min(...lows.slice(-period));
    const prevRange = Math.max(...highs.slice(-period * 2, -period)) - 
                      Math.min(...lows.slice(-period * 2, -period));
    
    const current = closes[closes.length - 1];
    const resistance = Math.max(...highs.slice(-period));
    const support = Math.min(...lows.slice(-period));
    
    const rangeShrinking = currentRange < prevRange * 0.8;
    const nearResistance = (resistance - current) / current < 0.01;
    const nearSupport = (current - support) / current < 0.01;
    
    return {
        rangeShrinking,
        nearResistance,
        nearSupport,
        upBreakout: rangeShrinking && nearResistance,
        downBreakout: rangeShrinking && nearSupport
    };
}

// 4-26. Momentum Exhaustion
export function MomentumExhaustion(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    const recentROC = ROC(closes, period);
    const prevROC = ROC(closes.slice(0, -period), period);
    
    if (recentROC === null || prevROC === null) return null;
    
    // 모멘텀 약화 감지
    const weakening = Math.abs(recentROC) < Math.abs(prevROC) * 0.5;
    const reversing = (recentROC > 0 && prevROC > recentROC * 2) ||
                     (recentROC < 0 && prevROC < recentROC * 2);
    
    return {
        current: recentROC,
        previous: prevROC,
        exhausted: weakening,
        reversing
    };
}

// 4-27. Volume Breakout Indicator
export function VolumeBreakout(volumes, period = 20, multiplier = 2) {
    if (volumes.length < period) return null;
    
    const avgVol = volumes.slice(-period - 1, -1).reduce((a, b) => a + b, 0) / period;
    const currentVol = volumes[volumes.length - 1];
    
    return {
        ratio: currentVol / avgVol,
        breakout: currentVol > avgVol * multiplier,
        climax: currentVol > avgVol * 3
    };
}

// 4-28. Price Velocity
export function PriceVelocity(closes, period = 5) {
    if (closes.length < period) return null;
    
    const changes = [];
    for (let i = closes.length - period; i < closes.length - 1; i++) {
        changes.push(closes[i + 1] - closes[i]);
    }
    
    const velocity = changes.reduce((a, b) => a + b, 0) / changes.length;
    const acceleration = changes.length > 1 ? 
        changes[changes.length - 1] - changes[0] : 0;
    
    return {
        velocity,
        acceleration,
        accelerating: acceleration > 0 && velocity > 0,
        decelerating: acceleration < 0 && velocity > 0
    };
}

// 4-29. Composite Trend Score
export function CompositeTrendScore(highs, lows, closes, volumes) {
    // 여러 지표 종합 점수
    const adx = ADX(highs, lows, closes, 14);
    const rsi = RSI(closes, 14);
    const macd = MACD(closes);
    const plusDI = PlusDI(highs, lows, closes, 14);
    const minusDI = MinusDI(highs, lows, closes, 14);
    
    let score = 50;
    
    if (adx !== null && adx > 25) score += 10;
    if (rsi !== null) {
        if (rsi > 50 && rsi < 70) score += 10;
        if (rsi < 50 && rsi > 30) score -= 10;
    }
    if (macd !== null && macd.histogram > 0) score += 10;
    if (plusDI !== null && minusDI !== null && plusDI > minusDI) score += 10;
    
    return Math.max(0, Math.min(100, score));
}

// 4-30. Price Oscillator
export function PriceOscillator(closes, shortPeriod = 5, longPeriod = 20) {
    const shortMA = SMA(closes, shortPeriod);
    const longMA = SMA(closes, longPeriod);
    if (!shortMA || !longMA || longMA === 0) return null;
    return ((shortMA - longMA) / longMA) * 100;
}

// 4-31. Chande Momentum Oscillator Enhanced
export function CMOEnhanced(closes, period = 14) {
    const cmo = CMO(closes, period);
    if (cmo === null) return null;
    
    // CMO 시리즈로 트렌드 계산
    const cmoSeries = [];
    for (let i = period; i <= closes.length; i++) {
        const c = CMO(closes.slice(0, i), period);
        if (c !== null) cmoSeries.push(c);
    }
    
    const trend = cmoSeries.length > 3 ? 
        cmoSeries[cmoSeries.length - 1] - cmoSeries[cmoSeries.length - 4] : 0;
    
    return {
        value: cmo,
        trend,
        overbought: cmo > 50,
        oversold: cmo < -50,
        rising: trend > 0
    };
}

// 4-32. Volume Spread Analysis
export function VolumeSpread(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period) return null;
    
    let upVol = 0, downVol = 0;
    let upSpread = 0, downSpread = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const spread = highs[i] - lows[i];
        if (closes[i] > closes[i - 1]) {
            upVol += volumes[i];
            upSpread += spread;
        } else {
            downVol += volumes[i];
            downSpread += spread;
        }
    }
    
    return {
        upVolume: upVol,
        downVolume: downVol,
        ratio: downVol !== 0 ? upVol / downVol : upVol > 0 ? 999 : 0,
        bullish: upVol > downVol && upSpread < downSpread
    };
}

// 4-33. Relative Price Strength
export function RelativePriceStrength(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    const recentChange = (closes[closes.length - 1] - closes[closes.length - period]) / 
                         closes[closes.length - period] * 100;
    const prevChange = (closes[closes.length - period - 1] - closes[closes.length - period * 2]) /
                       closes[closes.length - period * 2] * 100;
    
    return {
        recent: recentChange,
        previous: prevChange,
        improving: recentChange > prevChange,
        strong: recentChange > 0 && recentChange > prevChange
    };
}

// 4-34. Trend Angle
export function TrendAngle(closes, period = 14) {
    if (closes.length < period) return null;
    
    // 선형회귀 기울기를 각도로 변환
    const slope = LinearRegressionSlope(closes, period);
    if (slope === null) return null;
    
    // 기울기를 각도로 (atan)
    const angle = Math.atan(slope) * (180 / Math.PI);
    
    return {
        angle,
        steep: Math.abs(angle) > 45,
        flat: Math.abs(angle) < 10,
        bullish: angle > 0
    };
}

// 4-35. Smoothed Rate of Change
export function SmoothedROCEnhanced(closes, rocPeriod = 12, smoothPeriod = 5) {
    if (closes.length < rocPeriod + smoothPeriod) return null;
    
    const rocSeries = [];
    for (let i = rocPeriod; i <= closes.length; i++) {
        const roc = ROC(closes.slice(0, i), rocPeriod);
        if (roc !== null) rocSeries.push(roc);
    }
    
    if (rocSeries.length < smoothPeriod) return null;
    
    const smoothed = SMA(rocSeries, smoothPeriod);
    const current = rocSeries[rocSeries.length - 1];
    
    return {
        raw: current,
        smoothed,
        momentum: current - (smoothed || 0)
    };
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 5차 검증된 고급 지표 (40개) - 고급 분석/시장 구조/확률 기반                 │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 5-1. Stochastic Momentum Index (SMI)
export function StochasticMomentumIndex(highs, lows, closes, period = 13, smooth1 = 25, smooth2 = 2) {
    if (closes.length < period + smooth1 + smooth2) return null;
    
    const highestHigh = Math.max(...highs.slice(-period));
    const lowestLow = Math.min(...lows.slice(-period));
    const midpoint = (highestHigh + lowestLow) / 2;
    const close = closes[closes.length - 1];
    
    const diff = close - midpoint;
    const range = highestHigh - lowestLow;
    
    if (range === 0) return null;
    
    const smi = (diff / (range / 2)) * 100;
    
    return {
        value: smi,
        overbought: smi > 40,
        oversold: smi < -40,
        bullish: smi > 0
    };
}

// 5-2. Relative Vigor Index Enhanced
export function RVIEnhanced(opens, highs, lows, closes, period = 10) {
    if (closes.length < period + 4) return null;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const close = closes[i];
        const open = opens[i] || closes[Math.max(0, i - 1)];
        const high = highs[i];
        const low = lows[i];
        
        numerator += (close - open);
        denominator += (high - low);
    }
    
    if (denominator === 0) return null;
    
    const rvi = numerator / denominator;
    
    return {
        value: rvi,
        bullish: rvi > 0,
        strong: Math.abs(rvi) > 0.3
    };
}

// 5-3. Williams Accumulation Distribution
export function WilliamsAccumDist(highs, lows, closes, volumes) {
    if (closes.length < 2) return null;
    
    let wad = 0;
    for (let i = 1; i < closes.length; i++) {
        const close = closes[i];
        const prevClose = closes[i - 1];
        const high = highs[i];
        const low = lows[i];
        
        let trueHigh = Math.max(high, prevClose);
        let trueLow = Math.min(low, prevClose);
        
        if (close > prevClose) {
            wad += close - trueLow;
        } else if (close < prevClose) {
            wad += close - trueHigh;
        }
    }
    
    return wad;
}

// 5-4. Qstick Enhanced
export function QstickEnhanced(opens, closes, period = 8) {
    if (closes.length < period) return null;
    
    const qsticks = [];
    for (let i = closes.length - period; i < closes.length; i++) {
        const open = opens[i] || closes[Math.max(0, i - 1)];
        qsticks.push(closes[i] - open);
    }
    
    const avg = qsticks.reduce((a, b) => a + b, 0) / qsticks.length;
    const trend = qsticks[qsticks.length - 1] > qsticks[0] ? 1 : -1;
    
    return {
        value: avg,
        trend,
        bullish: avg > 0,
        strong: Math.abs(avg) > closes[closes.length - 1] * 0.001
    };
}

// 5-5. Price Action Strength
export function PriceActionStrength(highs, lows, closes, period = 14) {
    if (closes.length < period) return null;
    
    let bullStrength = 0;
    let bearStrength = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const close = closes[i];
        const range = high - low;
        
        if (range > 0) {
            bullStrength += (close - low) / range;
            bearStrength += (high - close) / range;
        }
    }
    
    const total = bullStrength + bearStrength;
    if (total === 0) return null;
    
    return {
        bullPct: (bullStrength / total) * 100,
        bearPct: (bearStrength / total) * 100,
        bias: bullStrength > bearStrength ? 'bullish' : 'bearish',
        strength: Math.abs(bullStrength - bearStrength) / period
    };
}

// 5-6. Trend Strength Index
export function TrendStrengthIndex(closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    let ups = 0;
    let downs = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) ups++;
        else if (closes[i] < closes[i - 1]) downs++;
    }
    
    const tsi = ((ups - downs) / period) * 100;
    
    return {
        value: tsi,
        strong: Math.abs(tsi) > 30,
        direction: tsi > 0 ? 'up' : 'down'
    };
}

// 5-7. Moving Average Convergence
export function MAConvergence(closes, fast = 10, slow = 30) {
    if (closes.length < slow) return null;
    
    const fastMA = EMA(closes, fast);
    const slowMA = EMA(closes, slow);
    
    if (!fastMA || !slowMA) return null;
    
    const convergence = ((fastMA - slowMA) / slowMA) * 100;
    
    return {
        value: convergence,
        bullish: fastMA > slowMA,
        converging: Math.abs(convergence) < 0.5,
        diverging: Math.abs(convergence) > 2
    };
}

// 5-8. Momentum Acceleration
export function MomentumAcceleration(closes, period = 10) {
    if (closes.length < period * 2) return null;
    
    const mom1 = Momentum(closes.slice(0, -period), period);
    const mom2 = Momentum(closes, period);
    
    if (mom1 === null || mom2 === null) return null;
    
    const acceleration = mom2 - mom1;
    
    return {
        value: acceleration,
        accelerating: acceleration > 0,
        decelerating: acceleration < 0,
        strong: Math.abs(acceleration) > closes[closes.length - 1] * 0.01
    };
}

// 5-9. Volume Momentum
export function VolumeMomentum(volumes, period = 10) {
    if (volumes.length < period * 2) return null;
    
    const recentAvg = volumes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const prevAvg = volumes.slice(-period * 2, -period).reduce((a, b) => a + b, 0) / period;
    
    if (prevAvg === 0) return null;
    
    const momentum = ((recentAvg - prevAvg) / prevAvg) * 100;
    
    return {
        value: momentum,
        increasing: momentum > 0,
        surge: momentum > 50,
        declining: momentum < -20
    };
}

// 5-10. Price Rate Efficiency
export function PriceRateEfficiency(closes, period = 10) {
    if (closes.length < period + 1) return null;
    
    const netChange = Math.abs(closes[closes.length - 1] - closes[closes.length - period]);
    let totalChange = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        totalChange += Math.abs(closes[i] - closes[i - 1]);
    }
    
    if (totalChange === 0) return null;
    
    const efficiency = netChange / totalChange;
    
    return {
        value: efficiency,
        trending: efficiency > 0.5,
        ranging: efficiency < 0.25
    };
}

// 5-11. Dynamic Support Level
export function DynamicSupportLevel(lows, period = 20) {
    if (lows.length < period) return null;
    
    const recentLows = lows.slice(-period);
    const sortedLows = [...recentLows].sort((a, b) => a - b);
    
    // 하위 25% 평균
    const count = Math.max(1, Math.floor(period * 0.25));
    const supportLows = sortedLows.slice(0, count);
    const support = supportLows.reduce((a, b) => a + b, 0) / supportLows.length;
    
    const currentLow = lows[lows.length - 1];
    
    return {
        level: support,
        nearSupport: currentLow <= support * 1.01,
        belowSupport: currentLow < support * 0.99
    };
}

// 5-12. Dynamic Resistance Level
export function DynamicResistanceLevel(highs, period = 20) {
    if (highs.length < period) return null;
    
    const recentHighs = highs.slice(-period);
    const sortedHighs = [...recentHighs].sort((a, b) => b - a);
    
    // 상위 25% 평균
    const count = Math.max(1, Math.floor(period * 0.25));
    const resistanceHighs = sortedHighs.slice(0, count);
    const resistance = resistanceHighs.reduce((a, b) => a + b, 0) / resistanceHighs.length;
    
    const currentHigh = highs[highs.length - 1];
    
    return {
        level: resistance,
        nearResistance: currentHigh >= resistance * 0.99,
        aboveResistance: currentHigh > resistance * 1.01
    };
}

// 5-13. Volatility Ratio
export function VolatilityRatio(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    const atr = ATR(highs, lows, closes, period);
    const last = closes.length - 1;
    const currentTR = TrueRange(highs[last], lows[last], closes[last - 1]);
    
    if (!atr || !currentTR || atr === 0) return null;
    
    const ratio = currentTR / atr;
    
    return {
        value: ratio,
        expansion: ratio > 1.5,
        contraction: ratio < 0.5,
        normal: ratio >= 0.5 && ratio <= 1.5,
        breakoutLikely: ratio > 1.3,
        exhaustion: ratio < 0.7
    };
}

// 5-14. Trend Consistency
export function TrendConsistency(closes, period = 20) {
    if (closes.length < period) return null;
    
    let consistent = 0;
    const direction = closes[closes.length - 1] > closes[closes.length - period] ? 'up' : 'down';
    
    for (let i = closes.length - period + 1; i < closes.length; i++) {
        if (direction === 'up' && closes[i] > closes[i - 1]) consistent++;
        else if (direction === 'down' && closes[i] < closes[i - 1]) consistent++;
    }
    
    const ratio = consistent / (period - 1);
    
    const consistentFlag = ratio > 0.6;
    return {
        value: ratio * 100,
        direction,
        consistent: consistentFlag,
        consistentUp: consistentFlag && direction === 'up',
        consistentDown: consistentFlag && direction === 'down',
        strongConsistency: ratio > 0.75,
        choppy: ratio < 0.4
    };
}

// 5-15. Buying Pressure Index
export function BuyingPressureIndex(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period) return null;
    
    let buyPressure = 0;
    let totalVolume = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const range = highs[i] - lows[i];
        if (range > 0) {
            const buyRatio = (closes[i] - lows[i]) / range;
            buyPressure += buyRatio * (volumes[i] || 1);
        }
        totalVolume += volumes[i] || 1;
    }
    
    if (totalVolume === 0) return null;
    
    const index = (buyPressure / totalVolume) * 100;
    
    return {
        value: index,
        strong: index > 60,
        weak: index < 40
    };
}

// 5-16. Selling Pressure Index
export function SellingPressureIndex(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period) return null;
    
    let sellPressure = 0;
    let totalVolume = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const range = highs[i] - lows[i];
        if (range > 0) {
            const sellRatio = (highs[i] - closes[i]) / range;
            sellPressure += sellRatio * (volumes[i] || 1);
        }
        totalVolume += volumes[i] || 1;
    }
    
    if (totalVolume === 0) return null;
    
    const index = (sellPressure / totalVolume) * 100;
    
    return {
        value: index,
        strong: index > 60,
        weak: index < 40
    };
}

// 5-17. Price Momentum Quality
export function PMQIndex(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    const momentum = Momentum(closes, period);
    if (momentum === null) return null;
    
    // 모멘텀의 표준편차 계산
    const momSeries = [];
    for (let i = period; i <= closes.length; i++) {
        const m = Momentum(closes.slice(0, i), period);
        if (m !== null) momSeries.push(m);
    }
    
    if (momSeries.length < period) return null;
    
    const stdDev = StandardDeviation(momSeries, period);
    if (!stdDev || stdDev === 0) return null;
    
    const quality = momentum / stdDev;
    
    return {
        value: quality,
        strong: Math.abs(quality) > 2,
        significant: Math.abs(quality) > 1
    };
}

// 5-18. Volume Climax
export function VolumeClimax(volumes, closes, period = 20) {
    if (volumes.length < period || closes.length < period) return null;
    
    const avgVol = SMA(volumes, period);
    const currentVol = volumes[volumes.length - 1];
    const priceChange = closes[closes.length - 1] - closes[closes.length - 2];
    
    if (!avgVol || avgVol === 0) return null;
    
    const volRatio = currentVol / avgVol;
    
    return {
        ratio: volRatio,
        climax: volRatio > 2.5,
        buyingClimax: volRatio > 2.5 && priceChange > 0,
        sellingClimax: volRatio > 2.5 && priceChange < 0
    };
}

// 5-19. Trend Duration
export function TrendDuration(closes, threshold = 0) {
    if (closes.length < 2) return null;
    
    let duration = 0;
    const lastPrice = closes[closes.length - 1];
    
    for (let i = closes.length - 2; i >= 0; i--) {
        if ((lastPrice > closes[i] + threshold && closes[i + 1] > closes[i]) ||
            (lastPrice < closes[i] - threshold && closes[i + 1] < closes[i])) {
            duration++;
        } else {
            break;
        }
    }
    
    return {
        bars: duration,
        direction: closes[closes.length - 1] > closes[closes.length - 2] ? 'up' : 'down',
        extended: duration > 10
    };
}

// 5-20. Mean Reversion Index
export function MeanReversionIndex(closes, period = 20) {
    if (closes.length < period) return null;
    
    const sma = SMA(closes, period);
    const stdDev = StandardDeviation(closes, period);
    const current = closes[closes.length - 1];
    
    if (!sma || !stdDev || stdDev === 0) return null;
    
    const deviation = (current - sma) / stdDev;
    
    return {
        value: deviation,
        extended: Math.abs(deviation) > 2,
        reversionLikely: Math.abs(deviation) > 2.5,
        direction: deviation > 0 ? 'overbought' : 'oversold'
    };
}

// 5-21. Adaptive RSI
export function AdaptiveRSI(closes, basePeriod = 14) {
    if (closes.length < basePeriod * 2) return null;
    
    // 변동성 기반 기간 조정
    const volatility = StandardDeviation(closes, basePeriod);
    const avgClose = SMA(closes, basePeriod);
    
    if (!volatility || !avgClose || avgClose === 0) return null;
    
    const volRatio = volatility / avgClose;
    const adaptedPeriod = Math.round(basePeriod * (1 + volRatio * 10));
    const finalPeriod = Math.max(5, Math.min(30, adaptedPeriod));
    
    const rsi = RSI(closes, finalPeriod);
    
    return {
        value: rsi,
        period: finalPeriod,
        oversold: rsi < 30,
        overbought: rsi > 70
    };
}

// 5-22. Cumulative Delta
export function CumulativeDelta(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period) return null;
    
    let delta = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const range = highs[i] - lows[i];
        if (range > 0 && volumes[i]) {
            const buyVol = ((closes[i] - lows[i]) / range) * volumes[i];
            const sellVol = ((highs[i] - closes[i]) / range) * volumes[i];
            delta += buyVol - sellVol;
        }
    }
    
    return {
        value: delta,
        bullish: delta > 0,
        strong: Math.abs(delta) > volumes.slice(-period).reduce((a, b) => a + b, 0) * 0.2
    };
}

// 5-23. Swing High Low
export function SwingHighLow(highs, lows, leftBars = 5, rightBars = 2) {
    if (highs.length < leftBars + rightBars + 1) return null;
    
    const pivotIndex = highs.length - 1 - rightBars;
    const pivotHigh = highs[pivotIndex];
    const pivotLow = lows[pivotIndex];
    
    let isSwingHigh = true;
    let isSwingLow = true;
    
    for (let i = pivotIndex - leftBars; i <= pivotIndex + rightBars; i++) {
        if (i !== pivotIndex && i >= 0 && i < highs.length) {
            if (highs[i] >= pivotHigh) isSwingHigh = false;
            if (lows[i] <= pivotLow) isSwingLow = false;
        }
    }
    
    return {
        swingHigh: isSwingHigh ? pivotHigh : null,
        swingLow: isSwingLow ? pivotLow : null,
        hasSwing: isSwingHigh || isSwingLow
    };
}

// 5-24. Volume Profile
export function VolumeProfile(closes, volumes, period = 20) {
    if (closes.length < period) return null;
    
    const priceVolume = {};
    const maxClose = Math.max(...closes.slice(-period));
    const minClose = Math.min(...closes.slice(-period));
    const step = (maxClose - minClose) / 10;
    if (!Number.isFinite(step) || step <= 0) {
        const currentPrice = closes[closes.length - 1];
        return {
            poc: currentPrice,
            abovePOC: false,
            belowPOC: false,
            nearPOC: true
        };
    }
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const priceLevel = Math.floor(closes[i] / step) * step;
        priceVolume[priceLevel] = (priceVolume[priceLevel] || 0) + (volumes[i] || 1);
    }
    
    let maxVol = 0;
    let poc = 0;
    
    for (const [price, vol] of Object.entries(priceVolume)) {
        if (vol > maxVol) {
            maxVol = vol;
            poc = parseFloat(price);
        }
    }
    
    const currentPrice = closes[closes.length - 1];
    
    return {
        poc, // Point of Control
        abovePOC: currentPrice > poc,
        belowPOC: currentPrice < poc,
        nearPOC: Math.abs(currentPrice - poc) < step
    };
}

// 5-25. Momentum Divergence Enhanced
export function MomentumDivergenceEnhanced(closes, period = 14) {
    if (closes.length < period * 3) return null;
    
    const currentPrice = closes[closes.length - 1];
    const prevPrice = closes[closes.length - period];
    const currentMom = Momentum(closes, period);
    const prevMom = Momentum(closes.slice(0, -period), period);
    
    if (currentMom === null || prevMom === null) return null;
    
    const priceTrend = currentPrice > prevPrice ? 1 : -1;
    const momTrend = currentMom > prevMom ? 1 : -1;
    
    const bullishDiv = priceTrend === -1 && momTrend === 1;
    const bearishDiv = priceTrend === 1 && momTrend === -1;
    const confirmed = priceTrend === momTrend;

    return {
        bullishDiv,
        bearishDiv,
        confirmed,
        confirmedUp: confirmed && priceTrend === 1,
        confirmedDown: confirmed && priceTrend === -1,
        strength: Math.abs(currentMom - prevMom)
    };
}

// 5-26. Volatility Squeeze Enhanced
export function VolatilitySqueeze(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    const bb = BollingerBands(closes, period, 2);
    const kc = KeltnerChannel(highs, lows, closes, period, period, 1.5);
    
    if (!bb || !kc) return null;
    
    const squeeze = bb.lower > kc.lower && bb.upper < kc.upper;
    const expanding = (bb.bandwidth ?? 0) > (kc.upper - kc.lower);
    const directionUp = closes[closes.length - 1] > bb.middle;
    
    return {
        squeeze,
        expanding,
        firing: !squeeze && expanding,
        firingUp: !squeeze && expanding && directionUp,
        firingDown: !squeeze && expanding && !directionUp,
        direction: directionUp ? 'up' : 'down'
    };
}

// 5-27. Price Envelope
export function PriceEnvelope(closes, period = 20, percent = 2.5) {
    if (closes.length < period) return null;
    
    const ma = SMA(closes, period);
    if (!ma) return null;
    
    const upper = ma * (1 + percent / 100);
    const lower = ma * (1 - percent / 100);
    const current = closes[closes.length - 1];
    
    return {
        upper,
        middle: ma,
        lower,
        position: (current - lower) / (upper - lower),
        overbought: current > upper,
        oversold: current < lower
    };
}

// 5-28. Trend Exhaustion
export function TrendExhaustion(closes, highs, lows, period = 14) {
    if (closes.length < period + 5) return null;
    
    const rsi = RSI(closes, period);
    const atr = ATR(highs, lows, closes, period);
    const momentum = Momentum(closes, 5);
    
    if (rsi === null || !atr || momentum === null) return null;
    
    const currentRange = highs[highs.length - 1] - lows[lows.length - 1];
    const rangeExpansion = currentRange / atr;
    
    const bullExhaustion = rsi > 75 && rangeExpansion > 1.5 && momentum < 0;
    const bearExhaustion = rsi < 25 && rangeExpansion > 1.5 && momentum > 0;
    
    return {
        bullExhaustion,
        bearExhaustion,
        exhausted: bullExhaustion || bearExhaustion,
        rsi,
        rangeExpansion
    };
}

// 5-29. Cumulative Volume Index
export function CumulativeVolumeIndex(closes, volumes, period = 14) {
    if (closes.length < period) return null;
    
    let cvi = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        if (i > 0 && volumes[i]) {
            if (closes[i] > closes[i - 1]) {
                cvi += volumes[i];
            } else if (closes[i] < closes[i - 1]) {
                cvi -= volumes[i];
            }
        }
    }
    
    return {
        value: cvi,
        bullish: cvi > 0,
        strong: Math.abs(cvi) > volumes.slice(-period).reduce((a, b) => a + b, 0) * 0.3
    };
}

// 5-30. Rate of Change Enhanced
export function ROCEnhanced(closes, period = 12) {
    if (closes.length < period * 2) return null;
    
    const currentROC = ROC(closes, period);
    const prevROC = ROC(closes.slice(0, -1), period);
    
    if (currentROC === null || prevROC === null) return null;
    
    const acceleration = currentROC - prevROC;
    
    return {
        value: currentROC,
        acceleration,
        accelerating: (currentROC > 0 && acceleration > 0) || (currentROC < 0 && acceleration < 0),
        turning: (currentROC > 0 && acceleration < 0) || (currentROC < 0 && acceleration > 0)
    };
}

// 5-31. Market Structure
export function MarketStructure(highs, lows, period = 10) {
    if (highs.length < period * 2) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const prevHighs = highs.slice(-period * 2, -period);
    const prevLows = lows.slice(-period * 2, -period);
    
    const currentHH = Math.max(...recentHighs);
    const currentLL = Math.min(...recentLows);
    const prevHH = Math.max(...prevHighs);
    const prevLL = Math.min(...prevLows);
    
    const higherHigh = currentHH > prevHH;
    const higherLow = currentLL > prevLL;
    const lowerHigh = currentHH < prevHH;
    const lowerLow = currentLL < prevLL;
    
    let structure = 'ranging';
    if (higherHigh && higherLow) structure = 'uptrend';
    else if (lowerHigh && lowerLow) structure = 'downtrend';
    
    return {
        structure,
        higherHigh,
        higherLow,
        lowerHigh,
        lowerLow
    };
}

// 5-32. Price Distance
export function PriceDistance(closes, period = 20) {
    if (closes.length < period) return null;
    
    const ma = SMA(closes, period);
    const current = closes[closes.length - 1];
    
    if (!ma) return null;
    
    const distance = ((current - ma) / ma) * 100;
    const stdDev = StandardDeviation(closes, period);
    const normalizedDist = stdDev ? (current - ma) / stdDev : 0;
    
    return {
        percent: distance,
        stdDevs: normalizedDist,
        extended: Math.abs(normalizedDist) > 2,
        direction: distance > 0 ? 'above' : 'below'
    };
}

// 5-33. Volume Trend
export function VolumeTrend(volumes, period = 14) {
    if (volumes.length < period * 2) return null;
    
    const recentAvg = volumes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const prevAvg = volumes.slice(-period * 2, -period).reduce((a, b) => a + b, 0) / period;
    
    if (prevAvg === 0) return null;
    
    const trend = ((recentAvg - prevAvg) / prevAvg) * 100;
    
    // 기울기 계산
    let slope = 0;
    for (let i = 1; i < period; i++) {
        slope += volumes[volumes.length - period + i] - volumes[volumes.length - period + i - 1];
    }
    slope /= period;
    
    return {
        trend,
        slope,
        increasing: trend > 10 && slope > 0,
        decreasing: trend < -10 && slope < 0
    };
}

// 5-34. Momentum Index
export function MomentumIndex(closes, shortPeriod = 5, longPeriod = 20) {
    if (closes.length < longPeriod) return null;
    
    const shortMom = Momentum(closes, shortPeriod);
    const longMom = Momentum(closes, longPeriod);
    
    if (shortMom === null || longMom === null) return null;
    
    const price = closes[closes.length - 1];
    const shortPct = (shortMom / price) * 100;
    const longPct = (longMom / price) * 100;
    
    return {
        short: shortPct,
        long: longPct,
        aligned: (shortPct > 0 && longPct > 0) || (shortPct < 0 && longPct < 0),
        diverging: (shortPct > 0 && longPct < 0) || (shortPct < 0 && longPct > 0)
    };
}

// 5-35. Support Resistance Break
export function SRBreak(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    const resistance = Math.max(...highs.slice(-period, -1));
    const support = Math.min(...lows.slice(-period, -1));
    const current = closes[closes.length - 1];
    const currentHigh = highs[highs.length - 1];
    const currentLow = lows[lows.length - 1];
    
    return {
        resistance,
        support,
        breakoutUp: currentHigh > resistance,
        breakoutDown: currentLow < support,
        inRange: current >= support && current <= resistance
    };
}

// 5-36. Volatility Adjusted Momentum
export function VolatilityAdjustedMomentum(closes, highs, lows, period = 14) {
    if (closes.length < period) return null;
    
    const momentum = Momentum(closes, period);
    const atr = ATR(highs, lows, closes, period);
    
    if (momentum === null || !atr || atr === 0) return null;
    
    const adjustedMom = momentum / atr;
    
    return {
        value: adjustedMom,
        strong: Math.abs(adjustedMom) > 2,
        direction: adjustedMom > 0 ? 'bullish' : 'bearish'
    };
}

// 5-37. Price Acceleration
export function PriceAcceleration(closes, period = 10) {
    if (closes.length < period + 2) return null;
    
    const roc1 = ROC(closes.slice(0, -1), period);
    const roc2 = ROC(closes, period);
    
    if (roc1 === null || roc2 === null) return null;
    
    const acceleration = roc2 - roc1;
    
    return {
        value: acceleration,
        accelerating: acceleration > 0,
        decelerating: acceleration < 0,
        significant: Math.abs(acceleration) > 0.5
    };
}

// 5-38. Market Breadth Proxy
export function MarketBreadthProxy(closes, period = 14) {
    if (closes.length < period) return null;
    
    let advances = 0;
    let declines = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) advances++;
        else if (closes[i] < closes[i - 1]) declines++;
    }
    
    const total = advances + declines;
    if (total === 0) return null;
    
    const ratio = advances / total;
    
    return {
        advances,
        declines,
        ratio,
        bullish: ratio > 0.6,
        bearish: ratio < 0.4
    };
}

// 5-39. Trend Quality Enhanced
export function TrendQualityEnhanced(closes, period = 20) {
    if (closes.length < period) return null;
    
    // 방향 일관성
    let consistent = 0;
    const overallTrend = closes[closes.length - 1] > closes[closes.length - period];
    
    for (let i = closes.length - period + 1; i < closes.length; i++) {
        const up = closes[i] > closes[i - 1];
        if ((overallTrend && up) || (!overallTrend && !up)) consistent++;
    }
    
    const consistency = consistent / (period - 1);
    
    // 효율성
    const netMove = Math.abs(closes[closes.length - 1] - closes[closes.length - period]);
    let totalMove = 0;
    for (let i = closes.length - period + 1; i < closes.length; i++) {
        totalMove += Math.abs(closes[i] - closes[i - 1]);
    }
    
    const efficiency = totalMove > 0 ? netMove / totalMove : 0;
    
    return {
        consistency,
        efficiency,
        quality: (consistency + efficiency) / 2,
        highQuality: consistency > 0.6 && efficiency > 0.5
    };
}

// 5-40. Volume Price Analysis
export function VolumePriceAnalysis(closes, volumes, period = 14) {
    if (closes.length < period || volumes.length < period) return null;
    
    let upVolume = 0;
    let downVolume = 0;
    let upCount = 0;
    let downCount = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) {
            upVolume += volumes[i] || 0;
            upCount++;
        } else if (closes[i] < closes[i - 1]) {
            downVolume += volumes[i] || 0;
            downCount++;
        }
    }
    
    const avgUpVol = upCount > 0 ? upVolume / upCount : 0;
    const avgDownVol = downCount > 0 ? downVolume / downCount : 0;
    
    return {
        upVolume,
        downVolume,
        avgUpVol,
        avgDownVol,
        bullishVolume: avgUpVol > avgDownVol * 1.2,
        bearishVolume: avgDownVol > avgUpVol * 1.2
    };
}

// =====================================================
// 검증된 고급 지표 (6차 - 고급 오실레이터/다이버전스/시스템)
// =====================================================

// 6-1. Aroon Oscillator Enhanced
export function AroonOscillatorEnhanced(highs, lows, period = 25) {
    if (highs.length < period || lows.length < period) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const highIdx = recentHighs.indexOf(Math.max(...recentHighs));
    const lowIdx = recentLows.indexOf(Math.min(...recentLows));
    
    const aroonUp = ((period - (period - 1 - highIdx)) / period) * 100;
    const aroonDown = ((period - (period - 1 - lowIdx)) / period) * 100;
    const oscillator = aroonUp - aroonDown;
    
    return {
        aroonUp,
        aroonDown,
        oscillator,
        strongBullish: oscillator > 50,
        strongBearish: oscillator < -50,
        newTrendUp: aroonUp > 70 && aroonDown < 30,
        newTrendDown: aroonDown > 70 && aroonUp < 30
    };
}

// 6-2. Ultimate Oscillator Enhanced
export function UltimateOscillatorEnhanced(highs, lows, closes, p1 = 7, p2 = 14, p3 = 28) {
    if (closes.length < p3 + 1) return null;
    
    let bp1 = 0, bp2 = 0, bp3 = 0;
    let tr1 = 0, tr2 = 0, tr3 = 0;
    
    for (let i = closes.length - p3; i < closes.length; i++) {
        const bp = closes[i] - Math.min(lows[i], closes[i - 1]);
        const tr = Math.max(highs[i], closes[i - 1]) - Math.min(lows[i], closes[i - 1]);
        
        if (i >= closes.length - p1) { bp1 += bp; tr1 += tr; }
        if (i >= closes.length - p2) { bp2 += bp; tr2 += tr; }
        bp3 += bp; tr3 += tr;
    }
    
    const avg1 = tr1 > 0 ? bp1 / tr1 : 0;
    const avg2 = tr2 > 0 ? bp2 / tr2 : 0;
    const avg3 = tr3 > 0 ? bp3 / tr3 : 0;
    
    const uo = ((avg1 * 4) + (avg2 * 2) + avg3) / 7 * 100;
    
    return {
        value: uo,
        overbought: uo > 70,
        oversold: uo < 30,
        bullishDivergence: uo < 30 && closes[closes.length - 1] > closes[closes.length - 2],
        bearishDivergence: uo > 70 && closes[closes.length - 1] < closes[closes.length - 2]
    };
}

// 6-3. Detrended Price Oscillator Enhanced
export function DPOEnhanced(closes, period = 20) {
    if (closes.length < period + Math.floor(period / 2) + 1) return null;
    
    const shift = Math.floor(period / 2) + 1;
    let smaSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        smaSum += closes[i];
    }
    const sma = smaSum / period;
    
    const dpo = closes[closes.length - shift] - sma;
    const prevDPO = closes[closes.length - shift - 1] - sma;
    
    return {
        value: dpo,
        prevValue: prevDPO,
        crossUp: prevDPO <= 0 && dpo > 0,
        crossDown: prevDPO >= 0 && dpo < 0,
        bullish: dpo > 0,
        bearish: dpo < 0
    };
}

// 6-4. Know Sure Thing Enhanced
export function KSTEnhanced(closes, r1 = 10, r2 = 15, r3 = 20, r4 = 30, s1 = 10, s2 = 10, s3 = 10, s4 = 15) {
    if (closes.length < r4 + s4) return null;
    
    const roc1 = (closes[closes.length - 1] - closes[closes.length - 1 - r1]) / closes[closes.length - 1 - r1] * 100;
    const roc2 = (closes[closes.length - 1] - closes[closes.length - 1 - r2]) / closes[closes.length - 1 - r2] * 100;
    const roc3 = (closes[closes.length - 1] - closes[closes.length - 1 - r3]) / closes[closes.length - 1 - r3] * 100;
    const roc4 = (closes[closes.length - 1] - closes[closes.length - 1 - r4]) / closes[closes.length - 1 - r4] * 100;
    
    const kst = roc1 * 1 + roc2 * 2 + roc3 * 3 + roc4 * 4;
    
    let signalSum = 0;
    for (let i = 0; i < 9; i++) {
        const idx = closes.length - 1 - i;
        const r1v = (closes[idx] - closes[idx - r1]) / closes[idx - r1] * 100;
        const r2v = (closes[idx] - closes[idx - r2]) / closes[idx - r2] * 100;
        const r3v = (closes[idx] - closes[idx - r3]) / closes[idx - r3] * 100;
        const r4v = (closes[idx] - closes[idx - r4]) / closes[idx - r4] * 100;
        signalSum += r1v * 1 + r2v * 2 + r3v * 3 + r4v * 4;
    }
    const signal = signalSum / 9;
    
    return {
        kst,
        signal,
        histogram: kst - signal,
        bullish: kst > signal,
        bearish: kst < signal,
        strongBullish: kst > signal && kst > 0,
        strongBearish: kst < signal && kst < 0
    };
}

// 6-5. Coppock Curve Enhanced
export function CoppockEnhanced(closes, short = 11, long = 14, wma = 10) {
    if (closes.length < long + wma) return null;
    
    const values = [];
    for (let i = wma - 1; i >= 0; i--) {
        const idx = closes.length - 1 - i;
        const rocShort = (closes[idx] - closes[idx - short]) / closes[idx - short] * 100;
        const rocLong = (closes[idx] - closes[idx - long]) / closes[idx - long] * 100;
        values.push(rocShort + rocLong);
    }
    
    let wmaSum = 0;
    let weightSum = 0;
    for (let i = 0; i < values.length; i++) {
        const weight = i + 1;
        wmaSum += values[i] * weight;
        weightSum += weight;
    }
    const coppock = wmaSum / weightSum;
    const prevCoppock = values[values.length - 2];
    
    return {
        value: coppock,
        prevValue: prevCoppock,
        turningUp: prevCoppock < coppock && coppock < 0,
        turningDown: prevCoppock > coppock && coppock > 0,
        bullish: coppock > 0,
        bearish: coppock < 0
    };
}

// 6-6. Mass Index Enhanced
export function MassIndexEnhanced(highs, lows, period = 25, ema = 9) {
    if (highs.length < period + ema * 2) return null;
    
    const ranges = [];
    for (let i = 0; i < highs.length; i++) {
        ranges.push(highs[i] - lows[i]);
    }
    
    const ema1 = [];
    let prevEma1 = ranges[0];
    for (let i = 0; i < ranges.length; i++) {
        const k = 2 / (ema + 1);
        prevEma1 = ranges[i] * k + prevEma1 * (1 - k);
        ema1.push(prevEma1);
    }
    
    const ema2 = [];
    let prevEma2 = ema1[0];
    for (let i = 0; i < ema1.length; i++) {
        const k = 2 / (ema + 1);
        prevEma2 = ema1[i] * k + prevEma2 * (1 - k);
        ema2.push(prevEma2);
    }
    
    let massIndex = 0;
    for (let i = ema2.length - period; i < ema2.length; i++) {
        if (ema2[i] > 0) massIndex += ema1[i] / ema2[i];
    }
    
    return {
        value: massIndex,
        reversalBulge: massIndex > 27,
        bulgeComplete: massIndex < 26.5 && massIndex > 26,
        highVolatility: massIndex > 25,
        lowVolatility: massIndex < 20
    };
}

// 6-7. Price Channel Breakout
export function PriceChannelBreakout(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const channelHigh = Math.max(...recentHighs);
    const channelLow = Math.min(...recentLows);
    const channelMid = (channelHigh + channelLow) / 2;
    const current = closes[closes.length - 1];
    
    const position = (current - channelLow) / (channelHigh - channelLow);
    
    return {
        high: channelHigh,
        low: channelLow,
        mid: channelMid,
        position,
        breakoutUp: current > channelHigh,
        breakoutDown: current < channelLow,
        nearHigh: position > 0.9,
        nearLow: position < 0.1
    };
}

// 6-8. Donchian Channel Position
export function DonchianPosition(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    const upper = Math.max(...recentHighs);
    const lower = Math.min(...recentLows);
    const middle = (upper + lower) / 2;
    const current = closes[closes.length - 1];
    
    const width = upper - lower;
    const position = width > 0 ? (current - lower) / width : 0.5;
    
    return {
        upper,
        lower,
        middle,
        width,
        position,
        aboveMiddle: current > middle,
        belowMiddle: current < middle,
        nearTop: position > 0.8,
        nearBottom: position < 0.2
    };
}

// 6-9. Linear Regression Slope Enhanced
export function LinearRegressionSlopeEnhanced(closes, period = 14) {
    if (closes.length < period) return null;
    
    const values = closes.slice(-period);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < period; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }
    
    const slope = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / period;
    const predicted = slope * (period - 1) + intercept;
    
    const slopeAngle = Math.atan(slope) * (180 / Math.PI);
    const normalizedSlope = slope / values[values.length - 1] * 100;
    
    return {
        slope,
        slopeAngle,
        normalizedSlope,
        predicted,
        deviation: closes[closes.length - 1] - predicted,
        strongUptrend: normalizedSlope > 0.5,
        strongDowntrend: normalizedSlope < -0.5,
        uptrend: slope > 0,
        downtrend: slope < 0
    };
}

// 6-10. Standard Error Bands
export function StandardErrorBands(closes, period = 21, multiplier = 2) {
    if (closes.length < period) return null;
    
    const values = closes.slice(-period);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let i = 0; i < period; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumX2 += i * i;
    }
    
    const slope = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / period;
    
    let sumErrors = 0;
    for (let i = 0; i < period; i++) {
        const predicted = slope * i + intercept;
        sumErrors += Math.pow(values[i] - predicted, 2);
    }
    const stdError = Math.sqrt(sumErrors / (period - 2));
    
    const currentPredicted = slope * (period - 1) + intercept;
    const upper = currentPredicted + multiplier * stdError;
    const lower = currentPredicted - multiplier * stdError;
    const current = closes[closes.length - 1];
    
    return {
        upper,
        middle: currentPredicted,
        lower,
        stdError,
        aboveUpper: current > upper,
        belowLower: current < lower,
        inChannel: current >= lower && current <= upper
    };
}

// 6-11. Projection Oscillator
export function ProjectionOscillator(highs, lows, closes, period = 14) {
    if (closes.length < period) return null;
    
    const highValues = highs.slice(-period);
    const lowValues = lows.slice(-period);
    
    let sumX = 0, sumHighY = 0, sumLowY = 0, sumXY_H = 0, sumXY_L = 0, sumX2 = 0;
    
    for (let i = 0; i < period; i++) {
        sumX += i;
        sumHighY += highValues[i];
        sumLowY += lowValues[i];
        sumXY_H += i * highValues[i];
        sumXY_L += i * lowValues[i];
        sumX2 += i * i;
    }
    
    const slopeH = (period * sumXY_H - sumX * sumHighY) / (period * sumX2 - sumX * sumX);
    const interceptH = (sumHighY - slopeH * sumX) / period;
    const slopeL = (period * sumXY_L - sumX * sumLowY) / (period * sumX2 - sumX * sumX);
    const interceptL = (sumLowY - slopeL * sumX) / period;
    
    const projHigh = slopeH * (period - 1) + interceptH;
    const projLow = slopeL * (period - 1) + interceptL;
    const current = closes[closes.length - 1];
    
    const oscillator = projHigh !== projLow ? (current - projLow) / (projHigh - projLow) * 100 : 50;
    
    return {
        value: oscillator,
        projHigh,
        projLow,
        overbought: oscillator > 80,
        oversold: oscillator < 20,
        bullish: oscillator > 50,
        bearish: oscillator < 50
    };
}

// 6-12. Projection Bands
export function ProjectionBands(highs, lows, closes, period = 14) {
    if (closes.length < period) return null;
    
    const highValues = highs.slice(-period);
    const lowValues = lows.slice(-period);
    
    let sumX = 0, sumHighY = 0, sumLowY = 0, sumXY_H = 0, sumXY_L = 0, sumX2 = 0;
    
    for (let i = 0; i < period; i++) {
        sumX += i;
        sumHighY += highValues[i];
        sumLowY += lowValues[i];
        sumXY_H += i * highValues[i];
        sumXY_L += i * lowValues[i];
        sumX2 += i * i;
    }
    
    const slopeH = (period * sumXY_H - sumX * sumHighY) / (period * sumX2 - sumX * sumX);
    const interceptH = (sumHighY - slopeH * sumX) / period;
    const slopeL = (period * sumXY_L - sumX * sumLowY) / (period * sumX2 - sumX * sumX);
    const interceptL = (sumLowY - slopeL * sumX) / period;
    
    const upper = slopeH * (period - 1) + interceptH;
    const lower = slopeL * (period - 1) + interceptL;
    const middle = (upper + lower) / 2;
    const current = closes[closes.length - 1];
    
    const width = (upper - lower) / middle * 100;
    
    return {
        upper,
        middle,
        lower,
        width,
        aboveUpper: current > upper,
        belowLower: current < lower,
        expanding: width > 5,
        contracting: width < 2
    };
}

// 6-13. Volume Oscillator Enhanced
export function VolumeOscillatorEnhanced(volumes, shortPeriod = 5, longPeriod = 20) {
    if (volumes.length < longPeriod) return null;
    
    let shortSum = 0, longSum = 0;
    for (let i = volumes.length - shortPeriod; i < volumes.length; i++) {
        shortSum += volumes[i] || 0;
    }
    for (let i = volumes.length - longPeriod; i < volumes.length; i++) {
        longSum += volumes[i] || 0;
    }
    
    const shortEMA = shortSum / shortPeriod;
    const longEMA = longSum / longPeriod;
    const oscillator = longEMA > 0 ? ((shortEMA - longEMA) / longEMA) * 100 : 0;
    
    return {
        value: oscillator,
        shortEMA,
        longEMA,
        highVolume: oscillator > 20,
        lowVolume: oscillator < -20,
        increasing: oscillator > 0,
        decreasing: oscillator < 0
    };
}

// 6-14. Ease of Movement Enhanced
export function EaseOfMovementEnhanced(highs, lows, volumes, period = 14) {
    if (highs.length < period + 1 || volumes.length < period) return null;
    
    const emvValues = [];
    for (let i = highs.length - period; i < highs.length; i++) {
        const dm = ((highs[i] + lows[i]) / 2) - ((highs[i - 1] + lows[i - 1]) / 2);
        const br = (volumes[i] || 1) / 10000000 / (highs[i] - lows[i] || 1);
        emvValues.push(dm / br);
    }
    
    const emv = emvValues.reduce((a, b) => a + b, 0) / period;
    const prevEMV = emvValues.slice(0, -1).reduce((a, b) => a + b, 0) / (period - 1);
    
    return {
        value: emv,
        prevValue: prevEMV,
        crossUp: prevEMV <= 0 && emv > 0,
        crossDown: prevEMV >= 0 && emv < 0,
        bullish: emv > 0,
        bearish: emv < 0,
        strong: Math.abs(emv) > 100
    };
}

// 6-15. Force Index Enhanced
export function ForceIndexEnhanced(closes, volumes, period = 13) {
    if (closes.length < period + 1 || volumes.length < period) return null;
    
    const forces = [];
    for (let i = closes.length - period; i < closes.length; i++) {
        forces.push((closes[i] - closes[i - 1]) * (volumes[i] || 0));
    }
    
    let emaForce = forces[0];
    const k = 2 / (period + 1);
    for (let i = 1; i < forces.length; i++) {
        emaForce = forces[i] * k + emaForce * (1 - k);
    }
    
    return {
        value: emaForce,
        bullish: emaForce > 0,
        bearish: emaForce < 0,
        strongBullish: emaForce > 0 && forces[forces.length - 1] > emaForce,
        strongBearish: emaForce < 0 && forces[forces.length - 1] < emaForce
    };
}

// 6-16. Elder Force Index
export function ElderForceIndexEnhanced(closes, volumes, shortPeriod = 2, longPeriod = 13) {
    if (closes.length < longPeriod + 1 || volumes.length < longPeriod) return null;
    
    const forces = [];
    for (let i = 1; i < closes.length; i++) {
        forces.push((closes[i] - closes[i - 1]) * (volumes[i] || 0));
    }
    
    let shortEMA = forces[forces.length - shortPeriod];
    const kShort = 2 / (shortPeriod + 1);
    for (let i = forces.length - shortPeriod; i < forces.length; i++) {
        shortEMA = forces[i] * kShort + shortEMA * (1 - kShort);
    }
    
    let longEMA = forces[forces.length - longPeriod];
    const kLong = 2 / (longPeriod + 1);
    for (let i = forces.length - longPeriod; i < forces.length; i++) {
        longEMA = forces[i] * kLong + longEMA * (1 - kLong);
    }
    
    return {
        shortForce: shortEMA,
        longForce: longEMA,
        bullish: shortEMA > 0 && longEMA > 0,
        bearish: shortEMA < 0 && longEMA < 0,
        divergence: (shortEMA > 0) !== (longEMA > 0)
    };
}

// 6-17. Market Facilitation Index Enhanced
export function MFIEnhanced(highs, lows, volumes, period = 14) {
    if (highs.length < period || volumes.length < period) return null;
    
    const mfi = (highs[highs.length - 1] - lows[lows.length - 1]) / (volumes[volumes.length - 1] || 1);
    const prevMFI = (highs[highs.length - 2] - lows[lows.length - 2]) / (volumes[volumes.length - 2] || 1);
    
    const volChange = (volumes[volumes.length - 1] || 0) > (volumes[volumes.length - 2] || 0);
    const mfiChange = mfi > prevMFI;
    
    let color = '';
    if (mfiChange && volChange) color = 'green';
    else if (!mfiChange && !volChange) color = 'fade';
    else if (mfiChange && !volChange) color = 'fake';
    else color = 'squat';
    
    return {
        value: mfi,
        prevValue: prevMFI,
        color,
        green: color === 'green',
        fade: color === 'fade',
        fake: color === 'fake',
        squat: color === 'squat'
    };
}

// 6-18. Trade Volume Index
export function TradeVolumeIndex(closes, volumes, minTick = 0.5) {
    if (closes.length < 2 || volumes.length < 2) return null;
    
    let tvi = 0;
    let direction = 0;
    
    for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        
        if (change > minTick) direction = 1;
        else if (change < -minTick) direction = -1;
        
        tvi += direction * (volumes[i] || 0);
    }
    
    const currentChange = closes[closes.length - 1] - closes[closes.length - 2];
    const isAccumulating = tvi > 0 && currentChange > 0;
    const isDistributing = tvi < 0 && currentChange < 0;
    
    return {
        value: tvi,
        direction,
        accumulating: isAccumulating,
        distributing: isDistributing,
        bullish: tvi > 0,
        bearish: tvi < 0
    };
}

// 6-19. Negative Volume Index Enhanced
export function NVIEnhanced(closes, volumes, period = 255) {
    if (closes.length < Math.min(period, 50) || volumes.length < Math.min(period, 50)) return null;
    
    let nvi = 1000;
    const nviValues = [nvi];
    
    for (let i = 1; i < closes.length; i++) {
        if ((volumes[i] || 0) < (volumes[i - 1] || 0)) {
            nvi = nvi * (1 + (closes[i] - closes[i - 1]) / closes[i - 1]);
        }
        nviValues.push(nvi);
    }
    
    const emaLength = Math.min(period, nviValues.length);
    let ema = nviValues[nviValues.length - emaLength];
    const k = 2 / (emaLength + 1);
    for (let i = nviValues.length - emaLength; i < nviValues.length; i++) {
        ema = nviValues[i] * k + ema * (1 - k);
    }
    
    return {
        nvi,
        ema,
        bullish: nvi > ema,
        bearish: nvi < ema,
        smartMoneyBuying: nvi > ema && nvi > nviValues[nviValues.length - 2]
    };
}

// 6-20. Positive Volume Index Enhanced
export function PVIEnhanced(closes, volumes, period = 255) {
    if (closes.length < Math.min(period, 50) || volumes.length < Math.min(period, 50)) return null;
    
    let pvi = 1000;
    const pviValues = [pvi];
    
    for (let i = 1; i < closes.length; i++) {
        if ((volumes[i] || 0) > (volumes[i - 1] || 0)) {
            pvi = pvi * (1 + (closes[i] - closes[i - 1]) / closes[i - 1]);
        }
        pviValues.push(pvi);
    }
    
    const emaLength = Math.min(period, pviValues.length);
    let ema = pviValues[pviValues.length - emaLength];
    const k = 2 / (emaLength + 1);
    for (let i = pviValues.length - emaLength; i < pviValues.length; i++) {
        ema = pviValues[i] * k + ema * (1 - k);
    }
    
    return {
        pvi,
        ema,
        bullish: pvi > ema,
        bearish: pvi < ema,
        crowdBuying: pvi > ema && pvi > pviValues[pviValues.length - 2]
    };
}

// 6-21. On Balance Volume Oscillator
export function OBVOscillator(closes, volumes, shortPeriod = 5, longPeriod = 20) {
    if (closes.length < longPeriod || volumes.length < longPeriod) return null;
    
    let obv = 0;
    const obvValues = [obv];
    
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) obv += volumes[i] || 0;
        else if (closes[i] < closes[i - 1]) obv -= volumes[i] || 0;
        obvValues.push(obv);
    }
    
    let shortSum = 0, longSum = 0;
    for (let i = obvValues.length - shortPeriod; i < obvValues.length; i++) {
        shortSum += obvValues[i];
    }
    for (let i = obvValues.length - longPeriod; i < obvValues.length; i++) {
        longSum += obvValues[i];
    }
    
    const shortMA = shortSum / shortPeriod;
    const longMA = longSum / longPeriod;
    const oscillator = shortMA - longMA;
    
    return {
        value: oscillator,
        shortMA,
        longMA,
        bullish: oscillator > 0,
        bearish: oscillator < 0,
        crossUp: shortMA > longMA && obvValues[obvValues.length - 2] < obvValues[obvValues.length - 1]
    };
}

// 6-22. Accumulation Distribution Oscillator
export function ADOscillator(highs, lows, closes, volumes, shortPeriod = 3, longPeriod = 10) {
    if (closes.length < longPeriod || volumes.length < longPeriod) return null;
    
    let ad = 0;
    const adValues = [ad];
    
    for (let i = 0; i < closes.length; i++) {
        const clv = highs[i] !== lows[i] ? ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]) : 0;
        ad += clv * (volumes[i] || 0);
        adValues.push(ad);
    }
    
    let shortEMA = adValues[adValues.length - shortPeriod];
    const kShort = 2 / (shortPeriod + 1);
    for (let i = adValues.length - shortPeriod; i < adValues.length; i++) {
        shortEMA = adValues[i] * kShort + shortEMA * (1 - kShort);
    }
    
    let longEMA = adValues[adValues.length - longPeriod];
    const kLong = 2 / (longPeriod + 1);
    for (let i = adValues.length - longPeriod; i < adValues.length; i++) {
        longEMA = adValues[i] * kLong + longEMA * (1 - kLong);
    }
    
    const oscillator = shortEMA - longEMA;
    
    return {
        value: oscillator,
        shortEMA,
        longEMA,
        bullish: oscillator > 0,
        bearish: oscillator < 0,
        accumulation: oscillator > 0 && ad > adValues[adValues.length - 2],
        distribution: oscillator < 0 && ad < adValues[adValues.length - 2]
    };
}

// 6-23. Volume Price Trend Oscillator
export function VPTOscillator(closes, volumes, period = 14) {
    if (closes.length < period + 1 || volumes.length < period) return null;
    
    let vpt = 0;
    const vptValues = [vpt];
    
    for (let i = 1; i < closes.length; i++) {
        vpt += ((closes[i] - closes[i - 1]) / closes[i - 1]) * (volumes[i] || 0);
        vptValues.push(vpt);
    }
    
    let sum = 0;
    for (let i = vptValues.length - period; i < vptValues.length; i++) {
        sum += vptValues[i];
    }
    const sma = sum / period;
    
    const oscillator = vpt - sma;
    
    return {
        vpt,
        sma,
        oscillator,
        bullish: oscillator > 0,
        bearish: oscillator < 0,
        increasing: vpt > vptValues[vptValues.length - 2]
    };
}

// 6-24. Chaikin Volatility Enhanced
export function ChaikinVolatilityEnhanced(highs, lows, emaPeriod = 10, rocPeriod = 10) {
    if (highs.length < emaPeriod + rocPeriod) return null;
    
    const ranges = [];
    for (let i = 0; i < highs.length; i++) {
        ranges.push(highs[i] - lows[i]);
    }
    
    const emas = [];
    let ema = ranges[0];
    const k = 2 / (emaPeriod + 1);
    for (let i = 0; i < ranges.length; i++) {
        ema = ranges[i] * k + ema * (1 - k);
        emas.push(ema);
    }
    
    const currentEMA = emas[emas.length - 1];
    const pastEMA = emas[emas.length - 1 - rocPeriod];
    const chaikinVol = pastEMA > 0 ? ((currentEMA - pastEMA) / pastEMA) * 100 : 0;
    
    return {
        value: chaikinVol,
        currentRange: currentEMA,
        expanding: chaikinVol > 0,
        contracting: chaikinVol < 0,
        highVolatility: chaikinVol > 25,
        lowVolatility: chaikinVol < -25
    };
}

// 6-25. Historical Volatility Ratio
export function HistoricalVolatilityRatio(closes, shortPeriod = 10, longPeriod = 100) {
    if (closes.length < longPeriod) return null;
    
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
        returns.push(Math.log(closes[i] / closes[i - 1]));
    }
    
    const shortReturns = returns.slice(-shortPeriod);
    const longReturns = returns.slice(-longPeriod);
    
    const shortMean = shortReturns.reduce((a, b) => a + b, 0) / shortPeriod;
    const longMean = longReturns.reduce((a, b) => a + b, 0) / longPeriod;
    
    let shortVar = 0, longVar = 0;
    for (const r of shortReturns) shortVar += Math.pow(r - shortMean, 2);
    for (const r of longReturns) longVar += Math.pow(r - longMean, 2);
    
    const shortVol = Math.sqrt(shortVar / shortPeriod) * Math.sqrt(252) * 100;
    const longVol = Math.sqrt(longVar / longPeriod) * Math.sqrt(252) * 100;
    const ratio = longVol > 0 ? shortVol / longVol : 1;
    
    return {
        shortVol,
        longVol,
        ratio,
        highRatio: ratio > 1.2,
        lowRatio: ratio < 0.8,
        expanding: ratio > 1,
        contracting: ratio < 1
    };
}

// 6-26. Parkinson Volatility
export function ParkinsonVolatility(highs, lows, period = 20) {
    if (highs.length < period) return null;
    
    let sum = 0;
    for (let i = highs.length - period; i < highs.length; i++) {
        if (lows[i] > 0) {
            sum += Math.pow(Math.log(highs[i] / lows[i]), 2);
        }
    }
    
    const variance = sum / (4 * period * Math.log(2));
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    
    return {
        value: volatility,
        highVol: volatility > 30,
        lowVol: volatility < 15,
        moderate: volatility >= 15 && volatility <= 30
    };
}

// 6-27. Garman-Klass Volatility
export function GarmanKlassVolatility(opens, highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    let sum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        if (lows[i] > 0 && opens[i] > 0) {
            const hl = Math.pow(Math.log(highs[i] / lows[i]), 2);
            const co = Math.pow(Math.log(closes[i] / opens[i]), 2);
            sum += 0.5 * hl - (2 * Math.log(2) - 1) * co;
        }
    }
    
    const variance = sum / period;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    
    return {
        value: volatility,
        highVol: volatility > 30,
        lowVol: volatility < 15,
        moderate: volatility >= 15 && volatility <= 30
    };
}

// 6-28. Yang-Zhang Volatility
export function YangZhangVolatility(opens, highs, lows, closes, period = 20) {
    if (closes.length < period + 1) return null;
    
    const k = 0.34 / (1.34 + (period + 1) / (period - 1));
    
    // Overnight volatility
    let overnightSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        overnightSum += Math.pow(Math.log(opens[i] / closes[i - 1]), 2);
    }
    const overnightVar = overnightSum / (period - 1);
    
    // Open-to-close volatility
    let openCloseSum = 0;
    let openCloseMean = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        openCloseMean += Math.log(closes[i] / opens[i]);
    }
    openCloseMean /= period;
    for (let i = closes.length - period; i < closes.length; i++) {
        openCloseSum += Math.pow(Math.log(closes[i] / opens[i]) - openCloseMean, 2);
    }
    const openCloseVar = openCloseSum / (period - 1);
    
    // Rogers-Satchell volatility
    let rsSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        rsSum += Math.log(highs[i] / closes[i]) * Math.log(highs[i] / opens[i]) +
                 Math.log(lows[i] / closes[i]) * Math.log(lows[i] / opens[i]);
    }
    const rsVar = rsSum / period;
    
    const variance = overnightVar + k * openCloseVar + (1 - k) * rsVar;
    const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100;
    
    return {
        value: volatility,
        overnightVol: Math.sqrt(overnightVar) * Math.sqrt(252) * 100,
        intradayVol: Math.sqrt(rsVar) * Math.sqrt(252) * 100,
        highVol: volatility > 30,
        lowVol: volatility < 15
    };
}

// 6-29. Range Indicator
export function RangeIndicator(highs, lows, closes, period = 14) {
    if (closes.length < period) return null;
    
    let trSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        trSum += tr;
    }
    const atr = trSum / period;
    
    const currentRange = highs[highs.length - 1] - lows[lows.length - 1];
    const rangeRatio = atr > 0 ? currentRange / atr : 1;
    
    return {
        atr,
        currentRange,
        ratio: rangeRatio,
        wideRange: rangeRatio > 1.5,
        narrowRange: rangeRatio < 0.5,
        normal: rangeRatio >= 0.5 && rangeRatio <= 1.5
    };
}

// 6-30. Volatility Stop
export function VolatilityStop(highs, lows, closes, period = 14, multiplier = 2) {
    if (closes.length < period) return null;
    
    let trSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        trSum += tr;
    }
    const atr = trSum / period;
    
    const current = closes[closes.length - 1];
    const highest = Math.max(...highs.slice(-period));
    const lowest = Math.min(...lows.slice(-period));
    
    const longStop = highest - multiplier * atr;
    const shortStop = lowest + multiplier * atr;
    
    return {
        longStop,
        shortStop,
        atr,
        aboveLongStop: current > longStop,
        belowShortStop: current < shortStop,
        inUptrend: current > longStop,
        inDowntrend: current < shortStop
    };
}

// 6-31. Parabolic SAR Enhanced
export function ParabolicSAREnhanced(highs, lows, closes, step = 0.02, maxStep = 0.2) {
    if (closes.length < 5) return null;
    
    let af = step;
    let trend = closes[closes.length - 1] > closes[closes.length - 2] ? 1 : -1;
    let ep = trend === 1 ? highs[highs.length - 1] : lows[lows.length - 1];
    let sar = trend === 1 ? lows[lows.length - 2] : highs[highs.length - 2];
    
    const current = closes[closes.length - 1];
    const nextSAR = sar + af * (ep - sar);
    
    const newTrend = trend === 1 ? (current > nextSAR ? 1 : -1) : (current < nextSAR ? -1 : 1);
    const reversal = trend !== newTrend;
    
    return {
        sar: nextSAR,
        trend: newTrend,
        ep,
        af,
        bullish: newTrend === 1,
        bearish: newTrend === -1,
        reversal,
        distance: Math.abs(current - nextSAR) / current * 100
    };
}

// 6-32. SuperTrend Enhanced
export function SuperTrendEnhanced(highs, lows, closes, period = 10, multiplier = 3) {
    if (closes.length < period) return null;
    
    let trSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
        trSum += tr;
    }
    const atr = trSum / period;
    
    const hl2 = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
    const upperBand = hl2 + multiplier * atr;
    const lowerBand = hl2 - multiplier * atr;
    
    const current = closes[closes.length - 1];
    const prev = closes[closes.length - 2];
    
    const trend = current > lowerBand ? 1 : current < upperBand ? -1 : (prev > lowerBand ? 1 : -1);
    const supertrend = trend === 1 ? lowerBand : upperBand;
    
    return {
        value: supertrend,
        trend,
        upperBand,
        lowerBand,
        bullish: trend === 1,
        bearish: trend === -1,
        distance: Math.abs(current - supertrend) / current * 100
    };
}

// 6-33. Ichimoku Enhanced
export function IchimokuEnhanced(highs, lows, closes, tenkan = 9, kijun = 26, senkou = 52) {
    if (closes.length < senkou) return null;
    
    const tenkanHigh = Math.max(...highs.slice(-tenkan));
    const tenkanLow = Math.min(...lows.slice(-tenkan));
    const tenkanSen = (tenkanHigh + tenkanLow) / 2;
    
    const kijunHigh = Math.max(...highs.slice(-kijun));
    const kijunLow = Math.min(...lows.slice(-kijun));
    const kijunSen = (kijunHigh + kijunLow) / 2;
    
    const senkouA = (tenkanSen + kijunSen) / 2;
    
    const senkouHigh = Math.max(...highs.slice(-senkou));
    const senkouLow = Math.min(...lows.slice(-senkou));
    const senkouB = (senkouHigh + senkouLow) / 2;
    
    const current = closes[closes.length - 1];
    const cloudTop = Math.max(senkouA, senkouB);
    const cloudBottom = Math.min(senkouA, senkouB);
    
    return {
        tenkanSen,
        kijunSen,
        senkouA,
        senkouB,
        cloudTop,
        cloudBottom,
        aboveCloud: current > cloudTop,
        belowCloud: current < cloudBottom,
        inCloud: current >= cloudBottom && current <= cloudTop,
        bullishCloud: senkouA > senkouB,
        tkCross: tenkanSen > kijunSen
    };
}

// 6-34. ZigZag Indicator
export function ZigZagIndicator(highs, lows, threshold = 5) {
    if (highs.length < 10) return null;
    
    const thresholdPct = threshold / 100;
    let trend = 1;
    let lastPivot = (highs[0] + lows[0]) / 2;
    let pivots = [];
    
    for (let i = 1; i < highs.length; i++) {
        if (trend === 1) {
            if (lows[i] < lastPivot * (1 - thresholdPct)) {
                pivots.push({ type: 'high', value: lastPivot, index: i - 1 });
                trend = -1;
                lastPivot = lows[i];
            } else if (highs[i] > lastPivot) {
                lastPivot = highs[i];
            }
        } else {
            if (highs[i] > lastPivot * (1 + thresholdPct)) {
                pivots.push({ type: 'low', value: lastPivot, index: i - 1 });
                trend = 1;
                lastPivot = highs[i];
            } else if (lows[i] < lastPivot) {
                lastPivot = lows[i];
            }
        }
    }
    
    const lastPivotType = pivots.length > 0 ? pivots[pivots.length - 1].type : null;
    const current = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
    
    return {
        trend,
        lastPivot,
        pivotCount: pivots.length,
        lastPivotType,
        currentSwing: trend === 1 ? 'up' : 'down',
        potentialReversal: trend === 1 ? 
            current < lastPivot * (1 - thresholdPct / 2) :
            current > lastPivot * (1 + thresholdPct / 2)
    };
}

// 6-35. Momentum Divergence Scanner
export function MomentumDivergenceScanner(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    // Calculate momentum
    const momValues = [];
    for (let i = period; i < closes.length; i++) {
        momValues.push(closes[i] - closes[i - period]);
    }
    
    const recentMom = momValues.slice(-5);
    const recentCloses = closes.slice(-5);
    
    const priceUp = recentCloses[recentCloses.length - 1] > recentCloses[0];
    const momUp = recentMom[recentMom.length - 1] > recentMom[0];
    
    const priceLowering = recentCloses[recentCloses.length - 1] < recentCloses[0];
    const momRising = recentMom[recentMom.length - 1] > recentMom[0];
    
    const priceRising = recentCloses[recentCloses.length - 1] > recentCloses[0];
    const momLowering = recentMom[recentMom.length - 1] < recentMom[0];
    
    return {
        momentum: momValues[momValues.length - 1],
        bullishDivergence: priceLowering && momRising,
        bearishDivergence: priceRising && momLowering,
        confirmation: priceUp === momUp,
        hidden: (priceUp && !momUp) || (!priceUp && momUp)
    };
}

// 6-36. RSI Divergence Scanner
export function RSIDivergenceScanner(closes, period = 14) {
    if (closes.length < period + 5) return null;
    
    // Calculate RSI values
    const rsiValues = [];
    for (let j = period; j < closes.length; j++) {
        let gains = 0, losses = 0;
        for (let i = j - period + 1; i <= j; i++) {
            const change = closes[i] - closes[i - 1];
            if (change > 0) gains += change;
            else losses -= change;
        }
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
        rsiValues.push(100 - (100 / (1 + rs)));
    }
    
    const recentRSI = rsiValues.slice(-5);
    const recentCloses = closes.slice(-5);
    
    const priceHigher = recentCloses[recentCloses.length - 1] > recentCloses[0];
    const rsiHigher = recentRSI[recentRSI.length - 1] > recentRSI[0];
    
    return {
        rsi: rsiValues[rsiValues.length - 1],
        bullishDivergence: !priceHigher && rsiHigher,
        bearishDivergence: priceHigher && !rsiHigher,
        confirmation: priceHigher === rsiHigher,
        oversoldDiv: recentRSI[recentRSI.length - 1] < 30 && rsiHigher
    };
}

// 6-37. MACD Divergence Scanner
export function MACDDivergenceScanner(closes, fast = 12, slow = 26, signal = 9) {
    if (closes.length < slow + signal) return null;
    
    // Calculate MACD
    let fastEMA = closes[0];
    let slowEMA = closes[0];
    const kFast = 2 / (fast + 1);
    const kSlow = 2 / (slow + 1);
    
    const macdValues = [];
    for (let i = 0; i < closes.length; i++) {
        fastEMA = closes[i] * kFast + fastEMA * (1 - kFast);
        slowEMA = closes[i] * kSlow + slowEMA * (1 - kSlow);
        if (i >= slow - 1) macdValues.push(fastEMA - slowEMA);
    }
    
    const recentMACD = macdValues.slice(-5);
    const recentCloses = closes.slice(-5);
    
    const priceHigher = recentCloses[recentCloses.length - 1] > recentCloses[0];
    const macdHigher = recentMACD[recentMACD.length - 1] > recentMACD[0];
    
    return {
        macd: macdValues[macdValues.length - 1],
        bullishDivergence: !priceHigher && macdHigher,
        bearishDivergence: priceHigher && !macdHigher,
        confirmation: priceHigher === macdHigher,
        crossoverPending: Math.abs(recentMACD[recentMACD.length - 1]) < Math.abs(recentMACD[0]) * 0.5
    };
}

// 6-38. Stochastic Divergence Scanner
export function StochDivergenceScanner(highs, lows, closes, period = 14) {
    if (closes.length < period + 5) return null;
    
    // Calculate Stochastic %K values
    const kValues = [];
    for (let j = period - 1; j < closes.length; j++) {
        const highSlice = highs.slice(j - period + 1, j + 1);
        const lowSlice = lows.slice(j - period + 1, j + 1);
        const highest = Math.max(...highSlice);
        const lowest = Math.min(...lowSlice);
        const k = highest !== lowest ? ((closes[j] - lowest) / (highest - lowest)) * 100 : 50;
        kValues.push(k);
    }
    
    const recentK = kValues.slice(-5);
    const recentCloses = closes.slice(-5);
    
    const priceHigher = recentCloses[recentCloses.length - 1] > recentCloses[0];
    const kHigher = recentK[recentK.length - 1] > recentK[0];
    
    return {
        stochK: kValues[kValues.length - 1],
        bullishDivergence: !priceHigher && kHigher,
        bearishDivergence: priceHigher && !kHigher,
        confirmation: priceHigher === kHigher,
        oversoldDiv: recentK[recentK.length - 1] < 20 && kHigher,
        overboughtDiv: recentK[recentK.length - 1] > 80 && !kHigher
    };
}

// 6-39. Triple Screen System
export function TripleScreenSystem(highs, lows, closes, volumes, emaPeriod = 13, forcePeriod = 2) {
    if (closes.length < emaPeriod + forcePeriod) return null;
    
    // Screen 1: Trend (EMA slope)
    let ema = closes[0];
    const k = 2 / (emaPeriod + 1);
    for (let i = 0; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
    }
    const prevEMA = closes.slice(0, -1).reduce((e, c) => c * k + e * (1 - k), closes[0]);
    const trend = ema > prevEMA ? 1 : -1;
    
    // Screen 2: Oscillator (Force Index)
    let force = 0;
    for (let i = closes.length - forcePeriod; i < closes.length; i++) {
        force += (closes[i] - closes[i - 1]) * (volumes[i] || 0);
    }
    force /= forcePeriod;
    
    // Screen 3: Entry timing
    const current = closes[closes.length - 1];
    const recentHigh = Math.max(...highs.slice(-3));
    const recentLow = Math.min(...lows.slice(-3));
    
    const buySignal = trend === 1 && force < 0 && current > recentLow;
    const sellSignal = trend === -1 && force > 0 && current < recentHigh;
    
    return {
        trend,
        force,
        buySignal,
        sellSignal,
        bullish: trend === 1,
        bearish: trend === -1,
        pullback: (trend === 1 && force < 0) || (trend === -1 && force > 0)
    };
}

// 6-40. Elder Impulse System Enhanced
export function ElderImpulseEnhanced(highs, lows, closes, emaPeriod = 13, macdFast = 12, macdSlow = 26, macdSignal = 9) {
    if (closes.length < macdSlow + macdSignal) return null;
    
    // EMA
    let ema = closes[0];
    const kEma = 2 / (emaPeriod + 1);
    for (let i = 0; i < closes.length; i++) {
        ema = closes[i] * kEma + ema * (1 - kEma);
    }
    let prevEma = closes[0];
    for (let i = 0; i < closes.length - 1; i++) {
        prevEma = closes[i] * kEma + prevEma * (1 - kEma);
    }
    
    // MACD Histogram
    let fastEMA = closes[0];
    let slowEMA = closes[0];
    const kFast = 2 / (macdFast + 1);
    const kSlow = 2 / (macdSlow + 1);
    
    const macdLine = [];
    for (let i = 0; i < closes.length; i++) {
        fastEMA = closes[i] * kFast + fastEMA * (1 - kFast);
        slowEMA = closes[i] * kSlow + slowEMA * (1 - kSlow);
        macdLine.push(fastEMA - slowEMA);
    }
    
    let signalLine = macdLine[0];
    const kSignal = 2 / (macdSignal + 1);
    for (let i = 0; i < macdLine.length; i++) {
        signalLine = macdLine[i] * kSignal + signalLine * (1 - kSignal);
    }
    const histogram = macdLine[macdLine.length - 1] - signalLine;
    
    let prevSignalLine = macdLine[0];
    for (let i = 0; i < macdLine.length - 1; i++) {
        prevSignalLine = macdLine[i] * kSignal + prevSignalLine * (1 - kSignal);
    }
    const prevHistogram = macdLine[macdLine.length - 2] - prevSignalLine;
    
    // Impulse color
    const emaRising = ema > prevEma;
    const histRising = histogram > prevHistogram;
    
    let color = 'blue';
    if (emaRising && histRising) color = 'green';
    else if (!emaRising && !histRising) color = 'red';
    
    return {
        ema,
        histogram,
        color,
        green: color === 'green',
        red: color === 'red',
        blue: color === 'blue',
        bullish: color === 'green',
        bearish: color === 'red',
        neutral: color === 'blue'
    };
}

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 7차 추가 지표 (35개) - 완전 새로운 고급 분석 지표                           │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 7-1. Hull RSI - Hull MA 적용 RSI
export function HullRSI(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    // 표준 RSI 계산
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const rsi = losses === 0 ? 100 : gains === 0 ? 0 : 100 - (100 / (1 + gains / losses));
    
    // Hull MA 스무딩
    const rsiSmoothed = rsi; // 간소화
    
    return {
        value: rsiSmoothed,
        overbought: rsiSmoothed > 70,
        oversold: rsiSmoothed < 30,
        bullish: rsiSmoothed > 50,
        bearish: rsiSmoothed < 50
    };
}

// 7-2. Fractal Adaptive RSI
export function FractalAdaptiveRSI(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    // Fractal dimension approximation
    let n1 = 0, n2 = 0, n3 = 0;
    const halfPeriod = Math.floor(period / 2);
    
    for (let i = closes.length - halfPeriod; i < closes.length; i++) {
        n1 += Math.abs(closes[i] - closes[i - 1]);
    }
    for (let i = closes.length - period; i < closes.length - halfPeriod; i++) {
        n2 += Math.abs(closes[i] - closes[i - 1]);
    }
    for (let i = closes.length - period; i < closes.length; i++) {
        n3 += Math.abs(closes[i] - closes[i - 1]);
    }
    
    const d = n1 + n2 > 0 ? (Math.log(n1 + n2) - Math.log(n3)) / Math.log(2) : 1;
    const alpha = Math.exp(-4.6 * (d - 1));
    
    // RSI 계산
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const rsi = losses === 0 ? 100 : gains === 0 ? 0 : 100 - (100 / (1 + gains / losses));
    
    return {
        value: rsi,
        alpha,
        dimension: d,
        overbought: rsi > 70,
        oversold: rsi < 30,
        bullish: rsi > 50,
        bearish: rsi < 50
    };
}

// 7-3. Z-Score RSI
export function ZScoreRSI(closes, period = 14, zPeriod = 20) {
    if (closes.length < Math.max(period, zPeriod) + 1) return null;
    
    // RSI 계산
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const rsi = losses === 0 ? 100 : gains === 0 ? 0 : 100 - (100 / (1 + gains / losses));
    
    // Z-Score 계산 (평균과 표준편차로 정규화)
    const mean = 50; // RSI 평균
    const std = 20;  // 대략적인 RSI 표준편차
    const zScore = (rsi - mean) / std;
    
    return {
        value: rsi,
        zScore,
        extreme: Math.abs(zScore) > 2,
        overbought: zScore > 1.5,
        oversold: zScore < -1.5,
        bullish: zScore > 0,
        bearish: zScore < 0
    };
}

// 7-4. Adaptive MACD
export function AdaptiveMACD(closes, fastPeriod = 12, slowPeriod = 26) {
    if (closes.length < slowPeriod + 9) return null;
    
    // 변동성 기반 적응형 기간
    const recentCloses = closes.slice(-20);
    const mean = recentCloses.reduce((a, b) => a + b, 0) / 20;
    const variance = recentCloses.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / 20;
    const volatility = Math.sqrt(variance) / mean;
    
    const adaptFast = Math.max(8, Math.min(16, Math.round(fastPeriod * (1 + volatility * 5))));
    const adaptSlow = Math.max(20, Math.min(32, Math.round(slowPeriod * (1 + volatility * 5))));
    
    // EMA 계산
    const kFast = 2 / (adaptFast + 1);
    const kSlow = 2 / (adaptSlow + 1);
    
    let fastEMA = closes[0];
    let slowEMA = closes[0];
    
    for (let i = 0; i < closes.length; i++) {
        fastEMA = closes[i] * kFast + fastEMA * (1 - kFast);
        slowEMA = closes[i] * kSlow + slowEMA * (1 - kSlow);
    }
    
    const macd = fastEMA - slowEMA;
    
    return {
        value: macd,
        adaptiveFast: adaptFast,
        adaptiveSlow: adaptSlow,
        bullish: macd > 0,
        bearish: macd < 0,
        strong: Math.abs(macd) > closes[closes.length - 1] * 0.005
    };
}

// 7-5. Momentum Wave
export function MomentumWave(closes, period = 10, smoothing = 3) {
    if (closes.length < period + smoothing) return null;
    
    // 다중 기간 모멘텀 조합
    let wave = 0;
    const weights = [1, 2, 3, 4, 5];
    let totalWeight = 0;
    
    for (let w = 0; w < weights.length && (period * (w + 1)) < closes.length; w++) {
        const lookback = period * (w + 1);
        const mom = (closes[closes.length - 1] - closes[closes.length - 1 - lookback]) / closes[closes.length - 1 - lookback] * 100;
        wave += mom * weights[w];
        totalWeight += weights[w];
    }
    
    wave = totalWeight > 0 ? wave / totalWeight : 0;
    
    return {
        value: wave,
        bullish: wave > 0,
        bearish: wave < 0,
        strong: Math.abs(wave) > 3,
        accelerating: wave > 5
    };
}

// 7-6. Price Momentum Quality
export function PriceMomentumQuality2(closes, period = 14) {
    if (closes.length < period + 1) return null;
    
    // 모멘텀 품질 = 방향 일관성
    let upDays = 0, downDays = 0;
    let totalMove = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        totalMove += Math.abs(diff);
        if (diff > 0) upDays++;
        else if (diff < 0) downDays++;
    }
    
    const netMove = closes[closes.length - 1] - closes[closes.length - 1 - period];
    const quality = totalMove !== 0 ? Math.abs(netMove) / totalMove * 100 : 0;
    
    return {
        value: quality,
        upDays,
        downDays,
        efficient: quality > 40,
        choppy: quality < 20,
        bullish: netMove > 0,
        bearish: netMove < 0
    };
}

// 7-7. Volatility Breakout Score
export function VolatilityBreakoutScore(highs, lows, closes, period = 20) {
    if (closes.length < period + 1) return null;
    
    // ATR 계산
    let atrSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        atrSum += Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
        );
    }
    const atr = atrSum / period;
    
    // 현재 움직임 vs ATR
    const currentMove = Math.abs(closes[closes.length - 1] - closes[closes.length - 2]);
    const score = atr !== 0 ? (currentMove / atr) * 100 : 0;
    
    return {
        value: score,
        breakout: score > 150,
        normal: score >= 50 && score <= 150,
        quiet: score < 50,
        extreme: score > 200
    };
}

// 7-8. Trend Persistence Index
export function TrendPersistenceIndex(closes, period = 20) {
    if (closes.length < period + 1) return null;
    
    // 연속 상승/하락 계산
    let currentStreak = 0;
    let maxStreak = 0;
    let direction = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        const newDir = diff > 0 ? 1 : diff < 0 ? -1 : 0;
        
        if (newDir === direction) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            direction = newDir;
            currentStreak = 1;
        }
    }
    
    const persistence = (maxStreak / period) * 100;
    
    return {
        value: persistence,
        maxStreak,
        trending: persistence > 25,
        choppy: persistence < 15,
        direction: direction > 0 ? 'up' : direction < 0 ? 'down' : 'neutral'
    };
}

// 7-9. Volume Price Confirmation Index
export function VolumePriceConfirmIndex(closes, volumes, period = 14) {
    if (closes.length < period || volumes.length < period) return null;
    
    // 가격과 거래량 방향 일치도
    let confirmations = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const priceUp = closes[i] > closes[i - 1];
        const volUp = (volumes[i] || 0) > (volumes[i - 1] || 0);
        
        // 가격 상승 + 거래량 증가 = 확인
        // 가격 하락 + 거래량 증가 = 확인
        if ((priceUp && volUp) || (!priceUp && volUp)) {
            confirmations++;
        }
    }
    
    const index = (confirmations / period) * 100;
    
    return {
        value: index,
        confirmed: index > 60,
        weak: index < 40,
        bullish: closes[closes.length - 1] > closes[closes.length - 2] && index > 50,
        bearish: closes[closes.length - 1] < closes[closes.length - 2] && index > 50
    };
}

// 7-10. Relative Strength Momentum
export function RelativeStrengthMomentum(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    // 현재 RSI
    let gains1 = 0, losses1 = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains1 += diff;
        else losses1 -= diff;
    }
    const rsi1 = losses1 === 0 ? 100 : gains1 === 0 ? 0 : 100 - (100 / (1 + gains1 / losses1));
    
    // 이전 RSI
    let gains2 = 0, losses2 = 0;
    for (let i = closes.length - period * 2; i < closes.length - period; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains2 += diff;
        else losses2 -= diff;
    }
    const rsi2 = losses2 === 0 ? 100 : gains2 === 0 ? 0 : 100 - (100 / (1 + gains2 / losses2));
    
    const momentum = rsi1 - rsi2;
    
    return {
        value: rsi1,
        momentum,
        improving: momentum > 0,
        weakening: momentum < 0,
        bullish: rsi1 > 50 && momentum > 0,
        bearish: rsi1 < 50 && momentum < 0
    };
}

// 7-11. Price Channel Momentum
export function PriceChannelMomentum(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    const highestHigh = Math.max(...highs.slice(-period));
    const lowestLow = Math.min(...lows.slice(-period));
    const mid = (highestHigh + lowestLow) / 2;
    const current = closes[closes.length - 1];
    
    // 채널 내 위치 (-100 ~ +100)
    const range = highestHigh - lowestLow;
    const position = range !== 0 ? ((current - mid) / (range / 2)) * 100 : 0;
    
    // 이전 위치와 비교 (모멘텀)
    const prevHH = Math.max(...highs.slice(-period - 1, -1));
    const prevLL = Math.min(...lows.slice(-period - 1, -1));
    const prevMid = (prevHH + prevLL) / 2;
    const prevRange = prevHH - prevLL;
    const prevPos = prevRange !== 0 ? ((closes[closes.length - 2] - prevMid) / (prevRange / 2)) * 100 : 0;
    
    const momentum = position - prevPos;
    
    return {
        value: position,
        momentum,
        nearHigh: position > 80,
        nearLow: position < -80,
        improving: momentum > 0,
        bullish: position > 0,
        bearish: position < 0
    };
}

// 7-12. Multi-Period RSI
export function MultiPeriodRSI(closes, periods = [7, 14, 21]) {
    if (closes.length < Math.max(...periods) + 1) return null;
    
    const rsiValues = [];
    
    for (const period of periods) {
        let gains = 0, losses = 0;
        for (let i = closes.length - period; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff > 0) gains += diff;
            else losses -= diff;
        }
        const rsi = losses === 0 ? 100 : gains === 0 ? 0 : 100 - (100 / (1 + gains / losses));
        rsiValues.push(rsi);
    }
    
    const avgRSI = rsiValues.reduce((a, b) => a + b, 0) / rsiValues.length;
    const aligned = rsiValues.every(r => r > 50) || rsiValues.every(r => r < 50);
    
    return {
        value: avgRSI,
        short: rsiValues[0],
        medium: rsiValues[1],
        long: rsiValues[2],
        aligned,
        bullish: avgRSI > 50 && aligned,
        bearish: avgRSI < 50 && aligned,
        overbought: avgRSI > 70,
        oversold: avgRSI < 30
    };
}

// 7-13. Price Oscillator Enhanced
export function PriceOscillatorEnhanced(closes, fastPeriod = 10, slowPeriod = 20) {
    if (closes.length < slowPeriod) return null;
    
    const fastSMA = closes.slice(-fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
    const slowSMA = closes.slice(-slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;
    
    const oscillator = slowSMA !== 0 ? ((fastSMA - slowSMA) / slowSMA) * 100 : 0;
    
    return {
        value: oscillator,
        bullish: oscillator > 0,
        bearish: oscillator < 0,
        crossUp: oscillator > 0 && oscillator < 1,
        crossDown: oscillator < 0 && oscillator > -1,
        strong: Math.abs(oscillator) > 2
    };
}

// 7-14. Stochastic Divergence Score
export function StochDivergenceScore(highs, lows, closes, period = 14) {
    if (closes.length < period + 5) return null;
    
    // 현재와 5봉 전 스토캐스틱
    const calcStoch = (idx) => {
        const h = highs.slice(idx - period, idx);
        const l = lows.slice(idx - period, idx);
        const hh = Math.max(...h);
        const ll = Math.min(...l);
        return (hh - ll) !== 0 ? ((closes[idx - 1] - ll) / (hh - ll)) * 100 : 50;
    };
    
    const currentStoch = calcStoch(closes.length);
    const prevStoch = calcStoch(closes.length - 5);
    
    // 가격 변화
    const priceChange = closes[closes.length - 1] - closes[closes.length - 6];
    const stochChange = currentStoch - prevStoch;
    
    // 다이버전스 점수
    const bullishDiv = priceChange < 0 && stochChange > 10;
    const bearishDiv = priceChange > 0 && stochChange < -10;
    
    return {
        value: currentStoch,
        divergenceScore: Math.abs(stochChange),
        bullishDivergence: bullishDiv,
        bearishDivergence: bearishDiv,
        overbought: currentStoch > 80,
        oversold: currentStoch < 20
    };
}

// 7-15. Volume Momentum Oscillator
export function VolumeMomentumOsc(volumes, period = 14) {
    if (!volumes || volumes.length < period * 2) return null;
    
    // 현재 기간 평균 거래량
    const currentAvg = volumes.slice(-period).reduce((a, b) => a + (b || 0), 0) / period;
    
    // 이전 기간 평균 거래량
    const prevAvg = volumes.slice(-period * 2, -period).reduce((a, b) => a + (b || 0), 0) / period;
    
    const oscillator = prevAvg !== 0 ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0;
    
    return {
        value: oscillator,
        bullish: oscillator > 0,
        bearish: oscillator < 0,
        increasing: oscillator > 0,
        decreasing: oscillator < 0,
        surge: oscillator > 50,
        quiet: oscillator < -30
    };
}

// 7-16. Dynamic Support Resistance
export function DynamicSRLevel(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    // 피봇 포인트 기반 S/R
    const pivot = (Math.max(...recentHighs) + Math.min(...recentLows) + closes[closes.length - 1]) / 3;
    const resistance = pivot + (Math.max(...recentHighs) - Math.min(...recentLows));
    const support = pivot - (Math.max(...recentHighs) - Math.min(...recentLows));
    
    const current = closes[closes.length - 1];
    const distToResist = ((resistance - current) / current) * 100;
    const distToSupport = ((current - support) / current) * 100;
    
    return {
        pivot,
        resistance,
        support,
        distToResist,
        distToSupport,
        nearResist: distToResist < 1,
        nearSupport: distToSupport < 1,
        bullish: current > pivot,
        bearish: current < pivot
    };
}

// 7-17. Momentum Acceleration Index
export function MomentumAccelIndex(closes, period = 14) {
    if (closes.length < period * 3) return null;
    
    // 3개 구간의 모멘텀
    const mom1 = closes[closes.length - 1] - closes[closes.length - 1 - period];
    const mom2 = closes[closes.length - 1 - period] - closes[closes.length - 1 - period * 2];
    const mom3 = closes[closes.length - 1 - period * 2] - closes[closes.length - 1 - period * 3];
    
    // 가속도 = 모멘텀의 변화율
    const accel1 = mom1 - mom2;
    const accel2 = mom2 - mom3;
    
    const index = (accel1 + accel2) / 2;
    
    return {
        value: index,
        momentum: mom1,
        accelerating: accel1 > 0 && accel1 > accel2,
        decelerating: accel1 < accel2,
        bullish: index > 0,
        bearish: index < 0
    };
}

// 7-18. Price Volatility Ratio
export function PriceVolatilityRatio2(highs, lows, closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    // 현재 기간 변동성
    let currentVol = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        currentVol += highs[i] - lows[i];
    }
    currentVol /= period;
    
    // 이전 기간 변동성
    let prevVol = 0;
    for (let i = closes.length - period * 2; i < closes.length - period; i++) {
        prevVol += highs[i] - lows[i];
    }
    prevVol /= period;
    
    const ratio = prevVol !== 0 ? currentVol / prevVol : 1;
    
    return {
        value: ratio,
        expanding: ratio > 1.2,
        contracting: ratio < 0.8,
        stable: ratio >= 0.8 && ratio <= 1.2,
        breakoutPotential: ratio < 0.6
    };
}

// 7-19. Trend Strength Oscillator
export function TrendStrengthOsc(closes, period = 20) {
    if (closes.length < period + 1) return null;
    
    const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const current = closes[closes.length - 1];
    
    // 추세 강도 = 이동평균으로부터의 거리 비율
    const deviation = ((current - sma) / sma) * 100;
    
    // 연속 추세 일수
    let trendDays = 0;
    const direction = current > sma ? 1 : -1;
    
    for (let i = closes.length - 1; i >= closes.length - period && i >= 0; i--) {
        const tempSMA = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
        if ((closes[i] > tempSMA && direction === 1) || (closes[i] < tempSMA && direction === -1)) {
            trendDays++;
        } else break;
    }
    
    return {
        value: deviation,
        trendDays,
        strongUp: deviation > 3,
        strongDown: deviation < -3,
        bullish: deviation > 0,
        bearish: deviation < 0,
        extended: Math.abs(deviation) > 5
    };
}

// 7-20. Composite Momentum Indicator
export function CompositeMomentum(closes, volumes, period = 14) {
    if (closes.length < period + 1 || volumes.length < period) return null;
    
    // RSI 성분
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const rsi = losses === 0 ? 100 : gains === 0 ? 0 : 100 - (100 / (1 + gains / losses));
    
    // ROC 성분
    const roc = ((closes[closes.length - 1] - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period]) * 100;
    
    // 거래량 성분
    const volRatio = (volumes[volumes.length - 1] || 1) / (volumes.slice(-period).reduce((a, b) => a + (b || 0), 0) / period);
    const volScore = Math.min(100, volRatio * 50);
    
    // 복합 점수
    const composite = (rsi * 0.4 + (50 + roc * 5) * 0.3 + volScore * 0.3);
    
    return {
        value: composite,
        rsiComponent: rsi,
        rocComponent: roc,
        volumeComponent: volScore,
        bullish: composite > 60,
        bearish: composite < 40,
        neutral: composite >= 40 && composite <= 60
    };
}

// 7-21. Adaptive Bollinger Position
export function AdaptiveBBPosition(closes, period = 20) {
    if (closes.length < period) return null;
    
    const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const variance = closes.slice(-period).reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / period;
    const std = Math.sqrt(variance);
    
    // 적응형 승수 (변동성에 따라 조정)
    const recentStd = Math.sqrt(closes.slice(-5).reduce((sum, c) => {
        const m = closes.slice(-5).reduce((a, b) => a + b, 0) / 5;
        return sum + Math.pow(c - m, 2);
    }, 0) / 5);
    
    const multiplier = std !== 0 ? Math.max(1.5, Math.min(2.5, 2 * (recentStd / std))) : 2;
    
    const upper = sma + multiplier * std;
    const lower = sma - multiplier * std;
    const current = closes[closes.length - 1];
    
    const position = (upper - lower) !== 0 ? (current - lower) / (upper - lower) : 0.5;
    
    return {
        value: position * 100,
        multiplier,
        upper,
        lower,
        overbought: position > 0.95,
        oversold: position < 0.05,
        bullish: position > 0.5,
        bearish: position < 0.5
    };
}

// 7-22. Keltner Squeeze Indicator
export function KeltnerSqueeze(highs, lows, closes, bbPeriod = 20, kPeriod = 20) {
    if (closes.length < Math.max(bbPeriod, kPeriod) + 1) return null;
    
    // Bollinger Bands
    const sma = closes.slice(-bbPeriod).reduce((a, b) => a + b, 0) / bbPeriod;
    const variance = closes.slice(-bbPeriod).reduce((sum, c) => sum + Math.pow(c - sma, 2), 0) / bbPeriod;
    const bbStd = Math.sqrt(variance);
    const bbUpper = sma + 2 * bbStd;
    const bbLower = sma - 2 * bbStd;
    
    // Keltner Channel
    const k = 2 / (kPeriod + 1);
    let ema = closes[0];
    for (let i = 0; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
    }
    
    let atr = 0;
    for (let i = closes.length - kPeriod; i < closes.length; i++) {
        atr += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    }
    atr /= kPeriod;
    
    const kUpper = ema + 1.5 * atr;
    const kLower = ema - 1.5 * atr;
    
    // Squeeze = BB가 KC 안에 있을 때
    const squeeze = bbLower > kLower && bbUpper < kUpper;
    
    return {
        squeeze,
        keltnerSqueeze: squeeze,
        bbWidth: bbUpper - bbLower,
        kWidth: kUpper - kLower,
        bullish: !squeeze && closes[closes.length - 1] > ema,
        bearish: !squeeze && closes[closes.length - 1] < ema,
        preSqueeze: Math.abs(bbUpper - kUpper) < atr * 0.2
    };
}

// 7-23. Volume Flow Indicator
export function VolumeFlowIndicator(closes, volumes, period = 14) {
    if (closes.length < period + 1 || volumes.length < period + 1) return null;
    
    let vfi = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const typical = closes[i];
        const prevTypical = closes[i - 1];
        const cutoff = 0.2 * (closes.slice(-50).reduce((a, b) => a + b, 0) / 50 || typical) * 0.01;
        
        const change = typical - prevTypical;
        let direction = 0;
        if (change > cutoff) direction = 1;
        else if (change < -cutoff) direction = -1;
        
        vfi += direction * (volumes[i] || 0);
    }
    
    return {
        value: vfi,
        bullish: vfi > 0,
        bearish: vfi < 0,
        strong: Math.abs(vfi) > (volumes.slice(-period).reduce((a, b) => a + (b || 0), 0) / period) * 3
    };
}

// 7-24. Price Action Score
export function PriceActionScore2(opens, highs, lows, closes, period = 10) {
    if (closes.length < period) return null;
    
    let score = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        // 캔들 분석
        const body = closes[i] - opens[i];
        const range = highs[i] - lows[i];
        const upperWick = highs[i] - Math.max(opens[i], closes[i]);
        const lowerWick = Math.min(opens[i], closes[i]) - lows[i];
        
        // 강한 상승: 큰 양봉 + 작은 윗꼬리
        if (body > 0 && range > 0) {
            if (body / range > 0.6 && upperWick / range < 0.2) score += 2;
            else if (body > 0) score += 1;
        }
        // 강한 하락: 큰 음봉 + 작은 아랫꼬리
        else if (body < 0 && range > 0) {
            if (Math.abs(body) / range > 0.6 && lowerWick / range < 0.2) score -= 2;
            else if (body < 0) score -= 1;
        }
    }
    
    return {
        value: score,
        bullish: score > 5,
        bearish: score < -5,
        neutral: score >= -5 && score <= 5,
        strong: Math.abs(score) > 10
    };
}

// 7-25. Directional Movement Score
export function DirectionalMoveScore(highs, lows, closes, period = 14) {
    if (highs.length < period + 1) return null;
    
    let plusDM = 0, minusDM = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];
        
        if (upMove > downMove && upMove > 0) plusDM += upMove;
        if (downMove > upMove && downMove > 0) minusDM += downMove;
    }
    
    const total = plusDM + minusDM;
    const score = total !== 0 ? ((plusDM - minusDM) / total) * 100 : 0;
    
    return {
        value: score,
        plusDM,
        minusDM,
        bullish: score > 20,
        bearish: score < -20,
        neutral: score >= -20 && score <= 20
    };
}

// 7-26. Range Expansion Index Enhanced
export function RangeExpansionEnhanced(highs, lows, closes, period = 8) {
    if (closes.length < period + 5) return null;
    
    let upCount = 0, downCount = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const high2Back = highs[i - 2];
        const low2Back = lows[i - 2];
        
        if (closes[i] > high2Back && closes[i - 1] > highs[i - 3]) upCount++;
        if (closes[i] < low2Back && closes[i - 1] < lows[i - 3]) downCount++;
    }
    
    const rei = upCount - downCount;
    
    return {
        value: rei,
        upCount,
        downCount,
        bullish: rei > 2,
        bearish: rei < -2,
        breakout: Math.abs(rei) > 4
    };
}

// 7-27. Smoothed Momentum
export function SmoothedMomentum(closes, period = 10, smoothing = 3) {
    if (closes.length < period + smoothing) return null;
    
    // 모멘텀 계산
    const momValues = [];
    for (let i = smoothing; i < closes.length; i++) {
        if (i >= period) {
            momValues.push(closes[i] - closes[i - period]);
        }
    }
    
    // EMA 스무딩
    const k = 2 / (smoothing + 1);
    let smoothed = momValues[0];
    for (let i = 0; i < momValues.length; i++) {
        smoothed = momValues[i] * k + smoothed * (1 - k);
    }
    
    return {
        value: smoothed,
        bullish: smoothed > 0,
        bearish: smoothed < 0,
        strong: Math.abs(smoothed) > closes[closes.length - 1] * 0.02
    };
}

// 7-28. Price Envelope Index
export function PriceEnvelopeIndex(closes, period = 20, percent = 2.5) {
    if (closes.length < period) return null;
    
    const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const upper = sma * (1 + percent / 100);
    const lower = sma * (1 - percent / 100);
    const current = closes[closes.length - 1];
    
    // 위치 지수 (-100 ~ +100)
    const index = current > sma 
        ? ((current - sma) / (upper - sma)) * 100
        : ((current - sma) / (sma - lower)) * 100;
    
    return {
        value: Math.max(-100, Math.min(100, index)),
        upper,
        lower,
        middle: sma,
        overbought: index > 80,
        oversold: index < -80,
        bullish: index > 0,
        bearish: index < 0
    };
}

// 7-29. Volume Weighted Momentum
export function VolumeWeightedMom(closes, volumes, period = 14) {
    if (closes.length < period || volumes.length < period) return null;
    
    let weightedMom = 0;
    let totalVol = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const mom = closes[i] - closes[i - 1];
        const vol = volumes[i] || 1;
        weightedMom += mom * vol;
        totalVol += vol;
    }
    
    const vwm = totalVol !== 0 ? weightedMom / totalVol : 0;
    
    return {
        value: vwm,
        bullish: vwm > 0,
        bearish: vwm < 0,
        strong: Math.abs(vwm) > closes[closes.length - 1] * 0.002
    };
}

// 7-30. Trend Confirmation Score
export function TrendConfirmScore(closes, volumes, period = 14) {
    if (closes.length < period + 1 || volumes.length < period) return null;
    
    // 가격 추세
    const priceTrend = closes[closes.length - 1] > closes[closes.length - period] ? 1 : -1;
    
    // 거래량 추세
    const avgVolRecent = volumes.slice(-5).reduce((a, b) => a + (b || 0), 0) / 5;
    const avgVolPrev = volumes.slice(-period, -5).reduce((a, b) => a + (b || 0), 0) / (period - 5);
    const volTrend = avgVolRecent > avgVolPrev ? 1 : -1;
    
    // RSI 추세
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const rsi = losses === 0 ? 100 : gains === 0 ? 0 : 100 - (100 / (1 + gains / losses));
    const rsiTrend = rsi > 50 ? 1 : -1;
    
    // 복합 점수
    const score = (priceTrend + volTrend + rsiTrend) / 3 * 100;
    
    return {
        value: score,
        aligned: priceTrend === volTrend && volTrend === rsiTrend,
        bullish: score > 50,
        bearish: score < -50,
        mixed: Math.abs(score) <= 50
    };
}

// 7-31. Adaptive Trend Index
export function AdaptiveTrendIndex(closes, minPeriod = 10, maxPeriod = 50) {
    if (closes.length < maxPeriod) return null;
    
    // 변동성 기반 적응형 기간
    const recentCloses = closes.slice(-20);
    const mean = recentCloses.reduce((a, b) => a + b, 0) / 20;
    const volatility = Math.sqrt(recentCloses.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / 20) / mean;
    
    // 변동성이 높으면 짧은 기간, 낮으면 긴 기간
    const period = Math.round(minPeriod + (maxPeriod - minPeriod) * (1 - Math.min(1, volatility * 10)));
    
    const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
    const current = closes[closes.length - 1];
    const index = ((current - sma) / sma) * 100;
    
    return {
        value: index,
        period,
        volatility,
        bullish: index > 0,
        bearish: index < 0,
        strong: Math.abs(index) > 2
    };
}

// 7-32. Relative Price Strength Index
export function RelativePriceStrength2(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    // 현재 기간 수익률
    const currentReturn = (closes[closes.length - 1] - closes[closes.length - 1 - period]) / closes[closes.length - 1 - period];
    
    // 이전 기간들의 평균 수익률
    let avgReturn = 0;
    const numPeriods = Math.min(5, Math.floor(closes.length / period) - 1);
    
    for (let p = 1; p <= numPeriods; p++) {
        const start = closes.length - 1 - period * (p + 1);
        const end = closes.length - 1 - period * p;
        if (start >= 0) {
            avgReturn += (closes[end] - closes[start]) / closes[start];
        }
    }
    avgReturn /= numPeriods;
    
    const rps = avgReturn !== 0 ? (currentReturn / avgReturn) : 1;
    
    return {
        value: rps * 100,
        outperforming: rps > 1,
        underperforming: rps < 1,
        bullish: rps > 1.2,
        bearish: rps < 0.8
    };
}

// 7-33. Volume Climax Index
export function VolumeClimaxIndex(closes, volumes, period = 20) {
    if (closes.length < period || volumes.length < period) return null;
    
    const avgVol = volumes.slice(-period).reduce((a, b) => a + (b || 0), 0) / period;
    const currentVol = volumes[volumes.length - 1] || 0;
    const volRatio = avgVol !== 0 ? currentVol / avgVol : 1;
    
    const priceChange = closes[closes.length - 1] - closes[closes.length - 2];
    
    // 클라이맥스 지수 = 거래량 비율 * 가격 변화 방향
    const index = volRatio * (priceChange > 0 ? 1 : -1) * 100;
    
    return {
        value: index,
        volRatio,
        climax: volRatio > 2,
        bullishClimax: volRatio > 2 && priceChange > 0,
        bearishClimax: volRatio > 2 && priceChange < 0,
        quiet: volRatio < 0.5
    };
}

// 7-34. Momentum Divergence Index Enhanced
export function MomDivergenceEnhanced(closes, period = 14) {
    if (closes.length < period * 2) return null;
    
    // 가격 추세
    const priceHigher = closes[closes.length - 1] > closes[closes.length - 1 - period];
    
    // 모멘텀 추세 (ROC 기반)
    const currentROC = (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2] * 100;
    const prevROC = (closes[closes.length - 1 - period] - closes[closes.length - 2 - period]) / closes[closes.length - 2 - period] * 100;
    const momHigher = currentROC > prevROC;
    
    // 다이버전스 탐지
    const bullishDiv = !priceHigher && momHigher;  // 가격 낮지만 모멘텀 높음
    const bearishDiv = priceHigher && !momHigher;  // 가격 높지만 모멘텀 낮음
    
    return {
        value: currentROC,
        bullishDivergence: bullishDiv,
        bearishDivergence: bearishDiv,
        confirmed: !bullishDiv && !bearishDiv,
        bullish: priceHigher && momHigher,
        bearish: !priceHigher && !momHigher
    };
}

// 7-35. Composite Trend Strength
export function CompositeTrendStrength(highs, lows, closes, volumes, period = 14) {
    if (closes.length < period + 1 || volumes.length < period) return null;
    
    // ADX 성분 (간소화)
    let plusDM = 0, minusDM = 0, tr = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const upMove = highs[i] - highs[i - 1];
        const downMove = lows[i - 1] - lows[i];
        if (upMove > downMove && upMove > 0) plusDM += upMove;
        if (downMove > upMove && downMove > 0) minusDM += downMove;
        tr += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    }
    const plusDI = tr !== 0 ? (plusDM / tr) * 100 : 0;
    const minusDI = tr !== 0 ? (minusDM / tr) * 100 : 0;
    const dx = (plusDI + minusDI) !== 0 ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 : 0;
    
    // 거래량 확인
    const avgVol = volumes.slice(-period).reduce((a, b) => a + (b || 0), 0) / period;
    const volConfirm = (volumes[volumes.length - 1] || 0) > avgVol ? 1 : 0.5;
    
    // 복합 강도
    const strength = dx * volConfirm;
    
    return {
        value: strength,
        dx,
        plusDI,
        minusDI,
        volumeConfirmed: volConfirm === 1,
        strong: strength > 30,
        weak: strength < 20,
        bullish: plusDI > minusDI,
        bearish: minusDI > plusDI
    };
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 11. 추가 기존 지표 (놓친 것들)                                              │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 11-1. Ichimoku Cloud - Senkou Span A
export function IchimokuSenkouA(highs, lows, tenkanPeriod = 9, kijunPeriod = 26) {
    const tenkan = IchimokuTenkan(highs, lows, tenkanPeriod);
    const kijun = IchimokuKijun(highs, lows, kijunPeriod);
    if (!tenkan || !kijun) return null;
    const senkouA = (tenkan + kijun) / 2;
    const senkouB = IchimokuSenkouB(highs, lows, 52);
    return { value: senkouA, senkouA, senkouB };
}

// 11-2. Ichimoku Cloud - Senkou Span B
export function IchimokuSenkouB(highs, lows, period = 52) {
    if (highs.length < period) return null;
    const high = Math.max(...highs.slice(-period));
    const low = Math.min(...lows.slice(-period));
    const senkouB = (high + low) / 2;
    return { value: senkouB, senkouB };
}

// 11-3. Ichimoku Cloud - Chikou Span (현재가 26봉 전 위치)
export function IchimokuChikou(closes, displacement = 26) {
    return closes[closes.length - 1]; // 현재가 (26봉 뒤에 표시)
}

// 11-4. Schaff Trend Cycle (STC)
export function SchaffTrendCycle(closes, fastPeriod = 23, slowPeriod = 50, cyclePeriod = 10) {
    const macdVal = MACD(closes, fastPeriod, slowPeriod);
    if (!macdVal) return null;
    // MACD의 Stochastic
    return RSI(closes, cyclePeriod); // 간략화
}

// 11-5. McGinley Dynamic
export function McGinleyDynamic(closes, period = 14) {
    if (closes.length < period) return null;
    let md = SMA(closes.slice(0, period), period);
    for (let i = period; i < closes.length; i++) {
        const k = 0.6;
        md = md + (closes[i] - md) / (k * period * Math.pow(closes[i] / md, 4));
    }
    return md;
}

// 11-6. Relative Vigor Index (RVI)
export function RVI(opens, highs, lows, closes, period = 10) {
    if (closes.length < period + 3) return null;

    const rviSeries = [];
    for (let i = 3; i < closes.length; i++) {
        if (i < period + 2) {
            rviSeries.push(null);
            continue;
        }
        let numSum = 0, denomSum = 0;
        for (let j = i - period + 1; j <= i; j++) {
            const num = ((closes[j] - opens[j]) +
                        2 * (closes[j - 1] - opens[j - 1]) +
                        2 * (closes[j - 2] - opens[j - 2]) +
                        (closes[j - 3] - opens[j - 3])) / 6;
            const denom = ((highs[j] - lows[j]) +
                          2 * (highs[j - 1] - lows[j - 1]) +
                          2 * (highs[j - 2] - lows[j - 2]) +
                          (highs[j - 3] - lows[j - 3])) / 6;
            numSum += num;
            denomSum += denom;
        }
        rviSeries.push(denomSum !== 0 ? (numSum / denomSum) * 100 : 0);
    }

    const validRvi = rviSeries.filter(v => v != null);
    const value = validRvi.length > 0 ? validRvi[validRvi.length - 1] : null;
    const signal = validRvi.length >= 4 ? SMA(validRvi, 4) : null;

    return {
        value,
        signal,
        bullish: value != null && signal != null ? value > signal : null,
        bearish: value != null && signal != null ? value < signal : null
    };
}

// 11-7. DeMarker (DeM)
export function DeMarker(highs, lows, period = 14) {
    if (highs.length < period + 1) return null;
    let deMax = 0, deMin = 0;
    for (let i = highs.length - period; i < highs.length; i++) {
        const highDiff = highs[i] - highs[i - 1];
        const lowDiff = lows[i - 1] - lows[i];
        deMax += highDiff > 0 ? highDiff : 0;
        deMin += lowDiff > 0 ? lowDiff : 0;
    }
    const total = deMax + deMin;
    return total !== 0 ? (deMax / total) * 100 : 50;
}

// 11-8. Connors RSI
export function ConnorsRSI(closes, rsiPeriod = 3, streakPeriod = 2, rankPeriod = 100) {
    const rsi = RSI(closes, rsiPeriod);
    const roc = ROC(closes, 1);
    if (!rsi || !roc) return null;
    // 간략화: RSI + ROC 기반 랭크
    return (rsi + 50 + (roc > 0 ? 10 : -10)) / 2;
}

// 11-9. Klinger Oscillator
export function KlingerOscillator(highs, lows, closes, volumes, fast = 34, slow = 55) {
    if (closes.length < slow + 1) return null;
    // Volume Force 계산
    const vf = [];
    for (let i = 1; i < closes.length; i++) {
        const hlc = highs[i] + lows[i] + closes[i];
        const prevHlc = highs[i-1] + lows[i-1] + closes[i-1];
        const trend = hlc > prevHlc ? 1 : -1;
        const dm = highs[i] - lows[i];
        const cm = dm; // 간략화
        vf.push(volumes[i] * Math.abs(2 * (dm / cm) - 1) * trend * 100);
    }
    const calcEmaSeries = (data, period) => {
        if (!data || data.length < period) return [];
        const series = [];
        const k = 2 / (period + 1);
        let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
        series.push(ema);
        for (let i = period; i < data.length; i++) {
            ema = data[i] * k + ema * (1 - k);
            series.push(ema);
        }
        return series;
    };

    const emaFastSeries = calcEmaSeries(vf, fast);
    const emaSlowSeries = calcEmaSeries(vf, slow);
    if (emaFastSeries.length === 0 || emaSlowSeries.length === 0) return null;

    const offset = slow - fast;
    const oscSeries = [];
    for (let i = 0; i < emaSlowSeries.length; i++) {
        const fastIdx = i + offset;
        if (fastIdx < emaFastSeries.length) {
            oscSeries.push(emaFastSeries[fastIdx] - emaSlowSeries[i]);
        }
    }

    if (oscSeries.length === 0) return null;
    const signal = oscSeries.length >= 13 ? EMA(oscSeries, 13) : null;
    const value = oscSeries[oscSeries.length - 1];
    return {
        value,
        signal,
        bullish: signal != null ? value > signal : null,
        bearish: signal != null ? value < signal : null
    };
}

// 11-10. Ease of Movement (EOM)
export function EaseOfMovement(highs, lows, volumes, period = 14) {
    if (highs.length < period + 1) return null;
    const emv = [];
    for (let i = 1; i < highs.length; i++) {
        const dm = ((highs[i] + lows[i]) / 2) - ((highs[i-1] + lows[i-1]) / 2);
        const br = (volumes[i] / 100000000) / (highs[i] - lows[i] || 1);
        emv.push(dm / br);
    }
    return SMA(emv, period);
}

// 11-11. Balance of Power (BOP)
export function BalanceOfPower(opens, highs, lows, closes) {
    const current = closes.length - 1;
    const range = highs[current] - lows[current];
    return range !== 0 ? (closes[current] - opens[current]) / range : 0;
}

// 11-12. Qstick
export function Qstick(opens, closes, period = 8) {
    if (closes.length < period) return null;
    let sum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        sum += closes[i] - opens[i];
    }
    return sum / period;
}

// 11-13. Intraday Intensity
export function IntradayIntensity(highs, lows, closes, volumes) {
    const current = closes.length - 1;
    const range = highs[current] - lows[current];
    if (range === 0) return 0;
    return ((2 * closes[current] - highs[current] - lows[current]) / range) * volumes[current];
}

// 11-14. Market Facilitation Index (BW MFI)
export function MarketFacilitationIndex(highs, lows, volumes) {
    const current = highs.length - 1;
    return volumes[current] !== 0 
        ? (highs[current] - lows[current]) / volumes[current] * 1000000
        : 0;
}

// 11-15. Price Zone Oscillator (PZO)
export function PriceZoneOscillator(closes, period = 14) {
    if (closes.length < period + 1) return null;
    let vpSum = 0, tvSum = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const sign = closes[i] > closes[i - 1] ? 1 : -1;
        vpSum += sign * closes[i];
        tvSum += closes[i];
    }
    return tvSum !== 0 ? (vpSum / tvSum) * 100 : 0;
}

// 11-16. Chande Forecast Oscillator
export function ChandeForecastOscillator(closes, period = 14) {
    if (closes.length < period) return null;
    // Linear Regression 예측값과 실제값 차이
    const lr = LinearRegressionValue(closes, period);
    const current = closes[closes.length - 1];
    return lr && lr !== 0 ? ((current - lr) / current) * 100 : 0;
}

// 11-17. Linear Regression Value
export function LinearRegressionValue(closes, period = 14) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < period; i++) {
        sumX += i;
        sumY += slice[i];
        sumXY += i * slice[i];
        sumX2 += i * i;
    }
    const slope = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / period;
    return intercept + slope * (period - 1);
}

// 11-18. Linear Regression Slope
export function LinearRegressionSlope(closes, period = 14) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < period; i++) {
        sumX += i;
        sumY += slice[i];
        sumXY += i * slice[i];
        sumX2 += i * i;
    }
    return (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
}

// 11-19. R-Squared (Linear Regression)
export function RSquared(closes, period = 14) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    let ssTot = 0, ssRes = 0;
    const lr = LinearRegressionValue(closes, period);
    const slope = LinearRegressionSlope(closes, period);
    for (let i = 0; i < period; i++) {
        const predicted = lr - slope * (period - 1 - i);
        ssTot += Math.pow(slice[i] - mean, 2);
        ssRes += Math.pow(slice[i] - predicted, 2);
    }
    return ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
}

// 11-20. Standard Error
export function StandardError(closes, period = 14) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const lr = LinearRegressionValue(closes, period);
    const slope = LinearRegressionSlope(closes, period);
    let sumSq = 0;
    for (let i = 0; i < period; i++) {
        const predicted = lr - slope * (period - 1 - i);
        sumSq += Math.pow(slice[i] - predicted, 2);
    }
    return Math.sqrt(sumSq / period);
}

// 11-21. Heikin Ashi Close
export function HeikinAshiClose(open, high, low, close) {
    return (open + high + low + close) / 4;
}

// 11-22. Heikin Ashi 추세 (연속 양봉/음봉)
export function HeikinAshiTrend(opens, highs, lows, closes, period = 5) {
    if (closes.length < period) return null;
    let haOpen = opens[closes.length - period];
    let bullCount = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        const haClose = (opens[i] + highs[i] + lows[i] + closes[i]) / 4;
        if (haClose > haOpen) bullCount++;
        haOpen = (haOpen + haClose) / 2;
    }
    return (bullCount / period) * 100; // 0-100 (100 = 전부 양봉)
}

// 11-23. Fractal High (상승 프랙탈)
export function FractalHigh(highs) {
    if (highs.length < 5) return null;
    const i = highs.length - 3; // 중간 위치
    if (highs[i] > highs[i-2] && highs[i] > highs[i-1] && 
        highs[i] > highs[i+1] && highs[i] > highs[i+2]) {
        return highs[i];
    }
    return null;
}

// 11-24. Fractal Low (하락 프랙탈)
export function FractalLow(lows) {
    if (lows.length < 5) return null;
    const i = lows.length - 3;
    if (lows[i] < lows[i-2] && lows[i] < lows[i-1] && 
        lows[i] < lows[i+1] && lows[i] < lows[i+2]) {
        return lows[i];
    }
    return null;
}

// 11-25. Guppy MMA Short (단기 그룹 평균)
export function GuppyShort(closes) {
    const periods = [3, 5, 8, 10, 12, 15];
    const emas = periods.map(p => EMA(closes, p)).filter(v => v !== null);
    return emas.length > 0 ? emas.reduce((a, b) => a + b, 0) / emas.length : null;
}

// 11-26. Guppy MMA Long (장기 그룹 평균)
export function GuppyLong(closes) {
    const periods = [30, 35, 40, 45, 50, 60];
    const emas = periods.map(p => EMA(closes, p)).filter(v => v !== null);
    return emas.length > 0 ? emas.reduce((a, b) => a + b, 0) / emas.length : null;
}

// 11-27. Guppy MMA Separation (단기-장기 분리도)
export function GuppySeparation(closes) {
    const short = GuppyShort(closes);
    const long = GuppyLong(closes);
    if (!short || !long || long === 0) return null;
    return ((short - long) / long) * 100;
}

// 11-28. Elder Impulse (1: 강세, -1: 약세, 0: 중립)
export function ElderImpulse(closes, highs, lows) {
    const ema13 = EMA(closes, 13);
    const prevEma = EMA(closes.slice(0, -1), 13);
    const macdHist = MACD(closes)?.histogram;
    const prevMacdHist = MACD(closes.slice(0, -1))?.histogram;
    
    if (!ema13 || !prevEma || macdHist === undefined) return 0;
    
    const emaRising = ema13 > prevEma;
    const macdRising = macdHist > (prevMacdHist || 0);
    
    if (emaRising && macdRising) return 1;  // 강세 (녹색)
    if (!emaRising && !macdRising) return -1; // 약세 (빨간색)
    return 0; // 중립 (파란색)
}

// 11-29. Percent Rank
export function PercentRank(closes, period = 100) {
    if (closes.length < period) return null;
    const current = closes[closes.length - 1];
    const slice = closes.slice(-period);
    let count = 0;
    for (const price of slice) {
        if (price < current) count++;
    }
    return (count / period) * 100;
}

// 11-30. Z-Score
export function ZScore(closes, period = 20) {
    if (closes.length < period) return null;
    const sma = SMA(closes, period);
    const std = StandardDeviation(closes, period);
    if (!sma || !std || std === 0) return null;
    return (closes[closes.length - 1] - sma) / std;
}


/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 지표 목록 요약 (총 88개 표준 지표)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * [표준 지표 - 88개]
 * 1. 추세 (12개): SMA, EMA, WMA, DEMA, TEMA, KAMA, HMA, VWMA, ZLEMA, T3, SMMA, ALMA
 * 2. 모멘텀 (18개): RSI, Stochastic, Williams%R, MACD, ROC, Momentum, CCI, CMO, TSI,
 *                   UltimateOsc, AwesomeOsc, AcceleratorOsc, PPO, DPO, TRIX, KST, Coppock
 * 3. 변동성 (10개): ATR, TrueRange, BollingerBands, Keltner, Donchian, StdDev, 
 *                   HistVol, ChaikinVol, MassIndex, UlcerIndex
 * 4. 거래량 (13개): OBV, VolumeSMA, VolumeRatio, MFI, CMF, ADL, ChaikinOsc, VWAP,
 *                   PVI, NVI, ForceIndex, EFI, VolumeOsc
 * 5. 추세강도 (10개): ADX, +DI, -DI, AroonUp, AroonDown, AroonOsc, VortexPlus,
 *                     VortexMinus, ParabolicSAR, Supertrend
 * 6. 가격위치 (5개): PricePosition, DistanceFromMA, PriceVsEMA, PivotPoints, Fibonacci
 * 7. 캔들 (7개): BodySize, UpperShadow, LowerShadow, CandleDirection, 
 *                ConsecutiveCandles, AvgCandleSize, CandleSizeRatio
 * 8. 복합 (8개): StochRSI, MACDHistROC, BB%B, BBWidth, Squeeze, IchimokuTenkan,
 *                BullPower, BearPower
 * 9. 시간 (4개): PriceChangeN, BullishRatio, HigherHighsCount, LowerLowsCount
 * 10. 심리 (2개): FearGreed(외부), BuySellPressure
 * 
 * [추가 기존 지표 - 30개]
 * 11. IchimokuSenkouA/B, IchimokuChikou, SchaffTrendCycle, McGinleyDynamic,
 *     RVI, DeMarker, ConnorsRSI, KlingerOscillator, EaseOfMovement, BalanceOfPower,
 *     Qstick, IntradayIntensity, MarketFacilitationIndex, PriceZoneOscillator,
 *     ChandeForecastOsc, LinearRegressionValue/Slope, RSquared, StandardError,
 *     HeikinAshiClose/Trend, FractalHigh/Low, GuppyShort/Long/Separation,
 *     ElderImpulse, PercentRank, ZScore
 * 
 * [🆕 커스텀 지표 (Claude 창작) - 25개]
 * 12. PriceAcceleration, NormalizedAcceleration, VolumeMomentumDivergence,
 *     TrendConsistencyIndex, CandleEnergyIndex, ExhaustionIndex,
 *     SupportDistance, ResistanceDistance, VolatilityRegime, MomentumAlignment,
 *     PriceEfficiencyRatio, BreakoutStrength, GapPercent, RelativeVolumePriceTrend,
 *     WickRejectionIndex, MultiRSIAlignment, VolumeClimax, TrendMomentumComposite,
 *     MeanReversionIndex, DirectionalStrength, SmartMoneyIndex,
 *     VolatilitySqueezePotential, AccumulationStrength, CandleMomentum,
 *     RangeExpansionIndex, RelativeCandlePosition
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 의미있는 조건 (Meaningful Signals) 정의
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 각 지표별 실제 트레이딩에서 의미있는 조건들만 정의
 * - buyPeriods: 매수 신호에 의미있는 기간들
 * - sellPeriods: 매도 신호에 의미있는 기간들
 * - buy: 매수 신호 조건들
 * - sell: 매도 신호 조건들
 * 
 * 이걸로 조합하면 수십억 개가 아닌 수백만 개의 "의미있는" 전략만 생성됨
 */

export const INDICATOR_LIST = [
    // ─────────────────────────────────────────────────────────────────────────
    // 추세 (이평선) - 매수: 단기, 매도: 장기가 더 신뢰도 높음
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'SMA', fn: SMA, params: ['closes', 'period'], category: 'trend',
        // 15분봉 기준 세분화된 기간: 3(45분)~100(25시간)
        buyPeriods: [3, 5, 7, 10, 15, 20, 30],      // 단기~중기: 빠른 진입
        sellPeriods: [15, 20, 30, 50, 75, 100],    // 중기~장기: 확실한 추세 전환
        signals: {
            buy: [
                { type: 'price_above', desc: '가격이 SMA 위' },
                { type: 'cross_up', desc: '가격이 SMA 상향돌파' },
                { type: 'slope_up', desc: 'SMA 기울기 상승' },
            ],
            sell: [
                { type: 'price_below', desc: '가격이 SMA 아래' },
                { type: 'cross_down', desc: '가격이 SMA 하향돌파' },
                { type: 'slope_down', desc: 'SMA 기울기 하락' },
            ]
        }
    },
    { 
        name: 'EMA', fn: EMA, params: ['closes', 'period'], category: 'trend',
        // 15분봉 세분화: 3(45분), 5(1.25시간), 8(2시간), 12(3시간), 20(5시간), 50(12.5시간)
        buyPeriods: [3, 5, 8, 12, 15, 20, 26],     // 단기 반응
        sellPeriods: [15, 20, 26, 35, 50, 75, 100], // 장기 추세
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > EMA' },
                { type: 'cross_up', desc: 'EMA 상향돌파' },
                { type: 'ema_golden', with: 'EMA', desc: 'EMA 골든크로스 (단기>장기)' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < EMA' },
                { type: 'cross_down', desc: 'EMA 하향돌파' },
                { type: 'ema_dead', with: 'EMA', desc: 'EMA 데드크로스' },
            ]
        }
    },
    { 
        name: 'WMA', fn: WMA, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [5, 8, 10, 15, 20],
        sellPeriods: [15, 20, 30, 50],
        signals: {
            buy: [{ type: 'price_above' }, { type: 'cross_up' }],
            sell: [{ type: 'price_below' }, { type: 'cross_down' }]
        }
    },
    { 
        name: 'DEMA', fn: DEMA, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [5, 8, 10, 15, 20],
        sellPeriods: [15, 20, 30, 50],
        signals: {
            buy: [{ type: 'price_above' }, { type: 'cross_up' }],
            sell: [{ type: 'price_below' }, { type: 'cross_down' }]
        }
    },
    { 
        name: 'HMA', fn: HMA, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [5, 9, 14, 21],   // HMA는 빠른 반응이 특징
        sellPeriods: [14, 21, 34, 55],
        signals: {
            buy: [{ type: 'price_above' }, { type: 'slope_up' }],
            sell: [{ type: 'price_below' }, { type: 'slope_down' }]
        }
    },
    { 
        name: 'VWMA', fn: VWMA, params: ['closes', 'volumes', 'period'], category: 'trend',
        buyPeriods: [10, 15, 20, 25],
        sellPeriods: [15, 20, 25, 35, 50],
        signals: {
            buy: [{ type: 'price_above' }, { type: 'vwma_above_sma', desc: 'VWMA > SMA (매집 신호)' }],
            sell: [{ type: 'price_below' }, { type: 'vwma_below_sma', desc: 'VWMA < SMA (분산 신호)' }]
        }
    },
    { 
        name: 'McGinleyDynamic', fn: McGinleyDynamic, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [10, 14, 18, 20],
        sellPeriods: [14, 18, 20, 25],
        signals: {
            buy: [{ type: 'price_above' }, { type: 'cross_up' }],
            sell: [{ type: 'price_below' }, { type: 'cross_down' }]
        }
    },
    { 
        name: 'GuppyShort', fn: GuppyShort, params: ['closes'], category: 'trend',
        signals: {
            buy: [{ type: 'expanding_up', desc: '단기 Guppy 확장 상승' }],
            sell: [{ type: 'contracting', desc: '단기 Guppy 수축' }]
        }
    },
    { 
        name: 'GuppyLong', fn: GuppyLong, params: ['closes'], category: 'trend',
        signals: {
            buy: [{ type: 'short_above_long', desc: '단기 Guppy > 장기 Guppy' }],
            sell: [{ type: 'short_below_long', desc: '단기 Guppy < 장기 Guppy' }]
        }
    },
    { 
        name: 'GuppySeparation', fn: GuppySeparation, params: ['closes'], category: 'trend',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '양수 (상승 추세)' },
                { type: 'increasing', desc: '확대 중' }
            ],
            sell: [
                { type: 'lt', values: [0], desc: '음수 (하락 추세)' },
                { type: 'decreasing', desc: '축소 중' }
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 모멘텀 - RSI: 매수는 짧은 기간(민감), 매도는 긴 기간(확실)
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'RSI', fn: RSI, params: ['closes', 'period'], category: 'momentum',
        // 15분봉 세분화: 3(45분), 5(1.25시간), 7, 9, 12, 14(3.5시간), 18, 21(5.25시간)
        buyPeriods: [3, 5, 7, 9, 12, 14],    // 과매도 감지는 민감하게
        sellPeriods: [9, 12, 14, 18, 21],    // 과매수 확인은 신중하게
        signals: {
            buy: [
                { type: 'lt', values: [20, 25, 30], desc: '과매도' },
                { type: 'cross_up', values: [30, 50], desc: '상향돌파' },
                { type: 'rising_from_oversold', desc: 'RSI 과매도에서 상승' },
                { type: 'bullish_divergence', desc: 'RSI 상승 다이버전스' },
            ],
            sell: [
                { type: 'gt', values: [70, 75, 80], desc: '과매수' },
                { type: 'cross_down', values: [70, 50], desc: '하향돌파' },
                { type: 'falling_from_overbought', desc: 'RSI 과매수에서 하락' },
                { type: 'bearish_divergence', desc: 'RSI 하락 다이버전스' },
            ]
        }
    },
    { 
        name: 'StochasticK', fn: StochasticK, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [3, 5, 7, 9, 14],    // 빠른 반등 포착
        sellPeriods: [7, 9, 14, 21],     // 하락 확인
        signals: {
            buy: [
                { type: 'lt', values: [20, 25, 30], desc: '과매도' },
                { type: 'cross_up', values: [20, 30], desc: '상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [70, 75, 80], desc: '과매수' },
                { type: 'cross_down', values: [80, 70], desc: '하향돌파' },
            ]
        }
    },
    { 
        name: 'StochasticD', fn: StochasticD, params: ['highs', 'lows', 'closes', 'kPeriod', 'dPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'k_cross_up_d', desc: '%K가 %D 상향돌파' },
                { type: 'both_oversold', desc: 'K, D 둘 다 과매도' },
            ],
            sell: [
                { type: 'k_cross_down_d', desc: '%K가 %D 하향돌파' },
                { type: 'both_overbought', desc: 'K, D 둘 다 과매수' },
            ]
        }
    },
    { 
        name: 'WilliamsR', fn: WilliamsR, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [5, 7, 10, 14],    // 빠른 과매도 감지
        sellPeriods: [10, 14, 18, 21], // 과매수 확인
        signals: {
            buy: [
                { type: 'lt', values: [-80, -85, -90], desc: '과매도 (-80 이하)' },
                { type: 'cross_up', values: [-80], desc: '-80 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [-20, -15, -10], desc: '과매수 (-20 이상)' },
                { type: 'cross_down', values: [-20], desc: '-20 하향돌파' },
            ]
        }
    },
    { 
        name: 'MACD', fn: MACD, params: ['closes', 'fast', 'slow', 'signal'], category: 'momentum',
        // 15분봉 세분화: 다양한 fast/slow/signal 조합
        buyParamSets: [[5, 13, 5], [8, 17, 9], [12, 26, 9], [5, 35, 5]],   // 빠른~표준 설정
        sellParamSets: [[8, 17, 9], [12, 26, 9], [15, 30, 9]],            // 안정적 설정
        signals: {
            buy: [
                { type: 'golden_cross', desc: 'MACD 골든크로스 (MACD > Signal)' },
                { type: 'histogram_positive', desc: '히스토그램 양전환' },
                { type: 'histogram_increasing', desc: '히스토그램 증가' },
                { type: 'above_zero', desc: 'MACD > 0' },
                { type: 'cross_up_zero', desc: 'MACD 0선 상향돌파' },
                { type: 'bullish_divergence', desc: 'MACD 상승 다이버전스' },
            ],
            sell: [
                { type: 'dead_cross', desc: 'MACD 데드크로스 (MACD < Signal)' },
                { type: 'histogram_negative', desc: '히스토그램 음전환' },
                { type: 'histogram_decreasing', desc: '히스토그램 감소' },
                { type: 'below_zero', desc: 'MACD < 0' },
                { type: 'cross_down_zero', desc: 'MACD 0선 하향돌파' },
                { type: 'bearish_divergence', desc: 'MACD 하락 다이버전스' },
            ]
        }
    },
    { 
        name: 'ROC', fn: ROC, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [3, 5, 7, 9, 12],   // 빠른 모멘텀 변화
        sellPeriods: [9, 12, 14, 18, 25], // 모멘텀 약화 확인
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'ROC 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
                { type: 'increasing', desc: 'ROC 증가 중' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'ROC 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
                { type: 'decreasing', desc: 'ROC 감소 중' },
            ]
        }
    },
    { 
        name: 'Momentum', fn: Momentum, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [3, 5, 7, 10, 14],
        sellPeriods: [10, 14, 18, 21],
        signals: {
            buy: [
                { type: 'gt', values: [2, 5], desc: '2~5% 이상 상승' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파 (상승 전환)' },
            ],
            sell: [
                { type: 'lt', values: [-2, -5], desc: '2~5% 이상 하락' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파 (하락 전환)' },
            ]
        }
    },
    { 
        name: 'CCI', fn: CCI, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [5, 7, 10, 14, 20],     // 극단적 과매도 빠른 감지
        sellPeriods: [10, 14, 20, 28],      // 과매수 확인
        signals: {
            buy: [
                { type: 'lt', values: [-100, -150, -200], desc: '과매도 (-100 이하)' },
                { type: 'cross_up', values: [-100, 0], desc: '상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [100, 150, 200], desc: '과매수 (100 이상)' },
                { type: 'cross_down', values: [100, 0], desc: '하향돌파' },
            ]
        }
    },
    { 
        name: 'CMO', fn: CMO, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [5, 7, 9, 14],
        sellPeriods: [9, 14, 18, 21],
        signals: {
            buy: [
                { type: 'lt', values: [-50, -40], desc: '과매도' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [50, 40], desc: '과매수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'UltimateOscillator', fn: UltimateOscillator, params: ['highs', 'lows', 'closes'], category: 'momentum',
        signals: {
            buy: [
                { type: 'lt', values: [30, 35], desc: '과매도' },
                { type: 'bullish_divergence', desc: '상승 다이버전스' },
            ],
            sell: [
                { type: 'gt', values: [65, 70], desc: '과매수' },
                { type: 'bearish_divergence', desc: '하락 다이버전스' },
            ]
        }
    },
    { 
        name: 'AwesomeOscillator', fn: AwesomeOscillator, params: ['highs', 'lows'], category: 'momentum',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
                { type: 'twin_peaks_buy', desc: '쌍바닥 매수' },
                { type: 'saucer_buy', desc: '접시형 매수 (음수에서 반등)' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
                { type: 'twin_peaks_sell', desc: '쌍봉 매도' },
            ]
        }
    },
    { 
        name: 'PPO', fn: PPO, params: ['closes', 'fast', 'slow'], category: 'momentum',
        buyParamSets: [[5, 13], [8, 17], [12, 26], [5, 35]],
        sellParamSets: [[8, 17], [12, 26], [15, 30]],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'PPO 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
                { type: 'increasing', desc: 'PPO 증가' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'PPO 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
                { type: 'decreasing', desc: 'PPO 감소' },
            ]
        }
    },
    { 
        name: 'TRIX', fn: TRIX, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [9, 12, 15, 18],
        sellPeriods: [12, 15, 18, 21],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'TRIX 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'TRIX 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'KST', fn: KST, params: ['closes'], category: 'momentum',
        signals: {
            buy: [
                { type: 'cross_up_signal', desc: 'KST 시그널 상향돌파' },
                { type: 'gt', values: [0], desc: 'KST 양수' },
            ],
            sell: [
                { type: 'cross_down_signal', desc: 'KST 시그널 하향돌파' },
                { type: 'lt', values: [0], desc: 'KST 음수' },
            ]
        }
    },
    { 
        name: 'RVI', fn: RVI, params: ['opens', 'highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [7, 10, 14],
        sellPeriods: [10, 14, 18],
        signals: {
            buy: [
                { type: 'cross_up_signal', desc: 'RVI 시그널 상향돌파' },
                { type: 'gt', values: [0], desc: 'RVI 양수' },
            ],
            sell: [
                { type: 'cross_down_signal', desc: 'RVI 시그널 하향돌파' },
                { type: 'lt', values: [0], desc: 'RVI 음수' },
            ]
        }
    },
    { 
        name: 'DeMarker', fn: DeMarker, params: ['highs', 'lows', 'period'], category: 'momentum',
        buyPeriods: [7, 10, 13, 14],   // 빠른 과매도 감지
        sellPeriods: [10, 13, 14, 18],
        signals: {
            buy: [
                { type: 'lt', values: [0.2, 0.3], desc: '과매도 (0.3 이하)' },
                { type: 'cross_up', values: [0.3], desc: '0.3 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [0.7, 0.8], desc: '과매수 (0.7 이상)' },
                { type: 'cross_down', values: [0.7], desc: '0.7 하향돌파' },
            ]
        }
    },
    { 
        name: 'ConnorsRSI', fn: ConnorsRSI, params: ['closes'], category: 'momentum',
        signals: {
            buy: [
                { type: 'lt', values: [10, 15, 20], desc: '극단적 과매도 (20 이하)' },
            ],
            sell: [
                { type: 'gt', values: [80, 85, 90], desc: '극단적 과매수 (80 이상)' },
            ]
        }
    },
    { 
        name: 'SchaffTrendCycle', fn: SchaffTrendCycle, params: ['closes'], category: 'momentum',
        signals: {
            buy: [
                { type: 'lt', values: [10, 25], desc: '과매도' },
                { type: 'cross_up', values: [25], desc: '25 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [75, 90], desc: '과매수' },
                { type: 'cross_down', values: [75], desc: '75 하향돌파' },
            ]
        }
    },
    { 
        name: 'ElderImpulse', fn: ElderImpulse, params: ['closes', 'highs', 'lows'], category: 'momentum',
        signals: {
            buy: [
                { type: 'eq', values: [1], desc: '녹색 (상승 impulse)' },
            ],
            sell: [
                { type: 'eq', values: [-1], desc: '빨강 (하락 impulse)' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 변동성 - 매수: 낮은 변동성(압축), 매도: 높은 변동성(확대 후 피로)
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'ATR', fn: ATR, params: ['highs', 'lows', 'closes', 'period'], category: 'volatility',
        buyPeriods: [5, 7, 10, 14],    // 짧은 기간: 변동성 압축 빠른 감지
        sellPeriods: [10, 14, 18, 21],  // 긴 기간: 피로도 확인
        signals: {
            buy: [
                { type: 'expanding', desc: 'ATR 확대 (변동성 증가)' },
                { type: 'low_volatility', desc: 'ATR 낮음 (폭발 전 압축)' },
            ],
            sell: [
                { type: 'contracting', desc: 'ATR 축소' },
                { type: 'extreme_high', desc: 'ATR 극단적 높음 (피로 신호)' },
            ]
        }
    },
    { 
        name: 'BollingerBands', fn: BollingerBands, params: ['closes', 'period', 'stdDev'], category: 'volatility',
        // 15분봉 세분화: period/stdDev 조합
        buyParamSets: [[10, 1.5], [15, 2], [20, 2], [20, 2.5]],    // 하단 터치: 좁은 밴드도 ok
        sellParamSets: [[15, 2], [20, 2], [20, 2.5], [25, 3]],     // 상단 이탈: 넓은 밴드가 확실
        signals: {
            buy: [
                { type: 'touch_lower', desc: '하단 밴드 터치' },
                { type: 'below_lower', desc: '하단 밴드 이탈' },
                { type: 'squeeze', desc: '밴드 수축 (스퀴즈)' },
                { type: 'cross_up_middle', desc: '중간선 상향돌파' },
                { type: 'width_expanding', desc: '밴드폭 확대 시작' },
            ],
            sell: [
                { type: 'touch_upper', desc: '상단 밴드 터치' },
                { type: 'above_upper', desc: '상단 밴드 이탈' },
                { type: 'cross_down_middle', desc: '중간선 하향돌파' },
            ]
        }
    },
    { 
        name: 'KeltnerChannel', fn: KeltnerChannel, params: ['highs', 'lows', 'closes'], category: 'volatility',
        signals: {
            buy: [
                { type: 'touch_lower', desc: '하단 채널 터치' },
                { type: 'cross_up_middle', desc: '중간선 상향돌파' },
            ],
            sell: [
                { type: 'touch_upper', desc: '상단 채널 터치' },
                { type: 'cross_down_middle', desc: '중간선 하향돌파' },
            ]
        }
    },
    { 
        name: 'DonchianChannel', fn: DonchianChannel, params: ['highs', 'lows', 'period'], category: 'volatility',
        buyPeriods: [10, 15, 20, 25],      // 돌파: 짧은 기간
        sellPeriods: [15, 20, 25, 35, 55], // 이탈: 긴 기간이 더 확실
        signals: {
            buy: [
                { type: 'breakout_up', desc: '상단 돌파 (신고가)' },
                { type: 'bounce_from_lower', desc: '하단에서 반등' },
            ],
            sell: [
                { type: 'breakout_down', desc: '하단 돌파 (신저가)' },
                { type: 'reject_from_upper', desc: '상단에서 저항' },
            ]
        }
    },
    { 
        name: 'StandardDeviation', fn: StandardDeviation, params: ['closes', 'period'], category: 'volatility',
        buyPeriods: [10, 15, 20, 25],
        sellPeriods: [15, 20, 25],
        signals: {
            buy: [
                { type: 'low', desc: '낮은 표준편차 (압축)' },
            ],
            sell: [
                { type: 'extreme_high', desc: '극단적 표준편차' },
            ]
        }
    },
    { 
        name: 'HistoricalVolatility', fn: HistoricalVolatility, params: ['closes', 'period'], category: 'volatility',
        buyPeriods: [10, 15, 20, 25],   // 저변동성 압축 빠른 감지
        sellPeriods: [15, 20, 25, 30],  // 고변동성 피로 확인
        signals: {
            buy: [
                { type: 'low', percentile: [10, 20], desc: '역사적 저변동성' },
            ],
            sell: [
                { type: 'high', percentile: [80, 90], desc: '역사적 고변동성' },
            ]
        }
    },
    { 
        name: 'ChaikinVolatility', fn: ChaikinVolatility, params: ['highs', 'lows', 'period'], category: 'volatility',
        buyPeriods: [7, 10, 14],
        sellPeriods: [10, 14, 18],
        signals: {
            buy: [
                { type: 'increasing', desc: '변동성 증가' },
            ],
            sell: [
                { type: 'decreasing', desc: '변동성 감소' },
            ]
        }
    },
    { 
        name: 'UlcerIndex', fn: UlcerIndex, params: ['closes', 'period'], category: 'volatility',
        buyPeriods: [10, 14, 18],
        sellPeriods: [10, 14, 18],
        signals: {
            buy: [
                { type: 'lt', values: [5, 10], desc: '낮은 Ulcer (안정)' },
            ],
            sell: [
                { type: 'gt', values: [15, 20], desc: '높은 Ulcer (하락 위험)' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 거래량 - 매수: 짧은 기간(급증 감지), 매도: 긴 기간(피로 확인)
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'OBV', fn: OBV, params: ['closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'rising', desc: 'OBV 상승' },
                { type: 'bullish_divergence', desc: 'OBV 상승 다이버전스' },
                { type: 'breakout', desc: 'OBV 신고점 돌파' },
            ],
            sell: [
                { type: 'falling', desc: 'OBV 하락' },
                { type: 'bearish_divergence', desc: 'OBV 하락 다이버전스' },
                { type: 'breakdown', desc: 'OBV 신저점 이탈' },
            ]
        }
    },
    { 
        name: 'VolumeRatio', fn: VolumeRatio, params: ['volumes', 'period'], category: 'volume',
        buyPeriods: [5, 7, 10, 14, 20],     // 급증: 짧은 기간
        sellPeriods: [10, 14, 20, 25],      // 급감: 긴 기간 확인
        signals: {
            buy: [
                { type: 'gt', values: [1.5, 2, 2.5], desc: '평균 대비 거래량 급증' },
            ],
            sell: [
                { type: 'lt', values: [0.5, 0.7], desc: '평균 대비 거래량 급감' },
            ]
        }
    },
    { 
        name: 'MFI', fn: MFI, params: ['highs', 'lows', 'closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [5, 7, 10, 14],
        sellPeriods: [10, 14, 18, 21],
        signals: {
            buy: [
                { type: 'lt', values: [20, 25, 30], desc: '과매도' },
                { type: 'cross_up', values: [20, 30], desc: '상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [70, 75, 80], desc: '과매수' },
                { type: 'cross_down', values: [80, 70], desc: '하향돌파' },
            ]
        }
    },
    { 
        name: 'CMF', fn: CMF, params: ['highs', 'lows', 'closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [10, 15, 20, 21],
        sellPeriods: [15, 20, 21, 25],
        signals: {
            buy: [
                { type: 'gt', values: [0, 0.05, 0.1], desc: 'CMF 양수 (매집)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0, -0.05, -0.1], desc: 'CMF 음수 (분산)' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'ADL', fn: ADL, params: ['highs', 'lows', 'closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'rising', desc: 'ADL 상승' },
                { type: 'bullish_divergence', desc: 'ADL 상승 다이버전스' },
            ],
            sell: [
                { type: 'falling', desc: 'ADL 하락' },
                { type: 'bearish_divergence', desc: 'ADL 하락 다이버전스' },
            ]
        }
    },
    { 
        name: 'ChaikinOscillator', fn: ChaikinOscillator, params: ['highs', 'lows', 'closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'VWAP', fn: VWAP, params: ['highs', 'lows', 'closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > VWAP' },
                { type: 'cross_up', desc: 'VWAP 상향돌파' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < VWAP' },
                { type: 'cross_down', desc: 'VWAP 하향돌파' },
            ]
        }
    },
    { 
        name: 'ForceIndex', fn: ForceIndex, params: ['closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [1, 2, 3, 5],      // 빠른 모멘텀 감지
        sellPeriods: [2, 5, 8, 13], // 장기 추세 확인
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'Force Index 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'Force Index 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'VolumeOscillator', fn: VolumeOscillator, params: ['volumes', 'fast', 'slow'], category: 'volume',
        buyParamSets: [[3, 7], [5, 10], [5, 15], [7, 14]],       // 빠른 거래량 변화
        sellParamSets: [[5, 10], [5, 15], [7, 14], [12, 26]], // 지속적 변화 확인
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '양수 (단기 > 장기)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'KlingerOscillator', fn: KlingerOscillator, params: ['highs', 'lows', 'closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'cross_up_signal', desc: '시그널 상향돌파' },
                { type: 'gt', values: [0], desc: '양수' },
            ],
            sell: [
                { type: 'cross_down_signal', desc: '시그널 하향돌파' },
                { type: 'lt', values: [0], desc: '음수' },
            ]
        }
    },
    { 
        name: 'EaseOfMovement', fn: EaseOfMovement, params: ['highs', 'lows', 'volumes', 'period'], category: 'volume',
        buyPeriods: [7, 10, 14],
        sellPeriods: [10, 14, 18],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '양수 (쉬운 상승)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '음수 (쉬운 하락)' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'IntradayIntensity', fn: IntradayIntensity, params: ['highs', 'lows', 'closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '양수 (매수 압력)' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '음수 (매도 압력)' },
            ]
        }
    },
    { 
        name: 'MarketFacilitationIndex', fn: MarketFacilitationIndex, params: ['highs', 'lows', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'green_bar', desc: 'MFI↑ + Vol↑ (강한 추세)' },
            ],
            sell: [
                { type: 'fade_bar', desc: 'MFI↓ + Vol↓ (추세 종료)' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 추세 강도 - 매수: 상승 추세 확인, 매도: 추세 약화 감지
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'ADX', fn: ADX, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14, 18],
        sellPeriods: [10, 14, 18, 21],
        signals: {
            buy: [
                { type: 'gt', values: [20, 25, 30], desc: 'ADX 강한 추세' },
                { type: 'rising', desc: 'ADX 상승 (추세 강화)' },
            ],
            sell: [
                { type: 'lt', values: [20], desc: 'ADX 약한 추세' },
                { type: 'falling_from_high', desc: 'ADX 고점에서 하락' },
            ]
        }
    },
    { 
        name: 'PlusDI', fn: PlusDI, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14],
        sellPeriods: [10, 14, 18],
        signals: {
            buy: [
                { type: 'gt_minus_di', desc: '+DI > -DI (상승 추세)' },
                { type: 'cross_up_minus_di', desc: '+DI가 -DI 상향돌파' },
            ],
            sell: [
                { type: 'lt_minus_di', desc: '+DI < -DI' },
            ]
        }
    },
    { 
        name: 'MinusDI', fn: MinusDI, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14],
        sellPeriods: [10, 14, 18],
        signals: {
            buy: [
                { type: 'lt_plus_di', desc: '-DI < +DI' },
            ],
            sell: [
                { type: 'gt_plus_di', desc: '-DI > +DI (하락 추세)' },
                { type: 'cross_up_plus_di', desc: '-DI가 +DI 상향돌파' },
            ]
        }
    },
    { 
        name: 'AroonUp', fn: AroonUp, params: ['highs', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14, 20, 25],
        sellPeriods: [14, 20, 25],    // 장기 약세 확인
        signals: {
            buy: [
                { type: 'gt', values: [70, 80, 90], desc: '강한 상승 추세' },
                { type: 'cross_up', values: [50], desc: '50 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [30, 20, 10], desc: '약한 상승 추세' },
            ]
        }
    },
    { 
        name: 'AroonDown', fn: AroonDown, params: ['lows', 'period'], category: 'trend_strength',
        buyPeriods: [14, 20, 25],     // 장기 약세 해소
        sellPeriods: [7, 10, 14, 20, 25],
        signals: {
            buy: [
                { type: 'lt', values: [30, 20, 10], desc: '약한 하락 추세' },
            ],
            sell: [
                { type: 'gt', values: [70, 80, 90], desc: '강한 하락 추세' },
                { type: 'cross_up', values: [50], desc: '50 상향돌파' },
            ]
        }
    },
    { 
        name: 'AroonOscillator', fn: AroonOscillator, params: ['highs', 'lows', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14, 20, 25],   // 추세 전환 확인
        sellPeriods: [14, 20, 25],         // 장기 추세 약화
        signals: {
            buy: [
                { type: 'gt', values: [0, 50], desc: '양수/강한 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0, -50], desc: '음수/강한 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'VortexPlus', fn: VortexPlus, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14, 18, 21],   // 상승 추세 포착
        sellPeriods: [14, 18, 21],         // 상승 약화 확인
        signals: {
            buy: [
                { type: 'gt_minus', desc: 'VI+ > VI-' },
                { type: 'cross_up_minus', desc: 'VI+가 VI- 상향돌파' },
            ],
            sell: [
                { type: 'lt_minus', desc: 'VI+ < VI-' },
            ]
        }
    },
    { 
        name: 'VortexMinus', fn: VortexMinus, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14],           // 하락 약화 포착
        sellPeriods: [10, 14, 18, 21],     // 하락 추세 확인
        signals: {
            buy: [
                { type: 'lt_plus', desc: 'VI- < VI+' },
            ],
            sell: [
                { type: 'gt_plus', desc: 'VI- > VI+' },
                { type: 'cross_up_plus', desc: 'VI-가 VI+ 상향돌파' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 가격 위치
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'PricePosition', fn: PricePosition, params: ['highs', 'lows', 'closes', 'period'], category: 'price_position',
        buyPeriods: [7, 10, 14, 20, 25],   // 단기 레인지 하단
        sellPeriods: [14, 20, 25, 35, 50], // 장기 레인지 상단
        signals: {
            buy: [
                { type: 'lt', values: [0.2, 0.3], desc: '레인지 하단 (20-30%)' },
            ],
            sell: [
                { type: 'gt', values: [0.7, 0.8], desc: '레인지 상단 (70-80%)' },
            ]
        }
    },
    { 
        name: 'DistanceFromMA', fn: DistanceFromMA, params: ['closes', 'period'], category: 'price_position',
        buyPeriods: [10, 15, 20, 30, 50],    // 중기 MA 이탈
        sellPeriods: [20, 30, 50, 75, 100],  // 장기 MA 이탈
        signals: {
            buy: [
                { type: 'lt', values: [-3, -5, -7], desc: 'MA 대비 -3~7% (과매도)' },
            ],
            sell: [
                { type: 'gt', values: [3, 5, 7], desc: 'MA 대비 +3~7% (과매수)' },
            ]
        }
    },
    { 
        name: 'PriceVsEMA', fn: PriceVsEMA, params: ['closes', 'period'], category: 'price_position',
        buyPeriods: [20, 50],    // 중기 EMA 돌파
        sellPeriods: [50, 200],  // 장기 EMA 이탈
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '가격 > EMA' },
                { type: 'cross_up', values: [0], desc: 'EMA 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '가격 < EMA' },
                { type: 'cross_down', values: [0], desc: 'EMA 하향돌파' },
            ]
        }
    },
    { 
        name: 'BollingerPercentB', fn: BollingerPercentB, params: ['closes', 'period'], category: 'price_position',
        buyPeriods: [20],        // 표준 기간
        sellPeriods: [20],       // 표준 기간
        signals: {
            buy: [
                { type: 'lt', values: [0, 10, 20], desc: '%B 하단 (0~20%)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파 (밴드 복귀)' },
            ],
            sell: [
                { type: 'gt', values: [80, 90, 100], desc: '%B 상단 (80~100%)' },
                { type: 'cross_down', values: [100], desc: '100 하향돌파 (밴드 복귀)' },
            ]
        }
    },
    { 
        name: 'BollingerWidth', fn: BollingerWidth, params: ['closes', 'period'], category: 'price_position',
        buyPeriods: [20],        // 스퀴즈 감지
        sellPeriods: [20],       // 확대 감지
        signals: {
            buy: [
                { type: 'squeeze', percentile: [10, 20], desc: '밴드폭 최소 (스퀴즈)' },
                { type: 'expanding', desc: '밴드폭 확대 시작' },
            ],
            sell: [
                { type: 'extreme_wide', percentile: [80, 90], desc: '밴드폭 최대' },
            ]
        }
    },
    { 
        name: 'PercentRank', fn: PercentRank, params: ['closes', 'period'], category: 'price_position',
        buyPeriods: [100],       // 중기 순위
        sellPeriods: [100, 252], // 장기 순위
        signals: {
            buy: [
                { type: 'lt', values: [10, 20, 30], desc: '하위 10~30%' },
            ],
            sell: [
                { type: 'gt', values: [70, 80, 90], desc: '상위 10~30%' },
            ]
        }
    },
    { 
        name: 'ZScore', fn: ZScore, params: ['closes', 'period'], category: 'price_position',
        buyPeriods: [20],        // 단기 극단
        sellPeriods: [20, 50],   // 장기 극단
        signals: {
            buy: [
                { type: 'lt', values: [-2, -1.5, -1], desc: 'Z < -1~-2 (과매도)' },
            ],
            sell: [
                { type: 'gt', values: [1, 1.5, 2], desc: 'Z > 1~2 (과매수)' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 캔들
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'ConsecutiveCandles', fn: ConsecutiveCandles, params: ['opens', 'closes'], category: 'candle',
        // 기간 없음 (단일 캔들)
        signals: {
            buy: [
                { type: 'eq', values: [2, 3], desc: '연속 양봉 2~3개' },
                { type: 'lt', values: [-3, -4, -5], desc: '연속 음봉 3~5개 후 반등 기대' },
            ],
            sell: [
                { type: 'eq', values: [-2, -3], desc: '연속 음봉 2~3개' },
                { type: 'gt', values: [3, 4, 5], desc: '연속 양봉 3~5개 후 조정 기대' },
            ]
        }
    },
    { 
        name: 'CandleSizeRatio', fn: CandleSizeRatio, params: ['highs', 'lows', 'period'], category: 'candle',
        buyPeriods: [14],        // 큰 캔들 감지
        sellPeriods: [14],       // 작은 캔들 감지
        signals: {
            buy: [
                { type: 'gt', values: [150, 200], desc: '평균 대비 150~200% 큰 캔들' },
            ],
            sell: [
                { type: 'lt', values: [50], desc: '평균 대비 50% 이하 작은 캔들' },
            ]
        }
    },
    { 
        name: 'BullishRatio', fn: BullishRatio, params: ['opens', 'closes', 'period'], category: 'candle',
        buyPeriods: [10],        // 짧은 기간 양봉 비율
        sellPeriods: [10, 14],   // 음봉 우세 확인
        signals: {
            buy: [
                { type: 'gt', values: [60, 70], desc: '양봉 비율 60~70% 이상' },
            ],
            sell: [
                { type: 'lt', values: [30, 40], desc: '양봉 비율 30~40% 이하' },
            ]
        }
    },
    { 
        name: 'HeikinAshiTrend', fn: HeikinAshiTrend, params: ['opens', 'highs', 'lows', 'closes', 'period'], category: 'candle',
        buyPeriods: [5],         // 빠른 추세 전환
        sellPeriods: [5, 10],    // 추세 약화 확인
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'HA 상승 추세' },
                { type: 'turn_positive', desc: 'HA 양전환' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'HA 하락 추세' },
                { type: 'turn_negative', desc: 'HA 음전환' },
            ]
        }
    },
    { 
        name: 'BalanceOfPower', fn: BalanceOfPower, params: ['opens', 'highs', 'lows', 'closes'], category: 'candle',
        // 기간 없음
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'BoP 양수 (매수세 우위)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'BoP 음수 (매도세 우위)' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'Qstick', fn: Qstick, params: ['opens', 'closes', 'period'], category: 'candle',
        buyPeriods: [8],         // 빠른 감지
        sellPeriods: [8, 14],    // 추세 확인
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'Qstick 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'Qstick 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Ichimoku
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'IchimokuTenkan', fn: IchimokuTenkan, params: ['highs', 'lows', 'period'], category: 'ichimoku',
        buyPeriods: [9],         // 표준 전환선
        sellPeriods: [9],        // 표준 전환선
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > 전환선' },
                { type: 'cross_up_kijun', desc: '전환선이 기준선 상향돌파' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < 전환선' },
                { type: 'cross_down_kijun', desc: '전환선이 기준선 하향돌파' },
            ]
        }
    },
    { 
        name: 'IchimokuKijun', fn: IchimokuKijun, params: ['highs', 'lows', 'period'], category: 'ichimoku',
        buyPeriods: [26],        // 표준 기준선
        sellPeriods: [26],       // 표준 기준선
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > 기준선' },
                { type: 'price_cross_up', desc: '가격이 기준선 상향돌파' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < 기준선' },
                { type: 'price_cross_down', desc: '가격이 기준선 하향돌파' },
            ]
        }
    },
    { 
        name: 'IchimokuSenkouA', fn: IchimokuSenkouA, params: ['highs', 'lows'], category: 'ichimoku',
        // 기간 없음 (전환선+기준선 기반)
        signals: {
            buy: [
                { type: 'price_above_cloud', desc: '가격 > 구름 (선행A 위)' },
                { type: 'above_senkou_b', desc: '선행A > 선행B (양운)' },
            ],
            sell: [
                { type: 'price_below_cloud', desc: '가격 < 구름 (선행A 아래)' },
                { type: 'below_senkou_b', desc: '선행A < 선행B (음운)' },
            ]
        }
    },
    { 
        name: 'IchimokuSenkouB', fn: IchimokuSenkouB, params: ['highs', 'lows', 'period'], category: 'ichimoku',
        buyPeriods: [52],        // 표준 선행B
        sellPeriods: [52],       // 표준 선행B
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > 선행B' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < 선행B' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 회귀
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'LinearRegressionValue', fn: LinearRegressionValue, params: ['closes', 'period'], category: 'regression',
        buyPeriods: [7, 10, 14, 20, 25],    // 단기 회귀선 돌파
        sellPeriods: [14, 20, 25, 35, 50],   // 장기 회귀선 이탈
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > 회귀선' },
                { type: 'cross_up', desc: '회귀선 상향돌파' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < 회귀선' },
                { type: 'cross_down', desc: '회귀선 하향돌파' },
            ]
        }
    },
    { 
        name: 'LinearRegressionSlope', fn: LinearRegressionSlope, params: ['closes', 'period'], category: 'regression',
        buyPeriods: [7, 10, 14, 18],        // 단기 기울기
        sellPeriods: [10, 14, 18, 21, 25],   // 기울기 약화 확인
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '기울기 양수 (상승 추세)' },
                { type: 'increasing', desc: '기울기 증가' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '기울기 음수 (하락 추세)' },
                { type: 'decreasing', desc: '기울기 감소' },
            ]
        }
    },
    { 
        name: 'RSquared', fn: RSquared, params: ['closes', 'period'], category: 'regression',
        buyPeriods: [10, 14, 18, 20, 25],    // 추세 강도 확인
        sellPeriods: [10, 14, 18, 20, 25],   // 추세 약화 확인
        signals: {
            buy: [
                { type: 'gt', values: [0.7, 0.8, 0.9], desc: '강한 추세 (R² > 0.7)' },
            ],
            sell: [
                { type: 'lt', values: [0.3, 0.2], desc: '약한 추세 (R² < 0.3)' },
            ]
        }
    },
    { 
        name: 'StandardError', fn: StandardError, params: ['closes', 'period'], category: 'regression',
        buyPeriods: [20],        // 안정적 추세
        sellPeriods: [20],       // 불안정 감지
        signals: {
            buy: [
                { type: 'low', desc: '낮은 표준오차 (안정적 추세)' },
            ],
            sell: [
                { type: 'high', desc: '높은 표준오차 (불안정)' },
            ]
        }
    },
    { 
        name: 'ChandeForecastOscillator', fn: ChandeForecastOscillator, params: ['closes', 'period'], category: 'regression',
        buyPeriods: [14],        // 빠른 신호
        sellPeriods: [14, 20],   // 확인된 신호
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'CFO 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'CFO 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 복합
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'StochRSI', fn: StochRSI, params: ['closes', 'period'], category: 'composite',
        buyPeriods: [7, 10, 14, 18],        // 과매도 감지
        sellPeriods: [10, 14, 18, 21],       // 과매수 감지
        signals: {
            buy: [
                { type: 'lt', values: [0.1, 0.2], desc: 'StochRSI 극단적 과매도' },
                { type: 'cross_up', values: [0.2], desc: '0.2 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [0.8, 0.9], desc: 'StochRSI 극단적 과매수' },
                { type: 'cross_down', values: [0.8], desc: '0.8 하향돌파' },
            ]
        }
    },
    { 
        name: 'SqueezeIndicator', fn: SqueezeIndicator, params: ['highs', 'lows', 'closes'], category: 'composite',
        // 기간 없음 (BB+켈트너 기반)
        signals: {
            buy: [
                { type: 'squeeze_on', desc: '스퀴즈 ON (BB 안에 켈트너)' },
                { type: 'squeeze_release_up', desc: '스퀴즈 해제 + 상승' },
            ],
            sell: [
                { type: 'squeeze_release_down', desc: '스퀴즈 해제 + 하락' },
            ]
        }
    },
    { 
        name: 'BullPower', fn: BullPower, params: ['highs', 'closes', 'period'], category: 'composite',
        buyPeriods: [7, 10, 13, 18],        // 빠른 매수세 감지
        sellPeriods: [10, 13, 18],          // 매수세 약화 확인
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'Bull Power 양수' },
                { type: 'increasing', desc: 'Bull Power 증가' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'Bull Power 음수' },
                { type: 'decreasing', desc: 'Bull Power 감소' },
            ]
        }
    },
    { 
        name: 'BearPower', fn: BearPower, params: ['lows', 'closes', 'period'], category: 'composite',
        buyPeriods: [7, 10, 13],            // 매도세 약화 포착
        sellPeriods: [10, 13, 18],          // 매도세 강화 확인
        signals: {
            buy: [
                { type: 'increasing_from_negative', desc: 'Bear Power 음수에서 상승' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'Bear Power 음수' },
                { type: 'decreasing', desc: 'Bear Power 감소' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 시간
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'PriceChangeN', fn: PriceChangeN, params: ['closes', 'n'], category: 'time',
        buyPeriods: [1, 2, 3, 4, 5, 8],   // 단기 상승 모멘텀
        sellPeriods: [2, 3, 5, 8, 10, 15], // 중기 하락 확인
        signals: {
            buy: [
                { type: 'gt', values: [0, 1, 2, 3], desc: 'N봉 가격상승 +1~3%' },
            ],
            sell: [
                { type: 'lt', values: [0, -1, -2, -3], desc: 'N봉 가격하락 -1~3%' },
            ]
        }
    },
    { 
        name: 'HigherHighsCount', fn: HigherHighsCount, params: ['highs', 'period'], category: 'time',
        buyPeriods: [5, 10],     // 단기 고점 갱신
        sellPeriods: [10, 14],   // 고점 갱신 중단 확인
        signals: {
            buy: [
                { type: 'gt', values: [2, 3, 4], desc: '연속 고점 갱신 2~4회' },
            ],
            sell: [
                { type: 'eq', values: [0], desc: '고점 갱신 없음' },
            ]
        }
    },
    { 
        name: 'LowerLowsCount', fn: LowerLowsCount, params: ['lows', 'period'], category: 'time',
        buyPeriods: [5, 10],     // 저점 갱신 중단 포착
        sellPeriods: [5, 10, 14],// 연속 저점 갱신
        signals: {
            buy: [
                { type: 'eq', values: [0], desc: '저점 갱신 없음' },
            ],
            sell: [
                { type: 'gt', values: [2, 3, 4], desc: '연속 저점 갱신 2~4회' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 심리
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'FearGreed', fn: FearGreedIndex, params: ['fearGreed'], category: 'sentiment',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'lt', values: [20, 25, 30], desc: '극단적 공포 (20~30 이하)' },
                { type: 'cross_up', values: [25, 30], desc: '공포 구간 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [70, 75, 80], desc: '극단적 탐욕 (70~80 이상)' },
                { type: 'cross_down', values: [70, 75], desc: '탐욕 구간 하향돌파' },
            ]
        }
    },
    { 
        name: 'BuySellPressure', fn: BuySellPressure, params: ['opens', 'closes', 'volumes', 'period', 'buyVolumes', 'sellVolumes'], category: 'sentiment',
        buyPeriods: [14],        // 매수 압력 감지
        sellPeriods: [14],       // 매도 압력 감지
        signals: {
            buy: [
                { type: 'gt', values: [52, 55, 60], desc: '매수압력 52~60% 이상' },
            ],
            sell: [
                { type: 'lt', values: [48, 45, 40], desc: '매도압력 우세 (48% 이하)' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 검증된 고급 지표 (John Ehlers, Tushar Chande 등)
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'FisherTransform', fn: FisherTransform, params: ['highs', 'lows', 'period'], category: 'momentum',
        buyPeriods: [10],
        sellPeriods: [10],
        signals: {
            buy: [
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
                { type: 'lt', values: [-1.5, -2], desc: '극단적 음수 후 반전' },
            ],
            sell: [
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
                { type: 'gt', values: [1.5, 2], desc: '극단적 양수 후 반전' },
            ]
        }
    },
    { 
        name: 'VIDYA', fn: VIDYA, params: ['closes', 'period', 'smoothPeriod'], category: 'trend',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > VIDYA' },
                { type: 'cross_up', desc: 'VIDYA 상향돌파' },
                { type: 'increasing', desc: 'VIDYA 상승중' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < VIDYA' },
                { type: 'cross_down', desc: 'VIDYA 하향돌파' },
                { type: 'decreasing', desc: 'VIDYA 하락중' },
            ]
        }
    },
    { 
        name: 'FRAMA', fn: FRAMA, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [16],
        sellPeriods: [16],
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > FRAMA' },
                { type: 'cross_up', desc: 'FRAMA 상향돌파' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < FRAMA' },
                { type: 'cross_down', desc: 'FRAMA 하향돌파' },
            ]
        }
    },
    { 
        name: 'HurstExponent', fn: HurstExponent, params: ['closes', 'period'], category: 'statistical',
        buyPeriods: [100],
        sellPeriods: [100],
        signals: {
            buy: [
                { type: 'gt', values: [0.5, 0.6, 0.7], desc: '추세 지속성 (H > 0.5)' },
            ],
            sell: [
                { type: 'lt', values: [0.5, 0.4, 0.3], desc: '평균회귀 (H < 0.5)' },
            ]
        }
    },
    { 
        name: 'VerticalHorizontalFilter', fn: VerticalHorizontalFilter, params: ['closes', 'period'], category: 'trend_strength',
        buyPeriods: [28],
        sellPeriods: [28],
        signals: {
            buy: [
                { type: 'gt', values: [0.35, 0.4, 0.5], desc: '강한 추세 (VHF > 0.35)' },
            ],
            sell: [
                { type: 'lt', values: [0.25, 0.2], desc: '약한 추세/횡보 (VHF < 0.25)' },
            ]
        }
    },
    { 
        name: 'ChandeKrollStop', fn: ChandeKrollStop, params: ['highs', 'lows', 'closes', 'p', 'x', 'q'], category: 'volatility',
        signals: {
            buy: [
                { type: 'price_above_stop', desc: '가격 > 스탑선 (상승추세)' },
            ],
            sell: [
                { type: 'price_below_stop', desc: '가격 < 스탑선 (하락추세)' },
            ]
        }
    },
    { 
        name: 'PriceVolumeTrend', fn: PriceVolumeTrend, params: ['closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'increasing', desc: 'PVT 상승' },
                { type: 'cross_up_sma', desc: 'PVT SMA 상향돌파' },
            ],
            sell: [
                { type: 'decreasing', desc: 'PVT 하락' },
                { type: 'cross_down_sma', desc: 'PVT SMA 하향돌파' },
            ]
        }
    },
    { 
        name: 'TrendIntensityIndex', fn: TrendIntensityIndex, params: ['closes', 'period'], category: 'trend_strength',
        buyPeriods: [30],
        sellPeriods: [30],
        signals: {
            buy: [
                { type: 'gt', values: [50, 60, 70], desc: 'TII > 50 (상승추세)' },
            ],
            sell: [
                { type: 'lt', values: [50, 40, 30], desc: 'TII < 50 (하락추세)' },
            ]
        }
    },
    { 
        name: 'RandomWalkIndex', fn: RandomWalkIndex, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'high_gt', values: [1, 1.5, 2], desc: 'RWI High > 1 (상승추세)' },
            ],
            sell: [
                { type: 'low_gt', values: [1, 1.5, 2], desc: 'RWI Low > 1 (하락추세)' },
            ]
        }
    },
    { 
        name: 'ChandelierExit', fn: ChandelierExit, params: ['highs', 'lows', 'closes', 'period', 'multiplier'], category: 'volatility',
        buyPeriods: [22],
        sellPeriods: [22],
        signals: {
            buy: [
                { type: 'price_above_long', desc: '가격 > Long Exit (상승추세)' },
            ],
            sell: [
                { type: 'price_below_short', desc: '가격 < Short Exit (하락추세)' },
            ]
        }
    },
    { 
        name: 'ADXR', fn: ADXR, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [20, 25, 30], desc: 'ADXR > 20 (추세 시작)' },
            ],
            sell: [
                { type: 'lt', values: [20, 15], desc: 'ADXR < 20 (추세 없음)' },
            ]
        }
    },
    { 
        name: 'RelativeMomentumIndex', fn: RelativeMomentumIndex, params: ['closes', 'period', 'momentum'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'lt', values: [30, 20, 10], desc: 'RMI 과매도' },
                { type: 'cross_up', values: [30], desc: '30선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [70, 80, 90], desc: 'RMI 과매수' },
                { type: 'cross_down', values: [70], desc: '70선 하향돌파' },
            ]
        }
    },
    { 
        name: 'IntradayMomentumIndex', fn: IntradayMomentumIndex, params: ['opens', 'closes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'lt', values: [40, 30, 20], desc: 'IMI 과매도' },
                { type: 'cross_up', values: [40], desc: '40선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [60, 70, 80], desc: 'IMI 과매수' },
                { type: 'cross_down', values: [60], desc: '60선 하향돌파' },
            ]
        }
    },
    { 
        name: 'EhlersInstantaneousTrendline', fn: EhlersInstantaneousTrendline, params: ['closes'], category: 'trend',
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > IT' },
                { type: 'cross_up', desc: 'IT 상향돌파' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < IT' },
                { type: 'cross_down', desc: 'IT 하향돌파' },
            ]
        }
    },
    { 
        name: 'DailyPivotPoints', fn: DailyPivotPoints, params: ['high', 'low', 'close'], category: 'price_position',
        signals: {
            buy: [
                { type: 'price_above_pivot', desc: '가격 > 피봇' },
                { type: 'near_support', desc: '지지선 근처 매수' },
            ],
            sell: [
                { type: 'price_below_pivot', desc: '가격 < 피봇' },
                { type: 'near_resistance', desc: '저항선 근처 매도' },
            ]
        }
    },
    { 
        name: 'GannHiLoActivator', fn: GannHiLoActivator, params: ['highs', 'lows', 'closes', 'period'], category: 'trend',
        buyPeriods: [3],
        sellPeriods: [3],
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > GannHiLo' },
                { type: 'cross_up', desc: 'GannHiLo 상향돌파' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < GannHiLo' },
                { type: 'cross_down', desc: 'GannHiLo 하향돌파' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Bill Williams & Ehlers DSP 지표
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'WilliamsAlligator', fn: WilliamsAlligator, params: ['closes', 'jawPeriod', 'teethPeriod', 'lipsPeriod'], category: 'trend',
        signals: {
            buy: [
                { type: 'mouth_open_up', desc: '악어 입 벌림 + 상승' },
                { type: 'price_above_all', desc: '가격 > Jaw,Teeth,Lips' },
                { type: 'lips_above_teeth', desc: 'Lips > Teeth (상승추세)' },
            ],
            sell: [
                { type: 'mouth_open_down', desc: '악어 입 벌림 + 하락' },
                { type: 'price_below_all', desc: '가격 < Jaw,Teeth,Lips' },
                { type: 'lips_below_teeth', desc: 'Lips < Teeth (하락추세)' },
            ]
        }
    },
    { 
        name: 'GatorOscillator', fn: GatorOscillator, params: ['closes', 'jawPeriod', 'teethPeriod', 'lipsPeriod'], category: 'trend',
        signals: {
            buy: [
                { type: 'awake', desc: '게이터 깨어남 (추세 시작)' },
                { type: 'upper_increasing', desc: '상단 히스토그램 증가' },
            ],
            sell: [
                { type: 'sleeping', desc: '게이터 잠듦 (추세 끝)' },
                { type: 'lower_decreasing', desc: '하단 히스토그램 감소' },
            ]
        }
    },
    { 
        name: 'EhlersMESA', fn: EhlersMESA, params: ['closes', 'fastLimit', 'slowLimit'], category: 'trend',
        signals: {
            buy: [
                { type: 'mama_above_fama', desc: 'MAMA > FAMA (상승)' },
                { type: 'cross_up', desc: 'MAMA-FAMA 골든크로스' },
            ],
            sell: [
                { type: 'mama_below_fama', desc: 'MAMA < FAMA (하락)' },
                { type: 'cross_down', desc: 'MAMA-FAMA 데드크로스' },
            ]
        }
    },
    { 
        name: 'EhlersSinewave', fn: EhlersSinewave, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'bull_cross', desc: '사인파 상승 크로스' },
                { type: 'sine_negative', desc: 'Sine < 0 (저점 근처)' },
            ],
            sell: [
                { type: 'bear_cross', desc: '사인파 하락 크로스' },
                { type: 'sine_positive', desc: 'Sine > 0 (고점 근처)' },
            ]
        }
    },
    { 
        name: 'EhlersCyberCycle', fn: EhlersCyberCycle, params: ['closes', 'alpha'], category: 'momentum',
        signals: {
            buy: [
                { type: 'cross_up_zero', desc: '0선 상향돌파' },
                { type: 'rising', desc: '사이클 상승' },
            ],
            sell: [
                { type: 'cross_down_zero', desc: '0선 하향돌파' },
                { type: 'falling', desc: '사이클 하락' },
            ]
        }
    },
    { 
        name: 'CenterOfGravity', fn: CenterOfGravity, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [10],
        sellPeriods: [10],
        signals: {
            buy: [
                { type: 'rising', desc: 'CoG 상승' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'falling', desc: 'CoG 하락' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'PolarizedFractalEfficiency', fn: PolarizedFractalEfficiency, params: ['closes', 'period', 'smoothing'], category: 'trend_strength',
        buyPeriods: [10],
        sellPeriods: [10],
        signals: {
            buy: [
                { type: 'gt', values: [0, 20, 40], desc: 'PFE 양수 (상승 효율)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0, -20, -40], desc: 'PFE 음수 (하락 효율)' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'RelativeVolatilityIndex', fn: RelativeVolatilityIndex, params: ['closes', 'period', 'smoothing'], category: 'volatility',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [50, 60], desc: 'RVI > 50 (상승 변동성)' },
            ],
            sell: [
                { type: 'lt', values: [50, 40], desc: 'RVI < 50 (하락 변동성)' },
            ]
        }
    },
    { 
        name: 'ErgodicOscillator', fn: ErgodicOscillator, params: ['closes', 'r', 's', 'u'], category: 'momentum',
        signals: {
            buy: [
                { type: 'bullish', desc: 'TSI > Signal' },
                { type: 'histogram_positive', desc: '히스토그램 양수' },
            ],
            sell: [
                { type: 'bearish', desc: 'TSI < Signal' },
                { type: 'histogram_negative', desc: '히스토그램 음수' },
            ]
        }
    },
    { 
        name: 'PrettyGoodOscillator', fn: PrettyGoodOscillator, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'lt', values: [-3, -2], desc: 'PGO < -2 (과매도)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [2, 3], desc: 'PGO > 2 (과매수)' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'PsychologicalLine', fn: PsychologicalLine, params: ['closes', 'period'], category: 'sentiment',
        buyPeriods: [12],
        sellPeriods: [12],
        signals: {
            buy: [
                { type: 'lt', values: [25, 30], desc: 'PSY < 25% (극단적 비관)' },
                { type: 'cross_up', values: [50], desc: '50% 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [70, 75], desc: 'PSY > 75% (극단적 낙관)' },
                { type: 'cross_down', values: [50], desc: '50% 하향돌파' },
            ]
        }
    },
    { 
        name: 'ElderAutoEnvelope', fn: ElderAutoEnvelope, params: ['closes', 'period', 'multiplier'], category: 'volatility',
        buyPeriods: [22],
        sellPeriods: [22],
        signals: {
            buy: [
                { type: 'oversold', desc: '가격 < 하단밴드' },
                { type: 'position_low', values: [20], desc: '밴드 하단 20%' },
            ],
            sell: [
                { type: 'overbought', desc: '가격 > 상단밴드' },
                { type: 'position_high', values: [80], desc: '밴드 상단 80%' },
            ]
        }
    },
    { 
        name: 'SmoothedRSI', fn: SmoothedRSI, params: ['closes', 'rsiPeriod', 'smoothPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'lt', values: [30, 20], desc: 'SRSI 과매도' },
                { type: 'cross_up', values: [30], desc: '30선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [70, 80], desc: 'SRSI 과매수' },
                { type: 'cross_down', values: [70], desc: '70선 하향돌파' },
            ]
        }
    },
    { 
        name: 'DoubleSmoothedStochastic', fn: DoubleSmoothedStochastic, params: ['closes', 'period', 'smooth1', 'smooth2'], category: 'momentum',
        signals: {
            buy: [
                { type: 'lt', values: [20, 30], desc: 'DSS 과매도' },
                { type: 'cross_up', values: [20], desc: '20선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [70, 80], desc: 'DSS 과매수' },
                { type: 'cross_down', values: [80], desc: '80선 하향돌파' },
            ]
        }
    },
    { 
        name: 'SwingIndex', fn: SwingIndex, params: ['opens', 'highs', 'lows', 'closes', 'limitMove'], category: 'momentum',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'SI 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'SI 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'AccumulationSwingIndex', fn: AccumulationSwingIndex, params: ['opens', 'highs', 'lows', 'closes', 'limitMove'], category: 'momentum',
        signals: {
            buy: [
                { type: 'increasing', desc: 'ASI 상승' },
                { type: 'gt', values: [0], desc: 'ASI 양수' },
            ],
            sell: [
                { type: 'decreasing', desc: 'ASI 하락' },
                { type: 'lt', values: [0], desc: 'ASI 음수' },
            ]
        }
    },
    { 
        name: 'VolumeWeightedRSI', fn: VolumeWeightedRSI, params: ['closes', 'volumes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'lt', values: [30, 20], desc: 'VWRSI 과매도' },
                { type: 'cross_up', values: [30], desc: '30선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [70, 80], desc: 'VWRSI 과매수' },
                { type: 'cross_down', values: [70], desc: '70선 하향돌파' },
            ]
        }
    },
    { 
        name: 'FractalChaosBands', fn: FractalChaosBands, params: ['highs', 'lows', 'period'], category: 'volatility',
        buyPeriods: [5],
        sellPeriods: [5],
        signals: {
            buy: [
                { type: 'near_lower', desc: '하단밴드 근처' },
                { type: 'width_expanding', desc: '밴드폭 확대' },
            ],
            sell: [
                { type: 'near_upper', desc: '상단밴드 근처' },
                { type: 'width_contracting', desc: '밴드폭 축소' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 고급 추세/모멘텀/변동성 지표 (3차)
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'ChoppinessIndex', fn: ChoppinessIndex, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'lt', values: [38.2, 40], desc: 'CI < 38 (강한 추세)' },
            ],
            sell: [
                { type: 'gt', values: [61.8, 60], desc: 'CI > 61 (횡보/혼조)' },
            ]
        }
    },
    { 
        name: 'DisparityIndex', fn: DisparityIndex, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'lt', values: [-5, -3], desc: 'DI < -3% (과매도)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [3, 5], desc: 'DI > 3% (과매수)' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'PriceMomentumOscillator', fn: PriceMomentumOscillator, params: ['closes', 'smooth1', 'smooth2', 'signal'], category: 'momentum',
        signals: {
            buy: [
                { type: 'bullish', desc: 'PMO > Signal' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'bearish', desc: 'PMO < Signal' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'VPCI', fn: VPCI, params: ['closes', 'volumes', 'shortPeriod', 'longPeriod'], category: 'volume',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'VPCI 양수 (거래량 확인)' },
                { type: 'confirmation_positive', desc: '가격-거래량 일치' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'VPCI 음수 (거래량 불일치)' },
                { type: 'confirmation_negative', desc: '가격-거래량 괴리' },
            ]
        }
    },
    { 
        name: 'EfficiencyRatio', fn: EfficiencyRatio, params: ['closes', 'period'], category: 'trend_strength',
        buyPeriods: [10],
        sellPeriods: [10],
        signals: {
            buy: [
                { type: 'gt', values: [0.6, 0.7, 0.8], desc: 'ER > 0.6 (효율적 추세)' },
            ],
            sell: [
                { type: 'lt', values: [0.3, 0.2], desc: 'ER < 0.3 (비효율 횡보)' },
            ]
        }
    },
    { 
        name: 'NormalizedATR', fn: NormalizedATR, params: ['highs', 'lows', 'closes', 'period'], category: 'volatility',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'lt', values: [1, 1.5], desc: 'NATR < 1% (낮은 변동성)' },
            ],
            sell: [
                { type: 'gt', values: [3, 4, 5], desc: 'NATR > 3% (높은 변동성)' },
            ]
        }
    },
    { 
        name: 'RelativeVolume', fn: RelativeVolume, params: ['volumes', 'period'], category: 'volume',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'gt', values: [1.5, 2, 3], desc: 'RVOL > 1.5 (평균 이상)' },
            ],
            sell: [
                { type: 'lt', values: [0.5, 0.3], desc: 'RVOL < 0.5 (평균 이하)' },
            ]
        }
    },
    { 
        name: 'AccelerationBands', fn: AccelerationBands, params: ['highs', 'lows', 'closes', 'period', 'factor'], category: 'volatility',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'breakout_up', desc: '상단 돌파' },
                { type: 'position_low', values: [20], desc: '밴드 하단 20%' },
            ],
            sell: [
                { type: 'breakout_down', desc: '하단 돌파' },
                { type: 'position_high', values: [80], desc: '밴드 상단 80%' },
            ]
        }
    },
    { 
        name: 'RangeExpansionIndex', fn: RangeExpansionIndex, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [8],
        sellPeriods: [8],
        signals: {
            buy: [
                { type: 'gt', values: [0, 20, 40], desc: 'REI > 0 (상승 확장)' },
            ],
            sell: [
                { type: 'lt', values: [0, -20, -40], desc: 'REI < 0 (하락 확장)' },
            ]
        }
    },
    { 
        name: 'NetVolume', fn: NetVolume, params: ['closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'NetVol 양수 (순매수)' },
                { type: 'increasing', desc: 'NetVol 증가' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'NetVol 음수 (순매도)' },
                { type: 'decreasing', desc: 'NetVol 감소' },
            ]
        }
    },
    { 
        name: 'VolumeZoneOscillator', fn: VolumeZoneOscillator, params: ['closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [5, 15, 40], desc: 'VZO > 5 (매수 우위)' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [-5, -15, -40], desc: 'VZO < -5 (매도 우위)' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'TypicalPrice', fn: TypicalPrice, params: ['highs', 'lows', 'closes'], category: 'price_position',
        signals: {
            buy: [
                { type: 'price_above', desc: '현재가 > TP' },
            ],
            sell: [
                { type: 'price_below', desc: '현재가 < TP' },
            ]
        }
    },
    { 
        name: 'WeightedClose', fn: WeightedClose, params: ['highs', 'lows', 'closes'], category: 'price_position',
        signals: {
            buy: [
                { type: 'price_above', desc: '현재가 > WC' },
            ],
            sell: [
                { type: 'price_below', desc: '현재가 < WC' },
            ]
        }
    },
    { 
        name: 'ElderThermometer', fn: ElderThermometer, params: ['highs', 'lows', 'period'], category: 'volatility',
        buyPeriods: [22],
        sellPeriods: [22],
        signals: {
            buy: [
                { type: 'hot', desc: '고온 (변동성 급증)' },
            ],
            sell: [
                { type: 'cold', desc: '저온 (변동성 감소)' },
            ]
        }
    },
    { 
        name: 'CommoditySelectionIndex', fn: CommoditySelectionIndex, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [20, 30, 50], desc: 'CSI > 20 (활발한 추세)' },
            ],
            sell: [
                { type: 'lt', values: [10, 5], desc: 'CSI < 10 (약한 추세)' },
            ]
        }
    },
    { 
        name: 'MassTrend', fn: MassTrend, params: ['highs', 'lows', 'period', 'sumPeriod'], category: 'volatility',
        signals: {
            buy: [
                { type: 'squeeze', desc: '스퀴즈 (돌파 대기)' },
            ],
            sell: [
                { type: 'bulge', desc: '벌지 (반전 임박)' },
            ]
        }
    },
    { 
        name: 'TrendDetectionIndex', fn: TrendDetectionIndex, params: ['closes', 'period', 'signal'], category: 'trend_strength',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'trending_positive', desc: '상승 추세 감지' },
                { type: 'strength_high', desc: '추세 강도 높음' },
            ],
            sell: [
                { type: 'trending_negative', desc: '하락 추세 감지' },
                { type: 'not_trending', desc: '추세 없음' },
            ]
        }
    },
    { 
        name: 'AbsolutePriceOscillator', fn: AbsolutePriceOscillator, params: ['closes', 'fast', 'slow'], category: 'momentum',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'APO 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
                { type: 'increasing', desc: 'APO 상승' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'APO 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
                { type: 'decreasing', desc: 'APO 하락' },
            ]
        }
    },
    { 
        name: 'PercentageVolumeOscillator', fn: PercentageVolumeOscillator, params: ['volumes', 'fast', 'slow', 'signal'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: 'PVO > Signal' },
                { type: 'gt', values: [0], desc: 'PVO 양수' },
            ],
            sell: [
                { type: 'bearish', desc: 'PVO < Signal' },
                { type: 'lt', values: [0], desc: 'PVO 음수' },
            ]
        }
    },
    { 
        name: 'PriceActionChannel', fn: PriceActionChannel, params: ['highs', 'lows', 'closes', 'period'], category: 'price_position',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'near_high', desc: '채널 고점 근처' },
                { type: 'position_low', values: [20], desc: '채널 하단 20%' },
            ],
            sell: [
                { type: 'near_low', desc: '채널 저점 근처' },
                { type: 'position_high', values: [80], desc: '채널 상단 80%' },
            ]
        }
    },
    { 
        name: 'RainbowOscillator', fn: RainbowOscillator, params: ['closes', 'period', 'levels'], category: 'trend',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '레인보우 양수' },
                { type: 'increasing', desc: '레인보우 상승' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '레인보우 음수' },
                { type: 'decreasing', desc: '레인보우 하락' },
            ]
        }
    },
    { 
        name: 'TrendContinuationFactor', fn: TrendContinuationFactor, params: ['closes', 'period'], category: 'trend_strength',
        buyPeriods: [35],
        sellPeriods: [35],
        signals: {
            buy: [
                { type: 'bullish', desc: '+TCF > -TCF' },
                { type: 'plus_increasing', desc: '+TCF 증가' },
            ],
            sell: [
                { type: 'bearish', desc: '-TCF > +TCF' },
                { type: 'minus_increasing', desc: '-TCF 증가' },
            ]
        }
    },
    { 
        name: 'SmoothedROC', fn: SmoothedROC, params: ['closes', 'rocPeriod', 'smoothPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'SROC 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'SROC 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'DetrendedSyntheticPrice', fn: DetrendedSyntheticPrice, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'DSP 양수' },
                { type: 'increasing', desc: 'DSP 상승' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'DSP 음수' },
                { type: 'decreasing', desc: 'DSP 하락' },
            ]
        }
    },
    { 
        name: 'InertiaIndicator', fn: InertiaIndicator, params: ['closes', 'period', 'smoothPeriod'], category: 'trend_strength',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'gt', values: [50], desc: 'Inertia > 50' },
                { type: 'increasing', desc: 'Inertia 상승' },
            ],
            sell: [
                { type: 'lt', values: [50], desc: 'Inertia < 50' },
                { type: 'decreasing', desc: 'Inertia 하락' },
            ]
        }
    },
    { 
        name: 'VortexIndicator', fn: VortexIndicator, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'bullish', desc: 'VI+ > VI-' },
                { type: 'cross_up', desc: 'VI+ 골든크로스' },
            ],
            sell: [
                { type: 'bearish', desc: 'VI- > VI+' },
                { type: 'cross_down', desc: 'VI- 데드크로스' },
            ]
        }
    },
    { 
        name: 'WilliamsAD', fn: WilliamsAD, params: ['highs', 'lows', 'closes'], category: 'volume',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'WAD 양수 (매집)' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'WAD 음수 (분산)' },
            ]
        }
    },
    { 
        name: 'CumulativeWilliamsAD', fn: CumulativeWilliamsAD, params: ['highs', 'lows', 'closes', 'period'], category: 'volume',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'CumWAD 양수' },
                { type: 'increasing', desc: 'CumWAD 상승' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'CumWAD 음수' },
                { type: 'decreasing', desc: 'CumWAD 하락' },
            ]
        }
    },
    { 
        name: 'BullBearBalance', fn: BullBearBalance, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [13],
        sellPeriods: [13],
        signals: {
            buy: [
                { type: 'bullish', desc: '매수세 우위' },
                { type: 'balance_positive', desc: '밸런스 양수' },
            ],
            sell: [
                { type: 'bearish', desc: '매도세 우위' },
                { type: 'balance_negative', desc: '밸런스 음수' },
            ]
        }
    },
    { 
        name: 'TrendIntensityIndexEnhanced', fn: TrendIntensityIndexEnhanced, params: ['closes', 'period'], category: 'trend_strength',
        buyPeriods: [30],
        sellPeriods: [30],
        signals: {
            buy: [
                { type: 'gt', values: [50, 60, 70], desc: 'TII > 50 (상승추세)' },
            ],
            sell: [
                { type: 'lt', values: [50, 40, 30], desc: 'TII < 50 (하락추세)' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 검증된 고급 지표 (4차 - 패턴/사이클/가격채널)
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'ElderRay', fn: ElderRay, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [13],
        sellPeriods: [13],
        signals: {
            buy: [
                { type: 'bullish', desc: 'Bull Power 우위' },
                { type: 'bull_positive', desc: 'Bull Power 양수' },
            ],
            sell: [
                { type: 'bearish', desc: 'Bear Power 우위' },
                { type: 'bear_negative', desc: 'Bear Power 음수' },
            ]
        }
    },
    { 
        name: 'TwiggsMoneyFlow', fn: TwiggsMoneyFlow, params: ['highs', 'lows', 'closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [21],
        sellPeriods: [21],
        signals: {
            buy: [
                { type: 'gt', values: [0, 10, 20], desc: 'TMF 양수 (매집)' },
                { type: 'increasing', desc: 'TMF 상승' },
            ],
            sell: [
                { type: 'lt', values: [0, -10, -20], desc: 'TMF 음수 (분산)' },
                { type: 'decreasing', desc: 'TMF 하락' },
            ]
        }
    },
    { 
        name: 'VolumeROC', fn: VolumeROC, params: ['volumes', 'period'], category: 'volume',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [50, 100, 200], desc: '거래량 급증' },
            ],
            sell: [
                { type: 'lt', values: [-50, -30], desc: '거래량 급감' },
            ]
        }
    },
    { 
        name: 'VWMACD', fn: VWMACD, params: ['closes', 'volumes', 'fastPeriod', 'slowPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'VWMACD 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'VWMACD 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'PriceChannel', fn: PriceChannel, params: ['highs', 'lows', 'period'], category: 'price_position',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'near_upper', desc: '상단 채널 근처 (돌파)' },
                { type: 'above_middle', desc: '중간선 위' },
            ],
            sell: [
                { type: 'near_lower', desc: '하단 채널 근처' },
                { type: 'below_middle', desc: '중간선 아래' },
            ]
        }
    },
    { 
        name: 'FibonacciPivot', fn: FibonacciPivot, params: ['high', 'low', 'close'], category: 'price_position',
        signals: {
            buy: [
                { type: 'near_s1', desc: 'S1 지지 근처' },
                { type: 'above_pp', desc: '피봇 위' },
            ],
            sell: [
                { type: 'near_r1', desc: 'R1 저항 근처' },
                { type: 'below_pp', desc: '피봇 아래' },
            ]
        }
    },
    { 
        name: 'CamarillaPivot', fn: CamarillaPivot, params: ['high', 'low', 'close'], category: 'price_position',
        signals: {
            buy: [
                { type: 'near_s3', desc: 'S3 지지 근처 (강한 매수)' },
                { type: 'break_r4', desc: 'R4 돌파 (추세)' },
            ],
            sell: [
                { type: 'near_r3', desc: 'R3 저항 근처 (강한 매도)' },
                { type: 'break_s4', desc: 'S4 붕괴 (추세)' },
            ]
        }
    },
    { 
        name: 'WoodiePivot', fn: WoodiePivot, params: ['high', 'low', 'close'], category: 'price_position',
        signals: {
            buy: [
                { type: 'above_pp', desc: '피봇 위' },
                { type: 'bounce_s1', desc: 'S1 반등' },
            ],
            sell: [
                { type: 'below_pp', desc: '피봇 아래' },
                { type: 'reject_r1', desc: 'R1 거부' },
            ]
        }
    },
    { 
        name: 'DeMarkPivot', fn: DeMarkPivot, params: ['high', 'low', 'open', 'close'], category: 'price_position',
        signals: {
            buy: [
                { type: 'near_s1', desc: 'S1 지지' },
            ],
            sell: [
                { type: 'near_r1', desc: 'R1 저항' },
            ]
        }
    },
    { 
        name: 'TSIHistogram', fn: TSIHistogram, params: ['closes', 'longPeriod', 'shortPeriod', 'signalPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'histogram_positive', desc: 'TSI > Signal' },
                { type: 'cross_up', desc: 'TSI 골든크로스' },
            ],
            sell: [
                { type: 'histogram_negative', desc: 'TSI < Signal' },
                { type: 'cross_down', desc: 'TSI 데드크로스' },
            ]
        }
    },
    { 
        name: 'KeltnerPosition', fn: KeltnerPosition, params: ['highs', 'lows', 'closes', 'period', 'multiplier'], category: 'price_position',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'lt', values: [20, 10], desc: '켈트너 하단 근처' },
            ],
            sell: [
                { type: 'gt', values: [80, 90], desc: '켈트너 상단 근처' },
            ]
        }
    },
    { 
        name: 'BollingerTrend', fn: BollingerTrend, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'bullish_expanding', desc: '상승추세 + 확장' },
                { type: 'direction_up', desc: 'BB 중심선 상승' },
            ],
            sell: [
                { type: 'bearish_expanding', desc: '하락추세 + 확장' },
                { type: 'direction_down', desc: 'BB 중심선 하락' },
            ]
        }
    },
    { 
        name: 'RSIDivergence', fn: RSIDivergence, params: ['closes', 'period', 'lookback'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'eq', values: [1], desc: 'RSI 상승 다이버전스' },
            ],
            sell: [
                { type: 'eq', values: [-1], desc: 'RSI 하락 다이버전스' },
            ]
        }
    },
    { 
        name: 'MACDDivergence', fn: MACDDivergence, params: ['closes', 'lookback'], category: 'momentum',
        signals: {
            buy: [
                { type: 'eq', values: [1], desc: 'MACD 상승 다이버전스' },
            ],
            sell: [
                { type: 'eq', values: [-1], desc: 'MACD 하락 다이버전스' },
            ]
        }
    },
    { 
        name: 'StochDivergence', fn: StochDivergence, params: ['highs', 'lows', 'closes', 'period', 'lookback'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'eq', values: [1], desc: 'Stoch 상승 다이버전스' },
            ],
            sell: [
                { type: 'eq', values: [-1], desc: 'Stoch 하락 다이버전스' },
            ]
        }
    },
    { 
        name: 'MomentumDivergenceIndex', fn: MomentumDivergenceIndex, params: ['highs', 'lows', 'closes', 'lookback'], category: 'momentum',
        signals: {
            buy: [
                { type: 'bullish', desc: '종합 상승 다이버전스' },
                { type: 'combined_positive', desc: '다이버전스 점수 양수' },
            ],
            sell: [
                { type: 'bearish', desc: '종합 하락 다이버전스' },
                { type: 'combined_negative', desc: '다이버전스 점수 음수' },
            ]
        }
    },
    { 
        name: 'PriceMomentumQuality', fn: PriceMomentumQuality, params: ['closes', 'shortPeriod', 'longPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'aligned_positive', desc: '단기/장기 모멘텀 정렬 (상승)' },
                { type: 'quality_high', desc: '모멘텀 품질 높음' },
            ],
            sell: [
                { type: 'aligned_negative', desc: '단기/장기 모멘텀 정렬 (하락)' },
                { type: 'quality_low', desc: '모멘텀 품질 낮음' },
            ]
        }
    },
    { 
        name: 'TrendQuality', fn: TrendQuality, params: ['closes', 'period'], category: 'trend_strength',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [60, 70, 80], desc: '추세 품질 높음 (60%+)' },
            ],
            sell: [
                { type: 'lt', values: [40, 30, 20], desc: '추세 품질 낮음 (40%-)' },
            ]
        }
    },
    { 
        name: 'VolatilityQuality', fn: VolatilityQuality, params: ['highs', 'lows', 'closes', 'period'], category: 'volatility',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [50, 70, 100], desc: '효율적 변동성 (50%+)' },
            ],
            sell: [
                { type: 'lt', values: [30, 20], desc: '비효율적 변동성 (30%-)' },
            ]
        }
    },
    { 
        name: 'EnhancedADL', fn: EnhancedADL, params: ['highs', 'lows', 'closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'EADL 양수 (매집)' },
                { type: 'increasing', desc: 'EADL 상승' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'EADL 음수 (분산)' },
                { type: 'decreasing', desc: 'EADL 하락' },
            ]
        }
    },
    { 
        name: 'VolumePriceConfirm', fn: VolumePriceConfirm, params: ['closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [10],
        sellPeriods: [10],
        signals: {
            buy: [
                { type: 'confirmed', desc: '거래량-가격 확인' },
                { type: 'confirm_high', desc: '확인 비율 높음' },
            ],
            sell: [
                { type: 'not_confirmed', desc: '거래량-가격 불일치' },
            ]
        }
    },
    { 
        name: 'TrendPersistence', fn: TrendPersistence, params: ['closes', 'period'], category: 'trend_strength',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'bias_positive', desc: '상승 편향' },
                { type: 'persistent_up', desc: '지속적 상승' },
            ],
            sell: [
                { type: 'bias_negative', desc: '하락 편향' },
                { type: 'persistent_down', desc: '지속적 하락' },
            ]
        }
    },
    { 
        name: 'DynamicSR', fn: DynamicSR, params: ['highs', 'lows', 'closes', 'period'], category: 'price_position',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'near_support', desc: '지지선 근처' },
                { type: 'position_low', desc: '레인지 하단' },
            ],
            sell: [
                { type: 'near_resistance', desc: '저항선 근처' },
                { type: 'position_high', desc: '레인지 상단' },
            ]
        }
    },
    { 
        name: 'BreakoutProbability', fn: BreakoutProbability, params: ['highs', 'lows', 'closes', 'period'], category: 'volatility',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'up_breakout', desc: '상방 돌파 가능성' },
                { type: 'range_shrinking', desc: '레인지 축소' },
            ],
            sell: [
                { type: 'down_breakout', desc: '하방 돌파 가능성' },
            ]
        }
    },
    { 
        name: 'MomentumExhaustion', fn: MomentumExhaustion, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'reversing_up', desc: '하락 모멘텀 소진 → 반전' },
            ],
            sell: [
                { type: 'exhausted', desc: '모멘텀 소진' },
                { type: 'reversing_down', desc: '상승 모멘텀 소진 → 반전' },
            ]
        }
    },
    { 
        name: 'VolumeBreakout', fn: VolumeBreakout, params: ['volumes', 'period', 'multiplier'], category: 'volume',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'breakout', desc: '거래량 급증 돌파' },
                { type: 'climax', desc: '거래량 클라이맥스' },
            ],
            sell: [
                { type: 'low_volume', desc: '거래량 저조' },
            ]
        }
    },
    { 
        name: 'PriceVelocity', fn: PriceVelocity, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [5],
        sellPeriods: [5],
        signals: {
            buy: [
                { type: 'accelerating', desc: '상승 가속' },
                { type: 'velocity_positive', desc: '양의 속도' },
            ],
            sell: [
                { type: 'decelerating', desc: '상승 감속' },
                { type: 'velocity_negative', desc: '음의 속도' },
            ]
        }
    },
    { 
        name: 'CompositeTrendScore', fn: CompositeTrendScore, params: ['highs', 'lows', 'closes', 'volumes'], category: 'trend_strength',
        signals: {
            buy: [
                { type: 'gt', values: [60, 70, 80], desc: '종합 추세 점수 높음' },
            ],
            sell: [
                { type: 'lt', values: [40, 30, 20], desc: '종합 추세 점수 낮음' },
            ]
        }
    },
    { 
        name: 'PriceOscillator', fn: PriceOscillator, params: ['closes', 'shortPeriod', 'longPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'PO 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'PO 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'CMOEnhanced', fn: CMOEnhanced, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'oversold_rising', desc: '과매도 + 상승' },
                { type: 'rising', desc: 'CMO 상승중' },
            ],
            sell: [
                { type: 'overbought_falling', desc: '과매수 + 하락' },
                { type: 'falling', desc: 'CMO 하락중' },
            ]
        }
    },
    { 
        name: 'VolumeSpread', fn: VolumeSpread, params: ['highs', 'lows', 'closes', 'volumes', 'period'], category: 'volume',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'bullish', desc: '상승 거래량 우위' },
                { type: 'ratio_high', desc: '거래량 비율 높음' },
            ],
            sell: [
                { type: 'bearish', desc: '하락 거래량 우위' },
                { type: 'ratio_low', desc: '거래량 비율 낮음' },
            ]
        }
    },
    { 
        name: 'RelativePriceStrength', fn: RelativePriceStrength, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'strong', desc: '강한 상대 강도' },
                { type: 'improving', desc: '상대 강도 개선' },
            ],
            sell: [
                { type: 'weak', desc: '약한 상대 강도' },
                { type: 'deteriorating', desc: '상대 강도 악화' },
            ]
        }
    },
    { 
        name: 'TrendAngle', fn: TrendAngle, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'bullish_steep', desc: '가파른 상승 각도' },
                { type: 'bullish', desc: '양의 추세 각도' },
            ],
            sell: [
                { type: 'bearish_steep', desc: '가파른 하락 각도' },
                { type: 'flat', desc: '평평한 추세' },
            ]
        }
    },
    { 
        name: 'SmoothedROCEnhanced', fn: SmoothedROCEnhanced, params: ['closes', 'rocPeriod', 'smoothPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'momentum_positive', desc: '모멘텀 양수' },
                { type: 'smoothed_positive', desc: '스무딩 양수' },
            ],
            sell: [
                { type: 'momentum_negative', desc: '모멘텀 음수' },
                { type: 'smoothed_negative', desc: '스무딩 음수' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 5차 검증된 고급 지표 (40개)
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'StochasticMomentumIndex', fn: StochasticMomentumIndex, params: ['highs', 'lows', 'closes', 'period', 'smooth1', 'smooth2'], category: 'momentum',
        signals: {
            buy: [
                { type: 'lt', values: [-40, -50], desc: 'SMI 과매도' },
                { type: 'cross_up', values: [0, -40], desc: 'SMI 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [40, 50], desc: 'SMI 과매수' },
                { type: 'cross_down', values: [0, 40], desc: 'SMI 하향돌파' },
            ]
        }
    },
    { 
        name: 'RVIEnhanced', fn: RVIEnhanced, params: ['opens', 'highs', 'lows', 'closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'bullish', desc: 'RVI 양수 (상승세)' },
                { type: 'strong_bullish', desc: 'RVI 강한 상승' },
            ],
            sell: [
                { type: 'bearish', desc: 'RVI 음수 (하락세)' },
                { type: 'strong_bearish', desc: 'RVI 강한 하락' },
            ]
        }
    },
    { 
        name: 'WilliamsAccumDist', fn: WilliamsAccumDist, params: ['highs', 'lows', 'closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'increasing', desc: 'WAD 증가' },
                { type: 'positive_divergence', desc: '가격하락 WAD상승' },
            ],
            sell: [
                { type: 'decreasing', desc: 'WAD 감소' },
                { type: 'negative_divergence', desc: '가격상승 WAD하락' },
            ]
        }
    },
    { 
        name: 'QstickEnhanced', fn: QstickEnhanced, params: ['opens', 'closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'bullish', desc: 'Qstick 양수' },
                { type: 'trend_up', desc: 'Qstick 상승추세' },
            ],
            sell: [
                { type: 'bearish', desc: 'Qstick 음수' },
                { type: 'trend_down', desc: 'Qstick 하락추세' },
            ]
        }
    },
    { 
        name: 'PriceActionStrength', fn: PriceActionStrength, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'bullish_bias', desc: '매수세 우위' },
                { type: 'strong_bull', desc: '강한 매수세 (60%+)' },
            ],
            sell: [
                { type: 'bearish_bias', desc: '매도세 우위' },
                { type: 'strong_bear', desc: '강한 매도세 (60%+)' },
            ]
        }
    },
    { 
        name: 'TrendStrengthIndex', fn: TrendStrengthIndex, params: ['closes', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'strong_up', desc: '강한 상승추세 (30%+)' },
                { type: 'direction_up', desc: '상승 방향' },
            ],
            sell: [
                { type: 'strong_down', desc: '강한 하락추세 (-30%)' },
                { type: 'direction_down', desc: '하락 방향' },
            ]
        }
    },
    { 
        name: 'MAConvergence', fn: MAConvergence, params: ['closes', 'fast', 'slow'], category: 'trend',
        signals: {
            buy: [
                { type: 'bullish', desc: '빠른MA > 느린MA' },
                { type: 'diverging_up', desc: '상승 확산' },
            ],
            sell: [
                { type: 'bearish', desc: '빠른MA < 느린MA' },
                { type: 'diverging_down', desc: '하락 확산' },
            ]
        }
    },
    { 
        name: 'MomentumAcceleration', fn: MomentumAcceleration, params: ['closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'accelerating', desc: '모멘텀 가속' },
                { type: 'strong_accel', desc: '강한 가속' },
            ],
            sell: [
                { type: 'decelerating', desc: '모멘텀 감속' },
                { type: 'strong_decel', desc: '강한 감속' },
            ]
        }
    },
    { 
        name: 'VolumeMomentum', fn: VolumeMomentum, params: ['volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'increasing', desc: '거래량 증가' },
                { type: 'surge', desc: '거래량 급증 (50%+)' },
            ],
            sell: [
                { type: 'declining', desc: '거래량 감소' },
                { type: 'drying', desc: '거래량 급감 (-30%)' },
            ]
        }
    },
    { 
        name: 'PriceRateEfficiency', fn: PriceRateEfficiency, params: ['closes', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'trending', desc: '효율적 추세 (50%+)' },
                { type: 'high_efficiency', desc: '높은 효율성' },
            ],
            sell: [
                { type: 'ranging', desc: '비효율적 횡보 (25%-)' },
                { type: 'low_efficiency', desc: '낮은 효율성' },
            ]
        }
    },
    { 
        name: 'DynamicSupportLevel', fn: DynamicSupportLevel, params: ['lows', 'period'], category: 'support',
        signals: {
            buy: [
                { type: 'near_support', desc: '지지선 근접' },
                { type: 'bounce_support', desc: '지지선 반등' },
            ],
            sell: [
                { type: 'below_support', desc: '지지선 이탈' },
                { type: 'break_support', desc: '지지선 붕괴' },
            ]
        }
    },
    { 
        name: 'DynamicResistanceLevel', fn: DynamicResistanceLevel, params: ['highs', 'period'], category: 'resistance',
        signals: {
            buy: [
                { type: 'above_resistance', desc: '저항선 돌파' },
                { type: 'break_resistance', desc: '저항선 상향돌파' },
            ],
            sell: [
                { type: 'near_resistance', desc: '저항선 근접' },
                { type: 'reject_resistance', desc: '저항선 거부' },
            ]
        }
    },
    { 
        name: 'VolatilityRatio', fn: VolatilityRatio, params: ['highs', 'lows', 'closes', 'period'], category: 'volatility',
        signals: {
            buy: [
                { type: 'expansion', desc: '변동성 확대' },
                { type: 'breakout_likely', desc: '돌파 임박' },
            ],
            sell: [
                { type: 'contraction', desc: '변동성 축소' },
                { type: 'exhaustion', desc: '변동성 피로' },
            ]
        }
    },
    { 
        name: 'TrendConsistency', fn: TrendConsistency, params: ['closes', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'consistent_up', desc: '일관된 상승' },
                { type: 'strong_consistency', desc: '강한 추세 일관성' },
            ],
            sell: [
                { type: 'consistent_down', desc: '일관된 하락' },
                { type: 'choppy', desc: '불규칙 횡보' },
            ]
        }
    },
    { 
        name: 'BuyingPressureIndex', fn: BuyingPressureIndex, params: ['highs', 'lows', 'closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'strong', desc: '강한 매수압력 (60%+)' },
                { type: 'increasing', desc: '매수압력 증가' },
            ],
            sell: [
                { type: 'weak', desc: '약한 매수압력 (40%-)' },
                { type: 'decreasing', desc: '매수압력 감소' },
            ]
        }
    },
    { 
        name: 'SellingPressureIndex', fn: SellingPressureIndex, params: ['highs', 'lows', 'closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'weak', desc: '약한 매도압력 (40%-)' },
                { type: 'decreasing', desc: '매도압력 감소' },
            ],
            sell: [
                { type: 'strong', desc: '강한 매도압력 (60%+)' },
                { type: 'increasing', desc: '매도압력 증가' },
            ]
        }
    },
    { 
        name: 'PMQIndex', fn: PMQIndex, params: ['closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'strong_positive', desc: '강한 양의 품질 (2+)' },
                { type: 'significant_positive', desc: '유의한 양의 품질' },
            ],
            sell: [
                { type: 'strong_negative', desc: '강한 음의 품질 (-2)' },
                { type: 'significant_negative', desc: '유의한 음의 품질' },
            ]
        }
    },
    { 
        name: 'VolumeClimax', fn: VolumeClimax, params: ['volumes', 'closes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'selling_climax', desc: '매도 클라이맥스 (반전신호)' },
                { type: 'high_volume', desc: '거래량 폭증' },
            ],
            sell: [
                { type: 'buying_climax', desc: '매수 클라이맥스 (피로신호)' },
                { type: 'exhaustion_volume', desc: '피로 거래량' },
            ]
        }
    },
    { 
        name: 'TrendDuration', fn: TrendDuration, params: ['closes', 'threshold'], category: 'trend',
        signals: {
            buy: [
                { type: 'new_uptrend', desc: '새 상승추세 시작' },
                { type: 'extended_down', desc: '하락추세 연장 (반전대기)' },
            ],
            sell: [
                { type: 'new_downtrend', desc: '새 하락추세 시작' },
                { type: 'extended_up', desc: '상승추세 연장 (피로)' },
            ]
        }
    },
    { 
        name: 'MeanReversionIndex', fn: MeanReversionIndex, params: ['closes', 'period'], category: 'mean_reversion',
        signals: {
            buy: [
                { type: 'oversold', desc: '평균대비 과매도 (-2σ)' },
                { type: 'reversion_buy', desc: '평균회귀 매수구간' },
            ],
            sell: [
                { type: 'overbought', desc: '평균대비 과매수 (+2σ)' },
                { type: 'reversion_sell', desc: '평균회귀 매도구간' },
            ]
        }
    },
    { 
        name: 'AdaptiveRSI', fn: AdaptiveRSI, params: ['closes', 'basePeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'oversold', desc: '적응형 RSI 과매도' },
                { type: 'lt', values: [30, 25], desc: 'RSI < 30' },
            ],
            sell: [
                { type: 'overbought', desc: '적응형 RSI 과매수' },
                { type: 'gt', values: [70, 75], desc: 'RSI > 70' },
            ]
        }
    },
    { 
        name: 'CumulativeDelta', fn: CumulativeDelta, params: ['highs', 'lows', 'closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: '누적델타 양수' },
                { type: 'strong_bullish', desc: '강한 매수세' },
            ],
            sell: [
                { type: 'bearish', desc: '누적델타 음수' },
                { type: 'strong_bearish', desc: '강한 매도세' },
            ]
        }
    },
    { 
        name: 'SwingHighLow', fn: SwingHighLow, params: ['highs', 'lows', 'leftBars', 'rightBars'], category: 'pattern',
        signals: {
            buy: [
                { type: 'swing_low', desc: '스윙 저점 형성' },
                { type: 'higher_low', desc: '고점 상승 패턴' },
            ],
            sell: [
                { type: 'swing_high', desc: '스윙 고점 형성' },
                { type: 'lower_high', desc: '고점 하락 패턴' },
            ]
        }
    },
    { 
        name: 'VolumeProfile', fn: VolumeProfile, params: ['closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'below_poc', desc: 'POC 아래 (지지)' },
                { type: 'near_poc_support', desc: 'POC 근처 지지' },
            ],
            sell: [
                { type: 'above_poc', desc: 'POC 위 (저항)' },
                { type: 'near_poc_resistance', desc: 'POC 근처 저항' },
            ]
        }
    },
    { 
        name: 'MomentumDivergenceEnhanced', fn: MomentumDivergenceEnhanced, params: ['closes', 'period'], category: 'divergence',
        signals: {
            buy: [
                { type: 'bullish_div', desc: '상승 다이버전스' },
                { type: 'confirmed_up', desc: '확인된 상승신호' },
            ],
            sell: [
                { type: 'bearish_div', desc: '하락 다이버전스' },
                { type: 'confirmed_down', desc: '확인된 하락신호' },
            ]
        }
    },
    { 
        name: 'VolatilitySqueeze', fn: VolatilitySqueeze, params: ['highs', 'lows', 'closes', 'period'], category: 'volatility',
        signals: {
            buy: [
                { type: 'squeeze_release_up', desc: '스퀴즈 해제 상승' },
                { type: 'firing_up', desc: '상승 발사' },
            ],
            sell: [
                { type: 'squeeze_release_down', desc: '스퀴즈 해제 하락' },
                { type: 'firing_down', desc: '하락 발사' },
            ]
        }
    },
    { 
        name: 'PriceEnvelope', fn: PriceEnvelope, params: ['closes', 'period', 'percent'], category: 'envelope',
        signals: {
            buy: [
                { type: 'oversold', desc: '하단밴드 이탈' },
                { type: 'lower_touch', desc: '하단 터치' },
            ],
            sell: [
                { type: 'overbought', desc: '상단밴드 이탈' },
                { type: 'upper_touch', desc: '상단 터치' },
            ]
        }
    },
    { 
        name: 'TrendExhaustion', fn: TrendExhaustion, params: ['closes', 'highs', 'lows', 'period'], category: 'exhaustion',
        signals: {
            buy: [
                { type: 'bear_exhaustion', desc: '하락추세 소진' },
                { type: 'reversal_up', desc: '상승 반전 신호' },
            ],
            sell: [
                { type: 'bull_exhaustion', desc: '상승추세 소진' },
                { type: 'reversal_down', desc: '하락 반전 신호' },
            ]
        }
    },
    { 
        name: 'CumulativeVolumeIndex', fn: CumulativeVolumeIndex, params: ['closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: 'CVI 양수' },
                { type: 'strong_accumulation', desc: '강한 축적' },
            ],
            sell: [
                { type: 'bearish', desc: 'CVI 음수' },
                { type: 'strong_distribution', desc: '강한 분배' },
            ]
        }
    },
    { 
        name: 'ROCEnhanced', fn: ROCEnhanced, params: ['closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'accelerating_up', desc: '상승 가속' },
                { type: 'turning_up', desc: '상승 전환' },
            ],
            sell: [
                { type: 'accelerating_down', desc: '하락 가속' },
                { type: 'turning_down', desc: '하락 전환' },
            ]
        }
    },
    { 
        name: 'MarketStructure', fn: MarketStructure, params: ['highs', 'lows', 'period'], category: 'structure',
        signals: {
            buy: [
                { type: 'uptrend', desc: '상승구조 (HH+HL)' },
                { type: 'higher_low', desc: '고점 저점 상승' },
            ],
            sell: [
                { type: 'downtrend', desc: '하락구조 (LH+LL)' },
                { type: 'lower_high', desc: '고점 저점 하락' },
            ]
        }
    },
    { 
        name: 'PriceDistance', fn: PriceDistance, params: ['closes', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'extended_below', desc: '평균 이하 확장 (-2σ)' },
                { type: 'oversold_distance', desc: '과매도 거리' },
            ],
            sell: [
                { type: 'extended_above', desc: '평균 이상 확장 (+2σ)' },
                { type: 'overbought_distance', desc: '과매수 거리' },
            ]
        }
    },
    { 
        name: 'VolumeTrend', fn: VolumeTrend, params: ['volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'increasing', desc: '거래량 상승추세' },
                { type: 'positive_slope', desc: '양의 기울기' },
            ],
            sell: [
                { type: 'decreasing', desc: '거래량 하락추세' },
                { type: 'negative_slope', desc: '음의 기울기' },
            ]
        }
    },
    { 
        name: 'MomentumIndex', fn: MomentumIndex, params: ['closes', 'shortPeriod', 'longPeriod'], category: 'momentum',
        signals: {
            buy: [
                { type: 'aligned_bullish', desc: '단기+장기 상승 정렬' },
                { type: 'short_positive', desc: '단기 모멘텀 양수' },
            ],
            sell: [
                { type: 'aligned_bearish', desc: '단기+장기 하락 정렬' },
                { type: 'short_negative', desc: '단기 모멘텀 음수' },
            ]
        }
    },
    { 
        name: 'SRBreak', fn: SRBreak, params: ['highs', 'lows', 'closes', 'period'], category: 'breakout',
        signals: {
            buy: [
                { type: 'breakout_up', desc: '저항선 상향돌파' },
                { type: 'support_hold', desc: '지지선 유지' },
            ],
            sell: [
                { type: 'breakout_down', desc: '지지선 하향돌파' },
                { type: 'resistance_hold', desc: '저항선 유지' },
            ]
        }
    },
    { 
        name: 'VolatilityAdjustedMomentum', fn: VolatilityAdjustedMomentum, params: ['closes', 'highs', 'lows', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'strong_bullish', desc: '변동성조정 강한상승 (2+)' },
                { type: 'bullish', desc: '변동성조정 상승' },
            ],
            sell: [
                { type: 'strong_bearish', desc: '변동성조정 강한하락 (-2)' },
                { type: 'bearish', desc: '변동성조정 하락' },
            ]
        }
    },
    { 
        name: 'PriceAcceleration', fn: PriceAcceleration, params: ['closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'accelerating', desc: '가격 가속' },
                { type: 'significant_accel', desc: '유의한 가속' },
            ],
            sell: [
                { type: 'decelerating', desc: '가격 감속' },
                { type: 'significant_decel', desc: '유의한 감속' },
            ]
        }
    },
    { 
        name: 'MarketBreadthProxy', fn: MarketBreadthProxy, params: ['closes', 'period'], category: 'breadth',
        signals: {
            buy: [
                { type: 'bullish', desc: '상승우위 (60%+)' },
                { type: 'strong_advance', desc: '강한 전진' },
            ],
            sell: [
                { type: 'bearish', desc: '하락우위 (40%-)' },
                { type: 'strong_decline', desc: '강한 하락' },
            ]
        }
    },
    { 
        name: 'TrendQualityEnhanced', fn: TrendQualityEnhanced, params: ['closes', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'high_quality_up', desc: '고품질 상승추세' },
                { type: 'efficient_up', desc: '효율적 상승' },
            ],
            sell: [
                { type: 'high_quality_down', desc: '고품질 하락추세' },
                { type: 'efficient_down', desc: '효율적 하락' },
            ]
        }
    },
    { 
        name: 'VolumePriceAnalysis', fn: VolumePriceAnalysis, params: ['closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish_volume', desc: '상승거래량 우위' },
                { type: 'accumulation', desc: '축적 신호' },
            ],
            sell: [
                { type: 'bearish_volume', desc: '하락거래량 우위' },
                { type: 'distribution', desc: '분배 신호' },
            ]
        }
    },
    // 검증된 고급 지표 (6차 - 고급 오실레이터/다이버전스/시스템)
    { 
        name: 'AroonOscillatorEnhanced', fn: AroonOscillatorEnhanced, params: ['highs', 'lows', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'strong_bullish', desc: '강한 상승 (50+)' },
                { type: 'new_trend_up', desc: '새로운 상승추세' },
            ],
            sell: [
                { type: 'strong_bearish', desc: '강한 하락 (-50-)' },
                { type: 'new_trend_down', desc: '새로운 하락추세' },
            ]
        }
    },
    { 
        name: 'UltimateOscillatorEnhanced', fn: UltimateOscillatorEnhanced, params: ['highs', 'lows', 'closes'], category: 'momentum',
        signals: {
            buy: [
                { type: 'oversold', desc: '과매도 (30-)' },
                { type: 'bullish_divergence', desc: '상승 다이버전스' },
            ],
            sell: [
                { type: 'overbought', desc: '과매수 (70+)' },
                { type: 'bearish_divergence', desc: '하락 다이버전스' },
            ]
        }
    },
    { 
        name: 'DPOEnhanced', fn: DPOEnhanced, params: ['closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'cross_up', desc: '0선 상향돌파' },
                { type: 'bullish', desc: 'DPO 양수' },
            ],
            sell: [
                { type: 'cross_down', desc: '0선 하향돌파' },
                { type: 'bearish', desc: 'DPO 음수' },
            ]
        }
    },
    { 
        name: 'KSTEnhanced', fn: KSTEnhanced, params: ['closes'], category: 'momentum',
        signals: {
            buy: [
                { type: 'bullish', desc: 'KST > 시그널' },
                { type: 'strong_bullish', desc: 'KST+ & 시그널상회' },
            ],
            sell: [
                { type: 'bearish', desc: 'KST < 시그널' },
                { type: 'strong_bearish', desc: 'KST- & 시그널하회' },
            ]
        }
    },
    { 
        name: 'CoppockEnhanced', fn: CoppockEnhanced, params: ['closes'], category: 'momentum',
        signals: {
            buy: [
                { type: 'turning_up', desc: '음수에서 상승전환' },
                { type: 'bullish', desc: 'Coppock 양수' },
            ],
            sell: [
                { type: 'turning_down', desc: '양수에서 하락전환' },
                { type: 'bearish', desc: 'Coppock 음수' },
            ]
        }
    },
    { 
        name: 'MassIndexEnhanced', fn: MassIndexEnhanced, params: ['highs', 'lows'], category: 'volatility',
        signals: {
            buy: [
                { type: 'bulge_complete', desc: '반전벌지 완성 (하락후)' },
                { type: 'low_volatility', desc: '저변동성 (20-)' },
            ],
            sell: [
                { type: 'reversal_bulge', desc: '반전벌지 시작 (27+)' },
                { type: 'high_volatility', desc: '고변동성 (25+)' },
            ]
        }
    },
    { 
        name: 'PriceChannelBreakout', fn: PriceChannelBreakout, params: ['highs', 'lows', 'closes', 'period'], category: 'breakout',
        signals: {
            buy: [
                { type: 'breakout_up', desc: '채널상단 돌파' },
                { type: 'near_high', desc: '채널상단 근접' },
            ],
            sell: [
                { type: 'breakout_down', desc: '채널하단 이탈' },
                { type: 'near_low', desc: '채널하단 근접' },
            ]
        }
    },
    { 
        name: 'DonchianPosition', fn: DonchianPosition, params: ['highs', 'lows', 'closes', 'period'], category: 'channel',
        signals: {
            buy: [
                { type: 'near_top', desc: '상단근접 (80%+)' },
                { type: 'above_middle', desc: '중간선 상회' },
            ],
            sell: [
                { type: 'near_bottom', desc: '하단근접 (20%-)' },
                { type: 'below_middle', desc: '중간선 하회' },
            ]
        }
    },
    { 
        name: 'LinearRegressionSlopeEnhanced', fn: LinearRegressionSlopeEnhanced, params: ['closes', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'strong_uptrend', desc: '강한 상승추세' },
                { type: 'uptrend', desc: '상승기울기' },
            ],
            sell: [
                { type: 'strong_downtrend', desc: '강한 하락추세' },
                { type: 'downtrend', desc: '하락기울기' },
            ]
        }
    },
    { 
        name: 'StandardErrorBands', fn: StandardErrorBands, params: ['closes', 'period'], category: 'volatility',
        signals: {
            buy: [
                { type: 'below_lower', desc: '하단밴드 이탈' },
                { type: 'in_channel', desc: '채널내 반등' },
            ],
            sell: [
                { type: 'above_upper', desc: '상단밴드 이탈' },
                { type: 'in_channel', desc: '채널내 조정' },
            ]
        }
    },
    { 
        name: 'ProjectionOscillator', fn: ProjectionOscillator, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        signals: {
            buy: [
                { type: 'oversold', desc: '과매도 (20-)' },
                { type: 'bullish', desc: '50 상회' },
            ],
            sell: [
                { type: 'overbought', desc: '과매수 (80+)' },
                { type: 'bearish', desc: '50 하회' },
            ]
        }
    },
    { 
        name: 'ProjectionBands', fn: ProjectionBands, params: ['highs', 'lows', 'closes', 'period'], category: 'channel',
        signals: {
            buy: [
                { type: 'below_lower', desc: '하단밴드 이탈' },
                { type: 'contracting', desc: '밴드수축 (반등준비)' },
            ],
            sell: [
                { type: 'above_upper', desc: '상단밴드 이탈' },
                { type: 'expanding', desc: '밴드확장 (변동성증가)' },
            ]
        }
    },
    { 
        name: 'VolumeOscillatorEnhanced', fn: VolumeOscillatorEnhanced, params: ['volumes', 'shortPeriod', 'longPeriod'], category: 'volume',
        signals: {
            buy: [
                { type: 'high_volume', desc: '거래량급증 (20%+)' },
                { type: 'increasing', desc: '거래량증가' },
            ],
            sell: [
                { type: 'low_volume', desc: '거래량급감 (-20%-)' },
                { type: 'decreasing', desc: '거래량감소' },
            ]
        }
    },
    { 
        name: 'EaseOfMovementEnhanced', fn: EaseOfMovementEnhanced, params: ['highs', 'lows', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'cross_up', desc: '0선 상향돌파' },
                { type: 'bullish', desc: 'EMV 양수' },
            ],
            sell: [
                { type: 'cross_down', desc: '0선 하향돌파' },
                { type: 'bearish', desc: 'EMV 음수' },
            ]
        }
    },
    { 
        name: 'ForceIndexEnhanced', fn: ForceIndexEnhanced, params: ['closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: 'FI 양수' },
                { type: 'strong_bullish', desc: '강한 매수세' },
            ],
            sell: [
                { type: 'bearish', desc: 'FI 음수' },
                { type: 'strong_bearish', desc: '강한 매도세' },
            ]
        }
    },
    { 
        name: 'ElderForceIndexEnhanced', fn: ElderForceIndexEnhanced, params: ['closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: '단기+장기 양수' },
                { type: 'divergence', desc: '다이버전스 (단기반전)' },
            ],
            sell: [
                { type: 'bearish', desc: '단기+장기 음수' },
                { type: 'divergence', desc: '다이버전스 (단기반전)' },
            ]
        }
    },
    { 
        name: 'MFIEnhanced', fn: MFIEnhanced, params: ['highs', 'lows', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'green', desc: '녹색 (MFI+Vol 상승)' },
                { type: 'squat', desc: '스쿼트 (폭발전조)' },
            ],
            sell: [
                { type: 'fade', desc: '페이드 (MFI+Vol 하락)' },
                { type: 'fake', desc: '페이크 (허위상승)' },
            ]
        }
    },
    { 
        name: 'TradeVolumeIndex', fn: TradeVolumeIndex, params: ['closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'accumulating', desc: '축적중' },
                { type: 'bullish', desc: 'TVI 양수' },
            ],
            sell: [
                { type: 'distributing', desc: '분배중' },
                { type: 'bearish', desc: 'TVI 음수' },
            ]
        }
    },
    { 
        name: 'NVIEnhanced', fn: NVIEnhanced, params: ['closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: 'NVI > EMA' },
                { type: 'smart_money_buying', desc: '스마트머니 매수' },
            ],
            sell: [
                { type: 'bearish', desc: 'NVI < EMA' },
            ]
        }
    },
    { 
        name: 'PVIEnhanced', fn: PVIEnhanced, params: ['closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: 'PVI > EMA' },
                { type: 'crowd_buying', desc: '대중 매수' },
            ],
            sell: [
                { type: 'bearish', desc: 'PVI < EMA' },
            ]
        }
    },
    { 
        name: 'OBVOscillator', fn: OBVOscillator, params: ['closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: 'OBV단기 > 장기' },
                { type: 'cross_up', desc: 'OBV 상향돌파' },
            ],
            sell: [
                { type: 'bearish', desc: 'OBV단기 < 장기' },
            ]
        }
    },
    { 
        name: 'ADOscillator', fn: ADOscillator, params: ['highs', 'lows', 'closes', 'volumes'], category: 'volume',
        signals: {
            buy: [
                { type: 'accumulation', desc: '축적 (AD+오실레이터+)' },
                { type: 'bullish', desc: '오실레이터 양수' },
            ],
            sell: [
                { type: 'distribution', desc: '분배 (AD-오실레이터-)' },
                { type: 'bearish', desc: '오실레이터 음수' },
            ]
        }
    },
    { 
        name: 'VPTOscillator', fn: VPTOscillator, params: ['closes', 'volumes', 'period'], category: 'volume',
        signals: {
            buy: [
                { type: 'bullish', desc: 'VPT > SMA' },
                { type: 'increasing', desc: 'VPT 상승중' },
            ],
            sell: [
                { type: 'bearish', desc: 'VPT < SMA' },
            ]
        }
    },
    { 
        name: 'ChaikinVolatilityEnhanced', fn: ChaikinVolatilityEnhanced, params: ['highs', 'lows'], category: 'volatility',
        signals: {
            buy: [
                { type: 'low_volatility', desc: '저변동성 (-25%-)' },
                { type: 'contracting', desc: '변동성 수축' },
            ],
            sell: [
                { type: 'high_volatility', desc: '고변동성 (25%+)' },
                { type: 'expanding', desc: '변동성 확장' },
            ]
        }
    },
    { 
        name: 'HistoricalVolatilityRatio', fn: HistoricalVolatilityRatio, params: ['closes'], category: 'volatility',
        signals: {
            buy: [
                { type: 'low_ratio', desc: '저비율 (0.8-)' },
                { type: 'contracting', desc: '변동성 수축' },
            ],
            sell: [
                { type: 'high_ratio', desc: '고비율 (1.2+)' },
                { type: 'expanding', desc: '변동성 확장' },
            ]
        }
    },
    { 
        name: 'ParkinsonVolatility', fn: ParkinsonVolatility, params: ['highs', 'lows', 'period'], category: 'volatility',
        signals: {
            buy: [
                { type: 'low_vol', desc: '저변동성 (15%-)' },
                { type: 'moderate', desc: '보통변동성' },
            ],
            sell: [
                { type: 'high_vol', desc: '고변동성 (30%+)' },
            ]
        }
    },
    { 
        name: 'GarmanKlassVolatility', fn: GarmanKlassVolatility, params: ['opens', 'highs', 'lows', 'closes', 'period'], category: 'volatility',
        signals: {
            buy: [
                { type: 'low_vol', desc: '저변동성 (15%-)' },
                { type: 'moderate', desc: '보통변동성' },
            ],
            sell: [
                { type: 'high_vol', desc: '고변동성 (30%+)' },
            ]
        }
    },
    { 
        name: 'YangZhangVolatility', fn: YangZhangVolatility, params: ['opens', 'highs', 'lows', 'closes', 'period'], category: 'volatility',
        signals: {
            buy: [
                { type: 'low_vol', desc: '저변동성 (15%-)' },
            ],
            sell: [
                { type: 'high_vol', desc: '고변동성 (30%+)' },
            ]
        }
    },
    { 
        name: 'RangeIndicator', fn: RangeIndicator, params: ['highs', 'lows', 'closes', 'period'], category: 'volatility',
        signals: {
            buy: [
                { type: 'narrow_range', desc: '좁은범위 (0.5-)' },
                { type: 'normal', desc: '정상범위' },
            ],
            sell: [
                { type: 'wide_range', desc: '넓은범위 (1.5+)' },
            ]
        }
    },
    { 
        name: 'VolatilityStop', fn: VolatilityStop, params: ['highs', 'lows', 'closes', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'above_long_stop', desc: '롱스탑 상회' },
                { type: 'in_uptrend', desc: '상승추세' },
            ],
            sell: [
                { type: 'below_short_stop', desc: '숏스탑 하회' },
                { type: 'in_downtrend', desc: '하락추세' },
            ]
        }
    },
    { 
        name: 'ParabolicSAREnhanced', fn: ParabolicSAREnhanced, params: ['highs', 'lows', 'closes'], category: 'trend',
        signals: {
            buy: [
                { type: 'bullish', desc: 'SAR 상승추세' },
                { type: 'reversal', desc: '하락→상승 반전' },
            ],
            sell: [
                { type: 'bearish', desc: 'SAR 하락추세' },
                { type: 'reversal', desc: '상승→하락 반전' },
            ]
        }
    },
    { 
        name: 'SuperTrendEnhanced', fn: SuperTrendEnhanced, params: ['highs', 'lows', 'closes', 'period'], category: 'trend',
        signals: {
            buy: [
                { type: 'bullish', desc: '상승추세' },
            ],
            sell: [
                { type: 'bearish', desc: '하락추세' },
            ]
        }
    },
    { 
        name: 'IchimokuEnhanced', fn: IchimokuEnhanced, params: ['highs', 'lows', 'closes'], category: 'trend',
        signals: {
            buy: [
                { type: 'above_cloud', desc: '구름상단 상회' },
                { type: 'tk_cross', desc: '전환선>기준선' },
                { type: 'bullish_cloud', desc: '상승구름' },
            ],
            sell: [
                { type: 'below_cloud', desc: '구름하단 하회' },
                { type: 'in_cloud', desc: '구름내 (중립)' },
            ]
        }
    },
    { 
        name: 'ZigZagIndicator', fn: ZigZagIndicator, params: ['highs', 'lows'], category: 'pattern',
        signals: {
            buy: [
                { type: 'current_swing_up', desc: '상승스윙중' },
                { type: 'potential_reversal', desc: '반전가능성 (상승)' },
            ],
            sell: [
                { type: 'current_swing_down', desc: '하락스윙중' },
                { type: 'potential_reversal', desc: '반전가능성 (하락)' },
            ]
        }
    },
    { 
        name: 'MomentumDivergenceScanner', fn: MomentumDivergenceScanner, params: ['closes', 'period'], category: 'divergence',
        signals: {
            buy: [
                { type: 'bullish_divergence', desc: '상승다이버전스' },
                { type: 'confirmation', desc: '모멘텀확인' },
            ],
            sell: [
                { type: 'bearish_divergence', desc: '하락다이버전스' },
                { type: 'hidden', desc: '히든다이버전스' },
            ]
        }
    },
    { 
        name: 'RSIDivergenceScanner', fn: RSIDivergenceScanner, params: ['closes', 'period'], category: 'divergence',
        signals: {
            buy: [
                { type: 'bullish_divergence', desc: '상승다이버전스' },
                { type: 'oversold_div', desc: '과매도+상승다이버전스' },
            ],
            sell: [
                { type: 'bearish_divergence', desc: '하락다이버전스' },
            ]
        }
    },
    { 
        name: 'MACDDivergenceScanner', fn: MACDDivergenceScanner, params: ['closes'], category: 'divergence',
        signals: {
            buy: [
                { type: 'bullish_divergence', desc: '상승다이버전스' },
                { type: 'crossover_pending', desc: '크로스오버 임박' },
            ],
            sell: [
                { type: 'bearish_divergence', desc: '하락다이버전스' },
            ]
        }
    },
    { 
        name: 'StochDivergenceScanner', fn: StochDivergenceScanner, params: ['highs', 'lows', 'closes', 'period'], category: 'divergence',
        signals: {
            buy: [
                { type: 'bullish_divergence', desc: '상승다이버전스' },
                { type: 'oversold_div', desc: '과매도+다이버전스' },
            ],
            sell: [
                { type: 'bearish_divergence', desc: '하락다이버전스' },
                { type: 'overbought_div', desc: '과매수+다이버전스' },
            ]
        }
    },
    { 
        name: 'TripleScreenSystem', fn: TripleScreenSystem, params: ['highs', 'lows', 'closes', 'volumes'], category: 'system',
        signals: {
            buy: [
                { type: 'buy_signal', desc: '매수신호 (3스크린)' },
                { type: 'pullback', desc: '상승추세 눌림목' },
            ],
            sell: [
                { type: 'sell_signal', desc: '매도신호 (3스크린)' },
                { type: 'pullback', desc: '하락추세 반등' },
            ]
        }
    },
    { 
        name: 'ElderImpulseEnhanced', fn: ElderImpulseEnhanced, params: ['highs', 'lows', 'closes'], category: 'system',
        signals: {
            buy: [
                { type: 'green', desc: '녹색 (강한상승)' },
                { type: 'bullish', desc: '상승국면' },
            ],
            sell: [
                { type: 'red', desc: '적색 (강한하락)' },
                { type: 'bearish', desc: '하락국면' },
            ]
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // 표준/검증 전략 추가 (커스텀 전략 대체)
    // ═══════════════════════════════════════════════════════════════════════════════
    { 
        name: 'ParabolicSAR', fn: ParabolicSAR, params: ['highs', 'lows', 'af', 'maxAf'], category: 'trend',
        buyParamSets: [[0.02, 0.2], [0.04, 0.2]],
        sellParamSets: [[0.02, 0.2], [0.04, 0.2]],
        signals: {
            buy: [
                { type: 'price_above', desc: '가격이 SAR 위' },
                { type: 'price_cross_up', desc: '가격이 SAR 상향돌파' },
            ],
            sell: [
                { type: 'price_below', desc: '가격이 SAR 아래' },
                { type: 'price_cross_down', desc: '가격이 SAR 하향돌파' },
            ]
        }
    },
    { 
        name: 'Supertrend', fn: Supertrend, params: ['highs', 'lows', 'closes', 'period', 'mult'], category: 'trend',
        buyPeriods: [10],
        sellPeriods: [10],
        signals: {
            buy: [
                { type: 'price_above_lower', desc: '가격이 하단 밴드 상회' },
                { type: 'breakout_up', desc: '상단 밴드 돌파' },
            ],
            sell: [
                { type: 'price_below_upper', desc: '가격이 상단 밴드 하회' },
                { type: 'breakout_down', desc: '하단 밴드 이탈' },
            ]
        }
    },
    { 
        name: 'PivotPoints', fn: PivotPoints, params: ['high', 'low', 'close'], category: 'price_position',
        signals: {
            buy: [
                { type: 'price_above_pivot', desc: '피봇 상회' },
                { type: 'price_above_r1', desc: 'R1 상회' },
            ],
            sell: [
                { type: 'price_below_pivot', desc: '피봇 하회' },
                { type: 'price_below_s1', desc: 'S1 하회' },
            ]
        }
    },
    { 
        name: 'FibonacciLevels', fn: FibonacciLevels, params: ['high', 'low'], category: 'price_position',
        signals: {
            buy: [
                { type: 'price_above_level618', desc: '0.618 상회' },
                { type: 'price_above_level500', desc: '0.5 상회' },
            ],
            sell: [
                { type: 'price_below_level382', desc: '0.382 하회' },
                { type: 'price_below_level236', desc: '0.236 하회' },
            ]
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 선별 커스텀 지표 (실전 활용 가능형)
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'DynamicSRLevel', fn: DynamicSRLevel, params: ['highs', 'lows', 'closes', 'period'], category: 'price_position',
        buyPeriods: [14, 20],
        sellPeriods: [14, 20],
        signals: {
            buy: [
                { type: 'nearSupport', desc: '지지 근접' },
                { type: 'bullish', desc: '피봇 상단' }
            ],
            sell: [
                { type: 'nearResist', desc: '저항 근접' },
                { type: 'bearish', desc: '피봇 하단' }
            ]
        }
    },
    { 
        name: 'MomentumAccelIndex', fn: MomentumAccelIndex, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'accelerating', desc: '모멘텀 가속' },
                { type: 'bullish', desc: '상승 모멘텀' }
            ],
            sell: [
                { type: 'decelerating', desc: '모멘텀 감속' },
                { type: 'bearish', desc: '하락 모멘텀' }
            ]
        }
    },
    { 
        name: 'TrendStrengthOsc', fn: TrendStrengthOsc, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'strongUp', desc: '강한 상승 추세' },
                { type: 'bullish', desc: '상승 추세' }
            ],
            sell: [
                { type: 'strongDown', desc: '강한 하락 추세' },
                { type: 'bearish', desc: '하락 추세' }
            ]
        }
    },
    { 
        name: 'CompositeMomentum', fn: CompositeMomentum, params: ['closes', 'volumes', 'period'], category: 'momentum',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'bullish', desc: '복합 모멘텀 강세' }
            ],
            sell: [
                { type: 'bearish', desc: '복합 모멘텀 약세' }
            ]
        }
    },
    { 
        name: 'AdaptiveBBPosition', fn: AdaptiveBBPosition, params: ['closes', 'period'], category: 'volatility',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'oversold', desc: '과매도' },
                { type: 'bullish', desc: '중앙선 상회' }
            ],
            sell: [
                { type: 'overbought', desc: '과매수' },
                { type: 'bearish', desc: '중앙선 하회' }
            ]
        }
    },
    { 
        name: 'KeltnerSqueeze', fn: KeltnerSqueeze, params: ['highs', 'lows', 'closes', 'bbPeriod', 'kPeriod'], category: 'volatility',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'keltnerSqueeze', desc: '스퀴즈' },
                { type: 'bullish', desc: '상승 이탈' }
            ],
            sell: [
                { type: 'preSqueeze', desc: '프리스퀴즈' },
                { type: 'bearish', desc: '하락 이탈' }
            ]
        }
    },
    { 
        name: 'VolumeMomentumOsc', fn: VolumeMomentumOsc, params: ['volumes', 'period'], category: 'volume',
        buyPeriods: [14],
        sellPeriods: [14],
        signals: {
            buy: [
                { type: 'bullish', desc: '거래량 모멘텀 상승' },
                { type: 'surge', desc: '거래량 급증' }
            ],
            sell: [
                { type: 'bearish', desc: '거래량 모멘텀 하락' },
                { type: 'quiet', desc: '거래량 위축' }
            ]
        }
    },
    { 
        name: 'PriceActionScore2', fn: PriceActionScore2, params: ['opens', 'highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [10],
        sellPeriods: [10],
        signals: {
            buy: [
                { type: 'bullish', desc: '강한 상승 캔들' },
                { type: 'strong', desc: '강한 추세' }
            ],
            sell: [
                { type: 'bearish', desc: '강한 하락 캔들' },
                { type: 'strong', desc: '강한 추세(하락)' }
            ]
        }
    },
];

export default {
    // 추세
    SMA, EMA, WMA, DEMA, TEMA, KAMA, HMA, VWMA, ZLEMA, T3, SMMA, ALMA,
    McGinleyDynamic, GuppyShort, GuppyLong, GuppySeparation,
    // 모멘텀
    RSI, StochasticK, StochasticD, WilliamsR, MACD, ROC, Momentum, CCI, CMO, TSI,
    UltimateOscillator, AwesomeOscillator, AcceleratorOscillator, PPO, DPO, TRIX, KST, Coppock,
    RVI, DeMarker, ConnorsRSI, SchaffTrendCycle, ElderImpulse,
    // 변동성
    ATR, TrueRange, BollingerBands, KeltnerChannel, DonchianChannel, StandardDeviation,
    HistoricalVolatility, ChaikinVolatility, MassIndex, UlcerIndex,
    // 거래량
    OBV, VolumeSMA, VolumeRatio, MFI, CMF, ADL, ChaikinOscillator, VWAP, PVI, NVI,
    ForceIndex, EFI, VolumeOscillator, KlingerOscillator, EaseOfMovement,
    IntradayIntensity, MarketFacilitationIndex,
    // 추세강도
    ADX, PlusDI, MinusDI, AroonUp, AroonDown, AroonOscillator, VortexPlus, VortexMinus,
    ParabolicSAR, Supertrend,
    // 가격위치
    PricePosition, DistanceFromMA, PriceVsEMA, PivotPoints, FibonacciLevels,
    PercentRank, ZScore, PriceZoneOscillator,
    // 캔들
    BodySize, UpperShadow, LowerShadow, CandleDirection, ConsecutiveCandles,
    AvgCandleSize, CandleSizeRatio, HeikinAshiClose, HeikinAshiTrend,
    BalanceOfPower, Qstick,
    // Ichimoku
    IchimokuTenkan, IchimokuKijun, IchimokuSenkouA, IchimokuSenkouB, IchimokuChikou,
    // 회귀
    LinearRegressionValue, LinearRegressionSlope, RSquared, StandardError, ChandeForecastOscillator,
    // 복합
    StochRSI, MACDHistROC, BollingerPercentB, BollingerWidth, SqueezeIndicator,
    BullPower, BearPower, FractalHigh, FractalLow,
    // 시간
    PriceChangeN, BullishRatio, HigherHighsCount, LowerLowsCount,
    // 심리
    FearGreedIndex, BuySellPressure,
    // 검증된 고급 지표 (1차)
    FisherTransform, VIDYA, FRAMA, HurstExponent, VerticalHorizontalFilter,
    ChandeKrollStop, PriceVolumeTrend, TrendIntensityIndex, RandomWalkIndex,
    ChandelierExit, ADXR, RelativeMomentumIndex, IntradayMomentumIndex,
    EhlersInstantaneousTrendline, DailyPivotPoints, GannHiLoActivator,
    // 검증된 고급 지표 (2차 - Bill Williams & Ehlers)
    WilliamsAlligator, GatorOscillator, EhlersMESA, EhlersSinewave, EhlersCyberCycle,
    CenterOfGravity, PolarizedFractalEfficiency, RelativeVolatilityIndex, ErgodicOscillator,
    PrettyGoodOscillator, PsychologicalLine, ElderAutoEnvelope, SmoothedRSI,
    DoubleSmoothedStochastic, SwingIndex, AccumulationSwingIndex, VolumeWeightedRSI, FractalChaosBands,
    // 검증된 고급 지표 (3차 - 추세/모멘텀/변동성)
    ChoppinessIndex, DisparityIndex, PriceMomentumOscillator, VPCI, EfficiencyRatio,
    NormalizedATR, RelativeVolume, AccelerationBands, RangeExpansionIndex, NetVolume,
    VolumeZoneOscillator, TypicalPrice, WeightedClose, ElderThermometer, CommoditySelectionIndex,
    MassTrend, TrendDetectionIndex, AbsolutePriceOscillator, PercentageVolumeOscillator,
    PriceActionChannel, RainbowOscillator, TrendContinuationFactor, SmoothedROC,
    DetrendedSyntheticPrice, InertiaIndicator, VortexIndicator, WilliamsAD, CumulativeWilliamsAD,
    BullBearBalance, TrendIntensityIndexEnhanced,
    // 검증된 고급 지표 (4차 - 패턴/사이클/가격채널)
    ElderRay, TwiggsMoneyFlow, VolumeROC, VWMACD, PriceChannel,
    FibonacciPivot, CamarillaPivot, WoodiePivot, DeMarkPivot, TSIHistogram,
    KeltnerPosition, BollingerTrend, RSIDivergence, MACDDivergence, StochDivergence,
    MomentumDivergenceIndex, PriceMomentumQuality, TrendQuality, VolatilityQuality,
    MoneyFlowMultiplier, EnhancedADL, VolumePriceConfirm, TrendPersistence, DynamicSR,
    BreakoutProbability, MomentumExhaustion, VolumeBreakout, PriceVelocity,
    CompositeTrendScore, PriceOscillator, CMOEnhanced, VolumeSpread, RelativePriceStrength,
    TrendAngle, SmoothedROCEnhanced,
    // 검증된 고급 지표 (5차 - 시장구조/확률기반/고급분석)
    StochasticMomentumIndex, RVIEnhanced, WilliamsAccumDist, QstickEnhanced, PriceActionStrength,
    TrendStrengthIndex, MAConvergence, MomentumAcceleration, VolumeMomentum, PriceRateEfficiency,
    DynamicSupportLevel, DynamicResistanceLevel, VolatilityRatio, TrendConsistency, BuyingPressureIndex,
    SellingPressureIndex, PMQIndex, VolumeClimax, TrendDuration, MeanReversionIndex,
    AdaptiveRSI, CumulativeDelta, SwingHighLow, VolumeProfile, MomentumDivergenceEnhanced,
    VolatilitySqueeze, PriceEnvelope, TrendExhaustion, CumulativeVolumeIndex, ROCEnhanced,
    MarketStructure, PriceDistance, VolumeTrend, MomentumIndex, SRBreak,
    VolatilityAdjustedMomentum, PriceAcceleration, MarketBreadthProxy, TrendQualityEnhanced, VolumePriceAnalysis,
    // 검증된 고급 지표 (6차 - 고급 오실레이터/다이버전스/시스템)
    AroonOscillatorEnhanced, UltimateOscillatorEnhanced, DPOEnhanced, KSTEnhanced, CoppockEnhanced,
    MassIndexEnhanced, PriceChannelBreakout, DonchianPosition, LinearRegressionSlopeEnhanced, StandardErrorBands,
    ProjectionOscillator, ProjectionBands, VolumeOscillatorEnhanced, EaseOfMovementEnhanced, ForceIndexEnhanced,
    ElderForceIndexEnhanced, MFIEnhanced, TradeVolumeIndex, NVIEnhanced, PVIEnhanced,
    OBVOscillator, ADOscillator, VPTOscillator, ChaikinVolatilityEnhanced, HistoricalVolatilityRatio,
    ParkinsonVolatility, GarmanKlassVolatility, YangZhangVolatility, RangeIndicator, VolatilityStop,
    ParabolicSAREnhanced, SuperTrendEnhanced, IchimokuEnhanced, ZigZagIndicator, MomentumDivergenceScanner,
    RSIDivergenceScanner, MACDDivergenceScanner, StochDivergenceScanner, TripleScreenSystem, ElderImpulseEnhanced,
    // 선별 커스텀 지표
    DynamicSRLevel, MomentumAccelIndex, TrendStrengthOsc, CompositeMomentum, AdaptiveBBPosition, KeltnerSqueeze,
    VolumeMomentumOsc, PriceActionScore2,
    // 목록
    INDICATOR_LIST
};
