/* susunan-elementer.js — data percobaan "Susunan Elementer Protein".
   Takaran & cara kerja: Buku Petunjuk Praktikum Biokimia Blok 1.1.
   Hasil visual SCRIPTED, bukan dihitung engine.

   Room pertama yang punya 4 SUB-UJI dalam satu percobaan. Strukturnya tetap
   SATU array `langkah` (skema tidak berubah); pengelompokan cuma lewat field
   `babak` — label section yang tampil di panel langkah mode Belajar.

   Tiap sub-uji dibuka langkah "ambil tabung/cawan bersih" ber-hasilVisual
   {jenis:'reset'}: isi tabung dibuang, api dimatikan, dan riwayat urutan
   (belum/sudah di salahUmum) dinilai ulang dari nol — jadi sub-uji tidak
   saling mencampur, baik visual maupun validasinya. Tabungnya sendiri tetap
   di meja, tidak perlu di-drag ulang dari rak setelah langkah itu.

   Sub-uji 2 memakai hasilVisual jenis 'lakmus': kertas indikator di area
   kerja berubah warna. Ini satu-satunya tempat jenis itu dipakai.

   Padatan pakai satuan `gram`, dan rasionya yang penting, bukan angkanya
   sendiri: albumin 1 gram : NaOH 2 gram (2x), albumin 1 gram : campuran
   pelebur 2 gram (2x). Itu yang diuji lewat salahUmum takaran. */

