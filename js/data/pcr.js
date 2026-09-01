/* pcr.js — data percobaan "PCR" (modul Biomedik, room kedua pipeline).
   Angka & program verbatim dari PPT Lab Biomedik FK UNS Blok 1.1 (MyTaq HS Red
   2×, total reaksi 25 µL). Input room ini = output room Isolasi DNA
   (Purified Template DNA); outputnya jadi input room Elektroforesis.

   Konvensi persis isolasi-dna.js — tidak ada mekanik baru yang ditulis di
   sini, semuanya sudah ada di engine:
   1. Zona diacu lewat string `sumber`/`target`; 'Tabung PCR 0,2 mL' kena kata
      kunci "tabung" jadi digambar sebagai sprite tabung mini.
   2. Sprite mesin dipilih dari KATA KUNCI di `label` tindakan — "Sentrifugasi"
      memunculkan centrifuge, "Thermal Cycler"/"siklus" memunculkan thermal
      cycler. Tidak ada field data yang menyebut mesin secara eksplisit.
   3. `hasilVisual` boleh objek atau array.
   4. Satuan µL, termasuk dosis PECAHAN (12,5 dan 2,5) — di situ letak
      ketelitian yang dilatih room ini.

   SATU field yang baru dipakai di sini: `tiriskan: false` pada langkah
   quick-spin. Spin PCR memakai sprite centrifuge yang sama dengan Isolasi DNA,
   tapi maksudnya KEBALIKAN — mengumpulkan tetesan ke dasar tabung, bukan
   menguras isinya. Tanpa override itu, tabung reaksi 25 µL akan kosong persis
   sebelum diamplifikasi. Langkah yang tidak menyetel field ini (semua langkah
   Isolasi DNA) tetap ikut sifat mesinnya.

   Produk PCR tidak berwarna — sama seperti Isolasi DNA, tidak ada hasilVisual
   warna/endapan. Buktinya baru kelihatan di room Elektroforesis. */

