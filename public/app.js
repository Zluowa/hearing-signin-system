// 全局变量
let currentLocation = null;
let geolocation = null;
let currentView = 'signin'; // signin, records, myrecords

// 初始化腾讯地图定位服务
function initGeolocation() {
    try {
        // 使用腾讯定位组件的新方式
        if (typeof qq !== 'undefined' && qq.maps && qq.maps.Geolocation) {
            // 旧版API方式
            geolocation = new qq.maps.Geolocation("PK3BZ-RZWEW-3HBRI-YBEZF-R6HJE-DKBIK", "meeting-signin");
            console.log('腾讯地图定位服务初始化成功（旧版）');
        } else if (window.qq && window.qq.maps && window.qq.maps.Geolocation) {
            // 尝试window对象
            geolocation = new window.qq.maps.Geolocation("PK3BZ-RZWEW-3HBRI-YBEZF-R6HJE-DKBIK", "meeting-signin");
            console.log('腾讯地图定位服务初始化成功（window）');
        } else {
            console.warn('腾讯地图定位组件未加载，将使用新版定位接口');
            // 标记使用新版API
            window._useNewGeolocationAPI = true;
        }
    } catch (e) {
        console.error('初始化腾讯地图定位服务失败:', e);
        window._useNewGeolocationAPI = true;
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成，开始初始化...');
    
    // 延迟初始化，确保腾讯地图API加载完成
    setTimeout(() => {
        initGeolocation();
        initEventListeners();
        loadRecords();
        
        // 初始化底部预览区域
        updateRecordsPreview();
    }, 1000);
});

// 初始化事件监听器
function initEventListeners() {
    // 表单提交
    document.getElementById('checkInForm').addEventListener('submit', handleSubmit);
    
    // 获取位置
    document.getElementById('locationBox').addEventListener('click', getLocation);
    
    // 底部标签切换
    document.getElementById('recordsTab').addEventListener('click', () => switchBottomTab('records'));
    document.getElementById('myRecordsTab').addEventListener('click', () => switchBottomTab('myrecords'));
    
    // 查看全部按钮
    document.getElementById('viewAllBtn').addEventListener('click', showAllRecordsPage);
    
    // 全部记录页面的返回按钮
    document.getElementById('backToMainBtn').addEventListener('click', hideAllRecordsPage);
    
    // 视图切换标签
    document.getElementById('cardViewTab').addEventListener('click', () => switchView('card'));
    document.getElementById('tableViewTab').addEventListener('click', () => switchView('table'));
    document.getElementById('printViewTab').addEventListener('click', () => switchView('print'));
}

// 获取当前位置
function getLocation() {
    console.log('开始获取位置...');
    const locationBox = document.getElementById('locationBox');
    const locationText = document.getElementById('locationText');
    
    // 显示加载状态
    locationText.innerHTML = '<span class="loading"></span> 正在获取位置...';
    locationBox.classList.add('active');
    
    // 使用腾讯地图定位
    useTencentGeolocation();
}

// 使用腾讯地图定位
function useTencentGeolocation() {
    const locationBox = document.getElementById('locationBox');
    const locationText = document.getElementById('locationText');
    
    console.log('开始腾讯地图高精度定位流程...');
    
    // 检查是否使用新版API
    if (window._useNewGeolocationAPI) {
        performNewTencentLocation();
    } else if (geolocation) {
        performTencentLocation();
    } else {
        console.warn('腾讯地图定位组件未正确初始化，使用浏览器原生定位');
        useNativeGeolocation();
    }
}

