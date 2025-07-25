from mcp.server.fastmcp import FastMCP
from starlette.routing import Mount, Route
from mcp.server import Server
from starlette.applications import Starlette
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
import uvicorn
import argparse
import random
import uuid
# Create an MCP server
mcp = FastMCP("achievement")

# Add an get score tool
@mcp.tool()
def get_score_by_name(name: str) -> str:
    """根据员工的姓名获取该员工的绩效得分"""
    if name == "张三":
        return "name: 张三 绩效评分: 85.9"
    elif name == "李四":
        return "name: 李四 绩效评分: 92.7"
    else:
        return "未搜到该员工的绩效"


@mcp.tool()
def get_merchant_info(merchant_id: str) -> object:
    """根据商户 ID 查询查询基本信息，返回门店信息"""
    if not merchant_id:
        merchant_id = f"MER_{uuid.uuid4().hex[:8]}"
    merchant_name = f"商户_{merchant_id[-4:]}"
    stores = []
    for i in range(random.randint(1, 2)):
        store_id = f"STR_{uuid.uuid4().hex[:6]}"
        store_name = f"门店_{i+1}"
        stores.append({"storeId": store_id, "storeName": store_name})
    return {
        "merchantId": merchant_id,
        "merchantName": merchant_name,
        "id": merchant_id,
        "label": merchant_name,
        "stores": stores
    }


@mcp.tool()
# 模拟生成门店信息（含销售代表）
def get_store_info(store_id: str) -> object:
    """查询门店基本信息，返回门店信息，包括销售信息"""
    if not store_id:
        store_id = f"STR_{uuid.uuid4().hex[:8]}"
    store_name = f"门店_{store_id[-4:]}"
    reps = []
    names = ["张三", "李四", "王五", "赵六"]
    for i in range(random.randint(1, 2)):
        rep_id = f"REP_{uuid.uuid4().hex[:6]}"
        rep_name = random.choice(names)
        reps.append({"salesRepId": rep_id, "salesRepName": rep_name})
    return {
        "storeId": store_id,
        "storeName": store_name,
        "id": store_id,
        "label": store_name,
        "salesReps": reps
    }


@mcp.tool()
# 模拟生成销售代表信息
def get_sales_rep_info(rep_id: str) -> object:
    """查询销售代表信息"""
    if not rep_id:
        rep_id = f"REP_{uuid.uuid4().hex[:8]}"
    rep_name = f"销售_{rep_id[-4:]}"
    phone = f"1{random.randint(3000000000, 3999999999)}"
    email = f"{rep_name.lower()}@example.com"
    return {
        "salesRepId": rep_id,
        "id": rep_id,
        "label": rep_name,
        "salesRepName": rep_name,
        "phone": phone,
        "email": email
    }


def create_starlette_app(mcp_server: Server, *, debug: bool = False) -> Starlette:
    """Create a Starlette application that can server the provied mcp server with SSE."""
    sse = SseServerTransport("/messages/")

    async def handle_sse(request: Request) -> None:
        async with sse.connect_sse(
                request.scope,
                request.receive,
                request._send,
        ) as (read_stream, write_stream):
            await mcp_server.run(
                read_stream,
                write_stream,
                mcp_server.create_initialization_options(),
            )

    return Starlette(
        debug=debug,
        routes=[
            Route("/sse", endpoint=handle_sse),
            Mount("/messages/", app=sse.handle_post_message),
        ],
    )

if __name__ == "__main__":
    mcp_server = mcp._mcp_server

    parser = argparse.ArgumentParser(description='Run MCP SSE-based server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=18080, help='Port to listen on')
    args = parser.parse_args()

    # Bind SSE request handling to MCP server
    starlette_app = create_starlette_app(mcp_server, debug=True)

    uvicorn.run(starlette_app, host=args.host, port=args.port)