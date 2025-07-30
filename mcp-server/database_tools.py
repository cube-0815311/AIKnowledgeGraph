import sqlite3
from typing import List, Dict, Any, Optional
import json
from contextlib import contextmanager


# 数据库管理器
class DatabaseManager:
    """数据库连接管理器"""

    def __init__(self, db_path: str):
        self.db_path = db_path

    @contextmanager
    def get_connection(self):
        """获取数据库连接的上下文管理器"""
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
        finally:
            conn.close()

    def execute_query(self, table: str, code_field: str, name_field: str,
                      codes: Optional[List[str]] = None, names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """执行查询"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # 获取所有列名
            cursor.execute(f"PRAGMA table_info({table})")
            columns = [info[1] for info in cursor.fetchall()]

            # 构建 WHERE 条件
            conditions = []
            params = []

            if codes:
                placeholders = ','.join('?' * len(codes))
                conditions.append(f"{code_field} IN ({placeholders})")
                params.extend(codes)
            if names:
                placeholders = ','.join('?' * len(names))
                conditions.append(f"{name_field} IN ({placeholders})")
                params.extend(names)

            if not conditions:
                raise ValueError("至少需要提供 codes 或 names 中的一项")

            where_clause = " OR ".join(conditions)
            sql = f"SELECT * FROM {table} WHERE {where_clause}"

            cursor.execute(sql, params)
            rows = cursor.fetchall()

            # 将结果转为字典列表
            result = [dict(zip(columns, row)) for row in rows]
            return result


# 全局数据库管理器实例
_db_manager: Optional[DatabaseManager] = None


def init_database(db_path: str):
    """初始化全局数据库管理器"""
    global _db_manager
    _db_manager = DatabaseManager(db_path)


def get_db_manager() -> DatabaseManager:
    """获取数据库管理器实例"""
    if _db_manager is None:
        raise RuntimeError("数据库未初始化，请先调用 init_database()")
    return _db_manager

def query_dept(codes: Optional[List[str]] = None, names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """查询部门表"""
    manager = get_db_manager()
    return manager.execute_query("dept", "dept_code", "dept_name", codes, names)

def query_merchant(codes: Optional[List[str]] = None, names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """查询商户表"""
    manager = get_db_manager()
    return manager.execute_query("merchant", "merchant_code", "merchant_name", codes, names)

def query_store(codes: Optional[List[str]] = None, names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """查询门店表"""
    manager = get_db_manager()
    return manager.execute_query("store", "merchant_code", None, codes, None)

def query_sales_rep(codes: Optional[List[str]] = None, names: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """查询销售代表表"""
    manager = get_db_manager()
    return manager.execute_query("sales_rep", "store_code", None, codes, None)


# 使用示例
if __name__ == "__main__":
    # 1. 初始化数据库
    init_database("scenario.db")

    # 2. 直接调用查询方法
    print("=== 直接调用查询 ===")
    merchants = query_sales_rep(codes=["S0005", "S0016"])
    print("商户查询结果:", merchants)

    # 4. 通过 MCP 框架执行工具
    print("\n=== MCP 工具执行 ===")
    # 这里假设 MCP 框架会自动处理工具调用