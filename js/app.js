// ==========================================
// 1. VARIABEL GLOBAL & INISIALISASI
// ==========================================
let batasHarianDinamis = 50000;
let dompetTerpilih = 'tunai';
let dompetHutangTerpilih = 'tunai';
let kategoriTerpilih = 'Rokok & Kopi';
let tipeHutangTerpilih = 'piutang';
let nominalInputString = '';

// ==========================================
// 2. FUNGSI PENYIMPANAN LOCALSTORAGE
// ==========================================
function bacaData(kunci, bawaan) {
  try {
    const item = localStorage.getItem(kunci);
    return item ? JSON.parse(item) : bawaan;
  } catch (e) {
    return bawaan;
  }
}

function tulisData(kunci, nilai) {
  try {
    localStorage.setItem(kunci, JSON.stringify(nilai));
  } catch (e) {
    console.error(e);
  }
}

// ==========================================
// 3. PENGELOLAAN SALDO DOMPET
// ==========================================
function siapkanSaldo() {
  let saldo = bacaData('artos_saldo', null);
  if (!saldo || typeof saldo !== 'object') {
    saldo = { tunai: 0, gopay: 0, mandiri: 2500000 };
    tulisData('artos_saldo', saldo);
  }
  renderTampilanSaldo();
}

function renderTampilanSaldo() {
  const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });
  const elTunai = document.getElementById('saldo-tunai');
  const elGopay = document.getElementById('saldo-gopay');
  const elMandiri = document.getElementById('saldo-mandiri');

  if (elTunai) elTunai.innerText = 'Rp ' + Number(saldo.tunai || 0).toLocaleString('id-ID');
  if (elGopay) elGopay.innerText = 'Rp ' + Number(saldo.gopay || 0).toLocaleString('id-ID');
  if (elMandiri) elMandiri.innerText = 'Rp ' + Number(saldo.mandiri || 0).toLocaleString('id-ID');
}

// ==========================================
// 4. LOGIKA KEYPAD NUMERIK (NUMPAD)
// ==========================================
function updateDisplayNominal() {
  const elDisplay = document.getElementById('displayNominal');
  if (!elDisplay) return;
  if (!nominalInputString || nominalInputString === '0') {
    elDisplay.innerText = 'Rp 0';
  } else {
    const val = parseInt(nominalInputString) || 0;
    elDisplay.innerText = 'Rp ' + val.toLocaleString('id-ID');
  }
}

function pasangKeypad() {
  // Tombol Angka 0-9 dan 000
  document.querySelectorAll('.btn-num').forEach(btn => {
    btn.addEventListener('click', function() {
      const angka = this.getAttribute('data-num');
      if (nominalInputString === '' && (angka === '0' || angka === '000')) return;
      if (nominalInputString.length >= 9) return;
      nominalInputString += angka;
      updateDisplayNominal();
    });
  });

  // Tombol Cepat (+15k)
  document.querySelectorAll('.btn-quick-tag').forEach(btn => {
    btn.addEventListener('click', function() {
      const tambah = parseInt(this.getAttribute('data-quick')) || 0;
      const sekarang = parseInt(nominalInputString) || 0;
      nominalInputString = (sekarang + tambah).toString();
      updateDisplayNominal();
    });
  });

  // Tombol Hapus Digit (Backspace)
  const btnHapus = document.getElementById('btnHapusDigit');
  if (btnHapus) {
    btnHapus.addEventListener('click', function() {
      if (nominalInputString.length > 0) {
        nominalInputString = nominalInputString.slice(0, -1);
        updateDisplayNominal();
      }
    });
  }
}

