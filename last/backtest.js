/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 4코인 6개월 백테스트 시뮬레이션 (15분 간격)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * - 대상: BTCUSDT, XRPUSDT, SOLUSDT, ETHUSDT (각 코인별 독립 TXT)
 * - 기간: 6개월 전 ~ 현재
 * - 진행: 15분씩 과거 시간 전진, 15분 뒤 예측 → 검증 → TXT 누적 저장
 * - 전략: 주간 프루닝으로 노이즈 전략 자동 제거
 * 
 * 실행: node --max-old-space-size=6144 backtest.js
 */

import { BinanceAPI } from './src/data/binance-api.js';
import { DynamicStrategyEngine } from './src/strategies/dynamic-strategy-engine.js';
import { TechnicalIndicators } from './src/indicators/technical-indicators.js';
import fs from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════
// 설정
// ═══════════════════════════════════════════════════════════════

const SYMBOLS = ['BTCUSDT', 'XRPUSDT', 'SOLUSDT', 'ETHUSDT'];
const MONTHS_BACK = 6;
const STEP_MS = 15 * 60 * 1000;      // 과거 시간 15분씩 전진
const HORIZON_MS = 15 * 60 * 1000;   // 15분 후 검증
const TICK_MS = 0;                    // 0 = 대기 없이 최대 속도 (원래 1000)
const SAVE_EVERY = 100;              // N 스텝마다 TXT 저장 (+ SIGINT/완료 시)
const GC_EVERY = 200;                // N 스텝마다 GC 힌트 + 1m 캔들 트리밍
const CANDLE_1M_KEEP = 2000;         // 1m 캔들 보관 개수 (슬라이딩 윈도우)
const YIELD_EVERY = 50;              // N 스텝마다 이벤트 루프 양보 (GC 기회)
const LOG_DIR = './logs/backtest';
const BASE_TF = '15m';
const TIMEFRAMES = ['1m', '5m', '15m', '1h'];
const BUFFER_CANDLES = 500;

// ── 주간 전략 프루닝 설정 ──
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;   // 1주일 (백테스트 시간 기준)
const PRUNE_MIN_APPEARANCE = 1;            // 출현율 1% 이하 → 컷
const PRUNE_MAX_APPEARANCE = 90;           // 출현율 90% 이상 → 컷
const PRUNE_ACC_LOW = 48;                  // 정확도 48~52% (랜덤 구간) → 컷
const PRUNE_ACC_HIGH = 52;
const PRUNE_MIN_SAMPLES = 50;              // 프루닝 판단 최소 데이터 수
const MAX_RESULTS_LOG = 2000;              // TXT에 기록할 최근 예측 최대 건수

// ═══════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════

class UpDownTester {
    static parseStrategyId(name) {
        if (!name) return '??';
        const match = name.match(/\[(?:[^\]]*-)?(\d+)\]/);
        return match ? match[1] : '??';
    }
}

function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '계산 중...';
    if (sec < 60) return `${Math.ceil(sec)}초`;
    if (sec < 3600) return `${Math.floor(sec / 60)}분 ${Math.ceil(sec % 60)}초`;
    return `${Math.floor(sec / 3600)}시간 ${Math.floor((sec % 3600) / 60)}분`;
}

// ═══════════════════════════════════════════════════════════════
// 과거 데이터 수집기 (페이지네이션 + Rate Limit)
// ═══════════════════════════════════════════════════════════════

class HistoricalDataFetcher {
    constructor(binance) {
        this.binance = binance;
        this.requestCount = 0;
        this.weightUsed = 0;
        this.lastRequestTime = 0;
    }

