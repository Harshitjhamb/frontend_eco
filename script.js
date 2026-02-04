const BACKEND_BASE = "https://python-backend-chxl.onrender.com";
const API_URL = "https://python-backend-chxl.onrender.com/api/combined_data";
const API_BASE = "https://python-backend-chxl.onrender.com/api";

function removeDuplicates(rows) {
  const seen = new Set();
  return rows.filter(r => {
    const key = JSON.stringify(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
const STATIONS = [
  "Alipur, Delhi - DPCC",
  "Anand Vihar, Delhi - DPCC",
  "Ashok Vihar, Delhi - DPCC",
  "Aya Nagar, Delhi - IMD",
  "Bawana, Delhi - DPCC",
  "Burari Crossing, Delhi - IMD",
  "Chandni Chowk, Delhi - IITM",
  "CRRI Mathura Road, Delhi - IMD",
  "Dr. Karni Singh Shooting Range, Delhi - DPCC",
  "DTU, Delhi - CPCB",
  "Dwarka-Sector 8, Delhi - DPCC",
  "IGI Airport (T3), Delhi - IMD",
  "IHBAS, Dilshad Garden, Delhi - CPCB",
  "ITO, Delhi - CPCB",
  "Jahangirpuri, Delhi - DPCC",
  "Jawaharlal Nehru Stadium, Delhi - DPCC",
  "Lodhi Road, Delhi - IITM",
  "Lodhi Road, Delhi - IMD",
  "Major Dhyan Chand National Stadium, Delhi - DPCC",
  "Mandir Marg, Delhi - DPCC",
  "Mundka, Delhi - DPCC",
  "Najafgarh, Delhi - DPCC",
  "Narela, Delhi - DPCC",
  "Nehru Nagar, Delhi - DPCC",
  "North Campus, DU, Delhi - IMD",
  "NSIT Dwarka, Delhi - CPCB",
  "Okhla Phase-2, Delhi - DPCC",
  "Patparganj, Delhi - DPCC",
  "Punjabi Bagh, Delhi - DPCC",
  "Pusa, Delhi - DPCC",
  "Pusa, Delhi - IMD",
  "R K Puram, Delhi - DPCC",
  "Rohini, Delhi - DPCC",
  "Shadipur, Delhi - CPCB",
  "Sirifort, Delhi - CPCB",
  "Sonia Vihar, Delhi - DPCC",
  "Sri Aurobindo Marg, Delhi - DPCC",
  "Vivek Vihar, Delhi - DPCC",
  "Wazirpur, Delhi - DPCC"
];
let currentData = null;
let miniChart = null;
let mainChart = null;
function toggleAll(el) {
  const parent = el.closest(".form-group");
  if (!parent) return;

  const checkboxes = parent.querySelectorAll("input[type='checkbox']");
  if (checkboxes.length === 0) return;

  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => (cb.checked = !allChecked));

  // update dependent UI when toggling select-all on pollutant/weather
  updateAggregationFieldOptions();
  updateGroupByOptions();
  updateHavingFieldOptions();
}
function normalizePollutantData(p) {
  if (!p) return null;
  return {
    pm25: p.pm25_ug_m3,
    pm10: p.PM10,
    so2: p.so2_ug_m3,
    no2: p.no2_ug_m3,
    o3: p.OZONE,
    co: p.CO,
    nh3: p.NH3,
    aqi: p.aqi,
    location: p.location_name || p.station_name,
    time: p.reading_time,
    date: p.reading_date
  };
}
function addHavingRow() {
  const container = document.getElementById("having-rows");
  const row = document.createElement("div");
  row.className = "form-row having-row";

  row.innerHTML = `
        <div class="col-third">
            <select class="dark-input having-field">
                <option value="">Select aggregated field</option>
            </select>
        </div>

        <div class="col-third">
            <select class="dark-input having-cond">
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="=">=</option>
                <option value="!=">!=</option>
            </select>
        </div>

        <div class="col-third">
            <input type="number" class="dark-input having-value" placeholder="Value">
        </div>

        <button type="button" class="btn-footer btn-reset having-remove"
            style="margin-top:8px;">Remove</button>
    `;

  row.querySelector(".having-remove").onclick = () => row.remove();

  container.appendChild(row);
  updateHavingFieldOptions();
}
function updateOrderByOptions() {
  const orderSelect = document.getElementById("order-by-field");
  const groupSelect = document.getElementById("groupby-fields");
  if (!orderSelect || !groupSelect) return;

  const oldValue = orderSelect.value; // ✅ remember previously selected value

  const { selectedMeta } = getSelectedDbFields(); // pollutants + weather
  const selectedGroupFields = Array.from(groupSelect.selectedOptions).map(opt => ({
    value: opt.value,
    label: opt.textContent
  }));

  orderSelect.innerHTML = ""; // reset dropdown

  // ✅ ALWAYS include Location Name
  orderSelect.appendChild(new Option("Location Name", "pr.location_name"));

  // ✅ If grouping → only allow grouped fields
  if (selectedGroupFields.length > 0) {
    selectedGroupFields.forEach(f =>
      orderSelect.appendChild(new Option(f.label, f.value))
    );
  } else {
    // ✅ Otherwise allow ordering by selected pollutants/weather
    selectedMeta.forEach(f =>
      orderSelect.appendChild(new Option(f.label, f.col))
    );
  }

  // ✅ Restore old selection if still available
  if (oldValue && [...orderSelect.options].some(o => o.value === oldValue)) {
    orderSelect.value = oldValue;
  }
}
async function loadAdvStations() {
  const box = document.getElementById("adv-station-list");
  if (!box) return;

  box.innerHTML = "Loading...";

  try {
    const res = await fetch(`${API_BASE}/station`);
    const data = await res.json();
    console.log("FULL RESPONSE =", data);

    // ✅ Normalize response whether backend returns {stations: [...]} or [...]
    const stations = Array.isArray(data.stations)
      ? data.stations
      : Array.isArray(data)
        ? data
        : [];

    if (!stations.length) {
      box.innerHTML = `<span style="color:red;">No stations found</span>`;
      return;
    }

    box.innerHTML = stations
      .map(st => `
    <label>
      <input type="checkbox"
             value="${st.station_id}"
             data-name="${st.name}">
      ${st.name}
    </label>
  `)
      .join("");

  } catch (err) {
    console.error("Failed to load stations:", err);
    box.innerHTML = `<span style="color:red;">Failed to load stations</span>`;
  }
}
function updateAggregationFieldOptions() {
  const { selectedMeta } = getSelectedDbFields();

  // Update all dynamic aggregation selects
  document.querySelectorAll(".agg-field").forEach(select => {
    const oldValue = select.value;
    select.innerHTML = `<option value="">Select field</option>`;

    selectedMeta.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.col;
      opt.textContent = f.label;
      select.appendChild(opt);
    });

    if (oldValue && Array.from(select.options).some(o => o.value === oldValue)) {
      select.value = oldValue;
    }
  });
}
function updateGroupByOptions() {
  const select = document.getElementById("groupby-fields");
  if (!select) return;

  const { selectedMeta } = getSelectedDbFields();
  const selectedStations = getSelectedStationsForGrouping();

  select.innerHTML = "";

  // Special system fields
  const specialFields = [
    { value: "pr.location_name", text: "Station Name" },
    { value: "pr.reading_date", text: "Reading Date" },
    { value: "HOUR(pr.reading_time)", text: "Reading Hour" }
  ];

  specialFields.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.value;
    opt.textContent = s.text;
    select.appendChild(opt);
  });

  // USER SELECTED STATION NAMES
  selectedStations.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.id;                // used in SQL
    opt.textContent = st.name;        // UI label
    select.appendChild(opt);
  });

  // USER SELECTED POLLUTANTS / WEATHER FIELDS
  selectedMeta.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.col;
    opt.textContent = f.label;
    select.appendChild(opt);
  });
}
function updateHavingFieldOptions() {
  const rows = document.querySelectorAll(".having-row");
  const aggregations = getAggregations();
  const { selectedMeta } = getSelectedDbFields();
  const selectedStations = getSelectedStationsForGrouping();

  rows.forEach(row => {
    const select = row.querySelector(".having-field");
    const oldValue = select.value;

    select.innerHTML = `<option value="">None</option>`;

    // Aggregated fields
    aggregations.forEach(agg => {
      const label = `${agg.func}(${getPrettyName(agg.field)})`;
      const opt = document.createElement("option");
      opt.value = agg.alias;
      opt.textContent = label;
      select.appendChild(opt);
    });

    // Raw user-selected fields
    selectedMeta.forEach(f => {
      const opt = document.createElement("option");
      opt.value = f.col;
      opt.textContent = f.label;
      select.appendChild(opt);
    });

    // Special
    const special = [
      { value: "pr.location_name", text: "Station Name" },
      { value: "pr.reading_date", text: "Reading Date" },
      { value: "HOUR(pr.reading_time)", text: "Reading Hour" }
    ];

    special.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.value;
      opt.textContent = s.text;
      select.appendChild(opt);
    });

    // Individual station names (NEW)
    selectedStations.forEach(st => {
      const opt = document.createElement("option");
      opt.value = st.id;
      opt.textContent = st.name;
      select.appendChild(opt);
    });

    if (oldValue && Array.from(select.options).some(o => o.value === oldValue)) {
      select.value = oldValue;
    }
  });
}
function addAggregationRow() {
  const container = document.getElementById("agg-rows");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "agg-row";

  row.innerHTML = `
    <select class="agg-func dark-input">
      <option value="">Select function</option>
      <option value="AVG">AVG</option>
      <option value="SUM">SUM</option>
      <option value="MAX">MAX</option>
      <option value="MIN">MIN</option>
      <option value="COUNT">COUNT</option>
    </select>

    <select class="agg-field dark-input">
      <option value="">Select field</option>
    </select>

    <button type="button" class="remove-agg btn-footer">X</button>
  `;

  container.appendChild(row);

  // RELOAD FIELD OPTIONS — FIX for "Select field" not working
  updateAggregationFieldOptions();

  // Remove row
  row.querySelector(".remove-agg").addEventListener("click", () => {
    row.remove();
    updateHavingFieldOptions();
  });
}
function getPrettyName(col) {
  const map = {
    "md.temperature_c": "Temperature",
    "md.humidity_percent": "Humidity",
    "md.pressure_hpa": "Pressure",
    "md.wind_kph": "Wind",
    "md.clouds_percent": "Clouds",
    "md.precipitation_prob": "Rain",
    "pr.pm25_ug_m3": "PM2.5",
    "pr.PM10": "PM10",
    "pr.so2_ug_m3": "SO2",
    "pr.no2_ug_m3": "NO2",
    "pr.OZONE": "O3",
    "pr.NH3": "NH3",
    "pr.CO": "CO",
    "pr.aqi": "AQI"
  };
  return map[col] || col;
}
async function handleLogin() {
  const fname = document.getElementById("fname").value.trim();
  const lname = document.getElementById("lname").value.trim();
  const mname = document.getElementById("mname").value.trim();
  const age = Number(document.getElementById("age").value);
  const loc = document.getElementById("location-input").value.trim();
  if (!fname || !lname || !age || !loc)
    return alert("All fields are required.");

  const username = `${fname.toLowerCase()}.${lname.toLowerCase()}`;

  const userData = {
    first_name: fname,
    last_name: lname,
    middle_name: mname,
    user_name: username,
    age: age
  };

  await fetch(`${API_BASE}/register_user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });

  // Store user locally
  localStorage.setItem("eco_user", username);
  localStorage.setItem("eco_loc", loc);
  localStorage.setItem("eco_user_age", age);

  window.location.href = "dashboard.html";
}
const switcher = document.getElementById("stationSwitcher");
if (switcher) {
  // Populate dropdown
  STATIONS.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    switcher.appendChild(opt);
  });

  // Load last saved station
  const saved = localStorage.getItem("eco_loc");
  if (saved) switcher.value = saved;

  // Handle switching
  switcher.addEventListener("change", async () => {
    const selectedName = switcher.value;

    // ✅ Save for dashboard + heading
    localStorage.setItem("eco_loc_name", selectedName);
    localStorage.setItem("eco_loc", selectedName); // until you switch to IDs

    // ✅ Update UI immediately
    const heading = document.getElementById("current-station");
    if (heading) heading.textContent = selectedName;

    const user = localStorage.getItem("eco_user");
    if (user) {
      try {
        const res = await fetch(
          `${API_BASE}/station_by_name?name=${encodeURIComponent(selectedName)}`
        );
        const station = await res.json();
        if (station && station.station_id) {
          await fetch(`${API_BASE}/update_favorite_station`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_name: user,
              station_id: station.station_id
            })
          });
        }
      } catch (err) {
        console.error("Favorite Station update failed:", err);
      }
    }

    // ✅ Refresh dashboard
    fetchData(selectedName);
  });

}
function getSelectedDbFields() {
  // Pollutants → DB column + nice label
  const pollutantMap = {
    "PM2.5": { col: "pr.pm25_ug_m3", label: "PM2.5" },
    "PM10": { col: "pr.PM10", label: "PM10" },
    "SO2": { col: "pr.so2_ug_m3", label: "SO2" },
    "NO2": { col: "pr.no2_ug_m3", label: "NO2" },
    "O3": { col: "pr.OZONE", label: "O3" },
    "NH3": { col: "pr.NH3", label: "NH3" },
    "CO": { col: "pr.CO", label: "CO" },
    "AQI": { col: "pr.aqi", label: "AQI" }
  };

  // Weather → DB column + nice label
  const weatherMap = {
    "temp": { col: "md.temperature_c", label: "Temperature" },
    "humid": { col: "md.humidity_percent", label: "Humidity" },
    "pres": { col: "md.pressure_hpa", label: "Pressure" },
    "wind": { col: "md.wind_kph", label: "Wind" },
    "clouds": { col: "md.clouds_percent", label: "Clouds" },
    "rain": { col: "md.precipitation_prob", label: "Rain" }
  };

  const selectedDbFields = [];          // array of DB columns
  const selectedMeta = [];              // [{label, col}]

  document
    .querySelectorAll(".checkbox-grid-3 input[type='checkbox']:checked")
    .forEach(cb => {
      const key = cb.value;
      let info = pollutantMap[key] || weatherMap[key];

      if (info && !selectedDbFields.includes(info.col)) {
        selectedDbFields.push(info.col);
        selectedMeta.push({ label: info.label, col: info.col });
      }
    });

  return { selectedDbFields, selectedMeta };
}
function getSelectedStationsForGrouping() {
  return Array.from(
    document.querySelectorAll("#adv-station-list input[type='checkbox']:checked")
  ).map(cb => ({
    id: cb.value,
    name: cb.dataset.name
  }));

}
function addAggregationRow() {
  const container = document.getElementById("aggregation-rows");
  if (!container) return;

  const row = document.createElement("div");
  row.className = "form-row agg-row";

  // function select
  const funcWrapper = document.createElement("div");
  funcWrapper.className = "col-third";
  const funcSelect = document.createElement("select");
  funcSelect.className = "dark-input agg-func";
  funcSelect.innerHTML = `
    <option value="">Select function</option>
    <option value="AVG">Average</option>
    <option value="SUM">Sum</option>
    <option value="MAX">Maximum</option>
    <option value="MIN">Minimum</option>
    <option value="COUNT">Count</option>
  `;
  funcWrapper.appendChild(funcSelect);

  // field select
  const fieldWrapper = document.createElement("div");
  fieldWrapper.className = "col-third";
  const fieldSelect = document.createElement("select");
  fieldSelect.className = "dark-input agg-field";
  fieldSelect.disabled = false;
  fieldWrapper.appendChild(fieldSelect);

  // alias input
  const aliasWrapper = document.createElement("div");
  aliasWrapper.className = "col-third";
  const aliasInput = document.createElement("input");
  aliasInput.type = "text";
  aliasInput.className = "dark-input agg-alias";
  aliasInput.placeholder = "Alias (optional)";
  aliasWrapper.appendChild(aliasInput);

  // remove button
  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "Remove";
  removeBtn.className = "btn-footer btn-reset";
  removeBtn.style.marginTop = "8px";
  removeBtn.addEventListener("click", () => {
    row.remove();
    updateHavingFieldOptions();
  });

  // events
  funcSelect.addEventListener("change", () => {
    updateAggregationFieldOptions();
    updateHavingFieldOptions();
  });
  fieldSelect.addEventListener("change", () => {
    updateHavingFieldOptions();
  });
  aliasInput.addEventListener("input", () => {
    updateHavingFieldOptions();
  });

  row.appendChild(funcWrapper);
  row.appendChild(fieldWrapper);
  row.appendChild(aliasWrapper);
  row.appendChild(removeBtn);

  container.appendChild(row);

  updateAggregationFieldOptions();
  updateHavingFieldOptions();
}
function getAggregations() {
  const rows = document.querySelectorAll(".agg-row");
  const aggregations = [];

  rows.forEach(row => {
    const func = row.querySelector(".agg-func")?.value;
    const field = row.querySelector(".agg-field")?.value;
    const aliasInput = row.querySelector(".agg-alias");
    const aliasRaw = aliasInput ? aliasInput.value.trim() : "";

    if (func && field) {
      const safeAlias =
        aliasRaw ||
        `${func.toLowerCase()}_${field.replace(/\./g, "_").replace(/\W+/g, "")}`;
      aggregations.push({
        func,
        field,
        alias: safeAlias
      });
    }
  });

  return aggregations;
}
function buildAndRunAdvancedSearch() {

  /* ----------------------------------
     1) BASIC INPUTS
  ---------------------------------- */
  const stations = Array.from(
    document.querySelectorAll("#adv-station-list input[type='checkbox']:checked")
  ).map(cb => `'${cb.value}'`);

  const startDate = document.getElementById("adv-start-date").value;
  const endDate = document.getElementById("adv-end-date").value;
  const startTime = document.getElementById("adv-start-time").value || "00:00";
  const endTime = document.getElementById("adv-end-time").value || "23:59";

  let orderByField = document.getElementById("order-by-field")?.value || "pr.location_name";
  const orderDir = document.getElementById("order-by-direction")?.value || "ASC";

  const groupFields = Array.from(
    document.getElementById("groupby-fields").selectedOptions
  ).map(opt => opt.value);

  const { selectedDbFields } = getSelectedDbFields();
  const aggregations = getAggregations();   // [{func, field, alias}]

  // Guard: GroupBy without aggregation → ask user to pick at least one agg
  if (groupFields.length > 0 && aggregations.length === 0) {
    alert("Please select at least one aggregation when using Group By.");
    return;
  }

  /* ----------------------------------
     2) SELECT CLAUSE
  ---------------------------------- */
  let selectCols = [];

  // Case A: aggregation and/or group-by
  if (aggregations.length > 0 || groupFields.length > 0) {

    // Add group-by columns to SELECT
    groupFields.forEach(g => {
      if (g === "HOUR(pr.reading_time)") {
        selectCols.push("HOUR(pr.reading_time) AS reading_hour");
      } else {
        selectCols.push(g);
      }
    });

    // Add aggregated columns
    aggregations.forEach(agg => {
      selectCols.push(`${agg.func}(${agg.field}) AS ${agg.alias}`);
    });

    // Ensure at least station name appears if nothing at all
    if (selectCols.length === 0) {
      selectCols.push("pr.location_name");
    }
  }

  // Case B: no aggregation, no group-by → raw rows
  if (aggregations.length === 0 && groupFields.length === 0) {
    selectCols.push("pr.location_name", "pr.reading_date", "pr.reading_time");
    selectCols = selectCols.concat(selectedDbFields);
  }

  // Safety: SELECT must have something
  //if (selectCols.length === 0) {
//selectCols.push("pr.location_name");
  //}

  /* ----------------------------------
     3) BASE SQL + JOIN
  ---------------------------------- */
  let sql = `
    SELECT ${selectCols.join(", ")}
    FROM pollutant_readings pr
    INNER JOIN meteorological_data md
      ON pr.station_id = md.station_id
     AND pr.reading_date = md.record_date
     AND HOUR(pr.reading_time) = HOUR(md.record_time)
    WHERE 1=1
  `;

  if (stations.length > 0)
    sql += ` AND pr.station_id IN (${stations.join(",")})`;
  if (startDate)
    sql += ` AND pr.reading_date >= '${startDate}'`;

  if (endDate)
    sql += ` AND pr.reading_date <= '${endDate}'`;

  sql += ` AND pr.reading_time >= '${startTime}'`;
  sql += ` AND pr.reading_time <= '${endTime}'`;


  /* ----------------------------------
     4) GROUP BY
  ---------------------------------- */
  if (groupFields.length > 0) {
    sql += ` GROUP BY ${groupFields.join(", ")}`;
  }

  /* ----------------------------------
     5) HAVING
  ---------------------------------- */
  let havingParts = [];

  document.querySelectorAll(".having-row").forEach(row => {
    const field = row.querySelector(".having-field")?.value;
    const cond = row.querySelector(".having-cond")?.value;
    const val = row.querySelector(".having-value")?.value;

    if (field && cond && val !== "") {
      havingParts.push(`${field} ${cond} ${val}`);
    }
  });

  if (havingParts.length > 0) {
    sql += ` HAVING ${havingParts.join(" AND ")}`;
  }

  /* ----------------------------------
     6) ORDER BY
  ---------------------------------- */
  if (orderByField) {
  sql += ` ORDER BY ${orderByField} ${orderDir}`;
} else {
  sql += ` ORDER BY pr.location_name ${orderDir}`;
}


  console.log("FINAL SQL:\n" + sql);

  /* ----------------------------------
     7) SEND TO BACKEND
  ---------------------------------- */
  fetch(`${BACKEND_BASE}/api/adv_search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql })
  })
    .then(r => r.json())
    .then(data => {
      if (!data || data.length === 0) {
        alert("No records found.");
        return;
      }

      sessionStorage.setItem("adv_search_results", JSON.stringify(data));
      window.location.href = "search_results.html";
    });

  closeModal("modal-search");
}
function showResults(data) {
  const uniqueRows = removeDuplicates(data);

  const tableHead = document.getElementById("results-thead");
  const tableBody = document.getElementById("results-tbody");

  if (!uniqueRows.length) {
    tableBody.innerHTML = `<tr><td colspan="5">No records found.</td></tr>`;
    return;
  }

  const columns = Object.keys(uniqueRows[0]);

  tableHead.innerHTML = `
        <tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr>
    `;

  tableBody.innerHTML = uniqueRows
    .map(
      r => `
            <tr>
                ${columns.map(c => `<td>${r[c] ?? "--"}</td>`).join("")}
            </tr>
        `
    )
    .join("");
}
document.addEventListener("DOMContentLoaded", async () => {
  const saved = localStorage.getItem("eco_loc_name");
  if (saved) {
    const heading = document.getElementById("current-station");
    if (heading) heading.textContent = saved;
  }
  const favBtn = document.getElementById("btn-fav-station");
  if (favBtn && typeof openFavModal === "function") {
    favBtn.addEventListener("click", openFavModal);
  }
  const addHavingBtn = document.getElementById("add-having-row");
  if (addHavingBtn) addHavingBtn.addEventListener("click", addHavingRow);
  const addAggBtn = document.getElementById("add-agg-row");
  if (addAggBtn) addAggBtn.addEventListener("click", addAggregationRow);
  if (document.body.classList.contains("page-login")) {
    initDropdown();
    loadRecent();
    return;
  }
  if (document.body.classList.contains("page-dashboard")) {
    const username = localStorage.getItem("eco_user");
    let loc = localStorage.getItem("eco_loc");
    let savedName = localStorage.getItem("eco_loc_name");
    let user = null;
    try {
      const res = await fetch(`${API_BASE}/get_user?user_id=${userid}`);
      user = await res.json();
    } catch (e) {
      console.error("User load error:", e);
    }
    if (!loc) {
      window.location.href = "search_results.html";
      return;
    }
    if (user && user.age != null) {
      localStorage.setItem("eco_user_age", user.age);
    }
    const navUser = document.getElementById("nav-user");
    if (navUser) {
      navUser.textContent = username;
    }
    const ageSpan = document.getElementById("nav-age");
    if (ageSpan && user && user.age != null) {
      ageSpan.textContent = user.age;
    }
    const currStation = document.getElementById("current-station");
    if (currStation) {
      currStation.textContent = savedName || loc;
    }
    fetchData(loc);
  }
  document.querySelectorAll(".close, .close-btn").forEach(btn => {
    btn.onclick = () => closeModal("modal-trend");
  });
  document.querySelectorAll(".checkbox-grid-3 input[type='checkbox']")
    .forEach(cb => {
      cb.addEventListener("change", () => {
        if (typeof updateAggregationFieldOptions === "function") updateAggregationFieldOptions();
        if (typeof updateGroupByOptions === "function") updateGroupByOptions();
        if (typeof updateOrderByOptions === "function") updateOrderByOptions();
        if (typeof updateHavingFieldOptions === "function") updateHavingFieldOptions();
      });
    });
});
async function fetchData(loc) {
  try {
    const res = await fetch(
      `${API_BASE}/combined_data?station=${encodeURIComponent(loc)}`
    );
    const raw = await res.json();
    console.log("Combined data:", raw);

    const pol = normalizePollutantData(raw.pollutant_data);
    const met = raw.meteorological_data_db;

    currentData = { pollutant_data: pol, meteo: met };
    updateDashboard(pol, met);
  } catch (err) {
    console.error("FETCH ERROR:", err);
  }
}
async function updateDashboard(pol, met) {
  window.lastPol = pol;
  window.lastMet = met;

  if (!pol || !met) return;

  // HERO SECTION
  setText("hero-temp", met.temperature_c !== null ? met.temperature_c : "--");
  setText("hero-condition", met.condition_main || "--");
  setText("temp-high", Math.round((met.temperature_c ?? 0) + 2));
  setText("temp-low", Math.round((met.temperature_c ?? 0) - 2));

  // AQI SECTION
  setText("aqi-val", pol.aqi ?? "--");

  let card = document.querySelector(".improved-aqi-card");
  card.className = "glass-panel aqi-panel improved-aqi-card";

  let status = "Good",
    col = "#2ecc71",
    glow = "aqi-glow-good";

  if (pol.aqi > 50) {
    status = "Moderate";
    col = "#f1c40f";
    glow = "aqi-glow-mod";
  }
  if (pol.aqi > 100) {
    status = "Poor";
    col = "#e67e22";
    glow = "aqi-glow-poor";
  }
  if (pol.aqi > 200) {
    status = "Very Poor";
    col = "#e74c3c";
    glow = "aqi-glow-vpoor";
  }
  if (pol.aqi > 300) {
    status = "Severe";
    col = "#8b0000";
    glow = "aqi-glow-severe";
  }

  const badge = document.getElementById("aqi-badge");
  badge.textContent = status;
  badge.style.backgroundColor = col;
  card.classList.add(glow);

  const aqiText = document.getElementById("aqi-text-lower");
  if (aqiText) aqiText.textContent = status.toLowerCase();

  // WEATHER TILES
  setText("val-humid", met.humidity_percent ?? "--");
  setText("val-press", met.pressure_hpa ?? "--");
  setText("val-wind", met.wind_kph ?? "--");
  setText("val-vis", met.visibility_km ?? "--");
  setText("val-feelslike", met.feels_like_c ?? "--");
  setText("val-winddir", met.wind_deg ?? "--");
  setText("val-windgust", met.wind_gust ?? "--");
  setText("val-condition", met.condition_main ?? met.condition_text ?? "--");

  // SUNRISE / SUNSET
  const sr = met.sunrise ? met.sunrise.slice(0, 5) : "--:--";
  const ss = met.sunset ? met.sunset.slice(0, 5) : "--:--";

  setText("sun-rise", sr);
  setText("sun-set", ss);

  // POLLUTANT DETAILS
  setText("val-pm25", pol.pm25 ?? "--");
  setText("val-pm10", pol.pm10 ?? "--");
  setText("val-so2", pol.so2 ?? "--");
  setText("val-no2", pol.no2 ?? "--");
  setText("val-o3", pol.o3 ?? "--");
  setText("val-co", pol.co ?? "--");
  setText("val-nh3", pol.nh3 ?? "--");

  // ICON STATE
  const humidIcon = document.querySelector(".humid-icon");
  if (humidIcon) {
    humidIcon.className = "weather-icon humid-icon";
    if (met.humidity_percent >= 70) humidIcon.classList.add("humid-dynamic");
  }

  const pressIcon = document.querySelector(".press-icon");
  if (pressIcon) {
    pressIcon.className = "weather-icon press-icon";
    if (met.pressure_hpa < 1000) pressIcon.classList.add("press-low");
    else if (met.pressure_hpa <= 1020) pressIcon.classList.add("press-normal");
    else pressIcon.classList.add("press-high");
  }

  const windIcon = document.querySelector(".wind-icon");
  if (windIcon) windIcon.className = "weather-icon wind-icon wind-dynamic";

  const visIcon = document.querySelector(".vis-icon");
  if (visIcon) visIcon.className = "weather-icon vis-icon";
  checkAQIWarning(pol.aqi);
  const selected = localStorage.getItem("eco_loc_name");
  if (selected) {
    document.getElementById("current-station").textContent = selected;
  }
  renderMiniChart();
}
function openFavModal() {
  const modal = document.getElementById("fav-modal");
  if (!modal) return;

  modal.style.display = "flex"; // or "block" depending on your CSS
}
function closeFavModal() {
  const modal = document.getElementById("fav-modal");
  if (!modal) return;

  modal.style.display = "none";
}
function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent =
    value !== undefined && value !== null && value !== "" ? value : "--";
}
async function checkAQIWarning(aqi) {
  const age = Number(localStorage.getItem("eco_user_age"));

  // No saved age → cannot evaluate risk
  if (!age) return;

  const tile = document.getElementById("aqi-warning");
  const text = document.getElementById("aqi-warning-text");

  if (!tile || !text) return;

  // reset
  tile.style.display = "none";
  tile.style.backgroundColor = "";

  // No warning needed
  if (aqi <= 100) return;

  const isSensitive = age < 18 || age > 60;

  // 🔴 Severe for everyone
  if (aqi >= 400) {
    tile.style.backgroundColor = "#B00020";
    text.textContent =
      "AQI is extremely hazardous for all users. Avoid going outdoors.";
    tile.style.display = "block";
    return;
  }

  // 🟧 Sensitive group warning
  if (isSensitive) {
    tile.style.backgroundColor = "#FF8C00";
    text.textContent =
      "AQI is unhealthy for your age group. Limit outdoor exposure.";
    tile.style.display = "block";
  }
}
function openTrendModal(pol, unit) {
  console.log("Trend card clicked:", pol, unit);
  const modal = document.getElementById("modal-trend");
  if (!modal) return;

  modal.style.display = "flex";

  setText("trend-title", pol);
  setText("trend-unit", unit);

  const displayKey = pol === "Temperature" ? "Temperature" : pol;

  setTimeout(() => {
    renderMainChart(displayKey);
  }, 200);
}
async function renderMiniChart() {
  const ctx = document.getElementById("miniTrendChart");
  if (!ctx) return;

  if (miniChart) miniChart.destroy();

  const trend = await getTempTrend();

  const labels = trend.map(r => (r.record_time || "").slice(0, 5));
  const data = trend.map(r => Number(r.temperature_c));

  miniChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Temp",
          data,
          borderWidth: 2,
          pointRadius: 3,
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: "#99AABB" },
          grid: { color: "rgba(255,255,255,0.05)" }
        },
        x: {
          ticks: { color: "#99AABB" },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
async function renderMainChart(lbl) {
  const canvas = document.getElementById("mainTrendChart");
  if (!canvas) return;

  if (mainChart) {
    mainChart.destroy();
  }

  const ctx = canvas.getContext("2d");
  const station = localStorage.getItem("eco_loc") || "";

  const colMap = {
    PM2_5: "pm25_ug_m3",
    "PM2.5": "pm25_ug_m3",
    PM10: "PM10",
    SO2: "so2_ug_m3",
    NO2: "no2_ug_m3",
    O3: "OZONE",
    NH3: "NH3",
    CO: "CO"
  };

  let trend = [];

  try {
    if (lbl === "Temperature") {
      trend = await getTempTrend();
    } else {
      const dbcol = colMap[lbl] || lbl;
      trend = await getTrendData(dbcol, station);
    }
  } catch (err) {
    console.error("Trend Fetch Error:", err);
    return;
  }

  if (!trend || trend.length === 0) {
    setText("trend-big-val", "--");
    setText("s-max", "--");
    setText("s-min", "--");
    setText("s-avg", "--");
    return;
  }

  // --------------------------------------------------
  // Build proper Date objects: reading_date + reading_time
  // --------------------------------------------------
  const combined = trend.map(r => {
    const rawDate = r.reading_date || r.record_date;
    const rawTime = r.reading_time || r.record_time || "";

    const time = rawTime.slice(0, 5); // "HH:MM"

    let dt;
    if (rawDate && time.includes(":")) {
      const base = new Date(rawDate); // e.g. "Sun, 23 Nov 2025 00:00:00 GMT"
      const [hh, mm] = time.split(":");
      base.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
      dt = base;
    } else {
      dt = new Date(NaN); // will be filtered out
    }

    let value;
    if (lbl === "Temperature") {
      value = Number(r.temperature_c);
    } else {
      const dbcol = colMap[lbl] || lbl;
      value = Number(r[dbcol]);
    }

    return { dt, time, value };
  });

  // Filter out any invalid dates just in case
  const validCombined = combined.filter(r => !isNaN(r.dt.getTime()));

  if (!validCombined.length) {
    setText("trend-big-val", "--");
    setText("s-max", "--");
    setText("s-min", "--");
    setText("s-avg", "--");
    return;
  }

  // --------------------------------------------------
  // Sort by datetime
  // --------------------------------------------------
  validCombined.sort((a, b) => a.dt - b.dt);

  // --------------------------------------------------
  // Last 6 hours relative to last data point
  // --------------------------------------------------
  const now = validCombined[validCombined.length - 1].dt;
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

  const last6 = validCombined.filter(r => r.dt >= sixHoursAgo && r.dt <= now);

  if (!last6.length) {
    setText("trend-big-val", "--");
    setText("s-max", "--");
    setText("s-min", "--");
    setText("s-avg", "--");
    return;
  }

  const labels = last6.map(r => r.time);
  const values = last6.map(r => r.value);

  // --------------------------------------------------
  // Stats
  // --------------------------------------------------
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const avgVal = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);

  setText("trend-big-val", values[values.length - 1]);
  setText("s-max", maxVal);
  setText("s-min", minVal);
  setText("s-avg", avgVal);

  // --------------------------------------------------
  // Gradient
  // --------------------------------------------------
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "rgba(44, 117, 255, 0.35)");
  gradient.addColorStop(1, "rgba(44, 117, 255, 0.02)");

  // --------------------------------------------------
  // Chart Render
  // --------------------------------------------------
  mainChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: lbl,
          data: values,
          fill: true,
          backgroundColor: gradient,
          borderColor: "#2C75FF",
          borderWidth: 3,
          tension: 0.38,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHitRadius: 10,
          pointBackgroundColor: "#2C75FF",
          pointBorderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: "#d5d5d5",
            font: { size: 14, weight: "500" },
            maxRotation: 0,
            autoSkip: false,
            callback: function (value, index) {
              const total = this.chart.data.labels.length;
              const step = Math.ceil(total / 6);
              return index % step === 0 ? this.getLabelForValue(index) : "";
            }
          },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          min: 0,
          suggestedMax: maxVal + 10,
          ticks: {
            color: "#e4e4e4",
            font: { size: 14, weight: "500" },
            padding: 10
          },
          grid: {
            color: "rgba(255,255,255,0.1)",
            drawBorder: false,
            lineWidth: 0.6
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: 8,
          displayColors: false,
          titleFont: { size: 12 },
          bodyFont: { size: 12 }
        }
      }
    }
  });
}
function initDropdown() {
  const input = document.getElementById("location-input");
  const list = document.getElementById("station-dropdown");
  const wrapper = document.querySelector(".location-wrapper");
  if (!input || !list || !wrapper) return;

  const render = items => {
    list.innerHTML = items
      .map(s => `<div class="dropdown-item">${s}</div>`)
      .join("");

    [...list.children].forEach(el => {
      el.onclick = () => {
        const name = el.textContent.trim();
        const id = el.dataset.id;

        input.value = name;

        // ✅ save correct station selection
        localStorage.setItem("eco_loc", id);
        localStorage.setItem("eco_loc_name", name);

        // ✅ update heading instantly
        document.getElementById("current-station").textContent = name;

        // ✅ refresh dashboard for this station
        updateDashboard();

        list.style.display = "none";
      };


    });
  };

  render(STATIONS);

  input.addEventListener("keyup", () => {
    const term = input.value.toLowerCase();
    const filtered = STATIONS.filter(s => s.toLowerCase().includes(term));
    render(filtered);
    list.style.display = "block";
  });

  input.addEventListener("click", () => {
    list.style.display = "block";
  });

  document.addEventListener("click", e => {
    if (!wrapper.contains(e.target)) list.style.display = "none";
  });
}
function populateAdvSearch() {
  const box = document.getElementById("adv-station-list");
  if (!box) return;

  box.innerHTML = STATIONS.map(
    s => `<label><input type="checkbox" value="${s}"> ${s}</label>`
  ).join("");
}
function saveRecent(loc) {
  let arr = JSON.parse(localStorage.getItem("recents") || "[]");
  if (!arr.includes(loc)) {
    arr.unshift(loc);
    if (arr.length > 3) arr.pop();
    localStorage.setItem("recents", JSON.stringify(arr));
  }
}
function openSearchModal() {
  document.getElementById("modal-search").style.display = "flex";
  loadAdvStations();   // ✅ populate stations every time modal opens
}
function closeModal(id) {
  document.getElementById(id).style.display = "none";
}
window.onclick = function (event) {
  const modalSearch = document.getElementById("modal-search");
  const modalTrend = document.getElementById("modal-trend");
  if (event.target === modalSearch) modalSearch.style.display = "none";
  if (event.target === modalTrend) modalTrend.style.display = "none";
};
function loadRecent() {
  const div = document.getElementById("recent-list");
  if (!div) return;

  const arr = JSON.parse(localStorage.getItem("recents") || "[]");
  div.innerHTML = arr
    .map(
      r =>
        `<div class="recent-item"><i class="fa-solid fa-clock-rotate-left"></i> ${r}</div>`
    )
    .join("");

  [...div.children].forEach(el => {
    el.onclick = () => {
      const input = document.getElementById("location-input");
      if (input) input.value = el.textContent.replace(/^\D+/, "").trim();
    };
  });
}
async function getTrendData(pollutant, station) {
  const res = await fetch(
    `${API_BASE}/pollutant_trend?pollutant=${encodeURIComponent(
      pollutant
    )}&station=${encodeURIComponent(station)}`
  );
  return await res.json();
}
async function getTempTrend() {
  const res = await fetch(`${API_BASE}/temp_trend`);
  return await res.json();
}
