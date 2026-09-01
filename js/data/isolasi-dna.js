/* isolasi-dna.js — data percobaan "Isolasi DNA" (modul Biomedik).
   Angka & urutan verbatim dari kit spin-column High Pure (Roche), 200 µL
   whole blood. Room pertama modul Biomedik; room pertama juga yang
   ber-`tipe:'prosedur'` TAPI memakai takaran (µL).

   Tiga hal yang membedakan room ini dari room biokimia — semuanya sudah
   ditangani engine, tidak ada mekanik baru di file ini:
   1. Satuan `µL` (ditambahkan ke engine di #B1).
   2. Panel Takaran di room `tipe:'prosedur'` — engine memunculkannya karena
      DATA-nya bertakaran, bukan karena tipe room (#B2).
   3. ALAT YANG DIPAKAI BERULANG. Satu tombol "Sentrifugasi 1 menit,
      8.000 × g" dipakai 5x dan "Buang flow-through & Collection Tube" 4x
      sepanjang prosedur. Supaya itu bisa, langkah-langkah tersebut memakai
      kunci tombol yang SAMA PERSIS (aksi + sumber + target + label identik);
      engine menghitung jatah pemakaian tiap tombol dari data ini dan baru
      menguncinya setelah jatahnya habis (#B2 bagian A).

   TIDAK ada hasilVisual `reset` di sini: isi kolom harus LANJUT dari tahap ke
   tahap (DNA tetap terikat di membran). Pengelompokan tahap cukup pakai
   `babak`, yang murni label.

   MEKANIK SPIN-COLUMN yang digambarkan (hasilVisual `ikat-membran` & `elusi`,
   ditambahkan di engine untuk ini): DNA menempel di membran silika begitu
   campuran disentrifugasi, TETAP menempel sepanjang tiga kali pencucian
   (yang lolos ke bawah itu kontaminan, bukan DNA), lalu baru lepas saat
   elusi dan turun ke tabung mikrosentrifuge steril sebagai produk akhir.
   Deposit membran sengaja tidak bisa dihapus sentrifugasi biasa — cuma
   `elusi` yang memindahkannya. Karena itu langkah pencucian TIDAK diberi
   hasilVisual yang menyentuh membran.

   DNA tidak berwarna — jadi tidak ada hasilVisual warna/endapan sama sekali.
   Payoff room ini = penguasaan urutan + ketelitian µL. Bukti visual baru
   muncul nanti di room Elektroforesis. */

