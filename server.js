const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// 中间件
app.use(express.static(__dirname));
app.use(express.json()); // 解析JSON请求体

// 签到记录文件路径
const RECORDS_FILE = path.join(__dirname, 'sign-in-records.json');

// 初始化记录文件
if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify([]));
}

// 读取签到记录
function getRecords() {
    try {
        const data = fs.readFileSync(RECORDS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('读取签到记录失败:', error);
        return [];
    }
}

// 保存签到记录
function saveRecords(records) {
    try {
        fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2));
        return true;
    } catch (error) {
        console.error('保存签到记录失败:', error);
        return false;
    }
}

// API路由

// 获取所有签到记录
app.get('/api/records', (req, res) => {
    const records = getRecords();
    res.json({ success: true, data: records });
});

// 添加签到记录
app.post('/api/records', (req, res) => {
    const newRecord = req.body;
    
    // 验证必要字段
    if (!newRecord.name || !newRecord.phone || !newRecord.location) {
        return res.status(400).json({ 
            success: false, 
            message: '缺少必要的签到信息' 
        });
    }
    
    const records = getRecords();
    
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
    
    if (saveRecords(records)) {
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
});

// 删除签到记录（管理功能）
app.delete('/api/records/:id', (req, res) => {
    const recordId = req.params.id;
    const records = getRecords();
    
    const filteredRecords = records.filter(r => r.id !== recordId);
    
    if (filteredRecords.length === records.length) {
        return res.status(404).json({ 
            success: false, 
            message: '记录不存在' 
        });
    }
    
    if (saveRecords(filteredRecords)) {
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
});

// 获取签到统计
app.get('/api/stats', (req, res) => {
    const records = getRecords();
    const stats = {
        totalSigned: records.length,
        todaySigned: records.filter(r => {
            const today = new Date().toDateString();
            const recordDate = new Date(r.signInTime).toDateString();
            return recordDate === today;
        }).length
    };
    res.json({ success: true, data: stats });
});

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`不良贷款听证会签到系统运行在 http://localhost:${PORT}`);
    console.log('请在手机浏览器中打开该地址进行测试');
    console.log('API接口:');
    console.log('  GET  /api/records - 获取签到记录');
    console.log('  POST /api/records - 提交签到记录');
    console.log('  GET  /api/stats   - 获取签到统计');
});