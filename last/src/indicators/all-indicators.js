/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 검증된 핵심 기술적 지표 (Verified Core Technical Indicators)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 총 40개 검증된 핵심 지표만 포함
 * - 불필요한 지표, Enhanced 버전, 복잡한 커스텀 지표 모두 제거
 */

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 1. 추세 지표 (Trend Indicators)                                             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 1-1. SMA (Simple Moving Average)
export function SMA(closes, period) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

// 1-2. EMA (Exponential Moving Average)
export function EMA(closes, period) {
    if (closes.length < period) return null;
    const k = 2 / (period + 1);
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < closes.length; i++) {
        ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
}

// 1-3. WMA (Weighted Moving Average)
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

// 1-4. DEMA (Double Exponential Moving Average)
export function DEMA(closes, period) {
    const ema1 = EMA(closes, period);
    if (!ema1) return null;
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

// 1-5. HMA (Hull Moving Average)
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

// 1-6. VWMA (Volume Weighted Moving Average)
export function VWMA(closes, volumes, period) {
    if (closes.length < period) return null;
    let sumPV = 0, sumV = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        sumPV += closes[i] * volumes[i];
        sumV += volumes[i];
    }
    return sumV !== 0 ? sumPV / sumV : null;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 2. 모멘텀 지표 (Momentum Indicators)                                        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 2-1. RSI (Relative Strength Index)
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

// 2-2. Stochastic %K
export function StochasticK(highs, lows, closes, period = 14) {
    if (closes.length < period) return null;
    const highSlice = highs.slice(-period);
    const lowSlice = lows.slice(-period);
    const highest = Math.max(...highSlice);
    const lowest = Math.min(...lowSlice);
    const current = closes[closes.length - 1];
    return highest !== lowest ? ((current - lowest) / (highest - lowest)) * 100 : 50;
}

// 2-3. Stochastic %D
export function StochasticD(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
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

// 2-5. MACD
export function MACD(closes, fast = 12, slow = 26, signal = 9) {
    if (closes.length < slow + signal) return null;
    
    const k_fast = 2 / (fast + 1);
    const k_slow = 2 / (slow + 1);
    const k_signal = 2 / (signal + 1);
    
    let emaFast = closes.slice(0, fast).reduce((a, b) => a + b, 0) / fast;
    const fastSeries = [emaFast];
    for (let i = fast; i < closes.length; i++) {
        emaFast = closes[i] * k_fast + emaFast * (1 - k_fast);
        fastSeries.push(emaFast);
    }
    
    let emaSlow = closes.slice(0, slow).reduce((a, b) => a + b, 0) / slow;
    const slowSeries = [emaSlow];
    for (let i = slow; i < closes.length; i++) {
        emaSlow = closes[i] * k_slow + emaSlow * (1 - k_slow);
        slowSeries.push(emaSlow);
    }
    
    const offset = slow - fast;
    const macdSeries = [];
    for (let i = 0; i < slowSeries.length; i++) {
        const fastIdx = i + offset;
        if (fastIdx < fastSeries.length) {
            macdSeries.push(fastSeries[fastIdx] - slowSeries[i]);
        }
    }
    
    if (macdSeries.length < signal) return null;
    
    let signalLine = macdSeries.slice(0, signal).reduce((a, b) => a + b, 0) / signal;
    for (let i = signal; i < macdSeries.length; i++) {
        signalLine = macdSeries[i] * k_signal + signalLine * (1 - k_signal);
    }
    
    const macdLine = macdSeries[macdSeries.length - 1];
    const histogram = macdLine - signalLine;
    
    return { macd: macdLine, signal: signalLine, histogram: histogram };
}

// 2-6. ROC (Rate of Change)
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
    return past !== 0 ? ((current - past) / past) * 100 : 0;
}

// 2-8. CCI (Commodity Channel Index)
export function CCI(highs, lows, closes, period = 20) {
    if (closes.length < period) return null;
    const tp = [];
    for (let i = 0; i < closes.length; i++) {
        tp.push((highs[i] + lows[i] + closes[i]) / 3);
    }
    const tpSMA = SMA(tp, period);
    const tpSlice = tp.slice(-period);
    const meanDev = tpSlice.reduce((sum, v) => sum + Math.abs(v - tpSMA), 0) / period;
    return meanDev !== 0 ? (tp[tp.length - 1] - tpSMA) / (0.015 * meanDev) : 0;
}

// 2-9. CMO (Chande Momentum Oscillator)
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

// 2-10. UltimateOscillator
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

// 2-11. Awesome Oscillator
export function AwesomeOscillator(highs, lows) {
    const midpoints = highs.map((h, i) => (h + lows[i]) / 2);
    const sma5 = SMA(midpoints, 5);
    const sma34 = SMA(midpoints, 34);
    return sma5 && sma34 ? sma5 - sma34 : null;
}

// 2-12. PPO (Percentage Price Oscillator)
export function PPO(closes, fast = 12, slow = 26) {
    const emaFast = EMA(closes, fast);
    const emaSlow = EMA(closes, slow);
    if (!emaFast || !emaSlow || emaSlow === 0) return null;
    return ((emaFast - emaSlow) / emaSlow) * 100;
}

// 2-13. TRIX
export function TRIX(closes, period = 15) {
    if (closes.length < period * 3 + 1) return null;
    
    const k = 2 / (period + 1);
    
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
    
    const ema1 = calcEmaSeries(closes, period);
    const ema2 = calcEmaSeries(ema1, period);
    const ema3 = calcEmaSeries(ema2, period);
    
    if (ema3.length < 2) return null;
    
    const current = ema3[ema3.length - 1];
    const previous = ema3[ema3.length - 2];
    
    return previous !== 0 ? ((current - previous) / previous) * 100 : 0;
}

// 2-14. KST (Know Sure Thing)
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
    const signalVal = validKst.length >= 9 ? SMA(validKst, 9) : null;

    return {
        value,
        signal: signalVal,
        bullish: value != null && signalVal != null ? value > signalVal : null,
        bearish: value != null && signalVal != null ? value < signalVal : null
    };
}

