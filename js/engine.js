/* engine.js — engine generik praktikum-sim.
   Merender SATU percobaan dari objek data (js/data/*.js) + menangani
   drag, validasi langkah, takaran, dan skor.

   Aturan: engine tidak tahu kimia apa pun. Semua hasil visual scripted
   dari field hasilVisual di data. Menambah percobaan = menambah file data.

   Tipe aksi yang didukung: "drag", "pilih-takaran", "nyalakan", "panaskan",
   "amati", "tindakan".

   Jenis hasilVisual: "warna", "endapan", "endapan-larut", "gas", "teks",
   "reset" (kosongkan tabung, alat tetap — buat percobaan multi sub-uji),
   "lakmus" (kertas indikator di area kerja berubah ke warna CSS di `nilai`).

   Field `babak` (opsional) di langkah = label section multi sub-uji. Tampil
   sebagai heading di panel langkah — mode Belajar saja, karena di Ujian
   seluruh panduan langkah memang disembunyikan.

   DUA MODE, satu data:
   - "belajar" : panel langkah + instruksi tampil, feedback salah lengkap.
   - "ujian"   : panduan disembunyikan total (nomor langkah, instruksi, dan
                 jumlah langkah tidak dibocorkan). Validasi urutan TETAP jalan
                 diam-diam vs array `langkah` yang sama — tidak ada data kedua.
   Safety tampil di kedua mode. */

