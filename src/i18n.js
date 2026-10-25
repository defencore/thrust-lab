/** English is the canonical interface language; project data is never translated. */
export const dictionary = {
  'Fill emptied intervals': 'Заповнювати звільнені ділянки',
  'Zeros': 'Нулями',
  'Recorded background': 'Фоновим шумом запису',
  'Background level': 'Рівень фонового шуму',
  'Original quiet region': 'Початкова ділянка без тяги',
  'Choose recorded background to fill gaps with noise from the original no-thrust regions.': 'Виберіть фоновий шум запису, щоб заповнювати проміжки шумом із початкових ділянок без тяги.',
  'No quiet source found. At least 7 original measurements below 5% peak are needed before or after the burn.': 'Ділянку без тяги не знайдено. Потрібно щонайменше 7 початкових вимірювань нижче 5% піка до або після горіння.',
  'The original quiet region is flat; background fill remains constant.': 'Початкова ділянка без тяги стала; фонове заповнення залишатиметься сталим.',
  'Choose zeros or recorded background for empty intervals.': 'Виберіть нулі або фоновий шум запису для порожніх проміжків.',
  'Background level must be between 0 and 1000 percent.': 'Рівень фонового шуму має бути в межах від 0 до 1000 відсотків.',
  'No recorded background is available. Choose zeros or import a recording with a quiet region.': 'Фоновий шум запису недоступний. Виберіть нулі або імпортуйте запис із ділянкою без тяги.',
  'Background detection needs an array of measurements.': 'Для пошуку фонового шуму потрібен масив вимірювань.',
  'Background measurements must contain finite, nonnegative thrust and strictly increasing timestamps.': 'Вимірювання фонового шуму мають містити скінченну невід’ємну тягу та часові мітки, що строго зростають.',
  'The background timeline is outside the supported numeric range.': 'Часова шкала фонового шуму виходить за підтримувані числові межі.',
  'Choose a background source with at least 7 measurements.': 'Виберіть джерело фонового шуму щонайменше із 7 вимірюваннями.',
  'Background samples must have finite, nonnegative thrust and strictly increasing relative timestamps.': 'Зразки фонового шуму мають містити скінченну невід’ємну тягу та відносні часові мітки, що строго зростають.',
  'The background source needs relative timestamps starting at zero and a positive duration.': 'Джерело фонового шуму потребує відносних часових міток від нуля та додатної тривалості.',
  'Background source metadata must match its measurement interval.': 'Метадані джерела фонового шуму мають відповідати його інтервалу вимірювань.',
  'Background noise gain must be finite and nonnegative.': 'Масштаб фонового шуму має бути скінченним і невід’ємним.',
  'Background noise gain is too large for this source.': 'Масштаб фонового шуму завеликий для цього джерела.',
  'Background replay time must be finite.': 'Час відтворення фонового шуму має бути скінченним числом.',
  'Theoretical reference': 'Теоретичний еталон',
  'Match all targets to theory': 'Підігнати всі цілі під теорію',
  'Time from ignition until the final fall-off begins. Use Entire profile for this timing adjustment.': 'Час від запалювання до початку фінального спаду. Для цього налаштування часу виберіть «Увесь профіль».',
  'Choose Entire profile to adjust the final decay timing.': 'Виберіть «Увесь профіль», щоб змінити час фінального спаду.',
  'Enter a finite time offset to shift the profile.': 'Введіть скінченний часовий зсув профілю.',
  'Shifting a profile needs at least two measurements.': 'Для зсуву профілю потрібно щонайменше два вимірювання.',
  'Profile shifting needs finite, nonnegative measurements and strictly increasing timestamps.': 'Для зсуву профілю потрібні скінченні невід’ємні вимірювання та часові мітки, що строго зростають.',
  'The profile timeline is outside the supported numeric range.': 'Часова шкала профілю виходить за підтримувані числові межі.',
  'Profile shift must be a finite time offset.': 'Зсув профілю має бути скінченним часовим зміщенням.',
  'The shift edge transition must be between zero and 50 percent.': 'Плавний перехід на межах зсуву має бути в межах від нуля до 50 відсотків.',
  'The shift range must stay within the profile timeline.': 'Діапазон зсуву має залишатися в межах часової шкали профілю.',
  'The shifted thrust must remain finite and nonnegative.': 'Тяга після зсуву має залишатися скінченною та невід’ємною.',
  'A shift gesture needs a finite starting time.': 'Для зсуву перетягуванням потрібен скінченний початковий час.',
  'Final tail start needs a positive interior measurement before it. Choose a later tail start or a wider burn interval.': 'Перед початком фінального спаду потрібен внутрішній відлік із додатною тягою. Виберіть пізніший початок спаду або ширший інтервал горіння.',
  'The fitted peak thrust': 'Пікова тяга після підгонки',
  'Shift profile': 'Зсунути профіль',
  'Shift profile (G)': 'Зсунути профіль (G)',
  'Time shift': 'Часовий зсув',
  'Profile time shift': 'Часовий зсув профілю',
  'Drag left or right to shift thrust values along the fixed timeline.': 'Перетягніть ліворуч або праворуч, щоб зсунути значення тяги вздовж незмінної часової шкали.',
  'Move the profile across fixed measurement times. Choose how emptied intervals are filled.': 'Зсувайте профіль по незмінних часових мітках. Виберіть, чим заповнювати звільнені ділянки.',
  'Values shifted outside the recording are clipped.': 'Значення, зсунуті за межі запису, відсікаються.',
  'Fit final fall-off': 'Підігнати фінальний спад',
  'Decay starts after': 'Спад починається через',
  'Target final fall-off time': 'Бажаний час початку фінального спаду',
  'Custom final fall-off': 'Власний фінальний спад',
  'Tail starts after ignition': 'Фінальний спад після запалювання',
  'Theory fit final fall-off time': 'Час фінального спаду під час підгонки під теорію',
  'Time from ignition until the final fall-off begins.': 'Час від запалювання до початку фінального спаду.',
  'Load a recording with positive thrust before adjusting the decay.': 'Завантажте запис із додатною тягою перед зміною спаду.',
  'Matches the whole recording; manual tools can still use a selection.': 'Підгонка охоплює весь запис; ручні інструменти й надалі можуть працювати з виділенням.',
  'Peak, impulse and burn timing stay constrained while texture is added.': 'Пікова тяга, імпульс і часові параметри горіння зберігають задані обмеження під час додавання шуму.',
  'Matched reference': 'Підігнаний еталон',
  'Final tail start': 'Початок фінального спаду',
  'Final tail start must be greater than zero and before the burn duration.': 'Початок фінального спаду має бути більшим за нуль і передувати завершенню горіння.',
  'The final tail is remapped from the reference terminal decline and kept monotonic while fitting the total impulse.': 'Фінальний спад перенесено з кінцевої ділянки еталона та збережено монотонним під час підгонки загального імпульсу.',
  'Tail onset is represented by the next existing measurement time.': 'Початок спаду відтворено на найближчій наступній часовій мітці вимірювання.',
  'Total impulse': 'Загальний імпульс',
  'Fitted profile': 'Підігнаний профіль',
  'Adjust a target to start live matching.': 'Змініть цільове значення, щоб почати підгонку в реальному часі.',
  'Complete the highlighted target to update the curve.': 'Заповніть виділене цільове значення, щоб оновити криву.',
  'Choose impulse or mean burn thrust as the independent target.': 'Виберіть імпульс або середню тягу під час горіння як незалежну ціль.',
  'Choose a valid recording texture source.': 'Виберіть коректне джерело шуму запису.',
  'The texture baseline window must be an odd whole number.': 'Вікно базової лінії шуму має бути непарним цілим числом.',
  'The last valid result is kept.': 'Останній коректний результат збережено.',
  'Duration, peak and total target matched.': 'Тривалість, пікову тягу й цільовий імпульс узгоджено.',
  'Match theory and recording texture': 'Підігнати теорію й характер шуму запису',
  'Disable theory matching': 'Вимкнути підгонку під теорію',
  'Recorded texture is available from the original recording or your captured sample.': 'Шум можна взяти з початкового запису або збереженого зразка.',
  'Original recording texture stays available after fitting. Capture a source in Signal to use a captured sample.': 'Шум початкового запису залишається доступним після підгонки. Збережіть джерело в «Сигнал», щоб використати зразок шуму.',
  'Theory fitting settings must be an object.': 'Параметри підгонки під теорію мають бути об’єктом.',
  'Choose impulse or mean thrust as the fitting target.': 'Виберіть імпульс або середню тягу як ціль підгонки.',
  'Choose original, captured, or no recorded texture.': 'Виберіть початковий шум, збережений зразок або варіант без шуму.',
  'Recorded texture level must be finite and nonnegative.': 'Рівень шуму запису має бути скінченним і невід’ємним.',
  'Capture a noise sample before choosing captured texture.': 'Збережіть зразок шуму перед вибором збереженого джерела.',
  'The texture window must be an odd whole number from 3 to 1001.': 'Вікно шуму має бути непарним цілим числом від 3 до 1001.',
  'The texture range must stay within the recording timeline.': 'Діапазон шуму має залишатися в межах часової шкали запису.',
  'At least 7 original measurements are needed for recorded texture.': 'Для шуму запису потрібно щонайменше 7 початкових вимірювань.',
  'The texture constraints are outside the supported numeric range.': 'Обмеження шуму виходять за підтримувані числові межі.',
  'Recorded texture cannot preserve the fitted impulse on this sampling grid.': 'На цій сітці вимірювань неможливо зберегти підігнаний імпульс після додавання шуму запису.',
  'Texture gain must be finite and nonnegative.': 'Масштаб шуму має бути скінченним і невід’ємним.',
  'Choose repeat or stretch for recorded texture.': 'Для шуму запису виберіть повторення або розтягнення.',
  'Texture transition must be between 0 and 50 percent.': 'Плавний перехід шуму має бути в межах від 0 до 50 відсотків.',
  'Choose whether to preserve fitted metrics.': 'Виберіть, чи зберігати підігнані показники.',
  'The original recording has too few active measurements for reliable texture; the clean fitted profile was kept.': 'Початковий запис має замало активних вимірювань для надійного шумового зразка; збережено чистий підігнаний профіль.',
  'The recorded texture must contain finite residuals.': 'Шум запису має містити скінченні залишкові значення.',
  'The texture gain is outside the supported numeric range.': 'Масштаб шуму виходить за підтримувані числові межі.',
  'The textured profile is outside the supported numeric range.': 'Профіль із шумом виходить за підтримувані числові межі.',
  'Recorded texture was reduced to preserve the fitted peak, impulse and burn timing.': 'Шум запису зменшено для збереження підігнаної пікової тяги, імпульсу та часових параметрів горіння.',
  'Recorded texture was clipped to keep thrust nonnegative.': 'Шум запису обмежено для збереження невід’ємної тяги.',
  'The impulse target uses the narrowest shape possible on these measurements.': 'Цільовий імпульс досягається найвужчою можливою формою на цих вимірюваннях.',
  'The impulse target uses the broadest shape possible on these measurements.': 'Цільовий імпульс досягається найширшою можливою формою на цих вимірюваннях.',
  'MEAN BURN THRUST': 'СЕРЕДНЯ ТЯГА ПІД ЧАС ГОРІННЯ',
  'Impulse / 5% burn duration': 'Імпульс / тривалість горіння за 5% піка',
  'Load a theory profile to begin.': 'Завантажте теоретичний профіль, щоб почати.',
  'Reference & overlay': 'Еталон і накладання',
  'Match theory': 'Підігнати під теорію',
  'Match the reference shape, set achievable targets, then restore recorded texture.': 'Узгодьте форму з еталоном, задайте досяжні цілі та відновіть характер шуму запису.',
  'Live matching': 'Підгонка в реальному часі',
  'Theory matching controls': 'Налаштування підгонки під теорію',
  'Use theory values': 'Значення з теорії',
  'Use current values': 'Поточні значення',
  'Shape & targets': 'Форма й цільові значення',
  'Start and duration use the 5% peak burn window.': 'Початок і тривалість визначаються вікном горіння за порогом 5% пікової тяги.',
  'Burn start': 'Початок горіння',
  'Set the total using': 'Задавати загальне значення через',
  'Mean over burn': 'Середня під час горіння',
  'Impulse = mean over burn × burn duration.': 'Імпульс = середня тяга під час горіння × тривалість горіння.',
  'Theory shape': 'Форма теорії',
  '0% keeps the recording shape; 100% follows the theory shape.': '0% зберігає форму запису; 100% відтворює форму теорії.',
  'Recording texture': 'Характер шуму',
  'Original recording': 'Початковий запис',
  'Captured sample': 'Збережений зразок',
  'None': 'Без шуму',
  'Capture a source in Signal to use a captured sample.': 'Збережіть джерело в «Сигнал», щоб використати зразок шуму.',
  'Result': 'Результат',
  'Before, theory, and result comparison': 'Порівняння початкових даних, теорії та результату',
  'Metric': 'Показник',
  'Before': 'До',
  'Enable matching to compare the result.': 'Увімкніть підгонку для порівняння результату.',
  'Target burn start': 'Бажаний початок горіння',
  'Target burn duration': 'Бажана тривалість горіння',
  'Independent total target': 'Незалежне загальне цільове значення',
  'Target total impulse': 'Бажаний загальний імпульс',
  'Target mean over burn': 'Бажана середня тяга під час горіння',
  'Theory shape blend': 'Ступінь наближення до форми теорії',
  'Matched noise level': 'Рівень відтвореного шуму',
  'Theory fit baseline window': 'Вікно базової лінії підгонки під теорію',
  'samples': 'відліків',
  'Mean burn thrust': 'Середня тяга під час горіння',
  'Mean thrust multiplied by burn duration': 'Добуток середньої тяги й тривалості горіння',
  'The profile impulse is outside the supported numeric range.': 'Імпульс профілю виходить за підтримувані числові межі.',
  'Theory fitting options must be an object.': 'Налаштування підгонки під теорію мають бути об’єктом.',
  'Theory shape blend must be between zero and one.': 'Ступінь наближення до форми теорії має бути від нуля до одиниці.',
  'The fitting range must stay within the recording timeline.': 'Діапазон підгонки має залишатися в межах часової шкали запису.',
  'Select at least three measurements for coordinated theory fitting.': 'Виділіть щонайменше три вимірювання для узгодженої підгонки під теорію.',
  'The theoretical profile needs a positive peak and a nonzero 5% burn duration.': 'Теоретичному профілю потрібні додатна пікова тяга та ненульова тривалість горіння за порогом 5%.',
  'Burn start must be finite.': 'Початок горіння має бути скінченним числом.',
  'The requested burn interval does not fit within the existing measurement timeline. Choose a shorter duration or an earlier start.': 'Бажаний інтервал горіння не вміщується в наявну часову шкалу вимірювань. Зменште тривалість або виберіть раніший початок.',
  'Impulse and mean thrust are coupled: total impulse must equal mean burn thrust multiplied by burn duration.': 'Імпульс і середня тяга пов’язані: загальний імпульс має дорівнювати добутку середньої тяги під час горіння й тривалості горіння.',
  'The burn interval needs an interior measurement with positive theoretical thrust. Increase its duration or choose another start.': 'Усередині інтервалу горіння потрібен відлік із додатною теоретичною тягою. Збільште тривалість або змініть початок.',
  'The requested 5% burn boundaries cannot be represented with this measurement spacing and peak. Widen the burn interval or change its start.': 'Бажані межі горіння за порогом 5% неможливо відтворити з такими інтервалами вимірювань і піковою тягою. Розширте інтервал горіння або змініть його початок.',
  'The target shape is outside the supported numeric range.': 'Бажана форма виходить за підтримувані числові межі.',
  'The fitted impulse is outside the supported numeric range.': 'Імпульс після підгонки виходить за підтримувані числові межі.',
  'The fitted curve must remain finite and nonnegative.': 'Значення підігнаної кривої мають залишатися скінченними та невід’ємними.',
  'The requested burn boundaries are too precise for these measurement values. Change the start or increase the burn duration.': 'Бажані межі горіння надто точні для цих вимірювань. Змініть початок або збільште тривалість горіння.',
  'The requested impulse could not be represented accurately on these measurements.': 'Бажаний імпульс неможливо точно відтворити на цих вимірюваннях.',
  'Reported metrics describe the selected fitting range; samples outside it are unchanged.': 'Показники стосуються виділеного діапазону підгонки; вимірювання поза ним зберігаються.',
  'The working profile has no positive thrust; the theoretical shape was used.': 'Робочий профіль не має додатної тяги; використано теоретичну форму.',
  'Chart scale controls': 'Масштаб графіка',
  'Time zoom': 'Масштабування часу',
  'Time zoom out': 'Зменшити масштаб часу',
  'Time zoom in': 'Збільшити масштаб часу',
  'Thrust zoom': 'Масштабування тяги',
  'Thrust zoom out': 'Зменшити масштаб тяги',
  'Thrust zoom in': 'Збільшити масштаб тяги',
  'Reset thrust scale': 'Скинути масштаб тяги',
  'Visible thrust range': 'Видимий діапазон тяги',
  'Auto': 'Авто',
  'Fit all axes': 'Показати весь графік',
  'Fit all axes (F)': 'Показати весь графік (F)',
  'Shift + wheel': 'Shift + коліщатко',
  'Shift + wheel: thrust zoom · Double-click thrust axis: auto scale': 'Shift + коліщатко: масштаб тяги · Подвійний клік по осі тяги: автомасштаб',
  'Drag to zoom thrust · Double-click to reset': 'Перетягніть для масштабування тяги · Подвійний клік для скидання',
  'Vertical view': 'Вертикальний діапазон',
  'Automatic thrust extent': 'Автоматичний діапазон тяги',
  'The visible peak thrust must be finite and nonnegative.': 'Видима пікова тяга має бути скінченною та невід’ємною.',
  'The automatic thrust view is outside the supported numeric range.': 'Автоматичний діапазон тяги виходить за підтримувані числові межі.',
  'Choose a positive whole number of axis intervals.': 'Виберіть додатну цілу кількість інтервалів осі.',
  'The vertical view spacing is outside the supported numeric range.': 'Ширина вертикального діапазону виходить за підтримувані числові межі.',
  'Vertical zoom needs a finite positive factor.': 'Для вертикального масштабування потрібен скінченний додатний коефіцієнт.',
  'The vertical zoom anchor must be finite.': 'Опора вертикального масштабування має бути скінченною.',
  'Vertical pan needs a finite force shift.': 'Для вертикального переміщення потрібен скінченний зсув тяги.',
  'The vertical view is wider than the supported thrust extent.': 'Вертикальний діапазон ширший за підтримуваний діапазон тяги.',
  'Measure': 'Виміряти',
  'Measure (M)': 'Виміряти (M)',
  'Measurement': 'Вимірювання A/B',
  'Clear selection (Esc)': 'Зняти виділення (Esc)',
  'Clear selected range, point, and measurement markers (Esc)': 'Зняти виділення діапазону й точки та прибрати вимірювальні маркери (Esc)',
  'Click two points or drag to measure time and thrust.': 'Клацніть дві точки або перетягніть, щоб виміряти час і тягу.',
  'Clear measurement': 'Очистити вимірювання',
  'Marker A time': 'Час маркера A',
  'Marker B time': 'Час маркера B',
  'Time difference': 'Різниця часу',
  'Thrust difference': 'Різниця тяги',
  'Measurements are independent of the edit selection.': 'Вимірювання незалежні від області редагування.',
  'A measurement needs at least one profile sample.': 'Для вимірювання потрібен хоча б один відлік профілю.',
  'Measurements need finite timestamps and nonnegative thrust.': 'Для вимірювань потрібні скінченні часові мітки та невід’ємна тяга.',
  'Measurement timestamps must be strictly increasing.': 'Часові мітки вимірювань мають строго зростати.',
  'A measuring cursor needs a finite time.': 'Вимірювальному курсору потрібен скінченний час.',
  'Choose up to two finite measuring cursor times.': 'Виберіть до двох скінченних часових значень вимірювальних курсорів.',
  'The measurement difference is outside the supported numeric range.': 'Різниця вимірювань виходить за підтримуваний числовий діапазон.',
  'Curve points (C)': 'Точки кривої (C)',
  'Changes saved automatically · Undo available': 'Зміни зберігаються автоматично · доступне скасування',
  'Saving changes…': 'Збереження змін…',
  'Export to keep your work · storage unavailable': 'Експортуйте роботу · сховище недоступне',
  'Workspace created': 'Робочий простір створено',
  'Draw thrust': 'Намалювати тягу',
  'Curve visibility': 'Видимість кривих',
  'The random seed must be a whole number.': 'Зерно випадковості має бути цілим числом.',
  'Shape and scale': 'Зміна форми й масштабу',
  'Seeded noise': 'Шум із заданим зерном',
  'Select time range': 'Вибрати часовий діапазон',
  'Edit control points': 'Редагувати контрольні точки',
  'Add control point': 'Додати контрольну точку',
  'Move control point': 'Перемістити контрольну точку',
  'Edit control point': 'Змінити контрольну точку',
  'Change curve interpolation': 'Змінити інтерполяцію кривої',
  'Change curve point count': 'Змінити кількість точок кривої',
  'Reset control points': 'Скинути контрольні точки',
  'Remove control point': 'Видалити контрольну точку',
  'A control curve supports at most 128 points.': 'Крива підтримує щонайбільше 128 контрольних точок.',
  'Choose a point inside the active curve range.': 'Виберіть точку в межах активного діапазону кривої.',
  'There are no unused measurement times for another control point.': 'Для нової контрольної точки немає вільних часових міток вимірювань.',
  'Enter valid generator targets to update the preview.': 'Введіть коректні параметри генератора, щоб оновити перегляд.',
  'Preview updates live': 'Перегляд оновлюється одразу',
  'Check generator targets': 'Перевірте параметри генератора',
  'Capture a noise sample first.': 'Спочатку збережіть зразок шуму.',
  'Changes update the curve immediately. Time marks stay fixed.': 'Зміни одразу оновлюють криву. Часові мітки зберігаються.',
  'Adjust values to refine the same edit. Undo restores the previous result.': 'Уточнюйте значення для тієї самої зміни. Скасування відновлює попередній результат.',
  'Drag a point or edit its values. Changes are saved immediately.': 'Перетягніть точку або змініть її значення. Зміни зберігаються одразу.',
  'Capture natural noise from an unedited region, then enable it in your edit scope.': 'Збережіть природний шум із незміненої ділянки, а потім увімкніть його в області редагування.',
  '2. Add recorded variation': '2. Додайте коливання із запису',
  'Recorded noise': 'Записаний шум',
  'Random noise': 'Випадковий шум',
  'Smoothing': 'Згладжування',
  'The preview updates as you change targets.': 'Перегляд оновлюється зі зміною параметрів.',
  '2. Inspect the live preview': '2. Перевірте поточний перегляд',
  'Edit the loaded curve with Transform, Curve, Signal, or Theory.': 'Редагуйте завантажений графік інструментами «Форма», «Крива», «Сигнал» або «Теорія».',
  'Capture at least seven unchanged samples in Signal, select a destination, and enable Recorded noise. Controls update the curve immediately; Undo restores the previous result.': 'Збережіть щонайменше сім незмінених вимірювань у «Сигнал», виберіть цільову ділянку й увімкніть «Записаний шум». Налаштування одразу оновлюють криву; скасування відновлює попередній результат.',
  'Click to add points · drag to shape the curve': 'Клацніть для додавання точок · перетягніть для зміни кривої',
  'Curve points': 'Точки кривої',
  'Control points': 'Контрольні точки',
  'Adjust nearby measurements without smoothing the rest of the recording.': 'Коригуйте сусідні вимірювання, зберігаючи деталі решти запису.',
  'Moving a point changes the area between its neighbouring anchors. Existing detail and noise are kept.': 'Переміщення точки змінює ділянку між сусідніми опорними точками. Наявні деталі й шум зберігаються.',
  'Adjustment shape': 'Форма коригування',
  'Smooth adjustment': 'Плавне коригування',
  'Linear adjustment': 'Лінійне коригування',
  'Redistribute points': 'Перерозподілити точки',
  'Redistribute control points': 'Перерозподілити контрольні точки',
  'Add more points to narrow the affected area.': 'Додайте більше точок, щоб звузити ділянку впливу.',
  'Existing noise is preserved. Use noise matching only when you want to replace it.': 'Наявний шум зберігається. Узгоджуйте шум лише тоді, коли потрібно його замінити.',
  'Start curve editing': 'Почати редагування кривої',
  'Add point at cursor': 'Додати точку біля курсора',
  'Use cursor position': 'Використати позицію курсора',
  'Point time': 'Час точки',
  'Cursor time': 'Час курсора',
  'Point thrust': 'Тяга точки',
  'Interpolation': 'Інтерполяція',
  'Smooth curve': 'Плавна крива',
  'Straight segments': 'Прямі відрізки',
  'Anchor points': 'Опорні точки',
  'Reset points': 'Скинути точки',
  'Remove point': 'Видалити точку',
  'Select a point to edit its exact time and thrust.': 'Виберіть точку, щоб змінити її точний час і тягу.',
  'Boundary points keep the edited range connected to its surroundings.': 'Граничні точки зберігають з’єднання ділянки з навколишнім графіком.',
  'Match noise': 'Узгодити шум',
  'Replace noise to match the reference recording instead of stacking more noise.': 'Замініть шум відповідно до еталонного запису, не додаючи його поверх наявного.',
  'Match neighbouring data': 'Узгодити з сусідніми даними',
  'Match captured noise': 'Узгодити зі зразком шуму',
  'Noise level': 'Рівень шуму',
  'Noise matched to reference': 'Шум узгоджено з еталоном',
  'Capture a noise sample or choose Match neighbouring data.': 'Збережіть зразок шуму або виберіть «Узгодити з сусідніми даними».',
  'Matching replaces the existing high-frequency variation and blends the selection edges.': 'Узгодження замінює наявні високочастотні коливання та плавно з’єднує межі виділення.',
  'At least 7 samples are needed to match noise.': 'Для узгодження шуму потрібно щонайменше 7 вимірювань.',
  'No unchanged neighbouring region is available.': 'Немає незміненої сусідньої ділянки.',
  'Source noise': 'Шум джерела',
  'Current noise': 'Поточний шум',
  'Result noise': 'Шум результату',
  'No point selected': 'Точку не вибрано',
  'Curve point': 'Точка кривої',
  'Match noise after shaping': 'Узгодити шум після зміни форми',
  'Curve': 'Крива',
  'Time and thrust use the selected display units.': 'Час і тяга використовують вибрані одиниці відображення.',
  'Add point': 'Додати точку',
  'No free measurement timestamps remain.': 'Вільних часових міток вимірювань не залишилося.',
  'Curve editing': 'Редагування кривої',
  'Last noise match': 'Останнє узгодження шуму',
  'Point': 'Точка',
  'Pinned boundary': 'Зафіксована межа',
  'Pinned time': 'Зафіксований час',
  'Endpoint times stay fixed; their thrust can be edited.': 'Час крайніх точок зафіксовано; їхню тягу можна редагувати.',
  'Before matching': 'До узгодження',
  'After matching': 'Після узгодження',
  'Select a time range to match neighbouring noise.': 'Виділіть часовий діапазон для узгодження шуму із сусідніми даними.',
  'Undo curve point': 'Скасувати зміну точки',
  'Redo curve point': 'Повторити зміну точки',
  'The control curve range must have a finite start before its end.': 'Початок діапазону кривої має бути скінченним числом перед його кінцем.',
  'The control curve range must stay within the profile timeline.': 'Діапазон кривої має залишатися в межах часової шкали профілю.',
  'A control curve needs between 2 and 128 control points.': 'Для кривої потрібно від 2 до 128 контрольних точок.',
  'Control points must use existing measurement timestamps.': 'Контрольні точки мають використовувати наявні часові мітки вимірювань.',
  'Control points must stay within the edit range.': 'Контрольні точки мають залишатися в межах області редагування.',
  'Choose between 2 and 128 initial control points.': 'Виберіть від 2 до 128 початкових контрольних точок.',
  'Select at least two measurements to edit a control curve.': 'Виділіть принаймні два вимірювання для редагування кривої.',
  'The control point spacing is outside the supported numeric range.': 'Відстань між контрольними точками виходить за підтримуваний числовий діапазон.',
  'Choose smooth or linear control curve interpolation.': 'Виберіть плавну або лінійну інтерполяцію кривої.',
  'The fitted control curve must remain finite and nonnegative.': 'Значення кривої мають залишатися скінченними та невід’ємними.',
  'Choose an existing control point to move.': 'Виберіть наявну контрольну точку для переміщення.',
  'Control points need finite time and nonnegative thrust.': 'Контрольним точкам потрібні скінченний час і невід’ємна тяга.',
  'Choose an increasing target time range for noise matching.': 'Виберіть зростаючий часовий діапазон для узгодження шуму.',
  'The noise matching range must stay within the profile timeline.': 'Діапазон узгодження шуму має залишатися в межах часової шкали профілю.',
  'The noise values are too large to match safely.': 'Значення шуму надто великі для коректного узгодження.',
  'Noise matching gain must be a finite, nonnegative number.': 'Масштаб узгодження шуму має бути скінченним невід’ємним числом.',
  'Noise matching transition must be between 0 and 50 percent.': 'Плавний перехід узгодження шуму має бути в межах від 0 до 50 відсотків.',
  'Choose repeat or stretch for noise matching.': 'Для узгодження шуму виберіть повторення або розтягнення.',
  'Capture a noise source before matching the target.': 'Збережіть джерело шуму перед узгодженням цільової ділянки.',
  'The noise reference needs relative timestamps starting at zero and a positive duration.': 'Еталону шуму потрібні відносні часові мітки від нуля та додатна тривалість.',
  'Select at least 7 measurements to match noise.': 'Виділіть щонайменше 7 вимірювань для узгодження шуму.',
  'Noise matching gain is too large for this source.': 'Масштаб узгодження шуму надто великий для цього джерела.',
  'The matched thrust values are outside the supported numeric range.': 'Значення тяги після узгодження виходять за підтримуваний числовий діапазон.',
  'Choose before, after, or automatic noise source selection.': 'Виберіть джерело шуму перед ділянкою, після неї або автоматично.',
  'Noise reference': 'Еталон шуму',
  'Project curve edit needs 2 to 128 control points and smooth or linear interpolation.': 'Кривій проєкту потрібно від 2 до 128 контрольних точок і плавна або лінійна інтерполяція.',
  'Project curve edit range must be a valid time range inside the profile.': 'Діапазон кривої проєкту має бути коректним часовим діапазоном у межах профілю.',
  'Project curve control points must use existing timestamps inside the edit range.': 'Контрольні точки кривої проєкту мають використовувати наявні часові мітки в межах області редагування.',
  'Project curve control points': 'Контрольні точки кривої проєкту',
  'Display units': 'Одиниці відображення',
  'Thrust display unit': 'Одиниця відображення тяги',
  'Time display unit': 'Одиниця відображення часу',
  'Impulse display unit': 'Одиниця відображення імпульсу',
  'Thrust': 'Тяга',
  'Time': 'Час',
  'Display units change the chart, measurements, and editing fields. Imported data and CSV export settings stay unchanged.': 'Одиниці відображення змінюють графік, показники та поля редагування. Імпортовані дані й налаштування експорту CSV зберігаються.',
  'Minutes (min)': 'Хвилини (min)',
  'Newton-seconds (N·s)': 'Ньютон-секунди (N·s)',
  'Kilonewton-seconds (kN·s)': 'Кілоньютон-секунди (kN·s)',
  'Kilogram-force seconds (kgf·s)': 'Кілограм-сила-секунди (kgf·s)',
  'Pound-force seconds (lbf·s)': 'Фунт-сила-секунди (lbf·s)',
  'Choose thrust, time, or impulse as the unit dimension.': 'Виберіть тягу, час або імпульс як фізичну величину.',
  'Unit conversion requires a finite number.': 'Для перетворення одиниць потрібне скінченне число.',
  'The converted value is outside the supported numeric range.': 'Перетворене значення виходить за підтримуваний числовий діапазон.',
  'Enter a finite numeric value.': 'Введіть скінченне числове значення.',
  'Display precision must be a whole number from 0 to 12.': 'Точність відображення має бути цілим числом від 0 до 12.',
  'Edge transition': 'Плавний перехід на межах',
  'Blend each selection edge smoothly into the untouched curve.': 'Плавно з’єднайте межі виділення з незміненою частиною графіка.',
  'Smooth edges': 'Плавні межі',
  'Theory alignment': 'Вирівнювання теорії',
  'Original timestamps': 'Початкові часові мітки',
  'Align timeline starts': 'Сумістити початки шкал часу',
  'Align ignition (5% peak)': 'Сумістити запалювання (5% піка)',
  'Manual offset': 'Ручний зсув',
  'Align starts': 'Сумістити початки',
  'Align theory ignition to the working profile using a 5% peak threshold.': 'Сумістіть початок горіння теорії та робочого профілю за порогом 5% пікової тяги.',
  'Applied theory shift': 'Застосований зсув теорії',
  'Edited profile': 'Редагований профіль',
  'Edge blending requires the same measurement timestamp sequence.': 'Для плавних меж потрібна та сама послідовність часових міток вимірювань.',
  'Edge transition must be a finite fraction from 0 to 0.5.': 'Плавний перехід має бути скінченною часткою від 0 до 0,5.',
  'The blending range must have a finite start before its end.': 'Діапазон плавного переходу має мати скінченний початок перед кінцем.',
  'The blending range must stay within the profile timeline.': 'Діапазон плавного переходу має бути в межах часової шкали профілю.',
  'The blended thrust must remain finite and nonnegative.': 'Тяга після плавного переходу має залишатися скінченною та невід’ємною.',
  'Choose peak or impulse fitting for smooth edges.': 'Для плавних меж виберіть підгонку пікової тяги або імпульсу.',
  'The fitting target must be finite and nonnegative.': 'Бажане значення для підгонки має бути скінченним і невід’ємним.',
  'The profile values are too large for a finite smooth fit.': 'Значення профілю надто великі для скінченної підгонки з плавними межами.',
  'The peak target cannot be reached while keeping the selection edges unchanged. Reduce the edge transition, widen the selection, or choose another target.': 'Бажаного піка неможливо досягти зі збереженням меж виділення. Зменште плавний перехід, розширте виділення або виберіть інше значення.',
  'The impulse target cannot be reached while keeping the selection edges unchanged. Reduce the edge transition, widen the selection, or choose another target.': 'Бажаного імпульсу неможливо досягти зі збереженням меж виділення. Зменште плавний перехід, розширте виділення або виберіть інше значення.',
  'The fitted thrust must remain finite and nonnegative.': 'Тяга після підгонки має залишатися скінченною та невід’ємною.',
  'Load a theoretical CSV, align its start with the working curve, and export the result.': 'Завантажте теоретичний CSV, сумістіть його початок із робочим графіком та експортуйте результат.',
  'Choose source, start, or ignition for theoretical alignment.': 'Для вирівнювання теорії виберіть початкові мітки, початок шкали або запалювання.',
  'The theoretical time offset must be finite.': 'Часовий зсув теорії має бути скінченним числом.',
  'The theoretical alignment shift is too large.': 'Зсув вирівнювання теорії надто великий.',
  'The theoretical alignment produces a timestamp outside the finite range.': 'Вирівнювання теорії створює часову мітку поза скінченним діапазоном.',
  'The theoretical offset is too large to preserve distinct timestamps.': 'Зсув теорії надто великий для збереження окремих часових міток.',
  'Project theory alignment needs source, start, or ignition mode and a finite offset within ±1,000,000,000 seconds.': 'Вирівнювання теорії в проєкті має використовувати режим source, start або ignition та скінченний зсув у межах ±1 000 000 000 секунд.',
  'Edit profile': 'Редагувати профіль',
  'Create profile': 'Створити профіль',
  'Editing workspace': 'Робочий редактор',
  'Generator preview': 'Попередній перегляд генератора',
  'Generate preview': 'Згенерувати перегляд',
  'Open in editor': 'Відкрити в редакторі',
  'Back to editing': 'Повернутися до редагування',
  'Create a new profile': 'Створити новий профіль',
  '1. Set generator targets': '1. Задайте параметри генератора',
  '2. Generate a preview': '2. Згенеруйте попередній перегляд',
  '3. Open it in the editor': '3. Відкрийте профіль у редакторі',
  'Generating a preview keeps your working profile unchanged.': 'Генерація попереднього перегляду зберігає робочий профіль без змін.',
  'Opening this preview starts a new working profile. Undo restores the previous one.': 'Відкриття цього перегляду створює новий робочий профіль. Скасування відновлює попередній.',
  'Preview ready': 'Перегляд готовий',
  'Targets changed · generate a new preview': 'Параметри змінено · згенеруйте новий перегляд',
  'Current working profile': 'Поточний робочий профіль',
  'Edit the loaded curve with Transform, Signal, or Theory.': 'Редагуйте завантажений графік інструментами «Форма», «Сигнал» або «Теорія».',
  'Create a separate preview from motor presets or custom targets.': 'Створіть окремий перегляд за шаблоном двигуна або власними параметрами.',
  'Import another CSV': 'Імпортувати інший CSV',
  'Saved settings': 'Збережені налаштування',
  'Remember import columns, units, tool values, export options, and generator settings on this device.': 'На цьому пристрої запам’ятовуються стовпці й одиниці імпорту, значення інструментів, параметри експорту та генератора.',
  'Reset saved settings': 'Скинути збережені налаштування',
  'Profiles, selections, undo history, and language are kept.': 'Профілі, виділення, історія скасувань і мова зберігаються.',
  'Settings reset': 'Налаштування скинуто',
  'Settings are saved automatically.': 'Налаштування зберігаються автоматично.',
  'Settings are kept for this session; browser storage is unavailable.': 'Налаштування діють у цьому сеансі; сховище браузера недоступне.',
  'Saved import settings restored': 'Збережені налаштування імпорту відновлено',
  'Preview only · drag to pan': 'Лише перегляд · перетягніть для переміщення',
  'Working profile kept unchanged': 'Робочий профіль збережено без змін',
  'Preview generated': 'Перегляд згенеровано',
  'New profile opened in editor': 'Новий профіль відкрито в редакторі',
  'Import settings are remembered separately for working and theoretical profiles.': 'Налаштування імпорту запам’ятовуються окремо для робочих і теоретичних профілів.',
  'Apply to working profile': 'Застосувати до робочого профілю',
  'Export preview': 'Експортувати перегляд',
  'Generator controls belong to Create profile.': 'Налаштування генератора доступні в режимі «Створити профіль».',
  'Active profile': 'Активний профіль',
  'Editing tools': 'Інструменти редагування',
  'No preview generated yet.': 'Попередній перегляд ще не згенеровано.',
  'Import a CSV to edit an existing profile, or switch to Create profile to generate an independent preview.': 'Імпортуйте CSV для редагування наявного профілю або перейдіть до «Створити профіль», щоб згенерувати незалежний перегляд.',
  'Generate and inspect a preview, then choose Open in editor when you want to start editing it.': 'Згенеруйте та перевірте перегляд, а потім виберіть «Відкрити в редакторі», щоб почати редагування.',
  'Use generator preview as theory': 'Використати перегляд генератора як теорію',
  'Generate a preview in Create profile first.': 'Спочатку згенеруйте перегляд у режимі «Створити профіль».',
  'This preview is separate from your working profile.': 'Цей перегляд відокремлено від робочого профілю.',
  'Each apply transforms the current values.': 'Кожне застосування змінює поточні значення.',
  'ACTIVE PROFILE': 'АКТИВНИЙ ПРОФІЛЬ',
  'Workspace': 'Робочий простір',
  'Generator controls': 'Налаштування генератора',
  'Close': 'Закрити',
  'Choose valid generator settings first.': 'Спочатку задайте коректні налаштування генератора.',
  'A profile generator function is required.': 'Потрібна функція генерації профілю.',
  'The generator did not return a profile.': 'Генератор не повернув профіль.',
  'A working profile and generated preview are required.': 'Потрібні робочий профіль і згенерований перегляд.',
  'Generated profile': 'Згенерований профіль',
  'Generated preview': 'Згенерований перегляд',
  'Original preview': 'Початковий перегляд',
  'Theoretical preview': 'Теоретичний перегляд',
  'Focus mode': 'Режим фокусу',
  'Burn profile workspace': 'Редактор профілів горіння',
  'Browser local': 'Локально в браузері',
  'Thrust Lab Studio home': 'Головна Thrust Lab Studio',
  'Undo (Ctrl/⌘ Z)': 'Скасувати (Ctrl/⌘ Z)',
  'Redo (Ctrl/⌘ Shift Z)': 'Повторити (Ctrl/⌘ Shift Z)',
  'Quick guide': 'Короткий посібник',
  'Import CSV': 'Імпорт CSV',
  'Export': 'Експорт',
  'PROFILE / 01': 'ПРОФІЛЬ / 01',
  'Profile name': 'Назва профілю',
  'Saved in this browser': 'Збережено в цьому браузері',
  'Open project': 'Відкрити проєкт',
  'New profile': 'Новий профіль',
  'Profile library': 'Бібліотека профілів',
  'Find a motor…': 'Знайти двигун…',
  'Search motor presets': 'Пошук шаблонів двигунів',
  'REFERENCE PRESETS': 'ДОВІДКОВІ ШАБЛОНИ',
  'SYNTHETIC': 'СИНТЕТИЧНІ',
  'Reference-inspired starting points.': 'Основа за довідковими параметрами.',
  'About these profiles': 'Про ці профілі',
  'Curve layers': 'Шари графіка',
  'Working profile': 'Робочий профіль',
  'Editable · thrust': 'Редагована тяга',
  'ACTIVE': 'АКТИВНИЙ',
  'Theoretical': 'Теоретичний',
  'Reference overlay': 'Довідкове накладання',
  'Show theoretical curve': 'Показати теоретичний графік',
  'Original': 'Початковий',
  'Before your edits': 'До редагування',
  'Show original curve': 'Показати початковий графік',
  'Your data stays on this device.': 'Дані залишаються на цьому пристрої.',
  'No uploads. No account needed.': 'Без завантаження на сервер і реєстрації.',
  'Profile editor': 'Редактор профілю',
  'TOTAL IMPULSE': 'ПОВНИЙ ІМПУЛЬС',
  'PEAK THRUST': 'ПІКОВА ТЯГА',
  'BURN DURATION': 'ЧАС ГОРІННЯ',
  'AVERAGE THRUST': 'СЕРЕДНЯ ТЯГА',
  'Integrated thrust': 'Інтеграл тяги',
  'Maximum measured force': 'Максимальна виміряна сила',
  '5% peak threshold': 'Поріг 5% від пікової тяги',
  'Over full timeline': 'За весь часовий діапазон',
  'Chart tools': 'Інструменти графіка',
  'Select range (V)': 'Виділити діапазон (V)',
  'Draw thrust (D)': 'Малювати тягу (D)',
  'Pan view (H)': 'Перемістити огляд (H)',
  'Drag to select a range': 'Перетягніть, щоб виділити діапазон',
  'Draw thrust · time marks stay fixed': 'Малюйте тягу · часові мітки незмінні',
  'Drag to pan · scroll to zoom': 'Перетягування — огляд · прокрутка — масштаб',
  'Zoom out': 'Зменшити масштаб',
  'Zoom in': 'Збільшити масштаб',
  'Fit full profile (F)': 'Показати весь профіль (F)',
  'THRUST CURVE': 'ГРАФІК ТЯГИ',
  'THRUST / N': 'ТЯГА / N',
  'TIME / s': 'ЧАС / s',
  'Working': 'Робочий',
  'Interactive thrust profile chart': 'Інтерактивний графік тяги',
  'Editable thrust curve. Use the selection tool to select a time range, or the draw tool to edit thrust.': 'Редагований графік тяги. Інструментом виділення виберіть часовий діапазон або інструментом малювання змініть тягу.',
  'Timestamps locked': 'Часові мітки зафіксовано',
  'Clear selection': 'Зняти виділення',
  'Full profile': 'Увесь профіль',
  'OVERVIEW': 'ОГЛЯД',
  'Profile overview. Drag to pan the zoomed chart.': 'Огляд профілю. Перетягніть, щоб перемістити збільшений графік.',
  'CURSOR': 'КУРСОР',
  'Cursor time in seconds': 'Час курсора в секундах',
  'Workspace panels': 'Панелі робочого простору',
  'Profile generator': 'Генератор профілю',
  'Sample data': 'Вимірювання',
  'History': 'Історія',
  'Peak thrust': 'Пікова тяга',
  'Max. burn time': 'Макс. час горіння',
  'Target impulse': 'Бажаний імпульс',
  'Profile shape': 'Форма профілю',
  'Neutral': 'Нейтральна',
  'Progressive': 'Прогресивна',
  'Regressive': 'Регресивна',
  'Boost + sustain': 'Пік + утримання',
  'SAMPLING': 'ДИСКРЕТИЗАЦІЯ',
  'Sampling mode': 'Режим часових міток',
  'Uniform intervals': 'Рівномірні інтервали',
  'Uniform + jitter': 'Рівномірні + відхилення',
  'Random sequential': 'Випадкові послідовні',
  'Step': 'Крок',
  'Jitter': 'Відхилення',
  'Noise': 'Шум',
  'NEW': 'НОВЕ',
  'Noise from recording': 'Шум із запису',
  'Capture natural noise from an unedited region, then apply it to your edit scope.': 'Збережіть природний шум із незміненої ділянки й застосуйте до області редагування.',
  '1. Capture a source': '1. Збережіть джерело',
  'Use selection as source': 'Взяти шум із виділення',
  'Find unedited source': 'Знайти незмінену ділянку',
  'No noise sample captured': 'Зразок шуму не збережено',
  '2. Apply to edit scope': '2. Застосуйте до області',
  'Noise gain': 'Масштаб шуму',
  'Pattern timing': 'Часовий режим шуму',
  'Repeat at source rate': 'Повторювати з початковою частотою',
  'Stretch to edit scope': 'Розтягнути на область редагування',
  'Apply sampled noise': 'Застосувати зразок шуму',
  'Baseline window': 'Вікно базової кривої',
  'Noise source captured': 'Джерело шуму збережено',
  'Captured noise preview': 'Попередній перегляд збереженого шуму',
  'Apply recorded noise': 'Застосувати шум із запису',
  'Reset controls': 'Скинути параметри',
  'Set range': 'Задати діапазон',
  'Pending generator changes': 'Незастосовані зміни генератора',
  'Generate to apply these targets': 'Згенеруйте профіль, щоб застосувати ці цілі',
  'Reveal cursor': 'Показати курсор',
  'Go to page': 'Перейти до сторінки',
  'Selected range': 'Виділений діапазон',
  'No unedited region with at least 7 samples was found.': 'Не знайдено незміненої ділянки з принаймні 7 вимірюваннями.',
  'Select at least 7 unedited samples to capture a noise source.': 'Виділіть принаймні 7 незмінених вимірювань, щоб зберегти джерело шуму.',
  'Seed': 'Зерно',
  'Targets are fitted together on the generated samples.': 'Параметри узгоджуються за згенерованими вимірюваннями.',
  'Choose a new random seed': 'Вибрати нове випадкове зерно',
  'New seed': 'Нове зерно',
  'Generate profile': 'Згенерувати профіль',
  'Inspector': 'Інспектор',
  'Edit scope': 'Область редагування',
  'Entire profile': 'Увесь профіль',
  'Selection': 'Виділення',
  'IN': 'ПОЧАТОК',
  'OUT': 'КІНЕЦЬ',
  'Selection start': 'Початок виділення',
  'Selection end': 'Кінець виділення',
  'Inspector tools': 'Інструменти інспектора',
  'Transform': 'Форма',
  'Signal': 'Сигнал',
  'Theory': 'Теорія',
  'Shape & scale': 'Форма та масштаб',
  'Resample thrust within fixed time marks.': 'Перерахунок тяги зі збереженням часових міток.',
  'Time width': 'Ширина за часом',
  'Anchor': 'Опорна точка',
  'Center': 'Центр',
  'Thrust gain': 'Масштаб тяги',
  'Thrust offset': 'Зсув тяги',
  'Apply transform': 'Застосувати',
  'Fit to target': 'Підлаштувати до цілі',
  'Fit': 'Підігнати',
  'Impulse': 'Імпульс',
  'Selected impulse': 'Імпульс виділення',
  'Targets apply to the entire profile.': 'Цілі застосовуються до всього профілю.',
  'Targets apply within the selected time range.': 'Цілі застосовуються в межах виділення.',
  'Zero outside selection': 'Обнулити поза виділенням',
  'Keep every timestamp. Set values outside the selected range to zero.': 'Зберегти всі часові мітки. Обнулити значення за межами виділення.',
  'Add noise': 'Додати шум',
  'Seeded measurement variation, relative to the peak in your edit scope.': 'Відтворюваний шум відносно пікової тяги в області редагування.',
  'Amplitude': 'Амплітуда',
  'Random seed': 'Випадкове зерно',
  'Remove noise': 'Прибрати шум',
  'Smooth the working curve with a centered moving average.': 'Згладити робочий графік центрованим ковзним середнім.',
  'Window size': 'Розмір вікна',
  '3 samples · subtle': '3 точки · м’яке',
  '9 samples · balanced': '9 точок · збалансоване',
  '51 samples · strong': '51 точка · сильне',
  'Smooth profile': 'Згладити профіль',
  'Theoretical overlay': 'Теоретичний графік',
  'Compare your working profile with an independent reference curve.': 'Порівняйте робочий профіль із незалежним еталонним графіком.',
  'Import theoretical CSV': 'Імпорт теоретичного CSV',
  'Generate from targets': 'Згенерувати за цілями',
  'Use working curve as theory': 'Використати робочий як теоретичний',
  'Overlay opacity': 'Непрозорість накладання',
  'Fit working to theory': 'Підлаштувати до теорії',
  'Blend toward the reference at each existing measurement time.': 'Наблизити тягу до еталона в кожній наявній часовій мітці.',
  'Blend amount': 'Ступінь наближення',
  'Fit to theoretical': 'Підігнати до теоретичного',
  'Remove theoretical curve': 'Прибрати теоретичний графік',
  'Every edit can be undone.': 'Кожну зміну можна скасувати.',
  'Workspace saved locally': 'Робочий простір збережено локально',
  'Local storage full · export to keep your work': 'Локальне сховище заповнено · збережіть роботу через експорт',
  'V Select': 'V Виділити',
  'Select': 'Виділити',
  'Draw': 'Малювати',
  'Pan': 'Огляд',
  'Fit view': 'Увесь графік',
  'Move cursor': 'Перемістити курсор',
  'Undo': 'Скасувати',
  'Redo': 'Повторити',
  'DATA IMPORT': 'ІМПОРТ ДАНИХ',
  'Import working profile': 'Імпорт робочого профілю',
  'Import theoretical profile': 'Імпорт теоретичного профілю',
  'Close import': 'Закрити імпорт',
  'Time column': 'Стовпець часу',
  'Thrust column': 'Стовпець тяги',
  'Time unit': 'Одиниця часу',
  'Thrust unit': 'Одиниця тяги',
  'Detect from header · default s': 'За заголовком · типово s',
  'Detect from header · default N': 'За заголовком · типово N',
  'Seconds (s)': 'Секунди (s)',
  'Seconds (s) · exact timestamps': 'Секунди (s) · точні часові мітки',
  'Milliseconds (ms)': 'Мілісекунди (ms)',
  'Microseconds (µs)': 'Мікросекунди (µs)',
  'Newtons (N)': 'Ньютони (N)',
  'Kilonewtons (kN)': 'Кілоньютони (kN)',
  'Kilogram-force (kgf)': 'Кілограм-сила (kgf)',
  'Pound-force (lbf)': 'Фунт-сила (lbf)',
  'First row': 'Перший рядок',
  'Detect header automatically': 'Визначити заголовок автоматично',
  'Column names (header)': 'Назви стовпців (заголовок)',
  'Measurement data (no header)': 'Вимірювання (без заголовка)',
  'Measurement times are preserved. Values must be finite, nonnegative, and ordered by strictly increasing time.': 'Часові мітки зберігаються. Значення мають бути скінченними, невід’ємними й упорядкованими за строго зростаючим часом.',
  'Cancel': 'Скасувати',
  'Import profile': 'Імпортувати профіль',
  'SAVE YOUR WORK': 'ЗБЕРЕЖЕННЯ РОБОТИ',
  'Export profile': 'Експорт профілю',
  'Close export': 'Закрити експорт',
  'File name': 'Назва файлу',
  'Delimiter': 'Роздільник',
  'Comma (,)': 'Кома (,)',
  'Semicolon (;)': 'Крапка з комою (;)',
  'Tab': 'Табуляція',
  'Thrust decimals': 'Знаків після коми для тяги',
  '6 decimal places': '6 знаків після коми',
  '3 decimal places': '3 знаки після коми',
  '9 decimal places': '9 знаків після коми',
  'Keep the whole workspace': 'Зберегти весь робочий простір',
  'Working curve, original, theory, selection, and generator settings.': 'Робочий і початковий графіки, теорія, виділення та налаштування генератора.',
  'Save project': 'Зберегти проєкт',
  'Download CSV': 'Завантажити CSV',
  'YOUR WORKSPACE, EXPLAINED': 'ПРО ВАШ РОБОЧИЙ ПРОСТІР',
  'A precise edit. Every time.': 'Точне редагування. Щоразу.',
  'Close guide': 'Закрити посібник',
  'Start with a curve': 'Почніть із графіка',
  'Import a CSV with your own measurements, or choose a reference preset, set your targets, and generate a synthetic profile.': 'Імпортуйте CSV із власними вимірюваннями або виберіть довідковий шаблон, задайте цілі та згенеруйте синтетичний профіль.',
  'Select, shape, refine': 'Виділяйте, змінюйте, уточнюйте',
  'Drag over the chart to select a time range. Use the inspector to compress or expand its shape, scale thrust, fit a target, or add and remove noise. Draw directly on the curve for detailed adjustments.': 'Виділіть часовий діапазон перетягуванням на графіку. В інспекторі стискайте й розтягуйте форму, масштабуйте тягу, підлаштовуйте до цілі, додавайте або прибирайте шум. Для точних змін малюйте безпосередньо на графіку.',
  'Compare and export': 'Порівнюйте та експортуйте',
  'Load a theoretical CSV or generate an overlay from targets. Fit the working curve to it, then export CSV or save a project to resume later.': 'Завантажте теоретичний CSV або згенеруйте накладання за цілями. Підлаштуйте робочий графік, а потім експортуйте CSV або збережіть проєкт для продовження роботи.',
  'To reuse natural noise, open Signal, capture at least seven unedited samples, then select the destination and apply the sample. Repeat preserves its original timing; Stretch spans the edit scope.': 'Щоб повторно використати природний шум, відкрийте «Сигнал», збережіть принаймні сім незмінених вимірювань, потім виділіть цільову ділянку та застосуйте зразок. Повторення зберігає початкові часові інтервали; розтягнення охоплює всю область редагування.',
  'Editing changes thrust values only. Imported time marks always stay fixed. Compression resamples the curve and zero-fills the emptied interval; expansion clips at the edit scope.': 'Редагуються лише значення тяги. Імпортовані часові мітки завжди незмінні. Стиснення перераховує графік і заповнює звільнений інтервал нулями; розтягнення обрізається за межами області редагування.',
  'Reference library': 'Довідкова бібліотека',
  'Presets generate synthetic profiles from rounded public motor specifications. They are editable starting points, not certified measurements. No OpenRocket or ThrustCurve data files are bundled.': 'Шаблони генерують синтетичні профілі за округленими відкритими характеристиками двигунів. Це основа для редагування, а не сертифіковані вимірювання. Файли даних OpenRocket або ThrustCurve не входять до застосунку.',
  'OpenRocket motor selection and database ↗': 'Вибір двигунів і база OpenRocket ↗',
  'OpenRocket motor database and attribution ↗': 'База двигунів OpenRocket і джерела даних ↗',
  'ThrustCurve.org API and simulator data ↗': 'API ThrustCurve.org і дані симуляторів ↗',
  'Back to studio': 'До студії',
  'Time marks are read-only. Edit thrust values directly.': 'Часові мітки незмінні. Редагуйте значення тяги безпосередньо.',
  'Previous': 'Назад',
  'Next': 'Далі',
  'Time (s)': 'Час (s)',
  'Thrust (N)': 'Тяга (N)',
  'Theory (N)': 'Теорія (N)',
  'Undo last edit': 'Скасувати останню зміну',
  'No matching motor presets.': 'Відповідних шаблонів двигунів немає.',
  'No reference loaded': 'Еталон не завантажено',
  'Custom profile': 'Власний профіль',
  'Workspace restored': 'Робочий простір відновлено',
  'Reference profile generated': 'Довідковий профіль згенеровано',
  'No values changed.': 'Значення не змінилися.',
  'Thrust must be a finite, nonnegative number.': 'Тяга має бути скінченним невід’ємним числом.',
  'Set your targets, then generate a new profile.': 'Задайте бажані параметри та згенеруйте новий профіль.',
  'The selection must be an increasing range within the profile timeline.': 'Виділення має бути зростаючим діапазоном у межах часової шкали профілю.',
  'Transform curve': 'Змінити форму графіка',
  'Fit peak thrust': 'Підігнати пікову тягу',
  'Fit impulse': 'Підігнати імпульс',
  'Add seeded noise': 'Додати відтворюваний шум',
  'Fit to theoretical curve': 'Підігнати до теоретичного графіка',
  'Capture theoretical reference': 'Зберегти теоретичний еталон',
  'Generate theoretical reference': 'Згенерувати теоретичний еталон',
  'Rename profile': 'Перейменувати профіль',
  'CSV exported with all measurement timestamps.': 'CSV експортовано з усіма часовими мітками вимірювань.',
  'Project saved.': 'Проєкт збережено.',
  'Projects must be smaller than 20 MB.': 'Розмір проєкту має бути меншим за 20 МБ.',
  'CSV files must be smaller than 20 MB.': 'Розмір CSV має бути меншим за 20 МБ.',
  'Import working CSV': 'Імпортувати робочий CSV',
  'Interface language': 'Мова інтерфейсу',
  'Language': 'Мова',
  'English': 'English',
  'Ukrainian': 'Українська',
  'CSV content must be text.': 'Вміст CSV має бути текстом.',
  'This file exceeds the 20 MB limit.': 'Розмір файлу перевищує 20 МБ.',
  'The CSV file is empty.': 'Файл CSV порожній.',
  'CSV files are limited to 30,000 measurements.': 'CSV може містити щонайбільше 30 000 вимірювань.',
  'Unexpected quote in the CSV file.': 'Неочікувані лапки у файлі CSV.',
  'Unexpected text after a quoted CSV field.': 'Неочікуваний текст після поля CSV у лапках.',
  'A quoted CSV field is not closed.': 'Поле CSV у лапках не закрито.',
  'The CSV file contains no measurements.': 'Файл CSV не містить вимірювань.',
  'Choose comma, semicolon, or tab as the delimiter.': 'Виберіть кому, крапку з комою або табуляцію як роздільник.',
  'The CSV needs at least two columns: time and thrust.': 'CSV має містити принаймні два стовпці: час і тягу.',
  'Header presence must be true or false.': 'Наявність заголовка має бути задана як true або false.',
  'The selected CSV column does not exist.': 'Вибраного стовпця CSV не існує.',
  'Time and thrust must use different columns.': 'Для часу й тяги виберіть різні стовпці.',
  'Column names were not recognized. Check the selected time and thrust columns.': 'Назви стовпців не розпізнано. Перевірте вибрані стовпці часу й тяги.',
  'The first row was interpreted as custom column headers. Confirm the file has a header row before using these measurements.': 'Перший рядок визначено як власні заголовки стовпців. Перед імпортом перевірте, що файл справді має рядок заголовків.',
  'Unsupported time unit. Use s, ms, or us.': 'Непідтримувана одиниця часу. Використайте s, ms або us.',
  'Unsupported thrust unit. Use N, kN, kgf, or lbf.': 'Непідтримувана одиниця тяги. Використайте N, kN, kgf або lbf.',
  'Unsupported export unit.': 'Непідтримувана одиниця експорту.',
  'Unsupported export delimiter.': 'Непідтримуваний роздільник експорту.',
  'Export precision must be an integer from 0 to 15.': 'Точність експорту має бути цілим числом від 0 до 15.',
  'Project generator settings are too deeply nested.': 'Налаштування генератора в проєкті мають надмірну вкладеність.',
  'Project contains an invalid setting name.': 'Проєкт містить недопустиму назву параметра.',
  'Project contains invalid generator settings.': 'Проєкт містить недопустимі налаштування генератора.',
  'Project files must be text smaller than 20 MB.': 'Файли проєкту мають бути текстовими та меншими за 20 МБ.',
  'This is not a valid Thrust Lab project file.': 'Це некоректний файл проєкту Thrust Lab.',
  'Unsupported project version. This studio opens version 1 projects.': 'Непідтримувана версія проєкту. Студія відкриває проєкти версії 1.',
  'Project selection must be a valid time range inside the profile.': 'Виділення в проєкті має бути коректним часовим діапазоном у межах профілю.',
  'Project edit scope must be all, or selection with an existing selected range.': 'Область редагування в проєкті має охоплювати весь профіль або наявне виділення.',
  'Project curve visibility settings must be true or false.': 'Параметри видимості графіків мають бути true або false.',
  'The sampling interval must be smaller than the burn duration.': 'Інтервал дискретизації має бути меншим за час горіння.',
  'The profile shape must contain positive thrust at a sampled time.': 'Форма профілю має містити додатну тягу хоча б в одній часовій мітці.',
  'Unknown sampling mode.': 'Невідомий режим дискретизації.',
  'Unknown profile shape.': 'Невідома форма профілю.',
  'A normalized template must have at least three samples, starting at 0 and ending at 1.': 'Нормалізований шаблон має містити принаймні три точки, починатися з 0 та завершуватися на 1.',
  'Load or generate a profile first.': 'Спочатку завантажте або згенеруйте профіль.',
  'Selection end must be after selection start.': 'Кінець виділення має бути після його початку.',
  'The selection contains no samples.': 'Виділення не містить вимірювань.',
  'Unknown time scale anchor.': 'Невідома опорна точка масштабування часу.',
  'The smoothing window must be an odd whole number.': 'Розмір вікна згладжування має бути непарним цілим числом.',
  'A zero-thrust selection cannot be scaled to a positive peak.': 'Виділення з нульовою тягою неможливо масштабувати до додатного піка.',
  'Impulse fitting requires a selection with positive duration.': 'Для підгонки імпульсу потрібне виділення з додатною тривалістю.',
  'This impulse cannot be reached by scaling the selected samples. Widen the selection or choose a different target.': 'Цього імпульсу неможливо досягти масштабуванням виділених вимірювань. Розширте виділення або змініть ціль.',
  'Load or generate a theoretical profile first.': 'Спочатку завантажте або згенеруйте теоретичний профіль.',
  'Unknown profile operation.': 'Невідома операція над профілем.',
  'The source sample minimum must be a whole number of at least two.': 'Мінімальна кількість вимірювань джерела має бути цілим числом не менше двох.',
  'Noise capture requires the original measurement timestamp sequence.': 'Для виділення шуму потрібна початкова послідовність часових міток вимірювань.',
  'The noise extraction window must be an odd whole number from 3 to 1001.': 'Вікно виділення шуму має бути непарним цілим числом від 3 до 1001.',
  'The noise source contains edited measurements. Select an unchanged range or use automatic source detection.': 'Джерело шуму містить змінені вимірювання. Виділіть незмінений діапазон або скористайтеся автоматичним пошуком джерела.',
  'The selected values are too large to extract a finite noise signal.': 'Вибрані значення надто великі для виділення скінченного шумового сигналу.',
  'Capture noise from an unchanged source range first.': 'Спочатку збережіть шум із незміненого діапазону.',
  'Captured noise must have a positive duration and relative timestamps starting at zero.': 'Збережений шум має мати додатну тривалість і відносні часові мітки, що починаються з нуля.',
  'Noise gain must be a finite, nonnegative number.': 'Масштаб шуму має бути скінченним невід’ємним числом.',
  'Choose repeat or stretch for captured noise.': 'Виберіть повторення або розтягнення збереженого шуму.',
  'The target range contains no measurement samples.': 'Цільовий діапазон не містить вимірювань.',
  'Noise gain is too large for these measurements.': 'Масштаб шуму надто великий для цих вимірювань.',
  'Enter a valid value.': 'Введіть коректне значення.',
  'Profile': 'Профіль',
  'Theoretical profile': 'Теоретичний профіль',
  'Original profile': 'Початковий профіль',
  'Template': 'Шаблон',
  'Sampling interval': 'Інтервал дискретизації',
  'Burn duration': 'Час горіння',
  'Timing deviation': 'Часове відхилення',
  'Noise amount': 'Рівень шуму',
  'Time scale': 'Масштаб часу',
  'Thrust scale': 'Масштаб тяги',
  'Smoothing window': 'Вікно згладжування',
  'Target peak thrust': 'Бажана пікова тяга',
  'Theory blend': 'Ступінь наближення до теорії',
  'Excluded range': 'Виключений діапазон',
  'Noise source': 'Джерело шуму',
  'Noise target': 'Цільовий діапазон шуму',
  'Captured noise': 'Збережений шум',
  'Thrust Lab Studio — Burn Profile Editor': 'Thrust Lab Studio — Редактор профілів горіння',
  'Thrust Lab Studio requires JavaScript to edit profiles in your browser.': 'Для редагування профілів у браузері Thrust Lab Studio потрібен JavaScript.',
  'A precise, private workspace for generating, shaping, and comparing motor thrust curves. All processing stays in your browser.': 'Точний приватний редактор для створення, редагування й порівняння графіків тяги двигунів. Усі обчислення виконуються у вашому браузері.',
};

