from flask import Flask, jsonify, request
from flask_cors import CORS
import redis
import os
import random
import json

app = Flask(__name__)
CORS(app)

r = redis.Redis(host=os.environ.get('REDIS_HOST', 'redis'), port=6379, db=0, decode_responses=True)

PLATEAU_SIZE = 8
SHIPS = [3, 2, 2]  # Trois bateaux: taille 3, 2 et 2 cases

def new_board():
    board = [[0]*PLATEAU_SIZE for _ in range(PLATEAU_SIZE)]
    for ship_length in SHIPS:
        placed = False
        while not placed:
            x = random.randint(0, PLATEAU_SIZE-1)
            y = random.randint(0, PLATEAU_SIZE-1)
            horizontal = random.choice([True, False])
            try:
                # placement sans recouvrement
                if horizontal:
                    if y + ship_length > PLATEAU_SIZE: continue
                    if any(board[x][y+j] for j in range(ship_length)): continue
                    for j in range(ship_length): board[x][y+j] = 1
                else:
                    if x + ship_length > PLATEAU_SIZE: continue
                    if any(board[x+i][y] for i in range(ship_length)): continue
                    for i in range(ship_length): board[x+i][y] = 1
                placed = True
            except:
                continue
    return board

@app.route("/api/new_game", methods=["POST"])
def api_new_game():
    board = new_board()
    game_id = r.incr("games_counter")
    r.set(f"game:{game_id}:board", json.dumps(board))
    r.set(f"game:{game_id}:hits", json.dumps([[0]*PLATEAU_SIZE for _ in range(PLATEAU_SIZE)]))
    return jsonify(game_id=game_id, size=PLATEAU_SIZE)

@app.route("/api/shoot/<int:game_id>", methods=["POST"])
def api_shoot(game_id):
    data = request.get_json()
    x, y = data["x"], data["y"]

    board = json.loads(r.get(f"game:{game_id}:board"))
    hits = json.loads(r.get(f"game:{game_id}:hits"))

    if hits[x][y]:
        return jsonify(result="déjà tenté", sunk=False)

    if board[x][y] == 1:
        hits[x][y] = 2  # touché
        r.set(f"game:{game_id}:hits", json.dumps(hits))
        # Vérifie si le bateau est coulé
        sunk = False
        def is_sunk():
            for i in range(PLATEAU_SIZE):
                for j in range(PLATEAU_SIZE):
                    if board[i][j]==1 and hits[i][j]!=2:
                        return False
            return True
        if is_sunk():
            return jsonify(result="coulé !", sunk=True)
        else:
            return jsonify(result="touché", sunk=False)
    else:
        hits[x][y] = 1  # raté
        r.set(f"game:{game_id}:hits", json.dumps(hits))
        return jsonify(result="manqué", sunk=False)

@app.route("/api/state/<int:game_id>")
def state(game_id):
    hits = json.loads(r.get(f"game:{game_id}:hits"))
    return jsonify(hits=hits)

if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")
