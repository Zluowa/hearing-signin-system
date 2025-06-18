// Vercel Serverless API for handling sign-in records
import { promises as fs } from 'fs';
import path from 'path';

// 数据存储路径 (使用临时目录)
const DATA_DIR = '/tmp';
const RECORDS_FILE = path.join(DATA_DIR, 'sign-in-records.json');

// 确保数据文件存在
async function ensureDataFile() {
    try {
        await fs.access(RECORDS_FILE);
    } catch {
        await fs.writeFile(RECORDS_FILE, JSON.stringify([]));
    }
}

// 读取签到记录
async function getRecords() {
    try {
        await ensureDataFile();
        const data = await fs.readFile(RECORDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取签到记录失败:', error);
        return [];
    }
}

// 保存签到记录
async function saveRecords(records) {
    try {
        await fs.writeFile(RECORDS_FILE, JSON.stringify(records, null, 2));
        return true;
    } catch (error) {
        console.error('保存签到记录失败:', error);
        return false;
    }
}

export default async function handler(req, res) {
    // 设置CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (req.method === 'GET') {
            // 获取所有签到记录
            const records = await getRecords();
            res.json({ success: true, data: records });
        } 
        else if (req.method === 'POST') {
            // 添加签到记录
            const newRecord = req.body;
            
            // 验证必要字段
            if (!newRecord.name || !newRecord.phone || !newRecord.location) {
                return res.status(400).json({ 
                    success: false, 
                    message: '缺少必要的签到信息' 
                });
            }
            
            const records = await getRecords();
            
            // 检查是否已经签到过（同一手机号）
            const existingIndex = records.findIndex(r => r.phone === newRecord.phone);
            
            if (existingIndex !== -1) {
                // 更新现有记录
                records[existingIndex] = {
                    ...newRecord,
                    id: records[existingIndex].id, // 保持原有ID
                    updateTime: new Date().toISOString()
                };
                console.log(`更新签到记录: ${newRecord.name} (${newRecord.phone})`);
            } else {
                // 添加新记录
                newRecord.id = Date.now().toString();
                newRecord.signInTime = new Date().toISOString();
                records.push(newRecord);
                console.log(`新增签到记录: ${newRecord.name} (${newRecord.phone})`);
            }
            
            if (await saveRecords(records)) {
                res.json({ 
                    success: true, 
                    message: '签到成功',
                    data: newRecord
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: '保存签到记录失败' 
                });
            }
        }
        else if (req.method === 'DELETE') {
            // 删除签到记录（从URL路径获取ID）
            const recordId = req.query.id;
            
            if (!recordId) {
                return res.status(400).json({ 
                    success: false, 
                    message: '缺少记录ID' 
                });
            }
            
            const records = await getRecords();
            const filteredRecords = records.filter(r => r.id !== recordId);
            
            if (filteredRecords.length === records.length) {
                return res.status(404).json({ 
                    success: false, 
                    message: '记录不存在' 
                });
            }
            
            if (await saveRecords(filteredRecords)) {
                res.json({ 
                    success: true, 
                    message: '删除成功' 
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: '删除失败' 
                });
            }
        }
        else {
            res.status(405).json({ 
                success: false, 
                message: '方法不允许' 
            });
        }
    } catch (error) {
        console.error('API错误:', error);
        res.status(500).json({ 
            success: false, 
            message: '服务器内部错误' 
        });
    }
} 