let language = 'en';
let observer;
let queued = false;
const languageListeners = new Set();
const textSources = new WeakMap();
const attributeSources = new WeakMap();
const translatedAttributes = ['title', 'aria-label', 'placeholder', 'aria-description'];
const ignoredTags = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'NOSCRIPT']);
const storageKey = 'thrust-lab-language';
const englishByTranslation = new Map(Object.entries(dictionary).map(([en, uk]) => [uk, en]));
const englishByLowercase = new Map(Object.keys(dictionary).map(en => [en.toLocaleLowerCase('en'), en]));
const englishByUkrainianLowercase = new Map(Object.entries(dictionary).map(([en, uk]) => [uk.toLocaleLowerCase('uk'), en]));
const generatedTranslations = new Map();

function normalizeLanguage(value) { return value === 'uk' || value === 'ua' ? 'uk' : 'en'; }
function canonicalLabel(text) { return englishByTranslation.get(text) ?? englishByUkrainianLowercase.get(text.toLocaleLowerCase('uk')) ?? englishByLowercase.get(text.toLocaleLowerCase('en')) ?? text; }

function translatedDynamic(text) {
  let match;
  if ((match = /^Curve point (\d+)$/.exec(text))) return `Точка кривої ${match[1]}`;
  if ((match = /^Selected control point (\d+) of (\d+)$/.exec(text))) return `Вибрана контрольна точка ${match[1]} із ${match[2]}`;
  if ((match = /^Influence: (.+) — (.+) (s|ms|µs|μs|us|min)$/.exec(text))) return `Вплив: ${match[1]} — ${match[2]} ${match[3]}`;
  if ((match = /^(\d+) control points$/.exec(text))) return `${match[1]} контрольних точок`;
  if ((match = /^Point time \((s|ms|µs|μs|us|min)\)$/.exec(text))) return `Час точки (${match[1]})`;
  if ((match = /^Point thrust \((N|kN|kgf|lbf)\)$/.exec(text))) return `Тяга точки (${match[1]})`;
  if ((match = /^Marker (A|B) time \((s|ms|µs|μs|us|min)\)$/.exec(text))) return `Час маркера ${match[1]} (${match[2]})`;
  if ((match = /^Profile time shift \((s|ms|µs|μs|us|min)\)$/.exec(text))) return `Часовий зсув профілю (${match[1]})`;
  if ((match = /^(.+) needs a finite nonnegative minimum below its maximum\.$/.exec(text))) return `${translate(match[1], 'uk')}: потрібен скінченний невід’ємний мінімум, менший за максимум.`;
  if ((match = /^(.+) must be finite and greater than zero\.$/.exec(text))) return `${translate(match[1], 'uk')}: значення має бути скінченним і більшим за нуль.`;
  if ((match = /^(.+) needs strictly increasing finite timestamps and nonnegative finite thrust\.$/.exec(text))) return `${translate(match[1], 'uk')}: потрібні скінченні часові мітки, що строго зростають, і скінченна невід’ємна тяга.`;
  if ((match = /^(.+) time span$/.exec(text))) return `тривалість: ${translate(match[1], 'uk')}`;
  if ((match = /^The requested impulse cannot be reached while retaining this theoretical shape, peak, and exact burn boundaries\. Choose an impulse between (.+) and (.+) N·s, or change the shape, peak, or duration\.$/.exec(text))) return `Бажаного імпульсу неможливо досягти зі збереженням цієї теоретичної форми, пікової тяги й точних меж горіння. Виберіть імпульс від ${match[1]} до ${match[2]} N·s або змініть форму, пікову тягу чи тривалість.`;
  if ((match = /^For this shape, peak and duration, choose an impulse from (.+) to (.+) (N·s|kN·s|kgf·s|lbf·s)\.$/.exec(text))) return `Для цієї форми, пікової тяги й тривалості виберіть імпульс від ${match[1]} до ${match[2]} ${match[3]}.`;
  if ((match = /^The burn window must stay between (.+) and (.+) (s|ms|µs|μs|us|min)\.$/.exec(text))) return `Вікно горіння має залишатися між ${match[1]} та ${match[2]} ${match[3]}.`;
  if ((match = /^(\d[\d,]*) reference measurements · source preserved$/.exec(text))) return `${match[1]} вимірювань еталона · джерело збережено`;
  if ((match = /^Recorded noise RMS: (.+) (N|kN|kgf|lbf)$/.exec(text))) return `СКВ шуму запису: ${match[1]} ${match[2]}`;
  if ((match = /^(.+) needs finite, nonnegative measurements and increasing timestamps\.$/.exec(text))) return `${translate(match[1], 'uk')}: потрібні скінченні невід’ємні вимірювання та зростаючі часові мітки.`;
  if ((match = /^(.+) duration is outside the supported numeric range\.$/.exec(text))) return `${translate(match[1], 'uk')}: тривалість виходить за підтримувані числові межі.`;
  if ((match = /^Applied theory shift: (.+) (s|ms|µs|μs|us|min)$/.exec(text))) return `Застосований зсув теорії: ${match[1]} ${match[2]}`;
  if ((match = /^THRUST \/ (N|kN|kgf|lbf)$/.exec(text))) return `ТЯГА / ${match[1]}`;
  if ((match = /^TIME \/ (s|ms|µs|μs|us|min)$/.exec(text))) return `ЧАС / ${match[1]}`;
  if ((match = /^Time \((s|ms|µs|μs|us|min)\)$/.exec(text))) return `Час (${match[1]})`;
  if ((match = /^Thrust \((N|kN|kgf|lbf)\)$/.exec(text))) return `Тяга (${match[1]})`;
  if ((match = /^Theory \((N|kN|kgf|lbf)\)$/.exec(text))) return `Теорія (${match[1]})`;
  if ((match = /^Cursor time \((s|ms|µs|μs|us|min)\)$/.exec(text))) return `Час курсора (${match[1]})`;
  if ((match = /^Selection start \((s|ms|µs|μs|us|min)\)$/.exec(text))) return `Початок виділення (${match[1]})`;
  if ((match = /^Selection end \((s|ms|µs|μs|us|min)\)$/.exec(text))) return `Кінець виділення (${match[1]})`;
  if ((match = /^(Undo|Redo): (.+)$/.exec(text))) return `${translate(match[1], 'uk')}: ${translate(match[2], 'uk')}`;
  if ((match = /^(\d[\d,]*) measurement points$/.exec(text))) return `${match[1]} точок вимірювання`;
  if ((match = /^at (.+) (s|ms|µs|μs|us|min)$/.exec(text))) return `на ${match[1]} ${match[2]}`;
  if ((match = /^(\d[\d,]*) samples · (.+) (s|ms|µs|μs|us|min) timeline · (N|kN|kgf|lbf) \/ (s|ms|µs|μs|us|min)$/.exec(text))) return `${match[1]} вимірювань · шкала ${match[2]} ${match[3]} · ${match[4]} / ${match[5]}`;
  if ((match = /^(\d[\d,]*) points · reference overlay$/.exec(text))) return `${match[1]} точок · еталонне накладання`;
  if ((match = /^(\d[\d,]*) source samples · RMS (.+) (N|kN|kgf|lbf)$/.exec(text))) return `${match[1]} вимірювань джерела · СКВ ${match[2]} ${match[3]}`;
  if ((match = /^(.+) (N|kN|kgf|lbf) RMS$/.exec(text))) return `${match[1]} ${match[2]} СКВ`;
  if ((match = /^(\d[\d,]*) samples in edit scope$/.exec(text))) return `${match[1]} вимірювань в області редагування`;
  if ((match = /^(.+) — (.+) (s|ms|µs|μs|us|min) · (.+) (s|ms|µs|μs|us|min) selected$/.exec(text))) return `${match[1]} — ${match[2]} ${match[3]} · виділено ${match[4]} ${match[5]}`;
  if ((match = /^(\d+) undoable edits · (\d+) redoable$/.exec(text))) return `${match[1]} змін можна скасувати · ${match[2]} повторити`;
  if ((match = /^Exports all ([\d,]+) measurements in the working profile\. Your entire timestamp sequence is retained\.$/.exec(text))) return `Експортуються всі ${match[1]} вимірювань робочого профілю. Уся послідовність часових міток зберігається.`;
  if ((match = /^Exports all ([\d,]+) measurements\. Your entire timestamp sequence is retained\.$/.exec(text))) return `Експортуються всі ${match[1]} вимірювань. Уся послідовність часових міток зберігається.`;
  if ((match = /^(.+) targets loaded\. Generate to create a profile\.$/.exec(text))) return `Параметри ${match[1]} завантажено. Натисніть «Згенерувати перегляд».`;
  if ((match = /^Load (.+) generator targets$/.exec(text))) return `Завантажити параметри генератора ${match[1]}`;
  if ((match = /^(.+) (reference|preset)$/.exec(text))) return `${match[1]} · ${match[2] === 'reference' ? 'еталон' : 'шаблон'}`;
  if ((match = /^Thrust at (.+) seconds$/.exec(text))) return `Тяга на ${match[1]} секунди`;
  if ((match = /^Thrust at (.+) (s|ms|µs|μs|us|min)$/.exec(text))) return `Тяга на ${match[1]} ${match[2]}`;
  if ((match = /^Edit sample (\d+)$/.exec(text))) return `Змінити вимірювання ${match[1]}`;
  if ((match = /^(\d+) samples$/.exec(text))) return `${match[1]} точок`;
  if ((match = /^Column (\d+)$/.exec(text))) return `Стовпець ${match[1]}`;
  if ((match = /^(.+) · (\d+) columns · (tab|semicolon|comma) separated$/.exec(text))) return `${match[1]} · ${match[2]} стовпців · роздільник: ${{ tab: 'табуляція', semicolon: 'крапка з комою', comma: 'кома' }[match[3]]}`;
  if ((match = /^(.+) · (\d+) columns$/.exec(text))) return `${match[1]} · ${match[2]} стовпців`;
  if ((match = /^CSV row (\d+) has a missing or invalid time or thrust value\.$/.exec(text))) return `У рядку CSV ${match[1]} відсутнє або некоректне значення часу чи тяги.`;
  if ((match = /^Unsupported (time|thrust) unit "(.+)" in the CSV header\. Select (.+) explicitly to override it\.$/.exec(text))) return `Непідтримувана одиниця ${match[1] === 'time' ? 'часу' : 'тяги'} «${match[2]}» у заголовку CSV. Виберіть ${match[3]} вручну, щоб замінити її.`;
  if ((match = /^(.+) needs at least two measurements\.$/.exec(text))) return `${translate(match[1], 'uk')}: потрібно принаймні два вимірювання.`;
  if ((match = /^(.+) needs at least two samples\.$/.exec(text))) return `${translate(match[1], 'uk')}: потрібно принаймні дві точки.`;
  if ((match = /^(.+) must contain finite timestamps and (nonnegative )?values\.$/.exec(text))) return `${translate(match[1], 'uk')}: часові мітки та ${match[2] ? 'невід’ємні ' : ''}значення мають бути скінченними числами.`;
  if ((match = /^(.+) must contain finite timestamps and nonnegative thrust\.$/.exec(text))) return `${translate(match[1], 'uk')}: часові мітки мають бути скінченними числами, а тяга — скінченною та невід’ємною.`;
  if ((match = /^(.+) must contain finite values and strictly increasing timestamps\.$/.exec(text))) return `${translate(match[1], 'uk')}: значення мають бути скінченними, а часові мітки — строго зростати.`;
  if ((match = /^(.+) must be a time range with a start before its end\.$/.exec(text))) return `${translate(match[1], 'uk')}: початок часового діапазону має бути перед його кінцем.`;
  if ((match = /^(.+) must stay within the profile timeline\.$/.exec(text))) return `${translate(match[1], 'uk')}: діапазон має бути в межах часової шкали профілю.`;
  if ((match = /^Select at least (\d+) unchanged measurements to capture noise\.$/.exec(text))) return `Виділіть принаймні ${match[1]} незмінених вимірювань, щоб зберегти шум.`;
  if ((match = /^(.+) exceeds the 30,000 measurement limit\.$/.exec(text))) return `${translate(match[1], 'uk')}: перевищено обмеження у 30 000 вимірювань.`;
  if ((match = /^(.+) measurement (\d+) must contain finite time and thrust values\.$/.exec(text))) return `${translate(match[1], 'uk')}, вимірювання ${match[2]}: час і тяга мають бути скінченними числами.`;
  if ((match = /^(.+) measurement (\d+) has negative thrust\.$/.exec(text))) return `${translate(match[1], 'uk')}, вимірювання ${match[2]}: тяга від’ємна.`;
  if ((match = /^(.+) time must increase strictly; measurement (\d+) has a duplicate or reversed timestamp\.$/.exec(text))) return `${translate(match[1], 'uk')}: час має строго зростати; вимірювання ${match[2]} має повторну або зворотну часову мітку.`;
  if ((match = /^(.+) must be a finite number between (.+) and (.+)\.$/.exec(text))) return `${translate(match[1], 'uk')}: введіть скінченне число від ${match[2]} до ${match[3]}.`;
  if ((match = /^(.+) must be a list of samples\.$/.exec(text))) return `${translate(match[1], 'uk')}: потрібен список вимірювань.`;
  if ((match = /^(.+) must contain finite, nonnegative thrust and strictly increasing timestamps\.$/.exec(text))) return `${translate(match[1], 'uk')}: тяга має бути скінченною та невід’ємною, а часові мітки — строго зростати.`;
  if ((match = /^(.+) timestamps must be strictly increasing\.$/.exec(text))) return `${translate(match[1], 'uk')}: часові мітки мають строго зростати.`;
  if ((match = /^Enter a valid (.+) between (.+) and (.+)\.$/.exec(text))) return `Введіть коректне значення «${translate(canonicalLabel(match[1]), 'uk')}» від ${match[2]} до ${match[3]}.`;
  if ((match = /^Enter a valid value \((.+)–(.+)\)\.$/.exec(text))) return `Введіть коректне значення (${match[1]}–${match[2]}).`;
  if ((match = /^Enter a valid value \(minimum (.+)\)\.$/.exec(text))) return `Введіть коректне значення (мінімум ${match[1]}).`;
  if ((match = /^Sampling produces more than ([\d,]+) samples\. Increase the interval\.$/.exec(text))) return `Дискретизація створює понад ${match[1]} вимірювань. Збільште інтервал.`;
  if ((match = /^The requested impulse cannot be reached with this peak, duration and sampling\. The nearest feasible profile was generated \((.+)–(.+) N·s available\)\.$/.exec(text))) return `Бажаного імпульсу неможливо досягти з цією піковою тягою, тривалістю та дискретизацією. Згенеровано найближчий можливий профіль (доступно ${match[1]}–${match[2]} N·s).`;
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/);
  if (sentences.length > 1) {
    const translated = sentences.map(sentence => dictionary[sentence] ?? translatedDynamic(sentence));
    if (translated.every(sentence => sentence != null)) return translated.join(' ');
  }
  return null;
}

