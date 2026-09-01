/* elektroforesis.js — data percobaan "Elektroforesis" (modul Biomedik).
   ROOM TERAKHIR pipeline: Isolasi DNA → PCR → Elektroforesis. Di sinilah dua
   room sebelumnya akhirnya kelihatan hasilnya — DNA murni dan produk PCR
   sama-sama tak berwarna, dan baru di gel ini keberhasilannya terbukti.

   Angka & alur verbatim dari PPT Lab Biomedik FK UNS Blok 1.1
   (Khonsa'/Oca): 5 µL DNA marker + 3 µL produk PCR, running 100 V / 400 mA /
   30 menit, lalu divisualisasi di gel doc.

   Konvensi sama dengan pcr.js & isolasi-dna.js:
   - zona diacu lewat string `sumber`/`target`;
   - sprite mesin dipilih dari KATA KUNCI label tindakan ("elektroforesis" /
     "power supply" memunculkan sprite chamber + power supply);
   - `warna` di alatBahan cuma untuk reagen yang memang berwarna — di sini
     loading dye: marker biru, produk PCR merah (MyTaq HS Red).

   Tiga hal yang membedakan room ini dari room prosedur lain:
   - Gel agarose DI-DRAG ke chamber, bukan ditekan lewat tombol. Sumur dicetak
     DI DALAM gel, jadi gel harus ada dulu sebelum sumur bisa dimuat.
   - Kabel disambung dengan POLARITAS: merah ke anoda (+), hitam ke katoda
     (\u2212). Terbalik = ditolak, karena DNA yang bermuatan negatif akan lari ke
     arah yang salah dan keluar dari gel.
   - Voltase & waktu DIKETIK user lewat aksi `atur-parameter`. Di Belajar
     nilainya sudah terisi; di Ujian kolomnya kosong dan harus diingat. Karena
     itu label tombol, safety, dan dasar teori di file ini sengaja TIDAK memuat
     angka 100 atau 30 \u2014 di mode Ujian semuanya tetap terbaca, dan menyebut
     angkanya di situ sama saja membocorkan jawaban.

   SATU jenis hasilVisual baru dipakai di sini: `gel`. Isinya spesifikasi lajur
   & ukuran pita; engine yang menggambar posisinya (skala log — fragmen besar
   dekat sumur, kecil jauh ke bawah). Pita MANA yang muncul tetap ditulis di
   sini, bukan dihitung engine: hasil ini scripted seperti hasil visual lain.

   Contoh yang ditampilkan = HETEROZIGOT (3 pita). Kunci interpretasi RFLP
   Hae III yang lengkap ada di interpretasiAkhir. */

