import os
import json
import asyncio
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from agentDemo import DeepSeekOpenAIMCPIntegration

# 初始化FastAPI应用
app = FastAPI(title="MCP Integration API")

# 配置跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境应指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 配置静态文件和模板
os.makedirs('static', exist_ok=True)
os.makedirs('templates', exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


# 定义请求体模型
class QueryRequest(BaseModel):
    user_query: str  # 用户查询内容
    max_retries: int = 3  # 最大重试次数


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


# 首页路由
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """首页路由，返回前端页面"""
    return templates.TemplateResponse("index.html", {"request": request})


# 聊天接口
@app.post("/api/chat")
async def chat(request: QueryRequest):
    """与大模型对话的API接口"""
    try:
        print(f"用户查询：{request.user_query}")

        # 获取MCP实例
        mcp = await MCPInstance.get_instance()

        # 调用process_query方法
        result = await mcp.process_query(request.user_query)

        return {"response": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"处理请求时出错: {str(e)}")


if __name__ == '__main__':
    import uvicorn

    # 启动服务，使用uvicorn作为ASGI服务器
    uvicorn.run("main:app", host="0.0.0.0", port=18081, reload=True)
