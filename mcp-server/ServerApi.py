from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import random
from typing import List, Dict, Any

app = Flask(__name__)
CORS(app)  # 处理跨域请求


# 模拟知识图谱数据
def mock_book_knowledge_graph(book_title: str) -> Dict[str, Any]:
    """生成模拟的书籍知识图谱数据"""
    # 书籍基本信息
    book_info = {
        "title": book_title,
        "author": f"作者{random.randint(1, 10)}",
        "publisher": f"出版社{random.randint(1, 5)}",
        "year": random.randint(2000, 2023),
        "category": random.choice(["计算机科学", "文学", "历史", "科学", "哲学"])
    }

    # 生成相关概念
    concepts = [
        {"name": "人工智能", "type": "技术", "level": 1},
        {"name": "机器学习", "type": "技术", "level": 2},
        {"name": "自然语言处理", "type": "技术", "level": 2},
        {"name": "神经网络", "type": "技术", "level": 3},
        {"name": "深度学习", "type": "技术", "level": 3},
        {"name": "数据结构", "type": "学科", "level": 1},
        {"name": "算法", "type": "学科", "level": 1},
        {"name": "编程语言", "type": "学科", "level": 1},
        {"name": "Python", "type": "工具", "level": 2},
        {"name": "Java", "type": "工具", "level": 2},
        {"name": "C++", "type": "工具", "level": 2}
    ]

    # 为当前书籍随机选择一些概念
    selected_concepts = random.sample(concepts, random.randint(3, 7))

    # 生成关系
    relations = []
    for concept in selected_concepts:
        relation_type = random.choice(["涉及", "讨论", "应用", "研究"])
        relations.append({
            "source": book_title,
            "target": concept["name"],
            "type": relation_type,
            "weight": random.uniform(0.5, 1.0)
        })

    # 生成概念之间的关系
    for i in range(len(selected_concepts) - 1):
        for j in range(i + 1, len(selected_concepts)):
            if random.random() > 0.7:  # 70%的概率生成概念间关系
                relation_type = random.choice(["关联", "依赖", "扩展", "对比"])
                relations.append({
                    "source": selected_concepts[i]["name"],
                    "target": selected_concepts[j]["name"],
                    "type": relation_type,
                    "weight": random.uniform(0.3, 0.8)
                })

    # 构建节点列表
    nodes = [{"id": book_title, "type": "book", "level": 0}]
    nodes.extend([{"id": concept["name"], "type": concept["type"], "level": concept["level"]}
                  for concept in selected_concepts])

    # 构建完整的知识图谱
    knowledge_graph = {
        "nodes": nodes,
        "links": relations,
        "book_info": book_info
    }

    return knowledge_graph


# 模拟书籍列表
def get_mock_books() -> List[Dict[str, Any]]:
    """获取模拟的书籍列表"""
    books = [
        {"id": 1, "title": "Python数据分析实战", "author": "张三", "year": 2022, "category": "计算机科学"},
        {"id": 2, "title": "机器学习基础", "author": "李四", "year": 2021, "category": "计算机科学"},
        {"id": 3, "title": "深度学习入门", "author": "王五", "year": 2020, "category": "计算机科学"},
        {"id": 4, "title": "数据结构与算法", "author": "赵六", "year": 2019, "category": "计算机科学"},
        {"id": 5, "title": "自然语言处理实战", "author": "钱七", "year": 2022, "category": "计算机科学"},
        {"id": 6, "title": "人工智能原理", "author": "孙八", "year": 2021, "category": "计算机科学"},
        {"id": 7, "title": "Java编程思想", "author": "周九", "year": 2018, "category": "计算机科学"},
        {"id": 8, "title": "计算机网络", "author": "吴十", "year": 2020, "category": "计算机科学"},
        {"id": 9, "title": "操作系统", "author": "郑十一", "year": 2019, "category": "计算机科学"},
        {"id": 10, "title": "数据库系统概念", "author": "王十二", "year": 2021, "category": "计算机科学"}
    ]
    return books


# API接口
@app.route('/api/books', methods=['GET'])
def get_books():
    """获取书籍列表"""
    return jsonify(get_mock_books())


@app.route('/api/knowledge-graph/<book_title>', methods=['GET'])
def get_knowledge_graph(book_title):
    """获取指定书籍的知识图谱"""
    graph = mock_book_knowledge_graph(book_title)
    return jsonify(graph)


if __name__ == '__main__':
    app.run(debug=True, port=5000)