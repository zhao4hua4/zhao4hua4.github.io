/* Paper-reported aggregate results only. This poster makes no network or model calls. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const source = $('#oracle-data');
  if (!source) return;
  let data;
  try { data = JSON.parse(source.textContent); } catch (_) { return; }

  const enhancements = $$('[data-enhancement]');
  enhancements.forEach(node => { node.hidden = true; });
  const setText = (selector, value) => {
    const node = $(selector);
    if (node) node.textContent = value;
  };
  const signed = (value, digits = 1) => value == null ? 'Not reported' :
    (value > 0 ? '+' : value < 0 ? '−' : '') + Math.abs(value).toFixed(digits);
  const interval = values => values ? '[' + values.map(value => signed(value)).join(', ') + ']' : '';
  const context = profile => profile.model + ' · ' + profile.input + ' input';
  const profileFor = select => data.profiles.find(profile => profile.id === select.value) || data.profiles[0];
  const announce = (id, message, enabled) => setText(id, enabled ? message : '');
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  // A fixed −10…+10 domain keeps every profile directly comparable. Intervals
  // remain text: their endpoints can extend beyond this display domain.
  const updateGainRows = (group, values, cis) => {
    $$('[data-' + group + '-row]').forEach((row, index) => {
      const value = values[index];
      const ci = cis[index];
      const number = $('[data-gain-value]', row);
      const bar = $('[data-gain-bar]', row);
      const note = $('[data-gain-ci]', row);
      if (number) {
        number.textContent = signed(value);
        if (value != null) {
          const unit = document.createElement('small');
          unit.textContent = ' pp';
          number.append(unit);
        }
      }
      if (bar) {
        const plotted = value == null ? 0 : clamp(value, -10, 10);
        const width = Math.abs(plotted) / 20 * 100;
        bar.style.setProperty('--gain-left', (plotted < 0 ? 50 - width : 50) + '%');
        bar.style.setProperty('--gain-width', width + '%');
      }
      if (note) note.textContent = value == null ? 'Not reported' : ci ?
        '95% CI ' + interval(ci) + ' pp' : 'Broad interface contrast';
    });
  };

  const regimes = {
    semantic: {
      title: 'Semantic labels',
      description: 'Category names are visible and serve as the output: entailment, neutral or contradiction.',
      names: 'entailment · neutral · contradiction',
      binding: 'Each relation is answered with its category name.',
      output: 'Return only: entailment, neutral or contradiction.'
    },
    abc: {
      title: 'ABC only',
      description: 'Category names are removed. The relation definitions remain, and the response is A, B or C.',
      names: 'Category names are absent; the definitions above remain visible.',
      binding: 'A = first definition · B = second definition · C = third definition.',
      output: 'Return only: A, B or C.'
    },
    anchored: {
      title: 'Anchored ABC',
      description: 'Category names return inside the letter options. The response remains A, B or C.',
      names: 'A (entailment) · B (neutral) · C (contradiction)',
      binding: 'A = entailment · B = neutral · C = contradiction, with the same relation definitions.',
      output: 'Return only: A, B or C.'
    }
  };
  const regimeButtons = $$('[data-regime]');
  let currentRegime = 'semantic';
  const updateRegime = (key, enabled = true) => {
    const regime = regimes[key];
    if (!regime) return;
    currentRegime = key;
    regimeButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.regime === key)));
    setText('#regime-title', regime.title);
    setText('#regime-description', regime.description);
    ['names', 'binding', 'output'].forEach(layer => setText('#anatomy-' + layer, regime[layer]));
    announce('#regime-announcement', regime.title + '. ' + regime.description, enabled);
  };
  regimeButtons.forEach(button => button.addEventListener('click', () => updateRegime(button.dataset.regime)));

  const ladderSelect = $('#ladder-profile');
  const updateLadder = (enabled = true) => {
    if (!ladderSelect) return;
    const profile = profileFor(ladderSelect);
    setText('#ladder-context', context(profile));
    setText('#ladder-start', signed(profile.gains[0]));
    setText('#ladder-end', signed(profile.gains[1]));
    setText('#ladder-insight', profile.insight);
    updateGainRows('ladder', profile.gains, profile.cis);
    announce('#ladder-announcement', context(profile) + '. ' + data.stages.map((stage, index) =>
      stage + ': ' + signed(profile.gains[index]) + (profile.gains[index] == null ? '' : ' pp')).join('; ') + '. ' + profile.insight, enabled);
  };
  if (ladderSelect) ladderSelect.addEventListener('change', () => updateLadder());

  const mappingSelect = $('#mapping-choice');
  const updateMapping = (enabled = true) => {
    if (!mappingSelect) return;
    const index = Number(mappingSelect.value);
    const mapping = data.mappings[index] || data.mappings[0];
    $$('#mapping-options [data-mapping-name]').forEach((node, i) => { node.textContent = mapping[i]; });
    const answer = String.fromCharCode(65 + mapping.indexOf('entailment'));
    setText('#mapping-answer', answer);
    announce('#mapping-announcement', 'Illustrative entailment example. Correct response: ' + answer + '. ' +
      mapping.map((name, i) => String.fromCharCode(65 + i) + ' means ' + name).join('; ') + '.', enabled);
  };
  if (mappingSelect) mappingSelect.addEventListener('change', () => updateMapping());

  const rangeSelect = $('#range-profile');
  const updateRange = (enabled = true) => {
    if (!rangeSelect) return;
    const condition = data.ranges.find(item => item.id === rangeSelect.value) || data.ranges[0];
    const label = context(condition) + ' · ' + condition.interface + ' interface';
    setText('#range-context', label);
    setText('#range-before', condition.abc.toFixed(1));
    setText('#range-after', condition.anchored.toFixed(1));
    [['abc', condition.abc], ['anchor', condition.anchored]].forEach(([key, value]) => {
      setText('#range-' + key + '-value', value.toFixed(1));
      const bar = $('#range-' + key + '-bar');
      if (bar) bar.style.setProperty('--score', clamp(value / 25 * 100, 0, 100) + '%');
    });
    const change = condition.anchored - condition.abc;
    const insight = change === 0 ? 'Restoring category names leaves the mapping range unchanged in this condition.' :
      'Restoring category names ' + (change < 0 ? 'narrows' : 'widens') + ' the mapping range by ' +
      Math.abs(change).toFixed(1) + ' percentage points in this condition.';
    setText('#range-insight', insight);
    announce('#range-announcement', label + '. ABC-only range: ' + condition.abc.toFixed(1) +
      ' pp. Anchored range: ' + condition.anchored.toFixed(1) + ' pp. ' + insight, enabled);
  };
  if (rangeSelect) rangeSelect.addEventListener('change', () => updateRange());

  const procedureSelect = $('#factor-procedure');
  const definitionSelect = $('#factor-definition');
  const languages = { zh: 'Chinese', en: 'English' };
  const updateFactor = (enabled = true) => {
    if (!procedureSelect || !definitionSelect) return;
    const procedure = languages[procedureSelect.value] ? procedureSelect.value : 'zh';
    const definition = languages[definitionSelect.value] ? definitionSelect.value : 'zh';
    const key = procedure + '-' + definition;
    const score = data.factorial.accuracy[key];
    const effect = data.factorial.procedure_by_definition[definition];
    setText('#factor-score', score.toFixed(2));
    $$('[data-factor-cell]').forEach(cell => cell.toggleAttribute('data-selected', cell.dataset.factorCell === key));
    const insight = 'With ' + languages[definition] + ' definitions, changing the procedure from English to Chinese adds ' +
      effect.toFixed(2) + ' percentage points.';
    setText('#factor-insight', insight);
    announce('#factor-announcement', languages[procedure] + ' procedure, ' + languages[definition] +
      ' definitions: ' + score.toFixed(2) + '% accuracy. ' + insight, enabled);
  };
  if (procedureSelect) procedureSelect.addEventListener('change', () => updateFactor());
  if (definitionSelect) definitionSelect.addEventListener('change', () => updateFactor());

  const labelSelect = $('#label-profile');
  const updateLabels = (enabled = true) => {
    if (!labelSelect) return;
    const profile = profileFor(labelSelect);
    setText('#label-context', context(profile));
    setText('#label-start', signed(profile.gains[0]));
    setText('#label-end', profile.crossed == null ? '—' : signed(profile.crossed));
    const end = $('#label-end');
    const subtitle = end && $('span', end.parentElement);
    if (subtitle) subtitle.textContent = profile.crossed == null ? 'Crossed labels · not reported' : 'Crossed labels · pp';
    updateGainRows('label', [profile.gains[0], profile.alternate, profile.crossed], [null, profile.alternate_ci, profile.crossed_ci]);
    const alternate = 'The alternate-label contrast is ' + signed(profile.alternate) + ' pp (95% CI ' + interval(profile.alternate_ci) + ' pp). ';
    const spansZero = profile.alternate_ci && profile.alternate_ci[0] <= 0 && profile.alternate_ci[1] >= 0;
    let insight;
    if (profile.crossed == null) {
      insight = alternate + (spansZero ? 'Its interval spans zero, leaving the direction uncertain. ' : '') + 'Crossed-label results are not reported for this condition.';
    } else {
      insight = 'Swapping visible label language reverses the measured Chinese-interface gain, from ' + signed(profile.gains[0]) +
        ' to ' + signed(profile.crossed) + ' pp (a ' + signed(profile.crossed - profile.gains[0]) + ' pp shift). ' + alternate;
    }
    setText('#label-insight', insight.trim());
    announce('#label-announcement', context(profile) + '. ' + insight.trim(), enabled);
  };
  if (labelSelect) labelSelect.addEventListener('change', () => updateLabels());

  const synchronize = () => {
    updateRegime(currentRegime, false);
    updateLadder(false);
    updateMapping(false);
    updateRange(false);
    updateFactor(false);
    updateLabels(false);
  };
  synchronize();
  // Back/forward navigation can restore selects after script initialization.
  window.addEventListener('pageshow', () => window.requestAnimationFrame(synchronize));

  const copy = $('#poster-copy-link');
  if (copy) copy.addEventListener('click', async () => {
    const url = 'https://zhao4hua4.github.io/work/prompt-interface/poster/';
    try {
      await navigator.clipboard.writeText(url);
      setText('#poster-copy-status', 'Link copied.');
    } catch (_) {
      setText('#poster-copy-status', 'Copy this link: ' + url);
    }
  });
  enhancements.forEach(node => { node.hidden = false; });

  const reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!reducedMotion.matches) entry.target.classList.add('poster-visible');
        reveals.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    $$('.poster-reveal').forEach(node => reveals.observe(node));
    const navLinks = $$('.poster-nav a').filter(link => link.getAttribute('href').startsWith('#'));
    const sections = navLinks.map(link => document.getElementById(link.getAttribute('href').slice(1))).filter(Boolean);
    const active = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting);
      if (!visible.length) return;
      const id = visible[visible.length - 1].target.id;
      navLinks.forEach(link => {
        if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    sections.forEach(section => active.observe(section));
  }
  let ticking = false;
  const progress = $('.poster-progress span');
  const updateProgress = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = 'scaleX(' + (available > 0 ? clamp(window.scrollY / available, 0, 1) : 0) + ')';
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  window.addEventListener('pageshow', updateProgress);
  updateProgress();
})();
