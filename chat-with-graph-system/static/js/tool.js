// ==================== 配置管理模块 ====================
const Config = {
  COLORS: {
    PRIMARY_DARK_BLUE: '#0A2463',
    SECONDARY_CHARCOAL: '#2C3E50',
    ACCENT_TECH_BLUE: '#21E6C1',
    ACCENT_NEON_CYAN: '#3DDBD9',
    LIGHT_GRAY: '#f8f9fa',
    WHITE: '#ffffff',
    BORDER_COLOR: '#e9ecef'
  },

  SELECTORS: {
    MESSAGES: '#messages',
    MESSAGE_INPUT: '#messageInput',
    SEND_BUTTON: '#sendButton',
    OPTION_BUTTONS: '.option-button',
    KNOWLEDGE_GRAPH: '#knowledgeGraph',
    CLOSE_GRAPH: '#closeGraph',
    GRAPH_SIDEBAR: '#graphSidebar',
    GRAPH_MAIN: '#graphMain',
    NODE_INFO_PANEL: '#nodeInfoPanel',
    NODE_INFO_CONTENT: '#nodeInfoContent'
  },

  MESSAGES: {
    WELCOME: '下午好，可爱的细胞核',
    OPTION_SWITCH: (option) => `已切换到${option}模式`,
    ERROR: '请求处理失败，请稍后重试'
  },

  // API 配置
  API: {
    BASE_URL: '/api', // 实际部署时需要修改为后端地址
    KNOWLEDGE_GRAPH_ENDPOINT: '/knowledge-graph',
    TABLE_ENDPOINT: '/table',
    CARD_ENDPOINT: '/card'
  }
};

// ==================== 工具函数模块 ====================
const Utils = {
  // 格式化时间
  formatTime: () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  },

  // 生成唯一ID
  generateId: () => Math.random().toString(36).substr(2, 9),

  // 添加消息到界面
  addMessage: (content, isUser = false, showProgress = false) => {
    const messagesContainer = document.querySelector(Config.SELECTORS.MESSAGES);
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;

    let progressHtml = '';
    if (showProgress) {
      progressHtml = `
        <div class="progress-container">
          <div class="progress-header">
            <span><i class="fas fa-tasks"></i> 处理进度</span>
            <i class="fas fa-chevron-down progress-toggle"></i>
          </div>
          <div class="progress-content">
            <!-- 动态进度项将在这里添加 -->
          </div>
        </div>
      `;
    }

    messageDiv.innerHTML = `
      ${content}
      ${progressHtml}
      <div class="message-time">${Utils.formatTime()}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 绑定进度条事件
    if (showProgress) {
      const progressHeader = messageDiv.querySelector('.progress-header');
      const progressContent = messageDiv.querySelector('.progress-content');
      const progressToggle = messageDiv.querySelector('.progress-toggle');

      progressHeader.addEventListener('click', () => {
        progressContent.classList.toggle('expanded');
        progressToggle.classList.toggle('rotated');
      });
    }

    return messageDiv;
  },

  // 添加进度项到消息中
  addMessageProgressItem: (messageElement, step, text) => {
    const progressContent = messageElement.querySelector('.progress-content');
    if (progressContent) {
      const progressItem = document.createElement('div');
      progressItem.className = 'progress-item';
      progressItem.innerHTML = `
        <span>${text}</span>
      `;
      progressContent.appendChild(progressItem);
      return progressItem;
    }
  },

  // 更新消息中的进度项
  updateMessageProgressItem: (progressItem, completed = false, processing = false) => {
    if (progressItem) {
      progressItem.classList.toggle('completed', completed);
      progressItem.classList.toggle('processing', processing);
    }
  },

  // 添加进度项到图谱侧边栏
  addGraphProgressItem: (text) => {
    const sidebar = document.querySelector(Config.SELECTORS.GRAPH_SIDEBAR);
    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';
    progressItem.innerHTML = `
      <span>${text}</span>
    `;
    sidebar.appendChild(progressItem);
    return progressItem;
  },

  // 更新图谱侧边栏的进度项
  updateGraphProgressItem: (progressItem, completed = false, processing = false) => {
    if (progressItem) {
      progressItem.classList.toggle('completed', completed);
      progressItem.classList.toggle('processing', processing);
    }
  },

  // 获取DOM元素
  getElements: () => {
    const selectors = Config.SELECTORS;
    return {
      messages: document.querySelector(selectors.MESSAGES),
      messageInput: document.querySelector(selectors.MESSAGE_INPUT),
      sendButton: document.querySelector(selectors.SEND_BUTTON),
      optionButtons: document.querySelectorAll(selectors.OPTION_BUTTONS),
      knowledgeGraph: document.querySelector(selectors.KNOWLEDGE_GRAPH),
      closeGraph: document.querySelector(selectors.CLOSE_GRAPH),
      graphSidebar: document.querySelector(selectors.GRAPH_SIDEBAR),
      graphMain: document.querySelector(selectors.GRAPH_MAIN),
      nodeInfoPanel: document.querySelector(selectors.NODE_INFO_PANEL),
      nodeInfoContent: document.querySelector(selectors.NODE_INFO_CONTENT)
    };
  },

  // 自动调整文本框高度
  autoResizeTextarea: (textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  },

  // 显示错误消息
  showError: (messageElement, errorMsg) => {
    const errorHtml = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> ${errorMsg}</div>`;
    const timeElement = messageElement.querySelector('.message-time');
    timeElement.insertAdjacentHTML('beforebegin', errorHtml);
  },

  // 清空图谱侧边栏进度
  clearGraphProgress: () => {
    const sidebar = document.querySelector(Config.SELECTORS.GRAPH_SIDEBAR);
    const h3 = sidebar.querySelector('h3');
    sidebar.innerHTML = '';
    sidebar.appendChild(h3);
  }
};

