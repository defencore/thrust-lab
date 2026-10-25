import test from 'node:test';
import assert from 'node:assert/strict';
import { dictionary, translate, getLanguage, setLanguage, t } from '../src/i18n.js';

test('translates static interface and accessibility labels with whitespace intact', () => {
  assert.equal(translate('  Profile library\n', 'uk'), '  Бібліотека профілів\n');
  assert.equal(translate('Noise from recording', 'ua'), 'Шум із запису');
  assert.equal(translate('Close export', 'uk'), 'Закрити експорт');
  assert.equal(translate('Unknown user file.csv', 'uk'), 'Unknown user file.csv');
  assert.equal(translate('N·s', 'uk'), 'N·s');
});

test('restores canonical English after translating static and dynamic prose', () => {
  for (const text of ['Profile library', '123 measurement points', 'Undo: Edit sample 7', '233 source samples · RMS 0.125 N', 'Enter a valid value (0–100).']) {
    const ukrainian = translate(text, 'uk');
    assert.notEqual(ukrainian, text);
    assert.equal(translate(ukrainian, 'en'), text);
  }
});

test('translates generated status, range, history, import and numeric errors', () => {
  assert.equal(translate('12 samples in edit scope', 'uk'), '12 вимірювань в області редагування');
  assert.equal(translate('0.2 — 0.8 s · 0.6 s selected', 'uk'), '0.2 — 0.8 s · виділено 0.6 s');
  assert.equal(translate('2 undoable edits · 1 redoable', 'uk'), '2 змін можна скасувати · 1 повторити');
  assert.equal(translate('CSV row 9 has a missing or invalid time or thrust value.', 'uk'), 'У рядку CSV 9 відсутнє або некоректне значення часу чи тяги.');
  assert.equal(translate('Profile measurement 7 has negative thrust.', 'uk'), 'Профіль, вимірювання 7: тяга від’ємна.');
  assert.equal(translate('Enter a valid value (minimum 0).', 'uk'), 'Введіть коректне значення (мінімум 0).');
  assert.match(translate('run.csv · 3 columns · semicolon separated', 'uk'), /^run.csv · 3 стовпців/);
  assert.match(translate('AeroTech G80T targets loaded. Generate to create a profile.', 'uk'), /AeroTech G80T/);
});

test('language state and helper can switch repeatedly without a browser', () => {
  assert.equal(setLanguage('uk'), 'uk');
  assert.equal(getLanguage(), 'uk');
  assert.equal(t('Profile generator'), dictionary['Profile generator']);
  assert.equal(t('Measurement {sample}', { sample: 7 }), 'Measurement 7');
  assert.equal(setLanguage('en'), 'en');
  assert.equal(t('Profile generator'), 'Profile generator');
  assert.equal(setLanguage('unsupported'), 'en');
});