// 执行腾讯地图定位
function performTencentLocation() {
    const locationBox = document.getElementById('locationBox');
    const locationText = document.getElementById('locationText');
    
    console.log('使用腾讯地图高精度定位...');
    
    geolocation.getLocation(
        (position) => {
            console.log('腾讯地图定位成功:', position);
            
            // 使用腾讯地图返回的位置信息
            currentLocation = {
                lat: position.lat,
                lng: position.lng,
                address: position.addr || '',
                city: position.city || '',
                district: position.district || '',
                accuracy: position.accuracy || 0,
                timestamp: new Date().getTime()
            };
            
            // 如果腾讯地图直接返回了地址，使用它
            if (position.addr) {
                currentLocation.address = position.addr;
                locationText.textContent = currentLocation.address;
                locationText.classList.add('located');
                showToast('位置获取成功');
            } else {
                // 如果没有直接返回地址，使用逆地址解析
                reverseGeocode(position.lat, position.lng);
            }
        },
        (error) => {
            console.error('腾讯地图定位失败:', error);
            
            // 解析错误信息
            let errorMsg = '位置获取失败';
            if (error && error.message) {
                errorMsg = error.message;
            }
            
            locationText.textContent = errorMsg;
            locationBox.classList.remove('active');
            
            // 如果是权限问题，提示用户
            if (errorMsg.includes('permission') || errorMsg.includes('权限')) {
                showToast('请允许网页获取您的位置信息');
            } else {
                showToast(errorMsg);
            }
            
            // 降级到浏览器原生定位
            console.log('尝试使用浏览器原生定位作为备用方案...');
            setTimeout(() => {
                useNativeGeolocation();
            }, 1000);
        },
        {
            enableHighAccuracy: true,  // 启用高精度定位
            timeout: 15000,           // 增加超时时间到15秒
            maximumAge: 0,            // 不使用缓存，确保获取实时位置
            failTipFlag: true,        // 显示错误提示
            coordType: 1              // 使用gcj02坐标系
        }
    );
}

// 使用新版腾讯定位组件
function performNewTencentLocation() {
    const locationBox = document.getElementById('locationBox');
    const locationText = document.getElementById('locationText');
    
    console.log('使用新版腾讯定位组件...');
    
    // 创建定位请求
    const geolocation = new qq.maps.Geolocation("PK3BZ-RZWEW-3HBRI-YBEZF-R6HJE-DKBIK", "meeting-signin");
    
    const options = {
        timeout: 15000,
        enableHighAccuracy: true,
        maximumAge: 0
    };
    
    const showPosition = (position) => {
        console.log('新版腾讯定位成功:', position);
        
        currentLocation = {
            lat: position.lat,
            lng: position.lng,
            address: position.addr || '',
            city: position.city || '',
            province: position.province || '',
            district: position.district || '',
            accuracy: position.accuracy || 0,
            timestamp: new Date().getTime()
        };
        
        // 如果有地址信息，直接使用
        if (position.addr) {
            currentLocation.address = position.addr;
            locationText.textContent = currentLocation.address;
            locationText.classList.add('located');
            showToast('位置获取成功');
        } else {
            // 使用逆地址解析
            reverseGeocode(position.lat, position.lng);
        }
    };
    
    const showError = (error) => {
        console.error('新版腾讯定位失败:', error);
        
        // 尝试获取详细错误信息
        let errorMsg = '定位失败';
        if (error) {
            if (error.code === 1) {
                errorMsg = '定位权限被拒绝，请在设置中开启';
            } else if (error.code === 2) {
                errorMsg = '无法获取位置信息';
            } else if (error.code === 3) {
                errorMsg = '定位超时';
            } else if (error.message) {
                errorMsg = error.message;
            }
        }
        
        locationText.textContent = errorMsg;
        locationBox.classList.remove('active');
        showToast(errorMsg);
        
        // 降级到浏览器原生定位
        console.log('降级到浏览器原生定位...');
        setTimeout(() => {
            useNativeGeolocation();
        }, 1000);
    };
    
    geolocation.getLocation(showPosition, showError, options);
}

// 保留原生定位作为备用方案
function useNativeGeolocation() {
    const locationBox = document.getElementById('locationBox');
    const locationText = document.getElementById('locationText');
    
    if (navigator.geolocation) {
        console.log('使用浏览器原生定位作为备用方案...');
        locationText.innerHTML = '<span class="loading"></span> 使用备用定位方案...';
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('浏览器定位成功:', position);
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    address: '已获取位置',
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };
                
                // 使用腾讯地图逆地址解析获取地址
                reverseGeocode(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error('浏览器定位失败:', error);
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
        console.error('浏览器不支持定位功能');
        locationText.textContent = '您的浏览器不支持定位功能';
        locationBox.classList.remove('active');
        showToast('您的浏览器不支持定位功能');
    }
}

