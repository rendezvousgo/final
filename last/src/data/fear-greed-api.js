import axios from 'axios';

/**
 * Fear & Greed Index API
 */
export class FearGreedAPI {
    constructor() {
        this.baseURL = 'https://api.alternative.me/fng';
        this.timeout = 10000; // 10초 타임아웃
    }

    /**
     * 오늘의 Fear & Greed Index 가져오기
     * @returns {Promise<Object>} Fear & Greed 데이터 (value: 0-100)
     */
    async getCurrent() {
        try {
            const response = await axios.get(`${this.baseURL}/?limit=1`, {
                timeout: this.timeout
            });
            const data = response.data.data[0];
            
            return {
                value: parseInt(data.value),
                classification: data.value_classification
            };
        } catch (error) {
            console.error('Fear & Greed API 오류:', error.message);
            return { value: 50, classification: 'Neutral' };
        }
    }
}