test('display-unit labels and converted status text remain bilingual', () => {
  const cases = [
    ['Display units', 'Одиниці відображення'],
    ['Thrust display unit', 'Одиниця відображення тяги'],
    ['Time display unit', 'Одиниця відображення часу'],
    ['Impulse display unit', 'Одиниця відображення імпульсу'],
    ['THRUST / kgf', 'ТЯГА / kgf'],
    ['TIME / ms', 'ЧАС / ms'],
    ['Time (µs)', 'Час (µs)'],
    ['Thrust (lbf)', 'Тяга (lbf)'],
    ['Theory (kN)', 'Теорія (kN)'],
    ['Cursor time (min)', 'Час курсора (min)'],
    ['Selection start (ms)', 'Початок виділення (ms)'],
    ['Selection end (µs)', 'Кінець виділення (µs)'],
    ['Applied theory shift: -125 ms', 'Застосований зсув теорії: -125 ms'],
    ['at 250 ms', 'на 250 ms'],
    ['171 samples · 1700 ms timeline · kgf / ms', '171 вимірювань · шкала 1700 ms · kgf / ms'],
    ['21 source samples · RMS 0.015 kN', '21 вимірювань джерела · СКВ 0.015 kN'],
    ['20 — 120 ms · 100 ms selected', '20 — 120 ms · виділено 100 ms'],
    ['Thrust at 250 ms', 'Тяга на 250 ms'],
  ];
  for (const [english, ukrainian] of cases) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('curve controls and noise matching remain bilingual and reversible', () => {
  for (const [english, ukrainian] of [
    ['Curve points (C)', 'Точки кривої (C)'],
    ['Changes saved automatically · Undo available', 'Зміни зберігаються автоматично · доступне скасування'],
    ['The preview updates as you change targets.', 'Перегляд оновлюється зі зміною параметрів.'],
    ['Random noise', 'Випадковий шум'],
    ['Smoothing', 'Згладжування'],
    ['Recorded noise', 'Записаний шум'],
    ['Selected control point 3 of 5', 'Вибрана контрольна точка 3 із 5'],
    ['Saving changes…', 'Збереження змін…'],
    ['Control points', 'Контрольні точки'],
    ['Point time', 'Час точки'],
    ['Point thrust', 'Тяга точки'],
    ['Smooth curve', 'Плавна крива'],
    ['Straight segments', 'Прямі відрізки'],
    ['Adjust nearby measurements without smoothing the rest of the recording.', 'Коригуйте сусідні вимірювання, зберігаючи деталі решти запису.'],
    ['Moving a point changes the area between its neighbouring anchors. Existing detail and noise are kept.', 'Переміщення точки змінює ділянку між сусідніми опорними точками. Наявні деталі й шум зберігаються.'],
    ['Adjustment shape', 'Форма коригування'],
    ['Smooth adjustment', 'Плавне коригування'],
    ['Linear adjustment', 'Лінійне коригування'],
    ['Redistribute points', 'Перерозподілити точки'],
    ['Add more points to narrow the affected area.', 'Додайте більше точок, щоб звузити ділянку впливу.'],
    ['Existing noise is preserved. Use noise matching only when you want to replace it.', 'Наявний шум зберігається. Узгоджуйте шум лише тоді, коли потрібно його замінити.'],
    ['Curve point 7', 'Точка кривої 7'],
    ['5 control points', '5 контрольних точок'],
    ['Point time (ms)', 'Час точки (ms)'],
    ['Point thrust (kgf)', 'Тяга точки (kgf)'],
    ['Pinned time', 'Зафіксований час'],
    ['Endpoint times stay fixed; their thrust can be edited.', 'Час крайніх точок зафіксовано; їхню тягу можна редагувати.'],
    ['Before matching', 'До узгодження'],
    ['After matching', 'Після узгодження'],
    ['Select a time range to match neighbouring noise.', 'Виділіть часовий діапазон для узгодження шуму із сусідніми даними.'],
    ['No free measurement timestamps remain.', 'Вільних часових міток вимірювань не залишилося.'],
    ['Match neighbouring data', 'Узгодити з сусідніми даними'],
    ['Match captured noise', 'Узгодити зі зразком шуму'],
    ['Noise level', 'Рівень шуму'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('live editor status, history and generated labels remain bilingual', () => {
  const statuses = ['Preview updates live', 'Check generator targets', 'Workspace created', 'Seeded noise', 'Smooth curve', 'Recorded noise', 'Shape and scale', 'Select time range', 'Draw thrust', 'Curve visibility', 'Edit control point', 'Reset control points', 'The random seed must be a whole number.'];
  for (const english of statuses) {
    const ukrainian = translate(english, 'uk');
    assert.notEqual(ukrainian, english);
    assert.equal(translate(ukrainian, 'en'), english);
  }
  for (const [english, ukrainian] of [
    ['Selected control point 4 of 9', 'Вибрана контрольна точка 4 із 9'],
    ['Influence: 125 — 750 ms', 'Вплив: 125 — 750 ms'],
    ['Influence: 0.5 — 2.5 min', 'Вплив: 0.5 — 2.5 min'],
    ['recording.csv · 3 columns', 'recording.csv · 3 стовпців'],
    ['Exports all 1,250 measurements. Your entire timestamp sequence is retained.', 'Експортуються всі 1,250 вимірювань. Уся послідовність часових міток зберігається.'],
    ['0.025 kgf RMS', '0.025 kgf СКВ'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('measurement tool, clearing and exact marker fields remain bilingual', () => {
  for (const [english, ukrainian] of [
    ['Measure', 'Виміряти'],
    ['Measure (M)', 'Виміряти (M)'],
    ['Measurement', 'Вимірювання A/B'],
    ['Clear selection (Esc)', 'Зняти виділення (Esc)'],
    ['Clear selected range, point, and measurement markers (Esc)', 'Зняти виділення діапазону й точки та прибрати вимірювальні маркери (Esc)'],
    ['Click two points or drag to measure time and thrust.', 'Клацніть дві точки або перетягніть, щоб виміряти час і тягу.'],
    ['Clear measurement', 'Очистити вимірювання'],
    ['Marker A time', 'Час маркера A'],
    ['Marker B time (ms)', 'Час маркера B (ms)'],
    ['Time difference', 'Різниця часу'],
    ['Thrust difference', 'Різниця тяги'],
    ['Measurements are independent of the edit selection.', 'Вимірювання незалежні від області редагування.'],
    ['The measurement difference is outside the supported numeric range.', 'Різниця вимірювань виходить за підтримуваний числовий діапазон.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('independent axis zoom controls and automatic scale hints remain bilingual', () => {
  for (const [english, ukrainian] of [
    ['Time zoom', 'Масштабування часу'],
    ['Time zoom out', 'Зменшити масштаб часу'],
    ['Thrust zoom in', 'Збільшити масштаб тяги'],
    ['Reset thrust scale', 'Скинути масштаб тяги'],
    ['Visible thrust range', 'Видимий діапазон тяги'],
    ['Auto', 'Авто'],
    ['Fit all axes (F)', 'Показати весь графік (F)'],
    ['Shift + wheel: thrust zoom · Double-click thrust axis: auto scale', 'Shift + коліщатко: масштаб тяги · Подвійний клік по осі тяги: автомасштаб'],
    ['Drag to zoom thrust · Double-click to reset', 'Перетягніть для масштабування тяги · Подвійний клік для скидання'],
    ['Vertical view needs a finite nonnegative minimum below its maximum.', 'Вертикальний діапазон: потрібен скінченний невід’ємний мінімум, менший за максимум.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('theory matching explains burn targets, coupled mean and impulse, and recorded texture in both languages', () => {
  for (const [english, ukrainian] of [
    ['Theoretical reference', 'Теоретичний еталон'],
    ['MEAN BURN THRUST', 'СЕРЕДНЯ ТЯГА ПІД ЧАС ГОРІННЯ'],
    ['Impulse / 5% burn duration', 'Імпульс / тривалість горіння за 5% піка'],
    ['Match theory', 'Підігнати під теорію'],
    ['Live matching', 'Підгонка в реальному часі'],
    ['Start and duration use the 5% peak burn window.', 'Початок і тривалість визначаються вікном горіння за порогом 5% пікової тяги.'],
    ['Mean over burn', 'Середня під час горіння'],
    ['Impulse = mean over burn × burn duration.', 'Імпульс = середня тяга під час горіння × тривалість горіння.'],
    ['Original recording', 'Початковий запис'],
    ['Captured sample', 'Збережений зразок'],
    ['Peak, impulse and burn timing stay constrained while texture is added.', 'Пікова тяга, імпульс і часові параметри горіння зберігають задані обмеження під час додавання шуму.'],
    ['Time from ignition until the final fall-off begins.', 'Час від запалювання до початку фінального спаду.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('theory fitting status, feasibility ranges and combined warnings translate with selected units', () => {
  for (const [english, ukrainian] of [
    ['For this shape, peak and duration, choose an impulse from 1.25 to 3.5 kgf·s.', 'Для цієї форми, пікової тяги й тривалості виберіть імпульс від 1.25 до 3.5 kgf·s.'],
    ['The burn window must stay between 125 and 750 ms.', 'Вікно горіння має залишатися між 125 та 750 ms.'],
    ['1,250 reference measurements · source preserved', '1,250 вимірювань еталона · джерело збережено'],
    ['Recorded noise RMS: 0.025 kN', 'СКВ шуму запису: 0.025 kN'],
    ['The impulse target uses the narrowest shape possible on these measurements. Recorded texture was reduced to preserve the fitted peak, impulse and burn timing.', 'Цільовий імпульс досягається найвужчою можливою формою на цих вимірюваннях. Шум запису зменшено для збереження підігнаної пікової тяги, імпульсу та часових параметрів горіння.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('profile shifting clearly identifies a data edit and its fixed-timeline limits', () => {
  for (const [english, ukrainian] of [
    ['Shift profile (G)', 'Зсунути профіль (G)'],
    ['Time shift', 'Часовий зсув'],
    ['Profile time shift (ms)', 'Часовий зсув профілю (ms)'],
    ['Drag left or right to shift thrust values along the fixed timeline.', 'Перетягніть ліворуч або праворуч, щоб зсунути значення тяги вздовж незмінної часової шкали.'],
    ['Move the profile across fixed measurement times. Choose how emptied intervals are filled.', 'Зсувайте профіль по незмінних часових мітках. Виберіть, чим заповнювати звільнені ділянки.'],
    ['Values shifted outside the recording are clipped.', 'Значення, зсунуті за межі запису, відсікаються.'],
    ['Enter a finite time offset to shift the profile.', 'Введіть скінченний часовий зсув профілю.'],
    ['Time from ignition until the final fall-off begins. Use Entire profile for this timing adjustment.', 'Час від запалювання до початку фінального спаду. Для цього налаштування часу виберіть «Увесь профіль».'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('shift background source, controls and unavailable-source guidance stay bilingual', () => {
  for (const [english, ukrainian] of [
    ['Fill emptied intervals', 'Заповнювати звільнені ділянки'],
    ['Zeros', 'Нулями'],
    ['Recorded background', 'Фоновим шумом запису'],
    ['Background level', 'Рівень фонового шуму'],
    ['Original quiet region', 'Початкова ділянка без тяги'],
    ['Choose recorded background to fill gaps with noise from the original no-thrust regions.', 'Виберіть фоновий шум запису, щоб заповнювати проміжки шумом із початкових ділянок без тяги.'],
    ['No quiet source found. At least 7 original measurements below 5% peak are needed before or after the burn.', 'Ділянку без тяги не знайдено. Потрібно щонайменше 7 початкових вимірювань нижче 5% піка до або після горіння.'],
    ['The original quiet region is flat; background fill remains constant.', 'Початкова ділянка без тяги стала; фонове заповнення залишатиметься сталим.'],
    ['Choose zeros or recorded background for empty intervals.', 'Виберіть нулі або фоновий шум запису для порожніх проміжків.'],
    ['Background level must be between 0 and 1000 percent.', 'Рівень фонового шуму має бути в межах від 0 до 1000 відсотків.'],
    ['No recorded background is available. Choose zeros or import a recording with a quiet region.', 'Фоновий шум запису недоступний. Виберіть нулі або імпортуйте запис із ділянкою без тяги.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('background detection and replay errors translate and return to their canonical language', () => {
  for (const english of [
    'Background detection needs an array of measurements.',
    'Background measurements must contain finite, nonnegative thrust and strictly increasing timestamps.',
    'The background timeline is outside the supported numeric range.',
    'Choose a background source with at least 7 measurements.',
    'Background samples must have finite, nonnegative thrust and strictly increasing relative timestamps.',
    'The background source needs relative timestamps starting at zero and a positive duration.',
    'Background source metadata must match its measurement interval.',
    'Background noise gain must be finite and nonnegative.',
    'Background noise gain is too large for this source.',
    'Background replay time must be finite.',
  ]) {
    const ukrainian = translate(english, 'uk');
    assert.notEqual(ukrainian, english);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});
