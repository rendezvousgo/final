import { RSI, MACD, BollingerBands, EMA, SMA, ATR, Stochastic, ADX } from 'technicalindicators';

/**
 * 기술적 지표 계산 클래스
 * - 모든 지표는 숫자값으로 반환
 * - 전략에서 직접 조건 비교
 */
export class TechnicalIndicators {
    /**
     * VWMA (Volume Weighted Moving Average) 계산
     * @param {number[]} closePrices - 종가 배열
     * @param {number[]} volumes - 거래량 배열
     * @param {number} period - 기간
     * @returns {number} VWMA 값
     */
    static calculateVWMA(closePrices, volumes, period = 20) {
        if (!closePrices || !volumes || closePrices.length < period || volumes.length < period) return null;
        let sumPV = 0;
        let sumV = 0;
        for (let i = closePrices.length - period; i < closePrices.length; i++) {
            sumPV += closePrices[i] * volumes[i];
            sumV += volumes[i];
        }
        return sumV !== 0 ? sumPV / sumV : null;
    }
    /**
     * RSI (Relative Strength Index) 계산
     * @param {number[]} closePrices - 종가 배열
     * @param {number} period - 기간 (기본: 14)
     * @returns {number} RSI 값 (0-100)
     */
    static calculateRSI(closePrices, period = 14) {
        const rsi = RSI.calculate({
            values: closePrices,
            period: period
        });
        return rsi.length > 0 ? rsi[rsi.length - 1] : null;
    }

    /**
     * MACD (Moving Average Convergence Divergence) 계산
     * @param {number[]} closePrices - 종가 배열
     * @returns {Object} MACD, Signal, Histogram
     */
    static calculateMACD(closePrices) {
        const macd = MACD.calculate({
            values: closePrices,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });
        if (!macd || macd.length === 0) return null;
        const latest = macd[macd.length - 1];
        const prev = macd[macd.length - 2];
        const prev2 = macd[macd.length - 3];
        const prev3 = macd[macd.length - 4];
        
        if (!latest) return null;
        
        return {
            MACD: latest.MACD,
            signal: latest.signal,
            histogram: latest.histogram,
            // 이전 값 (크로스 감지용)
            prevMACD: prev?.MACD,
            prevSignal: prev?.signal,
            prevHistogram: prev?.histogram,
            // 2단계, 3단계 이전값 (연속 패턴용)
            prev2Histogram: prev2?.histogram,
            prev3Histogram: prev3?.histogram,
            prev2MACD: prev2?.MACD,
            prev3MACD: prev3?.MACD
        };
    }

    /**
     * 볼린저 밴드 (Bollinger Bands) 계산
     * @param {number[]} closePrices - 종가 배열
     * @param {number} period - 기간 (기본: 20)
     * @param {number} stdDev - 표준편차 배수 (기본: 2)
     * @returns {Object} upper, middle, lower 밴드
     */
    static calculateBollingerBands(closePrices, period = 20, stdDev = 2) {
        const bb = BollingerBands.calculate({
            values: closePrices,
            period: period,
            stdDev: stdDev
        });
        
        const latest = bb[bb.length - 1];
        const currentPrice = closePrices[closePrices.length - 1];
        
        if (!latest) return null;
        
        const bandWidth = latest.upper - latest.lower;
        const position = bandWidth !== 0 ? ((currentPrice - latest.lower) / bandWidth) * 100 : 50;
        const bandwidth = latest.middle !== 0 ? (bandWidth / latest.middle) * 100 : 0;
        
        return {
            upper: latest.upper,
            middle: latest.middle,
            lower: latest.lower,
            position: position,      // 0=하단, 50=중간, 100=상단
            bandwidth: bandwidth     // 밴드 폭 (%)
        };
    }

    /**
     * ATR (Average True Range) - 변동성 측정
     * @param {Array} klines - 캔들 데이터 [{high, low, close}]
     * @param {number} period - 기간 (기본: 14)
     * @returns {number} ATR 값
     */
    static calculateATR(klines, period = 14) {
        const atr = ATR.calculate({
            high: klines.map(k => k.high),
            low: klines.map(k => k.low),
            close: klines.map(k => k.close),
            period: period
        });
        return atr.length > 0 ? atr[atr.length - 1] : null;
    }

    /**
     * Stochastic - 모멘텀 오실레이터
     * @param {Array} klines - 캔들 데이터
     * @param {number} period - 기간 (기본: 14)
     * @returns {Object} k, d 값 (0-100)
     */
    static calculateStochastic(klines, period = 14, signalPeriod = 3) {
        const stoch = Stochastic.calculate({
            high: klines.map(k => k.high),
            low: klines.map(k => k.low),
            close: klines.map(k => k.close),
            period: period,
            signalPeriod: signalPeriod
        });
        
        const latest = stoch[stoch.length - 1];
        return latest ? { k: latest.k, d: latest.d } : null;
    }

