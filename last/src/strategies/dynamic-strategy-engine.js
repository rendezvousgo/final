/**
 * 동적 전략 엔진 - 약 1000만개 전략을 조건식으로 평가
 * 모든 경우의 수를 런타임에 생성하여 테스트
 * 
 * 멀티 타임프레임 지원 (4개: 1m, 5m, 15m, 1h)
 * - 다른 타임프레임 지표 조합 허용 (예: [5m]RSI + [15m]MACD)
 * - 같은 지표의 다른 타임프레임 조합 불가 (예: [5m]RSI + [15m]RSI)
 * 
 * 경우의 수 계산:
 * - 1개 조합: 268지표 x 4TF x ~3파라미터 x ~3신호 ≈ 6,500개
 * - 2개 조합: C(268,2) x 16TF조합 x 파라미터/신호 ≈ 1,000만개
 * - 3개 조합: (현재 비활성화)
 */

import { INDICATOR_LIST } from '../indicators/all-indicators.js';

export class DynamicStrategyEngine {
    constructor() {
        // 지표 정의 로드
        this.indicators = INDICATOR_LIST;
        
        // 지원하는 타임프레임
        this.supportedTimeframes = ['1m', '5m', '15m', '1h'];
        
        // 기본 타임프레임
        this.baseTimeframe = '15m';
        
        // 필터링 규칙
        this.INDICATOR_GROUPS = {
            moving_averages: ['SMA', 'EMA', 'WMA', 'DEMA', 'HMA', 'VWMA', 'McGinleyDynamic', 'GuppyShort', 'GuppyLong', 'GuppySeparation'],
            oscillators: ['RSI', 'StochasticK', 'StochasticD', 'WilliamsR', 'CCI', 'CMO', 'DeMarker', 'ConnorsRSI', 'StochRSI', 'UltimateOscillator'],
            macd_family: ['MACD', 'PPO', 'AwesomeOscillator'],
            aroon_family: ['AroonUp', 'AroonDown', 'AroonOscillator'],
            vortex_family: ['VortexPlus', 'VortexMinus'],
            di_family: ['ADX', 'PlusDI', 'MinusDI'],
            bollinger_family: ['BollingerBands', 'BollingerPercentB', 'BollingerWidth', 'SqueezeIndicator'],
            volume_accumulation: ['OBV', 'ADL', 'ChaikinOscillator'],
            ichimoku_family: ['IchimokuTenkan', 'IchimokuKijun', 'IchimokuSenkouA', 'IchimokuSenkouB'],
            volatility_pure: ['ATR', 'StandardDeviation', 'HistoricalVolatility', 'ChaikinVolatility'],
            channel_family: ['KeltnerChannel', 'DonchianChannel'],
            power_family: ['BullPower', 'BearPower'],
            regression_family: ['LinearRegressionValue', 'LinearRegressionSlope', 'RSquared', 'StandardError', 'ChandeForecastOscillator'],
        };
        
        // 기존 노이즈 지표 (excluded_indicators에도 포함됨)
        this.noise_indicators = [
            'ConsecutiveCandles', 'CandleSizeRatio', 'HigherHighsCount', 'LowerLowsCount', 'BullishRatio',
            'BodySize', 'UpperShadow', 'LowerShadow', 'CandleDirection', 'AvgCandleSize', 'HeikinAshiTrend', 'PriceChangeN'
        ];
        
        // 제외할 지표 목록 (현재는 all-indicators.js에서 불필요한 지표가 모두 삭제됨)
        this.excluded_indicators = [];
        
        this.direction_required = ['ATR', 'StandardDeviation', 'BollingerWidth', 'VolumeRatio'];
        
        this.categoryMap = {
            SMA: 'trend', EMA: 'trend', WMA: 'trend', DEMA: 'trend', HMA: 'trend', VWMA: 'trend',
            RSI: 'momentum', StochasticK: 'momentum', StochasticD: 'momentum', WilliamsR: 'momentum', MACD: 'momentum', ROC: 'momentum', Momentum: 'momentum', CCI: 'momentum', CMO: 'momentum',
            UltimateOscillator: 'momentum', AwesomeOscillator: 'momentum', PPO: 'momentum', TRIX: 'momentum', KST: 'momentum', RVI: 'momentum', DeMarker: 'momentum', ConnorsRSI: 'momentum', SchaffTrendCycle: 'momentum', ElderImpulse: 'momentum',
            ADX: 'trend_strength', PlusDI: 'trend_strength', MinusDI: 'trend_strength',
        };
        
        // 3개 지표 조합 모드 비활성화
        this.recommended3Combos = [];
    }
    
    /**
     * 두 지표가 같은 그룹인지 확인
     */
    inSameGroup(name1, name2) {
        for (const members of Object.values(this.INDICATOR_GROUPS)) {
            if (members.includes(name1) && members.includes(name2)) return true;
        }
        return false;
    }
    
    /**
     * 지표가 추세 또는 모멘텀 카테고리인지 확인
     */
    isTrendOrMomentum(name) {
        const indicator = this.indicators.find(i => i.name === name);
        const cat = indicator?.category || this.categoryMap[name];
        return cat === 'trend' || cat === 'momentum' || cat === 'trend_strength';
    }

    /**
     * 지표 정의 조회
     */
    getIndicatorDefinition(name) {
        return this.indicators.find(i => i.name === name);
    }

    /**
     * 지표 값 계산 (캐시 포함)
     */
    getIndicatorValue(indicatorName, marketData, paramSet, usePrev = false) {
        if (!marketData || !marketData.closes || marketData.closes.length === 0) return null;

        const cache = usePrev ? marketData.__prevIndicatorCache : marketData.__indicatorCache;
        const paramKey = Array.isArray(paramSet) ? paramSet.join(',') : (paramSet ?? 'default');
        const cacheKey = `${indicatorName}:${paramKey}:${usePrev ? 'prev' : 'cur'}`;
        if (cache?.has(cacheKey)) return cache.get(cacheKey);

        const def = this.getIndicatorDefinition(indicatorName);
        if (!def || !def.fn || !def.params) return null;

        const defaults = {
            period: 14,
            n: 5,
            fast: 12,
            slow: 26,
            signal: 9,
            kPeriod: 14,
            dPeriod: 3,
            stdDev: 2,
            length: 14,
            lookback: 14,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            emaPeriod: 20,
            smaPeriod: 20,
            smoothPeriod: 9,
            multiplier: 2,
            leftBars: 5,
            rightBars: 2,
            percent: 2.5,
            p: 10,
            x: 1.5,
            q: 9,
            jawPeriod: 13,
            teethPeriod: 8,
            lipsPeriod: 5,
            fastLimit: 0.5,
            slowLimit: 0.05,
            alpha: 0.07,
            r: 10,
            s: 20,
            u: 5,
            rsiPeriod: 14,
            smooth1: 3,
            smooth2: 3,
            limitMove: 1,
            shortPeriod: 5,
            longPeriod: 20,
            sumPeriod: 9,
            levels: 10,
            rocPeriod: 10,
            threshold: 0.5,
            basePeriod: 14
        };

        const series = {
            closes: usePrev ? marketData.closes.slice(0, -1) : marketData.closes,
            highs: usePrev ? marketData.highs?.slice(0, -1) : marketData.highs,
            lows: usePrev ? marketData.lows?.slice(0, -1) : marketData.lows,
            volumes: usePrev ? marketData.volumes?.slice(0, -1) : marketData.volumes,
            opens: usePrev ? marketData.opens?.slice(0, -1) : marketData.opens
        };

        const dailyPivotIndicators = new Set([
            'DailyPivotPoints',
            'PivotPoints',
            'FibonacciPivot',
            'CamarillaPivot',
            'WoodiePivot',
            'DeMarkPivot'
        ]);
        const useDailyOHLC = dailyPivotIndicators.has(indicatorName);

        if (!series.closes || series.closes.length === 0) return null;

        const needsSeries = ['closes', 'highs', 'lows', 'volumes', 'opens'];
        for (const key of needsSeries) {
            if (def.params.includes(key)) {
                const arr = series[key];
                if (!Array.isArray(arr) || arr.length === 0) return null;
            }
        }

        // paramSet을 배열로 정규화 (빈 배열 체크 추가)
        const paramValues = Array.isArray(paramSet) && paramSet.length > 0
            ? [...paramSet]
            : (paramSet !== undefined && paramSet !== null && !Array.isArray(paramSet) ? [paramSet] : []);

        const getFromMarketData = (param) => {
            if (param in marketData) return marketData[param];
            const lower = param.toLowerCase();
            if (lower in marketData) return marketData[lower];
            const camel = `${param.charAt(0).toLowerCase()}${param.slice(1)}`;
            if (camel in marketData) return marketData[camel];
            return undefined;
        };

        // 시리즈 파라미터와 숫자 파라미터 분리
        const seriesParams = ['closes', 'highs', 'lows', 'volumes', 'opens', 'buyVolumes', 'sellVolumes'];
        const singleValueParams = ['close', 'high', 'low', 'open'];

        const args = def.params.map(param => {
            // 시리즈 데이터
            if (param === 'closes') return series.closes;
            if (param === 'highs') return series.highs;
            if (param === 'lows') return series.lows;
            if (param === 'volumes') return series.volumes;
            if (param === 'opens') return series.opens;
            if (param === 'buyVolumes') return usePrev ? marketData.buyVolumes?.slice(0, -1) : marketData.buyVolumes;
            if (param === 'sellVolumes') return usePrev ? marketData.sellVolumes?.slice(0, -1) : marketData.sellVolumes;

            // 단일 값
            if (param === 'close') {
                if (useDailyOHLC && Number.isFinite(marketData.dailyClose)) return marketData.dailyClose;
                return series.closes?.[series.closes.length - 1];
            }
            if (param === 'high') {
                if (useDailyOHLC && Number.isFinite(marketData.dailyHigh)) return marketData.dailyHigh;
                return series.highs?.[series.highs.length - 1];
            }
            if (param === 'low') {
                if (useDailyOHLC && Number.isFinite(marketData.dailyLow)) return marketData.dailyLow;
                return series.lows?.[series.lows.length - 1];
            }
            if (param === 'open') return series.opens?.[series.opens.length - 1];
            
            // 특수 파라미터 (Fear&Greed 등)
            if (param === 'fearGreed') return marketData.fearGreed ?? marketData.fearGreedIndex ?? 50;

            // 숫자 파라미터: paramValues에서 순서대로 가져오기
            if (!seriesParams.includes(param) && !singleValueParams.includes(param)) {
                if (paramValues.length > 0) return paramValues.shift();
                if (defaults[param] !== undefined) return defaults[param];
                const fromMarket = getFromMarketData(param);
                if (fromMarket !== undefined) return fromMarket;
            }
            
            return undefined;
        });

        const value = def.fn(...args);
        if (cache) cache.set(cacheKey, value);
        return value;
    }
    
    /**
     * 2개 조합이 유효한지 확인
     */
    isValid2Combo(ind1, ind2) {
        // 동일 그룹 제거
        if (this.inSameGroup(ind1.name, ind2.name)) return false;
        
        // direction_required는 trend/momentum과만 허용
        if (this.direction_required.includes(ind1.name) && !this.isTrendOrMomentum(ind2.name)) return false;
        if (this.direction_required.includes(ind2.name) && !this.isTrendOrMomentum(ind1.name)) return false;
        
        return true;
    }
    
    /**
     * 전략 이름 생성
     */
    generateStrategyName(indicators, signals) {
        const indStr = indicators.map(i => `${i.name}(${i.period || 14})`).join(' + ');
        const sigStr = signals.slice(0, 2).join(', ');
        return `${indStr}: ${sigStr}`;
    }
    
