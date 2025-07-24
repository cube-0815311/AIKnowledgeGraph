import os
import json
from pydantic import BaseModel
import requests
import asyncio
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from agentDemo import DeepSeekOpenAIMCPIntegration

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 定义请求体模型
class QueryRequest(BaseModel):
    user_query: str  # 用户查询内容
    max_retries: int = 3  # 最大重试次数

# 初始化MCP集成实例（单例模式，避免重复创建连接）
class MCPInstance:
    _instance = None
    _lock = asyncio.Lock()  # 确保异步安全

    @classmethod
    async def get_instance(cls):
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = DeepSeekOpenAIMCPIntegration()
                    await cls._instance.connect_to_sse_server()  # 预连接
        return cls._instance

    @property
    def instance(self):
        return self._instance


@app.route('/')
def index():
    """首页路由，返回前端页面"""
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
async def chat():
    # 1. 获取请求体数据（Flask 通过 request 对象获取）
    data = request.get_json()  # 解析 JSON 格式的请求体
    if not data:
        return jsonify({"error": "请求体为空"}), 400

    # 2. 用 Pydantic 模型验证数据（手动转换）
    req = QueryRequest(**data)  # 将字典转换为 QueryRequest 实例

    print(f"用户查询：{req}")
    """与大模型对话的API接口"""
    # 获取MCP实例
    mcp = await MCPInstance.get_instance()

    # 调用process_query方法
    result = await mcp.process_query(req.user_query)

    return jsonify({"response": result})



if __name__ == '__main__':
    # 创建static和templates目录（如果不存在）
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)

    # 启动服务
    app.run(host='0.0.0.0', port=18081, debug=True)