// 逆地址解析
function reverseGeocode(lat, lng) {
    console.log(`开始逆地址解析: lat=${lat}, lng=${lng}`);
    
    const locationBox = document.getElementById('locationBox');
    const locationText = document.getElementById('locationText');
    
    // 创建JSONP请求
    const script = document.createElement('script');
    const callbackName = 'geocoderCallback_' + Date.now();
    
    // 设置回调函数
    window[callbackName] = function(data) {
        console.log('逆地址解析响应:', data);
        
        if (data.status === 0 && data.result) {
            console.log('解析成功，result内容:', data.result);
            
            // 优先使用格式化地址
            let address = '';
            if (data.result.formatted_addresses && data.result.formatted_addresses.recommend) {
                address = data.result.formatted_addresses.recommend;
                console.log('使用推荐地址:', address);
            } else if (data.result.address) {
                address = data.result.address;
                console.log('使用标准地址:', address);
            }
            
            // 如果没有地址，尝试其他字段
            if (!address && data.result.formatted_addresses) {
                address = data.result.formatted_addresses.rough || '';
                console.log('使用粗略地址:', address);
            }
            
            // 如果还是没有地址，使用行政区划拼接
            if (!address && data.result.address_component) {
                const comp = data.result.address_component;
                address = `${comp.province}${comp.city}${comp.district}${comp.street || ''}`;
                console.log('使用拼接地址:', address);
            }
            
            // 如果有参考地标，添加到地址中
            if (data.result.address_reference) {
                const ref = data.result.address_reference;
                if (ref.landmark_l1 && ref.landmark_l1.title) {
                    address = address ? `${ref.landmark_l1.title}附近 (${address})` : ref.landmark_l1.title;
                } else if (ref.landmark_l2 && ref.landmark_l2.title) {
                    address = address ? `${ref.landmark_l2.title}附近 (${address})` : ref.landmark_l2.title;
                }
            }
            
            currentLocation.address = address || '位置已获取';
            currentLocation.addressDetail = data.result;
            locationText.textContent = currentLocation.address;
            locationText.classList.add('located');
            showToast('位置获取成功');
            console.log('最终显示地址:', currentLocation.address);
        } else {
            console.error('逆地址解析失败:', data);
            locationText.textContent = `已定位 (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
            locationText.classList.add('located');
        }
        
        // 清理脚本标签
        document.body.removeChild(script);
        delete window[callbackName];
    };
    
    // 构建请求URL - 使用WebService API
    const url = `https://apis.map.qq.com/ws/geocoder/v1/?` +
        `location=${lat},${lng}` +
        `&key=PK3BZ-RZWEW-3HBRI-YBEZF-R6HJE-DKBIK` +
        `&get_poi=1` +
        `&poi_options=policy=5` +
        `&output=jsonp` +
        `&callback=${callbackName}`;
    
    script.src = url;
    script.onerror = function() {
        console.error('逆地址解析请求失败 - 可能是网络问题或API Key问题');
        locationText.textContent = `已定位 (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
        locationText.classList.add('located');
        document.body.removeChild(script);
        delete window[callbackName];
    };
    
    // 设置超时处理
    const timeout = setTimeout(() => {
        console.error('逆地址解析超时');
        if (window[callbackName]) {
            locationText.textContent = `已定位 (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
            locationText.classList.add('located');
            delete window[callbackName];
            if (script.parentNode) {
                document.body.removeChild(script);
            }
        }
    }, 5000);
    
    // 修改回调函数以清除超时
    const originalCallback = window[callbackName];
    window[callbackName] = function(data) {
        clearTimeout(timeout);
        originalCallback(data);
    };
    
    document.body.appendChild(script);
    console.log('发送逆地址解析请求:', url);
}

// 处理表单提交
async function handleSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    // 验证表单
    if (!name) {
        showToast('请输入姓名');
        return;
    }
    
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        showToast('请输入正确的手机号');
        return;
    }
    
    if (!currentLocation) {
        showToast('请先获取位置信息');
        return;
    }
    
    // 检查位置是否过期（5分钟内有效）
    const locationAge = Date.now() - currentLocation.timestamp;
    if (locationAge > 5 * 60 * 1000) {
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
    
    // 保存签到记录
    const saveSuccess = await saveRecord(record);
    
    if (saveSuccess) {
        // 保存用户手机号用于"我的记录"功能
        saveUserPhone(phone);
        
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
}

// 保存签到记录到服务器
async function saveRecord(record) {
    try {
        const response = await fetch('/api/records', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(record)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('签到记录保存成功:', result.message);
            await loadRecords(); // 重新加载记录
            return true;
        } else {
            console.error('签到记录保存失败:', result.message);
            showToast('签到失败: ' + result.message);
            return false;
        }
    } catch (error) {
        console.error('网络错误:', error);
        // 降级到本地存储
        console.log('网络不可用，使用本地存储...');
        saveRecordLocally(record);
        return true;
    }
}

// 本地存储备用方案
function saveRecordLocally(record) {
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
    
    // 更新全局记录并刷新界面
    window.allRecords = records;
    updateRecordCounts(records);
    refreshBottomPreview();
}

// 从服务器加载签到记录
async function loadRecords() {
    try {
        const response = await fetch('/api/records');
        const result = await response.json();
        
        if (result.success) {
            const records = result.data;
            
            // 将记录存储到全局变量供其他函数使用
            window.allRecords = records;
            
            // 更新记录总数显示
            updateRecordCounts(records);
            
            // 刷新底部预览区域
            refreshBottomPreview();
            
        } else {
            console.error('加载签到记录失败:', result.message);
            loadRecordsLocally(); // 降级到本地存储
        }
    } catch (error) {
        console.error('网络错误:', error);
        loadRecordsLocally(); // 降级到本地存储
    }
}

// 更新记录计数显示
function updateRecordCounts(records) {
    // 更新各种计数显示
    const elements = [
        'signedCount',
        'totalRecordsCount',
        'allRecordsCount'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = records.length;
        }
    });
    
    // 这里可以添加预设的参会人员名单来计算未签到人数
    const unsignedElement = document.getElementById('unsignedCount');
    if (unsignedElement) {
        unsignedElement.textContent = '0';
    }
}