    /**
     * 신호 조건 평가
     * @param {Object} signal - 신호 정의
     * @param {Object} marketData - 전체 시장 데이터
     * @param {string} indicatorName - 지표명
     * @param {number} period - 기간
     */
    evaluateSignal(signal, marketData, indicatorName, paramSet) {
        const { values } = signal;
        const percentiles = Array.isArray(signal?.percentile) ? signal.percentile : null;
        let type = signal?.type;
        const typeAlias = {
            bullish_div: 'bullish_divergence',
            bearish_div: 'bearish_divergence',
            bullishDivergence: 'bullish_divergence',
            bearishDivergence: 'bearish_divergence',
            positive_divergence: 'bullish_divergence',
            negative_divergence: 'bearish_divergence',
            oversold_div: 'bullish_divergence',
            overbought_div: 'bearish_divergence',
            overbought_divergence: 'bearish_divergence',
            oversold_divergence: 'bullish_divergence',
            bull_cross: 'golden_cross',
            bear_cross: 'dead_cross',
            above_cloud: 'price_above_cloud',
            below_cloud: 'price_below_cloud',
            above_long_stop: 'price_above_long',
            below_short_stop: 'price_below_short',
            keltnerSqueeze: 'squeeze_on',
            preSqueeze: 'squeeze_on'
        };
        if (type && typeAlias[type]) {
            const isEhlersSine = indicatorName === 'EhlersSinewave';
            if (!(isEhlersSine && (type === 'bull_cross' || type === 'bear_cross'))) {
                type = typeAlias[type];
            }
        }

        const extractNumericValue = (obj) => {
            if (!obj || typeof obj !== 'object') return null;

            const preferredKeys = [
                'value', 'current', 'price', 'close',
                indicatorName?.toLowerCase(),
                'MACD', 'macd', 'signal', 'histogram',
                'upper', 'lower', 'middle', 'bandwidth',
                'k', 'd', 'adx', 'pdi', 'mdi', 'plus', 'minus'
            ].filter(Boolean);

            for (const key of preferredKeys) {
                if (key in obj && typeof obj[key] === 'number' && Number.isFinite(obj[key])) {
                    return obj[key];
                }
            }

            const numericEntries = Object.entries(obj)
                .filter(([, value]) => typeof value === 'number' && Number.isFinite(value));

            if (numericEntries.length === 1) return numericEntries[0][1];
            if (numericEntries.length > 0) {
                numericEntries.sort((a, b) => a[0].localeCompare(b[0]));
                return numericEntries[0][1];
            }
            return null;
        };

        const getPercentileThresholds = () => {
            if (!percentiles || !indicatorName) return null;
            const def = this.getIndicatorDefinition(indicatorName);
            if (!def?.fn) return null;

            const len = marketData?.closes?.length || 0;
            if (len < 5) return null;

            const maxPoints = 200;
            const startIdx = Math.max(0, len - maxPoints);
            const valuesSeries = [];

            for (let i = startIdx; i < len; i++) {
                const sliceMarket = Object.create(marketData);
                sliceMarket.closes = marketData.closes?.slice(0, i + 1);
                sliceMarket.highs = marketData.highs?.slice(0, i + 1);
                sliceMarket.lows = marketData.lows?.slice(0, i + 1);
                sliceMarket.volumes = marketData.volumes?.slice(0, i + 1);
                sliceMarket.opens = marketData.opens?.slice(0, i + 1);
                sliceMarket.buyVolumes = marketData.buyVolumes?.slice(0, i + 1);
                sliceMarket.sellVolumes = marketData.sellVolumes?.slice(0, i + 1);
                sliceMarket.__indicatorCache = null;
                sliceMarket.__prevIndicatorCache = null;
                const v = this.getIndicatorValue(indicatorName, sliceMarket, paramSet, false);
                const numeric = typeof v === 'number' && Number.isFinite(v)
                    ? v
                    : (v && typeof v === 'object' ? extractNumericValue(v) : null);
                if (numeric != null && Number.isFinite(numeric)) valuesSeries.push(numeric);
            }

            if (valuesSeries.length < 5) return null;
            const sorted = [...valuesSeries].sort((a, b) => a - b);
            const getPct = (p) => {
                const rank = Math.max(0, Math.min(100, p));
                const idx = Math.floor((rank / 100) * (sorted.length - 1));
                return sorted[idx];
            };
            return percentiles.map(getPct);
        };

        const getIndicatorSeries = (maxPoints = 200) => {
            if (!indicatorName) return null;
            const def = this.getIndicatorDefinition(indicatorName);
            if (!def?.fn) return null;

            const len = marketData?.closes?.length || 0;
            if (len < 3) return null;

            const startIdx = Math.max(0, len - maxPoints);
            const valuesSeries = [];

            for (let i = startIdx; i < len; i++) {
                const sliceMarket = Object.create(marketData);
                sliceMarket.closes = marketData.closes?.slice(0, i + 1);
                sliceMarket.highs = marketData.highs?.slice(0, i + 1);
                sliceMarket.lows = marketData.lows?.slice(0, i + 1);
                sliceMarket.volumes = marketData.volumes?.slice(0, i + 1);
                sliceMarket.opens = marketData.opens?.slice(0, i + 1);
                sliceMarket.buyVolumes = marketData.buyVolumes?.slice(0, i + 1);
                sliceMarket.sellVolumes = marketData.sellVolumes?.slice(0, i + 1);
                sliceMarket.__indicatorCache = null;
                sliceMarket.__prevIndicatorCache = null;
                const v = this.getIndicatorValue(indicatorName, sliceMarket, paramSet, false);
                const numeric = typeof v === 'number' && Number.isFinite(v)
                    ? v
                    : (v && typeof v === 'object' ? extractNumericValue(v) : null);
                if (numeric != null && Number.isFinite(numeric)) valuesSeries.push(numeric);
            }

            return valuesSeries.length > 0 ? valuesSeries : null;
        };

        const matchPercentileLow = (current) => {
            const thresholds = getPercentileThresholds();
            if (!thresholds || current == null) return false;
            return thresholds.some(t => current <= t);
        };

        const matchPercentileHigh = (current) => {
            const thresholds = getPercentileThresholds();
            if (!thresholds || current == null) return false;
            return thresholds.some(t => current >= t);
        };

        const getValue = (usePrev = false) => {
            let v;
            if (!usePrev) {
                v = marketData[indicatorName];
                if (v === undefined || v === null) v = marketData[indicatorName.toLowerCase()];
            } else {
                const prevKey = `prev${indicatorName.charAt(0).toUpperCase()}${indicatorName.slice(1)}`;
                v = marketData[prevKey] ?? marketData[`prev_${indicatorName.toLowerCase()}`] ?? marketData[`prev${indicatorName.toLowerCase()}`];
            }
            if (v === undefined || v === null) {
                v = this.getIndicatorValue(indicatorName, marketData, paramSet, usePrev);
            }

            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
                const obj = v;
                v = obj.value ?? obj.current ?? obj[indicatorName.toLowerCase()];
                if (v === undefined || v === null) v = extractNumericValue(obj);
            }
            return typeof v === 'number' && Number.isFinite(v) ? v : null;
        };

        const getIndicatorObject = (usePrev = false) => {
            let v;
            if (!usePrev) {
                v = marketData[indicatorName];
                if (v === undefined || v === null) v = marketData[indicatorName.toLowerCase()];
            } else {
                const prevKey = `prev${indicatorName.charAt(0).toUpperCase()}${indicatorName.slice(1)}`;
                v = marketData[prevKey] ?? marketData[`prev_${indicatorName.toLowerCase()}`] ?? marketData[`prev${indicatorName.toLowerCase()}`];
            }
            if (v === undefined || v === null) {
                v = this.getIndicatorValue(indicatorName, marketData, paramSet, usePrev);
            }
            return v && typeof v === 'object' ? v : null;
        };

        const price = marketData.price ?? marketData.close;
        const prevPrice = marketData.prevClose ?? marketData.prevPrice;

        const volatilityIndicators = new Set([
            'ATR', 'StandardDeviation', 'HistoricalVolatility', 'ChaikinVolatility', 'BollingerWidth'
        ]);
        const isVolatilityIndicator = indicatorName ? volatilityIndicators.has(indicatorName) : false;

        const getChannel = (usePrev = false) => {
            const obj = getIndicatorObject(usePrev);
            if (!obj || typeof obj !== 'object') return null;
            return {
                upper: obj.upper ?? obj.upperBand ?? obj.high ?? obj.resistance ?? obj.top,
                lower: obj.lower ?? obj.lowerBand ?? obj.low ?? obj.support ?? obj.bottom,
                middle: obj.middle ?? obj.mid ?? obj.basis ?? obj.center,
                bandwidth: obj.bandwidth ?? obj.width,
                squeezeOn: obj.squeezeOn ?? obj.squeeze_on ?? obj.keltnerSqueeze
            };
        };

        const getIchimoku = (usePrev = false) => {
            const obj = getIndicatorObject(usePrev) || marketData.ichimoku || null;
            if (!obj || typeof obj !== 'object') return null;
            return {
                tenkan: obj.tenkan ?? obj.conversionLine,
                kijun: obj.kijun ?? obj.baseLine,
                senkouA: obj.senkouA ?? obj.spanA,
                senkouB: obj.senkouB ?? obj.spanB
            };
        };

        const getDi = () => {
            const plus = marketData.plusDI ?? marketData.adx?.plusDI ?? marketData.adx?.pdi ?? marketData.adx?.diPlus;
            const minus = marketData.minusDI ?? marketData.adx?.minusDI ?? marketData.adx?.mdi ?? marketData.adx?.diMinus;
            const prevPlus = marketData.prevPlusDI ?? marketData.adx?.prevPlusDI ?? marketData.adx?.prevDiPlus;
            const prevMinus = marketData.prevMinusDI ?? marketData.adx?.prevMinusDI ?? marketData.adx?.prevDiMinus;
            return { plus, minus, prevPlus, prevMinus };
        };

        const getPlusMinus = () => {
            const obj = getIndicatorObject();
            const prevObj = getIndicatorObject(true);
            const plus = obj?.plus ?? obj?.plusDI ?? obj?.pdi ?? obj?.vortexPlus ?? obj?.vp;
            const minus = obj?.minus ?? obj?.minusDI ?? obj?.mdi ?? obj?.vortexMinus ?? obj?.vm;
            const prevPlus = prevObj?.plus ?? prevObj?.plusDI ?? prevObj?.pdi ?? prevObj?.vortexPlus ?? prevObj?.vp;
            const prevMinus = prevObj?.minus ?? prevObj?.minusDI ?? prevObj?.mdi ?? prevObj?.vortexMinus ?? prevObj?.vm;
            return { plus, minus, prevPlus, prevMinus };
        };

        const normalizeKey = (value) => String(value ?? '')
            .replace(/[^a-zA-Z0-9]/g, '')
            .toLowerCase();

        const getFlagFromObject = (usePrev = false) => {
            const obj = getIndicatorObject(usePrev);
            if (!obj || typeof obj !== 'object') return null;
            const target = normalizeKey(type);
            for (const [key, val] of Object.entries(obj)) {
                if (normalizeKey(key) === target) return val;
            }
            return null;
        };

        const getValueByKey = (key, usePrev = false) => {
            if (!key) return null;
            const target = normalizeKey(key);
            const obj = getIndicatorObject(usePrev) || {};
            for (const [k, v] of Object.entries(obj)) {
                if (normalizeKey(k) === target) return v;
            }
            for (const [k, v] of Object.entries(marketData || {})) {
                if (normalizeKey(k) === target) return v;
            }
            return null;
        };

        const getPivotLevel = (levelKey) => {
            const target = normalizeKey(levelKey);
            const candidates = [
                getIndicatorObject(),
                marketData.pivot,
                marketData.pp,
                marketData.pivotPoints,
                marketData.pivotpoints,
                marketData.pivots
            ].filter(Boolean);
            for (const obj of candidates) {
                if (typeof obj !== 'object') continue;
                for (const [k, v] of Object.entries(obj)) {
                    if (normalizeKey(k) === target) return v;
                }
            }
            return null;
        };

        const getNearTolerance = () => {
            const curPrice = marketData.price ?? marketData.close;
            const atr = marketData.atr?.atr ?? marketData.atr ?? marketData.avgAtr ?? marketData.avgRange;
            if (atr && Number.isFinite(atr)) return atr * 0.3;
            if (curPrice && Number.isFinite(curPrice)) return curPrice * 0.002;
            return 0;
        };

        const evaluateNumericByType = (current) => {
            if (current == null || !Number.isFinite(current)) return false;
            if (values && values.length > 0) {
                const min = Math.min(...values);
                const max = Math.max(...values);
                if (/low|below|under|oversold|weak|bear|down|negative|minus|lower/i.test(type)) return current < min;
                if (/high|above|over|overbought|strong|bull|up|positive|plus|upper/i.test(type)) return current > max;
                return current > values[0];
            }
            if (/low|below|under|oversold|weak|bear|down|negative|minus|lower/i.test(type)) return current < 0;
            if (/high|above|over|overbought|strong|bull|up|positive|plus|upper/i.test(type)) return current > 0;
            return current !== 0;
        };