// 2-15. RVI (Relative Vigor Index)
export function RVI(opens, highs, lows, closes, period = 10) {
    if (closes.length < period + 3) return null;
    
    let numSum = 0;
    let denSum = 0;
    
    for (let i = closes.length - period; i < closes.length; i++) {
        const closeOpen = closes[i] - opens[i];
        const highLow = highs[i] - lows[i];
        numSum += closeOpen;
        denSum += highLow;
    }
    
    if (denSum === 0) return null;
    return numSum / denSum;
}

// 2-16. DeMarker
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
    return total !== 0 ? deMax / total : 0.5;
}

// 2-17. ConnorsRSI
export function ConnorsRSI(closes, rsiPeriod = 3, streakPeriod = 2, rocPeriod = 100) {
    if (closes.length < Math.max(rsiPeriod, streakPeriod, rocPeriod) + 1) return null;
    
    const rsi = RSI(closes, rsiPeriod);
    
    let streak = 0;
    for (let i = closes.length - 1; i > 0 && i > closes.length - 10; i--) {
        if (closes[i] > closes[i - 1]) {
            if (streak >= 0) streak++;
            else break;
        } else if (closes[i] < closes[i - 1]) {
            if (streak <= 0) streak--;
            else break;
        } else break;
    }
    
    const streakRsi = 50 + streak * 5;
    
    const roc = ROC(closes, 1) || 0;
    let rocRank = 50;
    if (closes.length >= rocPeriod) {
        const rocValues = [];
        for (let i = 1; i < rocPeriod; i++) {
            const r = closes[closes.length - i - 1] !== 0 
                ? ((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1]) * 100 
                : 0;
            rocValues.push(r);
        }
        const belowCount = rocValues.filter(r => r < roc).length;
        rocRank = (belowCount / rocValues.length) * 100;
    }
    
    return (rsi + streakRsi + rocRank) / 3;
}

