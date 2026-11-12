import test from 'node:test';
import assert from 'node:assert/strict';
import { dictionary, translate, getLanguage, setLanguage, t } from '../src/i18n.js';

test('chart image actions, report context and browser errors remain bilingual and reversible', () => {
  for (const [english, ukrainian] of [
    ['Profile chart', 'Графік профілю'],
    ['Curve legend', 'Легенда графіка'],
    ['Chart image actions', 'Дії із зображенням графіка'],
    ['Image settings', 'Налаштування зображення'],
    ['Show metric details', 'Показувати деталі показників'],
    ['Show legend', 'Показувати легенду'],
    ['Applies to copied and saved images.', 'Застосовується до скопійованих і збережених зображень.'],
    ['Copy chart image', 'Скопіювати зображення графіка'],
    ['Save chart image as PNG', 'Зберегти зображення графіка як PNG'],
    ['Copy image', 'Копіювати зображення'],
    ['Save PNG', 'Зберегти PNG'],
    ['Chart image copied', 'Зображення графіка скопійовано'],
    ['Chart image saved', 'Зображення графіка збережено'],
    ['Time window', 'Часовий діапазон'],
    ['Full profile metrics', 'Показники всього профілю'],
    ['Image copying is unavailable in this browser. Use Save PNG.', 'Копіювання зображень у цьому браузері недоступне. Скористайтеся «Зберегти PNG».'],
    ['The chart image could not be copied. Use Save PNG.', 'Не вдалося скопіювати зображення графіка. Скористайтеся «Зберегти PNG».'],
    ['The chart image could not be created. Try again.', 'Не вдалося створити зображення графіка. Спробуйте ще раз.'],
    ['The chart image could not be saved. Try again.', 'Не вдалося зберегти зображення графіка. Спробуйте ще раз.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('custom thrust grid and height controls explain density limits in either language', () => {
  for (const [english, ukrainian] of [
    ['Chart detail controls', 'Деталізація графіка'],
    ['Thrust grid', 'Сітка тяги'],
    ['Thrust grid mode', 'Режим сітки тяги'],
    ['Custom step', 'Власний крок'],
    ['Grid step', 'Крок сітки'],
    ['Thrust grid step', 'Крок сітки тяги'],
    ['Chart height', 'Висота графіка'],
    ['Auto height', 'Автоматична висота'],
    ['Compact', 'Компактний'],
    ['Medium', 'Середній'],
    ['Large', 'Великий'],
    ['Tall', 'Високий'],
    ['Grid step must be finite and greater than zero.', 'Крок сітки має бути скінченним і більшим за нуль.'],
    ['Grid step is too small for this view. Zoom in or choose a larger step.', 'Крок сітки надто малий для цього діапазону. Збільште масштаб або виберіть більший крок.'],
    ['Choose Auto or Custom step.', 'Виберіть «Авто» або «Власний крок».'],
    ['Choose a valid chart height.', 'Виберіть коректну висоту графіка.'],
    ['Zoom in to show every grid line.', 'Збільште масштаб, щоб показати кожну лінію сітки.'],
    ['Increase chart height or zoom in to show more labels.', 'Збільште висоту графіка або масштаб, щоб показати більше підписів.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('time grid controls and relative recording time remain bilingual and reversible', () => {
  for (const [english, ukrainian] of [
    ['Time grid controls', 'Налаштування сітки часу'],
    ['Time grid', 'Сітка часу'],
    ['Spacing', 'Інтервал'],
    ['Time grid mode', 'Режим сітки часу'],
    ['Time grid step', 'Крок сітки часу'],
    ['Zoom in or widen the chart to show more time labels.', 'Збільште масштаб або ширину графіка, щоб показати більше часових підписів.'],
    ['Time from fitted region start', 'Час від початку підігнаної ділянки'],
    ['Recording time', 'Час запису'],
    ['Time labels need finite timestamps and a finite origin.', 'Для часових підписів потрібні скінченні часові мітки та скінченний початок відліку.'],
    ['The relative time is outside the supported numeric range.', 'Відносний час виходить за підтримувані числові межі.'],
    ['Time view needs a finite minimum below its maximum.', 'Часовий діапазон має містити скінченну нижню межу, меншу за верхню.'],
    ['Time axis width must be finite and greater than zero.', 'Ширина часової осі має бути скінченною та більшою за нуль.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('duration matching explains impulse preservation, automatic peak and fixed-grid limits in both languages', () => {
  for (const [english, ukrainian] of [
    ['Burn duration and output', 'Тривалість горіння та тяга'],
    ['Stretch the current curve on its original timestamps. Impulse is preserved by default; peak thrust adjusts automatically.', 'Розтягніть поточний графік на його оригінальних часових мітках. За замовчуванням імпульс зберігається, а пікова тяга підлаштовується автоматично.'],
    ['This adjustment uses the entire profile.', 'Це налаштування застосовується до всього профілю.'],
    ['Live duration matching', 'Зміна тривалості в реальному часі'],
    ['Keep current impulse', 'Зберегти поточний імпульс'],
    ['Custom impulse', 'Задати власний імпульс'],
    ['Automatic · keep shape', 'Автоматично · зберегти форму'],
    ['Custom peak thrust', 'Задати власну пікову тягу'],
    ['Matched peak thrust', 'Пікова тяга після підгонки'],
    ['Automatic peak preserves the normalized curve shape. Setting both peak and impulse can change its proportions.', 'Автоматична пікова тяга зберігає відносну форму графіка. Одночасне задання пікової тяги й імпульсу може змінити його пропорції.'],
    ['Duration matching is active.', 'Зміна тривалості активна.'],
    ['Complete the highlighted target to update the profile.', 'Заповніть виділене цільове значення, щоб оновити профіль.'],
    ['A shorter or earlier burn is needed to fit the original timestamps.', 'Щоб уміститися в оригінальні часові мітки, потрібне коротше горіння або раніший початок.'],
    ['The requested targets cannot be represented on the original measurement grid.', 'Задані цілі неможливо відтворити на оригінальній сітці вимірювань.'],
    ['No positive burn was found in the current profile.', 'У поточному профілі не знайдено горіння з додатною тягою.'],
    ['Maximum burn duration on this timeline: 3.56 s.', 'Максимальна тривалість горіння на цій часовій шкалі: 3.56 s.'],
    ['Maximum burn duration on this timeline: 3,560 ms.', 'Максимальна тривалість горіння на цій часовій шкалі: 3,560 ms.'],
    ['The current profile shape was preserved; peak thrust was adjusted to keep the impulse.', 'Форму поточного профілю збережено; пікову тягу підлаштовано для збереження імпульсу.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('imported CSV numeric formatting and every custom decimal count remain bilingual', () => {
  for (const [english, ukrainian] of [
    ['Original CSV timestamps, columns and formatting are restored. Current thrust measurements are kept.', 'Відновлюються оригінальні часові мітки, колонки та форматування CSV. Поточні вимірювання тяги зберігаються.'],
    ['Use timings from another CSV', 'Взяти часові мітки з іншого CSV'],
    ['Pair the CSV timestamps with current thrust measurements in row order.', 'Поєднайте часові мітки CSV з поточними вимірюваннями тяги в порядку рядків.'],
    ['Import timestamp source', 'Імпортувати джерело часових міток'],
    ['Use these timestamps', 'Використати ці часові мітки'],
    ['Timings and original CSV format restored', 'Часові мітки й оригінальний формат CSV відновлено'],
    ['The time source must contain the same number of measurements as the current profile.', 'Джерело часу має містити таку саму кількість вимірювань, як і поточний профіль.'],
    ['Combine CSV files', 'Поєднати CSV-файли'],
    ['Keep current thrust and take timestamps from another CSV.', 'Збережіть поточну тягу та візьміть часові мітки з іншого CSV.'],
    ['CSV source format is invalid.', 'Оригінальний формат CSV некоректний.'],
    ['CSV source format must match the measurement timestamp sequence.', 'Оригінальний формат CSV має відповідати послідовності часових міток вимірювань.'],
    ['CSV source format contains an invalid numeric record.', 'Оригінальний формат CSV містить некоректний числовий запис.'],
    ['Cannot format a nonfinite CSV value.', 'Неможливо відформатувати нескінченне або невизначене значення CSV.'],
    ['Original CSV format', 'Оригінальний формат CSV'],
    ['All original columns, timestamps, headers and number formatting are retained.', 'Усі оригінальні стовпці, часові мітки, заголовки та числовий формат зберігаються.'],
    ['Time values are copied exactly from the imported file. Thrust keeps the original decimal format.', 'Значення часу копіюються дослівно з імпортованого файлу. Тяга зберігає оригінальний десятковий формат.'],
    ['This saved profile has no original CSV layout. Choose the original CSV to restore all columns and exact formatting without changing thrust.', 'Цей збережений профіль не містить оригінальної структури CSV. Виберіть оригінальний CSV, щоб відновити всі стовпці й точний формат без зміни тяги.'],
    ['Restore original CSV layout', 'Відновити оригінальну структуру CSV'],
    ['CSV header export must be true or false.', 'Параметр експорту заголовка CSV має бути true або false.'],
    ['Original column names are retained. Headerless files stay headerless.', 'Оригінальні назви стовпців зберігаються. До файлів без заголовка новий заголовок не додається.'],
    ['Time format', 'Формат часу'],
    ['Thrust format', 'Формат тяги'],
    ['Imported formatting is retained in saved projects.', 'Формат імпортованих даних зберігається у файлах проєкту.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
  for (let digits = 0; digits <= 15; digits++) {
    const english = `${digits} decimal ${digits === 1 ? 'place' : 'places'}`;
    assert.notEqual(translate(english, 'uk'), english);
    assert.equal(translate(translate(english, 'uk'), 'en'), english);
  }
});

test('synthetic export markers and analyzer navigation remain bilingual and reversible', () => {
  for (const [english, ukrainian] of [
    ['Analyzer', 'Аналізатор'],
    ['Synthetic data analyzer', 'Аналізатор синтетичних даних'],
    ['Include synthetic marker', 'Додати синтетичну мітку'],
    ['Adds 10 near-zero records before the measurements.', 'Додає 10 білянульових записів перед вимірюваннями.'],
    ['Synthetic marker detected; 10 marker records were excluded from the profile.', 'Виявлено синтетичну мітку; 10 службових записів виключено з профілю.'],
    ['Synthetic marking needs at least two valid measurements with strictly increasing timestamps.', 'Для синтетичної мітки потрібні щонайменше два коректні вимірювання з часовими мітками, що строго зростають.'],
    ['The timeline has no room for a synthetic marker before its first measurement.', 'На часовій шкалі немає місця для синтетичної мітки перед першим вимірюванням.'],
    ['Synthetic marker analysis needs an array of measurements.', 'Для аналізу синтетичної мітки потрібен масив вимірювань.'],
    ['Synthetic marker export must be true or false.', 'Параметр експорту синтетичної мітки має бути true або false.'],
    ['Export units cannot represent these timestamps as finite, strictly increasing values.', 'Одиниці експорту не дозволяють подати ці часові мітки як скінченні значення, що строго зростають.'],
  ]) {
    assert.equal(translate(english, 'uk'), ukrainian);
    assert.equal(translate(ukrainian, 'en'), english);
  }
});

test('analyzer input, results, limitations and file errors translate in both directions', () => {
  for (const english of [
    'FILE INSPECTION', 'ANALYSIS RESULT',
    'Check a saved CSV or Thrust Lab project for its synthetic marker.',
    'Files stay on this device', 'Inspect a file',
    'The analyzer reads the saved file independently of your working profile.',
    'Choose CSV or project', 'No file selected', 'CSV interpretation',
    'Adjust columns and units if the file uses a different format.',
    'Ready to inspect', 'Choose an exported file to check the first ten records.',
    'Marker scheme', 'Marker records', 'Profile measurements', 'Profile timeline',
    'Marker records are excluded from profile charts and measurements.',
    'How to interpret the result',
    'A matching pattern identifies the Thrust Lab synthetic marker. A missing marker does not prove that measurements are real.',
    'The marker is an identification pattern, not a cryptographic authenticity check.',
    'Unable to inspect this file', 'Check the file format, columns, and units, then try again.',
    'Synthetic marker detected', 'No synthetic marker found',
    'The first ten records match the Thrust Lab synthetic pattern.',
    'This file does not contain the recognized Thrust Lab marker.',
    'Not detected', 'Untitled file', 'File content must be text.',
    'Analyzer files must be smaller than 20 MB.', 'Reading file…',
    'Analysis runs locally in this browser.', 'Thrust Lab project',
  ]) {
    const ukrainian = translate(english, 'uk');
    assert.notEqual(ukrainian, english);
    assert.equal(translate(ukrainian, 'en'), english);
  }
  assert.equal(translate('Synthetic marker detected', 'uk'), 'Синтетичну мітку виявлено');
  assert.equal(translate('No synthetic marker found', 'uk'), 'Синтетичної мітки не знайдено');
});

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
    ['Fit burn region', 'Показати ділянку горіння'],
    ['Fit the active burn window, excluding idle time before and after thrust.', 'Показати активну ділянку горіння без часу очікування до появи тяги й після її завершення.'],
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