        const getAOSeries = () => {
            const highs = marketData.highs;
            const lows = marketData.lows;
            if (!highs || !lows || highs.length < 40 || lows.length < 40) return null;

            const midpoints = highs.map((h, i) => (h + lows[i]) / 2);
            const smaSeries = (data, period) => {
                const series = [];
                for (let i = period - 1; i < data.length; i++) {
                    const slice = data.slice(i - period + 1, i + 1);
                    const sum = slice.reduce((a, b) => a + b, 0);
                    series.push(sum / period);
                }
                return series;
            };

            const sma5 = smaSeries(midpoints, 5);
            const sma34 = smaSeries(midpoints, 34);
            const offset = 34 - 5;
            const ao = [];
            for (let i = 0; i < sma34.length; i++) {
                const fast = sma5[i + offset];
                const slow = sma34[i];
                if (fast == null || slow == null) continue;
                ao.push(fast - slow);
            }
            return ao.length > 0 ? ao : null;
        };

        const getHistogramValue = (usePrev = false) => {
            if (indicatorName === 'MACD') {
                if (usePrev) return marketData.macd?.prevHistogram ?? marketData.prevMacdHist ?? marketData.prevMacdHistogram;
                return marketData.macd?.histogram ?? marketData.macdHistogram;
            }
            const obj = getIndicatorObject(usePrev);
            const hist = obj?.histogram ?? obj?.hist ?? obj?.histValue;
            if (hist != null) return hist;
            return getValueByKey('histogram', usePrev) ?? getValueByKey('hist', usePrev);
        };

