import sqlite3

def check_voting_rounds():
    """Проверка данных о голосовании в базе данных"""
    try:
        # Подключение к базе данных
        conn = sqlite3.connect('/app/fundchain.db')
        cursor = conn.cursor()
        
        # Получаем информацию о столбцах таблицы voting_rounds
        cursor.execute("PRAGMA table_info(voting_rounds)")
        columns = cursor.fetchall()
        print("Структура таблицы voting_rounds:")
        for i, col in enumerate(columns):
            print(f"{i}: {col[1]} ({col[2]})")
        
        # Проверка данных о раундах голосования
        cursor.execute("SELECT * FROM voting_rounds")
        rounds = cursor.fetchall()
        
        print("\nДанные о раундах голосования:")
        for round_data in rounds:
            print(f"Раунд {round_data[0]}:")
            for i, value in enumerate(round_data):
                print(f"  {columns[i][1]}: {value}")
            print()
        
        print("\nСодержимое запроса на расчет явки:")
        # Проверяем запрос, который используется для расчета явки
        cursor.execute("SELECT round_id, project_id, for_weight, against_weight, abstained_count, not_participating_count FROM vote_results")
        results = cursor.fetchall()
        for result in results:
            print(f"Проект {result[1]} (раунд {result[0]}):")
            print(f"  За: {result[2]}, Против: {result[3]}, Воздержались: {result[4]}, Не участвовали: {result[5]}")
        
    except Exception as e:
        print(f"Ошибка при проверке данных: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    check_voting_rounds()