// 刷新底部预览区域
function refreshBottomPreview() {
    const recordsTab = document.getElementById('recordsTab');
    const myRecordsTab = document.getElementById('myRecordsTab');
    
    // 根据当前激活的标签刷新对应的预览
    if (recordsTab && recordsTab.classList.contains('active')) {
        updateRecordsPreview();
    } else if (myRecordsTab && myRecordsTab.classList.contains('active')) {
        updateMyRecordsPreview();
    }
}

// 本地加载备用方案
function loadRecordsLocally() {
    const records = JSON.parse(localStorage.getItem('signInRecords') || '[]');
    
    // 将记录存储到全局变量
    window.allRecords = records;
    
    // 更新记录总数显示
    updateRecordCounts(records);
    
    // 刷新底部预览区域
    refreshBottomPreview();
}

// 显示签到记录列表
async function displayRecords(filterPhone = null) {
    const recordsList = document.getElementById('recordsList');
    
    // 如果全局记录不存在，先加载
    if (!window.allRecords) {
        await loadRecords();
    }
    
    const records = window.allRecords || [];
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
            // 这里应该根据当前用户的手机号筛选，暂时显示所有
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

// 防止页面被缓存
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
        registration.unregister();
    });
}

// 添加参会人员管理功能
let participants = [];

// 加载参会人员名单
function loadParticipants() {
    const saved = localStorage.getItem('participants');
    if (saved) {
        participants = JSON.parse(saved);
        updateUnsignedCount();
    }
}

// 更新未签到人数
function updateUnsignedCount() {
    const records = JSON.parse(localStorage.getItem('signInRecords') || '[]');
    const signedPhones = records.map(r => r.phone);
    const unsignedCount = participants.filter(p => !signedPhones.includes(p.phone)).length;
    document.getElementById('unsignedCount').textContent = unsignedCount;
}

// 初始化时加载参会人员和签到记录
document.addEventListener('DOMContentLoaded', async function() {
    loadParticipants();
    await loadRecords(); // 加载服务器端的签到记录
});

// 获取URL参数（用于扫码签到）
function getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

// 检查是否通过扫码进入
const meetingId = getUrlParam('meeting');
if (meetingId) {
    // 可以根据听证会ID加载特定的听证会信息
    console.log('通过扫码进入，听证会ID:', meetingId);
}

// 新增功能函数

// 切换底部标签
function switchBottomTab(tab) {
    const recordsTab = document.getElementById('recordsTab');
    const myRecordsTab = document.getElementById('myRecordsTab');
    const recordsPreview = document.getElementById('recordsPreview');
    
    // 更新标签状态
    if (tab === 'records') {
        recordsTab.classList.add('active');
        myRecordsTab.classList.remove('active');
        updateRecordsPreview();
    } else if (tab === 'myrecords') {
        recordsTab.classList.remove('active');
        myRecordsTab.classList.add('active');
        updateMyRecordsPreview();
    }
}