// ==========================================
// 5. KALKULASI ANGGARAN HARIAN DINAMIS
// ==========================================
function hitungBatasHarianOtomatis() {
  const hutangList = bacaData('artos_hutang', []);
  let totalUtang = 0;
  hutangList.filter(h => !h.lunas && h.tipe === 'hutang').forEach(h => {
    totalUtang += h.nominal;
  });

  const sekarang = new Date();
  const tahun = sekarang.getFullYear();
  const bulan = sekarang.getMonth();
  const totalHariBulan = new Date(tahun, bulan + 1, 0).getDate();
  const hariIni = sekarang.getDate();
  const sisaHari = (totalHariBulan - hariIni) + 1;

  let batas = 50000;
  const infoEl = document.getElementById('infoPenyesuaian');

  if (totalUtang > 0) {
    const potonganPerHari = Math.round(totalUtang / Math.max(sisaHari, 15));
    batas = Math.max(20000, 50000 - potonganPerHari);
    if (infoEl) {
      infoEl.innerHTML = `<span style="color:#b91c1c;"><i class="bi bi-exclamation-circle"></i> Anggaran dipangkas Rp ${potonganPerHari.toLocaleString('id-ID')}/hari untuk cadangan pelunasan utang (Rp ${totalUtang.toLocaleString('id-ID')}).</span>`;
    }
  } else {
    if (infoEl) {
      infoEl.innerHTML = `Kuota fleksibel harian terhitung aman berdasarkan sisa ${sisaHari} hari pada bulan ini.`;
    }
  }

  batasHarianDinamis = batas;
  const badgeBatas = document.getElementById('badgeBatas');
  if (badgeBatas) badgeBatas.innerText = `Maks: Rp ${batas.toLocaleString('id-ID')}`;
}

function renderDasbor() {
  hitungBatasHarianOtomatis();
  const logs = bacaData('catatan_uang', []);
  const hariIni = new Date().toISOString().split('T')[0];

  let keluarHariIni = 0;
  logs.forEach(l => {
    if (l.waktu && l.waktu.startsWith(hariIni) && l.jenis === 'Keluar' && l.kategori === 'Rokok & Kopi') {
      keluarHariIni += l.nominal;
    }
  });

  const sisa = batasHarianDinamis - keluarHariIni;
  const teksKuota = document.getElementById('teksSisaKuota');
  if (teksKuota) teksKuota.innerHTML = `<b>Rp ${sisa.toLocaleString('id-ID')}</b>`;

  let persen = (keluarHariIni / batasHarianDinamis) * 100;
  if (persen > 100) persen = 100;

  const bar = document.getElementById('barKuota');
  if (bar) {
    bar.style.width = persen + '%';
    if (persen > 90) bar.style.backgroundColor = '#b91c1c';
    else if (persen > 70) bar.style.backgroundColor = '#d97706';
    else bar.style.backgroundColor = '#2d6a4f';
  }
}

// ==========================================
// 6. LEMBAR SETELAN SALDO & KUNCI API
// ==========================================
const sheetSaldo = document.getElementById('sheetSaldo');
const btnBukaSheetSaldo = document.getElementById('btnBukaSheetSaldo');
const btnTutupSheet = document.getElementById('btnTutupSheet');
const btnSimpanSemuaSaldo = document.getElementById('btnSimpanSemuaSaldo');

if (btnBukaSheetSaldo && sheetSaldo) {
  btnBukaSheetSaldo.addEventListener('click', function() {
    const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });
    document.getElementById('inpSheetTunai').value = saldo.tunai || 0;
    document.getElementById('inpSheetGopay').value = saldo.gopay || 0;
    document.getElementById('inpSheetMandiri').value = saldo.mandiri || 0;
    document.getElementById('inpApiKey').value = localStorage.getItem('artos_gemini_key') || '';
    sheetSaldo.classList.add('open');
  });
}

if (btnTutupSheet && sheetSaldo) {
  btnTutupSheet.addEventListener('click', function() {
    sheetSaldo.classList.remove('open');
  });
}

if (sheetSaldo) {
  sheetSaldo.addEventListener('click', function(e) {
    if (e.target === sheetSaldo) {
      sheetSaldo.classList.remove('open');
    }
  });
}

