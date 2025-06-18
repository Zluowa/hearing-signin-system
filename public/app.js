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
    }, 1000);
});

// 初始化事件监听器
function initEventListeners() {
    // 表单提交
    document.getElementById('checkInForm').addEventListener('submit', handleSubmit);
    
    // 获取位置
    document.getElementById('locationBox').addEventListener('click', getLocation);
    
    // 底部标签切换
    document.getElementById('recordsTab').addEventListener('click', () => showView('records'));
    document.getElementById('myRecordsTab').addEventListener('click', () => showView('myrecords'));
    
    // 返回按钮
    document.getElementById('backBtn').addEventListener('click', () => showView('signin'));
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
    loadRecords(); // 更新显示
}

// 从服务器加载签到记录
async function loadRecords() {
    try {
        const response = await fetch('/api/records');
        const result = await response.json();
        
        if (result.success) {
            const records = result.data;
            const signedCount = document.getElementById('signedCount');
            const unsignedCount = document.getElementById('unsignedCount');
            
            signedCount.textContent = records.length;
            
            // 这里可以添加预设的参会人员名单来计算未签到人数
            // 暂时设置为0
            unsignedCount.textContent = '0';
            
            // 将记录存储到全局变量供其他函数使用
            window.allRecords = records;
        } else {
            console.error('加载签到记录失败:', result.message);
            loadRecordsLocally(); // 降级到本地存储
        }
    } catch (error) {
        console.error('网络错误:', error);
        loadRecordsLocally(); // 降级到本地存储
    }
}

// 本地加载备用方案
function loadRecordsLocally() {
    const records = JSON.parse(localStorage.getItem('signInRecords') || '[]');
    const signedCount = document.getElementById('signedCount');
    const unsignedCount = document.getElementById('unsignedCount');
    
    signedCount.textContent = records.length;
    unsignedCount.textContent = '0';
    window.allRecords = records;
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