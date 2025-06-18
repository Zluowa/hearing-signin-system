// 纯静态版本 - 使用localStorage存储，适合快速部署
let currentLocation = null;
let geolocation = null;
let currentView = 'signin';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initGeolocation();
    initEventListeners();
    loadRecords();
});

// 初始化事件监听
function initEventListeners() {
    // 获取位置按钮
    document.getElementById('locationBox').addEventListener('click', getLocation);
    
    // 表单提交
    document.getElementById('checkInForm').addEventListener('submit', handleSubmit);
    
    // 底部标签切换
    document.getElementById('recordsTab').addEventListener('click', () => showView('records'));
    document.getElementById('myRecordsTab').addEventListener('click', () => showView('myrecords'));
    
    // 返回按钮
    document.getElementById('backBtn').addEventListener('click', () => showView('signin'));
}

// 初始化定位服务
function initGeolocation() {
    console.log('初始化定位服务（静态版本）');
}

// 获取位置
function getLocation() {
    const locationBox = document.getElementById('locationBox');
    const locationText = document.getElementById('locationText');
    
    locationBox.classList.add('active');
    locationText.innerHTML = '<span class="loading"></span> 正在获取位置...';
    
    // 使用浏览器原生定位
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('定位成功:', position);
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                
                // 使用腾讯地图逆地址解析
                reverseGeocode(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error('定位失败:', error);
                let errorMsg = '位置获取失败';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMsg = '定位权限被拒绝，请在设置中开启';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMsg = '位置信息不可用';
                        break;
                    case error.TIMEOUT:
                        errorMsg = '定位超时，请重试';
                        break;
                }
                locationText.textContent = errorMsg;
                locationBox.classList.remove('active');
                showToast(errorMsg);
                currentLocation = null;
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        locationText.textContent = '您的浏览器不支持定位功能';
        locationBox.classList.remove('active');
        showToast('浏览器不支持定位功能');
    }
}

