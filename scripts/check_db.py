import sqlite3

def check_vote_results():
    try:
        conn = sqlite3.connect('fundchain.db')
        cursor = conn.cursor()
        
        # Проверяем данные в таблице vote_results
        cursor.execute('SELECT * FROM vote_results')
        rows = cursor.fetchall()
        print('Total vote_results rows:', len(rows))
        print('First 5 vote_results rows:')
        for row in rows[:5]:
            print(row)
        
        # Проверяем данные по раунду 2
        cursor.execute('SELECT * FROM vote_results WHERE round_id = 2')
        round2_rows = cursor.fetchall()
        print('\nRound 2 vote_results rows:', len(round2_rows))
        print('Round 2 results:')
        for row in round2_rows[:5]:
            print(row)
        
        # Проверяем данные в таблице voting_rounds
        cursor.execute('SELECT * FROM voting_rounds')
        rounds = cursor.fetchall()
        print('\nVoting rounds:')
        for round_data in rounds:
            print(round_data)
        
    except Exception as e:
        print(f'Error: {e}')
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    check_vote_results()