async function fetchJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

async function load() {
  try {
    const projects = await fetchJSON("http://127.0.0.1:8000/projects");
    const votes = await fetchJSON("http://127.0.0.1:8000/votes/priority/summary");
    const me = await fetchJSON("http://127.0.0.1:8000/me/stats");

    const votesById = {};
    for (const v of votes) votesById[v.projectId] = v;

    const tbody = document.querySelector("#projects tbody");
    tbody.innerHTML = "";
    for (const p of projects) {
      const v = votesById[p.id] || { forWeight: 0, againstWeight: 0, abstained: 0, turnout: 0 };
      const lacking = p.target; // demo value
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>—</td>
        <td>0 / ${p.target}</td>
        <td>${lacking}</td>
        <td>${v.forWeight} / ${v.againstWeight} / ${v.abstained} / ${v.turnout}</td>
        <td><button>Поддержать</button></td>
      `;
      tbody.appendChild(tr);
    }

    document.getElementById("me").textContent = JSON.stringify(me);
  } catch (e) {
    document.getElementById("me").textContent = "API недоступно. Запустите backend: uvicorn app.main:app --reload";
  }
}

load();