(function () {
  'use strict';

  /* nama panjang, dipakai berulang sebagai sumber & di salahUmum */
  var PELEBUR = 'Campuran pelebur (Na2CO3 : KNO3 = 2:1)';

  var B1 = 'Sub-uji 1 — Karbon, Hidrogen, Oksigen';
  var B2 = 'Sub-uji 2 — Nitrogen';
  var B3 = 'Sub-uji 3 — Sulfur (peleburan + BaCl2)';
  var B4 = 'Sub-uji 4 — Sulfur (Pb-asetat)';

  window.PRAKTIKUM = window.PRAKTIKUM || [];

  window.PRAKTIKUM.push({
    id: 'susunan-elementer',
    nama: 'Susunan Elementer Protein',

    dasarTeoriRingkas:
      'Protein tersusun atas unsur C, H, O, N, dan sering S. ' +
      'Tiap sub-uji mendeteksi unsur berbeda.',

    alatBahan: [
      { nama: 'Tabung reaksi',       jumlah: '4 buah (bersih & kering)' },
      { nama: 'Serbuk albumin',      jumlah: 'sedikit / 1 gram' },
      { nama: 'Serbuk NaOH',         jumlah: '2 gram' },
      { nama: PELEBUR,               jumlah: '2 gram' },
      { nama: 'Larutan NaOH 10%',    jumlah: '5 cc' },
      { nama: 'Larutan Pb-asetat',   jumlah: '10 tetes' },
      { nama: 'Larutan BaCl2',       jumlah: '1 cc' },
      { nama: 'HCl pekat',           jumlah: '1 cc' },
      { nama: 'Aquadest',            jumlah: '20 cc' },
      { nama: 'Kertas lakmus merah', jumlah: '1 helai' },
      { nama: 'Pembakar spiritus',   jumlah: '1 buah' }
    ],

    langkah: [

      /* ============ SUB-UJI 1 — C, H, O ============ */
      {
        babak: B1,
        instruksi: 'Ambil tabung reaksi yang bersih dan KERING, taruh di area kerja.',
        aksi: 'drag',
        sumber: 'Tabung reaksi',
        target: 'Meja kerja',
        hasilVisual: { jenis: 'reset' },
        safety: 'Tabung harus benar-benar kering — sisa air bikin embun palsu di dinding tabung dan bisa memercik saat dipanaskan.'
      },
      {
        babak: B1,
        instruksi: 'Masukkan sedikit serbuk albumin ke dalam tabung reaksi (tanpa ditimbang).',
        aksi: 'drag',
        sumber: 'Serbuk albumin',
        target: 'Tabung reaksi',
        salahUmum: [
          {
            jika: { sumber: 'Serbuk albumin', belum: ['Tabung reaksi'] },
            pesan: 'Siapkan dulu tabung bersih di area kerja, baru masukkan bahannya.'
          }
        ]
      },
      {
        babak: B1,
        instruksi: 'Nyalakan pembakar spiritus.',
        aksi: 'nyalakan',
        sumber: 'Pembakar spiritus',
        target: 'Meja kerja',
        safety: 'Nyalakan dari samping pakai korek panjang, jangan condongkan wajah ke atas sumbu.'
      },
      {
        babak: B1,
        instruksi: 'Panaskan tabung berisi albumin sampai menjadi arang.',
        aksi: 'panaskan',
        sumber: 'Pembakar spiritus',
        target: 'Tabung reaksi',
        hasilVisual: [
          { jenis: 'warna', nilai: '#2a2a2a' },   /* arang hitam */
          { jenis: 'gas' },
          {
            jenis: 'teks',
            nilai: 'Terbentuk arang hitam (C). Embun di dinding atas tabung (H & O). ' +
                   'Tercium bau rambut terbakar (senyawa organik).'
          }
        ],
        safety: 'Panaskan sambil digoyang, mulut tabung diarahkan menjauh dari orang. Jangan dihirup langsung.',
        salahUmum: [
          {
            jika: { aksi: 'panaskan', belum: ['Pembakar spiritus'] },
            pesan: 'Nyalakan pembakar spiritus dulu, baru panaskan tabungnya.'
          }
        ]
      },
      {
        babak: B1,
        instruksi: 'Amati isi tabung dan dinding tabung bagian atas.',
        aksi: 'amati',
        sumber: 'Pengamatan visual',
        target: 'Tabung reaksi',
        hasilVisual: { jenis: 'teks', nilai: 'Karbon, Hidrogen, Oksigen terdeteksi.' }
      },

      /* ============ SUB-UJI 2 — Nitrogen ============ */
      {
        babak: B2,
        instruksi: 'Ambil tabung reaksi bersih yang baru untuk sub-uji nitrogen.',
        aksi: 'drag',
        sumber: 'Tabung reaksi',
        target: 'Meja kerja',
        hasilVisual: { jenis: 'reset' },
        safety: 'Jangan pakai tabung bekas sub-uji sebelumnya — sisa arang mengacaukan hasil.'
      },
      {
        babak: B2,
        instruksi: 'Timbang 1 gram serbuk albumin, masukkan ke tabung.',
        aksi: 'pilih-takaran',
        sumber: 'Serbuk albumin',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 1, satuan: 'gram' },
        salahUmum: [
          {
            jika: { sumber: 'Serbuk albumin', takaran: 'salah' },
            pesan: 'Serbuk albumin yang ditimbang 1 gram — ini jadi patokan jumlah reagennya.'
          }
        ]
      },
      {
        babak: B2,
        instruksi: 'Tambahkan 2 gram serbuk NaOH — 2x jumlah albumin (albumin 1 gram : NaOH 2 gram).',
        aksi: 'pilih-takaran',
        sumber: 'Serbuk NaOH',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 2, satuan: 'gram' },
        safety: 'Serbuk NaOH kaustik & higroskopis — jangan disentuh tangan telanjang, jangan dihirup debunya.',
        salahUmum: [
          {
            jika: { sumber: 'Serbuk NaOH', belum: ['Serbuk albumin'] },
            pesan: 'Albumin dulu masuk tabung, baru serbuk NaOH.'
          },
          {
            jika: { sumber: 'Serbuk NaOH', takaran: 'salah' },
            pesan: 'NaOH 2x albumin (albumin 1 gram : NaOH 2 gram).'
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
        instruksi: 'Panaskan campuran albumin + NaOH.',
        aksi: 'panaskan',
        sumber: 'Pembakar spiritus',
        target: 'Tabung reaksi',
        hasilVisual: [
          { jenis: 'gas' },
          { jenis: 'teks', nilai: 'Tercium bau amonia (NH3).' }
        ],
        safety: 'Uap amonia menyengat — kibaskan uap ke arah hidung dari jauh, jangan dihirup langsung dari mulut tabung.'
      },
      {
        babak: B2,
        instruksi: 'Uji uap yang keluar dengan kertas lakmus merah (pegang di atas mulut tabung).',
        aksi: 'drag',
        sumber: 'Kertas lakmus merah',
        target: 'Tabung reaksi',
        hasilVisual: [
          { jenis: 'lakmus', nilai: '#3a5a9a' },
          {
            jenis: 'teks',
            nilai: 'Kertas lakmus merah berubah biru = ada amonia -> Nitrogen (N) & Hidrogen (H).'
          }
        ],
        safety: 'Basahi sedikit lakmusnya dan pegang di ATAS mulut tabung, jangan dicelup ke lelehan panas.',
        salahUmum: [
          {
            jika: { sumber: 'Kertas lakmus merah', belum: ['Serbuk NaOH'] },
            pesan: 'Lakmus dipakai untuk menguji uap hasil pemanasan albumin + NaOH — campur & panaskan dulu.'
          }
        ]
      },
      {
        babak: B2,
        instruksi: 'Amati perubahan warna kertas lakmus.',
        aksi: 'amati',
        sumber: 'Pengamatan visual',
        target: 'Tabung reaksi',
        hasilVisual: { jenis: 'teks', nilai: 'Nitrogen terdeteksi.' }
      },

      /* ============ SUB-UJI 3 — Sulfur lewat peleburan ============ */
      {
        babak: B3,
        instruksi: 'Ambil cawan/tabung bersih yang baru untuk peleburan.',
        aksi: 'drag',
        sumber: 'Tabung reaksi',
        target: 'Meja kerja',
        hasilVisual: { jenis: 'reset' },
        safety: 'Wadah peleburan harus kering dan tahan panas — peleburan butuh api yang lama.'
      },
      {
        babak: B3,
        instruksi: 'Timbang 1 gram serbuk albumin, masukkan ke wadah.',
        aksi: 'pilih-takaran',
        sumber: 'Serbuk albumin',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 1, satuan: 'gram' }
      },
      {
        babak: B3,
        instruksi: 'Tambahkan 2 gram campuran pelebur (Na2CO3 : KNO3 = 2:1) — 2x lebih banyak dari albumin.',
        aksi: 'pilih-takaran',
        sumber: PELEBUR,
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 2, satuan: 'gram' },
        safety: 'KNO3 itu oksidator kuat — jangan dicampur bahan organik lain selain sampelnya, jangan digerus keras.',
        salahUmum: [
          {
            jika: { sumber: PELEBUR, belum: ['Serbuk albumin'] },
            pesan: 'Albumin dulu ke wadah, baru campuran peleburnya.'
          },
          {
            jika: { sumber: PELEBUR, takaran: 'salah' },
            pesan: 'Campuran pelebur 2 gram = 2x jumlah albumin (albumin 1 gram).'
          }
        ]
      },
      {
        babak: B3,
        instruksi: 'Nyalakan pembakar spiritus.',
        aksi: 'nyalakan',
        sumber: 'Pembakar spiritus',
        target: 'Meja kerja',
        safety: 'Nyalakan dari samping pakai korek panjang, jangan condongkan wajah ke atas sumbu.'
      },
      {
        babak: B3,
        instruksi: 'Panaskan sampai arangnya melebur dan menjadi tak berwarna.',
        aksi: 'panaskan',
        sumber: 'Pembakar spiritus',
        target: 'Tabung reaksi',
        hasilVisual: {
          jenis: 'teks',
          nilai: 'Dipanaskan sampai arang menjadi tak berwarna (melebur).'
        },
        safety: 'Peleburan sangat panas dan bisa memercik — pakai penjepit, jangan pegang wadahnya langsung.'
      },
      {
        babak: B3,
        instruksi: 'Dinginkan hasil peleburan sampai suhu ruang.',
        aksi: 'tindakan',
        label: 'Dinginkan',
        sumber: 'Tabung reaksi',
        target: 'Tabung reaksi',
        hasilVisual: { jenis: 'teks', nilai: 'Hasil peleburan didinginkan sampai suhu ruang.' },
        safety: 'Jangan siram wadah panas dengan air dingin — bisa pecah. Biarkan dingin sendiri.',
        salahUmum: [
          {
            jika: { aksi: 'tindakan', target: 'Tabung reaksi', sudah: [PELEBUR], belum: ['Aquadest'] },
            pesan: 'Urutannya: panaskan sampai melebur -> dinginkan -> larutkan dalam aquadest -> baru disaring.'
          }
        ]
      },
      {
        babak: B3,
        instruksi: 'Larutkan hasil peleburan dalam 20 cc aquadest.',
        aksi: 'pilih-takaran',
        sumber: 'Aquadest',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 20, satuan: 'cc' },
        hasilVisual: [
          { jenis: 'warna', nilai: '#dce6ee' },   /* bening */
          { jenis: 'teks', nilai: 'Dilarutkan dalam aquadest.' }
        ],
        salahUmum: [
          {
            jika: { sumber: 'Aquadest', takaran: 'salah' },
            pesan: 'Aquadest yang dipakai 20 cc.'
          }
        ]
      },
      {
        babak: B3,
        instruksi: 'Saring larutan, ambil filtratnya.',
        aksi: 'tindakan',
        label: 'Saring larutan',
        sumber: 'Tabung reaksi',
        target: 'Tabung reaksi',
        hasilVisual: { jenis: 'teks', nilai: 'Larutan disaring, diambil filtratnya.' }
      },
      {
        babak: B3,
        instruksi: 'Asamkan filtrat dengan 1 cc HCl pekat.',
        aksi: 'pilih-takaran',
        sumber: 'HCl pekat',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 1, satuan: 'cc' },
        hasilVisual: { jenis: 'teks', nilai: 'Filtrat diasamkan.' },
        safety: 'HCl pekat korosif dan uapnya menyengat — tuang di lemari asam, lewat dinding wadah, jangan dihirup.',
        salahUmum: [
          {
            jika: { sumber: 'HCl pekat', sudah: [PELEBUR], belum: ['Aquadest'] },
            pesan: 'Dinginkan & larutkan dalam aquadest dulu, saring, baru filtratnya diasamkan.'
          },
          {
            jika: { sumber: 'HCl pekat', takaran: 'salah' },
            pesan: 'HCl pekat yang dipakai 1 cc.'
          }
        ]
      },
      {
        babak: B3,
        instruksi: 'Tambahkan 1 cc larutan BaCl2 ke filtrat yang sudah asam.',
        aksi: 'pilih-takaran',
        sumber: 'Larutan BaCl2',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 1, satuan: 'cc' },
        hasilVisual: [
          { jenis: 'endapan', nilai: '#ecebe6' },  /* endapan putih BaSO4 */
          { jenis: 'teks', nilai: 'Endapan putih (BaSO4) = ada Sulfur (S).' }
        ],
        safety: 'BaCl2 toksik kalau tertelan — jangan dipipet pakai mulut, cuci tangan setelah memegangnya.',
        salahUmum: [
          {
            jika: { sumber: 'Larutan BaCl2', belum: ['HCl pekat'] },
            pesan: 'Filtrat harus diasamkan dengan HCl pekat dulu, baru ditambah BaCl2.'
          },
          {
            jika: { sumber: 'Larutan BaCl2', takaran: 'salah' },
            pesan: 'BaCl2 yang dipakai 1 cc.'
          }
        ]
      },
      {
        babak: B3,
        instruksi: 'Amati endapan yang terbentuk.',
        aksi: 'amati',
        sumber: 'Pengamatan visual',
        target: 'Tabung reaksi',
        hasilVisual: { jenis: 'teks', nilai: 'Sulfur terdeteksi (jalur peleburan).' }
      },

      /* ============ SUB-UJI 4 — Sulfur lewat Pb-asetat ============ */
      {
        babak: B4,
        instruksi: 'Ambil tabung reaksi bersih yang baru untuk uji Pb-asetat.',
        aksi: 'drag',
        sumber: 'Tabung reaksi',
        target: 'Meja kerja',
        hasilVisual: { jenis: 'reset' },
        safety: 'Sisa BaCl2/HCl dari sub-uji sebelumnya harus benar-benar hilang — pakai tabung lain.'
      },
      {
        babak: B4,
        instruksi: 'Masukkan sedikit serbuk albumin ke dalam tabung (tanpa ditimbang).',
        aksi: 'drag',
        sumber: 'Serbuk albumin',
        target: 'Tabung reaksi'
      },
      {
        babak: B4,
        instruksi: 'Tambahkan 5 cc larutan NaOH 10%.',
        aksi: 'pilih-takaran',
        sumber: 'Larutan NaOH 10%',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 5, satuan: 'cc' },
        safety: 'NaOH 10% kaustik — kena kulit bikin licin dan perih, segera bilas air mengalir kalau kena.',
        salahUmum: [
          {
            jika: { sumber: 'Larutan NaOH 10%', belum: ['Serbuk albumin'] },
            pesan: 'Albumin dulu ke tabung, baru NaOH 10%.'
          },
          {
            jika: { sumber: 'Larutan NaOH 10%', takaran: 'salah' },
            pesan: 'NaOH 10% sebanyak 5 cc.'
          }
        ]
      },
      {
        babak: B4,
        instruksi: 'Nyalakan pembakar spiritus.',
        aksi: 'nyalakan',
        sumber: 'Pembakar spiritus',
        target: 'Meja kerja',
        safety: 'Nyalakan dari samping pakai korek panjang, jangan condongkan wajah ke atas sumbu.'
      },
      {
        babak: B4,
        instruksi: 'Didihkan campuran albumin + NaOH 10%.',
        aksi: 'panaskan',
        sumber: 'Pembakar spiritus',
        target: 'Tabung reaksi',
        hasilVisual: { jenis: 'teks', nilai: 'Campuran dididihkan.' },
        safety: 'Larutan alkali mendidih gampang menyembur — goyang terus, mulut tabung menjauh dari orang.'
      },
      {
        babak: B4,
        instruksi: 'Teteskan 10 tetes larutan Pb-asetat.',
        aksi: 'pilih-takaran',
        sumber: 'Larutan Pb-asetat',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 10, satuan: 'tetes' },
        hasilVisual: [
          { jenis: 'warna', nilai: '#1c1c1c' },   /* larutan menghitam, PbS */
          { jenis: 'teks', nilai: 'Larutan menghitam (PbS) = ada Sulfur (S).' }
        ],
        safety: 'Pb-asetat toksik (senyawa timbal) — jangan kena kulit, jangan dibuang ke wastafel, tampung di limbah B3.',
        salahUmum: [
          {
            jika: { sumber: 'Larutan Pb-asetat', belum: ['Larutan NaOH 10%'] },
            pesan: 'Didihkan albumin + NaOH 10% dulu, baru teteskan Pb-asetat.'
          },
          {
            jika: { sumber: 'Larutan Pb-asetat', takaran: 'salah' },
            pesan: 'Pb-asetat diteteskan: 10 tetes, bukan diukur cc.'
          }
        ]
      },
      {
        babak: B4,
        instruksi: 'Tambahkan 1 cc HCl pekat.',
        aksi: 'pilih-takaran',
        sumber: 'HCl pekat',
        target: 'Tabung reaksi',
        takaranBenar: { nilai: 1, satuan: 'cc' },
        hasilVisual: [
          { jenis: 'gas' },
          { jenis: 'teks', nilai: 'Tercium bau khas H2S.' }
        ],
        safety: 'HCl pekat korosif; gas H2S yang keluar beracun — kerjakan di lemari asam, jangan dihirup.',
        salahUmum: [
          {
            jika: { sumber: 'HCl pekat', sudah: ['Larutan NaOH 10%'], belum: ['Larutan Pb-asetat'] },
            pesan: 'Teteskan Pb-asetat dulu sampai larutan menghitam, HCl baru setelah itu.'
          }
        ]
      },
      {
        babak: B4,
        instruksi: 'Amati warna larutan dan bau gas yang keluar.',
        aksi: 'amati',
        sumber: 'Pengamatan visual',
        target: 'Tabung reaksi',
        hasilVisual: { jenis: 'teks', nilai: 'Sulfur terdeteksi (jalur Pb-asetat).' }
      }
    ],

    interpretasiAkhir:
      'Protein tersusun dari C, H, O, N, dan S. Terbukti: arang (C), embun (H & O), ' +
      'amonia + lakmus biru (N), endapan putih BaSO4 dan larutan menghitam PbS (S).'
  });
})();
