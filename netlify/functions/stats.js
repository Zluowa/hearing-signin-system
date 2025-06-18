// Netlify Function for getting statistics
const fs = require('fs').promises;
const path = require('path');

// 数据存储路径
const DATA_DIR = '/tmp';
const RECORDS_FILE = path.join(DATA_DIR, 'sign-in-records.json');

// 读取签到记录
async function getRecords() {
    try {
        await fs.access(RECORDS_FILE);
        const data = await fs.readFile(RECORDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

exports.handler = async (event, context) => {
    // 设置CORS头
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // 处理预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: '方法不允许' 
            })
        };
    }

    try {
        const records = await getRecords();
        const stats = {
            totalSigned: records.length,
            todaySigned: records.filter(r => {
                const today = new Date().toDateString();
                const recordDate = new Date(r.signInTime).toDateString();
                return recordDate === today;
            }).length
        };
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, data: stats })
        };
    } catch (error) {
        console.error('获取统计信息失败:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                message: '服务器内部错误: ' + error.message 
            })
        };
    }
}; 