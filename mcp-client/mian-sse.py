from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
import time
import json
import random
from datetime import datetime
import asyncio
from agentDemo import DeepSeekOpenAIMCPIntegration

app = FastAPI(title="SSE进度推送服务")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境中应指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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



# 模拟任务进度生成器
async def progress_generator():
    progress = 0
    while progress < 100:
        # 随机增加进度，模拟不同处理速度
        increment = random.randint(1, 5)
        progress = min(progress + increment, 100)

        # 生成状态信息
        status = "处理中"
        if progress == 100:
            status = "已完成"

        # 构建数据
        data = {
            "progress": progress,
            "status": status,
            "message": f"已完成{progress}%的任务",
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }

        # 按照SSE格式发送数据
        yield f"data: {json.dumps(data)}\n\n"

        # 控制发送间隔
        await asyncio.sleep(random.uniform(0.5, 2.0))


# SSE接口
@app.get("/progress")
async def get_progress(response: Response):
    # 获取MCP实例
    mcp = await MCPInstance.get_instance()

    # 设置响应头，确保不缓存
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    return StreamingResponse(
        mcp.process_query("查询大华商户 1000下门店关联的所有销售代表信息，返回规范的 json 格式，json 里面不包含换行"),
        media_type="text/event-stream"
    )


# 前端页面
@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mian-sse:app", host="0.0.0.0", port=9011, reload=True)
