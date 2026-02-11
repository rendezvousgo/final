/**
 * 전략 필터링 스크립트
 * 조건: 총 예측의 25% 이상 참여 + 정확도 70% 이상
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';

const LOG_DIR = './logs';
const OUTPUT_FILE = './logs/filtered-strategies.txt';

async function filterStrategies() {
    // 가장 최신 summary 파일 찾기
    const files = fs.readdirSync(LOG_DIR)
        .filter(f => f.startsWith('updown-summary-') && f.endsWith('.txt'))
        .sort()
        .reverse();
    
    if (files.length === 0) {
        console.log('❌ 로그 파일이 없습니다.');
        return;
    }
    
    const latestFile = path.join(LOG_DIR, files[0]);
    console.log(`📂 분석 파일: ${latestFile}`);
    
    // 파일을 라인 단위로 읽기 (메모리 효율)
    const fileStream = fs.createReadStream(latestFile, { encoding: 'utf8' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    
    const strategies = [];
    let totalPredictions = 0;
    let inStrategySection = false;
    
    // 정규식: [UP  -??] UP: ... 또는 [DOWN-??] DOWN: ... 형식
    // 예: [DOWN-??] DOWN: [1h] SMA(50): SMA 기울기 하락            57.3% (410/716)
    const strategyRegex = /^\[(UP\s*|DOWN)-[^\]]*\]\s+(UP|DOWN):\s+(.+?)\s+(\d+\.?\d*)%\s+\((\d+)\/(\d+)\)/;
    const totalRegex = /총 예측:\s*(\d+)|珥??덉륫:\s*(\d+)/;
    
    for await (const line of rl) {
        // 총 예측 수 찾기 (현재 세션 기준)
        const totalMatch = line.match(totalRegex);
        if (totalMatch && totalPredictions === 0) {
            totalPredictions = parseInt(totalMatch[1] || totalMatch[2]);
            console.log(`📊 총 예측 수: ${totalPredictions}회`);
        }
        
        // 전략 섹션 시작 (전략별 정확도 또는 한글 깨진 버전)
        if (line.includes('전략별 정확도') || line.includes('꾨왂蹂')) {
            inStrategySection = true;
            continue;
        }
        
        // 전략 섹션 종료
        if (inStrategySection && (line.includes('═══') || line.includes('최근 예측') || line.includes('먥븧'))) {
            // 먥븧은 ═의 깨진 버전
            if (line.includes('먥븧') && strategies.length > 0) {
                inStrategySection = false;
            }
            continue;
        }
        
        // 전략 파싱
        if (inStrategySection || line.startsWith('[UP') || line.startsWith('[DOWN')) {
            const match = line.match(strategyRegex);
            if (match) {
                const direction = match[2]; // UP 또는 DOWN (두 번째 캡처)
                const name = match[3].trim();
                const accuracy = parseFloat(match[4]);
                const correct = parseInt(match[5]);
                const total = parseInt(match[6]);
                
                strategies.push({
                    direction,
                    name,
                    accuracy,
                    correct,
                    total,
                    fullName: `[${direction}] ${name}`
                });
            }
        }
    }
    
    console.log(`📈 총 전략 수: ${strategies.length}개`);
    
    if (totalPredictions === 0) {
        console.log('❌ 총 예측 수를 찾을 수 없습니다.');
        return;
    }
    
    // 필터링: 25% 이상 참여 + 70% 이상 정확도
    const threshold = totalPredictions * 0.25;
    const minAccuracy = 70;
    
    console.log(`\n🎯 필터 조건:`);
    console.log(`   - 최소 참여: ${threshold.toFixed(0)}회 (전체의 25%)`);
    console.log(`   - 최소 정확도: ${minAccuracy}%`);
    
    const filtered = strategies.filter(s => 
        s.total >= threshold && s.accuracy >= minAccuracy
    );
    
    // 정확도 기준 정렬
    filtered.sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);
    
    console.log(`\n✅ 조건 만족 전략: ${filtered.length}개\n`);
    
    // 결과 출력
    const output = [];
    output.push('═'.repeat(80));
    output.push('🏆 고성능 전략 목록 (25% 이상 참여 + 70% 이상 정확도)');
    output.push('═'.repeat(80));
    output.push(`분석 기준: 총 ${totalPredictions}회 예측`);
    output.push(`필터 조건: 최소 ${threshold.toFixed(0)}회 참여, 최소 ${minAccuracy}% 정확도`);
    output.push(`선별 결과: ${filtered.length}개 전략`);
    output.push('─'.repeat(80));
    output.push('');
    
    // UP 전략
    const upStrategies = filtered.filter(s => s.direction === 'UP');
    output.push(`📈 UP 전략 (${upStrategies.length}개)`);
    output.push('─'.repeat(80));
    for (const s of upStrategies) {
        const participation = ((s.total / totalPredictions) * 100).toFixed(1);
        output.push(`[UP] ${s.name.substring(0, 50).padEnd(50)} ${s.accuracy.toFixed(1).padStart(5)}% (${s.correct}/${s.total}) [참여율: ${participation}%]`);
    }
    output.push('');
    
    // DOWN 전략
    const downStrategies = filtered.filter(s => s.direction === 'DOWN');
    output.push(`📉 DOWN 전략 (${downStrategies.length}개)`);
    output.push('─'.repeat(80));
    for (const s of downStrategies) {
        const participation = ((s.total / totalPredictions) * 100).toFixed(1);
        output.push(`[DOWN] ${s.name.substring(0, 50).padEnd(50)} ${s.accuracy.toFixed(1).padStart(5)}% (${s.correct}/${s.total}) [참여율: ${participation}%]`);
    }
    output.push('');
    output.push('═'.repeat(80));
    
    // 콘솔 출력
    for (const line of output) {
        console.log(line);
    }
    
    // 파일 저장
    fs.writeFileSync(OUTPUT_FILE, output.join('\n'), 'utf8');
    console.log(`\n💾 결과 저장: ${OUTPUT_FILE}`);
    
    return filtered;
}

filterStrategies().catch(console.error);
