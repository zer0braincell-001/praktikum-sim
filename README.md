# Praktikum Sim

Trainer pra-praktikum berbasis browser: "menjalankan" percobaan lab secara terpandu
sebelum masuk lab asli — takaran (gram/%/µL), urutan langkah, teknik, dan safety.
Bukan pengganti praktikum; ini latihan sebelum praktikum.

## Cara buka
Buka `index.html` langsung di browser (jalan dari `file://`, tanpa server), atau
kunjungi versi live-nya (URL Vercel).

## Isi
- **Biokimia Blok 1.1 — Asam Amino & Protein** (5 percobaan): Susunan Elementer,
  Reaksi Biuret, Xanthoprotein, Millon, Tes Kadar Asam Urat.
- **Biomedik Blok 1.1 — Biologi Molekuler** (pipeline): Isolasi DNA → PCR →
  Elektroforesis. *(sedang dibangun)*

Tiap percobaan punya mode **Belajar** (langkah tampil) dan **Ujian** (dari ingatan,
urutan tetap dinilai) + skor.

## Teknis
Vanilla JS + HTML + CSS, zero dependency, offline. Satu engine generik + satu file
data per percobaan (`js/data/`); menambah percobaan = menambah file data.

## Sumber
Buku Petunjuk Praktikum Biokimia Blok 1.1 & materi Lab Biomedik FK UNS Blok 1.1.