// ==================== 应用状态管理模块 ====================
const AppState = {
  conversations: [],
  graphTmpData: {
      nodes: [],
      edges: []
  },
  currentGraph: null,
  activeOption: 'text',
  graphSessions: [], // 存储多个图谱会话
  eventSources: [], // 存储SSE连接

  // 设置当前激活选项
  setActiveOption: function(option) {
    this.activeOption = option;
  },

  // 获取当前激活选项
  getActiveOption: function() {
    return this.activeOption;
  },

  // 添加图谱会话
  addGraphSession: function(session) {
    this.graphSessions.push(session);
    return this.graphSessions.length - 1;
  },

  // 获取图谱会话
  getGraphSession: function(index) {
    return this.graphSessions[index];
  },

  // 添加SSE连接
  addEventSource: function(es) {
    this.eventSources.push(es);
  },

  // 关闭所有SSE连接
  closeAllEventSources: function() {
    this.eventSources.forEach(es => {
      if (es.readyState !== EventSource.CLOSED) {
        es.close();
      }
    });
    this.eventSources = [];
  }
};

// ==================== API调用模块 ====================
const ApiClient = {
  // 调用知识图谱SSE接口
  callKnowledgeGraphSSE: function(query, onProgress, onComplete, onError) {
    try {
      const url = `${Config.API.BASE_URL}${Config.API.KNOWLEDGE_GRAPH_ENDPOINT}?query=${encodeURIComponent(query)}`;

      const eventSource = new EventSource(url);
      AppState.graphTmpData = {
          nodes: [],
          edges: []
      }
      AppState.addEventSource(eventSource);
      eventSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'progress' || data.type === 'node' || data.type === 'edge') {
            onProgress(data.step, data.message, data.type);
          }else if (data.type === 'complete') {
            eventSource.close();
            onComplete(data.message);

          } else if (data.type === 'error') {
            onError(data.message);
            eventSource.close();
          }
        } catch (e) {
          console.error('解析SSE数据失败:', e);
          eventSource.close();
        }
      };

      eventSource.onerror = function(err) {
        console.error('SSE连接错误:', err);
        onError('连接服务器失败');
        eventSource.close();
      };

      return eventSource;
    } catch (error) {
      console.error('创建SSE连接失败:', error);
      onError('初始化连接失败');
      return null;
    }
  },

  // 调用表格SSE接口
  callTableSSE: function(query, onProgress, onComplete, onError) {
    try {
      const url = `${Config.API.BASE_URL}${Config.API.TABLE_ENDPOINT}?query=${encodeURIComponent(query)}`;
      const eventSource = new EventSource(url);

      AppState.addEventSource(eventSource);

      eventSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'progress') {
            onProgress(data.step, data.message);
          } else if (data.type === 'complete') {
            onComplete(data.result);
            eventSource.close();
          } else if (data.type === 'error') {
            onError(data.message);
            eventSource.close();
          }
        } catch (e) {
          console.error('解析SSE数据失败:', e);
        }
      };

      eventSource.onerror = function(err) {
        console.error('SSE连接错误:', err);
        onError('连接服务器失败');
        eventSource.close();
      };

      return eventSource;
    } catch (error) {
      console.error('创建SSE连接失败:', error);
      onError('初始化连接失败');
      return null;
    }
  },

  // 调用卡片SSE接口
  callCardSSE: function(query, onProgress, onComplete, onError) {
    try {
      const url = `${Config.API.BASE_URL}${Config.API.CARD_ENDPOINT}?query=${encodeURIComponent(query)}`;
      const eventSource = new EventSource(url);

      AppState.addEventSource(eventSource);

      eventSource.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'progress') {
            onProgress(data.step, data.message);
          } else if (data.type === 'complete') {
            onComplete(data.message);
            eventSource.close();
          } else if (data.type === 'error') {
            onError(data.message);
            eventSource.close();
          }
        } catch (e) {
          console.error('解析SSE数据失败:', e);
        }
      };

      eventSource.onerror = function(err) {
        console.error('SSE连接错误:', err);
        onError('连接服务器失败');
        eventSource.close();
      };

      return eventSource;
    } catch (error) {
      console.error('创建SSE连接失败:', error);
      onError('初始化连接失败');
      return null;
    }
  }
};