        switch (type) {
            // 비교 연산
            case 'lt':
                return values ? values.some(v => (getValue() ?? NaN) < v) : false;
            case 'gt':
                return values ? values.some(v => (getValue() ?? NaN) > v) : false;
            case 'above':
                return values ? values.some(v => (getValue() ?? NaN) > v) : false;
            case 'below':
                return values ? values.some(v => (getValue() ?? NaN) < v) : false;
            case 'eq':
                return values ? values.some(v => (getValue() ?? NaN) === v) : false;
            case 'between':
                return values ? ((getValue() ?? NaN) >= values[0] && (getValue() ?? NaN) <= values[1]) : false;

            // 가격 위치
            case 'price_above':
                return (marketData.close > (getValue() ?? Infinity)) || (marketData.price > (getValue() ?? Infinity));
            case 'price_below':
                return (marketData.close < (getValue() ?? -Infinity)) || (marketData.price < (getValue() ?? -Infinity));
            case 'price_above_stop': {
                const obj = getIndicatorObject() || {};
                const stop = obj.stopLong ?? obj.longStop ?? obj.stop ?? obj.upper ?? obj.long;
                if (price == null || stop == null) return false;
                return price > stop;
            }
            case 'price_below_stop': {
                const obj = getIndicatorObject() || {};
                const stop = obj.stopShort ?? obj.shortStop ?? obj.stop ?? obj.lower ?? obj.short;
                if (price == null || stop == null) return false;
                return price < stop;
            }
            case 'price_above_long': {
                const obj = getIndicatorObject() || {};
                const stop = obj.longStop ?? obj.stopLong ?? obj.long;
                if (price == null || stop == null) return false;
                return price > stop;
            }
            case 'price_below_short': {
                const obj = getIndicatorObject() || {};
                const stop = obj.shortStop ?? obj.stopShort ?? obj.short;
                if (price == null || stop == null) return false;
                return price < stop;
            }
            case 'price_above_pivot': {
                const obj = getIndicatorObject() || {};
                const pivot = obj.pp ?? obj.pivot ?? obj.PP ?? marketData.pp ?? marketData.pivot;
                if (pivot == null || price == null) return false;
                return price > pivot;
            }
            case 'price_above_r1': {
                const obj = getIndicatorObject() || {};
                const r1 = obj.r1 ?? obj.R1 ?? marketData.r1 ?? marketData.R1;
                if (r1 == null || price == null) return false;
                return price > r1;
            }
            case 'price_below_pivot': {
                const obj = getIndicatorObject() || {};
                const pivot = obj.pp ?? obj.pivot ?? obj.PP ?? marketData.pp ?? marketData.pivot;
                if (pivot == null || price == null) return false;
                return price < pivot;
            }
            case 'price_below_s1': {
                const obj = getIndicatorObject() || {};
                const s1 = obj.s1 ?? obj.S1 ?? marketData.s1 ?? marketData.S1;
                if (s1 == null || price == null) return false;
                return price < s1;
            }
            case 'price_cross_up': {
                const current = getValue();
                const prev = getValue(true);
                if (price == null || prevPrice == null || current == null || prev == null) return false;
                return prevPrice <= prev && price > current;
            }
            case 'price_cross_down': {
                const current = getValue();
                const prev = getValue(true);
                if (price == null || prevPrice == null || current == null || prev == null) return false;
                return prevPrice >= prev && price < current;
            }
            case 'price_above_cloud': {
                const ichi = getIchimoku();
                if (!ichi || price == null) return false;
                if (ichi.senkouA == null || ichi.senkouB == null) return false;
                const top = Math.max(ichi.senkouA, ichi.senkouB);
                return price > top;
            }
            case 'price_below_cloud': {
                const ichi = getIchimoku();
                if (!ichi || price == null) return false;
                if (ichi.senkouA == null || ichi.senkouB == null) return false;
                const bottom = Math.min(ichi.senkouA, ichi.senkouB);
                return price < bottom;
            }
            case 'price_above_lower': {
                const obj = getIndicatorObject() || {};
                const lower = obj.lower ?? obj.lowerBand ?? obj.bottom;
                if (lower == null || price == null) return false;
                return price > lower;
            }
            case 'price_below_upper': {
                const obj = getIndicatorObject() || {};
                const upper = obj.upper ?? obj.upperBand ?? obj.top;
                if (upper == null || price == null) return false;
                return price < upper;
            }
            case 'price_above_level618': {
                const obj = getIndicatorObject() || {};
                const level = obj.level618 ?? obj.level_618 ?? obj.fib618;
                if (level == null || price == null) return false;
                return price > level;
            }
            case 'price_above_level500': {
                const obj = getIndicatorObject() || {};
                const level = obj.level500 ?? obj.level_500 ?? obj.fib500;
                if (level == null || price == null) return false;
                return price > level;
            }
            case 'price_below_level382': {
                const obj = getIndicatorObject() || {};
                const level = obj.level382 ?? obj.level_382 ?? obj.fib382;
                if (level == null || price == null) return false;
                return price < level;
            }
            case 'price_below_level236': {
                const obj = getIndicatorObject() || {};
                const level = obj.level236 ?? obj.level_236 ?? obj.fib236;
                if (level == null || price == null) return false;
                return price < level;
            }
            case 'above_senkou_b': {
                const ichi = getIchimoku();
                if (!ichi) return false;
                return (getValue() ?? NaN) > (ichi.senkouB ?? NaN);
            }
            case 'below_senkou_b': {
                const ichi = getIchimoku();
                if (!ichi) return false;
                return (getValue() ?? NaN) < (ichi.senkouB ?? NaN);
            }

            // 크로스
            case 'cross_up':
                if (indicatorName === 'EhlersMESA') {
                    const obj = getIndicatorObject();
                    const prevObj = getIndicatorObject(true);
                    const mama = obj?.mama;
                    const fama = obj?.fama;
                    const prevMama = prevObj?.mama;
                    const prevFama = prevObj?.fama;
                    if (mama == null || fama == null || prevMama == null || prevFama == null) return false;
                    return prevMama <= prevFama && mama > fama;
                }
                if (values && values.length > 0) {
                    const current = getValue();
                    const prev = getValue(true);
                    if (current === null || prev === null) return false;
                    return values.some(v => prev <= v && current > v);
                }
                if (marketData.prevClose !== undefined && marketData.close !== undefined) {
                    const current = getValue();
                    const prev = getValue(true);
                    if (current === null || prev === null) return false;
                    return marketData.prevClose <= prev && marketData.close > current;
                }
                return (getValue() ?? -Infinity) > 0;
            case 'cross_down':
                if (indicatorName === 'EhlersMESA') {
                    const obj = getIndicatorObject();
                    const prevObj = getIndicatorObject(true);
                    const mama = obj?.mama;
                    const fama = obj?.fama;
                    const prevMama = prevObj?.mama;
                    const prevFama = prevObj?.fama;
                    if (mama == null || fama == null || prevMama == null || prevFama == null) return false;
                    return prevMama >= prevFama && mama < fama;
                }
                if (values && values.length > 0) {
                    const current = getValue();
                    const prev = getValue(true);
                    if (current === null || prev === null) return false;
                    return values.some(v => prev >= v && current < v);
                }
                if (marketData.prevClose !== undefined && marketData.close !== undefined) {
                    const current = getValue();
                    const prev = getValue(true);
                    if (current === null || prev === null) return false;
                    return marketData.prevClose >= prev && marketData.close < current;
                }
                return (getValue() ?? Infinity) < 0;
            case 'cross_up_middle': {
                const ch = getChannel();
                const prevCh = getChannel(true);
                if (!ch || !prevCh || price == null || prevPrice == null || ch.middle == null || prevCh.middle == null) return false;
                return prevPrice <= prevCh.middle && price > ch.middle;
            }
            case 'cross_down_middle': {
                const ch = getChannel();
                const prevCh = getChannel(true);
                if (!ch || !prevCh || price == null || prevPrice == null || ch.middle == null || prevCh.middle == null) return false;
                return prevPrice >= prevCh.middle && price < ch.middle;
            }
            case 'cross_up_signal': {
                if (indicatorName === 'MACD') {
                    const macd = marketData.macd;
                    const macdLine = macd?.MACD ?? macd?.macd ?? macd?.macdLine;
                    const signal = macd?.signal;
                    const prevMacd = macd?.prevMACD ?? macd?.prevMacd;
                    const prevSignal = macd?.prevSignal;
                    if (macdLine == null || signal == null || prevMacd == null || prevSignal == null) return false;
                    return prevMacd <= prevSignal && macdLine > signal;
                }
                const obj = getIndicatorObject();
                const prevObj = getIndicatorObject(true);
                const current = obj?.value ?? obj?.current ?? getValue();
                const signal = obj?.signal ?? obj?.signalLine ?? obj?.avg ?? obj?.ma;
                const prev = prevObj?.value ?? prevObj?.current ?? getValue(true);
                const prevSignal = prevObj?.signal ?? prevObj?.signalLine ?? prevObj?.avg ?? prevObj?.ma;
                if (current == null || signal == null || prev == null || prevSignal == null) return false;
                return prev <= prevSignal && current > signal;
            }
            case 'cross_down_signal': {
                if (indicatorName === 'MACD') {
                    const macd = marketData.macd;
                    const macdLine = macd?.MACD ?? macd?.macd ?? macd?.macdLine;
                    const signal = macd?.signal;
                    const prevMacd = macd?.prevMACD ?? macd?.prevMacd;
                    const prevSignal = macd?.prevSignal;
                    if (macdLine == null || signal == null || prevMacd == null || prevSignal == null) return false;
                    return prevMacd >= prevSignal && macdLine < signal;
                }
                const obj = getIndicatorObject();
                const prevObj = getIndicatorObject(true);
                const current = obj?.value ?? obj?.current ?? getValue();
                const signal = obj?.signal ?? obj?.signalLine ?? obj?.avg ?? obj?.ma;
                const prev = prevObj?.value ?? prevObj?.current ?? getValue(true);
                const prevSignal = prevObj?.signal ?? prevObj?.signalLine ?? prevObj?.avg ?? prevObj?.ma;
                if (current == null || signal == null || prev == null || prevSignal == null) return false;
                return prev >= prevSignal && current < signal;
            }
            case 'cross_up_sma': {
                const series = getIndicatorSeries();
                const smaPeriod = Array.isArray(paramSet) ? paramSet[0] : (paramSet ?? 14);
                if (!series || series.length < smaPeriod + 1 || smaPeriod <= 1) return false;
                const current = series[series.length - 1];
                const prev = series[series.length - 2];
                const smaSlice = series.slice(-smaPeriod);
                const prevSmaSlice = series.slice(-smaPeriod - 1, -1);
                if (smaSlice.length < smaPeriod || prevSmaSlice.length < smaPeriod) return false;
                const sma = smaSlice.reduce((a, b) => a + b, 0) / smaPeriod;
                const prevSma = prevSmaSlice.reduce((a, b) => a + b, 0) / smaPeriod;
                return prev <= prevSma && current > sma;
            }
            case 'cross_down_sma': {
                const series = getIndicatorSeries();
                const smaPeriod = Array.isArray(paramSet) ? paramSet[0] : (paramSet ?? 14);
                if (!series || series.length < smaPeriod + 1 || smaPeriod <= 1) return false;
                const current = series[series.length - 1];
                const prev = series[series.length - 2];
                const smaSlice = series.slice(-smaPeriod);
                const prevSmaSlice = series.slice(-smaPeriod - 1, -1);
                if (smaSlice.length < smaPeriod || prevSmaSlice.length < smaPeriod) return false;
                const sma = smaSlice.reduce((a, b) => a + b, 0) / smaPeriod;
                const prevSma = prevSmaSlice.reduce((a, b) => a + b, 0) / smaPeriod;
                return prev >= prevSma && current < sma;
            }
            case 'cross_up_kijun': {
                const tenkan = getValue();
                const prevTenkan = getValue(true);
                const kijun = marketData.ichimoku?.kijun ?? this.getIndicatorValue('IchimokuKijun', marketData, [26]);
                const prevKijun = this.getIndicatorValue('IchimokuKijun', marketData, [26], true);
                if (tenkan == null || prevTenkan == null || kijun == null || prevKijun == null) return false;
                return prevTenkan <= prevKijun && tenkan > kijun;
            }
            case 'cross_down_kijun': {
                const tenkan = getValue();
                const prevTenkan = getValue(true);
                const kijun = marketData.ichimoku?.kijun ?? this.getIndicatorValue('IchimokuKijun', marketData, [26]);
                const prevKijun = this.getIndicatorValue('IchimokuKijun', marketData, [26], true);
                if (tenkan == null || prevTenkan == null || kijun == null || prevKijun == null) return false;
                return prevTenkan >= prevKijun && tenkan < kijun;
            }

            // 기울기/방향
            case 'slope_up':
            case 'rising':
            case 'crossUp':
            case 'increasing':
            case 'expanding_up':
                {
                    const cur = getValue(); const prev = getValue(true);
                    return cur != null && prev != null && cur > prev;
                }
            case 'slope_down':
            case 'falling':
            case 'decreasing':
            case 'contracting':
            case 'crossDown':
                {
                    const cur = getValue(); const prev = getValue(true);
                    return cur != null && prev != null && cur < prev;
                }

            // 골든/데드 크로스 (단기 > 중기 > 장기 정배열)
            case 'ema_golden':
            case 'golden_cross':
                {
                    if (indicatorName === 'MACD') {
                        const macdObj = getIndicatorObject() ?? marketData.macd;
                        const macdLine = macdObj?.MACD ?? macdObj?.macd ?? macdObj?.macdLine;
                        const signal = macdObj?.signal ?? macdObj?.signalLine;
                        const prevMacd = macdObj?.prevMACD ?? macdObj?.prevMacd;
                        const prevSignal = macdObj?.prevSignal;
                        if (macdLine == null || signal == null || prevMacd == null || prevSignal == null) return false;
                        return prevMacd <= prevSignal && macdLine > signal;
                    }
                    const shortEma = getValue();
                    let midEma = null;
                    let longEma = null;
                    if (indicatorName === 'EMA') {
                        const shortPeriod = Array.isArray(paramSet) ? paramSet[0] : null;
                        const def = this.getIndicatorDefinition(indicatorName);
                        const periods = [...new Set([...(def?.buyPeriods || []), ...(def?.sellPeriods || [])])]
                            .filter(p => Number.isFinite(p))
                            .sort((a, b) => a - b);
                        if (shortPeriod != null) {
                            const larger = periods.filter(p => p > shortPeriod);
                            const midPeriod = larger[0];
                            const longPeriod = larger[1] ?? larger[0];
                            if (midPeriod) midEma = marketData[`ema${midPeriod}`] ?? this.getIndicatorValue('EMA', marketData, [midPeriod]);
                            if (longPeriod) longEma = marketData[`ema${longPeriod}`] ?? this.getIndicatorValue('EMA', marketData, [longPeriod]);
                        }
                    }
                    if (midEma == null) midEma = marketData.ema20 ?? this.getIndicatorValue('EMA', marketData, [20]);
                    if (longEma == null) longEma = marketData.ema50 ?? this.getIndicatorValue('EMA', marketData, [50]);
                    return shortEma != null && midEma != null && longEma != null && shortEma > midEma && midEma > longEma;
                }
            case 'ema_dead':
            case 'dead_cross':
                {
                    if (indicatorName === 'MACD') {
                        const macdObj = getIndicatorObject() ?? marketData.macd;
                        const macdLine = macdObj?.MACD ?? macdObj?.macd ?? macdObj?.macdLine;
                        const signal = macdObj?.signal ?? macdObj?.signalLine;
                        const prevMacd = macdObj?.prevMACD ?? macdObj?.prevMacd;
                        const prevSignal = macdObj?.prevSignal;
                        if (macdLine == null || signal == null || prevMacd == null || prevSignal == null) return false;
                        return prevMacd >= prevSignal && macdLine < signal;
                    }
                    const shortEma = getValue();
                    let midEma = null;
                    let longEma = null;
                    if (indicatorName === 'EMA') {
                        const shortPeriod = Array.isArray(paramSet) ? paramSet[0] : null;
                        const def = this.getIndicatorDefinition(indicatorName);
                        const periods = [...new Set([...(def?.buyPeriods || []), ...(def?.sellPeriods || [])])]
                            .filter(p => Number.isFinite(p))
                            .sort((a, b) => a - b);
                        if (shortPeriod != null) {
                            const larger = periods.filter(p => p > shortPeriod);
                            const midPeriod = larger[0];
                            const longPeriod = larger[1] ?? larger[0];
                            if (midPeriod) midEma = marketData[`ema${midPeriod}`] ?? this.getIndicatorValue('EMA', marketData, [midPeriod]);
                            if (longPeriod) longEma = marketData[`ema${longPeriod}`] ?? this.getIndicatorValue('EMA', marketData, [longPeriod]);
                        }
                    }
                    if (midEma == null) midEma = marketData.ema20 ?? this.getIndicatorValue('EMA', marketData, [20]);
                    if (longEma == null) longEma = marketData.ema50 ?? this.getIndicatorValue('EMA', marketData, [50]);
                    return shortEma != null && midEma != null && longEma != null && shortEma < midEma && midEma < longEma;
                }

            // Ehlers Sinewave 특수
            case 'bull_cross':
                {
                    if (indicatorName !== 'EhlersSinewave') return false;
                    const obj = getIndicatorObject();
                    const prevObj = getIndicatorObject(true);
                    const sine = obj?.sine;
                    const lead = obj?.leadSine;
                    const prevSine = prevObj?.sine;
                    const prevLead = prevObj?.leadSine;
                    if (sine == null || lead == null || prevSine == null || prevLead == null) return false;
                    return prevSine <= prevLead && sine > lead;
                }
            case 'bear_cross':
                {
                    if (indicatorName !== 'EhlersSinewave') return false;
                    const obj = getIndicatorObject();
                    const prevObj = getIndicatorObject(true);
                    const sine = obj?.sine;
                    const lead = obj?.leadSine;
                    const prevSine = prevObj?.sine;
                    const prevLead = prevObj?.leadSine;
                    if (sine == null || lead == null || prevSine == null || prevLead == null) return false;
                    return prevSine >= prevLead && sine < lead;
                }
            case 'sine_negative':
                {
                    if (indicatorName !== 'EhlersSinewave') return false;
                    const obj = getIndicatorObject();
                    return typeof obj?.sine === 'number' ? obj.sine < 0 : false;
                }
            case 'sine_positive':
                {
                    if (indicatorName !== 'EhlersSinewave') return false;
                    const obj = getIndicatorObject();
                    return typeof obj?.sine === 'number' ? obj.sine > 0 : false;
                }

            // MACD 관련
            case 'histogram_positive':
                return (getHistogramValue() ?? 0) > 0;
            case 'histogram_negative':
                return (getHistogramValue() ?? 0) < 0;
            case 'histogram_increasing':
            case 'histogram_rising':
                {
                    const currentHist = getHistogramValue();
                    const prevHist = getHistogramValue(true);
                    return currentHist != null && prevHist != null && currentHist > prevHist;
                }
            case 'histogram_decreasing':
                {
                    const currentHist = getHistogramValue();
                    const prevHist = getHistogramValue(true);
                    return currentHist != null && prevHist != null && currentHist < prevHist;
                }
            case 'above_zero':
                return (getValue() ?? -Infinity) > 0;
            case 'below_zero':
                return (getValue() ?? Infinity) < 0;
            case 'turn_positive': {
                const current = getValue();
                const prev = getValue(true);
                return current != null && prev != null && prev <= 0 && current > 0;
            }
            case 'turn_negative': {
                const current = getValue();
                const prev = getValue(true);
                return current != null && prev != null && prev >= 0 && current < 0;
            }
            case 'increasing_from_negative': {
                const current = getValue();
                const prev = getValue(true);
                return current != null && prev != null && prev < 0 && current > prev;
            }
            case 'cross_up_zero':
                {
                    const current = getValue();
                    const prev = getValue(true);
                    return current != null && prev != null && prev <= 0 && current > 0;
                }
            case 'cross_down_zero':
                {
                    const current = getValue();
                    const prev = getValue(true);
                    return current != null && prev != null && prev >= 0 && current < 0;
                }

            // RSI 특수
            case 'rising_from_oversold':
                {
                    const current = getValue();
                    const prev = getValue(true);
                    return current != null && prev != null && current > 30 && current < 50 && prev < 30;
                }
            case 'falling_from_overbought':
                {
                    const current = getValue();
                    const prev = getValue(true);
                    return current != null && prev != null && current < 70 && current > 50 && prev > 70;
                }
            case 'bullish_divergence':
            case 'bearish_divergence':
                {
                    const flag = getFlagFromObject();
                    if (typeof flag === 'boolean') return flag;
                    const currentPrice = price ?? marketData.close;
                    const prevPriceSafe = prevPrice ?? marketData.prevClose ?? marketData.prevPrice;
                    if (currentPrice == null || prevPriceSafe == null) return false;

                    const isBullish = type === 'bullish_divergence';
                    const priceDown = currentPrice < prevPriceSafe;
                    const priceUp = currentPrice > prevPriceSafe;

                    let currentIndicator = null;
                    let prevIndicator = null;

                    if (indicatorName === 'RSI') {
                        currentIndicator = marketData.rsi ?? getValue();
                        prevIndicator = marketData.prevRsi ?? getValue(true);
                    } else if (indicatorName === 'MACD') {
                        const macdObj = getIndicatorObject() ?? marketData.macd;
                        currentIndicator = macdObj?.MACD ?? macdObj?.macd ?? macdObj?.macdLine ?? getValue();
                        prevIndicator = macdObj?.prevMACD ?? macdObj?.prevMacd ?? getValue(true);
                    } else if (indicatorName === 'StochasticK') {
                        currentIndicator = marketData.stochasticK ?? marketData.stochK ?? getValue();
                        prevIndicator = marketData.prevStochK ?? getValue(true);
                    } else if (indicatorName === 'StochasticD') {
                        currentIndicator = marketData.stochasticD ?? marketData.stochD ?? getValue();
                        prevIndicator = marketData.prevStochD ?? getValue(true);
                    } else if (indicatorName === 'OBV') {
                        currentIndicator = marketData.obv ?? getValue();
                        prevIndicator = marketData.prevObv ?? getValue(true);
                    } else if (indicatorName === 'ADL') {
                        currentIndicator = marketData.adl ?? getValue();
                        prevIndicator = marketData.prevAdl ?? getValue(true);
                    } else {
                        currentIndicator = getValue();
                        prevIndicator = getValue(true);
                    }

                    if (currentIndicator == null || prevIndicator == null) return false;
                    if (isBullish) return priceDown && currentIndicator > prevIndicator;
                    return priceUp && currentIndicator < prevIndicator;
                }

            case 'bullish':
            case 'bearish':
            case 'oversold':
            case 'overbought':
            case 'buy_signal':
            case 'sell_signal':
            case 'nearSupport':
            case 'nearResist':
            case 'near_support':
            case 'near_resist':
            case 'strongUp':
            case 'strongDown':
            case 'strong_up':
            case 'strong_down':
            case 'bullishDivergence':
            case 'bearishDivergence':
                {
                    const flag = getFlagFromObject();
                    if (typeof flag === 'boolean') return flag;

                    const current = getValue();
                    if (type === 'nearSupport' || type === 'near_support') {
                        const support = marketData.support ?? marketData.keyLevels?.nearestSupport;
                        if (price != null && support != null) {
                            const threshold = values?.[0] ?? 1;
                            return Math.abs((price - support) / price) * 100 <= threshold;
                        }
                    }
                    if (type === 'nearResist' || type === 'near_resist') {
                        const resist = marketData.resistance ?? marketData.keyLevels?.nearestResistance;
                        if (price != null && resist != null) {
                            const threshold = values?.[0] ?? 1;
                            return Math.abs((resist - price) / price) * 100 <= threshold;
                        }
                    }

                    if (type === 'bullish' || type === 'strongUp' || type === 'strong_up') return current != null ? current > 0 : false;
                    if (type === 'bearish' || type === 'strongDown' || type === 'strong_down') return current != null ? current < 0 : false;
                    if (type === 'oversold') return current != null ? current < (values?.[0] ?? 30) : false;
                    if (type === 'overbought') return current != null ? current > (values?.[0] ?? 70) : false;
                    return false;
                }

            // Ehlers MESA (MAMA/FAMA)
            case 'mama_above_fama':
                {
                    const obj = getIndicatorObject();
                    const mama = obj?.mama;
                    const fama = obj?.fama;
                    if (mama == null || fama == null) return false;
                    return mama > fama;
                }
            case 'mama_below_fama':
                {
                    const obj = getIndicatorObject();
                    const mama = obj?.mama;
                    const fama = obj?.fama;
                    if (mama == null || fama == null) return false;
                    return mama < fama;
                }

            // Williams Alligator / Gator Oscillator
            case 'mouth_open_up':
                {
                    const obj = getIndicatorObject() || {};
                    if (obj.mouthOpen == null && obj.jaw == null) return false;
                    const trend = obj.trend ?? 0;
                    return !!obj.mouthOpen && trend > 0;
                }
            case 'mouth_open_down':
                {
                    const obj = getIndicatorObject() || {};
                    if (obj.mouthOpen == null && obj.jaw == null) return false;
                    const trend = obj.trend ?? 0;
                    return !!obj.mouthOpen && trend < 0;
                }
            case 'price_above_all':
                {
                    const obj = getIndicatorObject() || {};
                    const curPrice = price ?? marketData.close;
                    if (obj.priceAbove === true) return true;
                    if (curPrice == null || obj.jaw == null || obj.teeth == null || obj.lips == null) return false;
                    return curPrice > obj.jaw && curPrice > obj.teeth && curPrice > obj.lips;
                }
            case 'price_below_all':
                {
                    const obj = getIndicatorObject() || {};
                    const curPrice = price ?? marketData.close;
                    if (curPrice == null || obj.jaw == null || obj.teeth == null || obj.lips == null) return false;
                    return curPrice < obj.jaw && curPrice < obj.teeth && curPrice < obj.lips;
                }
            case 'lips_above_teeth':
                {
                    const obj = getIndicatorObject() || {};
                    if (obj.lips == null || obj.teeth == null) return false;
                    return obj.lips > obj.teeth;
                }
            case 'lips_below_teeth':
                {
                    const obj = getIndicatorObject() || {};
                    if (obj.lips == null || obj.teeth == null) return false;
                    return obj.lips < obj.teeth;
                }
            case 'above_middle': {
                const ch = getChannel();
                if (!ch || price == null || ch.middle == null) return false;
                return price > ch.middle;
            }
            case 'below_middle': {
                const ch = getChannel();
                if (!ch || price == null || ch.middle == null) return false;
                return price < ch.middle;
            }
            case 'awake':
                {
                    const obj = getIndicatorObject() || {};
                    return obj.awake === true;
                }
            case 'sleeping':
                {
                    const obj = getIndicatorObject() || {};
                    if (obj.awake === undefined) return false;
                    return obj.awake === false;
                }
            case 'upper_increasing':
                {
                    const obj = getIndicatorObject() || {};
                    const prevObj = getIndicatorObject(true) || {};
                    if (obj.upper == null || prevObj.upper == null) return false;
                    return obj.upper > prevObj.upper;
                }
            case 'lower_decreasing':
                {
                    const obj = getIndicatorObject() || {};
                    const prevObj = getIndicatorObject(true) || {};
                    if (obj.lower == null || prevObj.lower == null) return false;
                    return obj.lower < prevObj.lower;
                }

            case 'current_swing_up':
            case 'current_swing_down':
                {
                    const flag = getFlagFromObject();
                    if (typeof flag === 'boolean') return flag;
                    if (typeof flag === 'string') {
                        return type === 'current_swing_up'
                            ? flag.toLowerCase() === 'up'
                            : flag.toLowerCase() === 'down';
                    }
                    const obj = getIndicatorObject();
                    const swing = obj?.currentSwing ?? obj?.swing ?? obj?.direction;
                    if (typeof swing === 'string') {
                        return type === 'current_swing_up'
                            ? swing.toLowerCase() === 'up'
                            : swing.toLowerCase() === 'down';
                    }
                    return false;
                }

            // Swing High/Low
            case 'swing_low': {
                const obj = getIndicatorObject() || {};
                return obj.swingLow != null;
            }
            case 'swing_high': {
                const obj = getIndicatorObject() || {};
                return obj.swingHigh != null;
            }
            case 'higher_low': {
                const obj = getIndicatorObject() || {};
                const prevObj = getIndicatorObject(true) || {};
                return obj.swingLow != null && prevObj.swingLow != null && obj.swingLow > prevObj.swingLow;
            }
            case 'lower_high': {
                const obj = getIndicatorObject() || {};
                const prevObj = getIndicatorObject(true) || {};
                return obj.swingHigh != null && prevObj.swingHigh != null && obj.swingHigh < prevObj.swingHigh;
            }

            // VWMA 특수
            case 'vwma_above_sma':
                {
                    const period = Array.isArray(paramSet) ? paramSet[0] : (paramSet ?? 20);
                    const vwma = marketData.vwma ?? marketData[`vwma${period}`] ?? this.getIndicatorValue('VWMA', marketData, [period]);
                    const sma = marketData.sma20 ?? marketData[`sma${period}`] ?? this.getIndicatorValue('SMA', marketData, [period]);
                    return vwma != null && sma != null && vwma > sma;
                }
            case 'vwma_below_sma':
                {
                    const period = Array.isArray(paramSet) ? paramSet[0] : (paramSet ?? 20);
                    const vwma = marketData.vwma ?? marketData[`vwma${period}`] ?? this.getIndicatorValue('VWMA', marketData, [period]);
                    const sma = marketData.sma20 ?? marketData[`sma${period}`] ?? this.getIndicatorValue('SMA', marketData, [period]);
                    return vwma != null && sma != null && vwma < sma;
                }

            // Guppy 특수
            case 'short_above_long':
                {
                    const short = marketData.guppyShort ?? marketData.guppyshort ?? this.getIndicatorValue('GuppyShort', marketData, null);
                    const long = marketData.guppyLong ?? marketData.guppylong ?? this.getIndicatorValue('GuppyLong', marketData, null);
                    return short != null && long != null && short > long;
                }
            case 'short_below_long':
                {
                    const short = marketData.guppyShort ?? marketData.guppyshort ?? this.getIndicatorValue('GuppyShort', marketData, null);
                    const long = marketData.guppyLong ?? marketData.guppylong ?? this.getIndicatorValue('GuppyLong', marketData, null);
                    return short != null && long != null && short < long;
                }

            // BB 특수 (bb.position 또는 bollingerBands.position 지원)
            case 'touch_upper': {
                const ch = getChannel() || { upper: marketData.bb?.upper ?? marketData.bollingerBands?.upper };
                if (price == null || ch.upper == null) return false;
                return price >= ch.upper;
            }
            case 'touch_lower': {
                const ch = getChannel() || { lower: marketData.bb?.lower ?? marketData.bollingerBands?.lower };
                if (price == null || ch.lower == null) return false;
                return price <= ch.lower;
            }
            case 'upper_touch': {
                const ch = getChannel();
                if (!ch || price == null || ch.upper == null) return false;
                const tolerance = getNearTolerance();
                if (tolerance > 0) return Math.abs(price - ch.upper) <= tolerance;
                return price >= ch.upper;
            }
            case 'lower_touch': {
                const ch = getChannel();
                if (!ch || price == null || ch.lower == null) return false;
                const tolerance = getNearTolerance();
                if (tolerance > 0) return Math.abs(price - ch.lower) <= tolerance;
                return price <= ch.lower;
            }
            case 'above_upper': {
                const ch = getChannel() || { upper: marketData.bb?.upper ?? marketData.bollingerBands?.upper };
                if (price == null || ch.upper == null) return false;
                return price > ch.upper;
            }
            case 'below_lower': {
                const ch = getChannel() || { lower: marketData.bb?.lower ?? marketData.bollingerBands?.lower };
                if (price == null || ch.lower == null) return false;
                return price < ch.lower;
            }
            case 'bounce_from_lower': {
                const ch = getChannel();
                if (!ch || price == null || prevPrice == null || ch.lower == null) return false;
                return prevPrice <= ch.lower && price > ch.lower;
            }
            case 'reject_from_upper': {
                const ch = getChannel();
                if (!ch || price == null || prevPrice == null || ch.upper == null) return false;
                return prevPrice >= ch.upper && price < ch.upper;
            }
            case 'squeeze':
                {
                    const bw = getValue() ?? getChannel()?.bandwidth ?? getIndicatorObject()?.bandwidth ?? marketData.bb?.bandwidth ?? marketData.bollingerBands?.bandwidth;
                    if (bw == null) return false;
                    if (percentiles) return matchPercentileLow(bw);
                    return bw < 5;
                }
            case 'expanding': {
                if (isVolatilityIndicator) {
                    const current = getValue();
                    const prev = getValue(true);
                    return current != null && prev != null && current > prev;
                }
                const bw = getValue() ?? getChannel()?.bandwidth ?? marketData.bb?.bandwidth ?? marketData.bollingerBands?.bandwidth;
                return bw != null ? bw > 10 : false;
            }
            case 'width_expanding': {
                const ch = getChannel() || { bandwidth: marketData.bb?.bandwidth ?? marketData.bollingerBands?.bandwidth };
                const prevCh = getChannel(true) || { bandwidth: marketData.bollingerBands?.prevBandwidth ?? marketData.bb?.prevBandwidth };
                if (ch.bandwidth == null || prevCh.bandwidth == null) return false;
                return ch.bandwidth > prevCh.bandwidth;
            }
            case 'squeeze_on': {
                const ch = getChannel();
                if (ch?.squeezeOn !== undefined) return !!ch.squeezeOn;
                const bw = marketData.bb?.bandwidth ?? marketData.bollingerBands?.bandwidth ?? ch?.bandwidth ?? getIndicatorObject()?.bandwidth;
                return bw != null ? bw < 5 : false;
            }
            case 'squeeze_release_up': {
                const bw = marketData.bb?.bandwidth ?? marketData.bollingerBands?.bandwidth ?? getChannel()?.bandwidth ?? getIndicatorObject()?.bandwidth;
                const prevBw = marketData.bollingerBands?.prevBandwidth ?? marketData.bb?.prevBandwidth ?? getChannel(true)?.bandwidth ?? getIndicatorObject(true)?.bandwidth;
                if (bw == null || prevBw == null || price == null || prevPrice == null) return false;
                return prevBw < 5 && bw >= 5 && price > prevPrice;
            }
            case 'squeeze_release_down': {
                const bw = marketData.bb?.bandwidth ?? marketData.bollingerBands?.bandwidth ?? getChannel()?.bandwidth ?? getIndicatorObject()?.bandwidth;
                const prevBw = marketData.bollingerBands?.prevBandwidth ?? marketData.bb?.prevBandwidth ?? getChannel(true)?.bandwidth ?? getIndicatorObject(true)?.bandwidth;
                if (bw == null || prevBw == null || price == null || prevPrice == null) return false;
                return prevBw < 5 && bw >= 5 && price < prevPrice;
            }
            case 'low_volatility': {
                const threshold = values?.[0] ?? 5;
                if (isVolatilityIndicator) {
                    const current = getValue();
                    return current != null && current < threshold;
                }
                const bw = marketData.bb?.bandwidth ?? marketData.bollingerBands?.bandwidth;
                if (bw == null) return false;
                return bw < threshold;
            }
            case 'extreme_wide': {
                const bw = marketData.bb?.bandwidth ?? marketData.bollingerBands?.bandwidth;
                if (bw == null) return false;
                if (percentiles) return matchPercentileHigh(bw);
                const threshold = values?.[0] ?? 10;
                return bw > threshold;
            }

            // Volume Profile
            case 'above_poc': {
                const obj = getIndicatorObject() || {};
                return obj.abovePOC === true;
            }
            case 'below_poc': {
                const obj = getIndicatorObject() || {};
                return obj.belowPOC === true;
            }
            case 'near_poc_support':
            case 'near_poc_resistance': {
                const obj = getIndicatorObject() || {};
                if (obj.nearPOC === true) return true;
                const poc = obj.poc;
                const curPrice = price ?? marketData.close;
                if (poc == null || curPrice == null) return false;
                const tolerance = getNearTolerance();
                return tolerance > 0 ? Math.abs(curPrice - poc) <= tolerance : false;
            }

            // Stochastic 특수 (stochasticK/D 또는 stochK/D 또는 stochastic.k/d)
            case 'k_cross_up_d': {
                const stochK = marketData.stochasticK ?? marketData.stochK ?? marketData.stochastic?.k;
                const stochD = marketData.stochasticD ?? marketData.stochD ?? marketData.stochastic?.d;
                const prevK = marketData.prevStochK ?? marketData.stochastic?.prevK ?? marketData.prevK;
                const prevD = marketData.prevStochD ?? marketData.stochastic?.prevD ?? marketData.prevD;
                if (stochK == null || stochD == null) return false;
                if (prevK != null && prevD != null) return prevK <= prevD && stochK > stochD;
                return stochK > stochD;
            }
            case 'k_cross_down_d': {
                const stochK = marketData.stochasticK ?? marketData.stochK ?? marketData.stochastic?.k;
                const stochD = marketData.stochasticD ?? marketData.stochD ?? marketData.stochastic?.d;
                const prevK = marketData.prevStochK ?? marketData.stochastic?.prevK ?? marketData.prevK;
                const prevD = marketData.prevStochD ?? marketData.stochastic?.prevD ?? marketData.prevD;
                if (stochK == null || stochD == null) return false;
                if (prevK != null && prevD != null) return prevK >= prevD && stochK < stochD;
                return stochK < stochD;
            }
            case 'both_oversold': {
                const stochK = marketData.stochasticK ?? marketData.stochK ?? marketData.stochastic?.k;
                const stochD = marketData.stochasticD ?? marketData.stochD ?? marketData.stochastic?.d;
                return stochK != null && stochD != null ? stochK < 20 && stochD < 20 : false;
            }
            case 'both_overbought': {
                const stochK = marketData.stochasticK ?? marketData.stochK ?? marketData.stochastic?.k;
                const stochD = marketData.stochasticD ?? marketData.stochD ?? marketData.stochastic?.d;
                return stochK != null && stochD != null ? stochK > 80 && stochD > 80 : false;
            }

            // DI / Plus-Minus 관련
            case 'cross_up_plus_di': {
                const { plus, minus, prevPlus, prevMinus } = getDi();
                if (plus == null || minus == null || prevPlus == null || prevMinus == null) return false;
                return prevPlus <= prevMinus && plus > minus;
            }
            case 'cross_down_plus_di': {
                const { plus, minus, prevPlus, prevMinus } = getDi();
                if (plus == null || minus == null || prevPlus == null || prevMinus == null) return false;
                return prevPlus >= prevMinus && plus < minus;
            }
            case 'cross_up_minus_di': {
                const { plus, minus, prevPlus, prevMinus } = getDi();
                if (plus == null || minus == null || prevPlus == null || prevMinus == null) return false;
                return prevMinus <= prevPlus && minus > plus;
            }
            case 'cross_down_minus_di': {
                const { plus, minus, prevPlus, prevMinus } = getDi();
                if (plus == null || minus == null || prevPlus == null || prevMinus == null) return false;
                return prevMinus >= prevPlus && minus < plus;
            }
            case 'cross_up_plus': {
                const { plus, minus, prevPlus, prevMinus } = getPlusMinus();
                if (plus == null || minus == null || prevPlus == null || prevMinus == null) return false;
                return prevPlus <= prevMinus && plus > minus;
            }
            case 'cross_down_plus': {
                const { plus, minus, prevPlus, prevMinus } = getPlusMinus();
                if (plus == null || minus == null || prevPlus == null || prevMinus == null) return false;
                return prevPlus >= prevMinus && plus < minus;
            }
            case 'cross_up_minus': {
                const { plus, minus, prevPlus, prevMinus } = getPlusMinus();
                if (plus == null || minus == null || prevPlus == null || prevMinus == null) return false;
                return prevMinus <= prevPlus && minus > plus;
            }
            case 'cross_down_minus': {
                const { plus, minus, prevPlus, prevMinus } = getPlusMinus();
                if (plus == null || minus == null || prevPlus == null || prevMinus == null) return false;
                return prevMinus >= prevPlus && minus < plus;
            }
            case 'gt_plus_di': {
                const { plus } = getDi();
                if (plus == null) return false;
                return plus > (values?.[0] ?? 25);
            }
            case 'lt_plus_di': {
                const { plus } = getDi();
                if (plus == null) return false;
                return plus < (values?.[0] ?? 20);
            }
            case 'gt_minus_di': {
                const { minus } = getDi();
                if (minus == null) return false;
                return minus > (values?.[0] ?? 25);
            }
            case 'lt_minus_di': {
                const { minus } = getDi();
                if (minus == null) return false;
                return minus < (values?.[0] ?? 20);
            }
            case 'gt_plus':
                return values ? values.some(v => (getPlusMinus().plus ?? NaN) > v) : false;
            case 'lt_plus':
                return values ? values.some(v => (getPlusMinus().plus ?? NaN) < v) : false;
            case 'gt_minus':
                return values ? values.some(v => (getPlusMinus().minus ?? NaN) > v) : false;
            case 'lt_minus':
                return values ? values.some(v => (getPlusMinus().minus ?? NaN) < v) : false;

            // 고저/변동성 계열
            case 'high': {
                const current = getValue();
                const prev = getValue(true);
                if (percentiles) return matchPercentileHigh(current);
                return values ? values.some(v => (current ?? NaN) > v) : (current != null && prev != null && current > prev);
            }
            case 'low': {
                const current = getValue();
                const prev = getValue(true);
                if (percentiles) return matchPercentileLow(current);
                return values ? values.some(v => (current ?? NaN) < v) : (current != null && prev != null && current < prev);
            }
            case 'high_gt': {
                const obj = getIndicatorObject() || {};
                const value = obj.high ?? obj.rwiHigh ?? obj.highValue;
                return value != null && values ? values.some(v => value > v) : false;
            }
            case 'low_gt': {
                const obj = getIndicatorObject() || {};
                const value = obj.low ?? obj.rwiLow ?? obj.lowValue;
                return value != null && values ? values.some(v => value > v) : false;
            }
            case 'extreme_high': {
                const current = getValue();
                const prev = getValue(true);
                return values ? values.some(v => (current ?? NaN) > v) : (current != null && prev != null && current > prev * 1.5);
            }

            // 돌파/이탈
            case 'breakout_up': {
                const ch = getChannel();
                if (!ch || price == null || ch.upper == null) return false;
                return price > ch.upper;
            }
            case 'breakout_down': {
                const ch = getChannel();
                if (!ch || price == null || ch.lower == null) return false;
                return price < ch.lower;
            }
            case 'breakout': {
                const current = getValue();
                const prev = getValue(true);
                return current != null && prev != null && current > prev;
            }
            case 'breakdown': {
                const current = getValue();
                const prev = getValue(true);
                return current != null && prev != null && current < prev;
            }

            // 캔들 색상 계열
            case 'green_bar':
                return marketData.close > marketData.open;
            case 'fade_bar':
                return marketData.close < marketData.open;
            case 'falling_from_high': {
                const current = getValue();
                const prev = getValue(true);
                if (values && values.length > 0) return current != null && prev != null && prev >= values[0] && current < prev;
                return current != null && prev != null && current < prev;
            }

            // 복합 패턴 (미구현)
            case 'twin_peaks_buy':
                {
                    const ao = getAOSeries();
                    if (!ao || ao.length < 6) return false;
                    const troughs = [];
                    for (let i = ao.length - 2; i >= 1; i--) {
                        if (ao[i] < ao[i - 1] && ao[i] < ao[i + 1] && ao[i] < 0) {
                            troughs.push({ idx: i, val: ao[i] });
                            if (troughs.length === 2) break;
                        }
                    }
                    if (troughs.length < 2) return false;
                    const [last, prev] = troughs;
                    return last.val > prev.val && ao[ao.length - 1] > ao[last.idx];
                }
            case 'twin_peaks_sell':
                {
                    const ao = getAOSeries();
                    if (!ao || ao.length < 6) return false;
                    const peaks = [];
                    for (let i = ao.length - 2; i >= 1; i--) {
                        if (ao[i] > ao[i - 1] && ao[i] > ao[i + 1] && ao[i] > 0) {
                            peaks.push({ idx: i, val: ao[i] });
                            if (peaks.length === 2) break;
                        }
                    }
                    if (peaks.length < 2) return false;
                    const [last, prev] = peaks;
                    return last.val < prev.val && ao[ao.length - 1] < ao[last.idx];
                }
            case 'saucer_buy':
                {
                    const ao = getAOSeries();
                    if (!ao || ao.length < 4) return false;
                    const a = ao[ao.length - 3];
                    const b = ao[ao.length - 2];
                    const c = ao[ao.length - 1];
                    // Saucer Buy: V자 패턴 (dip → recovery) in positive territory
                    return a > b && c > b && b > 0;
                }

            // 주요 커스텀/복합 지표 신호 매핑
            case 'bias_positive':
            case 'bias_negative':
            case 'persistent_up':
            case 'persistent_down':
                {
                    const obj = getIndicatorObject() || {};
                    const bias = obj.bias ?? obj.biasValue ?? obj.value;
                    const persistent = obj.persistent ?? obj.isPersistent;
                    if (bias == null) return false;
                    if (type === 'bias_positive') return bias > 0;
                    if (type === 'bias_negative') return bias < 0;
                    if (type === 'persistent_up') return !!persistent && bias > 0;
                    if (type === 'persistent_down') return !!persistent && bias < 0;
                    return false;
                }
            case 'consistent_up':
            case 'consistent_down':
            case 'strong_consistency':
            case 'choppy':
                {
                    const obj = getIndicatorObject() || {};
                    if (type === 'consistent_up') return !!(obj.consistentUp ?? obj.consistent_up);
                    if (type === 'consistent_down') return !!(obj.consistentDown ?? obj.consistent_down);
                    if (type === 'strong_consistency') return !!(obj.strongConsistency ?? obj.strong_consistency);
                    if (type === 'choppy') return !!obj.choppy;
                    return false;
                }
            case 'confirmed':
            case 'not_confirmed':
            case 'confirm_high':
                {
                    const obj = getIndicatorObject() || {};
                    const confirmed = obj.confirmed ?? obj.confirm ?? obj.confirmation;
                    const ratio = obj.confirmRatio ?? obj.confirm_ratio ?? obj.ratio;
                    if (type === 'confirmed') return !!confirmed;
                    if (type === 'not_confirmed') return confirmed === false;
                    const threshold = values?.[0] ?? 70;
                    return ratio != null && ratio > threshold;
                }
            case 'near_resistance':
            case 'position_low':
            case 'position_high':
                {
                    const obj = getIndicatorObject() || {};
                    const support = obj.support ?? obj.lower ?? marketData.support;
                    const resistance = obj.resistance ?? obj.upper ?? marketData.resistance;
                    const position = obj.position;
                    const curPrice = price ?? marketData.close;

                    if (type === 'near_resistance' && curPrice != null && resistance != null) {
                        const threshold = values?.[0] ?? 1;
                        return Math.abs((resistance - curPrice) / curPrice) * 100 <= threshold;
                    }
                    if (type === 'position_low') return position != null && position <= (values?.[0] ?? 25);
                    if (type === 'position_high') return position != null && position >= (values?.[0] ?? 75);
                    return false;
                }
            case 'range_shrinking':
            case 'up_breakout':
            case 'down_breakout':
                {
                    const obj = getIndicatorObject() || {};
                    if (type === 'range_shrinking') return !!(obj.rangeShrinking ?? obj.range_shrinking);
                    if (type === 'up_breakout') return !!(obj.upBreakout ?? obj.up_breakout);
                    if (type === 'down_breakout') return !!(obj.downBreakout ?? obj.down_breakout);
                    return false;
                }
            case 'expansion':
            case 'contraction':
            case 'exhaustion':
            case 'breakout_likely':
                {
                    const obj = getIndicatorObject() || {};
                    if (type === 'expansion') return !!obj.expansion;
                    if (type === 'contraction') return !!obj.contraction;
                    if (type === 'exhaustion') return !!obj.exhaustion;
                    if (type === 'breakout_likely') return !!(obj.breakoutLikely ?? obj.breakout_likely);
                    return false;
                }
            case 'reversing_up':
            case 'reversing_down':
            case 'exhausted':
                {
                    const obj = getIndicatorObject() || {};
                    const reversing = obj.reversing ?? obj.reversal ?? obj.reverse;
                    if (type === 'exhausted') return !!obj.exhausted;
                    if (type === 'reversing_up') return !!reversing && (obj.current ?? 0) > 0;
                    if (type === 'reversing_down') return !!reversing && (obj.current ?? 0) < 0;
                    return false;
                }
            case 'bounce_support':
            case 'break_support':
            case 'break_resistance':
            case 'reject_resistance':
                {
                    const obj = getIndicatorObject() || {};
                    const curPrice = price ?? marketData.close;
                    const prevPriceSafe = prevPrice ?? marketData.prevClose ?? marketData.prevPrice;
                    // support/resistance 시그널에 맞는 레벨 선택 (폴백 없이 정확한 레벨만 사용)
                    const supportLevel = obj.level ?? obj.support;
                    const resistLevel = obj.level ?? obj.resistance;
                    if (curPrice == null || prevPriceSafe == null) return false;
                    if (type === 'bounce_support') {
                        if (supportLevel == null) return false;
                        return prevPriceSafe <= supportLevel && curPrice > supportLevel;
                    }
                    if (type === 'break_support') {
                        if (supportLevel == null) return false;
                        return prevPriceSafe >= supportLevel && curPrice < supportLevel;
                    }
                    if (type === 'break_resistance') {
                        if (resistLevel == null) return false;
                        return prevPriceSafe <= resistLevel && curPrice > resistLevel;
                    }
                    if (type === 'reject_resistance') {
                        if (resistLevel == null) return false;
                        return prevPriceSafe >= resistLevel && curPrice < resistLevel;
                    }
                    return false;
                }

            // 기본 처리
            default:
                {
                    const normalized = normalizeKey(type);
                    const curPrice = marketData.price ?? marketData.close;
                    const prevPriceSafe = prevPrice ?? marketData.prevClose ?? marketData.prevPrice;

                    if (percentiles) {
                        const current = getValue();
                        if (typeof current === 'number' && Number.isFinite(current)) {
                            if (/low|below|under|oversold|weak|bear|down|negative|minus|lower/i.test(type)) {
                                return matchPercentileLow(current);
                            }
                            if (/high|above|over|overbought|strong|bull|up|positive|plus|upper/i.test(type)) {
                                return matchPercentileHigh(current);
                            }
                        }
                    }

                    if (/^priceabove/.test(normalized) || /^pricebelow/.test(normalized)) {
                        const isAbove = /^priceabove/.test(normalized);
                        const suffix = type.replace(/^price_(above|below)_/i, '');
                        const level = getValueByKey(suffix) ?? getPivotLevel(suffix);
                        if (curPrice != null && level != null) return isAbove ? curPrice > level : curPrice < level;
                    }

                    if (/^(above|below)/.test(normalized)) {
                        const isAbove = /^above/.test(normalized);
                        const suffix = type.replace(/^(above|below)_/i, '');
                        const level = getValueByKey(suffix) ?? getPivotLevel(suffix);
                        if (curPrice != null && level != null) return isAbove ? curPrice > level : curPrice < level;
                        const channel = getChannel();
                        if (channel && suffix) {
                            if (suffix === 'upper' && channel.upper != null && curPrice != null) return isAbove ? curPrice > channel.upper : curPrice < channel.upper;
                            if (suffix === 'lower' && channel.lower != null && curPrice != null) return isAbove ? curPrice > channel.lower : curPrice < channel.lower;
                            if (suffix === 'middle' && channel.middle != null && curPrice != null) return isAbove ? curPrice > channel.middle : curPrice < channel.middle;
                        }
                    }

                    if (/^near/.test(normalized)) {
                        const suffix = type.replace(/^near_/i, '');
                        const level = getValueByKey(suffix) ?? getPivotLevel(suffix);
                        const tolerance = getNearTolerance();
                        if (curPrice != null && level != null && tolerance > 0) return Math.abs(curPrice - level) <= tolerance;
                    }

                    if (/inchannel/i.test(normalized)) {
                        const channel = getChannel();
                        if (channel?.upper != null && channel?.lower != null && curPrice != null) {
                            return curPrice >= channel.lower && curPrice <= channel.upper;
                        }
                    }

                    if (/incloud/i.test(normalized)) {
                        const ichi = getIchimoku();
                        if (ichi && curPrice != null) {
                            const top = Math.max(ichi.senkouA ?? -Infinity, ichi.senkouB ?? -Infinity);
                            const bottom = Math.min(ichi.senkouA ?? Infinity, ichi.senkouB ?? Infinity);
                            return curPrice >= bottom && curPrice <= top;
                        }
                    }

                    if (/^break/.test(normalized) || /^bounce/.test(normalized) || /^reject/.test(normalized)) {
                        const suffix = type.replace(/^(break|bounce|reject)_/i, '');
                        const level = getValueByKey(suffix) ?? getPivotLevel(suffix);
                        if (curPrice != null && prevPriceSafe != null && level != null) {
                            if (/^break/.test(normalized)) return prevPriceSafe <= level && curPrice > level;
                            if (/^bounce/.test(normalized)) return prevPriceSafe <= level && curPrice > level;
                            if (/^reject/.test(normalized)) return prevPriceSafe >= level && curPrice < level;
                        }
                    }

                    const trendVal = getValueByKey('trend') ?? getValueByKey('direction');
                    if (typeof trendVal === 'string') {
                        const trendKey = normalizeKey(trendVal);
                        if (/(up|bull|positive)/i.test(normalized)) return /(up|bull|positive)/i.test(trendKey);
                        if (/(down|bear|negative)/i.test(normalized)) return /(down|bear|negative)/i.test(trendKey);
                    }

                    if (/widthcontracting|widthcontract|contracting|shrinking/i.test(normalized)) {
                        const channel = getChannel();
                        const prevChannel = getChannel(true);
                        const curWidth = channel?.bandwidth ?? channel?.width;
                        const prevWidth = prevChannel?.bandwidth ?? prevChannel?.width ?? channel?.prevBandwidth;
                        if (Number.isFinite(curWidth) && Number.isFinite(prevWidth)) return curWidth < prevWidth;
                    }

                    if (/widthexpanding|expanding/i.test(normalized)) {
                        const channel = getChannel();
                        const prevChannel = getChannel(true);
                        const curWidth = channel?.bandwidth ?? channel?.width;
                        const prevWidth = prevChannel?.bandwidth ?? prevChannel?.width ?? channel?.prevBandwidth;
                        if (Number.isFinite(curWidth) && Number.isFinite(prevWidth)) return curWidth > prevWidth;
                    }

                    if (/increasing|rising|bull|positive|trendup|directionup|persistentup|bullish|strengthhigh|momentumpositive/i.test(normalized)) {
                        const cur = getValue();
                        const prev = getValue(true);
                        if (Number.isFinite(cur) && Number.isFinite(prev)) return cur > prev;
                    }

                    if (/decreasing|falling|bear|negative|trenddown|directiondown|persistentdown|bearish|strengthlow|momentumnegative/i.test(normalized)) {
                        const cur = getValue();
                        const prev = getValue(true);
                        if (Number.isFinite(cur) && Number.isFinite(prev)) return cur < prev;
                    }

                    const direct = getValueByKey(type);
                    if (typeof direct === 'boolean') return direct;
                    if (typeof direct === 'string') {
                        const directKey = normalizeKey(direct);
                        if (directKey === normalized) return true;
                        if (/(up|bull|positive)/i.test(normalized) && /(up|bull|positive)/i.test(directKey)) return true;
                        if (/(down|bear|negative)/i.test(normalized) && /(down|bear|negative)/i.test(directKey)) return true;
                    }
                    if (typeof direct === 'number' && Number.isFinite(direct)) return evaluateNumericByType(direct);

                    const flag = getFlagFromObject();
                    if (typeof flag === 'boolean') return flag;
                    if (typeof flag === 'string') {
                        const flagKey = normalizeKey(flag);
                        if (flagKey === normalized) return true;
                        if (/(up|bull|positive)/i.test(normalized) && /(up|bull|positive)/i.test(flagKey)) return true;
                        if (/(down|bear|negative)/i.test(normalized) && /(down|bear|negative)/i.test(flagKey)) return true;
                    }
                    if (typeof flag === 'number' && Number.isFinite(flag)) return evaluateNumericByType(flag);
                    const current = getValue();
                    if (typeof current === 'number' && Number.isFinite(current) && (values?.length || /low|high|over|under|up|down|bull|bear|positive|negative/i.test(type))) {
                        return evaluateNumericByType(current);
                    }
                    // 알 수 없는 타입은 false 처리 (오탐 방지)
                    return false;
                }
        }
    }

    /**
     * 신호 조건 평가 (캐시 포함)
     */
    evaluateSignalCached(signal, marketData, indicatorName, paramSet) {
        if (!marketData.__signalCache) marketData.__signalCache = new Map();

        const paramKey = Array.isArray(paramSet) ? paramSet.join(',') : (paramSet ?? 'default');
        const signalType = signal?.type ?? 'unknown';
        const valuesKey = signal?.values ? JSON.stringify(signal.values) : '';
        const withKey = signal?.with ?? '';
        const percentiles = Array.isArray(signal?.percentile) ? signal.percentile : null;
        const cacheKey = `${indicatorName}:${paramKey}:${signalType}:${valuesKey}:${withKey}:${percentiles ? 'p' + JSON.stringify(percentiles) : ''}`;

        if (marketData.__signalCache.has(cacheKey)) {
            return marketData.__signalCache.get(cacheKey);
        }

        const result = this.evaluateSignal(signal, marketData, indicatorName, paramSet);
        marketData.__signalCache.set(cacheKey, result);
        return result;
    }
    
    /**
     * 모든 전략 테스트 (UP/DOWN 동시 평가)
     * 멀티 타임프레임 지원: 다른 타임프레임 조합 가능, 단 같은 지표가 다른 타임프레임으로 중복 사용 불가
     * @param {Object} marketData - 지표 계산된 시장 데이터
     * @param {Object} options - { multiTimeframe: boolean, timeframes: string[] }
     * @returns {Object} { upNames: [], downNames: [], totalTested, upMatched, downMatched }
     */
    testAllStrategies(marketData, options = {}) {
        // 메모리 최적화: 이름 배열만 반환 (객체 생성 최소화)
        const upMatchedNames = [];
        const downMatchedNames = [];
        let totalTested = 0;
        
        // 멀티 타임프레임 모드 체크
        const isMultiTimeframe = options.multiTimeframe && marketData.indicatorsByTimeframe;
        const availableTimeframes = isMultiTimeframe 
            ? (options.timeframes || Object.keys(marketData.indicatorsByTimeframe))
            : [null]; // null = 기본 모드 (단일 타임프레임)
        
        // 타임프레임별 marketData 준비 (캐시)
        const tfMarketDataMap = new Map();
        for (const tf of availableTimeframes) {
            const tfData = isMultiTimeframe 
                ? this.prepareTimeframeMarketData(marketData, tf)
                : marketData;
            if (tfData && tfData.closes && tfData.closes.length > 0) {
                if (!tfData.__indicatorCache) tfData.__indicatorCache = new Map();
                if (!tfData.__prevIndicatorCache) tfData.__prevIndicatorCache = new Map();
                if (!tfData.__signalCache) tfData.__signalCache = new Map();
                tfMarketDataMap.set(tf, tfData);
            }
        }
        
        if (tfMarketDataMap.size === 0) {
            console.log('⚠️ 유효한 타임프레임 데이터 없음');
            return { upNames: [], downNames: [], totalTested: 0, upMatched: 0, downMatched: 0 };
        }
        
        // 타임프레임 배열 (실제 사용 가능한 것만)
        const timeframes = Array.from(tfMarketDataMap.keys());
        
        // 1개 조합: 각 타임프레임별로 개별 테스트
        for (const tf of timeframes) {
            const tfMarketData = tfMarketDataMap.get(tf);
            const tfLabel = tf ? `[${tf}] ` : '';
            
            for (const ind of this.indicators) {
                // 노이즈, 방향성 필수, 제외 지표 건너뛰기
                if (this.noise_indicators.includes(ind.name) || 
                    this.direction_required.includes(ind.name) ||
                    this.excluded_indicators.includes(ind.name)) continue;
                
                // signals가 없으면 건너뛰기
                if (!ind.signals || !ind.signals.buy || !ind.signals.sell) continue;
                
                const buyParamSets = ind.buyParamSets || (ind.buyPeriods || [14]).map(p => [p]);
                const sellParamSets = ind.sellParamSets || (ind.sellPeriods || [14]).map(p => [p]);
                
                // UP 전략
                for (const buyParams of buyParamSets) {
                    for (const buySig of ind.signals.buy) {
                        totalTested++;
                        if (!this.evaluateSignalCached(buySig, tfMarketData, ind.name, buyParams)) continue;
                        
                        const indicators = [{ name: ind.name, period: Array.isArray(buyParams) ? buyParams : [buyParams], timeframe: tf }];
                        const signals = [buySig.desc || buySig.type];
                        upMatchedNames.push(`UP: ${tfLabel}${this.generateStrategyName(indicators, signals)}`);
                    }
                }
                
                // DOWN 전략
                for (const sellParams of sellParamSets) {
                    for (const sellSig of ind.signals.sell) {
                        totalTested++;
                        if (!this.evaluateSignalCached(sellSig, tfMarketData, ind.name, sellParams)) continue;
                        
                        const indicators = [{ name: ind.name, period: Array.isArray(sellParams) ? sellParams : [sellParams], timeframe: tf }];
                        const signals = [sellSig.desc || sellSig.type];
                        downMatchedNames.push(`DOWN: ${tfLabel}${this.generateStrategyName(indicators, signals)}`);
                    }
                }
            }
        }
        
        // 2개 조합: 다른 타임프레임 허용, 같은 지표 다른 타임프레임 불가
        for (let i = 0; i < this.indicators.length; i++) {
            for (let j = i + 1; j < this.indicators.length; j++) {
                const ind1 = this.indicators[i];
                const ind2 = this.indicators[j];
                
                // 노이즈, 제외 지표 건너뛰기 (direction_required는 isValid2Combo에서 처리)
                if (this.noise_indicators.includes(ind1.name) || this.noise_indicators.includes(ind2.name) ||
                    this.excluded_indicators.includes(ind1.name) || this.excluded_indicators.includes(ind2.name)) continue;
                
                // signals가 없으면 건너뛰기
                if (!ind1.signals || !ind1.signals.buy || !ind1.signals.sell) continue;
                if (!ind2.signals || !ind2.signals.buy || !ind2.signals.sell) continue;
                
                if (!this.isValid2Combo(ind1, ind2)) continue;
                
                // 각 지표에 대해 모든 타임프레임 조합 시도
                for (const tf1 of timeframes) {
                    for (const tf2 of timeframes) {
                        const tfMarketData1 = tfMarketDataMap.get(tf1);
                        const tfMarketData2 = tfMarketDataMap.get(tf2);
                        if (!tfMarketData1 || !tfMarketData2) continue;
                        
                        const buyParamSets1 = ind1.buyParamSets || (ind1.buyPeriods || [14]).map(p => [p]);
                        const buyParamSets2 = ind2.buyParamSets || (ind2.buyPeriods || [14]).map(p => [p]);

                        // UP 전략
                        for (const buyParams1 of buyParamSets1) {
                            for (const buyParams2 of buyParamSets2) {
                                for (const buySig1 of ind1.signals.buy) {
                                    for (const buySig2 of ind2.signals.buy) {
                                        totalTested++;
                                        if (!this.evaluateSignalCached(buySig1, tfMarketData1, ind1.name, buyParams1)) continue;
                                        if (!this.evaluateSignalCached(buySig2, tfMarketData2, ind2.name, buyParams2)) continue;
                                        
                                        const tfLabel = this.formatMultiTimeframeLabel([tf1, tf2]);
                                        const indicators = [
                                            { name: ind1.name, period: Array.isArray(buyParams1) ? buyParams1 : [buyParams1], timeframe: tf1 },
                                            { name: ind2.name, period: Array.isArray(buyParams2) ? buyParams2 : [buyParams2], timeframe: tf2 }
                                        ];
                                        const signals = [buySig1.desc || buySig1.type, buySig2.desc || buySig2.type];
                                        upMatchedNames.push(`UP: ${tfLabel}${this.generateStrategyName(indicators, signals)}`);
                                    }
                                }
                            }
                        }
                        
                        const sellParamSets1 = ind1.sellParamSets || (ind1.sellPeriods || [14]).map(p => [p]);
                        const sellParamSets2 = ind2.sellParamSets || (ind2.sellPeriods || [14]).map(p => [p]);

                        // DOWN 전략
                        for (const sellParams1 of sellParamSets1) {
                            for (const sellParams2 of sellParamSets2) {
                                for (const sellSig1 of ind1.signals.sell) {
                                    for (const sellSig2 of ind2.signals.sell) {
                                        totalTested++;
                                        if (!this.evaluateSignalCached(sellSig1, tfMarketData1, ind1.name, sellParams1)) continue;
                                        if (!this.evaluateSignalCached(sellSig2, tfMarketData2, ind2.name, sellParams2)) continue;
                                        
                                        const tfLabel = this.formatMultiTimeframeLabel([tf1, tf2]);
                                        const indicators = [
                                            { name: ind1.name, period: Array.isArray(sellParams1) ? sellParams1 : [sellParams1], timeframe: tf1 },
                                            { name: ind2.name, period: Array.isArray(sellParams2) ? sellParams2 : [sellParams2], timeframe: tf2 }
                                        ];
                                        const signals = [sellSig1.desc || sellSig1.type, sellSig2.desc || sellSig2.type];
                                        downMatchedNames.push(`DOWN: ${tfLabel}${this.generateStrategyName(indicators, signals)}`);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // 3개 지표 조합 모드 비활성화
        
        // 메모리 해제: 타임프레임별 캐시 정리
        for (const [, tfData] of tfMarketDataMap) {
            if (tfData.__signalCache) { tfData.__signalCache.clear(); tfData.__signalCache = null; }
            if (tfData.__indicatorCache) { tfData.__indicatorCache.clear(); tfData.__indicatorCache = null; }
            if (tfData.__prevIndicatorCache) { tfData.__prevIndicatorCache.clear(); tfData.__prevIndicatorCache = null; }
        }
        tfMarketDataMap.clear();
        
        // 메모리 최적화: 이름 배열과 카운트만 반환
        return { 
            upNames: upMatchedNames, 
            downNames: downMatchedNames, 
            totalTested,
            upMatched: upMatchedNames.length,
            downMatched: downMatchedNames.length
        };
    }
    
    /**
     * 멀티 타임프레임 라벨 포맷
     * 모두 같으면 [15m], 다르면 [5m,15m] 형식
     */
    formatMultiTimeframeLabel(timeframes) {
        if (!timeframes || timeframes.every(tf => tf === null)) return '';
        const unique = [...new Set(timeframes.filter(tf => tf !== null))];
        if (unique.length === 0) return '';
        if (unique.length === 1) return `[${unique[0]}] `;
        return `[${unique.join(',')}] `;
    }
    
    /**
     * 타임프레임별 marketData 준비
     * indicatorsByTimeframe에서 해당 타임프레임 데이터 추출
     */
    prepareTimeframeMarketData(marketData, timeframe) {
        if (!timeframe || !marketData.indicatorsByTimeframe) {
            return marketData; // 기본 marketData 반환
        }
        
        const tfIndicators = marketData.indicatorsByTimeframe[timeframe];
        if (!tfIndicators) {
            return null;
        }
        
        const tfCandles = marketData.candlesByTimeframe?.[timeframe];
        
        // 타임프레임별 캔들에서 시계열 데이터 추출
        let closes, highs, lows, opens, volumes;
        if (tfCandles && tfCandles.length > 0) {
            closes = tfCandles.map(c => c.close);
            highs = tfCandles.map(c => c.high);
            lows = tfCandles.map(c => c.low);
            opens = tfCandles.map(c => c.open);
            volumes = tfCandles.map(c => c.volume);
        } else {
            // 기본 marketData에서 가져옴
            closes = marketData.closes;
            highs = marketData.highs;
            lows = marketData.lows;
            opens = marketData.opens;
            volumes = marketData.volumes;
        }
        
        // 타임프레임용 marketData 구성 (Object.create로 프로토타입 체인 활용 → 스프레드 복사 제거)
        const tfData = Object.create(marketData);
        tfData.closes = closes;
        tfData.highs = highs;
        tfData.lows = lows;
        tfData.opens = opens;
        tfData.volumes = volumes;
        tfData.timeframe = timeframe;
        // 타임프레임별 지표 덮어쓰기
        if (tfIndicators) {
            for (const key of Object.keys(tfIndicators)) {
                tfData[key] = tfIndicators[key];
            }
        }
        // 캐시 새로 초기화 (타임프레임별로 분리)
        tfData.__indicatorCache = null;
        tfData.__prevIndicatorCache = null;
        tfData.__signalCache = null;
        return tfData;
    }
    
    /**
     * 총 전략 개수 추정 (멀티 타임프레임 포함)
     * @param {number} tfCount - 타임프레임 수 (기본 4)
     */
    getTotalStrategyCount(tfCount = 4) {
        const validIndicators = this.indicators.filter(ind => 
            !this.noise_indicators.includes(ind.name) && 
            !this.direction_required.includes(ind.name)
        );
        
        // 평균 파라미터*신호 수 계산
        let sumBuyParamSig = 0, sumSellParamSig = 0;
        for (const ind of validIndicators) {
            const buyParams = ind.buyParamSets?.length || ind.buyPeriods?.length || 1;
            const sellParams = ind.sellParamSets?.length || ind.sellPeriods?.length || 1;
            const buySignals = ind.signals?.buy?.length || 1;
            const sellSignals = ind.signals?.sell?.length || 1;
            sumBuyParamSig += buyParams * buySignals;
            sumSellParamSig += sellParams * sellSignals;
        }
        
        const n = validIndicators.length;
        if (n === 0) return 0;
        const avgBuy = sumBuyParamSig / n;
        const avgSell = sumSellParamSig / n;
        
        // 1개 조합: N x TF x avgParamSig (UP + DOWN)
        const count1 = (sumBuyParamSig + sumSellParamSig) * tfCount;
        
        // 2개 조합: C(N,2) x TF^2 x avgParamSig^2 (UP + DOWN)
        const combo2 = n * (n - 1) / 2;
        const count2 = combo2 * tfCount * tfCount * (avgBuy * avgBuy + avgSell * avgSell);
        
        // 3개 조합 모드 비활성화
        const count3 = 0;
        
        return Math.round(count1 + count2 + count3);
    }
    
    /**
     * 메인 분석 함수
     * @param {Object} marketData - 시장 데이터
     * @param {Object} options - { multiTimeframe: boolean, timeframes: string[] }
     */
    analyze(marketData, options = {}) {
        if (!marketData.__indicatorCache) marketData.__indicatorCache = new Map();
        if (!marketData.__prevIndicatorCache) marketData.__prevIndicatorCache = new Map();
        if (!marketData.__signalCache) marketData.__signalCache = new Map();
        
        // 멀티 타임프레임 모드 자동 감지
        const isMultiTimeframe = options.multiTimeframe !== false && 
            marketData.indicatorsByTimeframe && 
            Object.keys(marketData.indicatorsByTimeframe).length > 0;
        
        const actualOptions = {
            ...options,
            multiTimeframe: isMultiTimeframe
        };
        
        // 멀티TF 로그는 배치 모드에서 과도한 출력 방지를 위해 비활성화
        // if (isMultiTimeframe) {
        //     const timeframes = options.timeframes || Object.keys(marketData.indicatorsByTimeframe);
        //     console.log(`🔄 멀티 타임프레임 분석: ${timeframes.join(', ')}`);
        // }
        
        const result = this.testAllStrategies(marketData, actualOptions);
        
        return {
            upNames: result.upNames,
            downNames: result.downNames,
            totalTested: result.totalTested,
            upMatched: result.upMatched,
            downMatched: result.downMatched,
            multiTimeframe: isMultiTimeframe
        };
    }
}
