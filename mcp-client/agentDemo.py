import asyncio
import json
import re

import os
from openai import OpenAI  # 使用 OpenAI 客户端
from typing import Optional
from contextlib import AsyncExitStack
# MCP Server 相关导入
from mcp import ClientSession
from system_prompt import REACT_PROMPT
from mcp.client.sse import sse_client
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()  # load environment variables from .env

# 配置信息
DEEPSEEK_API_KEY = "sk-d817c9a0b21e42628d6d4600ddee2598"
DEEPSEEK_API_BASE = "https://api.deepseek.com/v1"  # DeepSeek 的 OpenAI 兼容接口地址
MCP_SERVER_URL = "http://127.0.0.1:18080/sse"


class DeepSeekOpenAIMCPIntegration:
    def __init__(self):
        # 初始化 OpenAI 兼容客户端（用于调用 DeepSeek）
        # Initialize session and client objects
        self.mcp_session: Optional[ClientSession] = None
        self.exit_stack = AsyncExitStack()
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"), base_url=os.getenv("OPENAI_BASE_URL"))
        # MCP 相关属性
        self.tools = None
        self.initialized = False

    async def connect_to_sse_server(self):
        """Connect to an MCP server running with SSE transport"""
        # Store the context managers so they stay alive
        self._streams_context = sse_client(url=MCP_SERVER_URL)
        streams = await self._streams_context.__aenter__()

        self._session_context = ClientSession(*streams)
        self.mcp_session: ClientSession = await self._session_context.__aenter__()

        # Initialize
        await self.mcp_session.initialize()
        # List available tools to verify connection
        print("Initialized SSE client...")
        print("Listing tools...")
        response = await self.mcp_session.list_tools()
        tools = response.tools
        print("\nConnected to server with tools:", [tool.name for tool in tools])
        self.tools = response.tools
        self.initialized = True

    async def call_mcp_tool(self, tool_name, **kwargs):
        """调用 MCP Server 上的工具"""
        if not self.initialized:
            await self.connect_to_sse_server()

        try:
            print(f"调用工具: {tool_name}, 参数: {kwargs}")

            result = await self.mcp_session.call_tool(
                name=tool_name,
                arguments=kwargs
            )
            return result
        except Exception as e:
            print(f"工具调用失败: {e}")
            return None

    async def cleanup(self):
        """Properly clean up the session and streams"""
        if self._session_context:
            await self._session_context.__aexit__(None, None, None)
        if self._streams_context:
            await self._streams_context.__aexit__(None, None, None)

    def _tools_to_dicts(self, tools):
        """将Tool对象列表转换为可序列化的字典列表"""
        tool_dicts = []
        for tool in tools:
            # 提取Tool对象的关键属性
            tool_info = {
                "name": tool.name,
                "title": tool.title,
                "description": tool.description,
                "inputSchema": tool.inputSchema,
                "outputSchema": tool.outputSchema,
                "annotations": tool.annotations,
                "meta": tool.meta
            }
            tool_dicts.append(tool_info)
        return tool_dicts


    async def process_query(self, query: str):
        """处理用户查询：大模型决策 -> 工具调用（可选）-> 生成回答"""
        # 确保 MCP 已初始化
        if not self.initialized:
            await self.connect_to_sse_server()

        # 1. 让DeepSeek模型判断是否需要调用工具
        system_prompt = """
            你是一个“知识图谱依赖分析助手”，请根据以下实体结构与依赖规则，输出一个 JSON 格式的图谱数据（nodes 和 edges）输出之前要要校验一下是否符合 josn 规范，不符合就调整到啊符合规范。

            # 实体层级结构
            Merchant (商户)
              └── Store (门店)
                    ├── Product (商品)
                    ├── SalesRepresentative (销售代表)
            
            # 实体关系
            - Merchant → Store        （商户包含门店）
            - Store → Product         （门店包含商品）
            - Store → SalesRepresentative（门店包含销售代表）
            
            # 查询规则
            1. 用户输入一个实体 ID + 类型 + 查询方向（向下 或 向上）
            2. 你需要按照方向生成实体依赖路径
               - 向下（down）：可以递归到底层
               - 向上（up）：只允许查询上一级，禁止再基于结果往下查
            
            # 输出结构
            以下 JSON 格式输出结果，结果要符合 json 的规范。不能随意输出：
            {
              "nodes": [
                {
                  "id": "实体唯一ID",
                  "label": "实体显示名称",
                  "size": [80, 60],
                  "type": "rect",
                  "style": { "radius": 8 },
                  "info": {
                    "entityType": "实体类型（如Merchant）",
                    "其他字段": "..."
                  }
                }
              ],
              "edges": [
                {
                  "source": "上层实体ID",
                  "target": "下层实体ID",
                  "label": "依赖关系名称（如：包含、关联）"
                }
              ]
            }
           """
        # 调用 DeepSeek 模型（通过 OpenAI 兼容接口）
        available_tools = [{
            "type": "function",
            "function": {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.inputSchema
            }
        } for tool in self.tools]
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]

        while True:
            print("messages", messages)
            model_response = self.client.chat.completions.create(
                model="deepseek-chat",  # DeepSeek 模型名称
                messages=messages,
                tools=available_tools,
                tool_choice="auto",
                response_format={ "type": "json_object" }
            )
            print("model_response", model_response)
            assistant_message = model_response.choices[0].message

            # 2. 解析模型响应，判断是否需要调用工具
            if assistant_message.tool_calls:
                for tool_call in assistant_message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)

                    # Execute tool call
                    result = await self.mcp_session.call_tool(tool_name, tool_args)
                    print(f"Tool {tool_name} returned: {result.content[0].text}")
                    # Continue conversation with tool results
                    messages.extend([
                        {
                            "role": "assistant",
                            "content": None,
                            "tool_calls": [tool_call]
                        },
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result.content[0].text
                        }
                    ])
            else:
                # josnContent = model_response.choices[0].message.content
                # sys = """
                # 将用户输入的 信息转换成符合规范的 json，参考如下规范
                # {"nodes":[{"id":"实体唯一ID","label":"实体显示名称","size":[80,60],"type":"rect","style":{"radius":8},"info":{"entityType":"实体类型（如Merchant）","其他字段":"..."}}],"edges":[{"source":"上层实体ID","target":"下层实体ID","label":"依赖关系名称（如：包含、关联）"}]}
                # """
                # josnMessage = [
                #     {"role": "system", "content": sys},
                #     {"role": "user", "content": josnContent }
                # ]
                # model_response = self.client.chat.completions.create(
                #     model="deepseek-chat",
                #     messages=josnMessage,
                #     response_format={"type": "json_object"}
                # )
                return model_response.choices[0].message.content


# 使用示例
async def main():
    # 初始化整合器
    integrator = DeepSeekOpenAIMCPIntegration()
    # 处理示例查询
    user_query = "查询大华商户 1000下门店关联的所有销售代表信息，返回规范的 json 格式，json 里面不包含换行"
    print(f"用户查询：{user_query}")
    try:
        await integrator.connect_to_sse_server()
        result = await integrator.process_query(user_query)
        print(f"最终回答：{result}")
    finally:
        await integrator.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