/** Translate interface prose while retaining leading/trailing layout whitespace. */
export function translate(value, lang = language) {
  const text = String(value);
  const parts = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  let source = parts[2];
  if (!source) return text;
  source = generatedTranslations.get(source) ?? englishByTranslation.get(source) ?? source;
  const fieldError = /^Enter a valid (.+) between (.+) and (.+)\.$/.exec(source);
  if (fieldError) source = `Enter a valid ${canonicalLabel(fieldError[1]).toLocaleLowerCase('en')} between ${fieldError[2]} and ${fieldError[3]}.`;
  if (normalizeLanguage(lang) === 'en') return `${parts[1]}${source}${parts[3]}`;
  const translated = dictionary[source] ?? translatedDynamic(source);
  if (translated != null) {
    if (generatedTranslations.size > 1500) generatedTranslations.clear();
    generatedTranslations.set(translated, source);
  }
  return translated == null ? text : `${parts[1]}${translated}${parts[3]}`;
}

export function t(text, params = {}) {
  return translate(text).replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(params, key) ? String(params[key]) : match);
}

function isIgnored(element) {
  return !element || ignoredTags.has(element.tagName) || !!element.closest('[data-i18n="ignore"], [contenteditable="true"], #csv-preview');
}

function applyText(node, lang) {
  if (isIgnored(node.parentElement)) return;
  const current = node.nodeValue;
  if (!current || !current.trim()) return;
  const saved = textSources.get(node);
  const source = saved && (current === saved.applied || current === saved.source) ? saved.source : current;
  const applied = translate(source, lang);
  textSources.set(node, { source, applied });
  if (current !== applied) node.nodeValue = applied;
}