if (btnSimpanSemuaSaldo) {
  btnSimpanSemuaSaldo.addEventListener('click', function() {
    const saldoBaru = {
      tunai: parseInt(document.getElementById('inpSheetTunai').value) || 0,
      gopay: parseInt(document.getElementById('inpSheetGopay').value) || 0,
      mandiri: parseInt(document.getElementById('inpSheetMandiri').value) || 0
    };

    const keyBaru = document.getElementById('inpApiKey').value.trim();
    if (keyBaru) {
      localStorage.setItem('artos_gemini_key', keyBaru);
    }

    tulisData('artos_saldo', saldoBaru);
    if (sheetSaldo) sheetSaldo.classList.remove('open');
    renderTampilanSaldo();
    renderDasbor();
    renderLaporan();
    alert('Seluruh setelan dan saldo berhasil diperbarui.');
  });
}

// ==========================================
// 7. NAVIGASI TAB & PILIHAN INTERAKTIF
// ==========================================
function pasangNavigasi() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function() {
      const tabTujuan = this.getAttribute('data-tab');
      const judul = this.getAttribute('data-title');
      const ikon = this.getAttribute('data-icon');

      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

      const elTujuan = document.getElementById('page-' + tabTujuan);
      if (elTujuan) elTujuan.classList.add('active');
      this.classList.add('active');

      const elHeader = document.getElementById('appHeader');
      if (elHeader) elHeader.innerHTML = `<i class="bi ${ikon}"></i> <span>${judul}</span>`;

      if (tabTujuan === 'hutang') renderHutang();
      if (tabTujuan === 'riwayat') renderRiwayat();
      if (tabTujuan === 'laporan') renderLaporan();
      if (tabTujuan === 'catat') renderDasbor();
    });
  });
}

function pasangPilihanDompet() {
  document.querySelectorAll('#group-dompet .wallet-pill').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#group-dompet .wallet-pill').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      dompetTerpilih = this.getAttribute('data-val');
    });
  });

  document.querySelectorAll('#group-dompet-ht .wallet-pill').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#group-dompet-ht .wallet-pill').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      dompetHutangTerpilih = this.getAttribute('data-val');
    });
  });

  document.querySelectorAll('#group-tipe-ht .wallet-pill').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#group-tipe-ht .wallet-pill').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      tipeHutangTerpilih = this.getAttribute('data-tipe');
    });
  });
}

function pasangPilihanKategori() {
  document.querySelectorAll('#group-kategori .chip-kat').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('#group-kategori .chip-kat').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      kategoriTerpilih = this.getAttribute('data-kat');
    });
  });
}

// ==========================================
// 8. TRANSAKSI PENGELUARAN & INSENTIF
// ==========================================
const btnInsentif = document.getElementById('btnInsentif');
if (btnInsentif) {
  btnInsentif.addEventListener('click', function() {
    const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });
    saldo.tunai = (saldo.tunai || 0) + 15000;
    tulisData('artos_saldo', saldo);

    const logs = bacaData('catatan_uang', []);
    logs.push({ jenis: 'Masuk', kategori: 'Insentif Hadir', nominal: 15000, dompet: 'tunai', waktu: new Date().toISOString() });
    tulisData('catatan_uang', logs);

    renderTampilanSaldo();
    alert('Insentif Rp 15.000 berhasil dicatat ke saldo Tunai.');
  });
}

const btnSimpanPengeluaran = document.getElementById('btnSimpanPengeluaran');
if (btnSimpanPengeluaran) {
  btnSimpanPengeluaran.addEventListener('click', function() {
    const nom = parseInt(nominalInputString);
    if (!nom || nom <= 0) return alert('Silakan masukkan nominal pengeluaran melalui tombol angka.');

    const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });
    if ((saldo[dompetTerpilih] || 0) < nom) return alert('Saldo ' + dompetTerpilih.toUpperCase() + ' tidak cukup.');

    saldo[dompetTerpilih] -= nom;
    tulisData('artos_saldo', saldo);

    const logs = bacaData('catatan_uang', []);
    logs.push({ jenis: 'Keluar', kategori: kategoriTerpilih, nominal: nom, dompet: dompetTerpilih, waktu: new Date().toISOString() });
    tulisData('catatan_uang', logs);

    nominalInputString = '';
    updateDisplayNominal();
    renderTampilanSaldo();
    renderDasbor();
    alert('Pengeluaran berhasil dicatat.');
  });
}