// 逆地址解析
function reverseGeocode(lat, lng) {
    const locationText = document.getElementById('locationText');
    
    console.log(`执行地址解析: ${lat}, ${lng}`);
    
    const script = document.createElement('script');
    const callbackName = 'geocoder_' + Date.now();
    
    window[callbackName] = function(data) {
        console.log('地址解析响应:', data);
        
        if (data.status === 0 && data.result) {
            let address = data.result.address || '';
            
            // 尝试使用推荐地址
            if (data.result.formatted_addresses && data.result.formatted_addresses.recommend) {
                address = data.result.formatted_addresses.recommend;
            }
            
            currentLocation.address = address;
            locationText.textContent = address;
            locationText.classList.add('located');
            showToast('位置获取成功');
        } else {
            // 地址解析失败，显示坐标
            const coordText = `位置: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            currentLocation.address = coordText;
            locationText.textContent = coordText;
            locationText.classList.add('located');
            showToast('位置获取成功');
        }
        
        document.body.removeChild(script);
        delete window[callbackName];
    };
    
    script.onerror = () => {
        console.error('地址解析失败');
        const coordText = `位置: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        currentLocation.address = coordText;
        locationText.textContent = coordText;
        locationText.classList.add('located');
        showToast('位置获取成功');
        
        document.body.removeChild(script);
        delete window[callbackName];
    };
    
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?` +
        `location=${lat},${lng}` +
        `&key=PK3BZ-RZWEW-3HBRI-YBEZF-R6HJE-DKBIK` +
        `&get_poi=1` +
        `&output=jsonp` +
        `&callback=${callbackName}`;
    
    script.src = url;
    document.body.appendChild(script);
}

// 处理表单提交
function handleSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // 验证必填字段
    if (!name) {
        showToast('请输入姓名');
        return;
    }
    
    if (!phone) {
        showToast('请输入手机号');
        return;
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
        showToast('请输入正确的手机号');
        return;
    }
    
    // 验证位置信息
    if (!currentLocation) {
        showToast('请先获取位置信息');
        return;
    }
    
    // 检查位置时效性（5分钟）
    const now = Date.now();
    const locationTime = currentLocation.timestamp;
    const diffMinutes = (now - locationTime) / (1000 * 60);
    
    if (diffMinutes > 5) {
        showToast('位置信息已过期，请重新获取');
        currentLocation = null;
        document.getElementById('locationText').textContent = '点击获取位置信息';
        document.getElementById('locationText').classList.remove('located');
        return;
    }
    
    // 创建签到记录
    const record = {
        id: Date.now().toString(),
        name: name,
        phone: phone,
        location: currentLocation,
        signInTime: new Date().toISOString()
    };
    
    // 保存签到记录到localStorage
    saveRecord(record);
    
    // 重置表单
    document.getElementById('checkInForm').reset();
    currentLocation = null;
    document.getElementById('locationText').textContent = '点击获取位置信息';
    document.getElementById('locationText').classList.remove('located');
    document.getElementById('locationBox').classList.remove('active');
    
    showToast('签到成功！');
    
    // 延迟后跳转到签到记录
    setTimeout(() => {
        showView('myrecords');
    }, 1500);
}

// 保存签到记录（使用localStorage）
function saveRecord(record) {
    let records = JSON.parse(localStorage.getItem('signInRecords') || '[]');
    
    // 检查是否已经签到过（同一手机号）
    const existingIndex = records.findIndex(r => r.phone === record.phone);
    if (existingIndex !== -1) {
        // 更新现有记录
        records[existingIndex] = record;
    } else {
        // 添加新记录
        records.push(record);
    }
    
    localStorage.setItem('signInRecords', JSON.stringify(records));
    loadRecords();
}

// 加载签到记录
function loadRecords() {
    const records = JSON.parse(localStorage.getItem('signInRecords') || '[]');
    const signedCount = document.getElementById('signedCount');
    const unsignedCount = document.getElementById('unsignedCount');
    
    signedCount.textContent = records.length;
    unsignedCount.textContent = '0'; // 静态版本暂不支持参会人员管理
    
    window.allRecords = records;
}

// 显示签到记录列表
function displayRecords(filterPhone = null) {
    const recordsList = document.getElementById('recordsList');
    const records = JSON.parse(localStorage.getItem('signInRecords') || '[]');
    
    recordsList.innerHTML = '';
    
    // 筛选记录
    const filteredRecords = filterPhone 
        ? records.filter(r => r.phone === filterPhone)
        : records;
    
    // 按时间倒序排列
    filteredRecords.sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime));
    
    if (filteredRecords.length === 0) {
        recordsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">暂无签到记录</div>';
        return;
    }
    
    filteredRecords.forEach(record => {
        const recordItem = document.createElement('div');
        recordItem.className = 'record-item';
        
        const signInDate = new Date(record.signInTime);
        const timeStr = signInDate.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        recordItem.innerHTML = `
            <div class="record-info">
                <div class="record-name">${record.name}</div>
                <div class="record-details">
                    ${record.phone} | ${record.location.address}
                </div>
            </div>
            <div class="record-time">${timeStr}</div>
        `;
        
        recordsList.appendChild(recordItem);
    });
}

// 切换视图
function showView(view) {
    const signInForm = document.getElementById('signInForm');
    const recordsSection = document.getElementById('recordsSection');
    const recordsTab = document.getElementById('recordsTab');
    const myRecordsTab = document.getElementById('myRecordsTab');
    
    currentView = view;
    
    switch(view) {
        case 'signin':
            signInForm.style.display = 'block';
            recordsSection.style.display = 'none';
            recordsTab.classList.add('active');
            myRecordsTab.classList.remove('active');
            break;
            
        case 'records':
            signInForm.style.display = 'none';
            recordsSection.style.display = 'block';
            recordsTab.classList.add('active');
            myRecordsTab.classList.remove('active');
            displayRecords();
            break;
            
        case 'myrecords':
            signInForm.style.display = 'none';
            recordsSection.style.display = 'block';
            recordsTab.classList.remove('active');
            myRecordsTab.classList.add('active');
            displayRecords();
            break;
    }
}

// 显示提示消息
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
} 