// 更新记录预览
function updateRecordsPreview() {
    const recordsPreview = document.getElementById('recordsPreview');
    const records = window.allRecords || [];
    
    if (records.length === 0) {
        recordsPreview.innerHTML = `
            <div class="record-item">
                <div class="record-content">
                    <span class="record-text" style="color: #999;">暂无签到记录</span>
                </div>
            </div>
        `;
        return;
    }
    
    // 按时间倒序排列，只显示最近的2条
    const sortedRecords = records.sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime));
    const recentRecords = sortedRecords.slice(0, 2);
    
    let html = '';
    recentRecords.forEach(record => {
        const timeStr = formatTime(record.signInTime);
        html += `
            <div class="record-item">
                <div class="record-content">
                    <span class="record-bullet">•</span>
                    <span class="record-time">${timeStr}</span>
                    <span class="record-text">${record.name}完成了会议签到</span>
                </div>
            </div>
        `;
    });
    
    recordsPreview.innerHTML = html;
}

// 更新我的记录预览
function updateMyRecordsPreview() {
    const recordsPreview = document.getElementById('recordsPreview');
    const userPhone = localStorage.getItem('userPhone');
    const records = window.allRecords || [];
    
    if (!userPhone) {
        recordsPreview.innerHTML = `
            <div class="record-item">
                <div class="record-content">
                    <span class="record-text" style="color: #999;">请先完成签到</span>
                </div>
            </div>
        `;
        return;
    }
    
    // 筛选当前用户的记录
    const myRecords = records.filter(record => record.phone === userPhone);
    
    if (myRecords.length === 0) {
        recordsPreview.innerHTML = `
            <div class="record-item">
                <div class="record-content">
                    <span class="record-text" style="color: #999;">暂无签到记录</span>
                </div>
            </div>
        `;
        return;
    }
    
    // 按时间倒序排列，只显示最近的2条
    const sortedMyRecords = myRecords.sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime));
    const recentMyRecords = sortedMyRecords.slice(0, 2);
    
    let html = '';
    recentMyRecords.forEach(record => {
        const timeStr = formatTime(record.signInTime);
        html += `
            <div class="record-item">
                <div class="record-content">
                    <span class="record-bullet">•</span>
                    <span class="record-time">${timeStr}</span>
                    <span class="record-text">您完成了会议签到</span>
                </div>
            </div>
        `;
    });
    
    recordsPreview.innerHTML = html;
}

// 显示全部记录页面
function showAllRecordsPage() {
    const allRecordsPage = document.getElementById('allRecordsPage');
    allRecordsPage.style.display = 'block';
    
    // 加载实际数据
    loadAllRecordsData();
}

// 隐藏全部记录页面
function hideAllRecordsPage() {
    const allRecordsPage = document.getElementById('allRecordsPage');
    allRecordsPage.style.display = 'none';
}

