const fields = [
  { key: 'brandModel', label: 'Marca y modelo' },
  { key: 'firstRegistration', label: 'Fecha de 1ª matric.' },
  { key: 'fuel', label: 'Combustible' },
  { key: 'displacement', label: 'Cilindrada' },
  { key: 'power', label: 'Potencia' },
  { key: 'emissions', label: 'Emisiones' },
  { key: 'cylinders', label: 'Nº de cilindros' },
];

const extractBtn = document.getElementById('extractBtn');
const clearBtn = document.getElementById('clearBtn');
const rawInput = document.getElementById('rawInput');
const status = document.getElementById('status');
const resultList = document.getElementById('resultList');

extractBtn.addEventListener('click', extractData);
clearBtn.addEventListener('click', () => {
  rawInput.value = '';
  status.textContent = '';
  renderResult({});
});

function setStatus(message, muted = false) {
  status.textContent = message;
  status.className = muted ? 'status muted' : 'status';
}

function normalize(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function pick(text, regexes) {
  for (const regex of regexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      return normalize(match[1]);
    }
  }
  return '';
}

function extractLocal(text) {
  const brandModel = pick(text, [
    /(?:Marca\s*\/\s*modelo|Marke\s*\/\s*Modell|Marca|Brand(?: and model)?|Model)\s*[:\-]?\s*([^\n\r]+)/i,
    /^(\b[A-Z][\w\-]+\s+[A-Z0-9][^\n\r]{1,40})$/m,
  ]);

  const firstRegistration = pick(text, [
    /(?:1\.?\s*matric\.?|Erstzulassung|First registration)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const fuel = pick(text, [
    /(?:Combustible|Kraftstoff|Fuel)\s*[:\-]?\s*([^\n\r]+)/i,
  ]);

  const displacement = pick(text, [
    /(?:Cilindrada|Hubraum|Displacement)\s*[:\-]?\s*([^\n\r]+)/i,
    /(\d{3,5}\s*(?:cm³|ccm|cc))/i,
  ]);

  const power = pick(text, [
    /(?:Potencia|Leistung|Power)\s*[:\-]?\s*([^\n\r]+)/i,
    /(\d{2,4}\s*(?:kW|PS|CV|hp)\s*(?:\([^\)]+\))?)/i,
  ]);

  const emissions = pick(text, [
    /(?:Emisiones|Emission(?:s)?|CO2-Emission(?:en)?)\s*[:\-]?\s*([^\n\r]+)/i,
    /(\d{2,4}\s*g\/?km\s*(?:\(komb\.?\))?)/i,
  ]);

  const cylinders = pick(text, [
    /(?:N[oº]\.?\s*de\s*cilindros|Zylinder|Cylinders?)\s*[:\-]?\s*([^\n\r]+)/i,
    /(\b[1-9][0-2]?\s*cyl(?:inders?)?\b)/i,
  ]);

  return {
    brandModel,
    firstRegistration,
    fuel,
    displacement,
    power,
    emissions,
    cylinders,
  };
}

function shortQuery(data) {
  const queryCore = data.brandModel || '';
  return `${queryCore} co2 emissions cylinders specs`.trim();
}

async function searchOnInternet(data) {
  const query = encodeURIComponent(shortQuery(data));
  if (!query) return {};

  const endpoint = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1&no_redirect=1`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return {};
    const payload = await res.json();

    const snippets = [
      payload.AbstractText || '',
      ...(payload.RelatedTopics || []).flatMap((topic) => {
        if (topic.Text) return [topic.Text];
        if (Array.isArray(topic.Topics)) {
          return topic.Topics.map((t) => t.Text || '');
        }
        return [''];
      }),
    ]
      .join(' | ')
      .replace(/\s+/g, ' ')
      .trim();

    const inferred = {};
    if (!data.emissions) {
      const emMatch = snippets.match(/(\d{2,4}\s*g\/?km)/i);
      if (emMatch) inferred.emissions = `${emMatch[1]} (estimado por búsqueda web)`;
    }

    if (!data.cylinders) {
      const cylMatch = snippets.match(/(\b\d\s*(?:cyl|cylinders|cilindros)\b)/i);
      if (cylMatch) inferred.cylinders = `${cylMatch[1]} (estimado por búsqueda web)`;
    }

    return inferred;
  } catch {
    return {};
  }
}

function renderResult(data) {
  resultList.innerHTML = '';

  fields.forEach(({ key, label }) => {
    const dt = document.createElement('dt');
    dt.textContent = label;

    const dd = document.createElement('dd');
    dd.textContent = data[key] || 'No encontrado';

    resultList.append(dt, dd);
  });
}

async function extractData() {
  const text = rawInput.value.trim();
  if (!text) {
    setStatus('Pega el contenido del anuncio antes de extraer datos.', true);
    renderResult({});
    return;
  }

  setStatus('Extrayendo datos del texto pegado...');
  const localData = extractLocal(text);

  const needsWebSearch = !localData.emissions || !localData.cylinders;
  let finalData = { ...localData };

  if (needsWebSearch) {
    setStatus('Faltan emisiones o nº de cilindros. Buscando en internet...');
    const inferred = await searchOnInternet(localData);
    finalData = { ...finalData, ...inferred };
  }

  renderResult(finalData);
  setStatus('Extracción completada.', true);
}
