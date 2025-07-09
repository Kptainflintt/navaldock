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
        'game_over': False
    }
    r.set(f'game:{game_id}', json.dumps(game_data))
    return jsonify({"game_id": game_id})

@app.route('/place/<int:game_id>', methods=['POST'])
def place_ship(game_id):
    # Code pour le placement des bateaux
    # ...
    return jsonify({"status": "ok"})

@app.route('/attack/<int:game_id>', methods=['POST'])
def attack(game_id):
    # Code pour les attaques
    # ...
    return jsonify({"result": "hit/miss"})

def create_empty_board():
    return [[0 for _ in range(10)] for _ in range(10)]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
