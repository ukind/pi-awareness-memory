export function renderHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Pi Memory Dashboard</title>
<style>
body{font-family:system-ui;max-width:800px;margin:2rem auto;padding:0 1rem}
h1{color:#333}
.card{border:1px solid #ddd;border-radius:8px;padding:1rem;margin:0.5rem 0}
.card h3{margin:0 0 0.5rem}
input,button{padding:0.5rem;font-size:1rem}
#results{margin-top:1rem}
</style>
</head>
<body>
<h1>Pi Memory Dashboard</h1>
<input id="search" placeholder="Search memories..." size="40">
<button onclick="searchMemories()">Search</button>
<div id="results"></div>
<h2>Profile</h2>
<div id="profile" class="card"></div>
<h2>All Memories</h2>
<div id="memories"></div>
<script>
async function searchMemories(){
  const q=document.getElementById('search').value;
  const r=await fetch('/api/memories?q='+encodeURIComponent(q));
  const data=await r.json();
  document.getElementById('results').innerHTML=
    data.map(m=>'<div class="card"><h3>'+m.key+'</h3><p>'+m.value+'</p></div>').join('');
}
async function loadProfile(){
  const r=await fetch('/api/profile');
  const p=await r.json();
  document.getElementById('profile').innerHTML='<pre>'+JSON.stringify(p,null,2)+'</pre>';
}
async function loadMemories(){
  const r=await fetch('/api/memories');
  const m=await r.json();
  document.getElementById('memories').innerHTML=
    m.map(x=>'<div class="card"><h3>'+x.key+'</h3><p>'+x.value+'</p></div>').join('');
}
loadProfile();loadMemories();
</script>
</body></html>`;
}