(function () {
  'use strict';

  var T1 = 'Tahap 1 — Menyiapkan Gel & Memuat Sampel';
  var T2 = 'Tahap 2 — Running & Visualisasi';

  var CHAMBER = 'Chamber elektroforesis';
  var SUMUR = 'Sumur gel';
  var T_PLUS = 'Terminal + (anoda)';
  var T_MINUS = 'Terminal \u2212 (katoda)';
  var K_MERAH = 'Kabel merah (+)';
  var K_HITAM = 'Kabel hitam (\u2212)';

  window.PRAKTIKUM = window.PRAKTIKUM || [];

  window.PRAKTIKUM.push({
    id: 'elektroforesis',
    nama: 'Elektroforesis',
    tipe: 'prosedur',

    dasarTeoriRingkas:
      'Elektroforesis memisahkan fragmen DNA berdasarkan UKURAN di dalam gel ' +
      'agarose menggunakan medan listrik. DNA bermuatan negatif, jadi bergerak ' +
      'ke kutub positif (anoda); makin kecil fragmennya makin mudah menembus ' +
      'pori gel, jadi makin jauh migrasinya. DNA marker dipakai sebagai tangga ' +
      'acuan untuk menaksir ukuran pita sampel dalam pasangan basa (bp).',

    alatBahan: [
      { nama: 'Gel agarose',        jumlah: '1 buah (dalam cetakan)' },
      { nama: 'Running buffer TAE', jumlah: 'secukupnya' },
      { nama: 'DNA marker',         jumlah: '5 µL', warna: '#2a4b9b' },
      { nama: 'Produk PCR',         jumlah: '3 µL', warna: '#c0392b' },
      { nama: K_MERAH,              jumlah: '1', warna: '#c0392b' },
      { nama: K_HITAM,              jumlah: '1', warna: '#1d2126' }
    ],

    langkah: [

      /* ========= TAHAP 1 — menyiapkan gel & memuat sampel ========= */
      {
        babak: T1,
        instruksi: 'Seret gel agarose yang sudah memadat ke dalam chamber elektroforesis.',
        aksi: 'drag',
        sumber: 'Gel agarose',
        target: CHAMBER,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Gel terpasang di chamber; deretan sumur terlihat di sisi katoda (−).'
        }
      },
      {
        babak: T1,
        instruksi: 'Tuang running buffer TAE sampai seluruh permukaan gel terendam.',
        aksi: 'tindakan',
        label: 'Tuang running buffer TAE hingga gel terendam',
        sumber: 'Running buffer TAE',
        target: CHAMBER,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Gel terendam buffer TAE; rangkaian siap menghantarkan arus.'
        },
        salahUmum: [
          {
            jika: { label: 'Tuang running buffer TAE hingga gel terendam', belum: ['Gel agarose'] },
            pesan: 'Gel agarose harus terpasang di chamber dulu, baru dituang buffer.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Muat 5 µL DNA marker ke salah satu sumur gel.',
        aksi: 'pilih-takaran',
        sumber: 'DNA marker',
        target: SUMUR,
        takaranBenar: { nilai: 5, satuan: 'µL' },
        safety: 'Pipet perlahan tepat di mulut sumur — ujung tip jangan sampai menembus dasar sumur, karena sampel akan bocor ke bawah gel.',
        salahUmum: [
          {
            /* sumur itu cetakan DI DALAM gel: tanpa gel, tidak ada sumur */
            jika: { target: SUMUR, belum: ['Gel agarose'] },
            pesan: 'Gel belum dipasang, jadi belum ada sumur untuk dimuati. Pasang gel agarose ke chamber dulu.'
          },
          {
            jika: { sumber: 'DNA marker', takaran: 'salah' },
            pesan: 'Takaran marker tidak tepat. Protokol: 5 µL DNA marker.'
          }
        ]
      },
      {
        babak: T1,
        instruksi: 'Muat 3 µL produk PCR ke sumur berikutnya.',
        aksi: 'pilih-takaran',
        sumber: 'Produk PCR',
        target: SUMUR,
        takaranBenar: { nilai: 3, satuan: 'µL' },
        salahUmum: [
          {
            jika: { sumber: 'Produk PCR', belum: ['Running buffer TAE'] },
            pesan: 'Gel harus terendam buffer dulu; tanpa buffer tidak ada penghantar arus.'
          },
          {
            jika: { sumber: 'Produk PCR', takaran: 'salah' },
            pesan: 'Takaran tidak tepat. Protokol: 3 µL produk PCR per sumur.'
          }
        ]
      },

      /* ========= TAHAP 2 — running & visualisasi ========= */
      {
        babak: T2,
        instruksi: 'Tutup chamber elektroforesis.',
        aksi: 'tindakan',
        label: 'Tutup chamber',
        sumber: 'Tutup chamber',
        target: CHAMBER,
        /* safety ini ikut tampil di panel Keselamatan mode Ujian, jadi sengaja
           TIDAK menyebut angka voltasenya. */
        safety: 'Jangan membuka tutup chamber selagi arus menyala — tegangan kerja di dalam larutan penghantar berbahaya.',
        hasilVisual: { jenis: 'teks', nilai: 'Chamber tertutup rapat.' }
      },
      {
        babak: T2,
        instruksi: 'Sambungkan kabel merah ke terminal + (anoda) — sisi seberang sumur.',
        aksi: 'drag',
        sumber: K_MERAH,
        target: T_PLUS,
        salahUmum: [
          {
            jika: { sumber: K_MERAH, target: T_MINUS },
            pesan: 'Polaritas terbalik. DNA bermuatan negatif akan bergerak ke arah yang salah dan keluar dari gel — merah ke anoda (+), hitam ke katoda (−).'
          }
        ]
      },
      {
        babak: T2,
        instruksi: 'Sambungkan kabel hitam ke terminal − (katoda) — sisi tempat sumur berada.',
        aksi: 'drag',
        sumber: K_HITAM,
        target: T_MINUS,
        salahUmum: [
          {
            jika: { sumber: K_HITAM, target: T_PLUS },
            pesan: 'Polaritas terbalik. DNA bermuatan negatif akan bergerak ke arah yang salah dan keluar dari gel — merah ke anoda (+), hitam ke katoda (−).'
          }
        ],
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Rangkaian lengkap: anoda (+) di seberang sumur, katoda (−) di sisi sumur.'
        }
      },
      {
        babak: T2,
        instruksi: 'Atur voltase dan waktu running di power supply, lalu tekan tombolnya.',
        aksi: 'atur-parameter',
        label: 'Atur voltase & waktu di power supply',
        sumber: 'Pengatur power supply',
        target: 'Power supply',
        parameter: [
          { nama: 'Voltase', satuan: 'V', benar: 100 },
          { nama: 'Waktu', satuan: 'menit', benar: 30 }
        ],
        info: 'Arus terbaca sendiri di alat (400 mA) — tidak diatur manual.',
        salahUmum: [
          {
            jika: { aksi: 'atur-parameter', belum: [K_HITAM] },
            pesan: 'Kabel belum tersambung lengkap. Sambungkan dulu kedua elektroda sebelum mengatur power supply.'
          }
        ]
      },
      {
        babak: T2,
        instruksi: 'Jalankan elektroforesis sesuai parameter yang sudah diatur.',
        aksi: 'tindakan',
        label: 'Jalankan elektroforesis',
        sumber: 'Power supply',
        target: CHAMBER,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'DNA bermuatan negatif bergerak ke anoda (+); fragmen kecil bermigrasi lebih cepat dan lebih jauh daripada fragmen besar.'
        },
        salahUmum: [
          {
            jika: { label: 'Jalankan elektroforesis', belum: ['Produk PCR'] },
            pesan: 'Sampel belum dimuat ke sumur. Kalau arus dijalankan sekarang, yang berjalan cuma buffer.'
          },
          {
            jika: { label: 'Jalankan elektroforesis', belum: [K_HITAM] },
            pesan: 'Elektroda belum tersambung lengkap — tanpa rangkaian tertutup tidak ada arus yang mengalir.'
          },
          {
            jika: { label: 'Jalankan elektroforesis', belum: ['Pengatur power supply'] },
            pesan: 'Voltase & waktu belum diatur di power supply.'
          }
        ]
      },
      {
        babak: T2,
        instruksi: 'Matikan power supply, lalu angkat gel dari chamber.',
        aksi: 'tindakan',
        label: 'Matikan power supply',
        sumber: 'Power supply',
        target: CHAMBER,
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Arus dimatikan; gel siap diangkat untuk divisualisasi.'
        }
      },
      {
        babak: T2,
        instruksi: 'Amati pita DNA di bawah gel doc / UV transilluminator.',
        aksi: 'amati',
        label: 'Amati pita di bawah gel doc / UV transilluminator',
        sumber: 'Pengamatan visual',
        target: CHAMBER,
        hasilVisual: [
          {
            jenis: 'gel',
            nilai: {
              lajur: [
                {
                  nama: 'Marker',
                  jenis: 'marker',
                  pita: [300, 250, 200, 150, 100, 50]
                },
                {
                  nama: 'Sampel (produk PCR)',
                  genotipe: 'Heterozigot',
                  pita: [211, 131, 80]
                }
              ]
            }
          },
          {
            jenis: 'teks',
            nilai: 'Pita menyala di bawah UV. Lajur marker jadi tangga acuan ukuran; ' +
                   'lajur sampel dibaca terhadap tangga itu.'
          }
        ]
      }
    ],

    interpretasiAkhir:
      'Kunci interpretasi RFLP Hae III: SATU pita 211 bp = homozigot normal ' +
      '(alel normal tidak punya situs potong Hae III, jadi utuh); DUA pita ' +
      '131 + 80 bp = homozigot mutan (alel mutan punya situs Hae III, jadi ' +
      '211 bp terpotong jadi dua); TIGA pita 211 + 131 + 80 bp = heterozigot ' +
      '(satu alel utuh, satu alel terpotong). Contoh yang ditampilkan di gel ini ' +
      'tiga pita → heterozigot. Munculnya pita sekaligus jadi bukti bahwa seluruh ' +
      'rantai berhasil: DNA berhasil diisolasi, target berhasil diamplifikasi PCR, ' +
      'dan produknya terpisah rapi di gel.'
  });
})();
