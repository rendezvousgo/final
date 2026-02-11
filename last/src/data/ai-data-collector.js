import { BinanceAPI } from '../data/binance-api.js';
import { FearGreedAPI } from '../data/fear-greed-api.js';
import { TechnicalIndicators } from '../indicators/technical-indicators.js';

/**
 * AI에게 제공할 최적의 데이터 수집
 * 멀티 타임프레임 지원: 1m, 5m, 15m, 1h
 */
export class AIDataCollector {
    constructor() {
        this.binance = new BinanceAPI();
        this.fearGreed = new FearGreedAPI();
        // 지원하는 타임프레임 (기본 15m 기준으로 분석)
        this.timeframes = ['1m', '5m', '15m', '1h'];
    }

    /**
     * AI 분석에 필요한 모든 데이터 수집 (멀티 타임프레임)
     */
    async collectForAI(symbol = 'BTCUSDT', baseInterval = '15m') {
        console.log(`📊 ${symbol} 멀티타임프레임 데이터 수집 중...`);

        // 각 타임프레임별 필요한 캔들 수 (충분한 지표 계산을 위해)
        const candleCounts = {
            '1m': 200,   // 약 3.3시간
            '5m': 200,   // 약 16.7시간
            '15m': 500,  // 약 5.2일 (기본)
            '1h': 200    // 약 8.3일
        };

        // 병렬로 모든 타임프레임 데이터 수집
        const results = await Promise.allSettled([
            // 멀티 타임프레임 캔들 데이터
            ...this.timeframes.map(tf => this.binance.getKlines(symbol, tf, candleCounts[tf] || 200)),
            // 현재 가격
            this.binance.getCurrentPrice(symbol),
            // 24시간 통계
            this.binance.get24hrStats(symbol),
            // Fear & Greed
            this.fearGreed.getCurrent(),
            // 일봉 데이터
            this.binance.getKlines(symbol, '1d', 2)
        ]);

        const tfCount = this.timeframes.length;
        const klinesResults = results.slice(0, tfCount);
        const [currentPriceResult, statsResult, fearGreedResult, dailyResult] = results.slice(tfCount);

        // 기본 타임프레임 데이터 검증
        const baseIndex = this.timeframes.indexOf(baseInterval);
        if (klinesResults[baseIndex].status !== 'fulfilled' || !klinesResults[baseIndex].value?.length) {
            throw new Error(`기본 타임프레임(${baseInterval}) 캔들 데이터 수집 실패`);
        }

        const baseKlines = klinesResults[baseIndex].value;
        const fallbackPrice = baseKlines[baseKlines.length - 1]?.close ?? null;
        const currentPrice = currentPriceResult.status === 'fulfilled' ? currentPriceResult.value : fallbackPrice;

        const stats = statsResult.status === 'fulfilled'
            ? statsResult.value
            : {
                priceChange: 0,
                priceChangePercent: 0,
                highPrice: Math.max(...baseKlines.map(k => k.high)),
                lowPrice: Math.min(...baseKlines.map(k => k.low)),
                volume: baseKlines.reduce((sum, k) => sum + k.volume, 0),
                quoteVolume: 0
            };

        const fearGreedData = fearGreedResult.status === 'fulfilled'
            ? fearGreedResult.value
            : { value: 50, classification: 'Neutral' };

        const dailyKlines = dailyResult.status === 'fulfilled' ? dailyResult.value : null;
        // 일봉 데이터: 현재 진행 중인 캔들이 아닌 완성된 전일 캔들 사용
        // 2개 요청 시: [전일 완성 캔들, 오늘 진행 중 캔들] 순서로 반환됨
        let dailyCandle = null;
        if (Array.isArray(dailyKlines) && dailyKlines.length >= 2) {
            // 첫 번째가 완성된 전일 캔들
            dailyCandle = dailyKlines[0];
        } else if (Array.isArray(dailyKlines) && dailyKlines.length === 1) {
            // 1개만 있으면 그것 사용 (주의: 진행 중일 수 있음)
            dailyCandle = dailyKlines[0];
        }
        const dailyOHLC = dailyCandle
            ? { high: dailyCandle.high, low: dailyCandle.low, close: dailyCandle.close }
            : null;

        // 각 타임프레임별 지표 계산
        const indicatorsByTimeframe = {};
        const candlesByTimeframe = {};
        
        for (let i = 0; i < this.timeframes.length; i++) {
            const tf = this.timeframes[i];
            if (klinesResults[i].status === 'fulfilled' && klinesResults[i].value?.length) {
                const tfKlines = klinesResults[i].value;
                const tfClosePrices = this.binance.extractClosePrices(tfKlines);
                
                // 각 타임프레임별 지표 계산
                indicatorsByTimeframe[tf] = TechnicalIndicators.calculateAll(tfClosePrices, tfKlines);
                
                // 각 타임프레임별 캔들 데이터 저장 (최근 50개만)
                candlesByTimeframe[tf] = tfKlines.slice(-50).map(k => ({
                    time: new Date(k.openTime).toISOString(),
                    open: k.open,
                    high: k.high,
                    low: k.low,
                    close: k.close,
                    volume: k.volume,
                    type: k.close > k.open ? 'BULLISH' : 'BEARISH'
                }));
                
                console.log(`  ✅ ${tf} 타임프레임: ${tfKlines.length}개 캔들, 지표 계산 완료`);
            } else {
                console.log(`  ⚠️ ${tf} 타임프레임: 데이터 수집 실패`);
            }
        }

        // 기본 타임프레임(15m) 캔들 데이터 단순화 (하위 호환성 유지)
        const recentCandles = baseKlines.map(k => ({
            time: new Date(k.openTime).toISOString(),
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            takerBuyVolume: k.takerBuyBaseVolume ?? null,
            takerSellVolume: k.takerBuyBaseVolume != null ? Math.max(0, k.volume - k.takerBuyBaseVolume) : null,
            // 캔들 타입 (AI가 쉽게 이해)
            type: k.close > k.open ? 'BULLISH' : 'BEARISH',
            // 몸통 크기 (중요도)
            bodySize: Math.abs(k.close - k.open),
            // 위/아래 꼬리 크기
            upperWick: k.high - Math.max(k.open, k.close),
            lowerWick: Math.min(k.open, k.close) - k.low
        }));

        // 기술적 지표 계산 (기본 타임프레임 - 하위 호환성)
        const closePrices = this.binance.extractClosePrices(baseKlines);
        const indicators = indicatorsByTimeframe[baseInterval] || TechnicalIndicators.calculateAll(closePrices, baseKlines);

        // 거래량 분석 (기본 타임프레임 기준)
        const volumes = baseKlines.map(k => k.volume);
        const volumeMA = volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0;
        const recentVolume = volumes.length > 0 ? volumes.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, volumes.length) : 0;
        