    /**
     * ADX (Average Directional Index) - 추세 강도
     * @param {Array} klines - 캔들 데이터
     * @param {number} period - 기간 (기본: 14)
     * @returns {Object} adx, pdi, mdi 값
     */
    static calculateADX(klines, period = 14) {
        const adx = ADX.calculate({
            high: klines.map(k => k.high),
            low: klines.map(k => k.low),
            close: klines.map(k => k.close),
            period: period
        });
        
        const latest = adx[adx.length - 1];
        return latest ? {
            adx: latest.adx,    // 추세 강도 (25 이상 = 강한 추세)
            pdi: latest.pdi,    // +DI (상승 방향)
            mdi: latest.mdi     // -DI (하락 방향)
        } : null;
    }

    /**
     * EMA (Exponential Moving Average) 계산
     * @param {number[]} closePrices - 종가 배열
     * @param {number} period - 기간
     * @returns {number} EMA 값
     */
    static calculateEMA(closePrices, period = 20) {
        const ema = EMA.calculate({
            values: closePrices,
            period: period
        });
        return ema.length > 0 ? ema[ema.length - 1] : null;
    }

    /**
     * SMA (Simple Moving Average) 계산
     * @param {number[]} closePrices - 종가 배열
     * @param {number} period - 기간
     * @returns {number} SMA 값
     */
    static calculateSMA(closePrices, period = 20) {
        const sma = SMA.calculate({
            values: closePrices,
            period: period
        });
        return sma.length > 0 ? sma[sma.length - 1] : null;
    }

