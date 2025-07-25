from fastapi import FastAPI, Response, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import Dict, Any, AsyncGenerator
import os
import json
import random
from datetime import datetime
import asyncio
from agent import DeepSeekOpenAIMCPIntegration

app = FastAPI(title="SSE进度推送服务")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境中应指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置静态文件和模板
os.makedirs('static', exist_ok=True)
os.makedirs('templates', exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 初始化MCP集成实例（单例模式）
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



@app.get("/api/knowledge-graph")
async def knowledge_graph_sse(query: str = Query(..., description="查询内容")):
    """
    知识图谱SSE接口
    """
    print(query)
    # 获取MCP实例
    mcp = await MCPInstance.get_instance()

    return StreamingResponse(
        mcp.process_query("查询大华商户 1000下门店关联的所有销售代表信息，返回规范的 json 格式，json 里面不包含换行"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


# 首页路由
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """首页路由，返回前端页面"""
    return templates.TemplateResponse("index.html", {"request": request})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=9010, reload=True)