// ==========================================
// 9. PENGELOLAAN PINJAMAN (UTANG & PIUTANG)
// ==========================================
const btnSimpanHutang = document.getElementById('btnSimpanHutang');
if (btnSimpanHutang) {
  btnSimpanHutang.addEventListener('click', function() {
    const nama = document.getElementById('namaOrang').value.trim();
    const nom = parseInt(document.getElementById('nominalHutang').value);
    const tempo = document.getElementById('tglJatuhTempo').value;

    if (!nama || !nom || nom <= 0) return alert('Mohon lengkapi data transaksi.');

    const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });

    if (tipeHutangTerpilih === 'piutang') {
      if ((saldo[dompetHutangTerpilih] || 0) < nom) return alert('Saldo tidak cukup untuk meminjamkan.');
      saldo[dompetHutangTerpilih] -= nom;
    } else {
      saldo[dompetHutangTerpilih] = (saldo[dompetHutangTerpilih] || 0) + nom;
    }

    tulisData('artos_saldo', saldo);

    const hutangList = bacaData('artos_hutang', []);
    hutangList.push({ id: Date.now(), tipe: tipeHutangTerpilih, nama: nama, nominal: nom, dompet: dompetHutangTerpilih, tempo: tempo || null, lunas: false });
    tulisData('artos_hutang', hutangList);

    document.getElementById('namaOrang').value = '';
    document.getElementById('nominalHutang').value = '';
    document.getElementById('tglJatuhTempo').value = '';

    renderTampilanSaldo();
    renderHutang();
    renderDasbor();
    alert('Data berhasil dicatat. Sistem telah menyesuaikan batas anggaran harian Anda.');
  });
}

function renderHutang() {
  const hutangList = bacaData('artos_hutang', []);
  const wadah = document.getElementById('wadahHutang');
  if (!wadah) return;
  wadah.innerHTML = '';

  const aktif = hutangList.filter(h => !h.lunas);
  if (aktif.length === 0) {
    wadah.innerText = 'Semua pinjaman telah lunas.';
    return;
  }

  const hariIni = new Date().toISOString().split('T')[0];

  aktif.forEach(h => {
    const div = document.createElement('div');
    div.className = 'debt-card';
    const label = h.tipe === 'piutang' ? 'Piutang ke' : 'Utang dari';
    const warna = h.tipe === 'piutang' ? '#0284c7' : '#b91c1c';

    let tglInfo = '';
    if (h.tempo) {
      const lewat = h.tempo < hariIni;
      tglInfo = `<div style="font-size:0.75rem; color:#526b5d; margin-top:2px;">Tempo: ${h.tempo} ${lewat ? '<span class="overdue-badge">Lewat</span>' : ''}</div>`;
    }

    div.innerHTML = `
      <div>
        <span style="font-size:0.75rem; color:${warna}; font-weight:bold; text-transform:uppercase;">${label}</span>
        <div style="font-weight:600;">${h.nama}</div>
        <div style="font-size:0.9rem;">Rp ${h.nominal.toLocaleString('id-ID')} (${h.dompet})</div>
        ${tglInfo}
      </div>
    `;

    const btnLunas = document.createElement('button');
    btnLunas.className = 'btn-sm-lunas';
    btnLunas.innerText = 'Lunas';
    btnLunas.onclick = function() {
      lunaskanPinjaman(h.id);
    };

    div.appendChild(btnLunas);
    wadah.appendChild(div);
  });
}

function lunaskanPinjaman(id) {
  const hutangList = bacaData('artos_hutang', []);
  const target = hutangList.find(h => h.id === id);
  if (!target) return;

  const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });

  if (target.tipe === 'piutang') {
    saldo[target.dompet] = (saldo[target.dompet] || 0) + target.nominal;
  } else {
    if ((saldo[target.dompet] || 0) < target.nominal) return alert('Saldo tidak cukup untuk melunasi.');
    saldo[target.dompet] -= target.nominal;
  }

  target.lunas = true;
  tulisData('artos_saldo', saldo);
  tulisData('artos_hutang', hutangList);

  renderTampilanSaldo();
  renderHutang();
  renderDasbor();
  alert('Pinjaman berhasil dilunasi. Kuota harian Anda telah dikalkulasi ulang.');
}

