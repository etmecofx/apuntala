import React, { useState, useMemo, useRef } from "react";

// ============================================================
// APUNTALA — Cálculo de apuntalamiento de emergencia · Sismo 24J
// Documento base: Lineamientos Técnicos de Apuntalamiento (Rev. 3, 2026),
// Comisión Presidencial para la Evaluación de Habitabilidad de Infraestructuras.
// Desarrollo de la aplicación: Ing. Etel Contreras · CIV 192.276
// ============================================================

const CREDITO_DOC =
  "Lineamientos Técnicos: Apuntalamiento de columnas, vigas y losas de concreto armado afectadas por sismo (Rev. 3, 2026) — documento oficial de la Comisión Presidencial para la Evaluación de Habitabilidad de Infraestructuras.";
const CREDITO_APP =
  "Aplicación desarrollada por la Ing. Etel Contreras · Ingeniero de Materiales (USB) · Esp. en Ingeniería de Estructuras y Sismoresistencia (INESA) · CIV 192.276";
const CREDITO_MEMORIA = [
  ["Documento base:", "Lineamientos Técnicos de Apuntalamiento (Rev. 3, 23/07/2026), elaborado por el Comité Técnico de la Comisión Presidencial para la Evaluación de Habitabilidad de Infraestructuras."],
  ["Desarrollo de la aplicación:", "Ing. Etel Contreras — Ingeniero de Materiales (USB) · Esp. en Ingeniería de Estructuras y Sismoresistencia (INESA) · CIV 192.276."],
  ["", "Apuntala v1.0 · Herramienta de apoyo profesional — no sustituye el proyecto firmado por un ingeniero estructural."],
];

// ---------- Paletas por clase de daño ----------
const RAMP = {
  verde: { bg: "#EAF3DE", fg: "#27500A", mid: "#3B6D11" },
  ambar: { bg: "#FAEEDA", fg: "#633806", mid: "#854F0B" },
  coral: { bg: "#FAECE7", fg: "#712B13", mid: "#993C1D" },
  rojo: { bg: "#FCEBEB", fg: "#791F1F", mid: "#A32D2D" },
  azul: { bg: "#E6F1FB", fg: "#0C447C", mid: "#185FA5" },
};

const CLASES = [
  { id: "I", ramp: "verde", desc: "Fisuras finas < 0,2 mm", cond: "No afectado. No requiere puntales", rd: null },
  { id: "II", ramp: "verde", desc: "Fisuras 0,2 – 1 mm claramente visibles", cond: "No afectado. Vigilancia y testigos", rd: null },
  { id: "III", ramp: "ambar", desc: "Grietas 1 – 2 mm; desconchado limitado del recubrimiento", cond: "rd = 0,50 · apuntalar 50%", rd: 0.5 },
  { id: "IV", ramp: "coral", desc: "Grietas > 2 mm numerosas; aplastamiento del concreto, acero expuesto", cond: "rd = 0,25 · apuntalar 75%", rd: 0.25 },
  { id: "V", ramp: "rojo", desc: "Pandeo del refuerzo, trituración del núcleo, acortamiento visible, inclinación", cond: "rd = 0,00 · apuntalar 100%", rd: 0.0 },
];

const FIG3 = {
  I: { t: "Daño menor o nulo", crit: "No requiere apuntalamiento · condición estable", ramp: "verde", acc: ["Inspección visual y monitoreo de grietas", "Verificar estabilidad, verticalidad y capacidad resistente", "Mantener acceso para evaluación y seguimiento"] },
  II: { t: "Daño menor o nulo", crit: "No requiere apuntalamiento · condición estable", ramp: "verde", acc: ["Inspección visual y monitoreo de grietas", "Verificar estabilidad, verticalidad y capacidad resistente", "Mantener acceso para evaluación y seguimiento"] },
  III: { t: "Daño moderado", crit: "Apuntalamiento localizado · control y soporte local", ramp: "ambar", acc: ["Apuntalar el área tributaria del elemento", "Puntales bajo vigas o losa, simétricos y próximos al nudo", "Precarga ligera: apeo neutro, sin levantar la estructura", "Extender a niveles alineados si las cargas lo exigen"] },
  IV: { t: "Daño severo", crit: "Estabilización reforzada · estabilización segura", ramp: "coral", acc: ["Apuntalamiento inmediato", "Descargar la columna dañada y conservar espacio para la reparación", "Reproducir el sistema en niveles superiores alineados", "Considerar torre o sistema arriostrado según cargas y resistencia disponible"] },
  V: { t: "Daño completo", crit: "Emergencia estructural · intervención inmediata", ramp: "rojo", acc: ["Restringir el acceso y asegurar el área", "Estabilización de emergencia con torre o arriostramiento tridimensional", "Transferir cargas a apoyos seguros y verificados", "Diseño y verificación obligatoria por un profesional competente"] },
};

const MOVIMIENTOS = [
  { id: "a", t: "Descenso vertical de losas y vigas", d: "Por pérdida de capacidad de columnas, machones o muros.", ruta: "Apuntalamiento vertical (8.1, 9.1 a 9.3) — continúa al cálculo del Anexo A" },
  { id: "b", t: "Volcamiento o pandeo fuera del plano de muros y fachadas", d: "Muros separados de la estructura, desplomados o pandeados.", ruta: "Apuntalamiento lateral de retención: tornapuntas o tirantes con guayas (9.4)" },
  { id: "c", t: "Desplazamiento lateral entre edificaciones o muros enfrentados", d: "Estructuras vecinas de altura comparable que se aproximan entre sí.", ruta: "Apuntalamiento horizontal de contraste con codales (9.4.5)" },
  { id: "d", t: "Cierre o distorsión de huecos que sirvan de acceso", d: "Puertas, ventanas y pasos descuadrados que el personal debe usar.", ruta: "Marcos de apuntalamiento de puertas y ventanas (9.5)" },
];

const TABLA3 = [
  { id: "columna", t: "Una columna o machón", h: "Área tributaria del elemento (ancho tributario a ejes adyacentes).", v: "Nivel dañado + mínimo dos niveles superiores en la misma vertical (escalonado según 7.1.2); hacia abajo según Tabla 2.", calc: true },
  { id: "varias", t: "Varias columnas de una planta (≤ 25% por línea resistente)", h: "Áreas tributarias de todos los elementos, con solape de al menos una línea de puntales entre áreas contiguas.", v: "Igual al caso anterior.", calc: true },
  { id: "planta", t: "Más del 25% de una línea resistente", h: "Planta completa.", v: "Nivel dañado + mínimo dos niveles superiores alineados; hacia abajo según Tabla 2.", calc: true },
  { id: "viga", t: "Viga o franja de losa", h: "Luz completa del miembro + al menos ¼ de la luz hacia cada apoyo.", v: "Nivel dañado; verificar los apoyos y, si se sobrecargan, extender a sus áreas tributarias.", calc: false },
  { id: "muro", t: "Muro portante o fachada con desplome", h: "Longitud del paño afectado + un paño a cada lado.", v: "Diagonal o arriostramiento con apoyos a nivel de cada entrepiso (9.4).", calc: false },
  { id: "escalera", t: "Escalera o rampa de evacuación", h: "Tramo dañado completo y sus apoyos.", v: "Nivel dañado y acceso seguro al nivel superior.", calc: false },
];

const TABLA5 = [
  { id: "tel", t: "Puntal metálico telescópico", qp: 3.0, d: "UNE-EN 1065 · ej. ACROW E250/3 · ajuste por rosca; sensible a pérdida de verticalidad" },
  { id: "alu", t: "Puntal pesado de aluminio", qp: 8.0, d: "ej. MULTIPROP MP350 · alta capacidad con bajo peso; anti pandeo local" },
  { id: "torre", t: "Torre modular multidireccional", qp: 10.0, d: "UNE-EN 12812 · ej. PALDAL PR-300 (4 puntales) · grandes alturas libres" },
  { id: "t2", t: 'Tubular de acero 2"', qp: 3.5, d: "Ø60,3 × 3,63 mm · no usar > 2,5 m sin amarres · corte exacto y cuñas" },
  { id: "t25", t: 'Tubular de acero 2½"', qp: 8.0, d: "Ø73,0 × 4,8 mm · rígido, capacidad similar al telescópico" },
  { id: "t3", t: 'Tubular de acero 3"', qp: 9.0, d: "Ø88,9 × 2,95 mm · cargas intermedias" },
  { id: "t4", t: 'Tubular de acero 4"', qp: 15.0, d: "Ø114,3 × 2,95 mm · vigas corona y losas pesadas" },
];

const EJEMPLOS = [
  { id: 1, nombre: "Caso 1 · PB–C4", pos: "central", clase: "IV", niveles: 5, nivel: 0, ns: 5, L1: 4.5, L2: 4.0, q: 900, b: 30, d: 50, fc: 210, qp: 3.0, desc: "Central · daño severo · ns = 5 · AT = 18 m²" },
  { id: 2, nombre: "Caso 2 · Piso 2–A2", pos: "lateral", clase: "III", niveles: 5, nivel: 2, ns: 3, L1: 5.0, L2: 2.0, q: 900, b: 30, d: 50, fc: 210, qp: 3.0, desc: "Lateral · daño moderado · ns = 3 · AT = 10 m²" },
  { id: 3, nombre: "Caso 3 · Piso 1–D7", pos: "esquinera", clase: "V", niveles: 5, nivel: 1, ns: 4, L1: 2.0, L2: 2.5, q: 900, b: 30, d: 50, fc: 210, qp: 3.0, desc: "Esquinera · daño completo · ns = 4 · AT = 5 m²" },
];

