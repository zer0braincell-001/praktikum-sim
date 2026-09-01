/* biuret.js — data percobaan "Reaksi Biuret".
   Takaran & cara kerja: Buku Petunjuk Praktikum Biokimia Blok 1.1.
   Hasil visual di sini SCRIPTED, bukan dihitung engine.

   DUA SUB-UJI dalam satu array `langkah`, dikelompokkan pakai field `babak`
   (mekanik yang sama dengan susunan-elementer.js):
     Sub-uji 1 — uji ikatan peptida pada albumin (versi lama, tidak diubah).
     Sub-uji 2 — biuret dari urea (Buku 2.4): urea dipanaskan sampai mencair
                 dan melepas amonia, sisanya = biuret, lalu diuji CuSO4/NaOH.
   Tiap sub-uji dibuka langkah "siapkan tabung" ber-hasilVisual {jenis:'reset'}:
   isi tabung dibuang, api dimatikan, dan riwayat urutan (belum/sudah di
   salahUmum) dinilai ulang dari nol. Tabungnya sendiri tetap di meja.

   Karena sub-uji 2 punya langkah nyalakan/panaskan, room ini sekarang otomatis
   dapat sprite pembakar spiritus di panggung (engine menyimpulkannya dari data,
   tanpa flag). Sprite-nya ada sepanjang room, apinya baru menyala di sub-uji 2.

   Skema langkah:
   { babak?, instruksi, aksi:"drag"|"pilih-takaran"|"nyalakan"|"panaskan"|"amati",
     sumber, target, takaranBenar?, hasilVisual?:{jenis,nilai}, safety?,
     salahUmum?:[{jika,pesan}] }

   Kondisi `jika` yang dimengerti engine (semua opsional, digabung AND):
     aksi, sumber, target        -> harus sama dengan aksi yang dicoba user
     takaran: "salah"            -> takaran user beda dari takaranBenar langkah pemilik aturan
     belum: [nama bahan/alat]    -> bahan/alat tsb BELUM dipakai di sub-uji ini
     sudah: [nama bahan/alat]    -> bahan/alat tsb SUDAH dipakai di sub-uji ini
   Nama di `sumber`/`target`/`belum`/`sudah` = string persis dari alatBahan.

   Catatan aturan urutan: engine memindai salahUmum SELURUH langkah, urut dari
   atas, dan pemenang pertama yang dipakai. Karena NaOH & CuSO4 dipakai di DUA
   sub-uji, aturan urutan milik sub-uji 1 diberi `belum: ['Urea']` supaya dia
   berhenti berlaku begitu masuk sub-uji urea — kalau tidak, salah urut di
   sub-uji 2 dijawab "Albumin dulu", yang menyesatkan di situ. Di sub-uji 1
   syarat itu selalu terpenuhi (urea tidak pernah dipakai), jadi perilaku
   sub-uji 1 sama persis seperti sebelumnya. */

