// DOM元素
const chatInput = document.getElementById('chat-input');
const sendChatBtn = document.getElementById('send-chat');
const chatContainer = document.getElementById('chat-container');
const loadingModal = document.getElementById('loading-modal');
const themeToggle = document.getElementById('theme-toggle');
const fullscreenGraphContainer = document.getElementById('fullscreen-graph-container');
const fullscreenGraphContent = document.getElementById('fullscreen-graph-content');
const exitFullscreenBtn = document.getElementById('exit-fullscreen');
const nodeInfoPanel = document.getElementById('node-info-panel');
const nodeInfoContent = document.getElementById('node-info-content');

// G6 实例
let fullscreenGraph = null;
let currentGraphData = null;
let nodeDetails = {}; // 存储节点详细信息

// 显示加载状态
function showLoading() {
    loadingModal.classList.remove('hidden');
}

// 隐藏加载状态
function hideLoading() {
    loadingModal.classList.remove('hidden');
    setTimeout(() => {
        loadingModal.classList.add('hidden');
    }, 300);
}

// 创建全屏知识图谱
function createFullscreenGraph(data) {
    // 销毁已存在的图谱
    if (fullscreenGraph) {
        fullscreenGraph.destroy();
    }

    // 创建G6实例
    fullscreenGraph = new G6.Graph({
        container: fullscreenGraphContent,
        width: window.innerWidth,
        height: window.innerHeight,
        modes: {
            default: ['drag-canvas', 'zoom-canvas', 'drag-node', 'click-select'],
        },

        defaultNode: {
            size: 60,
            anchorPoints: [[0, 0.5], [1, 0.5]],
            style: {
                fill: '#C6E5FF',
                stroke: '#5B8FF9',
                lineWidth: 2,
            },
            labelCfg: {
                style: {
                    fill: '#000',
                    fontSize: 14,
                },
                position: 'bottom',
            },
        },
        defaultEdge: {
            style: {
                stroke: '#e2e2e2',
                lineWidth: 2,
                endArrow: true,
            },
            labelCfg: {
                autoRotate: true,
                style: {
                    fontSize: 12,
                }
            }
        },
        layout: {
            type: 'dagre',
            rankdir: 'LR', // 布局方向
            nodesep: 50,   // 节点间距
            ranksep: 80    // 层间距
        },
    });

    // 加载数据
    fullscreenGraph.data(data);
    fullscreenGraph.render();

    // 节点点击事件
    fullscreenGraph.on('node:click', (e) => {
        const nodeId = e.item.get('model').id;
        showNodeInfo(nodeId);

        // 高亮选中节点
        fullscreenGraph.getNodes().forEach(node => {
            const model = node.get('model');
            if (model.id === nodeId) {
                fullscreenGraph.updateItem(node, {
                    style: {
                        stroke: '#FF4D4F',
                        lineWidth: 3,
                        fill: '#FFF2F3'
                    }
                });
            } else {
                fullscreenGraph.updateItem(node, {
                    style: {
                        stroke: '#5B8FF9',
                        lineWidth: 2,
                        fill: '#C6E5FF'
                    }
                });
            }
        });
    });

    // 空白处点击事件 - 隐藏节点信息面板
    fullscreenGraph.on('canvas:click', () => {
        hideNodeInfo();

        // 恢复所有节点样式
        fullscreenGraph.getNodes().forEach(node => {
            fullscreenGraph.updateItem(node, {
                style: {
                    stroke: '#5B8FF9',
                    lineWidth: 2,
                    fill: '#C6E5FF'
                }
            });
        });
    });
    fullscreenGraph.changeSize(
        fullscreenGraphContent.clientWidth,
        fullscreenGraphContent.clientHeight
    );
    // 监听窗口大小变化，重绘图谱
    window.addEventListener('resize', () => {
        if (fullscreenGraph) {
            fullscreenGraph.changeSize(
                fullscreenGraphContent.clientWidth,
                fullscreenGraphContent.clientHeight
            );
        }
    });

    return fullscreenGraph;
}

// 显示节点信息
function showNodeInfo(nodeId) {
    const info = nodeDetails[nodeId] || { name: "未知节点", description: "暂无详细信息" };

    let infoHtml = `
        <div class="border-b border-gray-100 pb-3 mb-3">
            <h5 class="text-lg font-semibold">${info.name}</h5>
            ${info.id ? `<p class="text-sm text-gray-500">ID: ${info.id}</p>` : ''}
        </div>
    `;

    if (info.description) {
        infoHtml += `
            <div class="mb-3">
                <p class="text-sm font-medium text-gray-700">描述:</p>
                <p class="text-sm">${info.description}</p>
            </div>
        `;
    }

    if (info.type) {
        infoHtml += `
            <div class="mb-3">
                <p class="text-sm font-medium text-gray-700">类型:</p>
                <p class="text-sm">${info.type}</p>
            </div>
        `;
    }

    if (info.established) {
        infoHtml += `
            <div class="mb-3">
                <p class="text-sm font-medium text-gray-700">成立时间:</p>
                <p class="text-sm">${info.established}</p>
            </div>
        `;
    }

    if (info.website) {
        infoHtml += `
            <div class="mb-3">
                <p class="text-sm font-medium text-gray-700">网站:</p>
                <p class="text-sm"><a href="${info.website}" target="_blank" class="text-primary hover:underline">${info.website}</a></p>
            </div>
        `;
    }

    nodeInfoContent.innerHTML = infoHtml;
    nodeInfoPanel.classList.add('show');
}