const FICHAS9 = {
  columna: { t: "9.1 Columnas y machones dañados", pts: ["Sostener la losa del área tributaria, las vigas que concurren al nudo superior, o ambas, con puntales simétricos y lo más cerca de la columna que las obstrucciones permitan.", "En losas sin vigas (placas planas): puntales alrededor de la columna, bajo las franjas que descargan en ella. Bajo vigas, limitar la reacción a su capacidad admisible.", "Antes de transferir carga: registrar cotas y grietas existentes. Transferencia con precarga ligera de cuñas o roscas — apeo neutro, sin levantar — verificando que no aparezcan grietas nuevas.", "Dejar el espacio de trabajo para la intervención y registrar carga estimada, sistema instalado y cotas de referencia."], no: ["Un apoyo aislado bajo la losa en el centro del paño no transmite la carga de la columna: debe evitarse."] },
  viga: { t: "9.2 Vigas", pts: ["Puntales directamente bajo la viga, con cabezal continuo cuando se usen dos o más. Si la viga sostiene nervios: puntales bajo cada nervio o bajo la viga maestra.", "Con daño severo o superior: apuntalar además la losa adyacente dentro de su ancho tributario — la descarga directamente y evita reacciones concentradas sobre la viga dañada.", "Puntales de rescate o individuales como medida inmediata; dos o más arriostrados o torres como solución definitiva de emergencia, con separaciones 8.4.3 y arriostramiento 10.5."], no: [] },
  losa: { t: "9.3 Losas y pisos inclinados", pts: ["Apuntalamientos verticales múltiples con puntales metálicos o torres, cabezales y durmientes continuos, puntales a plomo y separaciones según 8.4.3.", "En losas nervadas, el cabezal se coloca perpendicular a los nervios.", "Pisos inclinados o articulados: puntales con cuñas de ángulo y bloqueo contra deslizamiento, o torres de carga cuando la altura libre es reducida o la carga es alta."], no: [] },
  muro: { t: "9.4 Muros y fachadas con riesgo de volcamiento", pts: ["Diagonales de retención en variantes de base de apoyo (suelo plano) o muleta (suelo inclinado u obstáculos).", "Ángulo óptimo 45°; se admiten entre 30° y 60°.", "El apoyo superior debe coincidir con un elemento de contraste detrás del muro (entrepiso, viga de corona, muro perpendicular).", "Bases ancladas contra deslizamiento y levantamiento (varillas al terreno, empotramiento o lastre); proteger las cabezas de las varillas.", "Con paso libre requerido: tirantes de guayas ancladas a puntos firmes, tensados de manera uniforme y protegidos en las aristas.", "Entre muros o edificaciones enfrentadas: codales con durmientes verticales de reparto, a la altura de los entrepisos y con arriostramiento en cruz (9.4.5)."], no: ["Si H > 7,0 m los elementos deben ser de acero y calcularse específicamente — caso para proyecto especial.", "Nunca trabajar del lado hacia el cual se inclina el muro."] },
  escalera: { t: "Escalera o rampa de evacuación", pts: ["Apuntalar el tramo dañado completo y sus apoyos, garantizando acceso seguro al nivel superior (Tabla 3)."], no: [] },
  huecos: { t: "9.5 Huecos de puertas, ventanas y pasos", pts: ["Marco de cabezal + pies derechos + solera, acuñado contra el dintel y las jambas; cabezal en contacto completo con el dintel en toda su longitud.", "Riostras diagonales en las esquinas cuando el hueco no se utilice como paso."], no: ["Los marcos protegen el acceso, pero su carga de diseño es limitada: no sustituyen el apuntalamiento vertical de las losas superiores."] },
};

const FICHAS10 = [
  { t: "10.1 Secuencia general", d: "De afuera hacia adentro, desde las zonas más seguras hasta la zona definitiva. Prefabricar y preensamblar fuera de la zona de riesgo; retirar solo los escombros necesarios para asentar el apuntalamiento." },
  { t: "10.2 Apoyo y reparto de cargas", d: "Todo puntal descarga sobre un durmiente. Sobre tierra: base ≥ 45 × 45 cm (tres piezas de 2″×6″ o dos capas cruzadas de contrachapado de 19 mm). Verificar que losa o suelo resista la carga concentrada; en sótanos, comprobar el nivel inferior. Prohibido apoyar sobre losas agrietadas, rellenos o escombros." },
  { t: "10.3 Acuñado", d: "Rosca en puntales metálicos, o cuñas dobles enfrentadas de madera dura en sistemas laterales y de huecos, hasta contacto completo sin levantar la estructura (apeo neutro). Cuñas totalmente en contacto, aseguradas con clavos; clavos de doble cabeza donde se prevea reajuste." },
  { t: "10.4 Conexiones", d: "Los clavos conectan pero no transfieren carga (contacto madera contra madera). Placas de contrachapado de 16 a 19 mm: placa completa 30 × 30 cm en cabezales, media placa en bases; patrones de 5, 8, 11 o 14 clavos. Clavos 3,3 × 64 mm en placas y 3,8 × 83 mm recubiertos en listones diagonales." },
  { t: "10.5 Arriostramiento", d: "En dos direcciones con diagonales 2″×4″ o 2″×6″, longitud máx. 2,3 m; mayor longitud → diagonales en X. Metálicos y torres con los elementos del fabricante." },
  { t: "10.6 Verticalidad y centrado", d: "Puntales a plomo, carga centrada, contacto completo con cabezal y durmiente. Sobre mampostería o concreto muy agrietado: refuerzo de reparto sobre el cabezal (2″×10″ o 2″×12″, o franja de contrachapado de 19 mm de 30 a 40 cm)." },
  { t: "10.7 Puntales telescópicos", d: "Completos (tubos rectos, rosca lubricada, pasador original), sin abolladuras ni corrosión, a plomo, placas en contacto completo, extensión dentro del rango de clase y pasador insertado por completo. Prohibido sustituir el pasador por barras o clavos y sobrecargar el puntal." },
  { t: "10.8 Retiro y re-apuntalamiento", d: "Solo con autorización escrita del ingeniero responsable, en orden inverso, descargando gradualmente. Por áreas: re-apuntalamiento de zonas pequeñas, sin precarga, tras dejar que la losa recupere su peso propio. Prohibido retirar vanos o plantas completas sin secuencia aprobada. Niveles reapuntalados según 7.4.4." },
];

// ---------- Motor de cálculo (Anexo A) ----------
const NV = { central: 4, lateral: 3, esquinera: 2 };
const nombreNivel = (i) => (i < 0 ? `Sótano ${-i}` : i === 0 ? "PB" : `Piso ${i}`);
const r2 = (x) => Math.round(x * 100) / 100;

function calcular(inp) {
  const nv = NV[inp.pos];
  const rd = inp.rdCustom != null ? inp.rdCustom : (CLASES.find((c) => c.id === inp.clase)?.rd ?? 0);
  const qT = inp.q / 1000; // tonf/m²
  const AT = inp.L1 * inp.L2;
  const PT = inp.ns * AT * qT + (inp.concentradas || 0);
  const PA = PT * (1 - rd);
  const Vadm = (0.85 * 0.53 * Math.sqrt(inp.fc) * inp.b * inp.d) / 1000; // tonf
  const Pv = PA / nv;
  const FS = Pv > 0 ? Vadm / Pv : Infinity;
  const warnings = [];
  if (Pv > Vadm) warnings.push(`Pv = ${r2(Pv)} tonf > Vadm = ${r2(Vadm)} tonf — la carga excede el corte admisible: se reparte apuntalando las vigas de niveles superiores (Paso 4 del Anexo A).`);
  if (inp.clase === "V") warnings.push("Daño completo (clase V): extensión superior obligatoria mínimo dos niveles, aunque las vigas resistan.");
  else if (FS < 2) warnings.push(`FS = Vadm/Pv = ${r2(FS)} < 2,0 — se apuntalan los niveles superiores siguiendo el procedimiento del Caso 1 (criterio del Caso 3 del Anexo A).`);

  const nivelD = (nj) => {
    const PAj = nj * AT * qT * (1 - rd);
    const N0 = Math.ceil(PAj / inp.qp - 1e-9);
    const porLinea = Math.ceil(N0 / nv);
    return { PAj: r2(PAj), N0, porLinea, total: porLinea * nv, Pvj: r2(PAj / nv) };
  };

  // Niveles superiores
  const forzarSup = inp.clase === "V" || FS < 2 || Pv > Vadm;
  const maxSup = Math.max(0, Math.min(inp.ns - 1, inp.niveles - 1 - inp.nivel));
  const superiores = [];
  if (forzarSup) {
    let j = 1;
    while (j <= maxSup) {
      const nj = inp.ns - j;
      const d = nivelD(nj);
      superiores.push({ nivel: inp.nivel + j, ...d });
      const pvPrev = j === 1 ? Pv : superiores[j - 2].Pvj;
      const continuar = j < 2 || pvPrev > Vadm;
      j++;
      if (!continuar && j > 2) break;
      if (d.Pvj <= Vadm && j > 2) break;
    }
  }
  // Nivel dañado
  const base = nivelD(inp.ns);
  // Niveles inferiores (Tabla 2): hasta contar con 3 pisos sanos o llegar al terreno.
  // Con sótanos, los pisos por debajo del nivel dañado incluyen los sótanos (terreno = fondo del último sótano).
  const sot = inp.sotanos || 0;
  const pisosAbajo = inp.nivel + sot;
  const abajo = pisosAbajo >= 3 ? 0 : pisosAbajo;
  const inferiores = [];
  for (let k = 1; k <= abajo; k++) inferiores.push({ nivel: inp.nivel - k, ...base });
  if (sot > 0 && inp.nivel - abajo <= 0) {
    warnings.push("El apuntalamiento descarga sobre losas de sótano: compruebe que cada nivel inferior resista la carga concentrada de los puntales (10.2) y evalúe llevar la descarga hasta la fundación.");
  }

  const filas = [
    ...superiores.slice().reverse().map((s) => ({ ...s, tipo: "superior" })),
    { nivel: inp.nivel, ...base, tipo: "dañado" },
    ...inferiores.map((s) => ({ ...s, tipo: "inferior" })),
  ];
  const totalPuntales = filas.reduce((a, f) => a + f.total, 0);
  return { nv, rd, AT: r2(AT), PT: r2(PT), PA: r2(PA), Vadm: r2(Vadm), Pv: r2(Pv), FS: r2(FS), warnings, filas, totalPuntales, abajo, forzarSup };
}

// Autoverificación contra el Anexo A
function selfTest() {
  const esperado = [
    [24, 20, 16], // Caso 1: PB 24, P1 20, P2 16
    [6, 6, 6], // Caso 2
    [6, 6, 4], // Caso 3: P1 6, P2 6, P3 4 (más PB 6 abajo)
  ];
  try {
    const r1 = calcular({ ...EJEMPLOS[0] });
    const ok1 = r1.filas.find((f) => f.tipo === "dañado").total === 24 && r1.filas.filter((f) => f.tipo === "superior").map((f) => f.total).join() === "16,20";
    const r2c = calcular({ ...EJEMPLOS[1] });
    const ok2 = r2c.filas.length === 3 && r2c.filas.every((f) => f.total === 6);
    const r3 = calcular({ ...EJEMPLOS[2] });
    const sup3 = r3.filas.filter((f) => f.tipo === "superior").map((f) => f.total).join();
    const ok3 = r3.filas.find((f) => f.tipo === "dañado").total === 6 && sup3 === "4,6" && r3.filas.find((f) => f.tipo === "inferior")?.total === 6;
    return ok1 && ok2 && ok3;
  } catch (e) {
    return false;
  }
}
const MOTOR_OK = selfTest();