// ==================== 图谱管理模块 ====================
const GraphManager = {
  graph: null,
  currentSessionIndex: null,

  // 初始化图谱
  initGraph: function(containerId, width, height, sessionIndex) {
    // 销毁之前的图谱实例
    if (this.graph) {
      this.graph.destroy();
    }

    // 创建G6图谱实例
    this.graph = new G6.Graph({
      container: containerId,
      width: width,
      height: height,
      layout: {
          type: 'dagre',
          rankdir: 'TB', // 布局方向，LR表示从左到右，TB表示从上到下
          nodesep: 40, // 同一层节点之间的水平距离
          ranksep: 30, // 层与层之间的垂直距离
          controlPoints: true // 为边添加控制点，使边的路径更平滑
       },
      defaultNode: {
        size: 60,
        style: {
          fill: Config.COLORS.PRIMARY_DARK_BLUE,
          stroke: Config.COLORS.ACCENT_TECH_BLUE,
          lineWidth: 3
        },
        labelCfg: {
          style: {
            fill: Config.COLORS.PRIMARY_DARK_BLUE,
            fontSize: 12,
            fontWeight: 600
          },
          position: 'bottom', // 文字位置设置为底部
          offset: 10, // 距离节点的偏移量
        }
      },
      defaultEdge: {
        style: {
          stroke: Config.COLORS.SECONDARY_CHARCOAL,
          lineWidth: 2
        },
        labelCfg: {
          autoRotate: true,
          style: {
            background: {
              fill: Config.COLORS.WHITE,
              stroke: Config.COLORS.WHITE,
              padding: [2, 2, 2, 2]
            },
            fontSize: 11,
            fontWeight: 500
          }
        }
      },
      nodeStateStyles: {
        hover: {
          fill: Config.COLORS.ACCENT_TECH_BLUE,
          stroke: Config.COLORS.ACCENT_NEON_CYAN,
          shadowColor: Config.COLORS.ACCENT_NEON_CYAN,
          shadowBlur: 10
        }
      },
      edgeStateStyles: {
        hover: {
          stroke: Config.COLORS.ACCENT_NEON_CYAN,
          lineWidth: 3
        }
      },
      modes: {
        default: ['drag-canvas', 'zoom-canvas', 'drag-node']
      }
    });

    this.currentSessionIndex = sessionIndex;
    this.bindEvents();
    return this.graph;
  },

  // 绑定图谱事件
  bindEvents: function() {
    if (!this.graph) return;

    // 节点点击事件
    this.graph.on('node:click', (evt) => {
      const node = evt.item;
      const model = node.getModel();
      this.showNodeInfo(model);
    });

    // 节点悬停事件
    this.graph.on('node:mouseenter', (evt) => {
      const node = evt.item;
      this.graph.setItemState(node, 'hover', true);
    });

    this.graph.on('node:mouseleave', (evt) => {
      const node = evt.item;
      this.graph.setItemState(node, 'hover', false);
    });

    // 边悬停事件
    this.graph.on('edge:mouseenter', (evt) => {
      const edge = evt.item;
      this.graph.setItemState(edge, 'hover', true);
    });

    this.graph.on('edge:mouseleave', (evt) => {
      const edge = evt.item;
      this.graph.setItemState(edge, 'hover', false);
    });
  },

  // 显示节点信息
  showNodeInfo: function(nodeData) {
    const elements = Utils.getElements();
    const nodeInfoPanel = elements.nodeInfoPanel;
    const nodeInfoContent = elements.nodeInfoContent;

    // 根据节点类型生成不同的信息
    let infoHtml = '';
    if (nodeData.info) {
      // 如果有预定义的信息
      infoHtml = nodeData.info;
    } else {
      // 默认信息
      infoHtml = `
        <p><strong>节点名称:</strong> ${nodeData.label}</p>
        <p><strong>类型:</strong> 未知</p>
        <p><strong>描述:</strong> 暂无详细信息</p>
      `;
    }

    nodeInfoContent.innerHTML = infoHtml;
    nodeInfoPanel.classList.add('show');
  },

  // 生成图谱数据
  generateGraphData: function(graphData) {
    // 如果有传入的图谱数据，则使用传入的数据
    if (graphData && graphData.nodes && graphData.edges) {
      return graphData;
    }

    // 默认图谱数据
    return {
      nodes: [
        { id: 'node1', label: '人工智能', x: 150, y: 150 },
        { id: 'node2', label: '机器学习', x: 250, y: 100 },
        { id: 'node3', label: '深度学习', x: 350, y: 150 },
        { id: 'node4', label: '神经网络', x: 250, y: 200 },
        { id: 'node5', label: '自然语言处理', x: 100, y: 250 },
        { id: 'node6', label: '计算机视觉', x: 200, y: 300 },
        { id: 'node7', label: '数据挖掘', x: 300, y: 250 }
      ],
      edges: [
        { source: 'node1', target: 'node2', label: '包含' },
        { source: 'node2', target: 'node3', label: '发展' },
        { source: 'node2', target: 'node4', label: '基础' },
        { source: 'node1', target: 'node5', label: '应用' },
        { source: 'node1', target: 'node6', label: '应用' },
        { source: 'node1', target: 'node7', label: '相关' }
      ]
    };
  },

  // 渲染图谱
  renderGraph: function(graphData) {
    if (!this.graph) return;

    const data = this.generateGraphData(graphData);
    this.graph.data(data);
    this.graph.render();
  },

  // 调整图谱大小
  resizeGraph: function(width, height) {
    if (this.graph) {
      this.graph.changeSize(width, height);
    }
  },

  // 销毁图谱
  destroyGraph: function() {
    if (this.graph) {
      this.graph.destroy();
      this.graph = null;
    }
  }
};

