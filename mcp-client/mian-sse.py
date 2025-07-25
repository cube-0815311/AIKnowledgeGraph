from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
import time
import json
import random
from datetime import datetime
import asyncio

app = FastAPI(title="SSE进度推送服务")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境中应指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    # 设置响应头，确保不缓存
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    return StreamingResponse(
        progress_generator(),
        media_type="text/event-stream"
    )


# 前端页面
@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("mian-sse:app", host="0.0.0.0", port=9010, reload=True)
