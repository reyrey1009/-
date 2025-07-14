// 여기부터는 '식물 키우기' 게임 전체 로직
let growth = 0, gold = 0, clickPower = 1, rebirthLevel = 0;



<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>🌱 식물 키우기 Clicker Game v21</title>
  <style>
    body { margin:0; padding:0; background:#0d1f0d; color:#aefc93; font-family:'Courier New', monospace; font-size:1.2rem; text-align:center; }
    main, #shopScreen, #dexScreen { display:none; flex-direction:column; justify-content:center; align-items:center; height:100vh; }
    main.active, #shopScreen.active, #dexScreen.active { display:flex; }
    #plant { font-size:80px; margin:20px 0; }
    button { display:block; width:90%; max-width:400px; margin:10px auto; padding:16px; font-size:1.1rem; border:none; background:#2e7d32; color:white; cursor:pointer; border-radius:6px; }
    #resetButton { position:fixed; top:10px; right:10px; padding:10px 16px; font-size:1rem; background:#d32f2f; color:white; border:none; border-radius:5px; cursor:pointer; z-index:1000; }
    #feverIndicator { position:fixed; top:10px; left:10px; padding:8px 12px; background:#ffeb3b; color:#000; font-weight:bold; border-radius:4px; display:none; z-index:1000; }
    .stat { margin:8px 0; }
    .dexSection { margin-top:20px; border-top:1px dashed #aefc93; padding-top:10px; width:90%; max-width:600px; text-align:left; }
    .dexSection h3 { margin:5px 0; }
    .dexItem { margin:3px 0; font-size:1rem; word-break:keep-all; }
    .unlocked { color:#aefc93; }
    .locked { color:gray; }
    #rebirthBtn { background:#b71c1c; }
  </style>
</head>
<body>
  <button id="resetButton" onclick="attemptReset()">🔄 처음부터 다시하기</button>
  <div id="feverIndicator">🔥 Fever Time!</div>
  <main id="gameScreen" class="active">
    <h1>🌿 식물 키우기 Clicker v21</h1>
    <div class="stat">📘 현재 도감: <span id="dexTitle">기본 도감</span></div>
    <div id="plant">🌱</div>
    <div class="stat">📈 박건바보: <span id="growth">0</span></div>
    <div class="stat">💰 골드: <span id="gold">0</span></div>
    <div class="stat">💪 클릭력: <span id="clickPower">1</span></div>
    <div class="stat">⚙️ 자동속도: <span id="autoSpeed">1</span>점/초</div>
    <button onclick="waterPlant()">💧 물 주기 (+<span id="clickPowerDisplay">1</span>)</button>
    <button onclick="saveGame()">💾 저장</button>
    <button onclick="loadGame()">📂 불러오기</button>
    <button onclick="showDex()">📘 도감 보기</button>
    <button onclick="showShop()">🛒 상점</button>
    <button id="rebirthBtn" onclick="rebirth()">🔁 환생 (<span id="rebirthCostDisplay">15000</span>골드)</button>
  </main>

  <section id="shopScreen">
    <h2>🛒 상점</h2>
    <div>💪 클릭 강화 (비용: <span id="upgradeCost">50</span>G)</div>
    <button onclick="buyClickUpgrade()">구매</button>
    <div>⚙️ 자동 물주기 (비용: <span id="autoCost">100</span>G)</div>
    <button onclick="buyAutoGrow()">구매</button>
    <button onclick="returnToGame()">🔙 돌아가기</button>
  </section>

  <section id="dexScreen">
    <h2>📗 도감</h2>
    <div id="dexListContainer"></div>
    <button onclick="returnToGame()">🔙 돌아가기</button>
  </section>

  <script>
    let growth=0, gold=0, clickPower=1, rebirthLevel=0;
    const baseRebirthCost=15000;
    let plantDex=[false,false,false,false,false];

    const baseClickCost=50; let clickUpgradeLevel=0, clickUpgradeCost=baseClickCost;
    const baseAutoCost=100; let autoGrowLevel=0, autoGrowCost=baseAutoCost, autoGrowInterval;

    let clickCount=0, inFever=false;
    const feverThreshold=25, feverDuration=8000;

    // 식물 단계 및 도감 제목 정의 (모두 실제 식물 성장 과정)
    const allPlantStages = [
      // 1) 풀/잔디 성장: 새싹 → 어린잎 → 잎사귀 → 이삭 → 꽃
      ["🌱", "🌿", "🍃", "🌾", "🌸"],
      // 2) 나무 성장: 도토리 → 묘목 → 어린나무 → 성목 → 사과열매
      ["🌰", "🌱", "🌳", "🌲", "🍎"],
      // 3) 과일 덩굴류: 새싹 → 어린잎 → 꽃봉오리 → 꽃 → 포도송이
      ["🌱", "🌿", "🌼", "🌺", "🍇"],
      // 4) 화초류: 새싹 → 튤립 → 장미 → 해바라기 → 국화
      ["🌱", "🌷", "🌹", "🌻", "🌼"],
      // 5) 열대식물: 씨앗 → 야자 묘목 → 야자나무 → 코코넛 → 파인애플
      ["🌱", "🌴", "🌴", "🥥", "🍍"]
    ];
    const baseVals=[0,100,300,800,2000];
    const dexTitles=[
      "기본 도감",   // 풀/잔디
      "나무 도감",   // 도토리 나무
      "덩굴 도감",   // 과일 덩굴
      "화초 도감",   // 화초
      "열대 도감"    // 열대식물
    ];

    function getRebirthCost() {
      return Math.floor(baseRebirthCost * Math.pow(1.5, rebirthLevel));
    }

    function stageNeed(idx,lvl=rebirthLevel) {
      return Math.floor(baseVals[idx] * Math.pow(2, lvl) * (lvl+1));
    }

    const growthEl=document.getElementById("growth"), goldEl=document.getElementById("gold"),
          clickPowerEl=document.getElementById("clickPower"), clickPowerDisplay=document.getElementById("clickPowerDisplay"),
          upgradeCostEl=document.getElementById("upgradeCost"), autoCostEl=document.getElementById("autoCost"),
          autoSpeedEl=document.getElementById("autoSpeed"), plantEl=document.getElementById("plant"),
          dexListContainer=document.getElementById("dexListContainer"), dexTitle=document.getElementById("dexTitle"),
          feverIndicator=document.getElementById("feverIndicator"), gameScreen=document.getElementById("gameScreen"),
          shopScreen=document.getElementById("shopScreen"), dexScreen=document.getElementById("dexScreen"),
          rebirthBtn=document.getElementById("rebirthBtn"), rebirthCostDisplay=document.getElementById("rebirthCostDisplay");

    function updateDisplay() {
      growthEl.innerText=growth; goldEl.innerText=gold;
      clickPowerEl.innerText=clickPower; clickPowerDisplay.innerText=clickPower;
      upgradeCostEl.innerText=clickUpgradeCost; autoCostEl.innerText=autoGrowCost;
      autoSpeedEl.innerText=autoGrowLevel;
      dexTitle.innerText=dexTitles[rebirthLevel]||`환생 ${rebirthLevel}회차 도감`;
      rebirthCostDisplay.innerText=getRebirthCost();
      updatePlantStage();
    }

    function updatePlantStage() {
      const stages = allPlantStages[rebirthLevel] || allPlantStages[0];
      for (let i = stages.length - 1; i >= 0; i--) {
        if (growth >= stageNeed(i)) {
          plantEl.innerText = stages[i];
          plantDex[i] = true;
          break;
        }
      }
    }

    function updateDex() {
      dexListContainer.innerHTML = "";
      for (let d = 0; d <= rebirthLevel; d++) {
        const section = document.createElement("div");
        section.className = "dexSection";
        const title = document.createElement("h3");
        title.innerText = `📗 ${dexTitles[d]}`;
        section.appendChild(title);
        const stages = allPlantStages[d];
        for (let i = 0; i < stages.length; i++) {
          const item = document.createElement("div");
          item.className = "dexItem unlocked";
          const need = stageNeed(i, d);
          item.innerText = `${stages[i]} - 필요 성장: ${need}`;
          section.appendChild(item);
        }
        dexListContainer.appendChild(section);
      }
    }

    function waterPlant() {
      growth += clickPower; gold += clickPower; clickCount++;
      if (!inFever && clickCount >= feverThreshold) startFever();
      updateDisplay(); autoSave();
    }

    function startFever() {
      inFever = true; feverIndicator.style.display = "block"; clickPower *= 3;
      clearInterval(autoGrowInterval);
      autoGrowInterval = setInterval(() => { growth += autoGrowLevel; gold += autoGrowLevel; updateDisplay(); autoSave(); }, 500);
      setTimeout(endFever, feverDuration);
    }

    function endFever() {
      clickPower = Math.floor(clickPower / 3); inFever = false; clickCount = 0; feverIndicator.style.display = "none";
      clearInterval(autoGrowInterval); if(autoGrowLevel>0) startAutoGrow(); updateDisplay();
    }

    function buyClickUpgrade() {
      if(gold < clickUpgradeCost) { alert("골드 부족!"); return; }
      gold -= clickUpgradeCost; clickUpgradeLevel++; clickPower++;
      if(clickUpgradeLevel < 10) clickUpgradeCost = Math.floor(baseClickCost * Math.pow(1.2, clickUpgradeLevel));
      else clickUpgradeCost = baseClickCost + clickUpgradeLevel * 30;
      updateDisplay(); autoSave();
    }

    function buyAutoGrow() {
      if(gold < autoGrowCost) { alert("골드 부족!"); return; }
      gold -= autoGrowCost; autoGrowLevel++;
      if(autoGrowLevel < 10) autoGrowCost = Math.floor(baseAutoCost * Math.pow(1.2, autoGrowLevel));
      else autoGrowCost = baseAutoCost + autoGrowLevel * 50;
      startAutoGrow(); updateDisplay(); autoSave();
    }

    function startAutoGrow() {
      clearInterval(autoGrowInterval);
      autoGrowInterval = setInterval(() => { growth += autoGrowLevel; gold += autoGrowLevel; updateDisplay(); autoSave(); }, 1000);
    }

    function rebirth() {
      const cost = getRebirthCost(); const req = stageNeed(4) * 1.5;
      if(growth >= req && gold >= cost) { rebirthLevel++; growth=0; gold -= cost; plantDex=[false,false,false,false,false]; updateDisplay(); autoSave(); alert("환생 완료!"); }
      else alert("환생 조건 미달!");
    }

    function saveGame() {
      const data = { growth, gold, clickPower, clickUpgradeCost, autoGrowLevel, autoGrowCost, plantDex, rebirthLevel, clickUpgradeLevel };
      localStorage.setItem("plantGameSave_v21", JSON.stringify(data));
      alert("저장되었습니다!");
    }

    function loadGame() {
      if(localStorage.getItem("plantResetFlag_v11")==="true") { localStorage.removeItem("plantResetFlag_v11"); return; }
      const data = JSON.parse(localStorage.getItem("plantGameSave_v21"));
      if(data) {
        ({growth, gold, clickPower, clickUpgradeCost, autoGrowLevel, autoGrowCost, plantDex, rebirthLevel, clickUpgradeLevel} = data);
        if(autoGrowLevel>0) startAutoGrow();
        updateDisplay();
        alert("불러오기 완료!");
      } else alert("저장된 데이터가 없습니다.");
    }

    function showShop() { gameScreen.classList.remove("active"); shopScreen.classList.add("active"); }
    function showDex() { gameScreen.classList.remove("active"); dexScreen.classList.add("active"); updateDex(); }
    function returnToGame() { shopScreen.classList.remove("active"); dexScreen.classList.remove("active"); gameScreen.classList.add("active"); }

    let gamePassword = localStorage.getItem("plantGamePassword_v11");
    if(!gamePassword) { gamePassword = prompt("리셋 비밀번호 설정:"); if(gamePassword) localStorage.setItem("plantGamePassword_v11", gamePassword); }
    function attemptReset() { if(!confirm("정말 처음부터 다시하시겠습니까?")) return; const input = prompt("비밀번호:"); if(input===localStorage.getItem("plantGamePassword_v11")) { localStorage.removeItem("plantGameSave_v21"); localStorage.setItem("plantResetFlag_v11","true"); alert("초기화되었습니다!"); location.reload(); } else alert("비밀번호 틁림!"); }

    loadGame(); updateDisplay();
  </script>
</body>
</html>



console.log("식물 키우기 로직 로드 완료");
