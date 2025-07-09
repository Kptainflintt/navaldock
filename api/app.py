from flask import Flask, jsonify, request
import redis
import json
import os
import random

app = Flask(__name__)

# Connexion Redis selon variables d'environnement Docker
redis_host = os.environ.get('REDIS_HOST', 'localhost')
redis_port = os.environ.get('REDIS_PORT', 6379)
r = redis.Redis(host=redis_host, port=redis_port, db=0)

@app.route('/')
def home():
    return jsonify({"status": "ok", "message": "API Bataille Navale opérationnelle"})

@app.route('/new_game', methods=['POST'])
def new_game():
    game_id = random.randint(1000, 9999)
    game_data = {
        'board_player1': create_empty_board(),
        'board_player2': create_empty_board(),
        'turn': 'player1',
        'game_over': False,
        'player1_ready': False,
        'player2_ready': False,
        'player1_ships': [],
        'player2_ships': []
    }
    r.set(f'game:{game_id}', json.dumps(game_data))
    return jsonify({"game_id": game_id})

@app.route('/join_game/<int:game_id>', methods=['POST'])
def join_game(game_id):
    game_key = f'game:{game_id}'
    if not r.exists(game_key):
        return jsonify({"status": "error", "message": "Game not found"}), 404
    
    return jsonify({"status": "ok", "game_id": game_id})

@app.route('/player_ready/<int:game_id>', methods=['POST'])
def player_ready(game_id):
    data = request.json
    player_type = data.get('player_type')
    ships = data.get('ships', [])
    
    game_key = f'game:{game_id}'
    if not r.exists(game_key):
        return jsonify({"status": "error", "message": "Game not found"}), 404
    
    game_data = json.loads(r.get(game_key))
    
    # Marquer le joueur comme prêt et sauvegarder ses navires
    if player_type == 'player1':
        game_data['player1_ready'] = True
        game_data['player1_ships'] = ships
    elif player_type == 'player2':
        game_data['player2_ready'] = True
        game_data['player2_ships'] = ships
    
    r.set(game_key, json.dumps(game_data))
    
    return jsonify({
        "status": "ok", 
        "both_ready": game_data['player1_ready'] and game_data['player2_ready']
    })

@app.route('/game_status/<int:game_id>', methods=['GET'])
def game_status(game_id):
    game_key = f'game:{game_id}'
    if not r.exists(game_key):
        return jsonify({"status": "error", "message": "Game not found"}), 404
    
    game_data = json.loads(r.get(game_key))
    
    return jsonify({
        "status": "ok",
        "both_players_ready": game_data['player1_ready'] and game_data['player2_ready'],
        "turn": game_data['turn'],
        "game_over": game_data['game_over']
    })

@app.route('/attack/<int:game_id>', methods=['POST'])
def attack(game_id):
    data = request.json
    player = data.get('player')
    row = data.get('row')
    col = data.get('col')
    
    game_key = f'game:{game_id}'
    if not r.exists(game_key):
        return jsonify({"status": "error", "message": "Game not found"}), 404
    
    game_data = json.loads(r.get(game_key))
    
    # Vérifier si c'est bien le tour du joueur
    if game_data['turn'] != player:
        return jsonify({"status": "error", "message": "Not your turn"}), 400
    
    # Déterminer le joueur cible et vérifier si l'attaque touche un navire
    target_ships = 'player2_ships' if player == 'player1' else 'player1_ships'
    hit = False
    
    for ship in game_data[target_ships]:
        positions = ship.get('positions', [])
        for pos in positions:
            if pos[0] == row and pos[1] == col:
                hit = True
                # Marquer la position comme touchée
                positions.remove(pos)
                break
        if hit:
            break
    
    # Basculer le tour
    game_data['turn'] = 'player2' if player == 'player1' else 'player1'
    
    # Vérifier si le jeu est terminé (tous les navires d'un joueur sont coulés)
    ships_remaining_player1 = sum(len(ship.get('positions', [])) for ship in game_data['player1_ships'])
    ships_remaining_player2 = sum(len(ship.get('positions', [])) for ship in game_data['player2_ships'])
    
    if ships_remaining_player1 == 0 or ships_remaining_player2 == 0:
        game_data['game_over'] = True
    
    # Sauvegarder l'état du jeu
    r.set(game_key, json.dumps(game_data))
    
    return jsonify({
        "status": "ok", 
        "hit": hit, 
        "game_over": game_data['game_over']
    })

def create_empty_board():
    return [[0 for _ in range(10)] for _ in range(10)]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
