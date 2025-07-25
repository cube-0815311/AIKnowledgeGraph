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

# 模拟数据
KNOWLEDGE_GRAPH_DATA = {
    "graphData":  {"nodes": [{"id": "1000", "label": "商户_1000", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "Merchant", "merchantId": "1000", "merchantName": "商户_1000"}}, {"id": "STR_233193", "label": "门店_3193", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "Store", "storeId": "STR_233193", "storeName": "门店_3193"}}, {"id": "STR_e0d97e", "label": "门店_d97e", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "Store", "storeId": "STR_e0d97e", "storeName": "门店_d97e"}}, {"id": "REP_ac66f8", "label": "销售_66f8", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "SalesRepresentative", "salesRepId": "REP_ac66f8", "salesRepName": "销售_66f8", "phone": "13869877279", "email": "销售_66f8@example.com"}}, {"id": "REP_fac9d2", "label": "销售_c9d2", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "SalesRepresentative", "salesRepId": "REP_fac9d2", "salesRepName": "销售_c9d2", "phone": "13356100052", "email": "销售_c9d2@example.com"}}, {"id": "REP_84c044", "label": "销售_c044", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "SalesRepresentative", "salesRepId": "REP_84c044", "salesRepName": "销售_c044", "phone": "13176147055", "email": "销售_c044@example.com"}}, {"id": "REP_aa82d0", "label": "销售_82d0", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "SalesRepresentative", "salesRepId": "REP_aa82d0", "salesRepName": "销售_82d0", "phone": "13746700043", "email": "销售_82d0@example.com"}}, {"id": "REP_3526b1", "label": "销售_26b1", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "SalesRepresentative", "salesRepId": "REP_3526b1", "salesRepName": "销售_26b1", "phone": "13036163275", "email": "销售_26b1@example.com"}}, {"id": "REP_8da3f7", "label": "销售_a3f7", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "SalesRepresentative", "salesRepId": "REP_8da3f7", "salesRepName": "销售_a3f7", "phone": "13584672031", "email": "销售_a3f7@example.com"}}, {"id": "REP_b664cd", "label": "销售_64cd", "size": [80, 60], "type": "rect", "style": {"radius": 8}, "info": {"entityType": "SalesRepresentative", "salesRepId": "REP_b664cd", "salesRepName": "销售_64cd", "phone": "13572200082", "email": "销售_64cd@example.com"}}], "edges": [{"source": "1000", "target": "STR_233193", "label": "包含"}, {"source": "1000", "target": "STR_e0d97e", "label": "包含"}, {"source": "STR_233193", "target": "REP_ac66f8", "label": "关联"}, {"source": "STR_233193", "target": "REP_fac9d2", "label": "关联"}, {"source": "STR_233193", "target": "REP_84c044", "label": "关联"}, {"source": "STR_e0d97e", "target": "REP_aa82d0", "label": "关联"}, {"source": "STR_e0d97e", "target": "REP_3526b1", "label": "关联"}, {"source": "STR_e0d97e", "target": "REP_8da3f7", "label": "关联"}, {"source": "STR_e0d97e", "target": "REP_b664cd", "label": "关联"}]}
}


async def generate_sse_events(progress_steps: list, result_: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """
    生成SSE事件流
    """
    # 发送处理进度
    for i, step_message in enumerate(progress_steps):
        progress_data = {
            "type": "progress",
            "step": i,
            "message": step_message
        }
        yield f" {json.dumps(progress_data)}\n\n"
        await asyncio.sleep(random.uniform(0.5, 1.5))  # 模拟处理时间

    # 发送完成结果
    complete_data = {
        "type": "complete",
        "result": "result_data"
    }
    yield f" {json.dumps(complete_data)}\n\n"


async def generate_error_event(error_message: str) -> AsyncGenerator[str, None]:
    """
    生成错误事件
    """
    error_data = {
        "type": "error",
        "message": error_message
    }
    yield f" {json.dumps(error_data)}\n\n"



@app.get("/api/knowledge-graph")
async def knowledge_graph_sse(query: str = Query(..., description="查询内容")):
    """
    知识图谱SSE接口
    """
    print(str)
    return StreamingResponse(
        progress_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )



# 模拟任务进度生成器
async def progress_generator():
    progress = 0
    while progress < 5:
        # 随机增加进度，模拟不同处理速度
        increment = random.randint(1, 1)
        progress = min(progress + increment, 5)

        # 生成状态信息
        status = "处理中"
        if progress == 5:
            status = "已完成"

        # 构建数据
        data = {
            "type": "progress",
            "status": status,
            "message": f"已完成{progress}%的任务",
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }

        # 按照SSE格式发送数据
        yield f"data: {json.dumps(data)}\n\n"

        nodes = [
            {"id": "node1", "label": "人工智能",
             "info": "<p><strong>节点名称:</strong> 人工智能</p><p><strong>类型:</strong> 技术领域</p><p><strong>描述:</strong> 人工智能是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。</p>"},
            {"id": "node2", "label": "机器学习",
             "info": "<p><strong>节点名称:</strong> 机器学习</p><p><strong>类型:</strong> 子领域</p><p><strong>描述:</strong> 机器学习是人工智能的一个子领域，专注于开发能够从数据中学习并做出预测或决策的算法。</p>"},
            {"id": "node3", "label": "深度学习",
             "info": "<p><strong>节点名称:</strong> 深度学习</p><p><strong>类型:</strong> 技术分支</p><p><strong>描述:</strong> 深度学习是机器学习的一个子集，使用多层神经网络来模拟人脑处理信息的方式。</p>"},
            {"id": "node4", "label": "神经网络",
             "info": "<p><strong>节点名称:</strong> 神经网络</p><p><strong>类型:</strong> 算法模型</p><p><strong>描述:</strong> 神经网络是一种模拟生物神经网络结构和功能的计算模型。</p>"},
            {"id": "node6", "label": "神经网络6",
             "info": "<p><strong>节点名称:</strong> 神经网络</p><p><strong>类型:</strong> 算法模型</p><p><strong>描述:</strong> 神经网络是一种模拟生物神经网络结构和功能的计算模型。</p>"},
            {"id": "node5", "label": "自然语言处理",
             "info": "<p><strong>节点名称:</strong> 自然语言处理</p><p><strong>类型:</strong> 应用领域</p><p><strong>描述:</strong> 自然语言处理是人工智能和语言学领域的分支，研究人与计算机之间用自然语言进行有效通信的各种问题。</p>"}

        ]
        # 构建数据
        data = {
            "type": "node",
            "status": status,
            "message": nodes[progress],
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }

        # 按照SSE格式发送数据
        yield f"data: {json.dumps(data)}\n\n"

        if progress == 5:
            # 构建数据
            data = {
                "type": "complete",
                "status": status,
                "message": KNOWLEDGE_GRAPH_DATA,
                "timestamp": datetime.now().strftime("%H:%M:%S")
            }
            # 按照SSE格式发送数据
            yield f"data: {json.dumps(data)}\n\n"
        # 控制发送间隔
        await asyncio.sleep(random.uniform(0.5, 2.0))


# SSE接口
async def get_progress(response: Response):
    # 设置响应头，确保不缓存
    response.headers["Cache-Control"] = "no-cache"
    response.headers["Connection"] = "keep-alive"
    return StreamingResponse(
        progress_generator(),
        media_type="text/event-stream"
    )




# 首页路由
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """首页路由，返回前端页面"""
    return templates.TemplateResponse("index.html", {"request": request})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=9010, reload=True)
