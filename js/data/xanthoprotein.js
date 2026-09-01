/* xanthoprotein.js — data percobaan "Reaksi Xanthoprotein".
   Takaran & cara kerja: Buku Petunjuk Praktikum Biokimia Blok 1.1.
   Hasil visual SCRIPTED, bukan dihitung engine.

   Percobaan pertama yang memakai api: aksi "nyalakan" + "panaskan",
   hasilVisual berupa ARRAY (endapan larut lalu larutan menguning),
   dan jenis "endapan-larut" untuk menghapus endapan yang sudah ada.
   Konvensi kondisi salahUmum sama dengan biuret.js — `belum`/`sudah`
   juga berlaku untuk alat/aksi, mis. belum: ['Pembakar spiritus']. */

window.PRAKTIKUM = window.PRAKTIKUM || [];

window.PRAKTIKUM.push({
  id: 'xanthoprotein',
  nama: 'Reaksi Xanthoprotein',

  dasarTeoriRingkas:
    'Nitrasi inti benzena pada asam amino aromatik (tirosin, fenilalanin, triptofan). ' +
    'Endapan putih → dipanaskan jadi kuning → dalam suasana alkali jadi jingga = positif.',

  alatBahan: [
    { nama: 'Tabung reaksi',        jumlah: '1 buah' },
    { nama: 'Larutan albumin 2%',   jumlah: '2 cc' },
    { nama: 'HNO3 pekat',           jumlah: '1 cc' },
    { nama: 'Pembakar spiritus',    jumlah: '1 buah' },
    { nama: 'Larutan NaOH pekat',   jumlah: 'secukupnya, tetes demi tetes' }
  ],

  langkah: [
    {
      instruksi: 'Siapkan tabung reaksi bersih dan kering di area kerja.',
      aksi: 'drag',
      sumber: 'Tabung reaksi',
      target: 'Meja kerja',
      safety: 'Pakai tabung yang bersih, kering, dan tidak retak — tabung retak bisa pecah saat dipanaskan.'
    },
    {
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
      instruksi: 'Tambahkan 1 cc HNO3 pekat perlahan lewat dinding tabung.',
      aksi: 'pilih-takaran',
      sumber: 'HNO3 pekat',
      target: 'Tabung reaksi',
      takaranBenar: { nilai: 1, satuan: 'cc' },
      hasilVisual: { jenis: 'endapan', nilai: '#ecebe6' }, /* endapan putih */
      safety: 'HNO3 pekat sangat korosif & mengeluarkan uap — tuang di lemari asam / jauh dari wajah, jangan dihirup.',
      salahUmum: [
        {
          jika: { sumber: 'HNO3 pekat', belum: ['Larutan albumin 2%'] },
          pesan: 'Albumin dulu ke tabung, baru HNO3.'
        },
        {
          jika: { sumber: 'HNO3 pekat', takaran: 'salah' },
          pesan: 'Takaran HNO3 tidak tepat. Buku praktikum: 1 cc HNO3 pekat.'
        }
      ]
    },
    {
      instruksi: 'Nyalakan pembakar spiritus.',
      aksi: 'nyalakan',
      sumber: 'Pembakar spiritus',
      target: 'Meja kerja',
      safety: 'Nyalakan spiritus dengan korek dari samping, jangan condongkan wajah ke atas sumbu.'
    },
    {
      instruksi: 'Panaskan tabung sampai endapan putih larut dan larutan menjadi kuning.',
      aksi: 'panaskan',
      sumber: 'Pembakar spiritus',
      target: 'Tabung reaksi',
      hasilVisual: [
        { jenis: 'endapan-larut' },
        { jenis: 'warna', nilai: '#e3c317' }  /* kuning */
      ],
      safety: 'Panaskan sambil digoyang, mulut tabung diarahkan menjauh dari orang.',
      salahUmum: [
        {
          jika: { aksi: 'panaskan', belum: ['Pembakar spiritus'] },
          pesan: 'Nyalakan pembakar dulu.'
        }
      ]
    },
    {
      instruksi: 'Tambahkan larutan NaOH pekat tetes demi tetes (3 tetes) sampai suasana alkali.',
      aksi: 'pilih-takaran',
      sumber: 'Larutan NaOH pekat',
      target: 'Tabung reaksi',
      takaranBenar: { nilai: 3, satuan: 'tetes' },
      hasilVisual: { jenis: 'warna', nilai: '#e8791e' }, /* jingga */
      safety: 'NaOH pekat kaustik — teteskan pelan-pelan, jangan sampai memercik.',
      salahUmum: [
        {
          jika: { sumber: 'Larutan NaOH pekat', belum: ['HNO3 pekat'] },
          pesan: 'Nitrasi dulu: albumin + HNO3, lalu dipanaskan. NaOH baru di akhir untuk suasana alkali.'
        },
        {
          jika: { sumber: 'Larutan NaOH pekat', takaran: 'salah' },
          pesan: 'NaOH pekat ditambahkan tetes demi tetes — 3 tetes, bukan diukur cc.'
        }
      ]
    },
    {
      instruksi: 'Amati warna larutan.',
      aksi: 'amati',
      sumber: 'Pengamatan visual',
      target: 'Tabung reaksi',
      hasilVisual: {
        jenis: 'teks',
        nilai: 'Larutan jingga = Xanthoprotein POSITIF (ada asam amino aromatik).'
      }
    }
  ],

  interpretasiAkhir:
    'Kuning lalu jingga dalam suasana alkali = positif inti benzena ' +
    '(tirosin/triptofan/fenilalanin). Protein yang tak punya asam amino aromatik ' +
    'tidak memberi warna ini.'
});