// 2-18. Schaff Trend Cycle
export function SchaffTrendCycle(closes, macdFast = 23, macdSlow = 50, stochPeriod = 10) {
    if (closes.length < macdSlow + stochPeriod) return null;
    
    const macd = MACD(closes, macdFast, macdSlow, 1);
    if (!macd) return null;
    
    const macdValues = [];
    for (let i = macdSlow; i <= closes.length; i++) {
        const m = MACD(closes.slice(0, i), macdFast, macdSlow, 1);
        if (m) macdValues.push(m.macd);
    }
    
    if (macdValues.length < stochPeriod) return null;
    
    const recentMacd = macdValues.slice(-stochPeriod);
    const highMacd = Math.max(...recentMacd);
    const lowMacd = Math.min(...recentMacd);
    
    if (highMacd === lowMacd) return 50;
    
    const stoch = ((macdValues[macdValues.length - 1] - lowMacd) / (highMacd - lowMacd)) * 100;
    return stoch;
}

// 2-19. Elder Impulse
export function ElderImpulse(closes, highs, lows, emaPeriod = 13) {
    if (closes.length < emaPeriod + 2) return null;
    
    const ema = EMA(closes, emaPeriod);
    const prevEma = EMA(closes.slice(0, -1), emaPeriod);
    const macd = MACD(closes, 12, 26, 9);
    const prevMacd = MACD(closes.slice(0, -1), 12, 26, 9);
    
    if (!ema || !prevEma || !macd || !prevMacd) return null;
    
    const emaRising = ema > prevEma;
    const macdRising = macd.histogram > prevMacd.histogram;
    
    if (emaRising && macdRising) return 1;
    if (!emaRising && !macdRising) return -1;
    return 0;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 3. 변동성 지표 (Volatility Indicators)                                      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 3-1. ATR (Average True Range)
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

// 3-3. Bollinger Bands
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

// 3-4. Keltner Channel
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

// 3-5. Standard Deviation
export function StandardDeviation(closes, period = 20) {
    if (closes.length < period) return null;
    const sma = SMA(closes, period);
    const slice = closes.slice(-period);
    const variance = slice.reduce((sum, v) => sum + Math.pow(v - sma, 2), 0) / period;
    return Math.sqrt(variance);
}

// 3-6. Bollinger %B
export function BollingerPercentB(closes, period = 20, stdDev = 2) {
    const bb = BollingerBands(closes, period, stdDev);
    if (!bb) return null;
    return bb.position;
}

// 3-7. Bollinger Width
export function BollingerWidth(closes, period = 20, stdDev = 2) {
    const bb = BollingerBands(closes, period, stdDev);
    if (!bb) return null;
    return bb.bandwidth;
}

// 3-8. Squeeze Indicator
export function SqueezeIndicator(highs, lows, closes) {
    const bb = BollingerBands(closes, 20, 2);
    const kc = KeltnerChannel(highs, lows, closes, 20, 10, 1.5);
    if (!bb || !kc) return null;
    const squeezeOn = bb.lower > kc.lower && bb.upper < kc.upper;
    return {
        squeezeOn,
        bandwidth: bb.bandwidth,
        upper: bb.upper,
        middle: bb.middle,
        lower: bb.lower
    };
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 4. 거래량 지표 (Volume Indicators)                                          │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 4-1. OBV (On Balance Volume)
export function OBV(closes, volumes) {
    if (closes.length < 2) return null;
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) obv += volumes[i];
        else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    }
    return obv;
}

// 4-2. Volume Ratio
export function VolumeRatio(volumes, period = 20) {
    const avg = SMA(volumes, period);
    if (!avg || avg === 0) return null;
    return volumes[volumes.length - 1] / avg;
}

// 4-3. MFI (Money Flow Index)
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

// 4-4. CMF (Chaikin Money Flow)
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

// 4-5. ADL (Accumulation/Distribution Line)
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

