/* registry.js — daftar modul + room untuk menu dua-tingkat.
   Dimuat PALING AWAL. File data percobaan mendaftarkan dirinya sendiri
   ke window.PRAKTIKUM (lihat js/data/biuret.js).

   Menu punya dua tingkat: kartu MODUL -> daftar ROOM milik modul itu.
   Urutan modul di menu = urutan kemunculan pertama nilai `modul` di
   PRAKTIKUM_ROOMS (jadi Biokimia dulu, lalu Biomedik).

   Room berstatus kunci:true = kartu "Segera hadir", belum punya file data. */

window.PRAKTIKUM = window.PRAKTIKUM || [];

/* Identitas app (judul layar kartu modul). */
window.PRAKTIKUM_APP = {
  nama: 'Praktikum Sim',
  sub: 'Pilih modul praktikum'
};

/* Metadata per modul. Kunci objek = nilai field `modul` di PRAKTIKUM_ROOMS. */
window.PRAKTIKUM_MODUL_META = {
  Biokimia: { nama: 'Biokimia Blok 1.1', sub: 'Asam Amino & Protein — 5 percobaan' },
  Biomedik: { nama: 'Biomedik Blok 1.1', sub: 'Biologi Molekuler — 3 percobaan (pipeline)' }
};

window.PRAKTIKUM_ROOMS = [
  { id: 'susunan-elementer', nama: 'Susunan Elementer Protein', modul: 'Biokimia', kunci: false, catatan: 'Uji unsur C, H, O, N, S — 4 sub-uji' },
  { id: 'biuret',            nama: 'Reaksi Biuret',             modul: 'Biokimia', kunci: false, catatan: 'Uji ikatan peptida' },
  { id: 'xanthoprotein',     nama: 'Reaksi Xanthoprotein',      modul: 'Biokimia', kunci: false, catatan: 'Uji inti benzena' },
  { id: 'millon',            nama: 'Reaksi Millon',             modul: 'Biokimia', kunci: false, catatan: 'Uji gugus fenol (tirosin)' },
  { id: 'asam-urat',         nama: 'Tes Kadar Asam Urat',       modul: 'Biokimia', kunci: false, catatan: 'Alur alat: lanset + Easy Touch' },

  /* Biomedik — elektroforesis masih placeholder (#B4). */
  { id: 'isolasi-dna',       nama: 'Isolasi DNA',               modul: 'Biomedik', kunci: false, catatan: 'Ekstraksi DNA dari darah (spin-column)' },
  { id: 'pcr',               nama: 'PCR',                       modul: 'Biomedik', kunci: false, catatan: 'Amplifikasi DNA (thermal cycler)' },
  { id: 'elektroforesis',    nama: 'Elektroforesis',            modul: 'Biomedik', kunci: true,  catatan: 'Pemisahan DNA di gel agarose' }
];
