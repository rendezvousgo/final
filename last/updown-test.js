/**
 * 15분 업다운 예측 백테스트 시스템 (1분 간격 분기 방식)
 * - 1분마다 새 분기 생성 → 각 분기는 15분 후 결과 검증 → 즉시 로그 저장
 * - 프로그램 재시작해도 기존 로그 유지
 * - 동시에 여러 분기가 대기하며 각각 15분 후 검증됨
 */

import { AIDataCollector } from './src/data/ai-data-collector.js';
import { DynamicStrategyEngine } from './src/strategies/dynamic-strategy-engine.js';
import { BinanceAPI } from './src/data/binance-api.js';
import fs from 'fs';
import path from 'path';

class UpDownTester {
    /**
     * 전략 이름에서 ID 추출 (예: "[UP-01] Strategy Name" → "01")
     */
    static parseStrategyId(name) {
        if (!name) return '??';
        // 패턴: [UP-01], [DOWN-12], [5m-UP-03] 등
        const match = name.match(/\[(?:[^\]]*-)?(\d+)\]/);
        return match ? match[1] : '??';
    }

    constructor(options = {}) {
        this.symbol = options.symbol || 'XRPUSDT';
        this.coinLabel = this.symbol.replace('USDT', '');
        this.collector = new AIDataCollector();
        this.binance = new BinanceAPI();
        this.dynamicEngine = new DynamicStrategyEngine();
        
        this.isRunning = false;
        this.isCycleRunning = false;
        this.timer = null;
        
        // 세션 시작 시간 (summary 분리용)
        this.sessionStartTime = new Date().toISOString();
        
        // 로그 파일 설정
        this.logDir = options.logDir || './logs';
        this.currentDateString = null;
        this.updateLogFiles(true);
        
        // 기존 로그 불러오기
        this.loadExistingData();
    }
    
    /**
     * 고유한 파일 경로 생성 (기존 파일 있으면 -수정본, -수정본-1, -수정본-2... 추가)
     */
    getUniqueFilePath(basePath) {
        if (!fs.existsSync(basePath)) {
            return basePath;
        }
        
        const dir = path.dirname(basePath);
        const ext = path.extname(basePath);
        const nameWithoutExt = path.basename(basePath, ext);
        
        // -수정본 시도
        let newPath = path.join(dir, `${nameWithoutExt}-수정본${ext}`);
        if (!fs.existsSync(newPath)) {
            return newPath;
        }
        
        // -수정본-1, -수정본-2, ... 시도
        let counter = 1;
        while (fs.existsSync(newPath)) {
            newPath = path.join(dir, `${nameWithoutExt}-수정본-${counter}${ext}`);
            counter++;
        }
        return newPath;
    }

    getDateString() {
        // 기존 TXT 로그 파일에서 시작일 찾기 (코드 실행 시점 기준 7일 주기)
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        // 기존 summary TXT 파일 검색 (수정본 제외하고 원본만)
        const files = fs.readdirSync(this.logDir)
            .filter(f => f.startsWith(`updown-summary-${this.symbol}-`) && f.endsWith('.txt') && !f.includes('-수정본'))
            .sort();
        
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        const formatDate = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };
        
        if (files.length > 0) {
            // 가장 최근 파일의 시작일 추출
            const lastFile = files[files.length - 1];
            const match = lastFile.match(new RegExp(`updown-summary-${this.symbol}-(\\d{4}-\\d{2}-\\d{2})_to_(\\d{4}-\\d{2}-\\d{2})\\.txt`));
            
            if (match) {
                // endDate를 KST로 직접 파싱 (timezone 의존성 제거)
                const endDateParts = match[2].split('-').map(Number);
                const endDateKST = new Date(endDateParts[0], endDateParts[1] - 1, endDateParts[2], 23, 59, 59);
                
                // koreaTime과 endDateKST 모두 로컬 Date 객체로 비교 (일관성)
                if (koreaTime <= endDateKST) {
                    return `${match[1]}_to_${match[2]}`;
                }
                
                // 7일 지났으면 새 파일 생성 (현재부터 +6일)
                const newEndDate = new Date(koreaTime.getTime() + 6 * 24 * 60 * 60 * 1000);
                return `${formatDate(koreaTime)}_to_${formatDate(newEndDate)}`;
            }
        }
        
        // 파일 없으면 현재부터 시작 (현재 ~ +6일)
        const endDate = new Date(koreaTime.getTime() + 6 * 24 * 60 * 60 * 1000);
        return `${formatDate(koreaTime)}_to_${formatDate(endDate)}`;
    }

    /**
     * 주기 변경 시 로그 파일 갱신 (7일 간격)
     */
    updateLogFiles(initial = false) {
        const dateString = this.getDateString();
        if (this.currentDateString === dateString) return;

        if (!initial && this.summaryFile) {
            this.saveToFilesSync(this.summaryFile);
        }

        this.currentDateString = dateString;
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        // 기본 파일 경로
        const baseSummaryFile = path.join(this.logDir, `updown-summary-${this.symbol}-${dateString}.txt`);
        
        // 초기 실행 시에만 고유 파일명 생성 (기존 파일 보호)
        if (initial) {
            this.summaryFile = this.getUniqueFilePath(baseSummaryFile);
            if (this.summaryFile !== baseSummaryFile) {
                console.log(`⚠️ 기존 파일 보호: 새 파일로 저장됩니다`);
            }
        } else {
            // 7일 주기 변경: 새 파일로 전환
            this.summaryFile = this.getUniqueFilePath(baseSummaryFile);
        }

        if (!initial) {
            console.log(`📅 새 7일 주기 로그 파일: ${dateString}`);
        }

        // 주기가 바뀌면 새 로그로 전환 (기존 데이터 혼합 방지)
        if (!initial) {
            this.loadExistingData();
        }
    }
    
    /**
     * 세션 데이터 초기화 (새 세션 시작)
     */
    loadExistingData() {
        // 대기 중인 예측은 보존 (7일 롤오버 시 데이터 손실 방지)
        if (!this.predictions) this.predictions = [];
        this.results = [];           // 전체 결과
        this.sessionResults = [];    // 현재 세션 결과
        
        // 전략별 통계 실시간 누적 (메모리 절약용)
        this.strategyStatsAll = {};      // 이번 주기 전체
        this.strategyStatsSession = {};  // 현재 세션
        
        console.log(`🆕 [${this.coinLabel}] 새 세션 시작: ${new Date(this.sessionStartTime).toLocaleString('ko-KR')}`);
        console.log(`📁 로그 파일: ${this.summaryFile}`);
    }
    
    /**
     * 즉시 로그 저장 (매 사이클마다 호출)
     */
    async saveImmediately() {
        await this.saveToFiles(this.summaryFile);
    }
    
    /**
     * 요약 파일 저장 (덮어쓰기)
     */

    buildSummary() {
        // 현재 세션 데이터만 사용 (useSessionStats=true로 세션 전략 통계 사용)
        const sessionStats = this.getStats(this.sessionResults, true);
        const allStats = this.getStats(this.results, false);
        return `
═══════════════════════════════════════════════════════════
15분 업다운 테스트 결과 요약 (현재 세션)
═══════════════════════════════════════════════════════════
심볼: ${this.symbol}
세션 시작: ${new Date(this.sessionStartTime).toLocaleString('ko-KR')}
최종 업데이트: ${new Date().toLocaleString('ko-KR')}

📊 현재 세션 통계
───────────────────────────────────────────────────────────
총 예측: ${sessionStats.total}회
정확: ${sessionStats.correct}회
정확도: ${sessionStats.accuracy}%

📊 전체 누적 통계
───────────────────────────────────────────────────────────
총 예측: ${allStats.total}회
정확: ${allStats.correct}회
정확도: ${allStats.accuracy}%

📈 방향별 정확도 (현재 세션)
───────────────────────────────────────────────────────────
UP (BUY):   ${sessionStats.buyAccuracy === 'N/A' ? 'N/A' : `${sessionStats.buyAccuracy}%`} (${sessionStats.buyCorrect}/${sessionStats.buyPredictions})
DOWN (SELL): ${sessionStats.sellAccuracy === 'N/A' ? 'N/A' : `${sessionStats.sellAccuracy}%`} (${sessionStats.sellCorrect}/${sessionStats.sellPredictions})

🎯 전략별 정확도 (현재 세션) - 총 ${(sessionStats.strategyStats || []).length}개 전략
───────────────────────────────────────────────────────────
${(sessionStats.strategyStats || []).map(s => {
    const dirLabel = s.direction === 'UP' ? 'UP  ' : s.direction === 'DOWN' ? 'DOWN' : '    ';
    const idStr = String(s.id || '??').padStart(2);
    const nameStr = (s.name || 'Unknown');
    const accStr = String(s.accuracy || '0').padStart(5);
    return `[${dirLabel}-${idStr}] ${nameStr} ${accStr}% (${s.correct}/${s.total})`;
}).join('\n') || '(아직 결과 없음)'}

📋 최근 예측 기록 (현재 세션)
───────────────────────────────────────────────────────────
${this.sessionResults.slice(-10).map(r => {
    const time = new Date(r.timestamp).toLocaleTimeString('ko-KR');
    const emoji = r.correct ? '✅' : '❌';
    const dirEmoji = r.decision === 'BUY' ? '🟢' : r.decision === 'SELL' ? '🔴' : '⚪';
    const resultEmoji = r.result === 'UP' ? '📈' : r.result === 'DOWN' ? '📉' : '➡️';
    return `${emoji} ${time} ${dirEmoji}${r.decision} → ${resultEmoji}${r.result} (${r.priceChangePercent}%)`;
}).join('\n') || '(아직 결과 없음)'}
═══════════════════════════════════════════════════════════
`;
    }

    async saveToFiles(summaryFile) {
        // TXT 요약 덮어쓰기 (항상 최신 상태 유지)
        await fs.promises.writeFile(summaryFile, this.buildSummary(), 'utf8');
    }

    saveToFilesSync(summaryFile) {
        try {
            // TXT 요약 덮어쓰기 (항상 최신 상태 유지)
            fs.writeFileSync(summaryFile, this.buildSummary(), 'utf8');
        } catch (error) {
            console.error('❌ 로그 저장 실패:', error.message);
        }
    }
    
    /**
     * 테스터 시작
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ 테스터가 이미 실행 중입니다.');
            return;
        }
        
        this.isRunning = true;
        console.log('═'.repeat(60));
        console.log(`🚀 [${this.coinLabel}] 15분 업다운 테스트 시작 (1분 간격 분기)`);
        console.log('═'.repeat(60));
        console.log(`   심볼: ${this.symbol}`);
        console.log(`   예측 간격: 1분마다 새 분기 생성`);
        console.log(`   검증 간격: 각 예측 후 15분`);
        console.log(`   로그 주기: 7일 (${this.currentDateString})`);
        console.log(`   로그 파일: ${this.summaryFile}`);
        console.log('═'.repeat(60) + '\n');
        
        // 즉시 1회 실행
        this.runCycle().catch(e => console.error(`❌ [${this.coinLabel}] 사이클 오류:`, e.message));
        
        // 1분마다 실행 (새 분기 생성)
        this.timer = setInterval(() => {
            this.runCycle().catch(e => console.error(`❌ [${this.coinLabel}] 사이클 오류:`, e.message));
        }, 1 * 60 * 1000);
    }
    
    /**
     * 테스터 정지
     */
    async stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
        
        // 최종 저장
        await this.saveImmediately();
        this.printFinalStats();
        
        console.log('\n🛑 테스터 정지');
    }
    
    /**
     * 1 사이클 실행: 이전 예측 검증 → 새 예측 생성 (1분마다 새 분기)
     */
    async runCycle() {
        if (this.isCycleRunning) {
            console.log(`⚠️ [${this.coinLabel}] 이전 사이클이 아직 실행 중입니다. 이번 분기는 건너뜁니다.`);
            return;
        }
        this.isCycleRunning = true;
        
        try {
            this.updateLogFiles();
            const now = new Date();
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`⏰ [${this.coinLabel}] ${now.toLocaleString('ko-KR')} - 새 분기 생성`);
            console.log('─'.repeat(60));
            // 1. 현재 가격 조회
            const currentPrice = await this.binance.getCurrentPrice(this.symbol);
            
            if (currentPrice == null) {
                console.error(`❌ [${this.coinLabel}] 현재 가격 조회 실패`);
                return;
            }
            
            // 2. 이전 예측들 검증 (15분 이상 지난 것들)
            await this.verifyPredictions(currentPrice, now);
            
            // 3. 데이터 수집 및 새 예측 생성 (1분마다 새 분기)
            const data = await this.collector.collectForAI(this.symbol, '15m');
            
            if (!data || !data.indicators) {
                console.error('❌ 데이터 수집 실패');
                return;
            }
            
            // 동적 전략 엔진으로 37만개 전략 테스트
            const candles = data.recentCandles || [];
            const closes = candles.map(c => c.close);
            const highs = candles.map(c => c.high);
            const lows = candles.map(c => c.low);
            const volumes = candles.map(c => c.volume);
            const opens = candles.map(c => c.open);
            const buyVolumes = candles.map(c => c.takerBuyVolume ?? null);
            const sellVolumes = candles.map(c => c.takerSellVolume ?? null);

            const vwmaPeriod = 20;
            let vwma = null;
            if (closes.length >= vwmaPeriod && volumes.length >= vwmaPeriod) {
                let sumPV = 0;
                let sumV = 0;
                for (let i = closes.length - vwmaPeriod; i < closes.length; i++) {
                    sumPV += closes[i] * volumes[i];
                    sumV += volumes[i];
                }
                vwma = sumV !== 0 ? sumPV / sumV : null;
            }

            const marketData = {
                ...data.indicators,
                closes,
                highs,
                lows,
                volumes,
                opens,
                buyVolumes,
                sellVolumes,
                dailyHigh: data.dailyOHLC?.high ?? null,
                dailyLow: data.dailyOHLC?.low ?? null,
                dailyClose: data.dailyOHLC?.close ?? null,
                price: data.currentPrice ?? data.indicators?.price,
                close: data.indicators?.close ?? (closes.length > 0 ? closes[closes.length - 1] : null),
                prevClose: data.indicators?.prevClose ?? (closes.length > 1 ? closes[closes.length - 2] : null),
                prev2Close: data.indicators?.prev2Close ?? (closes.length > 2 ? closes[closes.length - 3] : null),
                prevPrice: data.indicators?.prevClose ?? (closes.length > 1 ? closes[closes.length - 2] : null),
                bb: data.indicators?.bollingerBands ?? data.indicators?.bb,
                vwma,
                keyLevels: data.keyLevels,
                support: data.keyLevels?.nearestSupport ?? null,
                resistance: data.keyLevels?.nearestResistance ?? null,
                fearGreed: data.fearGreed?.value ?? data.indicators?.fearGreed ?? 50,
                fearGreedIndex: data.fearGreed?.value ?? data.indicators?.fearGreedIndex ?? 50,
                prevFearGreed: data.indicators?.prevFearGreed ?? null,
                // 멀티 타임프레임 데이터 추가
                indicatorsByTimeframe: data.indicatorsByTimeframe || {},
                candlesByTimeframe: data.candlesByTimeframe || {},
                supportedTimeframes: data.supportedTimeframes || ['15m'],
                __indicatorCache: new Map(),
                __prevIndicatorCache: new Map(),
                __signalCache: new Map()
            };

            // 멀티 타임프레임 모드로 분석
            // - 다른 타임프레임 지표 조합 허용 (예: [5m]RSI + [15m]MACD)
            // - 같은 지표의 다른 타임프레임 조합 불가 (예: [5m]RSI + [15m]RSI)
            const analysis = this.dynamicEngine.analyze(marketData, { 
                multiTimeframe: true,
                timeframes: data.supportedTimeframes || ['1m', '5m', '15m', '1h']
            });
            
            // 메모리 최적화: 매칭 수만 저장, 이름 배열은 통계 누적 후 즉시 해제
            const upCount = analysis.upMatched;
            const downCount = analysis.downMatched;
            const upNames = analysis.upNames || [];
            const downNames = analysis.downNames || [];
            
            // UP/DOWN 판단 (매칭된 전략 수로 결정)
            const direction = upCount > downCount ? 'UP' : 
                             downCount > upCount ? 'DOWN' : 'NEUTRAL';
            
            // 4. 예측 저장 (각 분기마다 15분 후 예측)
            const decision = direction === 'UP' ? 'BUY' : 
                            direction === 'DOWN' ? 'SELL' : 'HOLD';
            
            const prediction = {
                timestamp: now.toISOString(),
                branchId: `${now.getTime()}`, // 분기 ID
                priceAtPrediction: currentPrice,
                decision: decision,
                confidence: analysis.totalTested > 0
                    ? Math.abs(upCount - downCount) / analysis.totalTested
                    : 0,
                totalTested: analysis.totalTested,
                matchedUpNames: upNames,
                matchedDownNames: downNames,
                buyCount: upCount,
                sellCount: downCount,
                multiTimeframe: analysis.multiTimeframe,
                indicators: {
                    rsi: data.indicators.rsi,
                    macdHist: data.indicators.macd?.histogram,
                    bbPosition: data.indicators.bollingerBands?.position,
                    ema20: data.indicators.ema20,
                    ema50: data.indicators.ema50
                },
                fearGreed: data.fearGreed?.value,
                result: null,
                priceAfter15m: null,
                priceChange: null,
                correct: null
            };
            
            this.predictions.push(prediction);
            
            // 5. 예측 출력
            console.log(`\n📊 [${this.coinLabel}] 동적 전략 분석 결과:`);
            console.log(`   총 테스트: ${analysis.totalTested.toLocaleString()}개`);
            console.log(`   UP 매칭: ${upCount}개`);
            console.log(`   DOWN 매칭: ${downCount}개`);
            console.log(`   결정: ${decision} (신뢰도: ${(prediction.confidence * 100).toFixed(2)}%)`);
            this.printPrediction(prediction, analysis);
            
            // 메모리 해제: 대형 객체 명시적 정리
            if (marketData.__signalCache) marketData.__signalCache.clear();
            if (marketData.__indicatorCache) marketData.__indicatorCache.clear();
            if (marketData.__prevIndicatorCache) marketData.__prevIndicatorCache.clear();
            
            // 6. 즉시 로그 저장!!!
            await this.saveImmediately();
            console.log(`💾 [${this.coinLabel}] 로그 저장 완료 (대기 중: ${this.predictions.length}개)`);
            
        } catch (error) {
            console.error('❌ 오류:', error.message);
        } finally {
            this.isCycleRunning = false;
        }
    }
    
    /**
     * 이전 예측 검증
     * - 15분~20분 사이만 검증 (정확한 15분 후 가격)
     * - 20분 이상 지난 것은 버림 (껐다 켠 경우 신뢰 불가)
     */
    async verifyPredictions(currentPrice_unused, now) {
        const toVerify = [];
        const stillPending = [];
        const toDiscard = [];
        
        for (const pred of this.predictions) {
            const predTime = new Date(pred.timestamp);
            const elapsed = (now - predTime) / 1000 / 60;
            
            if (elapsed >= 15 && elapsed < 20 && pred.result == null) {
                // 15~20분: 정상 검증 (아직 stillPending에 넣지 않음)
                toVerify.push(pred);
            } else if (elapsed >= 20 && pred.result == null) {
                // 20분 이상: 너무 오래됨, 버림 (껐다 켠 경우)
                toDiscard.push(pred);
            } else if (pred.result == null) {
                // 15분 미만: 대기
                stillPending.push(pred);
            }
        }
        
        // 버려지는 예측 로그
        if (toDiscard.length > 0) {
            console.log(`⚠️ [${this.coinLabel}] ${toDiscard.length}개 예측 폐기 (20분 초과 - 신뢰 불가)`);
            for (const pred of toDiscard) {
                const elapsed = ((now - new Date(pred.timestamp)) / 1000 / 60).toFixed(1);
                console.log(`   - 분기 #${pred.branchId?.slice(-6)} (${elapsed}분 경과)`);
            }
        }
        
        // 검증 성공한 예측만 제거하기 위해 일단 대기 목록만 갱신
        this.predictions = stillPending;
        
        // 검증 실패 시 다시 추가하기 위한 배열
        const verifyFailed = [];

        for (const pred of toVerify) {
            try {
                const targetTime = new Date(new Date(pred.timestamp).getTime() + 15 * 60 * 1000);
                const priceAtTarget = await this.getPriceAtTime(targetTime);
                
                // 가격 조회 실패 시 다음 사이클에서 재시도
                if (priceAtTarget === null) {
                    console.log(`⚠️ 분기 #${pred.branchId?.slice(-6)} 가격 조회 실패 - 재시도 예정`);
                    verifyFailed.push(pred);
                    continue;
                }
                
                pred.priceAfter15m = priceAtTarget;
                pred.priceChange = priceAtTarget - pred.priceAtPrediction;
                pred.priceChangePercent = Number(((priceAtTarget - pred.priceAtPrediction) / pred.priceAtPrediction * 100).toFixed(4));
                
                if (pred.priceChange > 0) {
                    pred.result = 'UP';
                } else if (pred.priceChange < 0) {
                    pred.result = 'DOWN';
                } else {
                    pred.result = 'FLAT';
                }
                
                // 정확도 판정 로직
                // - BUY는 UP이면 정답
                // - SELL은 DOWN이면 정답
                // - HOLD는 변동이 미미하면 (0.05% 미만) 정답 (실질적으로 횟보 방지)
                const absChangePercent = Math.abs(pred.priceChangePercent);
                const HOLD_THRESHOLD = 0.05; // 0.05% 미만 변동은 횟보로 간주
                
                if (pred.decision === 'BUY' && pred.result === 'UP') {
                    pred.correct = true;
                } else if (pred.decision === 'SELL' && pred.result === 'DOWN') {
                    pred.correct = true;
                } else if (pred.decision === 'HOLD' && absChangePercent < HOLD_THRESHOLD) {
                    // HOLD인데 변동이 HOLD_THRESHOLD 미만이면 정답으로 처리
                    pred.correct = true;
                } else {
                    pred.correct = false;
                }
                
                this.results.push(pred);
                this.sessionResults.push(pred);
                
                // 메모리 보호: 최대 5000개까지만 유지
                const MAX_RESULTS = 5000;
                if (this.results.length > MAX_RESULTS) {
                    this.results = this.results.slice(-MAX_RESULTS);
                }
                if (this.sessionResults.length > MAX_RESULTS) {
                    this.sessionResults = this.sessionResults.slice(-MAX_RESULTS);
                }
                
                // 전략별 통계 실시간 누적 (메모리 절약 핵심)
                this.updateStrategyStats(pred);
                
                // 메모리 해제: 통계 누적 후 이름 배열 삭제
                delete pred.matchedUpNames;
                delete pred.matchedDownNames;
                
                this.printVerification(pred);
                
                // 검증 완료 즉시 저장
                await this.saveImmediately();
            } catch (error) {
                console.error(`❌ 검증 오류 (분기 #${pred.branchId?.slice(-6)}):`, error.message);
                verifyFailed.push(pred);
            }
        }
        
        // 검증 실패한 예측은 다시 대기 목록에 추가
        if (verifyFailed.length > 0) {
            this.predictions.push(...verifyFailed);
            console.log(`🔄 ${verifyFailed.length}개 예측 재검증 대기`);
        }
    }

    /**
     * 특정 시점의 가격 조회 (1분 캔들 기준)
     * @param {Date} targetTime - 조회할 시점
     * @param {number} retryCount - 재시도 횟수 (내부용)
     * @returns {number|null} 해당 시점의 종가, 실패 시 null
     */
    async getPriceAtTime(targetTime, retryCount = 0) {
        const MAX_RETRIES = 3;
        
        try {
            const targetMs = targetTime.getTime();
            const now = Date.now();
            
            // 미래 시점은 조회 불가
            if (targetMs > now) {
                return null;
            }
            
            // 목표 시점 포함하여 앞뒤로 충분한 범위 조회
            const startTime = targetMs - 2 * 60 * 1000;
            const endTime = targetMs + 2 * 60 * 1000;

            const klines = await this.binance.getKlines(this.symbol, '1m', 5, {
                startTime,
                endTime
            });

            if (!klines || klines.length === 0) {
                // 재시도 가능
                if (retryCount < MAX_RETRIES) {
                    console.warn(`가격 조회 재시도 ${retryCount + 1}/${MAX_RETRIES}: ${targetTime.toISOString()}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    return this.getPriceAtTime(targetTime, retryCount + 1);
                }
                console.warn(`가격 조회 실패: ${targetTime.toISOString()} - 데이터 없음 (${MAX_RETRIES}회 재시도 후)`);
                return null;
            }

            // 정확히 해당 시점의 캔들 찾기 (1분 캔들의 종가 사용)
            const candle = klines.find(k => targetMs >= k.openTime && targetMs < k.openTime + 60 * 1000);
            
            if (candle) {
                return candle.close;
            }
            
            // 정확한 캔들이 없으면 가장 가까운 이전 캔들 사용
            const beforeCandles = klines.filter(k => k.openTime <= targetMs);
            if (beforeCandles.length > 0) {
                return beforeCandles[beforeCandles.length - 1].close;
            }
            
            // 그래도 없으면 가장 빠른 캔들 사용
            if (klines.length > 0) {
                console.warn(`가격 조회: ${targetTime.toISOString()} - 가장 가까운 캔들 사용`);
                return klines[0].close;
            }
            
            console.warn(`가격 조회 실패: ${targetTime.toISOString()} 적합한 캔들 없음`);
            return null;
        } catch (error) {
            if (retryCount < MAX_RETRIES) {
                console.warn(`가격 조회 재시도 ${retryCount + 1}/${MAX_RETRIES}: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return this.getPriceAtTime(targetTime, retryCount + 1);
            }
            console.error('가격 시점 조회 오류:', error.message);
            return null;
        }
    }
    
    /**
     * 예측 출력
     */
    printPrediction(pred, analysis) {
        const emoji = pred.decision === 'BUY' ? '🟢' : 
                      pred.decision === 'SELL' ? '🔴' : '⚪';
        
        const branchLabel = pred.branchId ? ` (분기 #${pred.branchId.slice(-6)})` : '';
        console.log(`\n📊 [${this.coinLabel}] 새 예측 생성${branchLabel}`);
        console.log(`   💰 현재가: $${pred.priceAtPrediction.toLocaleString()}`);
        console.log(`   📈 Fear & Greed: ${pred.fearGreed ?? 'N/A'}`);
        console.log(`   📊 RSI: ${pred.indicators.rsi?.toFixed(1)}`);
        
        // 메모리 최적화: 이름 배열만 사용
        const upNames = analysis.upNames || [];
        const downNames = analysis.downNames || [];
        const totalMatched = upNames.length + downNames.length;
        if (totalMatched > 0) {
            console.log(`   🎯 매칭 전략: UP=${upNames.length}개, DOWN=${downNames.length}개`);
        }
        
        console.log(`\n   ${emoji} 예측: ${pred.decision} (신뢰도 ${(pred.confidence * 100).toFixed(2)}%)`);
        console.log(`   ⏳ 15분 후 검증 예정 (${new Date(new Date(pred.timestamp).getTime() + 15 * 60 * 1000).toLocaleTimeString('ko-KR')})`);
    }
    
    /**
     * 검증 결과 출력
     */
    printVerification(pred) {
        const predEmoji = pred.decision === 'BUY' ? '🟢' : 
                         pred.decision === 'SELL' ? '🔴' : '⚪';
        const resultEmoji = pred.result === 'UP' ? '📈' : 
                           pred.result === 'DOWN' ? '📉' : '➡️';
        const correctEmoji = pred.correct ? '✅' : '❌';
        
        const branchLabel = pred.branchId ? ` (분기 #${pred.branchId.slice(-6)})` : '';
        console.log(`\n${correctEmoji} [${this.coinLabel}] 예측 검증 완료${branchLabel}`);
        console.log(`   예측 시점: ${new Date(pred.timestamp).toLocaleTimeString('ko-KR')}`);
        console.log(`   ${predEmoji} 예측: ${pred.decision} (${(pred.confidence * 100).toFixed(2)}%)`);
        console.log(`   ${resultEmoji} 실제: ${pred.result} (${pred.priceChangePercent.toFixed(3)}%)`);
        console.log(`   💰 ${pred.priceAtPrediction.toFixed(0)} → ${pred.priceAfter15m.toFixed(0)} ($${pred.priceChange.toFixed(0)})`);
        
        const sessionStats = this.getStats(this.sessionResults);
        const allStats = this.getStats(this.results);
        console.log(`   📊 세션 정확도: ${sessionStats.accuracy}% (${sessionStats.correct}/${sessionStats.total})`);
        console.log(`   📊 전체 정확도: ${allStats.accuracy}% (${allStats.correct}/${allStats.total})`);
    }
    
    /**
     * 통계 계산 (결과 배열을 파라미터로 받음)
     */
    getStats(resultsArray = null, useSessionStats = false) {
        const results = resultsArray || this.results;
        const total = results.length;
        if (total === 0) {
            return { 
                total: 0, correct: 0, accuracy: '0',
                buyPredictions: 0, buyCorrect: 0, buyAccuracy: 'N/A',
                sellPredictions: 0, sellCorrect: 0, sellAccuracy: 'N/A',
                strategyStats: []
            };
        }
        
        const correct = results.filter(r => r.correct).length;
        const accuracy = ((correct / total) * 100).toFixed(1);
        
        const buyPredictions = results.filter(r => r.decision === 'BUY');
        const buyCorrect = buyPredictions.filter(r => r.correct).length;
        const buyAccuracy = buyPredictions.length > 0 
            ? ((buyCorrect / buyPredictions.length) * 100).toFixed(1) : 'N/A';
        
        const sellPredictions = results.filter(r => r.decision === 'SELL');
        const sellCorrect = sellPredictions.filter(r => r.correct).length;
        const sellAccuracy = sellPredictions.length > 0 
            ? ((sellCorrect / sellPredictions.length) * 100).toFixed(1) : 'N/A';
        
        // 누적된 전략 통계 사용 (메모리 절약)
        const statsSource = useSessionStats ? this.strategyStatsSession : this.strategyStatsAll;
        const strategyStatsArray = Object.values(statsSource || {}).map(s => ({
            ...s,
            accuracy: s.total > 0 ? ((s.correct / s.total) * 100).toFixed(1) : '0'
        })).sort((a, b) => b.total - a.total);
        
        return {
            total, correct, accuracy,
            buyPredictions: buyPredictions.length, buyCorrect, buyAccuracy,
            sellPredictions: sellPredictions.length, sellCorrect, sellAccuracy,
            strategyStats: strategyStatsArray
        };
    }
    
    /**
     * 전략별 통계 실시간 누적 (이름 배열 기반)
     */
    updateStrategyStats(pred) {
        // UP 전략 통계 누적
        const upNames = pred.matchedUpNames || [];
        for (const name of upNames) {
            const key = name;
            const parsedId = UpDownTester.parseStrategyId(name);
            
            // 전체 통계
            if (!this.strategyStatsAll[key]) {
                this.strategyStatsAll[key] = { direction: 'UP', name: key, id: parsedId, total: 0, correct: 0 };
            }
            this.strategyStatsAll[key].total++;
            if (pred.result === 'UP') this.strategyStatsAll[key].correct++;
            
            // 세션 통계
            if (!this.strategyStatsSession[key]) {
                this.strategyStatsSession[key] = { direction: 'UP', name: key, id: parsedId, total: 0, correct: 0 };
            }
            this.strategyStatsSession[key].total++;
            if (pred.result === 'UP') this.strategyStatsSession[key].correct++;
        }
        
        // DOWN 전략 통계 누적
        const downNames = pred.matchedDownNames || [];
        for (const name of downNames) {
            const key = name;
            const parsedId = UpDownTester.parseStrategyId(name);
            
            // 전체 통계
            if (!this.strategyStatsAll[key]) {
                this.strategyStatsAll[key] = { direction: 'DOWN', name: key, id: parsedId, total: 0, correct: 0 };
            }
            this.strategyStatsAll[key].total++;
            if (pred.result === 'DOWN') this.strategyStatsAll[key].correct++;
            
            // 세션 통계
            if (!this.strategyStatsSession[key]) {
                this.strategyStatsSession[key] = { direction: 'DOWN', name: key, id: parsedId, total: 0, correct: 0 };
            }
            this.strategyStatsSession[key].total++;
            if (pred.result === 'DOWN') this.strategyStatsSession[key].correct++;
        }
    }
    
    /**
     * 최종 통계 출력
     */
    printFinalStats() {
        const sessionStats = this.getStats(this.sessionResults);
        const allStats = this.getStats(this.results);
        
        console.log('\n' + '═'.repeat(60));
        console.log(`📊 [${this.coinLabel}] 최종 통계 (현재 세션)`);
        console.log('═'.repeat(60));
        console.log(`\n세션 시작: ${new Date(this.sessionStartTime).toLocaleString('ko-KR')}`);
        console.log(`총 예측: ${sessionStats.total}회`);
        console.log(`정확: ${sessionStats.correct}회`);
        console.log(`정확도: ${sessionStats.accuracy}%`);
        
        console.log(`\n📈 방향별 정확도 (세션):`);
        const buyAccuracyLabel = sessionStats.buyAccuracy === 'N/A' ? 'N/A' : `${sessionStats.buyAccuracy}%`;
        const sellAccuracyLabel = sessionStats.sellAccuracy === 'N/A' ? 'N/A' : `${sessionStats.sellAccuracy}%`;
        console.log(`   UP (BUY):   ${buyAccuracyLabel} (${sessionStats.buyCorrect}/${sessionStats.buyPredictions})`);
        console.log(`   DOWN (SELL): ${sellAccuracyLabel} (${sessionStats.sellCorrect}/${sessionStats.sellPredictions})`);
        
        console.log('\n' + '─'.repeat(60));
        console.log('📊 전체 누적 통계');
        console.log('─'.repeat(60));
        console.log(`총 예측: ${allStats.total}회`);
        console.log(`정확: ${allStats.correct}회`);
        console.log(`정확도: ${allStats.accuracy}%`);
        
        if (sessionStats.strategyStats && sessionStats.strategyStats.length > 0) {
            console.log(`\n🎯 전략별 정확도 (세션) - 상위 20개:`);
            for (const s of sessionStats.strategyStats.slice(0, 20)) {
                const dirLabel = s.direction === 'UP' ? 'UP  ' : s.direction === 'DOWN' ? 'DOWN' : '    ';
                const idStr = String(s.id || '??').padStart(2);
                console.log(`   [${dirLabel}-${idStr}] ${s.name}: ${s.accuracy}% (${s.correct}/${s.total})`);
            }
            console.log(`   ... 총 ${sessionStats.strategyStats.length}개 전략 (TXT 파일에서 전체 확인)`);
        }
        console.log('═'.repeat(60));
    }
}

// ═══════════════════════════════════════════════════════════════
// 메인 실행
// ═══════════════════════════════════════════════════════════════

async function main() {
    const symbols = ['BTCUSDT', 'SOLUSDT', 'XRPUSDT', 'ETHUSDT'];
    const testers = [];

    console.log('═'.repeat(60));
    console.log(`🚀 멀티코인 백테스트 시작: ${symbols.map(s => s.replace('USDT', '')).join(', ')}`);
    console.log(`   총 ${symbols.length}개 코인 × 1분 간격 분기`);
    console.log('═'.repeat(60));

    for (const symbol of symbols) {
        testers.push(new UpDownTester({
            symbol,
            logDir: './logs'
        }));
    }

    for (let idx = 0; idx < testers.length; idx++) {
        const tester = testers[idx];
        // 코인별 1분 간격으로 시작 (동시 실행 시 메모리 폭발 방지)
        setTimeout(() => tester.start(), idx * 60000);
    }

    // Ctrl+C 처리
    process.on('SIGINT', async () => {
        console.log('\n🛑 모든 테스터 정지 중...');
        for (const tester of testers) {
            try {
                await tester.stop();
            } catch (e) {
                console.error(`❌ [${tester.coinLabel}] 정지 오류:`, e.message);
            }
        }
        process.exit(0);
    });

    // 예상치 못한 종료 시에도 저장 (동기 저장 사용)
    process.on('uncaughtException', (err) => {
        console.error('❌ 예상치 못한 오류:', err);
        for (const tester of testers) {
            try {
                tester.saveToFilesSync(tester.summaryFile);
            } catch (e) {
                console.error(`❌ [${tester.coinLabel}] 저장 실패:`, e.message);
            }
        }
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ 처리되지 않은 프로미스:', reason);
    });
}

main().catch(err => { console.error('❌ 시작 실패:', err); process.exit(1); });