// 隐藏节点信息
function hideNodeInfo() {
    nodeInfoPanel.classList.remove('show');
}

// 显示全屏知识图谱
function showFullscreenKnowledgeGraph(data, details) {
    currentGraphData = data;
    nodeDetails = details || {};
    createFullscreenGraph(data);
    fullscreenGraphContainer.classList.remove('hidden');
    hideNodeInfo(); // 确保初始状态下信息面板是隐藏的
}


// 发送聊天消息
async function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // 添加用户消息到聊天窗口
    chatContainer.innerHTML += `
        <div class="flex items-start justify-end">
            <div class="mr-2 mt-1 text-gray-500">
                <i class="fa fa-user"></i>
            </div>
            <div class="bg-primary/10 p-3 rounded-lg rounded-tr-none max-w-[80%]">
                <p>${message}</p>
            </div>
        </div>
    `;

    // 清空输入框
    chatInput.value = '';

    // 滚动到底部
    chatContainer.scrollTop = chatContainer.scrollHeight;

    showLoading();

    try {
        // 检查是否需要显示知识图谱
        const shouldShowGraph = false
        let responseText = "";
        let graphData = null;
        let nodeDetails = null;

        if (shouldShowGraph) {
            // 生成示例图谱数据
            const result = generateSampleGraphData();
            graphData = result.graphData;
            nodeDetails = result.nodeDetails;
            responseText = "根据您的请求，我为您生成了一个示例知识图谱。点击下方查看：";
        } else {
            // 调用后端API获取回复
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_query: message })
            });

            const data = await response.json();

            if (data.error) {
                alert(data.error);
                return;
            }
            responseText = "根据您的请求，我为您生成了一个示例知识图谱。点击下方查看：";
            graphData = JSON.parse(data.response);

        }

        // 添加AI回复到聊天窗口
        let graphButton = "";
        graphButton = `
            <div class="mt-3">
                <button class="show-graph-btn bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm">
                    <i class="fa fa-sitemap mr-1"></i>查看知识图谱
                </button>
            </div>
        `;

        chatContainer.innerHTML += `
            <div class="flex items-start">
                <div class="bg-secondary/10 p-3 rounded-lg rounded-tl-none max-w-[80%]">
                    <p>${responseText}</p>
                    ${graphButton}
                </div>
                <div class="ml-2 mt-1 text-secondary">
                    <i class="fa fa-robot"></i>
                </div>
            </div>
        `;

        // 添加按钮点击事件
        setTimeout(() => {
            const graphBtn = document.querySelector('.show-graph-btn');
            if (graphBtn) {
                graphBtn.addEventListener('click', () => {
                    // 直接全屏展示图谱
                    showFullscreenKnowledgeGraph(graphData, nodeDetails);
                });
            }
        }, 100);

    } catch (error) {
        console.error('发送消息失败:', error);
        chatContainer.innerHTML += `
            <div class="flex items-start">
                <div class="bg-red-100 p-3 rounded-lg rounded-tl-none max-w-[80%]">
                    <p>发送消息失败，请重试</p>
                </div>
                <div class="ml-2 mt-1 text-red-500">
                    <i class="fa fa-exclamation-circle"></i>
                </div>
            </div>
        `;
    } finally {
        hideLoading();
        // 滚动到底部
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// 事件监听
sendChatBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

// 退出全屏
exitFullscreenBtn.addEventListener('click', () => {
    fullscreenGraphContainer.classList.add('hidden');
    if (fullscreenGraph) {
        fullscreenGraph.destroy();
        fullscreenGraph = null;
    }
});

// 主题切换
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('bg-gray-900');
    document.body.classList.toggle('bg-gray-50');

    const header = document.querySelector('header');
    header.classList.toggle('bg-dark');
    header.classList.toggle('bg-white');
    header.classList.toggle('border-gray-700');
    header.classList.toggle('border-gray-200');

    const chatBox = document.querySelector('section');
    chatBox.classList.toggle('bg-gray-800');
    chatBox.classList.toggle('bg-white');

    const title = document.querySelector('h1');
    title.classList.toggle('text-white');
    title.classList.toggle('text-dark');

    const icon = themeToggle.querySelector('i');
    if (icon.classList.contains('fa-moon-o')) {
        icon.classList.replace('fa-moon-o', 'fa-sun-o');
        icon.classList.add('text-yellow-400');
        icon.classList.remove('text-gray-600');
    } else {
        icon.classList.replace('fa-sun-o', 'fa-moon-o');
        icon.classList.remove('text-yellow-400');
        icon.classList.add('text-gray-600');
    }
});