// ==========================================
// 10. RIWAYAT TRANSAKSI
// ==========================================
function renderRiwayat() {
  const logs = bacaData('catatan_uang', []);
  const wadah = document.getElementById('wadahRiwayat');
  if (!wadah) return;
  wadah.innerHTML = '';

  if (logs.length === 0) {
    wadah.innerText = 'Belum ada transaksi.';
    return;
  }

  logs.slice().reverse().forEach(l => {
    const div = document.createElement('div');
    div.className = 'list-item';
    const tanda = l.jenis === 'Masuk' ? '+' : '-';
    const warna = l.jenis === 'Masuk' ? '#2d6a4f' : '#b91c1c';

    div.innerHTML = `
      <div>
        <div><b>${l.kategori}</b></div>
        <div style="font-size:0.75rem; color:#799484; text-transform:uppercase;">${l.dompet}</div>
      </div>
      <span style="color:${warna}; font-weight:600;">${tanda} Rp ${l.nominal.toLocaleString('id-ID')}</span>
    `;
    wadah.appendChild(div);
  });
}

// ==========================================
// 11. LAPORAN & POS TABUNGAN KHUSUS
// ==========================================
const btnBukaTabungan = document.getElementById('btnBukaTabungan');
if (btnBukaTabungan) {
  btnBukaTabungan.addEventListener('click', function() {
    const nama = prompt('Nama Pos Tabungan (Cth: Mudik / Darurat):');
    if (!nama) return;
    const nom = parseInt(prompt('Nominal Dana Terkunci (Rp):', '0')) || 0;

    const pos = bacaData('artos_tabungan', []);
    pos.push({ id: Date.now(), nama: nama, saldo: nom });
    tulisData('artos_tabungan', pos);

    renderLaporan();
  });
}