        // 매수/매도 압력 계산 (상승 캔들 거래량 vs 하락 캔들 거래량)
        const recentKlines = baseKlines.slice(-10);
        const hasTakerVolumes = recentKlines.some(k => k.takerBuyBaseVolume != null);
        const buyVolume = hasTakerVolumes
            ? recentKlines.reduce((sum, k) => sum + (k.takerBuyBaseVolume ?? 0), 0)
            : recentKlines.filter(k => k.close > k.open).reduce((sum, k) => sum + k.volume, 0);
        const sellVolume = hasTakerVolumes
            ? recentKlines.reduce((sum, k) => sum + Math.max(0, (k.volume ?? 0) - (k.takerBuyBaseVolume ?? 0)), 0)
            : recentKlines.filter(k => k.close <= k.open).reduce((sum, k) => sum + k.volume, 0);
        const totalRecentVolume = buyVolume + sellVolume;
        
        const volumeProfile = {
            current: baseKlines[baseKlines.length - 1].volume,
            average: volumeMA,
            recent5Average: recentVolume,
            trend: recentVolume > volumeMA ? 'INCREASING' : 'DECREASING',
            // 급등 여부
            surge: recentVolume > volumeMA * 1.5,
            // 매수/매도 압력 (0-100%)
            buyPressure: totalRecentVolume > 0 ? (buyVolume / totalRecentVolume) * 100 : 50,
            sellPressure: totalRecentVolume > 0 ? (sellVolume / totalRecentVolume) * 100 : 50
        };

        // 주요 가격대 식별 (지지/저항)
        const keyLevels = this.identifyKeyLevels(baseKlines, currentPrice);

