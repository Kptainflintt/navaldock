let gameId = null, size = 0;

function renderBoard(hits) {
  let html = `<table>`;
  for (let i=0; i<size; ++i) {
    html += `<tr>`;
    for (let j=0; j<size; ++j) {
      let v = hits[i][j];
      let color = v===2 ? "red" : v===1 ? "gray" : "lightblue";
      let label = v===2 ? "X" : v===1 ? "•" : "";
      html += `<td data-x="${i}" data-y="${j}" style="width:32px;height:32px;background:${color};text-align:center;font-size:20px;cursor:pointer">${label}</td>`;
    }
    html += `</tr>`;
  }
  html += `</table>`;
  document.getElementById("board").innerHTML = html;
  document.querySelectorAll("#board td").forEach(td => {
    td.onclick = shootHandler;
  });
}

function startNewGame() {
  fetch('/api/new_game', {method:'POST'})
    .then(r => r.json())
    .then(d => {
      gameId = d.game_id;
      size = d.size;
      document.getElementById("status").textContent = "Nouvelle partie ID: "+gameId;
      fetch(`/api/state/${gameId}`)
        .then(res => res.json())
        .then(data => renderBoard(data.hits));
    });
}

function shootHandler(e) {
  const x = +this.dataset.x, y = +this.dataset.y;
  fetch(`/api/shoot/${gameId}`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({x, y})
  })
  .then(r => r.json())
  .then(d => {
    document.getElementById("status").textContent = d.result;
    fetch(`/api/state/${gameId}`).then(res => res.json()).then(data => renderBoard(data.hits));
  });
}

document.getElementById('new-game').onclick = startNewGame;