    async rateLimitDelay() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < 200) {
            await new Promise(r => setTimeout(r, 200 - elapsed));
        }
        if (elapsed > 60000) {
            this.weightUsed = 0;
        }
        if (this.weightUsed > 4000) {
            console.log('⏳ Rate limit 접근 중... 60초 대기');
            await new Promise(r => setTimeout(r, 60000));
            this.weightUsed = 0;
        }
        this.lastRequestTime = Date.now();
    }

    async fetchAllKlines(symbol, interval, startTime, endTime) {
        const allCandles = [];
        let currentStart = startTime;
        const limit = 1000;
        const intervalMs = this.intervalToMs(interval);
        const totalCandles = Math.ceil((endTime - startTime) / intervalMs);
        const totalPages = Math.ceil(totalCandles / limit);
        let page = 0;

        console.log(`   📥 ${symbol} ${interval} 수집 중... (예상 ${totalCandles.toLocaleString()}개)`);

        while (currentStart < endTime) {
            await this.rateLimitDelay();

            try {
                const candles = await this.binance.getKlines(symbol, interval, limit, {
                    startTime: currentStart,
                    endTime: endTime
                });

                this.requestCount++;
                this.weightUsed += (candles.length > 500 ? 5 : 2);

                if (!candles || candles.length === 0) break;

                allCandles.push(...candles);

                const lastCandle = candles[candles.length - 1];
                currentStart = lastCandle.closeTime + 1;

                page++;
                if (page % 10 === 0 || page === totalPages) {
                    const progress = Math.min(100, (allCandles.length / totalCandles * 100)).toFixed(1);
                    process.stdout.write(`\r   📥 ${symbol} ${interval}: ${allCandles.length.toLocaleString()}/${totalCandles.toLocaleString()}개 (${progress}%)`);
                }

                if (candles.length < limit) break;
            } catch (error) {
                if (error.response?.status === 429) {
                    const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
                    console.log(`\n   ⚠️ Rate limited! ${retryAfter}초 대기...`);
                    await new Promise(r => setTimeout(r, retryAfter * 1000));
                    this.weightUsed = 0;
                    continue;
                }
                console.error(`\n   ❌ 수집 오류 (${symbol} ${interval}):`, error.message);
                break;
            }
        }

        console.log(`\r   ✅ ${symbol} ${interval}: ${allCandles.length.toLocaleString()}개 완료${''.padEnd(30)}`);
        return allCandles;
    }

    intervalToMs(interval) {
        return intervalToMs(interval);
    }
}

// 유틸리티: 타임프레임 문자열 → 밀리초 변환
function intervalToMs(interval) {
    const map = {
        '1s': 1000, '1m': 60000, '3m': 180000, '5m': 300000,
        '15m': 900000, '30m': 1800000, '1h': 3600000, '2h': 7200000,
        '4h': 14400000, '6h': 21600000, '8h': 28800000, '12h': 43200000,
        '1d': 86400000, '3d': 259200000, '1w': 604800000
    };
    return map[interval] || 900000;
}

// ═══════════════════════════════════════════════════════════════
// 코인별 백테스터
// ═══════════════════════════════════════════════════════════════

class CoinBacktester {
    constructor(symbol, logDir) {
        this.symbol = symbol;
        this.coinLabel = symbol.replace('USDT', '');
        this.logDir = logDir;
        this.engine = new DynamicStrategyEngine();

        // 과거 데이터
        this.historicalData = {};

        // 결과 누적
        this.results = [];
        this.strategyStats = {};

        // 주간 프루닝
        this.lastPruneTime = 0;
        this.prunedStrategies = new Set();  // 프루닝된 전략명 (재등록 방지)
        this.pruneLog = [];                 // 프루닝 이력
        this.totalPrunedCount = 0;

        // 누적 통계 (results 트리밍 후에도 유지)
        this.aggTotal = 0;
        this.aggCorrect = 0;
        this.aggBuys = 0;
        this.aggBuyCorrect = 0;
        this.aggSells = 0;
        this.aggSellCorrect = 0;

        // TXT 파일 경로
        this.summaryFile = path.join(logDir, `backtest-${symbol}.txt`);
    }

    // ── 이진 검색: 타임스탬프 → 캔들 인덱스 ──