(function () {
  'use strict';

  var T1 = 'Tahap 1 — Lisis';
  var T2 = 'Tahap 2 — Pencucian';
  var T3 = 'Tahap 3 — Elusi';

  /* Satu-satunya sumber kebenaran label tombol alat berulang: dipakai
     berkali-kali di bawah, jadi kalau labelnya berubah, dia berubah di semua
     langkah sekaligus dan kunci tombolnya tetap sama. */
  var SPIN = 'Sentrifugasi 1 menit, 8.000 × g';
  var BUANG = 'Buang flow-through & Collection Tube';

  var TABUNG = 'Tabung 1,5 mL';                     /* tabung lisis */
  var PENAMPUNG = 'Tabung mikrosentrifuge steril';  /* penampung eluat = produk akhir */
  var KOLOM = 'High Pure Filter Tube';
  var BLOK = 'Heat block';

  function spin(babak, instruksi, hasilVisual) {
    var l = {
      babak: babak,
      instruksi: instruksi,
      aksi: 'tindakan',
      label: SPIN,
      sumber: 'Mikrosentrifuge',
      target: KOLOM
    };
    if (hasilVisual) l.hasilVisual = hasilVisual;
    return l;
  }

  function buang(babak, instruksi) {
    return {
      babak: babak,
      instruksi: instruksi,
      aksi: 'tindakan',
      label: BUANG,
      sumber: 'Collection Tube',
      target: KOLOM,
      safety: 'Flow-through mengandung sisa darah & buffer kaotropik — buang ke limbah biohazard, jangan ke wastafel.'
    };
  }

  window.PRAKTIKUM = window.PRAKTIKUM || [];

  window.PRAKTIKUM.push({
    id: 'isolasi-dna',
    nama: 'Isolasi DNA',
    tipe: 'prosedur',

    dasarTeoriRingkas:
      'Ekstraksi DNA dari darah dengan kit spin-column (High Pure, Roche). ' +
      'Prinsip: lisis → ikat & cuci → elusi. Hasil = DNA murni, jadi template ' +
      'PCR. DNA tak berwarna — keberhasilan dibuktikan di elektroforesis.',

    alatBahan: [
      { nama: 'Sampel darah',              jumlah: '200 µL' },
      { nama: 'Binding Buffer',            jumlah: '200 µL' },
      { nama: 'Proteinase K',              jumlah: '40 µL' },
      { nama: 'Isopropanol',               jumlah: '100 µL' },
      { nama: 'Inhibitor Removal Buffer',  jumlah: '500 µL' },
      { nama: 'Wash Buffer',               jumlah: '500 µL (dipakai 2×)' },
      { nama: 'Elution Buffer',            jumlah: '200 µL' },
      { nama: 'High Pure Filter Tube',     jumlah: '1 buah' },
      { nama: 'Tabung mikrosentrifuge 1,5 mL', jumlah: '2 buah steril (1 lisis, 1 penampung)' }
    ],

    langkah: [

      /* ==================== TAHAP 1 — LISIS ==================== */
      {
        babak: T1,
        instruksi: 'Masukkan 200 µL sampel darah ke tabung mikrosentrifuge 1,5 mL.',
        aksi: 'pilih-takaran',
        sumber: 'Sampel darah',
        target: TABUNG,
        takaranBenar: { nilai: 200, satuan: 'µL' },
        safety: 'Darah = bahan infeksius. Pakai sarung tangan & jas lab, buang ke limbah biohazard.',
        salahUmum: [
          {
            jika: { sumber: 'Sampel darah', takaran: 'salah' },
            pesan: 'Takaran sampel tidak tepat. Protokol High Pure: 200 µL whole blood.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Tambahkan 200 µL Binding Buffer ke tabung.',
        aksi: 'pilih-takaran',
        sumber: 'Binding Buffer',
        target: TABUNG,
        takaranBenar: { nilai: 200, satuan: 'µL' },
        safety: 'Binding Buffer mengandung garam kaotropik (iritan). Hindari kontak kulit & mata.',
        salahUmum: [
          {
            jika: { sumber: 'Binding Buffer', belum: ['Sampel darah'] },
            pesan: 'Sampel darah dulu ke tabung. Buffer ditambahkan KE sampel.'
          },
          {
            jika: { sumber: 'Binding Buffer', takaran: 'salah' },
            pesan: 'Takaran Binding Buffer tidak tepat. Protokol: 200 µL.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Tambahkan 40 µL Proteinase K ke tabung.',
        aksi: 'pilih-takaran',
        sumber: 'Proteinase K',
        target: TABUNG,
        takaranBenar: { nilai: 40, satuan: 'µL' },
        salahUmum: [
          {
            jika: { sumber: 'Proteinase K', belum: ['Sampel darah'] },
            pesan: 'Sampel darah dulu ke tabung.'
          },
          {
            jika: { sumber: 'Proteinase K', takaran: 'salah' },
            pesan: 'Takaran Proteinase K tidak tepat. Protokol: 40 µL. Volumenya paling kecil di tahap ini — jangan tertukar dengan buffer.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Campur segera (vortex/pipetting), lalu inkubasi 70 °C selama 10 menit.',
        aksi: 'tindakan',
        label: 'Campur & inkubasi 70°C, 10 menit',
        sumber: TABUNG,
        target: TABUNG,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Sel darah lisis; protein dicerna Proteinase K. Larutan menjadi jernih kecoklatan.'
        },
        salahUmum: [
          {
            jika: { label: 'Campur & inkubasi 70°C, 10 menit', belum: ['Proteinase K'] },
            pesan: 'Proteinase K belum masuk. Inkubasi 70 °C gunanya mengaktifkan enzim itu — tanpa dia, protein tidak tercerna.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Tambahkan 100 µL isopropanol, lalu campur rata.',
        aksi: 'pilih-takaran',
        sumber: 'Isopropanol',
        target: TABUNG,
        takaranBenar: { nilai: 100, satuan: 'µL' },
        safety: 'Isopropanol mudah terbakar, jauhkan dari api.',
        salahUmum: [
          {
            jika: { sumber: 'Isopropanol', takaran: 'salah' },
            pesan: 'Takaran isopropanol tidak tepat. Protokol: 100 µL. Isopropanol yang bikin DNA mau menempel ke membran.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Pindahkan seluruh campuran ke High Pure Filter Tube yang sudah dipasang di Collection Tube.',
        aksi: 'tindakan',
        label: 'Pindahkan campuran ke High Pure Filter Tube',
        sumber: TABUNG,
        target: KOLOM,
        salahUmum: [
          {
            jika: { label: 'Pindahkan campuran ke High Pure Filter Tube', belum: ['Isopropanol'] },
            pesan: 'Isopropanol belum ditambahkan. Kalau dipindah sekarang, DNA tidak terikat ke membran dan ikut terbuang.'
          }
        ]
      },
      spin(T1,
        'Sentrifugasi 1 menit pada 8.000 × g.',
        [
          { jenis: 'ikat-membran', nilai: '#eef0f2' },
          { jenis: 'teks', nilai: 'DNA terikat di membran silika; kontaminan lolos ke bawah.' }
        ]),
      buang(T1, 'Buang flow-through beserta Collection Tube, pasang Collection Tube baru.'),

      /* ==================== TAHAP 2 — PENCUCIAN ==================== */
      {
        babak: T2,
        instruksi: 'Tambahkan 500 µL Inhibitor Removal Buffer ke High Pure Filter Tube.',
        aksi: 'pilih-takaran',
        sumber: 'Inhibitor Removal Buffer',
        target: KOLOM,
        takaranBenar: { nilai: 500, satuan: 'µL' },
        salahUmum: [
          {
            jika: { sumber: 'Inhibitor Removal Buffer', takaran: 'salah' },
            pesan: 'Takaran tidak tepat. Protokol: 500 µL Inhibitor Removal Buffer.'
          }
        ]
      },
      spin(T2, 'Sentrifugasi 1 menit pada 8.000 × g.'),
      buang(T2, 'Buang flow-through beserta Collection Tube, pasang Collection Tube baru.'),
      {
        babak: T2,
        instruksi: 'Cuci pertama: tambahkan 500 µL Wash Buffer ke High Pure Filter Tube.',
        aksi: 'pilih-takaran',
        sumber: 'Wash Buffer',
        target: KOLOM,
        takaranBenar: { nilai: 500, satuan: 'µL' },
        salahUmum: [
          {
            jika: { sumber: 'Wash Buffer', belum: ['Inhibitor Removal Buffer'] },
            pesan: 'Inhibitor Removal Buffer dulu. Penghambat PCR (mis. heme dari darah) dibuang lebih dulu, baru dicuci.'
          },
          {
            jika: { sumber: 'Wash Buffer', takaran: 'salah' },
            pesan: 'Takaran tidak tepat. Protokol: 500 µL Wash Buffer, dua kali cuci.'
          }
        ]
      },
      spin(T2, 'Sentrifugasi 1 menit pada 8.000 × g.'),
      buang(T2, 'Buang flow-through beserta Collection Tube, pasang Collection Tube baru.'),
      {
        babak: T2,
        instruksi: 'Cuci kedua: tambahkan lagi 500 µL Wash Buffer ke High Pure Filter Tube.',
        aksi: 'pilih-takaran',
        sumber: 'Wash Buffer',
        target: KOLOM,
        takaranBenar: { nilai: 500, satuan: 'µL' }
      },
      spin(T2, 'Sentrifugasi 1 menit pada 8.000 × g.'),
      buang(T2, 'Buang flow-through beserta Collection Tube, pasang Collection Tube baru.'),
      {
        babak: T2,
        instruksi: 'Sentrifugasi kering 10 detik pada 13.000 × g untuk membuang sisa Wash Buffer.',
        aksi: 'tindakan',
        label: 'Sentrifugasi kering 10 detik, 13.000 × g',
        sumber: 'Mikrosentrifuge',
        target: KOLOM,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Sisa etanol Wash Buffer terbuang; membran kering. Etanol sisa akan menghambat PCR.'
        }
      },

      /* ==================== TAHAP 3 — ELUSI ==================== */
      {
        babak: T3,
        instruksi: 'Pindahkan High Pure Filter Tube ke tabung mikrosentrifuge 1,5 mL steril bebas nuklease.',
        aksi: 'tindakan',
        label: 'Pindahkan Filter Tube ke tabung 1,5 mL steril bebas nuklease',
        sumber: KOLOM,
        target: PENAMPUNG,
        safety: 'Tabung penampung harus steril & bebas nuklease — DNase sisa akan mencerna hasil isolasi.'
      },
      {
        babak: T3,
        instruksi: 'Hangatkan Elution Buffer sampai ~70 °C di heat block sebelum dipakai.',
        aksi: 'tindakan',
        label: 'Hangatkan Elution Buffer ~70°C',
        sumber: 'Elution Buffer',
        target: BLOK,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Elution Buffer hangat ~70 °C — DNA lebih mudah lepas dari membran.'
        }
      },
      {
        babak: T3,
        instruksi: 'Tambahkan 200 µL Elution Buffer hangat itu tepat ke tengah membran High Pure Filter Tube.',
        aksi: 'pilih-takaran',
        sumber: 'Elution Buffer',
        target: KOLOM,
        takaranBenar: { nilai: 200, satuan: 'µL' },
        salahUmum: [
          {
            jika: { sumber: 'Elution Buffer', belum: ['Wash Buffer'] },
            pesan: 'Belum dicuci. Kalau dielusi sekarang, kontaminan & penghambat PCR ikut turun bersama DNA.'
          },
          {
            jika: { sumber: 'Elution Buffer', sudah: ['Wash Buffer'], belum: ['Heat block'] },
            pesan: 'Elution Buffer belum dihangatkan. Buku: ~70 °C — buffer dingin bikin DNA malas lepas dari membran, hasil elusi jadi sedikit.'
          },
          {
            jika: { sumber: 'Elution Buffer', takaran: 'salah' },
            pesan: 'Takaran tidak tepat. Protokol: 200 µL Elution Buffer (~70 °C).'
          }
        ]
      },
      spin(T3,
        'Sentrifugasi 1 menit pada 8.000 × g.',
        [
          { jenis: 'elusi' },
          { jenis: 'teks', nilai: 'DNA lepas dari membran, turun ke tabung sebagai DNA murni.' }
        ]),
      {
        babak: T3,
        instruksi: 'Amati hasil elusi di tabung mikrosentrifuge penampung.',
        aksi: 'amati',
        sumber: 'Pengamatan visual',
        /* target pindah ke tabung penampung: yang diamati produknya, bukan
           kolom yang sudah kosong. */
        target: PENAMPUNG,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Purified Template DNA — cairan bening tak berwarna di dasar tabung. Siap jadi template PCR.'
        }
      }
    ],

    interpretasiAkhir:
      'DNA murni tidak berwarna; keberhasilan dibuktikan nanti di elektroforesis. ' +
      'Lisis menghancurkan sel, ikat+cuci membuang kontaminan, elusi melepaskan ' +
      'DNA murni. Simpan +2..+8 °C (pendek) / −15..−25 °C (panjang).'
  });
})();