function renderLaporan() {
  const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });
  const totalKas = Number(saldo.tunai || 0) + Number(saldo.gopay || 0) + Number(saldo.mandiri || 0);

  const pos = bacaData('artos_tabungan', []);
  let totalTabung = 0;
  const wadahPos = document.getElementById('wadahPosTabungan');
  if (wadahPos) {
    wadahPos.innerHTML = '';
    if (pos.length === 0) {
      wadahPos.innerHTML = '<div style="font-size:0.85rem; color:#799484;">Belum ada pos tabungan terdaftar.</div>';
    } else {
      pos.forEach(p => {
        totalTabung += p.saldo;
        const div = document.createElement('div');
        div.className = 'saving-box';
        div.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <b>${p.nama}</b>
              <div style="color:#1a432f; font-weight:bold; font-size:0.95rem;">Rp ${p.saldo.toLocaleString('id-ID')}</div>
            </div>
          </div>
        `;
        const btnCair = document.createElement('button');
        btnCair.className = 'btn-sm-tarik';
        btnCair.innerText = 'Cairkan';
        btnCair.onclick = function() {
          const list = bacaData('artos_tabungan', []);
          const idx = list.findIndex(i => i.id === p.id);
          if (idx !== -1 && confirm(`Cairkan tabungan "${p.nama}" ke saldo bebas pakai?`)) {
            list.splice(idx, 1);
            tulisData('artos_tabungan', list);
            renderLaporan();
          }
        };
        div.firstElementChild.appendChild(btnCair);
        wadahPos.appendChild(div);
      });
    }
  }

  const uangBebas = totalKas - totalTabung;
  const elUangBebas = document.getElementById('rep-uang-bebas');
  const elTotalKas = document.getElementById('rep-total-kas');
  const elTotalTabung = document.getElementById('rep-total-tabung');
  const elTunai = document.getElementById('rep-tunai');
  const elGopay = document.getElementById('rep-gopay');
  const elMandiri = document.getElementById('rep-mandiri');
  const elPiutang = document.getElementById('rep-piutang');
  const elHutang = document.getElementById('rep-hutang');

  if (elUangBebas) elUangBebas.innerText = 'Rp ' + Number(uangBebas).toLocaleString('id-ID');
  if (elTotalKas) elTotalKas.innerText = 'Rp ' + Number(totalKas).toLocaleString('id-ID');
  if (elTotalTabung) elTotalTabung.innerText = 'Rp ' + Number(totalTabung).toLocaleString('id-ID');

  if (elTunai) elTunai.innerText = 'Rp ' + Number(saldo.tunai || 0).toLocaleString('id-ID');
  if (elGopay) elGopay.innerText = 'Rp ' + Number(saldo.gopay || 0).toLocaleString('id-ID');
  if (elMandiri) elMandiri.innerText = 'Rp ' + Number(saldo.mandiri || 0).toLocaleString('id-ID');

  const hutangList = bacaData('artos_hutang', []);
  let piutang = 0;
  let hutang = 0;
  hutangList.filter(h => !h.lunas).forEach(h => {
    if (h.tipe === 'piutang') piutang += h.nominal;
    if (h.tipe === 'hutang') hutang += h.nominal;
  });

  if (elPiutang) elPiutang.innerText = 'Rp ' + Number(piutang).toLocaleString('id-ID');
  if (elHutang) elHutang.innerText = 'Rp ' + Number(hutang).toLocaleString('id-ID');
}

// ==========================================
// 12. FITUR TRANSAKSI JASA TRANSFER
// ==========================================
const sheetTransfer = document.getElementById('sheetTransfer');
const btnBukaJasaTransfer = document.getElementById('btnBukaJasaTransfer');
const btnTutupTransfer = document.getElementById('btnTutupTransfer');
const btnSimpanJasaTransfer = document.getElementById('btnSimpanJasaTransfer');

if (btnBukaJasaTransfer && sheetTransfer) {
  btnBukaJasaTransfer.addEventListener('click', function() {
    sheetTransfer.classList.add('open');
  });
}

if (btnTutupTransfer && sheetTransfer) {
  btnTutupTransfer.addEventListener('click', function() {
    sheetTransfer.classList.remove('open');
  });
}

if (sheetTransfer) {
  sheetTransfer.addEventListener('click', function(e) {
    if (e.target === sheetTransfer) {
      sheetTransfer.classList.remove('open');
    }
  });
}

if (btnSimpanJasaTransfer) {
  btnSimpanJasaTransfer.addEventListener('click', function() {
    const nominal = parseInt(document.getElementById('inpTransferNominal').value) || 0;
    const biayaAdmin = parseInt(document.getElementById('inpTransferAdmin').value) || 0;
    const jenis = document.getElementById('selJenisTransfer').value;

    if (nominal <= 0) return alert('Silakan masukkan nominal transfer yang valid.');

    const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });
    const logs = bacaData('catatan_uang', []);
    const waktuSekarang = new Date().toISOString();

    if (jenis === 'tarik') {
      if ((saldo.tunai || 0) < nominal) return alert('Saldo Kas Tunai Anda tidak mencukupi untuk dicairkan.');
      
      saldo.mandiri = (saldo.mandiri || 0) + nominal;
      saldo.tunai = (saldo.tunai || 0) - nominal + biayaAdmin;

      logs.push({ jenis: 'Masuk', kategori: 'Jasa Transfer (Mandiri)', nominal: nominal, dompet: 'mandiri', waktu: waktuSekarang });
      logs.push({ jenis: 'Keluar', kategori: 'Pencairan Tunai Pelanggan', nominal: nominal, dompet: 'tunai', waktu: waktuSekarang });
      if (biayaAdmin > 0) {
        logs.push({ jenis: 'Masuk', kategori: 'Keuntungan Admin Transfer', nominal: biayaAdmin, dompet: 'tunai', waktu: waktuSekarang });
      }
    } else {
      if ((saldo.mandiri || 0) < nominal) return alert('Saldo Bank Mandiri Anda tidak cukup untuk melakukan transfer.');

      saldo.mandiri = (saldo.mandiri || 0) - nominal;
      saldo.tunai = (saldo.tunai || 0) + nominal + biayaAdmin;

      logs.push({ jenis: 'Keluar', kategori: 'Jasa Transfer (Mandiri)', nominal: nominal, dompet: 'mandiri', waktu: waktuSekarang });
      logs.push({ jenis: 'Masuk', kategori: 'Penerimaan Tunai Pelanggan', nominal: nominal + biayaAdmin, dompet: 'tunai', waktu: waktuSekarang });
    }

    tulisData('artos_saldo', saldo);
    tulisData('catatan_uang', logs);

    document.getElementById('inpTransferNominal').value = '';
    if (sheetTransfer) sheetTransfer.classList.remove('open');

    renderTampilanSaldo();
    renderDasbor();
    renderLaporan();
    alert(`Transaksi berhasil! Biaya admin sebesar Rp ${biayaAdmin.toLocaleString('id-ID')} masuk sebagai laba.`);
  });
}

// ==========================================
// 13. KONSULTAN FINANSIAL AI (GEMINI RESMI)
// ==========================================
const btnKonsultasiGemini = document.getElementById('btnKonsultasiGemini');
if (btnKonsultasiGemini) {
  btnKonsultasiGemini.addEventListener('click', async function() {
    const rawKey = localStorage.getItem('artos_gemini_key');
    if (!rawKey || rawKey.trim() === '') {
      alert('Kunci API belum diisi! Silakan tekan ikon setelan di kanan atas untuk memasukkan Gemini API Key.');
      return;
    }

    const apiKey = rawKey.trim();
    const boxAI = document.getElementById('wadahResponAI');
    if (!boxAI) return;

    boxAI.style.display = 'block';
    boxAI.innerHTML = '<i>Sedang menganalisis siklus finansial bersama Gemini...</i>';

    const saldo = bacaData('artos_saldo', { tunai: 0, gopay: 0, mandiri: 0 });
    const hutang = bacaData('artos_hutang', []).filter(h => !h.lunas);
    const tabungan = bacaData('artos_tabungan', []);
    const riwayat = bacaData('catatan_uang', []).slice(-15);

    const promptData = {
      saldoSaatIni: saldo,
      utangPiutangAktif: hutang,
      posTabunganTerkunci: tabungan,
      transaksiTerakhir: riwayat,
      kuotaHarianFleksibel: batasHarianDinamis
    };

    const teksInstruksi = "Peran Anda adalah Artos AI, konsultan keuangan pribadi cerdas. Evaluasi kondisi keuangan berikut. Berikan saran alokasi pengeluaran harian, strategi pelunasan utang bila ada, dan cara menjaga kas bebas pakai dalam 2-3 paragraf ringkas:";

    // Model resmi dan stabil Google Generative Language
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${teksInstruksi}\n\n${JSON.stringify(promptData)}` }
              ]
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const pesanGalat = data.error ? data.error.message : 'Permintaan ditolak server.';
        boxAI.innerHTML = `<span style="color:#b91c1c;"><b>Galat (${response.status}):</b> ${pesanGalat}</span>`;
        return;
      }

      if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        boxAI.innerText = data.candidates[0].content.parts[0].text;
      } else {
        boxAI.innerHTML = `<span style="color:#b91c1c;">Respons dari AI tidak memuat teks saran yang valid.</span>`;
      }
    } catch (err) {
      boxAI.innerHTML = `<span style="color:#b91c1c;"><b>Kendala Jaringan:</b> ${err.message}. Pastikan koneksi internet ponsel stabil.</span>`;
    }
  });
}


// ==========================================
// 14. INISIALISASI SAAT HALAMAN DIMUAT
// ==========================================
window.addEventListener('DOMContentLoaded', function() {
  siapkanSaldo();
  pasangNavigasi();
  pasangPilihanDompet();
  pasangPilihanKategori();
  pasangKeypad();
  renderDasbor();
});