(function () {
  'use strict';

  /* ---------- konstanta skor (model "kumpul dari 0") ---------- */
  var SKOR_MAKS = 100;
  var PENALTI_SALAH = 3;   /* boros reagen */

  /* Satuan yang didukung engine. Yang MUNCUL di panel = irisan daftar ini
     dengan satuan yang benar-benar dipakai langkah percobaan aktif. */
  var SATUAN_DIDUKUNG = ['cc', 'ml', 'µL', 'tetes', '%', 'gram'];
  var AKSI_TOMBOL = ['nyalakan', 'panaskan', 'amati', 'tindakan']; /* aksi tanpa drag */
  var WARNA_BENING = '#dce6ee';

  /* ---------- state ---------- */
  var S = null;

  function stateBaru(percobaan, mode) {
    var total = (percobaan.langkah || []).length || 1;
    return {
      percobaan: percobaan,
      mode: mode === 'ujian' ? 'ujian' : 'belajar',
      index: 0,
      skor: 0,
      poinPerLangkah: SKOR_MAKS / total,  /* run bersih = pas 100 */
      benar: 0,
      isi: [],          /* nama bahan yang sudah masuk target */
      alat: [],         /* nama alat yang sudah disiapkan */
      dilakukan: [],    /* sumber dari SEMUA aksi yang sudah diterima
                           (termasuk alat & aksi nyalakan/panaskan) */
      pasang: {},       /* target -> [sumber] yang sudah dipasang/dituang ke situ */
      volume: 0,        /* cc, buat tinggi cairan (room kimia, satu tabung) */
      volumeZona: {},   /* target -> cc yang terkumpul di zona itu (room prosedur,
                           banyak tabung). Murni buat gambar tinggi cairan —
                           tidak dibaca validasi/skor sama sekali. */
      penampung: null,  /* zona penerima tirisan berikutnya = target pemindahan
                           terakhir. Lihat efekProsedur(). */
      warnaZona: {},    /* zona -> warna cairan di zona itu (room prosedur, banyak
                           tabung). Room kimia tetap memakai S.warna yang global.
                           TIDAK PERNAH dicampur/di-blend: isinya selalu satu warna
                           utuh — entah warna intrinsik reagen, entah warna hasil
                           yang di-script data. */
      membran: {},      /* zona kolom -> warna deposit yang MENEMPEL di membran
                           (mis. DNA di silika). Sengaja TIDAK ikut tertiris
                           sentrifugasi/pencucian — cuma hasilVisual 'elusi'
                           yang memindahkannya. */
      eluat: {},        /* zona tabung -> warna hasil elusi yang sudah turun ke
                           situ. Ini produk akhir yang kelihatan. */
      gel: null,        /* spesifikasi gel elektroforesis dari hasilVisual jenis
                           'gel'. Dipakai dua tempat: panggung & blok Hasil. */
      warna: WARNA_BENING,
      endapan: null,
      gas: false,
      api: false,
      panas: false,
      lakmus: null,     /* warna CSS kertas lakmus, null = belum dipakai */
      catatan: [],      /* teks hasil visual */
      kesalahan: [],    /* {langkah, instruksi, pesan} */
      pilihan: null,    /* nama item yang di-klik (mode klik-klik) */
      aksiSelesai: {},  /* kunci tombol aksi -> BERAPA KALI sudah berhasil
                           dipakai di sub-uji ini. Murni penanda tampilan —
                           tidak dibaca validasi. */
      takaran: { nilai: 1, satuan: satuanDipakai(percobaan)[0] || 'cc' },
      selesai: false
    };
  }

  function ujian() { return !!S && S.mode === 'ujian'; }

  /* Room ber-tipe "prosedur" (mis. tes pakai alat ukur): tidak ada tabung,
     tidak ada takaran. Area kerja diganti daftar target + status alat.
     Room tanpa `tipe` = room kimia seperti sebelumnya, tidak berubah. */
  function prosedur() { return !!S && S.percobaan.tipe === 'prosedur'; }

  /* Panel Takaran muncul kalau DATA-nya memang memakai takaran — bukan karena
     tipe room. Room kimia selalu memakai; room prosedur baru memakai kalau
     langkahnya bertakaran (Isolasi DNA pakai µL, Asam Urat tidak pakai). */
  function pakaiTakaran() {
    return !!S && satuanDipakai(S.percobaan).length > 0;
  }

  /* Langkah takaran percobaan ini pakai angka pecahan atau tidak. Menentukan
     `step` input angka + besar loncatan tombol +/-. Diturunkan dari DATA:
     room biokimia (semua dosisnya bulat) tetap melangkah 1 seperti dulu, room
     yang punya 12,5 µL melangkah 0,5. */
  function langkahTakaran(percobaan) {
    var pecahan = (percobaan.langkah || []).some(function (l) {
      return l.takaranBenar && Number(l.takaranBenar.nilai) % 1 !== 0;
    });
    return pecahan ? 0.5 : 1;
  }

  /* Bulatkan sisa-sisa floating point (0.1+0.2) tanpa mengubah angka bulat. */
  function rapikanAngka(v) { return Math.round(v * 1000) / 1000; }

  /* Satuan yang dipakai percobaan ini, urut sesuai SATUAN_DIDUKUNG. */
  function satuanDipakai(percobaan) {
    var ada = [];
    (percobaan.langkah || []).forEach(function (l) {
      if (l.takaranBenar && ada.indexOf(l.takaranBenar.satuan) === -1) {
        ada.push(l.takaranBenar.satuan);
      }
    });
    var urut = SATUAN_DIDUKUNG.filter(function (s) { return ada.indexOf(s) !== -1; });
    /* satuan asing di data tetap ditampilkan supaya langkahnya bisa dikerjakan */
    ada.forEach(function (s) { if (urut.indexOf(s) === -1) urut.push(s); });
    return urut;
  }

  /* Warna intrinsik reagen, dari field opsional `warna` di alatBahan.
     Tidak ada = reagennya memang bening; jangan mengarang warna. */
  function warnaReagen(nama) {
    var daftar = (S && S.percobaan.alatBahan) || [];
    for (var i = 0; i < daftar.length; i++) {
      if (daftar[i].nama === nama) return daftar[i].warna || null;
    }
    return null;
  }

  /* Langkah ini menuliskan warna hasil sendiri atau tidak. Kalau ya, warna itu
     MENANG atas warna intrinsik reagen — warna di buku adalah keadaan SETELAH
     reaksi, bukan warna botolnya. */
  function punyaWarnaScript(l) {
    if (!l || !l.hasilVisual) return false;
    return daftarVisual(l.hasilVisual).some(function (v) { return v && v.jenis === 'warna'; });
  }

  /* ---------- util DOM ---------- */
  function el(tag, cls, teks) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (teks !== undefined && teks !== null) n.textContent = teks;
    return n;
  }
  function id(x) { return document.getElementById(x); }

  /* ================================================================
     MENU
     ================================================================ */
  function dataPercobaan(idPercobaan) {
    var daftar = window.PRAKTIKUM || [];
    for (var i = 0; i < daftar.length; i++) {
      if (daftar[i].id === idPercobaan) return daftar[i];
    }
    return null;
  }

  function entriRoom(idRoom) {
    var daftar = window.PRAKTIKUM_ROOMS || [];
    for (var i = 0; i < daftar.length; i++) {
      if (daftar[i].id === idRoom) return daftar[i];
    }
    return null;
  }

  /* ---------------- MENU DUA TINGKAT: modul -> room ----------------
     Tingkat 1 = kartu MODUL. Tingkat 2 = daftar room milik modul itu.
     Urutan modul = urutan kemunculan pertama nilai `modul` di
     PRAKTIKUM_ROOMS, jadi registry yang menentukan, bukan engine. */
  function modulRoom(room) { return (room && room.modul) || 'Lainnya'; }

  function daftarModul() {
    var out = [];
    (window.PRAKTIKUM_ROOMS || []).forEach(function (r) {
      var m = modulRoom(r);
      if (out.indexOf(m) === -1) out.push(m);
    });
    return out;
  }
  function roomModul(namaModul) {
    return (window.PRAKTIKUM_ROOMS || []).filter(function (r) {
      return modulRoom(r) === namaModul;
    });
  }
  function metaModul(namaModul) {
    var meta = (window.PRAKTIKUM_MODUL_META || {})[namaModul] || {};
    return { nama: meta.nama || namaModul, sub: meta.sub || '' };
  }

  /* Ikon kartu modul — skematik, dipilih dari kata kunci nama modul.
     Modul tak dikenal jatuh ke ikon labu, jadi tetap dapat wujud. */
  var IKON_MODUL = {
    biomedik: '<svg class="ikon-modul" viewBox="0 0 40 40" aria-hidden="true">' +
      '<path d="M12 4c0 8 16 10 16 16S12 28 12 36" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M28 4c0 8-16 10-16 16s16 8 16 16" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<line x1="14" y1="10" x2="26" y2="10" stroke="currentColor" stroke-width="1.5"/>' +
      '<line x1="14" y1="30" x2="26" y2="30" stroke="currentColor" stroke-width="1.5"/>' +
      '</svg>',
    biokimia: '<svg class="ikon-modul" viewBox="0 0 40 40" aria-hidden="true">' +
      '<path class="ikon-isi" d="M12 25h16l-7-11v-2h-2v2z"/>' +
      '<path d="M17 4v10L9 27a3 3 0 0 0 3 5h16a3 3 0 0 0 3-5l-8-13V4" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<line x1="15" y1="4" x2="25" y2="4" stroke="currentColor" stroke-width="2"/>' +
      '</svg>'
  };
  function ikonModul(namaModul) {
    return IKON_MODUL[String(namaModul).toLowerCase()] || IKON_MODUL.biokimia;
  }

  /* Modul yang sedang dibuka. null = layar kartu modul. */
  var modulAktif = null;

  function renderMenu() {
    var nav = id('menu-nav');
    var wrap = id('menu-kartu');
    if (nav) nav.innerHTML = '';
    wrap.innerHTML = '';
    if (modulAktif) renderDaftarRoom(nav, wrap);
    else renderKartuModul(wrap);
  }

  function renderKartuModul(wrap) {
    var app = window.PRAKTIKUM_APP || { nama: 'Praktikum Sim', sub: '' };
    var kicker = id('menu-kicker');
    if (kicker) kicker.textContent = 'Trainer pra-praktikum';
    id('menu-judul').textContent = app.nama;
    id('menu-sub').textContent = app.sub || '';

    daftarModul().forEach(function (namaModul, i) {
      var meta = metaModul(namaModul);
      var rooms = roomModul(namaModul);
      var siap = rooms.filter(function (r) { return !r.kunci && !!dataPercobaan(r.id); });

      var kartu = el('button', 'kartu kartu-modul');
      kartu.type = 'button';
      kartu.dataset.modul = namaModul;
      var ikon = el('span', 'kartu-ikon');
      ikon.innerHTML = ikonModul(namaModul);
      kartu.appendChild(ikon);
      kartu.appendChild(el('span', 'kartu-no', String(i + 1).padStart(2, '0')));
      kartu.appendChild(el('h2', 'kartu-nama', meta.nama));
      kartu.appendChild(el('p', 'kartu-catatan', meta.sub));
      kartu.appendChild(el('span', 'kartu-badge', rooms.length + ' percobaan' +
        (siap.length === rooms.length ? '' : ' · ' + siap.length + ' siap')));
      kartu.addEventListener('click', function () { bukaModul(namaModul); });
      wrap.appendChild(kartu);
    });
  }

  function renderDaftarRoom(nav, wrap) {
    var meta = metaModul(modulAktif);
    var kicker = id('menu-kicker');
    if (kicker) kicker.textContent = 'Modul';
    id('menu-judul').textContent = meta.nama;
    id('menu-sub').textContent = meta.sub;

    if (nav) {
      var balik = el('button', 'tombol tombol-kecil', '← Modul');
      balik.type = 'button';
      balik.id = 'ke-modul';
      balik.addEventListener('click', keModul);
      nav.appendChild(balik);
    }

    roomModul(modulAktif).forEach(function (room, i) {
      var data = dataPercobaan(room.id);
      var terkunci = room.kunci || !data;

      var kartu = el('button', 'kartu' + (terkunci ? ' kartu-kunci' : ''));
      kartu.type = 'button';
      kartu.appendChild(el('span', 'kartu-no', String(i + 1).padStart(2, '0')));
      kartu.appendChild(el('h2', 'kartu-nama', room.nama));
      kartu.appendChild(el('p', 'kartu-catatan', room.catatan || ''));
      kartu.appendChild(el('span', 'kartu-badge', terkunci ? 'Segera hadir' : 'Mulai'));

      if (terkunci) {
        kartu.disabled = true;
      } else {
        kartu.addEventListener('click', function () { bukaPemilihMode(room.id); });
      }
      wrap.appendChild(kartu);
    });
  }

  function bukaModul(namaModul) {
    modulAktif = namaModul;
    keMenu();
  }

  /* "← Modul" — balik ke kartu modul (tingkat 1). */
  function keModul() {
    modulAktif = null;
    keMenu();
  }

  /* "← Menu" dari dalam room — balik ke DAFTAR ROOM modul yang sedang
     dibuka, bukan ke kartu modul. */
  function keMenu() {
    S = null;
    id('room').hidden = true;
    id('room').innerHTML = '';
    id('menu').hidden = false;
    renderMenu();
    window.scrollTo(0, 0);
  }

  /* Nama modul yang dibawa ke topbar room, biar user tahu ada di mana. */
  function labelModulAktif() {
    return modulAktif ? metaModul(modulAktif).nama : '';
  }

  /* ================================================================
     PEMILIH MODE — muncul setelah kartu room diklik, sebelum percobaan mulai
     ================================================================ */
  var MODE_INFO = [
    {
      mode: 'belajar',
      nama: 'Belajar',
      teks: 'Instruksi tiap langkah tampil terus. Buat kenalan sama alur, takaran, dan safety. ' +
            'Salah langkah dijelaskan kenapa salahnya.'
    },
    {
      mode: 'ujian',
      nama: 'Ujian',
      teks: 'Tanpa panduan sama sekali — tidak ada instruksi, tidak ada nomor langkah. ' +
            'Urutan tetap dinilai diam-diam. Salah langkah cuma dibilang salah.'
    }
  ];

  function bukaPemilihMode(idPercobaan) {
    var data = dataPercobaan(idPercobaan);
    if (!data) return;
    /* room bisa dibuka dari daftar room ATAU dari layar Selesai — pastikan
       modul aktif ikut kunci ke modul pemilik room ini, supaya "← Menu"
       balik ke daftar room yang benar. */
    var entri = entriRoom(idPercobaan);
    if (entri) modulAktif = modulRoom(entri);
    S = null;
    id('menu').hidden = true;
    var room = id('room');
    room.hidden = false;
    room.innerHTML = '';

    var bar = el('header', 'topbar');
    var kembali = el('button', 'tombol tombol-kecil', '← Menu');
    kembali.type = 'button';
    kembali.addEventListener('click', keMenu);
    bar.appendChild(kembali);
    bar.appendChild(el('span', 'topbar-modul', labelModulAktif()));
    bar.appendChild(el('h1', 'topbar-judul', data.nama));
    room.appendChild(bar);

    var kotak = el('section', 'kotak');
    kotak.appendChild(el('h3', 'kotak-judul', 'Dasar teori'));
    kotak.appendChild(el('p', 'kotak-isi', data.dasarTeoriRingkas));
    room.appendChild(kotak);

    room.appendChild(el('h2', 'mode-tanya', 'Pilih mode'));
    var pilihan = el('div', 'mode-grid');
    MODE_INFO.forEach(function (m) {
      var b = el('button', 'mode-kartu');
      b.type = 'button';
      b.appendChild(el('span', 'mode-nama', m.nama));
      b.appendChild(el('span', 'mode-teks', m.teks));
      b.addEventListener('click', function () { bukaRoom(data.id, m.mode); });
      pilihan.appendChild(b);
    });
    room.appendChild(pilihan);
    window.scrollTo(0, 0);
  }

  /* ================================================================
     ROOM — kerangka dibangun sekali, lalu di-update
     ================================================================ */
  function bukaRoom(idPercobaan, mode) {
    var data = dataPercobaan(idPercobaan);
    if (!data) return;
    var entri = entriRoom(idPercobaan);
    if (entri) modulAktif = modulRoom(entri);
    S = stateBaru(data, mode);
    id('menu').hidden = true;
    var room = id('room');
    room.hidden = false;
    room.innerHTML = '';
    room.appendChild(bangunTopbar());
    room.appendChild(bangunPanelLangkah());
    var grid = el('div', 'kerja-grid');
    grid.appendChild(bangunRak());
    grid.appendChild(bangunAreaKerja());
    room.appendChild(grid);
    room.appendChild(bangunLayarSelesai());
    update();
    window.scrollTo(0, 0);
  }

  function bangunTopbar() {
    var bar = el('header', 'topbar');
    var kembali = el('button', 'tombol tombol-kecil', '← Menu');
    kembali.type = 'button';
    kembali.addEventListener('click', keMenu);
    bar.appendChild(kembali);
    bar.appendChild(el('span', 'topbar-modul', labelModulAktif()));
    bar.appendChild(el('h1', 'topbar-judul', S.percobaan.nama));
    bar.appendChild(el('span', 'mode-badge', ujian() ? 'Ujian' : 'Belajar'));

    /* di Ujian, penghitung aksi benar menggantikan progress per-langkah
       (progress bocor jumlah langkah) */
    var hitung = el('div', 'skorbox');
    hitung.id = 'kotak-benar';
    hitung.appendChild(el('span', 'skorbox-label', 'Aksi benar'));
    var jml = el('span', 'skorbox-nilai');
    jml.id = 'benar-nilai';
    hitung.appendChild(jml);
    bar.appendChild(hitung);

    var skor = el('div', 'skorbox');
    skor.appendChild(el('span', 'skorbox-label', 'Skor'));
    var nilai = el('span', 'skorbox-nilai');
    nilai.id = 'skor-nilai';
    skor.appendChild(nilai);
    bar.appendChild(skor);
    return bar;
  }

  function bangunPanelLangkah() {
    var p = el('section', 'panel-langkah');

    var prog = el('div', 'progress');
    prog.id = 'progress';
    var isi = el('div', 'progress-isi');
    isi.id = 'progress-isi';
    prog.appendChild(isi);
    p.appendChild(prog);

    /* label babak (percobaan multi sub-uji). Ikut disembunyikan di Ujian —
       nama sub-uji membocorkan struktur prosedur. */
    var babak = el('p', 'babak');
    babak.id = 'babak';
    babak.hidden = true;
    p.appendChild(babak);

    var head = el('div', 'langkah-head');
    head.id = 'langkah-head';
    var kiri = el('div', 'langkah-teks');
    var judul = el('p', 'langkah-judul');
    judul.id = 'langkah-judul';
    var instruksi = el('p', 'langkah-instruksi');
    instruksi.id = 'langkah-instruksi';
    kiri.appendChild(judul);
    kiri.appendChild(instruksi);
    head.appendChild(kiri);
    p.appendChild(head);

    var safety = el('p', 'safety');
    safety.id = 'safety';
    safety.hidden = true;
    p.appendChild(safety);

    var fb = el('p', 'feedback');
    fb.id = 'feedback';
    p.appendChild(fb);

    return p;
  }

  /* ---------- kolom kiri: rak reagen/alat + takaran + aksi khusus ---------- */
  function bangunRak() {
    var kolom = el('aside', 'kolom-rak');

    var teori = el('div', 'kotak');
    teori.appendChild(el('h3', 'kotak-judul', 'Dasar teori'));
    teori.appendChild(el('p', 'kotak-isi', S.percobaan.dasarTeoriRingkas));
    kolom.appendChild(teori);

    /* Ujian: safety per-langkah dimatikan (bocorkan urutan), diganti satu
       panel umum di awal room. Belajar tidak memakai panel ini. */
    if (ujian()) {
      var aman = bangunPanelKeselamatanUmum();
      if (aman) kolom.appendChild(aman);
    }

    var rak = el('div', 'kotak');
    rak.appendChild(el('h3', 'kotak-judul', 'Alat & bahan'));
    var daftar = el('div', 'rak');
    (S.percobaan.alatBahan || []).forEach(function (item) {
      daftar.appendChild(bangunItemRak(item));
    });
    rak.appendChild(daftar);
    rak.appendChild(el('p', 'petunjuk', 'Drag item ke area kerja, atau klik item lalu klik targetnya.'));
    kolom.appendChild(rak);

    if (pakaiTakaran()) kolom.appendChild(bangunPanelTakaran());

    /* Panel "Aksi" TIDAK di sini lagi — dia dipasang di kolom kanan, menempel
       ke panggung, supaya tombolnya dekat dengan objek yang dioperasikan. */
    return kolom;
  }

  /* Semua safety percobaan, dedup, diurut alfabetis — SENGAJA bukan urutan
     langkah, supaya panel ini tidak jadi bocoran prosedur. */
  function bangunPanelKeselamatanUmum() {
    var daftar = [];
    (S.percobaan.langkah || []).forEach(function (l) {
      if (l.safety && daftar.indexOf(l.safety) === -1) daftar.push(l.safety);
    });
    if (!daftar.length) return null;
    daftar.sort();

    var kotak = el('div', 'kotak kotak-safety');
    kotak.id = 'safety-umum';
    kotak.appendChild(el('h3', 'kotak-judul', 'Keselamatan'));
    var ul = el('ul', 'safety-daftar');
    daftar.forEach(function (t) { ul.appendChild(el('li', null, t)); });
    kotak.appendChild(ul);
    kotak.appendChild(el('p', 'petunjuk',
      'Berlaku untuk seluruh percobaan. Urutan pemakaiannya sengaja tidak ditampilkan.'));
    return kotak;
  }

  function butuhTakaran(nama) {
    return (S.percobaan.langkah || []).some(function (l) {
      return l.sumber === nama && l.takaranBenar;
    });
  }

  function bangunItemRak(item) {
    var bahan = butuhTakaran(item.nama);
    var n = el('div', 'item' + (bahan ? ' item-botol' : ' item-alat'));
    n.dataset.sumber = item.nama;
    var gambar = el('div', 'item-gambar');
    gambar.innerHTML = ikonUntuk(item.nama, bahan);
    /* isi cairan di ikon ikut warna reagen. Lewat custom property supaya SVG
       inline-nya tidak perlu diubah; tanpa `warna`, CSS jatuh ke --kaca. */
    if (item.warna) gambar.style.setProperty('--isi-reagen', item.warna);
    n.appendChild(gambar);
    n.appendChild(el('span', 'item-nama', item.nama));
    /* Ujian: jumlah/takaran disembunyikan — nama & ikon tetap tampil supaya
       user tahu reagen apa yang tersedia, tapi takarannya harus diingat. */
    n.appendChild(el('span', 'item-jumlah', ujian() ? '' : (item.jumlah || '')));
    pasangDrag(n, item.nama);
    return n;
  }

  /* ---------- ikon SVG skematik (inline, zero-dependency) ----------
     Dipilih dari kata kunci nama item. Stroke pakai currentColor supaya
     ikut palet CSS; hanya isi cairan & api yang berwarna (fungsional). */
  function svg(isi) {
    return '<svg class="ikon" viewBox="0 0 40 52" aria-hidden="true">' + isi + '</svg>';
  }

  var IKON = {
    botol: function (berlabel) {
      return svg(
        '<path class="ikon-isi" d="M11 26h18v14a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3z"/>' +
        '<rect x="10" y="10" width="20" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<rect x="16" y="3" width="8" height="7" fill="none" stroke="currentColor" stroke-width="2"/>' +
        (berlabel
          ? '<rect x="13" y="14" width="14" height="9" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
            '<line x1="15.5" y1="18.5" x2="24.5" y2="18.5" stroke="currentColor" stroke-width="1.5"/>'
          : '')
      );
    },
    tabung: function () {
      return svg(
        '<path class="ikon-isi" d="M14 30h12v10a6 6 0 0 1-12 0z"/>' +
        '<path d="M14 6v34a6 6 0 0 0 12 0V6" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="11" y1="6" x2="29" y2="6" stroke="currentColor" stroke-width="2"/>'
      );
    },
    pembakar: function () {
      return svg(
        '<path class="ikon-api" d="M20 8c5 6 7 9 7 12a7 7 0 0 1-14 0c0-3 2-6 7-12z"/>' +
        '<rect x="17" y="26" width="6" height="6" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M11 46v-5a9 9 0 0 1 18 0v5z" fill="none" stroke="currentColor" stroke-width="2"/>'
      );
    },
    lanset: function () {
      return svg(
        '<path d="M14 8h12v26l-6 8-6-8z" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="14" y1="16" x2="26" y2="16" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="20" y1="42" x2="20" y2="49" stroke="currentColor" stroke-width="2"/>'
      );
    },
    kertas: function () {
      return svg(
        '<rect x="15" y="3" width="10" height="46" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="15" y1="20" x2="25" y2="20" stroke="currentColor" stroke-width="1.5"/>' +
        '<line x1="15" y1="32" x2="25" y2="32" stroke="currentColor" stroke-width="1.5"/>'
      );
    },
    alat: function () {
      return svg(
        '<rect x="10" y="5" width="20" height="35" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path class="ikon-isi" d="M14 10h12v9H14z"/>' +
        '<rect x="14" y="10" width="12" height="9" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<circle cx="20" cy="28" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="17" y="40" width="6" height="8" fill="none" stroke="currentColor" stroke-width="2"/>'
      );
    }
  };

  function ikonUntuk(nama, bertakaran) {
    var n = String(nama).toLowerCase();
    if (n.indexOf('tabung') !== -1) return IKON.tabung();
    if (n.indexOf('spiritus') !== -1 || n.indexOf('pembakar') !== -1) return IKON.pembakar();
    if (n.indexOf('lanset') !== -1) return IKON.lanset();
    if (n.indexOf('lakmus') !== -1 || n.indexOf('kertas') !== -1) return IKON.kertas();
    if (n.indexOf('easy touch') !== -1) return IKON.alat();
    return IKON.botol(!!bertakaran);
  }

  function bangunPanelTakaran() {
    var kotak = el('div', 'kotak');
    kotak.id = 'kotak-takaran';
    kotak.appendChild(el('h3', 'kotak-judul', 'Takaran'));

    var baris = el('div', 'takaran-baris');
    var kurang = el('button', 'tombol tombol-bulat', '−');
    kurang.type = 'button';
    kurang.addEventListener('click', function () { ubahTakaran(-langkahTakaran(S.percobaan)); });

    var input = el('input', 'takaran-input');
    input.id = 'takaran-nilai';
    input.type = 'number';
    input.min = '0';
    /* step ikut data: kalau ada dosis pecahan, input number harus menerimanya
       (step '1' bikin 12,5 dianggap tidak valid & panah naik-turun membulatkan) */
    input.step = String(langkahTakaran(S.percobaan));
    input.value = String(S.takaran.nilai);
    input.addEventListener('input', function () {
      var v = parseFloat(input.value);
      S.takaran.nilai = isNaN(v) ? 0 : rapikanAngka(v);
      /* sengaja BUKAN update(): update() menulis ulang isi input dan bikin
         ketikan setengah jalan ("1.") lompat. Cukup segarkan penunjuknya. */
      renderSiapTuang();
    });

    var tambah = el('button', 'tombol tombol-bulat', '+');
    tambah.type = 'button';
    tambah.addEventListener('click', function () { ubahTakaran(langkahTakaran(S.percobaan)); });

    baris.appendChild(kurang);
    baris.appendChild(input);
    baris.appendChild(tambah);
    kotak.appendChild(baris);

    var unit = el('div', 'takaran-unit');
    unit.id = 'takaran-unit';
    satuanDipakai(S.percobaan).forEach(function (s) {
      var b = el('button', 'tombol tombol-unit', s);
      b.type = 'button';
      b.dataset.satuan = s;
      b.addEventListener('click', function () {
        S.takaran.satuan = s;
        update();
      });
      unit.appendChild(b);
    });
    kotak.appendChild(unit);

    /* Takaran yang AKAN dipakai, ditampilkan menonjol & selalu ter-update.
       Ini pengganti tombol "simpan": tidak ada yang perlu disimpan — angka
       yang tampil di sini itulah yang dituang. */
    var siap = el('p', 'takaran-siap');
    siap.id = 'takaran-siap';
    kotak.appendChild(siap);

    kotak.appendChild(el('p', 'petunjuk', 'Atur takaran dulu, lalu tuang reagen ke tabung.'));
    return kotak;
  }

  function ubahTakaran(delta) {
    var v = rapikanAngka((S.takaran.nilai || 0) + delta);
    if (v < 0) v = 0;
    S.takaran.nilai = v;
    id('takaran-nilai').value = String(v);
    renderSiapTuang();
  }

  /* Tombol untuk aksi non-drag (nyalakan / panaskan / amati).
     Dibangun dari data — kalau percobaan tidak punya aksi itu, panel tidak muncul. */
  function bangunPanelAksiKhusus() {
    var unik = [];
    (S.percobaan.langkah || []).forEach(function (l) {
      if (AKSI_TOMBOL.indexOf(l.aksi) === -1) return;
      /* `label` ikut jadi pembeda: dua tindakan pada alat yang sama
         (mis. buka vs tutup tempat lanset) harus jadi dua tombol berbeda. */
      var kunci = l.aksi + '|' + l.sumber + '|' + l.target + '|' + (l.label || '');
      if (unik.some(function (u) { return u.kunci === kunci; })) return;
      unik.push({ kunci: kunci, aksi: l.aksi, sumber: l.sumber, target: l.target, label: l.label });
    });
    if (!unik.length) return null;

    var kotak = el('div', 'kotak kotak-aksi');
    kotak.appendChild(el('h3', 'kotak-judul', 'Aksi'));
    var baris = el('div', 'aksi-baris');
    unik.forEach(function (u) {
      /* Ikon + label jadi dua <span> terpisah, bukan satu string: ikonnya
         SVG, jadi textContent tombol tetap = labelnya saja. */
      var b = el('button', 'tombol tombol-aksi');
      b.type = 'button';
      /* dipakai renderTombolAksi buat menandai "sudah dilakukan" */
      b.dataset.kunciAksi = u.kunci;
      b.dataset.aksiAsli = u.aksi;
      var ikon = el('span', 'aksi-ikon');
      ikon.innerHTML = IKON_AKSI[u.aksi] || IKON_AKSI.tindakan;
      b.appendChild(ikon);
      b.appendChild(el('span', 'aksi-label', labelAksi(u)));
      b.addEventListener('click', function () {
        /* tombol aksi bukan tempat menaruh barang: buang seleksi item yang
           menggantung supaya klik ini tidak ikut terhitung "taruh di meja". */
        if (S) S.pilihan = null;
        cobaAksi({ aksi: u.aksi, sumber: u.sumber, target: u.target, label: u.label });
      });
      baris.appendChild(b);
    });
    kotak.appendChild(baris);
    return kotak;
  }

  /* Ikon kecil di tombol aksi — bikin tombolnya kebaca sebagai tombol,
     bukan teks. Stroke ikut currentColor; hanya api yang berwarna. */
  function svgKecil(isi) {
    return '<svg class="ikon-aksi" viewBox="0 0 20 20" aria-hidden="true">' + isi + '</svg>';
  }

  var IKON_AKSI = {
    nyalakan: svgKecil(
      '<path class="ikon-api" d="M10 2c3.2 4 4.6 6 4.6 8a4.6 4.6 0 0 1-9.2 0c0-2 1.4-4 4.6-8z"/>' +
      '<path d="M10 17.5v.5" stroke="currentColor" stroke-width="2"/>'),
    panaskan: svgKecil(
      '<path d="M7 1.5v7a3 3 0 0 0 6 0v-7" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      '<path class="ikon-api" d="M10 11.5c2 2.4 2.8 3.7 2.8 4.9a2.8 2.8 0 0 1-5.6 0c0-1.2.8-2.5 2.8-4.9z"/>'),
    amati: svgKecil(
      '<path d="M1.5 10S4.7 4.5 10 4.5 18.5 10 18.5 10 15.3 15.5 10 15.5 1.5 10 1.5 10z" ' +
      'fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      '<circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.8"/>'),
    tindakan: svgKecil(
      '<rect x="2.5" y="2.5" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
      '<path d="M6.5 10.2l2.6 2.8 5-6" fill="none" stroke="currentColor" stroke-width="1.8"/>')
  };

  function labelAksi(u) {
    if (u.label) return u.label;
    if (u.aksi === 'nyalakan') return 'Nyalakan ' + u.sumber;
    if (u.aksi === 'panaskan') return 'Panaskan ' + u.target;
    if (u.aksi === 'amati') return 'Amati ' + u.target;
    return u.aksi;
  }

  /* ---------- kolom tengah: area kerja ---------- */
  function bangunAreaKerja() {
    return prosedur() ? bangunAreaProsedur() : bangunAreaTabung();
  }

  /* ---------------- area kerja room prosedur: ADEGAN ALAT ----------------
     Tiap `target` di data jadi satu prop skematik, bukan kotak dashed kosong.
     Wujud prop dipilih dari KATA KUNCI nama target — konvensi yang sama
     dengan pemilihan ikon rak, jadi engine tetap tidak hafal room manapun:
       "easy touch"/"alat" -> alat ukur (layar + slot strip + kompartemen)
       "lanset"            -> pen lanset
       "jari"              -> jari pasien
       "strip"             -> hotspot di slot alat (kalau ada prop alat)
       selain itu          -> kotak dashed seperti sebelumnya (fallback)
     Bagian yang di-drag masuk tampil TERPASANG di propnya, bukan cuma badge.
     Semua ini hidup di cabang `tipe:'prosedur'` — room kimia tidak lewat sini. */
  function jenisProp(nama) {
    var n = String(nama).toLowerCase();
    /* Target yang namanya justru MESIN (mis. "Heat block") tidak digambar
       sebagai prop: sprite mesinnya sendiri yang jadi targetnya, supaya tidak
       ada kotak dashed kembar di sebelah mesin yang sudah digambar. */
    if (mesinBerprop(nama)) return 'mesin';
    if (n.indexOf('strip') !== -1) return 'strip';
    if (n.indexOf('lanset') !== -1) return 'lanset';
    if (n.indexOf('jari') !== -1) return 'jari';
    if (n.indexOf('easy touch') !== -1 || n.indexOf('alat') !== -1) return 'alat';
    /* kolom spin diperiksa SEBELUM tabung: "High Pure Filter Tube" itu kolom,
       walau sebagian namanya berbunyi tabung. */
    if (n.indexOf('filter tube') !== -1 || n.indexOf('kolom') !== -1 ||
        n.indexOf('spin column') !== -1) return 'kolom';
    if (n.indexOf('tabung') !== -1) return 'tabung';
    return 'kotak';
  }

  function targetBerjenis(j) {
    return daftarTarget().filter(function (t) { return jenisProp(t) === j; });
  }

  /* Semua yang sudah dipasang ke target berjenis j (gabungan kalau lebih dari satu) */
  function isiJenis(j) {
    var out = [];
    targetBerjenis(j).forEach(function (t) { out = out.concat(S.pasang[t] || []); });
    return out;
  }

  function adaKata(daftar, kata) {
    return daftar.some(function (n) { return String(n).toLowerCase().indexOf(kata) !== -1; });
  }
  function terakhirBerkata(daftar, kata) {
    var hit = daftar.filter(function (n) { return String(n).toLowerCase().indexOf(kata) !== -1; });
    return hit.length ? hit[hit.length - 1] : null;
  }

  /* ================================================================
     MESIN (room prosedur) — kerangka generik.

     Engine tidak hafal room manapun: sprite mesin dipilih dari KATA KUNCI di
     `label` langkah `tindakan`, konvensi yang sama dengan pemilihan prop &
     ikon rak. Menambah mesin baru = menambah satu entri di sini + sprite +
     sedikit CSS; struktur di bawahnya tidak perlu diubah.

     Field entri:
       id        kelas CSS & id elemen mesin
       nama      caption di panggung
       kata      kata kunci (lowercase) yang dicari di label tindakan
       sprite    SVG; null = HOOK, mesinnya belum digambar -> dilewati diam-diam
       kelas     kelas animasi yang dipasang ~durasi ms saat aksinya BERHASIL
       durasi    ms
       tiriskan  true = cairan di zona target ikut turun saat mesin jalan
     ================================================================ */
  var SVG_CENTRIFUGE =
    '<svg class="prop-svg" viewBox="0 0 180 150" aria-hidden="true">' +
      '<path d="M12 138V86a78 78 0 0 1 156 0v52z" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      '<line x1="4" y1="138" x2="176" y2="138" stroke="currentColor" stroke-width="2.5"/>' +
      '<g class="sentri-rotor">' +
        '<circle cx="90" cy="86" r="44" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="90" y1="42" x2="90" y2="130" stroke="currentColor" stroke-width="2"/>' +
        '<line x1="46" y1="86" x2="134" y2="86" stroke="currentColor" stroke-width="2"/>' +
        '<circle cx="90" cy="52" r="7" fill="var(--kaca)" stroke="currentColor" stroke-width="1.6"/>' +
        '<circle cx="90" cy="120" r="7" fill="var(--kaca)" stroke="currentColor" stroke-width="1.6"/>' +
        '<circle cx="56" cy="86" r="7" fill="var(--kaca)" stroke="currentColor" stroke-width="1.6"/>' +
        '<circle cx="124" cy="86" r="7" fill="var(--kaca)" stroke="currentColor" stroke-width="1.6"/>' +
        '<circle cx="90" cy="86" r="6" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '</g>' +
      '<path class="sentri-tutup" d="M10 84a80 80 0 0 1 160 0z" fill="var(--panel)" ' +
        'stroke="currentColor" stroke-width="2.5"/>' +
    '</svg>';

  var SVG_HEATBLOCK =
    '<svg class="prop-svg" viewBox="0 0 180 150" aria-hidden="true">' +
      '<rect x="18" y="60" width="144" height="72" rx="6" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5"/>' +
      '<rect x="34" y="46" width="112" height="18" fill="var(--panel)" ' +
        'stroke="currentColor" stroke-width="2"/>' +
      '<g class="blok-lubang">' +
        '<rect x="46" y="50" width="16" height="12" stroke="currentColor" stroke-width="1.6"/>' +
        '<rect x="74" y="50" width="16" height="12" stroke="currentColor" stroke-width="1.6"/>' +
        '<rect x="102" y="50" width="16" height="12" stroke="currentColor" stroke-width="1.6"/>' +
      '</g>' +
      '<rect x="36" y="82" width="52" height="26" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="132" cy="95" r="10" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<g class="blok-uap">' +
        '<path d="M60 44c0-7 8-7 8-14" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
        '<path d="M88 44c0-7 8-7 8-14" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
        '<path d="M116 44c0-7 8-7 8-14" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
      '</g>' +
    '</svg>';

  var SVG_THERMOCYCLER =
    '<svg class="prop-svg" viewBox="0 0 180 150" aria-hidden="true">' +
      /* badan */
      '<rect x="14" y="56" width="152" height="78" rx="6" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5"/>' +
      '<line x1="6" y1="134" x2="174" y2="134" stroke="currentColor" stroke-width="2.5"/>' +
      /* blok sumur + tabung yang tertanam di dalamnya */
      '<rect x="46" y="42" width="88" height="18" fill="var(--panel)" ' +
        'stroke="currentColor" stroke-width="2"/>' +
      '<g class="cycler-sumur">' +
        '<rect x="56" y="46" width="12" height="10" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="74" y="46" width="12" height="10" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="92" y="46" width="12" height="10" stroke="currentColor" stroke-width="1.5"/>' +
        '<rect x="110" y="46" width="12" height="10" stroke="currentColor" stroke-width="1.5"/>' +
      '</g>' +
      /* tutup BERPEMANAS: idle terangkat, menutup saat mesin jalan */
      '<g class="cycler-tutup">' +
        '<rect x="44" y="16" width="92" height="16" rx="3" fill="var(--panel)" ' +
          'stroke="currentColor" stroke-width="2.5"/>' +
        '<line x1="58" y1="24" x2="122" y2="24" stroke="currentColor" stroke-width="1.4"/>' +
      '</g>' +
      /* LCD: warnanya menyiklus 95 -> annealing -> 72 */
      '<rect class="cycler-lcd" x="26" y="76" width="52" height="30" ' +
        'stroke="currentColor" stroke-width="2"/>' +
      /* indikator siklus */
      '<g class="cycler-tanda">' +
        '<rect x="94" y="88" width="9" height="9" stroke="currentColor" stroke-width="1.4"/>' +
        '<rect x="108" y="88" width="9" height="9" stroke="currentColor" stroke-width="1.4"/>' +
        '<rect x="122" y="88" width="9" height="9" stroke="currentColor" stroke-width="1.4"/>' +
      '</g>' +
      '<circle cx="148" cy="92" r="9" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '</svg>';

  var SVG_ELEKTRO =
    '<svg class="prop-svg" viewBox="0 0 180 150" aria-hidden="true">' +
      /* chamber + buffer + gel */
      '<path d="M8 52h104v72H8z" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      '<rect class="elektro-buffer" x="10" y="70" width="100" height="52"/>' +
      '<rect class="elektro-gel" x="28" y="80" width="64" height="34" ' +
        'stroke="currentColor" stroke-width="1.5"/>' +
      /* elektroda: katoda (-) kiri, anoda (+) kanan */
      '<line x1="20" y1="56" x2="20" y2="118" stroke="currentColor" stroke-width="2.5"/>' +
      '<line x1="100" y1="56" x2="100" y2="118" stroke="currentColor" stroke-width="2.5"/>' +
      '<text class="elektro-kutub" x="20" y="48" text-anchor="middle">\u2212</text>' +
      '<text class="elektro-kutub" x="100" y="48" text-anchor="middle">+</text>' +
      /* gelembung elektrolisis di kedua elektroda */
      '<g class="elektro-gelembung">' +
        '<circle cx="20" cy="104" r="2.6"/><circle cx="20" cy="90" r="2"/>' +
        '<circle cx="100" cy="100" r="2.6"/><circle cx="100" cy="86" r="2"/>' +
      '</g>' +
      /* pita yang bermigrasi ke anoda selagi running */
      '<g class="elektro-migrasi">' +
        '<rect x="36" y="88" width="14" height="4" rx="1.5"/>' +
        '<rect x="36" y="100" width="14" height="4" rx="1.5"/>' +
      '</g>' +
      /* power supply + layar */
      '<rect x="120" y="66" width="52" height="58" rx="4" fill="none" ' +
        'stroke="currentColor" stroke-width="2.5"/>' +
      '<rect class="elektro-layar" x="127" y="74" width="38" height="22" ' +
        'stroke="currentColor" stroke-width="1.5"/>' +
      '<text class="elektro-teks" x="146" y="83" text-anchor="middle">100 V</text>' +
      '<text class="elektro-teks" x="146" y="92" text-anchor="middle">400 mA</text>' +
      '<circle cx="133" cy="110" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<circle cx="159" cy="110" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<line x1="112" y1="72" x2="120" y2="72" stroke="currentColor" stroke-width="2"/>' +
      '<line x1="112" y1="112" x2="120" y2="112" stroke="currentColor" stroke-width="2"/>' +
      '<line x1="2" y1="130" x2="178" y2="130" stroke="currentColor" stroke-width="2.5"/>' +
    '</svg>';

  var MESIN = [
    {
      id: 'sentrifus', nama: 'Centrifuge',
      kata: ['sentrifugasi', 'sentrifus', 'centrifuge'],
      sprite: SVG_CENTRIFUGE, kelas: 'mesin-jalan', durasi: 1400, tiriskan: true
    },
    {
      id: 'blok-panas', nama: 'Heat block',
      kata: ['inkubasi', 'inkubasikan', 'heat block', '70°c', '65°c', '56°c'],
      sprite: SVG_HEATBLOCK, kelas: 'mesin-jalan', durasi: 1400, tiriskan: false
    },
    {
      id: 'thermocycler', nama: 'Thermal cycler',
      kata: ['thermal cycler', 'thermocycler', 'siklus', 'denaturasi', 'annealing'],
      sprite: SVG_THERMOCYCLER, kelas: 'mesin-jalan', durasi: 2400, tiriskan: false
    },
    {
      /* #B4 Elektroforesis: tinggal isi sprite chamber + power supply + gel */
      id: 'elektroforesis', nama: 'Power supply & gel',
      /* JANGAN taruh 'gel' telanjang di sini: kata kunci mesin juga dipakai
         menilai NAMA TARGET, dan 'gel' menelan zona bernama "Sumur gel" —
         zonanya lenyap dari adegan dan langkahnya jadi tidak bisa dikerjakan.
         'gel doc' cukup spesifik. */
      kata: ['elektroforesis', 'running', 'power supply', 'gel doc'],
      sprite: SVG_ELEKTRO, kelas: 'mesin-jalan', durasi: 2000, tiriskan: false
    }
  ];

  /* mesin yang benar-benar punya sprite (hook ber-sprite null tidak dihitung,
     supaya target bernama "gel" dsb tidak lenyap sebelum mesinnya digambar) */
  function mesinBerprop(nama) {
    var m = mesinUntuk(nama);
    return m && m.sprite ? m : null;
  }

  function mesinUntuk(label) {
    var lab = String(label || '').toLowerCase();
    if (!lab) return null;
    for (var i = 0; i < MESIN.length; i++) {
      for (var j = 0; j < MESIN[i].kata.length; j++) {
        if (lab.indexOf(MESIN[i].kata[j]) !== -1) return MESIN[i];
      }
    }
    return null;
  }

  /* Mesin yang benar-benar dipakai percobaan ini (urut MESIN, dedup).
     Mesin ber-sprite null dilewati: hook-nya ada, gambarnya belum. */
  function mesinDipakai() {
    var out = [];
    (S.percobaan.langkah || []).forEach(function (l) {
      if (l.aksi !== 'tindakan') return;
      var m = mesinUntuk(l.label);
      if (m && m.sprite && out.indexOf(m) === -1) out.push(m);
    });
    return out;
  }

  /* Efek alat room prosedur pada TINGGI CAIRAN. Murni tampilan — dipanggil
     hanya untuk aksi yang sudah DITERIMA, jadi tidak menyentuh validasi.

     Dua aturan, dua-duanya dari kata kunci label:
     - "pindahkan": isi zona sumber pindah ke zona target, dan zona target
       jadi PENAMPUNG untuk tirisan berikutnya.
     - mesin ber-`tiriskan`: isi zona target turun. Kalau penampungnya zona
       lain, cairannya mendarat di situ (elusi); kalau penampungnya zona itu
       sendiri, cairannya memang dibuang (flow-through cucian). */
  /* Zona yang isinya habis (dipindah/ditiris) ikut kehilangan warnanya —
     tabung kosong tidak boleh tetap tertint. Ini yang bikin warna "ikut"
     cairan tanpa simulasi apa pun: yang ada cuma "berisi cairan berwarna X"
     atau "kosong". */
  function segarkanWarnaZona(zona) {
    if (!zona) return;
    if (!(S.volumeZona[zona] > 0)) S.warnaZona[zona] = null;
  }

  function efekProsedur(att) {
    if (att.aksi !== 'tindakan') return;
    var lab = String(att.label || '').toLowerCase();

    if (lab.indexOf('pindahkan') !== -1) {
      var v = S.volumeZona[att.sumber] || 0;
      if (v) {
        /* isi pindah bersama warnanya — sekali lagi, dipindah, bukan dicampur */
        var wPindah = S.warnaZona[att.sumber];
        S.volumeZona[att.target] = (S.volumeZona[att.target] || 0) + v;
        S.volumeZona[att.sumber] = 0;
        if (wPindah) S.warnaZona[att.target] = wPindah;
      }
      segarkanWarnaZona(att.sumber);
      segarkanWarnaZona(att.target);
      S.penampung = att.target;
      return;
    }

    var m = mesinUntuk(att.label);
    /* Langkah boleh MENIMPA sifat `tiriskan` mesinnya lewat field data
       `tiriskan`. Perlu karena satu sprite mesin melayani dua pemakaian yang
       berbeda: quick-spin PCR memakai centrifuge yang sama, tapi tujuannya
       mengumpulkan tetesan di dasar tabung — bukan mengosongkan tabung.
       Langkah yang TIDAK menyetel field ini jatuh ke sifat mesinnya, jadi
       Isolasi DNA berperilaku persis seperti sebelumnya. */
    var tiris = att.tiriskan !== undefined ? att.tiriskan : (m && m.tiriskan);
    if (m && tiris) {
      var turun = S.volumeZona[att.target] || 0;
      S.volumeZona[att.target] = 0;
      if (turun && S.penampung && S.penampung !== att.target) {
        S.volumeZona[S.penampung] = (S.volumeZona[S.penampung] || 0) + turun;
        if (S.warnaZona[att.target]) S.warnaZona[S.penampung] = S.warnaZona[att.target];
      }
      segarkanWarnaZona(att.target);
      if (S.penampung) segarkanWarnaZona(S.penampung);
    }
  }

  /* Animasi = umpan balik KOSMETIK yang jalan SETELAH langkah maju. Tidak ada
     yang menunggunya: kalau user langsung mengklik lagi, langkah berikutnya
     tetap diproses. Tampil di dua mode — gerakan mesin bukan bocoran urutan,
     dia cuma menggambarkan aksi yang barusan dikerjakan user sendiri. */
  var timerAnimasi = [];
  function pasangKelasSementara(node, kelas, ms) {
    if (!node) return;
    node.classList.remove(kelas);
    void node.offsetWidth;   /* reflow paksa: animasi diulang dari awal */
    node.classList.add(kelas);
    timerAnimasi.push(setTimeout(function () { node.classList.remove(kelas); }, ms));
  }

  function animasiAlat(att) {
    if (!prosedur() || att.aksi !== 'tindakan') return;
    var lab = String(att.label || '').toLowerCase();

    /* pemindahan: zona asal "mengirim", zona tujuan "menerima" */
    if (lab.indexOf('pindahkan') !== -1) {
      pasangKelasSementara(propZona(att.sumber), 'zona-kirim', 700);
      pasangKelasSementara(propZona(att.target), 'zona-terima', 700);
      return;
    }

    var m = mesinUntuk(att.label);
    if (!m || !m.sprite) return;
    pasangKelasSementara(id('mesin-' + m.id), m.kelas, m.durasi);
    /* barang yang sedang diproses ikut "masuk mesin" */
    pasangKelasSementara(propZona(att.target), 'zona-diproses', m.durasi);
  }

  function propZona(nama) {
    if (!nama) return null;
    var n = document.querySelectorAll('.prop[data-target="' + nama + '"]');
    return n[0] || null;
  }

  function bangunMesin() {
    var daftar = mesinDipakai();
    if (!daftar.length) return null;
    var baris = el('div', 'mesin-baris');
    daftar.forEach(function (m) {
      var kotak = el('div', 'mesin mesin-' + m.id);
      kotak.id = 'mesin-' + m.id;
      var g = el('div', 'mesin-gambar');
      g.innerHTML = m.sprite;
      kotak.appendChild(g);
      /* kalau ada langkah yang TARGET-nya mesin ini, sprite-nya sekalian jadi
         target: denyut & sorot mendarat di mesinnya, bukan di kotak dashed. */
      var sbg = daftarTarget().filter(function (t) { return mesinBerprop(t) === m; });
      kotak.appendChild(el('span', 'mesin-nama', sbg.length ? sbg[0] : m.nama));
      if (sbg.length) {
        kotak.dataset.target = sbg[0];
        pasangKlikTarget(kotak);
      }
      baris.appendChild(kotak);
    });
    return baris;
  }

  function bangunAreaProsedur() {
    var kolom = el('main', 'kolom-kerja');
    kolom.appendChild(bangunPilihanBar());
    var meja = el('div', 'meja meja-prosedur');
    meja.appendChild(el('p', 'meja-label', 'Alat & status'));

    var semuaTarget = daftarTarget();
    var adaPropAlat = semuaTarget.some(function (t) { return jenisProp(t) === 'alat'; });
    /* target "strip" nempel jadi hotspot di alat — kecuali tidak ada alatnya,
       baru dia berdiri sendiri sebagai kotak */
    var slotDiAlat = adaPropAlat ? semuaTarget.filter(function (t) {
      return jenisProp(t) === 'strip';
    }) : [];

    var adegan = el('div', 'adegan');
    semuaTarget.forEach(function (nama) {
      if (slotDiAlat.indexOf(nama) !== -1) return;   /* dirender di dalam prop alat */
      if (jenisProp(nama) === 'mesin') return;       /* sprite mesinnya yang jadi target */
      adegan.appendChild(bangunProp(nama, slotDiAlat));
    });
    meja.appendChild(adegan);

    /* zona mesin: muncul hanya kalau ada langkah tindakan yang labelnya kena
       kata kunci mesin ber-sprite. Asam Urat tidak punya, jadi tidak dapat. */
    var mesin = bangunMesin();
    if (mesin) meja.appendChild(mesin);

    /* panel gel: dibangun kalau data room ini memang menghasilkan gel,
       disembunyikan sampai langkah gel-doc benar-benar dijalankan. */
    if (punyaGel()) meja.appendChild(bangunPanelGel());

    /* panel Aksi menempel ke zona alat, bukan nyasar di kolom kiri */
    var khusus = bangunPanelAksiKhusus();
    if (khusus) meja.appendChild(khusus);
    kolom.appendChild(meja);

    var cat = el('div', 'kotak');
    cat.appendChild(el('h3', 'kotak-judul', 'Catatan pengamatan'));
    var daftar = el('ol', 'catatan');
    daftar.id = 'catatan';
    cat.appendChild(daftar);
    kolom.appendChild(cat);
    return kolom;
  }

  /* Percobaan ini pakai api atau tidak — dari data, bukan dari nama room.
     Biuret (tanpa nyalakan/panaskan) tidak dapat sprite pembakar. */
  function pakaiApi() {
    return (S.percobaan.langkah || []).some(function (l) {
      return l.aksi === 'nyalakan' || l.aksi === 'panaskan';
    });
  }

  /* Sprite pembakar spiritus di panggung. Api digambar duluan supaya badan
     pembakar menutupinya di bagian bawah; nyala/besar diatur CSS lewat class. */
  var SPRITE_PEMBAKAR =
    '<svg class="pembakar-svg" viewBox="0 0 120 104" aria-hidden="true">' +
      '<g class="pembakar-api">' +
        '<path class="api-luar" d="M60 8c11 14 16 21 16 27a16 16 0 0 1-32 0c0-6 5-13 16-27z"/>' +
        '<path class="api-inti" d="M60 24c5.5 8 8 12 8 15.5a8 8 0 0 1-16 0c0-3.5 2.5-7.5 8-15.5z"/>' +
      '</g>' +
      '<rect x="54" y="52" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M38 98V80a22 22 0 0 1 44 0v18z" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      '<line x1="30" y1="98" x2="90" y2="98" stroke="currentColor" stroke-width="2.5"/>' +
    '</svg>';

  /* ---------------- prop adegan (room prosedur) ---------------- */
  var SVG_ALAT =
    '<svg class="prop-svg" viewBox="0 0 170 250" aria-hidden="true">' +
      '<rect x="25" y="34" width="120" height="200" rx="10" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      '<rect x="66" y="26" width="38" height="12" fill="var(--panel)" stroke="currentColor" stroke-width="2.5"/>' +
      '<rect x="42" y="58" width="86" height="56" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<circle cx="85" cy="136" r="8" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<rect x="48" y="160" width="74" height="52" fill="none" stroke="currentColor" ' +
        'stroke-width="1.5" stroke-dasharray="5 4"/>' +
    '</svg>';

  var SVG_KOLOM =
    '<svg class="prop-svg" viewBox="0 0 120 210" aria-hidden="true">' +
      /* collection tube di luar */
      '<path d="M22 58v104a30 30 0 0 0 60 0" fill="none" stroke="currentColor" ' +
        'stroke-width="2.5" transform="translate(9 0)"/>' +
      '<path d="M31 58h60" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      /* filter tube di dalam, mulutnya melebar */
      '<path d="M38 20h46l-6 14v58H44V34z" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      /* membran */
      '<line x1="44" y1="92" x2="78" y2="92" stroke="currentColor" stroke-width="3.5"/>' +
      '<line x1="46" y1="97" x2="76" y2="97" stroke="currentColor" stroke-width="1.2" ' +
        'stroke-dasharray="3 3"/>' +
    '</svg>';

  var SVG_LANSET =
    '<svg class="prop-svg" viewBox="0 0 110 210" aria-hidden="true">' +
      '<rect x="46" y="8" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"/>' +
      '<rect x="36" y="26" width="38" height="122" rx="5" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M36 148h38l-10 34H46z" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      '<line x1="36" y1="60" x2="74" y2="60" stroke="currentColor" stroke-width="1.5"/>' +
    '</svg>';

  var SVG_JARI =
    '<svg class="prop-svg" viewBox="0 0 130 160" aria-hidden="true">' +
      '<path d="M44 158V62a21 21 0 0 1 42 0v96" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
      '<path d="M44 116h42" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
    '</svg>';

  /* tetesan darah — dipakai di layar alat (ikon "siap sampel") & di ujung strip */
  var SVG_TETES =
    '<svg class="ikon-tetes" viewBox="0 0 20 20" aria-hidden="true">' +
      '<path d="M10 2c4.4 5.6 6.2 8.4 6.2 10.8a6.2 6.2 0 0 1-12.4 0C3.8 10.4 5.6 7.6 10 2z"/>' +
    '</svg>';

  function bangunProp(nama, slotDiAlat) {
    var jenis = jenisProp(nama);
    var prop = el('div', 'prop prop-' + jenis);
    prop.dataset.target = nama;
    pasangKlikTarget(prop);

    /* caption target lain yang menumpang di prop ini (mis. slot strip) —
       dikumpulkan dulu supaya urutannya di bawah nama propnya sendiri */
    var ekstra = [];
    if (jenis === 'alat')        isiPropAlat(prop, slotDiAlat, ekstra);
    else if (jenis === 'lanset') isiPropLanset(prop);
    else if (jenis === 'jari')   isiPropJari(prop);
    else if (jenis === 'tabung') isiPropTabung(prop, nama);
    else if (jenis === 'kolom')  isiPropKolom(prop, nama);
    else                         prop.classList.add('prop-kotak');

    prop.appendChild(el('span', 'prop-nama', nama));
    var isi = el('div', 'prop-isi');
    isi.dataset.zonaIsi = nama;
    prop.appendChild(isi);
    ekstra.forEach(function (n) { prop.appendChild(n); });
    return prop;
  }

  function gambar(prop, svg) {
    var g = el('div', 'prop-gambar');
    g.innerHTML = svg;
    prop.appendChild(g);
    return g;
  }

  function isiPropAlat(prop, slotDiAlat, ekstra) {
    var g = gambar(prop, SVG_ALAT);

    /* layar: diisi renderAreaProsedur dari pengamatan terakhir */
    var layar = el('div', 'alat-layar');
    layar.id = 'alat-layar';
    g.appendChild(layar);

    /* strip yang tercolok di slot atas */
    var strip = el('div', 'alat-strip');
    strip.id = 'alat-strip';
    strip.hidden = true;
    var darah = el('div', 'alat-darah');
    darah.id = 'alat-darah';
    darah.hidden = true;
    strip.appendChild(darah);
    g.appendChild(strip);

    /* baterai di kompartemen bawah */
    var bat = el('div', 'alat-baterai');
    bat.id = 'alat-baterai';
    bat.hidden = true;
    bat.appendChild(el('span', 'alat-baterai-kutub', '+  −'));
    g.appendChild(bat);
    g.appendChild(el('span', 'alat-komp-nama', 'baterai'));

    /* target ber-kata-kunci "strip" jadi hotspot tepat di mulut slot */
    (slotDiAlat || []).forEach(function (t) {
      var hot = el('div', 'alat-slot');
      hot.dataset.target = t;
      hot.title = t;
      hot.appendChild(el('span', 'alat-slot-nama', t));
      pasangKlikTarget(hot);
      g.appendChild(hot);

      var sub = el('div', 'prop-sub');
      sub.appendChild(el('span', 'prop-subnama', t));
      var isi = el('div', 'prop-isi');
      isi.dataset.zonaIsi = t;
      sub.appendChild(isi);
      (ekstra || []).push(sub);
    });
  }

  /* Tabung sungguhan di room prosedur — badan & cairan memakai kelas yang
     SAMA dengan tabung room kimia (.tabung-badan/.cairan), jadi satu aturan
     CSS melayani dua tipe room. Bedanya cuma ukuran (.tabung-mini) dan
     tinggi cairan diambil per-zona, bukan dari S.volume global. */
  function isiPropTabung(prop, nama) {
    var tab = el('div', 'tabung tabung-mini');
    var badan = el('div', 'tabung-badan');
    var cairan = el('div', 'cairan');
    cairan.dataset.zonaCairan = nama;
    badan.appendChild(cairan);
    tab.appendChild(badan);
    prop.appendChild(tab);

    /* caption status zona: "penampung" saat jadi tujuan tirisan, "DNA murni"
       begitu eluat mendarat. Diisi renderAreaProsedur. */
    var tag = el('span', 'zona-tag');
    tag.dataset.zonaTag = nama;
    tag.hidden = true;
    prop.appendChild(tag);

    /* "duduk di: <tabung>" — kolom spin selalu ditumpangkan di atas sebuah
       tabung, dan tabung mana itu BERUBAH di tengah prosedur (collection tube
       -> tabung steril). Tanpa caption ini, pemindahan di Tahap 3 tidak
       kelihatan mengubah apa pun. */
    var duduk = el('span', 'kolom-duduk');
    duduk.dataset.zonaDuduk = nama;
    duduk.hidden = true;
    prop.appendChild(duduk);
  }

  /* Kolom spin: tabung penampung di luar, filter tube di dalam, garis
     membran di tengah. Cairan digambar DI ATAS membran — itu yang turun
     waktu disentrifugasi. */
  function isiPropKolom(prop, nama) {
    var g = gambar(prop, SVG_KOLOM);
    /* `ruang` = kotak sebesar rongga filter tube DI ATAS membran; tinggi
       cairan dihitung persen terhadap dia, bukan terhadap seluruh sprite. */
    var ruang = el('div', 'kolom-ruang');
    var cairan = el('div', 'kolom-cairan');
    cairan.dataset.zonaCairan = nama;
    ruang.appendChild(cairan);
    g.appendChild(ruang);

    /* deposit yang menempel DI GARIS MEMBRAN — persis di bawah rongga cairan */
    var dep = el('div', 'kolom-deposit');
    dep.dataset.zonaMembran = nama;
    dep.hidden = true;
    g.appendChild(dep);

    var tag = el('span', 'zona-tag');
    tag.dataset.zonaTag = nama;
    tag.hidden = true;
    prop.appendChild(tag);

    /* "duduk di: <tabung>" — kolom spin selalu ditumpangkan di atas sebuah
       tabung, dan tabung mana itu BERUBAH di tengah prosedur (collection tube
       -> tabung steril). Tanpa caption ini, pemindahan di Tahap 3 tidak
       kelihatan mengubah apa pun. */
    var duduk = el('span', 'kolom-duduk');
    duduk.dataset.zonaDuduk = nama;
    duduk.hidden = true;
    prop.appendChild(duduk);
  }

  function isiPropLanset(prop) {
    var g = gambar(prop, SVG_LANSET);
    var isi = el('div', 'lanset-isi');
    isi.id = 'lanset-isi';
    isi.hidden = true;
    g.appendChild(isi);
    var jarum = el('div', 'lanset-jarum');
    jarum.id = 'lanset-jarum';
    jarum.hidden = true;
    g.appendChild(jarum);
  }

  function isiPropJari(prop) {
    var g = gambar(prop, SVG_JARI);
    var swab = el('div', 'jari-swab');
    swab.id = 'jari-swab';
    swab.hidden = true;
    g.appendChild(swab);
  }

  /* Layar alat dibaca dari pengamatan TERAKHIR (hasilVisual jenis "teks"
     yang sudah ada di data) — bukan dari field baru. Aturannya generik:
     isi tanda kutip kalau ada ("OK", "AU"), lalu angka+satuan (5,4 mg/dL),
     kalau dua-duanya tidak ada berarti alat menyala tapi belum ada nilai
     yang bisa dibaca -> tampilkan ikon siap-sampel. */
  function bacaLayar() {
    if (!S.catatan.length) return null;
    var t = String(S.catatan[S.catatan.length - 1]);
    var kutip = /"([^"]{1,14})"/.exec(t);
    if (kutip) return { teks: kutip[1] };
    var angka = /(\d+(?:[.,]\d+)?)\s*(mg\/dL|mmol\/L|mg%|g\/dL)/i.exec(t);
    if (angka) return { teks: angka[1] + ' ' + angka[2] };
    return { siap: true };
  }

  /* Semua target yang disebut data, urut kemunculan. */
  function daftarTarget() {
    var out = [];
    (S.percobaan.langkah || []).forEach(function (l) {
      if (l.target && out.indexOf(l.target) === -1) out.push(l.target);
    });
    return out;
  }

  function bangunAreaTabung() {
    var kolom = el('main', 'kolom-kerja');
    kolom.appendChild(bangunPilihanBar());
    var meja = el('div', 'meja');
    meja.dataset.target = 'Meja kerja';
    meja.appendChild(el('p', 'meja-label', 'Meja kerja'));

    var panggung = el('div', 'panggung');

    /* Satu "stasiun" kolom: slot/tabung di atas, pembakar tepat di bawahnya,
       nama alat paling bawah. Tabung jadi terlihat berdiri di atas pembakar. */
    var stasiun = el('div', 'stasiun');

    var slot = el('div', 'slot');
    slot.id = 'slot-kosong';
    slot.appendChild(el('span', null, 'belum ada alat'));
    stasiun.appendChild(slot);

    var tabung = el('div', 'tabung');
    tabung.id = 'tabung';
    tabung.dataset.target = 'Tabung reaksi';
    tabung.hidden = true;
    var badan = el('div', 'tabung-badan');
    var cairan = el('div', 'cairan');
    cairan.id = 'cairan';
    var endapan = el('div', 'endapan');
    endapan.id = 'endapan';
    endapan.hidden = true;
    var gelembung = el('div', 'gelembung');
    gelembung.id = 'gelembung';
    gelembung.hidden = true;
    badan.appendChild(cairan);
    badan.appendChild(endapan);
    badan.appendChild(gelembung);
    tabung.appendChild(badan);
    stasiun.appendChild(tabung);

    /* Sprite pembakar spiritus — hanya untuk percobaan yang memang pakai api.
       Nyala/besarnya diatur lewat class di renderAreaKerja, bukan di sini. */
    if (pakaiApi()) {
      var pembakar = el('div', 'pembakar');
      pembakar.id = 'pembakar';
      pembakar.innerHTML = SPRITE_PEMBAKAR;
      stasiun.appendChild(pembakar);
    }

    var namaAlat = el('span', 'stasiun-nama', 'Tabung reaksi');
    namaAlat.id = 'stasiun-nama';
    namaAlat.hidden = true;
    stasiun.appendChild(namaAlat);
    panggung.appendChild(stasiun);

    /* kertas lakmus — indikator yang DIBACA user, bukan isi tabung.
       Muncul hanya kalau ada hasilVisual jenis "lakmus". */
    var lakmus = el('div', 'lakmus');
    lakmus.id = 'lakmus';
    lakmus.hidden = true;
    var kertas = el('div', 'lakmus-kertas');
    kertas.id = 'lakmus-kertas';
    lakmus.appendChild(kertas);
    lakmus.appendChild(el('span', 'lakmus-nama', 'Kertas lakmus'));
    panggung.appendChild(lakmus);

    meja.appendChild(panggung);

    var badge = el('div', 'badge-baris');
    badge.id = 'badge-baris';
    meja.appendChild(badge);

    /* panel Aksi menempel langsung di bawah panggung — tombolnya jadi dekat
       objek yang dioperasikan (tabung + pembakar), bukan di kolom seberang */
    var khusus = bangunPanelAksiKhusus();
    if (khusus) meja.appendChild(khusus);

    kolom.appendChild(meja);

    var cat = el('div', 'kotak');
    cat.appendChild(el('h3', 'kotak-judul', 'Catatan pengamatan'));
    var isi = el('ol', 'catatan');
    isi.id = 'catatan';
    cat.appendChild(isi);
    kolom.appendChild(cat);

    [meja, tabung].forEach(function (t) { pasangKlikTarget(t); });

    return kolom;
  }

  /* klik target (mode klik-klik, pasangan dari drag) */
  function pasangKlikTarget(t) {
    t.addEventListener('click', function (e) {
      if (!S || S.selesai) return;
      /* panel Aksi & bar seleksi hidup DI DALAM meja kerja, tapi keduanya
         bukan tempat menaruh barang. Tanpa guard ini klik tombol aksi ikut
         terhitung sebagai "taruh di Meja kerja" dan kena penalti. */
      if (e.target && e.target.closest &&
          (e.target.closest('.kotak-aksi') || e.target.closest('.pilihan-bar'))) return;
      if (!S.pilihan) {
        /* target diklik tanpa memilih apa pun — jelaskan alurnya, jangan diam */
        feedback('netral', 'Pilih dulu item di rak (klik sekali), baru klik targetnya.');
        return;
      }
      e.stopPropagation();
      var nama = S.pilihan;
      S.pilihan = null;
      cobaAksi({ aksi: aksiDrag(), sumber: nama, target: t.dataset.target });
    });
  }

  function bangunLayarSelesai() {
    var box = el('section', 'selesai');
    box.id = 'selesai';
    box.hidden = true;
    return box;
  }

  /* ================================================================
     DRAG (pointer events — jalan di mouse & touch, tanpa library)
     ================================================================ */
  function pasangDrag(node, nama) {
    node.addEventListener('pointerdown', function (e) {
      if (!S || S.selesai) return;
      e.preventDefault();
      var x0 = e.clientX, y0 = e.clientY, geser = false, hantu = null;
      try { node.setPointerCapture(e.pointerId); } catch (err) { /* abaikan */ }

      function gerak(ev) {
        if (!geser && Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) > 6) {
          geser = true;
          hantu = el('div', 'hantu', nama);
          document.body.appendChild(hantu);
          node.classList.add('item-diangkat');
          document.body.classList.add('sedang-drag');
          tandaiTargetSiap(true);
        }
        if (!geser) return;
        hantu.style.left = ev.clientX + 'px';
        hantu.style.top = ev.clientY + 'px';
        sorot(targetDiBawah(ev.clientX, ev.clientY));
      }

      function lepas(ev) {
        node.removeEventListener('pointermove', gerak);
        node.removeEventListener('pointerup', lepas);
        node.removeEventListener('pointercancel', lepas);
        node.classList.remove('item-diangkat');
        document.body.classList.remove('sedang-drag');
        if (hantu) hantu.remove();
        sorot(null);
        if (geser) {
          var t = targetDiBawah(ev.clientX, ev.clientY);
          S.pilihan = null;
          if (t) cobaAksi({ aksi: aksiDrag(), sumber: nama, target: t.dataset.target });
          else update();
        } else {
          S.pilihan = (S.pilihan === nama) ? null : nama;
          update();
        }
      }

      node.addEventListener('pointermove', gerak);
      node.addEventListener('pointerup', lepas);
      node.addEventListener('pointercancel', lepas);
    });
  }

  function targetDiBawah(x, y) {
    var n = document.elementFromPoint(x, y);
    return n ? n.closest('[data-target]') : null;
  }

  function sorot(node) {
    var semua = document.querySelectorAll('[data-target]');
    for (var i = 0; i < semua.length; i++) semua[i].classList.remove('sorot');
    if (node) node.classList.add('sorot');
  }

  /* Aksi yang "dimaksud" user saat menyeret sesuatu: kalau langkah aktif
     menuntut takaran, seretan dihitung sebagai pilih-takaran. */
  function aksiDrag() {
    var l = langkahAktif();
    return (l && l.takaranBenar) ? 'pilih-takaran' : 'drag';
  }

  /* ================================================================
     VALIDASI
     ================================================================ */
  function langkahAktif() {
    if (!S || S.selesai) return null;
    return S.percobaan.langkah[S.index] || null;
  }

  function takaranSama(a, b) {
    if (!a || !b) return false;
    return Number(a.nilai) === Number(b.nilai) && a.satuan === b.satuan;
  }

  function cobaAksi(att) {
    if (!S || S.selesai) return;
    var l = langkahAktif();
    if (!l) return;
    if (l.takaranBenar) {
      att.takaran = { nilai: S.takaran.nilai, satuan: S.takaran.satuan };
    }
    var alasan = periksa(l, att);
    if (alasan) tolak(l, att, alasan);
    else terima(l, att);
  }

  function periksa(l, att) {
    if (att.aksi !== l.aksi) return 'aksi';
    if (att.sumber !== l.sumber) return 'sumber';
    if (att.target !== l.target) return 'target';
    /* langkah bertombol `label` (aksi "tindakan"): tombolnya harus yang benar,
       bukan cuma alat/target yang benar */
    if (l.label && att.label !== l.label) return 'label';
    if (l.takaranBenar && !takaranSama(att.takaran, l.takaranBenar)) return 'takaran';
    return null;
  }

  /* Cari pesan salahUmum yang cocok — dicari di SELURUH langkah, bukan cuma
     langkah aktif, supaya kesalahan urutan ("CuSO4 sebelum NaOH") bisa
     dijelaskan oleh aturan milik langkah CuSO4. */
  function pesanSalah(att, alasan) {
    var langkah = S.percobaan.langkah || [];
    for (var i = 0; i < langkah.length; i++) {
      var aturan = langkah[i].salahUmum || [];
      for (var j = 0; j < aturan.length; j++) {
        if (kondisiCocok(aturan[j].jika, att, langkah[i])) return aturan[j].pesan;
      }
    }
    return pesanDefault(alasan, langkahAktif(), att);
  }

  function kondisiCocok(j, att, pemilik) {
    if (!j) return false;
    if (j.aksi && j.aksi !== att.aksi) return false;
    if (j.sumber && j.sumber !== att.sumber) return false;
    if (j.target && j.target !== att.target) return false;
    /* `label` di `jika` DULU diabaikan diam-diam, jadi aturan yang ditulis
       untuk satu tombol tindakan ikut menjawab aksi lain yang kebetulan lolos
       syarat belum/sudah-nya — pesannya salah alamat. Sekarang dihormati.
       Room biokimia tidak memakai `label` di `jika`, jadi tidak terpengaruh. */
    if (j.label && j.label !== att.label) return false;
    if (j.takaran === 'salah') {
      /* aksi yang memang tidak membawa takaran tidak boleh kena aturan takaran */
      if (!att.takaran || !pemilik.takaranBenar) return false;
      if (takaranSama(att.takaran, pemilik.takaranBenar)) return false;
    }
    if (j.belum) {
      for (var a = 0; a < j.belum.length; a++) {
        if (sudahDipakai(j.belum[a])) return false;
      }
    }
    if (j.sudah) {
      for (var b = 0; b < j.sudah.length; b++) {
        if (!sudahDipakai(j.sudah[b])) return false;
      }
    }
    return true;
  }

  /* "sudah dipakai" = pernah jadi sumber aksi yang DITERIMA. Mencakup isi
     tabung sekaligus alat & aksi seperti menyalakan pembakar, jadi aturan
     urutan bisa ditulis untuk keduanya ("belum: ['Pembakar spiritus']"). */
  function sudahDipakai(nama) {
    return S.isi.indexOf(nama) !== -1 || S.dilakukan.indexOf(nama) !== -1;
  }

  function pesanDefault(alasan, l, att) {
    if (alasan === 'aksi') {
      return 'Langkah ini butuh aksi "' + l.aksi + '", bukan "' + att.aksi + '".';
    }
    if (alasan === 'sumber')  return 'Bahan/alat itu bukan yang diminta langkah ini.';
    if (alasan === 'label')   return 'Tindakan itu bukan yang diminta langkah ini.';
    if (alasan === 'target')  return 'Target salah. Perhatikan ke mana bahan itu seharusnya masuk.';
    if (alasan === 'takaran') return 'Takaran belum tepat untuk langkah ini.';
    return 'Aksi ditolak.';
  }

  function tolak(l, att, alasan) {
    /* pesan lengkap tetap dihitung di kedua mode: di Ujian dia tidak
       ditampilkan sekarang, tapi dipakai di rekap setelah selesai. */
    var pesan = pesanSalah(att, alasan);
    S.skor = Math.max(0, S.skor - PENALTI_SALAH);
    S.kesalahan.push({
      langkah: S.index + 1,
      instruksi: l.instruksi,
      pesan: pesan
    });
    /* state percobaan TIDAK berubah — aksi salah tidak boleh maju */
    update();
    denyut(att.target, 'salah');
    feedback('salah', ujian()
      ? 'Aksi tidak tepat — boros reagen (−' + PENALTI_SALAH + ')'
      : pesan + '  (−' + PENALTI_SALAH + ')');
  }

  function terima(l, att) {
    /* hasilVisual diterapkan DULU, baru efek aksinya dicatat. Alasannya
       jenis "reset": langkah "ambil tabung bersih" mengosongkan sub-uji
       sebelumnya sekaligus memasang tabungnya — kalau urutannya kebalik,
       pemasangan tabung itu sendiri ikut terhapus. Jenis lain tidak
       menyentuh isi/alat/api, jadi pemindahan ini netral buat room lama. */
    if (l.hasilVisual) terapkanVisual(l.hasilVisual, l.target);

    if (att.aksi === 'drag' && att.target === 'Meja kerja') {
      if (S.alat.indexOf(att.sumber) === -1) S.alat.push(att.sumber);
    } else if (att.aksi === 'drag' || att.aksi === 'pilih-takaran') {
      S.isi.push(att.sumber);
      S.volume += volumeDari(att.takaran);
    }
    if (att.aksi === 'drag' || att.aksi === 'pilih-takaran') {
      S.pasang[att.target] = (S.pasang[att.target] || []).concat(att.sumber);
      S.volumeZona[att.target] =
        (S.volumeZona[att.target] || 0) + volumeDari(att.takaran);

      /* Reagen berwarna mewarnai zona tujuannya. Reagen tanpa `warna` (bening)
         TIDAK menimpa warna yang sudah ada — bening itu netral, bukan cat
         putih. Dan kalau langkah ini punya warna hasil sendiri, warna itu yang
         menang: TIDAK ada pencampuran, cuma "warna mana yang berlaku". */
      var wr = warnaReagen(att.sumber);
      if (wr && !punyaWarnaScript(l)) {
        S.warnaZona[att.target] = wr;
        if (!prosedur()) S.warna = wr;
      }
    }
    if (l.tiriskan !== undefined) att.tiriskan = l.tiriskan;
    if (prosedur()) efekProsedur(att);
    if (att.aksi === 'nyalakan') S.api = true;
    if (att.aksi === 'panaskan') S.panas = true;
    if (S.dilakukan.indexOf(att.sumber) === -1) S.dilakukan.push(att.sumber);
    /* tandai tombolnya "sudah dilakukan". Dicatat SETELAH terapkanVisual
       supaya `reset` antar sub-uji tidak menghapus penanda yang baru dibuat. */
    if (AKSI_TOMBOL.indexOf(att.aksi) !== -1) {
      var kA = kunciAksi(att);
      S.aksiSelesai[kA] = (S.aksiSelesai[kA] || 0) + 1;
    }

    S.skor = Math.min(SKOR_MAKS, S.skor + S.poinPerLangkah);
    S.benar += 1;
    S.index += 1;

    /* Sebut jumlahnya waktu menuang — di DUA mode. Angka ini input user
       sendiri, bukan kunci jawaban yang dibocorkan. */
    var tuang = att.takaran ? 'Menuang ' + fmtTakaran(att.takaran) + ' ' + att.sumber + '. ' : '';
    var pesan = (ujian() ? 'Aksi diterima. ' : 'Benar. ') + tuang +
      (l.hasilVisual ? deskripsiVisual(l.hasilVisual) : (ujian() ? '' : 'Lanjut ke langkah berikutnya.'));

    denyut(att.target, 'benar');
    animasiAlat(att);
    if (S.index >= S.percobaan.langkah.length) {
      S.selesai = true;
      update();
      tampilkanSelesai();
      return;
    }
    update();
    feedback('benar', pesan);
  }

  function volumeDari(takaran) {
    if (!takaran) return 0;
    var n = Number(takaran.nilai) || 0;
    if (takaran.satuan === 'cc' || takaran.satuan === 'ml') return n;
    if (takaran.satuan === 'µL') return n / 1000;   /* mikroliter: 1000 µL = 1 ml */
    if (takaran.satuan === 'tetes') return n * 0.05;
    return 0; /* % = konsentrasi; gram = padatan, tidak menaikkan tinggi cairan */
  }

  /* Kapasitas zona = total volume takaran yang menurut DATA pernah masuk ke
     zona itu dalam satu sub-uji. Dipakai cuma buat menskala tinggi cairan,
     jadi tabung 1,5 mL berisi ratusan µL tetap kelihatan terisi. */
  function kapasitasZona(nama) {
    var seg = batasSegmen(S.index);
    var lang = S.percobaan.langkah || [];
    var total = 0, terbesar = 0;
    for (var i = seg.mulai; i < seg.habis; i++) {
      if (!lang[i].takaranBenar) continue;
      var v = volumeDari(lang[i].takaranBenar);
      if (v > terbesar) terbesar = v;
      if (lang[i].target === nama) total += v;
    }
    /* Zona yang tidak pernah menerima takaran LANGSUNG tapi kebagian cairan
       lewat tirisan/pemindahan (mis. tabung penampung eluat) diskalakan ke
       takaran terbesar percobaan. Cukup buat membaca "ada isinya", tanpa
       angka ajaib per room. */
    return total > 0 ? total : terbesar;
  }

  /* ---------- hasil visual scripted ----------
     `hasilVisual` boleh satu objek ATAU array objek (diterapkan berurutan,
     jadi warna yang berubah bertahap tinggal ditulis beruntun di data). */
  function daftarVisual(hv) {
    return Object.prototype.toString.call(hv) === '[object Array]' ? hv : [hv];
  }

  function terapkanVisual(hv, zona) {
    daftarVisual(hv).forEach(function (v) {
      /* warna script dicatat DUA kali: global (dipakai room kimia yang cuma
         punya satu tabung) dan per-zona (dipakai room prosedur). Room kimia
         tidak membaca warnaZona, jadi perilakunya tidak berubah sedikit pun. */
      if (v.jenis === 'warna') { S.warna = v.nilai; if (zona) S.warnaZona[zona] = v.nilai; }
      else if (v.jenis === 'endapan') S.endapan = v.nilai;
      else if (v.jenis === 'endapan-larut') S.endapan = null;
      else if (v.jenis === 'gas') S.gas = true;
      else if (v.jenis === 'lakmus') S.lakmus = v.nilai;
      else if (v.jenis === 'reset') kosongkanTabung();
      else if (v.jenis === 'gel') S.gel = v.nilai;
      else if (v.jenis === 'ikat-membran') ikatMembran(v.nilai);
      else if (v.jenis === 'elusi') elusikan();
      /* "reset" itu aksi persiapan, bukan pengamatan — jangan cemari
         catatan pengamatan & blok Hasil praktikum dengannya.
         "ikat-membran"/"elusi" juga tidak menulis catatan sendiri: keduanya
         mengubah GAMBAR, sedangkan kalimat pengamatannya ditulis data lewat
         entri {jenis:'teks'} berdampingan — kalau engine ikut mengarang,
         catatannya jadi dobel. */
      if (['reset', 'ikat-membran', 'elusi'].indexOf(v.jenis) === -1) {
        S.catatan.push(satuDeskripsi(v));
      }
    });
  }

  var WARNA_MEMBRAN = '#eef0f2';   /* default deposit: putih pucat */

  /* Deposit menempel di membran zona KOLOM. Kalau ada lebih dari satu kolom,
     dipilih kolom yang sedang berisi/baru dipakai; percobaan dengan satu kolom
     (kasus normal) tidak perlu memikirkan ini. */
  function zonaKolom() {
    var k = targetBerjenis('kolom');
    return k.length ? k[0] : null;
  }

  function ikatMembran(nilai) {
    var z = zonaKolom();
    if (!z) return;
    S.membran[z] = nilai || WARNA_MEMBRAN;
  }

  /* Elusi: deposit LEPAS dari membran dan turun ke zona penampung — tabung
     yang ditunjuk pemindahan terakhir (S.penampung, dari #B2b). Membrannya
     dikosongkan. Ini satu-satunya jalan deposit membran hilang. */
  function elusikan() {
    var asal = null;
    for (var z in S.membran) {
      if (Object.prototype.hasOwnProperty.call(S.membran, z) && S.membran[z]) { asal = z; break; }
    }
    if (!asal) return;
    var warna = S.membran[asal];
    S.membran[asal] = null;
    if (S.penampung) S.eluat[S.penampung] = warna;
  }

  /* Tabung/cawan bersih untuk sub-uji berikutnya: isinya dibuang, alatnya
     tetap di meja. `dilakukan`/`pasang` ikut dikosongkan supaya aturan
     urutan (`belum`/`sudah` di salahUmum) dinilai per sub-uji — kalau tidak,
     "Pembakar spiritus" dari sub-uji 1 bikin api dianggap masih menyala di
     sub-uji berikutnya padahal badge-nya sudah mati. `catatan` TIDAK dihapus:
     seluruh pengamatan percobaan dipakai di layar Selesai. */
  function kosongkanTabung() {
    S.isi = [];
    S.volume = 0;
    S.warna = WARNA_BENING;
    S.endapan = null;
    S.gas = false;
    S.api = false;
    S.panas = false;
    S.lakmus = null;
    S.dilakukan = [];
    S.pasang = {};
    S.aksiSelesai = {};
    S.volumeZona = {};
    S.warnaZona = {};
    S.penampung = null;
    S.membran = {};
    S.eluat = {};
    S.gel = null;
  }

  function deskripsiVisual(hv) {
    return daftarVisual(hv).map(satuDeskripsi).join(' ');
  }

  function satuDeskripsi(v) {
    if (v.jenis === 'warna')   return 'Larutan berubah menjadi ' + namaWarna(v.nilai) + '.';
    if (v.jenis === 'endapan') return 'Terbentuk endapan ' + warnaPadat(v.nilai) + '.';
    if (v.jenis === 'endapan-larut') return 'Endapan larut.';
    if (v.jenis === 'gas')     return 'Muncul gelembung gas.';
    if (v.jenis === 'lakmus')  return 'Kertas lakmus berubah menjadi ' + namaWarna(v.nilai) + '.';
    if (v.jenis === 'reset')   return 'Tabung bersih dan kosong disiapkan.';
    if (v.jenis === 'gel')     return ringkasGel(v.nilai);
    return String(v.nilai);
  }

  function warnaPadat(nilai) {
    var w = namaWarna(nilai);
    return w === 'bening/putih' ? 'putih' : w;
  }

  /* Namai warna CSS hex jadi kata Indonesia — supaya catatan pengamatan &
     blok hasil bisa dirangkai engine tanpa menaruh teks warna di data.
     Murni konversi warna, bukan pengetahuan kimia. */
  function namaWarna(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return String(hex);
    var v = parseInt(m[1], 16);
    var r = ((v >> 16) & 255) / 255, g = ((v >> 8) & 255) / 255, b = (v & 255) / 255;
    var maks = Math.max(r, g, b), min = Math.min(r, g, b), d = maks - min;
    var l = (maks + min) / 2;
    var s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    /* d (chroma) ikut dijaga: dekat putih/hitam, s meledak walau warnanya
       praktis netral — tanpa ini off-white endapan kebaca "kuning". */
    if (s < 0.12 || d < 0.08) {
      if (l > 0.82) return 'bening/putih';
      if (l < 0.18) return 'hitam';
      return 'abu-abu';
    }
    var h;
    if (maks === r) h = 60 * (((g - b) / d) % 6);
    else if (maks === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
    if (h < 15 || h >= 345) return 'merah';
    /* Cokelat = jingga yang gelap. Tanpa cabang ini lisat darah (#6b4423)
       dinamai "jingga", padahal datanya sendiri menyebutnya kecoklatan.
       Sengaja dibatasi ke pita jingga: merah gelap (darah) tetap "merah",
       dan jingga terang xanthoprotein (#e8791e, l≈0.51) tetap "jingga". */
    if (h < 45 && l < 0.40) return 'cokelat';
    if (h < 45)  return 'jingga';
    if (h < 70)  return 'kuning';
    if (h < 160) return 'hijau';
    if (h < 200) return 'biru kehijauan';
    if (h < 250) return 'biru';
    if (h < 290) return 'ungu/lembayung';
    return 'merah keunguan';
  }

  /* ================================================================
     FEEDBACK AKSI — sorot target, konfirmasi drop, penanda aksi selesai
     Semuanya presentasi murni: tidak satu pun dibaca oleh periksa()/skor.
     ================================================================ */

  /* Tandai SEMUA tempat yang bisa menerima barang selagi ada item terpilih
     atau sedang diseret. Sengaja semua target, bukan cuma target yang benar —
     kalau cuma yang benar, sorotan ini jadi kunci jawaban. */
  function tandaiTargetSiap(aktif) {
    var semua = document.querySelectorAll('[data-target]');
    for (var i = 0; i < semua.length; i++) {
      semua[i].classList.toggle('target-siap', !!aktif);
    }
  }

  /* Kedip sekali di target: konfirmasi bahwa aksi barusan masuk (hijau)
     atau ditolak (merah). Ini yang bikin drop terasa "nyantol". */
  function denyut(nama, jenis) {
    if (!nama) return;
    var kelas = jenis === 'salah' ? 'denyut-salah' : 'denyut-benar';
    var node = document.querySelectorAll('[data-target="' + nama + '"]');
    for (var i = 0; i < node.length; i++) {
      (function (t) {
        t.classList.remove('denyut-benar');
        t.classList.remove('denyut-salah');
        void t.offsetWidth;   /* reflow paksa: animasi diulang dari awal */
        t.classList.add(kelas);
        setTimeout(function () { t.classList.remove(kelas); }, 620);
      })(node[i]);
    }
  }

  /* Bar status seleksi — ditaruh di kolom kanan, DI LUAR meja, supaya
     mengkliknya tidak ikut terhitung sebagai menaruh barang di meja. */
  function bangunPilihanBar() {
    var bar = el('p', 'pilihan-bar');
    bar.id = 'pilihan-bar';
    return bar;
  }

  function renderPilihanBar() {
    var bar = id('pilihan-bar');
    if (!bar) return;
    if (S.pilihan) {
      bar.className = 'pilihan-bar aktif';
      bar.textContent = 'Terpilih: ' + S.pilihan +
        ' \u2014 klik targetnya untuk menaruh. Klik itemnya lagi untuk batal.';
    } else {
      bar.className = 'pilihan-bar';
      bar.textContent = 'Drag item dari rak ke targetnya, atau klik item lalu klik targetnya.';
    }
  }

  /* Ikon centang buat tombol aksi yang sudah dikerjakan. Ikonnya diganti,
     BUKAN teksnya — textContent tombol harus tetap murni labelnya. */
  var IKON_SELESAI = svgKecil(
    '<circle cx="10" cy="10" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M6 10.3l2.7 2.8L14.2 7" fill="none" stroke="currentColor" stroke-width="2"/>');

  function kunciAksi(att) {
    return att.aksi + '|' + att.sumber + '|' + att.target + '|' + (att.label || '');
  }

  function punyaReset(l) {
    if (!l || !l.hasilVisual) return false;
    return daftarVisual(l.hasilVisual).some(function (v) { return v && v.jenis === 'reset'; });
  }

  /* Batas sub-uji = langkah ber-hasilVisual `reset` (langkah itu MEMBUKA
     sub-uji baru, lihat susunan-elementer/biuret). Dipakai buat menghitung
     jatah pemakaian sebuah tombol di sub-uji yang sedang berjalan. */
  function batasSegmen(idx) {
    var lang = S.percobaan.langkah || [];
    var mulai = 0;
    for (var i = 0; i <= idx && i < lang.length; i++) if (punyaReset(lang[i])) mulai = i;
    var habis = lang.length;
    for (var j = mulai + 1; j < lang.length; j++) {
      if (punyaReset(lang[j])) { habis = j; break; }
    }
    return { mulai: mulai, habis: habis };
  }

  /* Berapa kali tombol berkunci `kunci` DIPAKAI oleh sub-uji yang sedang
     berjalan. Diturunkan dari data, bukan dari langkah aktif — kalau dibaca
     dari langkah aktif, tombol yang "hidup lagi tepat pada gilirannya" jadi
     bocoran urutan di mode Ujian. */
  function jatahAksi(kunci) {
    var seg = batasSegmen(S.index);
    var lang = S.percobaan.langkah || [];
    var n = 0;
    for (var i = seg.mulai; i < seg.habis; i++) {
      if (AKSI_TOMBOL.indexOf(lang[i].aksi) === -1) continue;
      if (kunciAksi(lang[i]) === kunci) n++;
    }
    return n;
  }

  /* Tombol yang jatahnya HABIS: centang + redup + dimatikan, jadi jelas
     bedanya "masih perlu diklik" vs "sudah dikerjakan".

     Alat yang dipakai berulang dalam satu prosedur (mis. satu sentrifus
     dipakai 5x di Isolasi DNA) TIDAK boleh mati setelah pemakaian pertama —
     jatahnya dihitung dari berapa kali langkah sub-uji ini memakainya. Untuk
     tombol sekali-pakai hasilnya identik dengan perilaku lama. Kalau kuncinya
     tidak dipakai sub-uji ini sama sekali (jatah 0), perilaku lama juga
     dipertahankan: sekali dipakai, tetap bertanda sudah. */
  function renderTombolAksi() {
    var tombol = document.querySelectorAll('[data-kunci-aksi]');
    for (var i = 0; i < tombol.length; i++) {
      var b = tombol[i];
      var dipakai = S.aksiSelesai[b.dataset.kunciAksi] || 0;
      var sudah = dipakai > 0 && dipakai >= jatahAksi(b.dataset.kunciAksi);
      b.classList.toggle('aksi-berulang', !sudah && jatahAksi(b.dataset.kunciAksi) > 1);
      if (sudah === b.classList.contains('aksi-selesai')) continue;
      b.classList.toggle('aksi-selesai', sudah);
      b.disabled = sudah;
      b.title = sudah ? 'Sudah dilakukan' : '';
      var ikon = b.querySelector('.aksi-ikon');
      if (ikon) {
        ikon.innerHTML = sudah ? IKON_SELESAI
          : (IKON_AKSI[b.dataset.aksiAsli] || IKON_AKSI.tindakan);
      }
    }
  }

  function fmtTakaran(t) {
    if (!t) return '-';
    /* koma desimal, bukan titik — "12,5 µL" seperti di buku praktikum. Angka
       bulat tidak berubah, jadi room biokimia tidak tersentuh. Nilai di INPUT
       tetap bertitik: itu syarat <input type="number">. */
    var n = String(t.nilai).replace('.', ',');
    return n + (t.satuan === '%' ? '%' : ' ' + t.satuan);
  }

  /* "Siap dituang" = nilai yang AKAN dipakai kalau reagen dituang sekarang.
     Tampil di panel takaran DAN sebagai badge di bawah tabung, supaya user
     tidak perlu menebak apakah angkanya sudah "kesimpan". */
  function renderSiapTuang() {
    if (!S) return;
    var teks = 'Siap dituang: ' + fmtTakaran(S.takaran);
    var panel = id('takaran-siap');
    if (panel) panel.textContent = teks;
    var badge = id('takaran-siap-badge');
    if (badge) badge.textContent = teks;
  }

  /* ================================================================
     UPDATE TAMPILAN
     ================================================================ */
  var timerFeedback = null;

  function feedback(jenis, teks) {
    var n = id('feedback');
    if (!n) return;
    n.className = 'feedback feedback-' + jenis + ' tampil';
    n.textContent = teks;
    if (timerFeedback) clearTimeout(timerFeedback);
    timerFeedback = setTimeout(function () {
      n.classList.remove('tampil');
    }, 3200);
  }

  function update() {
    if (!S) return;
    var total = S.percobaan.langkah.length;
    var l = langkahAktif();

    id('skor-nilai').textContent = String(Math.round(S.skor));
    id('benar-nilai').textContent = String(S.benar);

    /* Ujian: progress per-langkah & panduan langkah disembunyikan total —
       jumlah langkah tidak boleh bocor. Penghitung aksi benar sebagai gantinya. */
    id('kotak-benar').hidden = !ujian();
    id('progress').hidden = ujian();
    id('langkah-head').hidden = ujian();

    /* heading babak (sub-uji) — bagian dari panduan, jadi Belajar saja */
    var bb = id('babak');
    var adaBabak = !ujian() && !!(l && l.babak);
    bb.hidden = !adaBabak;
    bb.textContent = adaBabak ? l.babak : '';

    if (!ujian()) {
      id('progress-isi').style.width = Math.round((S.index / total) * 100) + '%';
      if (l) {
        id('langkah-judul').textContent =
          'Langkah ' + (S.index + 1) + ' dari ' + total + ' · aksi: ' + l.aksi;
        id('langkah-instruksi').textContent = l.instruksi;
      } else {
        id('langkah-judul').textContent = 'Selesai · ' + total + ' langkah';
        id('langkah-instruksi').textContent = '';
      }
    }

    /* Belajar: safety langkah aktif. Ujian: baris ini mati total — isinya
       sudah dipindah ke panel "Keselamatan" umum di kolom kiri. */
    var sf = id('safety');
    var adaSafety = !ujian() && !!(l && l.safety);
    sf.hidden = !adaSafety;
    sf.textContent = adaSafety ? 'Safety: ' + l.safety : '';

    /* panel takaran hanya relevan kalau langkah aktif menuntut takaran
       (room yang datanya tidak pernah bertakaran tidak punya panel ini) */
    if (pakaiTakaran()) {
      var perluTakaran = !!(l && l.takaranBenar);
      id('kotak-takaran').classList.toggle('kotak-mati', !perluTakaran);
      id('kotak-takaran').classList.toggle('kotak-siap', perluTakaran);
      id('takaran-nilai').value = String(S.takaran.nilai);
      var unit = id('takaran-unit').children;
      for (var i = 0; i < unit.length; i++) {
        unit[i].classList.toggle('aktif', unit[i].dataset.satuan === S.takaran.satuan);
      }
    }

    /* pilihan item (mode klik-klik) */
    var items = document.querySelectorAll('.item');
    for (var k = 0; k < items.length; k++) {
      items[k].classList.toggle('item-dipilih', items[k].dataset.sumber === S.pilihan);
    }
    tandaiTargetSiap(!!S.pilihan);
    renderPilihanBar();
    renderTombolAksi();
    renderSiapTuang();

    renderAreaKerja();
  }

  function renderAreaKerja() {
    if (prosedur()) return renderAreaProsedur();
    var adaTabung = S.alat.indexOf('Tabung reaksi') !== -1;
    id('slot-kosong').hidden = adaTabung;
    id('tabung').hidden = !adaTabung;
    id('stasiun-nama').hidden = !adaTabung;

    /* sprite pembakar: padam / menyala / api dibesarkan saat memanaskan */
    var pembakar = id('pembakar');
    if (pembakar) {
      pembakar.classList.toggle('menyala', !!S.api);
      pembakar.classList.toggle('dipanaskan', !!S.panas);
    }

    /* Padatan (gram) & bahan "secukupnya" tanpa takaran tidak menaikkan
       volume, tapi tabungnya jelas berisi — beri lapisan tipis supaya warna
       hasil (mis. arang hitam) tetap kelihatan. */
    var tinggi = Math.min(88, S.volume * 14);
    if (tinggi < 12 && S.isi.length) tinggi = 12;
    var cairan = id('cairan');
    cairan.style.height = tinggi + '%';
    cairan.style.background = S.warna;

    var endapan = id('endapan');
    endapan.hidden = !S.endapan;
    /* backgroundColor, bukan shorthand background — biar tekstur & garis
       kontras dari CSS tidak ketimpa (endapan putih di tabung putih). */
    if (S.endapan) endapan.style.backgroundColor = S.endapan;

    id('gelembung').hidden = !S.gas;

    var lakmus = id('lakmus');
    lakmus.hidden = !S.lakmus;
    if (S.lakmus) id('lakmus-kertas').style.backgroundColor = S.lakmus;

    var badge = id('badge-baris');
    badge.innerHTML = '';
    if (S.api) badge.appendChild(el('span', 'badge', 'Api menyala'));
    if (S.panas) badge.appendChild(el('span', 'badge', 'Sedang dipanaskan'));
    if (S.lakmus) badge.appendChild(el('span', 'badge', 'Lakmus: ' + namaWarna(S.lakmus)));
    /* takaran yang akan dituang, tepat di bawah tabung — nilainya kelihatan
       tanpa harus melirik ke kolom seberang */
    var la = langkahAktif();
    if (la && la.takaranBenar) {
      var siap = el('span', 'badge badge-siap', 'Siap dituang: ' + fmtTakaran(S.takaran));
      siap.id = 'takaran-siap-badge';
      badge.appendChild(siap);
    }
    if (S.volume > 0) {
      badge.appendChild(el('span', 'badge badge-samar', 'Isi tabung: ' + S.isi.join(' + ')));
    }

    renderCatatan();
  }

  /* Room prosedur: bagian yang sudah dipasang muncul TERPASANG di propnya,
     plus caption kecil per prop sebagai keterangan (dan fallback kalau
     propnya cuma kotak). Semua diturunkan dari S.pasang — tidak ada state
     baru, jadi validasi/urutan/skor tidak tersentuh. */
  function renderAreaProsedur() {
    var zona = document.querySelectorAll('[data-zona-isi]');
    for (var i = 0; i < zona.length; i++) {
      var nama = zona[i].dataset.zonaIsi;
      var isi = S.pasang[nama] || [];
      zona[i].innerHTML = '';
      if (!isi.length) {
        zona[i].appendChild(el('span', 'zona-kosong', 'kosong'));
      } else {
        isi.forEach(function (n) { zona[i].appendChild(el('span', 'badge', n)); });
      }
    }

    /* tinggi cairan tiap zona bertabung/berkolom. Skala dihitung dari DATA
       (kapasitas = total takaran yang pernah masuk zona itu menurut langkah),
       supaya µL dan cc sama-sama terbaca tanpa angka ajaib per room. */
    var cair = document.querySelectorAll('[data-zona-cairan]');
    for (var c = 0; c < cair.length; c++) {
      var zn = cair[c].dataset.zonaCairan;
      var vol = S.volumeZona[zn] || 0;
      var kap = kapasitasZona(zn);
      var tg = kap > 0 ? Math.min(88, (vol / kap) * 80) : 0;
      /* Zona yang menurut data memang tidak pernah menerima takaran (kap = 0)
         tapi kemasukan barang: beri lapisan tipis, aturan yang sama dengan
         room kimia. Zona bertakaran TIDAK kena aturan ini — kalau kena, tabung
         yang isinya sudah dipindahkan akan terlihat menyisakan cairan. */
      if (kap === 0 && (S.pasang[zn] || []).length) tg = 10;
      cair[c].style.height = tg + '%';
      /* reagen biomolekuler tak berwarna -> WARNA_BENING; kalau data punya
         hasilVisual warna, S.warna sudah menyimpannya dan itu yang dipakai.
         Zona yang sudah menerima eluat memakai warna eluatnya — itu produk
         akhir yang harus kelihatan, bukan cairan biasa. */
      /* Warna zona ini sendiri; kalau belum pernah diwarnai, bening. S.warna
         yang global sengaja TIDAK dipakai di sini — di room prosedur ada
         banyak tabung, dan mewarnai semuanya sekaligus itu salah. */
      var eluat = S.eluat[zn];
      /* backgroundColor, BUKAN shorthand `background`: kelas .cairan-dna
         menaruh tekstur lewat background-image, dan shorthand inline akan
         menghapusnya. Pola yang sama sudah dipakai .endapan di room kimia. */
      cair[c].style.backgroundColor = eluat || S.warnaZona[zn] || WARNA_BENING;
      cair[c].classList.toggle('cairan-dna', !!eluat);
    }

    /* deposit yang menempel di membran kolom */
    var mem = document.querySelectorAll('[data-zona-membran]');
    for (var m2 = 0; m2 < mem.length; m2++) {
      var warnaMem = S.membran[mem[m2].dataset.zonaMembran];
      mem[m2].hidden = !warnaMem;
      if (warnaMem) mem[m2].style.backgroundColor = warnaMem;
    }

    /* kolom spin: tabung mana yang sedang ditumpanginya */
    var duduk = document.querySelectorAll('[data-zona-duduk]');
    for (var d2 = 0; d2 < duduk.length; d2++) {
      var zd = duduk[d2].dataset.zonaDuduk;
      var di = (S.penampung && S.penampung !== zd &&
                jenisProp(S.penampung) === 'tabung') ? S.penampung : '';
      duduk[d2].hidden = !di;
      duduk[d2].textContent = di ? 'duduk di: ' + di : '';
    }

    /* caption status zona tabung + sorotan zona penampung */
    var tag = document.querySelectorAll('[data-zona-tag]');
    for (var t2 = 0; t2 < tag.length; t2++) {
      var zt = tag[t2].dataset.zonaTag;
      var teksTag = S.eluat[zt] ? 'DNA murni'
        : S.membran[zt] ? 'DNA terikat di membran'
        : (S.penampung === zt ? 'penampung' : '');
      tag[t2].hidden = !teksTag;
      tag[t2].textContent = teksTag;
      var propT = propZona(zt);
      if (propT) {
        propT.classList.toggle('zona-penampung', S.penampung === zt && !S.eluat[zt]);
        propT.classList.toggle('zona-produk', !!S.eluat[zt]);
        propT.classList.toggle('zona-terikat', !!S.membran[zt]);
      }
    }

    var diAlat = isiJenis('alat');

    /* baterai terpasang di kompartemen */
    var bat = id('alat-baterai');
    if (bat) bat.hidden = !adaKata(diAlat, 'baterai');

    /* strip yang sedang tercolok = strip terakhir yang dimasukkan ke alat */
    var strip = id('alat-strip');
    if (strip) {
      var stripAktif = terakhirBerkata(diAlat, 'strip');
      strip.hidden = !stripAktif;
      strip.title = stripAktif || '';
      var darah = id('alat-darah');
      /* darah menetes ke strip = target ber-kata-kunci "strip" sudah diisi */
      if (darah) darah.hidden = !(stripAktif && isiJenis('strip').length);
    }

    /* layar alat mengikuti pengamatan terakhir */
    var layar = id('alat-layar');
    if (layar) {
      var baca = bacaLayar();
      layar.innerHTML = '';
      layar.classList.toggle('layar-nyala', !!baca);
      if (baca && baca.teks) {
        layar.appendChild(el('span', 'layar-teks', baca.teks));
      } else if (baca) {
        var tetes = el('span', 'layar-tetes');
        tetes.innerHTML = SVG_TETES;
        layar.appendChild(tetes);
      }
    }

    /* lanset terpasang di pen */
    var lansetIsi = id('lanset-isi');
    if (lansetIsi) {
      var adaLanset = adaKata(isiJenis('lanset'), 'lanset');
      lansetIsi.hidden = !adaLanset;
      id('lanset-jarum').hidden = !adaLanset;
    }

    /* jari sudah diusap alkohol */
    var swab = id('jari-swab');
    if (swab) swab.hidden = !adaKata(isiJenis('jari'), 'swab') &&
                            !adaKata(isiJenis('jari'), 'alkohol');

    renderGel();
    renderCatatan();
  }

  function renderCatatan() {
    var cat = id('catatan');
    cat.innerHTML = '';
    S.catatan.forEach(function (t) { cat.appendChild(el('li', null, t)); });
  }

  /* ================================================================
     GEL ELEKTROFORESIS — satu-satunya hasilVisual yang menggambar ADEGAN,
     bukan mengubah warna cairan.

     Spesifikasinya data:
       { jenis:'gel', nilai:{ lajur:[
           { nama, jenis:'marker', pita:[300,250,...] },
           { nama, genotipe:'Heterozigot', pita:[211,131,80] } ]}}

     Posisi pita dihitung dari UKURAN bp pada SKALA LOG — itu memang perilaku
     migrasi elektroforesis: fragmen besar tertahan matriks agarose dan tinggal
     dekat sumur, fragmen kecil melaju jauh. Skalanya diambil dari rentang bp
     yang benar-benar ada di gel ini (diberi padding), jadi engine tidak perlu
     hafal angka room manapun. Ini murni PENGGAMBARAN: tidak ada yang dihitung
     soal kimia/biologinya — pita mana yang muncul tetap ditulis data.
     ================================================================ */
  var GEL_W = 320, GEL_H = 232;
  var GEL_ATAS = 34, GEL_BAWAH = 182;   /* rentang-y tempat pita boleh jatuh */

  function bpGel(spec) {
    var out = [];
    ((spec && spec.lajur) || []).forEach(function (l) {
      (l.pita || []).forEach(function (bp) {
        var n = Number(bp);
        if (n > 0) out.push(n);
      });
    });
    return out;
  }

  /* peta ukuran bp -> koordinat y. Dikembalikan sebagai fungsi supaya skalanya
     dihitung sekali per gel, bukan per pita. */
  function skalaGel(spec) {
    var semua = bpGel(spec);
    if (!semua.length) return null;
    var hi = Math.log(Math.max.apply(null, semua));
    var lo = Math.log(Math.min.apply(null, semua));
    var rentang = (hi - lo) || Math.log(2);
    hi += rentang * 0.18;              /* padding supaya pita tidak menempel tepi */
    lo -= rentang * 0.18;
    return function (bp) {
      var t = (hi - Math.log(Number(bp))) / (hi - lo);
      if (t < 0) t = 0; else if (t > 1) t = 1;
      return GEL_ATAS + t * (GEL_BAWAH - GEL_ATAS);
    };
  }

  function ringkasGel(spec) {
    var lajur = (spec && spec.lajur) || [];
    var bagian = [];
    lajur.forEach(function (l) {
      if (l.jenis === 'marker') return;   /* marker itu penggaris, bukan hasil */
      var pita = (l.pita || []).join(', ');
      bagian.push('Lajur ' + (l.nama || 'sampel') + ' menunjukkan ' +
        (l.pita || []).length + ' pita (' + pita + ' bp)' +
        (l.genotipe ? ' \u2014 ' + l.genotipe : '') + '.');
    });
    return bagian.length ? bagian.join(' ') : 'Gel divisualisasi.';
  }

  function svgGel(spec) {
    var lajur = (spec && spec.lajur) || [];
    var y = skalaGel(spec);
    if (!lajur.length || !y) return '';

    var kiri = 12, kanan = GEL_W - 12;
    var lebarLajur = (kanan - kiri) / lajur.length;
    var lebarPita = Math.min(70, lebarLajur - 26);

    var isi =
      '<rect class="gel-kaca" x="' + kiri + '" y="10" width="' + (kanan - kiri) +
        '" height="' + (GEL_BAWAH + 14 - 10) + '" rx="3"/>';

    lajur.forEach(function (l, i) {
      var cx = kiri + lebarLajur * (i + 0.5);
      var x = cx - lebarPita / 2;
      var marker = l.jenis === 'marker';

      /* sumur tempat sampel dimuat */
      isi += '<rect class="gel-sumur" x="' + (x + lebarPita * 0.18) + '" y="16" width="' +
        (lebarPita * 0.64) + '" height="8"/>';

      (l.pita || []).forEach(function (bp) {
        var py = y(bp);
        isi += '<rect class="gel-pita' + (marker ? ' gel-pita-marker' : '') +
          '" data-lajur="' + (l.nama || '') + '" data-bp="' + bp + '" data-y="' +
          (Math.round(py * 10) / 10) + '" x="' + x + '" y="' + (py - 3) +
          '" width="' + lebarPita + '" height="6" rx="2"/>';
        if (marker) {
          isi += '<text class="gel-ukuran" x="' + (x + lebarPita + 5) + '" y="' + (py + 3) +
            '">' + bp + '</text>';
        }
      });

      isi += '<text class="gel-lajur-nama" x="' + cx + '" y="' + (GEL_BAWAH + 32) +
        '" text-anchor="middle">' + l.nama + '</text>';
      if (l.genotipe) {
        isi += '<text class="gel-genotipe" x="' + cx + '" y="' + (GEL_BAWAH + 46) +
          '" text-anchor="middle">' + l.genotipe + '</text>';
      }
    });

    return '<svg class="gel-svg" viewBox="0 0 ' + GEL_W + ' ' + GEL_H +
      '" role="img" aria-label="Hasil elektroforesis gel">' + isi + '</svg>';
  }

  /* Room ini memakai gel atau tidak — dari data, bukan dari nama room. */
  function punyaGel() {
    return (S.percobaan.langkah || []).some(function (l) {
      return l.hasilVisual && daftarVisual(l.hasilVisual).some(function (v) {
        return v && v.jenis === 'gel';
      });
    });
  }

  function bangunPanelGel() {
    var kotak = el('div', 'gel-panel');
    kotak.id = 'gel-panel';
    kotak.hidden = true;
    kotak.appendChild(el('p', 'gel-judul', 'Gel doc / UV transilluminator'));
    var gambar = el('div', 'gel-gambar');
    gambar.id = 'gel-gambar';
    kotak.appendChild(gambar);
    return kotak;
  }

  function renderGel() {
    var panel = id('gel-panel');
    if (!panel) return;
    panel.hidden = !S.gel;
    var gambar = id('gel-gambar');
    if (!gambar) return;
    var tanda = S.gel ? JSON.stringify(S.gel) : '';
    if (gambar.dataset.tanda === tanda) return;   /* tidak berubah, jangan gambar ulang */
    gambar.dataset.tanda = tanda;
    gambar.innerHTML = S.gel ? svgGel(S.gel) : '';
  }

  /* ---------- layar selesai ---------- */
  function tampilkanSelesai() {
    var box = id('selesai');
    box.innerHTML = '';
    box.hidden = false;

    box.appendChild(el('h2', 'selesai-judul', 'Percobaan selesai'));

    /* HASIL PRAKTIKUM — dirangkai dari pengamatan yang benar-benar muncul
       (hasilVisual) lalu disambung ke interpretasiAkhir. Tampil di DUA mode. */
    var hasil = el('div', 'hasil');
    hasil.appendChild(el('h3', 'hasil-label', 'Hasil praktikum'));
    hasil.appendChild(el('p', 'hasil-teramati',
      'Teramati: ' + (S.catatan.length ? S.catatan.join(' ') : 'tidak ada perubahan yang tercatat.')));
    /* Kalau percobaannya menghasilkan gel, blok Hasil menampilkan GAMBARNYA —
       bukan cuma kalimat. Di room ini gambar itulah buktinya. */
    if (S.gel) {
      var gel = el('div', 'hasil-gel');
      gel.id = 'hasil-gel';
      gel.innerHTML = svgGel(S.gel);
      hasil.appendChild(gel);
    }
    hasil.appendChild(el('p', 'hasil-tafsir', '→ ' + S.percobaan.interpretasiAkhir));
    box.appendChild(hasil);

    var skor = el('p', 'selesai-skor');
    skor.appendChild(el('span', 'selesai-angka', String(Math.round(S.skor))));
    skor.appendChild(el('span', 'selesai-maks', '/ ' + SKOR_MAKS + ' · mode ' + S.mode +
      ' · aksi benar ' + S.benar + ', salah ' + S.kesalahan.length));
    box.appendChild(skor);

    box.appendChild(el('h3', 'kotak-judul', 'Rekap kesalahan'));
    if (!S.kesalahan.length) {
      box.appendChild(el('p', 'kotak-isi', 'Tidak ada aksi salah. Bersih.'));
    } else {
      var ul = el('ul', 'rekap');
      S.kesalahan.forEach(function (k) {
        var li = el('li');
        li.appendChild(el('strong', null, 'Langkah ' + k.langkah + ': '));
        li.appendChild(document.createTextNode(k.pesan));
        li.appendChild(el('span', 'rekap-instruksi', k.instruksi));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }

    var aksi = el('div', 'selesai-aksi');
    var idPercobaan = S.percobaan.id, modeSekarang = S.mode;
    var ulang = el('button', 'tombol', 'Ulangi (' + modeSekarang + ')');
    ulang.type = 'button';
    ulang.addEventListener('click', function () { bukaRoom(idPercobaan, modeSekarang); });
    var ganti = el('button', 'tombol', 'Ganti mode');
    ganti.type = 'button';
    ganti.addEventListener('click', function () { bukaPemilihMode(idPercobaan); });
    var menu = el('button', 'tombol tombol-kecil', 'Kembali ke daftar room');
    menu.type = 'button';
    menu.addEventListener('click', keMenu);
    aksi.appendChild(ulang);
    aksi.appendChild(ganti);
    aksi.appendChild(menu);
    box.appendChild(aksi);

    box.scrollIntoView({ block: 'nearest' });
  }

  /* ---------- batal pilihan kalau klik di luar ---------- */
  document.addEventListener('click', function (e) {
    if (!S || !S.pilihan) return;
    if (!e.target || !e.target.closest) return;
    if (e.target.closest('.item') || e.target.closest('[data-target]')) return;
    if (e.target.closest('.pilihan-bar')) return;
    S.pilihan = null;
    update();
  });

  renderMenu();
})();