// 4-6. Chaikin Oscillator
export function ChaikinOscillator(highs, lows, closes, volumes) {
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

// 4-7. VWAP (Volume Weighted Average Price)
export function VWAP(highs, lows, closes, volumes) {
    let cumTPV = 0, cumVol = 0;
    for (let i = 0; i < closes.length; i++) {
        const tp = (highs[i] + lows[i] + closes[i]) / 3;
        cumTPV += tp * volumes[i];
        cumVol += volumes[i];
    }
    return cumVol !== 0 ? cumTPV / cumVol : null;
}

// 4-8. Force Index
export function ForceIndex(closes, volumes, period = 13) {
    if (closes.length < 2) return null;
    const forces = [];
    for (let i = 1; i < closes.length; i++) {
        forces.push((closes[i] - closes[i - 1]) * volumes[i]);
    }
    return EMA(forces, period);
}

// 4-9. Volume Oscillator
export function VolumeOscillator(volumes, fast = 5, slow = 10) {
    const emaFast = EMA(volumes, fast);
    const emaSlow = EMA(volumes, slow);
    if (!emaFast || !emaSlow || emaSlow === 0) return null;
    return ((emaFast - emaSlow) / emaSlow) * 100;
}

// 4-10. Klinger Oscillator
export function KlingerOscillator(highs, lows, closes, volumes) {
    if (closes.length < 55) return null;
    
    const vf = [];
    let prevCm = 0;
    let prevTrend = 0;
    for (let i = 1; i < closes.length; i++) {
        const hlc = highs[i] + lows[i] + closes[i];
        const prevHlc = highs[i-1] + lows[i-1] + closes[i-1];
        const trend = hlc > prevHlc ? 1 : -1;
        const dm = highs[i] - lows[i];
        // CM: 트렌드 전환 시 DM만, 유지 시 prevCm + DM
        const cm = (trend === prevTrend && i > 1) ? prevCm + dm : dm;
        prevCm = cm;
        prevTrend = trend;
        vf.push(volumes[i] * Math.abs(2 * dm / (cm || 1) - 1) * trend * 100);
    }
    
    const ema34 = EMA(vf, 34);
    const ema55 = EMA(vf, 55);
    
    return ema34 && ema55 ? ema34 - ema55 : null;
}

// 4-11. Ease of Movement
export function EaseOfMovement(highs, lows, volumes, period = 14) {
    if (highs.length < period + 1) return null;
    
    const emv = [];
    for (let i = 1; i < highs.length; i++) {
        const dm = ((highs[i] + lows[i]) / 2) - ((highs[i-1] + lows[i-1]) / 2);
        const br = (volumes[i] / 100000000) / (highs[i] - lows[i] || 1);
        emv.push(dm / (br || 1));
    }
    
    return SMA(emv, period);
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 5. 추세 강도 지표 (Trend Strength Indicators)                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 5-1. ADX (Average Directional Index)
export function ADX(highs, lows, closes, period = 14) {
    if (closes.length < period * 2) return null;
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

// 5-2. +DI
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

// 5-3. -DI
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
    const highIdx = slice.lastIndexOf(Math.max(...slice));
    return ((period - (period - 1 - highIdx)) / period) * 100;
}

// 5-5. Aroon Down
export function AroonDown(lows, period = 25) {
    if (lows.length < period) return null;
    const slice = lows.slice(-period);
    const lowIdx = slice.lastIndexOf(Math.min(...slice));
    return ((period - (period - 1 - lowIdx)) / period) * 100;
}

// 5-6. Aroon Oscillator
export function AroonOscillator(highs, lows, period = 25) {
    const up = AroonUp(highs, period);
    const down = AroonDown(lows, period);
    return up !== null && down !== null ? up - down : null;
}

// 5-7. Vortex +VI
export function VortexPlus(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    let sumVM = 0, sumTR = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        sumVM += Math.abs(highs[i] - lows[i - 1]);
        sumTR += TrueRange(highs[i], lows[i], closes[i - 1]);
    }
    return sumTR !== 0 ? sumVM / sumTR : null;
}

// 5-8. Vortex -VI
export function VortexMinus(highs, lows, closes, period = 14) {
    if (closes.length < period + 1) return null;
    let sumVM = 0, sumTR = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
        sumVM += Math.abs(lows[i] - highs[i - 1]);
        sumTR += TrueRange(highs[i], lows[i], closes[i - 1]);
    }
    return sumTR !== 0 ? sumVM / sumTR : null;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 6. 회귀 지표 (Regression Indicators)                                        │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 6-1. Linear Regression Slope
export function LinearRegressionSlope(closes, period = 14) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const n = period;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += slice[i];
        sumXY += i * slice[i];
        sumX2 += i * i;
    }
    const denom = n * sumX2 - sumX * sumX;
    return denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
}

