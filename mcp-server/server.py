from mcp.server.fastmcp import FastMCP
from starlette.routing import Mount, Route
from mcp.server import Server
from starlette.applications import Starlette
from mcp.server.sse import SseServerTransport
from starlette.requests import Request
import uvicorn
import argparse
from typing import List, Dict, Any
# 导入数据库查询工具
from database_tools import init_database, query_merchant, query_store, query_sales_rep

# Create an MCP server
mcp = FastMCP("achievement")


# 初始化数据库（在应用启动时调用）
def initialize_database():
    """初始化数据库连接"""
    # 替换为你的实际数据库路径
    init_database("scenario.db")

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
def get_merchant_info(code: str) -> object:
    """根据商户 code 查询查询基本信息"""
    try:
        # 使用数据库查询商户信息
        merchants = query_merchant(codes=[code])
        if merchants:
            merchant = merchants[0]
            merchant_name = merchant.get('merchant_name', f'商户_{code[-4:]}')

            return {
                "merchantId": merchant.get('merchant_code', code),
                "merchantName": merchant_name,
                "id": merchant.get('merchant_code', code),
                "label": merchant_name,
                "p_id": '',
                "owner_name": merchant.get('owner_name', ''),
                "established_date": merchant.get('established_date', ''),
                "merchant_type": merchant.get('merchant_type', ''),
            }
        else:
            # 如果没找到，返回默认数据
            return {
                "merchantId": code,
                "merchantName": f"商户_{code[-4:]}",
                "id": code,
                "label": f"商户_{code[-4:]}",
                "stores": []
            }
    except Exception as e:
        return {
            "error": f"查询商户信息出错: {str(e)}",
            "merchantId": code,
            "merchantName": f"商户_{code[-4:]}",
            "id": code,
            "label": f"商户_{code[-4:]}",
            "stores": []
        }


@mcp.tool()
def get_stores_by_merchant_code(merchant_code: str) -> List[Dict[str, Any]]:
    """
    根据商户编号查询门店列表

    Args:
        merchant_code (str): 商户编号

    Returns:
        List[Dict[str, Any]]: 门店列表，每个门店包含 store_code, store_name 等信息
    """
    try:
        if not merchant_code:
            return []

        # 根据商户编号查询门店（假设 store 表中有 merchant_code 字段）
        stores = query_store(codes=[merchant_code])

        result = []
        for store in stores:
            result.append({
                "storeId": store.get('store_code', ''),
                "storeName": store.get('store_name', ''),
                "id": store.get('store_code', ''),
                "label": store.get('store_name', ''),
                "p_id": store.get('merchant_code', ''),
                "storeType": store.get('store_type', ''),
                "entryMerchantCode": store.get('entry_merchant_code', '')
            })

        return result

    except Exception as e:
        return [{"error": f"查询门店列表失败: {str(e)}"}]

@mcp.tool()
def get_sales_reps_by_store_code(store_code: str) -> List[Dict[str, Any]]:
    """
    根据门店编号查询销售代表列表

    Args:
        store_code (str): 门店编号

    Returns:
        List[Dict[str, Any]]: 销售代表列表，每个代表包含 rep_id, rep_name 等信息
    """
    try:
        if not store_code:
            return []

        # 方法1: 直接查询（假设 sales_rep 表中有 store_code 字段）
        sales_reps = query_sales_rep(codes=[store_code])

        # 方法2: 如果需要关联查询，可以这样处理
        result = []
        for rep in sales_reps:
            result.append({
                "repId": rep.get('rep_id', ''),
                "repName": rep.get('rep_name', ''),
                "id": rep.get('rep_id', ''),
                "label": rep.get('rep_name', ''),
                "p_id": rep.get('store_code', ''),
                "storeId": rep.get('store_code', '')
            })

        return result

    except Exception as e:
        return [{"error": f"查询销售代表列表失败: {str(e)}"}]


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
    # 初始化数据库
    initialize_database()
    mcp_server = mcp._mcp_server

    parser = argparse.ArgumentParser(description='Run MCP SSE-based server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', type=int, default=18080, help='Port to listen on')
    args = parser.parse_args()

    # Bind SSE request handling to MCP server
    starlette_app = create_starlette_app(mcp_server, debug=True)

    uvicorn.run(starlette_app, host=args.host, port=args.port)