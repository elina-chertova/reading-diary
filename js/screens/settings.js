import { exportAll, importAll, getBooks } from '../store.js';
import { navBar, toast, sheet, fmtDate } from '../ui.js';
import { refresh } from '../actions.js';

export async function settings() {
  const books = await getBooks();

  const html = `
    <div class="screen">
      <div class="topbar">
        <button class="iconbtn ghost" data-back><i class="ti ti-arrow-left"></i></button>
        <h1 style="font-size:18px">Настройки</h1><span style="width:38px"></span>
      </div>
      <div class="content">
        <div class="card" style="padding:0">
          <div class="set-row" id="set-export"><i class="ti ti-download lead"></i><div><div>Сохранить копию данных</div><div class="muted" style="font-size:12px">${books.length} книг — файл-бэкап на устройство</div></div><i class="ti ti-chevron-right chev"></i></div>
          <div class="set-row" id="set-import"><i class="ti ti-upload lead"></i><div><div>Восстановить из копии</div><div class="muted" style="font-size:12px">Загрузить ранее сохранённый файл</div></div><i class="ti ti-chevron-right chev"></i></div>
        </div>

        <div class="card" style="padding:0;margin-top:12px">
          <div class="set-row" id="set-storage"><i class="ti ti-shield-lock lead"></i><div style="flex:1"><div>Постоянное хранилище</div><div class="muted" style="font-size:12px" id="storage-status">Проверяю…</div></div><span id="storage-action"></span></div>
        </div>

        <div class="card" style="padding:0;margin-top:12px">
          <div class="set-row" id="set-install"><i class="ti ti-device-mobile lead"></i><div><div>Установить на телефон</div><div class="muted" style="font-size:12px">Как добавить иконку на экран</div></div><i class="ti ti-chevron-right chev"></i></div>
          <div class="set-row" id="set-about"><i class="ti ti-info-circle lead"></i><div><div>О приложении</div></div><i class="ti ti-chevron-right chev"></i></div>
        </div>

        <input type="file" id="import-file" accept="application/json,.json" style="display:none" />
        <div class="muted tac" style="font-size:11px;margin-top:24px">Дневник чтения · данные хранятся только на этом устройстве</div>
      </div>
      ${navBar('')}
    </div>`;

  const mount = (root) => {
    root.querySelector('[data-back]').addEventListener('click', () => history.back());

    // статус постоянного хранилища
    const statusEl = root.querySelector('#storage-status');
    const actionEl = root.querySelector('#storage-action');
    const refreshStorage = async () => {
      if (!(navigator.storage && navigator.storage.persisted)) {
        statusEl.textContent = 'Не поддерживается этим браузером';
        return;
      }
      const persisted = await navigator.storage.persisted();
      let used = '';
      try {
        const est = await navigator.storage.estimate();
        if (est.usage) used = ` · занято ${(est.usage / 1048576).toFixed(1)} МБ`;
      } catch {}
      if (persisted) {
        statusEl.innerHTML = `<span style="color:var(--green)">Включено ✓</span>${used}`;
        actionEl.innerHTML = '';
      } else {
        statusEl.innerHTML = `Выключено${used}`;
        actionEl.innerHTML = `<button class="btn sm" id="storage-on" style="width:auto">Включить</button>`;
        actionEl.querySelector('#storage-on').addEventListener('click', async (e) => {
          e.stopPropagation();
          try { await navigator.storage.persist(); } catch {}
          await refreshStorage();
          toast('Готово');
        });
      }
    };
    refreshStorage();

    root.querySelector('#set-export').addEventListener('click', async () => {
      const data = await exportAll();
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `дневник-чтения-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Копия сохранена');
    });

    const fileInput = root.querySelector('#import-file');
    root.querySelector('#set-import').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data.books) throw new Error('bad');
        await importAll(data, { replace: true });
        toast('Данные восстановлены');
        setTimeout(refresh, 60);
      } catch { toast('Не удалось прочитать файл'); }
    });

    root.querySelector('#set-install').addEventListener('click', () => {
      sheet(`<h3>Как установить</h3>
        <div style="font-size:14px;line-height:1.6;margin-top:10px" class="muted">
          <b style="color:var(--txt)">На iPhone (Safari):</b><br>1. Нажми «Поделиться» <i class="ti ti-share"></i><br>2. Выбери «На экран Домой»<br>3. Готово — появится иконка<br><br>
          <b style="color:var(--txt)">На Mac (Safari):</b><br>Меню «Файл» → «Добавить в Dock»<br><br>
          <b style="color:var(--txt)">Chrome:</b><br>Нажми значок установки <i class="ti ti-download"></i> в адресной строке
        </div>`);
    });

    root.querySelector('#set-about').addEventListener('click', () => {
      sheet(`<h3>Дневник чтения</h3>
        <div style="font-size:14px;line-height:1.6;margin-top:8px" class="muted">Личное приложение для учёта прочитанных книг, прогресса и статистики. Работает офлайн, данные хранятся только на твоём устройстве. Делай резервные копии через «Сохранить копию данных».</div>`);
    });
  };

  return { html, mount };
}