(function () {
  'use strict';

  var B1 = 'Sub-uji 1 — Uji ikatan peptida (albumin)';
  var B2 = 'Sub-uji 2 — Biuret dari urea';

  window.PRAKTIKUM = window.PRAKTIKUM || [];

  window.PRAKTIKUM.push({
    id: 'biuret',
    nama: 'Reaksi Biuret',

    dasarTeoriRingkas:
      'Uji ikatan peptida. Larutan CuSO4 dalam suasana basa (alkalis) + protein → ' +
      'warna ungu/lembayung = positif. Urea yang dipanaskan melepas amonia dan ' +
      'membentuk biuret, yang juga punya ikatan seperti peptida — jadi ikut positif.',

    alatBahan: [
      { nama: 'Tabung reaksi',        jumlah: '1 buah' },
      { nama: 'Larutan albumin 2%',   jumlah: '2 cc' },
      { nama: 'Larutan NaOH 10%',     jumlah: '2 cc' },
      { nama: 'Larutan CuSO4',        jumlah: '1 tetes (maksimum 10 tetes)' },
      { nama: 'Urea',                 jumlah: 'secukupnya (sedikit)' },
      { nama: 'Pembakar spiritus',    jumlah: '1 buah' },
      { nama: 'Aquadest',             jumlah: '2 cc' }
    ],

    langkah: [

      /* ============ SUB-UJI 1 — ikatan peptida pada albumin ============ */
      {
        babak: B1,
        instruksi: 'Siapkan tabung reaksi: letakkan satu tabung reaksi bersih dan kering di area kerja.',
        aksi: 'drag',
        sumber: 'Tabung reaksi',
        target: 'Meja kerja',
        hasilVisual: { jenis: 'reset' },
        safety: 'Periksa tabung: tidak retak, bersih, kering. Tabung basah mengencerkan reagen dan mengaburkan hasil.'
      },
      {
        babak: B1,
        instruksi: 'Masukkan 2 cc larutan albumin 2% ke dalam tabung reaksi.',
        aksi: 'pilih-takaran',
        sumber: 'Larutan albumin 2%',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 2, satuan: 'cc' },
        salahUmum: [
          {
            jika: { sumber: 'Larutan albumin 2%', takaran: 'salah' },
            pesan: 'Takaran albumin tidak tepat. Buku praktikum: 2 cc albumin 2%.'
          }
        ]
      },
      {
        babak: B1,
        instruksi: 'Tambahkan 2 cc larutan NaOH 10% ke dalam tabung, lalu campur perlahan.',
        aksi: 'pilih-takaran',
        sumber: 'Larutan NaOH 10%',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 2, satuan: 'cc' },
        safety: 'NaOH 10% kaustik. Kena kulit/mata bikin luka bakar — tuang menjauh dari badan, jangan dihirup.',
        salahUmum: [
          {
            /* `belum: ['Urea']` = aturan ini khusus sub-uji albumin; di sub-uji
               urea dia diam supaya pesannya tidak salah alamat. */
            jika: { sumber: 'Larutan NaOH 10%', belum: ['Larutan albumin 2%', 'Urea'] },
            pesan: 'Albumin dulu. NaOH ditambahkan KE larutan protein, bukan sebaliknya.'
          },
          {
            jika: { sumber: 'Larutan NaOH 10%', takaran: 'salah' },
            pesan: 'Takaran NaOH tidak tepat. Buku praktikum: 2 cc NaOH 10%. Konsentrasi harus 10%.'
          }
        ]
      },
      {
        babak: B1,
        instruksi: 'Teteskan larutan CuSO4 sebanyak 1 tetes, kocok perlahan. Maksimum 10 tetes.',
        aksi: 'pilih-takaran',
        sumber: 'Larutan CuSO4',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 1, satuan: 'tetes' },
        hasilVisual: { jenis: 'warna', nilai: '#6b2d8f' }, /* ungu/lembayung */
        salahUmum: [
          {
            jika: { sumber: 'Larutan CuSO4', belum: ['Larutan NaOH 10%', 'Urea'] },
            pesan: 'CuSO4 harus setelah suasana basa (NaOH ditambahkan dulu).'
          },
          {
            jika: { sumber: 'Larutan CuSO4', takaran: 'salah' },
            pesan: 'CuSO4 diteteskan 1 tetes dulu (maksimum 10 tetes). Kelebihan CuSO4 bikin biru pekat yang menutupi warna ungu.'
          }
        ]
      },
      {
        babak: B1,
        instruksi: 'Amati warna larutan. Ungu/lembayung = positif ada ikatan peptida.',
        aksi: 'amati',
        sumber: 'Pengamatan visual',
        target: 'Tabung reaksi',
        hasilVisual: { jenis: 'teks', nilai: 'Warna ungu/lembayung stabil — uji Biuret POSITIF.' }
      },

      /* ============ SUB-UJI 2 — biuret dari urea (Buku 2.4) ============ */
      {
        babak: B2,
        instruksi: 'Ambil tabung reaksi bersih dan KERING yang baru untuk uji urea.',
        aksi: 'drag',
        sumber: 'Tabung reaksi',
        target: 'Meja kerja',
        hasilVisual: { jenis: 'reset' },
        safety: 'Jangan pakai tabung bekas sub-uji albumin — sisa CuSO4 bikin warna palsu. Tabung harus kering karena akan dipanaskan langsung.'
      },
      {
        babak: B2,
        instruksi: 'Masukkan sedikit urea ke dalam tabung reaksi (tanpa ditimbang).',
        aksi: 'drag',
        sumber: 'Urea',
        target: 'Tabung reaksi',
        salahUmum: [
          {
            jika: { sumber: 'Urea', belum: ['Tabung reaksi'] },
            pesan: 'Siapkan dulu tabung bersih di area kerja, baru masukkan ureanya.'
          }
        ]
      },
      {
        babak: B2,
        instruksi: 'Nyalakan pembakar spiritus.',
        aksi: 'nyalakan',
        sumber: 'Pembakar spiritus',
        target: 'Meja kerja',
        safety: 'Nyalakan dari samping pakai korek panjang, jangan condongkan wajah ke atas sumbu.'
      },
      {
        babak: B2,
        instruksi: 'Panaskan tabung sampai urea mencair dan timbul gelembung gas. Hentikan sebelum mengarang.',
        aksi: 'panaskan',
        sumber: 'Pembakar spiritus',
        target: 'Tabung reaksi',
        hasilVisual: [
          { jenis: 'gas' },
          {
            jenis: 'teks',
            nilai: 'Urea mencair, timbul gelembung gas & bau amonia (hati-hati jangan sampai mengarang).'
          }
        ],
        safety: 'Panaskan hati-hati sambil digoyang, mulut tabung diarahkan menjauh dari orang. Amonia menyengat — jangan dihirup langsung.',
        salahUmum: [
          {
            jika: { aksi: 'panaskan', belum: ['Pembakar spiritus'] },
            pesan: 'Nyalakan pembakar dulu.'
          },
          {
            jika: { aksi: 'panaskan', belum: ['Urea'] },
            pesan: 'Masukkan ureanya dulu ke tabung — tidak ada yang perlu dipanaskan.'
          }
        ]
      },
      {
        babak: B2,
        instruksi: 'Dinginkan sebentar, lalu larutkan sisa peleburan dengan 2 cc aquadest.',
        aksi: 'pilih-takaran',
        sumber: 'Aquadest',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 2, satuan: 'cc' },
        hasilVisual: { jenis: 'teks', nilai: 'Dilarutkan dengan aquadest.' },
        safety: 'Jangan tuang air ke tabung yang masih panas membara — tunggu dingin dulu, kalau tidak bisa memercik.',
        salahUmum: [
          {
            jika: { sumber: 'Aquadest', belum: ['Urea'] },
            pesan: 'Urea dulu ke tabung dan dipanaskan, baru sisanya dilarutkan.'
          },
          {
            jika: { sumber: 'Aquadest', belum: ['Pembakar spiritus'] },
            pesan: 'Ureanya harus dipanaskan dulu sampai jadi biuret, baru dilarutkan.'
          },
          {
            jika: { sumber: 'Aquadest', takaran: 'salah' },
            pesan: 'Takaran aquadest tidak tepat. Pakai 2 cc — kebanyakan air bikin warna ungunya terlalu encer untuk dibaca.'
          }
        ]
      },
      {
        babak: B2,
        instruksi: 'Tambahkan 2 cc larutan NaOH 10% ke dalam tabung.',
        aksi: 'pilih-takaran',
        sumber: 'Larutan NaOH 10%',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 2, satuan: 'cc' },
        safety: 'NaOH 10% kaustik. Kena kulit/mata bikin luka bakar — tuang menjauh dari badan, jangan dihirup.',
        salahUmum: [
          {
            jika: { sumber: 'Larutan NaOH 10%', sudah: ['Urea'], belum: ['Aquadest'] },
            pesan: 'Larutkan dulu hasil pemanasan urea dengan aquadest, baru dibuat suasana basa.'
          }
        ]
      },
      {
        babak: B2,
        instruksi: 'Teteskan larutan CuSO4 sebanyak 1 tetes, kocok perlahan.',
        aksi: 'pilih-takaran',
        sumber: 'Larutan CuSO4',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 1, satuan: 'tetes' },
        hasilVisual: { jenis: 'warna', nilai: '#6b2d8f' }, /* ungu/lembayung */
        salahUmum: [
          {
            jika: { sumber: 'Larutan CuSO4', sudah: ['Urea'], belum: ['Larutan NaOH 10%'] },
            pesan: 'CuSO4 setelah suasana basa (NaOH dulu).'
          }
        ]
      },
      {
        babak: B2,
        instruksi: 'Amati warna larutan.',
        aksi: 'amati',
        sumber: 'Pengamatan visual',
        target: 'Tabung reaksi',
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Warna ungu = biuret terbentuk dari urea (positif ikatan peptida).'
        }
      }
    ],

    interpretasiAkhir:
      'Biuret positif (ungu) pada albumin membuktikan ikatan peptida; pada urea, ' +
      'pemanasan membentuk biuret yang juga memberi uji positif. Makin pekat ' +
      'ungunya, makin banyak ikatan peptida.'
  });
})();
