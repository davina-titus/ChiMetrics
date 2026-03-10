import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const CHI_BLUE = "#00B2FF", CHI_RED = "#FF3B30", CHI_GOLD = "#FFD700", GRID = "#1a2540";
const TABS = ["CRIME", "TRANSIT", "CAMERAS", "311"];
const DONUT_COLORS = [CHI_BLUE, CHI_RED, CHI_GOLD, "#00E8A2", "#9b59b6", "#e67e22", "#2ecc71", "#e74c3c"];

const MOCK = {
  crime: {
    total: 52814,
    by_month: [["03",3812],["04",4201],["05",4890],["06",5340],["07",5821],["08",5650],["09",5100],["10",4720],["11",3980],["12",3450],["01",3120],["02",3290]],
    by_type:  [["THEFT",18240],["BATTERY",11580],["CRIMINAL DAMAGE",8430],["ASSAULT",6720],["DECEPTIVE PRACTICE",5890],["MOTOR VEHICLE THEFT",5340],["ROBBERY",4210],["BURGLARY",3980],["NARCOTICS",2840],["WEAPONS VIOLATION",2100]],
    by_area:  [["AUSTIN",3812],["WEST ENGLEWOOD",3340],["HUMBOLDT PARK",3120],["ROSELAND",2980],["ENGLEWOOD",2870],["NEAR NORTH SIDE",2650],["LOOP",2410],["LOGAN SQUARE",2280]],
  },
  transit: {
    train_monthly: [["03",8200000],["04",9100000],["05",10400000],["06",11200000],["07",10800000],["08",10900000],["09",11400000],["10",10700000],["11",9800000],["12",8900000],["01",7600000],["02",8100000]],
    bus_monthly:   [["03",12400000],["04",13200000],["05",14100000],["06",14800000],["07",14200000],["08",14400000],["09",15100000],["10",14900000],["11",13700000],["12",12800000],["01",11200000],["02",11900000]],
    busiest_stations: [["O'Hare",1842000],["Clark/Lake",1620000],["Lake",1580000],["Chicago (Red)",1490000],["Belmont",1320000],["Fullerton",1240000],["95th/Dan Ryan",1180000],["Grand (Red)",1090000]],
  },
  cameras: {
    red_light: { total: 142300, top_locations: [["Halsted & 79th",4820],["Western & 63rd",4310],["Cicero & Chicago",3980],["Ashland & 63rd",3650],["State & 95th",3420],["Michigan & Cermak",3190]], by_month: [["03",12400],["04",13200],["05",14800],["06",15900],["07",16200],["08",15800],["09",14900],["10",13700],["11",12100],["12",10900],["01",10200],["02",11400]] },
    speed:     { total: 246900, top_locations: [["Stony Island & 76th",6200],["Western & Addison",5840],["Cicero & Irving Park",5410],["Ashland & Lake",4980],["King Dr & 47th",4520],["Kedzie & Belmont",4100]], by_month: [["03",28900],["04",31400],["05",35200],["06",38100],["07",39400],["08",38700],["09",36200],["10",33400],["11",29800],["12",26700],["01",24400],["02",26900]] },
  },
  requests: {
    total: 189800, by_status: { Open: 32410, Closed: 157390 },
    by_type: [["POTHOLE IN STREET",42800],["GRAFFITI REMOVAL",31200],["TREE TRIM",28400],["SANITATION CODE",24100],["STREET LIGHT OUT",19800],["ABANDONED VEHICLE",17400],["RODENT BAITING",14200],["BUILDING VIOLATION",11900]],
    by_ward: [["28",5680],["17",5210],["20",4890],["14",4560],["24",4340],["4",3890],["9",3780],["6",4120],["1",3240],["32",3120]],
  },
};

