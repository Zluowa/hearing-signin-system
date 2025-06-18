// Vercel Serverless API for getting statistics
import { promises as fs } from 'fs';
import path from 'path';

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

export default async function handler(req, res) {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ 
            success: false, 
            message: '方法不允许' 
        });
        return;
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
        
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('获取统计信息失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '服务器内部错误' 
        });
    }
} 