        // 최종 데이터 패키지
        return {
            // 기본 정보
            symbol: symbol,
            interval: baseInterval,
            timestamp: new Date(),
            
            // 지원하는 타임프레임 목록
            supportedTimeframes: this.timeframes,
            
            // 현재 상태
            currentPrice: currentPrice,
            priceChange24h: stats.priceChange,
            priceChangePercent24h: stats.priceChangePercent,
            high24h: stats.highPrice,
            low24h: stats.lowPrice,
            
            // 기본 타임프레임 캔들 데이터 (하위 호환성)
            recentCandles: recentCandles,
            
            // 멀티 타임프레임 캔들 데이터
            candlesByTimeframe: candlesByTimeframe,
            
            // 기본 타임프레임 기술적 지표 (하위 호환성)
            indicators: indicators,
            
            // 멀티 타임프레임 기술적 지표
            // 예: indicatorsByTimeframe['15m'].rsi, indicatorsByTimeframe['1h'].macd
            indicatorsByTimeframe: indicatorsByTimeframe,
            
            // 거래량 분석
            volumeProfile: volumeProfile,
            
            // 주요 가격대
            keyLevels: keyLevels,
            
            // 시장 심리
            fearGreed: fearGreedData,

            // 일봉 기준 OHLC (Daily Pivot용)
            dailyOHLC: dailyOHLC
        };
    }

    /**
     * 주요 지지/저항선 식별
     * 최근 100개 캔들에서 가격이 여러 번 반등/하락한 구간 찾기
     */
    identifyKeyLevels(klines, currentPrice) {
        const pricePoints = [];
        
        // 모든 고점/저점 수집
        for (let i = 1; i < klines.length - 1; i++) {
            const prev = klines[i - 1];
            const curr = klines[i];
            const next = klines[i + 1];
            
            // 고점 (저항선 후보)
            if (curr.high > prev.high && curr.high > next.high) {
                pricePoints.push({ price: curr.high, type: 'resistance', count: 1 });
            }
            
            // 저점 (지지선 후보)
            if (curr.low < prev.low && curr.low < next.low) {
                pricePoints.push({ price: curr.low, type: 'support', count: 1 });
            }
        }

        // 비슷한 가격대 그룹화 (±0.5% 범위)
        const groupedLevels = this.groupSimilarPrices(pricePoints, 0.005);
        
        // 현재 가격 기준으로 위/아래 분류
        const resistances = groupedLevels
            .filter(l => l.type === 'resistance' && l.price > currentPrice)
            .sort((a, b) => a.price - b.price)
            .slice(0, 3); // 상위 3개
        
        const supports = groupedLevels
            .filter(l => l.type === 'support' && l.price < currentPrice)
            .sort((a, b) => b.price - a.price)
            .slice(0, 3); // 상위 3개

        return {
            resistances: resistances.map(r => r.price),
            supports: supports.map(s => s.price),
            // 가장 가까운 지지/저항
            nearestResistance: resistances[0]?.price || null,
            nearestSupport: supports[0]?.price || null
        };
    }

    /**
     * 비슷한 가격대 그룹화
     */
    groupSimilarPrices(pricePoints, threshold) {
        const grouped = [];
        
        for (const point of pricePoints) {
            // 기존 그룹 중 비슷한 가격대 찾기
            const existingGroup = grouped.find(g => 
                Math.abs(g.price - point.price) / g.price < threshold &&
                g.type === point.type
            );
            
            if (existingGroup) {
                // 평균 가격 업데이트
                existingGroup.price = (existingGroup.price * existingGroup.count + point.price) / (existingGroup.count + 1);
                existingGroup.count++;
            } else {
                grouped.push({ ...point });
            }
        }
        
        // 중요도 순으로 정렬 (여러 번 테스트된 레벨이 중요)
        return grouped.sort((a, b) => b.count - a.count);
    }

    /**
     * 데이터 요약 출력 (디버깅용)
     */
    printDataSummary(data) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 AI 분석용 데이터 요약');
        console.log('='.repeat(60));
        console.log(`\n심볼: ${data.symbol}`);
        console.log(`현재 가격: $${data.currentPrice.toFixed(2)}`);
        console.log(`24시간 변동: ${data.priceChangePercent24h.toFixed(2)}%`);
        console.log(`\n캔들 데이터: ${data.recentCandles.length}개`);
        console.log(`  - 최근 5개 타입: ${data.recentCandles.slice(-5).map(c => c.type).join(', ')}`);
        console.log(`\n거래량:`);
        console.log(`  - 현재: ${data.volumeProfile.current.toFixed(0)}`);
        console.log(`  - 평균: ${data.volumeProfile.average.toFixed(0)}`);
        console.log(`  - 추세: ${data.volumeProfile.trend}`);
        console.log(`\n주요 가격대:`);
        console.log(`  - 저항선: ${data.keyLevels.resistances.map(r => '$' + r.toFixed(2)).join(', ')}`);
        console.log(`  - 지지선: ${data.keyLevels.supports.map(s => '$' + s.toFixed(2)).join(', ')}`);
        console.log(`\nFear & Greed: ${data.fearGreed.value}/100 (${data.fearGreed.classification})`);
        console.log('='.repeat(60) + '\n');
    }
}
