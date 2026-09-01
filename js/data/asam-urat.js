/* asam-urat.js — data "Tes Kadar Asam Urat".
   Alur alat dari Buku Petunjuk Praktikum Biokimia Blok 1.1.

   Room pertama ber-`tipe: 'prosedur'`: tidak ada tabung reaksi, tidak ada
   takaran. Area kerja = zona target (Alat Easy Touch / Tempat lanset /
   Jari pasien / Strip asam urat) berisi alat yang sudah terpasang.
   Yang dinilai = URUTAN prosedur, bukan takaran. Versi RINGAN: hasil angka
   scripted, tanpa visual darah/alat realistis.

   Langkah aksi "tindakan" = tombol di panel Aksi; teksnya diambil dari
   field `label`, dan `label` ikut divalidasi supaya "buka" tidak bisa
   dipakai untuk lolos langkah "tutup". */

window.PRAKTIKUM = window.PRAKTIKUM || [];

window.PRAKTIKUM.push({
  id: 'asam-urat',
  nama: 'Tes Kadar Asam Urat',
  tipe: 'prosedur',

  dasarTeoriRingkas:
    'Mengukur kadar asam urat darah dengan alat Easy Touch + strip. ' +
    'Normal laki-laki 3–7,2 mg/dL; perempuan 2–6 mg/dL.',

  alatBahan: [
    { nama: 'Alat Easy Touch',  jumlah: '1 unit' },
    { nama: 'Baterai',          jumlah: 'sesuai alat' },
    { nama: 'Strip aktivasi',   jumlah: '1 strip' },
    { nama: 'Strip kalibrasi',  jumlah: '1 strip' },
    { nama: 'Strip asam urat',  jumlah: '1 strip' },
    { nama: 'Lanset',           jumlah: '1 buah (sekali pakai)' },
    { nama: 'Alkohol swab',     jumlah: '1 buah' },
    { nama: 'Jari pasien',      jumlah: 'ujung jari' }
  ],

  langkah: [
    {
      instruksi: 'Pasang baterai ke alat Easy Touch.',
      aksi: 'drag',
      sumber: 'Baterai',
      target: 'Alat Easy Touch'
    },
    {
      instruksi: 'Buka tempat lanset dengan memutar ke kanan.',
      aksi: 'tindakan',
      label: 'Buka tempat lanset (putar kanan)',
      sumber: 'Alat Easy Touch',
      target: 'Tempat lanset',
      safety: 'Jarum lanset tajam dan sekali pakai — jangan disentuh ujungnya, jangan dipakai ulang untuk orang lain.'
    },
    {
      instruksi: 'Pasang lanset ke tempatnya, lalu cabut penutup jarumnya.',
      aksi: 'drag',
      sumber: 'Lanset',
      target: 'Tempat lanset',
      salahUmum: [
        {
          jika: { sumber: 'Lanset', target: 'Tempat lanset', belum: ['Alat Easy Touch'] },
          pesan: 'Tempat lanset masih tertutup — buka dulu (putar kanan).'
        }
      ]
    },
    {
      instruksi: 'Tutup tempat lanset (putar kiri) dan atur kedalaman tusukan.',
      aksi: 'tindakan',
      label: 'Tutup tempat lanset & atur kedalaman',
      sumber: 'Alat Easy Touch',
      target: 'Tempat lanset'
    },
    {
      instruksi: 'Usap ujung jari pasien dengan alkohol swab.',
      aksi: 'drag',
      sumber: 'Alkohol swab',
      target: 'Jari pasien',
      safety: 'Pakai swab sekali pakai, lalu biarkan alkoholnya kering dulu sebelum ditusuk.'
    },
    {
      instruksi: 'Pasang strip aktivasi ke alat sampai layar menampilkan "OK".',
      aksi: 'drag',
      sumber: 'Strip aktivasi',
      target: 'Alat Easy Touch',
      hasilVisual: { jenis: 'teks', nilai: 'Alat menampilkan "OK".' }
    },
    {
      instruksi: 'Lepaskan strip aktivasi dari alat.',
      aksi: 'tindakan',
      label: 'Lepaskan strip aktivasi',
      sumber: 'Strip aktivasi',
      target: 'Alat Easy Touch'
    },
    {
      instruksi: 'Pasang strip kalibrasi sampai muncul kode "AU".',
      aksi: 'drag',
      sumber: 'Strip kalibrasi',
      target: 'Alat Easy Touch',
      hasilVisual: { jenis: 'teks', nilai: 'Alat menampilkan kode "AU".' }
    },
    {
      instruksi: 'Pasang strip asam urat sampai muncul gambar tetesan darah.',
      aksi: 'drag',
      sumber: 'Strip asam urat',
      target: 'Alat Easy Touch',
      hasilVisual: { jenis: 'teks', nilai: 'Ikon tetesan darah muncul — alat siap menerima sampel.' }
    },
    {
      instruksi: 'Tusuk ujung jari pasien dengan lanset (tekan pematik).',
      aksi: 'tindakan',
      label: 'Tusuk ujung jari (tekan pematik)',
      sumber: 'Lanset',
      target: 'Jari pasien',
      safety: 'Setelah dipakai, buang lanset ke safety box — jangan ditutup ulang dengan tangan.',
      salahUmum: [
        {
          jika: { aksi: 'tindakan', target: 'Jari pasien', belum: ['Alkohol swab'] },
          pesan: 'Usap jari dgn alkohol dulu sebelum menusuk.'
        }
      ]
    },
    {
      instruksi: 'Sentuhkan tetes darah ke ujung strip sampai terserap penuh.',
      aksi: 'drag',
      sumber: 'Jari pasien',
      target: 'Strip asam urat',
      salahUmum: [
        {
          jika: { sumber: 'Jari pasien', belum: ['Strip asam urat'] },
          pesan: 'Pasang strip asam urat dulu.'
        }
      ]
    },
    {
      instruksi: 'Tunggu alat menghitung, lalu baca hasilnya.',
      aksi: 'tindakan',
      label: 'Baca hasil',
      sumber: 'Alat Easy Touch',
      target: 'Alat Easy Touch',
      hasilVisual: { jenis: 'teks', nilai: 'Kadar asam urat: 5,4 mg/dL.' }
    }
  ],

  interpretasiAkhir:
    '5,4 mg/dL = dalam batas normal untuk laki-laki (3–7,2 mg/dL). ' +
    'Untuk perempuan batas normal 2–6 mg/dL. Di atas batas = hiperurisemia (risiko gout).'
});