    findCandleIndex(candles, timestamp) {
        let lo = 0, hi = candles.length - 1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (candles[mid].openTime <= timestamp) lo = mid + 1;
            else hi = mid - 1;
        }
        return hi;
    }

    // ── 특정 시점의 marketData 구성 (updown-test.js runCycle과 동일 구조) ──

    buildMarketData(currentTime) {
        const baseCandles = this.historicalData[BASE_TF];
        if (!baseCandles || baseCandles.length === 0) return null;

        // [FIX] Bug1: 미완성 캔들 제외 — openTime이 currentTime 이하이더라도
        // 아직 closeTime이 도래하지 않은 캔들은 미완성이므로 직전 완성 캔들 사용
        const baseIntervalMs = 15 * 60 * 1000; // 15m
        const rawIdx = this.findCandleIndex(baseCandles, currentTime);
        const baseIdx = (rawIdx >= 0 && baseCandles[rawIdx].openTime + baseIntervalMs > currentTime)
            ? rawIdx - 1
            : rawIdx;
        if (baseIdx < 50) return null;

        const startIdx = Math.max(0, baseIdx - 499);
        const visibleCandles = baseCandles.slice(startIdx, baseIdx + 1);
        if (visibleCandles.length < 50) return null;

        // 시계열 데이터
        const closes = visibleCandles.map(c => c.close);
        const highs = visibleCandles.map(c => c.high);
        const lows = visibleCandles.map(c => c.low);
        const volumes = visibleCandles.map(c => c.volume);
        const opens = visibleCandles.map(c => c.open);
        const buyVolumes = visibleCandles.map(c => c.takerBuyBaseVolume ?? null);
        const sellVolumes = visibleCandles.map(c =>
            c.takerBuyBaseVolume != null ? Math.max(0, c.volume - c.takerBuyBaseVolume) : null
        );

        // 기본 타임프레임 기술적 지표
        const baseIndicators = TechnicalIndicators.calculateAll(closes, visibleCandles);

        // 멀티 타임프레임 지표
        const indicatorsByTimeframe = {};
        const candlesByTimeframe = {};

        for (const tf of TIMEFRAMES) {
            const tfCandles = this.historicalData[tf];
            if (!tfCandles || tfCandles.length === 0) continue;

            // [FIX] Bug1: 멀티 타임프레임에서도 미완성 캔들 제외
            const tfIntervalMs = intervalToMs(tf);
            const rawTfIdx = this.findCandleIndex(tfCandles, currentTime);
            const tfIdx = (rawTfIdx >= 0 && tfCandles[rawTfIdx].openTime + tfIntervalMs > currentTime)
                ? rawTfIdx - 1
                : rawTfIdx;
            if (tfIdx < 30) continue;

            const tfStart = Math.max(0, tfIdx - 199);
            const tfVisible = tfCandles.slice(tfStart, tfIdx + 1);
            if (tfVisible.length < 30) continue;

            const tfCloses = tfVisible.map(c => c.close);
            indicatorsByTimeframe[tf] = TechnicalIndicators.calculateAll(tfCloses, tfVisible);
            // [FIX] 멀티TF 캔들에 bodySize/wick/volume 필드 추가 (recentCandles와 동일 구조)
            candlesByTimeframe[tf] = tfVisible.slice(-50).map(k => ({
                time: new Date(k.openTime).toISOString(),
                open: k.open, high: k.high, low: k.low, close: k.close,
                volume: k.volume,
                takerBuyVolume: k.takerBuyBaseVolume ?? null,
                takerSellVolume: k.takerBuyBaseVolume != null ? Math.max(0, k.volume - k.takerBuyBaseVolume) : null,
                type: k.close > k.open ? 'BULLISH' : 'BEARISH',
                bodySize: Math.abs(k.close - k.open),
                upperWick: k.high - Math.max(k.open, k.close),
                lowerWick: Math.min(k.open, k.close) - k.low
            }));
        }

        // 일봉 (Daily Pivot)
        const dailyCandles = this.historicalData['1d'];
        let dailyOHLC = null;
        if (dailyCandles && dailyCandles.length > 0) {
            const dailyIdx = this.findCandleIndex(dailyCandles, currentTime);
            if (dailyIdx >= 1) {
                const prevDay = dailyCandles[dailyIdx - 1];
                dailyOHLC = { high: prevDay.high, low: prevDay.low, close: prevDay.close };
            }
        }

        const currentPrice = closes[closes.length - 1];

        // VWMA
        const vwmaPeriod = 20;
        let vwma = null;
        if (closes.length >= vwmaPeriod && volumes.length >= vwmaPeriod) {
            let sumPV = 0, sumV = 0;
            for (let i = closes.length - vwmaPeriod; i < closes.length; i++) {
                sumPV += closes[i] * volumes[i];
                sumV += volumes[i];
            }
            vwma = sumV !== 0 ? sumPV / sumV : null;
        }

        // 지지/저항
        const keyLevels = this.identifyKeyLevels(visibleCandles, currentPrice);

        // recentCandles (실시간 시스템과 동일) - 최근 50개만 변환 (메모리 절감)
        const recentSlice = visibleCandles.slice(-50);
        const recentCandles = recentSlice.map(k => ({
            time: new Date(k.openTime).toISOString(),
            open: k.open, high: k.high, low: k.low, close: k.close,
            volume: k.volume,
            takerBuyVolume: k.takerBuyBaseVolume ?? null,
            takerSellVolume: k.takerBuyBaseVolume != null ? Math.max(0, k.volume - k.takerBuyBaseVolume) : null,
            type: k.close > k.open ? 'BULLISH' : 'BEARISH',
            bodySize: Math.abs(k.close - k.open),
            upperWick: k.high - Math.max(k.open, k.close),
            lowerWick: Math.min(k.open, k.close) - k.low
        }));

        return {
            ...baseIndicators,
            closes, highs, lows, volumes, opens,
            buyVolumes, sellVolumes,
            recentCandles,
            dailyHigh: dailyOHLC?.high ?? null,
            dailyLow: dailyOHLC?.low ?? null,
            dailyClose: dailyOHLC?.close ?? null,
            price: currentPrice,
            close: closes[closes.length - 1],
            prevClose: closes.length > 1 ? closes[closes.length - 2] : null,
            prev2Close: closes.length > 2 ? closes[closes.length - 3] : null,
            prevPrice: closes.length > 1 ? closes[closes.length - 2] : null,
            bb: baseIndicators?.bollingerBands ?? baseIndicators?.bb,
            vwma,
            keyLevels,
            support: keyLevels?.nearestSupport ?? null,
            resistance: keyLevels?.nearestResistance ?? null,
            fearGreed: 50,
            fearGreedIndex: 50,
            prevFearGreed: null,
            indicatorsByTimeframe,
            candlesByTimeframe,
            supportedTimeframes: Object.keys(indicatorsByTimeframe),
            __indicatorCache: null,
            __prevIndicatorCache: null,
            __signalCache: null
        };
    }

    // ── 지지/저항 식별 (AIDataCollector와 동일) ──

    identifyKeyLevels(klines, currentPrice) {
        const pricePoints = [];
        for (let i = 1; i < klines.length - 1; i++) {
            const prev = klines[i - 1], curr = klines[i], next = klines[i + 1];
            if (curr.high > prev.high && curr.high > next.high)
                pricePoints.push({ price: curr.high, type: 'resistance', count: 1 });
            if (curr.low < prev.low && curr.low < next.low)
                pricePoints.push({ price: curr.low, type: 'support', count: 1 });
        }

        const grouped = [];
        for (const point of pricePoints) {
            const existing = grouped.find(g =>
                Math.abs(g.price - point.price) / g.price < 0.005 && g.type === point.type
            );
            if (existing) {
                existing.price = (existing.price * existing.count + point.price) / (existing.count + 1);
                existing.count++;
            } else {
                grouped.push({ ...point });
            }
        }
        grouped.sort((a, b) => b.count - a.count);

        const resistances = grouped.filter(l => l.type === 'resistance' && l.price > currentPrice)
            .sort((a, b) => a.price - b.price).slice(0, 3);
        const supports = grouped.filter(l => l.type === 'support' && l.price < currentPrice)
            .sort((a, b) => b.price - a.price).slice(0, 3);

        return {
            resistances: resistances.map(r => r.price),
            supports: supports.map(s => s.price),
            nearestResistance: resistances[0]?.price || null,
            nearestSupport: supports[0]?.price || null
        };
    }

    // ── 주간 전략 프루닝 ──
    // 출현율 ≤5%, ≥70%, 정확도 45~55% 전략 제거

    pruneStrategies(currentTime) {
        // 첫 호출 시 기준 시간 세팅
        if (this.lastPruneTime === 0) {
            this.lastPruneTime = currentTime;
            return 0;
        }

        // 1주일 경과 확인 (백테스트 시간 기준)
        if (currentTime - this.lastPruneTime < WEEK_MS) return 0;
        this.lastPruneTime = currentTime;

        const totalPred = this.aggTotal;
        if (totalPred < PRUNE_MIN_SAMPLES) return 0;

        let pruned = 0;
        const pruneNames = [];
        const pruneDetails = [];

        for (const [name, stats] of Object.entries(this.strategyStats)) {
            const appearanceRate = (stats.total / totalPred) * 100;
            const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

            let shouldPrune = false;
            let reason = '';

            if (appearanceRate <= PRUNE_MIN_APPEARANCE) {
                shouldPrune = true;
                reason = `출현율 ${appearanceRate.toFixed(1)}% (≤${PRUNE_MIN_APPEARANCE}%)`;
            } else if (appearanceRate >= PRUNE_MAX_APPEARANCE) {
                shouldPrune = true;
                reason = `출현율 ${appearanceRate.toFixed(1)}% (≥${PRUNE_MAX_APPEARANCE}%)`;
            } else if (stats.total >= PRUNE_MIN_SAMPLES && accuracy >= PRUNE_ACC_LOW && accuracy <= PRUNE_ACC_HIGH) {
                // [FIX] 프루닝: 최소 샘플 수 미달 전략의 오판 방지
                shouldPrune = true;
                reason = `정확도 ${accuracy.toFixed(1)}% (${PRUNE_ACC_LOW}~${PRUNE_ACC_HIGH}% 랜덤구간, ${stats.total}회)`;
            }

            if (shouldPrune) {
                pruneNames.push(name);
                pruneDetails.push({ name, reason, appearance: appearanceRate.toFixed(1), accuracy: accuracy.toFixed(1) });
            }
        }

        // 삭제 처리
        for (const name of pruneNames) {
            this.prunedStrategies.add(name);
            delete this.strategyStats[name];
            pruned++;
        }

        this.totalPrunedCount += pruned;

        // 프루닝 로그
        if (pruned > 0) {
            const weekDate = new Date(currentTime).toISOString().slice(0, 10);
            this.pruneLog.push({
                date: weekDate,
                pruned,
                remaining: Object.keys(this.strategyStats).length,
                details: pruneDetails.slice(0, 10) // 상위 10개만 로그
            });
            // pruneLog 최근 50개만 유지
            if (this.pruneLog.length > 50) {
                this.pruneLog = this.pruneLog.slice(-50);
            }
            console.log(`   🔪 [${this.coinLabel}] 주간 프루닝 (${weekDate}): ${pruned}개 제거 → 남은 전략: ${Object.keys(this.strategyStats).length}개`);
        }

        // results 배열 트리밍 (메모리 + TXT 크기 관리)
        if (this.results.length > MAX_RESULTS_LOG * 1.5) {
            this.results = this.results.slice(-MAX_RESULTS_LOG);
        }

        return pruned;
    }

    // ── 특정 시점 가격 조회 (1m 캔들 우선) ──

    getPriceAtTime(targetTime) {
        const candles1m = this.historicalData['1m'];
        if (!candles1m || candles1m.length === 0) {
            const baseCandles = this.historicalData[BASE_TF];
            if (!baseCandles) return null;
            const idx = this.findCandleIndex(baseCandles, targetTime);
            if (idx < 0) return null;
            // [FIX] Bug1: 15분봉 fallback에서도 완성된 캔들만 사용
            const c = baseCandles[idx];
            if (c.openTime + 15 * 60 * 1000 > targetTime) {
                return idx > 0 ? baseCandles[idx - 1].close : null;
            }
            return c.close;
        }

        const idx = this.findCandleIndex(candles1m, targetTime);
        if (idx < 0) return null;
        // [FIX] Bug1: 1분봉에서도 완성된 캔들의 close 사용
        const c = candles1m[idx];
        if (c.openTime + 60000 > targetTime) {
            return idx > 0 ? candles1m[idx - 1].close : null;
        }
        return c.close;
    }

    // ── 1스텝 예측 처리 ──

    processStep(currentTime) {
        const marketData = this.buildMarketData(currentTime);
        if (!marketData) return null;

        // 전략 엔진 실행
        const analysis = this.engine.analyze(marketData, {
            multiTimeframe: true,
            timeframes: marketData.supportedTimeframes
        });

        const rawUpNames = analysis.upNames || [];
        const rawDownNames = analysis.downNames || [];

        // [FIX] Bug2: 프루닝된 전략을 UP/DOWN 투표에서 제외
        const upNames = rawUpNames.filter(n => !this.prunedStrategies.has(n));
        const downNames = rawDownNames.filter(n => !this.prunedStrategies.has(n));
        const upCount = upNames.length;
        const downCount = downNames.length;

        // 방향 결정
        const direction = upCount > downCount ? 'UP' : downCount > upCount ? 'DOWN' : 'NEUTRAL';
        const decision = direction === 'UP' ? 'BUY' : direction === 'DOWN' ? 'SELL' : 'HOLD';

        // 검증: 15분 후 실제 가격
        const futureTime = currentTime + HORIZON_MS;
        const priceAtPrediction = marketData.price;
        const priceAfter = this.getPriceAtTime(futureTime);

        // 메모리 해제
        if (marketData.__signalCache) { marketData.__signalCache.clear(); marketData.__signalCache = null; }
        if (marketData.__indicatorCache) { marketData.__indicatorCache.clear(); marketData.__indicatorCache = null; }
        if (marketData.__prevIndicatorCache) { marketData.__prevIndicatorCache.clear(); marketData.__prevIndicatorCache = null; }

        if (priceAfter === null) return null;

        const priceChange = priceAfter - priceAtPrediction;
        const priceChangePercent = (priceChange / priceAtPrediction) * 100;
        const actualResult = priceChange > 0 ? 'UP' : priceChange < 0 ? 'DOWN' : 'FLAT';

        // 정확도 판정 (updown-test.js와 동일)
        const HOLD_THRESHOLD = 0.05;
        let correct;
        if (decision === 'BUY' && actualResult === 'UP') correct = true;
        else if (decision === 'SELL' && actualResult === 'DOWN') correct = true;
        else if (decision === 'HOLD' && Math.abs(priceChangePercent) < HOLD_THRESHOLD) correct = true;
        else correct = false;

        // 누적 통계 업데이트 (트리밍 후에도 유지)
        this.aggTotal++;
        if (correct) this.aggCorrect++;
        if (decision === 'BUY') { this.aggBuys++; if (correct) this.aggBuyCorrect++; }
        if (decision === 'SELL') { this.aggSells++; if (correct) this.aggSellCorrect++; }

        // 결과 저장
        const result = {
            timestamp: new Date(currentTime).toISOString(),
            priceAtPrediction,
            priceAfter,
            priceChange: Number(priceChange.toFixed(6)),
            priceChangePercent: Number(priceChangePercent.toFixed(4)),
            decision,
            result: actualResult,
            correct,
            totalTested: analysis.totalTested,
            upCount,
            downCount,
        };
        this.results.push(result);

        // 전략별 통계 누적 (upNames/downNames는 이미 프루닝 필터 완료)
        for (const name of upNames) {
            if (!this.strategyStats[name]) {
                this.strategyStats[name] = {
                    direction: 'UP', name,
                    id: UpDownTester.parseStrategyId(name),
                    total: 0, correct: 0
                };
            }
            this.strategyStats[name].total++;
            if (actualResult === 'UP') this.strategyStats[name].correct++;
        }
        for (const name of downNames) {
            if (!this.strategyStats[name]) {
                this.strategyStats[name] = {
                    direction: 'DOWN', name,
                    id: UpDownTester.parseStrategyId(name),
                    total: 0, correct: 0
                };
            }
            this.strategyStats[name].total++;
            if (actualResult === 'DOWN') this.strategyStats[name].correct++;
        }

        return result;
    }

    // ── TXT 요약 저장 (updown-test.js buildSummary 형식) ──

    saveSummary(backtestStart, backtestEnd) {
        // 누적 통계 사용 (results 트리밍에 영향 없음)
        const total = this.aggTotal;
        const correct = this.aggCorrect;
        const accuracy = total > 0 ? ((correct / total) * 100).toFixed(1) : '0';

        const buyAccuracy = this.aggBuys > 0 ? ((this.aggBuyCorrect / this.aggBuys) * 100).toFixed(1) : 'N/A';
        const sellAccuracy = this.aggSells > 0 ? ((this.aggSellCorrect / this.aggSells) * 100).toFixed(1) : 'N/A';

        // 전략 통계 (필터 없이 전체, 발생 횟수 내림차순)
        const strategyStatsArray = Object.values(this.strategyStats)
            .map(s => ({
                ...s,
                accuracy: s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : '0'
            }))
            .sort((a, b) => b.total - a.total);

        const startStr = new Date(backtestStart).toISOString().slice(0, 10);
        const endStr = new Date(backtestEnd).toISOString().slice(0, 10);

        const txt = `
═══════════════════════════════════════════════════════════
15분 업다운 테스트 결과 요약 (백테스트)
═══════════════════════════════════════════════════════════
심볼: ${this.symbol}
백테스트 기간: ${startStr} ~ ${endStr}
최종 업데이트: ${new Date().toLocaleString('ko-KR')}

📊 전체 통계
───────────────────────────────────────────────────────────
총 예측: ${total}회
정확: ${correct}회
정확도: ${accuracy}%

📈 방향별 정확도
───────────────────────────────────────────────────────────
UP (BUY):   ${buyAccuracy === 'N/A' ? 'N/A' : `${buyAccuracy}%`} (${this.aggBuyCorrect}/${this.aggBuys})
DOWN (SELL): ${sellAccuracy === 'N/A' ? 'N/A' : `${sellAccuracy}%`} (${this.aggSellCorrect}/${this.aggSells})

🔪 주간 프루닝 현황
───────────────────────────────────────────────────────────
총 프루닝된 전략: ${this.totalPrunedCount}개 | 현재 활성 전략: ${strategyStatsArray.length}개
조건: 출현율 ≤${PRUNE_MIN_APPEARANCE}% 또는 ≥${PRUNE_MAX_APPEARANCE}% | 정확도 ${PRUNE_ACC_LOW}~${PRUNE_ACC_HIGH}%
${this.pruneLog.length > 0 ? this.pruneLog.map(p => `  ${p.date}: -${p.pruned}개 (남은: ${p.remaining}개)`).join('\n') : '(아직 프루닝 없음)'}

🎯 전략별 정확도 - 총 ${strategyStatsArray.length}개 전략 (프루닝 후)
───────────────────────────────────────────────────────────
${strategyStatsArray.map(s => {
    const dirLabel = s.direction === 'UP' ? 'UP  ' : s.direction === 'DOWN' ? 'DOWN' : '    ';
    const idStr = String(s.id || '??').padStart(2);
    const nameStr = (s.name || 'Unknown');
    const accStr = String(s.accuracy || '0').padStart(5);
    return `[${dirLabel}-${idStr}] ${nameStr} ${accStr}% (${s.correct}/${s.total})`;
}).join('\n') || '(아직 결과 없음)'}

═══════════════════════════════════════════════════════════
`;

        fs.writeFileSync(this.summaryFile, txt, 'utf8');
    }

    // ── 동기 저장 (SIGINT용) ──

    saveSummarySync(backtestStart, backtestEnd) {
        try {
            this.saveSummary(backtestStart, backtestEnd);
        } catch (e) {
            console.error(`❌ [${this.coinLabel}] 저장 실패:`, e.message);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 메인 실행
// ═══════════════════════════════════════════════════════════════

// SIGINT 핸들러에서 접근할 전역 참조
let globalBacktesters = [];
let globalStartTime = 0;
let globalEndTime = 0;

async function main() {
    const binance = new BinanceAPI();
    const fetcher = new HistoricalDataFetcher(binance);

    globalEndTime = Date.now();
    // [FIX] 시간 정렬: 15분 캔들 경계에 맞춤 (미정렬 시 예측~검증 간격이 15~29분으로 가변)
    const rawStart = globalEndTime - MONTHS_BACK * 30 * 24 * 60 * 60 * 1000;
    globalStartTime = Math.ceil(rawStart / STEP_MS) * STEP_MS;
    const lastPredTime = globalEndTime - HORIZON_MS;

    const totalSteps = Math.ceil((lastPredTime - globalStartTime) / STEP_MS);
    const estimatedSec = totalSteps * (TICK_MS / 1000 + 10); // ~10s CPU per 4 coins

    console.log('═'.repeat(70));
    console.log('📊 4코인 6개월 백테스트 시뮬레이션');
    console.log('═'.repeat(70));
    console.log(`   코인: ${SYMBOLS.map(s => s.replace('USDT', '')).join(', ')}`);
    console.log(`   기간: ${new Date(globalStartTime).toISOString().slice(0, 10)} ~ ${new Date(globalEndTime).toISOString().slice(0, 10)}`);
    console.log(`   진행: 과거 15분씩 전진 (TICK_MS=${TICK_MS}ms)`);
    console.log(`   총 예측 단계: ${totalSteps.toLocaleString()}개`);
    console.log(`   예상 소요: ~${fmtTime(estimatedSec)}`);
    console.log('═'.repeat(70));

    // 로그 디렉토리 생성
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // ═══════════════════════════════════════════════════════
    // 1단계: 전체 과거 데이터 사전 수집
    // ═══════════════════════════════════════════════════════

    console.log('\n📥 1단계: 전체 과거 데이터 수집');
    console.log('─'.repeat(50));

    for (const symbol of SYMBOLS) {
        console.log(`\n🪙 ${symbol} 데이터 수집:`);
        const bt = new CoinBacktester(symbol, LOG_DIR);

        // 각 타임프레임 수집 (지표 계산 버퍼 포함)
        for (const tf of TIMEFRAMES) {
            const intervalMs = fetcher.intervalToMs(tf);
            const bufferMs = BUFFER_CANDLES * intervalMs;
            const fetchStart = globalStartTime - bufferMs;
            bt.historicalData[tf] = await fetcher.fetchAllKlines(symbol, tf, fetchStart, globalEndTime);
        }

        // 일봉 (Daily Pivot용)
        const dailyStart = globalStartTime - 7 * 86400000;
        bt.historicalData['1d'] = await fetcher.fetchAllKlines(symbol, '1d', dailyStart, globalEndTime);

        globalBacktesters.push(bt);
    }

    console.log(`\n✅ 데이터 수집 완료 (총 API 호출: ${fetcher.requestCount}회, weight: ~${fetcher.weightUsed})`);

    // ═══════════════════════════════════════════════════════
    // 2단계: 3초 간격 시뮬레이션 루프
    // ═══════════════════════════════════════════════════════

    console.log('\n📊 2단계: 백테스트 시뮬레이션 (15분 스텝, 최대 속도)');
    console.log('─'.repeat(50));

    let currentTime = globalStartTime;
    let step = 0;
    const loopStartMs = Date.now();

    while (currentTime <= lastPredTime) {
        step++;
        const tickStart = Date.now();

        const histDate = new Date(currentTime).toISOString().slice(0, 16).replace('T', ' ');

        // 4개 코인 순차 처리
        for (const bt of globalBacktesters) {
            bt.processStep(currentTime);
        }

        // 주간 프루닝 실행 (백테스트 시간 기준 1주일마다)
        for (const bt of globalBacktesters) {
            bt.pruneStrategies(currentTime);
        }

        // N 스텝마다 TXT 저장 (매 스텝 저장 → SAVE_EVERY 간격)
        if (step % SAVE_EVERY === 0) {
            for (const bt of globalBacktesters) {
                bt.saveSummary(globalStartTime, globalEndTime);
            }
        }

        // 주기적 메모리 관리: 1m 캔들 트리밍 + GC 힌트
        if (step % GC_EVERY === 0) {
            for (const bt of globalBacktesters) {
                const candles1m = bt.historicalData['1m'];
                if (candles1m && candles1m.length > CANDLE_1M_KEEP) {
                    // currentTime + HORIZON_MS 이후 캔들도 필요하므로 여유 확보
                    const minNeeded = currentTime - CANDLE_1M_KEEP * 60 * 1000;
                    const trimIdx = bt.findCandleIndex(candles1m, minNeeded);
                    if (trimIdx > 500) {
                        bt.historicalData['1m'] = candles1m.slice(Math.max(0, trimIdx - 200));
                    }
                }
            }
            if (global.gc) global.gc();
        }

        // 진행 상황 출력
        const elapsed = (Date.now() - loopStartMs) / 1000;
        const avgStepSec = elapsed / step;
        const remaining = (totalSteps - step) * avgStepSec;

        // [FIX] Bug3: 콘솔에서도 aggTotal/aggCorrect 누적 카운터 사용
        const coinSummaries = globalBacktesters.map(bt => {
            const acc = bt.aggTotal > 0 ? ((bt.aggCorrect / bt.aggTotal) * 100).toFixed(1) : '0';
            return `${bt.coinLabel}:${acc}%`;
        }).join(' | ');

        console.log(
            `[${step}/${totalSteps}] ${histDate} | ${coinSummaries} | 남은: ${fmtTime(remaining)}`
        );

        // 대기 (TICK_MS=0이면 대기 없음)
        if (TICK_MS > 0) {
            const processingTime = Date.now() - tickStart;
            const waitTime = Math.max(0, TICK_MS - processingTime);
            if (waitTime > 0 && currentTime + STEP_MS <= lastPredTime) {
                await new Promise(r => setTimeout(r, waitTime));
            }
        } else if (step % YIELD_EVERY === 0) {
            // TICK_MS=0일 때도 이벤트 루프에 양보 → GC 실행 기회
            await new Promise(r => setImmediate(r));
        }

        currentTime += STEP_MS;
    }

    // ═══════════════════════════════════════════════════════
    // 3단계: 최종 저장 및 요약
    // ═══════════════════════════════════════════════════════

    console.log('\n💾 최종 TXT 저장 중...');
    for (const bt of globalBacktesters) {
        bt.saveSummary(globalStartTime, globalEndTime);
    }

    console.log('\n═'.repeat(70));
    console.log('✅ 백테스트 완료');
    console.log('═'.repeat(70));
    // [FIX] Bug3: 최종 요약에서도 aggTotal/aggCorrect 사용
    for (const bt of globalBacktesters) {
        const acc = bt.aggTotal > 0 ? ((bt.aggCorrect / bt.aggTotal) * 100).toFixed(1) : '0';
        console.log(`   ${bt.coinLabel}: ${acc}% (${bt.aggCorrect}/${bt.aggTotal}) → ${bt.summaryFile}`);
    }
    console.log('═'.repeat(70));
}

// ─── Ctrl+C: 현재까지 결과 저장 후 종료 ───

process.on('SIGINT', () => {
    console.log('\n\n🛑 백테스트 중단... 현재까지 결과 저장');
    // [FIX] Bug3: SIGINT에서도 aggTotal/aggCorrect 사용
    for (const bt of globalBacktesters) {
        if (bt.aggTotal > 0) {
            bt.saveSummarySync(globalStartTime, globalEndTime);
            const acc = bt.aggTotal > 0 ? ((bt.aggCorrect / bt.aggTotal) * 100).toFixed(1) : '0';
            console.log(`   💾 ${bt.coinLabel}: ${acc}% (${bt.aggCorrect}/${bt.aggTotal}) → ${bt.summaryFile}`);
        }
    }
    process.exit(0);
});

process.on('unhandledRejection', (reason) => {
    console.error('\n❌ 처리되지 않은 오류:', reason);
});

main().catch(err => {
    console.error('❌ 백테스트 실패:', err);
    // 오류 시에도 결과 저장 시도
    for (const bt of globalBacktesters) {
        if (bt.aggTotal > 0) {
            bt.saveSummarySync(globalStartTime, globalEndTime);
        }
    }
    process.exit(1);
});