    /**
     * 모든 지표를 한 번에 계산
     * @param {number[]} closePrices - 종가 배열
     * @param {Array} klines - 캔들 데이터 (ATR, Stochastic, ADX용)
     * @returns {Object} 모든 기술적 지표
     */
    static calculateAll(closePrices, klines = null) {
        if (!closePrices || closePrices.length === 0) return {};

        const currentPrice = closePrices[closePrices.length - 1];
        const prevPrice = closePrices.length > 1 ? closePrices[closePrices.length - 2] : null;
        const prev2Price = closePrices.length > 2 ? closePrices[closePrices.length - 3] : null;
        
        const result = {
            price: currentPrice,
            close: currentPrice,  // price와 동일 (호환성)
            prevClose: prevPrice,
            prev2Close: prev2Price,
            priceChange: prevPrice != null && prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0,
            rsi: this.calculateRSI(closePrices),
            macd: this.calculateMACD(closePrices),
            bollingerBands: this.calculateBollingerBands(closePrices),
            ema10: this.calculateEMA(closePrices, 10),
            ema20: this.calculateEMA(closePrices, 20),
            ema50: this.calculateEMA(closePrices, 50),
            ema100: this.calculateEMA(closePrices, 100),
            ema200: this.calculateEMA(closePrices, 200),
            sma20: this.calculateSMA(closePrices, 20),
            sma50: this.calculateSMA(closePrices, 50),
            sma100: this.calculateSMA(closePrices, 100),
            sma200: this.calculateSMA(closePrices, 200)
        };

        // Bollinger 이전 밴드 폭 (width_expanding 등 이전 값 비교용)
        if (result.bollingerBands && closePrices.length > 1) {
            const prevBb = this.calculateBollingerBands(closePrices.slice(0, -1));
            if (prevBb?.bandwidth != null) {
                result.bollingerBands.prevBandwidth = prevBb.bandwidth;
            }
        }
        
        // klines가 있으면 추가 지표 계산
        if (klines && klines.length > 0) {
            result.atr = this.calculateATR(klines);
            result.stochastic = this.calculateStochastic(klines);
            const adxResult = this.calculateADX(klines);
            result.adx = adxResult ? {
                ...adxResult,
                plusDI: adxResult.pdi,  // 호환성
                minusDI: adxResult.mdi  // 호환성
            } : null;
            // ADX 호환성 (최상위 레벨)
            if (adxResult) {
                result.plusDI = adxResult.pdi;
                result.minusDI = adxResult.mdi;
            }
            
            // 캔들 데이터 추가
            const lastCandle = klines[klines.length - 1];
            const prevCandle = klines[klines.length - 2];
            const prev2Candle = klines[klines.length - 3];
            
            if (lastCandle) {
                result.open = lastCandle.open;
                result.high = lastCandle.high;
                result.low = lastCandle.low;
                result.volume = lastCandle.volume;
                
                // 캔들 타임스탬프에서 시간 정보 추출 (백테스팅 재현성용)
                const candleTime = lastCandle.openTime || lastCandle.timestamp || lastCandle.time;
                if (candleTime) {
                    const date = new Date(candleTime);
                    result.candleHour = date.getUTCHours();           // 0-23 UTC 시간
                    result.candleMinute = date.getUTCMinutes();       // 0-59 분
                    result.candleDay = date.getUTCDay();              // 0=일, 1=월, ... 6=토
                    result.candleDayOfMonth = date.getUTCDate();      // 1-31
                    result.candleMonth = date.getUTCMonth() + 1;      // 1-12
                    result.candleTimestamp = candleTime;
                }
            }
            if (prevCandle) {
                result.prevOpen = prevCandle.open;
                result.prevHigh = prevCandle.high;
                result.prevLow = prevCandle.low;
                result.prevVolume = prevCandle.volume;
            }
            if (prev2Candle) {
                result.prev2Open = prev2Candle.open;
                result.prev2High = prev2Candle.high;
                result.prev2Low = prev2Candle.low;
                result.prev2Volume = prev2Candle.volume;
            }
            
            // 평균 거래량 계산 (최근 20개)
            const volumes = klines.slice(-20).map(k => k.volume).filter(v => v > 0);
            result.avgVolume = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
            result.volumeRatio = result.avgVolume > 0 ? result.volume / result.avgVolume : 1;

            // VWMA (20) 계산
            const allVolumes = klines.map(k => k.volume);
            result.vwma = this.calculateVWMA(closePrices, allVolumes, 20);
            
            // 연속 양봉/음봉 계산
            let consecutiveGreen = 0;
            let consecutiveRed = 0;
            for (let i = klines.length - 1; i >= 0 && i >= klines.length - 10; i--) {
                const candle = klines[i];
                if (candle.close > candle.open) {
                    if (consecutiveRed === 0) consecutiveGreen++;
                    else break;
                } else if (candle.close < candle.open) {
                    if (consecutiveGreen === 0) consecutiveRed++;
                    else break;
                } else {
                    break;
                }
            }
            result.consecutiveGreen = consecutiveGreen;
            result.consecutiveRed = consecutiveRed;
            
            // 이전 RSI 값 계산 (다이버전스용)
            if (closePrices.length > 15) {
                const prevPrices = closePrices.slice(0, -1);
                const prev2Prices = closePrices.slice(0, -2);
                const prev3Prices = closePrices.slice(0, -3);
                result.prevRsi = this.calculateRSI(prevPrices);
                result.prev2Rsi = this.calculateRSI(prev2Prices);
                result.prev3Rsi = this.calculateRSI(prev3Prices);
                
                // 이전 EMA 값 계산 (크로스 감지용)
                result.prevEma10 = this.calculateEMA(prevPrices, 10);
                result.prevEma20 = this.calculateEMA(prevPrices, 20);
                result.prevEma50 = this.calculateEMA(prevPrices, 50);
                result.prevEma100 = this.calculateEMA(prevPrices, 100);
                
                // 이전 SMA 값 계산
                result.prevSma20 = this.calculateSMA(prevPrices, 20);
                result.prevSma50 = this.calculateSMA(prevPrices, 50);
            }
            
            // 이전 ADX 값 계산 (트렌드 변화 감지용)
            if (klines.length > 15) {
                const prevKlines = klines.slice(0, -1);
                const prev2Klines = klines.slice(0, -2);
                const prev3Klines = klines.slice(0, -3);
                
                const prevAdxResult = this.calculateADX(prevKlines);
                const prev2AdxResult = this.calculateADX(prev2Klines);
                if (prevAdxResult) {
                    result.prevAdx = prevAdxResult.adx;
                    result.prevPlusDI = prevAdxResult.pdi;
                    result.prevMinusDI = prevAdxResult.mdi;
                    // adx 객체에도 추가
                    if (result.adx) {
                        result.adx.prevAdx = prevAdxResult.adx;
                        result.adx.prevPlusDI = prevAdxResult.pdi;
                        result.adx.prevMinusDI = prevAdxResult.mdi;
                        result.adx.prevDiPlus = prevAdxResult.pdi;
                        result.adx.prevDiMinus = prevAdxResult.mdi;
                    }
                }
                // 2봉 전 ADX DI 값 추가
                if (prev2AdxResult && result.adx) {
                    result.adx.prev2PlusDI = prev2AdxResult.pdi;
                    result.adx.prev2MinusDI = prev2AdxResult.mdi;
                }
                
                // 이전 Stochastic 값 계산
                const prevStoch = this.calculateStochastic(prevKlines);
                const prev2Stoch = this.calculateStochastic(prev2Klines);
                const prev3Stoch = this.calculateStochastic(prev3Klines);
                if (prevStoch) {
                    result.prevStochK = prevStoch.k;
                    result.prevStochD = prevStoch.d;
                    if (result.stochastic) {
                        result.stochastic.prevK = prevStoch.k;
                        result.stochastic.prevD = prevStoch.d;
                    }
                }
                // 2봉/3봉 전 Stochastic 값 추가
                if (prev2Stoch && result.stochastic) {
                    result.stochastic.prev2K = prev2Stoch.k;
                    result.stochastic.prev2D = prev2Stoch.d;
                }
                if (prev3Stoch && result.stochastic) {
                    result.stochastic.prev3K = prev3Stoch.k;
                }
                // Stochastic kTrend 추가 (K값 추세)
                if (result.stochastic && prevStoch && prev2Stoch) {
                    const k = result.stochastic.k;
                    const prevK = prevStoch.k;
                    const prev2K = prev2Stoch.k;
                    if (k < prevK && prevK < prev2K) {
                        result.stochastic.kTrend = 'falling';
                    } else if (k > prevK && prevK > prev2K) {
                        result.stochastic.kTrend = 'rising';
                    } else {
                        result.stochastic.kTrend = 'neutral';
                    }
                }
            }
            
            // 24시간 고저점 (타임프레임 무관 - 타임스탬프 기반)
            const lastKlineTime = klines[klines.length - 1]?.openTime || Date.now();
            const twentyFourHoursAgo = lastKlineTime - 24 * 60 * 60 * 1000;
            const last24hKlines = klines.filter(k => k.openTime >= twentyFourHoursAgo);
            if (last24hKlines.length > 0) {
                result.high24h = Math.max(...last24hKlines.map(k => k.high));
                result.low24h = Math.min(...last24hKlines.map(k => k.low));
            }
            
            // greenStreak/redStreak (consecutiveGreen/Red와 동일 - 호환성)
            result.greenStreak = result.consecutiveGreen;
            result.redStreak = result.consecutiveRed;
            
            // 이전 priceChange, volumeRatio 계산
            if (prevPrice != null && prev2Price != null) {
                result.prevPriceChange = prev2Price > 0 ? ((prevPrice - prev2Price) / prev2Price) * 100 : 0;
            }
            if (result.prevVolume && result.avgVolume > 0) {
                result.prevVolumeRatio = result.prevVolume / result.avgVolume;
            }
            
            // 추가 ATR 관련 지표
            if (result.atr) {
                result.avgAtr = result.atr.atr || result.atr;
                result.atr14 = result.atr.atr || result.atr;
                result.atr20 = result.atr.atr || result.atr;
            }
            
            // stochK/stochD (stochastic.k/d와 동일 - 호환성)
            if (result.stochastic) {
                result.stochK = result.stochastic.k;
                result.stochD = result.stochastic.d;
                // evaluateSignal용 호환성
                result.stochasticK = result.stochastic.k;
                result.stochasticD = result.stochastic.d;
            }
            
            // adxPlusDI/adxMinusDI (adx.plusDI/minusDI와 동일 - 호환성)
            if (result.adx) {
                result.adxPlusDI = result.adx.plusDI;
                result.adxMinusDI = result.adx.minusDI;
                // diPlus/diMinus도 추가 (호환성)
                result.adx.diPlus = result.adx.plusDI;
                result.adx.diMinus = result.adx.minusDI;
            }
            
            // Fibonacci 레벨 계산 (최근 50봉 기준)
            const recent50 = klines.slice(-50);
            if (recent50.length > 0) {
                const highPrice = Math.max(...recent50.map(k => k.high));
                const lowPrice = Math.min(...recent50.map(k => k.low));
                const range = highPrice - lowPrice;
                result.fibonacci = {
                    high: highPrice,
                    low: lowPrice,
                    level236: highPrice - range * 0.236,
                    level382: highPrice - range * 0.382,
                    level500: highPrice - range * 0.500,
                    level618: highPrice - range * 0.618,
                    level786: highPrice - range * 0.786
                };
                // 최상위 레벨 fib 별칭
                result.fib236 = result.fibonacci.level236;
                result.fib382 = result.fibonacci.level382;
                result.fib500 = result.fibonacci.level500;
                result.fib618 = result.fibonacci.level618;
                result.fib786 = result.fibonacci.level786;
                result.recentHigh = highPrice;
                result.recentLow = lowPrice;
            }
            
            // ============ 추가 누락 지표들 ============
            
            // low2, low20, high20 (최근 N봉의 고저점)
            const last2 = klines.slice(-2);
            const last20 = klines.slice(-20);
            if (last2.length >= 2) {
                result.low2 = Math.min(...last2.map(k => k.low));
                result.high2 = Math.max(...last2.map(k => k.high));
            }
            if (last20.length >= 20) {
                result.low20 = Math.min(...last20.map(k => k.low));
                result.high20 = Math.max(...last20.map(k => k.high));
            }
            
            // ============ EMA/SMA 추가 기간 ============
            result.ema5 = this.calculateEMA(closePrices, 5);
            result.ema30 = this.calculateEMA(closePrices, 30);
            result.sma5 = this.calculateSMA(closePrices, 5);
            result.sma10 = this.calculateSMA(closePrices, 10);
            result.sma30 = this.calculateSMA(closePrices, 30);
            
            // 이전 EMA/SMA 값도 추가
            if (closePrices.length > 15) {
                const prevPrices = closePrices.slice(0, -1);
                result.prevEma5 = this.calculateEMA(prevPrices, 5);
                result.prevEma30 = this.calculateEMA(prevPrices, 30);
                result.prevSma5 = this.calculateSMA(prevPrices, 5);
                result.prevSma10 = this.calculateSMA(prevPrices, 10);
                result.prevSma30 = this.calculateSMA(prevPrices, 30);
            }
            
            // ============ OBV (On Balance Volume) ============
            let obv = 0;
            for (let i = 1; i < klines.length; i++) {
                if (klines[i].close > klines[i-1].close) {
                    obv += klines[i].volume;
                } else if (klines[i].close < klines[i-1].close) {
                    obv -= klines[i].volume;
                }
            }
            result.obv = obv;
            
            // 이전 OBV
            let prevObv = 0;
            for (let i = 1; i < klines.length - 1; i++) {
                if (klines[i].close > klines[i-1].close) {
                    prevObv += klines[i].volume;
                } else if (klines[i].close < klines[i-1].close) {
                    prevObv -= klines[i].volume;
                }
            }
            result.prevObv = prevObv;
            
            // ============ CCI (Commodity Channel Index) ============
            const cciPeriod = 20;
            if (klines.length >= cciPeriod) {
                const typicalPrices = klines.map(k => (k.high + k.low + k.close) / 3);
                const recentTP = typicalPrices.slice(-cciPeriod);
                const cciMean = recentTP.reduce((a, b) => a + b, 0) / cciPeriod;
                const cciMad = recentTP.reduce((sum, tp) => sum + Math.abs(tp - cciMean), 0) / cciPeriod;
                const currentTP = typicalPrices[typicalPrices.length - 1];
                result.cci = cciMad > 0 ? (currentTP - cciMean) / (0.015 * cciMad) : 0;
                result.cciMean = cciMean;
                result.cciMad = cciMad;
                
                // 이전 CCI
                if (typicalPrices.length > cciPeriod) {
                    const prevTP = typicalPrices.slice(-cciPeriod - 1, -1);
                    const prevCciMean = prevTP.reduce((a, b) => a + b, 0) / cciPeriod;
                    const prevCciMad = prevTP.reduce((sum, tp) => sum + Math.abs(tp - prevCciMean), 0) / cciPeriod;
                    const prevTPValue = typicalPrices[typicalPrices.length - 2];
                    result.prevCci = prevCciMad > 0 ? (prevTPValue - prevCciMean) / (0.015 * prevCciMad) : 0;
                }
                if (typicalPrices.length > cciPeriod + 1) {
                    const prev2TP = typicalPrices.slice(-cciPeriod - 2, -2);
                    const prev2CciMean = prev2TP.reduce((a, b) => a + b, 0) / cciPeriod;
                    const prev2CciMad = prev2TP.reduce((sum, tp) => sum + Math.abs(tp - prev2CciMean), 0) / cciPeriod;
                    const prev2TPValue = typicalPrices[typicalPrices.length - 3];
                    result.prev2Cci = prev2CciMad > 0 ? (prev2TPValue - prev2CciMean) / (0.015 * prev2CciMad) : 0;
                }
            }
            
            // ============ Williams %R ============
            const wrPeriod = 14;
            if (klines.length >= wrPeriod) {
                const wrKlines = klines.slice(-wrPeriod);
                const wrHigh = Math.max(...wrKlines.map(k => k.high));
                const wrLow = Math.min(...wrKlines.map(k => k.low));
                result.williamsR = wrHigh !== wrLow ? ((wrHigh - currentPrice) / (wrHigh - wrLow)) * -100 : -50;
                
                // 이전 Williams %R
                if (klines.length > wrPeriod) {
                    const prevWrKlines = klines.slice(-wrPeriod - 1, -1);
                    const prevWrHigh = Math.max(...prevWrKlines.map(k => k.high));
                    const prevWrLow = Math.min(...prevWrKlines.map(k => k.low));
                    result.prevWilliamsR = prevWrHigh !== prevWrLow ? ((prevWrHigh - prevPrice) / (prevWrHigh - prevWrLow)) * -100 : -50;
                }
                if (klines.length > wrPeriod + 1 && prev2Price != null) {
                    const prev2WrKlines = klines.slice(-wrPeriod - 2, -2);
                    const prev2WrHigh = Math.max(...prev2WrKlines.map(k => k.high));
                    const prev2WrLow = Math.min(...prev2WrKlines.map(k => k.low));
                    result.prev2WilliamsR = prev2WrHigh !== prev2WrLow ? ((prev2WrHigh - prev2Price) / (prev2WrHigh - prev2WrLow)) * -100 : -50;
                }
            }
            
            // ============ 52주 고점 (52 weeks = 96 * 7 * 52 ≈ 34944봉 -> 사용 가능한 만큼) ============
            const allHighs = klines.map(k => k.high);
            result.high52w = Math.max(...allHighs);
            
            // ============ consecutiveDown (연속 음봉 = consecutiveRed와 동일) ============
            result.consecutiveDown = result.consecutiveRed;
            
            // ============ prev 시리즈 별칭 ============
            result.prevPrice = prevPrice;
            result.prev2Price = prev2Price;
            result.prevAtr = typeof result.atr === 'number' ? result.atr : (result.atr?.atr || 0);
            result.avgATR = result.avgAtr || (typeof result.atr === 'number' ? result.atr : result.atr?.atr) || 0;
            result.prevMacd = result.macd?.prevMACD ?? result.macd?.macdLine ?? null;
            result.prevMacdHist = result.macd?.prevHistogram ?? null;
            result.macdHistogram = result.macd?.histogram || 0;
            result.prevADX = result.prevAdx ?? null;
            result.prevRSI = result.prevRsi ?? null;
            
            // ============ bb 별칭 (bollingerBands) ============
            result.bb = result.bollingerBands;
            
            // ============ prev2PriceChange, prev2VolumeRatio ============
            if (prev2Price != null && closePrices.length > 3) {
                const prev3Price = closePrices[closePrices.length - 4];
                result.prev2PriceChange = prev3Price > 0 ? ((prev2Price - prev3Price) / prev3Price) * 100 : 0;
            }
            if (result.prev2Volume && result.avgVolume > 0) {
                result.prev2VolumeRatio = result.prev2Volume / result.avgVolume;
            }
            
            // ============ avgRange (평균 레인지) ============
            const ranges = klines.slice(-20).map(k => k.high - k.low);
            result.avgRange = ranges.length > 0 ? ranges.reduce((a, b) => a + b, 0) / ranges.length : 0;
            
            // ============ Fear & Greed 지수 (기본값 - 실제 값은 외부 API에서 주입) ============
            result.fearGreed = 50;  // 기본값 (strategy-engine.js에서 실제 값으로 덮어씀)
            result.fearGreedIndex = 50;  // fearGreed 별칭
            result.prevFearGreed = null;  // null = 외부에서 주입 필요, 전략에서 null-safe 처리
            
            // ============ Bars 카운터 (연속 조건 횟수) ============
            // 최적화: 지표 시리즈를 1회만 계산하고 마지막 20개 값을 순회
            // (기존: 20번 루프 × 7개 지표 재계산 = 140회 → 최적화: 7회)
            
            // RSI 관련 Bars
            let rsiOversoldBars = 0, rsiDeepOversoldBars = 0, rsiExtremeOversoldBars = 0;
            let rsiFlatBars = 0, rsiBelow50Bars = 0, rsiRisingBars = 0, rsiNeutralBars = 0;
            let rsiAccumulationBars = 0, rsiLowRangeBars = 0;
            
            // MACD 관련 Bars
            let macdNegativeBars = 0, macdDeepNegativeBars = 0, macdHistNegativeBars = 0;
            let macdHistRisingBars = 0, macdHistPositiveBars = 0, macdGoldenBars = 0;
            let macdConvergeBars = 0, macdFlatBars = 0;
            
            // BB 관련 Bars
            let bbLowerBars = 0, bbExtremeLowerBars = 0, bbSqueezeBars = 0;
            let bbExtremeSqueezeBars = 0, bbBelowMidBars = 0, bbAboveMidBars = 0;
            let bbNearMidBars = 0, bbNarrowBars = 0, bbExpandingBars = 0;
            
            // MA/Price 관련 Bars
            let emaGoldenBars = 0, smaDeadBars = 0, allMAGoldenBars = 0, priceFlatBars = 0;
            
            // 최근 20봉에 대해 계산
            const barsToCheck = Math.min(20, closePrices.length - 14);
            
            if (barsToCheck > 0) {
                // 전체 시리즈를 1회만 계산 (CPU 20x 절감)
                const fullRsiSeries = RSI.calculate({ values: closePrices, period: 14 });
                const fullMacdSeries = MACD.calculate({ values: closePrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
                const fullBBSeries = BollingerBands.calculate({ values: closePrices, period: 20, stdDev: 2 });
                const fullEma10Series = EMA.calculate({ values: closePrices, period: 10 });
                const fullEma20Series = EMA.calculate({ values: closePrices, period: 20 });
                const fullSma20Series = SMA.calculate({ values: closePrices, period: 20 });
                const fullSma50Series = SMA.calculate({ values: closePrices, period: 50 });
                
                // 오프셋 계산 (시리즈 길이 = closePrices.length - 필요한 최소 데이터)
                const rsiOff = closePrices.length - fullRsiSeries.length;
                const macdOff = closePrices.length - fullMacdSeries.length;
                const bbOff = closePrices.length - fullBBSeries.length;
                const ema10Off = closePrices.length - fullEma10Series.length;
                const ema20Off = closePrices.length - fullEma20Series.length;
                const sma20Off = closePrices.length - fullSma20Series.length;
                const sma50Off = closePrices.length - fullSma50Series.length;
                
                let prevRsiForBars = null;
                let prevMacdHistForBars = null;
                let prevBBWidthForBars = null;
                
                for (let i = barsToCheck - 1; i >= 0; i--) {
                    const idx = closePrices.length - 1 - i;
                    if (idx < 14) continue;
                    
                    const checkPrice = closePrices[idx];
                    const checkRsi = idx >= rsiOff && (idx - rsiOff) < fullRsiSeries.length ? fullRsiSeries[idx - rsiOff] : null;
                    const macdEntry = idx >= macdOff && (idx - macdOff) < fullMacdSeries.length ? fullMacdSeries[idx - macdOff] : null;
                    const bbEntry = idx >= bbOff && (idx - bbOff) < fullBBSeries.length ? fullBBSeries[idx - bbOff] : null;
                    const checkEma10 = idx >= ema10Off && (idx - ema10Off) < fullEma10Series.length ? fullEma10Series[idx - ema10Off] : null;
                    const checkEma20 = idx >= ema20Off && (idx - ema20Off) < fullEma20Series.length ? fullEma20Series[idx - ema20Off] : null;
                    const checkSma20 = idx >= sma20Off && (idx - sma20Off) < fullSma20Series.length ? fullSma20Series[idx - sma20Off] : null;
                    const checkSma50 = idx >= sma50Off && (idx - sma50Off) < fullSma50Series.length ? fullSma50Series[idx - sma50Off] : null;
                    
                    // BB 밴드폭/포지션 계산
                    let checkBB = null;
                    if (bbEntry) {
                        const bandWidth = bbEntry.upper - bbEntry.lower;
                        const bbPosition = bandWidth !== 0 ? ((checkPrice - bbEntry.lower) / bandWidth) * 100 : 50;
                        const bbBandwidth = bbEntry.middle !== 0 ? (bandWidth / bbEntry.middle) * 100 : 0;
                        checkBB = { upper: bbEntry.upper, middle: bbEntry.middle, lower: bbEntry.lower, position: bbPosition, bandwidth: bbBandwidth };
                    }
                    
                    // RSI 조건
                    if (checkRsi != null) {
                        if (checkRsi < 30) rsiOversoldBars++;
                        if (checkRsi < 25) rsiDeepOversoldBars++;
                        if (checkRsi < 20) rsiExtremeOversoldBars++;
                        if (checkRsi >= 45 && checkRsi <= 55) rsiFlatBars++;
                        if (checkRsi < 50) rsiBelow50Bars++;
                        if (prevRsiForBars !== null && checkRsi > prevRsiForBars) rsiRisingBars++;
                        if (checkRsi >= 40 && checkRsi <= 60) rsiNeutralBars++;
                        if (checkRsi >= 30 && checkRsi <= 45) rsiAccumulationBars++;
                        if (checkRsi >= 35 && checkRsi <= 50) rsiLowRangeBars++;
                        prevRsiForBars = checkRsi;
                    }
                    
                    // MACD 조건
                    if (macdEntry) {
                        if (macdEntry.MACD < 0) macdNegativeBars++;
                        if (checkPrice > 0 && macdEntry.MACD / checkPrice < -0.005) macdDeepNegativeBars++;
                        if (macdEntry.histogram < 0) macdHistNegativeBars++;
                        if (prevMacdHistForBars !== null && macdEntry.histogram > prevMacdHistForBars) macdHistRisingBars++;
                        if (macdEntry.histogram > 0) macdHistPositiveBars++;
                        if (macdEntry.MACD > macdEntry.signal) macdGoldenBars++;
                        if (checkPrice > 0 && Math.abs(macdEntry.MACD - macdEntry.signal) / checkPrice < 0.001) macdConvergeBars++;
                        if (checkPrice > 0 && Math.abs(macdEntry.histogram) / checkPrice < 0.0005) macdFlatBars++;
                        prevMacdHistForBars = macdEntry.histogram;
                    }
                    
                    // BB 조건
                    if (checkBB) {
                        if (checkPrice < checkBB.lower) bbLowerBars++;
                        if (checkPrice < checkBB.lower * 0.98) bbExtremeLowerBars++;
                        if (checkBB.bandwidth < 5) bbSqueezeBars++;
                        if (checkBB.bandwidth < 3) bbExtremeSqueezeBars++;
                        if (checkPrice < checkBB.middle) bbBelowMidBars++;
                        if (checkPrice > checkBB.middle) bbAboveMidBars++;
                        if (Math.abs(checkPrice - checkBB.middle) / checkBB.middle < 0.01) bbNearMidBars++;
                        if (checkBB.bandwidth < 4) bbNarrowBars++;
                        if (prevBBWidthForBars !== null && checkBB.bandwidth > prevBBWidthForBars) bbExpandingBars++;
                        prevBBWidthForBars = checkBB.bandwidth;
                    }
                    
                    // EMA/SMA/Price 조건
                    if (checkEma10 != null && checkEma20 != null) {
                        if (checkEma10 > checkEma20) emaGoldenBars++;
                    }
                    if (checkSma20 != null && checkSma50 != null) {
                        if (checkSma20 < checkSma50) smaDeadBars++;
                    }
                    if (checkEma10 != null && checkEma20 != null && checkSma20 != null && checkSma50 != null) {
                        if (checkEma10 > checkEma20 && checkSma20 > checkSma50) allMAGoldenBars++;
                    }
                    
                    // priceFlatBars - 가격 변동이 적은 경우
                    if (idx >= 1) {
                        const prevCheckPrice = closePrices[idx - 1];
                        if (Math.abs((checkPrice - prevCheckPrice) / prevCheckPrice) < 0.005) priceFlatBars++;
                    }
                }
            }
            
            // Bars 결과 저장
            result.rsiOversoldBars = rsiOversoldBars;
            result.rsiDeepOversoldBars = rsiDeepOversoldBars;
            result.rsiExtremeOversoldBars = rsiExtremeOversoldBars;
            result.rsiFlatBars = rsiFlatBars;
            result.rsiBelow50Bars = rsiBelow50Bars;
            result.rsiRisingBars = rsiRisingBars;
            result.rsiNeutralBars = rsiNeutralBars;
            result.rsiAccumulationBars = rsiAccumulationBars;
            result.rsiLowRangeBars = rsiLowRangeBars;
            
            result.macdNegativeBars = macdNegativeBars;
            result.macdDeepNegativeBars = macdDeepNegativeBars;
            result.macdHistNegativeBars = macdHistNegativeBars;
            result.macdHistRisingBars = macdHistRisingBars;
            result.macdHistPositiveBars = macdHistPositiveBars;
            result.macdGoldenBars = macdGoldenBars;
            result.macdConvergeBars = macdConvergeBars;
            result.macdFlatBars = macdFlatBars;
            
            // MACD 객체에도 negativeCount 추가
            if (result.macd) {
                result.macd.negativeCount = macdNegativeBars;
                result.macd.negativeBars = macdNegativeBars;
                result.macd.deepNegativeCount = macdDeepNegativeBars;
            }
            
            result.bbLowerBars = bbLowerBars;
            result.bbExtremeLowerBars = bbExtremeLowerBars;
            result.bbSqueezeBars = bbSqueezeBars;
            result.bbExtremeSqueezeBars = bbExtremeSqueezeBars;
            result.bbBelowMidBars = bbBelowMidBars;
            result.bbAboveMidBars = bbAboveMidBars;
            result.bbNearMidBars = bbNearMidBars;
            result.bbNarrowBars = bbNarrowBars;
            result.bbExpandingBars = bbExpandingBars;
            
            result.emaGoldenBars = emaGoldenBars;
            result.smaDeadBars = smaDeadBars;
            result.allMAGoldenBars = allMAGoldenBars;
            result.priceFlatBars = priceFlatBars;
            
            // VWAP 계산 (당일 기준 - 96봉)
            const vwapCandles = klines.slice(-96);
            if (vwapCandles.length > 0) {
                let cumVolume = 0;
                let cumVwap = 0;
                for (const c of vwapCandles) {
                    const typicalPrice = (c.high + c.low + c.close) / 3;
                    cumVolume += c.volume;
                    cumVwap += typicalPrice * c.volume;
                }
                result.vwap = cumVolume > 0 ? cumVwap / cumVolume : currentPrice;
            }
            
            // ROC (Rate of Change) - 모멘텀 지표
            if (closePrices.length > 12) {
                const roc12Price = closePrices[closePrices.length - 13];
                result.roc = roc12Price > 0 ? ((currentPrice - roc12Price) / roc12Price) * 100 : 0;
                // 이전 ROC
                const prevRoc12Price = closePrices[closePrices.length - 14];
                result.prevRoc = prevPrice != null && prevRoc12Price > 0 ? ((prevPrice - prevRoc12Price) / prevRoc12Price) * 100 : 0;
            }
            
            // Momentum (단순 모멘텀 = 현재가 - N봉 전 가격)
            if (closePrices.length > 10) {
                const mom10Price = closePrices[closePrices.length - 11];
                result.momentum = currentPrice - mom10Price;
            }
            
            // volumeChange (거래량 변화율)
            if (result.prevVolume && result.prevVolume > 0) {
                result.volumeChange = ((result.volume - result.prevVolume) / result.prevVolume) * 100;
            } else {
                result.volumeChange = 0;
            }
            
            // Support/Resistance (간단한 피벗 포인트 방식)
            if (prevCandle) {
                const pivot = (prevCandle.high + prevCandle.low + prevCandle.close) / 3;
                result.support = 2 * pivot - prevCandle.high;
                result.resistance = 2 * pivot - prevCandle.low;
                result.support2 = pivot - (prevCandle.high - prevCandle.low);
                result.resistance2 = pivot + (prevCandle.high - prevCandle.low);
            }
            
            // Bollinger Bands 이전 값 계산
            if (closePrices.length > 23) {
                const prevBB = this.calculateBollingerBands(closePrices.slice(0, -1));
                const prev2BB = this.calculateBollingerBands(closePrices.slice(0, -2));
                const prev3BB = this.calculateBollingerBands(closePrices.slice(0, -3));
                if (prevBB) {
                    result.bollingerBands.prevPosition = prevBB.position;
                    result.bollingerBands.prevBandwidth = prevBB.bandwidth;
                    result.bollingerBands.prevMiddle = prevBB.middle;
                    result.prevPosition = prevBB.position;
                    result.prevBandwidth = prevBB.bandwidth;
                }
                if (prev2BB) {
                    result.bollingerBands.prev2Position = prev2BB.position;
                    result.bollingerBands.prev2Bandwidth = prev2BB.bandwidth;
                    result.prev2Position = prev2BB.position;
                    result.prev2Bandwidth = prev2BB.bandwidth;
                }
                if (prev3BB) {
                    result.bollingerBands.prev3Position = prev3BB.position;
                    result.prev3Position = prev3BB.position;
                }
            }
            
            // ATR 처리 - 역호환성 유지 (ind.atr는 숫자로 유지)
            if (typeof result.atr === 'number') {
                const atrValue = result.atr;
                const atrPercent = currentPrice > 0 ? (atrValue / currentPrice) * 100 : 0;
                
                // 이전 ATR 계산
                let prevAtrValue = atrValue;
                let prevAtrPercent = atrPercent;
                if (klines.length > 15) {
                    const calcPrevAtr = this.calculateATR(klines.slice(0, -1));
                    if (calcPrevAtr) {
                        prevAtrValue = calcPrevAtr;
                        prevAtrPercent = prevPrice > 0 ? (calcPrevAtr / prevPrice) * 100 : 0;
                    }
                }
                
                // 객체 형태는 별도 필드에 저장 (필요한 경우만)
                result.atrObj = {
                    atr: atrValue,
                    atrPercent: atrPercent,
                    prevAtr: prevAtrValue,
                    prevAtrPercent: prevAtrPercent
                };
                
                // ind.atr는 숫자로 유지 (전략 역호환성)
                // result.atr = atrValue; // 이미 숫자
                result.atrValue = atrValue;   // 명시적 숫자 별칭
                result.atrPercent = atrPercent;
                result.prevAtr = prevAtrValue;
                result.prevAtrPercent = prevAtrPercent;
                result.avgAtr = atrValue;     // avgAtr 별칭
                result.avgATR = atrValue;     // avgATR 별칭 (대문자)
            }
        }
        
        return result;
    }
}
