/* histo-fibroblas-fibrosit.js — room pertama modul HISTOLOGI.

   PARADIGMA BARU: identifikasi, bukan manipulasi. Tidak ada rak, takaran, atau
   urutan langkah — yang ada preparat + urutan `soal`. Cangkangnya (menu
   dua-tingkat, pemilih mode Belajar/Ujian, skor, layar Selesai) dipakai ulang
   apa adanya dari room biokimia/biomedik.

   GAMBAR MASIH PLACEHOLDER. File di img/histologi/ sengaja skematik dan
   bertuliskan "PLACEHOLDER" — mikrograf yang kelihatan realistis tapi palsu
   itu menyesatkan untuk trainer identifikasi. Saat mikrograf CC terverifikasi
   masuk, yang berubah CUMA dua hal per preparat:
     1. `gambar`   -> path .jpg-nya
     2. `region`   -> disetel ulang ke koordinat sel di foto itu
   `region` memakai koordinat RELATIF (0..1) terhadap gambar, jadi tidak
   bergantung ukuran file maupun ukuran layar. `atribusi` wajib diisi saat itu:
   panel "Sumber & lisensi gambar" merendernya di kolom kiri DAN di layar
   Selesai, karena lisensi CC-BY menuntut atribusi yang terlihat.

   Isi keilmuan: fibroblas = sel AKTIF (mensintesis matriks), fibrosit = bentuk
   non-aktif/istirahat dari sel yang sama. Pembedanya bentuk, inti, dan jumlah
   sitoplasma — persis yang ditabelkan di `rangkuman`. */

(function () {
  'use strict';

  var AREOLAR = 'Jaringan ikat longgar (areolar)';
  var TENDON = 'Tendon (jaringan ikat padat teratur)';

  window.PRAKTIKUM = window.PRAKTIKUM || [];

  window.PRAKTIKUM.push({
    id: 'histo-fibroblas-fibrosit',
    nama: 'Fibroblas vs Fibrosit',
    tipe: 'histologi',

    dasarTeoriRingkas:
      'Fibroblas dan fibrosit adalah sel yang sama dalam dua keadaan. Fibroblas ' +
      'sedang AKTIF menyintesis matriks: badannya bercabang, intinya besar dan ' +
      'pucat (kromatin terurai = gen sedang dibaca), sitoplasmanya banyak. ' +
      'Fibrosit adalah bentuk istirahatnya: lebih kecil dan lonjong, intinya ' +
      'memanjang dan gelap (kromatin padat), sitoplasmanya sedikit. Cari sel ' +
      'aktif di jaringan ikat longgar, dan sel istirahat di tendon.',

    preparat: [
      {
        nama: AREOLAR,
        gambar: 'img/histologi/PLACEHOLDER-areolar.svg',
        atribusi: { sumber: '(menyusul)', pembuat: '', lisensi: '', url: '' },
        perbesaran: '400x',
        struktur: [
          {
            nama: 'Fibroblas',
            region: { x: 0.40, y: 0.40, w: 0.15, h: 0.15 },
            kriteria: {
              Bentuk: 'bercabang (stellate)',
              Inti: 'ovoid, besar, tercat lemah, kromatin halus, nukleolus menonjol',
              Sitoplasma: 'banyak, kaya RE kasar & Golgi'
            }
          }
        ]
      },
      {
        nama: TENDON,
        gambar: 'img/histologi/PLACEHOLDER-tendon.svg',
        atribusi: { sumber: '(menyusul)', pembuat: '', lisensi: '', url: '' },
        perbesaran: '400x',
        struktur: [
          {
            nama: 'Fibrosit',
            region: { x: 0.45, y: 0.50, w: 0.12, h: 0.10 },
            kriteria: {
              Bentuk: 'lonjong/spindle, sedikit percabangan, lebih kecil',
              Inti: 'memanjang, lebih kecil, tercat lebih tua (gelap)',
              Sitoplasma: 'sedikit RE kasar, asidofilik'
            }
          }
        ]
      }
    ],

    soal: [
      {
        tipe: 'identifikasi',
        preparat: AREOLAR,
        pertanyaan: 'Sel penyintesis matriks yang dominan di preparat ini?',
        pilihan: ['Fibroblas', 'Fibrosit', 'Sel mast', 'Makrofag'],
        jawaban: 'Fibroblas',
        penjelasan: 'Inti besar-pucat + sitoplasma banyak bercabang = sel AKTIF (fibroblas).'
      },
      {
        tipe: 'tunjuk',
        preparat: AREOLAR,
        instruksi: 'Klik satu fibroblas.',
        targetStruktur: 'Fibroblas',
        penjelasan: 'Dikenali dari inti ovoid besar yang pucat.'
      },
      {
        tipe: 'identifikasi',
        preparat: TENDON,
        pertanyaan: 'Sel di antara berkas kolagen sejajar ini?',
        pilihan: ['Fibrosit', 'Fibroblas', 'Kondrosit', 'Sel mast'],
        jawaban: 'Fibrosit',
        penjelasan: 'Inti pipih memanjang gelap + sitoplasma sedikit = sel non-aktif (fibrosit).'
      },
      {
        tipe: 'tunjuk',
        preparat: TENDON,
        instruksi: 'Klik satu fibrosit.',
        targetStruktur: 'Fibrosit',
        penjelasan: 'Inti spindle gelap terjepit di antara serat kolagen.'
      }
    ],

    rangkuman:
      'Fibroblas (aktif) vs fibrosit (non-aktif) dibedakan dari tiga hal: bentuk ' +
      'sel, wujud inti, dan banyaknya sitoplasma. Intinya satu prinsip — sel yang ' +
      'sedang bekerja punya inti besar-pucat dan sitoplasma banyak; sel yang ' +
      'istirahat punya inti kecil-gelap dan sitoplasma sedikit.'
  });
})();