(function () {
  'use strict';

  var T1 = 'Tahap 1 — Menyiapkan Reaksi PCR';
  var T2 = 'Tahap 2 — Amplifikasi';

  var TABUNG = 'Tabung PCR 0,2 mL';
  var MIX = 'Master Mix MyTaq HS Red 2×';
  var TEMPLATE = 'DNA template (hasil Isolasi DNA)';

  window.PRAKTIKUM = window.PRAKTIKUM || [];

  window.PRAKTIKUM.push({
    id: 'pcr',
    nama: 'PCR',
    tipe: 'prosedur',

    dasarTeoriRingkas:
      'PCR memperbanyak satu segmen DNA target secara eksponensial lewat siklus ' +
      'suhu berulang: denaturasi (untai DNA memisah) → annealing (primer menempel ' +
      'di kedua ujung target) → ekstensi (Taq polymerase menyalin). Master Mix ' +
      'sudah berisi Taq polymerase, dNTP, buffer, dan MgCl2; templatnya = DNA hasil ' +
      'isolasi. Setelah 30 siklus, satu kopi target jadi jutaan kopi — cukup ' +
      'banyak untuk dilihat sebagai pita di elektroforesis.',

    alatBahan: [
      { nama: 'Tabung PCR 0,2 mL',           jumlah: '1 buah' },
      { nama: 'Nuclease-Free Water (NFW)',   jumlah: '8 µL' },
      { nama: 'Primer Forward',              jumlah: '1 µL' },
      { nama: 'Primer Reverse',              jumlah: '1 µL' },
      { nama: MIX,                           jumlah: '12,5 µL' },
      { nama: TEMPLATE,                      jumlah: '2,5 µL' }
    ],

    langkah: [

      /* ============ TAHAP 1 — menyiapkan reaksi (di atas es) ============ */
      {
        babak: T1,
        instruksi: 'Masukkan 8 µL Nuclease-Free Water (NFW) ke tabung PCR 0,2 mL.',
        aksi: 'pilih-takaran',
        sumber: 'Nuclease-Free Water (NFW)',
        target: TABUNG,
        takaranBenar: { nilai: 8, satuan: 'µL' },
        safety: 'Kerjakan di atas es / cold block. Reagen PCR dan enzim harus tetap dingin sampai masuk mesin.',
        salahUmum: [
          {
            jika: { sumber: 'Nuclease-Free Water (NFW)', takaran: 'salah' },
            pesan: 'Takaran NFW tidak tepat. Protokol: 8 µL. NFW yang menggenapkan total reaksi jadi 25 µL.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Tambahkan 1 µL Primer Forward.',
        aksi: 'pilih-takaran',
        sumber: 'Primer Forward',
        target: TABUNG,
        takaranBenar: { nilai: 1, satuan: 'µL' },
        salahUmum: [
          {
            jika: { sumber: 'Primer Forward', takaran: 'salah' },
            pesan: 'Takaran primer tidak tepat. Protokol: 1 µL Primer Forward.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Tambahkan 1 µL Primer Reverse.',
        aksi: 'pilih-takaran',
        sumber: 'Primer Reverse',
        target: TABUNG,
        takaranBenar: { nilai: 1, satuan: 'µL' },
        salahUmum: [
          {
            jika: { sumber: 'Primer Reverse', belum: ['Primer Forward'] },
            pesan: 'Primer Forward dulu. Keduanya memang sepasang, tapi ikuti urutan protokol supaya tidak ada yang terlewat.'
          },
          {
            jika: { sumber: 'Primer Reverse', takaran: 'salah' },
            pesan: 'Takaran primer tidak tepat. Protokol: 1 µL Primer Reverse.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Tambahkan 12,5 µL Master Mix MyTaq HS Red 2×.',
        aksi: 'pilih-takaran',
        sumber: MIX,
        target: TABUNG,
        takaranBenar: { nilai: 12.5, satuan: 'µL' },
        safety: 'Master Mix berisi enzim — jangan divorteks keras, cukup dibolak-balik pelan, dan kembalikan ke es segera.',
        salahUmum: [
          {
            jika: { sumber: MIX, takaran: 'salah' },
            pesan: 'Master Mix 12,5 µL — separuh total 25 µL (2× → 1×). Volume pecahan, harus teliti.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Homogenkan campuran dengan cara memipet naik-turun perlahan.',
        aksi: 'tindakan',
        label: 'Homogenkan campuran (pipetting)',
        sumber: TABUNG,
        target: TABUNG,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Komponen mix tercampur rata; belum ada template di dalamnya.'
        },
        salahUmum: [
          {
            jika: { label: 'Homogenkan campuran (pipetting)', belum: [MIX] },
            pesan: 'Master Mix belum masuk. Homogenkan setelah seluruh komponen mix lengkap.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Terakhir, tambahkan 2,5 µL DNA template hasil isolasi. Total reaksi kini 25 µL.',
        aksi: 'pilih-takaran',
        sumber: TEMPLATE,
        target: TABUNG,
        takaranBenar: { nilai: 2.5, satuan: 'µL' },
        safety: 'Ganti tip tiap reagen. Kontaminasi silang antar-sampel merusak PCR dan hasilnya tidak bisa dipercaya.',
        salahUmum: [
          {
            jika: { sumber: TEMPLATE, belum: [MIX] },
            pesan: 'Template ditambahkan TERAKHIR, setelah komponen mix tercampur — menekan risiko kontaminasi & degradasi.'
          },
          {
            jika: { sumber: TEMPLATE, takaran: 'salah' },
            pesan: 'Template 2,5 µL; berlebih justru menghambat reaksi.'
          }
        ]
      },

      /* ==================== TAHAP 2 — amplifikasi ==================== */
      {
        babak: T2,
        instruksi: 'Sentrifugasi singkat (spin-down) supaya seluruh cairan turun ke dasar tabung.',
        aksi: 'tindakan',
        label: 'Sentrifugasi singkat (spin-down) mengumpulkan tetesan',
        sumber: 'Mikrosentrifuge',
        target: TABUNG,
        /* Sprite centrifuge yang sama dengan Isolasi DNA, TAPI di sini isinya
           tidak boleh terkuras: yang dikerjakan mengumpulkan tetesan ke dasar. */
        tiriskan: false,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Seluruh reaksi terkumpul di dasar tabung, 25 µL, tanpa tetesan tertinggal di dinding.'
        }
      },
      {
        babak: T2,
        instruksi: 'Masukkan tabung ke Thermal Cycler dan jalankan program 30 siklus.',
        aksi: 'tindakan',
        label: 'Jalankan Thermal Cycler — 30 siklus',
        sumber: 'Thermal cycler',
        target: TABUNG,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Denaturasi awal 95 °C 1 menit; lalu 30 siklus: denaturasi 95 °C 15 s → ' +
                 'annealing 15 s pada suhu sesuai Tm primer (45–60 °C; contoh 55 °C) → ' +
                 'ekstensi 72 °C 10 s.'
        },
        salahUmum: [
          {
            jika: { label: 'Jalankan Thermal Cycler — 30 siklus', belum: [TEMPLATE] },
            pesan: 'Semua komponen termasuk template harus masuk sebelum amplifikasi.'
          }
        ]
      },
      {
        babak: T2,
        instruksi: 'Amati tabung setelah program selesai.',
        aksi: 'amati',
        sumber: 'Pengamatan visual',
        target: TABUNG,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Produk PCR — segmen DNA target teramplifikasi ~2^30 (±10^9) kopi. ' +
                 'Tak berwarna; keberhasilan dibuktikan di elektroforesis.'
        }
      }
    ],

    interpretasiAkhir:
      'PCR mengamplifikasi segmen target secara eksponensial lewat siklus suhu ' +
      '(denaturasi–annealing–ekstensi). Master Mix menyediakan Taq polymerase, ' +
      'dNTP, buffer, dan MgCl2; templatnya hasil isolasi DNA. Produknya jutaan ' +
      'kopi segmen target — tidak terlihat mata, dan justru itu sebabnya harus ' +
      'dijalankan ke elektroforesis untuk dibuktikan.'
  });
})();