// 切换视图
function switchView(viewType) {
    // 更新标签状态
    document.querySelectorAll('.view-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(viewType + 'ViewTab').classList.add('active');
    
    // 显示对应视图
    const cardView = document.getElementById('cardView');
    const tableView = document.getElementById('tableView');
    const printView = document.getElementById('printView');
    
    cardView.style.display = viewType === 'card' ? 'block' : 'none';
    tableView.style.display = viewType === 'table' ? 'block' : 'none';
    printView.style.display = viewType === 'print' ? 'block' : 'none';
}

// 加载全部记录数据
async function loadAllRecordsData() {
    try {
        // 使用现有的全局记录数据
        const records = window.allRecords || [];
        
        // 如果没有数据，先加载
        if (records.length === 0) {
            await loadRecords();
        }
        
        updateAllViewsData(window.allRecords || []);
        
    } catch (error) {
        console.error('加载记录数据失败:', error);
        showToast('加载数据失败');
    }
}

// 更新所有视图的数据
function updateAllViewsData(records) {
    // 更新记录总数
    document.getElementById('allRecordsCount').textContent = records.length;
    document.getElementById('totalRecordsCount').textContent = records.length;
    
    // 更新卡片视图
    updateCardView(records);
    
    // 更新表格视图
    updateTableView(records);
    
    // 更新打印视图
    updatePrintView(records);
}

// 更新卡片视图
function updateCardView(records) {
    const cardView = document.getElementById('cardView');
    
    if (records.length === 0) {
        cardView.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
                <div>暂无签到记录</div>
            </div>
        `;
        return;
    }
    
    // 按时间倒序排列
    const sortedRecords = records.sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime));
    
    let html = '';
    sortedRecords.forEach(record => {
        const timeStr = formatTime(record.signInTime);
        const location = record.location ? (record.location.address || record.location) : '未知位置';
        
        html += `
            <div class="record-card" onclick="showRecordDetail('${record.id}')">
                <div class="card-time">${timeStr}</div>
                <div class="card-content">
                    <div class="main-text">${record.name}完成了会议签到</div>
                    <div class="card-detail">手机号：${record.phone} | 位置：${location}</div>
                </div>
                <div class="card-arrow">></div>
            </div>
        `;
    });
    
    html += '<div class="no-more">没有更多了</div>';
    cardView.innerHTML = html;
}

// 更新表格视图
function updateTableView(records) {
    const tableBody = document.querySelector('.records-table tbody');
    
    if (records.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #999;">
                    暂无签到记录
                </td>
            </tr>
        `;
        return;
    }
    
    // 存储当前数据以供排序和导出使用
    window.currentTableRecords = records;
    
    // 按时间倒序排列
    const sortedRecords = records.sort((a, b) => new Date(b.signInTime) - new Date(a.signInTime));
    
    let html = '';
    sortedRecords.forEach(record => {
        const signInDate = new Date(record.signInTime);
        const dateStr = signInDate.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '-');
        const timeStr = signInDate.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const location = record.location ? 
            (record.location.address || record.location.name || '已定位') : 
            '未定位';
        
        html += `
            <tr onclick="showRecordDetail('${record.id}')">
                <td>
                    <div>${dateStr}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 2px;">${timeStr}</div>
                </td>
                <td>${record.name}</td>
                <td>${record.name}</td>
                <td>${record.phone}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
}

// 更新打印视图
function updatePrintView(records) {
    const printTableBody = document.querySelector('.print-table tbody');
    const printTitle = document.querySelector('.print-title');
    
    printTitle.textContent = `不良贷款听证会签到（共${records.length}条）`;
    
    // 生成打印视图的QR码
    generatePrintQRCode();
    
    if (records.length === 0) {
        printTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #999;">
                    暂无签到记录
                </td>
            </tr>
        `;
        return;
    }
    
    // 按时间正序排列（打印视图按签到顺序）
    const sortedRecords = records.sort((a, b) => new Date(a.signInTime) - new Date(b.signInTime));
    
    let html = '';
    sortedRecords.forEach((record, index) => {
        const location = record.location ? 
            (record.location.address || record.location.name || '已定位') : 
            '未定位';
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${record.name}</td>
                <td>${record.phone}</td>
                <td>${location.length > 20 ? location.substring(0, 20) + '...' : location}</td>
                <td style="width: 80px; height: 30px; border: 1px solid #ddd;"></td>
            </tr>
        `;
    });
    
    printTableBody.innerHTML = html;
    
    // 更新页脚信息
    const footerText = document.querySelector('.footer-text');
    if (footerText) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-CN');
        footerText.textContent = `不良贷款听证会签到 数据截止 ${dateStr} 第 1 页`;
    }
}

// 生成打印视图的QR码
function generatePrintQRCode() {
    const canvas = document.getElementById('printQRCode');
    if (!canvas || !window.QRCode) return;
    
    const url = window.location.origin + window.location.pathname;
    
    QRCode.toCanvas(canvas, url, {
        width: 60,
        height: 60,
        margin: 1,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    }, function (error) {
        if (error) {
            console.error('QR码生成失败:', error);
            // 如果生成失败，显示占位符
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 60, 60);
            ctx.fillStyle = '#999';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('二维码', 30, 35);
        }
    });
}

// 格式化时间显示
function formatTime(timeStr) {
    const now = new Date();
    const time = new Date(timeStr);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const recordDate = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    
    if (recordDate.getTime() === today.getTime()) {
        return `今天 ${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
    } else {
        return `${time.getMonth() + 1}月${time.getDate()}日 ${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}`;
    }
}

// 显示记录详情（暂时用toast显示，后续可以扩展为详情页面）
function showRecordDetail(recordId) {
    const records = window.allRecords || [];
    const record = records.find(r => r.id === recordId);
    
    if (!record) {
        showToast('记录不存在');
        return;
    }
    
    const signInDate = new Date(record.signInTime);
    const timeStr = signInDate.toLocaleString('zh-CN');
    const location = record.location ? (record.location.address || '未知位置') : '未知位置';
    
    const detail = `
姓名：${record.name}
手机号：${record.phone}
签到时间：${timeStr}
签到位置：${location}
    `.trim();
    
    // 暂时用alert显示详情，后续可以改为模态框
    alert(detail);
}

// 签到成功后保存用户手机号，用于"我的记录"功能
function saveUserPhone(phone) {
    localStorage.setItem('userPhone', phone);
}

// 导出功能
function exportData() {
    const currentView = document.querySelector('.view-tab.active').id;
    
    if (currentView === 'printViewTab') {
        exportToPDF();
    } else {
        exportToExcel();
    }
}

// 导出为Excel
function exportToExcel() {
    const records = window.currentTableRecords || window.allRecords || [];
    
    if (records.length === 0) {
        showToast('暂无数据可导出');
        return;
    }
    
    // 准备数据
    const data = [
        ['序号', '姓名', '手机号', '签到时间', '位置信息']
    ];
    
    records.forEach((record, index) => {
        const signInDate = new Date(record.signInTime);
        const timeStr = signInDate.toLocaleString('zh-CN');
        const location = record.location ? 
            (record.location.address || record.location.name || '已定位') : 
            '未定位';
        
        data.push([
            index + 1,
            record.name,
            record.phone,
            timeStr,
            location
        ]);
    });
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 设置列宽
    ws['!cols'] = [
        { width: 8 },   // 序号
        { width: 12 },  // 姓名
        { width: 15 },  // 手机号
        { width: 20 },  // 签到时间
        { width: 30 }   // 位置信息
    ];
    
    // 添加工作表
    XLSX.utils.book_append_sheet(wb, ws, '会议签到');
    
    // 生成文件名
    const now = new Date();
    const fileName = `不良贷款听证会签到_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.xlsx`;
    
    // 下载文件
    XLSX.writeFile(wb, fileName);
    showToast('Excel文件导出成功');
}

// 导出为PDF - New version using jsPDF and jsPDF-AutoTable
function exportToPDF() {
    const records = window.allRecords || [];

    if (records.length === 0) {
        showToast('暂无数据可导出为PDF');
        return;
    }

    showToast('正在生成PDF，请稍候...');

    try {
        const { jsPDF } = window.jspdf;
        // Check if autoTable plugin is available
        if (typeof jsPDF.API.autoTable !== 'function') {
            showToast('PDF导出功能初始化失败 (AutoTable missing)。请刷新页面或联系管理员。');
            console.error('jsPDF-AutoTable plugin is not loaded.');
            return;
        }
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // --- Document Setup ---
        // It's good practice to ensure a font that supports Chinese characters is active.
        // jsPDF's built-in fonts (Helvetica, Times) might not have full CJK support.
        // For this example, we'll try a common approach, but production might need font embedding.
        // pdf.setFont('SimSun'); // Example: Try to set a known CJK font if available in environment or jsPDF build
        // If no specific CJK font is set, default fonts will be used. Characters might be missing.
        // For this exercise, we'll assume basic font support and focus on structure.

        const docTitle = "不良贷款听证会 - 签到记录";
        const genDate = "生成日期: " + new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
        const pageMargin = 14; // mm

        // --- Table Data Preparation ---
        const head = [['序号', '姓名', '手机号', '签到时间', '位置信息', '签名']];
        const body = records.sort((a, b) => new Date(a.signInTime) - new Date(b.signInTime)) // Sort by sign-in time
                          .map((record, index) => [
            index + 1,
            record.name || '',
            record.phone || '',
            record.signInTime ? new Date(record.signInTime).toLocaleString('zh-CN', { hour12: false }) : '',
            record.location && record.location.address ? record.location.address : (record.location ? '已定位,无详细地址' : '无位置信息'),
            '' // Empty for signature column
        ]);

        // --- PDF Generation using autoTable ---
        pdf.autoTable({
            startY: pageMargin + 15, // Start table below header
            head: head,
            body: body,
            theme: 'striped', // 'striped', 'grid', 'plain'
            styles: {
                fontSize: 9,
                cellPadding: 1.5,
                overflow: 'linebreak', // Handle text overflow by line breaking
                // font: 'SimSun' // Try to apply CJK font to table
            },
            headStyles: {
                fillColor: [41, 128, 185], // A nice blue
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 10,
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' }, // 序号
                1: { cellWidth: 25 }, // 姓名
                2: { cellWidth: 30, halign: 'left' }, // 手机号
                3: { cellWidth: 35, halign: 'left' }, // 签到时间
                4: { cellWidth: 'auto' }, // 位置信息 (let it take remaining space and wrap)
                5: { cellWidth: 20, cellPadding: 5 }  // 签名 (larger padding for manual signature later)
            },
            margin: { top: pageMargin + 15, right: pageMargin, bottom: pageMargin + 10, left: pageMargin },
            didDrawPage: function (data) {
                // --- Page Header ---
                pdf.setFontSize(16);
                pdf.setTextColor(40);
                pdf.setFont(undefined, 'bold');
                pdf.text(docTitle, pageMargin, pageMargin);

                pdf.setFontSize(10);
                pdf.setTextColor(80);
                pdf.setFont(undefined, 'normal');
                pdf.text(genDate, pageMargin, pageMargin + 7);

                // --- Page Footer ---
                const pageCount = pdf.internal.getNumberOfPages();
                pdf.setFontSize(8);
                pdf.setTextColor(100);
                const footerText = `第 ${data.pageNumber} 页 / 共 ${pageCount} 页`;
                // Calculate x position for right alignment
                const footerTextWidth = pdf.getStringUnitWidth(footerText) * pdf.internal.getFontSize() / pdf.internal.scaleFactor;
                const xPosFooter = pdf.internal.pageSize.width - pageMargin - footerTextWidth;
                pdf.text(footerText, xPosFooter, pdf.internal.pageSize.height - (pageMargin / 2) - 2);

                 // Add QR Code to footer of each page (optional)
                const canvas = document.getElementById('printQRCode'); // Assuming this canvas is still updated by generatePrintQRCode()
                if (canvas && canvas.toDataURL && canvas.width > 0 && canvas.height > 0) {
                    try {
                        const qrImgData = canvas.toDataURL('image/png');
                        if (qrImgData.length > 'data:image/png;base64,'.length) { // Basic check for valid data URL
                             pdf.addImage(qrImgData, 'PNG', pageMargin, pdf.internal.pageSize.height - (pageMargin / 2) - 7, 10, 10);
                        }
                    } catch (e) {
                        console.warn("Could not add QR code to PDF page footer:", e);
                    }
                }
            },
            // Setting table width to be 100% of page width minus margins
            tableWidth: 'auto', // 'auto' or a specific number or 'wrap'
        });

        // --- Filename and Save ---
        const now = new Date();
        const fileName = `不良贷款听证会签到_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}.pdf`;
        
        pdf.save(fileName);
        showToast('PDF文件导出成功');

    } catch (error) {
        console.error('PDF导出失败:', error);
        showToast('PDF导出失败: ' + error.message);
    }
}

// 表格排序功能
function sortTable(column) {
    const records = window.currentTableRecords || [];
    
    if (records.length === 0) return;
    
    // 获取当前排序状态
    const currentSortColumn = window.currentSortColumn || '';
    const currentSortOrder = window.currentSortOrder || 'desc';
    
    // 确定新的排序顺序
    let newSortOrder = 'desc';
    if (currentSortColumn === column && currentSortOrder === 'desc') {
        newSortOrder = 'asc';
    }
    
    // 排序数据
    const sortedRecords = [...records].sort((a, b) => {
        let valueA, valueB;
        
        switch (column) {
            case 'time':
                valueA = new Date(a.signInTime);
                valueB = new Date(b.signInTime);
                break;
            case 'submitter':
            case 'name':
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                break;
            default:
                return 0;
        }
        
        if (newSortOrder === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });
    
    // 保存排序状态
    window.currentSortColumn = column;
    window.currentSortOrder = newSortOrder;
    
    // 更新表格显示
    updateTableView(sortedRecords);
    
    // 更新表头显示
    updateTableHeaders(column, newSortOrder);
}

// 更新表头排序图标
function updateTableHeaders(sortColumn, sortOrder) {
    const headers = document.querySelectorAll('.records-table th.sortable');
    
    headers.forEach(header => {
        const column = header.dataset.sort;
        let text = header.textContent.replace(' 🔽', '').replace(' 🔼', '');
        
        if (column === sortColumn) {
            text += sortOrder === 'desc' ? ' 🔽' : ' 🔼';
        } else {
            text += ' 🔽';
        }
        
        header.textContent = text;
    });
}

// 初始化导出和排序事件监听
document.addEventListener('DOMContentLoaded', function() {
    // 导出按钮事件
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }
    
    // 表格排序事件
    const sortableHeaders = document.querySelectorAll('.records-table th.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            sortTable(column);
        });
    });
});