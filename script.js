// Utilitários
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Estado simples
const state = {
  step: 1,
};

function formatNumber(value, decimals = 2) {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '0,00';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Navegação entre passos
function goTo(step) {
  state.step = step;
  [1, 2, 3].forEach((s, i) => {
    const el = document.getElementById(`step-${s}`);
    if (!el) return;
    el.hidden = s !== step;
    const dots = $('#progress').children;
    if (dots[i]) dots[i].classList.toggle('active', s === step);
  });
}

// Fórmulas
function calcularPesoEstimado(sexo, cp, aj, cb, pcse) {
  if (sexo === 'F') {
    // Mulheres: (1,27×CP) + (0,87×AJ) + (0,98×CB) + (0,4×PCSE) − 62,35
    return (1.27 * cp) + (0.87 * aj) + (0.98 * cb) + (0.4 * pcse) - 62.35;
  }
  // Homens: (0,98×CP) + (1,16×AJ) + (1,73×CB) + (0,37×PCSE) − 81,69
  return (0.98 * cp) + (1.16 * aj) + (1.73 * cb) + (0.37 * pcse) - 81.69;
}

function calcularAlturaEstimadacm(sexo, idade, alturaJoelhoCm) {
  if (sexo === 'F') {
    // Mulheres: 84,88 + (1,83 x altura do joelho) − (0,24 x idade)
    return 84.88 + (1.83 * alturaJoelhoCm) - (0.24 * idade);
  }
  // Homens: 64,19 − (0,04 x idade) + (2,02 x altura joelho)
  return 64.19 - (0.04 * idade) + (2.02 * alturaJoelhoCm);
}

function calcularTMB(sexo, pesoKg, alturaCm, idade) {
  if (sexo === 'F') {
    // 655 + (9,6×peso) + (1,9×altura) − (4,7×idade)
    return 655 + (9.6 * pesoKg) + (1.9 * alturaCm) - (4.7 * idade);
  }
  // 66,47 + (13,75×peso) + (5×altura) − (6,75×idade)
  return 66.47 + (13.75 * pesoKg) + (5 * alturaCm) - (6.75 * idade);
}

function getSexo() {
  return ($('input[name="sexo"]:checked')?.value) || 'M';
}

function numberValue(id) {
  const v = parseFloat($(id).value.replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
}

function atualizarParte1() {
  const sexo = getSexo();
  const cp = numberValue('#cp');
  const aj = numberValue('#aj');
  const cb = numberValue('#cb');
  const pcse = numberValue('#pcse');
  const idade = numberValue('#idade');
  const joelho = numberValue('#joelho');

  const pesoEstimado = Math.max(0, calcularPesoEstimado(sexo, cp, aj, cb, pcse));
  const alturaCm = Math.max(0, calcularAlturaEstimadacm(sexo, idade, joelho));

  $('#pesoEstimado').textContent = formatNumber(pesoEstimado, 2);
  $('#alturaEstimadacm').textContent = formatNumber(alturaCm, 1);
  $('#alturaEstimadam').textContent = formatNumber(alturaCm / 100, 2);

  const usarEstimado = $('#peso-estimado').checked;
  $('#peso-balanca-field').hidden = usarEstimado;
  const pesoParaTmb = usarEstimado ? pesoEstimado : numberValue('#pesoMedido');

  const tmb = Math.max(0, calcularTMB(sexo, pesoParaTmb, alturaCm, idade));
  $('#tmb').textContent = Math.round(tmb).toLocaleString('pt-BR');

  return { tmb };
}

function atualizarParte2() {
  const { tmb } = atualizarParte1(); // garante sincronização

  // Multiplicar todos os checkboxes marcados
  const marcados = $$('.inj:checked');
  const fator = marcados.reduce((acc, el) => acc * (parseFloat(el.value) || 1), 1) || 1;

  const ajusteMais = numberValue('#ajusteMais');
  const ajusteMenos = numberValue('#ajusteMenos');

  const kcalBase = tmb * fator;
  const kcalFinal = Math.max(0, kcalBase + ajusteMais - ajusteMenos);

  $('#fatorTotal').textContent = formatNumber(fator, 2);
  $('#kcalBase').textContent = Math.round(kcalBase).toLocaleString('pt-BR');
  $('#kcalFinal').textContent = Math.round(kcalFinal).toLocaleString('pt-BR');
}

function wireEvents() {
  // Inputs que devem recalcular parte 1
  const idsParte1 = ['#cp', '#aj', '#cb', '#pcse', '#idade', '#joelho', '#pesoMedido', '#sexo-m', '#sexo-f', '#peso-estimado', '#peso-balanca'];
  idsParte1.forEach(sel => {
    const el = $(sel);
    if (el) el.addEventListener('input', atualizarParte1);
    if (el && (sel === '#peso-estimado' || sel === '#peso-balanca')) {
      el.addEventListener('change', atualizarParte1);
    }
  });

  // Parte 2
  $$('.inj').forEach(el => {
    el.addEventListener('change', atualizarParte2);
  });
  ['#ajusteMais', '#ajusteMenos'].forEach(sel => {
    const el = $(sel);
    if (el) el.addEventListener('input', atualizarParte2);
  });

  // Navegação
  $$('.next').forEach(b => b.addEventListener('click', () => goTo(Number(b.dataset.next))));
  $$('.prev').forEach(b => b.addEventListener('click', () => goTo(Number(b.dataset.prev))));

  // Q6/Q7 habilitar quantidade
  $$('input[name="p6"]').forEach(r => r.addEventListener('change', () => {
    $('#p6-qtd').disabled = $('input[name="p6"]:checked').value !== 'sim';
  }));
  $$('input[name="p7"]').forEach(r => r.addEventListener('change', () => {
    $('#p7-qtd').disabled = $('input[name="p7"]:checked').value !== 'sim';
  }));

  // Persistência do nome
  const nomeInput = $('#nome');
  const saved = localStorage.getItem('paciente:nome');
  if (saved) nomeInput.value = saved;
  nomeInput.addEventListener('input', () => {
    localStorage.setItem('paciente:nome', nomeInput.value.trim());
  });

  $('#btnRecalcular').addEventListener('click', (e) => {
    e.preventDefault();
    atualizarParte1();
    atualizarParte2();
  });

  // Gerar PDF (abrir novo HTML baseado em template)
  $('#btnGerarPdf').addEventListener('click', (e) => {
    e.preventDefault();
    const data = coletarDadosParaImpressao();
    const html = construirHtmlImpressao(data);
    const win = window.open('', '_blank');
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 100);
  });
}

// Inicialização
window.addEventListener('DOMContentLoaded', () => {
  wireEvents();
  atualizarParte1();
  atualizarParte2();
  goTo(1);
});

// Coleta e estrutura os dados para template de impressão
function coletarDadosParaImpressao() {
  const nome = $('#nome').value.trim();
  const idade = numberValue('#idade');
  const sexo = getSexo();
  const cp = numberValue('#cp');
  const aj = numberValue('#aj');
  const cb = numberValue('#cb');
  const pcse = numberValue('#pcse');
  const joelho = numberValue('#joelho');

  const usarEstimado = $('#peso-estimado').checked;
  const pesoEstimado = calcularPesoEstimado(sexo, cp, aj, cb, pcse);
  const pesoParaTmb = usarEstimado ? pesoEstimado : numberValue('#pesoMedido');
  const alturaCm = calcularAlturaEstimadacm(sexo, idade, joelho);
  const tmb = calcularTMB(sexo, pesoParaTmb, alturaCm, idade);

  const fatoresEls = $$('.inj:checked');
  const fatoresVals = fatoresEls.map(el => parseFloat(el.value) || 1);
  const fator = fatoresVals.reduce((acc, v) => acc * v, 1) || 1;
  const kcalBase = tmb * fator;
  const ajusteMais = numberValue('#ajusteMais');
  const ajusteMenos = numberValue('#ajusteMenos');
  const kcalFinal = Math.max(0, kcalBase + ajusteMais - ajusteMenos);

  const data = {
    nome,
    idade: Math.round(idade),
    sexoM: sexo === 'M' ? 'X' : ' ',
    sexoF: sexo === 'F' ? 'X' : ' ',
    cp: formatNumber(cp, 1),
    aj: formatNumber(aj, 1),
    cb: formatNumber(cb, 1),
    pcse: formatNumber(pcse, 1),
    peso: formatNumber(pesoParaTmb, 1),
    alturaCm: formatNumber(alturaCm, 1),
    alturaM: formatNumber(alturaCm / 100, 2),
    tmb: Math.round(tmb).toLocaleString('pt-BR'),
    fatorTotal: formatNumber(fator, 2),
    kcalBase: Math.round(kcalBase).toLocaleString('pt-BR'),
    ajusteMais: ajusteMais ? Math.round(ajusteMais).toLocaleString('pt-BR') : '',
    ajusteMenos: ajusteMenos ? Math.round(ajusteMenos).toLocaleString('pt-BR') : '',
    kcalFinal: Math.round(kcalFinal).toLocaleString('pt-BR'),
    // Fatores marcados (para desenhar caixas)
    fa_acamado: $(`#fa-12`).checked ? 'X' : ' ',
    fa_pouco: $(`#fa-125`).checked ? 'X' : ' ',
    fa_deamb: $(`#fa-13`).checked ? 'X' : ' ',
    ft_38: $(`#ft-11`).checked ? 'X' : ' ',
    ft_39: $(`#ft-12`).checked ? 'X' : ' ',
    ft_40: $(`#ft-13`).checked ? 'X' : ' ',
    fc_cancer: $(`#fc-125`).checked ? 'X' : ' ',
    fc_cirp: $(`#fc-11`).checked ? 'X' : ' ',
    fc_cirg: $(`#fc-12`).checked ? 'X' : ' ',
    inf_leve: $(`#inf-12`).checked ? 'X' : ' ',
    inf_mod: $(`#inf-14`).checked ? 'X' : ' ',
    inf_grande: $(`#inf-16`).checked ? 'X' : ' ',
    qmd_40: $(`#qmd-15`).checked ? 'X' : ' ',
    qmd_100: $(`#qmd-19`).checked ? 'X' : ' ',
    // Questionário
    q1: $('#q1').value.trim(),
    q2: $('#q2').value.trim(),
    q3: $('#q3').value.trim(),
    q4: $('#q4').value.trim(),
    q5: $('#q5').value.trim(),
    p6_sim: $('input[name="p6"]:checked').value === 'sim' ? 'X' : ' ',
    p6_nao: $('input[name="p6"]:checked').value !== 'sim' ? 'X' : ' ',
    p6_qtd: $('input[name="p6"]:checked').value === 'sim' ? formatNumber(numberValue('#p6-qtd'), 1) : '',
    p7_sim: $('input[name="p7"]:checked').value === 'sim' ? 'X' : ' ',
    p7_nao: $('input[name="p7"]:checked').value !== 'sim' ? 'X' : ' ',
    p7_qtd: $('input[name="p7"]:checked').value === 'sim' ? formatNumber(numberValue('#p7-qtd'), 1) : ''
  };
  return data;
}

// Template muito simples estilo Handlebars (substitui {{chave}})
function preencherTemplate(template, data) {
  return template.replace(/{{\s*([\w_]+)\s*}}/g, (_, k) => (data[k] ?? ''));
}

function construirHtmlImpressao(data) {
  const template = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <title>Questionário de Nutrição</title>
    <style>
      @page { size: A4 portrait; margin: 10mm; }
      body { font: 12pt "Times New Roman", Times, serif; color: #000; }
      .page { page-break-after: always; }
      h1 { font-size: 18pt; margin: 0 0 6mm; text-align: center; }
      .row { display: flex; gap: 6mm; align-items: center; }
      .label { min-width: 18mm; }
      .line { flex: 1; border-bottom: 1px solid #000; min-height: 6mm; }
      .section { border: 1px solid #000; padding: 4mm; margin: 4mm 0; }
      .muted { font-size: 10pt; color: #111; }
      .right { text-align: right; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #000; padding: 2mm; vertical-align: top; }
      .title { background: #f3f3f3; font-weight: bold; }
      .small { font-size: 10pt; }
      .q { margin: 2mm 0; }
      /* tabelas de cálculo centralizadas, Arial e negrito */
      .calc { font-family: Arial, Helvetica, sans-serif; font-weight: bold; text-align: center; }
      .calc td, .calc th { font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="section">
        <div class="row"><div class="label">NOME:</div><div class="line">{{nome}}</div></div>
        <div class="row small" style="margin-top:3mm;">SEXO: ( <span>{{sexoM}}</span> ) masc. ( <span>{{sexoF}}</span> ) fem. &nbsp;&nbsp; Idade: {{idade}}</div>
      </div>

      <div class="section">
        <table class="calc">
          <tr><th>Peso</th></tr>
          <tr><td>( ) Peso estimado  ( ) Peso na balança  &nbsp;&nbsp; SEXO: ( <span>{{sexoM}}</span> ) masc. ( <span>{{sexoF}}</span> ) fem.</td></tr>
          <tr><td class="right">VALOR: {{peso}} Kg</td></tr>
        </table>
      </div>

      <div class="section">
        <table class="calc">
          <tr><th>ALTURA ESTIMADA</th></tr>
          <tr><td>( ) altura estimada  ( ) altura no estadiômetro  &nbsp;&nbsp; SEXO: ( <span>{{sexoM}}</span> ) masc. ( <span>{{sexoF}}</span> ) fem.</td></tr>
          <tr><td class="right">VALOR: {{alturaM}} Metros</td></tr>
        </table>
      </div>

      <div class="section">
        <div class="title">TMB</div>
        <div class="row"><div class="label">VALOR:</div><div class="line right">{{tmb}} kcal/dia</div></div>
      </div>
    </div>

    <div class="page">
      <div class="section">
        <div class="title">Fator Injúria</div>
        <table>
          <tr><th>F.A</th><td>( <span>{{fa_acamado}}</span> ) acamado 1,2 &nbsp; ( <span>{{fa_pouco}}</span> ) deambulando pouco 1,25 &nbsp; ( <span>{{fa_deamb}}</span> ) deambulando 1,3</td></tr>
          <tr><th>F.T</th><td>( <span>{{ft_38}}</span> ) 38° 1,1 &nbsp; ( <span>{{ft_39}}</span> ) 39° 1,2 &nbsp; ( <span>{{ft_40}}</span> ) 40° 1,3</td></tr>
          <tr><th>F.C</th><td>( <span>{{fc_cancer}}</span> ) câncer 1,25 &nbsp; ( <span>{{fc_cirp}}</span> ) cirurgia P 1,1 &nbsp; ( <span>{{fc_cirg}}</span> ) cirurgia G 1,2</td></tr>
          <tr><th>Infecção</th><td>( <span>{{inf_leve}}</span> ) leve 1,2 &nbsp; ( <span>{{inf_mod}}</span> ) moderada 1,4 &nbsp; ( <span>{{inf_grande}}</span> ) grande 1,6</td></tr>
          <tr><th>Queimado</th><td>( <span>{{qmd_40}}</span> ) 40% do corpo 1,5 &nbsp; ( <span>{{qmd_100}}</span> ) 100% do corpo 1,9</td></tr>
        </table>
        <div class="row" style="margin-top:3mm;"><div class="label">TMB × FATOR:</div><div class="line right">{{kcalBase}} kcal/dia</div></div>
        <div class="row" style="margin-top:2mm;">( AUMENTAR KCAL ) QUANTIDADE: <span style="border-bottom:1px solid #000; flex:1; text-align:right; padding:0 2mm;">{{ajusteMais}}</span></div>
        <div class="row" style="margin-top:2mm;">( DIMINUIR KCAL ) QUANTIDADE: <span style="border-bottom:1px solid #000; flex:1; text-align:right; padding:0 2mm;">{{ajusteMenos}}</span></div>
        <div class="row" style="margin-top:4mm;"><div class="label">VALOR FINAL:</div><div class="line right">{{kcalFinal}} kcal/dia</div></div>
      </div>

      <div class="section">
        <h1>Questionário</h1>
        <div class="q">1 - Armazenamento da dieta<br><span class="small">{{q1}}</span></div>
        <div class="q">2 - Higiene bucal<br><span class="small">{{q2}}</span></div>
        <div class="q">3 - Higienização dos frascos e equipos: quantas vezes? Quais produtos usados?<br><span class="small">{{q3}}</span></div>
        <div class="q">4 - Intestino como funciona? Qual consistência? Qual cor?<br><span class="small">{{q4}}</span></div>
        <div class="q">5 - Qualidade do sono?<br><span class="small">{{q5}}</span></div>
        <div class="q">6 - Paciente está com perda de peso? ( <span>{{p6_sim}}</span> ) sim ( <span>{{p6_nao}}</span> ) não — Quantidade: {{p6_qtd}}</div>
        <div class="q">7 - Paciente está com ganho de peso? ( <span>{{p7_sim}}</span> ) sim ( <span>{{p7_nao}}</span> ) não — Quantidade: {{p7_qtd}}</div>
      </div>
    </div>
  </body>
  </html>`;
  return preencherTemplate(template, data);
}


