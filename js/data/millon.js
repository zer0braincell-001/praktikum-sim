/* millon.js — data percobaan "Reaksi Millon".
   Takaran & cara kerja: Buku Petunjuk Praktikum Biokimia Blok 1.1.
   Hasil visual SCRIPTED, bukan dihitung engine.

   Data murni: tidak ada kemampuan engine baru yang dibutuhkan percobaan ini.
   Semua sudah ada sejak Xanthoprotein (aksi nyalakan/panaskan, endapan,
   kondisi salahUmum `belum` untuk alat/aksi).

   Catatan langkah 5: buku menyebut endapan putih yang BERUBAH jadi merah
   saat dipanaskan — jadi dipakai {jenis:'endapan', nilai:merah} yang menimpa
   warna endapan lama, bukan endapan-larut. Endapannya tidak hilang, dia
   berubah warna; itu yang akan dilihat di lab. */

window.PRAKTIKUM = window.PRAKTIKUM || [];

window.PRAKTIKUM.push({
  id: 'millon',
  nama: 'Reaksi Millon',

  dasarTeoriRingkas:
    'Spesifik untuk derivat monofenol (tirosin). Pereaksi Millon (ion merkuri dalam ' +
    'asam nitrat/nitrit) + protein bertirosin → endapan putih, dipanaskan menjadi merah = positif.',

  alatBahan: [
    { nama: 'Tabung reaksi',      jumlah: '1 buah' },
    { nama: 'Larutan albumin 2%', jumlah: '2 cc' },
    { nama: 'Pereaksi Millon',    jumlah: 'beberapa tetes' },
    { nama: 'Pembakar spiritus',  jumlah: '1 buah' }
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
      instruksi: 'Tambahkan pereaksi Millon beberapa tetes (3 tetes) ke dalam tabung.',
      aksi: 'pilih-takaran',
      sumber: 'Pereaksi Millon',
      target: 'Tabung reaksi',
      takaranBenar: { nilai: 3, satuan: 'tetes' },
      hasilVisual: { jenis: 'endapan', nilai: '#ecebe6' }, /* endapan putih */
      safety: 'Pereaksi Millon mengandung merkuri & asam nitrat — sangat toksik dan korosif. Jangan kena kulit, jangan dihirup.',
      salahUmum: [
        {
          jika: { sumber: 'Pereaksi Millon', belum: ['Larutan albumin 2%'] },
          pesan: 'Albumin dulu ke tabung, baru pereaksi Millon.'
        },
        {
          jika: { sumber: 'Pereaksi Millon', takaran: 'salah' },
          pesan: 'Pereaksi Millon ditambahkan tetes demi tetes — 3 tetes, bukan diukur cc.'
        }
      ]
    },
    {
      instruksi: 'Nyalakan pembakar spiritus.',
      aksi: 'nyalakan',
      sumber: 'Pembakar spiritus',
      target: 'Meja kerja',
      safety: 'Nyalakan dari samping, jangan condongkan wajah ke atas sumbu.'
    },
    {
      instruksi: 'Panaskan tabung sampai endapan putih berubah menjadi merah.',
      aksi: 'panaskan',
      sumber: 'Pembakar spiritus',
      target: 'Tabung reaksi',
      hasilVisual: { jenis: 'endapan', nilai: '#c0281f' }, /* endapan jadi merah */
      safety: 'Panaskan sambil digoyang, mulut tabung menjauh dari orang.',
      salahUmum: [
        {
          jika: { aksi: 'panaskan', belum: ['Pembakar spiritus'] },
          pesan: 'Nyalakan pembakar dulu.'
        }
      ]
    },
    {
      instruksi: 'Amati warna endapan/larutan.',
      aksi: 'amati',
      sumber: 'Pengamatan visual',
      target: 'Tabung reaksi',
      hasilVisual: {
        jenis: 'teks',
        nilai: 'Warna merah = Millon POSITIF (ada tirosin/monofenol).'
      }
    }
  ],

  interpretasiAkhir:
    'Merah = positif gugus fenol tirosin. Protein tanpa tirosin (mis. gelatin) ' +
    'tidak memberi warna merah — itu yang membedakan Millon dari uji protein umum.'
});