// 6-2. Chande Forecast Oscillator
export function ChandeForecastOscillator(closes, period = 14) {
    if (closes.length < period) return null;
    const slice = closes.slice(-period);
    const n = period;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += slice[i];
        sumXY += i * slice[i];
        sumX2 += i * i;
    }
    
    const denom = n * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;
    const forecast = slope * (n - 1) + intercept;
    const current = closes[closes.length - 1];
    
    return current !== 0 ? ((current - forecast) / current) * 100 : 0;
}


/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ 7. 복합 지표 (Composite Indicators)                                         │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// 7-1. StochRSI
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

// 7-2. Bull Power
export function BullPower(highs, closes, period = 13) {
    const ema = EMA(closes, period);
    if (!ema) return null;
    return highs[highs.length - 1] - ema;
}

// 7-3. Bear Power
export function BearPower(lows, closes, period = 13) {
    const ema = EMA(closes, period);
    if (!ema) return null;
    return lows[lows.length - 1] - ema;
}


/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * INDICATOR_LIST - 전략 엔진에서 사용하는 지표 정의
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const INDICATOR_LIST = [
    // ─────────────────────────────────────────────────────────────────────────
    // 추세 지표
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'SMA', fn: SMA, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [3, 5, 7, 10, 15, 20, 30],
        sellPeriods: [15, 20, 30, 50, 75, 100],
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > SMA' },
                { type: 'cross_up', desc: '가격이 SMA 상향돌파' },
                { type: 'slope_up', desc: 'SMA 기울기 상승' },
            ],
            sell: [
                { type: 'price_below', desc: '가격 < SMA' },
                { type: 'cross_down', desc: '가격이 SMA 하향돌파' },
                { type: 'slope_down', desc: 'SMA 기울기 하락' },
            ]
        }
    },
    { 
        name: 'EMA', fn: EMA, params: ['closes', 'period'], category: 'trend',
        buyPeriods: [3, 5, 8, 12, 15, 20, 26],
        sellPeriods: [15, 20, 26, 35, 50, 75, 100],
        signals: {
            buy: [
                { type: 'price_above', desc: '가격 > EMA' },
                { type: 'cross_up', desc: 'EMA 상향돌파' },
                { type: 'ema_golden', with: 'EMA', desc: 'EMA 골든크로스' },
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
        buyPeriods: [5, 9, 14, 21],
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
            buy: [{ type: 'price_above' }, { type: 'vwma_above_sma', desc: 'VWMA > SMA' }],
            sell: [{ type: 'price_below' }, { type: 'vwma_below_sma', desc: 'VWMA < SMA' }]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 모멘텀 지표
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'RSI', fn: RSI, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [3, 5, 7, 9, 12, 14],
        sellPeriods: [9, 12, 14, 18, 21],
        signals: {
            buy: [
                { type: 'lt', values: [20, 25, 30], desc: '과매도' },
                { type: 'cross_up', values: [30, 50], desc: '상향돌파' },
                { type: 'rising_from_oversold', desc: 'RSI 과매도에서 상승' },
            ],
            sell: [
                { type: 'gt', values: [70, 75, 80], desc: '과매수' },
                { type: 'cross_down', values: [70, 50], desc: '하향돌파' },
                { type: 'falling_from_overbought', desc: 'RSI 과매수에서 하락' },
            ]
        }
    },
    { 
        name: 'StochasticK', fn: StochasticK, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [3, 5, 7, 9, 14],
        sellPeriods: [7, 9, 14, 21],
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
        buyPeriods: [5, 7, 10, 14],
        sellPeriods: [10, 14, 18, 21],
        signals: {
            buy: [
                { type: 'lt', values: [-80, -85, -90], desc: '과매도' },
                { type: 'cross_up', values: [-80], desc: '-80 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [-20, -15, -10], desc: '과매수' },
                { type: 'cross_down', values: [-20], desc: '-20 하향돌파' },
            ]
        }
    },
    { 
        name: 'MACD', fn: MACD, params: ['closes', 'fast', 'slow', 'signal'], category: 'momentum',
        buyParamSets: [[5, 13, 5], [8, 17, 9], [12, 26, 9], [5, 35, 5]],
        sellParamSets: [[8, 17, 9], [12, 26, 9], [15, 30, 9]],
        signals: {
            buy: [
                { type: 'golden_cross', desc: 'MACD 골든크로스' },
                { type: 'histogram_positive', desc: '히스토그램 양전환' },
                { type: 'histogram_increasing', desc: '히스토그램 증가' },
                { type: 'above_zero', desc: 'MACD > 0' },
                { type: 'cross_up_zero', desc: 'MACD 0선 상향돌파' },
            ],
            sell: [
                { type: 'dead_cross', desc: 'MACD 데드크로스' },
                { type: 'histogram_negative', desc: '히스토그램 음전환' },
                { type: 'histogram_decreasing', desc: '히스토그램 감소' },
                { type: 'below_zero', desc: 'MACD < 0' },
                { type: 'cross_down_zero', desc: 'MACD 0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'ROC', fn: ROC, params: ['closes', 'period'], category: 'momentum',
        buyPeriods: [3, 5, 7, 9, 12],
        sellPeriods: [9, 12, 14, 18, 25],
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
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [-2, -5], desc: '2~5% 이상 하락' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    { 
        name: 'CCI', fn: CCI, params: ['highs', 'lows', 'closes', 'period'], category: 'momentum',
        buyPeriods: [5, 7, 10, 14, 20],
        sellPeriods: [10, 14, 20, 28],
        signals: {
            buy: [
                { type: 'lt', values: [-100, -150, -200], desc: '과매도' },
                { type: 'cross_up', values: [-100, 0], desc: '상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [100, 150, 200], desc: '과매수' },
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
            buy: [{ type: 'lt', values: [30, 35], desc: '과매도' }],
            sell: [{ type: 'gt', values: [65, 70], desc: '과매수' }]
        }
    },
    { 
        name: 'AwesomeOscillator', fn: AwesomeOscillator, params: ['highs', 'lows'], category: 'momentum',
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
        name: 'PPO', fn: PPO, params: ['closes', 'fast', 'slow'], category: 'momentum',
        buyParamSets: [[5, 13], [8, 17], [12, 26], [5, 35]],
        sellParamSets: [[8, 17], [12, 26], [15, 30]],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: 'PPO 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: 'PPO 음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
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
            buy: [{ type: 'gt', values: [0], desc: 'RVI 양수' }],
            sell: [{ type: 'lt', values: [0], desc: 'RVI 음수' }]
        }
    },
    { 
        name: 'DeMarker', fn: DeMarker, params: ['highs', 'lows', 'period'], category: 'momentum',
        buyPeriods: [7, 10, 13, 14],
        sellPeriods: [10, 13, 14, 18],
        signals: {
            buy: [
                { type: 'lt', values: [0.2, 0.3], desc: '과매도' },
                { type: 'cross_up', values: [0.3], desc: '0.3 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [0.7, 0.8], desc: '과매수' },
                { type: 'cross_down', values: [0.7], desc: '0.7 하향돌파' },
            ]
        }
    },
    { 
        name: 'ConnorsRSI', fn: ConnorsRSI, params: ['closes'], category: 'momentum',
        signals: {
            buy: [{ type: 'lt', values: [10, 15, 20], desc: '극단적 과매도' }],
            sell: [{ type: 'gt', values: [80, 85, 90], desc: '극단적 과매수' }]
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
            buy: [{ type: 'eq', values: [1], desc: '녹색 (상승)' }],
            sell: [{ type: 'eq', values: [-1], desc: '빨강 (하락)' }]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 변동성 지표
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'ATR', fn: ATR, params: ['highs', 'lows', 'closes', 'period'], category: 'volatility',
        buyPeriods: [5, 7, 10, 14],
        sellPeriods: [10, 14, 18, 21],
        signals: {
            buy: [
                { type: 'expanding', desc: 'ATR 확대' },
                { type: 'low_volatility', desc: 'ATR 낮음' },
            ],
            sell: [
                { type: 'contracting', desc: 'ATR 축소' },
                { type: 'extreme_high', desc: 'ATR 극단적 높음' },
            ]
        }
    },
    { 
        name: 'BollingerBands', fn: BollingerBands, params: ['closes', 'period', 'stdDev'], category: 'volatility',
        buyParamSets: [[10, 1.5], [15, 2], [20, 2], [20, 2.5]],
        sellParamSets: [[15, 2], [20, 2], [20, 2.5], [25, 3]],
        signals: {
            buy: [
                { type: 'touch_lower', desc: '하단 밴드 터치' },
                { type: 'below_lower', desc: '하단 밴드 이탈' },
                { type: 'squeeze', desc: '밴드 수축' },
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
        name: 'StandardDeviation', fn: StandardDeviation, params: ['closes', 'period'], category: 'volatility',
        buyPeriods: [10, 15, 20, 25],
        sellPeriods: [15, 20, 25],
        signals: {
            buy: [{ type: 'low', desc: '낮은 표준편차' }],
            sell: [{ type: 'extreme_high', desc: '극단적 표준편차' }]
        }
    },
    { 
        name: 'BollingerPercentB', fn: BollingerPercentB, params: ['closes', 'period'], category: 'price_position',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'lt', values: [0, 10, 20], desc: '%B 하단' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'gt', values: [80, 90, 100], desc: '%B 상단' },
                { type: 'cross_down', values: [100], desc: '100 하향돌파' },
            ]
        }
    },
    { 
        name: 'BollingerWidth', fn: BollingerWidth, params: ['closes', 'period'], category: 'price_position',
        buyPeriods: [20],
        sellPeriods: [20],
        signals: {
            buy: [
                { type: 'squeeze', percentile: [10, 20], desc: '밴드폭 최소' },
                { type: 'expanding', desc: '밴드폭 확대 시작' },
            ],
            sell: [{ type: 'extreme_wide', percentile: [80, 90], desc: '밴드폭 최대' }]
        }
    },
    { 
        name: 'SqueezeIndicator', fn: SqueezeIndicator, params: ['highs', 'lows', 'closes'], category: 'composite',
        signals: {
            buy: [
                { type: 'squeeze_on', desc: '스퀴즈 ON' },
                { type: 'squeeze_release_up', desc: '스퀴즈 해제 + 상승' },
            ],
            sell: [{ type: 'squeeze_release_down', desc: '스퀴즈 해제 + 하락' }]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 거래량 지표
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
        buyPeriods: [5, 7, 10, 14, 20],
        sellPeriods: [10, 14, 20, 25],
        signals: {
            buy: [{ type: 'gt', values: [1.5, 2, 2.5], desc: '거래량 급증' }],
            sell: [{ type: 'lt', values: [0.5, 0.7], desc: '거래량 급감' }]
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
                { type: 'gt', values: [0, 0.05, 0.1], desc: 'CMF 양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0, -0.05, -0.1], desc: 'CMF 음수' },
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
        buyPeriods: [1, 2, 3, 5],
        sellPeriods: [2, 5, 8, 13],
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
        buyParamSets: [[3, 7], [5, 10], [5, 15], [7, 14]],
        sellParamSets: [[5, 10], [5, 15], [7, 14], [12, 26]],
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
                { type: 'gt', values: [0], desc: '양수' },
                { type: 'cross_up', values: [0], desc: '0선 상향돌파' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '음수' },
                { type: 'cross_down', values: [0], desc: '0선 하향돌파' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 추세 강도 지표
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'ADX', fn: ADX, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14, 18],
        sellPeriods: [10, 14, 18, 21],
        signals: {
            buy: [
                { type: 'gt', values: [20, 25, 30], desc: 'ADX 강한 추세' },
                { type: 'rising', desc: 'ADX 상승' },
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
                { type: 'gt_minus_di', desc: '+DI > -DI' },
                { type: 'cross_up_minus_di', desc: '+DI가 -DI 상향돌파' },
            ],
            sell: [{ type: 'lt_minus_di', desc: '+DI < -DI' }]
        }
    },
    { 
        name: 'MinusDI', fn: MinusDI, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14],
        sellPeriods: [10, 14, 18],
        signals: {
            buy: [{ type: 'lt_plus_di', desc: '-DI < +DI' }],
            sell: [
                { type: 'gt_plus_di', desc: '-DI > +DI' },
                { type: 'cross_up_plus_di', desc: '-DI가 +DI 상향돌파' },
            ]
        }
    },
    { 
        name: 'AroonUp', fn: AroonUp, params: ['highs', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14, 20, 25],
        sellPeriods: [14, 20, 25],
        signals: {
            buy: [
                { type: 'gt', values: [70, 80, 90], desc: '강한 상승 추세' },
                { type: 'cross_up', values: [50], desc: '50 상향돌파' },
            ],
            sell: [{ type: 'lt', values: [30, 20, 10], desc: '약한 상승 추세' }]
        }
    },
    { 
        name: 'AroonDown', fn: AroonDown, params: ['lows', 'period'], category: 'trend_strength',
        buyPeriods: [14, 20, 25],
        sellPeriods: [7, 10, 14, 20, 25],
        signals: {
            buy: [{ type: 'lt', values: [30, 20, 10], desc: '약한 하락 추세' }],
            sell: [
                { type: 'gt', values: [70, 80, 90], desc: '강한 하락 추세' },
                { type: 'cross_up', values: [50], desc: '50 상향돌파' },
            ]
        }
    },
    { 
        name: 'AroonOscillator', fn: AroonOscillator, params: ['highs', 'lows', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14, 20, 25],
        sellPeriods: [14, 20, 25],
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
        buyPeriods: [7, 10, 14, 18, 21],
        sellPeriods: [14, 18, 21],
        signals: {
            buy: [
                { type: 'gt_minus', desc: 'VI+ > VI-' },
                { type: 'cross_up_minus', desc: 'VI+ 상향돌파' },
            ],
            sell: [{ type: 'lt_minus', desc: 'VI+ < VI-' }]
        }
    },
    { 
        name: 'VortexMinus', fn: VortexMinus, params: ['highs', 'lows', 'closes', 'period'], category: 'trend_strength',
        buyPeriods: [7, 10, 14],
        sellPeriods: [10, 14, 18, 21],
        signals: {
            buy: [{ type: 'lt_plus', desc: 'VI- < VI+' }],
            sell: [
                { type: 'gt_plus', desc: 'VI- > VI+' },
                { type: 'cross_up_plus', desc: 'VI- 상향돌파' },
            ]
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // 회귀 지표
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'LinearRegressionSlope', fn: LinearRegressionSlope, params: ['closes', 'period'], category: 'regression',
        buyPeriods: [7, 10, 14, 18],
        sellPeriods: [10, 14, 18, 21, 25],
        signals: {
            buy: [
                { type: 'gt', values: [0], desc: '기울기 양수' },
                { type: 'increasing', desc: '기울기 증가' },
            ],
            sell: [
                { type: 'lt', values: [0], desc: '기울기 음수' },
                { type: 'decreasing', desc: '기울기 감소' },
            ]
        }
    },
    { 
        name: 'ChandeForecastOscillator', fn: ChandeForecastOscillator, params: ['closes', 'period'], category: 'regression',
        buyPeriods: [14],
        sellPeriods: [14, 20],
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
    // 복합 지표
    // ─────────────────────────────────────────────────────────────────────────
    { 
        name: 'StochRSI', fn: StochRSI, params: ['closes', 'period'], category: 'composite',
        buyPeriods: [7, 10, 14, 18],
        sellPeriods: [10, 14, 18, 21],
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
        name: 'BullPower', fn: BullPower, params: ['highs', 'closes', 'period'], category: 'composite',
        buyPeriods: [7, 10, 13, 18],
        sellPeriods: [10, 13, 18],
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
        buyPeriods: [7, 10, 13],
        sellPeriods: [10, 13, 18],
        signals: {
            buy: [{ type: 'increasing_from_negative', desc: 'Bear Power 음수에서 상승' }],
            sell: [
                { type: 'lt', values: [0], desc: 'Bear Power 음수' },
                { type: 'decreasing', desc: 'Bear Power 감소' },
            ]
        }
    },
];
