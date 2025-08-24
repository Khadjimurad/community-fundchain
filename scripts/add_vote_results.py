import sqlite3

def add_vote_results():
    try:
        conn = sqlite3.connect('fundchain.db')
        cursor = conn.cursor()
        
        # Проекты
        projects = ['tp_01', 'tp_02', 'tp_03', 'tp_04', 'tp_05']
        
        # Добавляем результаты для раунда 2
        for idx, project_id in enumerate(projects, 1):
            cursor.execute('''
                INSERT INTO vote_results 
                (round_id, project_id, for_weight, against_weight, abstained_count, 
                 not_participating_count, borda_points, final_priority) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (2, project_id, 7, 3, 2, 1, 21, idx))
            print(f'Added vote result for {project_id}')
        
        # Сохраняем изменения
        conn.commit()
        print('Done adding vote results')
        
    except Exception as e:
        print(f'Error: {e}')
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    add_vote_results()