function applyAttributes(element, lang) {
  if (isIgnored(element)) return;
  let saved = attributeSources.get(element);
  if (!saved) { saved = new Map(); attributeSources.set(element, saved); }
  for (const name of translatedAttributes) {
    if (!element.hasAttribute(name)) continue;
    const current = element.getAttribute(name);
    const entry = saved.get(name);
    const source = entry && (current === entry.applied || current === entry.source) ? entry.source : current;
    const applied = translate(source, lang);
    saved.set(name, { source, applied });
    if (current !== applied) element.setAttribute(name, applied);
  }
  if (element.tagName === 'META' && element.getAttribute('name') === 'description') {
    const current = element.getAttribute('content');
    const entry = saved.get('content');
    const source = entry && (current === entry.applied || current === entry.source) ? entry.source : current;
    const applied = translate(source, lang);
    saved.set('content', { source, applied });
    if (current !== applied) element.setAttribute('content', applied);
  }
}

/** Rebase cached English when the application replaces an existing node's text. */
export function localize(root = document, lang = language) {
  const selected = normalizeLanguage(lang);
  if (root.nodeType === 3) { applyText(root, selected); return; }
  if (root.nodeType === 1) applyAttributes(root, selected);
  const doc = root.ownerDocument || root;
  const walker = doc.createTreeWalker(root, 1 | 4);
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === 3) applyText(node, selected);
    else applyAttributes(node, selected);
  }
}

