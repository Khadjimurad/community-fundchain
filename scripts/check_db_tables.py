import sqlite3
import os

def check_database_tables():
    """检查数据库中的表和数据"""
    try:
        # 连接到数据库
        conn = sqlite3.connect('/app/fundchain.db')
        cursor = conn.cursor()
        
        # 列出所有表
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("数据库中的表:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # 检查一些关键表的数据
        if tables:
            for table_name in [t[0] for t in tables]:
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                count = cursor.fetchone()[0]
                print(f"\n表 '{table_name}' 中的记录数: {count}")
                
                # 显示前几行数据作为示例
                if count > 0:
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
                    rows = cursor.fetchall()
                    print(f"表 '{table_name}' 的前3行数据:")
                    for row in rows:
                        print(f"  {row}")
        else:
            print("数据库中没有表")
        
    except Exception as e:
        print(f"检查数据库时出错: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_database_tables()