// ---------- Estilos base ----------
const S = {
  card: { background: "#fff", border: "1px solid #e3e1d9", borderRadius: 12, padding: "18px 20px", marginBottom: 14 },
  h: { margin: "0 0 4px", fontSize: 16, fontWeight: 600 },
  sub: { margin: "0 0 14px", fontSize: 13, color: "#6b6a64" },
  label: { fontSize: 12, color: "#6b6a64", display: "block", marginBottom: 4 },
  input: { width: "100%", padding: "8px 10px", border: "1px solid #cfcdc4", borderRadius: 8, fontSize: 14, boxSizing: "border-box", background: "#fff" },
  btn: { padding: "9px 16px", border: "1px solid #b9b7ae", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer" },
  btnP: { padding: "9px 16px", border: "1px solid #1f1f1d", borderRadius: 8, background: "#1f1f1d", color: "#fff", fontSize: 13, cursor: "pointer" },
  chip: (r) => ({ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: RAMP[r].bg, color: RAMP[r].fg, whiteSpace: "nowrap" }),
  banner: (r) => ({ padding: "10px 12px", borderRadius: 8, background: RAMP[r].bg, color: RAMP[r].fg, fontSize: 12, lineHeight: 1.55, marginTop: 10 }),
  row: { border: "1px solid #e3e1d9", borderRadius: 8, padding: "10px 12px", marginBottom: 8 },
};

const Metric = ({ l, v, danger }) => (
  <div style={{ background: "#f5f4ef", borderRadius: 8, padding: 12 }}>
    <p style={{ margin: 0, fontSize: 12, color: "#8a887f" }}>{l}</p>
    <p style={{ margin: "2px 0 0", fontSize: 21, fontWeight: 600, color: danger ? RAMP.rojo.mid : "#1f1f1d" }}>{v}</p>
  </div>
);

// ---------- Asistente fotográfico ----------
function AsistenteFoto({ onSugerencia }) {
  const [file, setFile] = useState(null);
  const [b64, setB64] = useState(null);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [err, setErr] = useState(null);
  const ref = useRef(null);

  const cargar = (f) => {
    setErr(null); setOut(null);
    if (!f) return;
    setFile(f);
    const r = new FileReader();
    r.onload = () => setB64(String(r.result).split(",")[1]);
    r.readAsDataURL(f);
  };

  const analizar = async () => {
    if (!b64 || !file) return;
    setBusy(true); setErr(null); setOut(null);
    const prompt = `Eres un asistente para ingenieros que clasifican daño sísmico en elementos de concreto armado según la Tabla 1 de los Lineamientos Técnicos venezolanos (adaptada de Nakano et al. 2004) y el Boletín 61 ANIH. Clases: I fisuras finas <0,2 mm; II fisuras 0,2–1 mm; III grietas 1–2 mm con desconchado limitado del recubrimiento; IV grietas >2 mm numerosas, aplastamiento del concreto y acero de refuerzo expuesto; V pandeo del acero, trituración del núcleo, acortamiento visible o inclinación apreciable. Analiza la fotografía del elemento estructural y responde SOLO con JSON válido sin backticks: {"clase":"I|II|III|IV|V","elemento":"columna|viga|losa|muro|otro","observaciones":["..."],"advertencias":["..."]}. En observaciones describe evidencias visibles (grietas, desconchado, acero expuesto, pandeo). En advertencias incluye siempre que el ancho de grieta es estimado y debe confirmarse en sitio, y cualquier limitación de la foto (escala, iluminación, cara única).`;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setErr("Sin conexión: el asistente de IA no está disponible en este momento. Continúe con la clasificación manual — el flujo completo funciona sin él.");
      setBusy(false);
      return;
    }
    try {
      const resp = await fetch("/api/clasificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: b64, media_type: file.type || "image/jpeg", prompt }),
      });
      if (resp.status === 501) {
        setErr("El asistente de IA no está configurado en este despliegue. Continúe con la clasificación manual — el flujo completo funciona sin él.");
        setBusy(false);
        return;
      }
      const data = await resp.json();
      const txt = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
      const clean = txt.replace(/```json|```/g, "").trim();
      const j = JSON.parse(clean);
      if (!["I", "II", "III", "IV", "V"].includes(j.clase)) throw new Error("Respuesta sin clase válida");
      setOut(j);
    } catch (e) {
      setErr("No se pudo completar el análisis (verifique la conexión). Continúe con la clasificación manual — el flujo completo funciona sin él.");
    }
    setBusy(false);
  };

  const clase = out ? CLASES.find((c) => c.id === out.clase) : null;
  return (
    <div style={{ ...S.row, marginBottom: 12 }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>Asistente de clasificación por fotografía (opcional · requiere conexión)</p>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6b6a64" }}>
        Fotografíe el elemento con buena luz y un objeto de referencia de escala junto a la grieta (regla, grietómetro o moneda).
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => cargar(e.target.files?.[0])} />
        <button style={S.btn} onClick={() => ref.current?.click()}>{file ? "Cambiar foto" : "Cargar fotografía"}</button>
        {file && <span style={{ fontSize: 12, color: "#6b6a64" }}>{file.name}</span>}
        {file && (
          <button style={S.btnP} onClick={analizar} disabled={busy}>
            {busy ? "Analizando…" : "Analizar con IA"}
          </button>
        )}
      </div>
      {err && <div style={S.banner("ambar")}>{err}</div>}
      {out && clase && (
        <div style={{ marginTop: 10 }}>
          <span style={S.chip(clase.ramp)}>Clase sugerida: {out.clase} · {FIG3[out.clase].t.toLowerCase()}</span>
          <p style={{ margin: "8px 0 4px", fontSize: 12, color: "#3d3d3a" }}>
            <b>Observaciones:</b> {out.observaciones?.join(" ")}
          </p>
          {out.advertencias?.length > 0 && <p style={{ margin: 0, fontSize: 11, color: "#8a887f" }}>{out.advertencias.join(" ")}</p>}
          <div style={S.banner("ambar")}>
            Sugerencia orientativa generada por IA. La clasificación es visual y orientativa (Figura 2): la clase definitiva la establece el ingeniero mediante evaluación técnica en sitio, y así queda registrado en la memoria.
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button style={S.btnP} onClick={() => onSugerencia(out)}>Confirmar clase {out.clase}</button>
            <button style={S.btn} onClick={() => setOut(null)}>Corregir manualmente</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- App principal ----------
export default function Apuntala() {
  const [paso, setPaso] = useState(1);
  const [alcance, setAlcance] = useState([false, false, false, false, false, false]);
  const [clase, setClase] = useState(null);
  const [rdCustom, setRdCustom] = useState("");
  const [fotoIA, setFotoIA] = useState(null); // {clase, observaciones}
  const [movs, setMovs] = useState({ a: false, b: false, c: false, d: false });
  const [elemento, setElemento] = useState("columna");
  const [lineas, setLineas] = useState({ lx: 4, ax: 1, ly: 7, ay: 1, nElem: 1 });
  const [puntalSel, setPuntalSel] = useState("tel");
  const [qpConf, setQpConf] = useState(3.0);
  // q auxiliar
  const [qAux, setQAux] = useState({ losaTipo: "nervada", paredes: true, acabados: 100, variables: 175 });
  const PESOS_LOSA = { nervada: 500, maciza10: 250, maciza15: 375, maciza20: 500 };
  const [inp, setInp] = useState({ pos: "central", niveles: 5, sotanos: 0, nivel: 0, ns: 5, L1: 4.5, L2: 4.0, q: 900, b: 30, d: 50, fc: 210, concentradas: 0 });
  const [mostrarDesarrollo, setMostrarDesarrollo] = useState(true);
  const [proyecto, setProyecto] = useState({ obra: "", elementoId: "", evaluador: "", civ: "", fecha: new Date().toLocaleDateString("es-VE") });
  const [ejemploCargado, setEjemploCargado] = useState(null);
  const [estabilidad, setEstabilidad] = useState("C3");

  const alcanceOK = alcance.every(Boolean);
  const claseObj = CLASES.find((c) => c.id === clase);
  const rdEfectivo = rdCustom !== "" && !isNaN(parseFloat(rdCustom)) ? parseFloat(rdCustom) : claseObj?.rd;
  const requiere = clase === "III" || clase === "IV" || clase === "V";
  const pctX = lineas.lx > 0 ? (lineas.ax / lineas.lx) * 100 : 0;
  const pctY = lineas.ly > 0 ? (lineas.ay / lineas.ly) * 100 : 0;
  const plantaCompleta = pctX > 25 || pctY > 25;
  const qTotal = (PESOS_LOSA[qAux.losaTipo] || 500) + (qAux.paredes ? 75 : 0) + (parseFloat(qAux.acabados) || 0) + (parseFloat(qAux.variables) || 0) + 50;

  const inputsCalc = { ...inp, clase: clase || "IV", rdCustom: rdCustom !== "" ? parseFloat(rdCustom) : null, qp: qpConf, pos: inp.pos };
  const res = useMemo(() => {
    try { return calcular(inputsCalc); } catch (e) { return null; }
  }, [JSON.stringify(inputsCalc)]);

  const cargarEjemplo = (e) => {
    setClase(e.clase); setRdCustom("");
    setInp({ pos: e.pos, niveles: e.niveles, sotanos: 0, nivel: e.nivel, ns: e.ns, L1: e.L1, L2: e.L2, q: e.q, b: e.b, d: e.d, fc: e.fc, concentradas: 0 });
    setQpConf(e.qp); setPuntalSel("tel"); setElemento("columna");
    setMovs((m) => ({ ...m, a: true }));
    setProyecto((p) => ({ ...p, elementoId: e.nombre }));
    setEjemploCargado(e.id);
    setPaso(5);
  };

  const exportarJSON = () => {
    const data = { proyecto, alcance, clase, rdCustom, movs, elemento, lineas, puntalSel, qpConf, qAux, inp, resultados: res };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `apuntala_${(proyecto.elementoId || "caso").replace(/\s+/g, "_")}.json`;
    a.click();
  };

  const Nav = () => (
    <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "12px 0", borderBottom: "1px solid #e3e1d9", marginBottom: 16 }}>
      {[
        [1, "1 · Alcance"], [2, "2 · Evaluación"], [3, "3 · Extensión"], [4, "4 · Sistema"], [5, "5 · Cálculo"], [6, "6 · Reporte"], [7, "Guía rápida"], [8, "Ejecución (cap. 10)"],
      ].map(([n, t]) => (
        <button key={n} onClick={() => setPaso(n)}
          style={{ fontSize: 12, padding: "5px 11px", borderRadius: 999, cursor: "pointer", border: paso === n ? "1px solid #1f1f1d" : "1px solid #cfcdc4", background: paso === n ? "#1f1f1d" : "#fff", color: paso === n ? "#fff" : "#55544f" }}>
          {t}
        </button>
      ))}
    </div>
  );

  const Descargo = () => (
    <div style={S.banner("rojo")}>
      El apuntalamiento no repara ni refuerza la estructura y no autoriza la reocupación. El diseño final debe ser realizado por un ingeniero estructural, estar debidamente firmado y tramitado mediante un proyecto en la alcaldía correspondiente (Anexo A.2). Los valores obtenidos son de emergencia y no sustituyen las verificaciones del ingeniero estructural (8.4 y 13.1).
    </div>
  );

  // ---------------- Render por paso ----------------
  const PasoAlcance = () => (
    <div style={S.card}>
      <p style={S.h}>Paso 1 · Verificación de alcance (sección 2)</p>
      <p style={S.sub}>Confirme que el caso está dentro del alcance de los lineamientos antes de continuar.</p>
      {[
        "Estructura aporticada de concreto armado con daños en columnas, vigas o losas",
        "Sin víctimas atrapadas (si las hay, corresponde a equipos USAR)",
        "Sin daño geotécnico dominante (hundimientos, licuación, deslizamientos, grietas en el terreno)",
        "No es edificación patrimonial (arcos, bóvedas o muros de tierra) ni obra en construcción",
        "No es una edificación de concreto prefabricado cuyo apuntalamiento deba extenderse hasta el terreno",
        "Altura del apuntalamiento ≤ 6,0 m",
      ].map((t, i) => (
        <label key={i} style={{ ...S.row, display: "flex", gap: 10, alignItems: "center", cursor: "pointer", fontSize: 13 }}>
          <input type="checkbox" checked={alcance[i]} onChange={(e) => setAlcance((a) => a.map((v, j) => (j === i ? e.target.checked : v)))} />
          {t}
        </label>
      ))}
      {Descargo()}
      <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        {!alcanceOK && <span style={{ fontSize: 12, color: RAMP.ambar.mid, alignSelf: "center" }}>Marque todas las condiciones para continuar — si alguna no se cumple, el caso está fuera del alcance y requiere procedimiento específico.</span>}
        <button style={alcanceOK ? S.btnP : { ...S.btn, opacity: 0.5 }} disabled={!alcanceOK} onClick={() => setPaso(2)}>Continuar a evaluación previa →</button>
      </div>
    </div>
  );

  const PasoEvaluacion = () => (
    <>
      <div style={S.card}>
        <p style={S.h}>Paso 2 · Evaluación previa y clasificación de daño</p>
        <p style={S.sub}>La etiqueta roja identifica el riesgo, pero no define la intervención. Antes de clasificar, realice la evaluación de la sección 6.1.</p>
        {[
          ["6.1.1", "Evaluación específica.", "Determine la causa y el mecanismo del daño, la energía potencial remanente (masas en niveles altos, paredes inclinadas, volados dudosos), el tipo de estructura, la inclinación de pisos y desplomes, y el apoyo donde descargarán los puntales (losa de PB, sótano o terreno)."],
          ["6.1.2", "Inventario de miembros dañados.", "Identifique cada elemento afectado (columna, machón, viga, losa, muro, escalera), su nivel de daño según la Tabla 1 y su posición en planta y en altura."],
          ["6.1.3", "Inspección directa.", "Retire el friso suelto, mida el ancho de las grietas y verifique la verticalidad. Ruidos, pérdidas de material, flechas excesivas, fallas de apoyo, desplomes o descuadre de huecos obligan a evacuar y apuntalar desde zonas seguras."],
          ["6.1.4", "Daño significativo: restringir e informar.", "Si observa daño significativo, restrinja el acceso y la colocación del apuntalamiento temporal, e informe la condición al propietario y a la autoridad competente."],
        ].map(([n, t, d]) => (
          <div key={n} style={{ ...S.row, display: "flex", gap: 10 }}>
            <span style={{ minWidth: 40, height: 26, borderRadius: 999, background: RAMP.azul.bg, color: RAMP.azul.fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600 }}>{n}</span>
            <p style={{ margin: 0, fontSize: 12, color: "#55544f", lineHeight: 1.55 }}><b style={{ color: "#1f1f1d" }}>{t}</b> {d}</p>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <AsistenteFoto onSugerencia={(j) => { setClase(j.clase); setFotoIA(j); }} />
        <p style={{ ...S.h, fontSize: 14 }}>Clase de daño del elemento (Tabla 1 y Boletín 61 ANIH)</p>
        <p style={S.sub}>Evalúe en el elemento más desfavorable y en ambas direcciones ortogonales.</p>
        {CLASES.map((c) => (
          <div key={c.id} onClick={() => setClase(c.id)}
            style={{ ...S.row, display: "flex", gap: 10, alignItems: "center", cursor: "pointer", border: clase === c.id ? `2px solid ${RAMP[c.ramp].mid}` : S.row.border }}>
            <span style={S.chip(c.ramp)}>Clase {c.id}</span>
            <span style={{ fontSize: 12, color: "#55544f", flex: 1 }}>{c.desc}</span>
            <span style={{ fontSize: 11, color: c.rd == null ? "#8a887f" : RAMP[c.ramp].mid }}>{c.cond}</span>
          </div>
        ))}
        {clase && requiere && (
          <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#6b6a64" }}>rd ajustado (9.6.3, opcional):</span>
            <input style={{ ...S.input, width: 90, textAlign: "center" }} value={rdCustom} placeholder={String(claseObj?.rd ?? "")} onChange={(e) => setRdCustom(e.target.value.replace(",", "."))} />
            {rdCustom !== "" && <span style={{ ...S.chip("ambar"), fontSize: 11 }}>El ajuste exige evaluación de la sección remanente por el ingeniero estructural</span>}
          </div>
        )}
        {clase && !requiere && (
          <div style={S.banner("verde")}>
            Clase {clase}: no requiere puntales. {clase === "II" ? "Mantener vigilancia y colocar testigos sobre las grietas principales." : "Inspección visual y monitoreo de grietas."} El flujo de cálculo no continúa; puede registrar el caso en el reporte.
          </div>
        )}
        {clase === "V" && (
          <div style={S.banner("rojo")}>Afectado crítico: apuntalamiento inmediato desde zona segura, prioridad máxima. Restrinja el acceso y asegure el área.</div>
        )}
      </div>

      {clase && (
        <div style={S.card}>
          <p style={{ ...S.h, fontSize: 14 }}>Criterio de apuntalamiento según el daño (Figura 3)</p>
          <p style={S.sub}>Criterios orientativos: no sustituyen la evaluación ni el diseño estructural detallado.</p>
          {(() => {
            const f = FIG3[clase];
            return (
              <div style={{ border: `2px solid ${RAMP[f.ramp].mid}`, borderRadius: 8, overflow: "hidden" }}>
                <div style={{ background: RAMP[f.ramp].bg, padding: "8px 12px" }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: RAMP[f.ramp].fg }}>{f.t} · clase {clase}</p>
                  <p style={{ margin: "1px 0 0", fontSize: 11, color: RAMP[f.ramp].mid }}>{f.crit}</p>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  {f.acc.map((a, i) => (<p key={i} style={{ margin: "0 0 4px", fontSize: 12, color: "#55544f" }}>• {a}</p>))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <div style={S.card}>
        <p style={{ ...S.h, fontSize: 14 }}>Movimientos por controlar (sección 6.3)</p>
        <p style={S.sub}>Marque todos los movimientos indeseados observados. Cada uno activa el sistema que lo impide.</p>
        {MOVIMIENTOS.map((m) => (
          <label key={m.id} style={{ ...S.row, display: "flex", gap: 10, cursor: "pointer", border: movs[m.id] ? `2px solid ${RAMP.azul.mid}` : S.row.border }}>
            <input type="checkbox" checked={movs[m.id]} onChange={(e) => setMovs((v) => ({ ...v, [m.id]: e.target.checked }))} style={{ marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>({m.id}) {m.t}</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b6a64" }}>{m.d}</p>
              <p style={{ margin: "5px 0 0", fontSize: 11, color: RAMP.azul.mid }}>→ {m.ruta}</p>
            </div>
          </label>
        ))}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button style={requiere ? S.btnP : S.btn} onClick={() => setPaso(requiere ? 3 : 6)}>{requiere ? "Continuar a extensión →" : "Ir al reporte →"}</button>
        </div>
      </div>
    </>
  );

  const PasoExtension = () => (
    <>
      <div style={S.card}>
        <p style={S.h}>Paso 3 · Criterios de extensión (capítulo 7)</p>
        <p style={S.sub}>La app determina cuánto apuntalar en planta y en altura a partir del inventario de daños.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          {[
            ["Elementos dañados", "nElem"], ["Líneas resistentes dir. X", "lx"], ["Líneas afectadas dir. X", "ax"], ["Líneas resistentes dir. Y", "ly"], ["Líneas afectadas dir. Y", "ay"],
          ].map(([l, k]) => (
            <div key={k}>
              <label style={S.label}>{l}</label>
              <input style={S.input} type="number" min="0" value={lineas[k]} onChange={(e) => setLineas((v) => ({ ...v, [k]: parseInt(e.target.value) || 0 }))} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginTop: 12 }}>
          <Metric l="Líneas afectadas dir. X" v={`${Math.round(pctX)}%`} danger={pctX > 25} />
          <Metric l="Líneas afectadas dir. Y" v={`${Math.round(pctY)}%`} danger={pctY > 25} />
          <Metric l="Umbral 7.3" v={plantaCompleta ? "> 25% ✗" : "≤ 25% ✓"} danger={plantaCompleta} />
        </div>
        <div style={S.banner(plantaCompleta ? "rojo" : "verde")}>
          {plantaCompleta
            ? "Se supera el umbral del 25% por dirección: la redistribución ante réplicas deja de ser confiable — se debe apuntalar la planta completa (7.3.1). El cálculo del área tributaria se aplica a cada elemento y la distribución cubre toda la planta."
            : "No se supera el umbral del 25% por dirección: se apuntala el área tributaria del elemento (7.1), no la planta completa. Con varios elementos, cubra todas las áreas tributarias con solape de al menos una línea de puntales entre áreas contiguas (7.2)."}
        </div>
      </div>
      <div style={S.card}>
        <p style={{ ...S.h, fontSize: 14 }}>Matriz de extensión según el elemento dañado (Tabla 3)</p>
        {TABLA3.map((t) => (
          <div key={t.id} onClick={() => setElemento(t.id)}
            style={{ ...S.row, cursor: "pointer", border: elemento === t.id ? `2px solid ${RAMP.azul.mid}` : S.row.border }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{t.t}</p>
            <p style={{ margin: 0, fontSize: 12, color: "#55544f", lineHeight: 1.5 }}>
              <b>Horizontal:</b> {t.h} <b>Vertical:</b> {t.v}
            </p>
            {!t.calc && elemento === t.id && (
              <p style={{ margin: "6px 0 0", fontSize: 11, color: RAMP.ambar.mid }}>
                Este elemento sigue las reglas específicas del capítulo 9 (ver ficha en el Paso 4); el cálculo numérico del Anexo A aplica a columnas y, con ajustes, a vigas y losas.
              </p>
            )}
          </div>
        ))}
        <div style={S.banner("ambar")}>
          Excepciones 7.4.2 — la regla de tres pisos sanos no aplica a estructuras en construcción, susceptibles de colapso progresivo o con colapso súbito sin causa aparente: el apuntalamiento se extiende hasta el terreno.
        </div>
        <div style={S.banner("azul")}>
          Nota 7.4.4 — cuando las cargas se aproximen a las capacidades tabuladas, verifique la distribución entre losas interconectadas y puntales con el método simplificado de ACI 347.2R-17 antes de operar; ese análisis justifica la reducción escalonada en niveles superiores.
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button style={S.btnP} onClick={() => setPaso(4)}>Continuar a selección del sistema →</button>
        </div>
      </div>
    </>
  );

  const PasoSistema = () => (
    <>
      <div style={S.card}>
        <p style={S.h}>Paso 4 · Selección del sistema — por función (8.1, Tabla 4)</p>
        <p style={S.sub}>Preseleccionado según el miembro dañado y los movimientos por controlar. Se complementa con los procedimientos de la sección 9.</p>
        {(() => {
          const ficha = FICHAS9[elemento] || FICHAS9.columna;
          return (
            <div style={{ border: `2px solid ${RAMP.azul.mid}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>{ficha.t} <span style={{ ...S.chip("azul"), fontSize: 11, marginLeft: 6 }}>Su caso</span></p>
              {ficha.pts.map((p, i) => (<p key={i} style={{ margin: "0 0 4px", fontSize: 12, color: "#55544f", lineHeight: 1.5 }}>✓ {p}</p>))}
              {ficha.no.map((p, i) => (<p key={i} style={{ margin: "0 0 4px", fontSize: 12, color: RAMP.rojo.mid, lineHeight: 1.5 }}>✗ {p}</p>))}
            </div>
          );
        })()}
        {movs.b && <div style={S.banner("ambar")}>Movimiento (b) marcado: aplique además la ficha 9.4 de muros y fachadas (tornapuntas 30°–60°, óptimo 45°; H &gt; 7 m exige acero con cálculo específico).</div>}
        {movs.c && <div style={S.banner("ambar")}>Movimiento (c) marcado: aplique la ficha 9.4.5 de codales de contraste con durmientes verticales y arriostramiento en cruz.</div>}
        {movs.d && <div style={S.banner("ambar")}>Movimiento (d) marcado: aplique la ficha 9.5 de marcos de huecos — no sustituyen el apuntalamiento vertical de las losas superiores.</div>}
      </div>
      <div style={S.card}>
        <p style={{ ...S.h, fontSize: 14 }}>Materialidad del puntal y nivel de carga (8.2, Tabla 5)</p>
        <p style={S.sub}>Cargas orientativas a 2,5 m. Confirme siempre Qp con el catálogo del fabricante para la extensión real (8.2.2 y 10.7); ese valor alimenta el cálculo.</p>
        {TABLA5.map((t) => (
          <div key={t.id} onClick={() => { setPuntalSel(t.id); setQpConf(t.qp); }}
            style={{ ...S.row, cursor: "pointer", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", border: puntalSel === t.id ? `2px solid ${RAMP.azul.mid}` : S.row.border }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{t.t}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b6a64" }}>{t.d}</p>
            </div>
            <span style={{ fontSize: 12, color: "#6b6a64" }}>Qp ref. {t.qp.toFixed(1)} tonf</span>
            {puntalSel === t.id && (
              <span style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                <span style={{ fontSize: 11, color: "#6b6a64" }}>Qp confirmado:</span>
                <input style={{ ...S.input, width: 70, textAlign: "center" }} value={qpConf} onChange={(e) => setQpConf(parseFloat(e.target.value.replace(",", ".")) || 0)} />
                <span style={{ fontSize: 11, color: "#6b6a64" }}>tonf</span>
              </span>
            )}
          </div>
        ))}
        <p style={{ ...S.h, fontSize: 14, marginTop: 14 }}>Clasificación por estabilidad (8.3)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8, marginTop: 8 }}>
          {[
            ["C1", "Unidimensional", "Un poste. Medida inmediata en zona muy peligrosa: puntal de rescate o telescópico individual."],
            ["C2", "Bidimensional", "Dos o más postes en un plano, pares alineados separados no más de 1,5 m."],
            ["C3", "Tridimensional", "Conjunto arriostrado en ambas direcciones, o torres de carga. Meta final del sistema."],
          ].map(([c, t, d]) => (
            <button key={c} type="button" onClick={() => setEstabilidad(c)}
              style={{ ...S.row, marginBottom: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%", background: estabilidad === c ? (c === "C3" ? RAMP.verde.bg : RAMP.ambar.bg) : "#fff", border: estabilidad === c ? `2px solid ${c === "C3" ? RAMP.verde.mid : RAMP.ambar.mid}` : S.row.border }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1f1f1d" }}>
                <span style={{ ...S.chip(c === "C3" ? "verde" : "ambar"), marginRight: 6 }}>{c}</span>{t}
                {estabilidad === c && <span style={{ fontSize: 10, color: c === "C3" ? RAMP.verde.mid : RAMP.ambar.mid, marginLeft: 6 }}>✓ Seleccionada</span>}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b6a64", lineHeight: 1.5 }}>{d}</p>
            </button>
          ))}
        </div>
        {estabilidad === "C3" ? (
          <div style={S.banner("verde")}>
            <b>Clase C3 seleccionada — configuración definitiva.</b> El flujograma de extensión (Figura 6) exige arriostrar el sistema hasta clase 3, y todo sistema se arriostra en las dos direcciones (10.5).{" "}
            {res && requiere && res.filas ? `Su caso requiere ${res.filas.find((f) => f.tipo === "dañado")?.total ?? "varios"} puntales en el nivel dañado distribuidos en ${res.nv} líneas: un grupo así solo es estable como conjunto arriostrado en ambas direcciones (o torres), porque el arriostramiento garantiza la estabilidad del sistema aunque no aumente la resistencia de los puntales (8.3.1).` : "Todo sistema con dos o más puntales bajo un mismo miembro solo es estable como conjunto arriostrado en ambas direcciones (8.3.1)."}
          </div>
        ) : (
          <div style={S.banner("ambar")}>
            <b>Clase {estabilidad} seleccionada — etapa transitoria (8.3.2).</b> {estabilidad === "C1" ? "Los puntales individuales son una medida inmediata en zonas muy peligrosas: instálelos desde zona segura y sin permanencia del personal bajo el sistema." : "Los pares alineados en un plano deben quedar separados no más de 1,5 m entre sí."}{" "}
            El sistema definitivo de emergencia debe progresar a clase C3 — unir y arriostrar en ambas direcciones o sustituir por torres — conforme a la secuencia 8.3.2, al requisito de arriostramiento 10.5 y al flujograma de la Figura 6. Esta condición quedará registrada en la memoria como acción pendiente.
          </div>
        )}
        {clase === "V" && (
          <div style={S.banner("rojo")}>
            Con daño clase V, inicie con C1 desde zona segura como medida inmediata y progrese C1 → C2 → C3 sin permanecer en las etapas intermedias; la Figura 3 recomienda estabilización de emergencia con torre o arriostramiento tridimensional.
          </div>
        )}
        <div style={S.banner("azul")}>
          Secuencia en zonas de alto riesgo (8.3.2): (1) puntales individuales como medida inmediata → (2) pares alineados a máx. 1,5 m → (3) unir y arriostrar en ambas direcciones, o sustituir por torres, hasta conformar conjuntos clase 3.
        </div>
        <div style={S.banner("rojo")}>
          El arriostramiento no incrementa la resistencia: solo garantiza la estabilidad (8.3.1). No mezclar puntales de rigideces distintas bajo un mismo miembro (8.2.1). Torres con todos sus módulos y diagonales (8.3.3). Madera solo en reparto, riostras y sistemas laterales o de huecos; sin clasificación estructural, su carga de diseño se reduce al 25%; prohibida la madera de demolición (8.2.2). FS ≥ 2,0 (8.4.2). Separaciones máximas: 0,4 m individuales · 1,2 m torres (8.4.3).
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button style={S.btnP} onClick={() => setPaso(5)}>Continuar al cálculo →</button>
        </div>
      </div>
    </>
  );

  const PasoCalculo = () => (
    <>
      <div style={S.card}>
        <p style={S.h}>Paso 5 · Cálculo del apuntalamiento (8.4 y Anexo A)</p>
        <p style={S.sub}>Introduzca su caso o cargue un ejemplo oficial para ver el procedimiento resuelto.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginBottom: 6 }}>
          {EJEMPLOS.map((e) => (
            <button key={e.id} type="button" onClick={() => cargarEjemplo(e)}
              style={{ ...S.row, marginBottom: 0, cursor: "pointer", textAlign: "left", background: ejemploCargado === e.id ? RAMP.verde.bg : "#fff", border: ejemploCargado === e.id ? `2px solid ${RAMP.verde.mid}` : S.row.border, fontFamily: "inherit", width: "100%" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#1f1f1d" }}>{e.nombre}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6b6a64" }}>{e.desc}</p>
              <p style={{ margin: "5px 0 0", fontSize: 11, color: ejemploCargado === e.id ? RAMP.verde.mid : RAMP.azul.mid }}>{ejemploCargado === e.id ? "✓ Cargado" : "Cargar ejemplo"}</p>
            </button>
          ))}
        </div>
        {ejemploCargado && (
          <div style={{ ...S.banner("verde"), marginTop: 4 }}>
            ✓ {EJEMPLOS.find((e) => e.id === ejemploCargado)?.nombre} cargado: los datos se aplicaron en el formulario y los resultados aparecen más abajo. Puede modificar cualquier valor para explorar el procedimiento.
          </div>
        )}
        <p style={{ fontSize: 11, color: MOTOR_OK ? RAMP.verde.mid : RAMP.rojo.mid, margin: "4px 0 0" }}>
          {MOTOR_OK ? "✓ Motor de cálculo verificado automáticamente contra los tres casos del Anexo A." : "✗ Advertencia: la autoverificación contra el Anexo A no coincidió — revise los resultados manualmente."}
        </p>
      </div>

      <div style={S.card}>
        <p style={{ ...S.h, fontSize: 14 }}>Calculadora auxiliar de q (8.4.1 y Tabla 6)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <div>
            <label style={S.label}>Losa</label>
            <select style={S.input} value={qAux.losaTipo} onChange={(e) => setQAux((v) => ({ ...v, losaTipo: e.target.value }))}>
              <option value="nervada">Nervada con bloques · 500 kgf/m²</option>
              <option value="maciza10">Maciza e = 10 cm · 250 kgf/m²</option>
              <option value="maciza15">Maciza e = 15 cm · 375 kgf/m²</option>
              <option value="maciza20">Maciza e = 20 cm · 500 kgf/m²</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Acabados, friso y otros permanentes (kgf/m²)</label>
            <input style={S.input} type="number" value={qAux.acabados} onChange={(e) => setQAux((v) => ({ ...v, acabados: e.target.value }))} />
          </div>
          <div>
            <label style={S.label}>Cargas variables (ocupación / cuadrillas) (kgf/m²)</label>
            <input style={S.input} type="number" value={qAux.variables} onChange={(e) => setQAux((v) => ({ ...v, variables: e.target.value }))} />
          </div>
          <div>
            <label style={S.label}>Cargas concentradas identificadas (tonf, se suman a PT)</label>
            <input style={S.input} type="number" value={inp.concentradas} onChange={(e) => setInp((v) => ({ ...v, concentradas: parseFloat(e.target.value) || 0 }))} />
          </div>
        </div>
        <label style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          <input type="checkbox" checked={qAux.paredes} onChange={(e) => setQAux((v) => ({ ...v, paredes: e.target.checked }))} /> Incluir paredes divisorias livianas · 75 kgf/m²
        </label>
        <div style={{ ...S.banner("ambar"), display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span>Personal y escombros ligeros — previsión mínima obligatoria: 50 kgf/m² (fijo, 8.4.1).</span>
          <b>q sugerido = {Math.round(qTotal)} kgf/m²</b>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button style={S.btn} onClick={() => setInp((v) => ({ ...v, q: Math.round(qTotal) }))}>Usar q = {Math.round(qTotal)} kgf/m²</button>
          <span style={{ fontSize: 12, color: "#6b6a64" }}>o introduzca q manualmente abajo. Tabla 6: concreto 2500 kgf/m³ · acero 7850 kgf/m³ · mampostería frisada 330 · losa maciza 250 (e=10 cm) · nervada 500 · paredes 75 · personal 50.</span>
        </div>
      </div>

      <div style={S.card}>
        <p style={{ ...S.h, fontSize: 14 }}>Datos del elemento (Anexo A, Paso 1)</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <div>
            <label style={S.label}>Posición en planta</label>
            <select style={S.input} value={inp.pos} onChange={(e) => setInp((v) => ({ ...v, pos: e.target.value }))}>
              <option value="central">Central (nv = 4)</option>
              <option value="lateral">Lateral (nv = 3)</option>
              <option value="esquinera">Esquinera (nv = 2)</option>
            </select>
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: "#8a887f", lineHeight: 1.4 }}>
              nv = vigas que concurren al nudo superior de la columna. Define las líneas de reparto: Pv = PA/nv y puntales por línea = ⌈N0/nv⌉.
            </p>
          </div>
          <div>
            <label style={S.label}>Niveles del edificio (PB + pisos)</label>
            <input style={S.input} type="number" min="1" value={inp.niveles} onChange={(e) => { const n = parseInt(e.target.value) || 1; setInp((v) => ({ ...v, niveles: n, nivel: Math.min(v.nivel, n - 1), ns: Math.max(1, n - Math.min(v.nivel, n - 1)) })); }} />
          </div>
          <div>
            <label style={S.label}>Sótanos (0 a 4)</label>
            <select style={S.input} value={inp.sotanos} onChange={(e) => { const s = parseInt(e.target.value); setInp((v) => { const nivel = Math.max(v.nivel, -s); return { ...v, sotanos: s, nivel, ns: Math.max(1, v.niveles - nivel) }; }); }}>
              {[0, 1, 2, 3, 4].map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div>
            <label style={S.label}>Nivel de la columna</label>
            <select style={S.input} value={inp.nivel} onChange={(e) => { const l = parseInt(e.target.value); setInp((v) => ({ ...v, nivel: l, ns: Math.max(1, v.niveles - l) })); }}>
              {Array.from({ length: inp.niveles + inp.sotanos }, (_, i) => i - inp.sotanos).map((i) => (<option key={i} value={i}>{nombreNivel(i)}</option>))}
            </select>
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: "#8a887f", lineHeight: 1.4 }}>
              En sótanos, ns incluye las losas de los sótanos superiores y de PB; el terreno es el fondo del último sótano (Tabla 2).
            </p>
          </div>
          <div>
            <label style={S.label}>Losas por encima ns</label>
            <input style={S.input} type="number" min="1" value={inp.ns} onChange={(e) => setInp((v) => ({ ...v, ns: parseInt(e.target.value) || 1 }))} />
          </div>
          <div><label style={S.label}>L1 (m)</label><input style={S.input} type="number" step="0.1" value={inp.L1} onChange={(e) => setInp((v) => ({ ...v, L1: parseFloat(e.target.value) || 0 }))} /></div>
          <div>
            <label style={S.label}>L2 (m)</label>
            <input style={S.input} type="number" step="0.1" value={inp.L2} onChange={(e) => setInp((v) => ({ ...v, L2: parseFloat(e.target.value) || 0 }))} />
            <p style={{ margin: "4px 0 0", fontSize: 10.5, color: "#8a887f", lineHeight: 1.4 }}>
              AT = L1 × L2 = {r2(inp.L1 * inp.L2)} m². L1 y L2 son los anchos tributarios (7.1): en cada dirección, la semisuma de las luces adyacentes a la columna. Central: (luz izq + luz der)/2 en ambas. Lateral: semisuma paralela al borde y mitad de la única luz perpendicular. Esquinera: mitad de la única luz en cada dirección. Sume los volados completos si existen.
            </p>
          </div>
          <div><label style={S.label}>q (kgf/m²)</label><input style={S.input} type="number" value={inp.q} onChange={(e) => setInp((v) => ({ ...v, q: parseFloat(e.target.value) || 0 }))} /></div>
          <div><label style={S.label}>Qp del puntal (tonf)</label><input style={S.input} type="number" step="0.5" value={qpConf} onChange={(e) => setQpConf(parseFloat(e.target.value) || 0)} /></div>
          <div><label style={S.label}>Viga b (cm)</label><input style={S.input} type="number" value={inp.b} onChange={(e) => setInp((v) => ({ ...v, b: parseFloat(e.target.value) || 0 }))} /></div>
          <div><label style={S.label}>Viga d útil (cm)</label><input style={S.input} type="number" value={inp.d} onChange={(e) => setInp((v) => ({ ...v, d: parseFloat(e.target.value) || 0 }))} /></div>
          <div><label style={S.label}>f′c (kgf/cm²)</label><input style={S.input} type="number" value={inp.fc} onChange={(e) => setInp((v) => ({ ...v, fc: parseFloat(e.target.value) || 0 }))} /></div>
          <div>
            <label style={S.label}>Clase de daño</label>
            <select style={S.input} value={clase || ""} onChange={(e) => setClase(e.target.value)}>
              <option value="" disabled>Seleccione</option>
              <option value="III">III · moderado (rd 0,50)</option>
              <option value="IV">IV · severo (rd 0,25)</option>
              <option value="V">V · completo (rd 0,00)</option>
            </select>
          </div>
        </div>
      </div>

      {res && clase && requiere && (
        <div style={S.card}>
          <p style={{ ...S.h, fontSize: 14 }}>Resultados</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            <Metric l="AT = L1 × L2" v={`${res.AT} m²`} />
            <Metric l="PT = ns·AT·q" v={`${res.PT} tonf`} />
            <Metric l={`PA = PT·(1−${res.rd})`} v={`${res.PA} tonf`} />
            <Metric l="Vadm por viga" v={`${res.Vadm} tonf`} />
            <Metric l={`Pv = PA/${res.nv}`} v={`${res.Pv} tonf`} danger={res.Pv > res.Vadm} />
            <Metric l="FS = Vadm/Pv" v={res.FS} danger={res.FS < 2} />
          </div>
          {res.warnings.map((w, i) => (<div key={i} style={S.banner("rojo")}>{w}</div>))}
          <p style={{ ...S.h, fontSize: 13, marginTop: 14 }}>Distribución por nivel</p>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "#6b6a64", fontSize: 12, textAlign: "left" }}>
                {["Nivel", "PA,j (tonf)", "N0 mín.", "Por línea", "Total instalado"].map((h) => (
                  <th key={h} style={{ padding: "6px 8px", borderBottom: "1px solid #cfcdc4", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res.filas.map((f, i) => (
                <tr key={i} style={{ background: f.tipo === "dañado" ? RAMP.ambar.bg : "transparent" }}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #e3e1d9" }}>{nombreNivel(f.nivel)}{f.tipo === "dañado" ? " · nivel dañado" : f.tipo === "inferior" ? " · repite arreglo (Tabla 2)" : ""}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #e3e1d9" }}>{f.PAj}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #e3e1d9" }}>{f.N0}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #e3e1d9" }}>{f.porLinea}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #e3e1d9", fontWeight: 600 }}>{f.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "#6b6a64", margin: "8px 0 0" }}>
            Total de puntales del caso: <b>{res.totalPuntales}</b>. {(inp.nivel + (inp.sotanos || 0)) >= 3 ? "Hacia abajo existen al menos tres pisos sanos (Tabla 2): no se requieren niveles inferiores." : res.abajo > 0 ? "Hacia abajo se repite el arreglo del nivel dañado hasta el terreno (Tabla 2)." : "El nivel dañado descarga directamente al terreno."} Separación máxima entre ejes: 0,4 m individuales · 1,2 m torres (8.4.3).
          </p>

          <div style={{ marginTop: 12 }}>
            <button style={S.btn} onClick={() => setMostrarDesarrollo((v) => !v)}>{mostrarDesarrollo ? "Ocultar" : "Mostrar"} desarrollo paso a paso</button>
            {mostrarDesarrollo && (
              <div style={{ marginTop: 8 }}>
                {[
                  [`Paso 2 · Carga total: PT = ns · AT · q = ${inp.ns} × ${res.AT} × ${r2(inp.q / 1000)} ${inp.concentradas ? `+ ${inp.concentradas} (concentradas) ` : ""}= ${res.PT} tonf`, "azul"],
                  [`Paso 3 · Carga de apuntalamiento: rd = ${res.rd} (Tabla A.1${rdCustom !== "" ? ", ajustado por el ingeniero según 9.6.3" : ""}) → PA = ${res.PT} × ${r2(1 - res.rd)} = ${res.PA} tonf`, "azul"],
                  [`Paso 4 · Verificación de vigas: Vadm = 0,85 · 0,53 · √${inp.fc} · ${inp.b} · ${inp.d} = ${res.Vadm} tonf · Pv = ${res.PA} / ${res.nv} = ${res.Pv} tonf ${res.Pv > res.Vadm ? "> Vadm → repartir la carga apuntalando vigas de niveles superiores" : "≤ Vadm ✓"}`, res.Pv > res.Vadm ? "rojo" : "azul"],
                  [`Paso 5 · Puntales en ${nombreNivel(inp.nivel)}: N0 = ${res.PA} / ${qpConf} = ${r2(res.PA / qpConf)} → ${res.filas.find((f) => f.tipo === "dañado").N0} mínimo → ${res.filas.find((f) => f.tipo === "dañado").porLinea} por línea (nv = ${res.nv}) = ${res.filas.find((f) => f.tipo === "dañado").total} instalados`, "azul"],
                  [`Paso 6 · Escalonado: ${res.filas.filter((f) => f.tipo === "superior").length > 0 ? res.filas.filter((f) => f.tipo === "superior").slice().reverse().map((f) => `${nombreNivel(f.nivel)} (${inp.ns - (f.nivel - inp.nivel)} losas): PA,j = ${f.PAj} → ${f.total} puntales`).join(" · ") : "sin niveles superiores requeridos (Pv ≤ Vadm, FS ≥ 2 y daño ≤ moderado)"}. ${res.abajo > 0 ? `Hacia abajo: arreglo repetido en ${res.filas.filter((f) => f.tipo === "inferior").map((f) => nombreNivel(f.nivel)).join(", ")} hasta el terreno.` : ""}`, "azul"],
                  [`Paso 7 · Verificaciones finales: capacidad real del puntal a su extensión (10.7), losas y vigas receptoras (7.4.4), apoyo y reparto ≥ 45×45 cm (10.2), arriostramiento en dos direcciones (10.5).`, "verde"],
                ].map(([t, c], i) => (
                  <div key={i} style={{ borderLeft: `3px solid ${RAMP[c].mid}`, padding: "8px 12px", background: "#f5f4ef", marginBottom: 6, fontSize: 12, color: "#55544f", lineHeight: 1.6 }}>{t}</div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button style={S.btnP} onClick={() => setPaso(6)}>Generar memoria de cálculo →</button>
          </div>
        </div>
      )}
      {clase && !requiere && <div style={{ ...S.card }}><div style={S.banner("verde")}>La clase seleccionada ({clase}) no requiere apuntalamiento: no aplica el cálculo del Anexo A.</div></div>}
      {!clase && <div style={S.card}><div style={S.banner("ambar")}>Seleccione la clase de daño (Paso 2 o en el formulario de datos) para ejecutar el cálculo.</div></div>}
    </>
  );

  const Memoria = () => (
    <div id="memoria">
      <div style={S.card} className="no-print">
        <p style={S.h}>Paso 6 · Memoria de cálculo y reporte</p>
        <p style={S.sub}>Complete los datos del proyecto, revise la memoria y use Imprimir para guardar en PDF.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {[["Obra / edificación", "obra"], ["Elemento (ej. PB–C4)", "elementoId"], ["Ingeniero evaluador", "evaluador"], ["CIV del evaluador", "civ"], ["Fecha", "fecha"]].map(([l, k]) => (
            <div key={k}><label style={S.label}>{l}</label><input style={S.input} value={proyecto[k]} onChange={(e) => setProyecto((p) => ({ ...p, [k]: e.target.value }))} /></div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button style={S.btn} onClick={exportarJSON}>Exportar caso (JSON)</button>
          <button style={S.btnP} onClick={() => window.print()}>Imprimir / guardar PDF</button>
        </div>
      </div>

      <div style={{ ...S.card }} id="memoria-doc">
        <p style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Memoria de cálculo de apuntalamiento de emergencia</p>
        <p style={{ margin: "2px 0 12px", fontSize: 12, color: "#6b6a64" }}>
          {proyecto.obra || "Obra: ____________"} · Elemento {proyecto.elementoId || "____"} · {proyecto.fecha} · Evaluador: {proyecto.evaluador || "____________"} {proyecto.civ ? `· CIV ${proyecto.civ}` : ""}
        </p>

        <p style={{ ...S.h, fontSize: 13 }}>1. Verificación de alcance (sección 2)</p>
        <p style={{ fontSize: 12, color: "#55544f", margin: "0 0 10px" }}>
          {alcanceOK ? "Se verificaron las seis condiciones de alcance: estructura aporticada de concreto armado con daños en columnas, vigas o losas; sin víctimas atrapadas; sin daño geotécnico dominante; no patrimonial ni en construcción; no prefabricado con apuntalamiento al terreno; altura ≤ 6,0 m." : "⚠ El checklist de alcance no está completo."}
        </p>

        <p style={{ ...S.h, fontSize: 13 }}>2. Evaluación previa y clasificación del daño (secciones 6.1 y 6.2)</p>
        <p style={{ fontSize: 12, color: "#55544f", margin: "0 0 4px" }}>
          Clase de daño confirmada por el ingeniero: <b>{clase || "—"}</b>{claseObj ? ` (${claseObj.desc})` : ""}. Fracción remanente aplicada rd = {rdEfectivo ?? "—"}{rdCustom !== "" ? " (ajustada por el ingeniero conforme a 9.6.3)" : " (Tabla A.1)"}.
          Criterio Figura 3: {clase ? FIG3[clase].crit : "—"}.
        </p>
        {fotoIA && (
          <p style={{ fontSize: 11, color: "#8a887f", margin: "0 0 4px" }}>
            Asistente fotográfico (orientativo): clase sugerida por IA {fotoIA.clase}; observaciones: {fotoIA.observaciones?.join(" ")} La clase definitiva fue establecida por el ingeniero mediante evaluación en sitio.
          </p>
        )}
        <p style={{ fontSize: 12, color: "#55544f", margin: "0 0 10px" }}>
          Movimientos por controlar (6.3): {Object.entries(movs).filter(([, v]) => v).map(([k]) => `(${k})`).join(", ") || "no marcados"}.
        </p>

        <p style={{ ...S.h, fontSize: 13 }}>3. Criterios de extensión (capítulo 7)</p>
        <p style={{ fontSize: 12, color: "#55544f", margin: "0 0 10px" }}>
          Elemento dañado: {TABLA3.find((t) => t.id === elemento)?.t}. Líneas resistentes afectadas: {Math.round(pctX)}% en X y {Math.round(pctY)}% en Y — {plantaCompleta ? "se supera el umbral del 25%: apuntalar la planta completa (7.3.1)" : "≤ 25%: se apuntala el área tributaria (7.1) con solape entre áreas contiguas si aplica (7.2)"}. Extensión vertical: {TABLA3.find((t) => t.id === elemento)?.v}
        </p>

        <p style={{ ...S.h, fontSize: 13 }}>4. Sistema seleccionado (capítulo 8)</p>
        <p style={{ fontSize: 12, color: "#55544f", margin: "0 0 4px" }}>
          {TABLA5.find((t) => t.id === puntalSel)?.t} con Qp confirmado = {qpConf} tonf para la extensión real (según catálogo del fabricante, 8.2.2 y 10.7). Clase de estabilidad del sistema instalado: <b>{estabilidad}</b> ({estabilidad === "C1" ? "unidimensional" : estabilidad === "C2" ? "bidimensional" : "tridimensional"}). FS ≥ 2,0 (8.4.2). Separaciones máximas 0,4 m individuales · 1,2 m torres (8.4.3). No mezclar rigideces bajo un mismo miembro (8.2.1).
        </p>
        {estabilidad !== "C3" && (
          <p style={{ fontSize: 12, color: RAMP.ambar.mid, margin: "0 0 10px" }}>
            ⚠ Acción pendiente: la clase {estabilidad} es una etapa transitoria (8.3.2). El sistema debe progresar a clase C3 — arriostrado en ambas direcciones o torres — antes de considerarse la configuración definitiva de emergencia (10.5, Figura 6).
          </p>
        )}
        {estabilidad === "C3" && <p style={{ margin: "0 0 10px" }}></p>}

        {res && requiere && (
          <>
            <p style={{ ...S.h, fontSize: 13 }}>5. Cálculo (Anexo A) — datos y desarrollo</p>
            <p style={{ fontSize: 12, color: "#55544f", margin: "0 0 6px" }}>
              Posición {inp.pos} (nv = {res.nv}) · nivel {nombreNivel(inp.nivel)} de {inp.niveles} niveles{inp.sotanos > 0 ? ` + ${inp.sotanos} sótano${inp.sotanos > 1 ? "s" : ""}` : ""} · ns = {inp.ns} · L1 = {inp.L1} m · L2 = {inp.L2} m · q = {inp.q} kgf/m²{inp.concentradas ? ` · concentradas = ${inp.concentradas} tonf` : ""} · viga b×d = {inp.b}×{inp.d} cm · f′c = {inp.fc} kgf/cm².
            </p>
            <p style={{ fontSize: 12, color: "#55544f", margin: "0 0 6px", lineHeight: 1.7 }}>
              AT = {res.AT} m² · PT = {res.PT} tonf · PA = PT·(1−rd) = {res.PA} tonf · Vadm = 0,85·0,53·√f′c·b·d = {res.Vadm} tonf · Pv = PA/nv = {res.Pv} tonf · FS = {res.FS}.
            </p>
            {res.warnings.map((w, i) => (<p key={i} style={{ fontSize: 12, color: RAMP.rojo.mid, margin: "0 0 4px" }}>⚠ {w}</p>))}
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", margin: "8px 0" }}>
              <thead><tr>{["Nivel", "PA,j (tonf)", "N0", "Por línea", "Total"].map((h) => (<th key={h} style={{ textAlign: "left", padding: "4px 8px", borderBottom: "1px solid #cfcdc4" }}>{h}</th>))}</tr></thead>
              <tbody>
                {res.filas.map((f, i) => (
                  <tr key={i} style={{ background: f.tipo === "dañado" ? RAMP.ambar.bg : "transparent" }}>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #e3e1d9" }}>{nombreNivel(f.nivel)}{f.tipo === "dañado" ? " (dañado)" : ""}</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #e3e1d9" }}>{f.PAj}</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #e3e1d9" }}>{f.N0}</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #e3e1d9" }}>{f.porLinea}</td>
                    <td style={{ padding: "4px 8px", borderBottom: "1px solid #e3e1d9", fontWeight: 600 }}>{f.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <p style={{ ...S.h, fontSize: 13, marginTop: 12 }}>6. Procedimiento del miembro (capítulo 9)</p>
        {(FICHAS9[elemento] || FICHAS9.columna).pts.map((p, i) => (<p key={i} style={{ fontSize: 12, color: "#55544f", margin: "0 0 3px" }}>✓ {p}</p>))}
        {(FICHAS9[elemento] || FICHAS9.columna).no.map((p, i) => (<p key={i} style={{ fontSize: 12, color: RAMP.rojo.mid, margin: "0 0 3px" }}>✗ {p}</p>))}

        <p style={{ ...S.h, fontSize: 13, marginTop: 12 }}>7. Ejecución y detalles constructivos (capítulo 10)</p>
        {FICHAS10.map((f, i) => (<p key={i} style={{ fontSize: 12, color: "#55544f", margin: "0 0 4px" }}><b>{f.t}.</b> {f.d}</p>))}

        <p style={{ ...S.h, fontSize: 13, marginTop: 12 }}>8. Descargos</p>
        <p style={{ fontSize: 12, color: RAMP.rojo.mid, margin: "0 0 4px", lineHeight: 1.6 }}>
          El apuntalamiento de emergencia no repara ni refuerza la estructura, no restituye su capacidad sismorresistente y no autoriza la reocupación de la edificación. Este documento no sustituye el diseño del sistema de apuntalamiento, el cual debe ser realizado exclusivamente por ingenieros civiles estructurales y estar debidamente firmado y tramitado mediante un proyecto en la alcaldía correspondiente (Anexo A.2). Los valores de la Tabla A.1 son parámetros operativos de la comisión.
        </p>
        <div style={{ display: "flex", gap: 40, marginTop: 26, fontSize: 12, color: "#55544f" }}>
          <div style={{ borderTop: "1px solid #55544f", paddingTop: 4, minWidth: 200 }}>Ingeniero evaluador · firma y CIV</div>
          <div style={{ borderTop: "1px solid #55544f", paddingTop: 4, minWidth: 200 }}>Ingeniero estructural responsable · firma y CIV</div>
        </div>
        <div style={{ marginTop: 16, borderTop: "1px solid #e3e1d9", paddingTop: 8 }}>
          {CREDITO_MEMORIA.map(([t, d], i) => (
            <p key={i} style={{ fontSize: 10, color: "#8a887f", margin: "0 0 3px", lineHeight: 1.5 }}>
              {t && <b style={{ color: "#6b6a64" }}>{t} </b>}{d}
            </p>
          ))}
        </div>
      </div>
    </div>
  );

  const Guia = () => (
    <>
      <div style={S.card}>
        <p style={S.h}>Guía rápida de campo</p>
        <p style={S.sub}>Los dos capítulos que definen cuánto y con qué apuntalar, explicados para quien no conoce los lineamientos.</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#534AB7", margin: "0 0 8px" }}>Capítulo 7 · ¿Cuánto apuntalar? (extensión)</p>
        {[
          ["7.1", "No se apuntala toda la planta por un elemento aislado.", "Se sostiene solo el área tributaria del elemento dañado y se repite el arreglo, alineado, en mínimo los dos niveles superiores cuando corresponde."],
          ["7.2", "Varios elementos dañados:", "se cubren todas sus áreas tributarias; si son contiguas, la envolvente con al menos una línea de puntales de solape. Vigas o franjas de losa: la luz completa más ¼ de luz hacia cada apoyo."],
          ["7.3", "Regla del 25%:", "cuente las líneas resistentes por dirección y cuántas tienen elementos dañados. Si más del 25% están afectadas en una dirección, se apuntala la planta completa."],
          ["7.4", "En altura, regla «3 sanos por 1 dañado»:", "en concreto vaciado en sitio, apuntale el nivel dañado y baje hasta contar con tres pisos sanos o llegar al terreno. Se ejecuta desde abajo del piso dañado hacia arriba, nivel por nivel, alineado."],
        ].map(([n, t, d]) => (
          <div key={n} style={{ ...S.row, display: "flex", gap: 10 }}>
            <span style={{ ...S.chip("verde"), background: "#EEEDFE", color: "#3C3489", alignSelf: "flex-start" }}>{n}</span>
            <p style={{ margin: 0, fontSize: 12, color: "#55544f", lineHeight: 1.55 }}><b style={{ color: "#1f1f1d" }}>{t}</b> {d}</p>
          </div>
        ))}
        <p style={{ fontSize: 13, fontWeight: 600, color: "#0F6E56", margin: "14px 0 8px" }}>Capítulo 8 · ¿Con qué apuntalar? (selección)</p>
        {[
          ["8.1", "Por función:", "vertical para losas, vigas y columnas; lateral (tornapuntas) para muros y fachadas; horizontal (codales) entre edificaciones enfrentadas; marcos para huecos."],
          ["8.2", "Por carga:", "telescópico ~3 tonf, aluminio ~8, torre ~10, tubulares 3,5 a 15 (a 2,5 m; confirme catálogo). Madera solo en cabezales, durmientes, cuñas, riostras y sistemas laterales; nunca de demolición."],
          ["8.3", "Estabilidad C1 → C2 → C3:", "individuales como medida inmediata, luego pares en un plano (máx. 1,5 m) y finalmente conjuntos arriostrados en ambas direcciones. El arriostramiento no aumenta la resistencia."],
          ["8.4", "Nivel de carga:", "carga = peso por m² × área tributaria + concentradas + mínimo 50 kgf/m² de personal. Puntales = carga ÷ capacidad, FS ≥ 2, separaciones 0,4 m / 1,2 m."],
        ].map(([n, t, d]) => (
          <div key={n} style={{ ...S.row, display: "flex", gap: 10 }}>
            <span style={{ ...S.chip("verde"), background: "#E1F5EE", color: "#085041", alignSelf: "flex-start" }}>{n}</span>
            <p style={{ margin: 0, fontSize: 12, color: "#55544f", lineHeight: 1.55 }}><b style={{ color: "#1f1f1d" }}>{t}</b> {d}</p>
          </div>
        ))}
      </div>
    </>
  );

  const Cap10 = () => (
    <div style={S.card}>
      <p style={S.h}>Ejecución y detalles constructivos (capítulo 10)</p>
      <p style={S.sub}>Fichas de campo consultables durante el montaje. Se anexan a la memoria del caso.</p>
      {FICHAS10.map((f, i) => (
        <div key={i} style={S.row}>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600 }}>{f.t}</p>
          <p style={{ margin: 0, fontSize: 12, color: "#55544f", lineHeight: 1.55 }}>{f.d}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#f5f4ef", minHeight: "100vh", color: "#1f1f1d" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body, #root > div { background: #fff !important; }
          #memoria-doc { border: none !important; }
        }
        button:hover { opacity: 0.9; }
        input, select { font-family: inherit; }
      `}</style>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 16px 40px" }}>
        <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: RAMP.rojo.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>▦</div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Apuntala</p>
              <p style={{ margin: 0, fontSize: 12, color: "#6b6a64" }}>Apuntalamiento de emergencia · Sismo 24J · Venezuela</p>
            </div>
          </div>
          <span style={S.chip("ambar")}>Lineamientos rev. 3 · 23/07/2026</span>
        </div>
        {Nav()}
        {paso === 1 && PasoAlcance()}
        {paso === 2 && PasoEvaluacion()}
        {paso === 3 && PasoExtension()}
        {paso === 4 && PasoSistema()}
        {paso === 5 && PasoCalculo()}
        {paso === 6 && Memoria()}
        {paso === 7 && Guia()}
        {paso === 8 && Cap10()}
        <div className="no-print" style={{ marginTop: 20, borderTop: "1px solid #e3e1d9", paddingTop: 10 }}>
          <p style={{ fontSize: 10.5, color: "#8a887f", lineHeight: 1.5, margin: "0 0 3px" }}>{CREDITO_DOC}</p>
          <p style={{ fontSize: 10.5, color: "#6b6a64", lineHeight: 1.5, margin: 0 }}>{CREDITO_APP}</p>
        </div>
      </div>
    </div>
  );
}