// ==================== 聊天处理模块 ====================
const ChatHandler = {
  // 处理不同类型的消息
  handleMessage: async function(content) {
    if (!content.trim()) return;

    // 添加用户消息
    Utils.addMessage(content, true);
    const elements = Utils.getElements();
    elements.messageInput.value = '';
    Utils.autoResizeTextarea(elements.messageInput);

    // 根据当前选项处理消息
    const activeOption = AppState.getActiveOption();
    switch (activeOption) {
      case 'knowledge-graph':
        await this.handleKnowledgeGraph(content);
        break;
      case 'table':
        this.handleTable(content);
        break;
      case 'card':
        this.handleCard(content);
        break;
      default:
        this.handleDefault(content);
    }
  },

  // 处理知识图谱请求
  handleKnowledgeGraph: async function(content) {
    const messageContent = `<p><i class="fas fa-project-diagram"></i> 正在处理知识图谱请求: <strong>${content}</strong></p>`;
    const messageElement = Utils.addMessage(messageContent, false, true);

    // 立即全屏展示图谱界面
    const elements = Utils.getElements();
    elements.knowledgeGraph.style.display = 'flex';
    elements.knowledgeGraph.offsetHeight; // 强制重排
    elements.knowledgeGraph.classList.add('show');

    // 清空图谱侧边栏进度
    Utils.clearGraphProgress();

    // 调用SSE接口
    ApiClient.callKnowledgeGraphSSE(
      content,
      (step, message, type) => {
        if (type === 'node' || type === 'edge'){
              // 生成图谱
            const elements = Utils.getElements();
            var graph = null;
            if (!GraphManager.graph){
                 graph = GraphManager.initGraph(
                  'graphMain',
                  elements.graphMain.clientWidth,
                  elements.graphMain.clientHeight,
                  -1
                );
            }else {
               graph = GraphManager.graph;
            }
            if (type === 'node'){
              AppState.graphTmpData.nodes.push(message)
            }
            if (type === 'edge'){
              AppState.graphTmpData.edges.push(message)
            }
            GraphManager.renderGraph(AppState.graphTmpData);
        }else {
            // 添加并更新消息中的进度项
            const msgProgressItem = Utils.addMessageProgressItem(messageElement, step, message);
            Utils.updateMessageProgressItem(msgProgressItem, true);

            // 添加并更新图谱侧边栏进度项
            const graphProgressItem = Utils.addGraphProgressItem(message);
            Utils.updateGraphProgressItem(graphProgressItem, true);
        }
      },
      (result) => {
        // 处理完成
        this.handleKnowledgeGraphComplete(result, content, messageElement);
        AppState.graphTmpData = { nodes: [], edges: [] }
      },
      (error) => {
        // 处理错误
        AppState.graphTmpData = { nodes: [], edges: [] }
        Utils.showError(messageElement, error || Config.MESSAGES.ERROR);
        elements.knowledgeGraph.classList.remove('show');
        setTimeout(() => {
          elements.knowledgeGraph.style.display = 'none';
        }, 300);
      }
    );
  },

  // 知识图谱处理完成
  handleKnowledgeGraphComplete: function(result, query, messageElement) {
  console.log(result)
    // 创建新的图谱会话
    const session = {
      id: Utils.generateId(),
      query: query,
      timestamp: new Date().getTime(),
      graphData: JSON.parse(result.graphData) || null
    };
    const sessionIndex = AppState.addGraphSession(session);

    // 生成图谱
    const elements = Utils.getElements();
    const graph = GraphManager.initGraph(
      'graphMain',
      elements.graphMain.clientWidth,
      elements.graphMain.clientHeight,
      sessionIndex
    );
    GraphManager.renderGraph(JSON.parse(result.graphData));

    // 在对话框中添加图谱链接
    const linkMessage = `
      <p><i class="fas fa-check-circle"></i> 知识图谱已生成完成</p>
      <button class="graph-link" data-session="${sessionIndex}">
        <i class="fas fa-project-diagram"></i> 查看图谱: ${query}
      </button>
    `;

    // 替换原消息内容
    const timeElement = messageElement.querySelector('.message-time');
    const timeHtml = timeElement.outerHTML;
    messageElement.innerHTML = linkMessage + timeHtml;

    // 重新绑定事件 - 确保新添加的按钮能响应点击
    setTimeout(() => {
      const newGraphLink = messageElement.querySelector('.graph-link');
      if (newGraphLink) {
        newGraphLink.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.openGraphSession(parseInt(newGraphLink.dataset.session));
        });
      }
    }, 100);
  },

  // 处理表格请求
  handleTable: function(content) {
    const messageContent = `<p><i class="fas fa-table"></i> 正在处理表格请求: <strong>${content}</strong></p>`;
    const messageElement = Utils.addMessage(messageContent, false, true);

    // 调用SSE接口
    ApiClient.callTableSSE(
      content,
      (step, message) => {
        // 添加并更新消息中的进度项
        const msgProgressItem = Utils.addMessageProgressItem(messageElement, step, message);
        Utils.updateMessageProgressItem(msgProgressItem, true);
      },
      (result) => {
        // 处理完成
        this.handleTableComplete(result, messageElement);
      },
      (error) => {
        // 处理错误
        Utils.showError(messageElement, error || Config.MESSAGES.ERROR);
      }
    );
  },

  // 表格处理完成
  handleTableComplete: function(result, messageElement) {
    // 添加表格内容
    let tableHtml = '<table>';
    if (result.headers && result.data) {
      // 添加表头
      tableHtml += '<tr>';
      result.headers.forEach(header => {
        tableHtml += `<th>${header}</th>`;
      });
      tableHtml += '</tr>';

      // 添加数据行
      result.data.forEach(row => {
        tableHtml += '<tr>';
        row.forEach(cell => {
          tableHtml += `<td>${cell}</td>`;
        });
        tableHtml += '</tr>';
      });
    } else {
      // 默认表格
      tableHtml += `
        <tr>
          <th>项目</th>
          <th>值</th>
          <th>状态</th>
        </tr>
        <tr>
          <td>示例1</td>
          <td>数据1</td>
          <td><span style="color: #21E6C1;">✓ 完成</span></td>
        </tr>
        <tr>
          <td>示例2</td>
          <td>数据2</td>
          <td><span style="color: #0A2463;">● 进行中</span></td>
        </tr>
      `;
    }
    tableHtml += '</table>';

    const timeElement = messageElement.querySelector('.message-time');
    timeElement.insertAdjacentHTML('beforebegin', tableHtml);
  },

  // 处理卡片请求
  handleCard: function(content) {
    const messageContent = `<p><i class="fas fa-th-large"></i> 正在处理卡片请求: <strong>${content}</strong></p>`;
    const messageElement = Utils.addMessage(messageContent, false, true);

    // 调用SSE接口
    ApiClient.callCardSSE(
      content,
      (step, message) => {
        // 添加并更新消息中的进度项
        const msgProgressItem = Utils.addMessageProgressItem(messageElement, step, message);
        Utils.updateMessageProgressItem(msgProgressItem, true);
      },
      (result) => {
        // 处理完成
        this.handleCardComplete(result, messageElement);
      },
      (error) => {
        // 处理错误
        Utils.showError(messageElement, error || Config.MESSAGES.ERROR);
      }
    );
  },

  // 卡片处理完成
  handleCardComplete: function(result, messageElement) {
    // 添加卡片内容
    let cardsHtml = '<div class="card-container">';
    if (result.cards && result.cards.length > 0) {
      result.cards.forEach(card => {
        cardsHtml += `
          <div class="card ${card.type || 'primary'}">
            <h3><i class="${card.icon || 'fas fa-info-circle'}"></i> ${card.title}</h3>
            <p>${card.content}</p>
          </div>
        `;
      });
    } else {
      // 默认卡片
      cardsHtml += `
        <div class="card primary">
          <h3><i class="fas fa-chart-line"></i> 数据概览</h3>
          <p>系统已处理 1,234 条请求</p>
          <p>准确率: 98.5%</p>
        </div>
        <div class="card accent">
          <h3><i class="fas fa-bolt"></i> 性能指标</h3>
          <p>平均响应时间: 0.8s</p>
          <p>并发处理: 50 请求/秒</p>
        </div>
      `;
    }
    cardsHtml += '</div>';

    const timeElement = messageElement.querySelector('.message-time');
    timeElement.insertAdjacentHTML('beforebegin', cardsHtml);
  },

  // 处理默认请求
  handleDefault: function(content) {
    Utils.addMessage(`
      <p><i class="fas fa-comment"></i> 已收到您的消息: <strong>"${content}"</strong></p>
      <p>请选择一个功能选项来获得更专业的回答：</p>
      <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
        <li><i class="fas fa-comment"></i> 文本 - 普通文本对话</li>
        <li><i class="fas fa-project-diagram"></i> 知识图谱 - 可视化关系网络</li>
        <li><i class="fas fa-table"></i> 表格 - 结构化数据展示</li>
        <li><i class="fas fa-th-large"></i> 卡片 - 信息卡片展示</li>
      </ul>
    `);
  },

  // 打开指定的图谱会话
  openGraphSession: function(sessionIndex) {
    console.log('打开图谱会话:', sessionIndex);

    const elements = Utils.getElements();

    // 显示图谱全屏界面
    elements.knowledgeGraph.style.display = 'flex';
    elements.knowledgeGraph.offsetHeight; // 强制重排
    elements.knowledgeGraph.classList.add('show');

    // 获取会话数据
    const session = AppState.getGraphSession(sessionIndex);
    console.log('会话数据:', session);

    if (!session) {
      console.error('未找到会话数据');
      return;
    }

    // 清空并重新添加进度项
    Utils.clearGraphProgress();
    const progressItem = Utils.addGraphProgressItem('加载历史图谱数据');
    Utils.updateGraphProgressItem(progressItem, true);

    // 等待一小段时间确保DOM更新完成
    setTimeout(() => {
      // 重新初始化图谱
      try {
        const graph = GraphManager.initGraph(
          'graphMain',
          elements.graphMain.clientWidth,
          elements.graphMain.clientHeight,
          sessionIndex
        );
        GraphManager.renderGraph(session.graphData);
        console.log('图谱渲染完成');
      } catch (error) {
        console.error('图谱初始化失败:', error);
      }
    }, 100);
  }
};