export function getLanguage() { return language; }

export function setLanguage(value) {
  const next = normalizeLanguage(value);
  const changed = next !== language;
  language = next;
  try { localStorage.setItem(storageKey, next); } catch { /* Private browsing may disable storage. */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = next;
    const picker = document.querySelector('#language-select');
    if (picker) picker.value = next;
    localize(document, next);
    if (changed) document.dispatchEvent(new CustomEvent('thrustlab:languagechange', { detail: { language: next } }));
  }
  if (changed) for (const callback of languageListeners) callback(next);
  return next;
}

/** Observe dynamic panels, SVG axis labels, toast messages, and accessibility labels. */
export function initI18n({ onChange } = {}) {
  if (typeof onChange === 'function') languageListeners.add(onChange);
  let saved = 'en';
  try { saved = localStorage.getItem(storageKey) || 'en'; } catch { /* Storage is optional. */ }
  setLanguage(saved);
  if (!observer && typeof MutationObserver !== 'undefined') {
    const pending = new Set();
    observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.addedNodes) if (node.nodeType === 1 || node.nodeType === 3) pending.add(node);
        } else pending.add(record.target);
      }
      if (queued || !pending.size) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        const nodes = [...pending];
        pending.clear();
        for (const node of nodes) if (node.isConnected) localize(node, language);
      });
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: translatedAttributes });
  }
  return { getLanguage, setLanguage, t };
}