const BASE = "https://data.cityofchicago.org/resource";
async function socrata(id, qs = "") {
  const r = await fetch(`${BASE}/${id}.json?$limit=2000${qs ? "&" + qs : ""}`, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

function summarizeCrime(rows) {
  const byType = {}, byMonth = {}, byArea = {};
  for (const r of rows) {
    const t = r.primary_type || "UNKNOWN";
    byType[t] = (byType[t] || 0) + 1;
    const m = (r.date || "").slice(5, 7);
    if (m) byMonth[m] = (byMonth[m] || 0) + 1;
    const a = r.community_area || "UNKNOWN";
    byArea[a] = (byArea[a] || 0) + 1;
  }
  return {
    total: rows.length,
    by_month: Object.entries(byMonth).sort(),
    by_type: Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 10),
    by_area: Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
}

function summarizeCameras(rl, sp) {
  function crunch(rows) {
    const locs = {}, months = {};
    for (const r of rows) {
      const v = parseInt(r.violations || 0, 10) || 0;
      const loc = r.address || "UNKNOWN";
      locs[loc] = (locs[loc] || 0) + v;
      const m = (r.violation_date || "").slice(5, 7);
      if (m) months[m] = (months[m] || 0) + v;
    }
    return {
      total: Object.values(locs).reduce((a, b) => a + b, 0),
      top_locations: Object.entries(locs).sort((a, b) => b[1] - a[1]).slice(0, 8),
      by_month: Object.entries(months).sort(),
    };
  }
  return { red_light: crunch(rl), speed: crunch(sp) };
}

function summarize311(rows) {
  const byType = {}, byWard = {}, byStatus = {};
  for (const r of rows) {
    const t = r.sr_type || r.type_of_service_request || "UNKNOWN";
    byType[t] = (byType[t] || 0) + 1;
    const w = r.ward || "?";
    byWard[w] = (byWard[w] || 0) + 1;
    const s = r.status || "UNKNOWN";
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  return {
    total: rows.length,
    by_type: Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8),
    by_ward: Object.entries(byWard).sort((a, b) => b[1] - a[1]).slice(0, 12),
    by_status: byStatus,
  };
}

function summarizeTransit(trainRows, busRows) {
  const trainM = {}, busM = {}, stations = {};
  for (const r of trainRows) {
    const m = (r.month_beginning || r.month || "").slice(5, 7);
    if (m) trainM[m] = (trainM[m] || 0) + (parseInt(r.rides, 10) || 0);
    const s = r.stationname || "UNKNOWN";
    stations[s] = (stations[s] || 0) + (parseInt(r.rides, 10) || 0);
  }
  for (const r of busRows) {
    const m = (r.month_beginning || r.month || "").slice(5, 7);
    if (m) busM[m] = (busM[m] || 0) + (parseInt(r.totalrides, 10) || 0);
  }
  return {
    train_monthly: Object.entries(trainM).sort(),
    bus_monthly: Object.entries(busM).sort(),
    busiest_stations: Object.entries(stations).sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

const fmt = n => Number(n).toLocaleString();
const fmtM = n => `${(n / 1e6).toFixed(1)}M`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(8,15,35,0.97)", border: `1px solid ${CHI_BLUE}33`, padding: "10px 14px", borderRadius: 6, fontFamily: "monospace", fontSize: 12, color: "#cdd8f0" }}>
      <div style={{ color: CHI_BLUE, marginBottom: 4, fontWeight: 700 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: <span style={{ color: "#fff" }}>{fmt(p.value)}</span></div>)}
    </div>
  );
};

const StatCard = ({ label, value, sub, accent = CHI_BLUE }) => (
  <div style={{ background: "linear-gradient(135deg,#0d1730,#0a1020)", border: `1px solid ${accent}33`, borderRadius: 8, padding: "18px 20px", flex: 1, minWidth: 150, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${accent},transparent)` }} />
    <div style={{ fontSize: 10, color: `${accent}99`, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, fontFamily: "monospace" }}>{label}</div>
    <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 30, color: "#fff", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: "#4a5a7a", marginTop: 6, fontFamily: "monospace" }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 17, color: CHI_BLUE, letterSpacing: 3, marginBottom: 12, borderLeft: `3px solid ${CHI_BLUE}`, paddingLeft: 10 }}>{children}</div>
);

const Skeleton = ({ h = 220 }) => (
  <div style={{ height: h, borderRadius: 6, background: "linear-gradient(90deg,#0d1a30 25%,#162444 50%,#0d1a30 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
);

const LiveBadge = ({ live }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "monospace", fontSize: 10, color: live ? "#00E8A2" : "#4a6a8a", letterSpacing: 1, marginLeft: 10 }}>
    <span style={{ width: 6, height: 6, borderRadius: "50%", background: live ? "#00E8A2" : "#4a6a8a", boxShadow: live ? "0 0 6px #00E8A2" : "none", animation: live ? "pulse 2s infinite" : "none" }} />
    {live ? "LIVE DATA" : "PREVIEW DATA"}
  </span>
);

function CrimeTab({ data, loading }) {
  const d = data || MOCK.crime;
  const monthData = d.by_month.map(([m, v]) => ({ month: m, crimes: v }));
  const typeData = d.by_type.map(([t, v]) => ({ type: t, count: v }));
  const areaData = d.by_area.map(([a, v]) => ({ name: a, crimes: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total Crimes" value={fmt(d.total)} sub="Loaded dataset" />
        <StatCard label="Most Common" value={typeData[0]?.type || "—"} sub={`${fmt(typeData[0]?.count || 0)} incidents`} accent={CHI_RED} />
        <StatCard label="Most Affected" value={areaData[0]?.name || "—"} sub="Community area" accent={CHI_GOLD} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <SectionTitle>Crime Trend — Monthly</SectionTitle>
          {loading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="month" tick={{ fill: "#4a5a7a", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4a5a7a", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="crimes" stroke={CHI_RED} strokeWidth={2} dot={false} name="Crimes" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div>
          <SectionTitle>Top Crime Types</SectionTitle>
          {loading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={typeData.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="type" type="category" tick={{ fill: "#8a9aba", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={CHI_RED} radius={[0, 3, 3, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div>
        <SectionTitle>Crimes by Community Area</SectionTitle>
        {loading ? <Skeleton h={170} /> : (
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={areaData}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="name" tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="crimes" name="Crimes" radius={[3, 3, 0, 0]}>
                {areaData.map((_, i) => <Cell key={i} fill={`rgba(255,59,48,${0.35 + i * 0.07})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function TransitTab({ data, loading }) {
  const d = data || MOCK.transit;
  const combined = d.train_monthly.map(([m, v], i) => ({ month: m, train: +(v / 1e6).toFixed(2), bus: d.bus_monthly[i] ? +(d.bus_monthly[i][1] / 1e6).toFixed(2) : 0 }));
  const stations = d.busiest_stations.map(([s, v]) => ({ station: s, rides: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Busiest Station" value={stations[0]?.station || "—"} sub="By total rides" />
        <StatCard label="Top Station Rides" value={fmtM(stations[0]?.rides || 0)} sub="Annual" accent={CHI_BLUE} />
        <StatCard label="Stations Tracked" value={stations.length} sub="In dataset" accent={CHI_GOLD} />
      </div>
      <div>
        <SectionTitle>Train vs Bus Ridership (Millions)</SectionTitle>
        {loading ? <Skeleton h={230} /> : (
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={combined}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="month" tick={{ fill: "#4a5a7a", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5a7a", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="train" stroke={CHI_BLUE} strokeWidth={2} dot={false} name="Train (M)" />
              <Line type="monotone" dataKey="bus" stroke={CHI_GOLD} strokeWidth={2} dot={false} name="Bus (M)" />
              <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11, color: "#8a9aba" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div>
        <SectionTitle>Busiest CTA Stations</SectionTitle>
        {loading ? <Skeleton h={200} /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stations}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="station" tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} tickFormatter={fmtM} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rides" name="Rides" radius={[3, 3, 0, 0]}>
                {stations.map((_, i) => <Cell key={i} fill={`rgba(0,178,255,${0.3 + i * 0.09})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function CamerasTab({ data, loading }) {
  const d = data || MOCK.cameras;
  const rlTop = d.red_light.top_locations.map(([l, v]) => ({ location: l, violations: v }));
  const spTop = d.speed.top_locations.map(([l, v]) => ({ location: l, violations: v }));
  const timeline = d.red_light.by_month.map(([m, rl], i) => ({ month: m, redLight: rl, speed: d.speed.by_month[i]?.[1] || 0 }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Red Light Violations" value={fmt(d.red_light.total)} sub="Total in dataset" accent={CHI_RED} />
        <StatCard label="Speed Cam Violations" value={fmt(d.speed.total)} sub="Total in dataset" accent={CHI_GOLD} />
        <StatCard label="Worst Intersection" value={rlTop[0]?.location?.split("&")[0]?.trim() || "—"} sub={rlTop[0]?.location} accent={CHI_RED} />
      </div>
      <div>
        <SectionTitle>Violations Over Time</SectionTitle>
        {loading ? <Skeleton h={220} /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis dataKey="month" tick={{ fill: "#4a5a7a", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4a5a7a", fontSize: 11, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="redLight" stroke={CHI_RED} strokeWidth={2} dot={false} name="Red Light" />
              <Line type="monotone" dataKey="speed" stroke={CHI_GOLD} strokeWidth={2} dot={false} name="Speed" />
              <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 11, color: "#8a9aba" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <SectionTitle>Top Red Light Cameras</SectionTitle>
          {loading ? <Skeleton h={190} /> : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={rlTop} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="location" type="category" tick={{ fill: "#8a9aba", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="violations" fill={CHI_RED} radius={[0, 3, 3, 0]} name="Violations" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div>
          <SectionTitle>Top Speed Cameras</SectionTitle>
          {loading ? <Skeleton h={190} /> : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={spTop} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                <XAxis type="number" tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="location" type="category" tick={{ fill: "#8a9aba", fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} width={140} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="violations" fill={CHI_GOLD} radius={[0, 3, 3, 0]} name="Violations" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function Requests311Tab({ data, loading }) {
  const d = data || MOCK.requests;
  const typeData = d.by_type.map(([t, v]) => ({ type: t, count: v, name: t }));
  const wardData = d.by_ward.map(([w, v]) => ({ ward: `W${w}`, requests: v }));
  const open = d.by_status?.Open || d.by_status?.open || 0;
  const closed = d.by_status?.Closed || d.by_status?.closed || 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total Requests" value={fmt(d.total)} sub="In dataset" />
        <StatCard label="Open" value={fmt(open)} sub="Unresolved" accent={CHI_RED} />
        <StatCard label="Closed" value={fmt(closed)} sub="Resolved" accent="#00E8A2" />
        <StatCard label="Top Request" value={typeData[0]?.type?.split(" ")[0] || "—"} sub={typeData[0]?.type} accent={CHI_GOLD} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <SectionTitle>Request Types Breakdown</SectionTitle>
          {loading ? <Skeleton h={250} /> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={typeData} dataKey="count" nameKey="type" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {typeData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 10, color: "#8a9aba" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div>
          <SectionTitle>Requests by Ward</SectionTitle>
          {loading ? <Skeleton h={250} /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={wardData}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="ward" tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#4a5a7a", fontSize: 10, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="requests" name="Requests" radius={[3, 3, 0, 0]}>
                  {wardData.map((_, i) => <Cell key={i} fill={`rgba(0,178,255,${0.3 + i * 0.06})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return <div style={{ fontFamily: "monospace", fontSize: 12, color: "#4a6a8a", letterSpacing: 1 }}>{t.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>;
}

const Skyline = () => (
  <svg viewBox="0 0 800 80" style={{ position: "absolute", bottom: 0, left: 0, right: 0, width: "100%", opacity: 0.06 }} preserveAspectRatio="xMidYMax meet">
    <path d="M0,80 L0,55 L20,55 L20,40 L25,40 L25,30 L30,30 L30,25 L35,25 L35,20 L40,20 L40,15 L45,15 L45,20 L50,20 L50,25 L55,25 L55,30 L60,30 L60,40 L65,40 L65,55 L80,55 L80,45 L90,45 L90,35 L95,35 L95,28 L100,28 L100,22 L105,22 L105,28 L110,28 L110,35 L120,35 L120,45 L130,45 L130,50 L140,50 L140,38 L145,38 L145,20 L150,20 L150,10 L155,10 L155,5 L160,5 L160,10 L165,10 L165,20 L170,20 L170,38 L175,38 L175,50 L185,50 L185,42 L195,42 L195,30 L200,30 L200,20 L205,20 L205,15 L210,15 L210,20 L215,20 L215,30 L220,30 L220,42 L235,42 L235,55 L250,55 L250,44 L260,44 L260,32 L265,32 L265,18 L270,18 L270,8 L275,8 L275,4 L280,4 L280,8 L285,8 L285,18 L290,18 L290,32 L300,32 L300,44 L310,44 L310,55 L330,55 L330,48 L340,48 L340,36 L345,36 L345,26 L350,26 L350,18 L355,18 L355,12 L360,12 L360,18 L365,18 L365,26 L370,26 L370,36 L380,36 L380,48 L395,48 L395,55 L410,55 L410,44 L420,44 L420,32 L425,32 L425,22 L430,22 L430,16 L435,16 L435,10 L440,10 L440,6 L445,6 L445,10 L450,10 L450,16 L455,16 L455,22 L460,22 L460,32 L465,32 L465,44 L480,44 L480,55 L500,55 L500,48 L510,48 L510,38 L515,38 L515,28 L520,28 L520,22 L525,22 L525,28 L530,28 L530,38 L540,38 L540,48 L555,48 L555,55 L570,55 L570,45 L580,45 L580,35 L585,35 L585,25 L590,25 L590,20 L595,20 L595,25 L600,25 L600,35 L610,35 L610,45 L625,45 L625,55 L640,55 L640,48 L650,48 L650,40 L655,40 L655,30 L660,30 L660,24 L665,24 L665,30 L670,30 L670,40 L680,40 L680,48 L695,48 L695,55 L710,55 L710,44 L720,44 L720,35 L725,35 L725,26 L730,26 L730,18 L735,18 L735,12 L740,12 L740,18 L745,18 L745,26 L750,26 L750,35 L755,35 L755,44 L770,44 L770,55 L800,55 L800,80 Z" fill="white" />
  </svg>
);

export default function App() {
  const [tab, setTab] = useState(0);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState({ crime: null, transit: null, cameras: null, requests: null });

  useEffect(() => {
    setLoading(true);
    const run = async () => {
      try {
        const [crimeRows, trainRows, busRows, rlRows, spRows, req311Rows] = await Promise.all([
          socrata("ijzp-q8t2", "$order=date+DESC"),
          socrata("t2rn-p8d7", "$order=month_beginning+DESC"),
          socrata("bynn-gwxy", "$order=month_beginning+DESC"),
          socrata("spqx-js37", "$order=violation_date+DESC"),
          socrata("hhkd-xvj4", "$order=violation_date+DESC"),
          socrata("v6vf-nfxy", "$order=creation_date+DESC"),
        ]);
        setAllData({
          crime: summarizeCrime(crimeRows),
          transit: summarizeTransit(trainRows, busRows),
          cameras: summarizeCameras(rlRows, spRows),
          requests: summarize311(req311Rows),
        });
        setLive(true);
      } catch (e) {
        console.log("Using preview data:", e.message);
      }
      setLoading(false);
    };
    run();
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#060c1a}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#060c1a}::-webkit-scrollbar-thumb{background:#1a2d50;border-radius:2px}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.4)}}
      `}</style>
      <div style={{ minHeight: "100vh", background: "#060c1a", paddingBottom: 40, backgroundImage: `radial-gradient(ellipse at 20% 0%,rgba(0,60,120,.18) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(0,30,80,.12) 0%,transparent 60%),repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(0,178,255,.025) 39px,rgba(0,178,255,.025) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(0,178,255,.025) 39px,rgba(0,178,255,.025) 40px)` }}>
        <div style={{ position: "relative", overflow: "hidden", background: "linear-gradient(180deg,#0a1428,#060c1a)", borderBottom: `1px solid rgba(0,178,255,.12)`, padding: "22px 28px 0" }}>
          <Skyline />
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: CHI_BLUE, boxShadow: `0 0 8px ${CHI_BLUE}`, animation: "pulse 2s infinite" }} />
                <h1 style={{ fontFamily: "'Bebas Neue',Impact,sans-serif", fontSize: 40, color: "#fff", letterSpacing: 6, lineHeight: 1, textShadow: `0 0 30px rgba(0,178,255,.3)` }}>
                  CHI<span style={{ color: CHI_BLUE }}>METRICS</span>
                </h1>
                <LiveBadge live={live} />
              </div>
              <div style={{ marginTop: 4, fontSize: 10, color: "#4a6a8a", letterSpacing: 3, fontFamily: "monospace" }}>BUILT BY DAVINA TITUS · CIVIC DATA DASHBOARD · CHICAGO OPEN DATA PORTAL</div>
            </div>
            <LiveClock />
          </div>
          <div style={{ display: "flex", gap: 2, position: "relative", zIndex: 1 }}>
            {TABS.map((t, i) => (
              <button key={t} onClick={() => setTab(i)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "monospace", fontSize: 12, fontWeight: 700, letterSpacing: 3, padding: "10px 22px", color: tab === i ? "#fff" : "#3a5070", borderBottom: `2px solid ${tab === i ? CHI_BLUE : "transparent"}`, transition: "all .2s", position: "relative" }}>
                {tab === i && <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,rgba(0,178,255,.08),transparent)`, pointerEvents: "none" }} />}
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "26px 28px" }}>
          {tab === 0 && <CrimeTab data={allData.crime} loading={loading} />}
          {tab === 1 && <TransitTab data={allData.transit} loading={loading} />}
          {tab === 2 && <CamerasTab data={allData.cameras} loading={loading} />}
          {tab === 3 && <Requests311Tab data={allData.requests} loading={loading} />}
        </div>
        <div style={{ padding: "0 28px", borderTop: "1px solid #0e1c30", paddingTop: 14, display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: "#2a3a5a", letterSpacing: 2, fontFamily: "monospace" }}>CITY OF CHICAGO OPEN DATA PORTAL · SOCRATA API · AUTO-REFRESHED DAILY</div>
          <div style={{ fontSize: 10, color: "#2a3a5a", letterSpacing: 2, fontFamily: "monospace" }}>REACT · RECHARTS · FASTAPI · GITHUB ACTIONS</div>
        </div>
      </div>
    </>
  );
}