// ==================== 事件管理模块 ====================
const EventManager = {
  // 初始化所有事件监听
  init: function() {
    const elements = Utils.getElements();

    // 发送按钮点击事件
    elements.sendButton.addEventListener('click', () => {
      ChatHandler.handleMessage(elements.messageInput.value);
    });

    // 回车发送消息（支持Shift+Enter换行）
    elements.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        ChatHandler.handleMessage(elements.messageInput.value);
      }
      Utils.autoResizeTextarea(e.target);
    });

    // 文本框内容变化时调整高度
    elements.messageInput.addEventListener('input', (e) => {
      Utils.autoResizeTextarea(e.target);
    });

    // 功能选项点击事件
    elements.optionButtons.forEach(button => {
      button.addEventListener('click', () => {
        // 移除所有按钮的激活状态
        elements.optionButtons.forEach(btn => btn.classList.remove('active'));
        // 激活当前按钮
        button.classList.add('active');
        // 设置当前选项
        AppState.setActiveOption(button.dataset.type);

        Utils.addMessage(`<i class="fas fa-exchange-alt"></i> ${Config.MESSAGES.OPTION_SWITCH(button.querySelector('span').textContent)}`);
      });
    });

    // 关闭图谱界面
    elements.closeGraph.addEventListener('click', () => {
      elements.knowledgeGraph.classList.remove('show');
      AppState.closeAllEventSources();
      setTimeout(() => {
        elements.knowledgeGraph.style.display = 'none';
      }, 300);
    });

    // 点击图谱背景关闭
    elements.knowledgeGraph.addEventListener('click', (e) => {
      if (e.target === elements.knowledgeGraph) {
        elements.closeGraph.click();
      }
    });

    // ESC键关闭图谱
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && elements.knowledgeGraph.classList.contains('show')) {
        elements.closeGraph.click();
      }
    });

    // 窗口大小改变时重置图谱大小
    window.addEventListener('resize', () => {
      if (elements.knowledgeGraph.classList.contains('show')) {
        GraphManager.resizeGraph(
          elements.graphMain.clientWidth,
          elements.graphMain.clientHeight
        );
      }
    });

    // 使用事件委托处理动态添加的图谱链接
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('graph-link') || (e.target.closest && e.target.closest('.graph-link'))) {
        const link = e.target.classList.contains('graph-link') ? e.target : e.target.closest('.graph-link');
        if (link && link.dataset.session !== undefined) {
          const sessionIndex = parseInt(link.dataset.session);
          console.log('点击图谱链接，会话索引:', sessionIndex);
          ChatHandler.openGraphSession(sessionIndex);
        }
      }
    });

    // 页面卸载时关闭所有SSE连接
    window.addEventListener('beforeunload', () => {
      AppState.closeAllEventSources();
    });
  }
};

// ==================== 应用初始化模块 ====================
const App = {
  // 初始化应用
  init: function() {
    EventManager.init();
    console.log('智能对话系统已启动');
  }
};

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// ==================== 模拟API服务（仅用于演示）====================
// 在实际部署时，请删除这部分代码，并确保后端提供相应的SSE接口
//(() => {
//  // 模拟SSE服务器
//  const simulateSSEServer = () => {
//    // 拦截SSE请求并模拟响应
//    const originalEventSource = window.EventSource;
//
//    window.EventSource = function(url) {
//      console.log('拦截SSE请求:', url);
//
//      // 创建模拟的EventSource对象
//      const mockEventSource = {
//        readyState: EventSource.CONNECTING,
//        onmessage: null,
//        onerror: null,
//        close: function() {
//          this.readyState = EventSource.CLOSED;
//        }
//      };
//
//      // 模拟连接建立
//      setTimeout(() => {
//        mockEventSource.readyState = EventSource.OPEN;
//
//        // 根据URL类型模拟不同的响应
//        if (url.includes('/knowledge-graph')) {
//          simulateKnowledgeGraphSSE(mockEventSource);
//        } else if (url.includes('/table')) {
//          simulateTableSSE(mockEventSource);
//        } else if (url.includes('/card')) {
//          simulateCardSSE(mockEventSource);
//        }
//      }, 100);
//
//      return mockEventSource;
//    };
//
//    // 模拟知识图谱SSE响应
//    function simulateKnowledgeGraphSSE(eventSource) {
//      let step = 0;
//      const steps = [
//        { type: 'progress', step: 0, message: '正在初始化系统环境...' },
//        { type: 'progress', step: 1, message: '分析用户查询意图...' },
//        { type: 'progress', step: 2, message: '调用知识库API获取数据...' },
//        { type: 'progress', step: 3, message: '处理和清洗数据...' },
//        { type: 'progress', step: 4, message: '构建知识图谱结构...' },
//        { type: 'progress', step: 5, message: '优化图谱布局...' }
//      ];
//
//      const interval = setInterval(() => {
//        if (step < steps.length) {
//          if (eventSource.onmessage) {
//            eventSource.onmessage({ data: JSON.stringify(steps[step]) });
//          }
//          step++;
//        } else {
//          // 完成响应
//          const completeData = {
//            type: 'complete',
//            result: {
//              graphData: {
//                nodes: [
//                  { id: 'node1', label: '人工智能', info: '<p><strong>节点名称:</strong> 人工智能</p><p><strong>类型:</strong> 技术领域</p><p><strong>描述:</strong> 人工智能是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。</p>' },
//                  { id: 'node2', label: '机器学习', info: '<p><strong>节点名称:</strong> 机器学习</p><p><strong>类型:</strong> 子领域</p><p><strong>描述:</strong> 机器学习是人工智能的一个子领域，专注于开发能够从数据中学习并做出预测或决策的算法。</p>' },
//                  { id: 'node3', label: '深度学习', info: '<p><strong>节点名称:</strong> 深度学习</p><p><strong>类型:</strong> 技术分支</p><p><strong>描述:</strong> 深度学习是机器学习的一个子集，使用多层神经网络来模拟人脑处理信息的方式。</p>' }
//                ],
//                edges: [
//                  { source: 'node1', target: 'node2', label: '包含' },
//                  { source: 'node2', target: 'node3', label: '发展' }
//                ]
//              }
//            }
//          };
//          if (eventSource.onmessage) {
//            eventSource.onmessage({ data: JSON.stringify(completeData) });
//          }
//          clearInterval(interval);
//        }
//      }, 800);
//    }
//
//    // 模拟表格SSE响应
//    function simulateTableSSE(eventSource) {
//      let step = 0;
//      const steps = [
//        { type: 'progress', step: 0, message: '连接数据库...' },
//        { type: 'progress', step: 1, message: '执行查询语句...' },
//        { type: 'progress', step: 2, message: '获取查询结果...' },
//        { type: 'progress', step: 3, message: '格式化表格数据...' }
//      ];
//
//      const interval = setInterval(() => {
//        if (step < steps.length) {
//          if (eventSource.onmessage) {
//            eventSource.onmessage({ data: JSON.stringify(steps[step]) });
//          }
//          step++;
//        } else {
//          // 完成响应
//          const completeData = {
//            type: 'complete',
//            result: {
//              headers: ['项目', '值', '状态'],
//              data: [
//                ['用户数量', '1,234', '✓ 活跃'],
//                ['处理请求', '5,678', '✓ 完成'],
//                ['系统性能', '98.5%', '✓ 优秀'],
//                ['响应时间', '0.8s', '✓ 良好']
//              ]
//            }
//          };
//          if (eventSource.onmessage) {
//            eventSource.onmessage({ data: JSON.stringify(completeData) });
//          }
//          clearInterval(interval);
//        }
//      }, 600);
//    }
//
//    // 模拟卡片SSE响应
//    function simulateCardSSE(eventSource) {
//      let step = 0;
//      const steps = [
//        { type: 'progress', step: 0, message: '收集业务数据...' },
//        { type: 'progress', step: 1, message: '分析关键指标...' },
//        { type: 'progress', step: 2, message: '生成可视化卡片...' }
//      ];
//
//      const interval = setInterval(() => {
//        if (step < steps.length) {
//          if (eventSource.onmessage) {
//            eventSource.onmessage({ data: JSON.stringify(steps[step]) });
//          }
//          step++;
//        } else {
//          // 完成响应
//          const completeData = {
//            type: 'complete',
//            result: {
//              cards: [
//                {
//                  title: '数据统计',
//                  content: '系统已处理 1,234 条请求，准确率 98.5%',
//                  type: 'primary',
//                  icon: 'fas fa-chart-bar'
//                },
//                {
//                  title: '性能指标',
//                  content: '平均响应时间 0.8s，并发处理 50 请求/秒',
//                  type: 'accent',
//                  icon: 'fas fa-tachometer-alt'
//                },
//                {
//                  title: '用户活跃度',
//                  content: '今日活跃用户 856 人，较昨日增长 12%',
//                  type: 'primary',
//                  icon: 'fas fa-users'
//                }
//              ]
//            }
//          };
//          if (eventSource.onmessage) {
//            eventSource.onmessage({ data: JSON.stringify(completeData) });
//          }
//          clearInterval(interval);
//        }
//      }, 700);
//    }
//  };
//
//  // 仅在开发环境中模拟（实际部署时应移除）
//  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
//    simulateSSEServer();
//  }
//})();